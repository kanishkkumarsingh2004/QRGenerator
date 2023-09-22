let btn = document.querySelector(".button")
let UserInput = document.querySelector("#input-text")
let generateImg  = document.querySelector(".generateImg");
let text=document.querySelector('text');
let download = document.querySelector('.Download');

function qrGenerator (){
    generateImg.src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data="+UserInput.value; 
}


btn.addEventListener('click', ()=>{
 qrGenerator();
         
})