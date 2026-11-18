/* ===================================================================
   Módulo 3 – Datas de atualização e normas cadastradas pela equipe (db)
   Usa os globais do script principal: NORMAS, BYID, run, select, state, norm, numKey, esc, toast
   =================================================================== */
(function(){
const $ = s => document.querySelector(s);
const fd = iso => { if(!iso) return "—"; const [y,m,d]=iso.slice(0,10).split("-"); return `${d}/${m}/${y}`; };
const COL = "normas_equipe";
let db=null, user=null, canWrite=null, userDocs={}, editing=null, assets=null, pdfPend=null;
/* ---------------- Leitura de PDF (pdf.js embutido em lib/) ---------------- */
let pdfLibP=null;
function loadPdfLib(){
  if(window.pdfjsLib) return Promise.resolve(window.pdfjsLib);
  if(!pdfLibP) pdfLibP=new Promise((ok,err)=>{ const s=document.createElement("script"); s.src="lib/pdf.min.js"; s.onload=()=>{ try{ window.pdfjsLib.GlobalWorkerOptions.workerSrc="lib/pdf.worker.min.js"; }catch(e){} ok(window.pdfjsLib); }; s.onerror=()=>{ pdfLibP=null; err(new Error("leitor de PDF não carregou")); }; document.head.appendChild(s); });
  return pdfLibP;
}
async function extrairTexto(file, onProg){
  const lib=await loadPdfLib(); const buf=await file.arrayBuffer();
  const doc=await lib.getDocument({data:buf}).promise; let out=[];
  const max=Math.min(doc.numPages,150);
  for(let i=1;i<=max;i++){ const pg=await doc.getPage(i); const tc=await pg.getTextContent();
    let linha="", txt=""; let lastY=null;
    tc.items.forEach(it=>{ const y=it.transform?Math.round(it.transform[5]):0; if(lastY!==null && Math.abs(y-lastY)>2){ txt+=linha.trim()+"\n"; linha=""; } linha+=it.str+(it.hasEOL?"\n":" "); lastY=y; });
    txt+=linha.trim(); out.push(txt); if(onProg) onProg(i,max); }
  return {texto:out.join("\n").replace(/[ \t]+/g," ").replace(/\n{3,}/g,"\n\n").trim(), paginas:doc.numPages};
}
function fatiarArtigos(t){
  if(!t) return [];
  const partes=t.split(/(?=\b(?:Art\.|Artigo|Cláusula|CLÁUSULA)\s*[\dºª°A-Za-zçãéêíóú-]+)/);
  const res=[]; partes.forEach(p=>{ p=p.replace(/\s+/g," ").trim(); if(p.length<15) return;
    const m=p.match(/^((?:Art\.|Artigo|Cláusula|CLÁUSULA)\s*[^\s]+)/); res.push([ "PDF · "+(m?m[1]:"trecho"), p.length>600?p.slice(0,600)+"…":p ]); });
  return res.slice(0,250);
}

/* ---------------- Datas de atualização ---------------- */
window.__META = null;
function renderUpd(){
  const el=$("#upd"); if(!el) return;
  const M=window.__META;
  const eq=Object.values(userDocs).map(d=>d.atualizadoEm||d.criadoEm||"").sort().pop();
  el.innerHTML = `<span title="Data da última revisão da base de normas">Normas: <b>${fd(LEG_ATUALIZADO)}</b></span>`+
    `<span title="Data da última mudança nas tabelas de códigos${M&&M.fonte_commit?` · fonte: commit ${M.fonte_commit.slice(0,8)} de ${fd(M.fonte_commit_data)}`:""}">Tabelas: <b>${M?fd(M.tabelas_atualizadas_em):"…"}</b>${M&&M.verificado_em&&M.verificado_em!==M.tabelas_atualizadas_em?` <small>(verificadas em ${fd(M.verificado_em)})</small>`:""}</span>`+
    (eq?`<span title="Última inclusão ou edição feita pela equipe">Equipe: <b>${fd(eq)}</b></span>`:"");
}
fetch("data/meta.json").then(r=>r.json()).then(m=>{ window.__META=m; renderUpd(); document.dispatchEvent(new Event("meta-ok")); }).catch(()=>{});

window.__pdfTools={get extrairTexto(){return extrairTexto;},get fatiarArtigos(){return fatiarArtigos;}};
/* ---------------- Integração com a busca ---------------- */
function toNorma(id, d){
  const n = {
    id:"eq-"+id, _user:true, _docId:id, _autor:d.autor||"", _criado:d.criadoEm||"", _atual:d.atualizadoEm||"",
    tipo:d.tipo||"Norma", sigla:d.sigla||d.tipo||"", numero:d.numero||"", ano:+d.ano||0, data:d.data||"",
    esfera:d.esfera||"Roraima", situacao:d.situacao||"Vigente",
    titulo:d.titulo||`${d.tipo||""} nº ${d.numero||""}/${d.ano||""}`,
    ementa:d.ementa||"", resumo:(d.resumo||[]).filter(Boolean), dispositivos:(d.dispositivos||[]).map(x=>[x.ref||"",x.tx||""]),
    temas:(d.temas||[]).filter(Boolean), rel:(d.rel||[]).filter(x=>BYID[x]), link:d.link||"https://www.google.com/search?q="+encodeURIComponent((d.tipo||"")+" "+(d.numero||"")+" "+(d.ano||""))
  };
  if(!n.resumo.length) n.resumo=["(Sem resumo cadastrado.)"];
  n._fonte=d.fonte||""; n._pdfId=d.pdfId||""; n._pdfNome=d.pdfNome||""; n._pdfPag=d.pdfPaginas||""; n._texto=d.texto||"";
  if(d.texto) n.dispositivos=n.dispositivos.concat(fatiarArtigos(d.texto));
  n._num=numKey(n.numero);
  n._idx={titulo:norm(n.titulo+" "+n.sigla+" "+n.numero+"/"+n.ano),ementa:norm(n.ementa),resumo:norm(n.resumo.join(" ")),temas:norm(n.temas.join(" | ")+" | cadastrada pela equipe"),disp:n.dispositivos.map(x=>norm(x[0]+" "+x[1]))};
  return n;
}
function syncNormas(){
  for(let i=NORMAS.length-1;i>=0;i--) if(NORMAS[i]._user){ delete BYID[NORMAS[i].id]; NORMAS.splice(i,1); }
  Object.entries(userDocs).forEach(([id,d])=>{ const n=toNorma(id,d); NORMAS.push(n); BYID[n.id]=n; });
  const st=$("#stats"); if(st){ const c={Federal:0,CONFAZ:0,Roraima:0}; NORMAS.forEach(n=>c[n.esfera]!==undefined&&c[n.esfera]++); const dd=NORMAS.reduce((s,n)=>s+n.dispositivos.length,0); const eq=NORMAS.filter(n=>n._user).length;
    st.innerHTML=`<div><b>${NORMAS.length}</b>normas${eq?` (${eq} da equipe)`:""}</div><div><b>${dd}</b>dispositivos</div><div><b>${c.Federal}/${c.CONFAZ}/${c.Roraima}</b>Fed/CONFAZ/RR</div>`; }
  try{ run(); }catch(e){}
  if(state.sel && state.sel.startsWith("eq-") && BYID[state.sel]) select(state.sel,true);
  renderUpd();
}

/* --------- Detalhe: selo + editar/excluir para normas da equipe --------- */
const _select = window.select;
window.select = function(id, silent){
  _select(id, silent);
  const n=BYID[id]; if(!n || !n._user) return;
  const head=document.querySelector("#dcard .dhead");
  if(head){
    head.insertAdjacentHTML("afterbegin",`<div class="eqbadge">Cadastrada pela equipe · <span id="eqAutor">…</span> · ${fd(n._atual||n._criado)} · <b>não revisada pela base oficial</b></div>`);
    const act=head.querySelector(".actions");
    if(act && canWrite!==false){ act.insertAdjacentHTML("beforeend",`<button class="btn" id="eqEdit">Editar</button><button class="btn" id="eqDel" style="color:var(--bad)">Excluir</button>`);
      $("#eqEdit").onclick=()=>openForm(n._docId); $("#eqDel").onclick=()=>confirmDel(n._docId, n.titulo); }
    if(n._fonte || n._pdfId){
      const pdfUrl = n._pdfId ? "/_blob/"+n._pdfId : "";
      head.insertAdjacentHTML("beforeend",`<div class="pdfbox">${n._fonte?`<div><b>PDF obtido em:</b> <a href="${esc(n._fonte)}" target="_blank" rel="noopener">${esc(n._fonte.length>80?n._fonte.slice(0,80)+"…":n._fonte)} ↗</a></div>`:""}${pdfUrl?`<div><b>Cópia arquivada:</b> <a href="${pdfUrl}" target="_blank" rel="noopener">📄 ${esc(n._pdfNome||"documento.pdf")}</a>${n._pdfPag?` · ${n._pdfPag} pág.`:""}</div>`:""}${(n.dispositivos||[]).some(x=>String(x[0]).startsWith("PDF ·"))?`<div class="note" style="margin:2px 0 0">O texto do PDF foi indexado: a busca “Por trecho” encontra artigos e cláusulas dele.</div>`:""}</div>`);
    }
    const _d=userDocs[n._docId]||{}; (_d.autorNome? Promise.resolve(_d.autorNome) : nameOf(n._autor)).then(nm=>{ const s=$("#eqAutor"); if(s) s.textContent=nm; });
  }
};
async function nameOf(id){ if(!id||!user) return "membro da equipe"; try{ const ps=await user.profiles([id]); return (ps&&ps[id]&&ps[id].name)||"membro da equipe"; }catch(e){ return "membro da equipe"; } }

/* ---------------- Formulário ---------------- */
const TIPOS=["Lei","Lei Complementar","Lei Estadual","Decreto","Decreto Estadual","Convênio ICMS","Protocolo ICMS","Ajuste SINIEF","Ato COTEPE","Instrução Normativa","Portaria","Resolução","Emenda Constitucional","Parecer / Consulta","Outro"];
function modalHtml(){ return `<div class="mback" id="mback" hidden><div class="modal card" role="dialog" aria-modal="true" aria-labelledby="mttl">
  <div class="mhead"><h2 id="mttl">Adicionar norma</h2><button class="mx" id="mclose" aria-label="Fechar">×</button></div>
  <div class="mbody">
   <div class="pdfimp">
    <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
     <label class="btn" style="cursor:pointer">📄 Importar de PDF<input type="file" id="f_pdf" accept="application/pdf,.pdf" hidden></label>
     <span id="pdfst" class="note" style="margin:0">Opcional: selecione o PDF do normativo; o texto é lido e a IA preenche a ficha.</span>
    </div>
    <label style="display:block;margin-top:8px;font-size:12px;color:var(--ink2)">Link de onde o PDF foi obtido <span id="srcReq" style="color:var(--bad)" hidden>(obrigatório para PDF)</span>
     <input id="f_src" placeholder="https://www.sefaz.rr.gov.br/… ou https://www.confaz.fazenda.gov.br/…" style="width:100%;box-sizing:border-box;border:1px solid var(--line2);border-radius:7px;padding:7px 9px;font:inherit;font-size:13.5px;background:var(--bg);color:var(--ink);margin-top:3px"></label>
   </div>
   <p class="note" style="margin-top:0">A norma fica visível para todos que acessam o buscador, marcada como “cadastrada pela equipe”. Use <b>Preencher com IA</b> para gerar um rascunho e <b>revise antes de salvar</b>.</p>
   <div class="frm">
    <label>Tipo<select id="f_tipo">${TIPOS.map(t=>`<option>${t}</option>`).join("")}</select></label>
    <label>Esfera<select id="f_esf"><option>Roraima</option><option>CONFAZ</option><option>Federal</option></select></label>
    <label>Número<input id="f_num" placeholder="ex.: 36.120-E"></label>
    <label>Ano<input id="f_ano" placeholder="2026" inputmode="numeric"></label>
    <label>Data (dd/mm/aaaa)<input id="f_data" placeholder="15/10/2026"></label>
    <label>Situação<select id="f_sit"><option>Vigente</option><option>Vigente (alterada)</option><option>Revogado</option><option>Inconstitucional</option></select></label>
    <label class="full">Título<input id="f_tit" placeholder="ex.: Decreto nº 36.120-E/2026 – Altera o RICMS-RR (ST de cosméticos)"></label>
    <label class="full">Ementa<textarea id="f_eme" rows="2"></textarea></label>
    <label class="full">Resumo (um ponto por linha)<textarea id="f_res" rows="4"></textarea></label>
    <label class="full">Dispositivos (um por linha, no formato <code>Art. 1º | texto</code>)<textarea id="f_dis" rows="4"></textarea></label>
    <label>Temas (separados por vírgula)<input id="f_tem" placeholder="ST, Cosméticos, Roraima"></label>
    <label>Link do texto oficial<input id="f_lnk" placeholder="https://…"></label>
    <label class="full">Normas relacionadas (códigos da base, separados por vírgula)<input id="f_rel" placeholder="ricms-rr, conv142-2018"></label>
   </div>
   <div class="mstatus" id="mst"></div>
  </div>
  <div class="mfoot"><button class="btn gold" id="mia">✦ Preencher com IA</button><span style="flex:1"></span><button class="btn" id="mcancel">Cancelar</button><button class="btn primary" id="msave">Salvar</button></div>
 </div></div>
 <div class="mback" id="dback" hidden><div class="modal card" style="max-width:440px"><div class="mbody"><h3 style="margin:0 0 8px;font-family:'Source Serif 4',serif">Excluir norma?</h3><p id="dtxt" style="margin:0 0 14px;font-size:14px"></p>
  <div style="display:flex;gap:8px;justify-content:flex-end"><button class="btn" id="dno">Cancelar</button><button class="btn primary" id="dyes" style="background:var(--bad);border-color:var(--bad)">Excluir</button></div></div></div></div>`; }
function setF(d){ $("#f_tipo").value=d.tipo||"Decreto Estadual"; $("#f_esf").value=d.esfera||"Roraima"; $("#f_num").value=d.numero||""; $("#f_ano").value=d.ano||""; $("#f_data").value=d.data||""; $("#f_sit").value=d.situacao||"Vigente";
  $("#f_tit").value=d.titulo||""; $("#f_eme").value=d.ementa||""; $("#f_res").value=(d.resumo||[]).join("\n"); $("#f_dis").value=(d.dispositivos||[]).map(x=>(x.ref||"")+" | "+(x.tx||"")).join("\n");
  $("#f_tem").value=(d.temas||[]).join(", "); $("#f_lnk").value=d.link||""; $("#f_rel").value=(d.rel||[]).join(", "); $("#f_src").value=d.fonte||""; }
function getF(){ const lines=s=>s.split("\n").map(x=>x.trim()).filter(Boolean);
  return { tipo:$("#f_tipo").value, sigla:$("#f_tipo").value.replace(" Estadual",""), esfera:$("#f_esf").value, numero:$("#f_num").value.trim(), ano:$("#f_ano").value.trim(), data:$("#f_data").value.trim(), situacao:$("#f_sit").value,
    titulo:$("#f_tit").value.trim(), ementa:$("#f_eme").value.trim(), resumo:lines($("#f_res").value),
    dispositivos:lines($("#f_dis").value).map(l=>{ const i=l.indexOf("|"); return i<0?{ref:"",tx:l}:{ref:l.slice(0,i).trim(),tx:l.slice(i+1).trim()}; }),
    temas:$("#f_tem").value.split(",").map(x=>x.trim()).filter(Boolean), link:$("#f_lnk").value.trim(), rel:$("#f_rel").value.split(",").map(x=>x.trim()).filter(Boolean), fonte:$("#f_src").value.trim() }; }
function openForm(docId){
  pdfPend=null; $("#f_pdf").value=""; $("#srcReq").hidden=true; $("#pdfst").textContent="Opcional: selecione o PDF do normativo; o texto é lido e a IA preenche a ficha.";
  if(docId && userDocs[docId] && userDocs[docId].pdfNome) $("#pdfst").innerHTML=`PDF já arquivado: <b>${esc(userDocs[docId].pdfNome)}</b>. Selecione outro para substituir.`;
  editing=docId||null; $("#mttl").textContent=docId?"Editar norma da equipe":"Adicionar norma"; $("#mst").textContent="";
  setF(docId? userDocs[docId] : {tipo:"Decreto Estadual",esfera:"Roraima",ano:new Date().getFullYear()});
  $("#mback").hidden=false; setTimeout(()=>$("#f_num").focus(),30);
}
function closeForm(){ $("#mback").hidden=true; editing=null; }
async function save(){
  const f=getF(), st=$("#mst");
  if(!f.numero || !f.ano || !f.ementa){ st.innerHTML=`<span class="bad">Preencha ao menos número, ano e ementa.</span>`; return; }
  if(pdfPend && !f.fonte){ st.innerHTML=`<span class="bad">Informe o link de onde o PDF foi obtido.</span>`; $("#f_src").focus(); return; }
  if(f.fonte && !/^https?:\/\//i.test(f.fonte)){ st.innerHTML=`<span class="bad">O link de origem do PDF deve começar com http:// ou https://</span>`; return; }
  if(f.link && !/^https?:\/\//i.test(f.link)){ st.innerHTML=`<span class="bad">O link deve começar com http:// ou https://</span>`; return; }
  if(!db){ st.innerHTML=`<span class="bad">Armazenamento indisponível. Entre com um e-mail autorizado (botão 👤 Entrar).</span>`; return; }
  const now=new Date().toISOString().slice(0,10);
  const uid = user ? await user.id().catch(()=>null) : null;
  const extra = {};
  if(pdfPend){
    let _t=(pdfPend.texto||"").slice(0,120000); while(_t && new Blob([_t]).size>170000) _t=_t.slice(0,Math.floor(_t.length*0.9)); extra.texto=_t; extra.pdfNome = pdfPend.file.name; extra.pdfPaginas = pdfPend.paginas; extra.pdfImportadoEm = now;
    if(!f.link && f.fonte) f.link = f.fonte;
    if(assets){ try{ st.innerHTML=`<span class="spin"></span> Arquivando o PDF…`; const up=await assets.upload(pdfPend.file,{type:"application/pdf"}); extra.pdfId=up.id; }
      catch(e){ st.innerHTML=`<span class="bad">${e&&e.code==="too_large"?"PDF maior que 20 MB: a ficha será salva sem a cópia do arquivo.":"Não foi possível arquivar o PDF; a ficha será salva com o link de origem."}</span>`; await new Promise(r=>setTimeout(r,1200)); } }
  }
  const body = Object.assign({}, editing?userDocs[editing]:{}, f, extra, editing? {criadoEm:userDocs[editing].criadoEm||now, autor:userDocs[editing].autor||uid||"", atualizadoEm:now, editadoPor:uid||""} : {criadoEm:now, atualizadoEm:now, autor:uid||""});
  $("#msave").disabled=true; st.innerHTML=`<span class="spin"></span> Salvando…`;
  try{
    const ref = editing ? db.collection(COL).doc(editing) : db.collection(COL).doc();
    await ref.set(body);
    toast(editing?"Norma atualizada":"Norma adicionada"); const id=ref.id; closeForm();
    setTimeout(()=>{ if(BYID["eq-"+id]){ location.hash="#legislacao"; select("eq-"+id); } },400);
  }catch(e){
    st.innerHTML=`<span class="bad">${e&&e.code==="invalid_argument"?"Você não tem permissão para cadastrar normas neste buscador (é preciso acesso de Colaborador ou superior).":e&&e.code==="quota_exceeded"?"Limite de armazenamento atingido.":"Não foi possível salvar ("+esc(e&&e.message||"erro")+")."}</span>`;
    if(e&&e.code==="invalid_argument"){ canWrite=false; updBtn(); }
  }finally{ $("#msave").disabled=false; }
}
function confirmDel(docId, titulo){
  $("#dtxt").textContent=`“${titulo}” será removida do buscador para todos os usuários.`; $("#dback").hidden=false;
  $("#dno").onclick=()=>{$("#dback").hidden=true;};
  $("#dyes").onclick=async()=>{ try{ await db.collection(COL).doc(docId).delete(); $("#dback").hidden=true; toast("Norma excluída"); state.sel=null;
      $("#dcard").innerHTML=`<div class="placeholder">Norma excluída.</div>`; }catch(e){ $("#dtxt").innerHTML=`<span class="bad">Não foi possível excluir.</span>`; } };
}
async function fillAI(){
  const st=$("#mst"); const f=getF();
  if(!pdfPend && !f.numero && !f.titulo){ st.innerHTML=`<span class="bad">Informe ao menos o tipo, o número e o ano, ou importe o PDF.</span>`; return; }
  const s = window.claude&&claude.use ? await claude.use("sample").catch(()=>null) : null;
  if(!s || !s.json){ st.innerHTML=`<span class="bad">Assistente de IA indisponível nesta visualização.</span>`; return; }
  st.innerHTML=`<span class="spin"></span> Gerando rascunho… confira tudo antes de salvar.`; $("#mia").disabled=true;
  try{
    const doPdf = pdfPend && pdfPend.texto && pdfPend.texto.length>=200;
    const r = await s.json(doPdf ? `Você é especialista em legislação tributária brasileira. A partir EXCLUSIVAMENTE do TEXTO DO NORMATIVO abaixo (extraído de PDF), preencha a ficha. Identifique tipo (um de: ${TIPOS.join(", ")}), número, ano, data (dd/mm/aaaa), esfera (Roraima, CONFAZ ou Federal), título no formato "<Tipo> nº <número>/<ano> – <assunto curto>", a ementa literal, 3 a 5 frases de resumo, os principais dispositivos (até 12, com "ref" como "Art. 1º" ou "Cláusula primeira" e "tx" resumido) e temas.
Responda APENAS com JSON {"tipo":string,"numero":string,"ano":string,"esfera":string,"titulo":string,"ementa":string,"data":string,"situacao":"Vigente","resumo":[...],"dispositivos":[{"ref":string,"tx":string}],"temas":[...],"incerto":boolean,"observacao":string}. Não invente nada que não esteja no texto; se o texto estiver ilegível ou incompleto, marque "incerto": true.

TEXTO DO NORMATIVO:
${pdfPend.texto.slice(0,60000)}` : `Você é especialista em legislação tributária brasileira (ICMS, ST, CONFAZ, Roraima). Gere um rascunho de ficha para a norma: tipo "${f.tipo}", número "${f.numero}", ano "${f.ano}", esfera "${f.esfera}"${f.titulo?`, título informado "${f.titulo}"`:""}${f.ementa?`, ementa informada "${f.ementa}"`:""}.
Responda APENAS com JSON no formato {"titulo":string,"ementa":string,"data":"dd/mm/aaaa" ou "","situacao":"Vigente"|"Vigente (alterada)"|"Revogado","resumo":[3 a 5 frases],"dispositivos":[{"ref":string,"tx":string}],"temas":[strings],"incerto":boolean,"observacao":string}.
Regras: português; NÃO invente números de artigos, datas ou conteúdo. Se não reconhecer a norma com segurança, deixe campos vazios, marque "incerto": true e explique em "observacao".`, {modelTier:"default"});
    const v = r && (r.value!==undefined ? r.value : r);
    const cur=getF();
    if(doPdf){ if(v.tipo && TIPOS.includes(v.tipo)) cur.tipo=v.tipo; if(v.esfera && ["Roraima","CONFAZ","Federal"].includes(v.esfera)) cur.esfera=v.esfera; if(!cur.numero) cur.numero=v.numero||""; if(!cur.ano||cur.ano==String(new Date().getFullYear())) cur.ano=v.ano||cur.ano; }
    setF(Object.assign({}, cur, {
      titulo: cur.titulo || v.titulo || "", ementa: cur.ementa || v.ementa || "", data: cur.data || v.data || "",
      situacao: v.situacao || cur.situacao, resumo: cur.resumo.length? cur.resumo : (v.resumo||[]),
      dispositivos: cur.dispositivos.length? cur.dispositivos : (v.dispositivos||[]), temas: cur.temas.length? cur.temas : (v.temas||[]) }));
    st.innerHTML = v.incerto ? `<span class="bad">⚠ A IA não reconheceu a norma com segurança: ${esc(v.observacao||"")}. Preencha manualmente a partir do texto oficial.</span>` : `<span class="ok">Rascunho gerado.</span> Confira cada campo no texto oficial antes de salvar.${v.observacao?" "+esc(v.observacao):""}`;
  }catch(e){ st.innerHTML=`<span class="bad">Não foi possível gerar o rascunho${e&&e.code==="rate_limited"?" (limite de uso atingido)":""}.</span>`; }
  finally{ $("#mia").disabled=false; }
}

/* ---------------- Botão na aba Legislação ---------------- */
function updBtn(){ const b=$("#addNorma"); if(!b) return; b.hidden = !db || canWrite===false; }
function mountUI(){
  document.body.insertAdjacentHTML("beforeend", modalHtml());
  const rh=document.querySelector("#view-legislacao .rhead");
  if(rh) rh.insertAdjacentHTML("beforeend",`<button class="btn" id="addNorma" hidden title="Cadastrar uma norma que ainda não está na base">+ Adicionar norma</button>`);
  $("#addNorma").onclick=()=>openForm(null);
  $("#f_pdf").onchange=async e=>{
    const file=e.target.files&&e.target.files[0]; if(!file) return; const st=$("#pdfst");
    if(!/pdf$/i.test(file.type)&&!/\.pdf$/i.test(file.name)){ st.innerHTML=`<span class="bad">Selecione um arquivo PDF.</span>`; return; }
    st.innerHTML=`<span class="spin"></span> Lendo ${esc(file.name)}…`; $("#srcReq").hidden=false;
    try{ const r=await extrairTexto(file,(i,n)=>{ st.innerHTML=`<span class="spin"></span> Lendo página ${i} de ${n}…`; });
      pdfPend={file, texto:r.texto, paginas:r.paginas};
      if(r.texto.length<200){ st.innerHTML=`<span class="bad">PDF lido (${r.paginas} pág.), mas quase sem texto — provavelmente digitalizado (imagem). Preencha a ficha manualmente; o arquivo e o link serão guardados.</span>`; }
      else { st.innerHTML=`<span class="ok">✔ ${esc(file.name)}</span> · ${r.paginas} pág. · ${r.texto.length.toLocaleString("pt-BR")} caracteres lidos. `+(window.APP_BACKEND?" Preencha tipo, número, ano e título; o texto do PDF será indexado para a busca por trecho.":" Preenchendo a ficha com IA…"); if(!window.APP_BACKEND) fillAI(); }
      if(!$("#f_src").value) $("#f_src").focus();
    }catch(err){ pdfPend=null; st.innerHTML=`<span class="bad">Não foi possível ler o PDF (${esc(err&&err.message||"erro")}). Verifique se não está protegido por senha.</span>`; }
  };
  $("#mclose").onclick=closeForm; $("#mcancel").onclick=closeForm; $("#msave").onclick=save; $("#mia").onclick=fillAI;
  $("#mback").addEventListener("click",e=>{ if(e.target.id==="mback") closeForm(); });
  document.addEventListener("keydown",e=>{ if(e.key==="Escape"){ if(!$("#mback").hidden) closeForm(); if(!$("#dback").hidden) $("#dback").hidden=true; } });
  // filtro de origem
  const f=$("#filters"); if(f){ f.insertAdjacentHTML("afterbegin",`<div class="fgroup"><h3>Origem</h3><label class="fopt"><input type="checkbox" id="fEq"> Só as cadastradas pela equipe</label></div>`);
    $("#fEq").onchange=e=>{ window.__onlyEq=e.target.checked; run(); }; }
}
const _pass = window.passFilters;
window.passFilters = function(n){ if(window.__onlyEq && !n._user) return false; return _pass(n); };

/* ---------------- Conexão com o armazenamento ---------------- */
async function loadStatic(){
  canWrite=false; updBtn();
  try{ const r=await fetch("data/normas_equipe.json",{cache:"no-cache"}); const arr=await r.json();
    const nd={}; (Array.isArray(arr)?arr:[]).forEach((d,i)=>{ nd[d.id||("s"+i)]=d; }); userDocs=nd; syncNormas(); }catch(e){}
}
async function exportar(){
  const ids=Object.keys(userDocs); let nomes={};
  try{ const autores=[...new Set(ids.map(i=>userDocs[i].autor).filter(Boolean))]; if(user&&autores.length){ const ps=await user.profiles(autores); autores.forEach(a=>{ nomes[a]=(ps&&ps[a]&&ps[a].name)||""; }); } }catch(e){}
  const arr=ids.map(id=>Object.assign({id}, userDocs[id], {pdfId:undefined, texto:(userDocs[id].texto||"").slice(0,60000)||undefined}, {autorNome: nomes[userDocs[id].autor]||userDocs[id].autorNome||"Equipe DISUT"}));
  try{ await navigator.clipboard.writeText(JSON.stringify(arr,null,1)); toast(`${arr.length} norma(s) copiadas — cole em data/normas_equipe.json no GitHub`); }catch(e){ toast("Não foi possível copiar"); }
}
async function connect(){
  mountUI(); renderUpd();
  if(!(window.claude && claude.use) || (window.APP_STANDALONE && !window.APP_BACKEND)){ loadStatic(); return; }
  try{ user = await claude.use("user"); }catch(e){ user=null; }
  try{ db = await claude.use("db"); }catch(e){ db=null; }
  try{ assets = await claude.use("assets"); }catch(e){ assets=null; }
  if(user){ try{ canWrite = await user.can("data.write"); }catch(e){ canWrite=null; } }
  updBtn();
  if(!db) return;
  try{ if(user && await user.isOwner()){ const f=$("#filters"); if(f) f.insertAdjacentHTML("beforeend",`<div style="margin-top:14px;border-top:1px dashed var(--line);padding-top:10px"><button class="linkbtn" id="expEq" title="Copia as normas da equipe em JSON para atualizar o app web">Exportar normas da equipe para o app web</button></div>`); $("#expEq").onclick=exportar; } }catch(e){}
  const timer=setTimeout(()=>{ const r=$("#rcount"); if(r && !Object.keys(userDocs).length) r.insertAdjacentHTML("beforeend",` <small class="note" id="eqwait">(normas da equipe ainda carregando)</small>`); },10000);
  db.collection(COL).onSnapshot(snap=>{
    if(!snap.metadata.fromCache){ clearTimeout(timer); const w=$("#eqwait"); if(w) w.remove(); }
    const nd={}; snap.docs.forEach(d=>{ if(d.exists) nd[d.id]=d.data(); }); userDocs=nd; syncNormas();
  }, err=>{ clearTimeout(timer); console.warn("db", err&&err.code); });
}
connect();
})();
