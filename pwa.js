/* Instalação, atualização e status offline do app */
(function(){
  const $ = s => document.querySelector(s);
  // Botão "Instalar app"
  let deferred=null;
  const bar=document.querySelector("header.top .wrap");
  if(bar) bar.insertAdjacentHTML("beforeend",`<button id="btnInstalar" class="btn" hidden style="margin-left:8px;background:#e2b35c;border-color:#e2b35c;color:#14284b;font-weight:600">⬇ Instalar app</button><span id="offBadge" hidden style="margin-left:8px;font-size:12px;background:#a03a2e;color:#fff;border-radius:6px;padding:3px 8px">offline</span>`);
  addEventListener("beforeinstallprompt", e => { e.preventDefault(); deferred=e; $("#btnInstalar").hidden=false; });
  document.addEventListener("click", async e => { if(e.target && e.target.id==="btnInstalar" && deferred){ deferred.prompt(); await deferred.userChoice; deferred=null; $("#btnInstalar").hidden=true; } });
  addEventListener("appinstalled", () => { const b=$("#btnInstalar"); if(b) b.hidden=true; });
  // Indicador offline
  const net=()=>{ const o=$("#offBadge"); if(o) o.hidden=navigator.onLine; };
  addEventListener("online",net); addEventListener("offline",net); net();
  // Service worker + aviso de nova versão
  if("serviceWorker" in navigator){
    navigator.serviceWorker.register("./sw.js").then(reg => {
      const avisar = w => { const t=document.createElement("div"); t.className="toast on"; t.style.pointerEvents="auto"; t.innerHTML='Nova versão disponível. <button class="btn" style="margin-left:8px;padding:3px 10px">Atualizar</button>'; document.body.appendChild(t); t.querySelector("button").onclick=()=>w.postMessage("atualizar"); };
      if(reg.waiting) avisar(reg.waiting);
      reg.addEventListener("updatefound", () => { const w=reg.installing; w.addEventListener("statechange", () => { if(w.state==="installed" && navigator.serviceWorker.controller) avisar(w); }); });
    }).catch(()=>{});
    let rel=false; navigator.serviceWorker.addEventListener("controllerchange", () => { if(!rel){ rel=true; location.reload(); } });
  }
})();
