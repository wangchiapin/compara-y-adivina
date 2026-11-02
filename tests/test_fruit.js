// 比比看 水果主題測試。用法：node tests/test_fruit.js
// 內容：主題按鈕切換、題庫資料、圖片都載得到、真實大小比例、每關每種題型出很多回合檢查（沒有 undefined、只有一個正確答案、
//       甜／酸不會拿「都很甜／都很酸」比、西英文有冠詞）、每種題型用滑鼠答對／答錯、語言／拼音／簡體設定。
let chromium; try{ ({ chromium } = require('playwright')); }catch(e){ ({ chromium } = require('/opt/npm-tools/node_modules/playwright')); }
const fs = require('fs'), path = require('path'), http = require('http');
const ROOT = path.join(__dirname, '..');
const MOCK = fs.readFileSync(path.join(__dirname, 'firebase-mock.js'), 'utf8');
let pass = 0, fail = 0;
function ok(c, name, extra){ if(c){ pass++; console.log('  ✓', name); } else { fail++; console.log('  ✗', name, extra !== undefined ? '→ ' + JSON.stringify(extra).slice(0, 400) : ''); } }
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.png': 'image/png' };
const server = http.createServer((req, res) => {
  let f = path.normalize(path.join(ROOT, decodeURIComponent(req.url.split('?')[0])));
  if(!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()){ res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
});
let BASE;
async function open(browser, url, { ls = {} } = {}){
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage(); const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('dialog', d => d.accept());
  await page.route('**/*', r => r.request().url().startsWith('http://localhost') ? r.continue() : r.abort());
  await page.addInitScript('window.__SEED={};window.__USER=null;' +
    Object.entries(ls).map(([k, v]) => `localStorage.setItem(${JSON.stringify(k)},${JSON.stringify(v)});`).join(''));
  await page.addInitScript(MOCK);
  await page.goto(BASE + url);
  return { page, errors, ctx };
}
const TYPES = { 1: ['tf', 'pick', 'more', 'fill', 'adj'], 2: ['pick', 'whobi', 'biwho', 'fill', 'adj'], 3: ['most', 'whobi', 'biwho', 'pick', 'fill'] };

server.listen(0, 'localhost', async () => {
  BASE = 'http://localhost:' + server.address().port;
  const browser = await chromium.launch();

  console.log('\n[F1] 主題按鈕與選單');
  { const { page, errors, ctx } = await open(browser, '/index.html'); await page.waitForSelector('.lvl');
    ok(await page.locator('.thm .opt[data-th="fruit"]:not(.lock)').count() === 1, '水果按鈕可以按（沒有 🔒）');
    ok(await page.locator('.thm .opt[data-th="animal"].lock').count() === 1 && await page.locator('.thm .opt[data-th="action"].lock').count() === 1, '動物、動作還是 🔒');
    ok(await page.locator('.thm .opt[data-th="people"].on').count() === 1, '預設選中人物');
    await Promise.all([page.waitForNavigation(), page.locator('.thm .opt[data-th="fruit"]').click()]); await page.waitForSelector('.lvl');
    ok(page.url().includes('theme=fruit'), '按水果 → 網址帶 ?theme=fruit', page.url());
    ok(await page.locator('.thm .opt[data-th="fruit"].on').count() === 1, '水果被選中');
    ok((await page.locator('.lvl .ppl').first().innerText()).includes('2 個水果'), '難度按鈕寫「2 個水果」', await page.locator('.lvl .ppl').first().innerText());
    ok((await page.locator('.lvl .ppl small').first().innerText()).includes('frutas'), '西語寫 frutas');
    await Promise.all([page.waitForNavigation(), page.locator('.thm .opt[data-th="people"]').click()]); await page.waitForSelector('.lvl');
    ok(!page.url().includes('theme='), '按回人物 → 網址不帶 theme', page.url());
    ok(errors.length === 0, '沒有 JS 錯誤', errors); await ctx.close(); }
  { const { page, ctx } = await open(browser, '/index.html?theme=fruit&class=abc123&r=ZZZ&lv=2'); await page.waitForTimeout(300);
    ok(true, '（帶班級碼與範圍碼的連結可以載入）'); await ctx.close(); }

  console.log('\n[F2] 題庫資料與圖片');
  { const { page, errors, ctx } = await open(browser, '/index.html?theme=fruit'); await page.waitForSelector('.lvl');
    const d = await page.evaluate(async () => { const T = window.THEME_PACK, bad = [], ids = new Set();
      for(const p of T.items){ ids.add(p.id);
        for(const k of ['id','name','py','es','en']) if(!p[k]) bad.push(p.id + ' 缺 ' + k);
        if(![0,1].includes(p.g)) bad.push(p.id + ' g');
        for(const k of ['size','weight','len','w','ih']) if(!(p[k] > 0)) bad.push(p.id + ' ' + k);
        if(!(p.long >= 0)) bad.push(p.id + ' long');
        for(const k of ['sweet','sour']) if(![1,2,3].includes(p[k])) bad.push(p.id + ' ' + k);
        const ok = await new Promise(r => { const i = new Image(); i.onload = () => r(i.naturalWidth === p.w && i.naturalHeight === p.ih); i.onerror = () => r(false); i.src = T.dir + p.id + '.webp'; });
        if(!ok) bad.push(p.id + ' 圖載不到或寬高不符'); }
      return { n: T.items.length, uniq: ids.size, bad, longN: T.items.filter(p => p.long > 0).length }; });
    ok(d.n === 32 && d.uniq === 32, '32 種水果、id 不重複', d);
    ok(d.bad.length === 0, '每種水果欄位齊全、圖載得到且寬高吻合', d.bad);
    ok(d.longN >= 6, '長形水果至少 6 種（夠出「長短」題）', d.longN);
    ok(errors.length === 0, '沒有 JS 錯誤', errors); await ctx.close(); }

  console.log('\n[F3] 題型：水果主題不出「看句子找人」「連鎖解碼」');
  { const { page, ctx } = await open(browser, '/index.html?theme=fruit'); await page.waitForSelector('.lvl');
    const p = await page.evaluate(() => JSON.stringify(E.POOL));
    ok(!/decode|chain/.test(p), '題型清單沒有 decode、chain', p);
    ok(JSON.parse(p)[1].length === 5 && JSON.parse(p)[2].length === 5 && JSON.parse(p)[3].length === 5, '每關 5 種題型');
    await ctx.close(); }

  console.log('\n[F4] 每關每種題型各出 40 回合：文字、正確答案、資料');
  { const { page, errors, ctx } = await open(browser, '/index.html?theme=fruit'); await page.waitForSelector('.lvl');
    const res = await page.evaluate(({ TYPES }) => {
      const T = window.THEME_PACK, byName = {}; T.items.forEach(p => byName[p.name] = p);
      const ztx = z => (z || []).map(t => t.blank ? '＿' : t.t).join('');
      const issues = [], cnt = {}; let total = 0, sw = 0, so = 0, diffs = 0, ndiffWeight = 0, es0 = 0, bad = /undefined|NaN|\[object|null/;
      const chk = (s, where) => { if(bad.test(String(s))) issues.push(where + ' 文字異常：' + s); };
      for(const lv of [1, 2, 3]) for(const type of TYPES[lv]) for(let r = 0; r < 40; r++){
        const qs = E.makeRound(lv, { lv, dims: [], types: [type], n: 3 });
        for(const q of qs){ total++; cnt[type] = (cnt[type] || 0) + 1;
          const tag = `L${lv} ${type} ${q.d.key}`;
          // 文字
          const parts = [];
          (q.sents || []).forEach(s => { parts.push(ztx(s.z), s.es, s.en); });
          if(q.blankZ) parts.push(ztx(q.blankZ));
          parts.push(ztx(q.q.z), q.q.es, q.q.en);
          (q.btns || []).forEach(b => { parts.push(ztx(b.z)); if(b.tr){ parts.push(b.tr.es, b.tr.en); } });
          if(q.full) parts.push(ztx(q.full.z), q.full.es, q.full.en);
          (q.expl || []).forEach(s => parts.push(ztx(s.z), s.es, s.en));
          parts.forEach(s => chk(s, tag));
          // 西／英語名稱要有冠詞；句中不能出現中文名稱
          const es = [...(q.sents || []), ...(q.expl || []), ...(q.btns || []).map(b => b.tr).filter(Boolean)].map(s => s.es + ' | ' + s.en);
          es.forEach(s => { if(/[一-鿿]/.test(s)) issues.push(tag + ' 西英文出現中文：' + s); });
          if(q.q.es && /quién/i.test(q.q.es)) issues.push(tag + ' 問句還是「quién」：' + q.q.es);
          if(q.q.en && /\bwho\b/i.test(q.q.en)) issues.push(tag + ' 問句還是「who」：' + q.q.en);
          if(/[誰]/.test(ztx(q.q.z))) issues.push(tag + ' 中文問句還有「誰」');
          // 正確答案只有一個
          if(q.btns){ const n = q.btns.filter(b => b.ok).length; if(n !== 1) issues.push(tag + ' 正確按鈕數=' + n); }
          else { const n = q.its.filter(p => p.id === q.ans).length; if(n !== 1) issues.push(tag + ' 正確卡片數=' + n); }
          if(q.its.length !== new Set(q.its.map(p => p.id)).size) issues.push(tag + ' 同一題有重複水果');
          // 同一題的項目數
          const want = { 1: [2, 2], 2: [2, 3], 3: [2, 4] }[lv]; if(q.its.length < want[0] || q.its.length > want[1] + (type === 'most' ? 0 : 0)) issues.push(tag + ' 項目數 ' + q.its.length);
          // 特徵／關卡
          if(q.d.lv > lv) issues.push(tag + ' 特徵關卡過高');
          // 甜／酸規則：同一題裡任兩個項目，等級至少差 2（1 對 3）；不會出現「都很甜／都很酸」
          if(q.d.key === 'sweet' || q.d.key === 'sour'){ const k = q.d.key; if(k === 'sweet') sw++; else so++;
            const clearPairs = [];
            for(let i = 0; i < q.its.length; i++) for(let j = i + 1; j < q.its.length; j++){ const a = q.its[i][k], b = q.its[j][k]; if(Math.abs(a - b) >= 2) clearPairs.push([a, b]); }
            if(q.its.length === 2 && !clearPairs.length) issues.push(tag + ' 兩個項目甜／酸沒差 2 級：' + q.its.map(p => p.name + p[k]));
            if(q.its.length === 2 && q.its.every(p => p[k] === 3)) issues.push(tag + ' 兩個都很' + k);
            if(q.its.length === 2 && (type === 'tf' || type === 'fill')){ /* 句子比的兩個必須一個 1 一個 3 */ const a = q.its[0][k], b = q.its[1][k]; if(Math.abs(a - b) !== 2) issues.push(tag + ' 比的兩個不是 1 對 3：' + q.its.map(p => p.name + p[k])); } }
          // 長短題只用長形水果
          if(q.d.key === 'long' && q.its.some(p => !(p.long > 0))) issues.push(tag + ' 長短題出現不是長形的水果：' + q.its.map(p => p.name));
          // 重量沒有「N 公克」差距句
          const all = parts.join(' ');
          if(q.d.key === 'weight' && /公克|\bg\b/.test(all)) ndiffWeight++;
          if(/\d+ cm/.test(all)) diffs++;
          // tf：BI／MEI／ABOUT 的真假對照資料
          if(type === 'tf' && q.sents){ const names = q.sents[0].z.filter(t => t.nm).map(t => byName[t.t]); const [a, b] = names; const d = q.d; const x = d.v(a) - d.v(b);
            let exp = null; if(q.f === 'BI') exp = Math.sign(x) === q.pol; else if(q.f === 'MEI') exp = Math.sign(x) === -q.pol; else if(q.f === 'ABOUT') exp = Math.abs(x) <= d.near;
            if(exp !== null && exp !== q.tv) issues.push(tag + ` 對錯與資料不符 ${q.f} ${a.name}/${b.name} tv=${q.tv} 資料=${exp}`); }
          // more／most：正確答案在資料上真的是那個方向最大
          if(type === 'more' || type === 'most'){ const d = q.d, sc = p => d.v(p) * q.pol, ans = q.its.find(p => p.id === q.ans);
            if(!q.its.every(p => p === ans || sc(ans) > sc(p))) issues.push(tag + ' 答案不是最' + (q.pol > 0 ? '大' : '小') + '：' + q.its.map(p => p.name + d.v(p)) + ' 答=' + ans.name); }
          // whobi／biwho：答案與其他人比；只確認答案在資料上和另一個有明確方向
          if(type === 'whobi' || type === 'biwho'){ const d = q.d, ans = q.its.find(p => p.id === q.ans); const tn = q.q.z.filter(t => t.nm).map(t => byName[t.t])[0];
            if(tn){ const x = (d.v(ans) - d.v(tn)) * q.pol; if(type === 'whobi' && !(x > 0)) issues.push(tag + ' whobi 答案沒有比目標更…'); if(type === 'biwho' && !(x < 0)) issues.push(tag + ' biwho 答案不是目標比不過的'); } }
        } }
      return { total, cnt, issues: issues.slice(0, 15), nIssues: issues.length, sw, so, diffs, ndiffWeight };
    }, { TYPES });
    ok(res.total > 1000, '共檢查 ' + res.total + ' 題', res.total);
    ok(res.nIssues === 0, '沒有任何異常（文字、答案唯一、甜酸規則、資料對照）', res.issues);
    ok(res.sw > 20 && res.so > 20, `甜、酸題都有出現（甜 ${res.sw}、酸 ${res.so}）`);
    ok(res.diffs > 0, '有出現「N cm」具體差距題', res.diffs);
    ok(res.ndiffWeight === 0, '重量題沒有「N 公克」差距句', res.ndiffWeight);
    ok(errors.length === 0, '沒有 JS 錯誤', errors); await ctx.close(); }

  console.log('\n[F5] 一般模式（隨機三種題型）每關各 30 回合都出得滿 10 題');
  { const { page, ctx } = await open(browser, '/index.html?theme=fruit'); await page.waitForSelector('.lvl');
    const r = await page.evaluate(() => { const short = []; for(const lv of [1, 2, 3]) for(let i = 0; i < 30; i++){ const n = E.makeRound(lv, null).length; if(n !== 10) short.push([lv, n]); } return short; });
    ok(r.length === 0, '每回合 10 題', r); await ctx.close(); }

  console.log('\n[F6] 卡片圖：大小題用真實比例、其他題每張一樣大');
  { const { page, ctx } = await open(browser, '/index.html?theme=fruit'); await page.waitForSelector('.lvl');
    // 西瓜 vs 櫻桃（大小題）：圖要有明顯大小差；香蕉（長形）圖是橫的
    await page.evaluate(() => { const T = window.THEME_PACK, g = id => T.items.find(p => p.id === id);
      S = { lv: 1, qs: [{ type: 'more', d: E.DIMS.size, its: [g('watermelon'), g('cherry'), g('banana')], crop: 'full', q: { z: [], es: '', en: '' }, ans: 'watermelon', pol: 1 }], i: 0, score: 0, tries: 0, done: false, wrong: [], picks: [], rep: null, dict: false, log: [], rg: null };
      screen = 'game'; renderQ(); });
    const sz = await page.evaluate(() => [...document.querySelectorAll('.card .fig img')].map(i => [i.style.width, i.style.height].map(parseFloat)));
    ok(sz.length === 3, '三張卡片都有圖', sz);
    const [wm, ch, bn] = sz;
    ok(wm[0] / ch[0] > 2.5, `西瓜明顯比櫻桃大（寬 ${wm[0]} vs ${ch[0]}）`);
    ok(Math.abs(bn[0] / bn[1] - 249 / 245) < 0.06, '香蕉圖維持原本的長寬比', bn);
    ok(Math.max(...bn) / Math.max(...wm) > 0.6 && Math.max(...bn) / Math.max(...wm) < 0.85, '香蕉（20 公分）約是西瓜（27 公分）的 0.74 倍', [bn, wm]);
    ok(Math.max(...sz.map(s => Math.max(s[0], s[1]))) <= 130, '最大的圖不超過卡片寬度', sz);
    // 重量題：每張圖放進一樣大的方框
    await page.evaluate(() => { const T = window.THEME_PACK, g = id => T.items.find(p => p.id === id);
      S.qs = [{ type: 'more', d: E.DIMS.weight, its: [g('watermelon'), g('cherry')], crop: 'item', q: { z: [], es: '', en: '' }, ans: 'watermelon', pol: 1 }]; S.i = 0; renderQ(); });
    const bx = await page.evaluate(() => [...document.querySelectorAll('.card .crop')].map(c => { const r = c.getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)]; }));
    ok(bx.length === 2 && bx[0][0] === bx[1][0] && bx[0][1] === bx[1][1], '重量題：西瓜和櫻桃的圖框一樣大', bx);
    await ctx.close(); }

  console.log('\n[F7] 每種題型用滑鼠答對、答錯');
  for(const lv of [1, 2, 3]) for(const type of TYPES[lv]){
    const { page, errors, ctx } = await open(browser, '/index.html?theme=fruit'); await page.waitForSelector('.lvl');
    await page.evaluate(([lv, type]) => startRound(lv, { lv, dims: [], types: [type], n: 3 }), [lv, type]);
    const info = () => page.evaluate(() => { const q = S.qs[S.i], btn = !!q.btns, n = btn ? q.btns.length : q.its.length;
      const ci = btn ? q.btns.findIndex(b => b.ok) : q.its.findIndex(p => p.id === q.ans); return { type: q.type, btn, n, ci, i: S.i, score: S.score }; });
    const sel = (btn, i) => btn ? `.ob[data-b="${i}"]` : `.card[data-i="${i}"]`;
    let q = await info(); ok(q.type === type, `L${lv} ${type}：開出來的是這個題型`, q.type);
    await page.locator(sel(q.btn, q.ci)).click(); await page.waitForTimeout(80);
    let s = await page.evaluate(() => ({ done: S.done, score: S.score })); ok(s.done && s.score === 10, `L${lv} ${type}：答對 +10`, s);
    const fb = await page.locator('#fb').innerText(); ok(fb.length > 0 && !/undefined|NaN/.test(fb), `L${lv} ${type}：答對說明有字且沒有 undefined`, fb.slice(0, 60));
    await page.locator('#fb button, .nextbtn, button.next').first().click().catch(() => {}); await page.waitForTimeout(80);
    q = await info(); if(q.i === 1 || true){
      const wrong = [...Array(q.n).keys()].find(j => j !== q.ci);
      await page.locator(sel(q.btn, wrong)).click(); await page.waitForTimeout(80);
      const w = await page.evaluate(() => ({ tries: S.tries, done: S.done })); ok(w.tries === 1 && (q.n <= 2 ? w.done : !w.done), `L${lv} ${type}：答錯一次（${q.n} 個選項）${q.n <= 2 ? '只有兩個選項，直接結束' : '還可以再答'}`, w); }
    ok(errors.length === 0, `L${lv} ${type}：沒有 JS 錯誤`, errors); await ctx.close(); }

  console.log('\n[F8] 語言／拼音／簡體設定');
  for(const [lang, cfg] of [['es', { lang: 'es', phon: 'pinyin' }], ['en', { lang: 'en', phon: 'zhuyin' }], ['zh', { lang: 'zh', phon: 'both', simp: 1 }]]){
    const { page, errors, ctx } = await open(browser, '/index.html?theme=fruit', { ls: { 'hanziGames.settings': JSON.stringify(Object.assign({ script: cfg.simp ? 'simp' : 'trad' }, cfg)) } });
    await page.waitForSelector('.lvl');
    await page.evaluate(() => startRound(2, { lv: 2, dims: ['size'], types: ['pick'], n: 3 }));
    const html = await page.locator('#app').innerHTML();
    ok(!/undefined|NaN/.test(html), `${lang}：畫面沒有 undefined／NaN`);
    ok(/class="nm"/.test(html), `${lang}：水果名稱用名稱樣式顯示`);
    if(cfg.phon === 'pinyin' || cfg.phon === 'both') ok(/<span class="ph">[^<]*[āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ][^<]*<\/span>/.test(html), `${lang}：水果名稱上方有拼音`);
    if(cfg.phon === 'zhuyin') ok(/class="ph zy">[^<&]+<\/span><span class="hz"><span class="nm">/.test(html), `${lang}：水果名稱上方有注音`);
    if(lang === 'es' || lang === 'en'){   // 答完才會顯示整句翻譯：要有冠詞，不能有中文
      await page.evaluate(() => { const q = S.qs[S.i]; q.btns ? pickBtn(q.btns.findIndex(b => b.ok)) : pickCard(q.its.findIndex(p => p.id === q.ans)); });
      const fb = await page.locator('#fb').innerText();
      ok(lang === 'es' ? /\b(La|El) [a-záéíóúñ ]+ (es|no es) .*\b(la|el) [a-záéíóúñ ]+/i.test(fb) : /\bThe [a-z ]+ (is|is not) .*\bthe [a-z ]+/i.test(fb), `${lang}：答完的翻譯有冠詞`, fb.slice(0, 200)); }
    if(lang === 'zh') ok(!/[蘋檸鳳蓮龍櫻藍]/.test(await page.locator('.cards').innerText()), 'zh+簡體：卡片名稱是簡體', await page.locator('.cards').innerText());
    ok(errors.length === 0, `${lang}：沒有 JS 錯誤`, errors); await ctx.close(); }

  console.log('\n[F9] 老師管理中心學習單（worksheet.js）也吃得到水果主題');
  { const { page, errors, ctx } = await open(browser, '/index.html?theme=fruit'); await page.waitForSelector('.lvl');
    const r = await page.evaluate(() => { try{ const qs = E.makeRound(2, { lv: 2, dims: [], types: [], n: 10 }); return { n: qs.length, html: qs.map(q => q.its.map(p => E.cropHtml(p, q, { base: '', height: 150 })).join('') + E.tagHtml(q.its[0], q, false)).join('').length }; }catch(e){ return { err: String(e) }; } });
    ok(!r.err && r.n === 10 && r.html > 1000, '老師範圍（全部題型）出 10 題、卡片圖組得出來', r); ok(errors.length === 0, '沒有 JS 錯誤', errors); await ctx.close(); }

  await browser.close(); server.close();
  console.log(`\n水果主題測試：${pass} 通過、${fail} 失敗`); process.exit(fail ? 1 : 0);
});
