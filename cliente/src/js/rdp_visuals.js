
//Constantes del DOM
const botonPantallaCompleta = document.getElementById("botonPantallaCompleta");

//Constantes globales
let pantallaCompleta = false;

document.querySelectorAll('.desplegable-lateral').forEach(item => {
  console.log("Elemento encontrado")
  const pestania= item.querySelector('.pestania-desplegable');
  if(pestania!==null){
    pestania.addEventListener('click', ()=>{
      
      document.onclick = (e) =>{
        console.log(e.target.classList)
        const transy = window.getComputedStyle(item, null).getPropertyValue("transform").replace("/[^0-9\-.,]/g", '').split(',')[4];
        
        if((item !== e.target && !item.contains(e.target)) || (pestania.contains(e.target) && transy != 200)){
          item.classList.remove("in");
          document.onclick = ()=>{};
        }
      }

      item.classList.add("in");

    });
  }
})

//Compotamiento del boton de pantalla completa
botonPantallaCompleta.onclick = ()=>{
  if(pantallaCompleta){
    ipcRenderer.send("pantalla-completa", "windowed");
    botonPantallaCompleta.getElementsByTagName("div")[0].textContent = "Panalla completa";
  }else{
    ipcRenderer.send("pantalla-completa", "fullscreen");
    botonPantallaCompleta.getElementsByTagName("div")[0].textContent = "Modo ventana";
  }
  pantallaCompleta = !pantallaCompleta;
}