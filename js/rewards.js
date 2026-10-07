/* 我的寶盒：星星與貼紙收藏 */
(function () {
  const { $ } = App;

  function enter() {
    const view = document.getElementById('view-rewards');
    const box = $('.stage-plain', view);
    const stars = App.state.stars, per = App.STARS_PER_STICKER;
    const unlocked = Math.min(App.STICKERS.length, Math.floor(stars / per));
    const allDone = unlocked >= App.STICKERS.length;
    const toNext = per - (stars % per);

    box.innerHTML = `
      <div class="card reward-summary">
        <img src="images/princess.svg" alt="">
        <div>
          <div class="reward-stars">⭐ ${stars}</div>
          <p>${allDone ? '貼紙全部收集完成！你是數學城堡的小國王／小女王！' : `再拿 <b>${toNext}</b> 顆星星，就能得到下一張貼紙！`}</p>
          <div class="meter"><span style="width:${allDone ? 100 : ((stars % per) / per) * 100}%"></span></div>
        </div>
        <img src="images/frog.svg" alt="">
      </div>
      <div class="sticker-grid">
        ${App.STICKERS.map((s, i) => i < unlocked
          ? `<div class="sticker"><span class="sticker-e">${s.e}</span><span class="sticker-n">${s.n}</span></div>`
          : `<div class="sticker locked"><span class="sticker-e">🔒</span><span class="sticker-n">${(i + 1) * per} 顆星</span></div>`).join('')}
      </div>
      <div class="parent-link"><button class="btn" data-go="parent">👨‍👩‍👧 家長專區</button></div>`;
  }

  App.modules.rewards = { enter };
})();
