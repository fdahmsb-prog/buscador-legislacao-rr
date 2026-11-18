/* ===================================================================
   Módulo 7 – Imprimir o normativo pesquisado (ou salvar em PDF)
   Botão "🖨️ Imprimir" na ficha; opções do que incluir; layout A4 próprio.
   =================================================================== */
(function(){
const $ = s => document.querySelector(s);
const esc = s => (s==null?"":String(s)).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const hoje = () => new Date().toLocaleString("pt-BR",{dateStyle:"short",timeStyle:"short"});

/* ---------- estilos: tela (diálogo) e impressão ---------- */
const css = `
#prtModal{position:fixed;inset:0;background:rgba(10,14,22,.55);display:flex;align-items:center;justify-content:center;z-index:9999;padding:16px}
#prtModal[hidden]{display:none}
#prtModal .box{background:var(--panel);color:var(--ink);border:1px solid var(--line);border-radius:12px;max-width:460px;width:100%;padding:18px 20px;box-shadow:0 18px 50px rgba(0,0,0,.3)}
#prtModal h3{margin:0 0 4px;font-size:17px}
#prtModal .sub{color:var(--ink3);font-size:12.5px;margin:0 0 12px}
#prtModal label{display:flex;gap:9px;align-items:flex-start;padding:6px 0;font-size:14px;cursor:pointer}
#prtModal label input{margin-top:3px}
#prtModal label small{display:block;color:var(--ink3);font-size:12px}
#prtModal label.off{opacity:.45;cursor:not-allowed}
#prtModal .acts{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end;margin-top:14px}
#prtDoc{display:none}
@media print{
  @page{size:A4;margin:12mm}
  body > *:not(#prtDoc){display:none !important}
  html,body{background:#fff !important}
  #prtDoc{display:block !important}
  #prtDoc.pdfprint img:last-child{page-break-after:auto;break-after:auto}
}
#prtDoc, .prt{font-family:Georgia,"Times New Roman",serif;color:#111;font-size:11.5pt;line-height:1.45}
.prt .top{display:flex;justify-content:space-between;gap:12px;border-bottom:2px solid #1b2333;padding-bottom:6px;margin-bottom:12px;font-family:Arial,Helvetica,sans-serif;font-size:8.5pt;color:#444}
.prt .kick{font-family:Arial,Helvetica,sans-serif;font-size:9pt;text-transform:uppercase;letter-spacing:.06em;color:#7a5a12;margin:0 0 3px}
.prt h1{font-size:17pt;margin:0 0 6px;line-height:1.2}
.prt .em{font-style:italic;margin:0 0 10px;color:#222}
.prt table.ft{border-collapse:collapse;width:100%;margin:6px 0 10px;font-family:Arial,Helvetica,sans-serif;font-size:9.5pt}
.prt table.ft td{border:1px solid #bbb;padding:4px 7px;vertical-align:top}
.prt table.ft td:first-child{width:28%;background:#f3f1ec;font-weight:bold}
.prt h2{font-family:Arial,Helvetica,sans-serif;font-size:10.5pt;text-transform:uppercase;letter-spacing:.05em;border-bottom:1px solid #999;padding-bottom:2px;margin:16px 0 7px;color:#1b2333;break-after:avoid}
.prt ul{margin:0;padding-left:18px}
.prt li{margin:0 0 4px}
.prt .dp{display:flex;gap:10px;padding:4px 0;border-bottom:1px dotted #ccc;break-inside:avoid}
.prt .dp b{flex:none;width:30mm;font-family:Arial,Helvetica,sans-serif;font-size:9.5pt;color:#7a5a12}
.prt .ia{white-space:pre-wrap}
.prt .txt{white-space:pre-wrap;font-size:10pt;line-height:1.4}
.prt a{color:#111;word-break:break-all}
.prt .foot{margin-top:18px;border-top:1px solid #999;padding-top:6px;font-family:Arial,Helvetica,sans-serif;font-size:8pt;color:#555}
`;
document.head.insertAdjacentHTML("beforeend",`<style id="prtCss">${css}</style>`);
document.body.insertAdjacentHTML("beforeend",`<div id="prtDoc"></div>
<div id="prtModal" hidden role="dialog" aria-modal="true" aria-labelledby="prtTit"><div class="box">
  <h3 id="prtTit">🖨️ Imprimir normativo</h3>
  <p class="sub" id="prtSub"></p>
  <div id="prtOpts"></div>
  <div class="acts">
    <button class="btn" id="prtCancel">Cancelar</button>
    <button class="btn" id="prtTab" title="Baixa a versão de impressão (abre em qualquer navegador)">⬇ Baixar (.html)</button>
    <button class="btn primary" id="prtGo">Imprimir / Salvar PDF</button>
  </div>
</div></div>`);

let atual=null;

function textoPdf(n){ return n._user ? (n._texto||"") : ((n._aj&&n._aj.texto)||""); }
function fontePdf(n){ return n._user ? n._fonte : (n._aj&&n._aj.fonte); }
function nomePdf(n){ return n._user ? n._pdfNome : (n._aj&&n._aj.pdfNome); }
function dispCurados(n){ return n.dispositivos.filter(d=>!String(d[0]).startsWith("PDF ·")); }
function filtroDisp(){ const f=$("#dispFilter"); return f?f.value.trim():""; }
function textoIA(){
  const o=$("#aiOut"); if(!o) return "";
  if(!o.querySelector("h2,h3,h4,ul,ol,p,strong") && /^Gere um resumo aprofundado/.test(o.textContent.trim())) return "";
  if(o.querySelector(".spin,.loading")) return "";
  return o.innerHTML.trim();
}

function abrir(n){
  atual=n;
  const ia=textoIA(), tx=textoPdf(n), flt=filtroDisp(), nPdf=n.dispositivos.length-dispCurados(n).length;
  $("#prtSub").textContent = n.titulo;
  const op=(id,lbl,sub,on,dis)=>`<label class="${dis?"off":""}"><input type="checkbox" id="${id}" ${on&&!dis?"checked":""} ${dis?"disabled":""}><span>${lbl}${sub?`<small>${sub}</small>`:""}</span></label>`;
  $("#prtOpts").innerHTML =
    op("po_res","Resumo","",true) +
    op("po_dis","Dispositivos principais",
       flt?`Só os que correspondem ao filtro “${esc(flt)}”`:`${dispCurados(n).length} dispositivo(s) da ficha`+(nPdf?` + ${nPdf} trecho(s) extraído(s) do PDF`:""),true) +
    op("po_ia","Análise com IA exibida na ficha", ia?"":"Gere uma análise na ficha para poder incluí-la", !!ia, !ia) +
    op("po_tx","Texto extraído do PDF anexado", tx?`${tx.length.toLocaleString("pt-BR")} caracteres — pode gerar muitas páginas`:"Nenhum PDF com texto anexado a esta norma", false, !tx) +
    op("po_tem","Temas e normas relacionadas","",true);
  $("#prtModal").hidden=false; $("#prtGo").focus();
}
function fechar(){ $("#prtModal").hidden=true; }

function montar(n){
  const ck=id=>{ const e=$("#"+id); return e && e.checked && !e.disabled; };
  const flt=filtroDisp(), ff=flt?norm(flt):"";
  let disp=n.dispositivos; if(ff) disp=disp.filter(d=>norm(d[0]+" "+d[1]).includes(ff));
  const fonte=fontePdf(n), pnome=nomePdf(n), tx=textoPdf(n);
  const rel=(n.rel||[]).filter(x=>BYID[x]).map(x=>BYID[x]);
  let cit=""; try{ cit=citacao(n); }catch(e){}
  return `<div class="prt">
  <div class="top"><span>Buscador de Legislação Tributária · SEFAZ-RR</span><span>Impresso em ${esc(hoje())}</span></div>
  <p class="kick">${esc(n.tipo)} · ${esc(n.esfera==="CONFAZ"?"CONFAZ (nacional)":n.esfera)}${n._user?" · cadastrada pela equipe":""}</p>
  <h1>${esc(n.titulo)}</h1>
  ${n.ementa?`<p class="em">${esc(n.ementa)}</p>`:""}
  <table class="ft">
    <tr><td>Número / ano</td><td>${esc(n.sigla||n.tipo)} nº ${esc(n.numero)}${n.ano?"/"+esc(n.ano):""}</td></tr>
    ${n.data?`<tr><td>Data</td><td>${esc(n.data)}</td></tr>`:""}
    <tr><td>Situação</td><td>${esc(n.situacao)}</td></tr>
    <tr><td>Texto oficial</td><td><a href="${esc(n.link)}">${esc(n.link)}</a></td></tr>
    ${fonte?`<tr><td>PDF obtido em</td><td><a href="${esc(fonte)}">${esc(fonte)}</a>${pnome?`<br>Arquivo: ${esc(pnome)}`:""}</td></tr>`:""}
    ${cit?`<tr><td>Citação</td><td>${esc(cit)}</td></tr>`:""}
  </table>
  ${ck("po_res")&&n.resumo&&n.resumo.length?`<h2>Resumo</h2><ul>${n.resumo.map(p=>`<li>${esc(p)}</li>`).join("")}</ul>`:""}
  ${ck("po_dis")&&disp.length?`<h2>Dispositivos principais${ff?` — filtro: “${esc(flt)}”`:""}</h2>${disp.map(d=>`<div class="dp"><b>${esc(d[0])}</b><span>${esc(d[1])}</span></div>`).join("")}`:""}
  ${ck("po_ia")?`<h2>Análise com IA</h2><div class="ia-html">${textoIA()}</div><p class="foot" style="margin-top:6px;border:0">Conteúdo gerado por IA — confira no texto oficial.</p>`:""}
  ${ck("po_tem")&&(n.temas.length||rel.length)?`<h2>Temas e normas relacionadas</h2>${n.temas.length?`<p><b>Temas:</b> ${n.temas.map(esc).join(" · ")}</p>`:""}${rel.length?`<p><b>Relacionadas:</b> ${rel.map(r=>esc(r.titulo)).join("; ")}</p>`:""}`:""}
  ${ck("po_tx")&&tx?`<h2>Texto extraído do PDF${pnome?` (${esc(pnome)})`:""}</h2><div class="txt">${esc(tx)}</div>`:""}
  <div class="foot">Os resumos e a lista de dispositivos são interpretativos e não substituem o texto oficial. Confira sempre o texto consolidado vigente.</div>
</div>`;
}

function imprimir(){
  if(!atual) return;
  $("#prtDoc").innerHTML=montar(atual);
  fechar();
  const t0=document.title; document.title=(atual.titulo||"normativo").replace(/[\\/:*?"<>|]+/g," ").slice(0,90);
  setTimeout(()=>{
    try{ window.print(); }catch(e){ novaAba(); }
    setTimeout(()=>{ document.title=t0; },800);
  },60);
}
function novaAba(){
  if(!atual) return;
  const html=`<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><title>${esc(atual.titulo)}</title>
<style>${css.replace(/#prtModal[\s\S]*?#prtDoc\{display:none\}/,"").replace(/@media print\{[\s\S]*?\n\}/,"@media print{@page{size:A4;margin:16mm 15mm 18mm}.noprint{display:none}}")}
body{max-width:190mm;margin:14px auto;padding:0 12px}</style></head><body>
<div class="noprint" style="font-family:Arial;margin:0 0 12px;text-align:right"><button onclick="print()" style="padding:8px 14px;font-size:14px;cursor:pointer">🖨️ Imprimir / Salvar PDF</button></div>
${montar(atual)}</body></html>`;
  const url=URL.createObjectURL(new Blob([html],{type:"text/html"}));
  const a=document.createElement("a"); a.href=url; a.download=(atual.titulo||"normativo").replace(/[\\/:*?"<>|]+/g," ").slice(0,80)+".html"; document.body.appendChild(a); a.click(); a.remove();
  try{ toast("Arquivo baixado: abra-o e use o botão Imprimir"); }catch(e){}
  setTimeout(()=>URL.revokeObjectURL(url),60000);
  fechar();
}

$("#prtCancel").onclick=fechar;
$("#prtGo").onclick=imprimir;
$("#prtTab").onclick=novaAba;
$("#prtModal").addEventListener("click",e=>{ if(e.target.id==="prtModal") fechar(); });
document.addEventListener("keydown",e=>{
  if(e.key==="Escape" && !$("#prtModal").hidden) fechar();
  if((e.ctrlKey||e.metaKey) && e.key.toLowerCase()==="p" && state.sel && BYID[state.sel] && $("#prtModal").hidden){ e.preventDefault(); abrir(BYID[state.sel]); }
});

/* ---------- botão na ficha ---------- */
const _sel = window.select;
window.select = function(id, silent){
  _sel(id, silent);
  const n=BYID[id]; if(!n) return;
  const acts=document.querySelector("#dcard .dhead .actions");
  if(acts && !acts.querySelector("#btnPrint")){
    acts.insertAdjacentHTML("beforeend",`<button class="btn" id="btnPrint" title="Imprimir ou salvar em PDF (Ctrl+P)">🖨️ Imprimir</button>`);
    acts.querySelector("#btnPrint").onclick=()=>abrir(n);
  }
};
if(state.sel && BYID[state.sel]) window.select(state.sel,true);
window.__imprimirNorma = id => BYID[id] && abrir(BYID[id]);
})();
