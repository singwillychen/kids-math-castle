/* 數蘋果：具體操作（CPA 的第一步）。加法把蘋果放進籃子，減法把蘋果餵給青蛙。 */
(function () {
  const { $, $$ } = App;
  const TOTAL = () => App.state.roundLen;
  let view, stage, pad, slot, q, idx, earned, tries, busy, timers = [];

  const later = (fn, ms) => timers.push(setTimeout(fn, ms));
  const apples = n => Array.from({ length: n }, () =>
    '<span class="item"><img src="images/apple.svg" alt="蘋果" draggable="false"></span>').join('');

  function enter() {
    view = document.getElementById('view-objects');
    stage = $('.stage', view);
    start();
  }
  function leave() { timers.forEach(clearTimeout); timers = []; }

  function start() { idx = 0; earned = 0; next(); }

  function next() {
    if (idx >= TOTAL()) { App.finishRound(earned, TOTAL(), start); return; }
    idx++; tries = 0; busy = false;
    const max = App.ageCfg().max;
    const op = Math.random() < (max === 5 ? 0.65 : 0.5) ? '+' : '-';
    q = App.makeProblem(max, op);
    $('.round-progress', view).innerHTML = App.progressDots(idx, TOTAL());
    q.op === '+' ? drawPlus() : drawMinus();
    slot = $('.slot', stage);
    pad = App.createKeypad($('.pad-area', stage), { display: slot, onSubmit: submit });
  }

  function drawPlus() {
    stage.innerHTML = `
      <div class="card activity">
        <p class="prompt">把蘋果都放進籃子裡，數一數，一共有幾顆？</p>
        <div class="equation"><b>${q.a}</b> + <b>${q.b}</b> = <span class="slot">?</span></div>
        <div class="obj-row">
          <div class="plate" data-src>${apples(q.a)}</div>
          <div class="obj-op">+</div>
          <div class="plate" data-src>${apples(q.b)}</div>
        </div>
        <div class="basket"><div class="basket-items numbered"></div><span class="basket-label">🧺 籃子</span></div>
        <p class="small center">小提示：可以用手指拖曳，也可以直接點蘋果喔！</p>
      </div>
      <div class="pad-area"></div>`;
    const dst = $('.basket-items', stage);
    $$('[data-src] .item', stage).forEach(item => App.makeDraggable(item, {
      disabled: () => busy || item.parentElement === dst,
      target: () => $('.basket', stage),
      dropInto: () => dst,
      canDrop: () => true,
      onDrop: () => {
        App.sfx.pop();
        renumber(dst);
        const n = dst.children.length;
        App.speak(String(n));
        if (n === q.a + q.b) later(() => App.speak('數完了！一共有幾顆呢？'), 600);
      }
    }));
    App.speak(`${q.a} 顆蘋果，再加 ${q.b} 顆蘋果，一共有幾顆？`);
  }

  function drawMinus() {
    stage.innerHTML = `
      <div class="card activity">
        <p class="prompt">籃子裡有 ${q.a} 顆蘋果，青蛙王子肚子餓了，要吃 ${q.b} 顆。<br>把 ${q.b} 顆蘋果拿給青蛙，還剩幾顆？</p>
        <div class="equation"><b>${q.a}</b> − <b>${q.b}</b> = <span class="slot">?</span></div>
        <div class="obj-row minus">
          <div class="basket"><div class="basket-items" data-src>${apples(q.a)}</div><span class="basket-label">🧺 籃子</span></div>
          <div class="frog-zone">
            <img src="images/frog.svg" alt="青蛙王子">
            <div class="frog-belly numbered"></div>
            <span class="frog-count">吃了 0 顆</span>
          </div>
        </div>
        <p class="small center">小提示：可以用手指拖曳，也可以直接點蘋果喔！</p>
      </div>
      <div class="pad-area"></div>`;
    const belly = $('.frog-belly', stage);
    $$('[data-src] .item', stage).forEach(item => App.makeDraggable(item, {
      disabled: () => busy || item.parentElement === belly,
      target: () => $('.frog-zone', stage),
      dropInto: () => belly,
      canDrop: () => {
        if (belly.children.length >= q.b) { App.toast('青蛙已經吃飽了，不能再吃囉！🐸'); return false; }
        return true;
      },
      onDrop: () => {
        App.sfx.pop();
        renumber(belly);
        const n = belly.children.length;
        $('.frog-count', stage).textContent = `吃了 ${n} 顆`;
        if (n === q.b) later(() => App.speak('謝謝你！籃子裡還剩幾顆呢？'), 400);
        else App.speak(String(n));
      }
    }));
    App.speak(`籃子裡有 ${q.a} 顆蘋果，青蛙要吃 ${q.b} 顆，還剩幾顆？`);
  }

  function renumber(box) { $$('.item', box).forEach((it, i) => { it.dataset.n = i + 1; }); }

  // 第二次答錯時：幫忙把蘋果移好並標上數字
  function hint() {
    if (q.op === '+') {
      const dst = $('.basket-items', stage);
      $$('[data-src] .item', stage).forEach((it, i) => later(() => { App.flipMove(it, dst); renumber(dst); }, i * 120));
    } else {
      const belly = $('.frog-belly', stage), src = $('[data-src]', stage);
      const need = q.b - belly.children.length;
      $$('.item', src).slice(0, need).forEach((it, i) => later(() => {
        App.flipMove(it, belly); renumber(belly);
        $('.frog-count', stage).textContent = `吃了 ${belly.children.length} 顆`;
      }, i * 120));
      later(() => { renumber(src); src.classList.add('numbered'); }, need * 120 + 200);
    }
  }

  function submit(v) {
    if (busy) return;
    if (v === q.ans) {
      busy = true;
      pad.enable(false);
      earned++;
      App.record('objects', App.skillOf(q), `${q.a}${App.opSym(q.op)}${q.b}`, tries + 1, true);
      slot.classList.add('correct');
      App.addStars(1, slot);
      App.cheer(true);
      later(next, 1700);
      return;
    }
    tries++;
    if (tries >= 3) {
      App.record('objects', App.skillOf(q), `${q.a}${App.opSym(q.op)}${q.b}`, tries, false);
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
    else { App.cheer(false, '我們一起數一數！'); hint(); }
  }

  App.modules.objects = { enter, leave };
})();
