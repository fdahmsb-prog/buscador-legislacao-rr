/* ===================================================================
   Módulo 6 – Ajustes da equipe nas normas da base: anexar PDF e alterar o link
   Armazena em db: ajustes_normas/{idDaNorma}
   =================================================================== */
(function(){
const $ = s => document.querySelector(s);
const esc = s => (s||"").toString().replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const fd = iso => { if(!iso) return ""; const [y,m,d]=iso.slice(0,10).split("-"); return `${d}/${m}/${y}`; };
const COL="ajustes_normas";
let db=null, user=null, assets=null, canWrite=null, AJ={}, alvo=null, pend=null;

/* guarda o estado original das normas da base */
NORMAS.forEach(n=>{ if(!n._user){ n._linkOrig=n.link; n._dispOrig=n.dispositivos.slice(); } });

function aplicar(){
  NORMAS.forEach(n=>{
    if(n._user || n._linkOrig===undefined) return;
    const a=AJ[n.id];
    n.link = (a && a.link) || n._linkOrig;
    n._aj = a || null;
    n.dispositivos = n._dispOrig.slice();
    if(a && a.texto && window.__pdfTools) n.dispositivos = n.dispositivos.concat(window.__pdfTools.fatiarArtigos(a.texto));
    n._idx.disp = n.dispositivos.map(d=>norm(d[0]+" "+d[1]));
  });
  try{ run(); }catch(e){}
  if(state.sel && BYID[state.sel] && !BYID[state.sel]._user) select(state.sel,true);
}

/* --------- Ficha: caixa do PDF/link e botões --------- */
const _sel = window.select;
window.select = function(id, silent){
  _sel(id, silent);
  const n=BYID[id]; if(!n || n._user) return;
  const head=document.querySelector("#dcard .dhead"); if(!head) return;
  const a=n._aj;
  if(a){
    const pdfUrl=a.pdfId?"/_blob/"+a.pdfId:"";
    head.insertAdjacentHTML("beforeend",`<div class="pdfbox">
      ${a.link?`<div><b>Link do texto oficial alterado pela equipe</b>${a.atualizadoEm?` em ${fd(a.atualizadoEm)}`:""}${a.autorNome?` por ${esc(a.autorNome)}`:""}. <span class="note">Original: <a href="${esc(n._linkOrig)}" target="_blank" rel="noopener">${esc(n._linkOrig.replace(/^https?:\/\//,"").slice(0,60))}</a></span></div>`:""}
      ${a.fonte?`<div><b>PDF obtido em:</b> <a href="${esc(a.fonte)}" target="_blank" rel="noopener">${esc(a.fonte.length>80?a.fonte.slice(0,80)+"…":a.fonte)} ↗</a></div>`:""}
      ${pdfUrl?`<div><b>Cópia arquivada:</b> <a href="${pdfUrl}" target="_blank" rel="noopener">📄 ${esc(a.pdfNome||"documento.pdf")}</a>${a.pdfPaginas?` · ${a.pdfPaginas} pág.`:""}</div>`:""}
      ${a.texto?`<div class="note" style="margin:2px 0 0">Texto do PDF indexado: a busca “Por trecho” encontra artigos e cláusulas dele.</div>`:""}
    </div>`);
  }
  const act=head.querySelector(".actions");
  if(act && db && canWrite!==false){
    act.insertAdjacentHTML("beforeend",`<button class="btn" id="ajPdf" title="Anexar o PDF do normativo e registrar de onde foi obtido">📄 ${a&&a.pdfNome?"Trocar PDF":"Anexar PDF"}</button><button class="btn" id="ajLink" title="Alterar o link do texto oficial desta norma">🔗 Alterar link</button>`);
    $("#ajPdf").onclick=()=>abrir(id,"pdf"); $("#ajLink").onclick=()=>abrir(id,"link");
  }
};

/* --------- Janela de edição --------- */
function montar(){
  document.body.insertAdjacentHTML("beforeend",`<div class="mback" id="ajback" hidden><div class="modal card" role="dialog" aria-modal="true" style="max-width:640px">
   <div class="mhead"><h2 id="ajttl">Atualizar consulta</h2><button class="mx" id="ajx" aria-label="Fechar">×</button></div>
   <div class="mbody">
    <p class="note" id="ajnome" style="margin-top:0"></p>
    <div class="frm">
     <label class="full">Link do texto oficial (botão “Texto oficial”)<input id="aj_link" placeholder="https://…"></label>
     <div class="full pdfimp" style="margin:4px 0 0">
      <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
       <label class="btn" style="cursor:pointer">📄 Selecionar PDF<input type="file" id="aj_pdf" accept="application/pdf,.pdf" hidden></label>
       <span id="ajpst" class="note" style="margin:0">Opcional: anexe o PDF do normativo (até 20 MB).</span>
      </div>
      <label style="display:block;margin-top:8px;font-size:12px;color:var(--ink2)">Link de onde o PDF foi obtido <span id="ajreq" style="color:var(--bad)" hidden>(obrigatório para PDF)</span>
       <input id="aj_src" placeholder="https://…" style="width:100%;box-sizing:border-box;border:1px solid var(--line2);border-radius:7px;padding:7px 9px;font:inherit;font-size:13.5px;background:var(--bg);color:var(--ink);margin-top:3px"></label>
      <label class="fopt" style="margin-top:6px"><input type="checkbox" id="aj_uselink"> Usar também como link do texto oficial</label>
     </div>
    </div>
    <div class="mstatus" id="ajst"></div>
   </div>
   <div class="mfoot"><button class="btn" id="ajrest" style="color:var(--bad)">Restaurar original</button><span style="flex:1"></span><button class="btn" id="ajcancel">Cancelar</button><button class="btn primary" id="ajsave">Salvar</button></div>
  </div></div>`);
  const fechar=()=>{ $("#ajback").hidden=true; alvo=null; pend=null; };
  $("#ajx").onclick=fechar; $("#ajcancel").onclick=fechar;
  $("#ajback").addEventListener("click",e=>{ if(e.target.id==="ajback") fechar(); });
  document.addEventListener("keydown",e=>{ if(e.key==="Escape" && !$("#ajback").hidden) fechar(); });
  $("#aj_pdf").onchange=async e=>{
    const file=e.target.files&&e.target.files[0]; if(!file) return; const st=$("#ajpst");
    if(!/pdf$/i.test(file.type)&&!/\.pdf$/i.test(file.name)){ st.innerHTML=`<span class="bad">Selecione um arquivo PDF.</span>`; return; }
    $("#ajreq").hidden=false; st.innerHTML=`<span class="spin"></span> Lendo ${esc(file.name)}…`;
    try{ const r=await window.__pdfTools.extrairTexto(file,(i,n)=>{ st.innerHTML=`<span class="spin"></span> Lendo página ${i} de ${n}…`; });
      pend={file,texto:r.texto,paginas:r.paginas};
      st.innerHTML = r.texto.length<200 ? `<span class="bad">PDF lido (${r.paginas} pág.), mas sem texto (digitalizado). O arquivo e o link serão guardados, sem indexação.</span>` : `<span class="ok">✔ ${esc(file.name)}</span> · ${r.paginas} pág. · ${r.texto.length.toLocaleString("pt-BR")} caracteres`;
      if(!$("#aj_src").value) $("#aj_src").focus();
    }catch(err){ pend={file,texto:"",paginas:""}; st.innerHTML=`<span class="bad">Não foi possível ler o texto (${esc(err&&err.message||"erro")}). O arquivo ainda pode ser anexado.</span>`; }
  };
  $("#ajsave").onclick=salvar;
  $("#ajrest").onclick=async()=>{ if(!alvo||!AJ[alvo]){ fechar(); return; } try{ await db.collection(COL).doc(alvo).delete(); toast("Link original restaurado"); fechar(); }catch(e){ $("#ajst").innerHTML=`<span class="bad">Não foi possível restaurar.</span>`; } };
}
function abrir(id, foco){
  const n=BYID[id]; const a=AJ[id]||{}; alvo=id; pend=null;
  $("#ajttl").textContent = foco==="pdf" ? "Anexar PDF do normativo" : "Alterar link da consulta";
  $("#ajnome").innerHTML = `<b>${esc(n.titulo)}</b><br>Link original da base: <a href="${esc(n._linkOrig)}" target="_blank" rel="noopener">${esc(n._linkOrig)}</a>`;
  $("#aj_link").value = a.link || ""; $("#aj_link").placeholder = n._linkOrig;
  $("#aj_src").value = a.fonte || ""; $("#aj_pdf").value=""; $("#ajreq").hidden=true; $("#aj_uselink").checked=false;
  $("#ajpst").innerHTML = a.pdfNome ? `PDF atual: <b>${esc(a.pdfNome)}</b>. Selecione outro para substituir.` : "Opcional: anexe o PDF do normativo (até 20 MB).";
  $("#ajst").textContent=""; $("#ajrest").hidden=!AJ[id];
  $("#ajback").hidden=false; setTimeout(()=>(foco==="pdf"?$("#aj_src"):$("#aj_link")).focus(),30);
}
async function salvar(){
  const st=$("#ajst"); const n=BYID[alvo]; if(!n) return;
  let link=$("#aj_link").value.trim(); const fonte=$("#aj_src").value.trim();
  const url=/^https?:\/\//i;
  if(link && !url.test(link)){ st.innerHTML=`<span class="bad">O link do texto oficial deve começar com http:// ou https://</span>`; return; }
  if(pend && !fonte){ st.innerHTML=`<span class="bad">Informe o link de onde o PDF foi obtido.</span>`; $("#aj_src").focus(); return; }
  if(fonte && !url.test(fonte)){ st.innerHTML=`<span class="bad">O link de origem do PDF deve começar com http:// ou https://</span>`; return; }
  if($("#aj_uselink").checked && fonte) link=fonte;
  if(link===n._linkOrig) link="";
  const prev=AJ[alvo]||{};
  if(!link && !fonte && !pend && !prev.pdfId){ st.innerHTML=`<span class="bad">Nada a salvar: informe um novo link ou anexe um PDF.</span>`; return; }
  const now=new Date().toISOString().slice(0,10);
  let uid=null, nome=""; try{ uid=user?await user.id():null; if(uid){ const ps=await user.profiles([uid]); nome=(ps&&ps[uid]&&ps[uid].name)||""; } }catch(e){}
  const body=Object.assign({}, prev, {link, fonte, atualizadoEm:now, autor:uid||"", autorNome:nome});
  $("#ajsave").disabled=true;
  try{
    if(pend){
      let t=(pend.texto||"").slice(0,120000); while(t && new Blob([t]).size>170000) t=t.slice(0,Math.floor(t.length*0.9));
      Object.assign(body,{texto:t, pdfNome:pend.file.name, pdfPaginas:pend.paginas, pdfImportadoEm:now});
      if(assets){ st.innerHTML=`<span class="spin"></span> Arquivando o PDF…`;
        try{ const up=await assets.upload(pend.file,{type:"application/pdf"}); body.pdfId=up.id; }
        catch(e){ body.pdfId=prev.pdfId||""; st.innerHTML=`<span class="bad">${e&&e.code==="too_large"?"PDF maior que 20 MB: salvo apenas o link de origem.":"Não foi possível arquivar o PDF: salvo o link de origem."}</span>`; await new Promise(r=>setTimeout(r,1200)); } }
    }
    st.innerHTML=`<span class="spin"></span> Salvando…`;
    await db.collection(COL).doc(alvo).set(JSON.parse(JSON.stringify(body)));
    toast("Consulta atualizada"); $("#ajback").hidden=true; alvo=null; pend=null;
  }catch(e){
    st.innerHTML=`<span class="bad">${e&&e.code==="invalid_argument"?"Sem permissão para alterar (é preciso acesso de Colaborador ou superior).":"Não foi possível salvar ("+esc(e&&e.message||"erro")+")."}</span>`;
    if(e&&e.code==="invalid_argument") canWrite=false;
  }finally{ $("#ajsave").disabled=false; }
}

/* --------- Exportação para o app web --------- */
async function exportar(){
  const arr=Object.entries(AJ).map(([id,a])=>Object.assign({id}, a, {pdfId:undefined, texto:(a.texto||"").slice(0,60000)||undefined}));
  try{ await navigator.clipboard.writeText(JSON.stringify(arr,null,1)); toast(`${arr.length} ajuste(s) copiados — cole em data/ajustes_normas.json no GitHub`); }catch(e){ toast("Não foi possível copiar"); }
}


/* --------- Visualizador de PDF arquivado (dentro da página) ---------
   Os arquivos em /_blob/ só são servidos dentro do buscador; abrir em outra aba retorna "not found". */
let pdfObjUrl=null, pdfDoc=null, pdfZoom=1.25, pdfNome="";
function montarViewer(){
  document.body.insertAdjacentHTML("beforeend",`<div class="mback" id="pvback" hidden><div class="modal card pvmodal" role="dialog" aria-modal="true">
    <div class="mhead"><h2 id="pvttl" style="font-size:16px">PDF</h2>
      <div style="display:flex;gap:6px;align-items:center"><button class="btn" id="pvminus" title="Diminuir">−</button><span id="pvzoom" class="note" style="margin:0;min-width:42px;text-align:center">125%</span><button class="btn" id="pvplus" title="Aumentar">+</button>
      <input id="pvfind" placeholder="Localizar no PDF…" style="border:1px solid var(--line2);border-radius:7px;padding:6px 9px;font:inherit;font-size:13px;width:170px;background:var(--bg);color:var(--ink)">
      <a class="btn" id="pvdown" title="Salvar o PDF no computador">⬇ Baixar</a>
      <span style="display:inline-flex;gap:4px;align-items:center"><input id="pvrange" placeholder="págs. ex.: 1-10" title="Páginas a imprimir (vazio = todas)" style="border:1px solid var(--line2);border-radius:7px;padding:6px 8px;font:inherit;font-size:13px;width:118px;background:var(--bg);color:var(--ink)"><button class="btn" id="pvprint" title="Imprimir as páginas do PDF">🖨️ Imprimir</button></span>
      <a class="btn" id="pvsrc" target="_blank" rel="noopener" title="Abrir o PDF no site de onde foi obtido" hidden>Site de origem ↗</a>
      <button class="mx" id="pvx" aria-label="Fechar">×</button></div></div>
    <div id="pvst" class="note" style="margin:6px 16px"></div>
    <div id="pvpages" class="pvpages"></div></div></div>`);
  const fechar=()=>{ $("#pvback").hidden=true; $("#pvpages").innerHTML=""; if(pdfObjUrl){ URL.revokeObjectURL(pdfObjUrl); pdfObjUrl=null; } pdfDoc=null; };
  $("#pvx").onclick=fechar; $("#pvback").addEventListener("click",e=>{ if(e.target.id==="pvback") fechar(); });
  document.addEventListener("keydown",e=>{ if(e.key==="Escape" && !$("#pvback").hidden) fechar(); });
  $("#pvplus").onclick=()=>{ pdfZoom=Math.min(3,pdfZoom+0.25); renderPdf(); };
  $("#pvminus").onclick=()=>{ pdfZoom=Math.max(0.5,pdfZoom-0.25); renderPdf(); };
  $("#pvprint").onclick=imprimirPdf;
  $("#pvdown").onclick=e=>{ if(!pdfObjUrl){ e.preventDefault(); toast("Aguarde o PDF carregar"); } };
  let t; $("#pvfind").oninput=e=>{ clearTimeout(t); t=setTimeout(()=>localizar(e.target.value),300); };
}
async function verPdf(id, nome){
  if(!$("#pvback")) montarViewer();
  pdfNome=nome||"documento.pdf"; $("#pvrange").value=""; $("#pvttl").textContent="📄 "+pdfNome; $("#pvback").hidden=false; $("#pvpages").innerHTML=""; $("#pvfind").value="";
  const st=$("#pvst"); st.innerHTML=`<span class="spin"></span> Carregando o PDF…`;
  try{
    const r=await fetch(window.__blobUrl ? window.__blobUrl(id) : "/_blob/"+id); if(!r.ok) throw new Error(r.status===404?"arquivo não encontrado":"HTTP "+r.status);
    const blob=await r.blob(); if(pdfObjUrl) URL.revokeObjectURL(pdfObjUrl); pdfObjUrl=URL.createObjectURL(new Blob([blob],{type:"application/pdf"}));
    const dn=$("#pvdown"); dn.href=pdfObjUrl; dn.setAttribute("download", /\.pdf$/i.test(pdfNome)?pdfNome:pdfNome+".pdf");
    const nn=NORMAS.find(x=>(x._aj&&x._aj.pdfId===id)||x._pdfId===id); const src=nn?(nn._user?nn._fonte:(nn._aj&&nn._aj.fonte)):"";
    const sa=$("#pvsrc"); sa.hidden=!src; if(src) sa.href=src;
    if(!window.pdfjsLib){ await new Promise((ok,err)=>{ const s=document.createElement("script"); s.src="lib/pdf.min.js"; s.onload=ok; s.onerror=()=>err(new Error("leitor de PDF não carregou")); document.head.appendChild(s); }); window.pdfjsLib.GlobalWorkerOptions.workerSrc="lib/pdf.worker.min.js"; }
    pdfDoc=await window.pdfjsLib.getDocument({data:await blob.arrayBuffer()}).promise;
    renderPdf();
  }catch(e){ st.innerHTML=`<span class="bad">Não foi possível abrir o PDF (${esc(e.message||"erro")}).</span>`; }
}
async function renderPdf(){
  if(!pdfDoc) return; const box=$("#pvpages"), st=$("#pvst"); box.innerHTML=""; $("#pvzoom").textContent=Math.round(pdfZoom*100)+"%";
  st.textContent=`${pdfDoc.numPages} página(s)`;
  const io=new IntersectionObserver(ents=>ents.forEach(async en=>{ if(!en.isIntersecting) return; const c=en.target; io.unobserve(c);
    const pg=await pdfDoc.getPage(+c.dataset.p); const vp=pg.getViewport({scale:pdfZoom*(window.devicePixelRatio||1)});
    c.width=vp.width; c.height=vp.height; c.style.width=(vp.width/(window.devicePixelRatio||1))+"px";
    await pg.render({canvasContext:c.getContext("2d"),viewport:vp}).promise; }),{root:box,rootMargin:"600px"});
  for(let i=1;i<=pdfDoc.numPages;i++){ const pg=await pdfDoc.getPage(i); const vp=pg.getViewport({scale:pdfZoom});
    const w=document.createElement("div"); w.className="pvpage"; w.innerHTML=`<div class="pvnum">pág. ${i}</div>`;
    const c=document.createElement("canvas"); c.dataset.p=i; c.style.width=vp.width+"px"; c.style.height="auto"; c.width=Math.round(vp.width); c.height=Math.round(vp.height);
    w.appendChild(c); box.appendChild(w); io.observe(c); }
}
async function localizar(q){
  q=(q||"").trim().toLowerCase(); const st=$("#pvst"); if(!pdfDoc) return; if(q.length<3){ st.textContent=`${pdfDoc.numPages} página(s)`; return; }
  const achou=[]; for(let i=1;i<=pdfDoc.numPages;i++){ const tc=await (await pdfDoc.getPage(i)).getTextContent(); if(tc.items.map(x=>x.str).join(" ").toLowerCase().includes(q)) achou.push(i); }
  if(!achou.length){ st.innerHTML=`<span class="bad">“${esc(q)}” não encontrado.</span>`; return; }
  st.innerHTML=`“${esc(q)}” nas páginas: `+achou.slice(0,40).map(p=>`<button class="linkish" data-pg="${p}">${p}</button>`).join(" ");
  st.querySelectorAll("[data-pg]").forEach(b=>b.onclick=()=>{ const el=$("#pvpages").children[+b.dataset.pg-1]; if(el) el.scrollIntoView({behavior:"smooth"}); });
  const el=$("#pvpages").children[achou[0]-1]; if(el) el.scrollIntoView({behavior:"smooth"});
}
function faixa(txt,max){
  txt=(txt||"").replace(/\s/g,""); if(!txt) return Array.from({length:max},(_,i)=>i+1);
  const set=new Set(); txt.split(/[,;]/).forEach(p=>{ const m=p.match(/^(\d+)(?:-(\d+))?$/); if(!m) return; let a=+m[1], b=m[2]?+m[2]:a; if(a>b)[a,b]=[b,a]; for(let i=Math.max(1,a);i<=Math.min(max,b);i++) set.add(i); });
  return [...set].sort((a,b)=>a-b);
}
async function imprimirPdf(){
  if(!pdfDoc){ toast("Aguarde o PDF carregar"); return; }
  const pgs=faixa($("#pvrange").value,pdfDoc.numPages), st=$("#pvst");
  if(!pgs.length){ st.innerHTML=`<span class="bad">Faixa de páginas inválida. Use, por exemplo, 1-10 ou 3,5,8-12.</span>`; return; }
  if(pgs.length>60 && !confirmar(`Imprimir ${pgs.length} páginas pode demorar alguns minutos. Continuar?`)) return;
  const doc=document.getElementById("prtDoc"); if(!doc){ toast("Recurso de impressão indisponível"); return; }
  doc.innerHTML=""; const b=$("#pvprint"); b.disabled=true;
  try{
    for(let k=0;k<pgs.length;k++){
      st.innerHTML=`<span class="spin"></span> Preparando página ${k+1} de ${pgs.length} para impressão…`;
      const pg=await pdfDoc.getPage(pgs[k]); const vp=pg.getViewport({scale:2});
      const c=document.createElement("canvas"); c.width=vp.width; c.height=vp.height;
      await pg.render({canvasContext:c.getContext("2d"),viewport:vp}).promise;
      const im=new Image(); im.src=c.toDataURL("image/jpeg",0.9); im.style.cssText="display:block;width:100%;height:auto;page-break-after:always;break-after:page";
      doc.appendChild(im);
    }
    doc.classList.add("pdfprint");
    st.textContent=`${pdfDoc.numPages} página(s) · ${pgs.length} enviada(s) para impressão`;
    const t0=document.title; document.title=pdfNome.replace(/\.pdf$/i,"");
    setTimeout(()=>{ try{ window.print(); }catch(e){ toast("O navegador bloqueou a impressão; use ⬇ Baixar e imprima o arquivo"); } setTimeout(()=>{ document.title=t0; doc.classList.remove("pdfprint"); },800); },80);
  }catch(e){ st.innerHTML=`<span class="bad">Falha ao preparar a impressão (${esc(e.message||"erro")}).</span>`; }
  finally{ b.disabled=false; }
}
function confirmar(m){ try{ return window.confirm(m); }catch(e){ return true; } }
window.__verPdf=verPdf;
/* Intercepta qualquer link para PDF arquivado e abre no visualizador */
document.addEventListener("click",e=>{
  const a=e.target.closest && e.target.closest('a[href^="/_blob/"]'); if(!a) return;
  e.preventDefault(); const id=a.getAttribute("href").split("/").pop();
  verPdf(id, (a.textContent||"").replace("📄","").trim());
},true);

/* --------- Conexão --------- */
async function init(){
  montar();
  if(!(window.claude && claude.use) || (window.APP_STANDALONE && !window.APP_BACKEND)){
    try{ const r=await fetch("data/ajustes_normas.json",{cache:"no-cache"}); const arr=await r.json(); (Array.isArray(arr)?arr:[]).forEach(a=>{ if(a&&a.id) AJ[a.id]=a; }); aplicar(); }catch(e){}
    return;
  }
  try{ user=await claude.use("user"); }catch(e){}
  try{ db=await claude.use("db"); }catch(e){}
  try{ assets=await claude.use("assets"); }catch(e){}
  if(user){ try{ canWrite=await user.can("data.write"); }catch(e){} }
  if(!db) return;
  db.collection(COL).onSnapshot(snap=>{ const nd={}; snap.docs.forEach(d=>{ if(d.exists) nd[d.id]=d.data(); }); AJ=nd; aplicar(); }, ()=>{});
  try{ if(user && await user.isOwner()){ const f=$("#filters"); if(f) f.insertAdjacentHTML("beforeend",`<div style="margin-top:6px"><button class="linkbtn" id="expAj">Exportar links e PDFs alterados para o app web</button></div>`); $("#expAj").onclick=exportar; } }catch(e){}
  if(state.sel && BYID[state.sel]) select(state.sel,true);
}
init();
})();
