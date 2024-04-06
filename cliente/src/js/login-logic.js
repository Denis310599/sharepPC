const { ipcRenderer } = require("electron");
const https = require('https');

//Constantes del DOM
const boton_mover_crear_cuenta = document.getElementById("botonMoverCrearCuenta");
const boton_cancelar_crear = document.getElementById("botonCancelarCreacion");
const boton_iniciar_sesion = document.getElementById("botonLogin");
const boton_crear_cuenta = document.getElementById("botonCrearCuenta");
const modal_alerta = document.getElementById("modalAlertaUsuario");
const modal_cargando = document.getElementById("modalCargando");

//Variables globales
let host_API;

/***********************************
 *    Eventos
 ***********************************/
//Eventos de botones
boton_mover_crear_cuenta.onclick = botonCrearCuentaPulsado;
boton_cancelar_crear.onclick = botonVolverPulsado;
boton_iniciar_sesion.onclick = iniciarSesion;
boton_crear_cuenta.onclick = crearCuentaPulsado;





/***********************************
 *    Funciones
 ***********************************/
/**
 * Funcion que gestiona el comportamiento del boton de crear cuenta
 */
function botonCrearCuentaPulsado(){
  //Obtengo la flipCard
  const flipCard = document.querySelector(".flip-card");

  //Añado la propiedad para que se muestre el panel de crear cuenta
  flipCard.classList.add("crear");
}

/**
 * Funcion que retorna al panel de login
 */
function botonVolverPulsado(){
  //Obtengo la flipCard
  const flipCard = document.querySelector(".flip-card");

  //Añado la propiedad para que se muestre el panel de crear cuenta
  flipCard.classList.remove("crear");
}

function iniciarSesion(){
  disableButtons();
  const modal = document.querySelector(".pantalla-login");

  //Obtengo los datos
  const usuario = modal.querySelector(".usuario").value;
  const contra = modal.querySelector(".contra").value;


  //Compruebo los datos
  let error = false;

  if(!usuario.match(/^[a-zA-Z\d][a-zA-Z \d]+/g)){
    //Error en el nombre de usuario
    modal.querySelector(".error-message").textContent = "El nombre solo puede contener caracteres alfanuméricos y espacios, y como minimo un caracter distinto a un espacio";
    modal.querySelector(".error-message").classList.remove("disabled");
    enableButtons();
    return;
  }

  muestraDialogCargando("Iniciando sesión");
  //Inicia sesion a traves de la API
  enviaPeticionAPI('POST', "login", {'action': "login",
                                      'user': usuario.trim(),
                                      'contra': contra},
  (data, error)=>{
    hideDialogCargando();
    try{
      if(!error){
        const dataJson = JSON.parse(data);
        console.log(dataJson);
        if(dataJson.hasOwnProperty("code")){
          const code = dataJson.code;
          if(code == 0){
            //Login correctom proceso los datos recibidos
            const token = dataJson.args.token;
            const session_id = dataJson.args.session_id;

            //Compruebo si tengo que almacenar los datos permanentemente
            if(modal.querySelector(".input-dato.checkbox").getElementsByTagName("input")[0].checked){
              ipcRenderer.send("set-sesion-persistente", token, session_id);
            }

            //Indico que me quiero cambiar de pantalla
            const mapaDatos = new Map();
            mapaDatos.set("token", token);
            mapaDatos.set("session_id",session_id);
            ipcRenderer.send("cambia-pantalla", "main", mapaDatos);
          }else{
            console.log(dataJson.description)
            throw("La combinación de usuario y contraseña no existe.");
          }
        }else{
          throw("Error al comunicarse con el servidor. Por favor, inténtelo de nuevo");
        }
      }else{
        throw("Error al comunicarse con el servidor. Por favor, inténtelo de nuevo");
      }
    }catch(e){
      modal.querySelector(".error-message").textContent = e;
      modal.querySelector(".error-message").classList.remove("disabled");

      enableButtons();
    }
  })
}

/**
 * Funcion que envia una peticion a la API y ejecuta el callback en la respuesta
 * @param {string} peticion 
 * @param {string} tk
 * @param {Object} args argumentos de la solicitud 
 * @param {*} callback Toma como argumentos la respuesta de la API y si se ha producido un error
 */
function enviaPeticionAPI(peticion, tk, args, callback){
  var httpOptions = {
    hostname: host_API,
    port: 443,
    method: peticion
  }
  
  let data; //Contendra, en caso de ser necesario, el body

  //Relleno los httpOptions segun el metodo usado

  //Peticion GET
  if(peticion == 'GET'){
    
    let path_final = "/Test/contenedor?token="+tk;

    Object.keys(args).forEach(item =>{
      path_final += `&${item.key}=${item.value}`;
    });

    httpOptions.path = path_final;

  //Peticion POST
  }else if(peticion == 'POST'){
    httpOptions.path = "/Test/login";
    
    const datosAux = args;
    if(tk != "login"){
      datosAux.token = tk;
    }
    
    data = JSON.stringify(datosAux);

    httpOptions.headers = {
      'Content-Type': 'application/json',
      'Content-Length': data.length
    };
  }

  //Envio la peticion
  const req = https.request(httpOptions, (res) => {
    res.on('data', d =>{
      console.log(data);
      console.log("Respuesta de la API recibida");
      callback(d, false);
    });
  });

  req.on('error', e =>{
    console.log("Error al recibir la respuesta de la API: \n" + e);
    callback(e, true);
  });

  //Si tengo que enviar body, lo envio
  if(peticion == 'POST'){
    req.write(data);
  }

  req.end();
  
}

function crearCuentaPulsado(){
  disableButtons();

  const modal = document.querySelector(".pantalla-crea");

  //Obtengo los datos
  const correo = modal.querySelector(".correo").value;
  const contra = modal.querySelector(".contra").value;
  const contraRep = modal.querySelector(".rep-contra").value;
  const usuario = modal.querySelector(".usuario").value;

  const mensajeError = modal.querySelector(".error-message");

  //Comprobamos la validez de los datos introducidos
  if(!correo.match(/^[a-zA-Z \d]+[@][a-z]+[.][a-z ]+/g)){
    //correo introducido no tiene el formato correcto
    mensajeError.textContent = "Error: El correo electrónico debe corresponderse con uno real.";
    mensajeError.classList.remove("disabled");
    enableButtons();
    return;
  }

  if(!usuario.match(/^[a-zA-Z\d][a-zA-Z \d]+/g)){
    //Usuario introducido no tiene el formato correcto
    mensajeError.textContent = "Error: El nombre solo puede contener caracteres alfanuméricos y espacios, y como minimo un caracter distinto a un espacio";
    mensajeError.classList.remove("disabled");
    enableButtons();
    return;
  }

  if(contra != contraRep){
    //Contraseñas no coinciden
    mensajeError.textContent = "Error: Las contraseñas no son iguales. Ambas contraseñas deben coincidir";
    mensajeError.classList.remove("disabled");
    enableButtons();
    return;
  }

  muestraDialogCargando("Creando cuenta");
  //Procedemos a crear la cuenta
  enviaPeticionAPI('POST', "login", {'action': "crea",
                                      'user': usuario,
                                      'contra': contra,
                                      'correo': correo},
  (data, error) =>{
    hideDialogCargando();
    try{
      if(!error){
        const dataJson = JSON.parse(data);
        console.log(dataJson);
        if(dataJson.hasOwnProperty("code")){
          const code = dataJson.code;
          if(code == 0){
            //Cuenta creada correctamente
            //Pulso el boton de volver
            enableButtons();
            muestraMensajeAlerta("Crear Cuenta", "La cuenta se ha creado satisfactoriamente", false, true);
            boton_cancelar_crear.click();
          }else{
            switch(dataJson.code){
              case 1:
                throw("Ya existe una cuenta con ese nombre de usuario.");
                break;
              case 2:
                throw("Ya existe una cuenta cone se correo electrónico");
                break;
            }
          }
        }else{
          throw("Error al comunicarse con el servidor. Por favor, inténtelo de nuevo");
        }
      }else{
        throw("Error al comunicarse con el servidor. Por favor, inténtelo de nuevo");
      }
    }catch(e){
      modal.querySelector(".error-message").textContent = e;
      modal.querySelector(".error-message").classList.remove("disabled");

      enableButtons();
    }
  });

}

/**
 * Funcion que muestra al usuario un dialogo de alerta
 * @param {String} titulo El titulo que tendrá el dialog
 * @param {String} texto El texto que se quiere mostrar en el mensaje
 * @param {Boolean} cancelarBtn [cancelarBtn = true]  Si tiene o no el boton de aceptar
 * @param {Boolean} aceptarBtn [aceptarBtn = true]  Si tiene o no el boton de cancelar
 */
function muestraMensajeAlerta(titulo, texto, cancelarBtn=true, aceptarBtn=true){
  //Relleno la información del modal
  const tituloObj = modal_alerta.querySelector(".titulo-modal");
  const textoObj = modal_alerta.querySelector(".mensaje");
  const botonAceptar = modal_alerta.querySelector(".boton-aceptar");
  const botonCancelar = modal_alerta.querySelector(".boton-cancelar");

  tituloObj.textContent = titulo;
  textoObj.textContent = texto;

  if(!aceptarBtn){
    botonAceptar.style.display="none";
  }
  if(!cancelarBtn){
    botonCancelar.style.display="none";
  }

  modal_alerta.style.display = "block";
  
  modal_alerta.classList.add("in");
  modal_alerta.querySelector('.modal-content').classList.add("in");
    
  modal_alerta.onanimationend = ()=>{
    modal_alerta.classList.remove("in");
    modal_alerta.querySelector('.modal-content').classList.remove("in");
  }


  const comportamientoPorDefecto = ()=>{
    modal_alerta.classList.add("out");
    modal_alerta.querySelector('.modal-content').classList.add("out");

    modal_alerta.onanimationend = ()=>{
      modal_alerta.style.display = "none";
      modal_alerta.classList.remove("out");
      modal_alerta.querySelector('.modal-content').classList.remove("out");
    }
  }

  botonAceptar.onclick = comportamientoPorDefecto;
  botonCancelar.onclick = comportamientoPorDefecto;
}


/**
 * Muestra el dialog de cargando
 * @param {String} titulo 
 */
function muestraDialogCargando(titulo){
  const tituloObj = modal_cargando.querySelector(".titulo-modal");

  //Ajusto el titulo
  tituloObj.textContent = titulo;

  //Muestro el modal
  modal_cargando.style.display = "block";
  
  modal_cargando.classList.add("in");
  modal_cargando.querySelector('.modal-content').classList.add("in");
    
  modal_cargando.onanimationend = ()=>{
    modal_cargando.classList.remove("in");
    modal_cargando.querySelector('.modal-content').classList.remove("in");
  }

}

/**
 * Función que oculta el dialogo de cargando
 */
function hideDialogCargando(){
  modal_cargando.classList.add("out");
  modal_cargando.querySelector('.modal-content').classList.add("out");

  modal_cargando.onanimationend = ()=>{
    modal_cargando.style.display = "none";
    modal_cargando.classList.remove("out");
    modal_cargando.querySelector('.modal-content').classList.remove("out");
  }
}

/***********************************
 *    Funcionamiento al principio
 ***********************************/
//Funcionamiento inicial del script
disableButtons();
muestraDialogCargando("Iniciando sesión");
ipcRenderer.send('get-global-variables', "login");

//Espero a rebir respuesta del main
ipcRenderer.on('global-variables', (e, variables)=>{
  host_API = variables.get('host_API');

  //Compruebo que exista el token, para saber si inicio automaticamente o no
  ipcRenderer.send('get-sesion-persistente');
});

//Callback al solicitar el token
ipcRenderer.on('return-token', (e, data)=>{

  if(data !== null){
    //En caso de haber una sesión guardada, me salto el inicio de sesion
    const sessionID = data.get('session_id');
    const token = data.get('token');

    //Compruebo que el token siga siendo valido
    enviaPeticionAPI('GET', token, {}, (data2, error)=>{
      enableButtons();
      hideDialogCargando();
      let error_aux = false;
      if(!error){
        const dataJSON = JSON.parse(data2);
        if(dataJSON.hasOwnProperty("code")){
          if(dataJSON.code == 0){
            //Ha ido correcto, cambiamos de pantalla
            //Cambio de pantalla
            ipcRenderer.send('cambia-pantalla', "main", data);
          }else{
            error_aux = true;
          }
        }else{
          error_aux = true;
        }
      }else{
        error_aux = true;
      }

      if(error_aux){
        document.querySelector(".pantalla-login").querySelector(".error-message").textContent = "Error al realizar el login. Por favor introduce los credenciales de usuario.";
        document.querySelector(".pantalla-login").querySelector(".error-message").classList.remove("disabled");
      }
      
    });
  }else{
    enableButtons();
    hideDialogCargando();
  }
});




function disableButtons(){
  boton_mover_crear_cuenta.disabled = true;
  boton_cancelar_crear.disabled = true;
  boton_iniciar_sesion.disabled = true;
  boton_crear_cuenta.disabled = true;

}

function enableButtons(){
  boton_mover_crear_cuenta.disabled = false;
  boton_cancelar_crear.disabled = false;
  boton_iniciar_sesion.disabled = false;
  boton_crear_cuenta.disabled = false;
}