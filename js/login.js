/* 登入畫面：選擇玩家、建立帳號（名字＋頭像＋年齡）；帳號編輯器也給家長專區使用 */
(function () {
  const { $, $$, esc } = App;

  function enter() {
    const box = $('.stage-plain', document.getElementById('view-login'));
    const list = Object.values(Store.db.profiles).sort((a, b) => (a.created || 0) - (b.created || 0));
    const status = Store.status();
    box.innerHTML = `
      <div class="login-hero">
        <img src="images/princess.svg" alt="">
        <div class="bubble">${list.length ? '誰要來玩呢？<br>點自己的頭像就可以開始！' : '歡迎來到數學城堡！<br>先建立你的帳號吧～'}</div>
        <img src="images/frog.svg" alt="">
      </div>
      <div class="profile-grid">
        ${list.map(p => `
          <button class="profile-card" data-login="${p.id}">
            ${App.avatarHTML(p.avatar, 'avatar-lg')}
            <span class="pc-name">${esc(p.name)}</span>
            <span class="pc-meta">${App.AGES[p.age] ? App.AGES[p.age].label : ''} · ⭐ ${p.stars || 0}</span>
          </button>`).join('')}
        <button class="profile-card add-card">
          <span class="avatar avatar-lg add-plus">＋</span>
          <span class="pc-name">新增小朋友</span>
          <span class="pc-meta">建立新帳號</span>
        </button>
      </div>
      ${status.folder === 'needs-permission' ? `<div class="center"><button class="btn reconnect-btn">🔗 重新連接存檔資料夾「${esc(status.folderName)}」</button></div>` : ''}
      <p class="tip">帳號和練習紀錄${status.server === 'ok' ? '會同步存到 NAS／電腦伺服器' : '存在這台裝置'}。刪除帳號請到家長專區。</p>`;

    $$('[data-login]', box).forEach(b => b.addEventListener('click', () => App.login(b.dataset.login)));
    $('.add-card', box).addEventListener('click', () => openEditor(null, id => App.login(id)));
    const rc = $('.reconnect-btn', box);
    if (rc) rc.addEventListener('click', async () => {
      try { await Store.reconnectFolder(); App.toast('已重新連接資料夾'); enter(); }
      catch (e) { App.toast('沒有連接成功：' + (e.message || e)); }
    });
  }

  // 上傳的圖片裁成正方形並縮小，避免存檔太大
  function resizeImage(file) {
    return new Promise((res, rej) => {
      const fr = new FileReader();
      fr.onerror = () => rej(fr.error);
      fr.onload = () => {
        const img = new Image();
        img.onerror = () => rej(new Error('無法讀取這張圖片'));
        img.onload = () => {
          const size = 160, c = document.createElement('canvas');
          c.width = c.height = size;
          const s = Math.min(img.width, img.height);
          const ctx = c.getContext('2d');
          ctx.fillStyle = '#fff';
          ctx.fillRect(0, 0, size, size);
          ctx.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, size, size);
          res(c.toDataURL('image/jpeg', 0.85));
        };
        img.src = fr.result;
      };
      fr.readAsDataURL(file);
    });
  }

  // profile 為 null 時是建立新帳號
  function openEditor(profile, onSaved) {
    const isNew = !profile;
    const draft = {
      name: profile ? profile.name : '',
      age: profile ? profile.age : 'k2',
      avatar: profile ? Object.assign({}, profile.avatar) : { type: 'emoji', v: App.AVATARS[0], bg: App.AVATAR_BGS[0] }
    };
    const m = App.modal(`
      <div class="modal-head">
        <h3>${isNew ? '🌟 建立新帳號' : '✏️ 編輯帳號'}</h3>
        <button class="close-x" data-close aria-label="關閉">✕</button>
      </div>
      <div class="editor">
        <div class="editor-preview"></div>
        <label class="field">
          <span>名字</span>
          <input class="name-input" type="text" maxlength="10" placeholder="輸入名字，例如：小美" autocomplete="off">
        </label>
        <div class="field">
          <span>年齡</span>
          <div class="chips">${Object.entries(App.AGES).map(([k, a]) =>
            `<button type="button" class="chip" data-pick-age="${k}">${a.label}（${a.years}）</button>`).join('')}</div>
        </div>
        <div class="field">
          <span>選一個頭像</span>
          <div class="avatar-grid">
            <label class="avatar-opt upload-opt" title="上傳自己的圖片">📷<input type="file" accept="image/*" hidden></label>
            ${App.AVATARS.map((e, i) => `<button type="button" class="avatar-opt" data-av="${i}" style="background:${App.AVATAR_BGS[i % App.AVATAR_BGS.length]}">${e}</button>`).join('')}
          </div>
          <p class="small">📷 可以上傳家裡的照片或喜歡的圖片當頭像（會自動裁成正方形）。</p>
        </div>
        <p class="editor-msg"></p>
        <div class="modal-foot"><button class="big-btn save-btn">${isNew ? '建立帳號，開始玩！' : '儲存'}</button></div>
      </div>`);
    const el = m.el, nameInput = $('.name-input', el);
    nameInput.value = draft.name;

    function paint() {
      $('.editor-preview', el).innerHTML = `${App.avatarHTML(draft.avatar, 'avatar-xl')}<span class="pc-name">${esc(nameInput.value.trim() || '我的名字')}</span>`;
      $$('[data-pick-age]', el).forEach(b => b.classList.toggle('active', b.dataset.pickAge === draft.age));
      $$('[data-av]', el).forEach(b => b.classList.toggle('active', draft.avatar.type === 'emoji' && draft.avatar.v === App.AVATARS[+b.dataset.av]));
      $('.upload-opt', el).classList.toggle('active', draft.avatar.type === 'img');
    }
    nameInput.addEventListener('input', paint);
    $$('[data-pick-age]', el).forEach(b => b.addEventListener('click', () => { draft.age = b.dataset.pickAge; App.sfx.tap(); paint(); }));
    $$('[data-av]', el).forEach(b => b.addEventListener('click', () => {
      const i = +b.dataset.av;
      draft.avatar = { type: 'emoji', v: App.AVATARS[i], bg: App.AVATAR_BGS[i % App.AVATAR_BGS.length] };
      App.sfx.pop();
      paint();
    }));
    $('.upload-opt input', el).addEventListener('change', async e => {
      const f = e.target.files && e.target.files[0];
      if (!f) return;
      try { draft.avatar = { type: 'img', v: await resizeImage(f) }; paint(); }
      catch (err) { $('.editor-msg', el).textContent = err.message || '圖片讀取失敗'; }
    });
    $('.save-btn', el).addEventListener('click', () => {
      const name = nameInput.value.trim();
      if (!name) { $('.editor-msg', el).textContent = '請先輸入名字喔！'; nameInput.focus(); return; }
      let id;
      if (isNew) id = Store.createProfile({ name, age: draft.age, avatar: draft.avatar });
      else {
        Object.assign(profile, { name, age: draft.age, avatar: draft.avatar });
        Store.touch(profile.id);
        id = profile.id;
      }
      App.sfx.win();
      m.close();
      if (onSaved) onSaved(id);
    });
    paint();
    setTimeout(() => nameInput.focus(), 60);
  }

  App.openProfileEditor = openEditor;
  App.modules.login = { enter };
})();
