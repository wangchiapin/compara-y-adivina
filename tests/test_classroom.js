// 班級與成績簿測試（Playwright + 模擬 Firebase）。用法：node tests/test_classroom.js [輸出截圖資料夾]
let chromium; try{ ({ chromium } = require('playwright')); }catch(e){ ({ chromium } = require('/opt/npm-tools/node_modules/playwright')); }
const fs = require('fs'), path = require('path'), http = require('http');
const ROOT = path.join(__dirname, '..');
const MOCK = fs.readFileSync(path.join(__dirname, 'firebase-mock.js'), 'utf8');
const SHOT = process.argv[2] || null;
let pass = 0, fail = 0;
function ok(c, name, extra){ if(c){ pass++; console.log('  ✓', name); } else { fail++; console.log('  ✗', name, extra !== undefined ? '→ ' + JSON.stringify(extra) : ''); } }
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.webp': 'image/webp' };
const server = http.createServer((req, res) => {
  let f = path.normalize(path.join(ROOT, decodeURIComponent(req.url.split('?')[0])));
  if(!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()){ res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
});
const CID = 'class0000aaaa', CID2 = 'class0000bbbb';
const TEACH = { uid: 'u1', email: 'teacher@example.com', displayName: 'T', isAnonymous: false };
function seed({ pro = true, expired = false } = {}){
  const s = { 'subscription-48d3c': {
    classes: { [CID]: { owner: 'u1', slot: 0, name: '週三班', showBoard: false, updatedAt: 1 } },
    teacher_classes: { u1: { slots: { '0': CID }, updatedAt: 1 } },
    site_plans: {}, class_plays: {} } };
  if(pro) s['subscription-48d3c'].site_plans.u1 = { plan: 'year', expiresAt: Date.now() + (expired ? -1 : 1) * 30 * 86400000 };
  return s;
}
async function open(browser, url, { seedOpt, user = null, ls = {} } = {}){
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, acceptDownloads: true });
  const page = await ctx.newPage(); const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('dialog', d => d.accept());
  await page.route('**/*', r => r.request().url().startsWith('http://localhost') ? r.continue() : r.abort());
  await page.addInitScript(`window.__SEED=${JSON.stringify(seed(seedOpt))};window.__USER=${JSON.stringify(user)};window.__GOOGLE=${JSON.stringify(TEACH)};` +
    Object.entries(ls).map(([k, v]) => `localStorage.setItem(${JSON.stringify(k)},${JSON.stringify(v)});`).join(''));
  await page.addInitScript(MOCK);
  await page.goto(BASE + url);
  return { page, errors, ctx };
}
// 玩完一整回合：奇數題先點錯一次
async function playRound(page){
  const n = await page.evaluate(() => S.qs.length);
  for(let i = 0; i < n; i++){
    await page.evaluate(i => { const q = S.qs[S.i];
      const ci = q.btns ? q.btns.findIndex(b => b.ok) : q.its.findIndex(p => p.id === q.ans);
      const wi = (q.btns ? q.btns : q.its).findIndex((_, j) => j !== ci);
      if(i % 2 === 1) q.btns ? pickBtn(wi) : pickCard(wi);
      if(!S.done) q.btns ? pickBtn(ci) : pickCard(ci); }, i);
    await page.evaluate(() => nextQ());
  }
  return n;
}
const db = page => page.evaluate(() => window.__DB['subscription-48d3c']);
const shot = async (page, name, full = true) => { if(SHOT) await page.screenshot({ path: path.join(SHOT, name + '.png'), fullPage: full }); };
let BASE;
server.listen(0, 'localhost', async () => {
  BASE = 'http://localhost:' + server.address().port;
  const browser = await chromium.launch();

  console.log('\n[A] 一般模式：不載入 Firebase');
  { const { page, errors, ctx } = await open(browser, '/index.html');
    await page.waitForSelector('.lvl');
    ok(await page.evaluate(() => !window.__apps), '沒有初始化 Firebase');
    ok(await page.$('#acctPanel') !== null, '有「班級成績簿」面板（收合）');
    await page.evaluate(() => startRound(1, null)); await playRound(page);
    ok(await page.$('#clsUp') === null, '結果畫面沒有傳送訊息');
    ok(errors.length === 0, '沒有頁面錯誤', errors); await ctx.close(); }

  console.log('\n[B] 學生：班級連結＋暱稱＋回傳（老師訂閱中）');
  { const { page, errors, ctx } = await open(browser, '/index.html?class=' + CID);
    await page.waitForSelector('.clsb h3:has-text("週三班")');
    await shot(page, 'b1_class_menu');
    await page.evaluate(() => startRound(1, null));
    ok(await page.evaluate(() => S === null), '沒輸入暱稱不能開始');
    ok((await page.textContent('.nickmsg')).includes('請先輸入暱稱'), '提示先輸入暱稱');
    await page.fill('#nickIn', '  Ana  María '); await page.click('.clsb .opt.on');
    ok((await page.textContent('.clsb')).includes('Ana María'), '暱稱整理空白後顯示');
    ok(await page.evaluate(k => localStorage.getItem(k), 'bbk_nick_' + CID) === 'Ana María', '暱稱記在這台裝置');
    for(const lv of [1, 2, 3]){
      await page.evaluate(lv => startRound(lv, null), lv); const n = await playRound(page);
      await page.waitForSelector('#clsUp.ok');
      const plays = Object.values((await db(page)).class_plays);
      const p = plays[plays.length - 1];
      ok(plays.length === lv && p.lv === lv && p.qs.length === n && p.max === n * 10 && p.rg === '' && p.th === 'people' && p.owner === 'u1' && p.nick === 'Ana María', `第 ${lv} 關：寫入一筆，欄位正確`, p && { lv: p.lv, n: p.qs.length, rg: p.rg });
      ok(p.qs.every(q => q.t && q.d && q.f && [1, -1, 0].includes(q.p) && typeof q.ok === 'boolean' && typeof q.f1 === 'boolean' && Array.isArray(q.ids)), `第 ${lv} 關：每題都有題型、特徵、句型、方向、對錯`, p.qs.find(q => !q.f));
      ok(p.qs.every((q, i) => i % 2 === 0 ? q.f1 && q.ok : !q.f1), `第 ${lv} 關：第一次就對的記錄正確`);
      ok(p.score === p.qs.reduce((s, q) => s + (q.f1 ? 10 : q.ok ? 5 : 0), 0), `第 ${lv} 關：分數與每題紀錄一致`);
      ok(p.qs.filter(q => q.t === 'tf').every(q => typeof q.tv === 'boolean'), `第 ${lv} 關：對錯題記錄句子本身真假`);
    }
    await shot(page, 'b2_result');
    ok(errors.length === 0, '沒有頁面錯誤', errors); await ctx.close(); }

  console.log('\n[B2] 很多回合：句型都有標記');
  { const { page, ctx } = await open(browser, '/index.html');
    await page.waitForSelector('.lvl');
    const r = await page.evaluate(() => { const fs = {}, bad = [];
      for(const lv of [1, 2, 3]) for(let i = 0; i < 150; i++) for(const q of makeRound(lv)){ fs[q.type + ':' + q.f] = 1; if(!q.f || q.pol === undefined) bad.push(q.type); }
      return { fs: Object.keys(fs).sort(), bad }; });
    console.log('    ', r.fs.join(' '));
    ok(r.bad.length === 0, '1350 回合每題都有句型與方向', r.bad.slice(0, 5));
    await ctx.close(); }

  console.log('\n[C] 學生：老師訂閱已到期 → 傳不出去，但可以玩');
  { const { page, errors, ctx } = await open(browser, '/index.html?class=' + CID, { seedOpt: { expired: true }, ls: { ['bbk_nick_' + CID]: 'Leo' } });
    await page.waitForSelector('.clsb h3:has-text("週三班")');
    await page.evaluate(() => startRound(1, null)); await playRound(page);
    await page.waitForSelector('#clsUp.no');
    ok((await page.textContent('#clsUp')).includes('沒有權限'), '顯示沒有權限的說明');
    ok(Object.keys((await db(page)).class_plays).length === 0, '沒有寫入');
    await shot(page, 'c_expired', false);
    ok(errors.length === 0, '沒有頁面錯誤', errors); await ctx.close(); }

  console.log('\n[D] 學生：班級不存在');
  { const { page, errors, ctx } = await open(browser, '/index.html?class=nosuchclass1');
    await page.waitForSelector('.clsb h3:has-text("找不到")');
    await page.evaluate(() => startRound(1, null)); ok(await page.evaluate(() => S !== null), '仍然可以玩');
    await playRound(page); ok(await page.$('#clsUp') === null, '不嘗試傳送');
    ok(errors.length === 0, '沒有頁面錯誤', errors); await ctx.close(); }

  console.log('\n[E] 學生：班級連結＋老師範圍');
  { const { page, errors, ctx } = await open(browser, `/index.html?class=${CID}&lv=2&d=height,hair&t=pick,fill&n=5`, { ls: { ['bbk_nick_' + CID]: 'Leo' } });
    await page.waitForSelector('.clsb h3:has-text("週三班")');
    ok((await page.textContent('#app')).includes('開始練習'), '顯示老師指定練習');
    await shot(page, 'e_range_menu');
    await page.evaluate(() => tc.start()); const n = await playRound(page);
    await page.waitForSelector('#clsUp.ok');
    const p = Object.values((await db(page)).class_plays)[0];
    ok(p.rg === 'd=height,hair&t=pick,fill&n=5' && p.lv === 2 && n === 5, '記下範圍', p.rg);
    ok(p.qs.every(q => ['height', 'hair'].includes(q.d) && ['pick', 'fill'].includes(q.t)), '題目都在範圍內');
    ok(errors.length === 0, '沒有頁面錯誤', errors); await ctx.close(); }

  console.log('\n[F] 免費老師：練習紙上鎖、不能建班');
  { const { page, errors, ctx } = await open(browser, '/index.html', { seedOpt: { pro: false } });
    await page.waitForSelector('.lvl');
    await page.evaluate(() => tc.open());
    ok((await page.textContent('#app')).includes('🔒 🖨'), '練習紙按鈕有鎖頭');
    await page.evaluate(() => tc.sheet());
    await page.waitForSelector('#acctPanel .notice');
    ok(!(await page.evaluate(() => document.body.classList.contains('wsmode'))), '沒有進入練習紙');
    ok((await page.textContent('#acctPanel')).includes('用 Google 登入'), '要求登入');
    await page.click('#acctPanel .big');
    await page.waitForSelector('#acctPanel :text("免費")');
    ok((await page.$$('#acctPanel input[id^=newCls]')).length === 0, '沒有建立班級的欄位');
    ok((await page.textContent('#acctPanel')).includes('週三班'), '仍看得到共用班級');
    await shot(page, 'f_free_teacher');
    await page.evaluate(() => tc.sheet());
    ok(!(await page.evaluate(() => document.body.classList.contains('wsmode'))), '登入後免費方案仍不能做練習紙');
    ok(errors.length === 0, '沒有頁面錯誤', errors); await ctx.close(); }

  console.log('\n[G] 訂閱老師：登入、建班、成績簿、常錯統計、CSV、刪除');
  { // 先準備一些學生紀錄：用 B 的方式產生
    const st = await open(browser, '/index.html?class=' + CID, { ls: { ['bbk_nick_' + CID]: 'Ana' } });
    await st.page.waitForSelector('.clsb h3:has-text("週三班")');
    for(const lv of [1, 2]){ await st.page.evaluate(lv => startRound(lv, null), lv); await playRound(st.page); await st.page.waitForSelector('#clsUp.ok'); }
    await st.page.evaluate(() => { cr.editNick(); }); await st.page.fill('#nickIn', 'ana '); await st.page.click('.clsb .opt.on');   // 同暱稱（大小寫、空白不同）
    await st.page.evaluate(() => startRound(3, null)); await playRound(st.page); await st.page.waitForSelector('#clsUp.ok');
    await st.page.evaluate(() => { cr.editNick(); }); await st.page.fill('#nickIn', 'Beto'); await st.page.click('.clsb .opt.on');
    await st.page.evaluate(() => startRound(1, null)); await playRound(st.page); await st.page.waitForSelector('#clsUp.ok');
    const plays = (await db(st.page)).class_plays; await st.ctx.close();
    const sd = seed(); sd['subscription-48d3c'].class_plays = plays;
    // 另一位老師的紀錄不能出現
    sd['subscription-48d3c'].class_plays.other = Object.assign({}, Object.values(plays)[0], { owner: 'u2', nick: 'X' });
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, acceptDownloads: true });
    const page = await ctx.newPage(); const errors = []; page.on('pageerror', e => errors.push(String(e))); page.on('dialog', d => d.accept());
    await page.route('**/*', r => r.request().url().startsWith('http://localhost') ? r.continue() : r.abort());
    await page.addInitScript(`window.__SEED=${JSON.stringify(sd)};window.__USER=null;window.__GOOGLE=${JSON.stringify(TEACH)};`);
    await page.addInitScript(MOCK);
    await page.goto(BASE + '/index.html'); await page.waitForSelector('.lvl');
    await page.evaluate(() => cr.toggle()); await page.waitForSelector('#acctPanel .big');
    await page.click('#acctPanel .big');
    await page.waitForSelector('#acctPanel :text("訂閱")');
    ok(await page.evaluate(() => localStorage.getItem('bbk_t')) === '1', '記住老師登入過');
    ok(!!(await db(page)).site_members.u1, '建立 site_members');
    ok((await page.$$('#acctPanel input[id^=newCls]')).length === 2, '空的兩格可以建班');
    await shot(page, 'g1_pro_panel');
    await page.fill('#newCls1', '週五班'); await page.click('#acctPanel .clsitem.empty .opt');
    await page.waitForSelector('h1:has-text("週五班")');
    const d1 = await db(page); const cid2 = d1.teacher_classes.u1.slots['1'];
    ok(cid2 && d1.teacher_classes.u1.slots['0'] === CID && d1.classes[cid2].owner === 'u1' && d1.classes[cid2].slot === 1, '建班：寫入共用的 teacher_classes 與 classes（保留原有的班）');
    ok((await page.textContent('#app')).includes('還沒有學生的紀錄'), '新班級沒有紀錄');
    await page.evaluate(() => cr.closeClass()); await page.evaluate(() => cr.openClass('0'));
    await page.waitForSelector('table.st');
    const rows = await page.$$eval('table.st tr', t => t.slice(1).map(r => r.innerText.replace(/\s+/g, ' ')));
    ok(rows.length === 2 && rows[0].startsWith('ana') && rows[0].includes(' 3 ') && rows[1].startsWith('Beto'), '學生表：同暱稱合併、其他老師的不出現', rows);
    await shot(page, 'g2_students');
    // 範圍連結
    await page.evaluate(() => { cr.copy(false); });
    const link0 = await page.evaluate(() => { let u; const o = navigator.clipboard; return null; });
    await page.evaluate(() => cr.tab('err')); await page.waitForSelector('.pbar');
    const heads = await page.$$eval('.tsec', e => e.map(x => x.innerText.split('\n')[0]));
    ok(['句型', '特徵與形容詞', '題型'].every(h => heads.some(x => x.startsWith(h))), '常錯統計有句型、特徵、題型', heads);
    const rates = await page.$$eval('table.st', ts => ts.map(t => [...t.querySelectorAll('tr')].slice(1).map(r => parseInt(r.querySelector('.pbar span').textContent))));
    ok(rates.every(r => r.every((v, i) => i === 0 || v >= r[i - 1])), '依第一次就對由低到高排', rates);
    const tot = await page.evaluate(() => { const ps = cr._state.plays; return ps.reduce((s, r) => s + r.qs.length, 0); });
    const sumF = await page.$eval('table.st', t => [...t.querySelectorAll('tr')].slice(1).reduce((s, r) => s + +r.children[1].textContent, 0));
    ok(tot === sumF, '句型表的題數加總 = 全部題數', [tot, sumF]);
    await shot(page, 'g3_errors');
    await page.evaluate(() => cr.tab('stu')); await page.click('table.st tr:nth-child(2)');
    await page.waitForSelector('h3:has-text("ana")');
    ok((await page.$$('.panel table.st')).length >= 2, '個人頁：回合列表＋統計');
    await shot(page, 'g4_student');
    const [dl] = await Promise.all([page.waitForEvent('download'), page.evaluate(() => { cr.sel(null); const A = HTMLAnchorElement.prototype.click; HTMLAnchorElement.prototype.click = function(){ window.__dlName = this.download; return A.call(this); }; cr.csv(); })]);
    const dlName = await page.evaluate(() => window.__dlName);   // 無頭瀏覽器對 blob 下載回報的檔名是 download，改看 a.download
    const csv = fs.readFileSync(await dl.path(), 'utf8');
    ok(csv.charCodeAt(0) === 0xfeff && csv.split('\r\n').length === 1 + tot && /^bbk_週三班_\d{8}\.csv$/.test(dlName), 'CSV：每題一列、有 BOM、檔名含班級', [csv.split('\r\n').length, dlName]);
    await page.evaluate(() => cr.sel(cr._state.plays.find(r => r.nick === 'Beto').h));
    await page.evaluate(() => cr.delStudent()); await page.waitForTimeout(100);
    const left = Object.values((await db(page)).class_plays);
    ok(!left.some(r => r.nick === 'Beto') && left.filter(r => r.owner === 'u1').length === 3 && left.some(r => r.owner === 'u2'), '刪除學生：只刪他的、別的老師的不動');
    await page.evaluate(() => cr.days(7)); ok((await page.$$('table.st tr')).length === 2, '最近 7 天篩選');
    // 練習紙：訂閱可用
    await page.evaluate(() => cr.closeClass()); await page.evaluate(() => { tc.open(); tc.sheet(); });
    ok(await page.evaluate(() => document.body.classList.contains('wsmode')), '訂閱老師可以做練習紙');
    ok(errors.length === 0, '沒有頁面錯誤', errors); await ctx.close(); }

  console.log('\n[H] 老師登入過：重新打開頁面自動讀帳號');
  { const { page, errors, ctx } = await open(browser, '/index.html', { user: TEACH, ls: { bbk_t: '1' } });
    await page.waitForFunction(() => cr._state.acct === 'ok');
    ok(await page.evaluate(() => !cr.sheetLocked()), '練習紙自動解鎖');
    await page.evaluate(() => tc.open()); ok(!(await page.textContent('#app')).includes('🔒 🖨'), '按鈕沒有鎖頭');
    ok(errors.length === 0, '沒有頁面錯誤', errors); await ctx.close(); }

  await browser.close(); server.close();
  console.log(`\n通過 ${pass}，失敗 ${fail}`); process.exit(fail ? 1 : 0);
});
