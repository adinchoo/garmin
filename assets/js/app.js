const VIEW_META={home:["OVERVIEW","Home"],activities:["TRAINING","Activities"],coach:["INTELLIGENCE","AI Coach"],nutrition:["FUEL","Nutrition"],trends:["INSIGHTS","Trends"],more:["YOUR SPACE","More"],profile:["ACCOUNT","Profile & Goals"]};
document.addEventListener("DOMContentLoaded",()=>{
  if("serviceWorker" in navigator) navigator.serviceWorker.register("./service-worker.js").catch(console.error);
  // default dark, but respect user choice (light)
  const saved=localStorage.getItem("fitness-theme");
  if(saved){
    document.documentElement.dataset.theme=saved;
  }else{
    document.documentElement.dataset.theme="dark";
    localStorage.setItem("fitness-theme","dark");
  }
  document.querySelectorAll("[data-go]").forEach(b=>b.onclick=()=>showView(b.dataset.go));
  document.querySelectorAll("[data-action=refresh]").forEach(b=>b.onclick=()=>window.loadDashboard?.(true));
  document.getElementById("themeButton")?.addEventListener("click",toggleTheme);
  document.getElementById("fsButton")?.addEventListener("click",()=>window.PWAFS?.toggle());
  document.getElementById("fsFab")?.addEventListener("click",()=>window.PWAFS?.toggle());
  document.addEventListener('keydown', e=>{
    if(e.key.toLowerCase()==='f' && !e.metaKey && !e.ctrlKey && e.target.tagName!=='INPUT' && e.target.tagName!=='SELECT'){
      if(document.body.classList.contains('dashboard-page')) window.PWAFS?.toggle();
    }
  });
  if(document.body.classList.contains("dashboard-page")){
    showView(location.hash.slice(1)||"home",false);
    enableSwipe();
  }
});
function showView(n,push=true){
  if(!VIEW_META[n]) n="home";
  document.querySelectorAll(".app-view").forEach(v=>v.classList.toggle("active",v.dataset.page===n));
  document.querySelectorAll(".nav-btn").forEach(v=>v.classList.toggle("active",v.dataset.go===n));
  textContent("viewEyebrow",VIEW_META[n][0]);
  textContent("viewTitle",VIEW_META[n][1]);
  document.querySelector(".app-main")?.scrollTo({top:0,behavior:"smooth"});
  if(n==="trends"&&window.dashboardDataset) setTimeout(()=>renderCharts(window.dashboardDataset),100);
  if(push) history.replaceState(null,"",`#${n}`);
}
function enableSwipe(){
  let x=0,y=0;
  const s=document.getElementById("viewStack");
  s?.addEventListener("touchstart",e=>{x=e.touches[0].clientX;y=e.touches[0].clientY},{passive:true});
  s?.addEventListener("touchend",e=>{
    const dx=e.changedTouches[0].clientX-x,dy=e.changedTouches[0].clientY-y;
    if(Math.abs(dx)<100||Math.abs(dx)<Math.abs(dy)*1.8) return;
    const o=["home","activities","coach","nutrition","trends"],c=document.querySelector(".app-view.active")?.dataset.page,i=o.indexOf(c);
    if(i>=0) showView(o[Math.max(0,Math.min(o.length-1,i+(dx<0?1:-1)))])
  },{passive:true})
}
function toggleTheme(){
  const cur=document.documentElement.dataset.theme;
  const n=cur==="light"?"dark":"light";
  document.documentElement.dataset.theme=n;
  localStorage.setItem("fitness-theme",n);
  dispatchEvent(new Event("themechange"));
  // update meta theme-color
  const meta=document.querySelector('meta[name="theme-color"]');
  if(meta) meta.content=n==="light"?"#EEF2F8":"#050914";
}
function textContent(id,v){const e=document.getElementById(id);if(e) e.textContent=v;}
window.showView=showView;
window.showToast=(m,t="success")=>{
  const e=document.getElementById("toast");
  if(!e) return;
  e.textContent=m;
  e.className=`toast show ${t}`;
  clearTimeout(window.__toast);
  window.__toast=setTimeout(()=>e.className="toast",3500)
};
window.setBusy=(b,on,l="Working...")=>{
  if(!b) return;
  b.disabled=on;
  if(on){b.dataset.old=b.innerHTML;b.innerHTML=`<span class="spinner"></span>${l}`}
  else if(b.dataset.old) b.innerHTML=b.dataset.old
};
