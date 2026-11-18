/* =====================================================================
   Banco compartilhado do app (Supabase)
   Oferece ao Buscador a mesma interface usada na versão do Claude
   (claude.use("user" | "db" | "assets")), gravando no Supabase.
   Leitura pública; incluir/alterar exige login por e-mail de um editor.
   ===================================================================== */
(function(){
const CFG = window.SUPABASE_CONFIG || {};
if(!CFG.url || !CFG.anonKey || !window.supabase || !window.supabase.createClient) return;   // sem configuração: app só leitura

const sb = window.supabase.createClient(CFG.url, CFG.anonKey, { auth:{ persistSession:true, autoRefreshToken:true, detectSessionInUrl:true } });
window.APP_BACKEND = "supabase";
window.__sb = sb;
window.__blobUrl = id => sb.storage.from("pdfs").getPublicUrl(id).data.publicUrl;

const $ = s => document.querySelector(s);
const esc = s => (s==null?"":String(s)).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const LS = "buscador-cache-";
const erro = (e, padrao) => {
  const st = e && (e.status || e.statusCode), cd = e && e.code;
  if(st==401 || st==403 || cd==="42501" || /row-level security|permission|not authorized|Unauthorized/i.test((e&&e.message)||""))
    return Object.assign(new Error("Sem permissão para gravar. Entre com um e-mail autorizado."), {code:"invalid_argument"});
  if(st==413 || /exceeded the maximum allowed size|too large/i.test((e&&e.message)||"")) return Object.assign(new Error("Arquivo grande demais"), {code:"too_large"});
  return Object.assign(new Error((e&&e.message)||padrao||"erro"), {code: cd||"unknown"});
};

/* ---------- sessão ---------- */
let sessao = null;
const pronto = sb.auth.getSession().then(r => { sessao = r.data.session; }).catch(()=>{});
sb.auth.onAuthStateChange((ev, s) => { sessao = s; });
async function ehEditor(){
  await pronto; if(!sessao) return false;
  try{ const { data, error } = await sb.rpc("eh_editor"); if(error) return false; return !!data; }catch(e){ return false; }
}

/* ---------- user ---------- */
const user = {
  async id(){ await pronto; return sessao ? sessao.user.id : null; },
  async can(){ return ehEditor(); },
  async isOwner(){ return false; },
  async profiles(ids){
    const out = {}; ids = (ids||[]).filter(x => /^[0-9a-f-]{36}$/i.test(x)); if(!ids.length) return out;
    try{ const { data } = await sb.from("perfis").select("id,nome,email").in("id", ids);
      (data||[]).forEach(p => { out[p.id] = { name: p.nome || (p.email||"").split("@")[0] }; }); }catch(e){}
    return out;
  }
};

/* ---------- db (coleções normas_equipe e ajustes_normas) ---------- */
const ouvintes = {};   // coleção -> [fn]
function rid(){ return (Date.now().toString(36) + Math.random().toString(36).slice(2,12)).slice(0,20); }
async function carregar(col){
  const { data, error } = await sb.from(col).select("id,data").limit(5000);
  if(error) throw error;
  try{ localStorage.setItem(LS+col, JSON.stringify(data)); }catch(e){}
  return data;
}
function emitir(col, linhas, fromCache){
  const snap = { metadata:{ fromCache: !!fromCache }, docs: (linhas||[]).map(r => ({ id:r.id, exists:true, data:()=>r.data })) };
  (ouvintes[col]||[]).forEach(fn => { try{ fn(snap); }catch(e){} });
}
async function atualizar(col){
  try{ emitir(col, await carregar(col), false); }
  catch(e){
    let c = null; try{ c = JSON.parse(localStorage.getItem(LS+col)||"null"); }catch(_){}
    if(c) emitir(col, c, true);
    else { try{ const r = await fetch("data/"+col+".json"); const arr = await r.json(); emitir(col, (arr||[]).map((d,i)=>({id:d.id||("s"+i), data:d})), true); }catch(_){} }
  }
}
const db = {
  collection(col){
    return {
      doc(id){
        const docId = id || rid();
        return {
          id: docId,
          async set(data){
            await pronto; if(!sessao) throw erro({status:401});
            const { error } = await sb.from(col).upsert({ id:docId, data, updated_at:new Date().toISOString() });
            if(error) throw erro(error); atualizar(col);
          },
          async delete(){
            await pronto; if(!sessao) throw erro({status:401});
            const { error } = await sb.from(col).delete().eq("id", docId);
            if(error) throw erro(error); atualizar(col);
          }
        };
      },
      onSnapshot(fn){
        (ouvintes[col] = ouvintes[col] || []).push(fn);
        let c = null; try{ c = JSON.parse(localStorage.getItem(LS+col)||"null"); }catch(_){}
        if(c) setTimeout(()=>emitir(col, c, true), 0);
        atualizar(col);
        const t = setInterval(()=>{ if(document.visibilityState==="visible" && navigator.onLine) atualizar(col); }, 90000);
        document.addEventListener("visibilitychange", ()=>{ if(document.visibilityState==="visible" && navigator.onLine) atualizar(col); });
        addEventListener("online", ()=>atualizar(col));
        return () => { clearInterval(t); ouvintes[col] = (ouvintes[col]||[]).filter(f => f!==fn); };
      }
    };
  }
};

/* ---------- assets (PDFs) ---------- */
const assets = {
  async upload(file, opt){
    await pronto; if(!sessao) throw erro({status:401});
    if(file.size > 50*1024*1024) throw Object.assign(new Error("PDF maior que 50 MB"), {code:"too_large"});
    const nome = (file.name||"documento.pdf").normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/[^\w.\-]+/g,"_").slice(-80);
    const path = new Date().toISOString().slice(0,10) + "/" + rid() + "-" + nome;
    const { error } = await sb.storage.from("pdfs").upload(path, file, { contentType:(opt&&opt.type)||"application/pdf", upsert:false });
    if(error) throw erro(error);
    return { id: path };
  }
};

/* ---------- ponto de entrada igual ao do Claude ---------- */
window.claude = window.claude || {};
window.claude.use = async function(nome){
  if(nome==="user") return user;
  if(nome==="db") return db;
  if(nome==="assets") return assets;
  throw new Error("indisponível no app");
};

/* ---------- Entrar / Sair (código por e-mail) ---------- */
function montarLogin(){
  const bar = document.querySelector("header.top .wrap"); if(!bar) return;
  bar.insertAdjacentHTML("beforeend", `<button id="btnConta" class="btn" style="margin-left:8px" title="Entrar para incluir normas e anexar PDFs">👤 Entrar</button>`);
  document.body.insertAdjacentHTML("beforeend", `<div class="mback" id="lgback" hidden><div class="modal card" role="dialog" aria-modal="true" style="max-width:430px">
    <div class="mhead"><h2 style="font-size:17px">Entrar no Buscador</h2><button class="mx" id="lgx" aria-label="Fechar">×</button></div>
    <div style="padding:4px 18px 18px" id="lgbody"></div></div></div>`);
  const fechar = () => { $("#lgback").hidden = true; };
  $("#lgx").onclick = fechar; $("#lgback").addEventListener("click", e => { if(e.target.id==="lgback") fechar(); });
  $("#btnConta").onclick = () => { $("#lgback").hidden = false; tela(); };
  rotulo();
}
async function rotulo(){
  await pronto; const b = $("#btnConta"); if(!b) return;
  if(!sessao){ b.textContent = "👤 Entrar"; return; }
  let nome = ""; try{ const { data } = await sb.from("perfis").select("nome").eq("id", sessao.user.id).maybeSingle(); nome = data && data.nome; }catch(e){}
  b.textContent = "👤 " + (nome || sessao.user.email.split("@")[0]);
}
async function tela(passo, email){
  await pronto; const box = $("#lgbody"); const inp = "width:100%;box-sizing:border-box;border:1px solid var(--line2);border-radius:8px;padding:9px 11px;font:inherit;background:var(--bg);color:var(--ink);margin:6px 0 10px";
  if(sessao){
    const ed = await ehEditor();
    let nome = ""; try{ const { data } = await sb.from("perfis").select("nome").eq("id", sessao.user.id).maybeSingle(); nome = (data && data.nome) || ""; }catch(e){}
    box.innerHTML = `<p style="margin:6px 0">Conectado como <b>${esc(sessao.user.email)}</b>.</p>
      <p class="note" style="margin:4px 0 12px">${ed ? "✔ Você pode incluir normas, anexar PDFs e alterar links. As mudanças aparecem para toda a equipe." : "⚠ Este e-mail ainda não está autorizado a editar. Peça ao responsável pelo app para incluí-lo na lista de editores."}</p>
      <label style="font-size:13px">Seu nome (aparece como autor das normas)<input id="lgnome" value="${esc(nome)}" style="${inp}"></label>
      <div style="display:flex;gap:8px;justify-content:flex-end"><button class="btn" id="lgsair">Sair</button><button class="btn primary" id="lgsalvar">Salvar nome</button></div><div id="lgst" class="note"></div>`;
    $("#lgsalvar").onclick = async () => { const n = $("#lgnome").value.trim(); const { error } = await sb.from("perfis").upsert({ id:sessao.user.id, email:sessao.user.email, nome:n, atualizado:new Date().toISOString() }); $("#lgst").innerHTML = error ? `<span class="bad">Não foi possível salvar.</span>` : `<span class="ok">Nome salvo.</span>`; rotulo(); };
    $("#lgsair").onclick = async () => { await sb.auth.signOut(); location.reload(); };
    return;
  }
  if(passo !== "codigo"){
    box.innerHTML = `<p class="note" style="margin:6px 0 10px">Para <b>consultar</b> não é preciso entrar. Entre para <b>incluir normas, anexar PDFs e alterar links</b>. Você receberá um código por e-mail (sem senha).</p>
      <label style="font-size:13px">Seu e-mail<input id="lgemail" type="email" autocomplete="email" placeholder="nome@exemplo.com" style="${inp}"></label>
      <div style="display:flex;justify-content:flex-end"><button class="btn primary" id="lgenviar">Enviar código</button></div><div id="lgst" class="note" style="margin-top:8px"></div>`;
    const enviar = async () => {
      const em = $("#lgemail").value.trim().toLowerCase(); if(!/^\S+@\S+\.\S+$/.test(em)){ $("#lgst").innerHTML = `<span class="bad">Informe um e-mail válido.</span>`; return; }
      $("#lgenviar").disabled = true; $("#lgst").innerHTML = `<span class="spin"></span> Enviando…`;
      const { error } = await sb.auth.signInWithOtp({ email:em, options:{ shouldCreateUser:true, emailRedirectTo: location.origin + location.pathname } });
      $("#lgenviar").disabled = false;
      if(error){ $("#lgst").innerHTML = `<span class="bad">${/rate|seconds/i.test(error.message) ? "Aguarde um minuto antes de pedir outro código." : "Não foi possível enviar ("+esc(error.message)+")."}</span>`; return; }
      tela("codigo", em);
    };
    $("#lgenviar").onclick = enviar; $("#lgemail").onkeydown = e => { if(e.key==="Enter") enviar(); }; $("#lgemail").focus();
    return;
  }
  box.innerHTML = `<p style="margin:6px 0">Enviamos um e-mail para <b>${esc(email)}</b>.</p>
    <p class="note" style="margin:4px 0 8px">Digite o código que veio no e-mail (confira também Spam e Promoções). Se o e-mail trouxer só um link, basta clicar nele neste mesmo aparelho.</p>
    <input id="lgcod" inputmode="numeric" autocomplete="one-time-code" maxlength="10" placeholder="código" style="${inp};font-size:20px;letter-spacing:4px;text-align:center">
    <div style="display:flex;gap:8px;justify-content:space-between"><button class="btn" id="lgvoltar">Outro e-mail</button><button class="btn primary" id="lgok">Entrar</button></div><div id="lgst" class="note" style="margin-top:8px"></div>`;
  const ok = async () => {
    const cod = $("#lgcod").value.replace(/\D/g,""); if(cod.length < 6){ $("#lgst").innerHTML = `<span class="bad">Digite o código completo.</span>`; return; }
    $("#lgok").disabled = true; $("#lgst").innerHTML = `<span class="spin"></span> Conferindo…`;
    const { data, error } = await sb.auth.verifyOtp({ email, token:cod, type:"email" });
    $("#lgok").disabled = false;
    if(error){ $("#lgst").innerHTML = `<span class="bad">Código inválido ou expirado. Peça outro.</span>`; return; }
    try{ await sb.from("perfis").upsert({ id:data.user.id, email:data.user.email, atualizado:new Date().toISOString() }, { onConflict:"id", ignoreDuplicates:true }); }catch(e){}
    location.reload();
  };
  $("#lgok").onclick = ok; $("#lgcod").onkeydown = e => { if(e.key==="Enter") ok(); }; $("#lgvoltar").onclick = () => tela(); $("#lgcod").focus();
}
/* login pelo link do e-mail: limpa o endereço e recarrega com a sessão */
if(/access_token=|[?&]code=/.test(location.hash + location.search)){
  pronto.then(()=>{ setTimeout(()=>{ history.replaceState(null, "", location.pathname); if(sessao){ sb.from("perfis").upsert({ id:sessao.user.id, email:sessao.user.email }, { onConflict:"id", ignoreDuplicates:true }).then(()=>location.reload(), ()=>location.reload()); } }, 600); });
}
if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", montarLogin); else montarLogin();
})();
