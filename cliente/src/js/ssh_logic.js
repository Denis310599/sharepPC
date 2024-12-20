const { ipcRenderer } = require("electron");
const { Terminal } = require('@xterm/xterm');
const  { FitAddon } = require('@xterm/addon-fit');
//Elementos del DOM
//const videoElement = document.querySelector('video');
const textoEstado = document.querySelector('.texto-estado');


const configuration = {
    'iceServers': [
        {'urls': 'stun:stun1.l.google.com:19302'},
        {'urls': 'stun:stun2.l.google.com:19302' },
        {'urls': 'turn:gusydenis.duckdns.org:3478',
            'username': 'sharepc',
            'credential': 'sharepc1'}
    ]};


let host_WS;
let host_API;
let port_API;
//var idDestino;
var id_origen;
var token;
var destino_llamada;
var signaling_channel;
var conexiones = new Map(); //{pC: pC, dC: dC}

let term;
//Me conecto con el websocket abierto
//const signalingChannel = new WebSocket('ws://localhost:28000')

/***********************************
 *    Funciones
 ***********************************/
/**
 * Función que espera a que le llamen o conmienza una llamada
 * @param {*} caller Si se comienza la llamada o no
 */
async function makeCall(caller) {
    
    console.log("Llamando...");
    //boton.style.display = "none";


    let res;
    //Si soy el que inicia la llamada creo el canal de datos y video
    if (caller){
        //Abre el web socket y inicia el protocolo de autenticacion
        res = await configuraSignalingChannel(destino_llamada);
        if(res == 0){
            console.log("Iniciando llamada...")
            comienzaLlamada(destino_llamada)
        }
    }else{
        res = await configuraSignalingChannel(null);
    }

    if(res == -1){
        console.log("Error al conectarse con el websocket")       
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

    auxConnection = await configuraPeerConnection(auxConnection, idDestino);

    //Crea los stream de video y de datos y los asocia al peerConnection
    var dataChannel = await auxConnection.createDataChannel("test");

    //Configuramos los eventos del dataChannel
    dataChannel.addEventListener('message', event=>{
        //resultado.innerText = event.data;
        procesaMensajeDataChannel(event);
        
    })


    //Actualizamos el objeto de conexion
    var conexion = conexiones.get(idDestino);
    conexion.dc = dataChannel;

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
            procesaMensajeDataChannel(event);
        })

        //Atualizo el datachannel del destino
        var conexion = conexiones.get(idDestino);
        conexion.dc = dataChannelAux;
    });

    // Listen for connectionstatechange on the local RTCPeerConnection
    peerConnection.addEventListener('connectionstatechange', event => {
        switch(peerConnection.connectionState) {
            case 'connected':
                // Peers connected!
                console.log('#####################')
                console.log('Conexión establecida!')
                console.log('#####################')
                document.getElementById('terminal-container').style.display = "block";
                textoEstado.style.display = "none";
                break;
            case 'disconnected':
                //En caso que falle, dejamos de mostrar el video
                document.getElementById('terminal-container').style.display = "none";
                textoEstado.style.display = "block";
                break;
            case 'closed':
            case 'failed':
                break;
        }
    });

    //Si recibo un video lo configuro como entrada
    /*peerConnection.addEventListener('track', async (event) => {
        console.log("Recibido stream de video!");
        const receiver = event.transceiver.receiver;
        let codecs = RTCRtpReceiver.getCapabilities("video");
        console.log(codecs);
        let codecSeleccionado = {
            "clockRate": 90000,
            "mimeType": "video/H264",
            "sdpFmtpLine": "level-asymmetry-allowed=1;packetization-mode=0;profile-level-id=42e01f"
        }

        codecSeleccionado = {
            "clockRate": 90000,
            "mimeType": "video/VP9",
            "sdpFmtpLine": "profile-id=1"
        }
        
        //event.transceiver.setCodecPreferences([codecSeleccionado]);
        videoElement.srcObject = event.streams[0];
        videoElement.play();
    })*/

    peerConnection.addEventListener('iceconnectionstatechange', event)

    if(conexiones.has(idDestino)){
        var conexion = conexiones.get(idDestino);
        conexion.pc.close();
        conexion.pc = peerConnection;
    }else{
        var conexion = {'pc': peerConnection};
        conexiones.set(idDestino, conexion);
    }

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
        'origen': id_origen
    }

    const msgTxt = JSON.stringify(mensajeFinal);
    console.log("Mensaje enviado: \n " + msgTxt);

   signaling_channel.send(msgTxt);
}

/**
 * Funcion que envia una respuesa a un keepalive al servidor
 */
function enviaKeepAlive(){
    const mensajeFinal = { 'tipo': 3, 'origen': id_origen};

    const msgTxt = JSON.stringify(mensajeFinal);
    signaling_channel.send(msgTxt);
}
/**
 * Configura el canal de señalizacion para un destino
 * @param {String} destino 
 */
async function configuraSignalingChannel(destino){
    let sCh = new WebSocket(host_WS);

    //Establezco la conexion con el websocket
    let res = await autenticaWs(sCh, destino);
    
    if (res == -1){
        console.log("Error al establecer conexion con el websocket");
        return -1;
    }


    console.log("Configurando signal channel");
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
                    //Se comprueba si la conexion existe
                    let conexion;

                    //Como estoy recibiendo una oferta tengo que crear un nuevo peer
                    const pc = new RTCPeerConnection(configuration);
                    await configuraPeerConnection(pc, json_recibido.origen);
                    conexion = conexiones.get(json_recibido.origen);    
                    
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
                    //Se reciben ice candidates
                    console.log("recibidos ice-candidates de mensaje")
                    //Se comprueba si existe la conexion y se actualiza
                    if(conexiones.has(json_recibido.origen)){
                        let conexion = conexiones.get(json_recibido.origen);
                        try {
                            await conexion.pc.addIceCandidate(json_recibido.contenido.ice);
                        } catch (e) {
                            console.error('Error adding received ice candidate', e);
                        }
                    }
                }
            }else if(json_recibido.tipo == 3){
                //Se trata de un keepalive, hay que responderlo
                enviaKeepAlive();
            }
        }catch(e){
            console.log("Error el procesar el mensaje recibido " + e);
        }
    });
    signaling_channel = sCh;
    return 0;


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
                console.log("WS conectado")
                resolve();
                clearInterval(interval);

                
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
        return -1
    }

    //Si ha ido todo bien continuo con la autenticacion
    let respuestaRecibida = false;
    let respuesta = false;
    await new Promise(async (resolve) => {
        signalingChannel.addEventListener('message', async (message)=>{
            respuestaRecibida = true;
            try{
                let json_recibido = JSON.parse(await message.data)
                if(json_recibido.tipo == 1){
                    respuesta = json_recibido.contenido;
                    
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

    if(!respuestaRecibida || !respuesta){
        console.log("Error al autenticarse en el websocet")
        return -1;
    }
    console.log("WebSocket autenticado correctamente")
    return 0;
}

/**
 * Funcion que configura la terminal
 */
function configuraTerminal(idDestino){
    term = new Terminal();
    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    
    term.open(document.getElementById('terminal-container'));
    fitAddon.fit();

    term.write('\n Usuario: share, Contraseña: share\n');
    //Envio los comando al servidor cuando los ejecuto
    term.onData(data=>{
        const mensaje = {'tipo': "cmd", 'datos': data};
        conexiones.get(idDestino).dc.send(JSON.stringify(mensaje));
        console.log(mensaje);
        //term.write(data);
    });

    window.onresize = function () {
        fitAddon.fit();
    };

    term.onResize((evt) => {
        const terminal_size = {
            Width: evt.cols,
            Height: evt.rows,
          };
        const mensaje = {'tipo': "cmd", 'datos': "\x04" + JSON.stringify(terminal_size)};
        //conexiones.get(idDestino).dc.send(JSON.stringify(mensaje));
        console.log(mensaje);

    });

    
}

/**
 * Función que procesa un mensaje recibido por el datachannel
 * @param {*} event 
 */
function procesaMensajeDataChannel(event){
    const mensaje = event.data;
    const dataJSON = JSON.parse(mensaje);
    if(dataJSON.datos == '\r\n*** SSH CONNECTION CLOSED ***\r\n'){
        //Si la conexion SSH se cierra, me salgo
        desconectar();
    }

    if(term !== null){
        
        term.write(dataJSON.datos);
    }
}

/**
 * Funcion que te desconecta del host
 */
function desconectar(){
    //Envio un mensaje de desconexion al ws
    if (signaling_channel != null){
        signaling_channel.send(JSON.stringify({'tipo': 3}));
    }

    //Me salgo de la pantalla
    ipcRenderer.send('cambia-pantalla', "main", new Map());
}
/*****************************************************
 *                   Logica de la app
 * ***************************************************
 */

//Consulto las variables globales
ipcRenderer.send('get-global-variables', "SSH");

//Espero a rebir respuesta del main
ipcRenderer.on('global-variables', (e, variables)=>{
  host_API = variables.get('host_API');
  id_origen = variables.get('session_id');
  token = variables.get('token');
  host_WS = variables.get('host_WS');
  destino_llamada = variables.get('id_contenedor');


  console.log("Variables globales obtenidas");
  variables.forEach((v, k, m) =>{
    console.log(k + ": " + v);
  })

  //Cuando he finalizado, comienzo con la logica de la app
  configuraTerminal(destino_llamada);

  //Comienzo la llamada
  makeCall(true);
});


//Configuro el boton de desconectar
document.getElementById("botonDesconectar").onclick = ()=>{
    desconectar();
};

