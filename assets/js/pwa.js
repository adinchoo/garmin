(function(){
 const root=document.documentElement;
 let frame=0;
 function applyViewport(){cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>{const viewport=window.visualViewport;const height=Math.round(viewport?.height||window.innerHeight);root.style.setProperty("--app-height",`${height}px`);root.style.setProperty("--keyboard-offset",`${Math.max(0,window.innerHeight-height)}px`)})}
 const standalone=matchMedia("(display-mode: standalone)").matches||navigator.standalone===true;
 root.classList.toggle("is-standalone",standalone);root.classList.toggle("is-ios",/iPad|iPhone|iPod/.test(navigator.userAgent));
 applyViewport();addEventListener("resize",applyViewport,{passive:true});addEventListener("orientationchange",()=>setTimeout(applyViewport,250),{passive:true});
 if(visualViewport){visualViewport.addEventListener("resize",applyViewport,{passive:true});visualViewport.addEventListener("scroll",applyViewport,{passive:true})}
 document.addEventListener("focusin",e=>{if(e.target.matches("input,select,textarea"))setTimeout(()=>e.target.scrollIntoView({block:"center",behavior:"smooth"}),250)});
 window.PWAFS={isSupported:!!document.documentElement.requestFullscreen,isActive:()=>!!document.fullscreenElement,async enter(){if(!document.documentElement.requestFullscreen)return false;try{await document.documentElement.requestFullscreen({navigationUI:"hide"});return true}catch{return false}},async exit(){if(document.fullscreenElement)await document.exitFullscreen()},async toggle(){return this.isActive()?this.exit():this.enter()}};
})();
