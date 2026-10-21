/* Native (Android APK) bridge. In a normal browser this file does nothing except set window.IS_NATIVE=false.
   Inside the APK it:
     - sets window.IS_NATIVE=true
     - replaces browser file downloads (blob links do not work in an Android WebView) with "save + share sheet"
     - replaces window.print() (not available in a WebView) with "share a printable .html file"
     - handles the Android Back button (closes an in-app box first, then uses the app's own Back buttons) */
(function(){
'use strict';
var C=window.Capacitor;
var native=!!(C&&typeof C.isNativePlatform==='function'&&C.isNativePlatform());
window.IS_NATIVE=native;
if(!native)return;
document.documentElement.classList.add('is-native');

function plug(n){try{return (C.Plugins&&C.Plugins[n])||(C.registerPlugin&&C.registerPlugin(n))||null}catch(e){return null}}

function toBase64(data){
  return new Promise(function(resolve,reject){
    if(typeof data==='string'){
      try{resolve(btoa(unescape(encodeURIComponent(data))))}catch(e){reject(e)}return;
    }
    var blob=data instanceof Blob?data:new Blob([data]);
    var fr=new FileReader();
    fr.onload=function(){resolve(String(fr.result).split(',')[1]||'')};
    fr.onerror=function(){reject(fr.error||Error('Could not read file data'))};
    fr.readAsDataURL(blob);
  });
}

function saveAndShare(filename,data,mime){
  var FS=plug('Filesystem'),SH=plug('Share');
  if(!FS||!SH)return Promise.reject(Error('File plugins are missing from this build.'));
  return toBase64(data).then(function(b64){
    return FS.writeFile({path:filename,data:b64,directory:'CACHE'});
  }).then(function(r){
    return SH.share({title:filename,url:r.uri,dialogTitle:'Save or share '+filename});
  });
}
window.nativeSaveAndShare=saveAndShare;

window.nativeShare=function(title,text){
  var SH=plug('Share');
  if(!SH)return Promise.reject(Error('Share plugin missing'));
  return SH.share({title:title,text:text,dialogTitle:title});
};

function report(e){
  var m='Could not save the file: '+(e&&e.message?e.message:e);
  if(window.AppModal)AppModal.alert(m,{title:'Export failed'});
}

/* app.js defines download() as a global function when it loads, so replace it after all scripts have run */
document.addEventListener('DOMContentLoaded',function(){
  window.download=function(filename,data,type){
    saveAndShare(filename,data,type).catch(function(e){
      if(e&&/cancel|dismiss/i.test(String(e.message||e)))return;
      report(e);
    });
  };
  window.print=function(){
    var area=document.getElementById('printArea');
    if(!area||!area.innerHTML.trim()){if(window.AppModal)AppModal.alert('Nothing to print.');return}
    var css='body{font-family:Arial,sans-serif;margin:24px;color:#000}table{border-collapse:collapse;width:100%;font-size:13px}'+
      'th,td{border:1px solid #888;padding:5px 7px;text-align:left}th{background:#e8efe9}.lhead{display:flex;gap:12px;align-items:center}'+
      '.lhead img{width:56px;height:56px}.lhead div{display:flex;flex-direction:column}.lhead span{font-size:12px;color:#444}';
    var html='<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'+
      '<title>Attendance eligibility list</title><style>'+css+'</style></head><body>'+area.innerHTML.replace(/src="logo\.png"/g,'src=""')+'</body></html>';
    saveAndShare('attendance-eligibility-list.html',html,'text/html').catch(function(e){
      if(e&&/cancel|dismiss/i.test(String(e.message||e)))return;
      report(e);
    });
  };
});

/* Android Back button */
var App=plug('App');
if(App&&App.addListener){
  App.addListener('backButton',function(ev){
    if(window.AppModal&&AppModal.dismiss())return;                      /* 1. in-app box open: cancel it */
    var open=document.querySelector('dialog[open]');
    if(open){try{open.close()}catch(e){}return}                          /* 2. PIN / admin / preview dialog */
    var backs=document.querySelectorAll('[onclick*="switchTab(\'home\')"]');
    for(var i=0;i<backs.length;i++){
      if(backs[i].offsetParent!==null){backs[i].click();return}         /* 3. the screen's own Back button */
    }
    if(ev&&ev.canGoBack){history.back();return}
    if(App.minimizeApp)App.minimizeApp();else if(App.exitApp)App.exitApp(); /* 4. keep the app alive in the background */
  });
}
})();
