/* 十格框：數感（一眼看出數量）、湊滿 5／10（數的分與合）、湊十法（小一進位加法） */
(function () {
  const { $, $$, rand, pick } = App;
  const POOLS = {
    k1: ['count5', 'make5', 'count5', 'make5'],
    k2: ['count10', 'make10', 'make10'],
    g1: ['count20', 'make10', 'bridge', 'bridge']
  };
  const TOTAL = () => App.state.roundLen;
  let view, stage, pad, slot, q, idx, earned, tries, busy, bridged, timers = [];
  const later = (fn, ms) => timers.push(setTimeout(fn, ms));

  function enter() {
    view = document.getElementById('view-tenframe');
    stage = $('.stage', view);
    start();
  }
  function leave() { timers.forEach(clearTimeout); timers = []; }
  function start() { idx = 0; earned = 0; next(); }

  function makeQ() {
    const t = pick(POOLS[App.state.age]);
    if (t === 'count5') { const n = rand(1, 5); return { type: 'count', size: 5, n, ans: n }; }
    if (t === 'count10') { const n = rand(3, 10); return { type: 'count', size: 10, n, ans: n }; }
    if (t === 'count20') { const n = rand(11, 20); return { type: 'count', size: 20, n, ans: n }; }
    if (t === 'make5') { const n = rand(1, 4); return { type: 'make', size: 5, n, ans: 5 - n }; }
    if (t === 'make10') { const n = rand(1, 9); return { type: 'make', size: 10, n, ans: 10 - n }; }
    const a = rand(6, 9), b = rand(11 - a, 9);
    return { type: 'bridge', a, b, ans: a + b };
  }

  function frame(cells, filled, color) {
    return `<div class="tenframe f${cells}">` + Array.from({ length: cells }, (_, i) =>
      `<div class="cell">${i < filled ? `<span class="dot ${color}"></span>` : ''}</div>`).join('') + '</div>';
  }

  function next() {
    if (idx >= TOTAL()) { App.finishRound(earned, TOTAL(), start); return; }
    idx++; tries = 0; busy = false; bridged = false;
    q = makeQ();
    $('.round-progress', view).innerHTML = App.progressDots(idx, TOTAL());
    let body;
    if (q.type === 'count') {
      const frames = q.size === 20 ? frame(10, 10, 'pink') + frame(10, q.n - 10, 'pink') : frame(q.size, q.n, 'pink');
      body = `
        <p class="prompt">數一數，有幾個圓點？</p>
        <div class="frames">${frames}</div>
        <p class="small center">${q.size === 5 ? '一排有 5 格喔！' : '一排有 5 格，一個框有 10 格喔！'}</p>
        <div class="equation">一共有 <span class="slot">?</span> 個</div>`;
      App.speak('數一數，有幾個圓點？');
    } else if (q.type === 'make') {
      body = `
        <p class="prompt">還要幾個，才能把 ${q.size} 格都裝滿？</p>
        <div class="frames">${frame(q.size, q.n, 'pink')}</div>
        <p class="small center">可以點空格子，放上小青蛙點點來幫忙數。</p>
        <div class="equation"><b>${q.n}</b> + <span class="slot">?</span> = <b>${q.size}</b></div>`;
      App.speak(`${q.n} 再加幾個，會變成 ${q.size}？`);
    } else {
      body = `
        <p class="prompt">${q.a} + ${q.b} 等於多少？用「湊十」來想一想！</p>
        <div class="frames stack">${frame(10, q.a, 'pink')}${frame(10, q.b, 'green')}</div>
        <div class="bridge-row"><button class="btn bridge-btn">🐸 青蛙幫我湊十</button></div>
        <div class="bridge-steps"></div>
        <div class="equation"><b>${q.a}</b> + <b>${q.b}</b> = <span class="slot">?</span></div>`;
      App.speak(`${q.a} 加 ${q.b}，等於多少？`);
    }
    stage.innerHTML = `<div class="card activity">${body}</div><div class="pad-area"></div>`;
    slot = $('.slot', stage);
    pad = App.createKeypad($('.pad-area', stage), { display: slot, onSubmit: submit });

    if (q.type === 'make') {
      $$('.cell', stage).forEach(cell => {
        if (cell.children.length) return;
        cell.classList.add('tappable');
        cell.addEventListener('click', () => {
          if (busy) return;
          if (cell.firstChild) cell.firstChild.remove();
          else cell.innerHTML = '<span class="dot ghost"></span>';
          App.sfx.pop();
        });
      });
    }
    if (q.type === 'bridge') $('.bridge-btn', stage).addEventListener('click', doBridge);
  }

  function doBridge() {
    if (bridged) return;
    bridged = true;
    const btn = $('.bridge-btn', stage);
    btn.disabled = true;
    const k = 10 - q.a, rest = q.b - k;
    const frames = $$('.tenframe', stage);
    const topCells = $$('.cell', frames[0]);
    const moving = $$('.dot', frames[1]).slice(q.b - k).reverse();
    moving.forEach((dot, i) => later(() => { App.flipMove(dot, topCells[q.a + i]); App.sfx.pop(); }, 300 + i * 380));
    later(() => {
      $('.bridge-steps', stage).innerHTML = `
        <span>${q.a} + ${q.b}</span><span class="arrow">→</span>
        <span>${q.a} + <em>${k}</em> + ${rest}</span><span class="arrow">→</span>
        <span><strong>10</strong> + ${rest}</span>`;
      App.speak(`把 ${q.b} 拆成 ${k} 和 ${rest}。${q.a} 加 ${k} 湊成 10，10 再加 ${rest}`);
    }, 300 + k * 380 + 200);
  }

  function hint() {
    if (q.type === 'count') {
      $$('.dot', stage).forEach((d, i) => { d.textContent = i + 1; d.classList.add('num'); });
    } else if (q.type === 'make') {
      let n = 0;
      $$('.cell', stage).forEach(cell => {
        if (cell.querySelector('.dot.pink')) return;
        cell.innerHTML = `<span class="dot ghost num">${++n}</span>`;
      });
    } else {
      doBridge();
    }
  }

  function submit(v) {
    if (busy) return;
    if (v === q.ans) {
      busy = true;
      pad.enable(false);
      earned++;
      App.record('tenframe', (q.type === 'bridge' ? 'addCarry' : q.type), (q.type === 'bridge' ? `${q.a}+${q.b}` : q.type === 'make' ? `${q.n}+?=${q.size}` : `數 ${q.n} 個`), tries + 1, true);
      slot.classList.add('correct');
      App.addStars(1, slot);
      App.cheer(true);
      if (q.type === 'bridge' && !bridged) doBridge();
      later(next, q.type === 'bridge' ? 2600 : 1700);
      return;
    }
    tries++;
    if (tries >= 3) {
      App.record('tenframe', (q.type === 'bridge' ? 'addCarry' : q.type), (q.type === 'bridge' ? `${q.a}+${q.b}` : q.type === 'make' ? `${q.n}+?=${q.size}` : `數 ${q.n} 個`), tries, false);
      busy = true;
      pad.enable(false);
      slot.textContent = q.ans;
      slot.classList.add('reveal');
      hint();
      App.cheer(false, `答案是 ${q.ans}，下一題加油！`);
      later(next, 3000);
      return;
    }
    slot.classList.add('wrong');
    later(() => { slot.classList.remove('wrong'); pad.clear(); }, 650);
    if (tries === 1) App.cheer(false);
    else { App.cheer(false, q.type === 'bridge' ? '看青蛙怎麼湊十！' : '我們一起數一數！'); hint(); }
  }

  App.modules.tenframe = { enter, leave };
})();
