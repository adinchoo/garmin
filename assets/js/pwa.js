/** Fitness AI Hub - Fullscreen PWA Manager v8 **/
(function(){
  const html = document.documentElement;
  const setVH = ()=>{
    const vh = window.innerHeight * 0.01;
    html.style.setProperty('--vh', `${vh}px`);
    html.style.setProperty('--app-height', `${window.innerHeight}px`);
    html.style.setProperty('--app-dvh', `${window.innerHeight}px`);
  };
  setVH();
  window.addEventListener('resize', setVH, {passive:true});
  window.addEventListener('orientationchange', ()=> setTimeout(setVH, 150));

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches 
    || window.matchMedia('(display-mode: fullscreen)').matches
    || window.navigator.standalone === true;

  html.classList.toggle('is-standalone', isStandalone);
  html.classList.toggle('is-fullscreen-mode', window.matchMedia('(display-mode: fullscreen)').matches);
  html.classList.toggle('is-ios', isIOS);

  // Listen for display mode changes
  ['fullscreen','standalone'].forEach(mode=>{
    try{
      window.matchMedia(`(display-mode: ${mode})`).addEventListener('change', e=>{
        html.classList.toggle('is-standalone', e.matches || isStandalone);
        html.classList.toggle('is-fullscreen-mode', mode==='fullscreen' && e.matches);
        setVH();
      });
    }catch{}
  });

  // Fullscreen API helpers
  window.PWAFS = {
    isSupported: !!document.documentElement.requestFullscreen,
    isActive: ()=> !!document.fullscreenElement,
    async enter(){
      try{
        if(!document.fullscreenElement && document.documentElement.requestFullscreen){
          await document.documentElement.requestFullscreen({navigationUI: "hide"});
          // try orientation lock for immersive feel
          if(screen.orientation && screen.orientation.lock){
            try{ await screen.orientation.lock('any').catch(()=>{}); }catch{}
          }
          return true;
        }
      }catch(e){ console.warn('FS enter failed', e); }
      return false;
    },
    async exit(){
      try{
        if(document.fullscreenElement) await document.exitFullscreen();
      }catch{}
    },
    async toggle(){
      return this.isActive() ? this.exit() : this.enter();
    }
  };

  // Auto-hide address bar trick for iOS / non-PWA
  if(!isStandalone){
    window.addEventListener('load', ()=> setTimeout(()=> window.scrollTo(0,1), 200));
  }

  // Fullscreen change handling
  document.addEventListener('fullscreenchange', ()=>{
    html.classList.toggle('is-browser-fullscreen', !!document.fullscreenElement);
    setVH();
  });

  // Wake lock (optional, keeps screen on during workout view)
  let wakeLock = null;
  async function requestWakeLock(){
    try{
      if('wakeLock' in navigator){
        wakeLock = await navigator.wakeLock.request('screen');
      }
    }catch{}
  }
  document.addEventListener('visibilitychange', ()=>{
    if(wakeLock!==null && document.visibilityState==='visible') requestWakeLock();
  });
  // request on first interaction in dashboard
  window.addEventListener('click', function initWL(){
    requestWakeLock();
    window.removeEventListener('click', initWL);
  }, {once:true});

  // Install prompt handling (optional but nice)
  let deferredPrompt = null;
  window.addEventListener('beforeinstallprompt', e=>{
    e.preventDefault();
    deferredPrompt = e;
    html.classList.add('can-install');
  });
  window.installPWA = async ()=>{
    if(!deferredPrompt) return false;
    deferredPrompt.prompt();
    const {outcome} = await deferredPrompt.userChoice;
    deferredPrompt = null;
    html.classList.remove('can-install');
    return outcome==='accepted';
  };
})();
