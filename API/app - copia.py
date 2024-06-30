from flask import Flask
from flask import request, abort
import database
import funcionesLogin
import funcionesMain

app = Flask(__name__)

##############################################################
#                          LOGIN
##############################################################
@app.route("/Test/session", methods=['POST', 'DELETE'])
def sesiones():
    #Obtengo el body
    body = request.json

	#Llamo al metodo correspondiente
    if request.method == 'POST':
        ret = ejectuaFuncion(funcionesLogin.login, True, body)
    elif request.method == 'DELETE':
        ret = ejectuaFuncion(funcionesLogin.logout, True, body)
    return ret

@app.route("/Test/account", methods=['POST', 'DELETE'])
def cuentas():
    #Obtengo el body
    body = request.json

	#Llamo al metodo correspondiente
    if request.method == 'POST':
        ret = ejectuaFuncion(funcionesLogin.crea, True, body)
    elif request.method == 'DELETE':
        #Pillo los parametros de la url
        ret = ejectuaFuncion(funcionesLogin.elimina, True, body)
    return ret




##############################################################
#                          Contenedores
##############################################################
@app.route("/Test/container", methods=['GET', 'POST', 'PATCH', 'PUT', 'DELETE'])
def contenedores():
    #Obtengo el body
    

    #Llamo al metodo en funcion de la accion que se solicite
    #### GET ####
    if request.method == 'GET':
        #Si es un metodo GET, obtengo los parametros de la query string
        token = request.args.get('token')

        if 'id' in request.args:
            ret = ejectuaFuncion(funcionesMain.getContainerStatus, True, token, request.args.get('id'))
        else:
            ret = ejectuaFuncion(funcionesMain.getContainers, True, token)
    else:
        body = request.json

    #### POST ####
    if request.method == 'POST':
        #Si es un metodo POST se quiere crear un nuevo contenedor
        ret = ejectuaFuncion(funcionesMain.createContainer, True, body)
    #### PATCH ####
    elif request.method == 'PATCH':
        #Si es el metodo PATCH se quiere actualizar un contenedor
        ret = ejectuaFuncion(funcionesMain.updateContenedor, True, body)
    #### PUT ####
    elif request.method == 'PUT':
        #Si es el metodo PATCH se quiere actualizar un contenedor
        ret = ejectuaFuncion(funcionesMain.containerReady, True, request.args.get('token'))
    #### DELETE ####
    elif request.method == 'DELETE':
        #Si es el metodo DELETE se quiere eliminar el contenedor
        ret = ejectuaFuncion(funcionesMain.deleteContainer, True, body)

    return ret



##############################################################
#                          Kubejoin
##############################################################
@app.route("/Test/kubejoin", methods=['POST', 'GET'])
def kubejoin():
    #### GET ####
    if request.method == 'GET':
        #Si es un metodo GET, obtengo los parametros de la query string
        token = request.args.get('token')
        ts = int(request.args.get('ts'))
        ret = ejectuaFuncion(funcionesMain.getKubejoin, True, token, ts)        
    else:
        body = request.json

    #### POST ####
    if request.method == 'POST':
        #Si es un metodo POST se quiere actualizar el comando kubejoin
        ret = ejectuaFuncion(funcionesMain.updateKubejoin, True, body)

    return ret

##############################################################
#                          vms
##############################################################
@app.route("/Test/vms", methods=['GET', 'DELETE'])
def vms():


    #### GET ####
    if request.method == 'GET':
        #Si es un metodo GET, obtengo los parametros de la query string
        token = request.args.get('token')
        mv_id = int(request.args.get('mv_id'))
        ret = ejectuaFuncion(funcionesMain.getMvIp, True, token, mv_id)        
    else:
        #Obtengo el body
        body = request.json
    
    #### DELETE ####
    if request.method == 'DELETE':
        #Si es un metodo POST se eliminar la ip
        ret = ejectuaFuncion(funcionesMain.rmMvIp, True, body)

    return ret

##############################################################
#                          ws
##############################################################
@app.route("/Test/ws", methods=['POST'])
def authWS():
    #Obtengo el body
    body = request.json
    ret = ejectuaFuncion(funcionesMain.authWS, True, body)
    return ret




##############################################################
#w                          GENERIC
##############################################################
def ejectuaFuncion(function, connection_needed, *args):
    """
        Funcion que encapsula la ejecucion de una funcion especifica de la API
    """  
    #Creo la conexión con la bdd en caso de necesitarse
    if connection_needed:
        conn = database.connect()
    
    #Ejecuto la funcion
    ret = -1
    try:
        if connection_needed:
            ret = function(*args, conn)
        else:
            ret = function(*args)
    except Exception as e:
        print("###Error###")
        print("ARGS: ", *args)
        print(e)
        abort(500, "Internal Server Error")
        

	#Cierro la conexion con la BDD si se ha creado anteriormente
    if connection_needed:
        conn.commit()
        conn.close()

    return ret
    
	
    
		

