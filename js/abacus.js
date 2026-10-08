/* 算盤（日式五珠算盤：上珠 1 顆代表 5，下珠 4 顆各代表 1）
   - Abacus.create：畫出算盤，可設定能否用手撥珠
   - Abacus.solveSteps：把一題加減法拆成撥珠步驟（含 5 的好朋友、10 的好朋友口訣）
   - Abacus.player：步驟播放器
   - 算盤教室頁面（自由撥珠、算式圖解） */
(function () {
  const { $, $$, rand } = App;
  const ROD_NAMES = ['個位', '十位', '百位'];

  function create(host, opts) {
    opts = opts || {};
    const rods = opts.rods || 2;
    const interactive = !!opts.interactive;
    const digits = new Array(rods).fill(0);
    const order = Array.from({ length: rods }, (_, i) => rods - 1 - i);   // 左邊是高位

    const el = document.createElement('div');
    el.className = 'abacus' + (interactive ? ' interactive' : '');
    el.innerHTML = `
      <div class="ab-row ab-digits">${order.map(r => `<span data-r="${r}">0</span>`).join('')}</div>
      <div class="abacus-frame">
        ${order.map(r => `
          <div class="rod-body" data-r="${r}">
            <div class="rod-line"></div>
            <div class="beam"></div>
            <button type="button" class="bead heaven" data-r="${r}" data-b="h" ${interactive ? '' : 'tabindex="-1"'} aria-label="${ROD_NAMES[r]}上珠，代表 5"></button>
            ${[0, 1, 2, 3].map(i => `<button type="button" class="bead earth" style="--i:${i}" data-r="${r}" data-b="${i}" ${interactive ? '' : 'tabindex="-1"'} aria-label="${ROD_NAMES[r]}下珠，代表 1"></button>`).join('')}
          </div>`).join('')}
      </div>
      <div class="ab-row ab-names">${order.map(r => `<span>${ROD_NAMES[r]}</span>`).join('')}</div>`;
    host.innerHTML = '';
    host.appendChild(el);

    function paint() {
      for (let r = 0; r < rods; r++) {
        const d = digits[r], body = $(`.rod-body[data-r="${r}"]`, el);
        $('.heaven', body).classList.toggle('on', d >= 5);
        $$('.earth', body).forEach((b, i) => b.classList.toggle('on', i < d % 5));
        $(`.ab-digits [data-r="${r}"]`, el).textContent = d;
      }
    }

    const api = {
      el,
      get value() { return digits.reduce((s, d, i) => s + d * Math.pow(10, i), 0); },
      setDigits(arr) { arr.forEach((d, i) => { if (i < rods) digits[i] = d; }); paint(); },
      setValue(v) { for (let i = 0; i < rods; i++) digits[i] = Math.floor(v / Math.pow(10, i)) % 10; paint(); },
      focus(r) {
        $$('.rod-body', el).forEach(b => b.classList.toggle('focus', r !== null && r !== undefined && +b.dataset.r === r));
        $$('.ab-digits span', el).forEach(s => s.classList.toggle('focus', r !== null && r !== undefined && +s.dataset.r === r));
      }
    };

    el.addEventListener('click', e => {
      const bead = e.target.closest('.bead');
      if (!bead || !interactive) return;
      const r = +bead.dataset.r;
      let h = digits[r] >= 5, ear = digits[r] % 5;
      if (bead.dataset.b === 'h') h = !h;
      else {
        const i = +bead.dataset.b;
        ear = i < ear ? i : i + 1;   // 點已靠樑的珠子：它和下面的一起撥下；點沒靠樑的：它和上面的一起撥上
      }
      digits[r] = (h ? 5 : 0) + ear;
      paint();
      App.sfx.pop();
      if (opts.onChange) opts.onChange(api.value);
    });

    paint();
    return api;
  }

  /* ---------- 解題步驟 ---------- */
  function solveSteps(a, op, b) {
    const v = [0, 0, 0];
    const steps = [];
    const N = ROD_NAMES;
    const push = (text, rod) => steps.push({ vals: v.slice(), text, rod });
    const total = op === '+' ? a + b : a - b;

    push('先把算盤清空，每一檔都是 <b>0</b>。', null);
    v[0] = a % 10; v[1] = Math.floor(a / 10) % 10;
    push(`撥入第一個數 <b>${a}</b>。`, a >= 10 ? 1 : 0);

    // 不用進位的加法
    function addDirect(r, d, prefix) {
      const cur = v[r];
      if (d >= 5) {
        v[r] += 5;
        push(prefix + '撥下 <b>上珠</b>（+5）', r);
        if (d > 5) { v[r] += d - 5; push(`再撥上 <b>${d - 5}</b> 顆下珠（+${d - 5}）`, r); }
      } else if (cur % 5 + d <= 4) {
        v[r] += d;
        push(prefix + `撥上 <b>${d}</b> 顆下珠`, r);
      } else {
        // 5 的好朋友：加 d ＝ 加 5 再減 (5−d)
        v[r] += 5;
        push(prefix + `下珠不夠撥。<b>${d}</b> 和 <b>${5 - d}</b> 是 5 的好朋友：先撥下上珠（+5）`, r);
        v[r] -= 5 - d;
        push(`再撥下 <b>${5 - d}</b> 顆下珠（−${5 - d}）`, r);
      }
    }
    // 不用借位的減法
    function subDirect(r, d, prefix) {
      const cur = v[r];
      if (d >= 5) {
        v[r] -= 5;
        push(prefix + '撥上 <b>上珠</b>（−5）', r);
        if (d > 5) { v[r] -= d - 5; push(`再撥下 <b>${d - 5}</b> 顆下珠（−${d - 5}）`, r); }
      } else if (cur % 5 >= d) {
        v[r] -= d;
        push(prefix + `撥下 <b>${d}</b> 顆下珠`, r);
      } else {
        // 5 的好朋友：減 d ＝ 加 (5−d) 再減 5
        v[r] += 5 - d;
        push(prefix + `下珠不夠減。<b>${d}</b> 和 <b>${5 - d}</b> 是 5 的好朋友：先撥上 <b>${5 - d}</b> 顆下珠（+${5 - d}）`, r);
        v[r] -= 5;
        push('再撥上上珠（−5）', r);
      }
    }
    function add(r, d, prefix) {
      prefix = prefix || `${N[r]}加 ${d}：`;
      if (v[r] + d <= 9) { addDirect(r, d, prefix); return; }
      // 10 的好朋友：加 d ＝ 本檔減 (10−d)，前一檔進 1
      const c = 10 - d;
      subDirect(r, c, `${N[r]}加 ${d}，這一檔放不下。<b>${d}</b> 和 <b>${c}</b> 是 10 的好朋友：先在${N[r]}減 ${c}，`);
      add(r + 1, 1, `再向${N[r + 1]}進 1：`);
    }
    function sub(r, d, prefix) {
      prefix = prefix || `${N[r]}減 ${d}：`;
      if (v[r] >= d) { subDirect(r, d, prefix); return; }
      // 借十：前一檔減 1，本檔加 (10−d)
      const c = 10 - d;
      sub(r + 1, 1, `${N[r]}減 ${d}，這一檔不夠減。先向${N[r + 1]}借 1：`);
      addDirect(r, c, `<b>${d}</b> 和 <b>${c}</b> 是 10 的好朋友，借來的 10 減掉 ${d} 剩 ${c}，${N[r]}加 ${c}：`);
    }

    const bd = [b % 10, Math.floor(b / 10)];
    [1, 0].forEach(r => { if (bd[r]) (op === '+' ? add : sub)(r, bd[r]); });
    push(`完成！看算盤：<b>${a} ${App.opSym(op)} ${b} = ${total}</b>`, null);
    return steps;
  }

  /* ---------- 播放器 ---------- */
  function player(host, prob) {
    host.innerHTML = `
      <div class="player">
        <div class="ab-holder"></div>
        <div class="player-side">
          <div class="step-count"></div>
          <div class="step-text" aria-live="polite"></div>
          <div class="player-ctrl">
            <button class="btn pbtn prev">◀ 上一步</button>
            <button class="big-btn pbtn play">▶ 自動播放</button>
            <button class="btn pbtn next">下一步 ▶</button>
          </div>
          <div class="legend"><span><i class="lg heaven"></i>上珠＝5</span><span><i class="lg earth"></i>下珠＝1</span><span>靠到橫樑才算數</span></div>
        </div>
      </div>`;
    const ab = create($('.ab-holder', host), { rods: 2 });
    const steps = solveSteps(prob.a, prob.op, prob.b);
    const text = $('.step-text', host), count = $('.step-count', host);
    const prev = $('.prev', host), next = $('.next', host), playBtn = $('.play', host);
    let i = 0, timer = null;

    function show(n, quiet) {
      i = Math.max(0, Math.min(steps.length - 1, n));
      const s = steps[i];
      ab.setDigits(s.vals);
      ab.focus(s.rod);
      text.innerHTML = s.text;
      count.textContent = `第 ${i + 1} / ${steps.length} 步`;
      prev.disabled = i === 0;
      next.disabled = i === steps.length - 1;
      if (!quiet) App.speak(text.textContent);
      if (i > 0) App.sfx.pop();
      if (i === steps.length - 1) stop();
    }
    function stop() { clearInterval(timer); timer = null; playBtn.textContent = '▶ 自動播放'; }
    function play() {
      if (timer) { stop(); return; }
      if (i === steps.length - 1) show(0);
      playBtn.textContent = '⏸ 暫停';
      timer = setInterval(() => show(i + 1), 2600);
    }
    prev.addEventListener('click', () => { stop(); show(i - 1); });
    next.addEventListener('click', () => { stop(); show(i + 1); });
    playBtn.addEventListener('click', play);
    show(0, true);
    return { destroy: stop };
  }

  function openDemo(prob) {
    let p;
    const m = App.modal(`
      <div class="modal-head">
        <h3>🧮 ${prob.a} ${App.opSym(prob.op)} ${prob.b}，用算盤怎麼算？</h3>
        <button class="close-x" data-close aria-label="關閉">✕</button>
      </div>
      <div class="demo-host"></div>
      <div class="modal-foot"><button class="big-btn" data-close>我懂了！</button></div>`,
      { onClose: () => p && p.destroy() });
    p = player($('.demo-host', m.el), prob);
  }

  /* ---------- 算盤教室頁面 ---------- */
  let view, demoPlayer, target, freeAb;

  function enter() {
    view = document.getElementById('view-abacus');
    $$('.tab', view).forEach(t => { t.onclick = () => switchTab(t.dataset.tab); });
    renderFree();
    renderDemo();
    switchTab('free');
  }
  function leave() { if (demoPlayer) demoPlayer.destroy(); }

  function switchTab(name) {
    $$('.tab', view).forEach(t => t.classList.toggle('active', t.dataset.tab === name));
    $$('.abacus-pane', view).forEach(p => { p.hidden = p.dataset.pane !== name; });
    if (name !== 'demo' && demoPlayer) demoPlayer.destroy();
  }

  function renderFree() {
    const pane = $('[data-pane="free"]', view);
    pane.innerHTML = `
      <div class="free-wrap">
        <div class="card free-ab"></div>
        <div class="free-side">
          <div class="card big-num-card"><span class="small">算盤上的數</span><div class="big-num">0</div></div>
          <div class="card target-card">
            <span class="small">👑 公主的挑戰：請撥出</span>
            <div class="target-num"></div>
            <div class="row-btns"><button class="btn say-again">🔈 再唸一次</button><button class="btn new-target">換一題</button><button class="btn clear-ab">🧹 清盤</button></div>
          </div>
          <p class="hint-text">上面一顆珠子代表 <b>5</b>，下面每顆代表 <b>1</b>。<br>把珠子撥到中間的橫樑才算數喔！點珠子就會移動。</p>
        </div>
      </div>`;
    const bigNum = $('.big-num', pane), tgt = $('.target-num', pane);
    let solved = false;
    freeAb = create($('.free-ab', pane), {
      rods: 2, interactive: true,
      onChange(val) {
        bigNum.textContent = val;
        App.speak(String(val));
        if (!solved && val === target) {
          solved = true;
          App.record('abacus', 'abacus', `撥出 ${target}`, 1, true);
          App.addStars(1, tgt);
          App.cheer(true, `對了！這就是 ${target}！`);
          setTimeout(newTarget, 1800);
        }
      }
    });
    function newTarget() {
      let t;
      do { t = rand(1, App.ageCfg().max); } while (t === target);
      target = t;
      solved = false;
      tgt.textContent = t;
      freeAb.setValue(0);
      bigNum.textContent = 0;
      App.ask(`請撥出 ${t}`);
    }
    $('.new-target', pane).onclick = newTarget;
    $('.clear-ab', pane).onclick = () => { freeAb.setValue(0); bigNum.textContent = 0; App.sfx.pop(); };
    newTarget();
  }

  function renderDemo() {
    const pane = $('[data-pane="demo"]', view);
    pane.innerHTML = `
      <div class="card demo-card">
        <div class="demo-top">
          <div class="equation demo-eq"></div>
          <button class="btn new-prob">🎲 換一題</button>
        </div>
        <div class="player-host"></div>
      </div>`;
    const load = () => {
      if (demoPlayer) demoPlayer.destroy();
      const max = App.ageCfg().max;
      const p = App.makeProblem(max, 'mix');
      $('.demo-eq', pane).innerHTML = `${p.a} ${App.opSym(p.op)} ${p.b} = <span class="slot filled">${p.ans}</span>`;
      demoPlayer = player($('.player-host', pane), p);
    };
    $('.new-prob', pane).onclick = load;
    load();
  }

  window.Abacus = { create, solveSteps, player, openDemo };
  App.modules.abacus = { enter, leave };
})();
