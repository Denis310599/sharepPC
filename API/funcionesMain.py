import datetime
from datetime import date
import json
import random
import string
import os
from kubernetes import client, config
from kubernetes.client.rest import ApiException
import math

def get_random_string(length):
    """Función que genera una cadena de caracteres aleatoria
            -length: Longitud de la cadena aleatoria."""
    # choose from all lowercase letter
    letters = string.ascii_lowercase
    result_str = ''.join(random.choice(letters) for i in range(length))
    print("Random string of length", length, "is:", result_str)
    return result_str
    
def randomID(prefix, tipo):
    """Crea un random id.
        -prefix: Usuario o prefijo, segun el tipo
        -tipo: 0 (sessionID), 1 (token), 2 containerID, 3 nombreContenedor"""
    length = 0
    idNuevo = ""
    tsNow = str(int(datetime.datetime.now().timestamp()))
    if tipo == 0:
        #Id Usuario
        idNuevo = prefix + "#" + tsNow
    elif tipo == 1:
        #token
        length = 20
        idNuevo = prefix + "-" + tsNow[:len(tsNow)//2] + get_random_string(length)+tsNow[len(tsNow)//2:]
    elif tipo == 2:
        idNuevo = prefix + "Cont#" + tsNow
    elif tipo == 3:
        idNuevo = prefix + "c-" + tsNow
    
    return idNuevo

def compruebaToken(token, conn):
    """Función que comprueba que un token sigue siendo activo y devuelve al usuario al que está asociado
    
        Parametros de entrada:\n
        -- token\n
        -- conexion con la base de datos\n
        \n
        Return:\n
        -- -1 si hay un error, usuario si va bien"""

    cur = conn.cursor()
    sql = "SELECT usuario FROM sesiones WHERE token=%s"
    cur.execute(sql, (token, ))

    data = cur.fetchall()

    if len(data) == 0:
        return -1
    else:
        return data[0][0]


def createDeployment(nombreContenedor, token, imagen, conexion, cpus='2.0', memory='4096Mi', update=True):
    """Función que crea un nuevo deployment comunicandose con la API de K8S"""
    token_api = os.environ['TOKEN_K8S']
    url_api = os.environ['HOST_K8S'] + "apps/v1/namespaces/default/deployments"
    
    nombreImagen = "denis31599/tfm_test:" + imagen
    
    if(conexion == 1):
        nombreImagen += "_ssh"
  
    #Envio la peticion a la API
    config.load_kube_config(config_file="./kubeconfig");
    with client.ApiClient() as api_client:
        #Creo el deployment
        api_instance = client.AppsV1Api(api_client)
        namespace = "default"

        metadata = client.V1ObjectMeta(name=nombreContenedor, labels={"name": "share-pc-app"})
        specs = client.V1DeploymentSpec(replicas=1,
                                        selector=client.V1LabelSelector(match_labels={"name": "share-pc-app"}),
                                        template=client.V1PodTemplateSpec(metadata=client.V1ObjectMeta(labels={"name": "share-pc-app"}),
                                                                          spec=client.V1PodSpec(containers=[client.V1Container(name=nombreContenedor,
                                                                                                                               image=nombreImagen,
                                                                                                                               resources=client.V1ResourceRequirements(requests={"memory": memory,
                                                                                                                                                                                 "cpu": cpus}),#,
                                                                                                                                                                        #limits={"memory": memory,
                                                                                                                                                                                 #"cpu": cpus}),
                                                                                                                                env=[client.V1EnvVar(name="IDOG", value=nombreContenedor),
                                                                                                                                     client.V1EnvVar(name="TOKEN", value=token)],
                                                                                                                                image_pull_policy='Always',
                                                                                                                                security_context=client.V1SecurityContext(capabilities=client.V1Capabilities(add=['sys_chroot']),
                                                                                                                                                                          run_as_user=0))],
                                                                                                dns_policy="None",
                                                                                                dns_config=client.V1PodDNSConfig(nameservers=["8.8.8.8", "8.8.4.4"]),
                                                                                                image_pull_secrets=[client.V1ObjectReference(name="regcred")])))

        body = client.V1Deployment(metadata=metadata, spec=specs)

        #Envio la peticion a la API
        try:
            if update:
                respuesta = api_instance.patch_namespaced_deployment(namespace=namespace, body=body, name=nombreContenedor)
            else:
                respuesta = api_instance.create_namespaced_deployment(namespace=namespace, body=body)
                
            return True
        except ApiException as e:
            return False
    #response = 200#requests.post(url_api, headers={"Authorization": f"Bearer {token_api}", "Content-Type": "application/json"}, json=deployment_body)
    
def removeNode(nombre):
    token_api = os.environ['TOKEN_K8S']
    url_api = os.environ['HOST_K8S'] + "apps/v1/namespaces/default/deployments"
  
    #Envio la peticion a la API
    config.load_kube_config(config_file="./kubeconfig");
    with client.ApiClient() as api_client:
        #Creo el deployment
        api_instance = client.CoreV1Api(api_client)
        
        try:
            api_response = api_instance.delete_node(nombre, grace_period_seconds=0)
            return True
        except ApiException as e:
            return False
    
def createContainer(body, conn):
    """Funcion que crea un nuevo contenedor
    
        Parametros entrada:

        -token
        -cpus (2.0)
        -mem_s (4096)
        -mem_t (0 Mi, 1 Gi)
        -imagen
        
        Return:

        -idContenedor: id del nuevo contenedor"""
    
    #Obtenemos los parametros de entrada
    token = body['token']
    memory = "4096Mi"
    memo_type = 0
    memo_size = 0
    cpus_str = "4.0"
    cpus_nbr = 4
    imagen = "host"
    connection_type = 1 #Por defecto ssh (1)
    nombreContenedorUsuario = "Mi contenedor"
    if 'nombre' in body:
        nombreContenedorUsuario = body['nombre']
    if 'cpus' in body:
        cpus_str = str(body['cpus'])
        cpus_nbr = body['cpus']
    if ('mem_s' in body) and ('mem_t' in body):
        memo_size = body['mem_s']
        memo_type = body['mem_t']
        if memo_type == 1:
            memory = str(memo_size) + "Gi"
        else:
            memory = str(memo_size) + "Mi"

    if 'imagen' in body:
        imagen = body['imagen']
        
    if 'conexion' in body:
        connection_type = body['conexion']
        
        
    #Confirmo que este token tiene acceso
    check = compruebaToken(token, conn)
    if check == -1:
        ret = {
            "code": 1,
            "description": "El token no pertenece a ningún usuario o ha caducado"
        }

        return json.dumps(ret)
    
    usuario = check

    #Generamos un id de contenedor y un token para nuestro nuevo contenedor
    tokenContainer = randomID("CNT", 1)
    nombreCont = randomID(usuario.lower(), 3)
    
    #Crear el deployment llamando a la API K8s
    validacion_dep = createDeployment(nombreCont, tokenContainer, imagen, connection_type, cpus_str, memory, False)
    if validacion_dep == True:
        #Ha ido correctamente, deployment creado
        #Creo la entrada en la bdd con estos datos
        cur = conn.cursor()
        sql = "INSERT INTO instancias(id, propietario, token, estado, nombre, memo_s, memo_t, cpu, imagen, conexion) VALUES(%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)"
        cur.execute(sql, (nombreCont, usuario, tokenContainer, 0, nombreContenedorUsuario, memo_size, memo_type, cpus_nbr, imagen, connection_type))
        
        ret = {
            "code": 0,
            "description": "Orden de creación enviada satisfactoriamente",
            "args": {
                "id": nombreCont
            }
        }
    else:
        #Se ha producido un error al crear el contenedor
        ret = {
            "code": 1,
            "description": "Error al crear el contenedor"
        }
    
    #Devuelvo los datos al usuario
    return json.dumps(ret)


def updateContenedor(body, conn):
    """Funcion que actualiza un contenedor
    
        Parametros entrada:

        -token
        -cpus (2.0)
        -mem_s (4096)
        -mem_t (0 Mi, 1 Gi)
        -id
        
        Return:

        -idContenedor: id del nuevo contenedor"""
    
    #Obtenemos los parametros de entrada
    token = body['token']
    memory = "4096Mi"
    memo_type = 0
    memo_size = 0
    cpus_str = "4.0"
    cpus_nbr = 4
    nombreContenedorUsuario = "Mi contenedor"
    imagen = "host"
    connection_type = 1 #Por defecto ssh (1)
    if 'nombre' in body:
        nombreContenedorUsuario = body['nombre']
    if 'cpus' in body:
        cpus_str = str(body['cpus'])
        cpus_nbr = body['cpus']
    if ('mem_s' in body) and ('mem_t' in body):
        memo_size = body['mem_s']
        memo_type = body['mem_t']
        if memo_type == 1:
            memory = memo_size + "Gi"
        else:
            memory = memo_size + "Mi"
 
    if 'imagen' in body:
        imagen = body['imagen']
        
    if 'conexion' in body:
        connection_type = body['conexion']
        
    nombreCont = body['id']
    #Confirmo que este token tiene acceso
    check = compruebaToken(token, conn)
    if check == -1:
        ret = {
            "code": 1,
            "description": "El token no pertenece a ningún usuario o ha caducado"
        }

        return json.dumps(ret)
    
    usuario = check
    #Comprobamos si el contenedor pertenece al usuario
    cur = conn.cursor()
    sql = "SELECT token FROM instancias WHERE propietario=%s AND id=%s"
    cur.execute(sql, (usuario, nombreCont))
    data = cur.fetchall()
    
    if len(data) == 0:
        #El usuario no es propietario del contenedor
        ret = {
            "code": 2,
            "description": "El usuario no es propietario del contenedor"
        }

        return json.dumps(ret)
    
    tokenContainer = data[0][0]
    
    #Crear el deployment llamando a la API K8s
    validacion_dep = createDeployment(nombreCont, tokenContainer, imagen, connection_type, cpus_str, memory, True)
    if validacion_dep == True:
        #Ha ido correctamente, deployment creado
        #Actualizo la entrada en la bdd con estos datos
        if nombreContenedorUsuario is None:
            sql = "UPDATE instancias SET estado=%s, memo_t=%s, memo_s=%s, cpu=%s WHERE id=%s"
            cur.execute(sql, (2, memo_type, memo_size, cpus_nbr, nombreCont))
        else:
            sql = "UPDATE instancias SET estado=%s, nombre=%s, memo_t=%s, memo_s=%s, cpu=%s, conexion=%s, imagen=%s WHERE id=%s"
            cur.execute(sql, (2, nombreContenedorUsuario, memo_type, memo_size, cpus_nbr, connection_type, imagen, nombreCont))

        
        ret = {
            "code": 0,
            "description": "Orden de update enviada satisfactoriamente",
            "args": {
                "id": nombreCont
            }
        }
    else:
        #Se ha producido un error al crear el contenedor
        ret = {
            "code": 1,
            "description": "Error al actualizar el contenedor"
        }
    
    #Devuelvo los datos al usuario
    return json.dumps(ret)
    
def getContainers(token, conn):
    """Funcion que devuelve todos los contenedores asociados a un usuario
    
        Parametros entrada:\n
        -- token\n
        \n
        Return:\n
        -- 'contenedores': Array de los siguientes objetos:\n
            {
                'id': string,
                'estado': int
            }"""
    
    #Confirmo que este token tiene acceso
    check = compruebaToken(token, conn)
    if check == -1:
        ret = {
            "code": 1,
            "description": "El token no pertenece a ningún usuario o ha caducado"
        }

        return json.dumps(ret)
    
    usuario = check

    #Consulto los contenedores asociados al usuario
    cur = conn.cursor()
    sql = "SELECT id, estado, nombre, cpu, memo_s, memo_t, conexion, imagen FROM instancias WHERE propietario=%s AND estado<>-1;"
    cur.execute(sql, (usuario, ))
    data = cur.fetchall()

    info_containers = []
    for row in data:
        elem = {
            'id': row[0],
            'estado': row[1],
            'nombre': row[2],
            'cpu': row[3],
            'memo_s': row[4],
            'memo_t': row[5],
            'conexion': row[6],
            'imagen': row[7]
        }
        info_containers.append(elem)
    
    ret = {
            "code": 0,
            "description": "Contenedores consultados satisfactoriamente",
            "args": {
                'contenedores': info_containers
            }
        }

    return json.dumps(ret)

def deleteContainer(body, conn):
    """Funcion que elimina un contenedor con cierto ID. Solo puede ser el iminado por el propietario del contenedor.
    
        Parametros de entrada:
        --Token
        """
    token = body['token']
    nombreContenedor = body['id']
    
    check = compruebaToken(token, conn)
    if check == -1:
        ret = {
            "code": 1,
            "description": "El token no pertenece a ningún usuario o ha caducado"
        }

        return json.dumps(ret)
    
    ##Si tengo permiso para eliminar el contenedor, pues elimino el deployment
    token_api = os.environ['TOKEN_K8S']
    url_api = os.environ['HOST_K8S'] + "apps/v1/namespaces/default/deployments"
    
    #Comprobar que el usuario tiene permiso para eliminar el contenedor.
  
    #Envio la peticion a la API
    config.load_kube_config(config_file="./kubeconfig")
    validacion_dep = False
    with client.ApiClient() as api_client:
        api_instance = client.AppsV1Api(api_client)
        try:
            respuesta = api_instance.delete_namespaced_deployment(nombreContenedor, namespace="default")
            validacion_dep = True
        except ApiException as e:
            validacion_dep = False
    
    if validacion_dep == True:
        #Ha ido correctamente, deployment eliminado
        #Creo la entrada en la bdd con estos datos
        cur = conn.cursor()
        sql = "UPDATE instancias SET estado=-1 WHERE id=%s"
        cur.execute(sql, (nombreContenedor, ))
        
        ret = {
            "code": 0,
            "description": "Orden de eliminacion enviada satisfactoriamente"
        }
    else:
        #Se ha producido un error al crear el contenedor
        ret = {
            "code": 1,
            "description": "Error al eliminar el contenedor"
        }
    
    return json.dumps(ret)
    
    
def getContainerStatus(token, idContenedor, conn):
    """Funcion que devuelve el estado de un contenedor en particular
    
        Parametros entrada:\n
        -- token\n
        -- idContainer\n
        \n
        Return:\n
        -- 'id': string\n
        -- 'estado': int
            """

    #Confirmo que este token tiene acceso
    check = compruebaToken(token, conn)
    if check == -1:
        ret = {
            "code": 1,
            "description": "El token no pertenece a ningún usuario o ha caducado"
        }

        return json.dumps(ret)
    
    usuario = check

    #Consulto el contenedor especificado
    cur = conn.cursor()
    sql = "SELECT id, estado FROM instancias WHERE propietario=%s AND id=%s AND estado<>-1;"
    cur.execute(sql, (usuario, idContenedor))
    data = cur.fetchall()

    if len(data) == 0:
        ret = {
            "code": 1,
            "description": "No se encontro ningun contenedor con estos requisitos",
        }
        return json.dumps(ret)

    #Devuelvo los datos al usuario  
    elem = {
        'id': data[0][0],
        'estado': data[0][1]
    }
    
    ret = {
            "code": 0,
            "description": "Contenedores consultados satisfactoriamente",
            "args": elem
    }

    return json.dumps(ret)


def containerReady(token, conn):
    """Funcion que indica que un contenedor está listo
    
        Parametros entrada:\n
        -- token\n
            """
    
    #Actializo el estado de la maquina
    cur = conn.cursor()
    sql = "UPDATE instancias SET estado=%s WHERE token=%s;"
    cur.execute(sql, (1, token))

    #Devuelvo la confirmacion al usuario
    ret = {
        "code": 0,
        "description": "Ready",
    }


    return json.dumps(ret)

def authWS(body, conn):
    """Función que autentica un token de contenedor o usuario y comprueba si puede enviar al usuario especificado.
    
    Parametros:\n
    -- token\n
    -- idDestino (opcional)\n
    \n
    Return: \n
    -- idContainer/idCliente
    -- permitido: true o false
    """

    #Obtiene los parametros del body
    token = body['token']
    idDestino = ""
    try:
        idDestino = body['idDestino']
    except:
        idDestino = ""
    
    #Comprobamos que el token se corresponda a un usuario o a un contenedor
    cur = conn.cursor()
    sql = "SELECT id, propietario FROM instancias WHERE token=%s;"
    cur.execute(sql, (token, ))
    data = cur.fetchall()

    usuario = ""
    id = ""
    tipo = 0 # 0 es contenedor, 1 es usuario
    if len(data) == 0:
        #No es un contenedor
        sql = "SELECT id, usuario FROM sesiones WHERE token=%s;"
        cur.execute(sql, (token, ))
        data = cur.fetchall()

        if len(data) == 0:
            #No corresponde a ningun usuario
            ret = {
                "code": 1,
                "description": "El token no pertenece a ningún usuario o ha caducado"
            } 
            return json.dumps(ret)
        else:
            #Se corresponde con un usuario normal
            id = data[0][0]
            usuario = data[0][1]
            tipo = 1
    else:
        #Se corresponde con un contenedor
        id = data[0][0]
        usuario = data[0][1]
        tipo = 0


    #Si tiene un idDestino, compruebo si puede enviar ahi.
    posibleEnviar = False
    usuarioDestino = ""    
    if idDestino == "":
        #No hace falta comprobar puesto que no se puede enviar
        posibleEnviar = False
    else:
        #Compruebo que puede enviar al id destino
        if tipo == 1:
            #El destino es un contenedor
            sql = "SELECT propietario FROM instancias WHERE id=%s AND estado<>-1;"
            
        else:
            #El destino es un usuario
            sql = "SELECT usuario FROM sesiones WHERE id=%s;"
        
        cur.execute(sql, (idDestino, ))
        data = cur.fetchall()
        
        
        if len(data) == 0:
            posibleEnviar = False
        else:
            usuarioDestino = data[0][0]
            if usuarioDestino == usuario:
                posibleEnviar = True
    
    ret = {
            "code": 0,
            "description": "El token existe",
            "args": {
                "id": id,
                "permitido": posibleEnviar
            }
        } 
    return json.dumps(ret)
    
    
def updateKubejoin(body, conn):
    #Obtiene los parametros del body
    token = body['token']
    comando = body['comando']
    
    check = compruebaToken(token, conn)
    if check == -1:
        ret = {
            "code": 1,
            "description": "El token no pertenece a ningún usuario o ha caducado"
        }

        return json.dumps(ret)
        
    elif check != "admin":
        ret = {
            "code": 2,
            "description": "El usuario no tiene permiso para realizar esta operacion"
        }

        return json.dumps(ret)
    
    #Actualizo el token
    cur = conn.cursor()
    sql = "UPDATE kubejoin SET comando=%s, ts=current_timestamp;"
    cur.execute(sql, (comando, ))
    
    ret = {
            "code": 0,
            "description": "Comando kubejoin actualizado satisfactoriamente"
        }

    return json.dumps(ret)
    

def getKubejoin(token, tsCliente, conn):
    
    check = compruebaToken(token, conn)
    if check == -1:
        ret = {
            "code": 1,
            "description": "El token no pertenece a ningún usuario o ha caducado"
        }

        return json.dumps(ret)

    
    #Obtengo el comando y el ts almacenados en bdd
    cur = conn.cursor()
    sql = "SELECT comando, ts FROM kubejoin;"
    cur.execute(sql)
    
    data = cur.fetchall();
    tsObtenido = data[0][1]
    comandoObtenido = data[0][0]
    
    #Compruebo si el cliente esta actualizado o no
    if(tsCliente < tsObtenido.timestamp()):
        #El cliente no esta actualizado
        ret = {
            "code": 1,
            "description":"El cliente no esta actualizado, debe realizar de nuevo el kubejoin",
            "args": {
                "comando": comandoObtenido
            }
        }
    else:
        #El cliente esta actualizado
        ret = {
            "code": 0,
            "description": "El cliente esta actualizado"
        }
        
    return json.dumps(ret)


def getMvIp(token, mvid, conn):
    
    
    check = compruebaToken(token, conn)
    if check == -1:
        ret = {
            "code": 1,
            "description": "El token no pertenece a ningún usuario o ha caducado"
        }

        return json.dumps(ret)
    
    #Compruebo si tengo un id asignado
    cur = conn.cursor()
    sql = "select id, ip FROM maquinas WHERE mvid=%s;"
    cur.execute(sql, (mvid, ))
    
    data = cur.fetchall()
    
    if len(data) > 0:
        #No tengon ninguna IP asignada
        ret = {
            "code": 0,
            "description": "IP obtenida satisfactoriamente",
            "args": data[0][1]
        }

        return json.dumps(ret)
        
    #Obtengo el primer ID disponible
    
    sql = "select id, ip FROM maquinas WHERE id in (SELECT MIN(id) FROM maquinas WHERE mvid IS NULL);"
    cur.execute(sql)
    
    data = cur.fetchall()
    if len(data) != 0:
        #Tengo un id disponible
        id = data[0][0]
        ip = data[0][1]
        
        #Actualizo la entrada correspondiente
        sql = "UPDATE maquinas SET mvid=%s WHERE id=%s;"
        cur.execute(sql, (mvid, id))
        
        #Devuelvo la IP al cliente
        ret = {
            "code": 0,
            "description": "IP obtenida satisfactoriamente",
            "args": ip
        }

        return json.dumps(ret)
        
        
        
    else:
        #No tengo id, creo una nueva entrada
        sql = "SELECT min(idnow)+1 as nuevoid FROM (SELECT id as idNow, mvid as mvNow, lead(\"id\") OVER (ORDER BY id) as idNext FROM maquinas) as i WHERE idNext IS NULL OR idNext <> (idNow+1);"
        cur.execute(sql)
        data = cur.fetchall()
            
        id = int(data[0][0])
        
        #Calculo la nueva IP
        Daux = math.floor(id/256)
        D = id - Daux*256
        
        Caux = math.floor(Daux/256)
        C = Daux - Caux*256
        
        Baux = math.floor(Caux/256)
        B = Caux - Baux*256
        
        ip = "10."+str(B)+"."+str(C)+"."+str(D)
        
        #Actualizo la tabla con la nueva entrada
        sql = "INSERT INTO maquinas(id, ip, mvid) VALUES(%s, %s, %s);"
        cur.execute(sql, (id, ip, mvid))
        
        #Devuelvo la respuesta al cliente
        ret = {
            "code": 0,
            "description": "IP obtenida satisfactoriamente",
            "args": ip
        }

        return json.dumps(ret)


def rmMvIp(body, conn):
    
    token = body['token']
    mvid = body['mv_id']
    
    check = compruebaToken(token, conn)
    if check == -1:
        ret = {
            "code": 1,
            "description": "El token no pertenece a ningún usuario o ha caducado"
        }

        return json.dumps(ret)
    
    #Elimino el nodo de kubernetes
    checkRm = removeNode(mvid)
    if checkRm == False:
        ret = {
            "code": 2,
            "description": "Error al eliminar la maquina virtual"
        }

        return json.dumps(ret)
    
    #Obtengo el primer ID disponible
    cur = conn.cursor()
    sql = "UPDATE maquinas SET mvid=NULL WHERE mvid=%s;"
    cur.execute(sql, (mvid, ))
    
    ret = {
        "code": 0,
        "description": "IP Desasignada correctamente"
    }

    return json.dumps(ret)