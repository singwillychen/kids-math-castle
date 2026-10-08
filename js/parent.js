/* 家長專區：密碼鎖、帳號比較、各帳號紀錄分析、存檔位置、備份、設定 */
(function () {
  const { $, $$, esc } = App;
  let unlocked = false;        // 這次開網頁只要驗證一次
  let selected = null;         // 'compare' 或帳號 id
  let box = null;

  const ADVICE = {
    add5: '用「數蘋果」多操作實物，邊拖邊數出聲音。',
    add10: '用「數蘋果」與「十格框」，熟悉 10 以內的數量。',
    add20: '用「數線跳跳」往右跳，熟悉 10 以上的數字。',
    addCarry: '先玩「十格框」的湊十，熟記 10 的好朋友（1 和 9、2 和 8……），再用「數線跳跳」的大跳法。',
    sub5: '用「數蘋果」餵青蛙，理解減法就是「拿走」。',
    sub10: '用「數蘋果」餵青蛙或「數線跳跳」往左跳。',
    sub20: '用「數線跳跳」往左跳，練習從大的數往回數。',
    subBorrow: '用「算盤教室」的算式圖解看借十步驟，並複習 10 的好朋友。',
    count: '用「十格框」練習一眼看出數量：一排 5 個、一框 10 個。',
    make: '多玩「十格框」的湊滿，熟記 5 和 10 的分與合。',
    abacus: '在「算盤教室」自由撥珠，熟悉上珠＝5、下珠＝1。'
  };
  const PATHS = {
    k1: ['🍎 數蘋果：先摸、先拖、先數', '🔟 十格框：數數量、湊滿 5', '🧮 算盤教室：撥出 1～5', '🐸 數線跳跳：一格一格跳'],
    k2: ['🔟 十格框：湊滿 10（10 的好朋友）', '🍎 數蘋果：加法放籃子、減法餵青蛙', '🐸 數線跳跳：往右加、往左減', '⚡ 心算練習：不計時 10 題'],
    g1: ['🔟 十格框：湊十法動畫', '🐸 數線跳跳：先跳到 10 的大跳法', '🧮 算盤教室：看進位與借十', '⚡ 心算練習：計時挑戰 15 題']
  };

  const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);
  const dayKey = t => { const d = new Date(t); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
  const fmtTime = t => { const d = new Date(t); return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };
  const profiles = () => Object.values(Store.db.profiles).sort((a, b) => (a.created || 0) - (b.created || 0));
  const kidColor = id => App.KID_COLORS[Math.max(0, profiles().findIndex(p => p.id === id)) % App.KID_COLORS.length];

  // 家長密碼只是防止小朋友誤闖的兒童鎖，不是資安等級的保護
  function hashPin(pin) {
    let h = 0x811c9dc5;
    for (const ch of 'math-castle:' + pin) { h ^= ch.charCodeAt(0); h = Math.imul(h, 0x01000193) >>> 0; }
    return 'fnv:' + h.toString(16);
  }

  function download(name, text, type) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type }));
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }

  /* ---------- 進入與密碼鎖 ---------- */
  function enter() {
    box = $('.stage-plain', document.getElementById('view-parent'));
    if (unlocked) { render(); return; }
    box.innerHTML = '<div class="card center"><p>請大人先通過驗證，才能進入家長專區。</p></div>';
    gate(() => { unlocked = true; render(); });
  }

  function gate(onPass) {
    const hasPin = !!Store.db.settings.pinHash;
    const a = App.rand(6, 9), b = App.rand(3, 9);
    const m = App.modal(`
      <div class="gate">
        <h3>👨‍👩‍👧 家長專區</h3>
        <p>${hasPin ? '請輸入家長密碼' : `請大人回答：<b>${a} × ${b} = ?</b>`}</p>
        <input class="gate-input" type="${hasPin ? 'password' : 'number'}" inputmode="numeric" autocomplete="off" aria-label="${hasPin ? '家長密碼' : '答案'}">
        <p class="gate-msg small"></p>
        <div class="result-actions">
          <button class="big-btn gate-ok">確定</button>
          <button class="btn" data-go="home">回城堡</button>
        </div>
        ${hasPin ? '<button class="link-btn forgot">忘記密碼？</button>' : ''}
      </div>`, { cls: 'modal-small', sticky: true });
    const input = $('.gate-input', m.el);
    const check = () => {
      const ok = hasPin ? hashPin(input.value) === Store.db.settings.pinHash : Number(input.value) === a * b;
      if (ok) { m.close(); onPass(); return; }
      $('.gate-msg', m.el).textContent = hasPin ? '密碼不對，請再試一次。' : '答案不對喔，請再試一次。';
      input.select();
    };
    $('.gate-ok', m.el).addEventListener('click', check);
    input.addEventListener('keydown', e => { if (e.key === 'Enter') check(); });
    const forgot = $('.forgot', m.el);
    if (forgot) forgot.addEventListener('click', () => {
      const x = App.rand(13, 39), y = App.rand(12, 29);
      const ans = prompt(`忘記密碼：請回答 ${x} × ${y} = ?\n答對會移除家長密碼，之後可以重新設定。`);
      if (ans === null) return;
      if (Number(ans) === x * y) {
        Store.db.settings.pinHash = '';
        Store.touchSettings();
        m.close();
        App.toast('已移除家長密碼');
        onPass();
      } else alert('答案不正確。');
    });
    setTimeout(() => input.focus(), 50);
  }

  /* ---------- 統計 ---------- */
  function stats(log) {
    const total = log.length, ok = log.filter(x => x.ok).length;
    const today = dayKey(Date.now());
    const week = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() - i);
      const k = dayKey(d.getTime()), items = log.filter(x => dayKey(x.t) === k);
      week.push({ label: i === 0 ? '今天' : `${d.getMonth() + 1}/${d.getDate()}`, n: items.length, ok: items.filter(x => x.ok).length });
    }
    const skills = Object.keys(App.SKILLS).map(s => {
      const items = log.filter(x => x.s === s), good = items.filter(x => x.ok).length;
      return { s, n: items.length, ok: good, rate: pct(good, items.length) };
    }).filter(x => x.n > 0);
    return {
      total, ok, rate: pct(ok, total),
      days: new Set(log.map(x => dayKey(x.t))).size,
      todayN: log.filter(x => dayKey(x.t) === today).length,
      weekN: week.reduce((s, d) => s + d.n, 0),
      last: total ? log[total - 1].t : 0,
      week, skills,
      modules: Object.keys(App.MODULE_NAMES).map(m => ({ m, n: log.filter(x => x.m === m).length })),
      weak: skills.filter(x => x.n >= 3 && x.rate < 70).sort((a, b) => a.rate - b.rate),
      misses: log.filter(x => !x.ok).slice(-12).reverse()
    };
  }
  function status(x) {
    if (x.n < 3) return '<span class="chip-s s-none">資料還不夠</span>';
    if (x.rate >= 85) return '<span class="chip-s s-good">很棒</span>';
    if (x.rate >= 70) return '<span class="chip-s s-ok">穩定</span>';
    return '<span class="chip-s s-weak">需要加強</span>';
  }
  function storageSummary() {
    const s = Store.status(), parts = ['💻 本機瀏覽器'];
    if (s.server === 'ok') parts.push('🗄️ NAS 伺服器');
    if (s.folder === 'ok') parts.push(`📁 ${esc(s.folderName)}`);
    return parts.join('＋');
  }

  /* ---------- 主畫面 ---------- */
  function render() {
    const list = profiles();
    if (!selected || (selected !== 'compare' && !Store.db.profiles[selected])) selected = list.length > 1 ? 'compare' : (list[0] ? list[0].id : 'compare');
    box.innerHTML = `
      <div class="acct-tabs" role="tablist">
        <button class="acct-tab ${selected === 'compare' ? 'active' : ''}" data-sel="compare">📊 全部比較</button>
        ${list.map(p => `<button class="acct-tab ${selected === p.id ? 'active' : ''}" data-sel="${p.id}" style="--kid:${kidColor(p.id)}">${App.avatarHTML(p.avatar, 'avatar-sm')}${esc(p.name)}</button>`).join('')}
        <button class="acct-tab add-acct">＋ 新增帳號</button>
      </div>
      <div class="parent-body"></div>
      <section class="card storage-card"></section>
      <section class="card">
        <h3>📦 備份與匯出</h3>
        <div class="row-btns left">
          <button class="btn backup-btn">⬇️ 下載完整備份（JSON）</button>
          <label class="btn restore-btn">⬆️ 從備份還原<input type="file" accept=".json,application/json" hidden></label>
          <button class="btn csv-all">⬇️ 匯出全部練習紀錄（CSV）</button>
        </div>
        <p class="small">備份檔包含所有帳號、頭像、星星與紀錄。可以把它放到 NAS 或雲端硬碟保存；還原時會和目前資料合併，不會覆蓋掉較新的紀錄。</p>
      </section>
      <section class="card pin-card"></section>`;

    $$('[data-sel]', box).forEach(b => b.addEventListener('click', () => { selected = b.dataset.sel; App.sfx.tap(); render(); }));
    $('.add-acct', box).addEventListener('click', () => App.openProfileEditor(null, id => { selected = id; render(); App.refreshUser(); }));
    $('.backup-btn', box).addEventListener('click', () => download(`math-castle-backup-${dayKey(Date.now())}.json`, Store.exportAll(), 'application/json'));
    $('.restore-btn input', box).addEventListener('change', async e => {
      const f = e.target.files && e.target.files[0];
      if (!f) return;
      try {
        const n = Store.importAll(await f.text());
        Object.values(Store.db.profiles).forEach(App.normalizeProfile);
        App.toast(`已還原 ${n} 個帳號的資料`);
        App.refreshUser();
        render();
      } catch (err) { alert('還原失敗：' + (err.message || err)); }
    });
    $('.csv-all', box).addEventListener('click', () => exportCsv(list));

    const body = $('.parent-body', box);
    if (selected === 'compare') renderCompare(body, list);
    else renderChild(body, Store.db.profiles[selected]);
    renderStorage();
    renderPin();
  }

  /* ---------- 全部比較 ---------- */
  function renderCompare(body, list) {
    if (!list.length) { body.innerHTML = '<div class="card center"><p>還沒有任何帳號。</p></div>'; return; }
    const all = list.map(p => ({ p, st: stats(p.log || []) }));
    const maxDay = Math.max(1, ...all.flatMap(x => x.st.week.map(d => d.n)));
    const skillKeys = Object.keys(App.SKILLS).filter(s => all.some(x => x.st.skills.find(k => k.s === s)));
    const row = (label, fn) => `<tr><th>${label}</th>${all.map(x => `<td>${fn(x)}</td>`).join('')}</tr>`;

    body.innerHTML = `
      <section class="card">
        <h3>📊 小朋友比較</h3>
        <div class="table-wrap"><table class="cmp-table">
          <thead><tr><th></th>${all.map(x => `<th class="cmp-kid" style="--kid:${kidColor(x.p.id)}">${App.avatarHTML(x.p.avatar, 'avatar-md')}<span>${esc(x.p.name)}</span></th>`).join('')}</tr></thead>
          <tbody>
            ${row('年齡設定', x => App.AGES[x.p.age].label)}
            ${row('星星', x => '⭐ ' + (x.p.stars || 0))}
            ${row('累計題數', x => x.st.total)}
            ${row('一次就答對', x => `<b>${x.st.rate}%</b>`)}
            ${row('今天題數', x => x.st.todayN)}
            ${row('最近 7 天題數', x => x.st.weekN)}
            ${row('練習天數', x => x.st.days)}
            ${row('最近一次練習', x => x.st.last ? fmtTime(x.st.last) : '—')}
            ${row('最需要加強', x => x.st.weak[0] ? `<span class="chip-s s-weak">${App.SKILLS[x.st.weak[0].s]}</span>` : '<span class="chip-s s-good">沒有明顯弱點</span>')}
            ${row('存檔位置', () => `<span class="small">${storageSummary()}</span>`)}
          </tbody>
        </table></div>
      </section>

      <section class="card">
        <h3>📅 最近 7 天練習量</h3>
        <div class="week cmp-week">
          ${all[0].st.week.map((d, i) => `
            <div class="wk">
              <div class="wk-group">${all.map(x => `<span class="wk-kid" title="${esc(x.p.name)}：${x.st.week[i].n} 題" style="height:${(x.st.week[i].n / maxDay) * 100}%;background:${kidColor(x.p.id)}"></span>`).join('')}</div>
              <span class="wk-l">${d.label}</span>
            </div>`).join('')}
        </div>
        <div class="legend">${all.map(x => `<span><i class="lg" style="background:${kidColor(x.p.id)}"></i>${esc(x.p.name)}</span>`).join('')}</div>
      </section>

      <section class="card">
        <h3>🧩 各題型一次答對率</h3>
        ${skillKeys.length ? `<div class="table-wrap"><table class="cmp-table skill-cmp">
          <thead><tr><th>題型</th>${all.map(x => `<th>${esc(x.p.name)}</th>`).join('')}</tr></thead>
          <tbody>${skillKeys.map(s => `<tr><th>${App.SKILLS[s]}</th>${all.map(x => {
            const k = x.st.skills.find(y => y.s === s);
            if (!k) return '<td class="muted">—</td>';
            const cls = k.n < 3 ? 's-none' : k.rate >= 85 ? 's-good' : k.rate >= 70 ? 's-ok' : 's-weak';
            return `<td><span class="chip-s ${cls}">${k.rate}%</span> <span class="small">${k.n} 題</span></td>`;
          }).join('')}</tr>`).join('')}</tbody>
        </table></div>` : '<p class="small">還沒有練習紀錄。</p>'}
        <p class="small">點上方小朋友的名字，可以看個別的詳細紀錄、答錯題目與設定。</p>
      </section>`;
  }

  /* ---------- 個別帳號 ---------- */
  function renderChild(body, p) {
    const st = stats(p.log || []);
    const maxDay = Math.max(1, ...st.week.map(d => d.n));
    body.innerHTML = `
      <section class="card child-head" style="--kid:${kidColor(p.id)}">
        ${App.avatarHTML(p.avatar, 'avatar-lg')}
        <div class="child-info">
          <h3>${esc(p.name)}</h3>
          <p class="small">${App.AGES[p.age].label}（${App.AGES[p.age].years}）· 建立於 ${new Date(p.created || Date.now()).toLocaleDateString('zh-TW')} · 存檔：${storageSummary()}</p>
        </div>
        <div class="row-btns">
          <button class="btn edit-kid">✏️ 編輯名字／頭像</button>
          <button class="btn play-as">▶ 用這個帳號玩</button>
        </div>
      </section>

      <div class="parent-grid">
        <div class="kpi"><span class="kpi-n">${st.total}</span><span class="kpi-l">累計練習題數</span></div>
        <div class="kpi"><span class="kpi-n">${st.rate}<small>%</small></span><span class="kpi-l">一次就答對</span></div>
        <div class="kpi"><span class="kpi-n">${st.todayN}</span><span class="kpi-l">今天練習題數</span></div>
        <div class="kpi"><span class="kpi-n">${st.days}</span><span class="kpi-l">練習天數</span></div>
        <div class="kpi"><span class="kpi-n">⭐${p.stars || 0}</span><span class="kpi-l">星星</span></div>
      </div>

      ${!st.total ? `<div class="card center empty-note"><img src="images/frog.svg" alt=""><p>${esc(p.name)} 還沒有練習紀錄。玩幾回合後，這裡會出現分析與建議。</p></div>` : `
      <div class="parent-cols">
        <section class="card">
          <h3>📅 最近 7 天</h3>
          <div class="week">
            ${st.week.map(d => `
              <div class="wk">
                <div class="wk-bar" title="${d.n} 題，一次答對 ${d.ok} 題">
                  <span class="wk-all" style="height:${(d.n / maxDay) * 100}%"></span>
                  <span class="wk-ok" style="height:${(d.ok / maxDay) * 100}%"></span>
                </div>
                <span class="wk-n">${d.n || ''}</span>
                <span class="wk-l">${d.label}</span>
              </div>`).join('')}
          </div>
          <div class="legend"><span><i class="lg" style="background:var(--frog)"></i>一次答對</span><span><i class="lg" style="background:var(--pink-2)"></i>其他</span></div>
        </section>
        <section class="card">
          <h3>💡 給家長的建議</h3>
          ${st.weak.length ? `<ul class="advice">${st.weak.slice(0, 3).map(w => `
            <li><b>${App.SKILLS[w.s]}</b>（一次答對 ${w.rate}%）<br>${ADVICE[w.s]}</li>`).join('')}</ul>`
          : `<p class="good-note">目前沒有明顯的弱點，表現很穩定！🎉<br>可以把年齡往上調一級，或在心算練習開啟計時挑戰。</p>`}
        </section>
      </div>

      <section class="card">
        <h3>📊 各題型表現</h3>
        <div class="skill-table">
          ${st.skills.map(x => `
            <div class="sk-row">
              <span class="sk-name">${App.SKILLS[x.s]}</span>
              <span class="sk-n">${x.n} 題</span>
              <span class="sk-bar"><span style="width:${x.rate}%"></span></span>
              <span class="sk-rate">${x.rate}%</span>
              ${status(x)}
            </div>`).join('')}
        </div>
        <p class="small">「一次答對」是指第一次作答就正確。少於 3 題的題型暫不判斷。</p>
        <div class="mod-row">${st.modules.filter(m => m.n).map(m => `<span class="mod-pill">${App.MODULE_NAMES[m.m]} ${m.n} 題</span>`).join('')}</div>
      </section>

      <section class="card">
        <h3>📝 最近答錯或答第二次才對的題目</h3>
        ${st.misses.length ? `<div class="miss-list">${st.misses.map(x => {
          const mm = /^(\d+)([+−])(\d+)$/.exec(x.q);
          return `<div class="miss">
            <span class="miss-q">${esc(x.q.replace('+', ' + ').replace('−', ' − '))}</span>
            <span class="miss-meta">${App.MODULE_NAMES[x.m] || ''} · ${fmtTime(x.t)} · ${x.solved ? `第 ${x.n} 次答對` : '公布答案'}</span>
            ${mm ? `<button class="btn mini show-ab" data-a="${mm[1]}" data-op="${mm[2] === '+' ? '+' : '-'}" data-b="${mm[3]}">🧮 算盤看</button>` : ''}
          </div>`;
        }).join('')}</div>` : '<p class="good-note">最近都一次就答對！</p>'}
      </section>`}

      <section class="card">
        <h3>🗺️ 建議學習路線（${App.AGES[p.age].label} ${App.AGES[p.age].years}）</h3>
        <ol class="path">${PATHS[p.age].map(x => `<li>${x}</li>`).join('')}</ol>
        <p class="small">教學原則：先操作實物、再看圖、最後才看算式（具體 → 圖像 → 抽象）。每次 10～15 分鐘，比一次玩很久更有效。</p>
      </section>

      <section class="card settings">
        <h3>⚙️ ${esc(p.name)} 的設定</h3>
        <div class="set-row"><span>年齡</span><div class="chips">${Object.entries(App.AGES).map(([k, a]) =>
          `<button class="chip ${k === p.age ? 'active' : ''}" data-set="age" data-val="${k}">${a.label}</button>`).join('')}</div></div>
        <div class="set-row"><span>數蘋果／十格框／數線<br>每回合題數</span><div class="chips">${[5, 8, 10].map(n =>
          `<button class="chip ${n === p.roundLen ? 'active' : ''}" data-set="roundLen" data-val="${n}">${n} 題</button>`).join('')}</div></div>
        <div class="row-btns left">
          <button class="btn csv-kid">⬇️ 匯出 ${esc(p.name)} 的紀錄（CSV）</button>
          <button class="btn clear-log">🗑️ 清除練習紀錄</button>
          <button class="btn reset-stars">⭐ 星星歸零</button>
          <button class="btn danger del-kid">❌ 刪除這個帳號</button>
        </div>
      </section>`;

    $$('.show-ab', body).forEach(b => b.addEventListener('click', () =>
      Abacus.openDemo({ a: +b.dataset.a, op: b.dataset.op, b: +b.dataset.b })));
    $('.edit-kid', body).addEventListener('click', () => App.openProfileEditor(p, () => { App.refreshUser(); render(); }));
    $('.play-as', body).addEventListener('click', () => App.login(p.id));
    $$('[data-set]', body).forEach(c => c.addEventListener('click', () => {
      const k = c.dataset.set;
      p[k] = k === 'roundLen' ? Number(c.dataset.val) : c.dataset.val;
      Store.touch(p.id);
      App.sfx.tap();
      App.toast('設定已儲存');
      render();
    }));
    $('.csv-kid', body).addEventListener('click', () => exportCsv([p]));
    $('.clear-log', body).addEventListener('click', () => {
      if (!confirm(`確定要清除「${p.name}」的所有練習紀錄嗎？（星星會保留）`)) return;
      App.clearLog(p.id);
      render();
    });
    $('.reset-stars', body).addEventListener('click', () => {
      if (!confirm(`確定要把「${p.name}」的星星和貼紙全部歸零嗎？`)) return;
      p.stars = 0;
      Store.touch(p.id);
      App.refreshUser();
      render();
    });
    $('.del-kid', body).addEventListener('click', async () => {
      if (!confirm(`確定要刪除「${p.name}」的帳號嗎？\n星星與所有練習紀錄都會一起刪除，無法復原。\n（建議先下載完整備份）`)) return;
      await Store.removeProfile(p.id);
      selected = null;
      App.refreshUser();
      App.toast('帳號已刪除');
      render();
    });
  }

  /* ---------- 存檔位置 ---------- */
  function renderStorage() {
    const card = box && $('.storage-card', box);
    if (!card) return;
    const s = Store.status();
    const server = s.server === 'ok'
      ? `<b class="ok-text">已連線</b>（${esc(location.host)}）。紀錄存在伺服器的 <code>data</code> 資料夾，所有連到這個網址的平板、電腦共用同一份紀錄。`
      : s.server === 'error'
        ? '<b class="warn-text">連線失敗</b>。資料先存在這台裝置，伺服器恢復後會自動補傳。'
        : '未使用。把整個網站資料夾放到 NAS（或家裡一台電腦），執行 <code>server.py</code>，再用 <code>http://NAS位址:8080</code> 開啟就會自動啟用（步驟見 README）。';
    let folder;
    if (s.folder === 'ok') folder = `<b class="ok-text">已連結「${esc(s.folderName)}」</b>，每次練習後自動寫入 JSON 檔。 <button class="btn mini folder-off">取消連結</button>`;
    else if (s.folder === 'needs-permission') folder = `<b class="warn-text">需要重新授權「${esc(s.folderName)}」</b>（瀏覽器規定每次開啟要再按一次）。 <button class="btn mini folder-re">🔗 重新連接</button>`;
    else if (s.folder === 'unsupported') folder = '這個瀏覽器不支援（需要電腦版 Chrome 或 Edge）。平板請改用 NAS 伺服器或備份檔。';
    else folder = '未設定。可以選 NAS 的網路磁碟機、Google Drive／OneDrive／Synology Drive 同步資料夾。 <button class="btn mini folder-on">📁 選擇資料夾</button>';

    card.innerHTML = `
      <h3>💾 存檔位置</h3>
      <ul class="store-list">
        <li><span class="st-icon">💻</span><div><b>這台裝置的瀏覽器</b>：<b class="ok-text">一定會存</b>。換裝置或清除瀏覽器資料會不見，建議搭配下面任一種。</div></li>
        <li><span class="st-icon">🗄️</span><div><b>NAS／電腦伺服器</b>：${server}</div></li>
        <li><span class="st-icon">📁</span><div><b>網路硬碟資料夾</b>：${folder}</div></li>
      </ul>
      <p class="small">最後同步：${s.lastSync ? fmtTime(s.lastSync) : '尚未同步'}${s.pending ? `　·　等待同步 ${s.pending} 筆` : ''}${s.error ? `　·　${esc(s.error)}` : ''}</p>
      ${s.server !== 'off' || s.folder === 'ok' ? '<button class="btn sync-now">🔄 立即同步</button>' : ''}`;

    const act = async (fn, okMsg) => {
      try { await fn(); App.toast(okMsg); } catch (e) { if (e && e.name !== 'AbortError') alert('操作失敗：' + (e.message || e)); }
      Object.values(Store.db.profiles).forEach(App.normalizeProfile);
      render();
    };
    const on = $('.folder-on', card), re = $('.folder-re', card), off = $('.folder-off', card), sync = $('.sync-now', card);
    if (on) on.addEventListener('click', () => act(Store.connectFolder, '已連結資料夾，資料已寫入'));
    if (re) re.addEventListener('click', () => act(Store.reconnectFolder, '已重新連接資料夾'));
    if (off) off.addEventListener('click', () => act(Store.disconnectFolder, '已取消連結（資料夾裡的檔案會保留）'));
    if (sync) sync.addEventListener('click', () => act(Store.syncNow, '同步完成'));
  }

  /* ---------- 家長密碼 ---------- */
  function renderPin() {
    const card = $('.pin-card', box);
    const has = !!Store.db.settings.pinHash;
    card.innerHTML = `
      <h3>🔒 家長密碼</h3>
      <p class="small">${has ? '已設定密碼。進入家長專區時要輸入密碼。' : '目前用「乘法題」當門檻。可以改成自己設定的 4～8 位數字密碼。'}</p>
      <div class="pin-row">
        <input class="pin-a" type="password" inputmode="numeric" maxlength="8" placeholder="新密碼（4～8 位數字）" autocomplete="new-password">
        <input class="pin-b" type="password" inputmode="numeric" maxlength="8" placeholder="再輸入一次" autocomplete="new-password">
        <button class="btn pin-save">${has ? '更換密碼' : '設定密碼'}</button>
        ${has ? '<button class="btn pin-clear">移除密碼</button>' : ''}
      </div>
      <p class="small">密碼會隨存檔同步到 NAS／資料夾。這是防止小朋友誤闖的兒童鎖，忘記時可用「忘記密碼」答一題兩位數乘法移除。</p>`;
    $('.pin-save', card).addEventListener('click', () => {
      const a = $('.pin-a', card).value, b = $('.pin-b', card).value;
      if (!/^\d{4,8}$/.test(a)) { alert('請輸入 4～8 位數字。'); return; }
      if (a !== b) { alert('兩次輸入的密碼不一樣。'); return; }
      Store.db.settings.pinHash = hashPin(a);
      Store.touchSettings();
      App.toast('家長密碼已設定');
      renderPin();
    });
    const clr = $('.pin-clear', card);
    if (clr) clr.addEventListener('click', () => {
      if (!confirm('確定要移除家長密碼嗎？')) return;
      Store.db.settings.pinHash = '';
      Store.touchSettings();
      renderPin();
    });
  }

  function exportCsv(list) {
    const rows = [['小朋友', '時間', '遊戲', '題型', '題目', '作答次數', '一次答對', '年齡設定']];
    list.forEach(p => (p.log || []).forEach(x => rows.push([
      p.name, new Date(x.t).toLocaleString('zh-TW'), App.MODULE_NAMES[x.m] || x.m, App.SKILLS[x.s] || x.s, x.q, x.n,
      x.ok ? '是' : '否', (App.AGES[x.age] || {}).label || ''
    ])));
    if (rows.length === 1) { App.toast('還沒有紀錄可以匯出'); return; }
    const csv = '﻿' + rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\r\n');
    download(`math-practice-${list.length === 1 ? list[0].name + '-' : ''}${dayKey(Date.now())}.csv`, csv, 'text/csv;charset=utf-8');
  }

  App.modules.parent = { enter, onSync: renderStorage };
})();
