/* FEG-TECH 5.0 service worker: the app opens and works offline.
   - App files: internet first (so a new version arrives straight away); if the connection is slow (4 s) or missing, the saved copy opens instead.
   - Libraries, fonts and face models from the CDNs: saved copy first, saved the first time they load.
   - The saved copy is named after version.js, so changing the number there is all that is needed to update every phone. */
importScripts('version.js');
const VER='attendance-'+APP_VERSION,SLOW_MS=4000;
const CORE=['./','index.html','style.css','manifest.webmanifest','version.js','app.js','face.js','qrgen.js','hod.js','qr.js','sync5.js','v32.js','v33.js','v34.js','v35.js','v36.js','v41.js','v44.js','v45.js','roster.js','v46.js','v48.js','v50.js','offline.js','logo.png','logo-96.png','icon.svg','favicon-32.png','icon-192.png','icon-512.png','icon-maskable-192.png','icon-maskable-512.png','apple-touch-icon.png'];
const M='https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@master/weights/';
const CDN=['https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js','https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/dist/face-api.min.js','https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js',
M+'tiny_face_detector_model-weights_manifest.json',M+'tiny_face_detector_model-shard1',M+'face_landmark_68_model-weights_manifest.json',M+'face_landmark_68_model-shard1',M+'face_recognition_model-weights_manifest.json',M+'face_recognition_model-shard1',M+'face_recognition_model-shard2'];
const HOSTS=['cdn.jsdelivr.net','fonts.googleapis.com','fonts.gstatic.com'];
/* hosts such as Cloudflare Pages redirect /index.html to /; a redirected response must never be served to a page, so every copy is rebuilt plain */
async function clean(res){if(!res||!res.redirected)return res;const body=await res.blob();return new Response(body,{status:res.status,statusText:res.statusText,headers:res.headers})}
self.addEventListener('install',e=>{e.waitUntil((async()=>{const c=await caches.open(VER);
  /* all app files must save, otherwise this install is dropped and the working copy keeps being used */
  await Promise.all(CORE.map(async u=>{const r=await fetch(new Request(u,{cache:'reload'}));if(!r.ok)throw Error('Could not cache '+u);await c.put(u,await clean(r))}));
  await Promise.all(CDN.map(u=>fetch(u,{mode:'cors'}).then(r=>r.ok&&c.put(u,r)).catch(()=>{})));
  self.skipWaiting()})())});
self.addEventListener('activate',e=>{e.waitUntil((async()=>{for(const k of await caches.keys())if(k!==VER)await caches.delete(k);await self.clients.claim()})())});
function networkFirst(req){return new Promise(resolve=>{let done=false;const fin=r=>{if(!done){done=true;resolve(r)}};
  const timer=setTimeout(async()=>{const m=await caches.match(req,{ignoreSearch:true});if(m)fin(m)},SLOW_MS); /* slow connection: open what we have, the download keeps going and refreshes the copy */
  fetch(req,{cache:'no-cache'}).then(async r=>{clearTimeout(timer);if(r&&r.status===200){const copy=await clean(r.clone());caches.open(VER).then(c=>c.put(req,copy))}fin(r)})
   .catch(async()=>{clearTimeout(timer);const m=(await caches.match(req,{ignoreSearch:true}))||(req.mode==='navigate'?(await caches.match('index.html'))||(await caches.match('./')):null);fin(m||Response.error())})})}
function cacheFirst(req){return caches.match(req).then(m=>m||fetch(req).then(r=>{if(r&&(r.ok||r.type==='opaque')){const cp=r.clone();caches.open(VER).then(c=>c.put(req,cp))}return r}))}
self.addEventListener('fetch',e=>{
  const r=e.request;if(r.method!=='GET')return;const u=new URL(r.url);
  if(u.origin===location.origin){e.respondWith(networkFirst(r));return}
  if(HOSTS.includes(u.hostname))e.respondWith(cacheFirst(r).catch(()=>new Response('',{status:503})));
  /* anything else (the sync server) goes straight to the network */
});
