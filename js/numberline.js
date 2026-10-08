/* 數線跳跳：青蛙往右跳是加、往左跳是減；小一的進位／退位題會示範「先跳到 10」 */
(function () {
  const { $, $$ } = App;
  const TOTAL = () => App.state.roundLen;
  const PAD = 4;   // 數線左右留白（%）
  let view, stage, pad, slot, frog, q, N, pos, jumps, idx, earned, tries, busy, jumping, hinted, timers = [];
  const later = (fn, ms) => timers.push(setTimeout(fn, ms));
  const xOf = i => PAD + (i / N) * (100 - PAD * 2);

  function enter() {
    view = document.getElementById('view-numberline');
    stage = $('.stage', view);
    start();
  }
  function leave() { timers.forEach(clearTimeout); timers = []; }
  function start() { idx = 0; earned = 0; next(); }

  function next() {
    if (idx >= TOTAL()) { App.finishRound(earned, TOTAL(), start); return; }
    idx++; tries = 0; busy = false; jumping = false; hinted = false; jumps = 0;
    const max = App.ageCfg().max;
    N = max <= 10 ? 10 : 20;
    q = App.makeProblem(max, 'mix');
    pos = q.a;
    $('.round-progress', view).innerHTML = App.progressDots(idx, TOTAL());
    const dir = q.op === '+' ? '右' : '左';

    stage.innerHTML = `
      <div class="card activity">
        <p class="prompt">青蛙站在 <b class="hl-pink">${q.a}</b>，要往${dir}跳 <b class="hl-green">${q.b}</b> 格，<br>最後會跳到哪裡？</p>
        <div class="equation"><b>${q.a}</b> ${App.opSym(q.op)} <b>${q.b}</b> = <span class="slot">?</span></div>
        <div class="nl ${N > 10 ? 'nl-20' : ''}">
          <svg class="nl-arcs" viewBox="0 0 1000 100" preserveAspectRatio="none" aria-hidden="true"></svg>
          <div class="nl-labels"></div>
          <div class="nl-track"></div>
          ${Array.from({ length: N + 1 }, (_, i) =>
            `<button type="button" class="tick ${i === 10 ? 'ten' : ''} ${i === q.a ? 'start' : ''}" style="left:${xOf(i)}%" data-i="${i}" tabindex="-1"><span>${i}</span></button>`).join('')}
          <img class="nl-frog" src="images/frog.svg" alt="青蛙" style="left:${xOf(q.a)}%">
        </div>
        <div class="nl-ctrl">
          <button class="big-btn jump-btn">🐸 往${dir}跳一格</button>
          <span class="jump-count">跳了 0 / ${q.b} 下</span>
        </div>
        <p class="nl-explain small center"></p>
      </div>
      <div class="pad-area"></div>`;
    frog = $('.nl-frog', stage);
    slot = $('.slot', stage);
    pad = App.createKeypad($('.pad-area', stage), { display: slot, onSubmit: submit });
    $('.jump-btn', stage).addEventListener('click', () => jumpOnce());
    App.addSayButton(stage);
    App.ask(`青蛙站在 ${q.a}，要往${dir}跳 ${q.b} 格，會跳到哪裡？`);
  }

  function arc(from, to, cls) {
    const svg = $('.nl-arcs', stage);
    const x1 = xOf(from) * 10, x2 = xOf(to) * 10, h = Math.abs(to - from) > 1 ? 8 : 40;
    const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    p.setAttribute('d', `M${x1} 96 Q${(x1 + x2) / 2} ${h} ${x2} 96`);
    p.setAttribute('class', cls || '');
    p.setAttribute('vector-effect', 'non-scaling-stroke');
    svg.appendChild(p);
  }

  function hop(from, to, dur) {
    const x1 = xOf(from), x2 = xOf(to), lift = Math.abs(to - from) > 1 ? 70 : 40;
    frog.style.left = x2 + '%';
    if (frog.animate) {
      frog.animate([
        { left: x1 + '%', transform: 'translate(-50%, 0) scale(1)' },
        { left: (x1 + x2) / 2 + '%', transform: `translate(-50%, -${lift}px) scale(1.08)`, offset: 0.5 },
        { left: x2 + '%', transform: 'translate(-50%, 0) scale(1)' }
      ], { duration: dur, easing: 'ease-in-out' });
    }
  }

  function jumpOnce(quiet) {
    if (jumping || jumps >= q.b) return;
    jumping = true;
    const to = pos + (q.op === '+' ? 1 : -1);
    hop(pos, to, 360);
    arc(pos, to);
    App.sfx.pop();
    pos = to;
    jumps++;
    $('.jump-count', stage).textContent = `跳了 ${jumps} / ${q.b} 下`;
    if (!quiet) App.speak(String(jumps));
    later(() => {
      jumping = false;
      if (jumps >= q.b) {
        $('.jump-btn', stage).disabled = true;
        $(`.tick[data-i="${pos}"]`, stage).classList.add('land');
        if (!quiet) later(() => App.speak(`跳完了！青蛙停在哪個數字？`), 300);
      }
    }, 380);
  }

  // 提示：把剩下的格子跳完；小一的進位／退位題再示範先跳到 10
  function hint() {
    if (hinted) return;
    hinted = true;
    const remain = q.b - jumps;
    for (let i = 0; i < remain; i++) later(() => jumpOnce(true), i * 420);
    const crosses = (q.a < 10 && q.ans > 10) || (q.a > 10 && q.ans < 10);
    later(() => {
      const ex = $('.nl-explain', stage);
      if (crosses) {
        const k = Math.abs(10 - q.a), rest = q.b - k, s = App.opSym(q.op);
        arc(q.a, 10, 'big');
        arc(10, q.ans, 'big big2');
        const labels = $('.nl-labels', stage);
        labels.innerHTML = `<span style="left:${(xOf(q.a) + xOf(10)) / 2}%">${s}${k}</span><span class="b2" style="left:${(xOf(10) + xOf(q.ans)) / 2}%">${s}${rest}</span>`;
        ex.innerHTML = `大跳法：先跳 <b>${k}</b> 格到 <b>10</b>，再跳 <b>${rest}</b> 格。`;
        App.speak(`先跳 ${k} 格到 10，再跳 ${rest} 格`);
      } else {
        ex.innerHTML = '看看青蛙最後停在哪個數字？';
      }
    }, remain * 420 + 200);
  }

  function submit(v) {
    if (busy) return;
    if (v === q.ans) {
      busy = true;
      pad.enable(false);
      earned++;
      App.record('numberline', App.skillOf(q), `${q.a}${App.opSym(q.op)}${q.b}`, tries + 1, true);
      slot.classList.add('correct');
      if (jumps < q.b) {
        // 心算就答對了：讓青蛙一口氣跳過去
        hop(pos, q.ans, 600);
        arc(pos, q.ans, 'big');
        pos = q.ans;
        jumps = q.b;
        $('.jump-btn', stage).disabled = true;
      }
      $(`.tick[data-i="${q.ans}"]`, stage).classList.add('land');
      App.addStars(1, slot);
      App.cheer(true);
      later(next, 1800);
      return;
    }
    tries++;
    if (tries >= 3) {
      App.record('numberline', App.skillOf(q), `${q.a}${App.opSym(q.op)}${q.b}`, tries, false);
      busy = true;
      pad.enable(false);
      slot.textContent = q.ans;
      slot.classList.add('reveal');
      hint();
      App.cheer(false, `答案是 ${q.ans}，下一題加油！`);
      later(next, 3200);
      return;
    }
    slot.classList.add('wrong');
    later(() => { slot.classList.remove('wrong'); pad.clear(); }, 650);
    if (tries === 1) App.cheer(false, jumps < q.b ? '跳跳看再回答！' : undefined);
    else { App.cheer(false, '一起看青蛙怎麼跳！'); hint(); }
  }

  App.modules.numberline = { enter, leave };
})();
