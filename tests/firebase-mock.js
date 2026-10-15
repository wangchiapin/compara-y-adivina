/* 模擬 Firebase compat SDK（記憶體內），改自 corre/tests/firebase-mock.js。
   測試在載入頁面前設定：
     window.__SEED = { projectId: { collection: { docId: data } } }
     window.__USER = null（未登入）或 { uid, email, isAnonymous }
     window.__GOOGLE = 按「用 Google 登入」後變成的使用者
   另外模擬 class_plays 的寫入規則（班級存在、owner 相符、老師訂閱中、欄位格式），用來測試失敗路徑。 */
(function(){
  const SEED = window.__SEED || {};
  const DB = {};
  window.__reads = {}; window.__writes = [];
  const clone = v => JSON.parse(JSON.stringify(v));
  Object.keys(SEED).forEach(pid => { DB[pid] = clone(SEED[pid]); });
  const col = (pid, c) => (DB[pid] = DB[pid] || {}, DB[pid][c] = DB[pid][c] || {});
  let seq = 0;
  const deny = () => { const e = new Error('Missing or insufficient permissions.'); e.code = 'permission-denied'; throw e; };
  const NOW = () => Date.now();
  function stamp(d){ const o = {}; for(const k in d) o[k] = (d[k] && d[k].__ts) ? NOW() : d[k]; return o; }
  function checkWrite(pid, c, id, data, user){
    if(c === 'bbk_reports') return checkReport(data, user);
    if(c !== 'class_plays') return;
    const d = data, keys = Object.keys(d).sort().join();
    if(keys !== ['at','cid','game','h','lv','max','nick','owner','qs','r','rg','score','th'].sort().join()) deny();
    const cls = col(pid, 'classes')[d.cid]; if(!cls || cls.owner !== d.owner) deny();
    const p = col(pid, 'site_plans')[d.owner]; if(!p || !(p.expiresAt > NOW())) deny();
    if(!user) deny();
    if(typeof d.r !== 'string' || !/^([a-z0-9]{8,32})?$/.test(d.r)) deny();
    if(d.game !== 'bbk' || !/^[a-f0-9]{16}$/.test(d.h) || !(d.nick.length >= 1 && d.nick.length <= 16)) deny();
    if(!(d.lv >= 1 && d.lv <= 3) || !(d.score >= 0 && d.score <= d.max) || !(d.qs.length >= 1 && d.qs.length <= 30)) deny();
  }
  // 比比看第 4 批：題目回報 bbk_reports（同規則：已登入含匿名、欄位固定、長度限制）；window.__FAIL_REPORT = true 模擬失敗
  function checkReport(d, user){
    if(window.__FAIL_REPORT){ const e = new Error('offline'); e.code = 'unavailable'; throw e; }
    if(!user) deny();
    const keys = Object.keys(d).sort().join();
    if(keys !== ['why','note','type','d','f','ids','q','ans','pick','lv','r','th','lang','ver','done','at'].sort().join()) deny();
    const str = (v, n) => typeof v === 'string' && v.length <= n;
    if(!['wrong','image','other'].includes(d.why) || !str(d.note, 100) || !str(d.type, 10) || !str(d.d, 20) || !str(d.f, 10)) deny();
    if(!Array.isArray(d.ids) || d.ids.length < 1 || d.ids.length > 6 || !str(d.q, 300) || !str(d.ans, 100) || !str(d.pick, 100)) deny();
    if(!(Number.isInteger(d.lv) && d.lv >= 1 && d.lv <= 3) || !/^([a-z0-9]{8,32})?$/.test(d.r) || !str(d.th, 20)) deny();
    if(!['es','en','zh'].includes(d.lang) || !str(d.ver, 12) || d.done !== false) deny();
  }
  function docSnap(pid, c, id){
    const data = col(pid, c)[id];
    return { id, exists: data !== undefined, data: () => (data === undefined ? undefined : clone(data)) };
  }
  let auth = null;
  function Query(pid, c, filters, lim){
    return {
      where: (f, op, v) => Query(pid, c, filters.concat([[f, op, v]]), lim),
      limit: n => Query(pid, c, filters, n),
      get: async () => {
        let ids = Object.keys(col(pid, c)).filter(id => filters.every(([f, op, v]) => op === '==' && col(pid, c)[id][f] === v));
        if(c === 'class_plays' && !filters.some(([f, , v]) => f === 'owner' && auth.currentUser && v === auth.currentUser.uid)) deny();
        if(lim != null) ids = ids.slice(0, lim);
        window.__reads[pid] = (window.__reads[pid] || 0) + Math.max(1, ids.length);
        const docs = ids.map(id => docSnap(pid, c, id));
        return { docs, empty: !docs.length, size: docs.length, forEach: fn => docs.forEach(fn) };
      }
    };
  }
  function makeFirestore(pid){
    const ref = (c, id) => ({
      id,
      get: async () => { window.__reads[pid] = (window.__reads[pid] || 0) + 1; return docSnap(pid, c, id); },
      set: async d => { const v = stamp(d); checkWrite(pid, c, id, v, auth.currentUser); col(pid, c)[id] = clone(v); window.__writes.push(c + '/' + id); },
      delete: async () => { delete col(pid, c)[id]; window.__writes.push('del ' + c + '/' + id); }
    });
    return {
      collection: c => Object.assign(Query(pid, c, [], null), {
        doc: id => ref(c, id),
        add: async d => { const id = 'auto' + (++seq); await ref(c, id).set(d); return { id }; }
      }),
      batch: () => { const ops = []; return {
        set: (r, d) => ops.push(() => r.set(d)), delete: r => ops.push(() => r.delete()),
        commit: async () => { for(const o of ops) await o(); } }; }
    };
  }
  function makeAuth(){
    const cbs = [];
    const a = {
      currentUser: window.__USER || null,
      onAuthStateChanged: fn => { cbs.push(fn); setTimeout(() => fn(a.currentUser), 0); },
      signInAnonymously: async () => { a.currentUser = { uid: 'anon' + Math.random().toString(36).slice(2, 7), isAnonymous: true }; cbs.forEach(f => f(a.currentUser)); },
      signInWithPopup: async () => { a.currentUser = window.__GOOGLE; cbs.forEach(f => f(a.currentUser)); },
      signInWithRedirect: async () => {},
      signOut: async () => { a.currentUser = null; cbs.forEach(f => f(null)); }
    };
    return a;
  }
  const apps = {};
  window.firebase = {
    initializeApp(cfg, name){
      const n = name || '[DEFAULT]'; if(apps[n]) throw new Error('app exists: ' + n);
      const fs = makeFirestore(cfg.projectId); auth = makeAuth();
      apps[n] = { name: n, options: cfg, firestore: () => fs, auth: () => auth };
      window.__apps = Object.keys(apps).map(k => k + ':' + apps[k].options.projectId);
      return apps[n];
    },
    auth: Object.assign(() => apps['[DEFAULT]'].auth(), { GoogleAuthProvider: function(){} }),
    firestore: Object.assign(() => apps['[DEFAULT]'].firestore(), { FieldValue: { serverTimestamp: () => ({ __ts: 1 }) } })
  };
  window.__DB = DB;
})();
