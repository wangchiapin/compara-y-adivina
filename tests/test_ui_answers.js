// 比比看 畫面作答測試（補洞）。用法：node tests/test_ui_answers.js
// 與 test_game.js 不同：這裡「真的用滑鼠點畫面」，不呼叫 pickCard／pickBtn。
// 內容：每種題型（decode tf pick more fill adj whobi biwho chain most）各答對一次、答錯一次；
//       答兩次錯；離開確認（取消／確定）；改暱稱；?preview。
let chromium; try{ ({ chromium } = require('playwright')); }catch(e){ ({ chromium } = require('/opt/npm-tools/node_modules/playwright')); }
const fs = require('fs'), path = require('path'), http = require('http');
const ROOT = path.join(__dirname, '..');
const MOCK = fs.readFileSync(path.join(__dirname, 'firebase-mock.js'), 'utf8');
let pass = 0, fail = 0;
function ok(c, name, extra){ if(c){ pass++; console.log('  ✓', name); } else { fail++; console.log('  ✗', name, extra !== undefined ? '→ ' + JSON.stringify(extra) : ''); } }
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.webp': 'image/webp' };
const server = http.createServer((req, res) => {
  let f = path.normalize(path.join(ROOT, decodeURIComponent(req.url.split('?')[0])));
  if(!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()){ res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
});
const CID = 'class0000aaaa';
const SEED = () => ({ 'subscription-48d3c': {
  portalStatus: {},
  classes: { [CID]: { owner: 'u1', slot: 0, name: '週三班', showBoard: false, updatedAt: 1 } },
  teacher_classes: { u1: { slots: { '0': CID }, updatedAt: 1 } },
  site_plans: { u1: { plan: 'year', expiresAt: Date.now() + 30 * 86400000 } }, class_plays: {}, shared_bbk: {} } });
let BASE;
// dialogs：收集 confirm 訊息；dialogAction 決定按確定或取消
async function open(browser, url, { ls = {} } = {}){
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage(); const errors = []; const dialogs = []; const st = { accept: true };
  page.on('pageerror', e => errors.push(String(e)));
  page.on('dialog', d => { dialogs.push(d.message()); st.accept ? d.accept() : d.dismiss(); });
  await page.route('**/*', r => r.request().url().startsWith('http://localhost') ? r.continue() : r.abort());
  await page.addInitScript(`window.__SEED=${JSON.stringify(SEED())};window.__USER=null;` +
    Object.entries(ls).map(([k, v]) => `localStorage.setItem(${JSON.stringify(k)},${JSON.stringify(v)});`).join(''));
  await page.addInitScript(MOCK);
  await page.goto(BASE + url);
  return { page, errors, ctx, dialogs, st };
}
const db = page => page.evaluate(() => window.__DB['subscription-48d3c']);
// 開一個指定題型的回合（只出該題型），回到第 1 題
const start = (page, lv, type, n = 3) => page.evaluate(([lv, type, n]) => startRound(lv, { lv, dims: [], types: [type], n }), [lv, type, n]);
// 目前這題的資訊（只讀，用來知道該點哪一個）
const info = page => page.evaluate(() => { const q = S.qs[S.i], btn = !!q.btns, n = btn ? q.btns.length : q.its.length;
  const ci = btn ? q.btns.findIndex(b => b.ok) : q.its.findIndex(p => p.id === q.ans);
  return { type: q.type, btn, n, ci, wrongs: [...Array(n).keys()].filter(j => j !== ci), score: S.score, i: S.i, total: S.qs.length }; });
const sel = (btn, i) => btn ? `.ob[data-b="${i}"]` : `.card[data-i="${i}"]`;
const click = async (page, btn, i) => { await page.locator(sel(btn, i)).click(); };
const fbText = page => page.locator('#fb').innerText();
const stateOf = page => page.evaluate(() => ({ done: S.done, gain: S.gain, score: S.score, tries: S.tries }));

const TYPES = [[1, 'decode'], [1, 'tf'], [1, 'pick'], [1, 'more'], [1, 'fill'], [1, 'adj'], [2, 'whobi'], [2, 'biwho'], [3, 'chain'], [3, 'most']];

server.listen(0, 'localhost', async () => {
  BASE = 'http://localhost:' + server.address().port;
  const browser = await chromium.launch();

  console.log('\n[U1] 每種題型：用滑鼠答對一次（第一次就對 +10）');
  for(const [lv, type] of TYPES){
    const { page, errors, ctx } = await open(browser, '/index.html'); await page.waitForSelector('.lvl');
    await start(page, lv, type);
    const q = await info(page);
    ok(q.type === type, `${type}：開出來的真的是這個題型`, q.type);
    await click(page, q.btn, q.ci);
    const s = await stateOf(page); const t = await fbText(page);
    ok(s.done && s.gain === 10 && s.score === 10, `${type}：答對 → 完成、得 10 分、總分 10`, s);
    ok(t.includes('答對了') && t.includes('+10'), `${type}：回饋顯示「答對了 +10」`, t.slice(0, 40));
    ok(await page.locator(sel(q.btn, q.ci) + '.right').count() === 1, `${type}：正確選項標成綠色 right`);
    ok((await page.locator('.top b').first().innerText()) === '10', `${type}：上方分數顯示 10`);
    // 作答完再點別的選項：不會再加分、也不會多出錯誤標記
    await click(page, q.btn, q.wrongs[0]);
    const s2 = await stateOf(page);
    ok(s2.score === 10 && await page.locator('.wrong').count() === 0, `${type}：答完再點別的選項沒有作用`, s2);
    // 下一題
    await page.locator('#fb .big').click();
    const q2 = await info(page);
    ok(q2.i === 1 && q2.score === 10 && (await page.locator('.top .grow').innerText()).includes('2 / 3'), `${type}：按「下一題」進到第 2 題、分數保留`, q2);
    ok(errors.length === 0, `${type}：沒有頁面錯誤`, errors); await ctx.close();
  }

  console.log('\n[U2] 每種題型：用滑鼠先答錯一次');
  for(const [lv, type] of TYPES){
    const { page, errors, ctx } = await open(browser, '/index.html'); await page.waitForSelector('.lvl');
    await start(page, lv, type);
    const q = await info(page);
    await click(page, q.btn, q.wrongs[0]);
    const s = await stateOf(page); const t = await fbText(page);
    ok(await page.locator(sel(q.btn, q.wrongs[0]) + '.wrong').count() === 1, `${type}：點錯的選項標成 wrong`);
    if(q.n <= 2){   // 只有兩個選項：錯一次就結束，不給第二次機會
      ok(s.done && s.gain === 0 && s.score === 0, `${type}（${q.n} 選項）：答錯一次直接結束、0 分`, s);
      ok(t.includes('正確答案') && !t.includes('答對了'), `${type}：顯示「正確答案」`, t.slice(0, 40));
      ok(await page.locator(sel(q.btn, q.ci) + '.right').count() === 1, `${type}：把正確答案標成綠色`);
    }else{
      ok(!s.done && s.tries === 1 && s.score === 0, `${type}（${q.n} 選項）：答錯一次可以再試`, s);
      ok(t.includes('不對，再試一次'), `${type}：顯示「不對，再試一次」`, t.slice(0, 40));
      ok(await page.locator('#fb .big').count() === 0, `${type}：還沒答完，沒有「下一題」按鈕`);
      // 再點一次同一個錯的：沒作用
      await click(page, q.btn, q.wrongs[0]);
      ok((await stateOf(page)).tries === 1, `${type}：同一個錯的選項點兩次不重複計次`);
      await click(page, q.btn, q.ci);
      const s2 = await stateOf(page);
      ok(s2.done && s2.gain === 5 && s2.score === 5, `${type}：第二次答對 → 只得 5 分`, s2);
      ok((await fbText(page)).includes('答對了') && (await fbText(page)).includes('+5'), `${type}：回饋顯示「答對了 +5」`);
    }
    ok(errors.length === 0, `${type}：沒有頁面錯誤`, errors); await ctx.close();
  }

  console.log('\n[U3] 三個以上選項：連錯兩次 → 0 分並公布答案');
  for(const [lv, type] of TYPES){
    const { page, ctx } = await open(browser, '/index.html'); await page.waitForSelector('.lvl');
    await start(page, lv, type);
    const q = await info(page); if(q.n <= 2){ await ctx.close(); continue; }
    await click(page, q.btn, q.wrongs[0]); await click(page, q.btn, q.wrongs[1]);
    const s = await stateOf(page); const t = await fbText(page);
    ok(s.done && s.gain === 0 && s.score === 0, `${type}：連錯兩次 → 結束、0 分`, s);
    ok(t.includes('正確答案') && await page.locator(sel(q.btn, q.ci) + '.right').count() === 1, `${type}：公布正確答案並標綠`, t.slice(0, 30));
    await ctx.close();
  }

  console.log('\n[U4] 整回合用滑鼠打完（對錯交錯）→ 結果畫面分數與畫面一致');
  { const { page, errors, ctx } = await open(browser, '/index.html'); await page.waitForSelector('.lvl');
    await page.locator('.lvl').first().click();     // 真的按第 1 關
    const total = (await info(page)).total; let expect = 0;
    for(let k = 0; k < total; k++){
      const q = await info(page);
      if(k % 3 === 0){ await click(page, q.btn, q.ci); expect += 10; }
      else if(k % 3 === 1){ await click(page, q.btn, q.wrongs[0]); if(q.n > 2){ await click(page, q.btn, q.ci); expect += 5; } }
      else { await click(page, q.btn, q.wrongs[0]); if(q.n > 2) await click(page, q.btn, q.wrongs[1]); }
      await page.locator('#fb .big').click();
    }
    const txt = await page.locator('.score').innerText();
    ok(txt.replace(/\s/g, '') === `${expect}/${total * 10}`, `結果畫面分數 = 滑鼠實際得分 ${expect}/${total * 10}`, txt);
    ok(await page.locator('.comment').count() === 1 && await page.locator('.passmsg').count() === 1, '有評語與過關訊息');
    ok(errors.length === 0, '沒有頁面錯誤', errors); await ctx.close(); }

  console.log('\n[U5] 離開確認（✕）');
  { const { page, errors, ctx, dialogs, st } = await open(browser, '/index.html', { ls: { 'hanziGames.settings': JSON.stringify({ v: 1, script: 'trad', lang: 'es', phon: 'pinyin' }) } });
    await page.waitForSelector('.lvl'); await page.locator('.lvl').nth(1).click();
    st.accept = false; await page.locator('.pillx').click();   // 按「取消」
    ok(dialogs.length === 1 && dialogs[0].includes('要離開這一回合嗎') && dialogs[0].includes('¿Salir de esta ronda?'), '確認視窗：中文＋西文', dialogs);
    ok(await page.evaluate(() => S !== null && screen === 'game') && await page.locator('.top').count() === 1, '按取消 → 還在遊戲中，題目沒變');
    // 答一題後再按取消，分數不受影響
    const q = await info(page); await click(page, q.btn, q.ci);
    st.accept = false; await page.locator('.pillx').click();
    ok((await stateOf(page)).score === 10, '答對後按離開再取消：分數保留 10');
    st.accept = true; await page.locator('.pillx').click();
    await page.waitForSelector('.lvl');
    ok(await page.evaluate(() => S === null && screen === 'menu'), '按確定 → 回主選單');
    ok(await page.locator('h3:has-text("選擇難度")').count() === 1, '主選單顯示選擇難度');
    // 離開不算「玩完」：沒有結果畫面
    ok(await page.locator('.score').count() === 0, '離開後沒有出現結果畫面');
    ok(errors.length === 0, '沒有頁面錯誤', errors); await ctx.close(); }
  { // 只有中文：確認訊息沒有西文
    const { page, ctx, dialogs } = await open(browser, '/index.html', { ls: { 'hanziGames.settings': JSON.stringify({ v: 1, script: 'trad', lang: 'zh', phon: 'off' }) } });
    await page.waitForSelector('.lvl'); await page.locator('.lvl').first().click(); await page.locator('.pillx').click();
    ok(dialogs.length === 1 && dialogs[0] === '要離開這一回合嗎？', '只有中文：確認訊息只有中文', dialogs); await ctx.close(); }
  { // 班級連結：中途離開不回傳成績
    const { page, ctx, dialogs } = await open(browser, '/index.html?class=' + CID, { ls: { ['bbk_nick_' + CID]: 'Leo' } });
    await page.waitForSelector('.clsb .clsrow b'); await page.locator('.lvl').first().click();
    const q = await info(page); await click(page, q.btn, q.ci);
    await page.locator('.pillx').click(); await page.waitForSelector('.lvl'); await page.waitForTimeout(300);
    ok(Object.keys((await db(page)).class_plays).length === 0, '班級連結：中途離開 → 不寫入成績'); await ctx.close(); }

  console.log('\n[U6] 改暱稱（班級連結）');
  { const KEY = 'bbk_nick_' + CID;
    const { page, errors, ctx } = await open(browser, '/index.html?class=' + CID, { ls: { [KEY]: 'Leo' } });
    await page.waitForSelector('.clsb .clsrow b');
    ok((await page.locator('.clsb .clsrow b').innerText()) === 'Leo', '已存的暱稱 Leo 顯示出來');
    await page.locator('.lvl').first().click();
    let q; const total = (await info(page)).total;   // 先用 Leo 打一整回合
    for(let k = 0; k < total; k++){ q = await info(page); await click(page, q.btn, q.ci); await page.locator('#fb .big').click(); }
    await page.waitForSelector('#clsUp .clsup.ok');
    let plays = Object.values((await db(page)).class_plays);
    ok(plays.length === 1 && plays[0].nick === 'Leo', '第一回合以 Leo 回傳', plays.map(p => p.nick));
    const hLeo = plays[0].h;
    await page.locator('.big.sec:has-text("主選單")').click();
    await page.locator('.clsb .tmini').click();                       // 按「更改」
    ok(await page.locator('#nickIn').count() === 1 && await page.evaluate(k => localStorage.getItem(k), KEY) === null, '按「更改」→ 出現輸入框、舊暱稱從本機清掉');
    ok(await page.evaluate(() => document.activeElement && document.activeElement.id) === 'nickIn', '輸入框自動取得焦點');
    await page.locator('.lvl').first().click();
    ok(await page.evaluate(() => S === null) && (await page.textContent('.nickmsg')).includes('請先輸入暱稱'), '清掉暱稱後不能開始，提示先輸入');
    await page.locator('#nickIn').fill('   '); await page.locator('.clsb .opt.on').click();
    ok(await page.locator('#nickIn').count() === 1 && (await page.textContent('.nickmsg')).includes('請先輸入暱稱'), '只輸入空白 → 不接受');
    await page.locator('#nickIn').fill('y'.repeat(30)); await page.locator('.clsb .opt.on').click();
    ok((await page.locator('.clsb .clsrow b').innerText()) === 'y'.repeat(16), '暱稱最多 16 字（超過被截掉）');
    await page.locator('.clsb .tmini').click();
    await page.locator('#nickIn').fill('  Ana   María '); await page.locator('#nickIn').press('Enter');   // 用 Enter 送出
    const shown = await page.locator('.clsb .clsrow b').innerText();
    ok(shown === 'Ana María', '新暱稱：前後空白去掉、中間多個空白合成一個', shown);
    ok(await page.evaluate(k => localStorage.getItem(k), KEY) === shown, '新暱稱存到本機');
    await page.locator('.lvl').nth(0).click();
    for(let k = 0; k < total; k++){ q = await info(page); await click(page, q.btn, q.ci); await page.locator('#fb .big').click(); }
    await page.waitForFunction(() => document.querySelector('#clsUp .clsup.ok'));
    await page.waitForFunction(() => Object.keys(window.__DB['subscription-48d3c'].class_plays).length === 2);
    plays = Object.values((await db(page)).class_plays);
    const p2 = plays.find(p => p.nick !== 'Leo');
    ok(p2 && p2.nick === shown && p2.h !== hLeo && /^[a-f0-9]{16}$/.test(p2.h), '第二回合以新暱稱回傳，雜湊和 Leo 不同', plays.map(p => p.nick));
    ok(errors.length === 0, '沒有頁面錯誤', errors); await ctx.close(); }

  console.log('\n[U7] ?preview（老師預覽）');
  { const { page, errors, ctx } = await open(browser, '/index.html?preview=1'); await page.waitForSelector('.lvl');
    await page.locator('.lvl').first().click(); const total = (await info(page)).total;
    for(let k = 0; k < total; k++){ const q = await info(page); await click(page, q.btn, q.ci); await page.locator('#fb .big').click(); }
    await page.waitForSelector('.score');
    ok((await page.locator('.score').innerText()).replace(/\s/g, '') === `${total * 10}/${total * 10}`, '?preview 單獨：可以正常玩完整回合');
    await page.waitForTimeout(400);
    ok(await page.evaluate(() => !window.__apps), '?preview 單獨：沒有載入 Firebase（不連班級）');
    ok(await page.locator('#clsUp').innerText() === '', '?preview 單獨：結果畫面沒有「成績已回傳」');
    ok(errors.length === 0, '沒有頁面錯誤', errors); await ctx.close(); }
  { // ?class + ?preview 並用：老師預覽不記成績（2026-10-30 Ben 決定）
    const { page, ctx } = await open(browser, '/index.html?class=' + CID + '&preview=1', { ls: { ['bbk_nick_' + CID]: 'Leo' } });
    await page.waitForSelector('.clsb .clsrow b'); await page.locator('.lvl').first().click(); const total = (await info(page)).total;
    for(let k = 0; k < total; k++){ const q = await info(page); await click(page, q.btn, q.ci); await page.locator('#fb .big').click(); }
    await page.waitForTimeout(800);
    const plays = (await db(page)).class_plays || {};
    ok(Object.keys(plays).length === 0, '?class + ?preview 並用：玩完不寫入 class_plays（寫入筆數 ' + Object.keys(plays).length + '）');
    ok(await page.locator('#clsUp').innerText() === '', '?class + ?preview 並用：結果畫面沒有「成績已回傳」');
    await ctx.close(); }
  { // 對照：同樣玩法但沒有 ?preview → 會寫入（確認上面不是因為測試本身沒寫入）
    const { page, ctx } = await open(browser, '/index.html?class=' + CID, { ls: { ['bbk_nick_' + CID]: 'Leo' } });
    await page.waitForSelector('.clsb .clsrow b'); await page.locator('.lvl').first().click(); const total = (await info(page)).total;
    for(let k = 0; k < total; k++){ const q = await info(page); await click(page, q.btn, q.ci); await page.locator('#fb .big').click(); }
    await page.waitForTimeout(800);
    ok(Object.keys((await db(page)).class_plays || {}).length === 1, '對照：?class 沒有 preview → 寫入 1 筆');
    await ctx.close(); }

  console.log(`\n通過 ${pass}，失敗 ${fail}`); await browser.close(); server.close(); process.exit(fail ? 1 : 0);
});
