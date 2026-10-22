// 比比看 遊戲測試（Playwright + 模擬 Firebase）。用法：node tests/test_game.js [輸出截圖資料夾]
// 內容：共用設定（⚙️、舊設定搬家）、雙行介面、拼音／注音、膠囊按鈕、結果畫面、老師入口、
//       出題引擎（engine.js）、學習單（worksheet.js）、班級連結回傳、老師範圍碼 ?r=、舊格式連結。
let chromium; try{ ({ chromium } = require('playwright')); }catch(e){ ({ chromium } = require('/opt/npm-tools/node_modules/playwright')); }
const fs = require('fs'), path = require('path'), http = require('http');
const ROOT = path.join(__dirname, '..');
const MOCK = fs.readFileSync(path.join(__dirname, 'firebase-mock.js'), 'utf8');
const SHOT = process.argv[2] || null;
if(SHOT) fs.mkdirSync(SHOT, { recursive: true });
let pass = 0, fail = 0;
function ok(c, name, extra){ if(c){ pass++; console.log('  ✓', name); } else { fail++; console.log('  ✗', name, extra !== undefined ? '→ ' + JSON.stringify(extra) : ''); } }
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.webp': 'image/webp' };
const server = http.createServer((req, res) => {
  let f = path.normalize(path.join(ROOT, decodeURIComponent(req.url.split('?')[0])));
  if(!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()){ res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
});
const CID = 'class0000aaaa';
const RS = 'rng000011112';
const SK = 'hanziGames.settings';
function seed({ expired = false } = {}){
  return { 'subscription-48d3c': {
    classes: { [CID]: { owner: 'u1', slot: 0, name: '週三班', showBoard: false, updatedAt: 1 } },
    teacher_classes: { u1: { slots: { '0': CID }, updatedAt: 1 } },
    site_plans: { u1: { plan: 'year', expiresAt: Date.now() + (expired ? -1 : 1) * 30 * 86400000 } }, class_plays: {},
    shared_bbk: { [RS]: { owner: 'u1', name: '身高和年齡', th: 'people', lv: 2, d: ['height', 'age'], t: ['pick', 'decode'], n: 5, updatedAt: 1 } } } };
}
async function open(browser, url, { seedOpt, ls = {} } = {}){
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage(); const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('dialog', d => d.accept());
  await page.route('**/*', r => r.request().url().startsWith('http://localhost') ? r.continue() : r.abort());
  await page.addInitScript(`window.__SEED=${JSON.stringify(seed(seedOpt))};window.__USER=null;` +
    Object.entries(ls).map(([k, v]) => `localStorage.setItem(${JSON.stringify(k)},${JSON.stringify(v)});`).join(''));
  await page.addInitScript(MOCK);
  await page.goto(BASE + url);
  return { page, errors, ctx };
}
// 玩完一整回合：奇數題先點錯一次；all = true 全部第一次就答對
async function playRound(page, all = false){
  const n = await page.evaluate(() => S.qs.length);
  for(let i = 0; i < n; i++){
    await page.evaluate(([i, all]) => { const q = S.qs[S.i];
      const ci = q.btns ? q.btns.findIndex(b => b.ok) : q.its.findIndex(p => p.id === q.ans);
      const wi = (q.btns ? q.btns : q.its).findIndex((_, j) => j !== ci);
      if(!all && i % 2 === 1) q.btns ? pickBtn(wi) : pickCard(wi);
      if(!S.done) q.btns ? pickBtn(ci) : pickCard(ci); }, [i, all]);
    await page.evaluate(() => nextQ());
  }
  return n;
}
const db = page => page.evaluate(() => window.__DB['subscription-48d3c']);
const LSget = (page, k) => page.evaluate(k => JSON.parse(localStorage.getItem(k) || 'null'), k);
const shot = async (page, name, full = true) => { if(SHOT) await page.screenshot({ path: path.join(SHOT, name + '.png'), fullPage: full }); };
let BASE;
server.listen(0, 'localhost', async () => {
  BASE = 'http://localhost:' + server.address().port;
  const browser = await chromium.launch();

  console.log('\n[A] 主選單：一般模式');
  { const { page, errors, ctx } = await open(browser, '/index.html');
    await page.waitForSelector('.lvl');
    ok(await page.evaluate(() => !window.__apps), '一般模式不載入 Firebase');
    const a = await page.$('a.big[href="https://wangchiapin.github.io/profesor/#/home"]');
    ok(!!a && (await a.textContent()).includes('老師管理中心'), '有「👩‍🏫 老師管理中心」按鈕，連到中心的遊戲設定頁');
    ok(!(await page.textContent('#app')).includes('老師設定') && !(await page.textContent('#app')).includes('班級成績簿'), '遊戲裡沒有舊的老師區');
    ok((await page.textContent('.ver')) === 'v6-10', '最下面有版本號 v6-10');
    // 步驟 6-4：主題
    const th = await page.$$eval('.thm .opt', b => b.map(x => [x.dataset.th, x.classList.contains('on'), x.classList.contains('lock'), x.innerText.replace(/\s+/g, ' ').trim()]));
    ok(JSON.stringify(th.map(x => x[0])) === JSON.stringify(['people', 'fruit', 'animal', 'action']) && th[0][1] && !th[0][2] && th.slice(1).every(x => x[2] && x[3].includes('陸續開放')),
      '主題：人物已選；水果、動物、動作上鎖「陸續開放」', th);
    ok(th[0][3].includes('人物') && th[0][3].includes('Personas') && th[1][3].includes('水果'), '主題按鈕：中文＋西文', th);
    await page.click('.thm [data-th=fruit]'); await page.waitForSelector('.thnote');
    ok((await page.textContent('.thnote')).includes('陸續開放') && (await page.textContent('.thnote')).includes('Próximamente') && !!(await page.$('.thm [data-th=people].on')), '點上鎖的主題：出現「陸續開放」，主題不變');
    const order = await page.$$eval('#app h3', h => h.map(x => x.textContent));
    ok(order[0].startsWith('主題') && order[1].startsWith('選擇難度'), '主題在選擇難度上面', order);
    const g = await page.$eval('.gear', e => { const r = e.getBoundingClientRect(); return { x: r.right, y: r.top }; });
    ok(g.x > 340 && g.y < 30, '⚙️ 在右上角', g);
    await shot(page, 'a_menu');
    ok(errors.length === 0, '沒有頁面錯誤', errors); await ctx.close(); }

  console.log('\n[A2] 6-4 討論第 1 批：主觀特徵只出差很多的、題型名稱');
  { const { page, errors, ctx } = await open(browser, '/index.html');
    await page.waitForSelector('.lvl');
    const r = await page.evaluate(() => {
      const P = window.THEME_PACK, D = P.dims, bad = [];
      for(let k = 0; k < 400; k++) for(const lv of [1, 2, 3]) for(const q of E.makeRound(lv, null)){
        if(['build', 'muscle', 'tex'].indexOf(q.d.key) < 0 || q.type === 'decode' || q.type === 'chain') continue;
        const vs = q.its.map(p => D[q.d.key].v(p));
        if(q.type === 'more' && Math.abs(vs[0] - vs[1]) === 1) bad.push([q.type, q.d.key, vs]);
      }
      return { bad: bad.slice(0, 5), thr: ['build', 'muscle', 'tex'].map(k => D[k].thr) };
    });
    ok(r.thr.join() === '2,2,2' && r.bad.length === 0, '胖瘦、壯不壯、髮質：只有差很多（1 對 3）才出題', r);
    const tn = await page.evaluate(() => [E.TN.more[0], E.TN.whobi[0], E.TN.biwho[0], E.TN.most[0], E.TN.fill[0]]);
    ok(JSON.stringify(tn) === JSON.stringify(['選人：誰比較＿？', '選人：誰比 A ＿？', '選人：A 比誰＿？', '選人：誰最＿？', '選比較詞']), '題型名稱改成空格寫法', tn);
    ok(errors.length === 0, '沒有頁面錯誤', errors); await ctx.close(); }

  console.log('\n[A3] 第 2 批：選比較詞');
  { const { page, errors, ctx } = await open(browser, '/index.html');
    await page.waitForSelector('.lvl');
    const r = await page.evaluate(() => {
      const out = { 1: {}, 2: {}, 3: {} }, bad = [];
      const BAN = [['更', '還'], ['一樣', '差不多'], ['比', '比較']];
      for(const lv of [1, 2, 3]) for(let k = 0; k < 300; k++) for(const q of E.makeRound(lv, { dims: [], types: ['fill'], n: 5 })){
        const ws = q.btns.map(b => b.w), oks = q.btns.filter(b => b.ok).length;
        out[lv][q.f + ':' + ws.join('/')] = 1;
        if(oks !== 1 || BAN.some(([x, y]) => ws.includes(x) && ws.includes(y))) bad.push([lv, ws]);
        const filled = q.blankZ.map(t => t.blank ? q.fillAns : t.t).join(''), full = q.full.z.map(t => t.t).join('');
        if(filled !== full) bad.push([lv, filled, full]);
      }
      return { out: Object.fromEntries(Object.entries(out).map(([k, v]) => [k, Object.keys(v).sort()])), bad: bad.slice(0, 5), pool: [1, 2, 3].map(l => E.POOL[l].includes('fill')) };
    });
    ok(r.pool.join() === 'true,true,true', '三關都有「選比較詞」', r.pool);
    ok(JSON.stringify(r.out[1]) === JSON.stringify(['BI:比/跟/很', 'SAME:比/跟/很']), '第 1 關：比／跟／很（A＿B高、A＿B一樣高）', r.out[1]);
    ok(r.out[2].includes('MEI:比/跟/沒有') && r.out[2].some(x => x.startsWith('DEG:一點/很多/很')) && !r.out[2].some(x => x.includes('一樣/') && x.startsWith('DEG')), '第 2 關：比／跟／沒有；一點／很多／很', r.out[2]);
    ok(r.out[3].includes('MOST:最/更/比') && r.out[3].some(x => /^GENG:(更|還)\/很\/最$/.test(x)), '第 3 關：更或還／很／最；最／更／比', r.out[3]);
    ok(r.bad.length === 0, '每題只有一個對的選項；更＋還、一樣＋差不多、比＋比較不會同時出現；填好的句子 = 解答句', r.bad);
    ok(errors.length === 0, '沒有頁面錯誤', errors); await ctx.close(); }

  console.log('\n[A4] 第 3 批：選形容詞');
  { const { page, errors, ctx } = await open(browser, '/index.html');
    await page.waitForSelector('.lvl');
    const r = await page.evaluate(() => {
      const D = window.THEME_PACK.dims, ALLOW = ['height', 'age', 'build', 'eyes', 'nose', 'hair'], seen = {}, bad = [];
      for(const lv of [1, 2]) for(let k = 0; k < 300; k++) for(const q of E.makeRound(lv, { dims: [], types: ['adj'], n: 5 })){
        if(q.type !== 'adj'){ bad.push(['type', q.type]); continue; }
        const [a, b] = q.its; seen[lv + q.f] = 1;
        if(!ALLOW.includes(q.d.key)) bad.push(['dim', q.d.key]);
        if(q.btns.length !== (q.d.poss ? 2 : 3)) bad.push(['n', q.d.key, q.btns.length]);
        // 每個選項放進句子：只有正確的那個為真；年齡的大／小只會是答案，不會當干擾項
        let trues = 0;
        for(const bt of q.btns){ let t = false;
          for(const dk of ALLOW){ const d = D[dk]; if(!!d.poss !== !!q.d.poss || (d.poss && dk !== q.d.key)) continue;
            for(const pol of [1, -1]){ const A = pol > 0 ? d.pos : d.neg; if(!A || A.z !== bt.w) continue;
              if(Math.sign(d.v(a) - d.v(b)) === (q.f === 'MEI' ? -pol : pol)) t = true; } }
          if(t) trues++; if(t !== bt.ok) bad.push(['opt', q.f, q.d.key, a.name, b.name, bt.w]);
          if(!bt.ok && q.d.key !== 'age' && ['大', '小'].includes(bt.w) && !q.d.poss) bad.push(['ageDistractor', q.d.key, bt.w]); }
        if(trues !== 1) bad.push(['trues', trues]);
        if(q.blankZ.map(t => t.blank ? q.fillAns : t.t).join('') !== q.full.z.map(t => t.t).join('')) bad.push(['full']);
      }
      return { seen: Object.keys(seen).sort(), bad: bad.slice(0, 5), pool: [E.POOL[1].includes('adj'), E.POOL[2].includes('adj'), E.POOL[3].includes('adj')], tn: E.TN.adj };
    });
    ok(r.pool.join() === 'true,true,false', '第 1、2 關有「選形容詞」，第 3 關沒有', r.pool);
    ok(r.tn.join() === '選形容詞,Elige el adjetivo,Pick the adjective', '題型名稱', r.tn);
    ok(JSON.stringify(r.seen) === JSON.stringify(['1BI', '2BI', '2MEI']), '第 1 關：A 比 B ＿＿；第 2 關再加：A 沒有 B 那麼＿＿', r.seen);
    ok(r.bad.length === 0, '只用身高／年齡／胖瘦／眼睛／鼻子／頭髮長短；身體部位 2 個選項、其他 3 個；每題只有一個對；年齡的大小不當干擾項', r.bad);
    const none = await page.evaluate(() => E.makeRound(2, { dims: ['skin', 'tex', 'muscle'], types: ['adj'], n: 5 }).filter(q => q.type === 'adj').length);
    ok(none === 0, '只勾膚色／髮質／壯不壯：不會出「選形容詞」', none);
    ok(errors.length === 0, '沒有頁面錯誤', errors); await ctx.close(); }

  console.log('\n[B] 共用設定：第一次、舊設定搬家、保留別款的欄位');
  { const { page, ctx } = await open(browser, '/index.html');
    await page.waitForSelector('.lvl');
    const s = await LSget(page, SK);
    ok(s && s.v === 1 && s.script === 'trad' && s.lang === 'es' && s.phon === 'pinyin' && s.rate === 'normal', '第一次：寫入預設（繁體、中＋西、拼音）', s);
    await ctx.close(); }
  { const { page, ctx } = await open(browser, '/index.html', { ls: { bbk_cfg: JSON.stringify({ simp: true, help: 'none', py: false }) } });
    await page.waitForSelector('.lvl');
    const s = await LSget(page, SK);
    ok(s.script === 'simp' && s.lang === 'zh' && s.phon === 'off', '從比比看舊設定搬過來（簡體、只有中文、拼音關）', s);
    ok((await page.textContent('.thm + h3')).includes('选择难度') && !(await page.textContent('#app')).includes('Elige'), '畫面跟著變成簡體、只有中文');
    await ctx.close(); }
  { const { page, ctx } = await open(browser, '/index.html', { ls: { bbk_cfg: JSON.stringify({ simp: false, help: 'en', py: true }) } });
    await page.waitForSelector('.lvl');
    const s = await LSget(page, SK);
    ok(s.lang === 'en' && s.phon === 'pinyin', '舊設定：英文、拼音開', s);
    await ctx.close(); }
  { const { page, ctx } = await open(browser, '/index.html', { ls: { [SK]: JSON.stringify({ v: 1, script: 'trad', lang: 'en', phon: 'zhuyin', rate: 'fast', extra: 1 }), bbk_cfg: JSON.stringify({ simp: true }) } });
    await page.waitForSelector('.lvl');
    ok((await page.textContent('.thm + h3')).includes('Choose a level'), '已有共用設定：用共用設定（不理舊的 bbk_cfg）');
    await page.evaluate(() => openSet()); await page.click('#setov .opt:has-text("简体")');
    const s = await LSget(page, SK);
    ok(s.script === 'simp' && s.rate === 'fast' && s.extra === 1 && s.phon === 'zhuyin', '改字形：只改自己的欄位，保留 rate 和其他欄位', s);
    await ctx.close(); }
  { const { page, ctx } = await open(browser, '/index.html', { ls: { [SK]: JSON.stringify({ v: 1, script: 'xx', lang: 'en', phon: 'zzz' }) } });
    await page.waitForSelector('.lvl');
    ok(await page.evaluate(() => SET.script === 'trad' && SET.lang === 'en' && SET.phon === 'pinyin'), '單欄不合法：只有那欄用預設');
    await ctx.close(); }
  { const { page, ctx } = await open(browser, '/index.html', { ls: { [SK]: '{壞掉' } });
    await page.waitForSelector('.lvl');
    ok(await page.evaluate(() => SET.script === 'trad' && SET.lang === 'es' && SET.phon === 'pinyin'), '設定壞掉：用預設');
    await ctx.close(); }

  console.log('\n[C] ⚙️ 設定視窗');
  { const { page, errors, ctx } = await open(browser, '/index.html');
    await page.waitForSelector('.lvl');
    await page.click('.gear');
    const t = await page.textContent('#setov');
    ok(t.includes('字形') && t.includes('語言') && t.includes('拼音／注音'), '有字形、語言、拼音／注音');
    ok(!t.includes('語速'), '沒有語速（比比看沒有語音）');
    ok((await page.$$('#setov .opt')).length === 9, '9 個選項（2＋3＋4）');
    const box = await page.$eval('#setov .setcard', e => { const r = e.getBoundingClientRect(); return { top: r.top, bottom: r.bottom }; });
    ok(box.top > 0 && box.bottom < 844, '小視窗在畫面中間');
    await shot(page, 'c1_gear', false);
    await page.click('#setov .opt:has-text("只有中文")');
    ok((await page.$$eval('#setov small', e => e.filter(x => x.offsetParent && x.textContent.trim() && !/Español|English/.test(x.textContent)).length)) === 0, '只有中文：設定視窗也沒有外語小字');
    await page.click('#setov .big');
    ok(await page.$eval('#setov', e => e.classList.contains('hide')), '按「完成」關閉');
    ok(!(await page.textContent('#app')).match(/Elige|Básico|Centro/), '主選單沒有西文');
    // 遊戲中打開 ⚙️
    await page.evaluate(() => startRound(1, null));
    const before = await page.evaluate(() => ({ i: S.i, score: S.score, q: S.qs[0].type }));
    await page.click('.top .gear');
    await page.click('#setov .opt:has-text("注音")');
    await page.click('#setov .big');
    const after = await page.evaluate(() => ({ i: S.i, score: S.score, q: S.qs[0].type }));
    ok(JSON.stringify(before) === JSON.stringify(after), '遊戲中改設定：題目和分數不變');
    ok(await page.$('.q .ph.zy') !== null && await page.$('.q .ph:not(.zy)') === null, '改成注音：題目上面顯示注音');
    ok(errors.length === 0, '沒有頁面錯誤', errors); await ctx.close(); }

  console.log('\n[D] 拼音／注音的位置：題目、選項、小字典');
  { const { page, errors, ctx } = await open(browser, '/index.html');
    await page.waitForSelector('.lvl');
    for(const [mode, py, zy] of [['pinyin', 1, 0], ['zhuyin', 0, 1], ['both', 1, 1], ['off', 0, 0]]){
      await page.evaluate(m => { setS('phon', m); closeSet(); }, mode);
      // 找一題有選項按鈕（pick／tf）的來檢查
      const r = await page.evaluate(() => { for(let k = 0; k < 40; k++){ startRound(1, { lv: 1, dims: [], types: ['pick'], n: 3 }); if(S.qs[0].btns) break; }
        S.dict = true; renderQ();
        return { qpy: document.querySelectorAll('.q .ph:not(.zy)').length, qzy: document.querySelectorAll('.q .ph.zy').length,
          bpy: document.querySelectorAll('.ob .ph:not(.zy)').length, bzy: document.querySelectorAll('.ob .ph.zy').length,
          dict: document.querySelector('.dictBox').innerText }; });
      ok((r.qpy > 0) === !!py && (r.qzy > 0) === !!zy && (r.bpy > 0) === !!py && (r.bzy > 0) === !!zy, `${mode}：題目與選項的拼音／注音正確`, r);
      const hasZy = /[ㄅ-ㄩ]/.test(r.dict), hasPy = /[āáǎàēéěèīíǐìōóǒòūúǔù]/.test(r.dict);
      ok(mode === 'zhuyin' ? hasZy && !hasPy : mode === 'both' ? hasZy && hasPy : hasPy && !hasZy, `${mode}：小字典（關的時候仍顯示拼音）`, r.dict);
      if(mode === 'both') await shot(page, 'd_both');
    }
    // 回饋句子也有
    await page.evaluate(() => { setS('phon', 'pinyin'); closeSet(); startRound(2, null); const q = S.qs[0]; const ci = q.btns ? q.btns.findIndex(b => b.ok) : q.its.findIndex(p => p.id === q.ans); q.btns ? pickBtn(ci) : pickCard(ci); });
    ok(await page.$('.fb .ph') !== null, '答完的說明句子也有拼音');
    ok(errors.length === 0, '沒有頁面錯誤', errors); await ctx.close(); }

  console.log('\n[E] 雙行介面與按鈕規格');
  { const { page, errors, ctx } = await open(browser, '/index.html');
    await page.waitForSelector('.lvl');
    await page.evaluate(() => startRound(1, null)); const n = await playRound(page);
    const big = await page.$$eval('.big', es => es.map(e => { const s = getComputedStyle(e), r = e.getBoundingClientRect(); return { rad: parseFloat(s.borderTopLeftRadius), h: r.height, w: r.width }; }));
    ok(big.length >= 2 && big.every(b => b.rad >= b.h / 2 - 1 && b.h >= 54 && b.w <= 300.5), '主要按鈕：膠囊形、高 54、最寬 300', big);
    const L = await page.$$eval('.big', es => es.map(e => e.innerText.split('\n')));
    ok(L.every(x => x.length === 2), '按鈕兩行：中文＋西文', L);
    await page.evaluate(() => startRound(1, { lv: 1, dims: [], types: ['tf'], n: 3 }));
    const ob = await page.$$eval('.ob', es => es.map(e => { const s = getComputedStyle(e), r = e.getBoundingClientRect(); return { rad: parseFloat(s.borderTopLeftRadius), h: r.height }; }));
    ok(ob.length === 2 && ob.every(b => b.h >= 46 && b.rad >= b.h / 2 - 1), '選項按鈕：膠囊形、至少 46 高', ob);
    await page.evaluate(() => { setS('lang', 'en'); closeSet(); });
    ok((await page.textContent('.ob')).includes('True'), '中＋英：選項下面是英文');
    ok(errors.length === 0, '沒有頁面錯誤', errors); await ctx.close(); }

  console.log('\n[F] 結果畫面：分數 → 評語 → 過關提示 → 再玩一次 → 主選單');
  { const { page, errors, ctx } = await open(browser, '/index.html');
    await page.waitForSelector('.lvl');
    await page.evaluate(() => startRound(1, null)); await playRound(page, true);
    const order = await page.$$eval('#app > *', es => es.map(e => e.className || e.id || e.tagName));
    const idx = k => order.findIndex(x => String(x).split(' ').includes(k));
    ok(idx('score') < idx('comment') && idx('comment') < idx('passmsg') && idx('passmsg') < idx('big'), '順序：分數 → 評語 → 過關提示 → 按鈕', order);
    ok((await page.textContent('.comment')).includes('全對'), '全對：最高一級評語');
    const btns = await page.$$eval('.big', es => es.map(e => e.innerText.split('\n')[0]));
    ok(btns.join() === '下一關,再玩一次,主選單', '過關：下一關、再玩一次、主選單', btns);
    await shot(page, 'f_result_full');
    const cm = await page.evaluate(() => [0, 30, 40, 55, 60, 79, 80, 99, 100].map(s => commentKey(s, 100)));
    ok(cm.join() === 'cm0,cm0,cm1,cm1,cm2,cm2,cm3,cm3,cm4', '五級評語分界：0–39／40–59／60–79／80–99／100', cm);
    await page.click('.big:has-text("下一關")');
    ok(await page.evaluate(() => S && S.lv === 2), '按「下一關」進第 2 關');
    await page.evaluate(() => { S.i = S.qs.length - 1; nextQ(); });
    ok((await page.textContent('.passmsg')).includes('分以上就破關'), '沒過關：提示幾分破關');
    await page.click('.gear'); await page.click('#setov .opt:has-text("简体")'); await page.click('#setov .big');
    ok((await page.textContent('.comment')).includes('别灰心'), '結果畫面改設定：評語跟著變簡體');
    ok(errors.length === 0, '沒有頁面錯誤', errors); await ctx.close(); }

  console.log('\n[G] 出題引擎（engine.js）');
  { const { page, ctx } = await open(browser, '/index.html');
    await page.waitForSelector('.lvl');
    const r = await page.evaluate(() => { const fs = {}, bad = [];
      for(const lv of [1, 2, 3]) for(let i = 0; i < 120; i++) for(const q of E.makeRound(lv)){ fs[q.type + ':' + q.f] = 1; if(!q.f || q.pol === undefined) bad.push(q.type); }
      return { fs: Object.keys(fs).length, bad }; });
    ok(r.bad.length === 0 && r.fs > 20, '很多回合：每題都有句型與方向', r);
    const zy = await page.evaluate(() => ['méiyǒu', 'chàbuduō', 'yíyàng', 'hěn duō', 'tóufa', 'yǎnjing', 'gōngfēn', 'zhèngquè'].map(p => BBK_ENGINE.zy(p)));
    ok(zy.join('/') === 'ㄇㄟˊ ㄧㄡˇ/ㄔㄚˋ ˙ㄅㄨ ㄉㄨㄛ/ㄧˊ ㄧㄤˋ/ㄏㄣˇ ㄉㄨㄛ/ㄊㄡˊ ˙ㄈㄚ/ㄧㄢˇ ˙ㄐㄧㄥ/ㄍㄨㄥ ㄈㄣ/ㄓㄥˋ ㄑㄩㄝˋ', '拼音 → 注音（連寫的詞也會切開）', zy);
    const all = await page.evaluate(() => { const ps = new Set(); for(const d of Object.values(E.DIMS)){ [d.pos, d.neg, d.poss, d.unit].forEach(a => a && a.p && ps.add(a.p)); }
      return [...ps].filter(p => /[a-zāáǎàēéěèīíǐìōóǒòūúǔùü]/i.test(BBK_ENGINE.zy(p))); });
    ok(all.length === 0, '主題包所有拼音都轉得成注音', all);
    const rg = await page.evaluate(() => { const q = E.makeRound(2, { lv: 2, dims: ['hair'], types: ['fill', 'pick'], n: 7 }); return { n: q.length, ok: q.every(x => x.d.key === 'hair' && ['fill', 'pick'].includes(x.type)) }; });
    ok(rg.n === 7 && rg.ok, '照範圍出題（特徵、題型、題數）', rg);
    await ctx.close(); }

  console.log('\n[H] 學習單（worksheet.js，老師管理中心用）');
  { const { page, errors, ctx } = await open(browser, '/index.html');
    await page.waitForSelector('.lvl');
    await page.addScriptTag({ url: BASE + '/worksheet.js' });
    const r = await page.evaluate(() => { const rg = { lv: 2, dims: [], types: [], n: 8 }; const qs = E.makeRound(2, rg);
      const h = BBK_WORKSHEET(E, qs, { range: rg, simp: false, lang: 'es', phon: 'both', answers: true, base: '' });
      document.body.innerHTML = h;
      return { n: document.querySelectorAll('.bw-q').length, k: document.querySelectorAll('.bw-k').length, zy: document.querySelectorAll('.bbkws .ph.zy').length,
        img: document.querySelectorAll('.bbkws img').length, es: document.body.innerText.includes('Nombre') }; });
    ok(r.n === 8 && r.k === 8 && r.zy > 0 && r.img > 0 && r.es, '8 題＋8 題答案、注音、人物圖、西文小字', r);
    await page.waitForTimeout(300);
    await shot(page, 'h_worksheet');
    const r2 = await page.evaluate(() => { const rg = { lv: 1, dims: [], types: [], n: 5 }; const qs = E.makeRound(1, rg);
      document.body.innerHTML = BBK_WORKSHEET(E, qs, { range: rg, simp: true, lang: 'zh', phon: 'off', answers: false, base: '' });
      return { k: document.querySelectorAll('.bw-k').length, ph: document.querySelectorAll('.ph').length, small: document.querySelectorAll('.bbkws small').length, t: document.body.innerText.includes('学习单') }; });
    ok(r2.k === 0 && r2.ph === 0 && r2.small === 0 && r2.t, '不附答案、拼音關、只有中文、簡體', r2);
    ok(errors.length === 0, '沒有頁面錯誤', errors); await ctx.close(); }

  console.log('\n[I] 學生：班級連結＋暱稱＋回傳');
  { const { page, errors, ctx } = await open(browser, '/index.html?class=' + CID);
    await page.waitForSelector('.clsb h3:has-text("週三班")');
    ok(await page.$('a.big[href*="profesor"]') === null, '班級連結：不顯示老師管理中心按鈕');
    await page.evaluate(() => startRound(1, null));
    ok(await page.evaluate(() => S === null), '沒輸入暱稱不能開始');
    ok((await page.textContent('.nickmsg')).includes('請先輸入暱稱'), '提示先輸入暱稱');
    await page.fill('#nickIn', '  Ana  María '); await page.click('.clsb .opt.on');
    ok((await page.textContent('.clsb')).includes('Ana María'), '暱稱整理空白後顯示');
    await shot(page, 'i1_class_menu');
    for(const lv of [1, 2, 3]){
      await page.evaluate(lv => startRound(lv, null), lv); const n = await playRound(page);
      await page.waitForSelector('#clsUp .clsup.ok');
      const plays = Object.values((await db(page)).class_plays); const p = plays[plays.length - 1];
      ok(plays.length === lv && p.lv === lv && p.qs.length === n && p.max === n * 10 && p.rg === '' && p.r === '' && p.th === 'people' && p.owner === 'u1' && p.nick === 'Ana María', `第 ${lv} 關：寫入一筆，欄位正確`);
      ok(p.qs.every((q, i) => (i % 2 === 0 ? q.f1 && q.ok : !q.f1) && q.t && q.d && q.f && typeof q.ok === 'boolean' && Array.isArray(q.ids)), `第 ${lv} 關：每題紀錄正確`);
      ok(p.score === p.qs.reduce((s, q) => s + (q.f1 ? 10 : q.ok ? 5 : 0), 0), `第 ${lv} 關：分數與每題紀錄一致`);
    }
    const t = await page.textContent('#clsUp');
    ok(t.includes('✅ 成績已回傳給老師') && t.includes('Resultado enviado'), '顯示「✅ 成績已回傳給老師」＋西文');
    const order = await page.$$eval('#app > *', es => es.map(e => e.className || e.id));
    ok(order.indexOf('passmsg') < order.indexOf('clsUp') && order.indexOf('clsUp') < order.findIndex(x => /big/.test(x)), '順序：評語 → ✅ → 按鈕', order);
    await page.click('.gear'); await page.click('#setov .opt:has-text("只有中文")'); await page.click('#setov .big');
    const t2 = await page.textContent('#clsUp');
    ok(t2.includes('✅ 成績已回傳給老師') && !t2.includes('Resultado'), '改成只有中文：✅ 訊息保留、沒有西文');
    ok(Object.keys((await db(page)).class_plays).length === 3, '重畫結果畫面不會重複回傳');
    await shot(page, 'i2_result_sent');
    ok(errors.length === 0, '沒有頁面錯誤', errors); await ctx.close(); }
  { const { page, errors, ctx } = await open(browser, '/index.html?class=' + CID, { seedOpt: { expired: true }, ls: { ['bbk_nick_' + CID]: 'Leo' } });
    await page.waitForSelector('.clsb h3:has-text("週三班")');
    await page.evaluate(() => startRound(1, null)); await playRound(page);
    await page.waitForSelector('#clsUp .clsup.no');
    ok((await page.textContent('#clsUp')).includes('沒有權限'), '老師訂閱到期：顯示沒有權限、可以再試');
    ok(errors.length === 0, '沒有頁面錯誤', errors); await ctx.close(); }
  { const { page, errors, ctx } = await open(browser, '/index.html?class=nosuchclass1');
    await page.waitForSelector('.clsb h3:has-text("找不到")');
    await page.evaluate(() => startRound(1, null)); ok(await page.evaluate(() => S !== null), '班級不存在：仍然可以玩');
    await playRound(page); ok((await page.textContent('#clsUp')).trim() === '', '不嘗試傳送');
    ok(errors.length === 0, '沒有頁面錯誤', errors); await ctx.close(); }

  console.log('\n[J] 老師範圍：?r= 範圍碼、舊格式連結');
  { const { page, errors, ctx } = await open(browser, '/index.html?r=' + RS);
    await page.waitForSelector('.panel h3:has-text("老師指定的練習")');
    await page.waitForFunction(() => !document.body.innerText.includes('載入中'));
    const t = await page.textContent('#app');
    ok(t.includes('身高和年齡') && t.includes('第 2 關') && t.includes('5 題'), '顯示範圍名稱、關卡、題數');
    ok(await page.$('.lvl') === null, '不顯示一般關卡');
    await shot(page, 'j1_code');
    await page.click('button.big:has-text("開始練習")');
    const r = await page.evaluate(() => ({ lv: S.lv, n: S.qs.length, d: RANGE.dims, t: RANGE.types }));
    ok(r.lv === 2 && r.n === 5 && r.d.join() === 'height,age' && r.t.join() === 'decode,pick', '照範圍出題', r);
    await playRound(page);
    ok(await page.$('.big:has-text("下一關")') === null, '老師範圍：結果沒有「下一關」');
    await page.click('.big:has-text("再玩一次")');
    ok(await page.evaluate(() => S.qs.length === 5 && S.qs.every(q => ['height', 'age'].includes(q.d.key))), '再玩一次：沿用範圍');
    ok(errors.length === 0, '沒有頁面錯誤', errors); await ctx.close(); }
  { const { page, errors, ctx } = await open(browser, '/index.html?r=' + RS + '&class=' + CID);
    await page.waitForSelector('.clsb h3:has-text("週三班")'); await page.waitForSelector('.panel h3:has-text("老師指定的練習")');
    await page.waitForFunction(() => !document.body.innerText.includes('載入中'));
    ok(!(await page.$('.thm')), '老師範圍：不顯示主題選擇');
    await page.waitForFunction(() => !document.body.innerText.includes('載入中'));
    await page.fill('#nickIn', 'Ana'); await page.click('.clsb .opt.on');
    await page.click('button.big:has-text("開始練習")'); await playRound(page); await page.waitForSelector('#clsUp .clsup.ok');
    const p = Object.values((await db(page)).class_plays).pop();
    ok(p.lv === 2 && p.rg === 'd=height,age&t=decode,pick&n=5' && p.max === 50, '班級＋範圍碼：成績回傳帶範圍', p.rg);
    ok(p.r === RS, '步驟 6-2：成績記下範圍碼 r（中心依範圍分開顯示）', p.r);
    ok(errors.length === 0, '沒有頁面錯誤', errors); await ctx.close(); }
  { const { page, errors, ctx } = await open(browser, '/index.html?r=zzzz99998888');
    await page.waitForSelector('.lvl');
    ok((await page.textContent('#app')).includes('找不到老師的練習範圍'), '範圍碼不存在：提示並退回一般模式');
    ok(errors.length === 0, '沒有頁面錯誤', errors); await ctx.close(); }
  { const { page, errors, ctx } = await open(browser, `/index.html?class=${CID}&lv=2&d=height,hair&t=pick,fill&n=5`, { ls: { ['bbk_nick_' + CID]: 'Leo' } });
    await page.waitForSelector('.clsb h3:has-text("週三班")');
    ok((await page.textContent('#app')).includes('開始練習'), '舊格式連結＋班級：顯示老師指定練習');
    await page.click('button.big:has-text("開始練習")'); const n = await playRound(page);
    await page.waitForSelector('#clsUp .clsup.ok');
    const p = Object.values((await db(page)).class_plays)[0];
    ok(p.rg === 'd=height,hair&t=pick,fill&n=5' && p.r === '' && p.lv === 2 && n === 5 && p.qs.every(q => ['height', 'hair'].includes(q.d)), '記下範圍、題目都在範圍內', p.rg);
    ok(errors.length === 0, '沒有頁面錯誤', errors); await ctx.close(); }
  { const { page, errors, ctx } = await open(browser, '/index.html?lv=1&d=height&t=tf&n=5');
    await page.waitForSelector('.panel h3:has-text("老師指定的練習")');
    ok(await page.evaluate(() => !window.__apps), '舊格式連結：不用連網');
    await page.click('button.big:has-text("一般模式")');
    ok(await page.$('.lvl') !== null && await page.evaluate(() => !location.search.includes('lv=')), '「一般模式」：回到選關卡');
    ok(errors.length === 0, '沒有頁面錯誤', errors); await ctx.close(); }

  console.log('\n[K] 別的分頁改了共用設定');
  { const { page, errors, ctx } = await open(browser, '/index.html');
    await page.waitForSelector('.lvl');
    await page.evaluate(k => { const v = JSON.stringify({ v: 1, script: 'simp', lang: 'en', phon: 'off', rate: 'slow' }); localStorage.setItem(k, v);
      window.dispatchEvent(new StorageEvent('storage', { key: k, newValue: v })); }, SK);
    ok((await page.textContent('.thm + h3')).includes('选择难度') && (await page.textContent('.thm + h3')).includes('Choose a level'), '主選單跟著更新');
    await page.evaluate(() => startRound(1, null)); const i0 = await page.evaluate(() => S.qs[0].type);
    await page.evaluate(k => { const v = JSON.stringify({ v: 1, script: 'trad', lang: 'es', phon: 'off' }); localStorage.setItem(k, v);
      window.dispatchEvent(new StorageEvent('storage', { key: k, newValue: v })); }, SK);
    ok(await page.evaluate(() => SET.script === 'simp' && S.i === 0), '遊戲中先不理');
    ok(errors.length === 0, '沒有頁面錯誤', errors); await ctx.close(); }

  console.log('\n[L] 第 4 批：🚩 這題怪怪的（題目回報）');
  const answerFirst = page => page.evaluate(() => { const q = S.qs[S.i];
    const ci = q.btns ? q.btns.findIndex(b => b.ok) : q.its.findIndex(p => p.id === q.ans);
    const wi = (q.btns ? q.btns : q.its).findIndex((_, j) => j !== ci);
    q.btns ? pickBtn(wi) : pickCard(wi); if(!S.done) q.btns ? pickBtn(ci) : pickCard(ci); });
  { const { page, errors, ctx } = await open(browser, '/index.html');
    await page.waitForSelector('.lvl');
    ok((await page.textContent('.ver')) === 'v6-10', '版本號 v6-10');
    await page.evaluate(() => startRound(2, null));
    ok(await page.$('.repbtn') === null, '還沒作答：沒有 🚩');
    await answerFirst(page);
    const t = await page.textContent('.repbtn');
    ok(t.includes('🚩 這題怪怪的') && t.includes('Algo raro en esta pregunta'), '作答後出現「🚩 這題怪怪的」（中文＋西文兩行）', t);
    ok(await page.evaluate(() => !window.__apps), '只是顯示按鈕：還不連 Firebase');
    await page.click('.repbtn');
    ok(await page.$$eval('.repbox .opt', b => b.length) === 3 && (await page.textContent('.repbox')).includes('圖看不清楚'), '展開：三個原因＋留言');
    await page.click('.repbox .go');
    ok((await page.textContent('.repbox')).includes('請先選一個原因') && await page.evaluate(() => !window.__apps), '沒選原因：提醒，不送出');
    await page.click('.repbox .opt:has-text("答案好像不對")');
    await page.fill('#repNote', '我覺得兩個人一樣高');
    await page.evaluate(() => { S.dict = true; renderQ(); });   // 中途重畫，選擇和留言要留著
    ok(await page.$eval('#repNote', i => i.value) === '我覺得兩個人一樣高' && await page.$('.repbox .opt.on') !== null, '重畫畫面：原因和留言還在');
    await page.click('.repbox .go'); await page.waitForSelector('.repmsg.ok');
    const reps = Object.values((await db(page)).bbk_reports || {});
    const r = reps[0], q = await page.evaluate(() => { const q = S.qs[S.i]; return { type: q.type, d: q.d.key, ids: q.its.map(p => p.id), picks: S.picks.length }; });
    ok(reps.length === 1 && r.why === 'wrong' && r.note === '我覺得兩個人一樣高' && r.done === false && typeof r.at === 'number', '一般模式也能送：存進 bbk_reports', r);
    ok(r.type === q.type && r.d === q.d && JSON.stringify(r.ids) === JSON.stringify(q.ids) && r.lv === 2 && r.r === '' && r.lang === 'es' && r.ver === 'v6-10' && r.th === 'people', '自動記下題型、特徵、人物、關卡、範圍碼、語言、版本', r);
    ok(r.q.length > 0 && r.ans.length > 0 && !/undefined|\[object/.test(r.q + r.ans + r.pick), '記下題目文字與正確答案', [r.q, r.ans]);
    ok(r.pick.split(' → ').length === q.picks && r.pick.split(' → ')[0] !== r.ans && (q.picks === 1 || r.pick.split(' → ').pop() === r.ans), '學生選的答案照順序記下（先錯的、後對的）', [r.pick, r.ans]);
    ok(await page.$('.repbtn') === null && (await page.textContent('#rep')).includes('謝謝'), '送出後顯示謝謝，不能再送');
    await page.evaluate(() => nextQ()); await answerFirst(page);
    ok(await page.$('.repbtn') !== null, '下一題：🚩 重新出現');
    ok(errors.length === 0, '沒有頁面錯誤', errors); await ctx.close(); }
  { const { page, errors, ctx } = await open(browser, '/index.html', { ls: { [SK]: JSON.stringify({ v: 1, script: 'trad', lang: 'en', phon: 'pinyin' }) } });
    await page.waitForSelector('.lvl'); await page.evaluate(() => startRound(1, null));
    await answerFirst(page); await page.evaluate(() => { window.__FAIL_REPORT = true; });
    ok((await page.textContent('.repbtn')).includes("Something's off here"), '英文介面：英文小字');
    await page.click('.repbtn'); await page.click('.repbox .opt:has-text("其他")'); await page.click('.repbox .go');
    await page.waitForSelector('.repmsg.no:has-text("沒有送出去")');
    ok(Object.keys((await db(page)).bbk_reports || {}).length === 0 && await page.$('.repbox .go') !== null, '送不出去：提示，可以再試');
    await page.evaluate(() => { window.__FAIL_REPORT = false; }); await page.click('.repbox .go'); await page.waitForSelector('.repmsg.ok');
    const r = Object.values((await db(page)).bbk_reports)[0];
    ok(r.why === 'other' && r.note === '' && r.lang === 'en' && r.lv === 1, '再試一次就送出（留言可以空白）', r);
    ok(errors.length === 0, '沒有頁面錯誤', errors); await ctx.close(); }
  { const { page, errors, ctx } = await open(browser, `/index.html?class=${CID}&r=${RS}`, { ls: { ['bbk_nick_' + CID]: 'Ana' } });
    await page.waitForSelector('button.big:has-text("開始練習")');
    await page.click('button.big:has-text("開始練習")'); await answerFirst(page);
    await page.click('.repbtn'); await page.click('.repbox .opt:has-text("圖看不清楚")'); await page.click('.repbox .go'); await page.waitForSelector('.repmsg.ok');
    const r = Object.values((await db(page)).bbk_reports)[0];
    ok(r.why === 'image' && r.r === RS && r.lv === 2 && ['height', 'age'].includes(r.d), '老師範圍＋班級：記下範圍碼', r);
    ok(errors.length === 0, '沒有頁面錯誤', errors); await ctx.close(); }

  await browser.close(); server.close();
  console.log(`\n通過 ${pass}，失敗 ${fail}`); process.exit(fail ? 1 : 0);
});
