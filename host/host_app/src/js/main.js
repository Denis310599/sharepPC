const { app, BrowserWindow, ipcMain, Menu} = require('electron/main');
const path = require('node:path');
const { desktopCapturer } = require('electron/main');
const { create } = require('node:domain');
const {mouse, Point, straightTo, Button, keyboard, Key} = require("@nut-tree/nut-js");

//Tamaño de la pantalla
var screenWidth = 1920;
var screenHeight = 1080;

const createWindow = () => {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
        preload: path.join(__dirname, 'preload.js')
    }
  })

  win.loadFile(path.join(__dirname,'../html/index.html'));

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

ipcMain.on('log', (event, data) => {
  console.log(data);
}) 

//Handler de peticion de apertura de menu
ipcMain.on('get-video-source', (event) =>{
  console.log("Pillando fuentes de video");
  getVideoSoruces(event);
});


//Handler de accion de mouse
ipcMain.on('mouse-action', (event, data) =>{
  realizaAccionMouse(data);
});

//Handler de accion de teclado
ipcMain.on('key-action', (event, data) =>{
  realizaAccionTeclado(data);
});

//Funcion que abre un menu
async function getVideoSoruces(event){
  const inputSources = await desktopCapturer.getSources({
    types: ['window', 'screen']
  });

  console.log(inputSources);
  event.sender.send('video-source-selected', inputSources[0])

  //videoOptionsMenu.popup({ window: BrowserWindow.fromWebContents(event.sender) });
}


async function realizaAccionMouse(json_recibido){
  //console.log("En realizando accion Mouse");
  switch(json_recibido.datos.evento){
    case 'click':
      //console.log("Click " + json_recibido.datos.boton);
        //Se ha producido un click con el raton
        console.log('Click' +  json_recibido.datos.boton);
        switch(json_recibido.datos.boton){
          case 'right':
            mouse.pressButton(Button.RIGHT);
            break;
          case 'left':
            mouse.pressButton(Button.LEFT);
            break;
          case 'mid':
            mouse.pressButton(Button.MIDDLE);
            break;
        }
      break;
    case 'unclick':
      console.log("Unclick " + json_recibido.datos.boton);
        //Se ha producido un un-click con el raton
        switch(json_recibido.datos.boton){
          case 'right':
            mouse.releaseButton(Button.RIGHT);
            break;
          case 'left':
            mouse.releaseButton(Button.LEFT);
            break;
          case 'mid':
            mouse.releaseButton(Button.MIDDLE);
            break;
        }
        break;
    case 'move':
        //Obtengo los datos del JSON
        var x = Math.round(json_recibido.datos.x * screenWidth);
        var y = Math.round(json_recibido.datos.y * screenHeight);
        mouse.setPosition(new Point(x, y));
        break;
  }
}

async function realizaAccionTeclado(json_recibido){
  //console.log("En realizando accion Mouse");
  switch(json_recibido.datos.evento){
    case 'click':
      console.log("Click " + json_recibido.datos.boton);
        //Se ha producido un click con el teclado
        //console.log('Keypress' +  jsason_recibido.datos.tecla);
        keyboard.pressKey(getTeclaPulsadaKey(json_recibido.datos.tecla));
      break;
    case 'unclick':
      console.log("Unclick " + json_recibido.datos.tecla);
        //Se ha producido un un-click con el teclado
        //console.log('Keypress' +  json_recibido.datos.tecla);
        keyboard.releaseKey(getTeclaPulsadaKey(json_recibido.datos.tecla));
      break;
  }
}

function getTeclaPulsadaKey(keyCode){
  var tecla;
  switch (keyCode){
    case 'Space':
        tecla = Key.Space;
        break;
    case 'Escape':
        tecla = Key.Escape;
        break;
    case 'Tab':
        tecla = Key.Tab;
        break;
    case 'AltLeft':
        tecla = Key.LeftAlt;
        break;
    case 'ControlLeft':
        tecla = Key.LeftControl;
        break;
    case 'AltRight':
        tecla = Key.RightAlt;
        break;
    case 'ControlRight':
        tecla = Key.RightControl;
        break;
    case 'ShiftLeft':
        tecla = Key.LeftShift;
        break;
    case 'MetaLeft':
        tecla = Key.LeftSuper;
        break;
    case 'ShiftRight':
        tecla = Key.RightShift;
        break;
    case 'RightSuper':
        tecla = Key.RightSuper;
        break;
    case 'F1':
        tecla = Key.F1;
        break;
    case 'F2':
        tecla = Key.F2;
        break;
    case 'F3':
        tecla = Key.F3;
        break;
    case 'F4':
        tecla = Key.F4;
        break;
    case 'F5':
        tecla = Key.F5;
        break;
    case 'F6':
        tecla = Key.F6;
        break;
    case 'F7':
        tecla = Key.F7;
        break;
    case 'F8':
        tecla = Key.F8;
        break;
    case 'F9':
        tecla = Key.F9;
        break;
    case 'F10':
        tecla = Key.F10;
        break;
    case 'F11':
        tecla = Key.F11;
        break;
    case 'F12':
        tecla = Key.F12;
        break;
    case 'F13':
        tecla = Key.F13;
        break;
    case 'F14':
        tecla = Key.F14;
        break;
    case 'F15':
        tecla = Key.F15;
        break;
    case 'F16':
        tecla = Key.F16;
        break;
    case 'F17':
        tecla = Key.F17;
        break;
    case 'F18':
        tecla = Key.F18;
        break;
    case 'F19':
        tecla = Key.F19;
        break;
    case 'F20':
        tecla = Key.F20;
        break;
    case 'F21':
        tecla = Key.F21;
        break;
    case 'F22':
        tecla = Key.F22;
        break;
    case 'F23':
        tecla = Key.F23;
        break;
    case 'F24':
        tecla = Key.F24;
        break;
    case 'Digit0':
        tecla = Key.Num0;
        break;
    case 'Digit1':
        tecla = Key.Num1;
        break;
    case 'Digit2':
        tecla = Key.Num2;
        break;
    case 'Digit3':
        tecla = Key.Num3;
        break;
    case 'Digit4':
        tecla = Key.Num4;
        break;
    case 'Digit5':
        tecla = Key.Num5;
        break;
    case 'Digit6':
        tecla = Key.Num6;
        break;
    case 'Digit7':
        tecla = Key.Num7;
        break;
    case 'Digit8':
        tecla = Key.Num8;
        break;
    case 'Digit9':
        tecla = Key.Num9;
        break;
    case 'KeyA':
        tecla = Key.A;
        break;
    case 'KeyB':
        tecla = Key.B;
        break;
    case 'KeyC':
        tecla = Key.C;
        break;
    case 'KeyD':
        tecla = Key.D;
        break;
    case 'KeyE':
        tecla = Key.E;
        break;
    case 'KeyF':
        tecla = Key.F;
        break;
    case 'KeyG':
        tecla = Key.G;
        break;
    case 'KeyH':
        tecla = Key.H;
        break;
    case 'KeyI':
        tecla = Key.I;
        break;
    case 'KeyJ':
        tecla = Key.J;
        break;
    case 'KeyK':
        tecla = Key.K;
        break;
    case 'KeyL':
        tecla = Key.L;
        break;
    case 'KeyM':
        tecla = Key.M;
        break;
    case 'KeyN':
        tecla = Key.N;
        break;
    case 'KeyO':
        tecla = Key.O;
        break;
    case 'KeyP':
        tecla = Key.P;
        break;
    case 'KeyQ':
        tecla = Key.Q;
        break;
    case 'KeyR':
        tecla = Key.R;
        break;
    case 'KeyS':
        tecla = Key.S;
        break;
    case 'KeyT':
        tecla = Key.T;
        break;
    case 'KeyU':
        tecla = Key.U;
        break;
    case 'KeyV':
        tecla = Key.V;
        break;
    case 'KeyW':
        tecla = Key.W;
        break;
    case 'KeyX':
        tecla = Key.X;
        break;
    case 'KeyY':
        tecla = Key.Y;
        break;
    case 'KeyZ':
        tecla = Key.Z;
        break;
    case 'Enter':
        tecla = Key.Enter;
        break;
    case 'Minus':
        tecla = Key.Minus;
        break;
    case 'Equal':
        tecla = Key.Equal;
        break;
    case 'Backspace':
        tecla = Key.Backspace;
        break;
    case 'BracketLeft':
        tecla = Key.LeftBracket;
        break;
    case 'BracketRight':
        tecla = Key.RightBracket;
        break;
    case 'Backslash':
        tecla = Key.Backslash;
        break;
    case 'Semicolon':
        tecla = Key.Semicolon;
        break;
    case 'Quote':
        tecla = Key.Quote;
        break;
    case 'Enter':
        tecla = Key.Return;
        break;
    case 'Comma':
        tecla = Key.Comma;
        break;
    case 'Period':
        tecla = Key.Period;
        break;
    case 'Slash':
        tecla = Key.Slash;
        break;
    case 'ArrowLeft':
        tecla = Key.Left;
        break;
    case 'ArrowUp':
        tecla = Key.Up;
        break;
    case 'ArrowRight':
        tecla = Key.Right;
        break;
    case 'ArrowDown':
        tecla = Key.Down;
        break;
    case 'PrintScreen':
        tecla = Key.Print;
        break;
    case 'Pause':
        tecla = Key.Pause;
        break;
    case 'Insert':
        tecla = Key.Insert;
        break;
    case 'Delete':
        tecla = Key.Delete;
        break;
    case 'Home':
        tecla = Key.Home;
        break;
    case 'End':
        tecla = Key.End;
        break;
    case 'PageUp':
        tecla = Key.PageUp;
        break;
    case 'PageDown':
        tecla = Key.PageDown;
        break;
    case 'NumpadAdd':
        tecla = Key.Add;
        break;
    case 'NumpadSubtract':
        tecla = Key.Subtract;
        break;
    case 'NumpadMultiply':
        tecla = Key.Multiply;
        break;
    case 'NumpadDivide':
        tecla = Key.Divide;
        break;
    case 'NumpadDecimal':
        tecla = Key.Decimal ;
        break;
    case 'NumpadEnter':
        tecla = Key.Enter ;
        break;
    case 'Numpad0':
        tecla = Key.NumPad0 ;
        break;
    case 'Numpad1':
        tecla = Key.NumPad1 ;
        break;
    case 'Numpad2':
        tecla = Key.NumPad2 ;
        break;
    case 'Numpad3':
        tecla = Key.NumPad3 ;
        break;
    case 'Numpad4':
        tecla = Key.NumPad4 ;
        break;
    case 'Numpad5':
        tecla = Key.NumPad5 ;
        break;
    case 'Numpad6':
        tecla = Key.NumPad6 ;
        break;
    case 'Numpad7':
        tecla = Key.NumPad7 ;
        break;
    case 'Numpad8':
        tecla = Key.NumPad8 ;
        break;
    case 'Numpad9':
        tecla = Key.NumPad9 ;
        break;
    case 'CapsLock':
        tecla = Key.CapsLock ;
        break;
    case 'ScrollLock':
        tecla = Key.ScrollLock ;
        break;
    case 'NumLock':
        tecla = Key.NumLock ;
        break;
    case 'AudioMute':
        tecla = Key.AudioMute ;
        break;
    case 'AudioVolDown':
        tecla = Key.AudioVolDown ;
        break;
    case 'AudioVolUp':
        tecla = Key.AudioVolUp ;
        break;
    case 'AudioPlay':
        tecla = Key.AudioPlay ;
        break;
    case 'AudioStop':
        tecla = Key.AudioStop ;
        break;
    case 'AudioPause':
        tecla = Key.AudioPause ;
        break;
    case 'AudioPrev':
        tecla = Key.AudioPrev ;
        break;
    case 'AudioNext':
        tecla = Key.AudioNext ;
        break;
    case 'AudioRewind':
        tecla = Key.AudioRewind ;
        break;
    case 'AudioForward':
        tecla = Key.AudioForward ;
        break;
    case 'AudioRepeat':
        tecla = Key.AudioRepeat ;
        break;
    case 'AudioRandom':
        tecla = Key.AudioRandom ;
        break;
    case 'LeftWin':
        tecla = Key.LeftWin ;
        break;
    case 'RightWin':
        tecla = Key.RightWin ;
        break;
    case 'LeftCmd ':
        tecla = Key.LeftCmd ;
        break;
    case 'RightCmd':
        tecla = Key.RightCmd ;
        break;
    case 'ContextMenu':
        tecla = Key.Menu ;
        break;
    case 'Fn':
        tecla = Key.Fn;
        break;
  }

  return tecla;
}