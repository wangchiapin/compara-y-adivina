// 比比看 學習單（A4，可列印或存成 PDF）。老師管理中心的「學習單」頁會載入這支檔案，跟遊戲用同一個出題引擎。
// 用法：BBK_WORKSHEET(E, qs, o) → HTML 字串
//   E  = BBK_ENGINE(THEME_PACK)；qs = E.makeRound(lv, range) 出的題目
//   o  = { range:{lv,dims,types,n}, simp, lang:'es'|'en'|'zh', phon:'pinyin'|'zhuyin'|'both'|'off', answers:true/false, base:'圖片網址前綴' }
// 樣式都在 .bbkws 底下（不會影響中心其他畫面）。
(function(){
'use strict';
const LET='ABCDEFGH';
const CSS=`
.bbkws{color:#111;font-family:"PingFang TC","PingFang SC","Noto Sans TC","Noto Sans SC","Microsoft JhengHei",sans-serif}
.bbkws small{display:inline;margin-left:4px;color:#555;font-size:.72em;font-weight:400}
.bbkws .bw-head h2{margin:2px 0;font-size:1.4rem;text-align:center}
.bbkws .bw-sub{text-align:center;color:#555;font-size:.9rem;margin-bottom:6px}
.bbkws .bw-meta{display:flex;gap:16px;justify-content:space-between;flex-wrap:wrap;margin:10px 0 4px;font-size:.95rem}
.bbkws .bw-meta i{display:inline-block;border-bottom:1.5px solid #333;min-width:100px;height:1em;vertical-align:baseline}
.bbkws .bw-range{color:#555;font-size:.85rem;margin:2px 0 6px}
.bbkws .bw-q{display:flex;gap:10px;padding:10px 0;border-bottom:1px dashed #ccc;break-inside:avoid}
.bbkws .bw-n{flex:none;width:28px;height:28px;border-radius:50%;background:#333;color:#fff;text-align:center;line-height:28px;font-weight:700;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.bbkws .bw-b{flex:1;min-width:0}
.bbkws .bw-s{font-size:1.25rem;line-height:2}
.bbkws .bw-a{font-size:1.2rem;font-weight:700;line-height:1.9}
.bbkws .bw-t{font-size:.85rem;color:#555}
.bbkws .nm{color:#2a5bd7;font-weight:700;margin:0 .15em}
.bbkws .blank{display:inline-block;min-width:2.6em;border-bottom:2px solid #333;margin:0 .2em}
.bbkws .w{display:inline-flex;flex-direction:column;align-items:center;vertical-align:bottom;margin:0 .12em}
.bbkws .w .ph{font-size:.5em;line-height:1.25;color:#555;font-weight:400;white-space:nowrap}
.bbkws .w .ph.zy{font-size:.56em}
.bbkws .w .hz{line-height:1.45}
.bbkws .bw-cards{display:flex;flex-wrap:wrap;gap:8px;align-items:flex-end;margin:6px 0}
.bbkws .bw-card{flex:none;width:100px;border:1px solid #ddd;border-radius:10px;padding:4px;text-align:center;background:#fff}
.bbkws .bw-card.full{width:84px;border:0;padding:0 2px}
.bbkws .crop{position:relative;overflow:hidden;border-radius:8px;background:#f3f6fa;margin:0 auto;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.bbkws .crop img{position:absolute;top:0;left:50%;transform:translateX(-50%);display:block;width:auto;max-width:none}
.bbkws .fig{display:flex;justify-content:center;align-items:flex-end;border-bottom:3px solid #ccc}
.bbkws .fig img{display:block}
.bbkws .lab{margin-top:4px;font-weight:700;font-size:.95rem}
.bbkws .tag{display:inline-block;background:#eef3fb;border-radius:8px;padding:1px 7px;font-size:.8rem;margin-top:3px;color:#335}
.bbkws .ltr{display:inline-block;width:1.5em;height:1.5em;line-height:1.5em;border:1.5px solid #333;border-radius:50%;text-align:center;font-weight:700;font-size:.85rem;margin-right:3px}
.bbkws .bw-opt{display:flex;flex-direction:column;gap:2px;margin:6px 0}
.bbkws .bw-opt.row{flex-direction:row;gap:22px;flex-wrap:wrap}
.bbkws .bw-o{font-size:1.15rem;line-height:1.9}
.bbkws .bw-ans{margin-top:6px;font-size:.92rem}
.bbkws .bw-l{display:inline-block;border-bottom:1.5px solid #333;min-width:70px;height:1em;vertical-align:baseline}
.bbkws .bw-key{margin-top:26px;padding-top:12px;border-top:2px dashed #999}
.bbkws .bw-key h2{font-size:1.3rem;margin:4px 0 6px;text-align:center}
.bbkws .bw-k{padding:7px 0;border-bottom:1px dashed #ccc;break-inside:avoid}
.bbkws .bw-k .a{font-weight:700;font-size:1.05rem}
.bbkws .bw-k .s{font-size:1.02rem;line-height:1.9}
.bbkws .bw-k .t{font-size:.85rem;color:#555}
@media print{.bbkws .bw-key{break-before:page;border-top:0;margin-top:0;padding-top:0}}
`;
function addCss(){if(document.getElementById('bbkwsCss'))return;const st=document.createElement('style');st.id='bbkwsCss';st.textContent=CSS;document.head.appendChild(st);}

window.BBK_WORKSHEET=function(E,qs,o){
  addCss();
  const esc=E.esc,zh=s=>E.zh(s,o.simp),ro={simp:o.simp,phon:o.phon},lang=o.lang;
  const fx=(es,en)=>lang==='es'?es:lang==='en'?en:'';                 // 外語小字（只有中文 = 不顯示）
  const bi=(z,es,en)=>esc(zh(z))+(fx(es,en)?`<small>${esc(fx(es,en))}</small>`:'');
  const card=(p,i,q)=>`<div class="bw-card ${q.crop==='full'?'full':''}">${E.cropHtml(p,q,{base:o.base,height:150})}<div class="lab"><span class="ltr">${LET[i]}</span>${q.hide?'':esc(p.name)}</div>${E.tagHtml(p,q,o.simp)}</div>`;
  function oneQ(q,i){
    let h=`<div class="bw-q"><div class="bw-n">${i+1}</div><div class="bw-b">`;
    if(q.sents)h+=q.sents.map(s=>`<div class="bw-s">${E.rtS(s.z,ro)}</div>`).join('');
    if(q.blankZ)h+=`<div class="bw-s">${E.rtS(q.blankZ,ro)}</div>`;
    h+=`<div class="bw-a">${E.rt(q.q.z,ro)}</div>`;
    const t=E.tr(q.q,lang);if(t)h+=`<div class="bw-t">${esc(t)}</div>`;
    h+=`<div class="bw-cards">${q.its.map((p,j)=>card(p,j,q)).join('')}</div>`;
    if(q.btns&&q.tf){
      h+=`<div class="bw-opt row">${q.btns.map((b,j)=>`<span class="bw-o">☐ ${E.rt(b.z,ro)}${fx(j?'Falso':'Verdadero',j?'False':'True')?`<small>${fx(j?'Falso':'Verdadero',j?'False':'True')}</small>`:''}</span>`).join('')}</div>`;
    }else{
      if(q.btns)h+=`<div class="bw-opt ${q.row?'row':''}">${q.btns.map((b,j)=>`<div class="bw-o"><b>${LET[j]}</b>　${E.rt(b.z,ro)}</div>`).join('')}</div>`;
      h+=`<div class="bw-ans">${bi('答案','Respuesta','Answer')}：<span class="bw-l"></span></div>`;}
    return h+'</div></div>';}
  function oneKey(q,i){
    const k=q.btns?q.btns.findIndex(b=>b.ok):q.its.findIndex(p=>p.id===q.ans);
    let a;
    if(q.tf)a=esc(zh(q.btns[k].z[0].t));
    else if(q.btns)a=`${LET[k]}　${E.rt(q.btns[k].z,ro)}`;
    else a=`${LET[k]}　${esc(q.its[k].name)}`;
    const lines=[];
    const add=s=>{const t=E.tr(s,lang);lines.push(`<div class="s">${E.rtS(s.z,ro)}</div>${t?`<div class="t">${esc(t)}.</div>`:''}`);};
    if(q.sents)q.sents.forEach(add);
    if(q.full)add(q.full);
    if(q.expl)q.expl.forEach(add);
    if(q.btns&&q.type==='pick')add(q.btns.find(x=>x.ok).tr);
    return `<div class="bw-k"><div class="a">${i+1}. ${a}</div>${lines.join('')}</div>`;}
  const r=o.range,D=E.DIMS;
  const dn=(r.dims&&r.dims.length?r.dims:Object.keys(D).filter(k=>D[k].lv<=r.lv)).map(k=>zh(D[k].name[0])).join('、');
  const tn=(r.types&&r.types.length?r.types:E.POOL[r.lv]).map(k=>zh(E.TN[k][0])).join('、');
  const ins=fx(' Marca o escribe la respuesta correcta. 10 puntos por pregunta.',' Circle or write the correct answer. 10 points each.');
  return `<div class="bbkws">
  <div class="bw-head"><h2>${esc(zh('比比看 學習單'))}</h2><div class="bw-sub">Compara y Adivina${fx(' · Hoja de práctica',' · Worksheet')}</div></div>
  <div class="bw-meta"><span>${bi('姓名','Nombre','Name')}：<i></i></span><span>${bi('日期','Fecha','Date')}：<i></i></span><span>${bi('分數','Puntos','Score')}：<i style="min-width:50px"></i> / ${qs.length*10}</span></div>
  ${o.title?`<div class="bw-range"><b>📐 ${esc(o.title)}</b></div>`:''}
  <div class="bw-range">${esc(zh('第 '+r.lv+' 關'))} · ${esc(dn)} · ${esc(tn)}${qs.length<r.n?` · ${esc(zh('這個範圍只湊得出 '+qs.length+' 題'))}`:''}</div>
  <div class="bw-range">${esc(zh('每題圈出（或寫下）正確答案。每題 10 分。'))}${esc(ins)}</div>
  ${qs.map(oneQ).join('')}
  ${o.answers?`<div class="bw-key"><h2>${bi('答案','Respuestas','Answers')}</h2>${qs.map(oneKey).join('')}</div>`:''}
  </div>`;
};
})();
