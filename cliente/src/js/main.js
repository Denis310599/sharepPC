const { app, BrowserWindow, ipcMain, Menu} = require('electron/main');
const path = require('node:path');
const { desktopCapturer } = require('electron/main');
const { create } = require('node:domain');
const fs = require('fs');


//Variables almacenadas necesarias para la aplicacion
let session_id = "denis#1710420242";
let token = "Tk-17104ljcprrgwfrtonajpqdls20242";
let id_contenedor;

let host_web_socket = "ws://gusydenis.duckdns.org:28000";
let host_API = "hqna10txtk.execute-api.eu-west-3.amazonaws.com";

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
    minWidth: 800
  })

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

/*****************************************
 *    Funciones del ipc_main
 * ***************************************
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
      break;
    case "RDP":
      mapaVariables.set('token', token);
      mapaVariables.set('session_id', session_id);
      mapaVariables.set('id_contenedor', id_contenedor);
      mapaVariables.set('host_WS', host_web_socket);
      mapaVariables.set('host_API', host_API);
      break;
    case "login":
      mapaVariables.set('host_API', host_API);
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
      break;
    case "main":
      if(session_id===null || token===null){
        if(!args.has("session_id") || !args.has("token")){
          throw("Error al cambiar a la pantalla main. Faltan las variables globales de session_id y token o no se las han pasado correctamente en los argumentos.");
        }else{
          session_id = args.get("session_id");
          token = args.get("token");
        }
      }else{
        win.loadFile("src/html/main_screen.html");
        await win.setFullScreen(false);
        await win.unmaximize();
        win.setSize(1000, 720, true);
      }
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
  }
  }catch(e){
    console.error("Error al cambiar de pantalla:\n" + e);
  }

}


