// 比比看：學生端的班級連結與老師範圍碼（接中央訂閱專案 subscription-48d3c，做法同跑吧！漢字、色數消消樂）
// - 班級連結 ?class=<班級碼>：輸入暱稱；每玩完一回合，把每題作答寫進 class_plays（老師在「老師管理中心」看成績）
// - 範圍碼 ?r=<範圍碼>：從 shared_bbk 讀老師在中心存的範圍（不用登入），鎖定成「老師指定的練習」
// 老師的功能（班級、成績簿、範圍、學習單）都在老師管理中心，遊戲裡不再有老師區。
// Firebase SDK 只在需要時才載入（一般學生玩遊戲不會載入）。
// 依賴 index.html：S、SET、esc、zh、renderMenu、lockApply、lockFail、RCODE。
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
const GAME='bbk';
const qp=new URLSearchParams(location.search);
const THEME_NAME=(qp.get('theme')||'people').replace(/[^\w-]/g,'')||'people';
const rawCid=(qp.get('class')||'').trim().toLowerCase();
const CLASS_ID=/^[a-z0-9]{8,32}$/.test(rawCid)?rawCid:'';
const LS_NICK='bbk_nick_'+CLASS_ID;
const lsGet=k=>{try{return localStorage.getItem(k);}catch(e){return null;}};
const lsSet=(k,v)=>{try{if(v===null)localStorage.removeItem(k);else localStorage.setItem(k,v);}catch(e){}};

// 介面文字 [中, 西, 英]
const TX={
  connecting:['正在連線到班級…','Conectando con la clase…','Connecting to the class…'],
  missing:['找不到這個班級','No se encontró la clase','Class not found'],
  error:['連不上班級','No se pudo conectar','Could not connect'],
  noSend:['可以照常玩，但成績不會傳給老師。','Puedes jugar, pero tu puntuación no llegará al profesor.','You can play, but your score won\'t reach your teacher.'],
  nick:['暱稱','Apodo','Nickname'],change:['更改','Cambiar','Change'],ok:['確定','OK','OK'],
  nickPh:['你的暱稱','Tu apodo','Your nickname'],
  autoSend:['每玩完一回合，成績會自動傳給老師。','Al terminar cada ronda, tu puntuación se envía al profesor.','After each round, your score is sent to your teacher.'],
  needNick:['先輸入暱稱（老師認得出來的名字）才能開始。','Escribe un apodo que tu profesor reconozca para empezar.','Enter a nickname your teacher will recognize to start.'],
  nickFirst:['請先輸入暱稱','Escribe tu apodo primero','Enter your nickname first'],
  sending:['傳送成績中…','Enviando…','Sending…'],
  sent:['✅ 成績已回傳給老師','Resultado enviado a tu profesor','Result sent to your teacher'],
  failed:['⚠ 成績沒有傳出去：','No se pudo enviar: ','Could not send: '],
  retry:['再試一次','Reintentar','Try again'],
  noPerm:['沒有權限（老師的訂閱可能已到期）','Sin permiso (la suscripción del profesor puede haber vencido)','No permission (the teacher\'s subscription may have expired)'],
  offline:['連不上網路，請稍後再試','Sin conexión, inténtalo más tarde','Offline, try again later'],
};
const fx=k=>SET.lang==='zh'?'':TX[k][SET.lang==='en'?2:1];
const tz=k=>zh(TX[k][0]);
const L=k=>esc(tz(k))+(fx(k)?`<small>${esc(fx(k))}</small>`:'');
const L1=k=>esc(tz(k))+(fx(k)?' · '+esc(fx(k)):'');      // 單行

const C={ready:null,app:null,auth:null,db:null,user:null,
  cls:null,clsState:CLASS_ID?'loading':'',nick:CLASS_ID?(lsGet(LS_NICK)||''):'',nickMsg:'',
  up:'',upErr:''};   // up: '' | sending | ok | err

// ---- Firebase（compat SDK，需要時才載入）----
function loadScript(src){return new Promise((res,rej)=>{const el=document.createElement('script');el.src=src;el.onload=res;el.onerror=()=>rej(new Error('load failed: '+src));document.head.appendChild(el);});}
function init(){
  if(!C.ready)C.ready=(async()=>{
    if(!window.firebase||!firebase.initializeApp)await loadScript(SDK+'firebase-app-compat.js');
    if(!firebase.auth)await loadScript(SDK+'firebase-auth-compat.js');
    if(!firebase.firestore)await loadScript(SDK+'firebase-firestore-compat.js');
    C.app=firebase.initializeApp(CENTRAL);C.auth=C.app.auth();C.db=C.app.firestore();
    await new Promise(res=>{let first=true;C.auth.onAuthStateChanged(u=>{C.user=u;if(first){first=false;res();}});});
    return C.app;
  })().catch(e=>{C.ready=null;throw e;});
  return C.ready;}
function errText(e){const c=e&&e.code||'';
  if(/permission/.test(c))return L1('noPerm');
  if(/unavailable|network/.test(c)||/load failed/.test(e&&e.message||''))return L1('offline');
  return esc((e&&e.message)||c||'error');}
const onMenu=()=>!S;
function refreshMenu(){if(onMenu())renderMenu();}

// 暱稱 → 16 碼雜湊（與 corre 相同：不分大小寫與空白）
async function nickHash(nick){
  const norm=String(nick).normalize('NFKC').trim().toLowerCase().replace(/\s+/g,' ');
  try{const buf=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(norm));
    return Array.from(new Uint8Array(buf)).slice(0,8).map(b=>b.toString(16).padStart(2,'0')).join('');}
  catch(e){let h1=0x811c9dc5,h2=0x01000193;for(const ch of norm){const c=ch.codePointAt(0);h1=Math.imul(h1^c,16777619)>>>0;h2=Math.imul(h2+c,2246822519)>>>0;}
    return h1.toString(16).padStart(8,'0')+h2.toString(16).padStart(8,'0');}}

// ---- 班級 ----
async function loadClass(){
  try{await init();
    if(!C.user)await C.auth.signInAnonymously();
    const s=await C.db.collection('classes').doc(CLASS_ID).get();
    if(!s.exists)C.clsState='missing';else{C.cls=s.data();C.clsState='ok';}
  }catch(e){console.warn('class load failed',e);C.clsState='error';}
  refreshMenu();}
const canUpload=()=>CLASS_ID&&C.clsState==='ok'&&!!C.nick;

function bannerHtml(){
  let h=`<div class="panel clsb"><h3>🏫 `;
  if(C.clsState==='loading')return h+`${L1('connecting')}</h3></div>`;
  if(C.clsState==='missing'||C.clsState==='error')return h+`${L1(C.clsState)}</h3><div class="note" style="text-align:left">${L('noSend')}</div></div>`;
  h+=`${esc(C.cls.name)}</h3>`;
  if(C.nick)h+=`<div class="clsrow">${L1('nick')}：<b>${esc(C.nick)}</b><button class="tmini" onclick="CLASSROOM.editNick()">${L1('change')}</button></div>
    <div class="note" style="text-align:left">${L('autoSend')}</div>`;
  else h+=`<div class="clsrow"><input id="nickIn" maxlength="16" placeholder="${esc(tz('nickPh'))}${fx('nickPh')?' / '+esc(fx('nickPh')):''}" onkeydown="if(event.key==='Enter')CLASSROOM.setNick()"><button class="opt on" style="flex:none;min-width:80px" onclick="CLASSROOM.setNick()">${esc(tz('ok'))}</button></div>
    <div class="note" style="text-align:left">${L('needNick')}</div>${C.nickMsg?`<div class="nickmsg">${C.nickMsg}</div>`:''}`;
  return h+'</div>';}

// ---- 成績回傳 ----
function rangeStr(rg){if(!rg)return '';const o=[];if(rg.dims&&rg.dims.length)o.push('d='+rg.dims.join(','));if(rg.types&&rg.types.length)o.push('t='+rg.types.join(','));o.push('n='+rg.n);return o.join('&');}
function upHtml(){
  if(!canUpload()||!C.up)return '';
  if(C.up==='sending')return `<div class="clsup">${esc(C.nick)} · ${L1('sending')}</div>`;
  if(C.up==='ok')return `<div class="clsup ok">${L('sent')}</div>`;
  return `<div class="clsup no">${L1('failed')}${C.upErr} <button class="tmini" onclick="CLASSROOM.retry()">${L1('retry')}</button></div>`;}
function showUp(){const el=document.getElementById('clsUp');if(el)el.innerHTML=upHtml();}
async function upload(){
  const round=S;if(!round)return;
  C.up='sending';showUp();
  try{await init();if(!C.user)await C.auth.signInAnonymously();
    const qs=(round.log||[]).filter(Boolean);if(!qs.length){C.up='';showUp();return;}
    const h=await nickHash(C.nick);
    await C.db.collection('class_plays').add({cid:CLASS_ID,owner:C.cls.owner,game:GAME,h,nick:C.nick,at:firebase.firestore.FieldValue.serverTimestamp(),th:THEME_NAME,
      lv:round.lv,rg:rangeStr(round.rg),score:round.score,max:round.qs.length*10,qs});
    round.sent=true;C.up='ok';
  }catch(e){console.warn('upload failed',e);C.up='err';C.upErr=errText(e);}
  if(S===round)showUp();}

// ---- 老師的範圍碼 ?r=（shared_bbk 任何人可讀，不用登入）----
async function loadRange(){
  try{await init();const s=await C.db.collection('shared_bbk').doc(RCODE).get();
    if(!s.exists)lockFail('missing');else lockApply(s.data());}
  catch(e){console.warn('range load failed',e);lockFail('error');}
  refreshMenu();}

// ---- 給 index.html 用 ----
window.CLASSROOM={
  classMode:()=>!!CLASS_ID,
  classId:()=>CLASS_ID,
  bannerHtml,upHtml,
  // 開始一回合前：班級連結要先有暱稱
  canStart(){
    if(!CLASS_ID)return true;
    if(C.clsState==='loading')return false;
    if(C.clsState==='ok'&&!C.nick){C.nickMsg=L1('nickFirst');S=null;renderMenu();const i=document.getElementById('nickIn');if(i)i.focus();window.scrollTo(0,0);return false;}
    return true;},
  onResult(){C.up='';C.upErr='';if(canUpload())upload();},
  retry(){upload();},
  setNick(){const v=(document.getElementById('nickIn')||{}).value||'';const n=v.normalize('NFKC').trim().replace(/\s+/g,' ').slice(0,16);
    if(!n){C.nickMsg=L1('nickFirst');return renderMenu();}
    C.nick=n;C.nickMsg='';lsSet(LS_NICK,n);renderMenu();},
  editNick(){C.nick='';lsSet(LS_NICK,null);renderMenu();const i=document.getElementById('nickIn');if(i)i.focus();},
  _state:C,
};

// ---- 樣式 ----
const st=document.createElement('style');st.textContent=`
.clsb h3{margin-bottom:6px}
.clsrow{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:4px 0}
.clsrow input{flex:1;min-width:0;min-height:46px;border:2px solid #ddd;border-radius:999px;padding:8px 16px;font-size:1rem;font-family:inherit}
.nickmsg{color:var(--bad);font-size:.9rem;margin:6px 0}
.tmini{border:0;background:transparent;color:var(--mut);font-size:.85rem;cursor:pointer;text-decoration:underline;padding:2px 6px;font-family:inherit}
.clsup{text-align:center;font-size:1rem;margin:6px 0;color:var(--mut)}.clsup.ok{color:var(--ok);font-weight:700}.clsup.no{color:var(--bad)}
.clsup small{color:inherit;opacity:.85}
`;document.head.appendChild(st);

// ---- 啟動 ----
if(RCODE)loadRange();
if(CLASS_ID)loadClass();
})();
