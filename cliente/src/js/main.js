const { app, BrowserWindow, ipcMain, Menu, dialog} = require('electron/main');
const path = require('node:path');
const { desktopCapturer } = require('electron/main');
const fs = require('fs');
const https = require('https');
const { exec } = require('child_process');

//Variables almacenadas necesarias para la aplicacion
let session_id = null;// = "denis#1710420242";
let token = null;// = "Tk-17104ljcprrgwfrtonajpqdls20242";
let id_contenedor = null;

let host_web_socket = "ws://gusydenis.duckdns.org:28000";
let host_API = "gusydenis.duckdns.org";
let port_API = 91;

const USER_DATA_PATH = path.join(app.getPath("userData"), 'user_data.json');

//Variables globales del main
let win;

const createWindow = () => {
  win = new BrowserWindow({
    width: 1000,
    height: 720,
    webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
        preload: path.join(__dirname, 'preload.js')
    },
    minHeight: 600,
    minWidth: 800,
    icon: path.join(__dirname, '../assets/icons2/logo.png')
  })
  win.setMenu(null);
  win.loadFile(path.join(__dirname,'../html/login.html'));

  //Abrimos las web tools
  win.webContents.openDevTools();
}

app.whenReady().then(() => {
  //ipcMain.handle('menu:selectVideoSource', createSourceVideoSelector);
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

/***********************************************************************
 *    Funciones del ipc_main
 * *********************************************************************
 */
//Handler de peticion de apertura de menu
ipcMain.on('menu-video-source', (event) =>{
  console.log("Hola");
  createSourceVideoSelector(event);
});

//Peticion de cambio de pantalla
ipcMain.on('cambia-pantalla', (e, pantalla, args)=>{
  cambiaPantalla(pantalla, args);
});

//Peticion de variables globales
ipcMain.on('get-global-variables', (e, pantalla)=>{
  console.log("Variables globales solicitadas: " + pantalla);
  const mapaVariables = new Map();
  switch(pantalla){
    case "main":
      mapaVariables.set('token', token);
      mapaVariables.set('session_id', session_id);
      mapaVariables.set('host_API', host_API);
      mapaVariables.set('port_API', port_API);
      break;
    case "RDP":
    case "SSH":
      mapaVariables.set('token', token);
      mapaVariables.set('session_id', session_id);
      mapaVariables.set('id_contenedor', id_contenedor);
      mapaVariables.set('host_WS', host_web_socket);
      mapaVariables.set('host_API', host_API);
      mapaVariables.set('port_API', port_API);
      break;
    case "login":
      mapaVariables.set('host_API', host_API);
      mapaVariables.set('port_API', port_API);
      break;
  }

  e.sender.send('global-variables', mapaVariables);
  
})

//Peticion de pantalla completa
ipcMain.on('pantalla-completa', (e, modo)=>{
  if(modo == "fullscreen"){
    win.setFullScreen(true);
  }else if(modo == "windowed"){
    win.setFullScreen(false);
  }
});

//Obtencion del token de sesion almacenado, o null en caso de que no haya
ipcMain.on('get-sesion-persistente', (e) => {
  console.log("Obteniendo datos de sesiones presistentes");
  let ret = new Map();
  try {
    const data = fs.readFileSync(USER_DATA_PATH, 'utf-8');
    const dataJSON = JSON.parse(data);
    console.log(dataJSON)
    if(dataJSON.token){
      ret.set('token', dataJSON.token);
      ret.set('session_id', dataJSON.session_id);
    }else{
      ret = null;
    }
    
  } catch(error) {
    console.log('Error retrieving user data', error);  
    // you may want to propagate the error, up to you
    ret = null;
  }

  console.log(ret)

  e.sender.send('return-token', ret);
});

//Guardado del token de sesion
ipcMain.on('set-sesion-persistente', (e, token, id) =>{
  try {
    console.log("Escribiendo en fichero de configuracion...");
    const data = fs.readFileSync(USER_DATA_PATH, 'utf-8');
    const dataJSON = JSON.parse(data);

    //Si no hay token elimino el que esta
    if(token == ""){
      delete dataJSON.token;
      delete dataJSON.session_id;
    }else{
      dataJSON.token = token;
      dataJSON.session_id = id;
    }
    
    fs.writeFileSync(USER_DATA_PATH, JSON.stringify(dataJSON));
  } catch(error) {
    console.log('Error retrieving user data', error);  
    // No hay datos, por lo que tengo que escribirlos
    if(token != ""){
      const datosEscribir = {'token': token, 'session_id': id};
      fs.writeFileSync(USER_DATA_PATH, JSON.stringify(datosEscribir));
    }
  }
});

//Obtencion del id de sesion que tiene la maquina virtual
ipcMain.on('get-mv-id', (e) => {
  console.log("Obteniendo datos de mquina virtual");
  let ret = new Map();
  try {
    const data = fs.readFileSync(USER_DATA_PATH, 'utf-8');
    const dataJSON = JSON.parse(data);
    console.log(dataJSON)
    if(dataJSON.mv_id){
      ret.set('mv_id', dataJSON.mv_id);
    }else{
      ret = null;
    }
    
  } catch(error) {
    console.log('Error retrieving user data', error);  
    // you may want to propagate the error, up to you
    ret = null;
  }

  console.log(ret)

  e.sender.send('return-mv-id', ret);
});

//Almacena el id de la sesion que tiene maquina virtual
ipcMain.on('set-mv-id', (e, id) =>{
  try {
    console.log("Escribiendo en fichero de configuracion...");
    const data = fs.readFileSync(USER_DATA_PATH, 'utf-8');
    const dataJSON = JSON.parse(data);

    //Si no hay token elimino el que esta
    if(id == ""){
      delete dataJSON.mv_id;
    }else{
      const idAlmacenado = id.split("#");
      dataJSON.mv_id = idAlmacenado[0]+idAlmacenado[1];
      
    }
    
    fs.writeFileSync(USER_DATA_PATH, JSON.stringify(dataJSON));
  } catch(error) {
    console.log('Error retrieving user data', error);  
    // No hay datos, por lo que tengo que escribirlos
    if(id != ""){
      const idAlmacenado = id.split("#");
      const datosEscribir = {'mv_id': idAlmacenado[0]+idAlmacenado[1]};
      fs.writeFileSync(USER_DATA_PATH, JSON.stringify(datosEscribir));
    }
  }
});


//Almacena el path de la maquina virtual
ipcMain.on('set-mv-path', (e, path) =>{
  let pathEscrita = null;
  try {
    console.log("Escribiendo en fichero de configuracion...");
    const data = fs.readFileSync(USER_DATA_PATH, 'utf-8');
    const dataJSON = JSON.parse(data);

    //Si no hay token elimino el que esta
    if(path == ""){
      delete dataJSON.mv_path;
    }else{
      dataJSON.mv_path = path;
    }
    
    fs.writeFileSync(USER_DATA_PATH, JSON.stringify(dataJSON));

    pathEscrita = path;
  } catch(error) {
    console.log('Error retrieving user data', error);  
    // No hay datos, por lo que tengo que escribirlos
    if(path != ""){
      const datosEscribir = {'mv_path': path};
      fs.writeFileSync(USER_DATA_PATH, JSON.stringify(datosEscribir));
    }
    pathEscrita = path;
  }

  e.sender.send('return-mv-path', pathEscrita);
});

//Obtencion del path de la maquina virtual
ipcMain.on('get-mv-path', (e) => {
  console.log("Obteniendo path de mauina virtual");
  let ret = new Map();
  try {
    const data = fs.readFileSync(USER_DATA_PATH, 'utf-8');
    const dataJSON = JSON.parse(data);
    console.log(dataJSON)
    if(dataJSON.mv_path){
      ret.set('mv_path', dataJSON.mv_path);
    }else{
      ret = null;
    }
    
  } catch(error) {
    console.log('Error retrieving user data', error);  
    // you may want to propagate the error, up to you
    ret = null;
  }

  console.log(ret)

  e.sender.send('return-mv-path', ret);
});

//Permite al usuario seleccionar una ruta
ipcMain.on('ask-mv-path', async (e)=>{
  dialog.showOpenDialog(win, {title: "Ubicacion nueva MV",properties: ['openDirectory']})
    .then(result => {
      let res = "";
      if(!result.canceled){
        res = result.filePaths[0];
      }
      console.log("Path seleccionado: " + res);

      //Envio de vuelta el path
      e.sender.send('return-mv-path', res);
    });
});

//Almacena los datos de una MV en el vagrantfile
ipcMain.on('apply-mv-params', async (e, url, cpus, memoria, newID)=>{
  //Obtengo el ID
  let id;
  try {
    if(newID){
      //Actualizo el valor del id
      const idAlmacenado = session_id.split("#")
      id = idAlmacenado[0]+idAlmacenado[1];
      fs.writeFileSync(url+"/join_info.json", JSON.stringify({'mv_id': id}))
    }else{
      console.log("Leyendo MV_ID");
      const data = fs.readFileSync(url+"/join_info.json", 'utf-8');
      const dataJSON = JSON.parse(data);
      console.log(dataJSON);
      console.log(dataJSON.mv_id);

      if(Object.hasOwn(dataJSON, 'mv_id')){
        id = dataJSON.mv_id;
        console.log("id = " + id);
      }else{
        id = null;
        console.log("id (null)= " + id);
      }
    }
    
  } catch(error) {
    console.log('Error, no hay ningun id almacenado en la URL o se ha producido un error leyendo el ID existente', error);  
    // you may want to propagate the error, up to you
    id = null;
    
  }
  console.log("id = " + id);

  if(id === null){
    console.error("Error al obtener el ID");
    e.sender.send('complete-mv-params', null)
    return;
  }

  //Muevo el VagrantFile hasta la URL
  if(newID){
    const pathVagrantFile = path.join(__dirname,'../assets/Vagrantfile');
    try{
      const contenidoVagrantfile = fs.readFileSync(pathVagrantFile, 'utf-8');
      fs.writeFileSync(url+"/Vagrantfile", contenidoVagrantfile);
    }catch(err){
      console.log("Error al copiar el vagrantfile" + err);
      e.sender.send('complete-mv-params', null)
      return;
    }
  }

  //Abro el fichero en la URL
  fs.readFile(url + "/Vagrantfile", 'utf8', (err, vagrantFile)=>{
    if(err){
      console.log("Error abriendo el vagrantfile");
      e.sender.send('complete-mv-params', null);
      return;
    }

    let datosModificados = vagrantFile;
    if(newID){
      //Cambio el nombre de usuario
      datosModificados = vagrantFile.replace(
        /vb.name = ".+"/,
        'vb.name = "' + id + '"'
      );

      //Cambio el ID
      datosModificados = datosModificados.replace(
        /config.vm.hostname = ".+"/,
        'config.vm.hostname = "' + id + '"'
      );
    }

    //Cambio memo y cpus
    datosModificados = datosModificados.replace(
      /vb.memory = ".+"/,
      'vb.memory = "' + memoria + '"'
    );
    

    datosModificados = datosModificados.replace(
      /vb.cpus = ".+"/,
      'vb.cpus = "' + cpus + '"'
    );

    

    fs.writeFile(url + "/Vagrantfile", datosModificados, 'utf8', (error) =>{
      if(error){
        console.log("Error al escribir el vagrantfile");
        e.sender.send('complete-mv-params', null);
      }else{
        console.log("Vagrantfile escrito correctamente");
        e.sender.send('complete-mv-params', 0);
      }
    });
  });  
});

//Obtiene la informacion de una MV
ipcMain.on('get-mv-params', async (e)=>{
  console.log("Obteniendo los parametros de la MV")
  //Compruebo si tengo URL
  let ret = null
  try {
    const data = fs.readFileSync(USER_DATA_PATH, 'utf-8');
    const dataJSON = JSON.parse(data);
    console.log(dataJSON)
    if(dataJSON.mv_path){
      ret = new Map();
      ret.set('mv_path', dataJSON.mv_path);
    }else{
      ret = null;
    }
    
  } catch(error) {
    console.log('Error retrieving user data', error);  
    // you may want to propagate the error, up to you
    ret = null;
  }

  if(ret === null){
    //Devuelvo que se ha produciddo un error
    console.log("Error al pillar los datos de la Maquina, no parece q se haya creado ninguna.");
    e.sender.send('return-mv-params', null);
    return;
  }
  let url = ret.get("mv_path");
  //Compruebo si tengo el resto de datos
  fs.readFile(url + "/Vagrantfile", 'utf8', (err, vagrantFile)=>{
    try{
      if(err){
        throw("Error anbriendo el Vagrantfile");
      }

      //RAM
      let regex = /\s*vb.memory\s*=\s*['"]([^'"]+)['"]/;
      let match = regex.exec(vagrantFile);
      if(match){
        ret.set('ram', parseInt(match[1]));
      }else{
        throw("Error pillando la ram");
      }

      //CPUs
      regex = /\s*vb.cpus\s*=\s*['"]([^'"]+)['"]/;
      match = regex.exec(vagrantFile);
      if(match){
        ret.set('cpus', parseInt(match[1]));
      }else{
        throw("Error pillando los cpus");
      }

      //Devuelvo los datos obtenidos
      console.log(ret);
      e.sender.send('return-mv-params', ret);
    }catch (error){
      console.error("Error al obtener los datos del vagrantfile. " + error);
      console.log(ret);

      e.sender.send('return-mv-params', null);
      return;
    }
  });  
});

//Almacena el nuevo comando kubeadm join en el sh de la ubicacion especificada
ipcMain.on('almacena-kubejoin', (e, url, comando)=>{
  //Copio el fichero a la URL
  
  const pathSh = path.join(__dirname,'../assets/kubejoin.sh');
  const pathStart = path.join(__dirname,'../assets/start.sh');
  try{
    //Almaceno el comando start.sh
    const contenidoStart = fs.readFileSync(pathStart, 'utf-8');
    fs.writeFileSync(url+"/start.sh", contenidoStart);
    
    //Almaceno en el script de la MV el kubejoin
    const contenidoScript = fs.readFileSync(pathSh, 'utf-8');
    fs.writeFileSync(url+"/kubejoin.sh", contenidoScript);

    fs.appendFileSync(url+"/kubejoin.sh",
          comando,
          'utf8');
    

    const ts = Math.floor(Date.now()/1000);
    const dataJoinInfo = fs.readFileSync(url+"/join_info.json", 'utf-8');
    const dataJoinInfoJson = JSON.parse(dataJoinInfo);
    dataJoinInfoJson.comando = comando;
    dataJoinInfoJson.ts = ts;
    
    fs.writeFileSync(url+"/join_info.json", JSON.stringify(dataJoinInfoJson));
    
    fs.writeFileSync(url+"/kubejoin.sh", contenidoScript);
    fs.appendFileSync(url+"/kubejoin.sh", "sudo " + comando);


    
    e.sender.send('kubejoin-almacenado', 0);

  }catch(err){
    console.log("Error al copiar el kubejoin");
    e.sender.send('kubejoin-almacenado', null);
    return;
  }

});

//funcion que comprueba la existencia del kubejoin y su ts, y la devuelve en caso de existir
ipcMain.on('get-kubejoin-ts', (e, url)=>{
  console.log("Obteniendo ts y ID de la MV");
  //Abro el fichero en la URL especificada
  let ret = new Map();
  let ts = 0;
  let mv_id;
  try{
    //Almaceno en el script de la MV el kubejoin
    const data = fs.readFileSync(url+"/join_info.json", 'utf-8');
    const dataJSON = JSON.parse(data);

    if(dataJSON.ts){
      //Tengo el ts, lo envio de vuelta
      ts = dataJSON.ts;
    }
    if(dataJSON.mv_id){
      mv_id = dataJSON.mv_id;
    }

  }catch(err){
    console.log("Error al obtener el ts del kubejoin");
  }

  //Devuelvo el timestamp
  ret.set('ts', ts);
  ret.set('id', mv_id)

  //Obtengo la id de la maquina

  console.log(ret);
  e.sender.send('return-kubejoin-ts', ret);
});


//Comprueba si el directorio esta vacio
ipcMain.on('check-empty-dir', (e, url)=>{
  fs.readdir(url, function(err, files) {
    let vacio = false;
    if (err) {
      // some sort of error
      vacio = null;
    } else {
      if (!files.length) {
        // directory appears to be empty
        vacio = true;
      }else{
        vacio = false;
      }
    }
    e.sender.send('return-empty-dir', vacio);
    
  });   
});

//Funcion que actualiza la IP del kubejoin
ipcMain.on('set-ip-mv', (e, url, ip)=>{
  //Abro el fichero del shell
  console.log("Modificando IP...");
  console.log("URL: "+url + ".IP: "+ip);
  fs.readFile(url + "/kubejoin.sh", 'utf-8', (err, kubejoin)=>{
    try{
      if(err){
        throw("Error abriendo el Kubejoin");
      }

      datosModificados = kubejoin.replace(
        /KUBELET_EXTRA_ARGS=--node-ip=.+/,
        'KUBELET_EXTRA_ARGS=--node-ip=' + ip
      );
      console.log(datosModificados);
  
      
  
      fs.writeFile(url + "/kubejoin.sh", datosModificados, 'utf8', (error) =>{
        if(error){
          console.log("Error al escribir el kubejoin");
          throw("Error al escribir el kubejioin");
        }else{
          console.log("kubejoin escrito correctamente");

          //Ahora almaceno el yaml de cambiar la ip
          const pathIpConfig = path.join(__dirname,'../assets/ipConfig.yaml');
          try{
            const contenidoIpConfig = fs.readFileSync(pathIpConfig, 'utf-8');

            //Busco y modifico la ip en el contenido
            const contenidoIpConfigActualizado = contenidoIpConfig.replace(
              /dhcp4: no(\r\n|\r|\n).+/,
              'dhcp4: no\n      addresses: ['+ip+'/8]'
            );

            console.log(contenidoIpConfigActualizado);

            fs.writeFileSync(url+"/ipConfig.yaml", contenidoIpConfigActualizado);
            
            //Envio la respuesta al renderer
            e.sender.send('return-set-ip-mv', 0);
          }catch(err){
            console.log("Error al copiar el ipConfig" + err);
            throw("Error al copiar el ipConfig")
          }
        }
      });
    }catch (error){
      console.error("Error al actualizar la IP. " + error);

      e.sender.send('return-set-ip-mv', null);
      return;
    }
  });  
  //Busco con una expresion regular donde cambiar la IP y la cambio

  //Devuelvo respuesta al renderer
});

//Obtiene el directorio de descargas
ipcMain.on('instala-vagrant', (e)=>{
  // URL del instalador de Vagrant
  const urlInstalador = 'https://releases.hashicorp.com/vagrant/2.4.1/vagrant_2.4.1_windows_amd64.msi';

  // Obtener la ruta de la carpeta de descargas
  const carpetaDescargas = app.getPath('downloads');

  const rutaInstalador = carpetaDescargas+"/vagrant_2.4.1_windows_amd64.msi";
  try{  
    https.get(urlInstalador, (res)=>{
          const fileStream = fs.createWriteStream(rutaInstalador);
          res.pipe(fileStream);

          fileStream.on('finish', ()=>{
            fileStream.close(()=>{
              console.log('Instalador de Vagrant descargado correctamente.');
              // Ejecutar el instalador
              exec(`${rutaInstalador}`, (error, stdout, stderr) => {
                  if (error) {
                      console.error('Error al instalar Vagrant:', error);
                      e.sender.send('return-instala-vagrant', false);
                  } else {
                      console.log('Vagrant se ha instalado correctamente.');
                      e.sender.send('return-instala-vagrant', true);
                  }
              });
            });
          });
      }).on('error', (err) => {
        fs.inlink(rutaInstalador);
        throw("Error en la peticion HTTP. " + err);
      });

    }catch(error){
      console.error('Error al descargar el instalador de Vagrant:', error);
      e.sender.send('return-instala-vagrant', false);
    }

});

//Funcion que abre un menu
async function createSourceVideoSelector(event){
  const inputSources = await desktopCapturer.getSources({
    types: ['window', 'screen']
  });

  console.log("Hola");

  const videoOptionsMenu = Menu.buildFromTemplate(
    inputSources.map(source =>{
      return{
        label: source.name,
        click: () => {event.sender.send('video-source-selected', source)}
      };
    })
  );

  videoOptionsMenu.popup({ window: BrowserWindow.fromWebContents(event.sender) });
}


/**
 * Funcion que cambia de pantalla
 * 
 * -Main:
 *    session_id
 *    token
 * 
 * -Video:
 *    session_id
 *    token
 *    id_contenedor
 *    
 * @param {String} pantalla 
 * @param {Map} args Argumentos que se quieren pasar de una pantalla a otra
 */
async function cambiaPantalla(pantalla, args){
  try{
    console.log("Cambiando pantalla: " + pantalla);
  switch(pantalla){
    case "login":
      win.loadFile("src/html/login.html");
      await win.setFullScreen(false);
      await win.unmaximize();
      win.setSize(1000, 720, true);
      session_id = null;
      token = null;
      break;
    case "main":
      if(session_id===null || token===null){
        console.log("Datos de sesion no presentes");
        if(!args.has("session_id") || !args.has("token")){
          throw("Error al cambiar a la pantalla main. Faltan las variables globales de session_id y token o no se las han pasado correctamente en los argumentos.");
        }else{
          console.log("Actualizando datos sesion");
          session_id = args.get("session_id");
          token = args.get("token");
        }
      }

      win.loadFile("src/html/main_screen.html");
      await win.setFullScreen(false);
      await win.unmaximize();
      win.setSize(1000, 720, true);

      break;
    case "RDP":
      if(session_id===null || token===null){
        throw("Faltan las variables globales de session_id y token");
      }else{
        if(!args.has("id_contenedor")){
          throw("Error al cambiar a la pantalla RDP. No se ha especificado un id de contenedor.")
        }else{
          id_contenedor = args.get("id_contenedor");
          win.loadFile("src/html/remote_desktop.html");
        }
      }
      break;
    
    case "SSH":
      if(session_id===null || token===null){
        throw("Faltan las variables globales de session_id y token");
      }else{
        if(!args.has("id_contenedor")){
          throw("Error al cambiar a la pantalla SSH. No se ha especificado un id de contenedor.")
        }else{
          id_contenedor = args.get("id_contenedor");
          win.loadFile("src/html/ssh.html");
        }
      }
      break;
  }
  }catch(e){
    console.error("Error al cambiar de pantalla:\n" + e);
  }

}


