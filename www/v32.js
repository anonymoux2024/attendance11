/* Feg-tech 3.3: lecturer accounts, courses, HOD dashboard, big QR. Loads last. */
(()=>{
const $=id=>document.getElementById(id),$$=s=>[...document.querySelectorAll(s)];
const L=()=>db.lecturers||(db.lecturers=[]),C=()=>db.courses||(db.courses=[]);
let me=null,role=null,arole='lecturer',amode='in';
const el=(t,c,x)=>{const e=document.createElement(t);if(c)e.className=c;if(x!=null)e.textContent=x;return e};
const sha=async s=>{try{return [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode('fc|'+s)))].map(b=>b.toString(16).padStart(2,'0')).join('')}catch{return 'p:'+s}};
const day=i=>new Date(i).toLocaleDateString('en-CA'),key=s=>ck(s.code||s.title);
const enr=s=>db.students.filter(x=>!s.level||!x.level||x.level===s.level||(x.co||[]).some(c=>ck(c)===ck(s.code||s.title))).length,pres=s=>db.attendance.filter(a=>a.sessionId===s.id).length,pct=(p,e)=>e?Math.round(p/e*100):0;
const lname=id=>(L().find(l=>l.id===id)||{}).name||'—',isOpen=s=>Date.now()<new Date(s.endsAt).getTime();
const tm=i=>new Date(i).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}),set=(id,v)=>{$(id).textContent=v};
/* ---------- sign in / sign up ---------- */
function authUi(){$('authLect').hidden=arole!=='lecturer';$('authHod').hidden=arole!=='hod';$('authMode').hidden=arole!=='lecturer';$('auName').hidden=amode!=='up';
  $$('#authOv [data-role]').forEach(b=>b.classList.toggle('on',b.dataset.role===arole));$$('#authOv [data-mode]').forEach(b=>b.classList.toggle('on',b.dataset.mode===amode));$('auMsg').textContent='';$('auGo').textContent=arole==='lecturer'&&amode==='up'?'Create account':'Continue'}
function openAuth(){['auName','auId','auPin','auHodPin'].forEach(i=>$(i).value='');arole='lecturer';amode='in';authUi();$('authOv').hidden=false}
$$('#authOv [data-role]').forEach(b=>b.onclick=()=>{arole=b.dataset.role;authUi()});$$('#authOv [data-mode]').forEach(b=>b.onclick=()=>{amode=b.dataset.mode;authUi()});
window.switchRole=async()=>{me=role=null;window.curLect=null;await switchTab('home');openAuth()};
window.fcLogin=openAuth;
$('auGo').onclick=async()=>{const bad=t=>$('auMsg').textContent=t;
  if(arole==='hod'){if($('auHodPin').value!==(window.hodPin?hodPin():PIN_CODE))return bad('Wrong PIN.');role='hod';me=null}
  else{const sid=$('auId').value.trim(),pin=$('auPin').value;if(!sid||!/^\d{4,6}$/.test(pin))return bad('Enter your staff ID and a 4 to 6 digit PIN.');
    if(amode==='up'){const name=$('auName').value.trim();if(!name)return bad('Enter your full name.');if(L().some(l=>ck(l.staffId)===ck(sid)))return bad('That staff ID is already registered. Sign in instead.');
      me={id:uid(),name,staffId:sid,pin:await sha(pin),created:new Date().toISOString()};L().push(me);save()}
    else{const l=L().find(x=>ck(x.staffId)===ck(sid));if(!l||l.pin!==await sha(pin))return bad('Wrong staff ID or PIN.');me=l}
    role='lecturer'}
  window.curLect=me;$('authOv').hidden=true;switchTab('home')};
function classInit(){const s=$('courseSel');s.replaceChildren(new Option('Other (type the course below)',''));if(me)C().filter(c=>courseLects(c).includes(me.id)).forEach(c=>s.append(new Option(c.code+' · '+c.name+(c.schedule?' ('+c.schedule+')':''),c.id)));
  $$('#class .tdhead p')[0].textContent=me?'Signed in as '+me.name:'Manage your classes and attendance'}
$('courseSel').onchange=()=>{const c=C().find(x=>x.id===$('courseSel').value);if(c){$('className').value=c.name;$('classCode').value=c.code}};
$('qrCanvas').onclick=()=>$('qrCanvas').closest('.qrbox').classList.toggle('full');
/* ---------- HOD ---------- */
function hv(n){$$('.hv').forEach(v=>v.hidden=v.id!=='hv-'+n);if(n==='attendance'||n==='reports'){renderHod();statsText()}scrollTo(0,0);window.dispatchEvent(new CustomEvent('fc-hv',{detail:n}))}
window.fcHv=hv;window.fcRole=()=>role;window.fcMe=()=>me;
$$('[data-go]').forEach(b=>b.onclick=()=>hv(b.dataset.go));
function table(box,head,rows){box.replaceChildren();const t=el('table'),h=el('tr');head.forEach(x=>h.append(el('th','',x)));t.append(h);rows.forEach(r=>{const tr=el('tr');r.forEach(v=>tr.append(el('td','',v)));t.append(tr)});box.append(t);if(!rows.length)box.append(el('p','muted','No data yet.'))}
function groups(kf,lf){const m=new Map();db.sessions.forEach(s=>{const k=kf(s),g=m.get(k)||{lab:lf(s),n:0,p:0,e:0};g.n++;g.p+=pres(s);g.e+=enr(s);m.set(k,g)});return [...m.values()].map(g=>[g.lab,g.n,g.p,pct(g.p,g.e)+'%'])}
function activeRows(){const box=$('activeList');box.replaceChildren();const a=db.sessions.filter(isOpen);if(!a.length){box.append(el('p','muted','No class is running right now.'));return}
  a.forEach((s,i)=>{const r=el('div','arow'),p=pres(s),e=enr(s),c1=el('div'),c2=el('div'),c3=el('div');r.style.setProperty('--c',['#2b7cff','#8b5cf6','#f59e0b'][i%3]);
    c1.append(el('b','',s.code||'—'),el('small','',s.title));c2.append(el('span','',lname(s.lecturerId)),el('small','',tm(s.created)+' – '+tm(s.endsAt)));c3.append(el('b','',p+' / '+e),el('small','','('+pct(p,e)+'%)'));r.append(c1,c2,c3,el('span','badge','Active'));box.append(r)})}
async function addLect(){const r=await AppModal.form({title:'Add lecturer',okText:'Add lecturer',fields:[{name:'name',label:'Lecturer full name',maxLength:100},{name:'sid',label:'Staff ID',maxLength:30},{name:'pin',label:'PIN (4 to 6 digits)',type:'password',inputMode:'numeric',maxLength:6}],errorField:'pin',validate:v=>{if(!v.name.trim()||!v.sid.trim())return'Enter the full name and the staff ID.';if(!/^\d{4,6}$/.test(v.pin))return'PIN must be 4 to 6 digits.';if(L().some(l=>ck(l.staffId)===ck(v.sid.trim())))return'That staff ID already exists.';return''}});if(!r)return;const name=r.name.trim(),sid=r.sid.trim(),pin=r.pin;L().push({id:uid(),name,staffId:sid,pin:await sha(pin),created:new Date().toISOString()});save()}
async function editLect(l){const r=await AppModal.form({title:'Edit lecturer',fields:[{name:'name',label:'Full name',value:l.name,maxLength:100},{name:'sid',label:'Staff ID',value:l.staffId,maxLength:30},{name:'pin',label:'New PIN (4 to 6 digits). Leave empty to keep the current PIN.',type:'password',inputMode:'numeric',maxLength:6}],errorField:'pin',validate:v=>{if(v.pin&&!/^\d{4,6}$/.test(v.pin))return'PIN must be 4 to 6 digits.';if(!v.name.trim()||!v.sid.trim())return'Name and staff ID cannot be empty.';if(L().some(x=>x!==l&&ck(x.staffId)===ck(v.sid.trim())))return'That staff ID already exists.';return''}});if(!r)return;l.name=r.name.trim();l.staffId=r.sid.trim();if(r.pin)l.pin=await sha(r.pin);save()}
$('lAdd').onclick=addLect;
function lectView(){const box=$('lectList');box.replaceChildren();if(!L().length)box.append(el('p','muted','No lecturers yet. Lecturers sign up on their own phone (key icon), then send you a backup file to merge in Reports.'));
  L().forEach(l=>{const r=el('div','student'),i=el('div'),b=el('div','btns'),e=el('button','secondary small','Edit'),d=el('button','danger small','Remove');
    i.append(el('strong','',l.name),el('small','',l.staffId+' · '+(C().filter(c=>courseLects(c).includes(l.id)).map(c=>c.code).join(', ')||'no courses')));
    e.onclick=()=>editLect(l);d.onclick=async()=>{if(!await AppModal.confirm('Remove '+l.name+'? They are taken off all their courses.',{danger:true,okText:'Yes, remove'}))return;window.tomb('lecturers',l.id);db.lecturers=L().filter(x=>x.id!==l.id);C().forEach(c=>{if(courseLects(c).includes(l.id))setCourseLects(c,courseLects(c).filter(x=>x!==l.id))});save()};b.append(e,d);r.append(i,b);box.append(r)})}
function lectSelect(v){const s=document.createElement('select');s.append(new Option('Unassigned',''));L().forEach(l=>s.append(new Option(l.name,l.id)));s.value=v||'';return s}
function pickedNew(){return[...document.querySelectorAll('#cLect input:checked')].map(x=>x.value)}
function courseView(){const keep=new Set(pickedNew()),pk=$('cLect');pk.replaceChildren();if(!L().length)pk.append(el('small','muted','No lecturers yet. Add lecturers first, or assign them later.'));L().forEach(l=>{const lb=el('label','lpickrow'),cb=document.createElement('input');cb.type='checkbox';cb.value=l.id;cb.checked=keep.has(l.id);lb.append(cb,el('span','',l.name));pk.append(lb)});const box=$('courseList');box.replaceChildren();if(!C().length)box.append(el('p','muted','No courses yet.'));
  C().forEach(c=>{const r=el('div','student'),i=el('div'),b=el('div','btns'),s=el('select'),d=el('button','danger small','Delete'),ids=courseLects(c).filter(id=>L().some(l=>l.id===id)),chips=el('div','chips');
    i.append(el('strong','',c.code+' · '+c.name),el('small','',c.schedule||'No schedule'));
    if(!ids.length)chips.append(el('small','muted','No lecturer assigned'));
    ids.forEach(id=>{const ch=el('span','chip'),x=el('button','chipx','×');ch.append(el('span','',lname(id)),x);x.type='button';x.setAttribute('aria-label','Remove '+lname(id)+' from '+c.code);x.onclick=()=>{setCourseLects(c,courseLects(c).filter(y=>y!==id));save()};chips.append(ch)});i.append(chips);
    s.append(new Option('+ Add lecturer',''));L().filter(l=>!ids.includes(l.id)).forEach(l=>s.append(new Option(l.name,l.id)));s.hidden=!s.options.length||s.options.length<2;s.onchange=()=>{if(!s.value)return;setCourseLects(c,[...courseLects(c),s.value]);save()};d.onclick=async()=>{if(await AppModal.confirm('Delete '+c.code+'?',{danger:true,okText:'Delete'})){window.tomb('courses',c.id);db.courses=C().filter(x=>x!==c);save()}};const ed=el('button','secondary small','Edit');ed.onclick=async()=>{const r=await AppModal.form({title:'Edit course',fields:[{name:'code',label:'Course code',value:c.code,maxLength:20},{name:'name',label:'Course name',value:c.name,maxLength:120},{name:'sch',label:'Class schedule',value:c.schedule||'',maxLength:120}],errorField:'code',validate:v=>{const cd=v.code.trim().toUpperCase();if(!cd||!v.name.trim())return'Enter the course code and name.';if(C().some(x=>x!==c&&ck(x.code)===ck(cd)))return'That course code already exists.';return''}});if(!r)return;c.code=r.code.trim().toUpperCase();c.name=r.name.trim();c.schedule=r.sch.trim();save()};b.append(s,ed,d);r.append(i,b);box.append(r)})}
$('cAdd').onclick=()=>{const code=$('cCode').value.trim().toUpperCase(),name=$('cName').value.trim();if(!code||!name)return AppModal.alert('Enter the course code and name.');if(C().some(c=>ck(c.code)===ck(code)))return AppModal.alert('That course code already exists.');C().push({id:uid(),code,name,schedule:$('cSched').value.trim(),lecturerIds:pickedNew(),lecturerId:pickedNew()[0]||null});['cCode','cName','cSched'].forEach(i=>$(i).value='');document.querySelectorAll('#cLect input').forEach(x=>x.checked=false);save()};
function statsText(){const ss=db.sessions,P=ss.reduce((n,s)=>n+pres(s),0),E=ss.reduce((n,s)=>n+enr(s),0),low=hodRows().filter(r=>r.total&&!r.ok).length;set('statsBox',`Classes held: ${ss.length}\nStudent check-ins: ${P}\nOverall attendance rate: ${pct(P,E)}%\nStudent-course results below ${hodThr()}%: ${low}`)}
function hodDash(){const ss=db.sessions,today=day(new Date()),ts=ss.filter(s=>day(s.created)===today),P=a=>a.reduce((n,s)=>n+pres(s),0),E=a=>a.reduce((n,s)=>n+enr(s),0),rate=pct(P(ss),E(ss));
  set('hodDept',db.dept||'Tap the settings icon to set the department');set('stLect',L().length);set('stCourse',C().length||new Set(ss.map(key)).size);set('stToday',ts.length);set('stRate',rate+'%');$('ring').style.background=`conic-gradient(#22d3b6 ${rate*3.6}deg,#1b2a4a 0)`;set('ovToday',pct(P(ts),E(ts))+'%');
  activeRows();lectView();courseView();table($('byCourse'),['Course','Classes','Present','Rate'],groups(key,s=>(s.code?s.code+' · ':'')+s.title));table($('byLect'),['Lecturer','Classes','Present','Rate'],groups(s=>s.lecturerId||'',s=>lname(s.lecturerId)));renderHod()}
$('deptBtn').onclick=async()=>{const v=await AppModal.prompt('Enter the department name.',db.dept||'',{title:'Department name',maxLength:120});if(v===null)return;db.dept=v.trim();save()};
$('hLogout').onclick=()=>window.switchRole();
$('hodDate').onchange=renderHod;
/* ---------- wiring ---------- */
const sw0=switchTab;switchTab=async t=>{await sw0(t);if(t==='class')classInit();if(t==='hod'){hv('main');hodDash()}};
const r0=render;render=()=>{r0();if(currentTab==='hod')hodDash()};
/* ---------- backup / restore / merge (now include lecturers and courses) ---------- */
late('backupBtn','onclick',()=>download('facecheck-backup.json',JSON.stringify({format:'facecheck-pwa-face-v2',...db},null,2),'application/json'));
late('restoreInput','onchange',async e=>{const f=e.target.files[0];if(!f)return;try{const v=JSON.parse(await f.text());if(v.format!=='facecheck-pwa-face-v2'||!Array.isArray(v.students)||!Array.isArray(v.sessions)||!Array.isArray(v.attendance))throw Error('Invalid backup');if(await AppModal.confirm('Replace existing data?',{danger:true,okText:'Replace'})){db={students:v.students,sessions:v.sessions,attendance:v.attendance,lecturers:v.lecturers||[],courses:v.courses||[],dept:v.dept||''};save()}}catch(err){AppModal.alert(err.message)}finally{e.target.value=''}});
$('mergeInput').onchange=async e=>{for(const f of e.target.files){try{const v=JSON.parse(await f.text());if(!Array.isArray(v.students)||!Array.isArray(v.sessions)||!Array.isArray(v.attendance))throw 0;const map={},lm={};
  for(const l of v.lecturers||[]){let m=L().find(x=>x.id===l.id||ck(x.staffId)===ck(l.staffId));if(!m){m=l;L().push(m)}lm[l.id]=m.id}
  for(const c of v.courses||[]){const ids=courseLects(c).map(i=>lm[i]||i),ex=C().find(x=>ck(x.code)===ck(c.code));if(!ex){const n={...c};setCourseLects(n,ids);C().push(n)}else if(ids.some(i=>!courseLects(ex).includes(i)))setCourseLects(ex,[...courseLects(ex),...ids])}
  if(!db.dept&&v.dept)db.dept=v.dept;
  for(const s of v.students){let m=db.students.find(x=>ck(x.name)===ck(s.name)&&(x.level||'')===(s.level||''));if(!m){m=s;db.students.push(m)}map[s.id]=m.id}
  for(const s of v.sessions)if(!db.sessions.some(x=>x.id===s.id))db.sessions.push({...s,lecturerId:lm[s.lecturerId]||s.lecturerId||null});
  for(const a of v.attendance){const sid=map[a.studentId];if(sid&&!db.attendance.some(x=>x.id===a.id))db.attendance.push({...a,studentId:sid})}}catch{AppModal.alert('Skipped invalid backup: '+f.name)}}
  db.sessions.sort((a,b)=>a.created<b.created?-1:1);save();e.target.value=''};
window.editLect=editLect;
/* the app starts on the sign-in screen */
openAuth();
})();
