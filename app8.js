/* =====================================================================
   Módulo 8 – Calculadora da Reforma Tributária (CBS / IBS / IS)
   Interface na aba "Ferramentas do auditor" para o motor calc_rtc.js,
   com as tabelas oficiais da Receita Federal (data/calc_rtc.json).
   ===================================================================== */
(function(){
const $ = s => document.querySelector(s);
const esc = s => (s==null?"":String(s)).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
let E = null, carregando = null;
const REPO = "https://github.com/ReceitaFederal/calculadora-rtc-regime-regular";
const fR = v => window.CalcRTC.fmtR(v), fP = v => window.CalcRTC.fmtP(v);
const num = id => { const v = ($("#"+id)||{}).value; if(v==null) return null; let t = String(v).trim().replace(/\s|R\$/g,""); if(!t) return null;
  if(/,/.test(t)) t = t.replace(/\./g,"").replace(",", "."); else if(/^\d{1,3}(\.\d{3})+$/.test(t)) t = t.replace(/\./g,"");
  const n = parseFloat(t); return isFinite(n) ? n : null; };
const numDot = num;

function carregar(){
  if(E) return Promise.resolve(E);
  if(!carregando) carregando = fetch("data/calc_rtc.json").then(r => r.json()).then(D => (E = window.CalcRTC.criar(D)));
  return carregando;
}
const hoje = () => new Date(Date.now() - new Date().getTimezoneOffset()*60000).toISOString().slice(0,10);

function montar(){
  const tools = document.querySelector("#view-ferramentas .tools"); if(!tools || $("#rtcTool")) return;
  tools.insertAdjacentHTML("afterbegin", `<div class="card tool" id="rtcTool" style="grid-column:1/-1">
    <h3>Calculadora da Reforma Tributária – CBS, IBS e Imposto Seletivo</h3>
    <p class="sub">Mesmas tabelas e fórmulas da <a href="${REPO}" target="_blank" rel="noopener">Calculadora de Tributos da Receita Federal</a> (código aberto, LC 214/2025, regime regular) · <span id="rtcVer">carregando base…</span></p>
    <div class="frm">
      <label>Data do fato gerador<input id="rtc_data" type="date"></label>
      <label>UF<select id="rtc_uf"></select></label>
      <label class="full">cClassTrib (classificação tributária)<input id="rtc_cct" list="rtc_cl" placeholder="digite o código ou parte da descrição, ex.: 000001 ou cesta básica"><datalist id="rtc_cl"></datalist></label>
      <label>Base de cálculo (R$)<input id="rtc_bc" inputmode="decimal" placeholder="1.000,00"></label>
      <label>Quantidade<input id="rtc_q" inputmode="decimal" value="1"></label>
    </div>
    <details id="rtc_adv" style="margin:6px 0"><summary style="cursor:pointer;font-size:13px;color:var(--ink2)">Alíquotas nominais, Imposto Seletivo e tributação regular (opcional)</summary>
      <div class="frm" style="margin-top:8px">
        <label>CBS (%)<input id="rtc_ncbs" inputmode="decimal" placeholder="tabela"></label>
        <label>IBS estadual (%)<input id="rtc_nuf" inputmode="decimal" placeholder="tabela"></label>
        <label>IBS municipal (%)<input id="rtc_nmun" inputmode="decimal" placeholder="tabela"></label>
        <label class="full" style="flex-direction:row;align-items:center;gap:8px"><input type="checkbox" id="rtc_is" style="width:auto"> Calcular Imposto Seletivo (a partir de 2027)</label>
        <label>NCM do produto<input id="rtc_ncm" inputmode="numeric" placeholder="ex.: 22030000"></label>
        <label>IS ad valorem (%)<input id="rtc_isadv" inputmode="decimal" placeholder="tabela"></label>
        <label>IS ad rem (R$/unid.)<input id="rtc_isrem" inputmode="decimal" placeholder="tabela"></label>
        <label>IS já incluído na base (R$)<input id="rtc_isinf" inputmode="decimal" placeholder="0,00"></label>
        <label class="full">Tributação regular (CST/cClassTrib) – para suspensão, diferimento etc.<input id="rtc_reg" placeholder="ex.: 000/000001 (opcional)"></label>
      </div>
      <p class="note" style="margin:4px 0 0">Se a alíquota de referência do ano ainda não foi publicada (a base oficial traz só 2026: CBS 0,9% e IBS 0,1%), informe as alíquotas nominais.</p>
    </details>
    <div class="res2" id="rtc_out">Escolha o cClassTrib e informe a base de cálculo.</div>
  </div>`);
  $("#rtc_data").value = hoje();
  carregar().then(E => {
    const D = E.dados, v = D.versaoBase || {};
    $("#rtcVer").textContent = `base oficial ${v.v||""} de ${(v.d||"").slice(0,10).split("-").reverse().join("/")}`;
    $("#rtc_uf").innerHTML = (D.ufs||[]).map(u => `<option value="${u.cd}" ${u.s==="RR"?"selected":""}>${u.s}</option>`).join("");
    preencherLista(); calcular();
  }).catch(() => { $("#rtcVer").textContent = "base oficial indisponível (abra com internet uma vez)"; });
  $("#rtc_data").addEventListener("change", () => { preencherLista(); calcular(); });
  ["rtc_uf","rtc_cct","rtc_bc","rtc_q","rtc_ncbs","rtc_nuf","rtc_nmun","rtc_is","rtc_ncm","rtc_isadv","rtc_isrem","rtc_isinf","rtc_reg"].forEach(i => {
    const el = $("#"+i); el.addEventListener("input", calcular); el.addEventListener("change", calcular); });
}
function preencherLista(){
  if(!E) return; const d = $("#rtc_data").value || hoje();
  $("#rtc_cl").innerHTML = E.listaClasses(d).map(c => `<option value="${c.cd}">${esc(c.cd)} – ${esc(c.d.slice(0,110))} (CST ${c.cst})</option>`).join("");
}
function calcular(){
  const out = $("#rtc_out"); if(!E){ return; }
  const cod = ($("#rtc_cct").value.match(/\d{6}/)||[])[0];
  const base = num("rtc_bc");
  if(!cod){ out.innerHTML = "Escolha o cClassTrib (6 dígitos) e informe a base de cálculo."; return; }
  if(base==null){ const c = E.classe(cod, $("#rtc_data").value || hoje(), false); out.innerHTML = c ? fichaClasse(c) + `<p class="note">Informe a base de cálculo para calcular.</p>` : "cClassTrib não encontrado nesta data."; return; }
  const reg = ($("#rtc_reg").value.match(/(\d{3})\s*\/\s*(\d{6})/)||[]);
  const e = {
    data: $("#rtc_data").value || hoje(), ufCod: +$("#rtc_uf").value || null, cClassTrib: cod, base,
    quantidade: numDot("rtc_q") ?? 1, nominais: { 2: num("rtc_ncbs"), 3: num("rtc_nuf"), 4: num("rtc_nmun") },
    isInformado: num("rtc_isinf") || 0, regular: reg[2] ? { cst: reg[1], cClassTrib: reg[2] } : null,
    is: $("#rtc_is").checked ? { ativo: true, ncm: $("#rtc_ncm").value, adValorem: num("rtc_isadv"), adRem: num("rtc_isrem") } : null
  };
  const r = E.calcular(e);
  if(r.erro){ out.innerHTML = (r.classe ? fichaClasse(r.classe) : "") + `<p class="bad" style="margin:8px 0">${esc(r.erro)}</p>` +
    (r.tipoErro==="nao_impl" ? `<p class="note">Fonte: <a href="${REPO}" target="_blank" rel="noopener">calculadora oficial (GitHub)</a>.</p>` : ""); return; }
  const linhas = r.itens.map(i => `<tr><td><b>${esc(i.nome)}</b></td><td class="n">${fP(i.aliquota)}</td><td class="n">${i.reducao!=null?fP(i.reducao):"–"}</td><td class="n">${i.aliquotaEfetiva!=null?fP(i.aliquotaEfetiva):"–"}</td><td class="n">${fR(i.base)}</td><td class="n">${i.diferido!=null?fR(i.diferido)+` <small>(${fP(i.pDif)})</small>`:"–"}</td><td class="n"><b>${fR(i.devido)}</b></td></tr>`).join("");
  const tot = r.itens.reduce((s,i) => s + i.devido, 0);
  const regs = r.itens.filter(i => i.regular);
  out.innerHTML = fichaClasse(r.classe, r.tratamento) +
    (r.is ? `<p style="margin:8px 0"><b>Imposto Seletivo:</b> ${fR(r.is.base)} × ${fP(r.is.adValorem||0)}${r.is.adRem?` + ad rem ${fR(r.is.adRem)}/${esc(r.is.unidade||"un.")}`:""} = <b>${fR(r.is.valor)}</b> (integra a base do IBS/CBS)</p>` : "") +
    `<div style="overflow-x:auto"><table class="rtct"><thead><tr><th>Tributo</th><th>Alíquota</th><th>Redução</th><th>Alíq. efetiva</th><th>Base de cálculo</th><th>Diferido</th><th>Valor devido</th></tr></thead><tbody>${linhas}</tbody>
     <tfoot><tr><td colspan="6"><b>Total IBS + CBS</b>${r.is?` · com IS: ${fR(tot + r.is.valor)}`:""}</td><td class="n"><b>${fR(tot)}</b></td></tr></tfoot></table></div>` +
    (regs.length ? `<p class="note" style="margin:6px 0">Tributação regular (grupo de desoneração) – CST ${esc(regs[0].regular.cst)}/${esc(regs[0].regular.cClassTrib)}: ${regs.map(i => `${esc(i.nome)} ${fP(i.regular.aliquotaEfetiva)} = ${fR(i.regular.devido)}`).join(" · ")}</p>` : "") +
    (r.avisos.length ? `<ul class="note" style="margin:6px 0 0;padding-left:18px">${r.avisos.map(a => `<li>${esc(a)}</li>`).join("")}</ul>` : "") +
    `<details style="margin-top:8px"><summary style="cursor:pointer;font-size:13px">Memória de cálculo</summary><ol style="font-size:12.5px;margin:6px 0;padding-left:18px">${r.memoria.map(m => `<li>${esc(m)}</li>`).join("")}</ol>
     <p class="note" style="margin:4px 0">Grupos da NF-e: vBC ${fR(r.baseIBSCBS)} · pCBS ${fP(r.itens[0].aliquota)} · pIBSUF ${fP(r.itens[1].aliquota)} · pIBSMun ${fP(r.itens[2].aliquota)}${r.itens[0].reducao!=null?` · gRed pRedAliq ${fP(r.itens[0].reducao)}`:""}.</p></details>
     <p class="note" style="margin:8px 0 0">Reprodução fiel das regras da calculadora oficial (conferida com os casos de teste da Receita). Casos com ajuste, crédito presumido ou monofasia de combustíveis devem ser conferidos na calculadora oficial.</p>`;
}
function fichaClasse(c, tr){
  const cred = [c.credCbs ? "CBS" : "", c.credIbs ? "IBS" : ""].filter(Boolean).join(" e ");
  return `<div style="font-size:13px;line-height:1.5"><b>${esc(c.cd)}</b> – ${esc(c.d)}<br>
    <span class="note" style="margin:0">CST ${esc(c.cst)} (${esc(c.cstd)}) · tipo de alíquota: ${esc(c.tipo)}${tr?` · tratamento: ${esc(tr.d)}`:""}${c.anexo?` · Anexo ${esc(c.anexo)}`:""}${cred?` · gera crédito ao adquirente: ${cred}`:" · sem crédito ao adquirente"}${(c.fund||[]).filter(Boolean).length?` · fundamento: ${esc(c.fund.filter(Boolean).map(x => /LC|Lei|Decreto|EC/.test(x) ? x : x + " da LC 214/2025").join("; "))}`:""}</span></div>`;
}
document.head.insertAdjacentHTML("beforeend", `<style>.rtct{width:100%;border-collapse:collapse;font-size:13px;margin-top:8px}.rtct th,.rtct td{border-bottom:1px solid var(--line);padding:6px 8px;text-align:left;white-space:nowrap}.rtct th:not(:first-child){text-align:right}.rtct th{font-size:11.5px;text-transform:uppercase;letter-spacing:.04em;color:var(--ink3)}.rtct .n{text-align:right;font-variant-numeric:tabular-nums}.rtct tfoot td{border-top:2px solid var(--line2);border-bottom:0}</style>`);
const v = document.getElementById("view-ferramentas");
if(v){ new MutationObserver(() => { if(document.querySelector("#view-ferramentas .tools")) montar(); }).observe(v, {childList:true, subtree:true}); montar(); }

/* Fontes oficiais: links da calculadora */
function fontes(){
  const box = $("#fbox"); if(!box || $("#rtcFontes")) return;
  box.insertAdjacentHTML("beforeend", `<div class="card" id="rtcFontes" style="margin-top:12px"><h3 style="margin-top:0">Calculadora de Tributos da Receita Federal (Reforma Tributária)</h3>
   <ul style="margin:0;padding-left:18px;line-height:1.8">
    <li><a href="${REPO}" target="_blank" rel="noopener">Código-fonte – regime regular (CBS, IBS, IS) ↗</a></li>
    <li><a href="https://github.com/ReceitaFederal/calculadora-rtc-simples-nacional" target="_blank" rel="noopener">Código-fonte – Simples Nacional ↗</a></li>
    <li><a href="https://github.com/ReceitaFederal/calculadora-rtc-gerador-danfse" target="_blank" rel="noopener">Código-fonte – gerador de DANFSe ↗</a></li>
    <li><a href="https://agenciagov.ebc.com.br/noticias/202611/receita-federal-publica-primeiro-codigo-fonte-aberto-no-github-e-amplia-transparencia-da-reforma-tributaria-1" target="_blank" rel="noopener">Notícia oficial da publicação (16/11/2026) ↗</a></li>
   </ul></div>`);
}
const fv = document.getElementById("view-fontes") || document.body;
new MutationObserver(() => { if($("#fbox") && !$("#rtcFontes")) fontes(); }).observe(fv, {childList:true, subtree:true}); fontes();
})();
