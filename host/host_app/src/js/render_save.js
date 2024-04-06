const { ipcRenderer, Math} = require("electron");

const {desktopCapturer} = require("electron/main");

const videoElement = document.querySelector('video');

const inicia = true;
const streamVideo = true;
const resultado = document.getElementById('resultado');
const boton = document.getElementById('connectBtn');
boton.onclick = makeCall
let dataChannel=null;
var ws_res_recibida = false;
var peeroConnection;
var videoStream;


resultado.innerText = "Holaa";







//Me conecto con el websocket abierto
var signalingChannel = new WebSocket('ws://gusydenis.duckdns.org:28000')

setTimeout(()=>{
    if(signalingChannel.readyState === 1){
        setup();
    }
})
setup();

async function setup(){
    //Configuro lo inicial
    //Pillo las fuentes de video
    ipcRenderer.send('get-video-source');

    ipcRenderer.on('video-source-selected', async (e, source)=> {
        //Fuente de video seleccionada
        const constraints = {
            audio: false,
            video: {
                mandatory: {
                    chromeMediaSource: 'desktop',
                    chromeMediaSourceID: source.id,
                },
                
            }
        };
    
        //Se crea el stream de video
        
        var stream;
        try{
            //console.log(navigator.mediaDevices.getSupportedConstraints());
            stream = await navigator.mediaDevices.getUserMedia(constraints);
            //const stream = await navigator.mediaDevices.getDisplayMedia(constraints);
        }catch(e){
            console.log("Error al pillar el stream: " + e)
        }

        videoStream = stream;
        //videoElement.srcObject = stream;
        //videoElement.play();

        makeCall();
    });

    
    
}

if(!inicia){
    makeCall();
}

//Funcion que realiza la llamada
async function makeCall() {
    console.log("Llamando...");
    ipcRenderer.send('log', "Llamando...");
    boton.style.display = "none";

    const configuration = {
        'iceServers': [
            {'urls': 'stun:stun1.l.google.com:19302'},
            {'urls': 'stun:stun2.l.google.com:19302' },
            { urls: 'turns:freeturn.net:5349', username: 'free', credential: 'free' } 
        ]};

    peerConnection = new RTCPeerConnection(configuration);

    
    if (inicia){
        ipcRenderer.send('log', "Creando data channels y video");
        if(!streamVideo){
            console.log("Creando data channel");
            dataChannel = await peerConnection.createDataChannel("cliente");

            dataChannel.addEventListener('message', event =>{
                const mensaje = event.data;
                resultado.innerText = mensaje;
            });

            dataChannel.onopen = () => {
                dataChannel.send("Holaaarl wapeton");
            };
        }else{
            //Si quiero stremear video, creo un stream de video
            peerConnection.addStream(videoStream);

            dataChannel = await peerConnection.createDataChannel("cliente");

            //Creamos tbn el stream de datos
            dataChannel.addEventListener('message', event =>{
                resultado.innerText = "Mensaje recibido";
                procesaMensajeDataChannel(event.data);
            });

            dataChannel.onopen = () => {
                dataChannel.send("Holaaarl wapeton");
            };
            
        }
        
    }

    //Proceso los mensajes recibidos por la señalizacion
    signalingChannel.addEventListener('message', async message => {
        ws_res_recibida = true;
        ipcRenderer.send('log', "Mensaje recibido :)");
        console.log("Mensaje recibido!")
        
        const mensaje_recibido = await message.data.text();
        const json_recibido = JSON.parse(mensaje_recibido)
        console.log(mensaje_recibido);
        if (json_recibido.answer) {
            console.log("Respuesta recibida");
            console.log(json_recibido)

            peerConnection.setRemoteDescription(new RTCSessionDescription(json_recibido.answer)).then(async () =>{
                console.log('remote Description recibida y configurada')
            });
        }else if(json_recibido.offer){
            console.log("Oferta recibida")

            peerConnection.setRemoteDescription(new RTCSessionDescription(json_recibido.offer)).then(async ()=>{
                console.log("Remote description creada");
                if(json_recibido.offer.type == 'offer'){
                    console.log("Enviando respuesta a oferta");
                    const answer = await peerConnection.createAnswer()
                    await peerConnection.setLocalDescription(answer);
                    signalingChannel.send(JSON.stringify({'answer':peerConnection.localDescription}));
                    console.log("Respuesta enviada!");
                    console.log(peerConnection.localDescription);                                   
                }
            }).catch(errorHandler); 
        }else if(json_recibido.ice){
            console.log("recibidos ice-candidates de mensaje")
            try {
                await peerConnection.addIceCandidate(json_recibido.ice);
            } catch (e) {
                console.error('Error adding received ice candidate', e);
            }
        }
    });

    //Si inicio yo la llamada, creo la oferta y la envio
    if(inicia){
        enviaOfertaWebRTC();
    }
    
    //Intercambio de mensajes de los datos ICE
    // Listen for local ICE candidates on the local RTCPeerConnection
    peerConnection.addEventListener('icecandidate', event => {
        console.log("Evento icecandidate")
        if (event.candidate != null) {
            enviaMensajeSenializacion(JSON.stringify({'ice': event.candidate}));
        }
    });


    peerConnection.addEventListener('datachannel', event => {
        //Creando data channel
        console.log("Creando data channel")
        console.log(event.channel)
        dataChannel = event.channel;

        dataChannel.addEventListener('message', event =>{
            const mensaje = event.data;
            resultado.innerText = mensaje;
        });

        dataChannel.onopen = () => {
            dataChannel.send("Holaaarl wapeton");
        };
    });

    // Listen for connectionstatechange on the local RTCPeerConnection
    peerConnection.addEventListener('connectionstatechange', event => {
        if (peerConnection.connectionState === 'connected') {
            // Peers connected!
            console.log('#####################')
            console.log('Conexión establecida!')
            console.log('#####################')
        }
    });

}

function errorHandler(error) {
    console.log(error);
}


function procesaMensajeDataChannel(data){
    resultado.innerText = "aaa";
    try{
        const json_recibido = JSON.parse(data);
        resultado.innerText = data;
        if(json_recibido.tipo === 'mouse'){

            ipcRenderer.send('mouse-action', json_recibido);

        }else if(json_recibido.tipo === 'keyboard'){
            ipcRenderer.send('key-action', json_recibido);
        }
    }catch(error){
        //Error al parsear el json
        resultado.innerText = data;
    }
}

/**
 * Funcion que envia una oferta por el canal de señalizacion
 * 
 */
async function enviaOfertaWebRTC(){
    ipcRenderer.send('log', "Creando oferta...");
    console.log("Creando oferta...");
    try{
    const offer = await peerConnection.createOffer();
    ipcRenderer.send('log', "Oferta creada");
    await peerConnection.setLocalDescription(offer);
    ipcRenderer.send('log', "Oferta creada");
    signalingChannel.send(JSON.stringify({'offer': peerConnection.localDescription}));
    }catch(e){
        ipcRenderer.send('log', e)
        ipcRenderer.send('log', "Error al obtener la oferta, reiniciando...")
        setup();
    }

    ipcRenderer.send('log', "Oferta enviada");
    //Indico que se ha enviado el mensaje y espero a recibir respuesta
    setTimeout(() => {
        //Comrpuebo que se haya recibido algo
        if(!ws_res_recibida){
            ipcRenderer.send('log', "No se ha recibido un mensaje a tiempo");
            signalingChannel.close();
            signalingChannel = new WebSocket('ws://gusydenis.duckdns.org:28000')

        setTimeout(()=>{
            if(signalingChannel.readyState === 1){
                setup();
            }
        })
        }
    }, 3000);
}

/**
 * 
 * Funcion que envia un mensaje por el canal de señalizacion
 */
async function enviaMensajeSenializacion(mensaje){
    ws_res_recibida = false;
    signalingChannel.send(mensaje);
    setTimeout(() => {
        //Comrpuebo que se haya recibido algo
        if(!ws_res_recibida){
            ipcRenderer.send('log', "No se ha recibido un mensaje a tiempo, reiniciando...");
            makeCall()
        }
    }, 3000);
}