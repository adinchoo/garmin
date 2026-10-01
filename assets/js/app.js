document.addEventListener("DOMContentLoaded", () => {
  if ("serviceWorker" in navigator && location.protocol !== "file:") navigator.serviceWorker.register("./service-worker.js").catch(console.error);
  const savedTheme=localStorage.getItem("fitness-theme"); if(savedTheme) document.documentElement.dataset.theme=savedTheme;
  document.getElementById("themeButton")?.addEventListener("click",()=>{const next=document.documentElement.dataset.theme==="light"?"dark":"light";document.documentElement.dataset.theme=next;localStorage.setItem("fitness-theme",next);window.dispatchEvent(new Event("themechange"));});
  document.getElementById("menuButton")?.addEventListener("click",()=>document.getElementById("sidebar")?.classList.toggle("open"));
  document.querySelectorAll(".side-nav a").forEach(a=>a.addEventListener("click",()=>document.getElementById("sidebar")?.classList.remove("open")));
});
window.showToast=(message,type="success")=>{const el=document.getElementById("toast");if(!el)return;el.textContent=message;el.className=`toast show ${type}`;clearTimeout(window.__toastTimer);window.__toastTimer=setTimeout(()=>el.className="toast",3500);};
window.setBusy=(button,busy,label="Working...")=>{if(!button)return;button.disabled=busy;if(busy){button.dataset.original=button.innerHTML;button.innerHTML=`<span class="button-spinner"></span>${label}`;}else if(button.dataset.original){button.innerHTML=button.dataset.original;}};
