/* ===================================================================
   Módulo 2 – Navegação, Tabelas de códigos, Ferramentas e Guia
   =================================================================== */
(function(){
const $ = s => document.querySelector(s);
const norm = s => (s||"").toString().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"");
const esc = s => (s||"").toString().replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const digits = s => (s||"").replace(/\D/g,"");
const fmt = (v,d=2) => isFinite(v)? v.toLocaleString("pt-BR",{minimumFractionDigits:d,maximumFractionDigits:d}) : "—";
const brl = v => "R$ " + fmt(v);
const pct = v => fmt(v*100,2)+"%";
function toast(m){const t=$("#toast");t.textContent=m;t.classList.add("on");clearTimeout(t._t);t._t=setTimeout(()=>t.classList.remove("on"),1800)}
async function copy(t,msg){ try{ await navigator.clipboard.writeText(t); toast(msg||"Copiado");}catch(e){ toast("Não foi possível copiar"); } }

/* ===================== ROTEAMENTO ===================== */
const VIEWS=["legislacao","tabelas","ferramentas","guia"];
let built={};
function route(){
  let v=(location.hash||"#legislacao").slice(1); if(!VIEWS.includes(v)) v="legislacao";
  VIEWS.forEach(x=>{ const el=$("#view-"+x); if(el) el.hidden = x!==v; });
  document.querySelectorAll(".tab").forEach(a=>a.classList.toggle("on",a.dataset.view===v));
  if(!built[v]){ built[v]=true; if(v==="tabelas") buildTabelas(); if(v==="ferramentas") buildFerramentas(); if(v==="guia") buildGuia(); }
}
addEventListener("hashchange",route);

/* ===================== TABELAS MANUAIS ===================== */
const UFS=[["11","RO","Rondônia","N"],["12","AC","Acre","N"],["13","AM","Amazonas","N"],["14","RR","Roraima","N"],["15","PA","Pará","N"],["16","AP","Amapá","N"],["17","TO","Tocantins","N"],
["21","MA","Maranhão","NE"],["22","PI","Piauí","NE"],["23","CE","Ceará","NE"],["24","RN","Rio Grande do Norte","NE"],["25","PB","Paraíba","NE"],["26","PE","Pernambuco","NE"],["27","AL","Alagoas","NE"],["28","SE","Sergipe","NE"],["29","BA","Bahia","NE"],
["31","MG","Minas Gerais","SE"],["32","ES","Espírito Santo","SE"],["33","RJ","Rio de Janeiro","SE"],["35","SP","São Paulo","SE"],["41","PR","Paraná","S"],["42","SC","Santa Catarina","S"],["43","RS","Rio Grande do Sul","S"],
["50","MS","Mato Grosso do Sul","CO"],["51","MT","Mato Grosso","CO"],["52","GO","Goiás","CO"],["53","DF","Distrito Federal","CO"]];
const REG={N:"Norte",NE:"Nordeste",SE:"Sudeste",S:"Sul",CO:"Centro-Oeste"};

const MAN = {
 origem:{t:"Origem da mercadoria (CST ICMS – Tabela A)",src:"Ajuste SINIEF 20/2012 · leiaute NF-e (campo orig)",desc:"Primeiro dígito do CST do ICMS. Combinado com a Tabela B (tributação) forma o CST de 3 dígitos (ex.: 0 + 60 = 060). As origens 1, 2, 3 e 8 atraem a alíquota interestadual de 4% (Resolução do Senado 13/2012).",rows:[
  ["0","Nacional, exceto as indicadas nos códigos 3, 4, 5 e 8"],["1","Estrangeira – importação direta, exceto a indicada no código 6"],["2","Estrangeira – adquirida no mercado interno, exceto a indicada no código 7"],
  ["3","Nacional, com Conteúdo de Importação superior a 40% e inferior ou igual a 70%"],["4","Nacional, cuja produção tenha sido feita em conformidade com os processos produtivos básicos (PPB)"],
  ["5","Nacional, com Conteúdo de Importação inferior ou igual a 40%"],["6","Estrangeira – importação direta, sem similar nacional, constante em lista da CAMEX e gás natural"],
  ["7","Estrangeira – adquirida no mercado interno, sem similar nacional, constante em lista da CAMEX e gás natural"],["8","Nacional, com Conteúdo de Importação superior a 70%"]]},
 finNFe:{t:"NF-e – Finalidade de emissão (finNFe)",src:"MOC NF-e",rows:[["1","NF-e normal"],["2","NF-e complementar"],["3","NF-e de ajuste"],["4","Devolução de mercadoria"]]},
 tpNF:{t:"NF-e – Tipo de operação (tpNF)",src:"MOC NF-e",rows:[["0","Entrada"],["1","Saída"]]},
 idDest:{t:"NF-e – Destino da operação (idDest)",src:"MOC NF-e",rows:[["1","Operação interna"],["2","Operação interestadual"],["3","Operação com exterior"]]},
 indFinal:{t:"NF-e – Consumidor final (indFinal)",src:"MOC NF-e",rows:[["0","Normal"],["1","Consumidor final"]]},
 indPres:{t:"NF-e – Indicador de presença do comprador (indPres)",src:"MOC NF-e",rows:[["0","Não se aplica (ex.: NF-e complementar ou de ajuste)"],["1","Operação presencial"],["2","Operação não presencial, pela Internet"],["3","Operação não presencial, Teleatendimento"],["4","NFC-e em operação com entrega a domicílio"],["5","Operação presencial, fora do estabelecimento"],["9","Operação não presencial, outros"]]},
 indIEDest:{t:"NF-e – Indicador da IE do destinatário (indIEDest)",src:"MOC NF-e",rows:[["1","Contribuinte do ICMS (informar a IE do destinatário)"],["2","Contribuinte isento de inscrição no cadastro de contribuintes"],["9","Não contribuinte, que pode ou não possuir inscrição estadual"]]},
 crt:{t:"NF-e – Código de Regime Tributário (CRT)",src:"MOC NF-e",rows:[["1","Simples Nacional"],["2","Simples Nacional – excesso de sublimite de receita bruta"],["3","Regime Normal"],["4","Simples Nacional – Microempreendedor Individual (MEI)"]]},
 modFrete:{t:"NF-e – Modalidade do frete (modFrete)",src:"MOC NF-e",rows:[["0","Contratação do frete por conta do remetente (CIF)"],["1","Contratação do frete por conta do destinatário (FOB)"],["2","Contratação do frete por conta de terceiros"],["3","Transporte próprio por conta do remetente"],["4","Transporte próprio por conta do destinatário"],["9","Sem ocorrência de transporte"]]},
 modBC:{t:"NF-e – Modalidade de BC do ICMS (modBC)",src:"MOC NF-e",rows:[["0","Margem de Valor Agregado (%)"],["1","Pauta (valor)"],["2","Preço tabelado máximo (valor)"],["3","Valor da operação"]]},
 modBCST:{t:"NF-e – Modalidade de BC do ICMS-ST (modBCST)",src:"MOC NF-e",rows:[["0","Preço tabelado ou máximo sugerido"],["1","Lista negativa (valor)"],["2","Lista positiva (valor)"],["3","Lista neutra (valor)"],["4","Margem de Valor Agregado (%)"],["5","Pauta (valor)"],["6","Valor da operação"]]},
 tpEmis:{t:"NF-e – Tipo de emissão (tpEmis)",src:"MOC NF-e",rows:[["1","Emissão normal"],["2","Contingência FS-IA (formulário de segurança – impressor autônomo)"],["3","Contingência SCAN (desativada)"],["4","Contingência EPEC (evento prévio de emissão em contingência)"],["5","Contingência FS-DA (formulário de segurança – documento auxiliar)"],["6","Contingência SVC-AN (SEFAZ Virtual do Ambiente Nacional)"],["7","Contingência SVC-RS (SEFAZ Virtual do RS)"],["9","Contingência off-line da NFC-e"]]},
 motDes:{t:"NF-e – Motivo da desoneração do ICMS (motDesICMS)",src:"MOC NF-e",rows:[["1","Táxi"],["3","Produtor agropecuário"],["4","Frotista/Locadora"],["5","Diplomático/Consular"],["6","Utilitários e motocicletas da Amazônia Ocidental e Áreas de Livre Comércio (Resoluções CONTRAN 714/88 e 790/94)"],["7","SUFRAMA"],["8","Venda a órgão público"],["9","Outros"],["10","Deficiente condutor (Convênio ICMS 38/12)"],["11","Deficiente não condutor (Convênio ICMS 38/12)"],["12","Órgão de fomento e desenvolvimento agropecuário"],["16","Olimpíadas Rio 2016"],["90","Solicitado pelo Fisco"]]},
 eventos:{t:"NF-e – Tipos de evento",src:"Ajuste SINIEF 07/05 · MOC NF-e",desc:"Eventos vinculados à NF-e. A manifestação do destinatário (21xxxx) é fonte de cruzamento relevante: desconhecimento ou operação não realizada indicam possível uso indevido de CNPJ ou nota fria.",rows:[["110110","Carta de Correção Eletrônica (CC-e)"],["110111","Cancelamento"],["110112","Cancelamento por substituição (NFC-e)"],["110140","EPEC – Evento Prévio de Emissão em Contingência"],["110130","Comprovante de Entrega da NF-e"],["110131","Cancelamento do Comprovante de Entrega"],["110150","Ator interessado na NF-e"],["210200","Manifestação do destinatário – Confirmação da Operação"],["210210","Manifestação do destinatário – Ciência da Operação"],["210220","Manifestação do destinatário – Desconhecimento da Operação"],["210240","Manifestação do destinatário – Operação não Realizada"],["790700","Averbação para Exportação"]]},
 cstat:{t:"NF-e – Principais códigos de status (cStat)",src:"MOC NF-e",rows:[["100","Autorizado o uso da NF-e"],["101","Cancelamento de NF-e homologado"],["102","Inutilização de número homologado"],["110","Uso denegado"],["135","Evento registrado e vinculado à NF-e"],["150","Autorizado o uso da NF-e, autorização fora de prazo"],["151","Cancelamento de NF-e homologado fora de prazo"],["155","Cancelamento homologado fora de prazo"],["204","Rejeição: duplicidade de NF-e"],["217","Rejeição: NF-e não consta na base de dados da SEFAZ"],["301","Uso denegado: irregularidade fiscal do emitente"],["302","Uso denegado: irregularidade fiscal do destinatário"],["303","Uso denegado: destinatário não habilitado a operar na UF"]]},
 uf:{t:"Códigos de UF (IBGE) e regiões",src:"IBGE · usados na chave de acesso (cUF)",desc:"Os dois primeiros dígitos da chave de acesso e do código de município indicam a UF.",rows:UFS.map(u=>[u[0],u[1]+" – "+u[2]+" ("+REG[u[3]]+")"])},
 efd_sit:{t:"EFD – Código da situação do documento (COD_SIT)",src:"Guia Prático EFD ICMS/IPI · Tabela 4.1.2",rows:[["00","Documento regular"],["01","Escrituração extemporânea de documento regular"],["02","Documento cancelado"],["03","Escrituração extemporânea de documento cancelado"],["04","NF-e, NFC-e ou CT-e denegado"],["05","NF-e, NFC-e ou CT-e com numeração inutilizada"],["06","Documento fiscal complementar"],["07","Escrituração extemporânea de documento complementar"],["08","Documento fiscal emitido com base em regime especial ou norma específica"]]},
 efd_item:{t:"EFD – Tipo do item (registro 0200, TIPO_ITEM)",src:"Guia Prático EFD ICMS/IPI",rows:[["00","Mercadoria para revenda"],["01","Matéria-prima"],["02","Embalagem"],["03","Produto em processo"],["04","Produto acabado"],["05","Subproduto"],["06","Produto intermediário"],["07","Material de uso e consumo"],["08","Ativo imobilizado"],["09","Serviços"],["10","Outros insumos"],["99","Outras"]]},
 efd_blocos:{t:"EFD ICMS/IPI – Blocos e registros-chave para auditoria",src:"Ajuste SINIEF 02/2009 · Guia Prático EFD",rows:[["Bloco 0","Abertura, identificação e referências (0000, 0150 participantes, 0200 itens)"],["Bloco B","Escrituração e apuração do ISS (Distrito Federal)"],["Bloco C","Documentos fiscais I – mercadorias (C100 documento, C170 itens, C190 registro analítico, C197 ajustes do documento)"],["Bloco D","Documentos fiscais II – serviços de transporte e comunicação (D100, D190, D500)"],["Bloco E","Apuração do ICMS e do IPI (E110 apuração própria, E111 ajustes, E200/E210 ICMS-ST por UF, E300/E310 DIFAL e FCP – EC 87/15, E500 IPI)"],["Bloco G","Controle do crédito de ICMS do ativo permanente – CIAP (G110, G125)"],["Bloco H","Inventário físico (H005, H010 itens, H020 informação complementar)"],["Bloco K","Controle da produção e do estoque (K200 estoque escriturado, K230 produção)"],["Bloco 1","Outras informações (1010 obrigatoriedade, 1100 exportação, 1300 combustíveis, 1900 sub-apurações)"],["Bloco 9","Controle e encerramento do arquivo digital"]]},
 aliqinter:{t:"ICMS – Alíquotas interestaduais",src:"CF art. 155, § 2º, IV · Res. Senado 22/1989, 95/1996 e 13/2012",rows:[["12%","Regra geral nas operações e prestações interestaduais (Res. Senado 22/1989)"],["7%","Operações originadas nas regiões Sul e Sudeste (exceto ES) destinadas às regiões Norte, Nordeste e Centro-Oeste e ao Espírito Santo (Res. Senado 22/1989)"],["4%","Bens e mercadorias importados do exterior ou com conteúdo de importação superior a 40% – origens 1, 2, 3 e 8 (Res. Senado 13/2012), salvo exceções (sem similar nacional/CAMEX e gás natural)"],["4%","Transporte aéreo interestadual de passageiro, carga e mala postal (Res. Senado 95/1996)"]]}
};

/* ===================== CATÁLOGO DE TABELAS ===================== */
let D=null, NCM=null, ncmLoading=null;
const CAT=[
 {grp:"ICMS e documentos fiscais",items:[
  {k:"cfop",t:"CFOP",full:"Código Fiscal de Operações e Prestações",src:"Convênio SINIEF s/nº/1970, Anexo II (com alterações até o Ajuste SINIEF 3/2024) · base OCA l10n-brazil",desc:"Primeiro dígito: 1/2/3 entradas (estadual, interestadual, exterior) e 5/6/7 saídas. Clique para ver o grupo e os indicadores."},
  {k:"origem",man:1,t:"CST ICMS – Origem (Tabela A)"},
  {k:"cst_icms",t:"CST ICMS – Tributação (Tabela B)",full:"Código de Situação Tributária do ICMS – Tabela B",src:"Convênio SINIEF s/nº/1970 · Ajuste SINIEF 20/2012 e alterações (CST 02, 15, 53 e 61 – monofásico de combustíveis)",desc:"Dois últimos dígitos do CST do ICMS, para contribuintes do regime normal (CRT 3)."},
  {k:"csosn",t:"CSOSN",full:"Código de Situação da Operação no Simples Nacional",src:"Ajuste SINIEF 07/05 · Resolução CGSN",desc:"Usado no lugar do CST pelos optantes do Simples Nacional (CRT 1 e 4)."},
  {k:"cest",t:"CEST",full:"Código Especificador da Substituição Tributária",src:"Convênio ICMS 142/2018, Anexos II a XXVI · base OCA l10n-brazil e tabela CONFAZ",desc:"Formato SS.III.DD: segmento, item e especificação. Obrigatório na NF-e para mercadorias listadas nos Anexos do Conv. 142/18. Clique para ver as NCMs."},
  {k:"aliqinter",man:1,t:"Alíquotas interestaduais"},
  {k:"modelos",t:"Modelos de documentos fiscais",full:"Modelos de documentos fiscais",src:"Convênio SINIEF s/nº/1970, Ajustes SINIEF e Guia Prático EFD (Tabela 4.1.1)",desc:"Código do modelo do documento, usado na EFD (COD_MOD) e na chave de acesso."},
  {k:"uf",man:1,t:"Códigos de UF (IBGE)"}]},
 {grp:"NF-e – campos codificados",items:[
  {k:"finNFe",man:1,t:"Finalidade (finNFe)"},{k:"tpNF",man:1,t:"Tipo de operação (tpNF)"},{k:"idDest",man:1,t:"Destino (idDest)"},{k:"indFinal",man:1,t:"Consumidor final (indFinal)"},
  {k:"indPres",man:1,t:"Presença (indPres)"},{k:"indIEDest",man:1,t:"IE do destinatário (indIEDest)"},{k:"crt",man:1,t:"Regime tributário (CRT)"},{k:"modFrete",man:1,t:"Modalidade de frete"},
  {k:"modBC",man:1,t:"Modalidade BC ICMS"},{k:"modBCST",man:1,t:"Modalidade BC ICMS-ST"},{k:"tpEmis",man:1,t:"Tipo de emissão"},{k:"motDes",man:1,t:"Motivo de desoneração"},
  {k:"eventos",man:1,t:"Eventos da NF-e"},{k:"cstat",man:1,t:"Códigos de status (cStat)"}]},
 {grp:"EFD / SPED",items:[{k:"efd_blocos",man:1,t:"Blocos da EFD ICMS/IPI"},{k:"efd_sit",man:1,t:"Situação do documento"},{k:"efd_item",man:1,t:"Tipo do item (0200)"}]},
 {grp:"Tributos federais",items:[
  {k:"ncm",t:"NCM / TIPI",full:"Nomenclatura Comum do Mercosul com alíquota do IPI (TIPI)",src:"NCM/SH e TIPI (Decreto 11.158/2022 e alterações) · base OCA l10n-brazil",desc:"Clique em uma NCM para ver a alíquota do IPI e os CESTs vinculados. Confira a TIPI vigente antes de lançar: as alíquotas mudam por decreto."},
  {k:"cst_ipi",t:"CST IPI",full:"Código de Situação Tributária do IPI",src:"IN RFB · leiaute NF-e e EFD",desc:"00 a 49 entradas; 50 a 99 saídas."},
  {k:"cst_pis",t:"CST PIS/COFINS",full:"Código de Situação Tributária do PIS/Pasep e da Cofins",src:"IN RFB 1.009/2010 e alterações · EFD-Contribuições",desc:"01 a 49 saídas; 50 a 99 entradas (créditos). A mesma tabela vale para PIS e Cofins."},
  {k:"nbs",t:"NBS",full:"Nomenclatura Brasileira de Serviços",src:"NBS 2.0 · base OCA l10n-brazil",desc:"Classificação dos serviços, usada na NFS-e nacional e na Reforma Tributária."},
  {k:"lc116",t:"Lista de serviços – LC 116",full:"Lista de serviços anexa à LC 116/2003 (ISS)",src:"LC 116/2003 e alterações",desc:"Itens e subitens de serviços sujeitos ao ISS. Os itens 14.01, 16 e outros são relevantes para conflitos ICMS × ISS."}]},
 {grp:"Reforma Tributária (IBS/CBS)",items:[
  {k:"cst_ibscbs",t:"CST IBS/CBS",full:"Código de Situação Tributária do IBS e da CBS",src:"LC 214/2025 · NT 2025.002 (RTC) · base OCA l10n-brazil",desc:"Tabela comum ao IBS e à CBS. Cada CST se desdobra em cClassTrib."},
  {k:"cclasstrib",t:"cClassTrib",full:"Código de Classificação Tributária do IBS/CBS",src:"Tabela cClassTrib (Portal da Conformidade Fácil / NF-e) · base OCA l10n-brazil",desc:"Detalha o tratamento tributário (alíquota padrão, reduções de 30%, 60%, 100%, isenção, monofasia etc.) com o fundamento na LC 214/2025. Tabela em evolução: confira a versão vigente."}]}
];
const BYK={}; CAT.forEach(g=>g.items.forEach(i=>BYK[i.k]=i));

function rowsOf(k){
  if(MAN[k]) return MAN[k].rows.map(r=>({c:r[0],d:r[1]}));
  if(k==="ncm") return NCM? NCM.map(r=>({c:r[0]+(r[1]?" ex "+r[1]:""),d:r[2],ipi:r[3],_raw:r})) : [];
  return (D&&D[k])||[];
}
function countOf(k){ if(MAN[k]) return MAN[k].rows.length; if(k==="ncm") return NCM?NCM.length:"11 mil"; return D&&D[k]?D[k].length:"…"; }

let TS={k:"cfop", q:"", all:false, limit:300, sel:null};
async function loadData(){
  if(D) return D;
  try{ const r=await fetch("data/tabelas.json"); D=await r.json(); }catch(e){ D={}; $("#tbody").innerHTML=`<tr><td colspan=3>Não foi possível carregar as tabelas (${esc(e.message)}).</td></tr>`; }
  return D;
}
function loadNCM(){
  if(NCM) return Promise.resolve(NCM);
  if(!ncmLoading) ncmLoading=fetch("data/ncm.json").then(r=>r.json()).then(j=>{NCM=j; renderTList(); return j;}).catch(e=>{ncmLoading=null; toast("Falha ao carregar NCM"); return [];});
  return ncmLoading;
}

function buildTabelas(){
  $("#view-tabelas").innerHTML=`<div class="vwrap"><div class="tgrid">
    <aside><div class="card tlist" id="tlist"></div></aside>
    <section>
      <div class="tsearch">
        <input type="search" id="tq" placeholder="Buscar código ou descrição (ex.: 5.405, 060, monofásico, 2204, cosméticos)…" autocomplete="off">
        <label><input type="checkbox" id="tall"> em todas as tabelas</label>
      </div>
      <div class="ttitle"><h2 id="tttl"></h2><span class="src" id="tsrc"></span></div>
      <p class="tdesc" id="tdesc"></p>
      <div id="tbox"><table class="codes"><thead><tr><th style="width:120px">Código</th><th>Descrição</th><th style="width:150px" id="th3">Informação</th></tr></thead><tbody id="tbody"><tr><td colspan=3>Carregando…</td></tr></tbody></table></div>
    </section>
    <section id="tdet"><div class="card" id="tdcard"><div class="placeholder">Selecione um código para ver o detalhamento, os vínculos (NCM ↔ CEST) e copiar.</div></div></section>
  </div></div>`;
  renderTList();
  let deb; $("#tq").oninput=e=>{ clearTimeout(deb); deb=setTimeout(()=>{TS.q=e.target.value; TS.limit=300; renderTable();},120); };
  $("#tall").onchange=e=>{ TS.all=e.target.checked; TS.limit=300; if(TS.all) loadNCM().then(renderTable); renderTable(); };
  loadData().then(()=>{ renderTList(); renderTable(); });
}
function renderTList(){
  const el=$("#tlist"); if(!el) return;
  el.innerHTML = CAT.map(g=>`<h4>${esc(g.grp)}</h4>`+g.items.map(i=>`<button class="tl ${TS.k===i.k&&!TS.all?"on":""}" data-k="${i.k}">${esc(i.t)}<span class="n">${countOf(i.k)}</span></button>`).join("")).join("");
  el.querySelectorAll(".tl").forEach(b=>b.onclick=()=>{ TS.k=b.dataset.k; TS.all=false; $("#tall").checked=false; TS.limit=300; TS.sel=null; if(TS.k==="ncm") loadNCM().then(renderTable); renderTList(); renderTable(); });
}
function match(r,q){ if(!q) return true; const c=norm(r.c), cd=c.replace(/[^a-z0-9]/g,""), d=norm(r.d);
  const qd=q.replace(/[^a-z0-9]/g,"");
  if(qd && /^\d+$/.test(qd) && cd.startsWith(qd)) return 2;
  return q.split(/\s+/).every(t=> d.includes(t) || c.includes(t) || (t.replace(/[^a-z0-9]/g,"")&&cd.includes(t.replace(/[^a-z0-9]/g,"")))) ? 1 : 0; }
function hl(t,q){ t=esc(t); if(!q) return t; const words=q.split(/\s+/).filter(w=>w.length>1); if(!words.length) return t;
  const p=norm(t); let marks=[]; words.forEach(w=>{let i=0; while((i=p.indexOf(w,i))>-1){marks.push([i,i+w.length]); i+=w.length;}});
  if(!marks.length) return t; marks.sort((a,b)=>a[0]-b[0]); let out="",last=0; for(const [a,b] of marks){ if(a<last) continue; out+=t.slice(last,a)+"<mark>"+t.slice(a,b)+"</mark>"; last=b;} return out+t.slice(last); }
function extraCol(k,r){
  if(k==="cfop") return `<span class="grpchip">${esc(r.e.split(" – ")[0])}</span> ${r.f.map(f=>`<span class="tg">${esc(f)}</span>`).join("")}`;
  if(k==="cest") return `<span class="tg gold">Seg. ${esc(r.s)}</span> <span class="grpchip">${r.n.length} NCM</span>`;
  if(k==="ncm") return r.ipi? `<span class="tg">IPI ${esc(r.ipi)}</span>`:"";
  if(k==="cclasstrib") return `<span class="tg gold">CST ${esc(r.cst)}</span>${r.red?` <span class="tg">red. ${esc(r.red)}</span>`:""}`;
  if(k==="cst_ipi"||k==="cst_pis") return `<span class="tg">${esc(r.t)}</span>`;
  if(k==="modelos") return r.el?`<span class="tg gold">eletrônico</span>`:"";
  return "";
}
function renderTable(){
  const tb=$("#tbody"); if(!tb) return;
  const q=norm(TS.q.trim());
  if(TS.all){
    $("#tttl").textContent = q? "Resultados em todas as tabelas":"Digite um termo para buscar em todas as tabelas"; $("#tsrc").textContent=""; $("#tdesc").textContent="";
    if(!q){ tb.innerHTML=""; return; }
    let html="", total=0;
    CAT.forEach(g=>g.items.forEach(i=>{
      const rows=rowsOf(i.k).filter(r=>match(r,q)); if(!rows.length) return; total+=rows.length;
      html+=`<tr class="hdr"><td colspan=3>${esc(i.t)} — ${rows.length} resultado${rows.length>1?"s":""}</td></tr>`+rows.slice(0,25).map(r=>rowHtml(i.k,r,q)).join("")+(rows.length>25?`<tr class="hdr"><td colspan=3><button class="linkbtn" data-open="${i.k}">ver todos os ${rows.length} em ${esc(i.t)} →</button></td></tr>`:"");
    }));
    tb.innerHTML = html || `<tr><td colspan=3>Nenhum código encontrado.</td></tr>`;
    if(!NCM) tb.insertAdjacentHTML("beforeend",`<tr class="hdr"><td colspan=3><span class="spin"></span> carregando NCM…</td></tr>`);
    wireRows(); tb.querySelectorAll("[data-open]").forEach(b=>b.onclick=()=>{ TS.k=b.dataset.open; TS.all=false; $("#tall").checked=false; renderTList(); renderTable(); });
    return;
  }
  const info=MAN[TS.k]||BYK[TS.k];
  $("#tttl").textContent = info.full||info.t; $("#tsrc").textContent = "Fonte: "+(info.src||"")+(!MAN[TS.k]&&window.__META?" · atualizada em "+window.__META.tabelas_atualizadas_em.split("-").reverse().join("/")+(window.__META.verificado_em!==window.__META.tabelas_atualizadas_em?" (verificada em "+window.__META.verificado_em.split("-").reverse().join("/")+")":""):""); $("#tdesc").textContent = info.desc||"";
  if(TS.k==="ncm" && !NCM){ tb.innerHTML=`<tr><td colspan=3><span class="spin"></span> Carregando a tabela NCM/TIPI (≈11 mil códigos)…</td></tr>`; return; }
  let rows=rowsOf(TS.k).map(r=>({r,m:match(r,q)})).filter(x=>x.m);
  if(q) rows.sort((a,b)=>b.m-a.m);
  rows=rows.map(x=>x.r);
  const shown=rows.slice(0,TS.limit);
  let html="", lastG=null;
  shown.forEach(r=>{
    if(TS.k==="cfop" && !q){ const g=r.c[0]+" · "+r.g; if(g!==lastG){ html+=`<tr class="hdr"><td colspan=3>${esc(r.e)} — ${esc(r.g)}</td></tr>`; lastG=g; } }
    if(TS.k==="cest" && !q){ const g=r.s; if(g!==lastG){ html+=`<tr class="hdr"><td colspan=3>Segmento ${esc(g)} — ${esc((D.cest_seg||{})[g]||"")}</td></tr>`; lastG=g; } }
    html+=rowHtml(TS.k,r,q);
  });
  tb.innerHTML = html || `<tr><td colspan=3>Nenhum código encontrado nesta tabela. Marque “em todas as tabelas” para ampliar.</td></tr>`;
  if(rows.length>TS.limit) tb.insertAdjacentHTML("beforeend",`<tr class="hdr"><td colspan=3><button class="btn more" id="tmore">Mostrar mais (${rows.length-TS.limit} restantes)</button></td></tr>`);
  const m=$("#tmore"); if(m) m.onclick=()=>{ TS.limit+=500; renderTable(); };
  wireRows();
}
function rowHtml(k,r,q){ return `<tr data-k="${k}" data-c="${esc(r.c)}" class="${TS.sel===k+"|"+r.c?"on":""}"><td class="code">${hl(r.c,q)}</td><td>${hl(r.d,q)}${k==="lc116"&&r.h?" <span class='tg'>item</span>":""}</td><td>${extraCol(k,r)}</td></tr>`; }
function wireRows(){ document.querySelectorAll("#tbody tr[data-c]").forEach(tr=>tr.onclick=()=>{ TS.sel=tr.dataset.k+"|"+tr.dataset.c; document.querySelectorAll("#tbody tr.on").forEach(x=>x.classList.remove("on")); tr.classList.add("on"); showDet(tr.dataset.k,tr.dataset.c); }); }

function ncmClean(s){ return (s||"").replace(/\D/g,""); }
function cestsForNcm(n){ n=ncmClean(n); if(!D||!D.cest) return []; return D.cest.filter(c=>c.n.some(x=>{x=ncmClean(x); return x && n.startsWith(x);})); }
function showDet(k,c){
  const r=rowsOf(k).find(x=>x.c===c); if(!r) return; const info=MAN[k]||BYK[k];
  let kv=[["Tabela",esc(info.full||info.t)],["Código",`<b class="code" style="font-family:IBM Plex Mono">${esc(r.c)}</b>`],["Descrição",esc(r.d)]];
  let extra="";
  if(k==="cfop"){ kv.push(["Âmbito",esc(r.e)],["Grupo",esc(r.g)],["Indicadores",r.f.length?r.f.map(f=>`<span class="tg">${esc(f)}</span>`).join(""):"—"],["Uso em NF-e",r.nfe?"Sim":"Não (documentos não eletrônicos ou escrituração)"]);
    const d=r.c[0], pair = {"1":"5","2":"6","3":"7","5":"1","6":"2","7":"3"}[d];
    if(pair){ const pc=pair+r.c.slice(1); const p=D.cfop.find(x=>x.c===pc); if(p) extra+=`<div class="dsec"><h3>Mesmo código no fluxo oposto</h3><p style="margin:0;font-size:13.5px"><button class="linkish" data-goto="cfop|${p.c}">${p.c}</button>${esc(p.d)}</p><p class="note">Referência para cruzamento entrada × saída. Nem sempre é o CFOP correto do destinatário (ex.: 5.405 na venda pode corresponder a 1.403 na compra). Confira a natureza da operação.</p></div>`; }
  }
  if(k==="cest"){ kv.push(["Segmento",esc(r.s+" – "+((D.cest_seg||{})[r.s]||""))],["Item no anexo",esc(r.i)]);
    extra+=`<div class="dsec"><h3>NCM/SH vinculadas</h3>${r.n.map(n=>`<button class="linkish" data-ncm="${esc(n)}">${esc(n)}</button>`).join(" ")||"—"}<p class="note">Clique para abrir a NCM. Quando o anexo indica só a posição ou subposição (ex.: 3917), todas as NCMs que começam por ela estão abrangidas, desde que a descrição também corresponda.</p></div>`; }
  if(k==="ncm"){ const raw=r._raw; kv.push(["IPI (TIPI)",raw[3]?esc(raw[3]):"—"]); if(raw[1]) kv.push(["Ex-tarifário",esc(raw[1])]);
    const cs=cestsForNcm(raw[0]); extra+=`<div class="dsec"><h3>CEST vinculados (${cs.length})</h3>${cs.length? cs.map(x=>`<div class="disp"><div class="ref"><button class="linkish" data-goto="cest|${x.c}">${x.c}</button></div><div class="tx">${esc(x.d)} <span class="grpchip">· Seg. ${esc(x.s)} ${esc((D.cest_seg||{})[x.s]||"")}</span></div></div>`).join("") : `<p class="note" style="margin:0">Nenhum CEST no Conv. 142/18 para esta NCM. A mercadoria, em princípio, não é passível de ST pelos anexos nacionais. Confira o RICMS-RR.</p>`}</div>`; }
  if(k==="cclasstrib"){ kv.push(["CST IBS/CBS",esc(r.cst+" – "+((D.cst_ibscbs||[]).find(x=>x.c===r.cst)||{}).d)],["Fundamento",esc(r.x)],["Redução",r.red||"—"],["Vigência",esc((r.ini||"")+(r.fim?" a "+r.fim:" (sem término)"))]); }
  if(k==="cst_icms"){ extra+=`<div class="dsec"><h3>Composição do CST</h3><p style="margin:0;font-size:13.5px">CST = origem (Tabela A) + tributação (Tabela B). Ex.: <b>0${esc(r.c)}</b> = nacional; <b>1${esc(r.c)}</b> = estrangeira, importação direta; <b>2${esc(r.c)}</b> = estrangeira, adquirida no mercado interno.</p></div>`; }
  if(k==="cst_ibscbs"){ const subs=(D.cclasstrib||[]).filter(x=>x.cst===r.c); extra+=`<div class="dsec"><h3>cClassTrib deste CST (${subs.length})</h3>${subs.slice(0,40).map(x=>`<div class="disp"><div class="ref"><button class="linkish" data-goto="cclasstrib|${x.c}">${x.c}</button></div><div class="tx">${esc(x.d)}${x.red?` <span class="tg">red. ${x.red}</span>`:""}</div></div>`).join("")}</div>`; }
  const txt=`${r.c} – ${r.d}`;
  $("#tdcard").innerHTML=`<div class="dhead"><div class="kicker">${esc(info.t)}</div><h2 style="font-family:IBM Plex Mono;font-size:24px">${esc(r.c)}</h2><p class="ementa">${esc(r.d)}</p>
    <div class="actions"><button class="btn" id="cpc">Copiar código</button><button class="btn" id="cpd">Copiar código + descrição</button><button class="btn gold" id="askc">✦ Explicar com IA</button></div></div>
    <div class="dsec"><dl class="kv">${kv.map(([a,b])=>`<dt>${a}</dt><dd>${b}</dd>`).join("")}</dl></div>${extra}
    <div class="dsec" id="aiC" hidden><div class="ai"><div class="aih">✦ Assistente</div><div class="out" id="aiCout"></div></div></div>`;
  $("#cpc").onclick=()=>copy(r.c,"Código copiado"); $("#cpd").onclick=()=>copy(txt,"Copiado");
  $("#askc").onclick=()=>{ $("#aiC").hidden=false; askAI2(`Explique, para um auditor fiscal estadual, o código ${r.c} da tabela "${info.full||info.t}" (descrição oficial: "${r.d}"). Traga: ## Quando se aplica; ## Tratamento tributário e campos relacionados na NF-e/EFD; ## Erros e inconsistências comuns que a fiscalização deve verificar; ## Cruzamentos úteis. Máximo de 300 palavras. Não invente dispositivos legais.`, $("#aiCout")); };
  document.querySelectorAll("#tdcard [data-goto]").forEach(b=>b.onclick=()=>{ const [kk,cc]=b.dataset.goto.split("|"); gotoCode(kk,cc); });
  document.querySelectorAll("#tdcard [data-ncm]").forEach(b=>b.onclick=()=>{ TS.k="ncm"; TS.all=false; TS.q=b.dataset.ncm; $("#tq").value=b.dataset.ncm; $("#tall").checked=false; loadNCM().then(()=>{renderTList(); renderTable(); const first=document.querySelector("#tbody tr[data-c]"); if(first) first.click();}); renderTList(); renderTable(); });
  if(innerWidth<1100) $("#tdet").scrollIntoView({behavior:"smooth"});
}
function gotoCode(k,c){ TS.k=k; TS.all=false; TS.q=c; $("#tq").value=c; $("#tall").checked=false; renderTList(); renderTable(); TS.sel=k+"|"+c; showDet(k,c); }

/* ===================== IA ===================== */
let sp=null; function getS(){ if(!sp) sp=(window.claude&&claude.use)?claude.use("sample").catch(()=>null):Promise.resolve(null); return sp; }
function md(s){ const L=esc(s).split("\n"); let h="",ul=false; for(let l of L){ l=l.replace(/\*\*(.+?)\*\*/g,"<b>$1</b>");
  if(/^\s*#{1,4}\s+/.test(l)){ if(ul){h+="</ul>";ul=false;} h+=`<h4>${l.replace(/^\s*#{1,4}\s+/,"")}</h4>`; }
  else if(/^\s*[-*•]\s+/.test(l)){ if(!ul){h+="<ul>";ul=true;} h+=`<li>${l.replace(/^\s*[-*•]\s+/,"")}</li>`; }
  else if(l.trim()){ if(ul){h+="</ul>";ul=false;} h+=`<p>${l}</p>`; } } if(ul) h+="</ul>"; return h; }
async function askAI2(prompt,out){
  const s=await getS(); if(!s){ out.innerHTML="<p>Assistente de IA indisponível nesta visualização.</p>"; return; }
  out.innerHTML=`<p style="color:var(--ink3)"><span class="spin"></span> Consultando…</p>`;
  try{ const r=await s([{role:"user",content:"Você é especialista em legislação tributária brasileira (ICMS, ST, NF-e, EFD, tributos federais e Reforma Tributária). Responda em português, de forma técnica e objetiva, com títulos '## ' e listas '- '. Não invente números de artigos; sinalize incertezas.\n\n"+prompt}],{modelTier:"default",cache:true,onText:({text})=>{out.innerHTML=md(text);}});
    out.innerHTML=md(r.text)+`<div class="warnline">⚠ Conteúdo gerado por IA. Confira na legislação.</div>`;
  }catch(e){ out.innerHTML=(e&&e.text?md(e.text):"")+`<p class="warnline">${e&&e.code==="rate_limited"?"Limite de uso atingido. Tente mais tarde.":"Não foi possível obter a resposta."}</p>`; }
}

/* ===================== FERRAMENTAS ===================== */
const num = id => { const v=($("#"+id).value||"").toString().replace(/\./g,"").replace(",","."); const n=parseFloat(v); return isFinite(n)?n:0; };
const pnum = id => num(id)/100;
function ufOpts(sel){ return UFS.map(u=>`<option value="${u[1]}" ${u[1]===sel?"selected":""}>${u[1]} – ${u[2]}</option>`).join(""); }
function aliqInter(o,d,origem){
  if(o===d) return {a:null,why:"Operação interna: aplica-se a alíquota interna da UF."};
  if(["1","2","3","8"].includes(origem)) return {a:.04,why:"Origem "+origem+": mercadoria importada ou com conteúdo de importação > 40% → 4% (Res. Senado 13/2012)."};
  const ro=UFS.find(u=>u[1]===o)[3], rd=UFS.find(u=>u[1]===d)[3];
  const sulSE = (ro==="S"||ro==="SE") && o!=="ES";
  const destNNECO = ["N","NE","CO"].includes(rd) || d==="ES";
  if(sulSE && destNNECO) return {a:.07,why:`Origem ${o} (Sul/Sudeste, exceto ES) → destino ${d} (${d==="ES"?"Espírito Santo":REG[rd]}) → 7% (Res. Senado 22/1989).`};
  return {a:.12,why:"Regra geral → 12% (Res. Senado 22/1989)."};
}
function buildFerramentas(){
  $("#view-ferramentas").innerHTML=`<div class="vwrap"><div class="tools">

  <div class="card tool"><h3>ICMS-ST com MVA (original ou ajustada)</h3><p class="sub">Convênio ICMS 142/18, cláusulas 11ª a 14ª · LC 87/96, art. 8º</p>
   <div class="frm">
    <label>Valor dos produtos (R$)<input id="st_v" value="1000,00"></label>
    <label>IPI (R$)<input id="st_ipi" value="0"></label>
    <label>Frete + seguro + outras (R$)<input id="st_f" value="0"></label>
    <label>Descontos (R$)<input id="st_d" value="0"></label>
    <label>MVA original (%)<input id="st_mva" value="30"></label>
    <label>Alíquota interna no destino (%)<input id="st_ai" value="20"></label>
    <label>Alíquota da operação do remetente (%)<input id="st_ae" value="12"></label>
    <label>Redução da BC-ST (%)<input id="st_red" value="0"></label>
    <label class="chk"><input type="checkbox" id="st_aj" checked> Aplicar MVA ajustada (operação interestadual com alíquota inferior à interna)</label>
   </div><div class="res2" id="st_out"></div>
   <div class="formula">MVA ajustada = [(1 + MVA orig) × (1 − ALQ inter) ÷ (1 − ALQ intra)] − 1
BC-ST = (Produtos + IPI + Frete/Seg/Outras − Desc.) × (1 + MVA) × (1 − Red.)
ICMS-ST = BC-ST × ALQ intra − ICMS próprio</div></div>

  <div class="card tool"><h3>DIFAL – consumidor final</h3><p class="sub">EC 87/2015 · LC 190/2022 · Convênio ICMS 236/2021</p>
   <div class="frm">
    <label>Valor da operação (R$)<input id="df_v" value="1000,00"></label>
    <label>Alíquota interestadual (%)<input id="df_ae" value="12"></label>
    <label>Alíquota interna do destino (%)<input id="df_ai" value="20"></label>
    <label>FCP do destino (%)<input id="df_fcp" value="0"></label>
    <label class="full">Metodologia<select id="df_m"><option value="dupla">Base dupla (“por dentro” – BC recalculada com a alíquota do destino)</option><option value="unica">Base única (valor da operação)</option></select></label>
   </div><div class="res2" id="df_out"></div>
   <div class="formula">Base dupla: BC = (V − V × ALQ inter) ÷ (1 − ALQ intra);  DIFAL = BC × ALQ intra − V × ALQ inter
Base única: DIFAL = V × (ALQ intra − ALQ inter)</div>
   <p class="note">A metodologia aplicável depende da legislação da UF de destino. Confira o RICMS do destino.</p></div>

  <div class="card tool"><h3>Alíquota interestadual</h3><p class="sub">Res. Senado 22/1989 e 13/2012</p>
   <div class="frm">
    <label>UF de origem<select id="ai_o">${ufOpts("SP")}</select></label>
    <label>UF de destino<select id="ai_d">${ufOpts("RR")}</select></label>
    <label class="full">Origem da mercadoria (Tabela A)<select id="ai_g">${MAN.origem.rows.map(r=>`<option value="${r[0]}">${r[0]} – ${esc(r[1]).slice(0,70)}</option>`).join("")}</select></label>
   </div><div class="res2" id="ai_out"></div></div>

  <div class="card tool"><h3>Chave de acesso NF-e / NFC-e / CT-e</h3><p class="sub">Decodifica os 44 caracteres e valida o dígito verificador (módulo 11)</p>
   <div class="frm"><label class="full">Chave de acesso<input id="ch_k" placeholder="44 caracteres (espaços são ignorados)"></label></div>
   <div class="res2" id="ch_out">Cole uma chave para analisar.</div>
   <p class="note">A partir de julho de 2026 o CNPJ pode ser alfanumérico (IN RFB 2.229/2024). No cálculo do DV, cada caractere vale o seu código ASCII − 48.</p></div>

  <div class="card tool"><h3>Validador de CNPJ / CPF</h3><p class="sub">CNPJ numérico e alfanumérico (IN RFB 2.229/2024) · CPF</p>
   <div class="frm"><label class="full">CNPJ ou CPF<input id="dc_v" placeholder="ex.: 12.ABC.345/01DE-35 ou 000.000.000-00"></label></div>
   <div class="res2" id="dc_out">Informe um documento.</div></div>

  <div class="card tool"><h3>Decadência e prescrição</h3><p class="sub">CTN arts. 150, § 4º, 173, I, e 174 · Súmulas 436 e 555 do STJ</p>
   <div class="frm">
    <label>Data do fato gerador<input type="date" id="dp_fg"></label>
    <label>Situação<select id="dp_s"><option value="pago">Houve declaração e pagamento (ainda que parcial)</option><option value="semp">Sem pagamento antecipado</option><option value="dolo">Dolo, fraude ou simulação</option></select></label>
    <label>Constituição definitiva do crédito (opcional)<input type="date" id="dp_cd"></label>
    <label>Hoje<input type="date" id="dp_h"></label>
   </div><div class="res2" id="dp_out"></div>
   <p class="note">Regra prática: com pagamento e sem dolo, conta-se do fato gerador (art. 150, § 4º). Sem pagamento ou com dolo, fraude ou simulação, conta-se do 1º dia do exercício seguinte (art. 173, I; STJ, Tema 163 e Súmula 555). Débito declarado e não pago: a declaração constitui o crédito (Súmula 436) e corre a prescrição. Causas de interrupção e suspensão não são consideradas no cálculo.</p></div>

  <div class="card tool"><h3>Cálculo “por dentro” e carga efetiva</h3><p class="sub">LC 87/96, art. 13, § 1º, I</p>
   <div class="frm">
    <label>Valor sem ICMS (R$)<input id="pd_v" value="1000,00"></label>
    <label>Alíquota (%)<input id="pd_a" value="20"></label>
    <label>Redução de BC (%)<input id="pd_r" value="0"></label>
   </div><div class="res2" id="pd_out"></div>
   <div class="formula">Valor com ICMS = Valor sem ICMS ÷ (1 − ALQ × (1 − Red.))
Carga efetiva = ALQ × (1 − Red.)</div></div>

  <div class="card tool"><h3>Cronograma da Reforma Tributária</h3><p class="sub">EC 132/2023 (ADCT, arts. 125 a 133) · LC 214/2025</p>
   <div class="timeline">
    <div class="y">2026</div><div>Fase de teste: CBS 0,9% e IBS 0,1% destacados no documento fiscal, compensáveis com PIS/Cofins ou outros tributos.</div>
    <div class="y">2027</div><div>CBS plena; extinção do PIS e da Cofins; início do Imposto Seletivo; IPI reduzido a zero (exceto produtos com industrialização incentivada na ZFM). IBS a 0,1% (0,05% estadual + 0,05% municipal) em 2027 e 2028.</div>
    <div class="y">2029</div><div>Início da transição ICMS/ISS → IBS: ICMS e ISS a 90% das alíquotas.</div>
    <div class="y">2030</div><div>ICMS e ISS a 80%.</div>
    <div class="y">2031</div><div>ICMS e ISS a 70%.</div>
    <div class="y">2032</div><div>ICMS e ISS a 60%.</div>
    <div class="y">2033</div><div>Extinção do ICMS e do ISS; IBS e CBS em vigência plena.</div>
   </div></div>
  </div></div>`;
  const today=new Date().toISOString().slice(0,10); $("#dp_h").value=today;
  const S=()=>{ // ST
    const base=num("st_v")+num("st_ipi")+num("st_f")-num("st_d"), baseProp=num("st_v")+num("st_f")-num("st_d");
    const mva=pnum("st_mva"), ai=pnum("st_ai"), ae=pnum("st_ae"), red=pnum("st_red");
    const useAj=$("#st_aj").checked && ae<ai;
    const mvaAj=useAj? ((1+mva)*(1-ae)/(1-ai))-1 : mva;
    const bcst=base*(1+mvaAj)*(1-red), prop=baseProp*ae, icmsst=Math.max(0,bcst*ai-prop);
    $("#st_out").innerHTML=`<table><tr><td>MVA aplicada ${useAj?"(ajustada)":"(original)"}</td><td>${pct(mvaAj)}</td></tr><tr><td>Base de cálculo da ST</td><td>${brl(bcst)}</td></tr><tr><td>ICMS próprio do remetente</td><td>${brl(prop)}</td></tr><tr><td>ICMS da operação própria do destino (BC-ST × ${pct(ai)})</td><td>${brl(bcst*ai)}</td></tr><tr class="tot"><td>ICMS-ST a reter</td><td>${brl(icmsst)}</td></tr><tr><td>Valor total da nota (com IPI e ST)</td><td>${brl(base+icmsst)}</td></tr></table>`;
  };
  const DF=()=>{ const v=num("df_v"), ae=pnum("df_ae"), ai=pnum("df_ai"), fcp=pnum("df_fcp"), m=$("#df_m").value;
    let bc, dif, fc; if(m==="dupla"){ bc=(v-v*ae)/(1-ai-fcp); dif=bc*ai-v*ae; fc=bc*fcp; } else { bc=v; dif=v*(ai-ae); fc=v*fcp; }
    $("#df_out").innerHTML=`<table><tr><td>ICMS de origem (V × ${pct(ae)})</td><td>${brl(v*ae)}</td></tr><tr><td>Base de cálculo no destino</td><td>${brl(bc)}</td></tr><tr class="tot"><td>DIFAL devido ao destino</td><td>${brl(dif)}</td></tr>${fcp?`<tr><td>FCP</td><td>${brl(fc)}</td></tr>`:""}</table>`; };
  const AI=()=>{ const r=aliqInter($("#ai_o").value,$("#ai_d").value,$("#ai_g").value); $("#ai_out").innerHTML=`<div style="font-size:22px;font-weight:700;color:var(--navy);font-family:IBM Plex Mono">${r.a===null?"Interna":pct(r.a)}</div><div>${esc(r.why)}</div>`; };
  const CH=()=>{ const k=($("#ch_k").value||"").toUpperCase().replace(/[^0-9A-Z]/g,""); const o=$("#ch_out");
    if(!k){ o.textContent="Cole uma chave para analisar."; return; }
    if(k.length!==44){ o.innerHTML=`<span class="bad">A chave deve ter 44 caracteres (informados: ${k.length}).</span>`; return; }
    const val=c=>c.charCodeAt(0)-48; let s=0,w=2; for(let i=42;i>=0;i--){ s+=val(k[i])*w; w=w===9?2:w+1; } let dv=11-(s%11); if(dv>=10) dv=0;
    const uf=UFS.find(u=>u[0]===k.slice(0,2)); const mod=k.slice(20,22); const mods={"55":"NF-e","65":"NFC-e","57":"CT-e","67":"CT-e OS","58":"MDF-e","63":"BP-e","66":"NF3e","62":"NFCom","99":"—"};
    const te=(MAN.tpEmis.rows.find(r=>r[0]===k[34])||[,"?"])[1]; const cn=k.slice(6,20);
    o.innerHTML=`<table>
      <tr><td>DV informado / calculado</td><td>${k[43]} / ${dv} ${+k[43]===dv?'<span class="ok">✔ válido</span>':'<span class="bad">✘ inválido</span>'}</td></tr>
      <tr><td>UF (cUF)</td><td>${k.slice(0,2)} – ${uf?uf[1]:"?"}</td></tr><tr><td>Ano/mês de emissão</td><td>${k.slice(4,6)}/20${k.slice(2,4)}</td></tr>
      <tr><td>CNPJ/CPF do emitente</td><td>${esc(cn.replace(/^(\w{2})(\w{3})(\w{3})(\w{4})(\w{2})$/,"$1.$2.$3/$4-$5"))} ${validaCNPJ(cn)?'<span class="ok">✔</span>':'<span class="bad" title="pode ser CPF (produtor rural) com zeros à esquerda">?</span>'}</td></tr>
      <tr><td>Modelo</td><td>${mod} – ${mods[mod]||"?"}</td></tr><tr><td>Série</td><td>${+k.slice(22,25)}</td></tr><tr><td>Número</td><td>${(+k.slice(25,34)).toLocaleString("pt-BR")}</td></tr>
      <tr><td>Tipo de emissão</td><td>${k[34]} – ${esc(te)}</td></tr><tr><td>Código numérico (cNF)</td><td>${k.slice(35,43)}</td></tr></table>`; };
  const DC=()=>{ const raw=($("#dc_v").value||"").toUpperCase().replace(/[^0-9A-Z]/g,""); const o=$("#dc_out"); if(!raw){ o.textContent="Informe um documento."; return; }
    if(raw.length===11 && /^\d+$/.test(raw)){ o.innerHTML= validaCPF(raw)?'<span class="ok">✔ CPF válido</span>':'<span class="bad">✘ CPF inválido</span>'; return; }
    if(raw.length===14){ const ok=validaCNPJ(raw); o.innerHTML= ok?`<span class="ok">✔ CNPJ válido</span>${/[A-Z]/.test(raw)?" (alfanumérico)":""} · raiz ${raw.slice(0,8)} · ${raw.slice(8,12)==="0001"?"matriz":"filial "+raw.slice(8,12)}`:'<span class="bad">✘ CNPJ inválido</span>'; return; }
    o.innerHTML='<span class="bad">Tamanho inválido: CPF tem 11 dígitos e CNPJ tem 14 caracteres.</span>'; };
  const DP=()=>{ const fg=$("#dp_fg").value, s=$("#dp_s").value, cd=$("#dp_cd").value, hj=new Date($("#dp_h").value||today); const o=$("#dp_out");
    if(!fg){ o.innerHTML="Informe a data do fato gerador."; return; }
    const f=new Date(fg+"T12:00:00"); let lim, base;
    if(s==="pago"){ lim=new Date(f); lim.setFullYear(lim.getFullYear()+5); base="Art. 150, § 4º, do CTN: 5 anos contados do fato gerador."; }
    else { lim=new Date(f.getFullYear()+1+5,0,1); lim.setDate(lim.getDate()-1); base="Art. 173, I, do CTN: 5 anos contados do 1º dia do exercício seguinte àquele em que o lançamento poderia ter sido efetuado."; }
    const fd=d=>d.toLocaleDateString("pt-BR"); const dias=Math.ceil((lim-hj)/864e5);
    let html=`<table><tr><td>Fundamento</td><td style="text-align:left;font-family:inherit">${base}</td></tr><tr class="tot"><td>Prazo decadencial até</td><td>${fd(lim)}</td></tr><tr><td>Situação hoje</td><td>${dias>=0?`<span class="ok">${dias} dias restantes</span>`:`<span class="bad">decaído há ${-dias} dias</span>`}</td></tr>`;
    if(cd){ const c=new Date(cd+"T12:00:00"); const p=new Date(c); p.setFullYear(p.getFullYear()+5); const pd=Math.ceil((p-hj)/864e5);
      html+=`<tr><td>Prescrição (art. 174) até</td><td>${fd(p)}</td></tr><tr><td>Situação hoje</td><td>${pd>=0?`<span class="ok">${pd} dias restantes</span>`:`<span class="bad">prescrito há ${-pd} dias</span>`}</td></tr>`; }
    o.innerHTML=html+"</table>"; };
  const PD=()=>{ const v=num("pd_v"), a=pnum("pd_a"), r=pnum("pd_r"); const ce=a*(1-r); const vc=v/(1-ce);
    $("#pd_out").innerHTML=`<table><tr><td>Carga efetiva</td><td>${pct(ce)}</td></tr><tr class="tot"><td>Valor com ICMS (base “por dentro”)</td><td>${brl(vc)}</td></tr><tr><td>ICMS embutido</td><td>${brl(vc-v)}</td></tr><tr><td>Alíquota “por fora” equivalente</td><td>${pct((vc-v)/v)}</td></tr></table>`; };
  const bind=(ids,fn)=>{ ids.forEach(i=>{ const el=$("#"+i); el.addEventListener("input",fn); el.addEventListener("change",fn); }); fn(); };
  bind(["st_v","st_ipi","st_f","st_d","st_mva","st_ai","st_ae","st_red","st_aj"],S);
  bind(["df_v","df_ae","df_ai","df_fcp","df_m"],DF);
  bind(["ai_o","ai_d","ai_g"],AI); bind(["ch_k"],CH); bind(["dc_v"],DC); bind(["dp_fg","dp_s","dp_cd","dp_h"],DP); bind(["pd_v","pd_a","pd_r"],PD);
}
function validaCNPJ(c){ c=(c||"").toUpperCase().replace(/[^0-9A-Z]/g,""); if(c.length!==14||!/^[0-9A-Z]{12}\d{2}$/.test(c)||/^(\d)\1+$/.test(c)) return false;
  const v=ch=>ch.charCodeAt(0)-48; const dv=(n)=>{ const w=n===12?[5,4,3,2,9,8,7,6,5,4,3,2]:[6,5,4,3,2,9,8,7,6,5,4,3,2]; let s=0; for(let i=0;i<n;i++) s+=v(c[i])*w[i]; const r=s%11; return r<2?0:11-r; };
  return dv(12)===+c[12] && dv(13)===+c[13]; }
function validaCPF(c){ if(/^(\d)\1+$/.test(c)) return false; const dv=n=>{ let s=0; for(let i=0;i<n;i++) s+=+c[i]*(n+1-i); const r=(s*10)%11; return r===10?0:r; }; return dv(9)===+c[9] && dv(10)===+c[10]; }

/* ===================== GUIA ===================== */
const STF_TEMA=n=>`https://portal.stf.jus.br/jurisprudenciaRepercussao/listarProcesso.asp?PesquisaEm=tema&PesquisaEm=controversia&PesquisaEm=ambos&situacaoRG=TODAS&situacaoAtual=S&txtTituloTema=&numeroTemaInicial=${n}&numeroTemaFinal=${n}&acao=pesquisarProcesso`;
const STJ_SUM=n=>`https://scon.stj.jus.br/SCON/sumstj/toc.jsp?livre=%40num%3D${n}`;
const STJ_TEMA=n=>`https://processo.stj.jus.br/repetitivos/temas_repetitivos/pesquisa.jsp?novaConsulta=true&tipo_pesquisa=T&cod_tema_inicial=${n}&cod_tema_final=${n}`;
const STF_BUSCA=q=>"https://www.google.com/search?q="+encodeURIComponent('site:portal.stf.jus.br "'+q+'"');
const JUR=[
 ["STF · Tema 201 (RE 593.849)","É devida a restituição da diferença do ICMS-ST pago a mais quando a base de cálculo efetiva da operação for inferior à presumida.","ST",STF_TEMA(201)],
 ["STF · Tema 1093 (RE 1.287.019) e ADI 5469","A cobrança do DIFAL nas operações destinadas a consumidor final não contribuinte pressupõe lei complementar (editada a LC 190/2022).","DIFAL",STF_TEMA(1093)],
 ["STF · ADIs 7066, 7070 e 7078","O DIFAL a não contribuinte com base na LC 190/2022 pode ser cobrado após a noventena (a partir de abril de 2022).","DIFAL",STF_BUSCA("ADI 7066")],
 ["STF · ADC 49","Não incide ICMS no deslocamento de mercadorias entre estabelecimentos do mesmo titular. A LC 204/2023 ajustou a LC 87/96 e assegurou a transferência dos créditos.","Transferência",STF_BUSCA("ADC 49")],
 ["STF · Tema 69 (RE 574.706)","O ICMS não compõe a base de cálculo do PIS e da Cofins.","Federal",STF_TEMA(69)],
 ["STF · Tema 745 (RE 714.139)","Adotada a seletividade, é inconstitucional alíquota de ICMS sobre energia elétrica e telecomunicações superior à das operações em geral.","Alíquota",STF_TEMA(745)],
 ["STF · RHC 163.334","O contribuinte que, de forma contumaz e com dolo de apropriação, deixa de recolher o ICMS cobrado do adquirente incide no art. 2º, II, da Lei 8.137/90.","Penal",STF_BUSCA("RHC 163334")],
 ["STF · Súmula Vinculante 24","Não se tipifica crime material contra a ordem tributária (art. 1º, I a IV, da Lei 8.137/90) antes do lançamento definitivo do tributo.","Penal",STF_BUSCA("Súmula Vinculante 24")],
 ["STJ · Súmula 166","Não constitui fato gerador do ICMS o simples deslocamento de mercadoria de um para outro estabelecimento do mesmo contribuinte.","Transferência",STJ_SUM(166)],
 ["STJ · Súmula 431","É ilegal a cobrança de ICMS com base em valores previstos em pauta fiscal.","Base de cálculo",STJ_SUM(431)],
 ["STJ · Súmula 457","Os descontos incondicionais nas operações mercantis não se incluem na base de cálculo do ICMS.","Base de cálculo",STJ_SUM(457)],
 ["STJ · Súmula 509","É lícito ao comerciante de boa-fé aproveitar os créditos de ICMS decorrentes de nota fiscal posteriormente declarada inidônea, quando demonstrada a veracidade da compra e venda.","Crédito",STJ_SUM(509)],
 ["STJ · Súmula 391","O ICMS incide sobre o valor da tarifa de energia elétrica correspondente à demanda de potência efetivamente utilizada.","Energia",STJ_SUM(391)],
 ["STJ · Tema 986","A TUST e a TUSD, quando lançadas na fatura de energia como encargo suportado pelo consumidor final, integram a base de cálculo do ICMS.","Energia",STJ_TEMA(986)],
 ["STJ · Súmula 649","Não incide ICMS sobre o serviço de transporte interestadual de mercadorias destinadas ao exterior.","Exportação",STJ_SUM(649)],
 ["STJ · Súmula 436","A entrega de declaração pelo contribuinte reconhecendo débito fiscal constitui o crédito tributário, dispensada qualquer outra providência por parte do fisco.","Decadência",STJ_SUM(436)],
 ["STJ · Súmula 555","Sem declaração do débito, o prazo decadencial conta-se exclusivamente na forma do art. 173, I, do CTN nos tributos sujeitos a lançamento por homologação.","Decadência",STJ_SUM(555)],
 ["STJ · Súmula 360","O benefício da denúncia espontânea não se aplica aos tributos sujeitos a lançamento por homologação regularmente declarados, mas pagos a destempo.","Penalidade",STJ_SUM(360)],
 ["STJ · Súmula 430","O inadimplemento da obrigação tributária pela sociedade não gera, por si só, a responsabilidade solidária do sócio-gerente.","Responsabilidade",STJ_SUM(430)],
 ["STJ · Súmula 435","Presume-se dissolvida irregularmente a empresa que deixar de funcionar no seu domicílio fiscal sem comunicar aos órgãos competentes, o que legitima o redirecionamento da execução fiscal para o sócio-gerente.","Responsabilidade",STJ_SUM(435)],
 ["STJ · Súmula 392","A Fazenda Pública pode substituir a CDA até a sentença dos embargos, quando se tratar de correção de erro material ou formal, vedada a modificação do sujeito passivo.","Execução",STJ_SUM(392)]
];
function buildGuia(){
  $("#view-guia").innerHTML=`<div class="vwrap"><div class="gsearch"><input id="gq" type="search" placeholder="Filtrar o guia (ex.: decadência, ST, crédito, energia)…"></div><div class="guide" id="gbox">

  <div class="card gcard" data-g="roteiro auditoria st substituicao mva pmpf cest gia-st"><h3>Roteiro de auditoria de ICMS-ST</h3><ul>
   <li><b>Enquadramento:</b> confira NCM + descrição + CEST contra o anexo do Conv. 142/18 e o RICMS-RR. Ambos precisam corresponder.</li>
   <li><b>Acordo interestadual:</b> verifique se há convênio ou protocolo com a UF de origem. Sem acordo, a responsabilidade é do destinatário (antecipação na entrada).</li>
   <li><b>Base de cálculo:</b> verifique se há PMPF ou preço sugerido; se não, use MVA, ajustada quando a alíquota interestadual for menor que a interna. Inclua IPI, frete, seguro e outras despesas.</li>
   <li><b>NF-e:</b> confira CST 10/30/60/70 (ou CSOSN 201/202/203/500), modBCST, pMVAST, vBCST, vICMSST e CEST. CFOP de saída: 5.401/5.403 e 6.401/6.403 (substituto); 5.405 e 6.404 (imposto já retido).</li>
   <li><b>Recolhimento:</b> compare a GNRE ou o DAR com a nota (vICMSST) e com a GIA-ST/EFD (E200/E210) do substituto inscrito.</li>
   <li><b>Ressarcimento e restituição:</b> verifique os documentos de suporte e a regra estadual (Tema 201 do STF quando a base efetiva for menor).</li></ul></div>

  <div class="card gcard" data-g="cruzamentos nf-e efd nfc-e c100 c170 c190 e110 manifestacao inventario"><h3>Cruzamentos de dados mais úteis</h3><ul>
   <li><span class="ref">NF-e × EFD C100/C170</span> notas de entrada e saída não escrituradas (omissão de receita ou de entradas).</li>
   <li><span class="ref">C190 × E110</span> confronto do total dos débitos e créditos analíticos com a apuração.</li>
   <li><span class="ref">Manifestação 210220/210240</span> desconhecimento ou operação não realizada: indício de nota fria ou de uso indevido de IE.</li>
   <li><span class="ref">NFC-e × meios de pagamento</span> vendas declaradas × informações de cartão e PIX (omissão de saídas).</li>
   <li><span class="ref">H010 × entradas e saídas</span> levantamento quantitativo de estoque por item (0200).</li>
   <li><span class="ref">CFOP × CST</span> combinações incoerentes (ex.: CFOP 5.405 com CST 00; 6.108 com indFinal 0).</li>
   <li><span class="ref">Créditos × fornecedor</span> emitente com IE suspensa, baixada ou inapta na data da emissão.</li>
   <li><span class="ref">ALC/ZFM</span> CFOP 6.109/6.110 sem internamento SUFRAMA: isenção indevida.</li></ul></div>

  <div class="card gcard" data-g="prazos decadencia prescricao cancelamento nf-e cc-e guarda documentos"><h3>Prazos-chave</h3><ul>
   <li><b>Decadência:</b> 5 anos, contados do fato gerador (CTN, art. 150, § 4º) ou do 1º dia do exercício seguinte (art. 173, I).</li>
   <li><b>Prescrição:</b> 5 anos da constituição definitiva do crédito (art. 174). Interrompe-se pelo despacho que ordena a citação, pelo protesto, por ato judicial que constitua em mora ou pelo reconhecimento do débito.</li>
   <li><b>Guarda de documentos e XML:</b> enquanto não decair o direito da Fazenda (CTN, art. 195, par. único; Ajuste SINIEF 07/05).</li>
   <li><b>Cancelamento de NF-e:</b> prazo regulamentar de 24 horas da autorização (Ato COTEPE/ICMS 33/2008). Fora do prazo, depende da legislação da UF.</li>
   <li><b>CC-e:</b> não pode alterar variáveis do cálculo do imposto (base, alíquota, valores, quantidade), dados cadastrais que mudem o remetente ou destinatário, nem a data de emissão ou de saída.</li>
   <li><b>Denúncia espontânea:</b> exclui a multa se feita antes de qualquer procedimento fiscal (CTN, art. 138). Não se aplica a débito declarado e pago fora do prazo (Súmula 360 do STJ).</li></ul></div>

  <div class="card gcard" data-g="cst cfop combinacoes coerencia st monofasico csosn"><h3>Coerência CST × CFOP (referência rápida)</h3><ul>
   <li><span class="ref">CST x10 / x70</span> o emitente retém ST (substituto). CFOP 5.401/5.403, 6.401/6.403.</li>
   <li><span class="ref">CST x60</span> mercadoria com ICMS-ST já retido (substituído). CFOP 5.405 e 6.404 (imposto já retido anteriormente).</li>
   <li><span class="ref">CST x02/x15/x53/x61</span> combustíveis monofásicos (LC 192/2022; Conv. 199/22 e 15/23).</li>
   <li><span class="ref">CST x40/x41</span> isenção ou não incidência; preencher motDesICMS quando houver desoneração.</li>
   <li><span class="ref">CST x51</span> diferimento (total ou parcial); verifique a previsão no RICMS.</li>
   <li><span class="ref">CSOSN 500</span> Simples Nacional revendendo mercadoria com ST já retido (equivale ao CST 60).</li>
   <li><span class="ref">6.107/6.108</span> venda a não contribuinte de outra UF: DIFAL devido pelo remetente.</li></ul></div>

  <div class="card gcard" data-g="jurisprudencia sumulas temas stf stj" style="grid-column:1/-1"><h3>Jurisprudência essencial (resumo dos enunciados)</h3><div id="jlist">${JUR.map(j=>`<div class="jur" data-g="${norm(j.slice(0,3).join(" "))}"><a class="jlink" href="${esc(j[3])}" target="_blank" rel="noopener" title="Abrir na página oficial do tribunal"><b>${esc(j[0])}</b> ↗</a> <span class="tg">${esc(j[2])}</span><br>${esc(j[1])}</div>`).join("")}</div>
   <p class="note">Clique no título para abrir a página oficial (STF: repercussão geral; STJ: súmulas e repetitivos). ADI, ADC, RHC e Súmula Vinculante abrem uma busca direcionada ao portal do STF. Enunciados resumidos. Confira o inteiro teor e a eventual modulação de efeitos no site do tribunal antes de citar em ato administrativo.</p></div>
  </div></div>`;
  $("#gq").oninput=e=>{ const q=norm(e.target.value); document.querySelectorAll("#gbox > .gcard").forEach(c=>{ const t=norm(c.dataset.g+" "+c.textContent); c.style.display=!q||q.split(/\s+/).every(w=>t.includes(w))?"":"none"; });
    document.querySelectorAll(".jur").forEach(j=>{ j.style.display=!q||q.split(/\s+/).every(w=>j.dataset.g.includes(w))?"":"none"; }); };
}

/* ===================== INIT ===================== */
document.addEventListener("meta-ok",()=>{ if(built.tabelas) renderTable(); });
route();
window.__gotoCode=(k,c)=>{ location.hash="#tabelas"; setTimeout(()=>{ loadData().then(()=>{ if(k==="ncm") loadNCM().then(()=>gotoCode(k,c)); else gotoCode(k,c); }); },50); };
})();
