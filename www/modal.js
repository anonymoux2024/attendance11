/* AppModal: in-app replacement for the browser's alert(), confirm() and prompt().
   Every function returns a Promise, so callers use:  await AppModal.confirm('Delete?')
     AppModal.alert(message, opts)                   -> Promise<void>
     AppModal.confirm(message, opts)                 -> Promise<boolean>
     AppModal.prompt(message, defaultValue, opts)    -> Promise<string|null>   (null = cancelled)
     AppModal.form({title,message,fields,...})       -> Promise<object|null>   (several inputs in one box)
     AppModal.dismiss()                              -> closes the open box as "cancelled" (Android back button)
     AppModal.isOpen()                               -> boolean
   opts: {title, okText, cancelText, danger, type, inputMode, maxLength, placeholder}
   The box is a <dialog> opened with showModal(), so it always sits above every other dialog in the app. */
(function(){
'use strict';
if(window.AppModal)return;
var queue=[],cur=null,dlg=null,seq=0;

function el(tag,cls,text){var e=document.createElement(tag);if(cls)e.className=cls;if(text!=null)e.textContent=text;return e}

function whenReady(fn){
  if(document.body)return fn();
  document.addEventListener('DOMContentLoaded',fn,{once:true});
}

function next(){
  if(cur||!queue.length)return;
  var job=queue.shift();
  whenReady(function(){show(job)});
}

function enqueue(spec){
  return new Promise(function(resolve){queue.push({spec:spec,resolve:resolve});next()});
}

function cancelValue(kind){return kind==='confirm'?false:kind==='alert'?undefined:null}

function show(job){
  var spec=job.spec,kind=spec.kind,id='am'+(++seq);
  var prevFocus=document.activeElement;
  dlg=el('dialog','am-dialog');
  dlg.setAttribute('role',kind==='alert'?'alertdialog':'dialog');
  dlg.setAttribute('aria-labelledby',id+'t');
  dlg.setAttribute('aria-describedby',id+'m');
  var card=el('div','am-card');
  var title=el('h2','am-title',spec.title);title.id=id+'t';
  var msg=el('p','am-msg',spec.message||'');msg.id=id+'m';
  if(!spec.message)msg.hidden=true;
  card.append(title,msg);

  var inputs=[],err=el('p','am-err','');err.setAttribute('role','alert');err.hidden=true;
  if(spec.fields&&spec.fields.length){
    var body=el('div','am-fields');
    spec.fields.forEach(function(f,i){
      var wrap=el('label','am-field');
      if(f.label)wrap.append(el('span','am-label',f.label));
      var inp=el('input','am-input');
      inp.type=f.type||'text';
      if(f.inputMode)inp.inputMode=f.inputMode;
      if(f.maxLength)inp.maxLength=f.maxLength;
      if(f.placeholder)inp.placeholder=f.placeholder;
      inp.autocomplete='off';inp.setAttribute('autocapitalize','off');inp.spellcheck=false;
      inp.value=f.value==null?'':String(f.value);
      inp.setAttribute('aria-label',f.label||spec.title);
      wrap.append(inp);body.append(wrap);inputs.push({f:f,inp:inp});
    });
    card.append(body,err);
  }

  var actions=el('div','am-actions');
  var cancelBtn=null;
  if(kind!=='alert'){cancelBtn=el('button','am-btn am-secondary',spec.cancelText||'Cancel');cancelBtn.type='button';actions.append(cancelBtn)}
  var okBtn=el('button','am-btn '+(spec.danger?'am-danger':'am-primary'),spec.okText||'OK');okBtn.type='button';
  actions.append(okBtn);card.append(actions);dlg.append(card);document.body.append(dlg);

  var done=false;
  function finish(value){
    if(done)return;done=true;
    try{dlg.close()}catch(e){}
    dlg.remove();dlg=null;cur=null;
    try{if(prevFocus&&prevFocus.focus)prevFocus.focus()}catch(e){}
    job.resolve(value);
    next();
  }
  function collect(){
    if(kind==='confirm')return true;
    if(kind==='alert')return undefined;
    if(kind==='prompt')return inputs[0].inp.value;
    var o={};inputs.forEach(function(x){o[x.f.name]=x.inp.value});return o;
  }
  function submit(){
    var v=collect();
    if(spec.validate){
      var m=spec.validate(v);
      if(m){err.textContent=m;err.hidden=false;
        var bad=inputs.filter(function(x){return x.f.name===spec.errorField})[0]||inputs[0];
        if(bad)bad.inp.focus();return}
    }
    finish(v);
  }
  cur={cancel:function(){finish(cancelValue(kind))},kind:kind};
  okBtn.onclick=submit;
  if(cancelBtn)cancelBtn.onclick=cur.cancel;
  dlg.addEventListener('cancel',function(e){e.preventDefault();cur&&cur.cancel()});   /* Esc key */
  dlg.addEventListener('keydown',function(e){
    if(e.key==='Enter'&&e.target&&e.target.tagName==='INPUT'){e.preventDefault();submit()}
  });
  if(typeof dlg.showModal==='function')dlg.showModal();else dlg.setAttribute('open','');
  requestAnimationFrame(function(){
    if(inputs.length){inputs[0].inp.focus();try{inputs[0].inp.select()}catch(e){}}else okBtn.focus();
  });
}

var AppModal={
  alert:function(message,opts){
    opts=opts||{};
    return enqueue({kind:'alert',title:opts.title||'Notice',message:String(message==null?'':message),okText:opts.okText});
  },
  confirm:function(message,opts){
    opts=opts||{};
    return enqueue({kind:'confirm',title:opts.title||'Please confirm',message:String(message==null?'':message),
      okText:opts.okText||'Yes',cancelText:opts.cancelText||'Cancel',danger:!!opts.danger});
  },
  prompt:function(message,defaultValue,opts){
    opts=opts||{};
    return enqueue({kind:'prompt',title:opts.title||'Enter a value',message:String(message==null?'':message),
      okText:opts.okText||'OK',cancelText:opts.cancelText||'Cancel',
      fields:[{name:'value',type:opts.type,inputMode:opts.inputMode,maxLength:opts.maxLength,placeholder:opts.placeholder,
        value:defaultValue==null?'':defaultValue}]});
  },
  form:function(spec){
    spec=spec||{};
    return enqueue({kind:'form',title:spec.title||'Details',message:spec.message||'',fields:spec.fields||[],
      okText:spec.okText||'Save',cancelText:spec.cancelText||'Cancel',danger:!!spec.danger,
      validate:spec.validate,errorField:spec.errorField});
  },
  dismiss:function(){if(cur){cur.cancel();return true}return false},
  isOpen:function(){return !!cur}
};
window.AppModal=AppModal;

/* Safety net: any stray native dialog can never appear. alert() becomes the in-app box;
   confirm() and prompt() cannot be made synchronous, so they log a warning and answer "no". */
window.alert=function(m){AppModal.alert(m)};
window.confirm=function(){console.warn('Native confirm() is disabled. Use await AppModal.confirm().');return false};
window.prompt=function(){console.warn('Native prompt() is disabled. Use await AppModal.prompt().');return null};
})();
