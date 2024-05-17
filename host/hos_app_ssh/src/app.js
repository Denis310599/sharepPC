const https = require('https');
const { WebSocket } = require('ws');
const {RTCPeerConnection, RTCSessionDescription} = require('@roamhq/wrtc');
const { exec, spawn } = require('child_process');
//import { AttachAddon } from '@xterm/addon-attach';
//const pty = require('node-pty');

const inicia = false;
//const resultado = document.getElementById('resultado');
//const boton = document.getElementById('connectBtn');
//const videoElement = document.querySelector('video');
//const videoElement = document.querySelector('video');
/*boton.onclick = (()=>{
    setUpWebRtc(true)
})*/

//resultado.innerText = "Holaa";
const configuration = {
    'iceServers': [
        {'urls': 'stun:stun1.l.google.com:19302'},
        {'urls': 'stun:stun2.l.google.com:19302' },
        {'urls': 'turn:gusydenis.duckdns.org:3478',
            'username': 'sharepc',
            'credential': 'sharepc1'}
    ]};


const hostWs = "ws://gusydenis.duckdns.org:28000"
const host = 'hqna10txtk.execute-api.eu-west-3.amazonaws.com';
const contenedorPath = '/Test/contenedor';
//var idDestino;
var idOrigen = process.env.IDOG;//"denisCont#1710429524";
var token = process.env.TOKEN;//"CNT-17104jxawjqdgughltpdqnxmw29524";
token = "CNT-17104jxawjqdgughltpdqnxmw29524";
idOrigen = "denisCont#1710429524";
//idOrigen = "denisc-1711984451";
//token = "CNT-17119qrmebeyohzjwahgsrnhm84451";
var signalingChannel;
var conexiones = new Map(); //{pC: pC, dC: dC, iniciador: true/false}

let terminal;
//Me conecto con el websocket abierto
//const signalingChannel = new WebSocket('ws://localhost:28000')

//Comienzo la ejecucion
setUpWebRtc(true);

//Funcion que realiza la llamada
async function setUpWebRtc(caller) {
    let res = -1;
    while(res == -1){
        console.log("Llamando...");
        //boton.style.display = "none";


        //Si soy el que inicia la llamada creo el canal de datos y video
        if (caller){
            //Abre el web socket y inicia el protocolo de autenticacion
            res = await configuraSignalingChannel();


            //Compruebo si habia alguien conectado a mi y inicio la comunicacion con cada uno de ellos
            if(res !== 0 && res !== -1){
                res.forEach(async (destino)=>{
                    await comienzaLlamada(destino);
                });
                //comienzaLlamada(destinoLlamada)
            }
        }else{
            //abre el socket
            res = await configuraSignalingChannel();
        }

        if(res === -1){
            console.log("Error al conectarse con el websocket")       
        }else{
            console.log("Escuchando peticiones de conexión");
            //Indica que se encuentra preparado
            enviaContenedorReady(token);
        }
    }

}

function errorHandler(error) {
    console.log(error);
}

/**
 * Función que comienza una nueva llamada
 */
async function comienzaLlamada(idDestino){
    //Crea el peerConnection
    var auxConnection = new RTCPeerConnection(configuration);
    //auxConnection.addStream(videoStream);
    auxConnection = await configuraPeerConnection(auxConnection, idDestino);

    //Crea los stream de video y de datos y los asocia al peerConnection
    var dataChannel = await auxConnection.createDataChannel("test");

    
    //Configuramos los eventos del dataChannel
    dataChannel.addEventListener('message', event=>{
        console.log("Mensaje Recibido por DataChannel");
        console.log(event.data);
        //resultado.innerText = event.data;
        const mensaje = event.data;
        //resultado.innerText = mensaje;
        procesaMensajeDataChannel(idDestino, event.data);
        
    })


    //Actualizamos el objeto de conexion
    var conexion = conexiones.get(idDestino);
    conexion.dc = dataChannel;

    conexion.iniciador = true;

    //Realiza la llamada en si, comienza la oferta
    console.log("Creando oferta...");
    
    const offer = await auxConnection.createOffer();
    await auxConnection.setLocalDescription(offer);
    enviaMensajeSenializacion({'offer': auxConnection.localDescription}, idDestino);
    console.log("Oferta enviada");
    console.log(auxConnection.localDescription);

}

/**
 * Configura la peer connection que se le pasa como parámetro con todos los callbacks necesarios
 * @param {RTCPeerConnection} peerConnection 
 * @returns peerConnection actualizada.
 */
async function configuraPeerConnection(peerConnection, idDestino){

    // Listen for local ICE candidates on the local RTCPeerConnection
    peerConnection.addEventListener('icecandidate', event => {
        console.log("Evento icecandidate")
        if (event.candidate != null) {
            //Envio el mensaje por el canal
            enviaMensajeSenializacion({'ice': event.candidate}, idDestino)
        }
    });

    peerConnection.addEventListener('datachannel', event => {
        //Actualizo el data channel
        console.log("Creando data channel")
        console.log(event.channel)
        var dataChannelAux = event.channel;

        
        
        dataChannelAux.addEventListener('message', event =>{
            console.log("Mensaje Recibido por DataChannel (configuraPeerConnection)");
            const mensaje = event.data;
            //resultado.innerText = mensaje;
            procesaMensajeDataChannel(idDestino, event.data);
        })

        //Actualizo el datachannel del destino
        var conexion = conexiones.get(idDestino);
        conexion.dc = dataChannelAux;
    });

    // Listen for connectionstatechange on the local RTCPeerConnection
    peerConnection.addEventListener('connectionstatechange', event => {
        if (peerConnection.connectionState === 'connected') {
            // Peers connected!
            console.log('#####################')
            console.log('Conexión establecida!')
            console.log('#####################')

            //COnfiguro la nueva terminal del usuario
            configuraTerminal(idDestino);

            //Compruebo si tengo que renegociar para enviar el video Stream
            if(conexiones.get(idDestino).iniciador == false){
                //comienzaLlamada(idDestino);
            }
        }
    });

    if(conexiones.has(idDestino)){
        var conexion = conexiones.get(idDestino);
        conexion.pc.close();
        conexion.pc = peerConnection;
    }else{
        var conexion = {'pc': peerConnection};
        conexiones.set(idDestino, conexion);
    }

    let aux = conexiones.get(idDestino);
    console.log("Conexion actualizada: ");
    console.log(aux);


    return peerConnection;

}

/**
 * Función que envía un mensaje por el canal de señalización
 * @param {Object} mensaje 
 * @param {String} destino 
 */
async function enviaMensajeSenializacion(mensaje, destino){
    //Construyo el mensaje y envio
    var mensajeFinal = {
        'tipo': 0,
        'contenido': mensaje,
        'destino': destino, 
        'origen': idOrigen
    }

    const msgTxt = JSON.stringify(mensajeFinal);
    console.log("Mensaje enviado: \n " + msgTxt);

    signalingChannel.send(msgTxt);
}

/**
 * Configura el canal de señalizacion para un destino
 * @param {String} destino 
 */
async function configuraSignalingChannel(){
    let sCh = new WebSocket(hostWs);

    //Establezco la conexion con el websocket
    let res = await autenticaWs(sCh, null);
    
    if (res == -1){
        console.log("Error al establecer conexion con el websocket");
        return -1;
    }


    //Configuro todos los eventos
    //Proceso los mensajes recibidos por la señalizacion
    sCh.addEventListener('message', async message => {
        try{
        console.log("Mensaje recibido!")
        const mensaje_recibido = await message.data;
        const json_recibido = JSON.parse(mensaje_recibido)
        if(json_recibido.tipo == 0){
            if (json_recibido.contenido.answer) {
                //Se recibe una respuesta a una oferta
                console.log("Respuesta a oferta Recibida");
                //Se comprueba si tengo esta conexion
                if(conexiones.has(json_recibido.origen)){
                    let pc = conexiones.get(json_recibido.origen).pc;

                    pc.setRemoteDescription(new RTCSessionDescription(json_recibido.contenido.answer)).then(async () =>{
                        console.log('remote Description recibida y configurada')
                    });
                }
            }else if(json_recibido.contenido.offer){
                //Se recibe una nueva oferta
                console.log("Oferta recibida")


                //Un cliente quiere contactar conmigo, comienzo una nueva llamada a ese cliente.
                comienzaLlamada(json_recibido.origen);

                return;
                //Se comprueba si la conexion existe
                let conexion;

                
                const pc = new RTCPeerConnection(configuration);
                await configuraPeerConnection(pc, json_recibido.origen);
                conexion = conexiones.get(json_recibido.origen);

                conexion.iniciador = false;
                //Proceso la oferta y creo la respuesta
                conexion.pc.setRemoteDescription(new RTCSessionDescription(json_recibido.contenido.offer)).then(async ()=>{
                    console.log("Remote description creada");
                    if(json_recibido.contenido.offer.type == 'offer'){
                        console.log("Enviando respuesta a oferta");
                        const answer = await conexion.pc.createAnswer()
                        await conexion.pc.setLocalDescription(answer);
                        enviaMensajeSenializacion({'answer':conexion.pc.localDescription}, json_recibido.origen);
                        console.log("Respuesta enviada!");
                        console.log(conexion.pc.localDescription);                                
                    }
                }).catch(errorHandler); 
            }else if(json_recibido.contenido.ice){
                console.log("recibidos ice-candidates de mensaje")
                //Se comprueba si existe la conexion y se actualiza
                if(conexiones.has(json_recibido.origen)){
                    let conexion = conexiones.get(json_recibido.origen);
                    console.log(conexion);
                    try {
                        await conexion.pc.addIceCandidate(json_recibido.contenido.ice);
                    } catch (e) {
                        console.error('Error adding received ice candidate', e);
                    }
                }
                
            }
        }else if(json_recibido.tipo == 3){
            //Envia mensaje de KeepAlive de vuelta al servidor
            enviaKeepAlive();
        }
    }catch(e){
        console.log("Error el procesar el mensaje recibido " + e);
    }
    });

    signalingChannel = sCh;
    return res;


}


/**
 * Realiza la autenticacion de un nuevo websocket
 * @param {WebSocket} signalingChannel
 * @param {String} destino 
 */
async function autenticaWs(signalingChannel, destino){
    const mensajeAutenticacion = {
        'tipo': 1,
        'token': token
    };

    if (destino !== null){
        mensajeAutenticacion.destino = destino;
    }

    //Espero a que se haya establecido la conexion con el websocket, esperando como maximo 10s.
    let readyState = false;
    let tiempoEsperado = 0;
    await new Promise((resolve) => {
        var interval = setInterval(()=>{
            if(signalingChannel.readyState === 1){
                //WS Conectado
                readyState = true;
                console.log("WS conectado");
                clearInterval(interval);
                resolve();
            }else{
                if(tiempoEsperado >= 10000){
                    //Error al conectarse con el websocket, no disponible
                    console.log("Error al conectarse con el websocekt. Parece no estar disponible")
                    clearInterval(interval);
                    resolve();
                }
                tiempoEsperado +=500;
            }
        }, 500);
    });

    //Si ha fallado me salgo
    if(!readyState){
        console.log("Error al conectar con el ws")
        return -1
    }

    console.log("Conectado al ws correctamente")

    //Si ha ido todo bien continuo con la autenticacion
    let respuestaRecibida = false;
    let respuesta = false;
    let listaDestino;
    await new Promise(async (resolve) => {
        signalingChannel.addEventListener('message', async (message)=>{
            console.log("Respuesta del SignalServer: " + message.data);
            respuestaRecibida = true;
            try{
                let json_recibido = JSON.parse(await message.data)
                if(json_recibido.tipo == 1){
                    respuesta = json_recibido.contenido;
                    if (json_recibido.hasOwnProperty('destinos')){
                        listaDestino = json_recibido.destinos;
                    }
                }
            }catch(e){
                console.log("Error al procesar los datos del json");
            }
            
            resolve();
        });
        //Envio el mensaje de autenticacion
        signalingChannel.send(JSON.stringify(mensajeAutenticacion));

        setTimeout(()=>{
            if(respuestaRecibida = false){
                resolve();
            }
        }, 10000);
    });

    if(!respuestaRecibida){
        return -1;
    }

    console.log("Autenticación con el WS satisfactoria");
    return listaDestino;
}

/**
 * Procesa unmensaje proveniente del data channel y realiza los eventos
 * de raton y teclado correspondientes
 * @param {String} data 
 */
function procesaMensajeDataChannel(idDestino, data){
    try{
        const json_recibido = JSON.parse(data);
        console.log("Mensaje recibido: ");
        console.log(json_recibido);
        //resultado.innerText = data;
        if(json_recibido.tipo === 'cmd'){
            const comando = json_recibido.datos;
            var conexion = conexiones.get(idDestino);
            if(Object.hasOwn(conexion, 'term')){
                //Ejecuto el comando recibido
                console.log("Escribiendo en stdin: " + comando);

                if(comando == '\r'){
                    conexion.term.stdin.write('\n');
                }else{
                    conexion.term.stdin.write(comando);
                }
            }
            if(Object.hasOwn(conexion, 'dc')){
                //conexion.dc.send(JSON.stringify({'tipo': "cmd", 'datos': comando}));
            }
        }
    }catch(error){
        //Error al parsear el json
        //resultado.innerText = data;
        console.error(error);
    }
}

/**
 * Función que configura la terminal remota desde el lado del servidor
 */
function configuraTerminal(idDestino){
  //Obtengo la conexion a la que quiero conectar por ssh
  var conexion = conexiones.get(idDestino);

  if(Object.hasOwn(conexion, 'term')){
    return;
  }
  //Configuro la sesion de bash
  const terminal = spawn('bash');

  //Añado todos los eventos de respuesta al cliente
  terminal.stdout.on('data', data => {
    console.log("Comando escrito en la terminal: " + data.toString());
    conexion.dc.send(JSON.stringify({'tipo': "cmd", 'datos': data.toString()}));
  });

  terminal.stderr.on('data', data => {
    console.log("Error escrito en la terminal: " + data.toString());
    conexion.dc.send(JSON.stringify({'tipo': "cmd", 'datos': data.toString()}));
  })

  //Por ultimo almaceno de vuelta el objeto
  conexion.term = terminal;
  terminal.stdin.write('cd ~\n');
}



/**
 * Funcion que envia una peticion a la API y ejecuta el callback en la respuesta
 * @param {string} peticion 
 * @param {string} data 
 * @param {*} callback 
 */
function enviaPeticionAPI(peticion, tk, callback){
    var httpOptions = {
      hostname: host,
      port: 443,
      path: contenedorPath+"?token=" + tk,
      method: peticion
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

    req.end();
  }


  /**
   * Función que indica a la API que el contenedor está preparado
   */
  async function enviaContenedorReady(tk){
    //Envío la petición a la API REST.
    enviaPeticionAPI('PUT', tk, (data, error)=>{
        if(!error){
            console.log("Mensaje recibido del server: \n"+ data);
        }else{
            console.log("Error al enviar el contenedorReady");
        }
    });
  }

  /**
 * Funcion que envia una respuesa a un keepalive al servidor
 */
function enviaKeepAlive(){
    const mensajeFinal = { 'tipo': 3, 'origen': idOrigen};

    const msgTxt = JSON.stringify(mensajeFinal);
    signalingChannel.send(msgTxt);
}