/* 公主與青蛙的數學城堡：共用功能（設定、導覽、語音、音效、數字鍵盤、星星） */
(function () {
  const STORE_KEY = 'princess-frog-math-v1';

  const AGES = {
    k1: { label: '中班', years: '4–5 歲', max: 5, desc: '5 以內加減' },
    k2: { label: '大班', years: '5–6 歲', max: 10, desc: '10 以內加減' },
    g1: { label: '小一', years: '6–7 歲', max: 20, desc: '20 以內・湊十借十' }
  };

  const STICKERS = [
    { e: '👑', n: '小皇冠' }, { e: '🐸', n: '青蛙王子' }, { e: '🌸', n: '櫻花' }, { e: '🦄', n: '獨角獸' },
    { e: '🍰', n: '草莓蛋糕' }, { e: '🎀', n: '蝴蝶結' }, { e: '🏰', n: '城堡' }, { e: '🦋', n: '蝴蝶' },
    { e: '🍓', n: '草莓' }, { e: '🌈', n: '彩虹' }, { e: '💎', n: '寶石' }, { e: '🧚', n: '小仙子' },
    { e: '🐢', n: '小烏龜' }, { e: '🍭', n: '棒棒糖' }, { e: '🪄', n: '魔法棒' }, { e: '🌟', n: '閃亮星' }
  ];
  const STARS_PER_STICKER = 5;

  const GOOD = ['答對了！好棒！', '太厲害了！', '青蛙王子為你鼓掌！', '公主送你一顆星星！', '你是數學小天才！', '完全正確！'];
  const BAD = ['再試試看！', '沒關係，再想一想～', '差一點點，再來一次！'];

  const state = { age: 'k2', voice: false, sound: true, stars: 0, roundLen: 5 };

  /* 題型分類（給家長頁分析用） */
  const SKILLS = {
    add5: '5 以內加法', add10: '10 以內加法', add20: '20 以內加法（不進位）', addCarry: '進位加法（湊十）',
    sub5: '5 以內減法', sub10: '10 以內減法', sub20: '20 以內減法（不退位）', subBorrow: '退位減法（借十）',
    count: '數數量', make: '湊成 5／10', abacus: '算盤撥數'
  };
  const MODULE_NAMES = { objects: '數蘋果', tenframe: '十格框', numberline: '數線跳跳', drill: '心算練習', abacus: '算盤教室' };
  function skillOf(p) {
    if (p.op === '+') {
      if (p.ans <= 5) return 'add5';
      if (p.ans <= 10) return 'add10';
      return (p.a % 10) + (p.b % 10) >= 10 ? 'addCarry' : 'add20';
    }
    if (p.a <= 5) return 'sub5';
    if (p.a <= 10) return 'sub10';
    return (p.a % 10) < (p.b % 10) ? 'subBorrow' : 'sub20';
  }

  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  const rand = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];
  const opSym = op => (op === '+' ? '+' : '−');
  const opWord = op => (op === '+' ? '加' : '減');

  function load() {
    try { Object.assign(state, JSON.parse(localStorage.getItem(STORE_KEY) || '{}')); } catch (e) { /* 無痕模式等情況 */ }
    if (!AGES[state.age]) state.age = 'k2';
    if (![5, 8, 10].includes(state.roundLen)) state.roundLen = 5;
  }
  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) { /* 忽略 */ }
  }

  /* ---------- 練習紀錄 ---------- */
  const LOG_KEY = 'princess-frog-math-log-v1';
  const LOG_MAX = 800;
  let log = [];
  function loadLog() {
    try { log = JSON.parse(localStorage.getItem(LOG_KEY) || '[]'); } catch (e) { log = []; }
    if (!Array.isArray(log)) log = [];
  }
  // tries：答了幾次；solved：最後有沒有自己答對（第三次錯會直接公布答案）
  function record(module, skill, q, tries, solved) {
    log.push({ t: Date.now(), m: module, s: skill, q, n: tries, ok: solved && tries === 1, solved, age: state.age });
    if (log.length > LOG_MAX) log = log.slice(-LOG_MAX);
    try { localStorage.setItem(LOG_KEY, JSON.stringify(log)); } catch (e) { /* 忽略 */ }
  }
  function getLog() { return log; }
  function clearLog() {
    log = [];
    try { localStorage.removeItem(LOG_KEY); } catch (e) { /* 忽略 */ }
  }

  /* ---------- 出題 ---------- */
  let lastProblemKey = '';
  function makeProblem(max, op) {
    let p, key, guard = 0;
    do {
      p = rawProblem(max, op === 'mix' ? (Math.random() < 0.5 ? '+' : '-') : op);
      key = p.a + p.op + p.b;
    } while (key === lastProblemKey && ++guard < 10);
    lastProblemKey = key;
    return p;
  }
  function rawProblem(max, op) {
    let a, b;
    if (op === '+') {
      if (max >= 20 && Math.random() < 0.6) {      // 進位題：個位相加超過 10
        a = rand(2, 9); b = rand(11 - a, 9);
        if (Math.random() < 0.5) [a, b] = [b, a];
      } else {
        const sum = rand(2, max);
        a = rand(1, sum - 1); b = sum - a;
      }
      return { a, b, op, ans: a + b };
    }
    if (max >= 20 && Math.random() < 0.6) {        // 退位題：個位不夠減
      a = rand(11, 18); b = rand(a - 9, 9);
    } else {
      a = rand(2, max); b = rand(1, a - 1);
    }
    return { a, b, op, ans: a - b };
  }

  /* ---------- 語音 ---------- */
  let voices = [];
  function loadVoices() { if ('speechSynthesis' in window) voices = speechSynthesis.getVoices(); }
  function speak(text, force) {
    if ((!state.voice && !force) || !('speechSynthesis' in window)) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    const v = voices.find(x => /zh[-_]TW/i.test(x.lang)) ||
              voices.find(x => /zh[-_](HK|Hant)/i.test(x.lang)) ||
              voices.find(x => /^zh/i.test(x.lang));
    if (v) u.voice = v;
    u.lang = v ? v.lang : 'zh-TW';
    u.rate = 0.9;
    u.pitch = 1.1;
    speechSynthesis.speak(u);
  }
  const problemText = p => `${p.a} ${opWord(p.op)} ${p.b}，等於多少？`;
  function stopSpeaking() { if ('speechSynthesis' in window) speechSynthesis.cancel(); }

  /* ---------- 音效（Web Audio，不需音檔） ---------- */
  let actx;
  function tone(freqs, dur, type, gap) {
    if (!state.sound) return;
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      const t0 = actx.currentTime;
      freqs.forEach((f, i) => {
        const o = actx.createOscillator(), g = actx.createGain(), t = t0 + i * gap;
        o.type = type; o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.16, t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        o.connect(g).connect(actx.destination);
        o.start(t); o.stop(t + dur + 0.05);
      });
    } catch (e) { /* 不支援就安靜 */ }
  }
  const sfx = {
    good: () => tone([660, 880, 1320], 0.22, 'triangle', 0.1),
    bad: () => tone([330, 262], 0.22, 'sine', 0.15),
    pop: () => tone([620], 0.09, 'triangle', 0),
    tap: () => tone([420], 0.05, 'sine', 0),
    win: () => tone([523, 659, 784, 1046], 0.32, 'triangle', 0.13)
  };

  /* ---------- 導覽 ---------- */
  const modules = {};
  let current = 'home';
  function go(name) {
    if (!document.getElementById('view-' + name)) name = 'home';
    $$('.modal-backdrop').forEach(m => m.remove());
    if (modules[current] && modules[current].leave) modules[current].leave();
    stopSpeaking();
    activePad = null;
    $$('.view').forEach(v => v.classList.toggle('active', v.id === 'view-' + name));
    current = name;
    if (name === 'home') renderHome();
    if (modules[name] && modules[name].enter) modules[name].enter();
    window.scrollTo(0, 0);
  }

  function renderHome() {
    $('#agePicker').innerHTML = Object.entries(AGES).map(([k, a]) => `
      <button class="age-btn ${k === state.age ? 'active' : ''}" data-age="${k}" role="radio" aria-checked="${k === state.age}">
        <span class="age-label">${a.label}</span>
        <span class="age-years">${a.years}</span>
        <span class="age-desc">${a.desc}</span>
      </button>`).join('');
  }

  /* ---------- 星星與回饋 ---------- */
  function updateStarCount() { $('#starCount').textContent = '⭐ ' + state.stars; }

  function addStars(n, fromEl) {
    const before = Math.floor(state.stars / STARS_PER_STICKER);
    state.stars += n;
    save();
    flyStar(fromEl);
    setTimeout(updateStarCount, 650);
    const after = Math.floor(state.stars / STARS_PER_STICKER);
    if (after > before && after <= STICKERS.length) {
      const s = STICKERS[after - 1];
      setTimeout(() => { toast(`🎉 得到新貼紙：${s.e} ${s.n}！`); sfx.win(); }, 1000);
    }
  }

  function flyStar(fromEl) {
    const star = document.createElement('span');
    star.className = 'fly-star';
    star.textContent = '⭐';
    const from = fromEl ? fromEl.getBoundingClientRect() : { left: innerWidth / 2, top: innerHeight / 2, width: 0, height: 0 };
    const to = $('#starCount').getBoundingClientRect();
    star.style.left = from.left + from.width / 2 - 20 + 'px';
    star.style.top = from.top + from.height / 2 - 20 + 'px';
    document.body.appendChild(star);
    const dx = to.left + 10 - (from.left + from.width / 2 - 20);
    const dy = to.top - (from.top + from.height / 2 - 20);
    if (star.animate) {
      star.animate([
        { transform: 'translate(0,0) scale(1)', opacity: 1 },
        { transform: `translate(${dx * 0.4}px, ${dy * 0.4 - 60}px) scale(1.6)`, opacity: 1, offset: 0.4 },
        { transform: `translate(${dx}px, ${dy}px) scale(.6)`, opacity: 0.4 }
      ], { duration: 700, easing: 'ease-in-out' }).onfinish = () => star.remove();
    } else {
      setTimeout(() => star.remove(), 700);
    }
  }

  let cheerTimer;
  function cheer(ok, msg) {
    const el = $('#cheer');
    const text = msg || pick(ok ? GOOD : BAD);
    $('img', el).src = ok ? pick(['images/princess.svg', 'images/frog.svg']) : 'images/frog.svg';
    $('.cheer-text', el).textContent = text;
    el.className = 'cheer show ' + (ok ? 'good' : 'bad');
    clearTimeout(cheerTimer);
    cheerTimer = setTimeout(() => el.classList.remove('show'), 1500);
    ok ? sfx.good() : sfx.bad();
    speak(text);
  }

  let toastTimer;
  function toast(msg) {
    const el = $('#toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 2600);
  }

  function progressDots(idx, total) {
    return Array.from({ length: total }, (_, i) =>
      `<span class="pdot ${i < idx - 1 ? 'done' : ''} ${i === idx - 1 ? 'now' : ''}"></span>`).join('');
  }

  /* ---------- 對話框 ---------- */
  function modal(inner, opts) {
    opts = opts || {};
    const bd = document.createElement('div');
    bd.className = 'modal-backdrop';
    bd.innerHTML = `<div class="modal ${opts.cls || ''}" role="dialog" aria-modal="true">${inner}</div>`;
    document.body.appendChild(bd);
    let closed = false;
    const close = () => {
      if (closed) return;
      closed = true;
      bd.remove();
      if (opts.onClose) opts.onClose();
    };
    bd.addEventListener('click', e => {
      if ((e.target === bd && !opts.sticky) || e.target.closest('[data-close]')) close();
    });
    return { el: $('.modal', bd), close };
  }

  function finishRound(earned, total, onAgain, extra) {
    sfx.win();
    const ratio = earned / total;
    const msg = ratio === 1 ? '全部答對！你是數學小公主／小王子！' : ratio >= 0.6 ? '好棒喔！繼續加油！' : '慢慢來，多練習會越來越厲害！';
    const m = modal(`
      <div class="result">
        <img class="result-img" src="images/${ratio >= 0.6 ? 'princess' : 'frog'}.svg" alt="">
        <h3>完成了！</h3>
        <p class="result-stars">${'⭐'.repeat(earned) || '💪'}</p>
        <p>答對 <b>${earned}</b> / ${total} 題</p>
        ${extra ? `<p class="result-extra">${extra}</p>` : ''}
        <p class="result-msg">${msg}</p>
        <div class="result-actions">
          <button class="big-btn" data-again>再玩一次</button>
          <button class="btn" data-go="home">回城堡</button>
        </div>
      </div>`, { cls: 'modal-small', sticky: true });
    speak(msg);
    $('[data-again]', m.el).addEventListener('click', () => { m.close(); onAgain(); });
  }

  /* ---------- 數字鍵盤（螢幕＋實體鍵盤） ---------- */
  let activePad = null;
  function createKeypad(host, opts) {
    const maxLen = opts.maxLen || 2;
    let display = opts.display;
    host.innerHTML = '';
    const wrap = document.createElement('div');
    wrap.className = 'keypad';
    const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'del', '0', 'ok'];
    wrap.innerHTML = keys.map(k => {
      const label = k === 'del' ? '⌫' : k === 'ok' ? '✔' : k;
      const aria = k === 'del' ? '刪除' : k === 'ok' ? '確定' : k;
      return `<button type="button" class="key key-${k}" data-k="${k}" aria-label="${aria}">${label}</button>`;
    }).join('');
    host.appendChild(wrap);

    const pad = {
      value: '', enabled: true, host,
      press(k) {
        if (!pad.enabled) return;
        if (k === 'ok') {
          flash(k);
          if (pad.value !== '') opts.onSubmit(Number(pad.value));
          return;
        }
        if (k === 'del') pad.value = pad.value.slice(0, -1);
        else if (pad.value.length < maxLen) pad.value = (pad.value === '0' ? '' : pad.value) + k;
        else return;
        sfx.tap();
        flash(k);
        paint();
      },
      clear() { pad.value = ''; paint(); },
      enable(b) { pad.enabled = b; wrap.classList.toggle('disabled', !b); },
      setDisplay(el) { display = el; paint(); }
    };
    function paint() {
      if (display) {
        display.textContent = pad.value === '' ? '?' : pad.value;
        display.classList.toggle('filled', pad.value !== '');
      }
    }
    function flash(k) {
      const b = $(`[data-k="${k}"]`, wrap);
      if (!b) return;
      b.classList.add('hit');
      setTimeout(() => b.classList.remove('hit'), 140);
    }
    wrap.addEventListener('click', e => {
      const b = e.target.closest('[data-k]');
      if (!b) return;
      b.blur();
      pad.press(b.dataset.k);
    });
    activePad = pad;
    paint();
    return pad;
  }

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      const close = $('.modal-backdrop [data-close]');
      if (close) close.click();
      return;
    }
    if (!activePad || $('.modal-backdrop')) return;
    if (!activePad.host.isConnected || !activePad.host.offsetParent) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (/^[0-9]$/.test(e.key)) { activePad.press(e.key); e.preventDefault(); }
    else if (e.key === 'Backspace' || e.key === 'Delete') { activePad.press('del'); e.preventDefault(); }
    else if (e.key === 'Enter') { activePad.press('ok'); e.preventDefault(); }
  });

  /* ---------- 拖曳與移動動畫 ---------- */
  function flipMove(el, parent, first) {
    first = first || el.getBoundingClientRect();
    parent.appendChild(el);
    const last = el.getBoundingClientRect();
    const dx = first.left - last.left, dy = first.top - last.top;
    if (el.animate) {
      el.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'translate(0, 0)' }],
        { duration: 420, easing: 'cubic-bezier(.34, 1.3, .64, 1)' });
    }
  }

  // 拖到目標或直接點一下都可以移動（小朋友手指不夠精準時用點的）
  function makeDraggable(el, opts) {
    el.addEventListener('pointerdown', e => {
      if (opts.disabled && opts.disabled()) return;
      e.preventDefault();
      const sx = e.clientX, sy = e.clientY;
      let moved = false;
      try { el.setPointerCapture(e.pointerId); } catch (err) { /* 忽略 */ }
      el.classList.add('dragging');
      const move = ev => {
        const dx = ev.clientX - sx, dy = ev.clientY - sy;
        if (Math.hypot(dx, dy) > 8) moved = true;
        el.style.transform = `translate(${dx}px, ${dy}px) scale(1.15)`;
      };
      const up = ev => {
        el.removeEventListener('pointermove', move);
        el.removeEventListener('pointerup', up);
        el.removeEventListener('pointercancel', up);
        const rect = el.getBoundingClientRect();
        el.classList.remove('dragging');
        el.style.transform = '';
        const target = opts.target();
        let hit = !moved;
        if (moved && ev.type === 'pointerup') {
          const r = target.getBoundingClientRect();
          hit = ev.clientX >= r.left - 20 && ev.clientX <= r.right + 20 && ev.clientY >= r.top - 20 && ev.clientY <= r.bottom + 20;
        }
        if (hit && opts.canDrop(el)) {
          flipMove(el, opts.dropInto ? opts.dropInto() : target, rect);
          opts.onDrop(el);
        } else if (moved && el.animate) {
          const now = el.getBoundingClientRect();
          el.animate([{ transform: `translate(${rect.left - now.left}px, ${rect.top - now.top}px)` }, { transform: 'none' }],
            { duration: 300, easing: 'ease-out' });
        }
      };
      el.addEventListener('pointermove', move);
      el.addEventListener('pointerup', up);
      el.addEventListener('pointercancel', up);
    });
  }

  /* ---------- 初始化 ---------- */
  function syncToggles() {
    const s = $('#soundToggle'), v = $('#voiceToggle');
    s.setAttribute('aria-pressed', state.sound);
    s.firstChild.textContent = state.sound ? '🔔' : '🔕';
    v.setAttribute('aria-pressed', state.voice);
    v.firstChild.textContent = state.voice ? '🔊' : '🔈';
  }

  function init() {
    load();
    loadLog();
    loadVoices();
    if ('speechSynthesis' in window) speechSynthesis.onvoiceschanged = loadVoices;
    updateStarCount();
    syncToggles();
    renderHome();

    document.addEventListener('click', e => {
      const goBtn = e.target.closest('[data-go]');
      if (goBtn) { sfx.tap(); go(goBtn.dataset.go); return; }
      const ageBtn = e.target.closest('[data-age]');
      if (ageBtn) {
        state.age = ageBtn.dataset.age;
        save();
        renderHome();
        sfx.pop();
        const a = AGES[state.age];
        toast(`已切換為 ${a.label}（${a.years}）：${a.desc}`);
      }
    });

    $('#soundToggle').addEventListener('click', () => {
      state.sound = !state.sound; save(); syncToggles();
      toast(state.sound ? '🔔 音效已開啟' : '🔕 音效已關閉');
    });
    $('#voiceToggle').addEventListener('click', () => {
      state.voice = !state.voice; save(); syncToggles();
      if (!('speechSynthesis' in window)) { toast('這個瀏覽器不支援語音唸題'); return; }
      toast(state.voice ? '🔊 語音唸題已開啟' : '🔈 語音唸題已關閉');
      if (state.voice) speak('語音唸題已開啟');
      else stopSpeaking();
    });
  }
  document.addEventListener('DOMContentLoaded', init);

  window.App = {
    state, AGES, STICKERS, STARS_PER_STICKER, SKILLS, MODULE_NAMES, modules,
    skillOf, record, getLog, clearLog,
    $, $$, rand, pick, opSym, opWord,
    ageCfg: () => AGES[state.age],
    save, makeProblem, speak, problemText, stopSpeaking, sfx,
    go, addStars, updateStarCount, cheer, toast, progressDots, modal, finishRound,
    createKeypad, flipMove, makeDraggable
  };
})();
