/* Service worker – Buscador de Legislação Tributária (SEFAZ-RR)
   Altere VERSAO a cada publicação para os usuários receberem a atualização. */
const VERSAO = "2026-11-18-7";
const CACHE = "buscador-" + VERSAO;
const SHELL = ["./","./index.html","./app2.js","./app3.js","./app4.js","./app5.js","./app6.js","./app7.js","./calc_rtc.js","./app8.js","./pwa.js","./supa.js","./config.js","./lib/supabase.min.js","./lib/pdf.min.js","./lib/pdf.worker.min.js","./manifest.webmanifest",
  "./icons/icon-192.png","./icons/icon-512.png","./icons/favicon-32.png",
  "./data/tabelas.json","./data/meta.json","./data/normas_equipe.json","./data/ajustes_normas.json","./data/ncm.json","./data/calc_rtc.json"];

self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL))); });
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith("buscador-") && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("message", e => { if (e.data === "atualizar") self.skipWaiting(); });

self.addEventListener("fetch", e => {
  const req = e.request; if (req.method !== "GET") return;
  const url = new URL(req.url);
  // Fontes do Google: cache primeiro
  if (url.host.includes("fonts.googleapis.com") || url.host.includes("fonts.gstatic.com")) {
    e.respondWith(caches.open(CACHE).then(async c => (await c.match(req)) || fetch(req).then(r => { c.put(req, r.clone()); return r; }).catch(() => new Response("", {status: 504}))));
    return;
  }
  if (url.origin !== location.origin) return;
  // Dados: rede primeiro (sempre atualizado), cache se offline
  if (url.pathname.includes("/data/") || url.pathname.endsWith("/config.js")) {
    e.respondWith(fetch(req).then(r => { const cp = r.clone(); caches.open(CACHE).then(c => c.put(req, cp)); return r; }).catch(() => caches.match(req, {ignoreSearch: true})));
    return;
  }
  // Páginas e scripts: cache primeiro, atualiza em segundo plano
  e.respondWith(caches.match(req, {ignoreSearch: true}).then(hit => {
    const net = fetch(req).then(r => { if (r.ok) { const cp = r.clone(); caches.open(CACHE).then(c => c.put(req, cp)); } return r; }).catch(() => hit || caches.match("./index.html"));
    return hit || net;
  }));
});
