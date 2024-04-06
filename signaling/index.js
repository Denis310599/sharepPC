const { WebSocketServer, WebSocket } = require('ws');
const https = require('https')

//Variables globales
host = 'hqna10txtk.execute-api.eu-west-3.amazonaws.com';
contenedorPath = '/Test/contenedor';

const MAX_KEEPALIVE = 5;
const KEEPALIVE_INTERVAL = 5;//s

var mapaSockets = new Map();

/*********************************************************************************************
 *            Funcionamiento de inicio
 * *******************************************************************************************
 */
const ws = new WebSocketServer({port:28000});
console.log('escuchando en el puerto 28000')

//Establezco el intervalo de keepalives
setInterval(enviaKeepAlive, KEEPALIVE_INTERVAL*1000);

/*********************************************************************************************
 *            Eventos
 * *******************************************************************************************
 */
ws.on('connection', async ws2=>{
  
  ws2.on('message', async data=>{
    console.log("Mensaje recibido");
    //Compruebo el mensaje que recibo
    try{
      jsonRecibido = JSON.parse(data);
      tipoMensaje = jsonRecibido.tipo;
      switch(tipoMensaje){
        case 0:
          //Mensaje normal
          procesaMensajeNormal(jsonRecibido, ws2);
          break;
        case 1:
          //Mensaje autenticacion
          procesaMensajeAutenticacion(jsonRecibido, ws2);
          break;
        case 2:
          //Mensaje desconexion
          procesaMensajeDesconexion(jsonRecibido, ws2);
        case 3:
          //Mensaje keepalive
          procesaRecepcionKeepalive(jsonRecibido);
      }
    }catch(e){
      console.log("Se ha producido un error al procesar un mensaje: " + e)
    }
  });
});


/*****************************************************************************************
 *            Funciones
 * ***************************************************************************************
 */

/**
 * Función que procesa un mensaje de autenticación
 * @param {JSON} jsonRecibido: json con la info del mensaje recibido
 * @param {WebSocket} ws: Websocket que ha establecido la conexion con el servidor
 */
function procesaMensajeAutenticacion(jsonRecibido, ws){
  try{
  console.log("Autenticando conexion...");
  console.log(jsonRecibido)
  //Obtengo los datos del mensaje
  token = jsonRecibido.token;
  let idDestino = null;
  if(jsonRecibido.hasOwnProperty('destino')){
    idDestino = jsonRecibido.destino
  }

  //Compruebo con la API
  var contenidoPeticion;
  if(idDestino == null){
    contenidoPeticion = JSON.stringify({
      'action': "authWS",
      'token': token
    });
  }else{
    contenidoPeticion = JSON.stringify({
      'action': "authWS",
      'token': token,
      'idDestino': idDestino
    });
  }

  console.log(contenidoPeticion)
  //Envio la peticion a la API y proceso la respuesta
  enviaPeticionAPI('POST', contenidoPeticion, (data, isError) =>{
    try{
      if(!isError){
        //Compruebo el contenido del mensaje
        const dataRecibida = JSON.parse(data);
        if(dataRecibida.hasOwnProperty('code')){
          if(dataRecibida.code == 0){
            
            console.log(dataRecibida);
            console.log(dataRecibida.args.id);
            //El usuario es correcto y procedemos a operar con los resultados
            mensaje_devolver = {'tipo': 1};
            const idUsuario = dataRecibida.args.id
            var data_ws;

            //Añado el ws al mapa o lo reasocio si ya existe una entrada para este cliente
            console.log("Creando elemento conexion");
            if(mapaSockets.has(idUsuario)){
              data_ws = mapaSockets.get(idUsuario);
              data_ws.ws = ws;
            }else{
              data_ws = { 'ws': ws, 'send': [], 'ka': 5};
            }

            console.log("Conexion creada")
            if(idDestino !== null){
              //El que se comunica es un cliente
              const permitido = dataRecibida.args.permitido;
              mensaje_devolver.contenido = permitido;
              
              //Actualizo el objeto del cliente indicando que puede enviar al destino
              
              let arrayAux = data_ws.send;

              if(permitido){
                console.log("Conexion permitida");
                //Compruebo que el valor no esta repetido y lo añado
                if(arrayAux.indexOf(idDestino)== -1){
                  arrayAux.push(idDestino)
                }

                //Añado como perimtido enviar desde el destino hacia el origen
                if(mapaSockets.has(idDestino)){
                  const arraySendAux = mapaSockets.get(idDestino).send;
                  if(arraySendAux.indexOf(idUsuario)== -1){
                    arraySendAux.push(idUsuario)
                  }
                }
                
              }else{
                console.log("Conexion NO permitida");
                //Consulto si existe el idUsusario en los perimtidos a enviar y lo elimino
                const index= arrayAux.indexOf(idUsuario);
                if(index > -1){
                  arrayAux.splice(index, 1);
                }
                

                //Tambien elimino el send del usuario correspondiente en el mapa
                
                if(mapaSockets.has(idDestino)){
                  //Consulto el objeto del mapa correspondiente al destino
                  var dataWsAux = mapaSockets.get(idDestino);
                  var arrayAux2 = dataWsAux.send
                  //Elimino la entrada correspondiente con el usuario que realiza la peticion
                  arrayAux2.delete(idUsuario);
                  dataWsAux.send = arrayAux2;
                  mapaSockets.set(idDestino, dataWsAux);
                }else{
                  console.log("El objeto conexion destino no existe: " + idDestino);
                }
              }
              data_ws.send = arrayAux;
            }else{
              //El que se comunica es un servidor
              mensaje_devolver.destinos = data_ws.send
            }

            //Actualizo la entrada en el mapa del objeto que he creado o modificado, asociado al usuario que realiza la peticion
            mapaSockets.set(idUsuario, data_ws);
            

            //Envio el mensaje al destino
            ws.send(JSON.stringify(mensaje_devolver));
            
            console.log("Autenticación realizada correctamente");
            console.log(mensaje_devolver)
            
          }
        }
      }
    }catch(e){
      console.log("Error al procesar la autenticacion del usuario: " + e)
    }
  });

  
  //Asigno el usuario que me dan al socket
  //Si me especifica un destino, lo añado como destino (si se puede)
  }catch(e){
    console.log("Error al procesar el mensaje de atenticacion");
  }
}

/**
 * Funcion que procesa un mensaje de tipo normal recibido
 * @param {JSON} jsonRecibido 
 * @param {WebSocket} ws 
 */
function procesaMensajeNormal(jsonRecibido, ws){
  console.log(jsonRecibido)
  try{
    //Comprueba si puede enviar al destino y lo envia
    const idDestino = jsonRecibido.destino
    const idOrigen = jsonRecibido.origen

    //Compruebo que el origen es correcto y que puede enviar al destino
    if(mapaSockets.has(idOrigen) && ws === mapaSockets.get(idOrigen).ws){
      console.log(mapaSockets.get(idOrigen).send)
      if(mapaSockets.get(idOrigen).send.indexOf(idDestino)>-1){
        console.log("Mensaje reenviado correctamente a " + idDestino)
        mapaSockets.get(idDestino).ws.send(JSON.stringify(jsonRecibido));
      }else{
        console.log("[Alarm] Intentando enviar a un destino que no tiene permiso");
      }
    }else{
      console.log("[Alarm] El socket no se corresponde con el origen");
      console.log(mapaSockets.has(idDestino));
      console.log("################################################");
    }
  }catch(e){
    console.log("Error al reenviar el mensaje al destino: " + e)
  }
}

/**
 * Funcion que envia una peticion a la API y ejecuta el callback en la respuesta
 * @param {string} peticion 
 * @param {string} data 
 * @param {*} callback 
 */
function enviaPeticionAPI(peticion, data, callback){
  var httpOptions = {
    hostname: host,
    port: 443,
    path: contenedorPath,
    method: peticion,
    headers: {
          'Content-Type': 'application/json',
          'Content-Length': data.length
        }
  }
  const req = https.request(httpOptions, (res) => {
    res.on('data', d =>{
      console.log("Respuesta de la API recibida");
      callback(d, false);
    });
  });

  req.on('error', e =>{
    console.log("Error al recibir la respuesta de la API: \n" + e);
    callback(e, true);
  });

  req.write(data);
  req.end();
}


ws.broadcast = function(data, sender) {
  this.clients.forEach(function(client) {
    if(client.readyState === WebSocket.OPEN
      && client !== sender) {
      client.send(data);
    }
  });
};


/**
 * 
 * @param {JSON} jsonRecibido 
 * @param {WebSocket} ws 
 */
function procesaMensajeDesconexion(jsonRecibido, ws){
  //Obtenemos el origen del mensaje
  const origen = jsonRecibido.origen;

  //Comprobamos que la conexion se corresponda con el
  //Compruebo que el origen es correcto y que puede enviar al destino
  if(ws === mapaSockets.get(origen).ws){
    //Procedo a eliminar todo rastro de esta persona
    //Pillo a los que tiene permiso para enviar
    eliminaObjetoConexion(origen);
    console.log("Dispositivo desconectado: " + origen);
    
  }else{
    console.log("[Alarm] Orden de desconexion de un websocket diferente");
  }
}

/**
 * Funcion que envia el mensaje KeepAlive a todos los clientes y servidores
 */
function enviaKeepAlive(){
  mapaSockets.forEach((objetoConexion, origen)=>{
    const mensaje = {};

    mensaje.tipo = 3;

    if(objetoConexion.ka < 0){
      //Si expira el keepalive, elimino el objeto de las conexiones y todas sus incidencias
      console.log("Eliminando contenedor caducado: " + origen);
      eliminaObjetoConexion(origen);
    }else{
      //Si no ha expirado todavia, simplemente se decrementa y se envia de nuevo;
      objetoConexion.ka--
      objetoConexion.ws.send(JSON.stringify(mensaje));

      mapaSockets.set(origen, objetoConexion);
    }

  });
}

/**
 * Funcion que procesa la respuesta de un keepalive
 * @param {JSON} jsonRecibido 
 * @param {WebSocket} ws 
 */
function procesaRecepcionKeepalive(jsonRecibido){
  const origen = jsonRecibido.origen;

  if(mapaSockets.has(origen)){
    //Pongo a 0 el contador de keepalives

    const objetoConexion = mapaSockets.get(origen);

    objetoConexion.ka = MAX_KEEPALIVE;

    mapaSockets.set(origen, objetoConexion);
  }
}

/**
 * Funcion que elimina todas las incidencias de una conexion del mapa de conexiones
 * @param {String} origen 
 */
function eliminaObjetoConexion(origen){
  if(!mapaSockets.has(origen)){
    return;
  }

  const objetoConexion = mapaSockets.get(origen);

  const arrayDestinos = objetoConexion.send;

  //Elimino de cada uno de los destinos la referencia a esta conexion
  arrayDestinos.forEach((destino, indice)=>{
    if(mapaSockets.has(destino)){
      //En el destino, busco si hay coincidencia del origen
      const objetoConexionDestino = mapaSockets.get(destino);
      let arrayDestinosDestino = objetoConexionDestino.send;
      const indiceOrigen = arrayDestinosDestino.indexOf(origen);

      //SI hay coincidencia, elimino del array y actualizo
      if(indiceOrigen >-1){
        arrayDestinosDestino = arrayDestinosDestino.splice(indiceOrigen, 1);
      }

      objetoConexionDestino.send = arrayDestinosDestino;
      mapaSockets.set(destino, objetoConexionDestino);
    }
  });

  //Elimino el objeto origen
  mapaSockets.delete(origen);
}