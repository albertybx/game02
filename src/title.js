// =====================================================================
// 標題畫面
// =====================================================================
class TitleScene extends Phaser.Scene {
  constructor() { super('title'); }

  init() {
    this.playerCount = 4;
    this.mode = 'cpu'; // cpu = 你 vs 電腦；hotseat = 大家輪流用同一支手機
  }

  preload() {
    // AI 畫的建築圖（登記在 data.js 的 BUILDING_IMAGES）
    for (const [key, path] of Object.entries(BUILDING_IMAGES)) this.load.image(`bld_${key}`, path);
    CHARACTERS.forEach((ch, i) => { if (ch.image) this.load.image(`charimg${i}`, ch.image); });
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
    this.input.on('pointerdown', () => Sfx.unlock());
    makeMusicButton(this, W - 46, 46);

    // 直版、橫版的位置
    const L = LANDSCAPE
      ? { t1: 86, t2: 186, sub: 258, chars: 345, names: 415, countLbl: 478, count: 540, modeLbl: 478, mode: 540, start: 656, hint: 728, countX: 340, modeX: 940 }
      : { t1: 150, t2: 260, sub: 340, chars: 450, names: 520, countLbl: 600, count: 660, modeLbl: 750, mode: 810, start: 940, hint: 1010, countX: W / 2, modeX: W / 2 };
    if (!LANDSCAPE) for (const k of ['t1', 't2', 'sub', 'chars', 'names', 'countLbl', 'count', 'modeLbl', 'mode', 'start', 'hint']) L[k] += TALL_DY;

    this.add.text(W / 2, L.t1, '台北政壇', { fontFamily: FONT, fontSize: '96px', color: '#ffec27', stroke: '#000000', strokeThickness: 12 }).setOrigin(0.5);
    this.add.text(W / 2, L.t2, '大富翁', { fontFamily: FONT, fontSize: '96px', color: '#ff004d', stroke: '#000000', strokeThickness: 12 }).setOrigin(0.5);
    this.add.text(W / 2, L.sub, '～ 買下台北，贏得選戰 ～', { fontFamily: FONT, fontSize: '28px', color: '#fff1e8' }).setOrigin(0.5);

    // 角色展示
    CHARACTERS.forEach((ch, i) => {
      const x = W / 2 - 240 + i * 160;
      const img = addCharacter(this, x, L.chars, i, 110);
      this.tweens.add({ targets: img, y: L.chars - 10, duration: 400 + i * 60, yoyo: true, repeat: -1, ease: 'Stepped', easeParams: [3] });
      this.add.text(x, L.names, ch.name, { fontFamily: FONT, fontSize: '24px', color: ch.color, stroke: '#000', strokeThickness: 6 }).setOrigin(0.5);
    });

    // 玩家人數
    this.add.text(L.countX, L.countLbl, '幾位候選人參選？', { fontFamily: FONT, fontSize: '28px', color: '#fff1e8' }).setOrigin(0.5);
    this.countBtns = [2, 3, 4].map((n, i) => makeButton(this, L.countX - 160 + i * 160, L.count, 130, 64, `${n} 人`, {
      onClick: () => { this.playerCount = n; this.refresh(); },
    }));

    // 模式
    this.add.text(L.modeX, L.modeLbl, '怎麼玩？', { fontFamily: FONT, fontSize: '28px', color: '#fff1e8' }).setOrigin(0.5);
    this.modeBtns = [
      makeButton(this, L.modeX - 160, L.mode, 280, 64, '我 vs 電腦', { fontSize: '26px', onClick: () => { this.mode = 'cpu'; this.refresh(); } }),
      makeButton(this, L.modeX + 160, L.mode, 280, 64, '朋友輪流玩', { fontSize: '26px', onClick: () => { this.mode = 'hotseat'; this.refresh(); } }),
    ];

    makeButton(this, W / 2, L.start, 360, 96, '開始選戰！', {
      fill: 0xff004d, color: '#fff1e8', fontSize: '44px',
      onClick: () => this.scene.start('game', { playerCount: this.playerCount, mode: this.mode }),
    });

    this.add.text(W / 2, L.hint, '點一下畫面開啟音樂和音效（右上角 ♪ 可關閉音樂）', { fontFamily: FONT, fontSize: '20px', color: '#83769c' }).setOrigin(0.5);
    this.refresh();
  }

  refresh() {
    this.countBtns.forEach((b, i) => b.body.setFillStyle([2, 3, 4][i] === this.playerCount ? 0xffec27 : 0x83769c));
    this.modeBtns[0].body.setFillStyle(this.mode === 'cpu' ? 0xffec27 : 0x83769c);
    this.modeBtns[1].body.setFillStyle(this.mode === 'hotseat' ? 0xffec27 : 0x83769c);
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

