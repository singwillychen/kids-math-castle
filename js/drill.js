/* 心算練習：選題型、題數、是否計時；答錯可看算盤圖解 */
(function () {
  const { $, $$ } = App;
  const S = { op: 'mix', count: 10, timer: false };
  let view, stage, pad, slot, q, idx, earned, tries, busy, streak, t0, clockId, timers = [];
  const later = (fn, ms) => timers.push(setTimeout(fn, ms));
  const fmt = ms => { const s = Math.floor(ms / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };

  function enter() {
    view = document.getElementById('view-drill');
    stage = $('.stage', view);
    setup();
  }
  function leave() { clearInterval(clockId); timers.forEach(clearTimeout); timers = []; }

  function chip(key, val, label) {
    return `<button class="chip ${String(S[key]) === String(val) ? 'active' : ''}" data-key="${key}" data-val="${val}">${label}</button>`;
  }

  function setup() {
    leave();
    const cfg = App.ageCfg();
    $('.round-progress', view).innerHTML = '';
    stage.innerHTML = `
      <div class="card setup">
        <img class="setup-img" src="images/princess.svg" alt="">
        <h3>選擇題型</h3>
        <div class="chips">${chip('op', '+', '加法 ＋')}${chip('op', '-', '減法 −')}${chip('op', 'mix', '加減混合')}</div>
        <h3>題數</h3>
        <div class="chips">${[5, 10, 15].map(n => chip('count', n, n + ' 題')).join('')}</div>
        <h3>計時</h3>
        <div class="chips">${chip('timer', false, '不計時')}${chip('timer', true, '⏱ 計時挑戰')}</div>
        <p class="range-note">目前年齡：<b>${cfg.label}（${cfg.years}）</b>，題目在 <b>${cfg.max} 以內</b>。<br>想換年齡，請回城堡首頁選擇。</p>
        <button class="big-btn start-btn">開始練習！</button>
      </div>`;
    $$('.chip', stage).forEach(c => c.addEventListener('click', () => {
      const k = c.dataset.key, v = c.dataset.val;
      S[k] = k === 'count' ? Number(v) : k === 'timer' ? v === 'true' : v;
      $$(`.chip[data-key="${k}"]`, stage).forEach(x => x.classList.toggle('active', x === c));
      App.sfx.tap();
    }));
    $('.start-btn', stage).addEventListener('click', play);
  }

  function play() {
    leave();
    idx = 0; earned = 0; streak = 0; t0 = Date.now();
    stage.innerHTML = `
      <div class="card activity drill-card">
        <div class="drill-bar">
          <span class="streak">🔥 連續答對 0 題</span>
          <span class="clock" ${S.timer ? '' : 'hidden'}>⏱ 0:00</span>
        </div>
        <div class="equation big"><b class="qa"></b> <span class="qop"></span> <b class="qb"></b> = <span class="slot">?</span></div>
        <div class="drill-tools">
          <button class="btn say-btn">🔈 唸題目</button>
          <button class="btn abacus-btn">🧮 算盤圖解</button>
          <button class="btn setup-btn">⚙️ 換設定</button>
        </div>
      </div>
      <div class="pad-area"></div>`;
    slot = $('.slot', stage);
    pad = App.createKeypad($('.pad-area', stage), { display: slot, onSubmit: submit });
    $('.say-btn', stage).addEventListener('click', () => App.speak(App.problemText(q), true));
    $('.abacus-btn', stage).addEventListener('click', () => {
      $('.abacus-btn', stage).classList.remove('pulse');
      Abacus.openDemo(q);
    });
    $('.setup-btn', stage).addEventListener('click', setup);
    if (S.timer) clockId = setInterval(() => { $('.clock', stage).textContent = '⏱ ' + fmt(Date.now() - t0); }, 500);
    next();
  }

  function next() {
    if (idx >= S.count) {
      clearInterval(clockId);
      App.finishRound(earned, S.count, play, S.timer ? `⏱ 用時 ${fmt(Date.now() - t0)}` : '');
      return;
    }
    idx++; tries = 0; busy = false;
    q = App.makeProblem(App.ageCfg().max, S.op);
    $('.round-progress', view).innerHTML = App.progressDots(idx, S.count);
    $('.qa', stage).textContent = q.a;
    $('.qop', stage).textContent = App.opSym(q.op);
    $('.qb', stage).textContent = q.b;
    slot.className = 'slot';
    $('.abacus-btn', stage).classList.remove('pulse');
    pad.clear();
    pad.enable(true);
    App.speak(App.problemText(q));
  }

  function setStreak() { $('.streak', stage).textContent = `🔥 連續答對 ${streak} 題`; }

  function submit(v) {
    if (busy) return;
    if (v === q.ans) {
      busy = true;
      pad.enable(false);
      earned++;
      App.record('drill', App.skillOf(q), `${q.a}${App.opSym(q.op)}${q.b}`, tries + 1, true);
      streak++;
      setStreak();
      slot.classList.add('correct');
      App.addStars(1, slot);
      App.cheer(true, streak > 0 && streak % 5 === 0 ? `連續答對 ${streak} 題！太神了！` : undefined);
      later(next, 1300);
      return;
    }
    tries++;
    streak = 0;
    setStreak();
    if (tries >= 3) {
      App.record('drill', App.skillOf(q), `${q.a}${App.opSym(q.op)}${q.b}`, tries, false);
      busy = true;
      pad.enable(false);
      slot.textContent = q.ans;
      slot.classList.add('reveal');
      App.cheer(false, `答案是 ${q.ans}，下一題加油！`);
      later(next, 2600);
      return;
    }
    slot.classList.add('wrong');
    later(() => { slot.classList.remove('wrong'); pad.clear(); }, 650);
    if (tries === 1) App.cheer(false);
    else {
      App.cheer(false, '看看算盤怎麼算？');
      $('.abacus-btn', stage).classList.add('pulse');
    }
  }

  App.modules.drill = { enter, leave };
})();
