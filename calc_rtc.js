/* =====================================================================
   Motor de cálculo CBS / IBS / IS – Reforma Tributária do Consumo (LC 214/2025)
   Reprodução em JavaScript da Calculadora de Tributos da Receita Federal
   (github.com/ReceitaFederal/calculadora-rtc-regime-regular, licença MIT),
   usando as mesmas tabelas oficiais (data/calc_rtc.json) e as mesmas fórmulas
   (expressões do TRATAMENTO_TRIBUTARIO), com arredondamento interno de 8 casas.
   ===================================================================== */
(function(root){
"use strict";
const T = { IS:1, CBS:2, IBSUF:3, IBSMUN:4 };
const NOME = { 1:"Imposto Seletivo", 2:"CBS", 3:"IBS estadual", 4:"IBS municipal" };

/* arredondamento bancário (HALF_EVEN) */
function rnd(x, casas){
  if(x==null || !isFinite(x)) return x;
  const f = Math.pow(10, casas), v = x * f, r = Math.round(v), d = Math.abs(v % 1);
  const n = (Math.abs(d - 0.5) < 1e-9) ? (r % 2 === 0 ? r : r - Math.sign(v)) : r;
  return n / f;
}
const r8 = x => rnd(x, 8);

/* avaliador seguro de expressões: números, variáveis, + - * / e parênteses */
function avaliar(expr, vars){
  const s = String(expr).trim();
  if(Object.prototype.hasOwnProperty.call(vars, s)){ const v = vars[s]; if(v==null) throw new Error("Valor não informado: "+s); return v; }
  let i = 0;
  const ws = () => { while(i < s.length && /\s/.test(s[i])) i++; };
  function prim(){
    ws();
    if(s[i] === "("){ i++; const v = soma(); ws(); if(s[i] !== ")") throw new Error("Expressão inválida: "+s); i++; return v; }
    if(s[i] === "-"){ i++; return -prim(); }
    if(s[i] === "+"){ i++; return prim(); }
    let m = /^\d+(\.\d+)?/.exec(s.slice(i)); if(m){ i += m[0].length; return parseFloat(m[0]); }
    m = /^[A-Za-z_]\w*/.exec(s.slice(i));
    if(m){ i += m[0].length; const v = vars[m[0]]; if(v==null) throw new Error("Variável sem valor: "+m[0]); return v; }
    throw new Error("Expressão inválida: "+s);
  }
  function mult(){ let v = prim(); for(;;){ ws(); const o = s[i]; if(o==="*"){ i++; v = v*prim(); } else if(o==="/"){ i++; const d = prim(); if(d===0) throw new Error("Divisão por zero"); v = v/d; } else return v; } }
  function soma(){ let v = mult(); for(;;){ ws(); const o = s[i]; if(o==="+"){ i++; v = v+mult(); } else if(o==="-"){ i++; v = v-mult(); } else return v; } }
  const v = soma(); ws(); if(i < s.length) throw new Error("Expressão inválida: "+s);
  return r8(v);
}

const vigente = (lista, data) => (lista||[]).filter(x => x.ini <= data && (!x.fim || x.fim >= data));
const um = (lista, data) => vigente(lista, data)[0] || null;

function criar(D){
  const classesIS = new Set(), porCod = {};
  D.classes.forEach(c => {
    const ehIS = (c.trat||[]).some(t => t.t===1 || t.t===2) || c.tipo === "Alíquotas Combinadas (Ad Valorem e Ad Rem)";
    c.is = ehIS;
    const k = (ehIS ? "IS:" : "") + c.cd; (porCod[k] = porCod[k] || []).push(c);
  });
  function classe(cd, data, is){ return um(porCod[(is?"IS:":"")+cd] || [], data); }
  function listaClasses(data){
    return D.classes.filter(c => !c.is && c.ini <= data && (!c.fim || c.fim >= data)).sort((a,b) => a.cd.localeCompare(b.cd));
  }
  function aliqRef(t, data){ const a = um(D.aliqRef.filter(x => x.t===t), data); return a ? a.v : null; }
  function aliqPadrao(t, uf, mun, data){
    const ref = aliqRef(t, data); if(ref==null) return null;
    const p = vigente(D.aliqPadrao.filter(x => x.t===t), data).find(x => (mun ? x.mun==mun : x.mun==null) && (uf ? x.uf==uf : x.uf==null));
    if(!p) return ref;
    if(p.forma === "ACRESCIMO") return ref + p.v;
    if(p.forma === "DECRESCIMO") return ref - p.v;
    return p.v;
  }
  function aliqIS(ncm, data){
    ncm = String(ncm||"").replace(/\D/g,"");
    const pega = l => { const c = vigente(l, data).filter(x => ncm.startsWith(x.ncm)).sort((a,b) => b.ncm.length - a.ncm.length); return c[0] || null; };
    const av = pega(D.isAdValorem), ar = pega(D.isAdRem);
    return { adValorem: av ? av.v : null, adRem: ar ? ar.v : null, unidade: ar ? ar.un : "" };
  }

  /* Cálculo de um tributo (CBS, IBS UF ou IBS Mun) — espelha CalculoCbsIbsService */
  function tributo(t, c, tr, e, isCalc, memo){
    const data = e.data;
    if(tr.aj) throw Object.assign(new Error(`O cClassTrib ${c.cd} exige ajuste (crédito presumido, transferência, ZFM etc.) que a calculadora oficial ainda não implementa.`), {tipo:"nao_impl"});
    if(tr.mono) throw Object.assign(new Error(`O cClassTrib ${c.cd} é de tributação monofásica de combustíveis (alíquotas ad rem por litro). Use a calculadora oficial para este caso.`), {tipo:"nao_impl"});
    let pRed = null;
    if(tr.red){ const p = um((c.red||[]).filter(x => x.t===t), data); pRed = r8((p ? p.v : 0)/100); }
    const tipo = c.cd === "510001" ? "Padrão" : c.tipo;
    const nom = e.nominais ? e.nominais[t] : null;
    let aliq = null, dividida = false, nominalUsada = false, origem = "";
    const semRef = () => { throw Object.assign(new Error(`Alíquota de referência de ${NOME[t]} não publicada para ${data.slice(0,4)}. Informe as alíquotas em “Alíquotas nominais”.`), {tipo:"sem_aliq"}); };
    switch(tipo){
      case "Padrão":
        if(nom!=null){ aliq = r8(nom/100); nominalUsada = true; origem = "informada"; }
        else { const v = aliqPadrao(t, e.ufCod, e.municipio, data); if(v==null) semRef(); aliq = r8(v/100); origem = "referência/padrão vigente"; }
        dividida = true; break;
      case "Uniforme nacional (referência)":
        if(nom!=null){ aliq = r8(nom/100); nominalUsada = true; origem = "informada"; }
        else { const v = aliqRef(t, data); if(v==null) semRef(); aliq = r8(v/100); origem = "referência nacional"; }
        dividida = true; break;
      case "Uniforme setorial":
      case "Fixa": {
        if(nom!=null){ aliq = r8(nom/100); nominalUsada = true; origem = "informada"; }
        else { const a = um((c.aliq||[]).filter(x => x.t===t), data); if(!a) throw Object.assign(new Error(`Alíquota ${tipo.toLowerCase()} de ${NOME[t]} não encontrada para ${data}. Informe a alíquota.`), {tipo:"sem_aliq"}); aliq = r8(a.v/100); origem = "alíquota "+tipo.toLowerCase()+" da tabela"; }
        dividida = true; break; }
      case "Sem alíquota":
        if(nom!=null){ aliq = r8(nom/100); nominalUsada = true; dividida = true; origem = "informada"; }
        else { aliq = 0; origem = "sem alíquota"; }
        break;
      default:
        throw Object.assign(new Error(`Tipo de alíquota “${tipo}” não tratado.`), {tipo:"nao_impl"});
    }
    const V = { aliquota:aliq, quantidade:e.quantidade, percentualReducao:pRed, pRedutorCompraGov:0,
      baseCalculoInformada:e.base, impostoSeletivoInformado:e.isInformado||0, impostoSeletivoCalculado:isCalc||0 };
    const usaAliq = s => /\baliquota\b/.test(s||"");
    let rAliq = (nominalUsada && !usaAliq(tr.aliq)) ? aliq : (tr.aliq ? avaliar(tr.aliq, V) : null);
    V.aliquota = rAliq;
    const rEf = tr.ef ? avaliar(tr.ef, Object.assign({}, V, {percentualReducao: pRed==null ? 0 : pRed})) : null;
    V.aliquotaEfetiva = rEf;
    let bc = avaliar(tr.bc, V); if(bc < 0) bc = 0; V.baseCalculo = bc;
    let tc = avaliar(tr.tc, V); V.tributoCalculado = tc;
    let td = tr.td ? avaliar(tr.td, V) : null;
    let pDif = null, vDif = null;
    if(tr.pd && tr.vd){
      pDif = avaliar(tr.pd, V); vDif = avaliar(tr.vd, Object.assign({}, V, {percentualDiferimento:pDif}));
      tc = r8(tc - vDif); td = r8(tc - vDif);           // igual à calculadora oficial
      if(tc < 0) tc = 0; if(td < 0) td = 0;
    }
    memo.push(`${NOME[t]}: alíquota ${fmtP(dividida ? rAliq*100 : rAliq)} (${origem})` +
      (pRed!=null ? ` · redução ${fmtP(pRed*100)} → efetiva ${fmtP(dividida ? (rEf||0)*100 : rEf)}` : "") +
      ` · base ${fmtR(bc)} · ${tr.tc.replace(/\s/g,"")} = ${fmtR(tc+(vDif||0))}` + (vDif!=null ? ` · diferido ${fmtR(vDif)} (${fmtP(pDif*100)})` : ""));
    const reg = e.regular && e.regular.cClassTrib;
    let regular = null;
    if(reg){ const ef = (tr.red && pRed!=null) ? r8(rAliq*(1-pRed)) : rAliq; regular = { cst:e.regular.cst, cClassTrib:e.regular.cClassTrib, aliquotaEfetiva: rnd(dividida ? ef*100 : ef, 4), devido: rnd(r8(bc*ef), 2) }; }
    return {
      tributo:t, nome:NOME[t], grupo: !!c.gibs, regular,
      aliquota: reg ? 0 : c.gibs ? rnd(dividida && rAliq!=null ? rAliq*100 : (rAliq||0), 4) : 0,
      reducao: pRed!=null && c.gred ? rnd(pRed*100, 4) : null,
      aliquotaEfetiva: rEf!=null ? rnd(dividida ? rEf*100 : rEf, 4) : null,
      base: rnd(bc, 2), calculado: reg ? 0 : rnd(tc, 2), diferido: vDif!=null ? rnd(vDif, 2) : null, pDif: pDif!=null ? rnd(pDif*100, 2) : null,
      devido: reg ? 0 : c.gibs ? rnd(td!=null ? td : tc, 2) : 0, origem
    };
  }

  /* Cálculo completo de um item */
  function calcular(e){
    e = Object.assign({ quantidade:1, isInformado:0 }, e);
    const out = { avisos:[], memoria:[], itens:[], is:null, classe:null, tratamento:null };
    const c = classe(e.cClassTrib, e.data, false);
    if(!c){ out.erro = `cClassTrib ${e.cClassTrib} não encontrado ou fora de vigência em ${e.data}.`; return out; }
    out.classe = c;
    const tv = um(c.trat, e.data); const tr = tv && D.tratamentos[tv.t];
    if(!tr){ out.erro = `Sem tratamento tributário vigente para o cClassTrib ${c.cd} em ${e.data}.`; return out; }
    out.tratamento = tr;
    // Imposto Seletivo (a partir de 2027)
    let isCalc = 0;
    if(e.is && e.is.ativo){
      const a = aliqIS(e.is.ncm || e.ncm, e.data);
      const adv = e.is.adValorem!=null ? e.is.adValorem : a.adValorem, adr = e.is.adRem!=null ? e.is.adRem : a.adRem;
      const bIS = e.is.base!=null ? e.is.base : e.base, qIS = e.is.quantidade!=null ? e.is.quantidade : e.quantidade;
      if(e.data < "2027-01-01") out.avisos.push("O Imposto Seletivo só é cobrado a partir de 1º/01/2027.");
      if(adv==null && adr==null){ out.avisos.push("NCM sem alíquota de Imposto Seletivo na tabela oficial para esta data; informe a alíquota se houver."); }
      else {
        isCalc = r8((bIS||0)*((adv||0)/100) + (qIS||0)*(adr||0));
        out.is = { base:rnd(bIS,2), adValorem:adv, adRem:adr, unidade:a.unidade, valor:rnd(isCalc,2) };
        out.memoria.push(`Imposto Seletivo: ${fmtR(bIS)} × ${fmtP(adv||0)}${adr?` + ${qIS} × ${fmtR(adr)}`:""} = ${fmtR(isCalc)}`);
        // a base informada já inclui o IS informado; somamos o IS calculado (LC 214/2025, art. 12, § 1º)
      }
    }
    for(const t of [T.CBS, T.IBSUF, T.IBSMUN]){
      try{ out.itens.push(tributo(t, c, tr, e, isCalc, out.memoria)); }
      catch(err){ out.erro = err.message; out.tipoErro = err.tipo; out.itens = []; return out; }
    }
    out.baseIBSCBS = out.itens.length ? out.itens[0].base : null;
    out.totalIBS = rnd(out.itens.filter(x => x.tributo!==T.CBS).reduce((s,x) => s + x.devido, 0), 2);
    out.totalCBS = out.itens.filter(x => x.tributo===T.CBS).reduce((s,x) => s + x.devido, 0);
    if(!c.gibs) out.avisos.push(`A situação tributária ${c.cst} (${c.cstd}) não gera grupo de IBS/CBS no documento fiscal.`);
    return out;
  }
  return { calcular, listaClasses, classe, aliqRef, aliqIS, dados:D, rnd };
}
function fmtR(v){ return "R$ " + (v||0).toLocaleString("pt-BR",{minimumFractionDigits:2, maximumFractionDigits:2}); }
function fmtP(v){ return (v==null?0:v).toLocaleString("pt-BR",{minimumFractionDigits:2, maximumFractionDigits:4}) + "%"; }

const api = { criar, avaliar, rnd, T, NOME, fmtR, fmtP };
if(typeof module !== "undefined" && module.exports) module.exports = api; else root.CalcRTC = api;
})(typeof window !== "undefined" ? window : globalThis);
