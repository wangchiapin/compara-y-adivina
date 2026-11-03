// 比比看 動物主題測試。用法：node tests/test_fruit.js
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

  console.log('\n[A1] 主題按鈕：動物目前上鎖，?theme=animal 可以玩');
  { const { page, errors, ctx } = await open(browser, '/index.html'); await page.waitForSelector('.lvl');
    ok(await page.locator('.thm .opt[data-th="animal"].lock').count() === 1, '動物按鈕目前上鎖');
    await ctx.close(); }
  { const { page, errors, ctx } = await open(browser, '/index.html?theme=animal'); await page.waitForSelector('.lvl');
    ok((await page.locator('.lvl .ppl').first().innerText()).includes('2 隻動物'), '難度按鈕寫「2 隻動物」', await page.locator('.lvl .ppl').first().innerText());
    ok((await page.locator('.lvl .ppl small').first().innerText()).includes('animales'), '西語寫 animales');
    ok(errors.length === 0, '沒有 JS 錯誤', errors); await ctx.close(); }

  console.log('\n[A2] 題庫資料與圖片');
  { const { page, errors, ctx } = await open(browser, '/index.html?theme=animal'); await page.waitForSelector('.lvl');
    const d = await page.evaluate(async () => { const T = window.THEME_PACK, bad = [], ids = new Set(); let sp = 0;
      for(const p of T.items){ ids.add(p.id);
        for(const k of ['id','name','py','es','en']) if(!p[k]) bad.push(p.id + ' 缺 ' + k);
        if(![0,1].includes(p.g)) bad.push(p.id + ' g');
        for(const k of ['size','kg','w','ih']) if(!(p[k] > 0)) bad.push(p.id + ' ' + k);
        if(p.speed !== undefined){ sp++; if(!(p.speed > 0)) bad.push(p.id + ' speed'); }
        const ok = await new Promise(r => { const i = new Image(); i.onload = () => r(i.naturalWidth === p.w && i.naturalHeight === p.ih); i.onerror = () => r(false); i.src = T.dir + p.id + '.webp'; });
        if(!ok) bad.push(p.id + ' 圖載不到或寬高不符'); }
      return { n: T.items.length, uniq: ids.size, bad, sp }; });
    ok(d.n === 99 && d.uniq === 99, '99 種動物、id 不重複', d);
    ok(d.bad.length === 0, '每種動物欄位齊全、圖載得到且寬高吻合', d.bad);
    ok(d.sp >= 90, '有速度資料的動物至少 90 種', d.sp);
    ok(errors.length === 0, '沒有 JS 錯誤', errors); await ctx.close(); }

  console.log('\n[A3] 題型：不出「看句子找人」「連鎖解碼」');
  { const { page, ctx } = await open(browser, '/index.html?theme=animal'); await page.waitForSelector('.lvl');
    const p = await page.evaluate(() => JSON.stringify(E.POOL));
    ok(!/decode|chain/.test(p), '題型清單沒有 decode、chain', p);
    ok([1, 2, 3].every(l => JSON.parse(p)[l].length === 5), '每關 5 種題型');
    await ctx.close(); }

  console.log('\n[A4] 每關每種題型各出 40 回合：文字、答案、資料、特徵關卡');
  { const { page, errors, ctx } = await open(browser, '/index.html?theme=animal'); await page.waitForSelector('.lvl');
    const res = await page.evaluate(({ TYPES }) => {
      const T = window.THEME_PACK, byName = {}; T.items.forEach(p => byName[p.name] = p);
      const ztx = z => (z || []).map(t => t.blank ? '＿' : t.t).join('');
      const issues = [], cnt = {}; let total = 0, bad = /undefined|NaN|\[object|null/;
      const chk = (s, where) => { if(bad.test(String(s))) issues.push(where + ' 文字異常：' + s); };
      for(const lv of [1, 2, 3]) for(const type of TYPES[lv]) for(let r = 0; r < 40; r++){
        const qs = E.makeRound(lv, { lv, dims: [], types: [type], n: 3 });
        for(const q of qs){ total++; const k = q.d.key; cnt[k] = (cnt[k] || 0) + 1; const tag = `L${lv} ${type} ${k}`;
          const parts = []; (q.sents || []).forEach(s => parts.push(ztx(s.z), s.es, s.en)); if(q.blankZ) parts.push(ztx(q.blankZ));
          parts.push(ztx(q.q.z), q.q.es, q.q.en); (q.btns || []).forEach(b => { parts.push(ztx(b.z)); if(b.tr) parts.push(b.tr.es, b.tr.en); });
          if(q.full) parts.push(ztx(q.full.z), q.full.es, q.full.en); (q.expl || []).forEach(s => parts.push(ztx(s.z), s.es, s.en));
          parts.forEach(s => chk(s, tag));
          const all = parts.join(' ');
          if(/\d/.test(all)) issues.push(tag + ' 出現數字（卡片不顯示數字，也不該有差距句）：' + all.slice(0, 80));
          const es = [...(q.sents || []), ...(q.expl || []), ...(q.btns || []).map(b => b.tr).filter(Boolean)].map(s => s.es + ' | ' + s.en);
          es.forEach(s => { if(/[一-鿿]/.test(s)) issues.push(tag + ' 西英文出現中文：' + s); });
          if(/quién/i.test(q.q.es || '') || /\bwho\b/i.test(q.q.en || '') || /誰/.test(ztx(q.q.z))) issues.push(tag + ' 問句還有「誰」');
          if(q.btns){ const n = q.btns.filter(b => b.ok).length; if(n !== 1) issues.push(tag + ' 正確按鈕數=' + n); }
          else { const n = q.its.filter(p => p.id === q.ans).length; if(n !== 1) issues.push(tag + ' 正確卡片數=' + n); }
          if(q.its.length !== new Set(q.its.map(p => p.id)).size) issues.push(tag + ' 同一題有重複動物');
          const want = { 1: [2, 2], 2: [2, 3], 3: [2, 4] }[lv]; if(q.its.length < want[0] || q.its.length > want[1]) issues.push(tag + ' 項目數 ' + q.its.length);
          if(q.d.lv > lv) issues.push(tag + ' 特徵關卡過高');
          if(k === 'speed' && lv === 1) issues.push(tag + ' 速度題出現在第 1 關');
          if(q.its.some(p => !Number.isFinite(q.d.v(p)))) issues.push(tag + ' 有動物沒有這項資料：' + q.its.map(p => p.name));
          if(type === 'tf' && q.sents){ const [a, b] = q.sents[0].z.filter(t => t.nm).map(t => byName[t.t]); const x = q.d.v(a) - q.d.v(b);
            let exp = null; if(q.f === 'BI') exp = Math.sign(x) === q.pol; else if(q.f === 'MEI') exp = Math.sign(x) === -q.pol; else if(q.f === 'ABOUT') exp = Math.abs(x) <= q.d.near;
            if(exp !== null && exp !== q.tv) issues.push(tag + ` 對錯與資料不符 ${q.f} ${a.name}/${b.name}`); }
          if(type === 'more' || type === 'most'){ const sc = p => q.d.v(p) * q.pol, a = q.its.find(p => p.id === q.ans);
            if(!q.its.every(p => p === a || sc(a) > sc(p))) issues.push(tag + ' 答案不是最大／小：' + q.its.map(p => p.name)); }
          if(type === 'whobi' || type === 'biwho'){ const ans = q.its.find(p => p.id === q.ans); const tn = q.q.z.filter(t => t.nm).map(t => byName[t.t])[0];
            if(tn){ const x = (q.d.v(ans) - q.d.v(tn)) * q.pol; if(type === 'whobi' && !(x > 0)) issues.push(tag + ' whobi 答案沒有比目標更…'); if(type === 'biwho' && !(x < 0)) issues.push(tag + ' biwho 答案不是目標比不過的'); } }
        } }
      return { total, cnt, issues: issues.slice(0, 15), n: issues.length };
    }, { TYPES });
    ok(res.total > 1000, '共檢查 ' + res.total + ' 題', res.total);
    ok(res.n === 0, '沒有任何異常（文字、答案唯一、資料對照、速度只在第 2 關起）', res.issues);
    ok(res.cnt.size > 50 && res.cnt.weight > 50 && res.cnt.speed > 50, '大小、重量、速度題都有出', res.cnt);
    ok(errors.length === 0, '沒有 JS 錯誤', errors); await ctx.close(); }

  console.log('\n[A5] 一般模式每關各 30 回合都出得滿 10 題');
  { const { page, ctx } = await open(browser, '/index.html?theme=animal'); await page.waitForSelector('.lvl');
    const r = await page.evaluate(() => { const short = []; for(const lv of [1, 2, 3]) for(let i = 0; i < 30; i++){ const n = E.makeRound(lv, null).length; if(n !== 10) short.push([lv, n]); } return short; });
    ok(r.length === 0, '每回合 10 題', r); await ctx.close(); }

  console.log('\n[A6] 卡片圖：大小題壓縮比例（大象明顯比螞蟻大、螞蟻還看得到）、其他題每張一樣大');
  { const { page, ctx } = await open(browser, '/index.html?theme=animal'); await page.waitForSelector('.lvl');
    await page.evaluate(() => { const T = window.THEME_PACK, g = id => T.items.find(p => p.id === id);
      S = { lv: 1, qs: [{ type: 'more', d: E.DIMS.size, its: [g('elephant'), g('ant')], crop: 'full', q: { z: [], es: '', en: '' }, ans: 'elephant', pol: 1 }], i: 0, score: 0, tries: 0, done: false, wrong: [], picks: [], rep: null, dict: false, log: [], rg: null };
      screen = 'game'; renderQ(); });
    const sz = await page.evaluate(() => [...document.querySelectorAll('.card .fig img')].map(i => [i.style.width, i.style.height].map(parseFloat)));
    ok(sz.length === 2, '兩張卡片都有圖', sz);
    const [el, an] = sz, big = a => Math.max(...a);
    ok(big(el) / big(an) > 3 && big(an) >= 8, `大象明顯比螞蟻大、螞蟻還看得到（${big(el)} vs ${big(an)} px）`, sz);
    ok(big(el) <= 130, '最大的圖不超過卡片寬度', sz);
    await page.evaluate(() => { const T = window.THEME_PACK, g = id => T.items.find(p => p.id === id);
      S.qs = [{ type: 'more', d: E.DIMS.weight, its: [g('elephant'), g('ant')], crop: 'item', q: { z: [], es: '', en: '' }, ans: 'elephant', pol: 1 }]; S.i = 0; renderQ(); });
    const bx = await page.evaluate(() => [...document.querySelectorAll('.card .crop')].map(c => { const r = c.getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)]; }));
    ok(bx.length === 2 && bx[0][0] === bx[1][0] && bx[0][1] === bx[1][1], '重量題：大象和螞蟻的圖框一樣大', bx);
    await ctx.close(); }

  console.log('\n[A7] 每種題型用滑鼠答對、答錯');
  for(const lv of [1, 2, 3]) for(const type of TYPES[lv]){
    const { page, errors, ctx } = await open(browser, '/index.html?theme=animal'); await page.waitForSelector('.lvl');
    await page.evaluate(([lv, type]) => startRound(lv, { lv, dims: [], types: [type], n: 3 }), [lv, type]);
    const info = () => page.evaluate(() => { const q = S.qs[S.i], btn = !!q.btns, n = btn ? q.btns.length : q.its.length;
      const ci = btn ? q.btns.findIndex(b => b.ok) : q.its.findIndex(p => p.id === q.ans); return { type: q.type, btn, n, ci, i: S.i }; });
    const sel = (btn, i) => btn ? `.ob[data-b="${i}"]` : `.card[data-i="${i}"]`;
    let q = await info(); ok(q.type === type, `L${lv} ${type}：開出來的是這個題型`, q.type);
    await page.locator(sel(q.btn, q.ci)).click(); await page.waitForTimeout(80);
    let s = await page.evaluate(() => ({ done: S.done, score: S.score })); ok(s.done && s.score === 10, `L${lv} ${type}：答對 +10`, s);
    const fb = await page.locator('#fb').innerText(); ok(fb.length > 0 && !/undefined|NaN/.test(fb), `L${lv} ${type}：答對說明有字且沒有 undefined`, fb.slice(0, 60));
    await page.locator('#fb button, .nextbtn, button.next').first().click().catch(() => {}); await page.waitForTimeout(80);
    q = await info();
    const wrong = [...Array(q.n).keys()].find(j => j !== q.ci);
    await page.locator(sel(q.btn, wrong)).click(); await page.waitForTimeout(80);
    const w = await page.evaluate(() => ({ tries: S.tries, done: S.done })); ok(w.tries === 1 && (q.n <= 2 ? w.done : !w.done), `L${lv} ${type}：答錯一次（${q.n} 個選項）`, w);
    ok(errors.length === 0, `L${lv} ${type}：沒有 JS 錯誤`, errors); await ctx.close(); }

  console.log('\n[A8] 語言／拼音／簡體設定');
  for(const [lang, cfg] of [['es', { lang: 'es', phon: 'pinyin' }], ['en', { lang: 'en', phon: 'zhuyin' }], ['zh', { lang: 'zh', phon: 'both', simp: 1 }]]){
    const { page, errors, ctx } = await open(browser, '/index.html?theme=animal', { ls: { 'hanziGames.settings': JSON.stringify(Object.assign({ script: cfg.simp ? 'simp' : 'trad' }, cfg)) } });
    await page.waitForSelector('.lvl');
    await page.evaluate(() => startRound(2, { lv: 2, dims: ['size'], types: ['pick'], n: 3 }));
    const html = await page.locator('#app').innerHTML();
    ok(!/undefined|NaN/.test(html), `${lang}：畫面沒有 undefined／NaN`);
    ok(/class="nm"/.test(html), `${lang}：動物名稱用名稱樣式顯示`);
    if(cfg.phon === 'pinyin' || cfg.phon === 'both') ok(/<span class="ph">[^<]*[āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ][^<]*<\/span>/.test(html), `${lang}：動物名稱上方有拼音`);
    if(lang === 'es' || lang === 'en'){
      await page.evaluate(() => { const q = S.qs[S.i]; q.btns ? pickBtn(q.btns.findIndex(b => b.ok)) : pickCard(q.its.findIndex(p => p.id === q.ans)); });
      const fb = await page.locator('#fb').innerText();
      ok(lang === 'es' ? /\b(La|El) [a-záéíóúñ ]+ (es|no es) .*\b(la|el) [a-záéíóúñ ]+/i.test(fb) : /\bThe [a-z ]+ (is|is not) .*\bthe [a-z ]+/i.test(fb), `${lang}：答完的翻譯有冠詞`, fb.slice(0, 200)); }
    if(lang === 'zh') ok(!/[鷹鵝鴿雞鴕鳥龜驢駝鯨鯊鱷蝦蟻蝟蟲蠅蝸蠍鮭鸚鵡獵豬貓獅馬倉獺變龍賊魚駱頸螢鴨]/.test(await page.locator('.cards').innerText()), 'zh+簡體：卡片名稱是簡體', await page.locator('.cards').innerText());
    ok(errors.length === 0, `${lang}：沒有 JS 錯誤`, errors); await ctx.close(); }

  console.log('\n[A9] 西班牙文冠詞與形容詞陰陽性（el águila 用陰性形容詞）');
  { const { page, ctx } = await open(browser, '/index.html?theme=animal'); await page.waitForSelector('.lvl');
    const r = await page.evaluate(() => { const T = window.THEME_PACK, g = id => T.items.find(p => p.id === id);
      return [T.nm(g('eagle'), 'es'), T.nm(g('eagle'), 'es', true), T.nm(g('cow'), 'es'), T.nm(g('dog'), 'en', true), T.nm(g('seaturtle'), 'es'), T.nm(g('waterbuffalo'), 'en')]; });
    ok(r[0] === 'el águila' && r[1] === 'El águila' && r[2] === 'la vaca' && r[3] === 'The dog' && r[4] === 'la tortuga marina' && r[5] === 'the water buffalo', '名稱加冠詞正確', r);
    await ctx.close(); }

  await browser.close(); server.close();
  console.log(`\n動物主題測試：${pass} 通過、${fail} 失敗`); process.exit(fail ? 1 : 0);
});
