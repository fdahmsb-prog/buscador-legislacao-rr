/* ===================================================================
   Módulo 4 – Fontes oficiais: busca direcionada ao digitar + diretório
   =================================================================== */
(function(){
const $ = s => document.querySelector(s);
const esc = s => (s||"").toString().replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const enc = encodeURIComponent;
const G = (sites, q) => "https://www.google.com/search?q=" + enc(q + " " + sites.map(s=>"site:"+s).join(" OR "));

/* ---------------- Diretório de fontes oficiais ---------------- */
const FONTES = [
 {g:"Legislação federal", items:[
  ["Portal da Legislação – Presidência da República","https://portaldalegislacao.presidencia.gov.br/","Acervo oficial de atos normativos federais desde 1808, com busca por número, ano, tipo e termos.",["legislacao.presidencia.gov.br","planalto.gov.br"]],
  ["Pesquisa de legislação – Presidência","https://legislacao.presidencia.gov.br/","Busca por termos no conteúdo integral dos atos. Use aspas para expressão exata.",["legislacao.presidencia.gov.br"]],
  ["Planalto – Legislação (textos compilados)","https://www.planalto.gov.br/ccivil_03/","Constituição, leis, leis complementares, decretos e medidas provisórias, com redação atualizada.",["planalto.gov.br"]],
  ["Câmara dos Deputados – Legislação","https://www.camara.leg.br/legislacao/busca","Base de legislação federal com filtros por tipo, ano, número e situação.",null],
  ["Senado Federal – Normas","https://normas.leg.br/","Normas jurídicas federais mantidas pelo Senado.",["normas.leg.br","legis.senado.leg.br"]],
  ["LexML Brasil","https://www.lexml.gov.br/","Portal unificado de legislação, jurisprudência e proposições federais, estaduais e municipais.",["lexml.gov.br"]],
  ["Diário Oficial da União – Imprensa Nacional","https://www.in.gov.br/","Publicação oficial de atos federais, convênios e despachos do CONFAZ.",["in.gov.br"]]]},
 {g:"Tributos federais", items:[
  ["Receita Federal – Normas (SIJUT)","https://normas.receita.fazenda.gov.br/sijut2consulta/consulta.action","Instruções normativas, atos declaratórios, soluções de consulta e de divergência da RFB.",["normas.receita.fazenda.gov.br"]],
  ["Receita Federal do Brasil","https://www.gov.br/receitafederal/","Portal da RFB: tributos, declarações, legislação e serviços.",["gov.br/receitafederal"]],
  ["PGFN – Procuradoria-Geral da Fazenda Nacional","https://www.gov.br/pgfn/","Dívida ativa da União, transação tributária e pareceres.",["gov.br/pgfn"]],
  ["Simples Nacional","https://www8.receita.fazenda.gov.br/SimplesNacional/","Legislação, resoluções do CGSN e serviços do Simples Nacional.",["www8.receita.fazenda.gov.br"]],
  ["Portal SPED","http://sped.rfb.gov.br/","Manuais e leiautes da EFD ICMS/IPI, EFD-Contribuições, ECD, ECF e e-Financeira.",["sped.rfb.gov.br"]],
  ["Classificação fiscal (NCM) – Portal Único Siscomex","https://portalunico.siscomex.gov.br/classif/","Consulta oficial à NCM e aos atributos de classificação.",null],
  ["SUFRAMA","https://www.gov.br/suframa/","Zona Franca de Manaus e Áreas de Livre Comércio (internamento, PIN, incentivos).",["gov.br/suframa"]]]},
 {g:"Documentos fiscais eletrônicos", items:[
  ["Portal NF-e – Consulta resumo da NF-e","https://www.nfe.fazenda.gov.br/portal/consultaRecaptcha.aspx?tipoConsulta=resumo&tipoConteudo=7PhJ+gAVw2g=","Consulta pública da NF-e pela chave de acesso (situação e resumo).",null],
  ["Portal Nacional da NF-e","https://www.nfe.fazenda.gov.br/portal/principal.aspx","Manual de Orientação do Contribuinte, notas técnicas, tabelas e esquemas da NF-e e NFC-e.",["nfe.fazenda.gov.br"]],
  ["Conformidade Fácil – Assistente cClassTrib","https://dfe-portal.svrs.rs.gov.br/Cff/ClassificacaoTributaria","Ferramenta oficial (ENCAT, CGIBS, PROCERGS) para identificar o cClassTrib a partir da NCM.",["dfe-portal.svrs.rs.gov.br"]],
  ["Tabela oficial de Classificação Tributária (CST/cClassTrib)","https://dfe-portal.svrs.rs.gov.br/DFE/TabelaClassificacaoTributaria","Tabela de CST e cClassTrib do IBS/CBS publicada no Portal DF-e.",null],
  ["Portal Nacional do CT-e","https://www.cte.fazenda.gov.br/portal/","Conhecimento de Transporte Eletrônico: manuais e consultas.",["cte.fazenda.gov.br"]],
  ["NFS-e Nacional","https://www.nfse.gov.br/","Nota Fiscal de Serviço eletrônica padrão nacional (Emissor, documentação técnica).",["nfse.gov.br"]]]},
 {g:"Nacional – CONFAZ", items:[
  ["CONFAZ – Legislação","https://www.confaz.fazenda.gov.br/legislacao","Convênios, protocolos, ajustes SINIEF, atos COTEPE e despachos (inclusive PMPF).",["confaz.fazenda.gov.br"]]]},
 {g:"Roraima – estadual", items:[
  ["SEFAZ-RR – Secretaria de Estado da Fazenda","https://www.sefaz.rr.gov.br/","Legislação tributária estadual (Lei 59/93, RICMS-RR), atos, consultas e serviços.",["sefaz.rr.gov.br"]],
  ["Imprensa Oficial – Diário Oficial do Estado de Roraima","https://www.imprensaoficial.rr.gov.br/","Publicação oficial de leis, decretos e portarias estaduais.",["imprensaoficial.rr.gov.br"]],
  ["Assembleia Legislativa de Roraima","http://www.al.rr.leg.br/","Portal da ALE-RR: projetos e leis estaduais.",["al.rr.leg.br"]],
  ["ALE-RR – Sistema de Apoio ao Processo Legislativo (SAPL)","https://sapl.al.rr.leg.br/","Tramitação e textos de projetos de lei e normas estaduais.",["sapl.al.rr.leg.br"]],
  ["Diário da Assembleia Legislativa de Roraima","https://diarios.al.rr.leg.br/","Edições do Diário Oficial da ALE-RR.",["diarios.al.rr.leg.br"]]]},
 {g:"Municipal", items:[
  ["Prefeitura de Boa Vista","https://www.boavista.rr.gov.br/","Portal da Prefeitura Municipal de Boa Vista.",["boavista.rr.gov.br"]],
  ["Boa Vista – Publicações oficiais e legislação (DOM)","https://publicacoes.boavista.rr.gov.br/","Diário Oficial do Município e legislação municipal de Boa Vista.",["publicacoes.boavista.rr.gov.br"]],
  ["Código Tributário do Município de Boa Vista – LC 1.223/2009","https://publicacoes.boavista.rr.gov.br/ler/legislacao/48","Texto do Código Tributário Municipal (ISS, IPTU, ITBI, taxas).",null],
  ["LexML – legislação municipal","https://www.lexml.gov.br/","O LexML também reúne normas municipais de diversos municípios.",["lexml.gov.br"]]]},
 {g:"Jurisprudência", items:[
  ["Supremo Tribunal Federal","https://portal.stf.jus.br/","Jurisprudência, repercussão geral e súmulas vinculantes.",["stf.jus.br"]],
  ["Superior Tribunal de Justiça","https://www.stj.jus.br/","Súmulas, recursos repetitivos e pesquisa de jurisprudência.",["stj.jus.br"]],
  ["Tribunal de Justiça de Roraima","https://www.tjrr.jus.br/","Jurisprudência estadual (execuções fiscais, mandados de segurança tributários).",["tjrr.jus.br"]]]},
 {g:"Administração pública e controle", items:[
  ["Tribunal de Contas da União (TCU)","https://portal.tcu.gov.br/","Acórdãos, súmulas, referenciais de auditoria e normas de fiscalização.",["portal.tcu.gov.br","pesquisa.apps.tcu.gov.br"]],
  ["Controladoria-Geral da União (CGU)","https://www.gov.br/cgu/","Integridade, correição, Lei Anticorrupção, acesso à informação e manuais de PAD.",["gov.br/cgu"]],
  ["NBASP – Normas de Auditoria do Setor Público (IRB)","https://nbasp.irbcontas.org.br/","Normas brasileiras de auditoria do setor público baseadas nas ISSAI da INTOSAI.",["nbasp.irbcontas.org.br","irbcontas.org.br"]],
  ["ALE-RR – SAPL (legislação estadual de Roraima)","https://sapl.al.rr.leg.br/","Leis estaduais de Roraima, Constituição Estadual e tramitação de projetos.",["sapl.al.rr.leg.br"]]]},
 {g:"Contabilidade e auditoria", items:[
  ["CFC – Normas Brasileiras de Contabilidade","https://cfc.org.br/tecnica/normas-brasileiras-de-contabilidade/","NBC TG, NBC TSP, NBC TA e demais normas técnicas e profissionais do CFC.",["cfc.org.br"]],
  ["Comitê de Pronunciamentos Contábeis (CPC)","https://www.cpc.org.br/","Pronunciamentos, interpretações e orientações convergidos às IFRS.",["cpc.org.br"]],
  ["Tesouro Transparente – MCASP e PCASP","https://www.tesourotransparente.gov.br/publicacoes/manual-de-contabilidade-aplicada-ao-setor-publico-mcasp","Manual de Contabilidade Aplicada ao Setor Público e plano de contas, editados pela STN.",["tesourotransparente.gov.br"]]]},
 {g:"Tecnologia da informação e proteção de dados", items:[
  ["ANPD – Autoridade Nacional de Proteção de Dados","https://www.gov.br/anpd/","Regulamentos, guias e orientações sobre a LGPD, inclusive para o poder público.",["gov.br/anpd"]],
  ["Governo Digital","https://www.gov.br/governodigital/","Normas e guias de transformação digital, interoperabilidade e segurança da informação no governo.",["gov.br/governodigital"]],
  ["ITI – ICP-Brasil","https://www.gov.br/iti/","Certificação digital, assinatura eletrônica e normas da ICP-Brasil.",["gov.br/iti"]],
  ["GSI – Segurança da Informação","https://www.gov.br/gsi/","Política Nacional de Segurança da Informação e normas complementares.",["gov.br/gsi"]]]},
 {g:"Secretarias de Fazenda de outros Estados", items:[
  ["AC – SEFAZ Acre","https://sefaz.ac.gov.br/","",["sefaz.ac.gov.br"]],["AL – SEFAZ Alagoas","https://www.sefaz.al.gov.br/","",["sefaz.al.gov.br"]],["AM – SEFAZ Amazonas","https://www.sefaz.am.gov.br/","",["sefaz.am.gov.br"]],
  ["AP – SEFAZ Amapá","https://www.sefaz.ap.gov.br/","",["sefaz.ap.gov.br"]],["BA – SEFAZ Bahia","https://www.sefaz.ba.gov.br/","",["sefaz.ba.gov.br"]],["CE – SEFAZ Ceará","https://www.sefaz.ce.gov.br/","",["sefaz.ce.gov.br"]],
  ["DF – Secretaria de Economia","https://www.economia.df.gov.br/","",["economia.df.gov.br"]],["ES – SEFAZ Espírito Santo","https://sefaz.es.gov.br/","",["sefaz.es.gov.br"]],["GO – Secretaria da Economia","https://goias.gov.br/economia/","",["goias.gov.br/economia"]],
  ["MA – SEFAZ Maranhão","https://www.sefaz.ma.gov.br/","",["sefaz.ma.gov.br"]],["MG – Secretaria de Fazenda","https://www.fazenda.mg.gov.br/","",["fazenda.mg.gov.br"]],["MS – SEFAZ Mato Grosso do Sul","https://www.sefaz.ms.gov.br/","",["sefaz.ms.gov.br"]],
  ["MT – SEFAZ Mato Grosso","https://www.sefaz.mt.gov.br/","",["sefaz.mt.gov.br"]],["PA – SEFA Pará","https://www.sefa.pa.gov.br/","",["sefa.pa.gov.br"]],["PB – SEFAZ Paraíba","https://www.sefaz.pb.gov.br/","",["sefaz.pb.gov.br"]],
  ["PE – SEFAZ Pernambuco","https://www.sefaz.pe.gov.br/","",["sefaz.pe.gov.br"]],["PI – SEFAZ Piauí","https://www.sefaz.pi.gov.br/","",["sefaz.pi.gov.br"]],["PR – Secretaria da Fazenda","https://www.fazenda.pr.gov.br/","",["fazenda.pr.gov.br"]],
  ["RJ – Secretaria de Fazenda","https://www.fazenda.rj.gov.br/","",["fazenda.rj.gov.br"]],["RN – Secretaria de Tributação","https://www.set.rn.gov.br/","",["set.rn.gov.br"]],["RO – SEFIN Rondônia","https://www.sefin.ro.gov.br/","",["sefin.ro.gov.br"]],
  ["RS – Receita Estadual","https://receita.fazenda.rs.gov.br/","",["receita.fazenda.rs.gov.br"]],["SC – Legislação tributária (SEF)","https://legislacao.sef.sc.gov.br/","",["legislacao.sef.sc.gov.br","sef.sc.gov.br"]],["SE – SEFAZ Sergipe","https://www.sefaz.se.gov.br/","",["sefaz.se.gov.br"]],
  ["SP – Legislação tributária (SEFAZ-SP)","https://legislacao.fazenda.sp.gov.br/","",["legislacao.fazenda.sp.gov.br"]],["TO – SEFAZ Tocantins","https://www.to.gov.br/sefaz/","",["to.gov.br/sefaz"]]]}
];

/* --------- Busca direcionada (atualiza enquanto o usuário digita) --------- */
const TIPO_TXT = {"Lei Complementar":"Lei Complementar","Emenda Constitucional":"Emenda Constitucional","Convênio":"Convênio ICMS","Protocolo ICMS":"Protocolo ICMS","Ajuste SINIEF":"Ajuste SINIEF","Decreto":"Decreto","Lei":"Lei","Constituição":"Constituição"};
function buildQuery(raw){
  let P=null; try{ P=parseQuery(raw); }catch(e){}
  const q=raw.trim();
  if(P && P.numero){
    const num = P.numero.replace(/-e$/,"-E").replace(/^(\d+)(\d{3})(-E)?$/,"$1.$2$3");
    const t = P.tipo? (TIPO_TXT[P.tipo]||P.tipo)+" " : "";
    return {txt:`"${t}${t?"nº ":""}${num}"${P.ano?" "+P.ano:""}`, num:P.numero.replace(/-e$/,""), ano:P.ano||"", tipo:P.tipo||"", termos:(P.terms||[]).join(" ")};
  }
  return {txt:q, num:"", ano:"", termos:q};
}
const ALVOS = [
  {n:"Portal da Legislação (Presidência)", ic:"BR", url:(b)=>G(["legislacao.presidencia.gov.br","planalto.gov.br"],b.txt), home:"https://portaldalegislacao.presidencia.gov.br/"},
  {n:"Câmara – Legislação federal", ic:"BR", url:(b)=>`https://www.camara.leg.br/legislacao/busca?geral=${enc(b.num?b.termos:b.txt)}&numero=${enc(b.num)}&ano=${enc(b.ano)}&tipo=${enc(({"Lei Complementar":"Lei Complementar","Lei":"Lei Ordinária","Decreto":"Decreto","Emenda Constitucional":"Emenda Constitucional"})[b.tipo]||"")}`, home:"https://www.camara.leg.br/legislacao/busca"},
  {n:"LexML (federal, estadual e municipal)", ic:"LX", url:(b)=>G(["lexml.gov.br"],b.txt), home:"https://www.lexml.gov.br/"},
  {n:"Receita Federal – Normas", ic:"RF", url:(b)=>G(["normas.receita.fazenda.gov.br"],b.txt), home:"https://normas.receita.fazenda.gov.br/sijut2consulta/consulta.action"},
  {n:"CONFAZ – Convênios e Ajustes", ic:"CF", url:(b)=>G(["confaz.fazenda.gov.br"],b.txt), home:"https://www.confaz.fazenda.gov.br/legislacao"},
  {n:"SEFAZ-RR", ic:"RR", url:(b)=>G(["sefaz.rr.gov.br"],b.txt), home:"https://www.sefaz.rr.gov.br/"},
  {n:"Diário Oficial de Roraima", ic:"RR", url:(b)=>G(["imprensaoficial.rr.gov.br"],b.txt), home:"https://www.imprensaoficial.rr.gov.br/"},
  {n:"ALE-RR (leis estaduais)", ic:"RR", url:(b)=>G(["al.rr.leg.br","sapl.al.rr.leg.br"],b.txt), home:"https://sapl.al.rr.leg.br/"},
  {n:"Boa Vista – legislação municipal", ic:"BV", url:(b)=>G(["publicacoes.boavista.rr.gov.br","boavista.rr.gov.br"],b.txt), home:"https://publicacoes.boavista.rr.gov.br/"},
  {n:"Diário Oficial da União", ic:"DO", url:(b)=>G(["in.gov.br"],b.txt), home:"https://www.in.gov.br/"},
  {n:"Portal NF-e (notas técnicas)", ic:"NF", url:(b)=>G(["nfe.fazenda.gov.br"],b.txt), home:"https://www.nfe.fazenda.gov.br/portal/principal.aspx"},
  {n:"STF / STJ (jurisprudência)", ic:"JU", url:(b)=>G(["stf.jus.br","stj.jus.br"],b.txt), home:"https://portal.stf.jus.br/"}
];
function renderOfic(){
  const box=$("#ofic"); if(!box) return;
  const raw=($("#q").value||"").trim();
  if(raw.length<2){ box.innerHTML=`<div class="ofh">🔎 <b>Fontes oficiais</b> — digite uma norma ou assunto para pesquisar também no Portal da Legislação, na Câmara, no LexML, na Receita Federal, no CONFAZ, na SEFAZ-RR e em outros órgãos. <a href="#fontes">Ver todas as fontes →</a></div>`; return; }
  const b=buildQuery(raw);
  box.innerHTML=`<div class="ofh">🔎 <b>Pesquisar ${esc(b.txt)} nas fontes oficiais</b> <span class="note">(abre em nova aba)</span> <a href="#fontes">Diretório completo →</a></div>
   <div class="ofl">${ALVOS.map(a=>`<a class="ofa" href="${esc(a.url(b))}" target="_blank" rel="noopener" title="Pesquisar em ${esc(a.n)}"><span class="ofi">${a.ic}</span>${esc(a.n)}</a>`).join("")}</div>`;
}

/* ---------------- Aba "Fontes oficiais" ---------------- */
function buildFontes(){
  const v=$("#view-fontes"); if(!v || v.dataset.built) return; v.dataset.built="1";
  const total=FONTES.reduce((s,g)=>s+g.items.length,0);
  v.innerHTML=`<div class="vwrap">
   <div class="card" style="padding:16px 18px;margin-bottom:16px">
    <h2 style="font:600 19px 'Source Serif 4',serif;margin:0 0 4px;color:var(--navy)">Fontes oficiais de normativos tributários</h2>
    <p class="note" style="margin:0 0 10px">${total} portais oficiais federais, nacionais, estaduais e municipais. Digite uma norma ou assunto para pesquisar dentro de cada portal (a pesquisa abre em nova aba, por meio de busca direcionada ao site oficial).</p>
    <div class="tsearch" style="margin:0"><input type="search" id="fq" placeholder="Ex.: Lei Complementar 214/2025 · Convênio ICMS 142/18 · Decreto 4.335-E · ISS Boa Vista"><input type="search" id="ff" placeholder="Filtrar portais (ex.: Roraima, NF-e, SP)" style="max-width:280px"></div>
   </div>
   <div class="guide" id="fbox"></div></div>`;
  const render=()=>{
    const q=($("#fq").value||"").trim(), f=norm($("#ff").value||""); const b=q?buildQuery(q):null;
    $("#fbox").innerHTML=FONTES.map(g=>{
      const its=g.items.filter(i=>!f || norm(g.g+" "+i[0]+" "+i[1]+" "+i[2]).includes(f)); if(!its.length) return "";
      return `<div class="card gcard"><h3>${esc(g.g)}</h3>${its.map(i=>`<div class="fsrc"><div><a href="${esc(i[1])}" target="_blank" rel="noopener"><b>${esc(i[0])}</b> ↗</a>${i[2]?`<div class="note" style="margin:2px 0 0">${esc(i[2])}</div>`:""}<div class="furl">${esc(i[1].replace(/^https?:\/\//,"").slice(0,70))}</div></div>${b&&i[3]?`<a class="btn" style="flex:none;font-size:12.5px;padding:5px 10px" href="${esc(G(i[3],b.txt))}" target="_blank" rel="noopener" title="Pesquisar ${esc(b.txt)} neste portal">🔎 Pesquisar aqui</a>`:""}</div>`).join("")}</div>`;
    }).join("") || `<div class="card empty">Nenhum portal corresponde ao filtro.</div>`;
  };
  const sync=$("#q") && $("#q").value; if(sync) $("#fq").value=sync;
  $("#fq").oninput=render; $("#ff").oninput=render; render();
}
window.__buildFontes = buildFontes;

/* ---------------- Montagem ---------------- */
function mount(){
  const nav=document.querySelector("nav.tabs");
  if(nav && !nav.querySelector('[data-view="fontes"]')) nav.insertAdjacentHTML("beforeend",`<a href="#fontes" data-view="fontes" class="tab">Fontes oficiais</a>`);
  if(!$("#view-fontes")) $("#view-guia").insertAdjacentHTML("afterend",`<div id="view-fontes" class="view" hidden></div>`);
  const sbox=document.querySelector("#view-legislacao .sbox");
  if(sbox) sbox.insertAdjacentHTML("beforeend",`<div id="ofic" class="ofic"></div>`);
  $("#q").addEventListener("input",()=>{ clearTimeout(window.__oft); window.__oft=setTimeout(renderOfic,150); });
  document.querySelectorAll(".hint code").forEach(c=>c.addEventListener("click",()=>setTimeout(renderOfic,20)));
  const _clr=$("#clearQ"); if(_clr) _clr.addEventListener("click",()=>setTimeout(renderOfic,20));
  renderOfic();
  const onHash=()=>{ const on=location.hash==="#fontes"; document.querySelectorAll(".view").forEach(v=>{ if(on) v.hidden = v.id!=="view-fontes"; }); if(on){ document.querySelectorAll(".tab").forEach(a=>a.classList.toggle("on",a.dataset.view==="fontes")); buildFontes(); } else { const f=$("#view-fontes"); if(f) f.hidden=true; } };
  addEventListener("hashchange",onHash); onHash();
}
mount();
})();
