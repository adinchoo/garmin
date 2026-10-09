(()=>{"use strict";const ios=/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==="MacIntel"&&navigator.maxTouchPoints>1),standalone=matchMedia("(display-mode:standalone)").matches||navigator.standalone===true;document.documentElement.classList.toggle("ios",ios);document.documentElement.classList.toggle("standalone",standalone);if("serviceWorker"in navigator)addEventListener("load",()=>navigator.serviceWorker.register("./service-worker.js",{scope:"./"}).then(r=>r.update()).catch(console.error));addEventListener("load",()=>{let g=document.querySelector("#iosInstall");if(g&&ios&&!standalone){let dismissed=false;try{dismissed=localStorage.getItem("hide-ios-install")==="1"}catch{}if(!dismissed)g.hidden=false}});addEventListener("click",e=>{if(e.target.closest("#closeInstall")){try{localStorage.setItem("hide-ios-install","1")}catch{}document.querySelector("#iosInstall").hidden=true}})})();
function setAppHeight(){
  document.documentElement.style.setProperty('--app-height', `${window.innerHeight}px`);
  document.body.style.height = window.innerHeight + 'px';
}
window.addEventListener('resize', setAppHeight);
window.addEventListener('orientationchange', () => setTimeout(setAppHeight, 300));
setAppHeight();

// iOS standalone scroll fix
if (window.navigator.standalone) {
  document.addEventListener('touchmove', (e) => {
    if(e.target.closest('.scroll')) return;
    e.preventDefault();
  }, {passive: false});
}