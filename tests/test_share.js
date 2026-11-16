// 比比看：結算畫面「分享成績」＋「從分享進來」記號（ref）
// 用法：node tests/test_share.js
let chromium; try{ ({ chromium } = require('playwright')); }catch(e){ ({ chromium } = require('/opt/npm-tools/node_modules/playwright')); }
const fs = require('fs'), path = require('path'), http = require('http');
const ROOT = path.join(__dirname, '..');
const MOCK = fs.readFileSync(path.join(__dirname, 'firebase-mock.js'), 'utf8');
let pass = 0, fail = 0;
const ok = (c, n, x) => { if(c){ pass++; console.log('  ✓', n); } else { fail++; console.log('  ✗', n, x !== undefined ? '→ ' + JSON.stringify(x) : ''); } };
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.webp': 'image/webp' };
const server = http.createServer((req, res) => {
  let f = path.normalize(path.join(ROOT, decodeURIComponent(req.url.split('?')[0])));
  if(!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()){ res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
});
const URL_SHARE = 'https://wangchiapin.github.io/compara-y-adivina/?ref=share';
const SK = 'hanziGames.settings';
// 紀錄程式（HGPlays）用的 modular Firebase 換成會記錄寫入的假模組
const FAKE = {
  'firebase-app.js': 'export const initializeApp=()=>({});',
  'firebase-auth.js': "export const getAuth=()=>({currentUser:{uid:'dev1'},authStateReady:async()=>{}}); export const signInAnonymously=async()=>{};",
  'firebase-firestore.js': "const W=()=>((window.__hg ||= []));export const getFirestore=()=>({}); export const serverTimestamp=()=>'TS';" +
    "export const doc=(db,col,id)=>({col,id}); export const collection=(db,col)=>({col});" +
    "export const setDoc=async(r,d)=>{W().push([r.col,'set',d,r.id]);}; export const addDoc=async(c,d)=>{W().push([c.col,'add',d]);return {id:'p1'};}; export const updateDoc=async(r,d)=>{W().push([r.col,'upd',d]);};"
};
const STUB = `(m) => {
  window.__shared=[];window.__copied=[];
  const def=(k,v)=>Object.defineProperty(navigator,k,{value:v,configurable:true});
  def('share',(m==='none'||m==='copyfail')?undefined:async d=>{window.__shared.push(d);
    if(m==='abort'){const e=new Error('c');e.name='AbortError';throw e;}
    if(m==='error'){const e=new Error('b');e.name='NotAllowedError';throw e;}});
  def('clipboard',m==='copyfail'?{writeText:async()=>{throw new Error('no');}}:{writeText:async s=>{window.__copied.push(s);}});
  if(m==='copyfail')document.execCommand=()=>false;
}`;
let BASE;
async function open(browser, url = '/index.html', { ls = {}, init = '' } = {}){
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage(); const errors = [];
  page.on('pageerror', e => errors.push(String(e))); page.on('dialog', d => d.accept());
  await page.route('**/*', r => {
    const u = r.request().url();
    if(u.startsWith('http://localhost')) return r.continue();
    const m = u.match(/gstatic\.com\/firebasejs\/[^/]+\/(firebase-[a-z]+\.js)$/);
    if(m && FAKE[m[1]]) return r.fulfill({ status: 200, contentType: 'application/javascript', body: FAKE[m[1]] });
    return r.abort();
  });
  await page.addInitScript('window.__SEED={};window.__USER=null;' + Object.entries(ls).map(([k, v]) => `localStorage.setItem(${JSON.stringify(k)},${JSON.stringify(v)});`).join('') + init);
  await page.addInitScript(MOCK);
  await page.goto(BASE + url); await page.waitForSelector('.lvl'); await page.waitForTimeout(200);
  return { page, errors, ctx };
}
const settings = (script, lang) => ({ [SK]: JSON.stringify({ v: 1, script, lang, phon: 'pinyin', rate: 'normal' }) });
// 開始第 1 關、答對 n 題後直接結算
async function toResult(page, { score = 40, stub = 'ok' } = {}){
  await page.evaluate("(" + STUB + ")(" + JSON.stringify(stub) + ")");
  await page.evaluate(() => startRound(1, null));
  await page.evaluate(sc => { S.score = sc; S.i = S.qs.length; renderResult(); }, score);
  await page.waitForSelector('.passmsg');
}
const label = page => page.$eval('#shareBtn', e => e.innerText.replace(/\s+/g, ' ').trim());
const recs = page => page.evaluate(() => { const o = { v: [], p: [] }; (window.__hg || []).forEach(x => { if(x[0] === 'visits') o.v.push(x[2]); if(x[0] === 'plays' && x[1] === 'add') o.p.push(x[2]); }); return o; });

server.listen(0, 'localhost', async () => {
  BASE = 'http://localhost:' + server.address().port;
  const browser = await chromium.launch();

  console.log('\n[S1] 按鈕位置與顯示條件');
  { const { page, ctx, errors } = await open(browser);
    await toResult(page);
    const order = await page.$$eval('#app > button.big', es => es.map(e => e.id || e.getAttribute('onclick')));
    const i = order.indexOf('shareBtn');
    ok(i > 0 && /^startRound\(\d\)$/.test(order[i - 1]) && order[i + 1] === 'renderMenu()', '分享鈕在「再玩一次」之後、「主選單」之前', order);
    ok(await page.$eval('#shareBtn', e => !e.classList.contains('btn-restart') && getComputedStyle(e).backgroundColor === 'rgb(255, 255, 255)' && parseFloat(getComputedStyle(e).borderTopWidth) >= 1), '空心外框樣式（白底、有框）');
    ok(await label(page) === '分享成績 Compartir resultado', '按鈕文字', await label(page));
    ok(errors.length === 0, '沒有頁面錯誤', errors); await ctx.close(); }
  { const { page, ctx } = await open(browser);   // 過關時多一顆「下一關」：順序 下一關｜再玩一次｜分享｜主選單
    await toResult(page, { score: 100 });
    const order = await page.$$eval('#app > button.big', es => es.map(e => e.id || e.getAttribute('onclick')));
    ok(order.length === 4 && order[0].startsWith('startRound(2') && order[2] === 'shareBtn' && order[3] === 'renderMenu()', '過關時：下一關｜再玩一次｜分享｜主選單', order); await ctx.close(); }
  { const { page, ctx } = await open(browser);
    await toResult(page, { score: 0 });
    ok(await page.$('#shareBtn') === null, '0 分不顯示'); await ctx.close(); }

  console.log('\n[S2] 一句話：暱稱有無 × 語言 × 繁簡');
  const cases = [
    ['trad', 'es', '', '¡Saqué 40 puntos en 比比看 (Compara y Adivina)! ¿Puedes superarme?'],
    ['trad', 'en', '', 'I scored 40 in 比比看 (Compara y Adivina)! Can you beat me?'],
    ['trad', 'zh', '', '我在比比看拿到 40 分！你能超過我嗎？'],
    ['simp', 'zh', '', '我在比比看拿到 40 分！你能超过我吗？'],
    ['trad', 'es', 'Ana', '¡Soy Ana y saqué 40 puntos en 比比看 (Compara y Adivina)! ¿Puedes superarme?'],
    ['trad', 'en', 'Ana', 'I’m Ana and I scored 40 in 比比看 (Compara y Adivina)! Can you beat me?'],
    ['trad', 'zh', 'Ana', '我是Ana，在比比看拿到 40 分！你能超過我嗎？'],
    ['simp', 'zh', 'Ana', '我是Ana，在比比看拿到 40 分！你能超过我吗？'],
  ];
  for(const [script, lang, nick, want] of cases){
    const { page, ctx } = await open(browser, '/index.html', { ls: settings(script, lang) });
    await toResult(page);
    if(nick) await page.evaluate(n => { window.CLASSROOM.nick = () => n; }, nick);
    const got = await page.evaluate(() => shareMessage());
    ok(got === want, `一句話 ${script}/${lang}/${nick ? '有暱稱' : '無暱稱'}`, got); await ctx.close();
  }
  { const { page, ctx } = await open(browser, '/index.html', { ls: settings('simp', 'en') });
    await toResult(page);
    ok(await label(page) === '分享成绩 Share my score', '按鈕文字跟著語言與繁簡', await label(page)); await ctx.close(); }

  console.log('\n[S3] 按下去：系統分享／玩家關掉／出錯／不支援／複製失敗／連點');
  async function press(stub){ const r = await open(browser); await toResult(r.page, { stub }); await r.page.click('#shareBtn'); await r.page.waitForTimeout(250); return r; }
  { const { page, ctx, errors } = await press('ok');
    const sh = await page.evaluate(() => window.__shared);
    ok(sh.length === 1 && sh[0].url === URL_SHARE, '系統分享：連結是公開頁加 ?ref=share', sh);
    ok(sh[0] && sh[0].text.includes('40') && sh[0].title === '比比看 · Compara y Adivina', '系統分享：一句話與標題', sh);
    ok((await page.evaluate(() => window.__copied)).length === 0 && await label(page) === '分享成績 Compartir resultado', '成功時不複製、按鈕文字不變');
    ok(errors.length === 0, '沒有頁面錯誤', errors); await ctx.close(); }
  { const { page, ctx } = await press('abort');
    ok((await page.evaluate(() => window.__copied)).length === 0 && await label(page) === '分享成績 Compartir resultado', '玩家關掉選單：什麼都不做'); await ctx.close(); }
  { const { page, ctx } = await press('error');
    const cp = await page.evaluate(() => window.__copied);
    ok(cp.length === 1 && cp[0].endsWith('\n' + URL_SHARE), '分享出錯：改複製「一句話＋連結」', cp);
    ok(await label(page) === '已複製，可以貼給朋友 Copiado, ¡pégalo a un amigo!', '顯示已複製', await label(page));
    await page.waitForTimeout(2400);
    ok(await label(page) === '分享成績 Compartir resultado', '2 秒後復原', await label(page)); await ctx.close(); }
  { const { page, ctx } = await press('none');
    ok((await page.evaluate(() => window.__copied)).length === 1, '不支援分享選單：改複製'); await ctx.close(); }
  { const { page, ctx, errors } = await press('copyfail');
    ok(await label(page) === '複製失敗 No se pudo copiar' && errors.length === 0, '複製也失敗：顯示失敗、不出錯', await label(page)); await ctx.close(); }
  { const { page, ctx } = await open(browser); await toResult(page);
    await page.evaluate(() => { document.getElementById('shareBtn').click(); document.getElementById('shareBtn').click(); }); await page.waitForTimeout(250);
    ok((await page.evaluate(() => window.__shared)).length === 1, '連點兩下只送一次'); await ctx.close(); }
  { const { page, ctx } = await open(browser); await toResult(page);
    await page.click('#app button.big:has-text("再玩一次")'); await page.waitForTimeout(200);
    ok(await page.evaluate(() => screen === 'game' && S.score === 0), '按「再玩一次」仍然正常開新局'); await ctx.close(); }
  { const { page, ctx } = await open(browser, '/index.html?class=class0000aaaa'); await page.waitForTimeout(300);
    ok(true, '班級連結頁面可開啟（不測回傳）'); await ctx.close(); }

  console.log('\n[R] 從分享進來的記號（ref）寫進 visits／plays');
  async function played(qs, init){
    const r = await open(browser, '/index.html' + qs, { init: init || '' });
    await r.page.evaluate(() => startRound(1, null)); await r.page.waitForTimeout(3000);
    r.rec = await recs(r.page); return r;
  }
  { const r = await played('?ref=share');
    ok(r.rec.v.length === 1 && r.rec.v[0].ref === 'share' && r.rec.v[0].game === 'compara', '?ref=share：訪客紀錄帶 ref', r.rec.v);
    ok(r.rec.p.length === 1 && r.rec.p[0].ref === 'share', '?ref=share：遊玩紀錄帶 ref', r.rec.p);
    ok(r.errors.length === 0, '沒有頁面錯誤', r.errors); await r.ctx.close(); }
  { const r = await played('');
    ok(r.rec.v.length === 1 && !('ref' in r.rec.v[0]) && r.rec.p.length === 1 && !('ref' in r.rec.p[0]), '沒有 ref：紀錄不帶 ref 欄位', r.rec); await r.ctx.close(); }
  for(const [q, want] of [['?ref=SHARE', 'share'], ['?ref=Ig_story-1', 'ig_story-1'], ['?ref=' + 'a'.repeat(17), null], ['?ref=', null], ['?ref=a%20b', null], ['?ref=%3Cscript%3E', null], ['?ref=a.b', null]]){
    const r = await played(q); const v = r.rec.v[0] || {};
    ok(want === null ? !('ref' in v) : v.ref === want, `ref 參數 ${q} → ${want}`, v); await r.ctx.close();
  }
  { const r = await played('', "try{sessionStorage.setItem('hg.ref','share')}catch(e){}");
    ok(r.rec.v[0] && r.rec.v[0].ref === 'share' && r.rec.p[0] && r.rec.p[0].ref === 'share', '網址沒有 ref、分頁暫存有 → 也帶', r.rec); await r.ctx.close(); }
  { const r = await played('?ref=share', "Object.defineProperty(window,'sessionStorage',{get(){throw new Error('blocked')}})");
    ok(r.rec.v[0] && r.rec.v[0].ref === 'share' && r.errors.length === 0, '暫存壞掉但網址有 ref：仍帶 ref、不出錯', [r.rec, r.errors]); await r.ctx.close(); }

  await browser.close(); server.close();
  console.log(`\n通過 ${pass}，失敗 ${fail}`); process.exit(fail ? 1 : 0);
});
