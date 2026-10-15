// 比比看 出題引擎（遊戲 index.html 與「老師管理中心」的學習單共用同一份，改這裡兩邊一起變）
// 用法：const E = BBK_ENGINE(window.THEME_PACK);
//   E.makeRound(lv, range) → 題目陣列。range = {lv, dims:[特徵], types:[題型], n:題數}，空陣列 = 全部；
//     不給 range（null）= 一般模式：隨機三種題型，4＋3＋3 題。
//   顯示：E.rt(tokens, {simp, phon}) 把句子 tokens 變成 HTML（拼音／注音放在字的上面）
//        E.zh(文字, simp)、E.tr(句子, lang) 取翻譯（lang = 'es'｜'en'｜'zh'，zh = 不顯示翻譯）
//   人物圖：E.cropHtml(人物, 題目, {base, height}) 照題目的裁切（臉／半身／全身）
(function(){
'use strict';
// 繁→簡對照（遊戲與學習單用到的字）
const T2S_BASE={"個":"个","內":"内","兩":"两","厲":"厉","問":"问","單":"单","嗎":"吗","圖":"图","壯":"壮","對":"对","徵":"征","態":"态","戰":"战","戲":"戏","捲":"卷","擇":"择","數":"数","時":"时","標":"标","樣":"样","機":"机","歲":"岁","沒":"没","為":"为","無":"无","狀":"状","現":"现","異":"异","確":"确","碼":"码","簡":"简","結":"结","繼":"继","續":"续","膚":"肤","臉":"脸","與":"与","設":"设","詞":"词","試":"试","語":"语","誰":"谁","譯":"译","資":"资","較":"较","輔":"辅","這":"这","連":"连","進":"进","遊":"游","選":"选","還":"还","錯":"错","鎖":"锁","長":"长","門":"门","開":"开","關":"关","階":"阶","離":"离","難":"难","頭":"头","題":"题","顯":"显","體":"体","髮":"发","麼":"么","點":"点",
  "佔":"占","來":"来","傳":"传","別":"别","刪":"删","則":"则","動":"动","區":"区","啟":"启","圍":"围","執":"执","塊":"块","夾":"夹","學":"学","實":"实","寫":"写","寬":"宽","專":"专","屬":"属","師":"师","帶":"带","幾":"几","後":"后","從":"从","應":"应","換":"换","擾":"扰","敗":"败","斷":"断","於":"于","會":"会","條":"条","樂":"乐","檔":"档","檻":"槛","欄":"栏","權":"权","淺":"浅","湊":"凑","滿":"满","漢":"汉","畫":"画","種":"种","稱":"称","節":"节","範":"范","紀":"纪","級":"级","組":"组","給":"给","統":"统","經":"经","網":"网","綴":"缀","緒":"绪","線":"线","練":"练","績":"绩","義":"义","習":"习","聲":"声","膠":"胶","舊":"旧","號":"号","裡":"里","製":"制","複":"复","見":"见","規":"规","視":"视","訂":"订","評":"评","話":"话","認":"认","說":"说","調":"调","請":"请","讀":"读","變":"变","讓":"让","質":"质","賴":"赖","載":"载","輸":"输","轉":"转","過":"过","達":"达","邊":"边","鈕":"钮","錄":"录","間":"间","閱":"阅","陣":"阵","陰":"阴","陽":"阳","際":"际","隨":"随","雜":"杂","響":"响","頁":"页","項":"项","順":"顺","須":"须","預":"预","額":"额","類":"类","餘":"余","駐":"驻","齊":"齐","齡":"龄"};
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

// ===== 拼音（帶聲調符號）→ 注音（與跑吧、色數同一份轉換器）=====
const ZY=(function(){
  var INI={b:'ㄅ',p:'ㄆ',m:'ㄇ',f:'ㄈ',d:'ㄉ',t:'ㄊ',n:'ㄋ',l:'ㄌ',g:'ㄍ',k:'ㄎ',h:'ㄏ',j:'ㄐ',q:'ㄑ',x:'ㄒ',zh:'ㄓ',ch:'ㄔ',sh:'ㄕ',r:'ㄖ',z:'ㄗ',c:'ㄘ',s:'ㄙ'};
  var FIN={a:'ㄚ',o:'ㄛ',e:'ㄜ',ê:'ㄝ',ai:'ㄞ',ei:'ㄟ',ao:'ㄠ',ou:'ㄡ',an:'ㄢ',en:'ㄣ',ang:'ㄤ',eng:'ㄥ',er:'ㄦ',
    i:'ㄧ',ia:'ㄧㄚ',io:'ㄧㄛ',ie:'ㄧㄝ',iao:'ㄧㄠ',iu:'ㄧㄡ',iou:'ㄧㄡ',ian:'ㄧㄢ',in:'ㄧㄣ',iang:'ㄧㄤ',ing:'ㄧㄥ',
    u:'ㄨ',ua:'ㄨㄚ',uo:'ㄨㄛ',uai:'ㄨㄞ',ui:'ㄨㄟ',uei:'ㄨㄟ',uan:'ㄨㄢ',un:'ㄨㄣ',uen:'ㄨㄣ',uang:'ㄨㄤ',ong:'ㄨㄥ',ueng:'ㄨㄥ',
    v:'ㄩ',ve:'ㄩㄝ',van:'ㄩㄢ',vn:'ㄩㄣ',iong:'ㄩㄥ'};
  var MARK=['','','ˊ','ˇ','ˋ'];
  function one(syl){
    var s=syl.normalize('NFD'),tone=5;
    if(/̄/.test(s))tone=1;else if(/́/.test(s))tone=2;else if(/̌/.test(s))tone=3;else if(/̀/.test(s))tone=4;
    s=s.replace(/ü/g,'v').replace(/ü/g,'v').replace(/Ü/g,'v').replace(/[̀-ͯ]/g,'').toLowerCase();
    if(!/^[a-zê]+$/.test(s))return syl;
    var ini='',rest=s,m;
    if(s==='n'||s==='m'){var zz=s==='n'?'ㄣ':'ㄇㄨ';return tone===5?'˙'+zz:zz+MARK[tone];}
    if(s==='er'||s==='r'){rest='er';}
    else if((m=s.match(/^(zh|ch|sh|[bpmfdtnlgkhjqxrzcs])/))){ini=m[1];rest=s.slice(ini.length);}
    else if(s[0]==='y'){rest=s.slice(1);if(/^u/.test(rest))rest=rest.replace(/^u/,'v');else if(!(rest==='i'||rest==='in'||rest==='ing'))rest='i'+rest;}
    else if(s[0]==='w'){rest=s.slice(1);rest=(rest==='u')?'u':'u'+rest;}
    if(ini&&/^[jqx]$/.test(ini))rest=rest.replace(/^u/,'v');
    if(/^(zh|ch|sh|r|z|c|s)$/.test(ini)&&rest==='i')rest='';
    var f=rest===''?'':FIN[rest];
    if(f===undefined)return syl;
    var z=(ini?INI[ini]:'')+f;
    return tone===5?'˙'+z:z+MARK[tone];
  }
  return {one:one};
})();
// 一個詞的拼音可能連在一起寫（méiyǒu、chàbuduō），先切成音節再轉注音
const SYL=/^(zh|ch|sh|[bpmfdtnlgkhjqxrzcsyw])?(iang|iong|uang|ueng|iao|ian|uai|uan|van|ang|eng|ing|ong|ai|ei|ao|ou|an|en|in|un|vn|ia|ie|iu|io|ua|uo|ui|ue|ve|er|a|o|e|i|u|v)/;
function pySplit(py){
  const out=[];
  for(const word of String(py||'').trim().split(/[\s'’]+/).filter(Boolean)){
    const orig=[...word.normalize('NFC')];
    const base=orig.map(c=>{const b=c.normalize('NFD').replace(/[̀-̇̉-ͯ]/g,'');return /ü|ü/i.test(b)?'v':b.toLowerCase();}).join('');
    let i=0;
    while(i<base.length){
      const m=base.slice(i).match(SYL);
      if(!m){out.push(orig.slice(i).join(''));break;}
      let len=m[0].length;
      const next=base[i+len];
      // 後面接母音時，結尾的 n／ng 屬於下一個音節（例如 xī'ān 不切成 xīn-ā）
      if(next&&/[aeiouv]/.test(next)){
        if(/ng$/.test(m[0]))len-=1;else if(/n$/.test(m[0]))len-=1;
      }
      out.push(orig.slice(i,i+len).join(''));i+=len;
    }
  }
  return out;
}
const zyOf=py=>pySplit(py).map(ZY.one).join(' ');

window.BBK_ENGINE=function(THEME){
  const ITEMS=THEME.items;
  const T2S=Object.assign({},T2S_BASE,THEME.t2s||{});
  const zh=(s,simp)=>simp?[...String(s)].map(c=>T2S[c]||c).join(''):String(s);
  const LV_CNT={1:'2',2:'2–3',3:'2–4'};   // 各關一題會出現幾個項目
  const PASS={1:80,2:75,3:70};   // 各關及格分數（10 題，每題最多 10 分）。第一關很多題只有 2 個選項、容易猜中，所以門檻較高
  const passMark=(lv,n)=>Math.round(PASS[lv]*n/10);   // 題數不是 10 題時，及格線依比例換算
  let RANGE=null;
  const W={比:'bǐ',跟:'gēn',沒有:'méiyǒu',那麼:'nàme',一樣:'yíyàng',差不多:'chàbuduō',不:'bù',誰:'shéi',是:'shì',比較:'bǐjiào',最:'zuì',更:'gèng',還:'hái',一點:'yìdiǎn',很多:'hěn duō',多了:'duō le',的:'de',公分:'gōngfēn',歲:'suì',對:'duì',錯:'cuò',哪:'nǎ',一句:'yí jù',選出:'xuǎnchū',正確:'zhèngquè',詞:'cí',還是:'háishì'};
  const tk=(t,p)=>({t,p:p===undefined?(W[t]||''):p});
  const NM=p=>({t:p.name,nm:1});
  const P_=t=>({t,p:'',punc:1});
  const BL={blank:1};
  const NUMPY={一:'yī',二:'èr',三:'sān',四:'sì',五:'wǔ',六:'liù',七:'qī',八:'bā',九:'jiǔ',十:'shí'};
  function cnNum(n){const d='零一二三四五六七八九';let s;
    if(n<10)s=d[n];else if(n<20)s='十'+(n%10?d[n%10]:'');else s=d[Math.floor(n/10)]+'十'+(n%10?d[n%10]:'');
    return tk(s,[...s].map(c=>NUMPY[c]).join(''));}
  // ===== 比較特徵（由主題包定義）=====
  const DIMS=THEME.dims;
  for(const k in DIMS)DIMS[k].key=k;
  const R=n=>Math.floor(Math.random()*n);
  const pick=a=>{if(a.length&&a[0]&&a[0].key&&a[0].v){let t=0;for(const d of a)t+=dimW(d);let r=Math.random()*t;for(const d of a){r-=dimW(d);if(r<=0)return d;}return a[a.length-1];}return a[R(a.length)];};
  const shuffle=a=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=R(i+1);[a[i],a[j]]=[a[j],a[i]];}return a;};
  function cmp(d,a,b){if(a[d.key]===0||b[d.key]===0)return null;   // 0 = 校正時標為不出題
    const x=d.v(a)-d.v(b),ax=Math.abs(x);
    if(d.num){if(ax<=d.near)return 0;if(ax>=d.thr)return Math.sign(x);return null;}
    if(x===0)return 0;if(ax>=d.thr)return Math.sign(x);return null;}
  function degree(d,a,b){const ax=Math.abs(d.v(a)-d.v(b));
    if(d.key==='height')return ax>=8&&ax<=12?1:ax>=20?2:0;
    if(d.key==='age')return ax>=3&&ax<=5?1:ax>=15?2:0;
    return ax===1?1:ax===2?2:0;}
  const adj=(d,pol)=>pol>0?d.pos:d.neg;
  const tkA=(d,pol)=>tk(adj(d,pol).z,adj(d,pol).p);
  // 主語（含「的頭髮」）
  const subj=(d,a)=>d.poss?[NM(a),tk('的'),tk(d.poss.z,d.poss.p)]:[NM(a)];
  // ===== 句子：中文 tokens + 西／英翻譯 =====
  function esA(d,pol,p){const e=adj(d,pol).es;return Array.isArray(e)?e[p?THEME.gnd(p):0]:e;}
  function esMas(d,pol,p,pre){const a=esA(d,pol,p);return (pre||'')+(d.noMas?a:'más '+a);}
  function enC(d,pol){return adj(d,pol).en[1];}
  // st: {f, d, a, b, pol, deg, n}
  function sent(st){const {f,d,a,b,pol}=st;let z,es,en;const ps=d.poss;
    const esS=(core)=>ps?`${a.name} tiene ${ps.es} ${core} que ${b.name}`:`${a.name} es ${core} que ${b.name}`;
    const enS=(core)=>ps?`${a.name}'s ${ps.en} ${ps.be} ${core} than ${b.name}'s`:`${a.name} is ${core} than ${b.name}`;
    if(f==='BI'){z=[...subj(d,a),tk('比'),NM(b),tkA(d,pol)];es=esS(esMas(d,pol,a));en=enS(enC(d,pol));}
    else if(f==='DEG'){const w=st.deg===1?'一點':(st.alt?'多了':'很多');z=[...subj(d,a),tk('比'),NM(b),tkA(d,pol),tk(w)];
      es=esS(esMas(d,pol,a,st.deg===1?'un poco ':'mucho '));en=enS((st.deg===1?'a bit ':'much ')+enC(d,pol));}
    else if(f==='DIFF'){z=[NM(a),tk('比'),NM(b),tkA(d,pol),cnNum(st.n),d.unit];
      es=`${a.name} es ${st.n} ${d.esU} ${esMas(d,pol,a)} que ${b.name}`;en=`${a.name} is ${st.n} ${d.enU} ${enC(d,pol)} than ${b.name}`;}
    else if(f==='GENG'){const w=st.alt?'還':'更';z=[...subj(d,a),tk('比'),NM(b),tk(w),tkA(d,pol)];es=esS(esMas(d,pol,a,'aún '));en=enS('even '+enC(d,pol));}
    else if(f==='MEI'){z=[...subj(d,a),tk('沒有'),NM(b),tk('那麼'),tkA(d,pol)];
      es=ps?`${a.name} no tiene ${ps.es} tan ${esA(d,pol,a)} como ${b.name}`:`${a.name} no es tan ${esA(d,pol,a)} como ${b.name}`;
      en=ps?`${a.name}'s ${ps.en} ${ps.be} not as ${adj(d,pol).en[0]} as ${b.name}'s`:`${a.name} is not as ${adj(d,pol).en[0]} as ${b.name}`;}
    else if(f==='SAME'){z=[...subj(d,a),tk('跟'),NM(b),tk('一樣'),tkA(d,pol)];
      es=ps?`${a.name} tiene ${ps.es} tan ${esA(d,pol,a)} como ${b.name}`:`${a.name} es tan ${esA(d,pol,a)} como ${b.name}`;
      en=ps?`${a.name}'s ${ps.en} ${ps.be} as ${adj(d,pol).en[0]} as ${b.name}'s`:`${a.name} is as ${adj(d,pol).en[0]} as ${b.name}`;}
    else if(f==='ABOUT'){z=[NM(a),tk('跟'),NM(b),tk('差不多'),tkA(d,1)];
      es=d.key==='age'?`${a.name} y ${b.name} tienen casi la misma edad`:`${a.name} es casi tan ${esA(d,1,a)} como ${b.name}`;
      en=d.key==='age'?`${a.name} is about the same age as ${b.name}`:`${a.name} is about as ${adj(d,1).en[0]} as ${b.name}`;}
    else if(f==='DIFFER'){z=ps?[NM(a),tk('跟'),NM(b),tk('的'),tk(ps.z,ps.p),tk('不'),tk('一樣'),tkA(d,1)]:[NM(a),tk('跟'),NM(b),tk('不'),tk('一樣'),tkA(d,1)];
      es=`${a.name} y ${b.name} no tienen ${d.esSame}`;en=`${a.name} and ${b.name} ${d.enSame}`;}
    return {z,es,en};
  }
  function truth(st){const {f,d,a,b,pol}=st;const c=cmp(d,a,b);
    if(f==='BI'||f==='GENG')return c===null?null:c===pol;
    if(f==='DEG'){if(c===null)return null;if(c!==pol)return false;const g=degree(d,a,b);return g===0?null:g===st.deg;}
    if(f==='DIFF')return (d.v(a)-d.v(b))*pol===st.n;
    if(f==='MEI')return c===null||c===0?null:c===-pol;
    if(f==='SAME'){if(c===null)return null;if(c!==0)return false;const lv=d.v(a);const want=pol>0?3:1;return lv===want?true:null;}
    if(f==='ABOUT')return c===null?null:c===0;
    if(f==='DIFFER')return c===null?null:c!==0;
    return null;}
  // 問句
  function ask(kind,d,o){const ps=d.poss;let z,es,en;const pol=o.pol;
    if(kind==='WHO'){z=[tk('誰'),tk('是'),NM(o.a),P_('？')];es=`¿Quién es ${o.a.name}?`;en=`Who is ${o.a.name}?`;}
    else if(kind==='MORE'){z=[NM(o.a),tk('跟'),NM(o.b),P_('，'),tk('誰'),...(ps?[tk('的'),tk(ps.z,ps.p)]:[]),tk('比較'),tkA(d,pol),P_('？')];
      es=ps?`${o.a.name} y ${o.b.name}, ¿quién tiene ${ps.es} ${esMas(d,pol,null)}?`:`${o.a.name} y ${o.b.name}, ¿quién es ${esMas(d,pol,null)}?`;
      en=ps?`${o.a.name} or ${o.b.name}: whose ${ps.en} ${ps.be} ${enC(d,pol)}?`:`${o.a.name} or ${o.b.name}: who is ${enC(d,pol)}?`;}
    else if(kind==='WHOBI'){z=[tk('誰'),...(ps?[tk('的'),tk(ps.z,ps.p)]:[]),tk('比'),NM(o.t),tkA(d,pol),P_('？')];
      es=ps?`¿Quién tiene ${ps.es} ${esMas(d,pol,null)} que ${o.t.name}?`:`¿Quién es ${esMas(d,pol,null)} que ${o.t.name}?`;
      en=ps?`Whose ${ps.en} ${ps.be} ${enC(d,pol)} than ${o.t.name}'s?`:`Who is ${enC(d,pol)} than ${o.t.name}?`;}
    else if(kind==='BIWHO'){z=[...subj(d,o.t),tk('比'),tk('誰'),tkA(d,pol),P_('？')];
      es=ps?`${o.t.name} tiene ${ps.es} ${esMas(d,pol,o.t)} que… ¿quién?`:`${o.t.name} es ${esMas(d,pol,o.t)} que… ¿quién?`;
      en=ps?`${o.t.name}'s ${ps.en} ${ps.be} ${enC(d,pol)} than whose?`:`${o.t.name} is ${enC(d,pol)} than whom?`;}
    else if(kind==='MOST'){z=[tk('誰'),...(ps?[tk('的'),tk(ps.z,ps.p)]:[]),tk('最'),tkA(d,pol),P_('？')];
      es=ps?`¿Quién tiene ${ps.es} ${esMas(d,pol,null)}?`:`¿Quién es ${d.noMas?'el '+esA(d,pol,null):'el '+esMas(d,pol,null)}?`;
      en=ps?`Whose ${ps.en} ${ps.be} the ${adj(d,pol).en[2]}?`:`Who is the ${adj(d,pol).en[2]}?`;}
    else if(kind==='TF'){z=[tk('對'),tk('還是'),tk('錯'),P_('？')];es='¿Verdadero o falso?';en='True or false?';}
    else if(kind==='PICK'){z=[tk('哪'),tk('一句'),tk('是'),tk('對'),tk('的'),P_('？')];es='¿Qué frase es correcta?';en='Which sentence is correct?';}
    else if(kind==='FILL'){z=[tk('選出'),tk('正確'),tk('的'),tk('詞'),P_('。')];es='Elige la palabra correcta.';en='Choose the correct word.';}
    return {z,es,en};}
  // ===== 出題 =====
  const LV_DIMS=lv=>Object.values(DIMS).filter(d=>d.lv<=lv&&(!RANGE||!RANGE.dims.length||RANGE.dims.includes(d.key)));
  // 各特徵出現機率（眼睛、鼻子在圖上差異較小，比較少出）
  let USED={};const dimW=d=>d.w*Math.pow(.4,USED[d.key]||0);   // 同一回合已出過的特徵，權重每次乘 0.4
  function people(n,cond,tries=400){for(let i=0;i<tries;i++){const s=shuffle(ITEMS).slice(0,n);if(cond(...s))return s;}return null;}
  const clear=(d,a,b)=>{const c=cmp(d,a,b);return c===1||c===-1?c:null;};
  function polOK(d,pol){return pol>0||!!d.neg;}
  function rPol(d){return d.neg&&Math.random()<.5?-1:1;}
  function mkQ(type,d,its,o){return Object.assign({type,d,its,crop:d.crop},o);}
  // ===== 輔助：字面真假、依人物資料找出題條件 =====
  // 字面真假：不看「差不多」門檻，只看實際數值；用來確保同一題不會有兩個選項同時為真
  function litTrue(st){const {f,d,a,b,pol}=st;const x=d.v(a)-d.v(b),s=Math.sign(x);
    if(f==='BI'||f==='GENG')return s===pol;
    if(f==='MEI')return s===-pol;
    if(f==='SAME')return x===0;
    if(f==='ABOUT')return Math.abs(x)<=d.near;
    if(f==='DIFFER')return x!==0;
    if(f==='DEG'){if(s!==pol)return false;const g=degree(d,a,b);return g===0||g===st.deg;}
    if(f==='DIFF')return x*pol===st.n;
    return false;}
  const REL={};
  function rel(d,t){const k=d.key+t.id;if(REL[k])return REL[k];const up=[],dn=[];
    for(const p of ITEMS){if(p===t)continue;const c=clear(d,p,t);if(c===1)up.push(p);else if(c===-1)dn.push(p);}
    return REL[k]={up,dn};}
  // 回傳 [同方向, 反方向]：同方向 = 在 t 的 pol 那一邊（pol=1 是比 t 高／大／長…）的人
  const sideOf=(d,t,pol)=>{const r=rel(d,t);return pol>0?[r.up,r.dn]:[r.dn,r.up];};
  const sample=(a,n)=>shuffle(a).slice(0,n);
  // 依權重挑一個「人物資料真的湊得出題目」的特徵與方向（不會再抽到湊不出來的特徵而白白重試）
  function chooseDP(lv,ok){const o=[];
    for(const d of LV_DIMS(lv)){const pols=[1,-1].filter(p=>polOK(d,p)&&ok(d,p));if(pols.length)o.push({d,pols});}
    if(!o.length)return null;
    let t=0;for(const x of o)t+=dimW(x.d);let r=Math.random()*t,c=o[o.length-1];
    for(const x of o){r-=dimW(x.d);if(r<=0){c=x;break;}}
    return {d:c.d,pol:c.pols[R(c.pols.length)]};}
  const triT=(d,pol,n,kind)=>ITEMS.filter(t=>{const [s,o]=sideOf(d,t,pol);return kind==='who'?s.length>=1&&o.length>=n-2:o.length>=1&&s.length>=n-2;});
  const mostW=(d,pol,n)=>ITEMS.filter(w=>sideOf(d,w,pol)[1].length>=n-1);
  const CH={};
  function chains(d){if(CH[d.key])return CH[d.key];const out=[];
    for(const x of ITEMS)for(const y of ITEMS){if(x===y||THEME.grp(x)!==THEME.grp(y)||clear(d,x,y)!==1)continue;
      for(const z of ITEMS){if(z===x||z===y||THEME.grp(z)!==THEME.grp(x)||clear(d,y,z)!==1)continue;out.push([x,y,z]);}}
    return CH[d.key]=out;}
  const GEN={
   // 解碼：兩人不顯示名字
   decode(lv){const d=pick(LV_DIMS(lv).filter(d=>d.neg||true));
     const forms=lv>=2?(d.num?['BI','BI','MEI','DEG']:['BI','BI','MEI']):['BI'];const f=pick(forms);
     for(let i=0;i<60;i++){const s=people(2,(a,b)=>THEME.grp(a)===THEME.grp(b)&&clear(d,a,b)!==null);if(!s)return null;const [a,b]=s;let pol=rPol(d);
       let st={f,d,a,b,pol};
       if(f==='MEI'){st.pol=pol;if(truth(st)!==true){st={f,d,a:b,b:a,pol};}}
       else if(f==='DEG'){const g=degree(d,a,b);if(!g)continue;st.deg=g;st.alt=Math.random()<.4;if(truth(st)!==true)st={...st,pol:-pol};if(!polOK(d,st.pol))continue;}
       else{if(truth(st)!==true)st.pol=-pol;if(!polOK(d,st.pol)){st={f,d,a:b,b:a,pol:1};}}
       if(!polOK(d,st.pol)||truth(st)!==true)continue;
       const who=Math.random()<.5?st.a:st.b;
       return mkQ('decode',d,shuffle([a,b]),{hide:1,sents:[sent(st)],q:ask('WHO',d,{a:who}),ans:who.id,tagCm:f==='DEG'&&d.key==='height',f:st.f,pol:st.pol});}
     return null;},
   // 對錯
   tf(lv){const d=pick(LV_DIMS(lv));
     for(let i=0;i<80;i++){const [a,b]=shuffle(ITEMS).slice(0,2);const c=cmp(d,a,b);if(c===null)continue;
       const cands=[];
       for(const pol of [1,-1]){if(!polOK(d,pol))continue;cands.push({f:'BI',d,a,b,pol},{f:'BI',d,a:b,b:a,pol});if(d.eq)cands.push({f:'SAME',d,a,b,pol});}
       if(d.num)cands.push({f:'ABOUT',d,a,b});if(d.same)cands.push({f:'DIFFER',d,a,b});
       const want=Math.random()<.5;const ok=cands.filter(s=>truth(s)===want&&litTrue(s)===want);if(!ok.length)continue;
       const st=pick(ok);
       return mkQ('tf',d,[a,b],{sents:[sent(st)],q:ask('TF',d,{}),btns:[{z:[tk('對')],ok:want},{z:[tk('錯')],ok:!want}],tf:1,f:st.f,pol:st.pol||0,tv:want});}
     return null;},
   // 看圖選句子
   pick(lv){let cd=LV_DIMS(lv).filter(d=>lv<3||d.num||Math.random()<.5);if(!cd.length)cd=LV_DIMS(lv);const d=pick(cd);const nd=lv>=2?3:2;   // 干擾項：L1 兩個（共 3 選項）、L2 以上三個（共 4 選項）
     for(let i=0;i<120;i++){const [a,b]=shuffle(ITEMS).slice(0,2);if(cmp(d,a,b)===null)continue;
       const c=[];
       for(const pol of [1,-1]){if(!polOK(d,pol))continue;
         for(const [x,y] of [[a,b],[b,a]]){c.push({f:'BI',d,a:x,b:y,pol});
           if(lv>=2){c.push({f:'MEI',d,a:x,b:y,pol});if(d.num)c.push({f:'DEG',d,a:x,b:y,pol,deg:1},{f:'DEG',d,a:x,b:y,pol,deg:2});}
           if(lv>=3&&d.num){const n0=Math.abs(d.v(a)-d.v(b));for(const n of [n0,n0+5,Math.max(3,n0-5)])if(n>=3&&n<100)c.push({f:'DIFF',d,a:x,b:y,pol,n});}}
         if(d.eq)c.push({f:'SAME',d,a,b,pol});}
       if(d.num)c.push({f:'ABOUT',d,a,b});if(d.same&&lv<3)c.push({f:'DIFFER',d,a,b});
       // 正確選項必須「遊戲判斷」與「字面」都為真；干擾項則兩者都為假，這樣一題只會有一個為真的選項
       let T=c.filter(s=>truth(s)===true&&litTrue(s)),F=c.filter(s=>truth(s)===false&&!litTrue(s));
       if(lv>=3&&d.num){const t2=T.filter(s=>s.f==='DIFF');if(t2.length)T=t2;}
       if(!T.length||F.length<2)continue;
       const t=pick(T);const zs=new Set([sent(t).z.map(x=>x.t).join('')]);const fs=[];
       for(const s of shuffle(F)){const k=sent(s).z.map(x=>x.t).join('');if(!zs.has(k)){zs.add(k);fs.push(s);}if(fs.length===nd)break;}
       if(fs.length<2)continue;
       const btns=shuffle([{st:t,ok:true},...fs.map(s=>({st:s,ok:false}))]).map(o=>({z:sent(o.st).z,ok:o.ok,tr:sent(o.st)}));
       return mkQ('pick',d,[a,b],{q:ask('PICK',d,{}),btns,tagCm:d.key==='height'&&(lv>=2||t.f==='DIFF'),f:t.f,pol:t.pol||0});}
     return null;},
   // 誰比較…（兩人）
   more(lv){const d=pick(LV_DIMS(lv));
     const s=people(2,(a,b)=>clear(d,a,b)!==null);if(!s)return null;const [a,b]=s;const pol=rPol(d);
     const win=clear(d,a,b)===pol?a:b;
     return mkQ('more',d,[a,b],{q:ask('MORE',d,{a,b,pol}),ans:win.id,expl:[sent({f:'BI',d,a:win,b:win===a?b:a,pol})],f:'MORE',pol});},
   // 誰比 T …（L2 三人、L3 四人）
   whobi(lv){const n=lv>=3?4:3;const ch=chooseDP(lv,(d,pol)=>triT(d,pol,n,'who').length>0);if(!ch)return null;const {d,pol}=ch;
     const ts=triT(d,pol,n,'who'),t=ts[R(ts.length)],[s,o]=sideOf(d,t,pol),x=s[R(s.length)];
     return mkQ('whobi',d,shuffle([t,x,...sample(o,n-2)]),{q:ask('WHOBI',d,{t,pol}),ans:x.id,expl:[sent({f:'BI',d,a:x,b:t,pol})],f:'WHOBI',pol});},
   // T 比誰…（L2 三人、L3 四人）
   biwho(lv){const n=lv>=3?4:3;const ch=chooseDP(lv,(d,pol)=>triT(d,pol,n,'bi').length>0);if(!ch)return null;const {d,pol}=ch;
     const ts=triT(d,pol,n,'bi'),t=ts[R(ts.length)],[s,o]=sideOf(d,t,pol),y=o[R(o.length)];
     return mkQ('biwho',d,shuffle([t,y,...sample(s,n-2)]),{q:ask('BIWHO',d,{t,pol}),ans:y.id,expl:[sent({f:'BI',d,a:t,b:y,pol})],f:'BIWHO',pol});},
   // 填空
   fill(lv){const d=pick(LV_DIMS(lv));
     for(let i=0;i<80;i++){const [a,b]=shuffle(ITEMS).slice(0,2);const c=cmp(d,a,b);if(c===null)continue;const kinds=[];
       if(c!==0){kinds.push('bi','mei');if(d.num)kinds.push('deg');}if(c===0&&d.eq&&(d.v(a)===1||d.v(a)===3))kinds.push('same');if(!kinds.length)continue;
       const k=pick(kinds);let st,z,words,ans;
       if(k==='bi'){const pol=polOK(d,c)?c:null;if(!pol)continue;st={f:'BI',d,a,b,pol};z=[...subj(d,a),BL,NM(b),tkA(d,pol)];words=['比','跟','沒有'];ans='比';}
       else if(k==='mei'){const pol=-c;if(!polOK(d,pol))continue;st={f:'MEI',d,a,b,pol};z=[...subj(d,a),BL,NM(b),tk('那麼'),tkA(d,pol)];words=['比','跟','沒有'];ans='沒有';}
       else if(k==='same'){const pol=d.v(a)===3?1:-1;if(!polOK(d,pol))continue;st={f:'SAME',d,a,b,pol};z=[...subj(d,a),BL,NM(b),tk('一樣'),tkA(d,pol)];words=['比','跟','沒有'];ans='跟';}
       else{const pol=polOK(d,c)?c:null;if(!pol)continue;const g=degree(d,a,b);if(!g)continue;st={f:'DEG',d,a,b,pol,deg:g};z=[...subj(d,a),tk('比'),NM(b),tkA(d,pol),BL];words=['一點','很多','一樣'];ans=g===1?'一點':'很多';}
       if(truth(st)!==true)continue;
       return mkQ('fill',d,[a,b],{blankZ:z,fillAns:ans,q:ask('FILL',d,{}),btns:words.map(w=>({z:[tk(w)],ok:w===ans,w})),full:sent(st),row:1,tagCm:k==='deg'&&d.key==='height',f:st.f,pol:st.pol});}
     return null;},
   // 連鎖解碼（三人，更／還）
   chain(lv){const ch=chooseDP(lv,d=>chains(d).length>0);if(!ch)return null;const {d,pol}=ch;
     const cs=chains(d),[x,y,z]=cs[R(cs.length)];
     let s1,s2;if(pol<0){s1={f:'BI',d,a:y,b:x,pol:-1};s2={f:'GENG',d,a:z,b:y,pol:-1,alt:Math.random()<.5};}
     else{s1={f:'BI',d,a:y,b:z,pol:1};s2={f:'GENG',d,a:x,b:y,pol:1,alt:Math.random()<.5};}
     const who=[x,y,z][R(3)];
     return mkQ('chain',d,shuffle([x,y,z]),{hide:1,sents:[sent(s1),sent(s2)],q:ask('WHO',d,{a:who}),ans:who.id,f:'GENG',pol});},
   // 誰最…（3–4 人）
   most(lv){let n=Math.random()<.5?3:4;let ch=chooseDP(lv,(d,pol)=>mostW(d,pol,n).length>0);
     if(!ch){n=3;ch=chooseDP(lv,(d,pol)=>mostW(d,pol,n).length>0);}if(!ch)return null;
     const {d,pol}=ch,ws=mostW(d,pol,n),w=ws[R(ws.length)],ps=d.poss;
     const ex={z:[...subj(d,w),tk('最'),tkA(d,pol)],
       es:ps?`${w.name} tiene ${ps.es} ${esMas(d,pol,w)}`:`${w.name} es ${d.noMas?THEME.art(w)+esA(d,pol,w):THEME.art(w)+esMas(d,pol,w)}`,
       en:ps?`${w.name}'s ${ps.en} ${ps.be} the ${adj(d,pol).en[2]}`:`${w.name} is the ${adj(d,pol).en[2]}`};
     return mkQ('most',d,shuffle([w,...sample(sideOf(d,w,pol)[1],n-1)]),{q:ask('MOST',d,{pol}),ans:w.id,expl:[ex],f:'MOST',pol});},
  };
  const POOL={1:['decode','tf','pick','more'],2:['decode','pick','whobi','biwho','fill'],3:['chain','most','whobi','biwho','pick']};
  const qKey=q=>q.type+q.d.key+q.its.map(p=>p.id).sort().join();
  const poolOf=lv=>POOL[lv].filter(t=>!RANGE||!RANGE.types.length||RANGE.types.includes(t));   // 老師有勾題型時只出勾的
  function makeRound(lv){USED={};const pool=poolOf(lv);if(!pool.length||!LV_DIMS(lv).length)return [];
    const list=[];
    if(RANGE){const ts=shuffle(pool);for(let i=0;i<RANGE.n;i++)list.push(ts[i%ts.length]);}   // 老師自選：題型平均分配
    else{const types=shuffle(POOL[lv]).slice(0,3);const counts=[4,3,3];types.forEach((t,i)=>{for(let k=0;k<counts[i];k++)list.push(t);});}
    const qs=[],seen=new Set();   // seen：同一回合不出完全相同的題目
    for(const t of shuffle(list)){let q=null;
      for(const tt of [t,...shuffle(pool.filter(x=>x!==t))]){for(let i=0;i<(tt===t?20:6)&&!q;i++){const c=GEN[tt](lv);if(c&&!seen.has(qKey(c)))q=c;}if(q)break;}
      if(q){seen.add(qKey(q));USED[q.d.key]=(USED[q.d.key]||0)+1;qs.push(q);}}   // 已出過的特徵之後權重變低，讓眼睛、鼻子等也有機會出現
    return qs;}


  // ===== 給外面用 =====
  function round(lv,rg){RANGE=rg||null;try{return makeRound(lv);}finally{RANGE=null;}}
  // 句子 tokens → HTML。o = {simp, phon:'pinyin'|'zhuyin'|'both'|'off'}；blankHtml = 填空格子要顯示的內容
  // 開拼音／注音時每個詞都包成「上面小字、下面中文」的小方塊；人名、標點、空格上面留空，讓整句對齊
  function phLines(p,mode){
    const sp=(t,c)=>`<span class="ph${c?' zy':''}">${t?esc(t):'&nbsp;'}</span>`;
    if(mode==='pinyin')return sp(p);
    if(mode==='zhuyin')return sp(p?zyOf(p):'',1);
    return sp(p)+sp(p?zyOf(p):'',1);
  }
  function rt(tokens,o,blankHtml){o=o||{};const mode=o.phon&&o.phon!=='off'?o.phon:'';
    return tokens.map(x=>{let inner;
      if(x.blank)inner=blankHtml||'<span class="blank">　</span>';
      else if(x.nm)inner=`<span class="nm">${esc(x.t)}</span>`;
      else inner=esc(zh(x.t,o.simp));
      if(!mode)return inner;
      return `<span class="w">${phLines(x.blank||x.nm||x.punc?'':x.p,mode)}<span class="hz">${inner}</span></span>`;}).join('');}
  // 一句話（tokens）＋句號
  const rtS=(tokens,o,blankHtml)=>rt([...tokens,P_('。')],o,blankHtml);
  const tr=(s,lang)=>!s||lang==='zh'||!lang?'':(lang==='en'?s.en:s.es);
  // 人物圖（卡片裡的圖）：q.crop = face（臉）／full（全身，依身高等比例）／其他（半身）
  function cropHtml(p,q,o){o=o||{};const base=o.base||'',dd=q.d,src=base+THEME.dir+p.id+'.webp';
    if(q.crop==='full'){const FH=o.height||250;const maxH=Math.max(...q.its.map(x=>dd.v(x)));const H=Math.round(FH*dd.v(p)/maxH);const w=Math.round(p.w*H/p.ih);
      return `<div class="fig" style="height:${FH}px"><img src="${src}" alt="" style="height:${H}px;width:${w}px"></div>`;}
    const fr=q.crop==='face'?p.face*1.15:0.52,ar=q.crop==='face'?1:0.78;
    return `<div class="crop" style="aspect-ratio:${ar};width:100%"><img src="${src}" alt="" style="height:${(100/fr).toFixed(1)}%"></div>`;}
  // 卡片上的小標（年齡、身高公分）
  function tagHtml(p,q,simp){const dd=q.d;const tg=f=>{const [n,u]=f(p);return `<div class="tag">${n} ${esc(zh(u,simp))}</div>`;};
    if(q.tagCm&&dd.tagB)return tg(dd.tagB);if(dd.tagA)return tg(dd.tagA);return '';}
  // 這個範圍的每種題型湊不湊得出題目
  function feasible(lv,rg,type){const saved=RANGE;RANGE=rg||null;let ok=false;
    try{for(let i=0;i<14&&!ok;i++){USED={};if(GEN[type](lv))ok=true;}}catch(e){ok=false;}finally{RANGE=saved;}
    return ok;}
  // 題型名稱：[中, 西, 英]
  const TN={
    decode:['看句子找人','Encuentra a la persona','Find the person'],tf:['對錯題','Verdadero o falso','True or false'],pick:['看圖選句子','Elige la frase','Pick the sentence'],
    more:['選人：誰比較＿？','Elige: ¿quién es más ＿?','Pick: who is more ＿?'],whobi:['選人：誰比 A ＿？','Elige: ¿quién es más ＿ que A?','Pick: who is more ＿ than A?'],biwho:['選人：A 比誰＿？','Elige: ¿A es más ＿ que quién?','Pick: A is more ＿ than whom?'],
    fill:['選比較詞','Elige la palabra de comparación','Pick the comparison word'],chain:['連鎖解碼','Decodifica en cadena','Chain clues'],most:['選人：誰最＿？','Elige: ¿quién es el más ＿?','Pick: who is the most ＿?'],
  };
  return {THEME,ITEMS,DIMS,POOL,TN,LV_CNT,PASS,passMark,makeRound:round,feasible,zh,esc,rt,rtS,tr,cropHtml,tagHtml,zy:zyOf,tk,P_};
};
window.BBK_ENGINE.zy=zyOf;
window.BBK_ENGINE.pySplit=pySplit;
})();
