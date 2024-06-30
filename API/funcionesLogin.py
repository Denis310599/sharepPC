import datetime
from datetime import date
import json
import random
import string

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
        -tipo: 0 (sessionID), 1 (token)"""
    length = 0
    idNuevo = ""
    tsNow = str(int(datetime.datetime.now().timestamp()))
    if tipo == 0:
        #Id Usuario
        idNuevo = prefix + "#" + tsNow
    elif tipo == 1:
        #Token
        length = 20
        idNuevo = prefix + "-" + tsNow[:len(tsNow)//2] + get_random_string(length)+tsNow[len(tsNow)//2:]
    
    return idNuevo


def login(body, conn):
    #Obtiene los parametros del body
    usuario = body['user']
    contra = body['contra']
    ret = {
        "code": 0,
        "description": "Sesión iniciada correctamente"
    }
    #Comprueba que exista ese usuario y contraseña
    cur = conn.cursor()
    sql =  "SELECT contra, correo FROM usuarios WHERE usuario=%s AND contra=%s;"
    db_param = (usuario, contra)
    cur.execute(sql, db_param)
    datos = cur.fetchall()

    if len(datos) == 0:
        #Error en el login
        ret = {
            "code": 1,
            "description": "Combinacion de Usuario y contraseña no existe"
        }
    else:
        #Si es correcto genera un sessionID
        newID = randomID(usuario, 0)
        token = randomID("Tk", 1)
        #Genero un token

        #Almaceno en la BDD
        sql = "INSERT INTO sesiones(id, usuario, token) VALUES (%s, %s, %s);"
        db_param = (newID, usuario, token)
        cur.execute(sql, db_param)
        ret = {
            "code": 0,
            "description": "Sesión creada satisfactoriamente",
            "args": {
                "token": token,
                "session_id": newID
            }
        }
    cur.close()
    return json.dumps(ret)
    
def logout(body, conn):
    #obtenemos parametros del body
    sessionID = body['token']
    ret = {
        "code": 1,
        "description": "Se ha producido algun error"
    }
    
    #Eliminamos la entrada de la BDD
    cur = conn.cursor()
    sql = "DELETE FROM sesiones WHERE token=%s;"
    cur.execute(sql, (sessionID, ))

    ret = {
        "code": 0,
        "description": "Sesión cerrada satisfactoriamente"
    }
    
    return json.dumps(ret)
    
def crea(body, conn):
    #Obtenemos parametros del body
    usuario = body['user']
    contra = body['contra']
    correo = body['correo']
    ret = {
        "code": 0,
        "description": "Usuario creado correctamente"
    }
    #Comprobar que no exista ningun usuario con ese nombre
    cur = conn.cursor()
    print(usuario)
    sql = "SELECT usuario FROM usuarios WHERE usuario=%s;"
    cur.execute(sql, (usuario, ))
    datos = cur.fetchall()
    
    if len(datos) == 0:
        #Ahora comprueba que no exista ningun correo con ese nombre
        sql = "SELECT correo FROM usuarios WHERE correo=%s;"
        cur.execute(sql, (correo, ))
        datos = cur.fetchall()
        
        if len(datos) == 0:
            #Si no existe crea la entrada
            sql = "INSERT INTO usuarios(usuario, contra, correo) VALUES (%s, %s, %s);"
            cur.execute(sql, (usuario, contra, correo))
        
        else:
            #Si el correo existe devuelvo 2
            ret = {
                "code": 2,
                "description": "El correo especificado está en uso"
            }
        
        
    else:
        #Si el usuario existe devuelvo 1
        ret = {
            "code": 1,
            "description": "El nombre de usuario se encuentra en uso"
        }
    return json.dumps(ret)
    
def elimina(body, conn):
    #Obtenemos los datos del body
    sessionID = body['token']
    ret = {
        "code": 0,
        "description": "Usuario eliminado correctamente"
    }
    
    cur = conn.cursor()
    #Obtenemos el nombre de usuario
    sql = "SELECT DISTINCT usuario FROM sesiones WHERE token=%s"
    cur.execute(sql, (sessionID, ))
    datos = cur.fetchall()
    
    if len(datos) == 0:
        ret = {
            "code": 1,
            "description": "El token no pertenece a ningún usuario o ha caducado"
        }
    else:
        usuario = str(datos[0][0])
        #Eliminar de la tabla de sesiones antes de eliminar 
        sql = "DELETE FROM sesiones WHERE usuario=%s;"
        cur.execute(sql, (usuario,))
        
        sql = "DELETE FROM usuarios WHERE usuario=%s;"
        cur.execute(sql, (usuario, ))
    return json.dumps(ret)