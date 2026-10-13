// 比比看：老師功能（自選出題範圍、分享連結、練習紙）
// 依賴 index.html 裡的引擎（makeRound、DIMS、POOL、cfg、rt、zh、esc、trOf、THEME…）；在引擎之後載入。
// 範圍物件 RANGE = {lv, dims:[特徵], types:[題型], n}，空陣列 = 全部；null = 一般模式。
(function(){
'use strict';
const KEY='bbk_teacher_v1';
const LET='ABCDEFGH';
const NS=[5,10,15,20];
const TN={   // 題型名稱：[中, 西]
  decode:['看句子找人','Encuentra a la persona'],tf:['對錯題','Verdadero o falso'],pick:['看圖選句子','Elige la frase'],
  more:['誰比較…','¿Quién es más…?'],whobi:['誰比…','¿Quién … que X?'],biwho:['…比誰','X … que ¿quién?'],
  fill:['填空','Completa la frase'],chain:['連鎖解碼','Decodifica en cadena'],most:['誰最…','¿Quién es el más…?'],
};
const T={lv:1,offD:[],offT:[],n:10,ans:true,open:false,locked:false,msg:''};
let SHEET=null;   // 目前的練習紙 {qs}

// ---- 讀取已存的設定 ----
try{const o=JSON.parse(localStorage.getItem(KEY)||'null');
  if(o){if([1,2,3].includes(+o.lv))T.lv=+o.lv;if(NS.includes(+o.n))T.n=+o.n;
    if(Array.isArray(o.offD))T.offD=o.offD.filter(k=>DIMS[k]);if(Array.isArray(o.offT))T.offT=o.offT.filter(k=>TN[k]);
    if(typeof o.ans==='boolean')T.ans=o.ans;}}catch(e){}
function save(){try{localStorage.setItem(KEY,JSON.stringify({lv:T.lv,n:T.n,offD:T.offD,offT:T.offT,ans:T.ans}));}catch(e){}}

const availD=()=>Object.values(DIMS).filter(d=>d.lv<=T.lv).map(d=>d.key);
const availT=()=>POOL[T.lv].slice();
const onD=()=>availD().filter(k=>!T.offD.includes(k));
const onT=()=>availT().filter(k=>!T.offT.includes(k));
const valid=()=>onD().length>0&&onT().length>0;
const canMake=()=>valid()&&onT().some(feasible);
// 試探：目前勾的特徵下，這個題型湊不湊得出題目（資料不夠時會湊不出，例如眼睛大的人只有 5 個）
const FEAS={};
function feasible(k){if(!onD().length)return false;const key=T.lv+k+onD().join();if(key in FEAS)return FEAS[key];
  const saved=RANGE,sUsed=USED;RANGE=rangeOf();let ok=false;
  try{for(let i=0;i<14&&!ok;i++){USED={};if(GEN[k](T.lv))ok=true;}}catch(e){ok=false;}finally{RANGE=saved;USED=sUsed;}
  return FEAS[key]=ok;}
function rangeOf(){const d=onD(),t=onT();return {lv:T.lv,dims:d.length===availD().length?[]:d,types:t.length===availT().length?[]:t,n:T.n};}

// ---- 分享連結：?lv=2&d=height,age&t=pick,tf&n=10 ----
(function fromLink(){const q=new URLSearchParams(location.search);if(!q.has('lv'))return;
  const lv=+q.get('lv');if(![1,2,3].includes(lv))return;
  T.lv=lv;const avD=availD(),avT=availT();
  T.offD=q.has('d')?avD.filter(k=>!q.get('d').split(',').includes(k)):[];
  T.offT=q.has('t')?avT.filter(k=>!q.get('t').split(',').includes(k)):[];
  if(q.has('n'))T.n=Math.max(3,Math.min(30,+q.get('n')||10));
  if(!valid()){T.offD=[];T.offT=[];}   // 連結內容不合法就退回「全部」
  T.locked=true;})();
function link(){const p=new URLSearchParams(location.search),o=new URLSearchParams();
  const th=p.get('theme');if(th&&th!=='people')o.set('theme',th);
  o.set('lv',T.lv);const r=rangeOf();if(r.dims.length)o.set('d',r.dims.join(','));if(r.types.length)o.set('t',r.types.join(','));o.set('n',T.n);
  return location.href.split('#')[0].split('?')[0]+'?'+o.toString().replace(/%2C/g,',');}

// ---- 樣式 ----
const st=document.createElement('style');st.textContent=`
.tpanel{padding:8px 12px}
.topen{width:100%;display:flex;justify-content:space-between;align-items:center;border:0;background:transparent;font-size:1.02rem;font-weight:700;cursor:pointer;color:var(--ink);padding:6px 2px;text-align:left}
.topen small{display:inline;margin-left:6px}
.tsec{margin:12px 0 5px;font-weight:700;font-size:.95rem}
.tsec small{display:inline;margin-left:6px}
.chips{display:flex;flex-wrap:wrap;gap:6px}
.chip{border:2px solid #ddd;background:#fff;border-radius:14px;padding:5px 11px;font-size:.92rem;cursor:pointer;color:var(--ink);line-height:1.3;text-align:center}
.chip small{font-size:.72em}
.chip.on{border-color:var(--acc);background:var(--acc2);font-weight:700}
.chip.no{border-style:dashed;color:var(--mut)}
.tmini{border:0;background:transparent;color:var(--mut);font-size:.82rem;cursor:pointer;text-decoration:underline;padding:2px 6px}
.big.dis{opacity:.4;pointer-events:none}
.tmsg{color:var(--ok);font-size:.9rem;text-align:center;margin:4px 0}
.tsum{color:var(--mut);font-size:.88rem;margin:10px 0 2px}
body.wsmode #app{max-width:820px}
.wsbar{background:var(--panel);border-radius:14px;padding:10px 14px;margin:8px 0}
.wsbar .opts{margin:8px 0}
.wshead h2{margin:6px 0 2px;font-size:1.45rem;text-align:center}
.wshead .sub{margin-bottom:6px;font-size:.9rem}
.wsmeta{display:flex;gap:16px;justify-content:space-between;flex-wrap:wrap;margin:10px 0 4px;font-size:.95rem}
.wsmeta i{display:inline-block;border-bottom:1.5px solid #333;min-width:110px;height:1em;vertical-align:baseline}
.wsrange{color:#555;font-size:.85rem;margin:2px 0 6px}
.wsq{display:flex;gap:10px;padding:10px 0;border-bottom:1px dashed #ccc;break-inside:avoid}
.wsn{flex:none;width:28px;height:28px;border-radius:50%;background:#333;color:#fff;text-align:center;line-height:28px;font-weight:700}
.wsb{flex:1;min-width:0}
.wss{font-size:1.25rem;line-height:2}
.wsa{font-size:1.2rem;font-weight:700;line-height:1.9}
.wst{font-size:.85rem;color:#555}
body.wsmode .cards{margin:6px 0;justify-content:flex-start;gap:8px}
body.wsmode .card{flex:none;width:100px;cursor:default;border-width:1px;padding:4px}
body.wsmode .card.full{width:84px;border:0}
body.wsmode .card:active{transform:none}
.ltr{display:inline-block;width:1.5em;height:1.5em;line-height:1.5em;border:1.5px solid #333;border-radius:50%;text-align:center;font-weight:700;font-size:.9rem;margin-right:3px}
.wsopt{display:flex;flex-direction:column;gap:2px;margin:6px 0}
.wsopt.row{flex-direction:row;gap:22px;flex-wrap:wrap}
.wso{font-size:1.15rem;line-height:1.9}
.wso small{display:inline;margin-left:4px}
.wsans{margin-top:6px;font-size:.92rem}
.wsl{display:inline-block;border-bottom:1.5px solid #333;min-width:70px;height:1em;vertical-align:baseline}
.wskey{margin-top:26px}
.wskey h2{font-size:1.3rem;margin:4px 0 6px}
.wsk{padding:7px 0;border-bottom:1px dashed #ccc;break-inside:avoid}
.wsk .a{font-weight:700;font-size:1.05rem}
.wsk .s{font-size:1.02rem;line-height:1.9}
.wsk .t{font-size:.85rem;color:#555}
@media print{
  @page{size:A4;margin:12mm}
  .noprint{display:none!important}
  body.wsmode #app{max-width:none;padding:0}
  .wskey{break-before:page;margin-top:0}
  body{-webkit-print-color-adjust:exact;print-color-adjust:exact}
}`;
document.head.appendChild(st);

// ---- 小工具 ----
const sheetLocked=()=>!!(window.cr&&cr.sheetLocked());   // 練習紙：訂閱才能用（classroom.js）
const bi=(z,es)=>esc(zh(z))+(cfg.help==='none'?'':`<small>${esc(es)}</small>`);
const chip=(on,label,click)=>`<button class="chip ${on?'on':''}" onclick="${click}">${on?'✓ ':''}${label}</button>`;

// ---- 選單：老師設定面板 ／ 學生打開分享連結時的簡化畫面 ----
window.teacherHook=function(levelsHtml){return T.locked?lockedHtml():levelsHtml+panelHtml();};

function lockedHtml(){
  const dn=onD().map(k=>zh(DIMS[k].name[0])).join('、'),tn=onT().map(k=>zh(TN[k][0])).join('、');
  return `<div class="panel"><h3>👩‍🏫 ${bi('老師指定的練習','Práctica del profesor')}</h3>
    <div style="font-size:.95rem;line-height:1.7">${esc(zh('第 '+T.lv+' 關'))} · ${T.n} ${esc(zh('題'))}<br>${esc(dn)}<br>${esc(tn)}</div></div>
  <button class="big" onclick="tc.start()">▶ ${bi('開始練習','Empezar')}</button>
  <button class="big sec" onclick="tc.exit()">${bi('一般模式（自己選關卡）','Modo normal (elegir nivel)')}</button>`;}

function panelHtml(){
  let h=`<div class="panel tpanel"><button class="topen" onclick="tc.open()"><span>👩‍🏫 ${bi('老師設定','Modo profesor')}</span><span>${T.open?'▲':'▼'}</span></button>`;
  if(T.open){
    h+=`<div class="tsec">${bi('難度','Nivel')}</div><div class="opts">${[1,2,3].map(n=>`<button class="opt ${T.lv===n?'on':''}" onclick="tc.lv(${n})">${n}</button>`).join('')}</div>`;
    h+=`<div class="tsec">${bi('要考的特徵','Rasgos a practicar')}<button class="tmini" onclick="tc.all('d',true)">${esc(zh('全選'))}</button><button class="tmini" onclick="tc.all('d',false)">${esc(zh('清除'))}</button></div>
      <div class="chips">${availD().map(k=>chip(!T.offD.includes(k),`${esc(zh(DIMS[k].name[0]))}${cfg.help==='none'?'':`<small>${esc(DIMS[k].name[1])}</small>`}`,`tc.tog('d','${k}')`)).join('')}</div>`;
    h+=`<div class="tsec">${bi('題型','Tipos de pregunta')}<button class="tmini" onclick="tc.all('t',true)">${esc(zh('全選'))}</button><button class="tmini" onclick="tc.all('t',false)">${esc(zh('清除'))}</button></div>
      <div class="chips">${availT().map(k=>chip(!T.offT.includes(k),`${esc(zh(TN[k][0]))}${cfg.help==='none'?'':`<small>${esc(TN[k][1])}</small>`}${feasible(k)?'':`<small>⚠ ${esc(zh('這些特徵湊不出'))}</small>`}`,`tc.tog('t','${k}')`).replace('class="chip ','class="chip '+(feasible(k)?'':'no '))).join('')}</div>`;
    h+=`<div class="tsec">${bi('題數','Número de preguntas')}</div><div class="opts">${NS.map(n=>`<button class="opt ${T.n===n?'on':''}" onclick="tc.n(${n})">${n}</button>`).join('')}</div>`;
    h+=`<div class="tsec">${bi('練習紙','Hoja de práctica')}</div><div class="chips">${chip(T.ans,bi('附答案頁','Con hoja de respuestas'),'tc.ansToggle()')}</div>`;
    const ok=canMake();
    h+=`<div class="tsum">${ok?`${T.n} ${esc(zh('題'))} · ${onD().length} ${esc(zh('個特徵'))} · ${onT().length} ${esc(zh('種題型'))}`:esc(zh(valid()?'這個範圍湊不出題目，請多選一些特徵或題型':'請至少各選一個特徵和題型'))}</div>`;
    h+=`<button class="big ${ok?'':'dis'}" onclick="tc.start()">▶ ${bi('用這個範圍玩','Jugar con este rango')}</button>
      <button class="big sec ${ok?'':'dis'}" onclick="tc.sheet()">${sheetLocked()?'🔒 ':''}🖨 ${bi('做練習紙（列印／PDF）','Hoja de práctica (imprimir / PDF)')}${sheetLocked()?`<small>${esc(zh('訂閱功能'))}${cfg.help==='none'?'':' · Suscripción'}</small>`:''}</button>
      <button class="big sec ${ok?'':'dis'}" onclick="tc.copy()">🔗 ${bi('複製分享連結給學生','Copiar enlace para alumnos')}</button>`;
    if(T.msg)h+=`<div class="tmsg">${esc(T.msg)}</div>`;
  }
  return h+'</div>';}

// ---- 練習紙 ----
function wsCard(p,i,q){const dd=q.d;let tag='';
  const tg=f=>{const [n,un]=f(p);return `<div class="tag">${n} ${esc(zh(un))}</div>`;};
  if(dd.tagA)tag=tg(dd.tagA);
  if(q.tagCm&&dd.tagB)tag=tg(dd.tagB);
  const lab=`<div class="lab"><span class="ltr">${LET[i]}</span>${q.hide?'':esc(p.name)}</div>`;
  if(q.crop==='full'){const maxH=Math.max(...q.its.map(x=>dd.v(x)));const H=Math.round(150*dd.v(p)/maxH);const w=Math.round(p.w*H/p.ih);
    return `<div class="card full"><div class="fig" style="height:150px"><img src="${THEME.dir}${p.id}.webp" alt="" style="height:${H}px;width:${w}px"></div>${lab}${tag}</div>`;}
  const fr=q.crop==='face'?p.face*1.15:0.52,ar=q.crop==='face'?1:0.78;
  return `<div class="card"><div class="crop" style="aspect-ratio:${ar};width:100%"><img src="${THEME.dir}${p.id}.webp" alt="" style="height:${(100/fr).toFixed(1)}%"></div>${lab}${tag}</div>`;}

function wsQ(q,i){
  let h=`<div class="wsq"><div class="wsn">${i+1}</div><div class="wsb">`;
  if(q.sents)h+=q.sents.map(s=>`<div class="wss">${rt(s.z)}${esc(zh('。'))}</div>`).join('');
  if(q.blankZ)h+=`<div class="wss">${rt(q.blankZ)}${esc(zh('。'))}</div>`;
  h+=`<div class="wsa">${rt(q.q.z)}</div>`;
  const t=trOf(q.q);if(t)h+=`<div class="wst">${esc(t)}</div>`;
  h+=`<div class="cards">${q.its.map((p,j)=>wsCard(p,j,q)).join('')}</div>`;
  if(q.btns&&q.tf){
    h+=`<div class="wsopt row">${q.btns.map((b,j)=>`<span class="wso">☐ ${rt(b.z)}${cfg.help==='none'?'':`<small>${esc(U[j?'tf_f':'tf_t'][cfg.help==='es'?1:2])}</small>`}</span>`).join('')}</div>`;
  }else{
    if(q.btns)h+=`<div class="wsopt ${q.row?'row':''}">${q.btns.map((b,j)=>`<div class="wso"><b>${LET[j]}</b>　${rt(b.z)}</div>`).join('')}</div>`;
    h+=`<div class="wsans">${esc(zh('答案'))}${cfg.help==='none'?'':' / Respuesta'}：<span class="wsl"></span></div>`;}
  return h+'</div></div>';}

function wsKey(q,i){
  const k=q.btns?q.btns.findIndex(b=>b.ok):q.its.findIndex(p=>p.id===q.ans);
  let a;
  if(q.tf)a=esc(zh(q.btns[k].z[0].t));
  else if(q.btns)a=`${LET[k]}　${rt(q.btns[k].z)}`;
  else a=`${LET[k]}　${esc(q.its[k].name)}`;
  const lines=[];
  const add=s=>lines.push(`<div class="s">${rt(s.z)}${esc(zh('。'))}</div>${trOf(s)?`<div class="t">${esc(trOf(s))}.</div>`:''}`);
  if(q.sents)q.sents.forEach(add);
  if(q.full)add(q.full);
  if(q.expl)q.expl.forEach(add);
  if(q.btns&&q.type==='pick'){const b=q.btns.find(x=>x.ok);add(b.tr);}
  return `<div class="wsk"><div class="a">${i+1}. ${a}</div>${lines.join('')}</div>`;}

function renderSheet(){
  const qs=SHEET.qs,r=SHEET.rg;
  const dn=(r.dims.length?r.dims:availD()).map(k=>zh(DIMS[k].name[0])).join('、');
  const tn=(r.types.length?r.types:POOL[r.lv]).map(k=>zh(TN[k][0])).join('、');
  const opt=(k,v,label)=>`<button class="opt ${cfg[k]===v?'on':''}" onclick="tc.cfg('${k}',${typeof v==='string'?`'${v}'`:v})">${label}</button>`;
  document.body.classList.add('wsmode');
  app.innerHTML=`<div class="noprint wsbar">
    <button class="big" onclick="window.print()">🖨 ${bi('列印／存成 PDF','Imprimir / guardar como PDF')}</button>
    <div class="note">${esc(zh('按下後，在列印視窗的「目的地」選「另存為 PDF」就會得到 PDF 檔。'))}</div>
    <div class="opts">${opt('py',true,'拼音 '+esc(zh('開')))}${opt('py',false,'拼音 '+esc(zh('關')))}${opt('simp',false,'繁體')}${opt('simp',true,'简体')}</div>
    <div class="opts">${opt('help','es','Español')}${opt('help','en','English')}${opt('help','none',esc(zh('無')))}</div>
    <div class="opts"><button class="opt" onclick="tc.sheet()">🔄 ${bi('換一組題','Otras preguntas')}</button><button class="opt" onclick="tc.closeSheet()">← ${bi('返回','Volver')}</button></div></div>
  <div class="wshead"><h2>${esc(u('title'))} ${esc(zh('練習紙'))}</h2><div class="sub">Compara y Adivina${cfg.help==='none'?'':' · Hoja de práctica'}</div></div>
  <div class="wsmeta"><span>${esc(zh('姓名'))}${cfg.help==='none'?'':' / Nombre'}：<i></i></span><span>${esc(zh('日期'))}${cfg.help==='none'?'':' / Fecha'}：<i></i></span><span>${esc(zh('分數'))}${cfg.help==='none'?'':' / Puntos'}：<i style="min-width:50px"></i> / ${qs.length*10}</span></div>
  <div class="wsrange">${esc(zh('第 '+r.lv+' 關'))} · ${esc(dn)} · ${esc(tn)}${qs.length<r.n?` · ${esc(zh('這個範圍只湊得出 '+qs.length+' 題'))}`:''}</div>
  <div class="wsrange">${esc(zh('每題圈出（或寫下）正確答案。每題 10 分。'))}${cfg.help==='es'?' Marca o escribe la respuesta correcta. 10 puntos por pregunta.':cfg.help==='en'?' Circle or write the correct answer. 10 points each.':''}</div>
  ${qs.map(wsQ).join('')}
  ${T.ans?`<div class="wskey"><div class="wshead"><h2>${esc(zh('答案'))}${cfg.help==='none'?'':' / Respuestas'}</h2></div>${qs.map(wsKey).join('')}</div>`:''}`;
  window.scrollTo(0,0);}

// ---- 給 HTML onclick 用 ----
window.tc={
  open(){T.open=!T.open;T.msg='';renderMenu();},
  lv(n){T.lv=n;T.msg='';save();renderMenu();},
  tog(kind,k){const a=kind==='d'?T.offD:T.offT,i=a.indexOf(k);if(i<0)a.push(k);else a.splice(i,1);T.msg='';save();renderMenu();},
  all(kind,on){if(kind==='d')T.offD=on?[]:availD();else T.offT=on?[]:availT();T.msg='';save();renderMenu();},
  n(v){T.n=v;T.msg='';save();renderMenu();},
  ansToggle(){T.ans=!T.ans;save();renderMenu();},
  start(){if(!valid())return;startRound(T.lv,rangeOf());},
  copy(){if(!canMake())return;const url=link();
    const fb=()=>{prompt('複製這個連結 / Copia este enlace',url);};
    if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(url).then(()=>{T.msg='✓ 已複製連結，可以貼給學生 / Enlace copiado';renderMenu();},fb);else fb();},
  sheet(){if(!canMake())return;if(sheetLocked()){cr.needPro();return;}const rg=rangeOf(),saved=RANGE;RANGE=rg;let qs;try{qs=makeRound(T.lv);}finally{RANGE=saved;}
    if(!qs.length){alert(u('noQ'));return;}
    SHEET={qs,rg};renderSheet();},
  cfg(k,v){cfg[k]=v;saveCfg();renderSheet();},
  closeSheet(){document.body.classList.remove('wsmode');SHEET=null;renderMenu();window.scrollTo(0,0);},
  TN,
  // 給班級連結用：目前老師設定的範圍（不含 theme）
  linkParams(){const r=rangeOf(),o=[];o.push('lv='+T.lv);if(r.dims.length)o.push('d='+r.dims.join(','));if(r.types.length)o.push('t='+r.types.join(','));o.push('n='+T.n);
    const sum=`${zh('第 '+T.lv+' 關')} · ${T.n} ${zh('題')} · ${onD().map(k=>zh(DIMS[k].name[0])).join('、')} · ${onT().map(k=>zh(TN[k][0])).join('、')}`;
    return {ok:canMake(),qs:o.join('&'),sum};},
  exit(){T.locked=false;RANGE=null;try{history.replaceState(null,'',location.href.split('#')[0].split('?')[0]);}catch(e){}renderMenu();},
};
})();
