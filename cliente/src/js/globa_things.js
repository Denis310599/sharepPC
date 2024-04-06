//Cuando el raton pase encima de un titulo, comprueba si se está haciendo overflow y permite o no el autoscroll
document.querySelectorAll('.header-tarjeta.nombre-tarjeta').forEach(item=>{

  item.onmouseenter = ((() =>{
    const overflow = checkOverflow(item);
    if(overflow){
      item.classList.add("overflow-anim")
    }else{
      item.classList.remove("overflow-anim")
    }
  }))

})



// Determines if the passed element is overflowing its bounds,
// either vertically or horizontally.
// Will temporarily modify the "overflow" style to detect this
// if necessary.
function checkOverflow(el)
{
   var curOverflow = el.style.overflow;

   if ( !curOverflow || curOverflow === "visible" )
      el.style.overflow = "hidden";

   var isOverflowing = el.clientWidth < el.scrollWidth 
      || el.clientHeight < el.scrollHeight;

   el.style.overflow = curOverflow;

   return isOverflowing;
  
}

//Abre el panel de creación de contenedor cuando se clica en el boton correspondiente
document.getElementById('botonCreacionTarjeta').onclick = ()=>{
  const modal = document.getElementById("modalCreacionContenedor");
  modal.style.display = "block";
  
  modal.classList.add("in");
  modal.querySelector('.modal-content').classList.add("in");
  
  modal.onanimationend = ()=>{
    modal.classList.remove("in");
    modal.querySelector('.modal-content').classList.remove("in");
  }
  
}

//Anre el panel de ajustes
document.getElementById('botonSettings').onclick = () =>{
  const modal = document.getElementById("modalAjustes");
  modal.style.display = "block";
  
  modal.classList.add("in");
  modal.querySelector('.modal-content').classList.add("in");
  
  modal.onanimationend = ()=>{
    modal.classList.remove("in");
    modal.querySelector('.modal-content').classList.remove("in");
  }
};

//Cierra el panel de creación de contenedor cuando se clica en el boton correspondiente
document.querySelectorAll('.modal .boton-cancelar').forEach(item => {
  console.log("Boton salir modal encontrado");
  item.onclick = ()=>{
    console.log("Saliendo del modal");
    const modal = item.closest(".modal");
    if(modal.querySelector(".error-message")){
      modal.querySelector(".error-message").classList.add("disabled");
    }
    //const modal = document.getElementById("modalCreacionContenedor");
    //modal.style.display = "none"
    
    modal.classList.add("out");
    modal.querySelector('.modal-content').classList.add("out");

    modal.onanimationend = ()=>{
      modal.style.display = "none";
      modal.classList.remove("out");
      modal.querySelector('.modal-content').classList.remove("out");
    }
  }
});


//Actualizo la logica de los spinners de memoria
document.querySelectorAll(".input-mem-size").forEach(input=>{
  console.log("Elementos encontrados");
  //Obtenemos el selector de escala asociado
  const medidaSelector = input.closest(".custom-input-number").parentElement.querySelector(".input-mem-type");

  medidaSelector.onchange = (e)=>{
    let valor = parseInt(input.value);
    let max;
    let min;
    let step;
    if(e.target.value == "Mi"){
      valor = parseInt(valor)*1024;
      max = 32768;
      min = 512;
      step = 512;
    }else{
      valor = Math.round(parseInt(valor)/1024);
      max = 32;
      min = 1;
      step = 1;
    }


    if(valor < min){
      valor = min;
    }else if(valor > max){
      valor = max;
    }

    input.max = max;
    input.min = min;
    input.step = step;
    input.value = valor;


  }

  
})


//Actualizo la logica de todos los spinners
document.querySelectorAll(".custom-input-number").forEach(father=>{

  const decrementBtn = father.querySelector('.custom-input-number-decrement');
  const incrementBtn = father.querySelector('.custom-input-number-increment');
  const input = father.getElementsByTagName("input")[0];

  decrementBtn.onclick = ()=>{
    let valor = parseInt(input.value);
    if( !input.closest(".custom-input-number").classList.contains("disabled") && valor > parseInt(input.min)){
      input.value = valor - input.step;
    } 
  };

  incrementBtn.onclick = () =>{
    let valor = parseInt(input.value);
    if( !input.closest(".custom-input-number").classList.contains("disabled") && valor < parseInt(input.max)){
      input.value = valor + parseInt(input.step);
    }
  }
});