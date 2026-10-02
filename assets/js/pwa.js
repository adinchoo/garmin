/** Fitness AI Hub - iPhone 14 Flush Fix v8.2 **/
(function(){
  const html=document.documentElement;
  const setVH=()=>{
    const h = window.visualViewport ? window.visualViewport.height : window.innerHeight;
    html.style.setProperty('--app-height', h+'px');
    html.style.setProperty('--vh', (h*0.01)+'px');
    // iPhone safe area fallback
    const testBottom = parseInt(getComputedStyle(html).getPropertyValue('--safe-bottom'))||0;
    if(testBottom===0 && /iPhone/.test(navigator.userAgent)){
      html.style.setProperty('--safe-bottom','34px');
      html.style.setProperty('--safe-top','47px');
    }
  };
  setVH();
  if(window.visualViewport){
    window.visualViewport.addEventListener('resize', setVH, {passive:true});
    window.visualViewport.addEventListener('scroll', setVH, {passive:true});
  }
  window.addEventListener('resize', setVH, {passive:true});
  window.addEventListener('orientationchange', ()=>setTimeout(setVH,300));

  const isIOS=/iPad|iPhone|iPod/.test(navigator.userAgent);
  const isStandalone=window.matchMedia('(display-mode: standalone)').matches || window.matchMedia('(display-mode: fullscreen)').matches || navigator.standalone===true;
  html.classList.toggle('is-standalone', isStandalone);
  html.classList.toggle('is-fullscreen-mode', window.matchMedia('(display-mode: fullscreen)').matches);
  html.classList.toggle('is-ios', isIOS);

  window.PWAFS={
    isSupported:!!document.documentElement.requestFullscreen,
    isActive:()=>!!document.fullscreenElement,
    async enter(){
      try{
        if(!document.fullscreenElement && document.documentElement.requestFullscreen){
          await document.documentElement.requestFullscreen({navigationUI:"hide"});
          if(screen.orientation?.lock){try{await screen.orientation.lock('any')}catch{}}
          return true;
        }
      }catch(e){console.warn(e)}
      return false;
    },
    async exit(){try{if(document.fullscreenElement) await document.exitFullscreen()}catch{}},
    async toggle(){return this.isActive()?this.exit():this.enter()}
  };
  document.addEventListener('fullscreenchange',()=>{
    html.classList.toggle('is-browser-fullscreen', !!document.fullscreenElement);
    setVH();
  });
  if(!isStandalone){
    window.addEventListener('load', ()=>setTimeout(()=>window.scrollTo(0,1),100));
  }
  // Wake lock
  let wl=null;
  async function reqWL(){try{if('wakeLock' in navigator) wl=await navigator.wakeLock.request('screen')}catch{}}
  document.addEventListener('visibilitychange',()=>{if(wl!==null && document.visibilityState==='visible') reqWL()});
  window.addEventListener('click', function i(){reqWL();window.removeEventListener('click', i)},{once:true});
})();
