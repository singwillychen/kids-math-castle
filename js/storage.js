/* 存檔模組
   一定會存：這台裝置的瀏覽器（localStorage）
   選用一：NAS／電腦伺服器（用 server.py 開網站時自動啟用，多台裝置共用）
   選用二：網路硬碟資料夾（Chrome／Edge 電腦版，選一個資料夾自動寫入 JSON） */
(function () {
  const DB_KEY = 'princess-frog-math-db-v2';
  const DEVICE_KEY = 'princess-frog-math-device-v1';
  const OLD_STATE_KEY = 'princess-frog-math-v1';
  const OLD_LOG_KEY = 'princess-frog-math-log-v1';
  const LOG_MAX = 1500;

  const db = { settings: { pinHash: '', deleted: {}, updated: 0 }, profiles: {} };
  const device = { voice: false, sound: true, activeId: null };
  const st = { server: 'off', folder: 'off', folderName: '', lastSync: 0, error: '' };
  const dirty = new Set();          // 等待寫到伺服器／資料夾的 profile id
  let settingsDirty = false, flushTimer = null, dirHandle = null;
  const listeners = [];

  const readJSON = k => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } };
  const writeJSON = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } };
  const newId = () => 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const emit = () => listeners.forEach(fn => { try { fn(); } catch (e) { /* 忽略 */ } });

  /* ---------- 合併（多個存檔來源時） ---------- */
  function mergeProfile(a, b) {
    if (!a) return b;
    if (!b) return a;
    const newer = (b.updated || 0) > (a.updated || 0) ? b : a;
    const seen = new Set();
    const log = [].concat(a.log || [], b.log || []).filter(x => {
      const k = x.t + '|' + x.q;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    }).sort((x, y) => x.t - y.t).slice(-LOG_MAX);
    return Object.assign({}, newer, { log });
  }
  // 回傳 true 代表遠端比本機舊或缺資料，需要回寫
  function mergeIn(remote) {
    if (!remote) return false;
    let needPush = false;
    const rs = remote.settings || {};
    const deleted = Object.assign({}, db.settings.deleted, rs.deleted || {});
    if ((rs.updated || 0) > (db.settings.updated || 0)) Object.assign(db.settings, rs);
    else if ((rs.updated || 0) < (db.settings.updated || 0)) needPush = true;
    db.settings.deleted = deleted;
    const rp = remote.profiles || {};
    Object.keys(rp).forEach(id => {
      if (deleted[id]) return;
      const before = db.profiles[id];
      db.profiles[id] = mergeProfile(before, rp[id]);
      if (before && ((before.updated || 0) > (rp[id].updated || 0) || (before.log || []).length > (rp[id].log || []).length)) dirty.add(id);
    });
    Object.keys(db.profiles).forEach(id => {
      if (deleted[id]) { delete db.profiles[id]; return; }
      if (!rp[id]) dirty.add(id);
    });
    if (needPush) settingsDirty = true;
    return needPush || dirty.size > 0;
  }

  /* ---------- 本機 ---------- */
  function loadLocal() {
    const saved = readJSON(DB_KEY);
    if (saved && saved.profiles) {
      Object.assign(db.settings, saved.settings || {});
      db.profiles = saved.profiles;
    } else {
      migrateV1();
    }
    Object.assign(device, readJSON(DEVICE_KEY) || {});
  }
  // 第一、二版只有一位小朋友：把舊資料搬成第一個帳號
  function migrateV1() {
    const old = readJSON(OLD_STATE_KEY), oldLog = readJSON(OLD_LOG_KEY);
    if (!old && !oldLog) return;
    const id = newId();
    db.profiles[id] = {
      id, name: '小朋友', avatar: { type: 'emoji', v: '🐸', bg: '#dff5e3' },
      age: (old && old.age) || 'k2', stars: (old && old.stars) || 0, roundLen: (old && old.roundLen) || 5,
      log: Array.isArray(oldLog) ? oldLog : [], created: Date.now(), updated: Date.now()
    };
    if (old) { device.voice = !!old.voice; device.sound = old.sound !== false; }
    device.activeId = id;
    saveLocal();
    writeJSON(DEVICE_KEY, device);
  }
  function saveLocal() { writeJSON(DB_KEY, db); }

  /* ---------- 伺服器（server.py） ---------- */
  async function fetchJSON(url, opts, ms) {
    const ctl = window.AbortController ? new AbortController() : null;
    const t = setTimeout(() => ctl && ctl.abort(), ms || 4000);
    try {
      const r = await fetch(url, Object.assign({ cache: 'no-store', signal: ctl && ctl.signal }, opts || {}));
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return await r.json();
    } finally { clearTimeout(t); }
  }
  async function detectServer() {
    if (!/^https?:$/.test(location.protocol)) return false;
    try {
      const r = await fetchJSON('api/ping', null, 1500);
      return !!(r && r.app === 'math-castle');
    } catch (e) { return false; }
  }
  const putJSON = (url, body) => fetchJSON(url, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

  /* ---------- 網路硬碟資料夾（File System Access API） ---------- */
  const folderSupported = () => typeof window.showDirectoryPicker === 'function';
  function idb() {
    return new Promise((res, rej) => {
      const r = indexedDB.open('math-castle', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('kv');
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
  }
  async function idbDo(mode, fn) {
    const d = await idb();
    return new Promise((res, rej) => {
      const q = fn(d.transaction('kv', mode).objectStore('kv'));
      q.onsuccess = () => res(q.result);
      q.onerror = () => rej(q.error);
    });
  }
  async function readFolder() {
    const out = { settings: null, profiles: {} };
    for await (const [name, h] of dirHandle.entries()) {
      if (h.kind !== 'file' || !/\.json$/.test(name)) continue;
      try {
        const data = JSON.parse(await (await h.getFile()).text());
        if (name === 'settings.json') out.settings = data;
        else if (/^profile-[\w-]+\.json$/.test(name) && data && data.id) out.profiles[data.id] = data;
      } catch (e) { /* 壞檔就略過 */ }
    }
    return out;
  }
  async function writeFile(name, obj) {
    const fh = await dirHandle.getFileHandle(name, { create: true });
    const w = await fh.createWritable();
    await w.write(JSON.stringify(obj, null, 1));
    await w.close();
  }
  async function attachFolder(handle) {
    dirHandle = handle;
    st.folderName = handle.name;
    mergeIn(await readFolder());
    st.folder = 'ok';
    saveLocal();
    // 第一次連結：把全部帳號寫進資料夾
    Object.keys(db.profiles).forEach(id => dirty.add(id));
    settingsDirty = true;
  }

  /* ---------- 同步 ---------- */
  function schedule() {
    clearTimeout(flushTimer);
    flushTimer = setTimeout(flush, 800);
  }
  async function flush() {
    if (!dirty.size && !settingsDirty) return;
    const ids = Array.from(dirty);
    const doSettings = settingsDirty;
    let ok = true;
    if (st.server === 'ok' || st.server === 'error') {
      try {
        if (doSettings) await putJSON('api/settings', db.settings);
        for (const id of ids) if (db.profiles[id]) await putJSON('api/profile/' + id, db.profiles[id]);
        st.server = 'ok';
      } catch (e) { st.server = 'error'; st.error = '伺服器連線失敗，資料先存在這台裝置。'; ok = false; }
    }
    if (st.folder === 'ok') {
      try {
        if (doSettings) await writeFile('settings.json', db.settings);
        for (const id of ids) if (db.profiles[id]) await writeFile(`profile-${id}.json`, db.profiles[id]);
      } catch (e) { st.folder = 'needs-permission'; ok = false; }
    }
    if (ok) {
      ids.forEach(id => dirty.delete(id));
      if (doSettings) settingsDirty = false;
      st.lastSync = Date.now();
      st.error = '';
    }
    emit();
  }
  setInterval(() => { if (dirty.size || settingsDirty) flush(); }, 30000);

  /* ---------- 對外 API ---------- */
  const Store = {
    db, device, LOG_MAX,
    status: () => Object.assign({ folderSupported: folderSupported(), pending: dirty.size + (settingsDirty ? 1 : 0) }, st),
    onChange(fn) { listeners.push(fn); },

    async init() {
      loadLocal();
      if (await detectServer()) {
        st.server = 'ok';
        try {
          if (mergeIn(await fetchJSON('api/db'))) schedule();
          saveLocal();
          st.lastSync = Date.now();
        } catch (e) { st.server = 'error'; }
      }
      if (folderSupported()) {
        try {
          const h = await idbDo('readonly', s => s.get('folder'));
          if (h) {
            st.folderName = h.name;
            const perm = await h.queryPermission({ mode: 'readwrite' });
            if (perm === 'granted') { await attachFolder(h); schedule(); }
            else st.folder = 'needs-permission';
          }
        } catch (e) { st.folder = 'off'; }
      } else {
        st.folder = 'unsupported';
      }
    },

    saveDevice() { writeJSON(DEVICE_KEY, device); },
    touch(id) {
      const p = db.profiles[id];
      if (!p) return;
      p.updated = Date.now();
      saveLocal();
      dirty.add(id);
      schedule();
    },
    touchSettings() {
      db.settings.updated = Date.now();
      saveLocal();
      settingsDirty = true;
      schedule();
    },
    createProfile(data) {
      const id = newId();
      db.profiles[id] = Object.assign({ id, name: '小朋友', avatar: { type: 'emoji', v: '🐸', bg: '#dff5e3' }, age: 'k2', stars: 0, roundLen: 5, log: [], created: Date.now() }, data, { id });
      Store.touch(id);
      return id;
    },
    async removeProfile(id) {
      delete db.profiles[id];
      dirty.delete(id);
      db.settings.deleted = Object.assign({}, db.settings.deleted, { [id]: Date.now() });
      if (device.activeId === id) { device.activeId = null; Store.saveDevice(); }
      Store.touchSettings();
      if (st.server === 'ok') { try { await fetchJSON('api/profile/' + id, { method: 'DELETE' }); } catch (e) { /* 下次同步再處理 */ } }
      if (st.folder === 'ok') { try { await dirHandle.removeEntry(`profile-${id}.json`); } catch (e) { /* 忽略 */ } }
    },

    // 以下需要使用者點擊才能呼叫（瀏覽器規定）
    async connectFolder() {
      const h = await window.showDirectoryPicker({ id: 'math-castle', mode: 'readwrite' });
      await idbDo('readwrite', s => s.put(h, 'folder'));
      await attachFolder(h);
      await flush();
    },
    async reconnectFolder() {
      const h = await idbDo('readonly', s => s.get('folder'));
      if (!h) return Store.connectFolder();
      if (await h.requestPermission({ mode: 'readwrite' }) !== 'granted') throw new Error('沒有取得資料夾權限');
      await attachFolder(h);
      await flush();
    },
    async disconnectFolder() {
      await idbDo('readwrite', s => s.delete('folder'));
      dirHandle = null;
      st.folder = 'off';
      st.folderName = '';
      emit();
    },
    async syncNow() {
      if (st.server !== 'off') {
        try { mergeIn(await fetchJSON('api/db')); st.server = 'ok'; } catch (e) { st.server = 'error'; }
      }
      if (st.folder === 'ok') { try { mergeIn(await readFolder()); } catch (e) { st.folder = 'needs-permission'; } }
      saveLocal();
      Object.keys(db.profiles).forEach(id => dirty.add(id));
      settingsDirty = true;
      await flush();
    },

    exportAll() { return JSON.stringify({ app: 'math-castle', version: 2, exported: Date.now(), settings: db.settings, profiles: db.profiles }, null, 1); },
    importAll(text) {
      const data = JSON.parse(text);
      if (!data || data.app !== 'math-castle' || !data.profiles) throw new Error('這不是數學城堡的備份檔');
      mergeIn(data);
      saveLocal();
      Object.keys(db.profiles).forEach(id => dirty.add(id));
      settingsDirty = true;
      schedule();
      return Object.keys(data.profiles).length;
    }
  };

  window.Store = Store;
})();
