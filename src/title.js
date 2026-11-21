// =====================================================================
// 標題畫面
// =====================================================================
class TitleScene extends Phaser.Scene {
  constructor() { super('title'); }

  init() {
    // 首頁的選項（會記住上次的選擇）
    this.opts = { playerCount: 4, mode: 'cpu', rounds: 30, quiz: false, quizLevel: 'junior' };
    try { Object.assign(this.opts, JSON.parse(localStorage.getItem('options') || '{}')); } catch (e) { /* 讀不到就用預設 */ }
    if (!ROUND_OPTIONS.includes(this.opts.rounds)) this.opts.rounds = 30;
    this.opts.cast = normalizeCast(this.opts.cast);
    this.rows = [];
  }

  preload() {
    // AI 畫的建築圖（登記在 data.js 的 BUILDING_IMAGES）
    const v = `?v=${window.GAME_VERSION || ''}`; // 版本號：更新後瀏覽器會重新下載圖片
    for (const [key, path] of Object.entries(BUILDING_IMAGES)) this.load.image(`bld_${key}`, path + v);
    CHARACTERS.forEach((ch, i) => { if (ch.image) this.load.image(`charsrc${i}`, ch.image + v); });
    GENERALS.forEach((g) => this.load.image(`genimg${g.id}`, g.image + v));
    this.load.on('loaderror', (file) => console.warn('圖片載入失敗：', file.src));
  }

  create() {
    for (const key of Object.keys(ART)) makePixelTexture(this, key, ART[key]);
    CHARACTERS.forEach((_, i) => makeCharacterTexture(this, i));
    makeDiceTextures(this);

    this.cameras.main.setBackgroundColor(COLORS.bg);
    this.drawSkyline();

    // 背景音樂：點一下畫面任何地方就會開始（瀏覽器規定要先點過才能有聲音）
    Music.want('title');

    // 最上面：左邊「選戰指南」、右邊音樂開關
    makeButton(this, 118, 44, 210, 52, '選戰指南', { fill: 0xffec27, fontSize: '24px', onClick: () => showGuide() });
    makeMusicButton(this, W - 46, 44);

    // 直版、橫版的位置（直版畫面比較高時整體往下移，保持置中）
    const dy = TALL_DY;
    const L = LANDSCAPE
      ? { t1: 70, t2: 154, size: '80px', sub: 214, chars: 292, names: 360, start: 672,
        left: { x: 70, w: 540 }, right: { x: 670, w: 540 }, rowY: [430, 500, 570] }
      : { t1: 140 + dy, t2: 236 + dy, size: '96px', sub: 306 + dy, chars: 392 + dy, names: 458 + dy, start: 942 + dy,
        left: { x: 30, w: 660 }, right: { x: 30, w: 660 }, rowY: [530 + dy, 604 + dy, 678 + dy, 752 + dy, 826 + dy] };

    this.add.text(W / 2, L.t1, '台北政壇', { fontFamily: FONT, fontSize: L.size, color: '#ffec27', stroke: '#000000', strokeThickness: 12 }).setOrigin(0.5);
    this.add.text(W / 2, L.t2, '大富翁', { fontFamily: FONT, fontSize: L.size, color: '#ff004d', stroke: '#000000', strokeThickness: 12 }).setOrigin(0.5);
    this.add.text(W / 2, L.sub, '～ 買下台北，贏得選戰 ～', { fontFamily: FONT, fontSize: '28px', color: '#fff1e8' }).setOrigin(0.5);

    // 角色展示：點一下可以換角色
    this.L = L;
    this.castObjs = [];

    // 選項：直版是一欄五排；橫版是左邊三排（人數、玩法、回合）、右邊兩排（英文挑戰、程度）
    const ry = L.rowY;
    const leftCol = L.left;
    const rightCol = L.right;
    this.optionRow('人數', leftCol, ry[0], 'playerCount', [2, 3, 4].map((n) => ({ text: `${n} 人`, value: n })));
    this.optionRow('玩法', leftCol, ry[1], 'mode', [{ text: '我 vs 電腦', value: 'cpu' }, { text: '朋友輪流玩', value: 'hotseat' }]);
    this.optionRow('回合數', leftCol, ry[2], 'rounds', ROUND_OPTIONS.map((n) => ({ text: `${n} 回合`, value: n })));
    this.optionRow('英文挑戰', rightCol, LANDSCAPE ? ry[0] : ry[3], 'quiz', [{ text: '不加入', value: false }, { text: '加入', value: true }]);
    this.optionRow('測驗程度', rightCol, LANDSCAPE ? ry[1] : ry[4], 'quizLevel', QUIZ_LEVELS.map((lv) => ({ text: lv.name, value: lv.key })), () => this.opts.quiz);

    makeButton(this, W / 2, L.start, 360, LANDSCAPE ? 84 : 92, '開始選戰！', {
      fill: 0xff004d, color: '#fff1e8', fontSize: '44px',
      onClick: () => {
        try { localStorage.setItem('options', JSON.stringify(this.opts)); } catch (e) { /* 存不了沒關係 */ }
        this.scene.start('game', { ...this.opts });
      },
    });

    // 版本號（確認是不是最新版用）
    this.add.text(12, H - 30, `版本 ${window.GAME_VERSION || ''}`, { fontFamily: FONT, fontSize: '18px', color: '#83769c' });
    this.refresh();
    if (!Sfx.ready) this.showPressStart();
  }

  // 一排選項：左邊是標題，右邊幾個按鈕，選中的是黃色。enabled() 回傳 false 時整排變暗、不能按
  optionRow(label, col, y, key, items, enabled = () => true) {
    const lw = 150;
    const gap = 10;
    const n = items.length;
    const bw = (col.w - lw - gap * (n - 1)) / n;
    const title = this.add.text(col.x, y, label, { fontFamily: FONT, fontSize: '26px', color: '#fff1e8' }).setOrigin(0, 0.5);
    const btns = items.map((it, k) => makeButton(this, col.x + lw + bw / 2 + k * (bw + gap), y, bw, 58, it.text, {
      fontSize: it.text.length > 5 ? '22px' : '26px',
      onClick: () => {
        if (!enabled()) return;
        this.opts[key] = it.value;
        this.refresh();
      },
    }));
    this.rows.push({ key, items, btns, title, enabled });
  }

  // 角色展示（人數改變時重畫）
  drawCast() {
    const L = this.L;
    this.castObjs.forEach((o) => o.destroy());
    this.castObjs = [];
    applyCastTextures(this, this.opts.cast);
    const n = this.opts.playerCount;
    for (let i = 0; i < n; i++) {
      const x = W / 2 + (i - (n - 1) / 2) * 160;
      const info = castInfo(this.opts.cast[i]);
      const who = this.opts.mode === 'cpu' ? (i === 0 ? '你' : '電腦') : `玩家${i + 1}`;
      const tag = this.add.text(x, L.names + 30, `${who}・點我換`, { fontFamily: FONT, fontSize: '16px', color: '#000000', backgroundColor: CHARACTERS[i].color, padding: { x: 6, y: 2 } }).setOrigin(0.5)
        .setInteractive({ useHandCursor: true }).on('pointerup', () => this.pickCast(i));
      const img = addCharacter(this, x, L.chars, i, 110);
      img.setInteractive({ useHandCursor: true }).on('pointerup', () => this.pickCast(i));
      this.tweens.add({ targets: img, y: L.chars - 10, duration: 400 + i * 60, yoyo: true, repeat: -1, ease: 'Stepped', easeParams: [3] });
      const name = this.add.text(x, L.names, info.name, { fontFamily: FONT, fontSize: '24px', color: CHARACTERS[i].color, stroke: '#000', strokeThickness: 6 }).setOrigin(0.5)
        .setInteractive({ useHandCursor: true }).on('pointerup', () => this.pickCast(i));
      this.castObjs.push(tag, img, name);
    }
  }

  // 選角色視窗：4 位政治人物＋12 位戰將
  async pickCast(seat) {
    if (document.querySelector('.gv-modal')) return;
    Sfx.click();
    const cast = this.opts.cast;
    const v = window.GAME_VERSION || '';
    const n = this.opts.playerCount;
    const who = (i) => (this.opts.mode === 'cpu' ? (i === 0 ? '你' : `電腦${i}`) : `玩家${i + 1}`);
    const card = (o) => {
      const at = cast.indexOf(o.key);
      const mine = at === seat;
      const used = at >= 0 && at < n && !mine;
      return `<button type="button" class="cs-pick${mine ? ' cs-on' : ''}" data-v="${o.key}">
        <span class="cs-img" style="background-image:url('${o.image}?v=${v}')"></span>
        <b>${escapeHTML(o.name)}</b><small>${escapeHTML(o.title)}</small>
        ${mine ? '<em>目前</em>' : used ? `<em>${who(at)}在用・會交換</em>` : ''}
      </button>`;
    };
    const opts = castOptions();
    const pick = await gvModal({
      title: `${who(seat)}要當誰？`, color: CHARACTERS[seat].color,
      body: `<p class="gv-tip">選戰將當候選人的話，那位戰將就不會出現在招募站。</p>
        <h4>政治人物</h4><div class="cs-grid">${opts.filter((o) => !o.genId && o.genId !== 0).map(card).join('')}</div>
        <h4>戰將</h4><div class="cs-grid">${opts.filter((o) => o.genId !== undefined).map(card).join('')}</div>
        <button type="button" class="gv-skip" data-v="back">取消</button>`,
    });
    if (!pick || pick === 'back') return;
    const other = cast.indexOf(pick);
    if (other >= 0) cast[other] = cast[seat]; // 別人在用：交換
    cast[seat] = pick;
    try { localStorage.setItem('options', JSON.stringify(this.opts)); } catch (e) { /* 存不了沒關係 */ }
    this.drawCast();
  }

  refresh() {
    this.drawCast();
    for (const row of this.rows) {
      const on = row.enabled();
      row.title.setAlpha(on ? 1 : 0.4);
      row.btns.forEach((b, k) => {
        b.body.setFillStyle(row.items[k].value === this.opts[row.key] ? 0xffec27 : 0x83769c);
        b.setAlpha(on ? 1 : 0.35);
      });
    }
  }

  // 「點一下開始」畫面：瀏覽器不允許網頁一打開就自動出聲，要先點一下。
  // 用這個畫面讓第一下點擊自然發生，點完音樂就開始。
  showPressStart() {
    const layer = this.add.container(0, 0).setDepth(200);
    const bg = this.add.rectangle(0, 0, W, H, 0x0b1020, 0.92).setOrigin(0).setInteractive();
    layer.add(bg);
    layer.add(this.add.text(W / 2, H / 2 - 150, '台北政壇大富翁', {
      fontFamily: FONT, fontSize: '64px', color: '#ffec27', stroke: '#000000', strokeThickness: 10,
    }).setOrigin(0.5));
    const press = this.add.text(W / 2, H / 2 + 10, '▶ 點一下開始', {
      fontFamily: FONT, fontSize: '48px', color: '#fff1e8', stroke: '#000000', strokeThickness: 8,
    }).setOrigin(0.5);
    layer.add(press);
    this.tweens.add({ targets: press, alpha: 0.15, duration: 500, yoyo: true, repeat: -1, ease: 'Stepped', easeParams: [1] });
    layer.add(this.add.text(W / 2, H / 2 + 90, '會開啟音樂和音效', {
      fontFamily: FONT, fontSize: '24px', color: '#83769c',
    }).setOrigin(0.5));
    bg.once('pointerup', () => {
      Sfx.unlock();
      Sfx.coin();
      this.tweens.add({ targets: layer, alpha: 0, duration: 250, onComplete: () => layer.destroy() });
    });
  }

  drawSkyline() {
    // 背景小小的台北天際線
    const icons = ['longshan', 'station', 'presidential', 'taipei101', 'grandhotel', 'arena', 'cks'];
    const step = W / icons.length;
    icons.forEach((k, i) => {
      addIcon(this, step / 2 + i * step, H - 10, k, k === 'taipei101' ? 220 : 60).setOrigin(0.5, 1).setAlpha(0.35);
    });
    // 星星
    for (let i = 0; i < 40; i++) {
      const s = this.add.rectangle(Phaser.Math.Between(0, W), Phaser.Math.Between(0, 560), 4, 4, 0xfff1e8, 0.6);
      this.tweens.add({ targets: s, alpha: 0.1, duration: Phaser.Math.Between(400, 1400), yoyo: true, repeat: -1, ease: 'Stepped' });
    }
  }
}

