//Definimos las dependencias
const { ipcRenderer, ipcMain } = require('electron');
const https = require('https');


//Definimos las referencias del DOM necesarias
const modal_creacion = document.getElementById("modalCreacionContenedor");
const modal_edicion = document.getElementById("modalEdicionContenedor");
const modal_alerta = document.getElementById("modalAlertaUsuario");
const modal_cargando = document.getElementById("modalCargando");
const modal_crear_mv = document.getElementById("modalCrearMV");

const boton_recargar = document.getElementById("botonRecargar");
const boton_creacion = modal_creacion.querySelector(".boton-aceptar");
const boton_eliminar_tarjeta = modal_edicion.querySelector(".boton-eliminar");
const boton_guardar_edicion = modal_edicion.querySelector(".boton-aceptar");

const boton_ajustes = document.getElementById("botonSettings");
const boton_cerrar_sesion = document.getElementById("modalAjustes").querySelector(".boton-eliminar");

const boton_compartir_pc = document.getElementById("botonCompartirPC");

//Definimos los objetos globales

/**
 * Lista con las maquinas remotas
 * 
 * Formado por {"id": "str", "nombre": "str", "imagen": "str", "cpus": int, "memo_s": int, "memo_t": str, "tipo": "str", "estado": int}
 */
let lista_maquinas = []; 

/**
 * Token de sesion del usuario
 */

let session_token;

/**
 * Identificador del usuario correspondiente a la sesion activa
 */
let session_id;

let host_API;





/***********************************
 *    Funciones
 ***********************************/

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
    httpOptions.path = "/Test/contenedor";
    
    const datosAux = args;
    datosAux.token = tk;
    
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

/**
 * Funcion que consulta los contenedores asociados al usuario
 * 
 * @param {String} tk Token de autenticacion de la API
 */
function consultaContenedoresUsuario(tk){
  enviaPeticionAPI('GET', session_token, {}, (data, error) =>{
    try{
      //Gestiono la respuesta de la API
      if(!error){
        lista_maquinas = [];
        const datosJSON = JSON.parse(data);
        console.log(datosJSON);
        if(datosJSON.hasOwnProperty('code') && datosJSON.code == 0){
          //Recorro la lista de contenendores
          datosJSON.args.contenedores.forEach(contenedor =>{
            console.log("Añadiendo datos contenedor");
            const datos_contenedor = {}
            datos_contenedor.id = contenedor.id;
            datos_contenedor.estado = contenedor.estado;
            datos_contenedor.nombre = contenedor.nombre;
            datos_contenedor.cpus = contenedor.cpu;
            datos_contenedor.memo_s = contenedor.memo_s;
            datos_contenedor.memo_t = contenedor.memo_t == 0 ? "Mi" : "Gi";
            datos_contenedor.imagen = contenedor.imagen;
            datos_contenedor.tipo = contenedor.conexion == 0 ? "Remote Desktop" : "Terminal";
            lista_maquinas.push(datos_contenedor);
            console.log("Procesado contenedor");
            console.log(datos_contenedor);
          })
        actualizaUIContenedores();
        }
      }else{
        console.log("Error en la respuesta de la API");
      }

    }catch(e){
      console.log("Error al procesar los contenedores recibidos de la API: " + e);
    }
  });
}

/**
 * Funcion que actualiza los contenedores en el panel
 */
function actualizaContenedores(){
  //Actualizo el boton de recargar
  boton_recargar.textContent = "Recargando..."
  boton_recargar.disabled = true;
  
  //consulto los contenedores mediante la API
  consultaContenedoresUsuario(session_token);
}


/**
 * Funcion que actualioza los elementos del panel de conexiones
 */
function actualizaUIContenedores(){
    //Actualizo la UI
  //Obtengo del DOM el contenedor de tarjetas
  const contenedorTarjetas = document.getElementById('contenedorTarjetas');
  const template = document.getElementById('tarjetaConexionTemplate');

  //Elimino todas las tarjetas mostradas
  contenedorTarjetas.querySelectorAll('.tarjeta-conexion').forEach(item=>{
    item.remove();
  });

  

  lista_maquinas.forEach((contenedor) =>{
    //Creo una nueva tarjeta
    const tarjeta = template.content.cloneNode(true);

    //Le introduzco los datos
    tarjeta.querySelector(".header-tarjeta.nombre-tarjeta").textContent = contenedor.nombre;
    tarjeta.querySelectorAll(".contenido-tarjeta.valor-dato").forEach((elemento, index)=>{
      switch(index){
        case 0:
          //Tipo de conexion
          elemento.textContent = contenedor.tipo;
          break;
        case 1:
          //Imagen
          elemento.textContent = contenedor.imagen;
          break;
        case 2:
          //CPUS
          elemento.textContent = contenedor.cpus;
          break;
        case 3:
          //Memoria
          elemento.textContent = `${contenedor.memo_s} ${contenedor.memo_t}`;
          break;
      }
    });

    const boton = tarjeta.querySelector(".boton-aceptar");
    if(contenedor.estado == 1){
      boton.textContent = "Conectar";
      boton.disabled = false;
    }else{
      boton.textContent = "Encendiendo...";
      boton.disabled = true;
    }

    //Añado los listeners a los elementos de la tarjeta
    boton.addEventListener('click', (e)=>{
      botonConectarPulsado(e.target);
    });

    tarjeta.querySelector(".boton-editar").addEventListener('click', (e)=>{
      botonEditarPulsado(e.target);
    });

    console.log("Añadiendo tarjeta");
    //console.log(Array.prototype.slice.call(contenedorTarjetas.children).slice(-1))
    contenedorTarjetas.insertBefore(tarjeta, Array.prototype.slice.call(contenedorTarjetas.children).slice(-1)[0]);
  });

  //Actualizo el boton de recargar
  boton_recargar.textContent = "Recargar"
  boton_recargar.disabled = false;
}

/**
 * Función que gestiona la pulsación de un boton de conectar
 * @param {HTMLElement} elem El propio boton que se ha pulsado
 */
function botonConectarPulsado(elem){
  //Obtengo el contenedor que se ha pulsado
  const contenedor = getContenedorFromCardElement(elem);

  //Me cambio de pantalla pasando el identificador al main para que podamos acceder al contenedor.
  const args = new Map();
  args.set('id_contenedor', contenedor.id);
  ipcRenderer.send('cambia-pantalla', "RDP", args);
}

/**
 * Comportamiento del boton de creacion de contenedor
 */
function botonCrearPulsado(){
  //Impedimos que el usuario pueda hacer nada
  const botonAceptar= modal_creacion.querySelector(".boton-aceptar");
  const botonCancelar = modal_creacion.querySelector(".boton-cancelar");
  botonAceptar.disabled = true;
  botonCancelar.disabled = true;


  //Obtengo los datos del modal
  const nombreContenedor = modal_creacion.querySelector(".input-dato.nombre-contenedor").value;
  //const imagen (por ahora es siempre la misma)
  const elemCpu = modal_creacion.querySelector(".input-cpus");
  const cpus = parseInt(elemCpu.value);
  const memSize = parseInt(modal_creacion.querySelector(".input-mem-size").value);
  const memType = modal_creacion.querySelector(".selector.input-mem-type").value == "Mi" ? 0: 1;
  //const tipoConexion (Por ahora es siempre RDP)
  const mensajeError = modal_creacion.querySelector(".error-message");
  
  //Comrpuebo que los datos introducidos son correctos
  if(!compruebaDatosModal(mensajeError, nombreContenedor, memSize, memType, cpus)){
    resetModal(modal_creacion, false, true, false);
    return;
  }

  muestraDialogCargando("Creando contenedor");
  //Envio la peticion al servidor para crear el contenedor
  enviaPeticionAPI('POST', session_token, {'action': "createContainer",
                                   'cpus': cpus,
                                   'mem_s': memSize,
                                   'mem_t': memType,
                                   'nombre': nombreContenedor},
  (data, error)=>{
    hideDialogCargando();
    try{
      //Comrpuebo que se haya creado correctamente
      if(!error){
        const dataJSON = JSON.parse(data);
        if(dataJSON.hasOwnProperty("code") && dataJSON.code == 0){
          //Contenedor creado satisfactoriamente
          //Pulso el boton de recargar
          resetModal(modal_creacion, true);
          muestraMensajeAlerta("Crear Contenedor", "El contenedor se ha creado correctamente", false, true);
          actualizaContenedores();
        }else{
          //Se ha producido un error
          throw(JSON.stringify(dataJSON, null, 4));
        }
      }
    }catch(e){
      console.error("Error al procesar la respuesta del servidor. " + e);
      mensajeError.textContent="Se ha producido un error al crear el contenedor. Por favor, intentelo de nuevo más adelante.";
      resetModal(modal_creacion, false, true, false);
    }
  });
}

/**
 * Función que comprueba que los datos introducidos en el modal de creacion son correctos,
 * y muestra el mensaje de error en el caso que no lo sean
 * @param {HTMLElement} mensajeError 
 * @param {String} nombreContenedor 
 * @param {*} memSize 
 * @param {*} memType 
 * @param {*} cpus 
 * @returns si se ha producido un error o no
 */
function compruebaDatosModal(mensajeError, nombreContenedor, memSize, memType, cpus){
  
  //Valido los datos introducidos
  let error = false;
  //Nombre del contenedor
  if(!nombreContenedor.match(/^[a-zA-Z\d][a-zA-Z \d]+/g)){
    mensajeError.classList.add("disabled");
    mensajeError.textContent = "El nombre solo puede contener caracteres alfanuméricos y espacios, y como minimo un caracter distinto a un espacio";
    error = true;  
  //Cantidad de Memoria
  }else if( Number.isInteger(memSize) === false || (memType==0 && (memSize<0 || memSize>32768)) || (memType ==1 && (memSize<0 || memSize>32))){
    mensajeError.classList.add("disabled");
    mensajeError.textContent = "La cantidad de memoria especificada no tiene un formato válido.";
    error = true; 
  //Numero de CPUs
  }else if( !Number.isInteger(cpus) || cpus>32 || cpus<0){
    mensajeError.classList.add("disabled");
    mensajeError.textContent = "El numero de cpus especificado no es correcto. (0,32]";
    error = true; 
  }

  if (error === true){
    mensajeError.classList.remove("disabled");
  }
  return !error;
}

/**
 * Funcion que obtiene el contenedor correspondiente al elemento pulsado dentro de una de las tarjetas
 * @param {HTMLElement} element 
 */
function getContenedorFromCardElement(element){
  //Obtenemos el elemento tarjeta del html y consultamos su indice.
  const tarjeta = element.closest(".tarjeta-conexion");

  //Pillamos todos los hijos del padre (aka todas las tarjetas) y consultamos la posicion de la tarjeta actual.
  const indice = Array.prototype.slice.call(tarjeta.parentElement.children).indexOf(tarjeta);

  /*console.log("Indice de tarjeta clicada: " + indice);
  Object.entries(lista_maquinas[indice]).forEach((v, k, m)=>{
    console.log(k + ":" + v);
  })

  console.log(Array.prototype.slice.call(tarjeta.parentElement.children));*/
  //Los elementos en la lista de maquinas estan ordenados como aparecen por pantalla.
  //Obtenemos la entrada especifica y la devolvemos.
  return lista_maquinas[indice];
}

/**
 * Función que gestion el comportamiento de pulsar el boton de editar un contenedor
 * Muestra el modal de edicion y lo actualiza
 * @param {HTMLElement} elem Boton que se ha pulsado
 */
function botonEditarPulsado(elem){
  //Obtengo los datos del modal que quiero editar
  const contenedor = getContenedorFromCardElement(elem);

  //Actualizo el modal que quiero editar
  actualizaModalEdicion(contenedor);

  //Muestro el modal
  modal_edicion.style.display = "block";
  
  modal_edicion.classList.add("in");
  modal_edicion.querySelector('.modal-content').classList.add("in");
    
    modal_edicion.onanimationend = ()=>{
      modal_edicion.classList.remove("in");
      modal_edicion.querySelector('.modal-content').classList.remove("in");
  }
}

/**
 * Actualiza los datos del modal a editar
 * @param {Object} contenedor Datos del contenedor a editar
 */
function actualizaModalEdicion(contenedor){
  modal_edicion.querySelector(".nombre-contenedor").value = contenedor.nombre;
  modal_edicion.querySelector(".input-mem-size").value = contenedor.memo_s;
  modal_edicion.querySelector(".input-mem-type").value = contenedor.memo_t;
  modal_edicion.querySelector(".input-cpus").value = contenedor.cpus;
  modal_edicion.querySelector(".id-contenedor").textContent = contenedor.id;
}

function botonEliminarPulsado(){
  muestraMensajeAlerta("Eliminar Contenedor", "Esta acción eliminará el contenedor de manera permanente, ¿está seguro que desea eliminar el contenedor?",
    true, true, (e)=>{
      //Si acepta el eliminar el contenedor, se procede a eliminar
      eliminarContenedor();
    });
}

/**
 * Funcion que elimina un contenedor seleccionado
 */
function eliminarContenedor(){
  muestraDialogCargando("Eliminando el contenedor");
  //Obtengo el id del contenedor
  const idContenedor = modal_edicion.querySelector(".id-contenedor").textContent;

  //Actualizo la UI del contenedor
  const mensajeError = modal_edicion.querySelector(".error-message");
  const botonAceptar = modal_edicion.querySelector(".boton-aceptar");
  const botonCancelar = modal_edicion.querySelector(".boton-cancelar");
  const botonEliminar = modal_edicion.querySelector(".boton-eliminar");
  botonAceptar.disabled = true;
  botonCancelar.disabled = true;
  botonEliminar.disabled = true;
  

  //Llamo a la API para eliminar el contenedor.
  console.log("Llamando a la API para eliminar el contenedor: " + idContenedor);
  enviaPeticionAPI('POST', session_token, {'action': "deleteContainer",
                                   'id': idContenedor},
  (data, error)=>{
    hideDialogCargando();
    try{
      //Compruebo que se haya eliminado correctamente
      if(!error){
        const dataJSON = JSON.parse(data);
        if(dataJSON.hasOwnProperty("code") && dataJSON.code == 0){
          //Contenedor eliminado satisfactoriamente
          //me salgo y pulso el boton de recargar
          resetModal(modal_edicion, true);
          muestraMensajeAlerta("Eliminar Contenedor", "El contenedor se ha eliminado correctamente", false, true);
          actualizaContenedores();
        }else{
          //Se ha producido un error
          throw(dataJSON.description);
        }
      }
    }catch(e){
      console.error("Error al procesar la respuesta del servidor. " + e);
      mensajeError.textContent="Se ha producido un error al eliminar el contenedor. Por favor, intentelo de nuevo más adelante.";
      resetModal(modal_edicion, false, true, false);
    }
  });
}

/**
 * Función que gestiona la pulsacion de guardar edicion. Comprueba si los datos han cambiado y que esten bien metidos, y 
 * envia la orden de actualizar a la API
 */
function botonGuardarEdicionPulsado(){
  //Obtenemos los elementos del DOM
  const botonGuardar = boton_guardar_edicion;
  const botonSalir = modal_edicion.querySelector(".boton-cancelar");
  const botonEliminar = modal_edicion.querySelector(".boton-eliminar");
  const mensajeError = modal_edicion.querySelector(".error-message");

  const mem_s = modal_edicion.querySelector(".input-mem-size");
  const mem_t = modal_edicion.querySelector(".input-mem-type");
  const nombre = modal_edicion.querySelector(".nombre-contenedor");
  const cpus = modal_edicion.querySelector(".input-cpus");

  //Actualizamos la UI del contenedor para que el usuario no pueda hacer nada
  botonGuardar.disabled = true;
  botonSalir.disabled = true;
  botonEliminar.disabled = true;


  //Obtenemos el contenedor que se esta editando
  let contenedor = -1;

  lista_maquinas.forEach(item=>{
    if(item.id == modal_edicion.querySelector(".id-contenedor").textContent){
      contenedor = item;
    }
  });

  if(contenedor === -1){
    console.error("Error al procesar la edicion. No se encuentra el contenedor en edicion.");
    mensajeError.textContent = "Error al guardar el contenedor"
    resetModal(modal_edicion, false, true, false);
    return;
  }
  
  //Comprobamos si los datos han cambiado
  if(mem_s.value == contenedor.memo_s &&
     mem_t.value == contenedor.memo_t &&
     nombre.value == contenedor.nombre &&
     cpus.value == contenedor.cpus){
    //Los datos son iguales, por lo que no hace falta actualizar
    resetModal(modal_edicion, true);
    return;
  }

  const memTypeAux = mem_t.value == "Mi" ? 0: 1;
  //Comprobamos si los datos estan correctamente introducidos
  console.log(parseInt(cpus.value))
  if(!compruebaDatosModal(mensajeError, nombre.value, parseInt(mem_s.value), memTypeAux, parseInt(cpus.value))){
    //Error al introducir los datos
    
    resetModal(modal_edicion, false, true, false);
    return;
  }

  muestraDialogCargando("Aplicando los cambios al contenedor");
  //Enviamos la peticion a la API si fuese necesario
  enviaPeticionAPI('POST', session_token, {'action': "updateContainer",
                                            'cpus': cpus.value,
                                            'mem_s': mem_s.value,
                                            'mem_t': memTypeAux,
                                            'nombre': nombre.value,
                                            'id': contenedor.id},
  (data, error)=>{
    hideDialogCargando();
    try{
      //Comrpuebo que se haya creado correctamente
      if(!error){
        const dataJSON = JSON.parse(data);
        if(dataJSON.hasOwnProperty("code") && dataJSON.code == 0){
          //Contenedor creado satisfactoriamente
          //Pulso el boton de recargar
          resetModal(modal_edicion, true);
          muestraMensajeAlerta("Editar Contenedor", "El contenedor se ha actualizado correctamente", false, true);
          actualizaContenedores();
        }else{
          //Se ha producido un error
          throw(dataJSON);
        }
      }
    }catch(e){
      console.error("Error al procesar la respuesta del servidor. " + e);
      mensajeError.textContent="Se ha producido un error al actualizar el contenedor. Por favor, intentelo de nuevo más adelante.";
      resetModal(modal_edicion, false, true, false);
    }
  });

}

/**
 * Funcion que realiza el reseteo junto con la salida del modal especificado.
 * @param {HTMLElement} modal 
 * @param {Boolean} salir Si se quiere, ademas de resetear, salir del modal
 * @param {Boolean} [muestraError=false] Si se quiere mostrar o no el mensaje de error
 * @param {Boolean} [resetDatos=true] Si se deben resetear los datos del modal o no
 */
function resetModal(modal, salir, muestraError=false, resetDatos=true){
  const mensajeError = modal.querySelector(".error-message");
  const botonGuardar = modal.querySelector(".boton-aceptar");
  const botonSalir = modal.querySelector(".boton-cancelar");

  if(modal == modal_crear_mv){
    //Congig especifica del de creacion de mv
    const mem_s = modal.querySelector(".input-mem-size");
    const mem_t = modal.querySelector(".input-mem-type");
    const url = modal.querySelector(".ruta-mv");
    const cpus = modal.querySelector(".input-cpus");

    if(resetDatos){
      mem_s.value = 4096;
      mem_t.value = "Mi";
      cpus.value = 4;
      url.value = "";
    }
    return;
  }else{
    //Config especifica de los modales de crear y editar contenedor
    //Se obtienen los parametros del DOM
    const mem_s = modal.querySelector(".input-mem-size");
    const mem_t = modal.querySelector(".input-mem-type");
    const nombre = modal.querySelector(".nombre-contenedor");
    const cpus = modal.querySelector(".input-cpus");

    const botonEliminar = modal.querySelector(".boton-eliminar");

    //Se resetean todos los parametros
    if (resetDatos){
      mem_s.value = 4096;
      mem_t.value = "Mi";
      cpus.value = 4;
      nombre.value = "";
    }
  }


  
  botonGuardar.disabled = false;
  botonSalir.disabled = false;
  
  if(modal == modal_edicion){
    botonEliminar.disabled = false;
  }

  //Se sale del contenedor
  if(salir){
    botonSalir.click();
  }else if(!muestraError){
    //Cierra el mensaje de error si se sale, y si no, lo muestra si se lo indican
    if(mensajeError.classList.contains("disabled")){
      mensajeError.classList.remove("disabled");
    }
    mensajeError.classList.add("disabled");
  }else{
    //Muestro el mensaje de error si es necesario
    if(mensajeError.classList.contains("disabled")){
      mensajeError.classList.remove("disabled");
    }
  }
}

/**
 * Funcion que muestra al usuario un dialogo de alerta
 * @param {String} titulo El titulo que tendrá el dialog
 * @param {String} texto El texto que se quiere mostrar en el mensaje
 * @param {Boolean} cancelarBtn [cancelarBtn = true]  Si tiene o no el boton de aceptar
 * @param {Boolean} aceptarBtn [aceptarBtn = true]  Si tiene o no el boton de cancelar
 * @param {*} [callbackAceptar=null] Funcion callback que se ejecuta al pulsar aceptar callback(e)
 */
function muestraMensajeAlerta(titulo, texto, cancelarBtn=true, aceptarBtn=true, callbackAceptar = null){
  //Relleno la información del modal
  const tituloObj = modal_alerta.querySelector(".titulo-modal");
  const textoObj = modal_alerta.querySelector(".mensaje");
  const botonAceptar = modal_alerta.querySelector(".boton-aceptar");
  const botonCancelar = modal_alerta.querySelector(".boton-cancelar");

  tituloObj.textContent = titulo;
  textoObj.textContent = texto;

  if(!aceptarBtn){
    botonAceptar.style.display="none";
  }else{
    botonAceptar.style.display="block";
  }
  if(!cancelarBtn){
    botonCancelar.style.display="none";
  }else{
    botonCancelar.style.display="block";
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

  if(callbackAceptar !== null){
    botonAceptar.onclick = (e)=>{
      comportamientoPorDefecto();
      callbackAceptar(e);
    }
  }else{
    botonAceptar.onclick = comportamientoPorDefecto;
  }
  
  botonCancelar.onclick = comportamientoPorDefecto;
}

/**
 * Funcion que realiza el ceirre de sesion del usuario, mostrando primero un dialogo de confirmacion
 */
function botonCerrarSesionPulsado(){
  //Muestra el dialogo para confirmar
  muestraMensajeAlerta("Cerrar Sesión", "Está a punto de cerrar la sesión. ¿Desea continuar?", true, true, (e)=>{
    //Si decide salir, envio la peticion a la API
    muestraDialogCargando("Cerrando sesión");
    enviaPeticionAPI('POST', session_token, {'action': "logout"},
      (data, error)=>{
        hideDialogCargando();
        //Me da igual si hay error o no, salgo igualmente
        //Elimino primero la informacion de sesion persistente
        ipcRenderer.send("set-sesion-persistente", "", "");
        ipcRenderer.send("cambia-pantalla", "login");
      });
  });
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

/**
 * Función que gestiona el comportamiento del botón de cambiar de modo
 * 
 */
function switchModoPulsado(){
  console.log("Cambiando modo de operacion");

  //Obtengo los elementos que voy a necesitar
  const checkbox = document.getElementById("switchModo");

  const txtCliente = document.querySelector(".texto-header.cliente");
  const txtHost = document.querySelector(".texto-header.host");
  const panelConexiones = document.querySelector(".contenedor-conexiones-padre");
  const panelShare = document.querySelector(".contenedor-share");
  

  //Mostramos una pantalla u otra segun el switch este activo o no
  if(checkbox.checked == true){
    //Se puede cambiar a modo host si no tengo ningun contenedor remoto
    if(lista_maquinas.length != 0){
      checkbox.checked = false;
      return
    }

    txtCliente.classList.add("disabled");
    txtHost.classList.remove("disabled");
    panelConexiones.classList.add("disabled");
    panelShare.classList.remove("disabled");
  }else{
    //Se puede cambiar de modo si la MV no está en funcionamiento

    txtHost.classList.add("disabled");
    txtCliente.classList.remove("disabled");
    panelConexiones.classList.remove("disabled");
    panelShare.classList.add("disabled");

  }
}

/**
 * Función que comienza a compartir un PC. Arranca la maquina virtual y la configura en caso de ser necesario.
 */
function comenzarCompartirPC(){
  //Comprueba si existe una maquina virtual creada ya
  ipcRenderer.send('get-mv-id');

  ipcRenderer.on('return-mv-id', (e, datos)=>{
    if(datos !== null){
      //Si existe el id, existe una maquina, y por tanto la arranco
    }else{
      //Si no existe ninguna maquina creada la creo de nuevo
      creaMvCompartir();
    }
  });

  //Si no existe todavia ninguna maquina virtual...
}

/**
 * Función que crea una nueva máquina virtual para compartir el pc
 */
function creaMvCompartir(){
  //Comprueba si vagrant está instalado

  //Comprueba si VBox está instalado

  //Muestra el panel de configuracion de la maquina virtual
  muestraYConfiguraModalCreacionMV();
  
  //Configura el script de kubejoin 
   
}


/**
 * Funcion que muestra y configura el modal de creacion de MV
 */
function muestraYConfiguraModalCreacionMV(){
  let pathMV;

  //Mostramos el modal con todas las animaciones posibles
  modal_crear_mv.style.display = "block";
  
  modal_crear_mv.classList.add("in");
  modal_crear_mv.querySelector('.modal-content').classList.add("in");
    
    modal_crear_mv.onanimationend = ()=>{
      modal_crear_mv.classList.remove("in");
      modal_crear_mv.querySelector('.modal-content').classList.remove("in");
  }

  //Obtencion de los datos
  //URL
  modal_crear_mv.querySelector(".input-dato.ruta-mv").onclick = ()=>{
    ipcRenderer.send('ask-mv-path');

    ipcRenderer.on('return-path', (e, path)=>{
      pathMV = path;
      modal_crear_mv.querySelector(".input-dato.ruta-mv").value = pathMV;
    })
  }

  //CPU y RAM
  const memSize = modal_crear_mv.querySelector(".input-mem-size");
  const memType = modal_crear_mv.querySelector(".input-mem-type");
  const cpus = modal_crear_mv.querySelector(".input-cpus");

  const mensajeError = modal_crear_mv.querySelector(".error-message");

  modal_crear_mv.querySelector(".boton-aceptar").onclick = ()=>{
    if(pathMV != ""){
      //Valido y obtengo los valores de los campos
      if(!Number.isInteger(cpus.value) || !Number.isInteger(memType.value)){
        //Error al procesar los datos
        mensajeError.textContent = "Error, el numero de CPUs y la Memoria especificada deben ser numeros enteros positivos";
        resetModal(modal_crear_mv, false, true, false);
        return;
      }
      //Guarda la informacion de la MV y la arranca cuando este todo gucci
      guardaDatosMV(pathMV, parseInt(memSize.value)*(memType.value == "Mi" ? 1: 1024), parseInt(cpus.value));
    }else{
      mensajeError.textContent = "Error: Debe espicifar una ruta para la MV.";
      resetModal(modal_crear_mv, false, true, false);
      return;
    }
  };

  modal_crear_mv.querySelector(".boton-cancelar").onclick = ()=>{resetModal(modal_crear_mv, true, false, true)};
}

/**
 * Funcion que actualiza la informacion almacenada sobre una maquina virtual.
 * Si la url existe, se sobreescribe con la nueva y se edita ahi  * @param {string} pathMV 
 * @param {Int} ram 
 * @param {Int} cpu 
 * @param {Boolean} arrancaMv 
 */
function guardaDatosMV(pathMV, ram, cpu, arrancaMv){
  const funcionAlmacenaDatos = (path)=>{
    //Almaceno los datos de la MV
    ipcRenderer.send('apply-mv-params', path, cpu, ram);

    //Arranco la maquina virtual si me lo indican
    if(arrancaMv){
      ipcRenderer.on('complete-mv-params', (e, data) =>{
        if(data !== null){
          arrancaMv(path);
        }else{
          //Se ha producido un error almacenando los datos
          muestraMensajeAlerta("Error Edicion MV", "Se ha producido un error al modificar la MV, parece que no existe ninguna MV almacenada", false, true);
        }
      });
    }
  };

  if(pathMV === null){
    //Si no tengo URL la obtengo primero;
    ipcRenderer.send('get-mv-path');

    ipcRenderer.on('return-mv-path', (e, data)=>{
      if(data === null){
        //No existe la ubicacion, regreso
        muestraMensajeAlerta("Error Edicion MV", "Se ha producido un error al modificar la MV, parece que no existe ninguna MV almacenada", false, true);
      }else{
        //Existe la informacion del path, modifico en esa url

      }
    });
  }else{
    //Si la tengo pues almaceno en esa url
  }
}

/**
 * Funcion que arranca una maquina virtual en una MV especificada
 */
function arrancaMv(url){
  //Copio el fichero shell del kubejoin

  //TODO: Esto se tendria que hacer consultando a la API y viendo si ha cambiado

  ipcRenderer.send('almacena-kubejoin', url);

  ipcRenderer.on('kubejoin-almacenado', (e, data)=>{
    if(data != null){

    }
  })
}
/***********************************
 *    Eventos
 ***********************************/

boton_recargar.onclick = actualizaContenedores;
boton_creacion.onclick = botonCrearPulsado;
boton_eliminar_tarjeta.onclick = botonEliminarPulsado;
boton_guardar_edicion.onclick = botonGuardarEdicionPulsado;
boton_cerrar_sesion.onclick = botonCerrarSesionPulsado;
//boton_compartir_pc.onclick = compartirPCPulsado();
//Logica para cuando se cambia de modo de funcionamiento
document.getElementById("switchModo").onclick = ()=>{
  switchModoPulsado();
};

/***********************************
 *    Funcionamiento al principio
 ***********************************/
//Consulto las variables globales
ipcRenderer.send('get-global-variables', "main");

//Espero a rebir respuesta del main
ipcRenderer.on('global-variables', (e, variables)=>{
  host_API = variables.get('host_API');
  session_id = variables.get('session_id');
  session_token = variables.get('token');

  //Actualizo la UI con los datos
  document.getElementById("textoUsuario").textContent = session_id;

  //Cuando he finalizado, comienzo automaticamente a buscar los contenedores
  //Cuando la ventana esta preparada se comienza a consultar la API
  actualizaContenedores();
});

//Hacer que, periódicamente, se pulse el boton de recargar (15s)
setInterval(()=>{boton_recargar.click()}, 15000);