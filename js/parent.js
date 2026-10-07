/* 家長專區：練習紀錄分析、弱點建議、學習路線、設定 */
(function () {
  const { $, $$ } = App;
  let unlocked = false;   // 這次開網頁只要驗證一次

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

  function enter() {
    const box = $('.stage-plain', document.getElementById('view-parent'));
    if (unlocked) { render(box); return; }
    box.innerHTML = '<div class="card center"><p>請大人先回答一題，才能進入家長專區。</p></div>';
    gate(() => { unlocked = true; render(box); });
  }

  function gate(onPass) {
    const a = App.rand(6, 9), b = App.rand(3, 9);
    const m = App.modal(`
      <div class="gate">
        <h3>👨‍👩‍👧 家長專區</h3>
        <p>請大人回答：<b>${a} × ${b} = ?</b></p>
        <input class="gate-input" type="number" inputmode="numeric" autocomplete="off" aria-label="答案">
        <p class="gate-msg small"></p>
        <div class="result-actions">
          <button class="big-btn gate-ok">確定</button>
          <button class="btn" data-go="home">回城堡</button>
        </div>
      </div>`, { cls: 'modal-small', sticky: true });
    const input = $('.gate-input', m.el);
    const check = () => {
      if (Number(input.value) === a * b) { m.close(); onPass(); }
      else { $('.gate-msg', m.el).textContent = '答案不對喔，請再試一次。'; input.select(); }
    };
    $('.gate-ok', m.el).addEventListener('click', check);
    input.addEventListener('keydown', e => { if (e.key === 'Enter') check(); });
    setTimeout(() => input.focus(), 50);
  }

  function stats() {
    const log = App.getLog();
    const total = log.length, ok = log.filter(x => x.ok).length;
    const days = new Set(log.map(x => dayKey(x.t)));
    const today = dayKey(Date.now());
    const week = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() - i);
      const k = dayKey(d.getTime()), items = log.filter(x => dayKey(x.t) === k);
      week.push({ label: i === 0 ? '今天' : `${d.getMonth() + 1}/${d.getDate()}`, n: items.length, ok: items.filter(x => x.ok).length });
    }
    const skills = Object.keys(App.SKILLS).map(s => {
      const items = log.filter(x => x.s === s);
      return { s, n: items.length, ok: items.filter(x => x.ok).length, rate: pct(items.filter(x => x.ok).length, items.length) };
    }).filter(x => x.n > 0);
    const modules = Object.keys(App.MODULE_NAMES).map(m => ({ m, n: log.filter(x => x.m === m).length }));
    const weak = skills.filter(x => x.n >= 3 && x.rate < 70).sort((a, b) => a.rate - b.rate);
    const misses = log.filter(x => !x.ok).slice(-12).reverse();
    return { total, ok, days: days.size, todayN: log.filter(x => dayKey(x.t) === today).length, week, skills, modules, weak, misses };
  }

  function status(x) {
    if (x.n < 3) return '<span class="chip-s s-none">資料還不夠</span>';
    if (x.rate >= 85) return '<span class="chip-s s-good">很棒</span>';
    if (x.rate >= 70) return '<span class="chip-s s-ok">穩定</span>';
    return '<span class="chip-s s-weak">需要加強</span>';
  }

  function render(box) {
    const st = stats();
    const cfg = App.ageCfg();
    const maxDay = Math.max(1, ...st.week.map(d => d.n));
    const empty = st.total === 0;

    box.innerHTML = `
      <div class="parent-grid">
        <div class="kpi"><span class="kpi-n">${st.total}</span><span class="kpi-l">累計練習題數</span></div>
        <div class="kpi"><span class="kpi-n">${pct(st.ok, st.total)}<small>%</small></span><span class="kpi-l">一次就答對</span></div>
        <div class="kpi"><span class="kpi-n">${st.todayN}</span><span class="kpi-l">今天練習題數</span></div>
        <div class="kpi"><span class="kpi-n">${st.days}</span><span class="kpi-l">練習天數</span></div>
        <div class="kpi"><span class="kpi-n">⭐${App.state.stars}</span><span class="kpi-l">星星</span></div>
      </div>

      ${empty ? `<div class="card center empty-note"><img src="images/frog.svg" alt=""><p>還沒有練習紀錄。讓孩子玩幾回合後，這裡會出現分析與建議。</p></div>` : `
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
          : `<p class="good-note">目前沒有明顯的弱點，表現很穩定！🎉<br>可以試試在首頁把年齡往上調一級，或在心算練習開啟計時挑戰。</p>`}
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
            <span class="miss-q">${x.q.replace('+', ' + ').replace('−', ' − ')}</span>
            <span class="miss-meta">${App.MODULE_NAMES[x.m] || ''} · ${fmtTime(x.t)} · ${x.solved ? `第 ${x.n} 次答對` : '公布答案'}</span>
            ${mm ? `<button class="btn mini show-ab" data-a="${mm[1]}" data-op="${mm[2] === '+' ? '+' : '-'}" data-b="${mm[3]}">🧮 算盤看</button>` : ''}
          </div>`;
        }).join('')}</div>` : '<p class="good-note">最近都一次就答對！</p>'}
      </section>`}

      <section class="card">
        <h3>🗺️ 建議學習路線（${cfg.label} ${cfg.years}）</h3>
        <ol class="path">${PATHS[App.state.age].map(p => `<li>${p}</li>`).join('')}</ol>
        <p class="small">教學原則：先操作實物、再看圖、最後才看算式（具體 → 圖像 → 抽象）。每次 10～15 分鐘，比一次玩很久更有效。</p>
      </section>

      <section class="card settings">
        <h3>⚙️ 設定</h3>
        <div class="set-row"><span>年齡</span><div class="chips">${Object.entries(App.AGES).map(([k, a]) =>
          `<button class="chip ${k === App.state.age ? 'active' : ''}" data-set="age" data-val="${k}">${a.label}</button>`).join('')}</div></div>
        <div class="set-row"><span>數蘋果／十格框／數線<br>每回合題數</span><div class="chips">${[5, 8, 10].map(n =>
          `<button class="chip ${n === App.state.roundLen ? 'active' : ''}" data-set="roundLen" data-val="${n}">${n} 題</button>`).join('')}</div></div>
        <p class="small">語音唸題與音效可從右上角按鈕開關。</p>
        <div class="row-btns left">
          <button class="btn export-btn">⬇️ 匯出練習紀錄（CSV）</button>
          <button class="btn clear-log">🗑️ 清除練習紀錄</button>
          <button class="btn reset-stars">⭐ 星星歸零</button>
        </div>
        <p class="small">所有資料只存在這台裝置的瀏覽器裡，不會上傳到任何地方。</p>
      </section>`;

    $$('.show-ab', box).forEach(b => b.addEventListener('click', () =>
      Abacus.openDemo({ a: +b.dataset.a, op: b.dataset.op, b: +b.dataset.b })));
    $$('[data-set]', box).forEach(c => c.addEventListener('click', () => {
      const k = c.dataset.set;
      App.state[k] = k === 'roundLen' ? Number(c.dataset.val) : c.dataset.val;
      App.save();
      App.sfx.tap();
      render(box);
      App.toast('設定已儲存');
    }));
    $('.export-btn', box).addEventListener('click', exportCsv);
    $('.clear-log', box).addEventListener('click', () => {
      if (!confirm('確定要清除所有練習紀錄嗎？（星星會保留）')) return;
      App.clearLog();
      render(box);
    });
    $('.reset-stars', box).addEventListener('click', () => {
      if (!confirm('確定要把星星和貼紙全部歸零嗎？')) return;
      App.state.stars = 0;
      App.save();
      App.updateStarCount();
      render(box);
    });
  }

  function exportCsv() {
    const log = App.getLog();
    if (!log.length) { App.toast('還沒有紀錄可以匯出'); return; }
    const rows = [['時間', '遊戲', '題型', '題目', '作答次數', '一次答對', '年齡設定']].concat(log.map(x => [
      new Date(x.t).toLocaleString('zh-TW'), App.MODULE_NAMES[x.m] || x.m, App.SKILLS[x.s] || x.s, x.q, x.n,
      x.ok ? '是' : '否', (App.AGES[x.age] || {}).label || ''
    ]));
    const csv = '﻿' + rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\r\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    a.download = `math-practice-${dayKey(Date.now())}.csv`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }

  App.modules.parent = { enter };
})();
