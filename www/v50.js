"use strict";
/* FEG-TECH 5.0: offline copy + "new version" banner. The banner never reloads the app by itself, so nothing is lost mid-class. */
(()=>{
if(window.IS_NATIVE||!('serviceWorker' in navigator))return;   /* the APK already contains every file */
function banner(){
  if(document.getElementById('updateBanner'))return;
  const bar=document.createElement('div');bar.id='updateBanner';
  bar.style.cssText='position:fixed;left:12px;right:12px;bottom:12px;z-index:99999;background:#1e6b3c;color:#fff;padding:12px 14px;border-radius:10px;box-shadow:0 4px 16px rgba(0,0,0,.3);display:flex;gap:10px;align-items:center;justify-content:space-between;font-size:14px';
  const t=document.createElement('span');t.textContent='A new version is ready.';
  const w=document.createElement('span'),go=document.createElement('button'),later=document.createElement('button');
  go.textContent='Update now';go.style.cssText='background:#fff;color:#1e6b3c;border:0;border-radius:6px;padding:7px 12px;font-weight:600';
  later.textContent='Later';later.style.cssText='background:transparent;color:#fff;border:0;padding:7px 8px';
  go.onclick=()=>location.reload();later.onclick=()=>bar.remove();
  w.append(go,' ',later);bar.append(t,w);document.body.append(bar)}
let had=!!navigator.serviceWorker.controller;
navigator.serviceWorker.addEventListener('controllerchange',()=>{if(had)banner();had=true});
addEventListener('load',()=>{
  navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'}).then(reg=>{
    const check=()=>{if(navigator.onLine)reg.update().catch(()=>{})};
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)check()});
    addEventListener('online',check);setInterval(check,30*60*1000);
  }).catch(e=>console.warn('Service worker registration failed:',e))});
})();
