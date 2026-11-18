/* ===================================================================
   Módulo 5 – Consultas oficiais no CONFAZ (convênios, protocolos, ajustes, atos)
   Padrões de URL observados no site oficial:
     convênios  /legislacao/convenios/AAAA/CVnnn_aa     (ex.: CV142_18, CV058_96)
     protocolos /legislacao/protocolos/AAAA/ptnnn_aa    (ex.: pt015_23)
     ajustes    /legislacao/ajustes/AAAA/AJnnn_aa       (ex.: AJ005_24)
     despachos  /legislacao/despacho/AAAA/dpnnn_aa      (ex.: dp034_23)
     at. decl.  /legislacao/atos-declaratorios/AAAA/adnnn_aa
     atos COTEPE (lista do ano) /legislacao/atos/AAAA/atocotepe_AAAA
   =================================================================== */
(function(){
const $ = s => document.querySelector(s);
const esc = s => (s||"").toString().replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const C = "https://www.confaz.fazenda.gov.br/legislacao";
const G = q => "https://www.google.com/search?q=" + encodeURIComponent(q);
const pad3 = n => String(+n).padStart(3,"0");
/* Pastas de ano com nome diferente no site do CONFAZ (confirmadas pelo usuário) */
const PASTA = { protocolos: { "2017": "2017-1" } };
const pasta = (sec, a) => (PASTA[sec] && PASTA[sec][String(a)]) || String(a);
const yy = a => String(a).slice(-2);

const TIPOS = {
  convenio:  {nome:"Convênio ICMS",  url:(n,a)=>`${C}/convenios/${a}/CV${pad3(n)}_${yy(a)}`, ano:a=>`${C}/convenios/${a}`, sigla:"CV"},
  protocolo: {nome:"Protocolo ICMS", url:(n,a)=>`${C}/protocolos/${pasta("protocolos",a)}/pt${pad3(n)}_${yy(a)}`, ano:a=>`${C}/protocolos/${pasta("protocolos",a)}/protocoloicms_${a}`},
  ajuste:    {nome:"Ajuste SINIEF",  url:(n,a)=>`${C}/ajustes/${a}/AJ${pad3(n)}_${yy(a)}`, ano:a=>`${C}/ajustes/${a}`},
  cotepe:    {nome:"Ato COTEPE/ICMS",url:null, ano:a=>`${C}/atos/${a}/atocotepe_${a}`},
  despacho:  {nome:"Despacho CONFAZ",url:(n,a)=>`${C}/despacho/${a}/dp${pad3(n)}_${yy(a)}`, ano:null},
  declarat:  {nome:"Ato Declaratório CONFAZ", url:(n,a)=>`${C}/atos-declaratorios/${a}/ad${pad3(n)}_${yy(a)}`, ano:null}
};
window.confazLink = (tipo,n,a) => (TIPOS[tipo]&&TIPOS[tipo].url&&n&&a) ? TIPOS[tipo].url(n,a) : null;

/* --------- Identifica convênio/protocolo/ajuste/ato no texto digitado --------- */
function detect(raw){
  const s = norm(raw||"");
  let tipo=null;
  if(/\bcotepe\b/.test(s)) tipo="cotepe";
  else if(/\bato\s+declarat/.test(s)) tipo="declarat";
  else if(/\bdespacho\b/.test(s)) tipo="despacho";
  else if(/\b(ajuste|aj)\b/.test(s) || /\bsinief\b/.test(s)) tipo="ajuste";
  else if(/\b(protocolo|prot|pt)\b/.test(s)) tipo="protocolo";
  else if(/\b(convenio|conv|cv)\b/.test(s)) tipo="convenio";
  if(!tipo) return null;
  const m = s.match(/(\d{1,4})\s*\/\s*(\d{2,4})/) || s.match(/n[º°o.]?\s*(\d{1,4})\D+(?:de\s+)?(\d{4})/) || s.match(/\b(\d{1,4})\s+(?:de\s+)?(19\d{2}|20\d{2})\b/);
  if(!m){ const y=s.match(/\b(19\d{2}|20\d{2})\b/); return {tipo, n:null, a:y?+y[1]:null}; }
  let a=+m[2]; if(a<100) a = a>30 ? 1900+a : 2000+a;
  return {tipo, n:+m[1], a};
}
function linksFor(d){
  const T=TIPOS[d.tipo], nomeNum = d.n? `${T.nome} ${d.n}/${yy(d.a)}` : T.nome;
  const L=[];
  if(T.url && d.n) L.push({k:"main", t:`Texto oficial no CONFAZ – ${nomeNum}`, u:T.url(d.n,d.a)});
  if(T.ano && d.a) L.push({t:`Lista oficial de ${T.nome.replace(" ICMS","s ICMS").replace("Ajuste SINIEF","Ajustes SINIEF").replace("Ato COTEPE/ICMS","Atos COTEPE/ICMS")} de ${d.a}`, u:T.ano(d.a)});
  if(d.n){
    L.push({t:"Alterações, prorrogações e revogações (no CONFAZ)", u:G(`site:confaz.fazenda.gov.br "${T.nome.replace(" CONFAZ","")} nº ${d.n}" ${d.a?`"${d.a}"`:""} altera OR prorroga OR revoga`)});
    L.push({t:"Ratificação / publicação (despachos e atos declaratórios)", u:G(`site:confaz.fazenda.gov.br "${T.nome.replace(" CONFAZ","")}" "${d.n}/${yy(d.a)}" despacho OR "ato declaratório"`)});
    L.push({t:"Internalização em Roraima (SEFAZ-RR / DOE-RR)", u:G(`(site:sefaz.rr.gov.br OR site:imprensaoficial.rr.gov.br) "${T.nome.replace(" CONFAZ","")}" ${d.n}/${yy(d.a)} OR "${d.n}/${d.a}"`)});
    L.push({t:"Busca geral no site do CONFAZ", u:G(`site:confaz.fazenda.gov.br "${T.nome.replace(" CONFAZ","")}" ${d.n}/${yy(d.a)}`)});
  } else {
    L.push({t:`Pesquisar no site do CONFAZ`, u:G(`site:confaz.fazenda.gov.br ${T.nome}`)});
  }
  return L;
}
function cardHtml(d, inBase){
  const L=linksFor(d), T=TIPOS[d.tipo];
  const main=L.find(x=>x.k==="main");
  return `<div class="card cfz">
    <div class="cfzh"><span class="cfzlogo">CONFAZ</span><div><b>Consulta oficial – ${esc(T.nome)}${d.n?` nº ${d.n}/${d.a}`:""}</b><div class="note" style="margin:2px 0 0">${inBase?"Esta norma também está na base do buscador (abaixo). ":""}Links do site oficial do Conselho Nacional de Política Fazendária.</div></div></div>
    ${main?`<a class="btn primary" style="margin:8px 0 6px" href="${esc(main.u)}" target="_blank" rel="noopener">Abrir o texto oficial no CONFAZ ↗</a>`:""}
    <div class="cfzl">${L.filter(x=>x!==main).map(x=>`<a href="${esc(x.u)}" target="_blank" rel="noopener">${esc(x.t)} ↗</a>`).join("")}</div>
    ${d.tipo==="cotepe"?`<p class="note">Atos COTEPE (PMPF, MVA, credenciamentos) têm endereço próprio por ato: abra a lista do ano e localize o número.</p>`:""}
    ${d.n?`<p class="note" style="margin-bottom:0">Endereço gerado pelo padrão oficial do CONFAZ (${esc(main?main.u.replace(C,""):"")}). Alguns atos de 2020 usam endereço diferente; se a página não abrir, use a lista do ano.</p>`:""}
  </div>`;
}

/* --------- Corrige os links dos atos CONFAZ já cadastrados na base --------- */
const FIX = {
  "conv142-2018":["convenio",142,2018],"conv52-2017":["convenio",52,2017],"conv110-2007":["convenio",110,2007],"conv199-2022":["convenio",199,2022],
  "conv15-2023":["convenio",15,2023],"conv236-2021":["convenio",236,2021],"conv93-2015":["convenio",93,2015],"conv190-2017":["convenio",190,2017],
  "conv65-1988":["convenio",65,1988],"conv52-1992":["convenio",52,1992],"conv182-2025":["convenio",182,2025],
  "prot21-2011":["protocolo",21,2011],"prot54-2017":["protocolo",54,2017],"prot11-1991":["protocolo",11,1991],
  "ajsinief07-2005":["ajuste",7,2005],"ajsinief19-2016":["ajuste",19,2016],"ajsinief02-2009":["ajuste",2,2009]
};
Object.entries(FIX).forEach(([id,[t,n,a]])=>{ const x=BYID[id]; if(x){ x.link=TIPOS[t].url(n,a); x._cfz={tipo:t,n,a}; } });
if(BYID["sinief-1970"]){ BYID["sinief-1970"].link = G('site:confaz.fazenda.gov.br "Convênio SINIEF" "15 de dezembro de 1970"'); }

/* --------- Detalhe da norma: bloco "Consulta oficial no CONFAZ" --------- */
const _sel = window.select;
window.select = function(id, silent){
  _sel(id, silent);
  const n=BYID[id]; if(!n) return;
  let d = n._cfz || (n.esfera==="CONFAZ" ? detect(`${n.tipo} ${n.numero}/${n.ano}`) : null);
  if(!d || !d.n) return;
  const sec=document.querySelector("#dcard .dsec"); if(!sec) return;
  const L=linksFor(d);
  sec.insertAdjacentHTML("beforebegin",`<div class="dsec"><h3>Consulta oficial no CONFAZ</h3><div class="cfzl">${L.map(x=>`<a href="${esc(x.u)}" target="_blank" rel="noopener">${esc(x.t)} ↗</a>`).join("")}</div></div>`);
};

/* --------- Busca: cartão de consulta oficial no topo dos resultados --------- */
const _run = window.run;
window.run = function(){
  _run();
  const raw=($("#q")&&$("#q").value)||""; const d=detect(raw); const box=$("#results");
  if(!box) return;
  const old=$("#cfzCard"); if(old) old.remove();
  if(!d) return;
  const inBase = !!(d.n && NORMAS.some(n=>n._cfz && n._cfz.tipo===d.tipo && n._cfz.n===d.n && n._cfz.a===d.a));
  box.insertAdjacentHTML("afterbegin",`<div id="cfzCard">${cardHtml(d,inBase)}</div>`);
  const em=box.querySelector(".empty"); if(em && d.n) em.querySelector("h3").textContent="Esta norma não está na base local — use a consulta oficial acima ou a IA";
};

/* --------- Ferramenta: Consulta de atos do CONFAZ --------- */
function buildTool(){
  const tools=document.querySelector("#view-ferramentas .tools"); if(!tools || $("#cfzTool")) return;
  tools.insertAdjacentHTML("afterbegin",`<div class="card tool" id="cfzTool"><h3>Consulta oficial de atos do CONFAZ</h3><p class="sub">Convênios ICMS, Protocolos ICMS, Ajustes SINIEF, Atos COTEPE, Despachos e Atos Declaratórios</p>
   <div class="frm">
    <label class="full">Tipo<select id="cz_t">${Object.entries(TIPOS).map(([k,v])=>`<option value="${k}">${v.nome}</option>`).join("")}</select></label>
    <label>Número<input id="cz_n" placeholder="142" inputmode="numeric"></label>
    <label>Ano<input id="cz_a" placeholder="2018" inputmode="numeric"></label>
   </div><div class="res2" id="cz_out">Informe o número e o ano.</div></div>`);
  const go=()=>{ const t=$("#cz_t").value; let n=parseInt($("#cz_n").value,10)||null; let a=parseInt($("#cz_a").value,10)||null; if(a&&a<100) a=a>30?1900+a:2000+a;
    const o=$("#cz_out"); if(!a){ o.textContent="Informe ao menos o ano."; return; }
    const L=linksFor({tipo:t,n,a}); o.innerHTML=`<div class="cfzl">${L.map((x,i)=>`<a ${i===0&&x.k==="main"?'class="btn primary" style="justify-content:center"':''} href="${esc(x.u)}" target="_blank" rel="noopener">${esc(x.t)} ↗</a>`).join("")}</div>`; };
  ["cz_t","cz_n","cz_a"].forEach(i=>{ $("#"+i).addEventListener("input",go); $("#"+i).addEventListener("change",go); });
}
const obs=new MutationObserver(()=>{ if(document.querySelector("#view-ferramentas .tools")) buildTool(); });
obs.observe(document.getElementById("view-ferramentas"),{childList:true,subtree:true}); buildTool();

/* --------- Fontes oficiais: seção do CONFAZ ampliada --------- */
function addFontes(){
  const box=$("#fbox"); if(!box || $("#cfzFontes")) return;
  const y=new Date().getFullYear();
  const items=[
    ["Legislação do CONFAZ (página inicial)",`${C}`],
    [`Convênios ICMS de ${y}`,`${C}/convenios/${y}`],
    [`Ajustes SINIEF de ${y}`,`${C}/ajustes/${y}`],
    [`Protocolos ICMS de ${y}`,`${C}/protocolos/${y}/protocoloicms_${y}`],
    [`Atos COTEPE/ICMS de ${y} (PMPF, MVA, credenciamentos)`,`${C}/atos/${y}/atocotepe_${y}`],
    ["Portal Nacional da Substituição Tributária (Conv. ICMS 18/17)",`${C}/substituicao-tributaria`],
    ["Registro e depósito de benefícios – Convênio ICMS 190/17",`${C}/certificado-registro-deposito-cv-icms-190-17-1`],
    ["Convênio ICMS 142/18 – normas gerais da ST (texto oficial)",`${C}/convenios/2018/CV142_18`]
  ];
  box.insertAdjacentHTML("afterbegin",`<div class="card gcard" id="cfzFontes" style="grid-column:1/-1"><h3>CONFAZ – consultas oficiais</h3>
   <div class="guide" style="grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:4px 18px">${items.map(i=>`<div class="fsrc"><div><a href="${esc(i[1])}" target="_blank" rel="noopener"><b>${esc(i[0])}</b> ↗</a><div class="furl">${esc(i[1].replace(/^https?:\/\//,""))}</div></div></div>`).join("")}</div>
   <p class="note" style="margin:8px 0 0">Para abrir um ato específico, digite-o na busca (ex.: <code>Convênio 142/18</code>, <code>Protocolo 54/17</code>, <code>Ajuste SINIEF 7/05</code>) ou use a ferramenta “Consulta oficial de atos do CONFAZ”.</p></div>`);
}
const obs2=new MutationObserver(()=>{ if($("#fbox") && !$("#cfzFontes")) addFontes(); });
const vf=document.getElementById("view-fontes"); if(vf) obs2.observe(vf,{childList:true,subtree:true}); addFontes();

/* --------- Atalho "CONFAZ – texto oficial" na faixa de fontes oficiais --------- */
const qEl=$("#q");
if(qEl) qEl.addEventListener("input",()=>setTimeout(()=>{
  const d=detect(qEl.value); const ofl=document.querySelector("#ofic .ofl"); if(!ofl) return;
  const ex=$("#cfzChip"); if(ex) ex.remove();
  if(d && d.n && TIPOS[d.tipo].url) ofl.insertAdjacentHTML("afterbegin",`<a id="cfzChip" class="ofa" style="border-color:var(--gold);background:var(--gold-bg)" href="${esc(TIPOS[d.tipo].url(d.n,d.a))}" target="_blank" rel="noopener"><span class="ofi" style="background:var(--gold)">CF</span>CONFAZ – texto oficial</a>`);
},200));

try{ run(); }catch(e){}
})();
