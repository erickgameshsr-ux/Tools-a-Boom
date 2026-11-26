/* Service worker : met en cache les images (dossier assets/) pour un affichage immédiat et sans rechargement.
   Si vous REMPLACEZ une image existante par une autre de même nom, changez CACHE (v1 → v2) pour forcer la mise à jour. */
const CACHE='tab-img-v1';
importScripts('data-game.js');
const IMGS=['icon','credits','upcreds','hypercredits','trophy','tanks','iconhank','frametank',...Object.keys(OPS)].map(f=>`assets/${f}.png`).concat(CHARS.map(x=>`assets/${x[0]}.webp`));
self.addEventListener('install',e=>{self.skipWaiting();e.waitUntil(caches.open(CACHE).then(c=>Promise.all(IMGS.map(u=>c.add(u).catch(()=>{})))))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(n=>n!==CACHE).map(n=>caches.delete(n)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{const r=e.request;if(r.method!=='GET')return;const u=new URL(r.url);if(u.origin!==location.origin||!u.pathname.includes('/assets/'))return;
e.respondWith(caches.match(r).then(h=>h||fetch(r).then(res=>{if(res.ok){const cp=res.clone();caches.open(CACHE).then(c=>c.put(r,cp))}return res})))});
