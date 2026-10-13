// 比比看：班級與成績簿（接中央訂閱專案 subscription-48d3c，做法同跑吧！漢字 corre）
// - 學生：打開 ?class=<班級碼>（可再加老師範圍 &lv=…），輸入暱稱；每玩完一回合，把每題作答寫進 class_plays
// - 老師：Google 登入、讀方案（site_plans）、共用班級（teacher_classes / classes）、成績簿與常錯統計、匯出 CSV
// - 練習紙：訂閱才能用
// Firebase SDK 只在需要時才載入（一般學生玩遊戲不會載入）。
// 依賴 index.html 的引擎（S、RANGE、DIMS、THEME、judge、startRound、renderResult、renderMenu、zh、esc、cfg…）與 teacher.js（tc）。
(function(){
'use strict';
const CENTRAL={
  apiKey:"AIzaSyCHZz8Hh7m45bJfZC9aK_f_NvUD-aUeuzU",
  authDomain:"subscription-48d3c.firebaseapp.com",
  projectId:"subscription-48d3c",
  storageBucket:"subscription-48d3c.firebasestorage.app",
  messagingSenderId:"276281656991",
  appId:"1:276281656991:web:de242ba22373816c3044aa"
};
const SDK='https://www.gstatic.com/firebasejs/10.12.2/';
const PORTAL_URL='https://wangchiapin.github.io/cadadiaunosminutos-share-zone/';
const GAME='bbk',MAX_CLASSES=3;
const qp=new URLSearchParams(location.search);
const THEME_NAME=(qp.get('theme')||'people').replace(/[^\w-]/g,'')||'people';
const rawCid=(qp.get('class')||'').trim().toLowerCase();
const CLASS_ID=/^[a-z0-9]{8,32}$/.test(rawCid)?rawCid:'';
const LS_T='bbk_t',LS_NICK='bbk_nick_'+CLASS_ID;
const lsGet=k=>{try{return localStorage.getItem(k);}catch(e){return null;}};
const lsSet=(k,v)=>{try{if(v===null)localStorage.removeItem(k);else localStorage.setItem(k,v);}catch(e){}};

// 句型名稱：[中, 西]
const FN={
  BI:['A 比 B ＋形容詞','A es más … que B'],MEI:['A 沒有 B 那麼…','A no es tan … como B'],
  DEG:['比…一點／很多','un poco / mucho más'],DIFF:['比…＋具體差距','diferencia exacta'],
  GENG:['比…更／還','aún más'],SAME:['跟…一樣','tan … como'],ABOUT:['差不多','casi igual'],DIFFER:['不一樣','no son iguales'],
  MORE:['誰比較…？','¿Quién es más…?'],WHOBI:['誰比 A …？','¿Quién es más … que A?'],BIWHO:['A 比誰…？','A es más … que ¿quién?'],MOST:['誰最…？','¿Quién es el más…?'],
};

// ---- 狀態 ----
const C={
  ready:null,app:null,auth:null,db:null,user:null,authSeen:false,
  cls:null,clsState:CLASS_ID?'loading':'',   // loading | ok | missing | error
  nick:CLASS_ID?(lsGet(LS_NICK)||''):'',nickMsg:'',
  open:false,notice:'',acct:'',        // acct: '' | loading | ok | error
  plan:{plan:'free',expiresAt:null,active:false},
  cslots:{},classes:{},clsReady:true,msg:'',
  view:null,plays:[],playsState:'',tab:'stu',sel:null,days:0,copyMsg:'',
};

// ---- Firebase（compat SDK，需要時才載入）----
function loadScript(src){return new Promise((res,rej)=>{const el=document.createElement('script');el.src=src;el.onload=res;el.onerror=()=>rej(new Error('load failed: '+src));document.head.appendChild(el);});}
function init(){
  if(!C.ready)C.ready=(async()=>{
    if(!window.firebase||!firebase.initializeApp){await loadScript(SDK+'firebase-app-compat.js');}
    if(!firebase.auth)await loadScript(SDK+'firebase-auth-compat.js');
    if(!firebase.firestore)await loadScript(SDK+'firebase-firestore-compat.js');
    C.app=firebase.initializeApp(CENTRAL);C.auth=C.app.auth();C.db=C.app.firestore();
    await new Promise(res=>{let first=true;C.auth.onAuthStateChanged(u=>{C.user=u;C.authSeen=true;if(first){first=false;res();}else onAuth();});});
    return C.app;
  })().catch(e=>{C.ready=null;throw e;});
  return C.ready;}
const isReal=u=>!!(u&&!u.isAnonymous&&u.email);
const tsMs=v=>(v&&typeof v.toMillis==='function')?v.toMillis():(typeof v==='number'?v:null);
const planActiveOf=p=>!!p&&['month','year','trial','pro'].indexOf(p.plan)>=0&&!!p.expiresAt&&p.expiresAt>Date.now();
const serverTs=()=>firebase.firestore.FieldValue.serverTimestamp();
function errText(e){const c=e&&e.code||'';
  if(/permission/.test(c))return zh('沒有權限（老師的訂閱可能已到期，或中央專案還沒貼上比比看的規則）');
  if(/unavailable|network/.test(c)||/load failed/.test(e&&e.message||''))return zh('連不上網路，請稍後再試');
  return (e&&e.message)||c||'error';}
function rerender(){if(C.view)return renderClass();if(!S&&!document.body.classList.contains('wsmode'))renderMenu();}

// 暱稱 → 16 碼雜湊（與 corre 相同：不分大小寫與空白）
async function nickHash(nick){
  const norm=String(nick).normalize('NFKC').trim().toLowerCase().replace(/\s+/g,' ');
  try{const buf=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(norm));
    return Array.from(new Uint8Array(buf)).slice(0,8).map(b=>b.toString(16).padStart(2,'0')).join('');}
  catch(e){let h1=0x811c9dc5,h2=0x01000193;for(const ch of norm){const c=ch.codePointAt(0);h1=Math.imul(h1^c,16777619)>>>0;h2=Math.imul(h2+c,2246822519)>>>0;}
    return h1.toString(16).padStart(8,'0')+h2.toString(16).padStart(8,'0');}}

// ================= 學生：班級連結 =================
async function loadClass(){
  try{await init();
    if(!C.user)await C.auth.signInAnonymously();
    const s=await C.db.collection('classes').doc(CLASS_ID).get();
    if(!s.exists){C.clsState='missing';}else{C.cls=s.data();C.clsState='ok';}
  }catch(e){console.warn('class load failed',e);C.clsState='error';}
  rerender();}
const classMode=()=>!!CLASS_ID;
const canUpload=()=>CLASS_ID&&C.clsState==='ok'&&!!C.nick;

const bi=(z,es)=>esc(zh(z))+(cfg.help==='none'?'':`<small>${esc(es)}</small>`);
function bannerHtml(){
  let h=`<div class="panel clsb"><h3>🏫 `;
  if(C.clsState==='loading')return h+`${bi('正在連線到班級…','Conectando con la clase…')}</h3></div>`;
  if(C.clsState==='missing')return h+`${bi('找不到這個班級','No se encontró la clase')}</h3><div class="note" style="text-align:left">${bi('可以照常玩，但成績不會傳給老師。','Puedes jugar, pero tu puntuación no llegará al profesor.')}</div></div>`;
  if(C.clsState==='error')return h+`${bi('連不上班級','No se pudo conectar')}</h3><div class="note" style="text-align:left">${bi('可以照常玩，但成績不會傳給老師。','Puedes jugar, pero tu puntuación no llegará al profesor.')}</div></div>`;
  h+=`${esc(C.cls.name)}</h3>`;
  if(C.nick)h+=`<div class="clsrow">${bi('暱稱','Apodo')}：<b>${esc(C.nick)}</b><button class="tmini" onclick="cr.editNick()">${esc(zh('更改'))}${cfg.help==='none'?'':' / Cambiar'}</button></div>
    <div class="note" style="text-align:left">${bi('每玩完一回合，成績會自動傳給老師。','Al terminar cada ronda, tu puntuación se envía al profesor.')}</div>`;
  else h+=`<div class="clsrow"><input id="nickIn" maxlength="16" placeholder="${esc(zh('你的暱稱'))} / Tu apodo" onkeydown="if(event.key==='Enter')cr.setNick()"><button class="opt on" style="flex:none;min-width:70px" onclick="cr.setNick()">${esc(zh('確定'))}</button></div>
    <div class="note" style="text-align:left">${bi('先輸入暱稱（老師認得出來的名字）才能開始。','Escribe un apodo que tu profesor reconozca para empezar.')}</div>${C.nickMsg?`<div class="nickmsg">${esc(C.nickMsg)}</div>`:''}`;
  return h+'</div>';}

// 每題作答紀錄
function recordAnswer(){const q=S.qs[S.i];S.log=S.log||[];if(S.log[S.i])return;
  const r={t:q.type,d:q.d.key,f:q.f||'',p:q.pol||0,ok:S.gain>0,f1:S.gain===10,ids:q.its.map(p=>p.id)};
  if(q.type==='tf')r.tv=!!q.tv;
  S.log[S.i]=r;}
function rangeStr(rg){if(!rg)return '';const o=[];if(rg.dims&&rg.dims.length)o.push('d='+rg.dims.join(','));if(rg.types&&rg.types.length)o.push('t='+rg.types.join(','));o.push('n='+rg.n);return o.join('&');}
async function upload(){
  const el=()=>document.getElementById('clsUp');const set=(t,c)=>{const e=el();if(e){e.className='clsup '+(c||'');e.innerHTML=t;}};
  try{await init();if(!C.user)await C.auth.signInAnonymously();
    const qs=(S.log||[]).filter(Boolean);if(!qs.length){set('');return;}
    const h=await nickHash(C.nick);
    await C.db.collection('class_plays').add({cid:CLASS_ID,owner:C.cls.owner,game:GAME,h,nick:C.nick,at:serverTs(),th:THEME_NAME,
      lv:S.lv,rg:rangeStr(RANGE),score:S.score,max:S.qs.length*10,qs});
    S.sent=true;set('✓ '+bi('成績已傳給老師','Puntuación enviada al profesor'),'ok');
  }catch(e){console.warn('upload failed',e);set('⚠ '+bi('成績沒有傳出去：','No se pudo enviar: ')+esc(errText(e))+` <button class="tmini" onclick="cr.retry()">${esc(zh('再試一次'))}${cfg.help==='none'?'':' / Reintentar'}</button>`,'no');}}

// ---- 接上引擎 ----
const _judge=judge;
judge=function(ok,key){const was=S&&S.done;_judge(ok,key);if(S&&!was&&S.done)recordAnswer();};
const _start=startRound;
startRound=function(lv,rg){
  if(classMode()&&C.clsState==='ok'&&!C.nick){C.nickMsg=zh('請先輸入暱稱')+(cfg.help==='none'?'':' / Escribe tu apodo primero');if(S)S=null;renderMenu();const i=document.getElementById('nickIn');if(i)i.focus();window.scrollTo(0,0);return;}
  if(classMode()&&C.clsState==='loading'){return;}
  return _start.apply(this,arguments);};
const _result=renderResult;
renderResult=function(){_result();
  if(!canUpload())return;
  const p=document.createElement('div');p.id='clsUp';p.className='clsup';p.innerHTML=`${esc(C.nick)} · ${bi('傳送成績中…','Enviando…')}`;
  const m=app.querySelector('.score+p');if(m)m.after(p);else app.appendChild(p);
  upload();};
const _hook=window.teacherHook;
window.teacherHook=function(levels){const base=_hook?_hook(levels):levels;
  if(classMode())return base;
  return base+acctHtml();};
// 學生班級資訊放在選單最上面（標題下方）
const _menu=renderMenu;
renderMenu=function(){_menu();if(!classMode())return;const sub=app.querySelector('.sub');if(!sub)return;
  const w=document.createElement('div');w.innerHTML=bannerHtml();sub.after(w.firstElementChild);};

// ================= 老師：帳號、方案、班級 =================
function onAuth(){if(!classMode()&&isReal(C.user)){lsSet(LS_T,'1');loadAccount();}else{C.acct='';C.view=null;rerender();}}
async function openAcct(){C.open=true;rerender();
  try{await init();}catch(e){C.acct='error';C.msg=errText(e);rerender();return;}
  if(isReal(C.user)&&C.acct==='')loadAccount();else rerender();}
async function loadAccount(){C.acct='loading';rerender();
  const u=C.user;
  try{
    const mref=C.db.collection('site_members').doc(u.uid);const m=await mref.get();
    if(!m.exists)await mref.set({email:u.email||'',name:u.displayName||'',createdAt:serverTs()});
    const p=await C.db.collection('site_plans').doc(u.uid).get();const d=p.exists?p.data():{};
    C.plan={plan:d.plan||'free',expiresAt:tsMs(d.expiresAt)};C.plan.active=planActiveOf(C.plan);
    await loadClasses();
    C.acct='ok';
  }catch(e){console.error(e);C.acct='error';C.msg=errText(e);}
  rerender();}
async function loadClasses(){C.cslots={};C.classes={};C.clsReady=true;
  try{const ix=await C.db.collection('teacher_classes').doc(C.user.uid).get();
    C.cslots=ix.exists?(ix.data().slots||{}):{};
    await Promise.all(Object.keys(C.cslots).map(async k=>{try{const s=await C.db.collection('classes').doc(C.cslots[k]).get();if(s.exists)C.classes[k]={cid:s.id,data:s.data()};}catch(e){console.warn('class read failed',k,e);}}));
  }catch(e){console.warn('classes unavailable',e);C.clsReady=false;}}
function newCid(){const a='abcdefghijklmnopqrstuvwxyz0123456789',b=new Uint8Array(12);crypto.getRandomValues(b);return Array.from(b,x=>a[x%a.length]).join('');}
const fdate=ms=>{if(!ms)return '';const d=new Date(ms),p=n=>String(n).padStart(2,'0');return `${d.getFullYear()}/${p(d.getMonth()+1)}/${p(d.getDate())}`;};
const ftime=ms=>{if(!ms)return '';const d=new Date(ms),p=n=>String(n).padStart(2,'0');return `${fdate(ms)} ${p(d.getHours())}:${p(d.getMinutes())}`;};

function acctHtml(){
  let h=`<div class="panel tpanel" id="acctPanel"><button class="topen" onclick="cr.toggle()"><span>📊 ${bi('班級成績簿（老師登入）','Clases y notas (profesor)')}</span><span>${C.open?'▲':'▼'}</span></button>`;
  if(!C.open)return h+'</div>';
  if(C.notice==='sheet')h+=`<div class="notice">🔒 ${bi('練習紙是訂閱功能。請先登入；訂閱中的老師就能使用。','La hoja de práctica es para suscriptores. Inicia sesión primero.')}</div>`;
  if(!C.authSeen&&C.acct!=='error')return h+`<div class="note">${esc(zh('載入中…'))}</div></div>`;
  if(!isReal(C.user)){
    h+=`<div class="tsum" style="line-height:1.7">${bi('免費：自選範圍、分享連結。','Gratis: rango propio y enlace para compartir.')}<br>${bi('訂閱：建立班級、成績簿與常錯統計、練習紙。','Suscripción: clases, notas y errores frecuentes, hoja de práctica.')}</div>
      <button class="big" onclick="cr.login()">${bi('用 Google 登入','Entrar con Google')}</button>${C.msg?`<div class="nickmsg">${esc(C.msg)}</div>`:''}`;
    return h+'</div>';}
  h+=`<div class="clsrow" style="justify-content:space-between"><span style="font-size:.9rem">${esc(C.user.email)}</span><button class="tmini" onclick="cr.logout()">${esc(zh('登出'))}${cfg.help==='none'?'':' / Salir'}</button></div>`;
  if(C.acct==='loading'||C.acct==='')return h+`<div class="note">${esc(zh('載入中…'))}</div></div>`;
  if(C.acct==='error')return h+`<div class="nickmsg">${esc(C.msg)}</div><button class="big sec" onclick="cr.reload()">${bi('重新載入','Recargar')}</button></div>`;
  const P=C.plan;
  h+=`<div class="clsrow">${bi('方案','Plan')}：<b>${P.active?esc(zh('訂閱'))+(cfg.help==='none'?'':' / Suscripción'):esc(zh('免費'))+(cfg.help==='none'?'':' / Gratis')}</b>${P.expiresAt?`<span class="note">　${esc(zh(P.active?'到期':'已到期'))} ${fdate(P.expiresAt)}</span>`:''}</div>`;
  if(!P.active)h+=`<div class="notice">${bi('建立班級、成績簿、練習紙需要訂閱。','Clases, notas y hoja de práctica requieren suscripción.')} <a href="${PORTAL_URL}" target="_blank" rel="noopener">${esc(zh('了解訂閱'))}</a></div>`;
  if(!C.clsReady)h+=`<div class="notice">${bi('班級功能暫時讀不到。','No se pudieron cargar las clases.')}</div>`;
  h+=`<div class="tsec">${bi('我的班級','Mis clases')}<small>${esc(zh('（跟跑吧！漢字、色數消消樂共用，成績各遊戲分開）'))}</small></div>`;
  for(let i=0;i<MAX_CLASSES;i++){const c=C.classes[String(i)];
    if(c)h+=`<div class="clsitem"><b>${esc(c.data.name)}</b><button class="opt on" style="flex:none" onclick="cr.openClass('${i}')">${bi('打開','Abrir')}</button></div>`;
    else if(P.active)h+=`<div class="clsitem empty"><input id="newCls${i}" maxlength="40" placeholder="${esc(zh('班級名稱'))} / Nombre"><button class="opt" style="flex:none" onclick="cr.create(${i})">＋ ${esc(zh('建立'))}</button></div>`;
    else h+=`<div class="clsitem empty"><span class="note">🔒 ${esc(zh('班級 '+(i+1)))}</span></div>`;}
  if(C.msg)h+=`<div class="nickmsg">${esc(C.msg)}</div>`;
  return h+'</div>';}

async function createClass(slot){
  const inp=document.getElementById('newCls'+slot);const name=(inp&&inp.value||'').trim();
  if(!name){C.msg=zh('請輸入班級名稱');return rerender();}
  C.msg=zh('建立中…');rerender();
  try{const ts=serverTs(),cid=newCid(),slots=Object.assign({},C.cslots,{[String(slot)]:cid});
    const b=C.db.batch();
    b.set(C.db.collection('teacher_classes').doc(C.user.uid),{slots,updatedAt:ts});
    b.set(C.db.collection('classes').doc(cid),{owner:C.user.uid,slot,name,showBoard:false,updatedAt:ts});
    await b.commit();C.msg='';await loadClasses();openClass(String(slot));
  }catch(e){console.error(e);C.msg=errText(e);rerender();}}

// ================= 班級成績簿 =================
async function openClass(k){C.view=k;C.tab='stu';C.sel=null;C.copyMsg='';C.playsState='loading';renderClass();window.scrollTo(0,0);await loadPlays();}
async function loadPlays(){const c=C.classes[C.view];if(!c)return;C.playsState='loading';renderClass();
  try{const snap=await C.db.collection('class_plays').where('owner','==',C.user.uid).where('cid','==',c.cid).limit(3000).get();
    C.plays=snap.docs.map(d=>Object.assign({id:d.id},d.data(),{ms:tsMs(d.data().at)||0})).filter(r=>r.game===GAME).sort((a,b)=>b.ms-a.ms);
    C.playsState='ok';
  }catch(e){console.error(e);C.playsState='error';C.msg=errText(e);}
  renderClass();}
const inDays=r=>!C.days||r.ms>=Date.now()-C.days*86400000;

// 統計：依某個 key 分組，算題數、答對率、第一次就答對率
function groupStats(plays,keyFn){const m={};
  for(const r of plays)for(const q of (r.qs||[])){const k=keyFn(q);if(k==null)continue;const g=m[k]||(m[k]={k,n:0,ok:0,f1:0});g.n++;if(q.ok)g.ok++;if(q.f1)g.f1++;}
  return Object.values(m).sort((a,b)=>a.f1/a.n-b.f1/b.n||b.n-a.n);}
const pct=(a,b)=>b?Math.round(a/b*100):0;
function fLabel(k){const v=FN[k];return v?bi(v[0],v[1]):esc(k);}
function dLabel(key){const [dk,p]=key.split('|');const d=DIMS[dk];if(!d)return esc(dk);
  const nm=d.name?d.name:[dk,dk];const a=+p<0?d.neg:d.pos;
  return esc(zh(nm[0]))+(a&&+p!==0?`：<b>${esc(zh(a.z))}</b>`:'')+(cfg.help==='none'?'':`<small>${esc(nm[1])}${a&&+p!==0?' · '+esc(Array.isArray(a.es)?a.es[0]:a.es):''}</small>`);}
function tLabel(k){const v=tc.TN&&tc.TN[k];return v?bi(v[0],v[1]):esc(k);}
function statTable(title,rows,lab){if(!rows.length)return '';
  return `<div class="tsec">${title}</div><table class="st"><tr><th></th><th>${esc(zh('題數'))}</th><th>${esc(zh('第一次就對'))}</th><th>${esc(zh('最後答對'))}</th></tr>
  ${rows.map(g=>{const p1=pct(g.f1,g.n),p2=pct(g.ok,g.n);return `<tr class="${g.n<5?'few':''}"><td>${lab(g.k)}</td><td>${g.n}</td><td><div class="pbar"><i style="width:${p1}%;background:${p1<50?'var(--bad)':p1<75?'#f0a020':'var(--ok)'}"></i><span>${p1}%</span></div></td><td>${p2}%</td></tr>`;}).join('')}</table>`;}
function statsHtml(plays){
  if(!plays.length)return `<div class="note">${bi('這段時間還沒有作答紀錄。','Aún no hay respuestas en este periodo.')}</div>`;
  return `<div class="note" style="text-align:left">${bi('依「第一次就答對」由低到高排列；灰色＝題數少於 5，參考就好。','Ordenado por "correcto al primer intento", de menor a mayor. Gris = menos de 5 preguntas.')}</div>`
   +statTable(bi('句型','Estructura'),groupStats(plays,q=>q.f||null),fLabel)
   +statTable(bi('特徵與形容詞','Rasgo y adjetivo'),groupStats(plays,q=>q.d+'|'+(q.p||0)),dLabel)
   +statTable(bi('題型','Tipo de pregunta'),groupStats(plays,q=>q.t),tLabel)
   +statTable(bi('對錯題：句子本身','Verdadero/falso: la frase es'),groupStats(plays,q=>q.t==='tf'?(q.tv?'T':'F'):null),k=>k==='T'?bi('本來就對的句子','frase verdadera'):bi('本來是錯的句子','frase falsa'));}
function students(plays){const m={};
  for(const r of plays){const s=m[r.h]||(m[r.h]={h:r.h,nick:r.nick,n:0,best:0,last:0,q:0,f1:0});s.n++;
    const p=pct(r.score,r.max);if(p>s.best)s.best=p;if(r.ms>s.last){s.last=r.ms;s.nick=r.nick;}
    for(const q of (r.qs||[])){s.q++;if(q.f1)s.f1++;}}
  return Object.values(m).sort((a,b)=>a.nick.localeCompare(b.nick));}
function rgLabel(r){if(!r.rg)return esc(zh('一般模式'));const q=new URLSearchParams(r.rg);const parts=[];
  if(q.get('d'))parts.push(q.get('d').split(',').map(k=>DIMS[k]?zh(DIMS[k].name[0]):k).join('、'));
  if(q.get('t'))parts.push(q.get('t').split(',').map(k=>tc.TN&&tc.TN[k]?zh(tc.TN[k][0]):k).join('、'));
  return esc(zh('老師範圍'))+(parts.length?'：'+esc(parts.join('｜')):'');}

function linkFor(withRange){const c=C.classes[C.view];const o=new URLSearchParams();
  if(THEME_NAME!=='people')o.set('theme',THEME_NAME);o.set('class',c.cid);
  let s=o.toString();if(withRange){const lp=tc.linkParams();if(lp.ok)s+='&'+lp.qs;}
  return location.href.split('#')[0].split('?')[0]+'?'+s;}

function renderClass(){const c=C.classes[C.view];if(!c){C.view=null;return renderMenu();}
  document.body.classList.add('clsmode');
  const lp=tc.linkParams();
  const all=C.plays.filter(inDays);
  let h=`<div class="top"><button class="x" onclick="cr.closeClass()">← ${esc(zh('返回'))}</button><span></span></div>
  <h1 style="font-size:1.5rem;letter-spacing:0">${esc(c.data.name)}</h1><div class="sub">${bi('比比看 成績簿','Notas de Compara y Adivina')}</div>`;
  if(!C.plan.active)h+=`<div class="notice">${bi('訂閱已到期：學生的新成績傳不進來，舊紀錄仍可查看與匯出。','Suscripción vencida: no llegan nuevas notas; puedes ver y exportar las anteriores.')}</div>`;
  h+=`<div class="panel"><h3>🔗 ${bi('給學生的連結','Enlace para alumnos')}</h3>
    <div class="note" style="text-align:left">${bi('學生打開後輸入暱稱，玩完每一回合成績會自動回到這裡。','El alumno escribe su apodo; cada ronda se registra aquí.')}</div>
    <button class="big sec" onclick="cr.copy(false)">${bi('一般模式（學生自己選關卡）','Modo normal (el alumno elige nivel)')}</button>
    <button class="big sec ${lp.ok?'':'dis'}" onclick="cr.copy(true)">${bi('用老師設定的範圍','Con el rango del profesor')}<small>${esc(lp.sum)}</small></button>
    ${C.copyMsg?`<div class="tmsg">${esc(C.copyMsg)}</div>`:''}</div>`;
  if(C.playsState==='loading')return app.innerHTML=h+`<div class="note">${esc(zh('載入中…'))}</div>`;
  if(C.playsState==='error')return app.innerHTML=h+`<div class="nickmsg">${esc(C.msg)}</div><button class="big sec" onclick="cr.refresh()">${bi('重新載入','Recargar')}</button>`;
  const dayOpt=(d,l)=>`<button class="opt ${C.days===d?'on':''}" onclick="cr.days(${d})">${l}</button>`;
  h+=`<div class="opts" style="margin:10px 0">${dayOpt(0,esc(zh('全部')))}${dayOpt(7,esc(zh('最近 7 天')))}${dayOpt(30,esc(zh('最近 30 天')))}</div>`;
  if(C.sel){const s=students(C.plays).find(x=>x.h===C.sel);const mine=all.filter(r=>r.h===C.sel);
    h+=`<div class="panel"><button class="tmini" onclick="cr.sel(null)">← ${esc(zh('全班'))}</button><h3 style="margin-top:6px">👤 ${esc(s?s.nick:'')}</h3>
      <table class="st"><tr><th>${esc(zh('時間'))}</th><th>${esc(zh('內容'))}</th><th>${esc(zh('分數'))}</th></tr>
      ${mine.map(r=>`<tr><td>${ftime(r.ms)}</td><td>${esc(zh('第 '+r.lv+' 關'))}<small>${rgLabel(r)}</small></td><td>${r.score}/${r.max}</td></tr>`).join('')}</table>
      ${statsHtml(mine)}
      <button class="big sec" style="margin-top:14px" onclick="cr.delStudent()">🗑 ${bi('刪除這位學生的比比看紀錄','Borrar los registros de este alumno')}</button></div>`;
    return app.innerHTML=h;}
  const tab=(k,l)=>`<button class="opt ${C.tab===k?'on':''}" onclick="cr.tab('${k}')">${l}</button>`;
  h+=`<div class="opts">${tab('stu',bi('學生','Alumnos'))}${tab('err',bi('常錯統計','Errores frecuentes'))}</div>`;
  if(C.tab==='stu'){const ss=students(all);
    h+=ss.length?`<table class="st click" style="margin-top:10px"><tr><th>${esc(zh('暱稱'))}</th><th>${esc(zh('回合'))}</th><th>${esc(zh('最高分'))}</th><th>${esc(zh('第一次就對'))}</th><th>${esc(zh('最近'))}</th></tr>
      ${ss.map(s=>`<tr onclick="cr.sel('${s.h}')"><td><b>${esc(s.nick)}</b></td><td>${s.n}</td><td>${s.best}%</td><td>${pct(s.f1,s.q)}%</td><td>${fdate(s.last)}</td></tr>`).join('')}</table>
      <div class="note">${bi('點學生看個人的常錯統計。','Toca un alumno para ver sus errores.')}</div>`
      :`<div class="note" style="margin-top:12px">${bi('還沒有學生的紀錄。把上面的連結傳給學生吧！','Aún no hay registros. ¡Comparte el enlace de arriba!')}</div>`;}
  else h+=statsHtml(all);
  h+=`<div class="opts" style="margin-top:16px"><button class="opt" onclick="cr.csv()">⬇ ${bi('匯出 CSV','Exportar CSV')}</button><button class="opt" onclick="cr.refresh()">🔄 ${bi('重新整理','Actualizar')}</button></div>
    <button class="tmini" style="margin-top:10px" onclick="cr.clearAll()">${esc(zh('清空這個班級的比比看紀錄'))}</button>`;
  app.innerHTML=h;}

function csv(){const c=C.classes[C.view];const rows=[['time','nick','level','range','round_score','round_max','q','type','feature','pattern','direction','correct','first_try','items','tf_statement']];
  for(const r of C.plays.filter(inDays).slice().reverse())(r.qs||[]).forEach((q,i)=>rows.push([ftime(r.ms),r.nick,r.lv,r.rg||'normal',r.score,r.max,i+1,q.t,q.d,q.f,q.p,q.ok?1:0,q.f1?1:0,(q.ids||[]).join(' '),q.t==='tf'?(q.tv?'true':'false'):'']));
  const text='﻿'+rows.map(r=>r.map(v=>{const s=String(v==null?'':v);return /[",\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s;}).join(',')).join('\r\n');
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type:'text/csv;charset=utf-8'}));
  a.download=`bbk_${c.data.name.replace(/[\\/:*?"<>|\s]+/g,'_')}_${fdate(Date.now()).replace(/\//g,'')}.csv`;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},500);}
async function delPlays(ids){for(let i=0;i<ids.length;i+=400){const b=C.db.batch();ids.slice(i,i+400).forEach(id=>b.delete(C.db.collection('class_plays').doc(id)));await b.commit();}
  C.plays=C.plays.filter(r=>!ids.includes(r.id));}

// ---- 樣式 ----
const st=document.createElement('style');st.textContent=`
.clsb h3{margin-bottom:6px}
.clsrow{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:4px 0}
.clsrow input,.clsitem input{flex:1;min-width:0;border:2px solid #ddd;border-radius:10px;padding:8px 10px;font-size:1rem}
.nickmsg{color:var(--bad);font-size:.9rem;margin:6px 0}
.notice{background:#fff6e5;border:1px solid #f1d39a;border-radius:10px;padding:8px 10px;font-size:.9rem;margin:8px 0}
.clsitem{display:flex;gap:8px;align-items:center;justify-content:space-between;background:#fff;border:1px solid #e6e6e6;border-radius:12px;padding:8px 10px;margin:6px 0}
.clsitem.empty{border-style:dashed}
.clsup{text-align:center;font-size:.95rem;margin:4px 0;color:var(--mut)}.clsup.ok{color:var(--ok)}.clsup.no{color:var(--bad)}
.clsup small{display:inline;margin-left:4px}
body.clsmode #app{max-width:720px}
table.st{width:100%;border-collapse:collapse;font-size:.92rem;margin:4px 0}
table.st th{text-align:left;font-weight:600;color:var(--mut);font-size:.8rem;padding:4px;border-bottom:1px solid #ddd}
table.st td{padding:6px 4px;border-bottom:1px solid #f0f0f0;vertical-align:middle}
table.st td small{display:block}
table.st tr.few td{color:#aaa}
table.click tr:not(:first-child){cursor:pointer}
table.click tr:not(:first-child):hover{background:#fafafa}
.pbar{position:relative;background:#f0f0f0;border-radius:6px;height:20px;min-width:90px}
.pbar i{position:absolute;left:0;top:0;bottom:0;border-radius:6px;opacity:.85}
.pbar span{position:relative;padding-left:6px;font-size:.82rem;line-height:20px;font-weight:700}
.big.sec small{display:block}
`;document.head.appendChild(st);

// ---- 給 HTML onclick 用 ----
window.cr={
  setNick(){const v=(document.getElementById('nickIn')||{}).value||'';const n=v.normalize('NFKC').trim().replace(/\s+/g,' ').slice(0,16);
    if(!n){C.nickMsg=zh('請輸入暱稱')+(cfg.help==='none'?'':' / Escribe tu apodo');return renderMenu();}
    C.nick=n;C.nickMsg='';lsSet(LS_NICK,n);renderMenu();},
  editNick(){C.nick='';lsSet(LS_NICK,null);renderMenu();const i=document.getElementById('nickIn');if(i)i.focus();},
  retry(){upload();},
  toggle(){C.open=!C.open;C.notice='';if(C.open)openAcct();else rerender();},
  async login(){C.msg='';try{await init();}catch(e){C.msg=errText(e);return rerender();}
    const pr=new firebase.auth.GoogleAuthProvider();
    try{await C.auth.signInWithPopup(pr);}catch(e){const c=e&&e.code;
      if(c==='auth/popup-blocked'||c==='auth/operation-not-supported-in-this-environment'){C.auth.signInWithRedirect(pr);return;}
      if(c==='auth/popup-closed-by-user'||c==='auth/cancelled-popup-request')return;
      C.msg=(e&&e.message)||c||'login failed';rerender();}},
  logout(){lsSet(LS_T,null);C.plan={plan:'free',expiresAt:null,active:false};C.acct='';C.view=null;if(C.auth)C.auth.signOut();},
  reload(){loadAccount();},
  create(i){createClass(i);},
  openClass(k){openClass(k);},
  closeClass(){C.view=null;C.sel=null;document.body.classList.remove('clsmode');renderMenu();const p=document.getElementById('acctPanel');if(p)p.scrollIntoView();},
  refresh(){loadPlays();},
  tab(k){C.tab=k;renderClass();},
  sel(h){C.sel=h;renderClass();window.scrollTo(0,0);},
  days(d){C.days=d;renderClass();},
  copy(withRange){if(withRange&&!tc.linkParams().ok)return;const url=linkFor(withRange);
    const fb=()=>{prompt('複製這個連結 / Copia este enlace',url);};
    if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(url).then(()=>{C.copyMsg='✓ '+zh('已複製連結')+' / Enlace copiado';renderClass();},fb);else fb();},
  csv,
  async delStudent(){const s=C.sel;const mine=C.plays.filter(r=>r.h===s);if(!mine.length||!confirm(zh('確定刪除這位學生的 '+mine.length+' 筆比比看紀錄？刪除後無法復原。')))return;
    try{await delPlays(mine.map(r=>r.id));C.sel=null;renderClass();}catch(e){alert(errText(e));}},
  async clearAll(){if(!C.plays.length||!confirm(zh('確定清空這個班級全部 '+C.plays.length+' 筆比比看紀錄？（跑吧！漢字、色數的成績不受影響）刪除後無法復原。')))return;
    try{await delPlays(C.plays.map(r=>r.id));renderClass();}catch(e){alert(errText(e));}},
  sheetLocked(){return !C.plan.active;},
  needPro(){C.open=true;C.notice='sheet';openAcct().then(()=>{const p=document.getElementById('acctPanel');if(p)p.scrollIntoView({block:'start'});});},
  _state:C,
};

// ---- 老師管理中心的範圍代碼 ?r=（shared_bbk 任何人可讀，不用登入）----
async function loadRange(){
  try{await init();const s=await C.db.collection('shared_bbk').doc(tc.rcode).get();
    if(!s.exists)tc.codeFail('missing');else tc.applyCode(s.data());}
  catch(e){console.warn('range load failed',e);tc.codeFail('error');}
  rerender();}

// ---- 啟動 ----
if(tc.rcode)loadRange();
if(CLASS_ID)loadClass();
else if(lsGet(LS_T)==='1'){C.open=false;init().then(()=>{if(isReal(C.user))loadAccount();}).catch(e=>console.warn(e));}
})();
