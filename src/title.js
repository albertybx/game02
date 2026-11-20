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

    this.add.text(W / 2, 150, '台北政壇', { fontFamily: FONT, fontSize: '96px', color: '#ffec27', stroke: '#000000', strokeThickness: 12 }).setOrigin(0.5);
    this.add.text(W / 2, 260, '大富翁', { fontFamily: FONT, fontSize: '96px', color: '#ff004d', stroke: '#000000', strokeThickness: 12 }).setOrigin(0.5);
    this.add.text(W / 2, 340, '～ 買下台北，贏得選戰 ～', { fontFamily: FONT, fontSize: '28px', color: '#fff1e8' }).setOrigin(0.5);

    // 角色展示
    CHARACTERS.forEach((ch, i) => {
      const x = 120 + i * 160;
      const img = addCharacter(this, x, 450, i, 110);
      this.tweens.add({ targets: img, y: 440, duration: 400 + i * 60, yoyo: true, repeat: -1, ease: 'Stepped', easeParams: [3] });
      this.add.text(x, 520, ch.name, { fontFamily: FONT, fontSize: '24px', color: ch.color, stroke: '#000', strokeThickness: 6 }).setOrigin(0.5);
    });

    // 玩家人數
    this.add.text(W / 2, 600, '幾位候選人參選？', { fontFamily: FONT, fontSize: '28px', color: '#fff1e8' }).setOrigin(0.5);
    this.countBtns = [2, 3, 4].map((n, i) => makeButton(this, 200 + i * 160, 660, 130, 64, `${n} 人`, {
      onClick: () => { this.playerCount = n; this.refresh(); },
    }));

    // 模式
    this.add.text(W / 2, 750, '怎麼玩？', { fontFamily: FONT, fontSize: '28px', color: '#fff1e8' }).setOrigin(0.5);
    this.modeBtns = [
      makeButton(this, 200, 810, 280, 64, '我 vs 電腦', { fontSize: '26px', onClick: () => { this.mode = 'cpu'; this.refresh(); } }),
      makeButton(this, 520, 810, 280, 64, '朋友輪流玩', { fontSize: '26px', onClick: () => { this.mode = 'hotseat'; this.refresh(); } }),
    ];

    makeButton(this, W / 2, 940, 360, 96, '開始選戰！', {
      fill: 0xff004d, color: '#fff1e8', fontSize: '44px',
      onClick: () => this.scene.start('game', { playerCount: this.playerCount, mode: this.mode }),
    });

    this.add.text(W / 2, 1010, '音效：點按鈕後開啟', { fontFamily: FONT, fontSize: '20px', color: '#83769c' }).setOrigin(0.5);
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
    icons.forEach((k, i) => {
      addIcon(this, 60 + i * 100, H - 10, k, k === 'taipei101' ? 220 : 60).setOrigin(0.5, 1).setAlpha(0.35);
    });
    // 星星
    for (let i = 0; i < 40; i++) {
      const s = this.add.rectangle(Phaser.Math.Between(0, W), Phaser.Math.Between(0, 560), 4, 4, 0xfff1e8, 0.6);
      this.tweens.add({ targets: s, alpha: 0.1, duration: Phaser.Math.Between(400, 1400), yoyo: true, repeat: -1, ease: 'Stepped' });
    }
  }
}

