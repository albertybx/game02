// =====================================================================
// HUD：疊在地圖上面、不會跟著捲動的介面
// 直版（手機）：上方玩家資訊，下方骰子、訊息、按鈕
// 橫版（電腦）：左邊欄放玩家資訊和按鈕，下方放骰子和訊息
// =====================================================================

const HUD_TOP = 136;       // 直版：上方玩家列的高度
const HUD_BOTTOM = H - 250; // 直版：下方面板從這裡開始（固定在畫面最下面 250 像素）
const SIDEBAR = 300;       // 橫版：左邊欄寬度
const STRIP = 630;         // 橫版：下方訊息列從這裡開始

class HudScene extends Phaser.Scene {
  constructor() { super('hud'); }

  init(data) {
    this.gs = data.game; // 遊戲畫面（GameScene）
  }

  create() {
    this.drawPanels();
    this.drawBottom();
    this.choiceLayer = this.add.container(0, 0).setDepth(20);
    this.cardLayer = this.add.container(0, 0).setDepth(50);
    this.scene.bringToTop();
  }

  // ---------- 上方玩家資訊 ----------
  drawPanels() {
    const players = this.gs.players;
    let pw;
    let pos;
    if (LANDSCAPE) {
      this.add.rectangle(0, 0, SIDEBAR, H, 0x1d2b53, 0.95).setOrigin(0);
      this.add.rectangle(SIDEBAR - 4, 0, 4, H, 0x000000).setOrigin(0);
      pw = SIDEBAR - 24;
      pos = (i) => ({ x: 10, y: 10 + i * 124 });
    } else {
      this.add.rectangle(0, 0, W, HUD_TOP, 0x1d2b53, 0.92).setOrigin(0);
      this.add.rectangle(0, HUD_TOP - 4, W, 4, 0x000000).setOrigin(0);
      pw = 168;
      const gap = 8;
      const total = players.length * pw + (players.length - 1) * gap;
      const left = (W - total) / 2;
      pos = (i) => ({ x: left + i * (pw + gap), y: 10 });
    }
    this.panels = players.map((p, i) => {
      const { x, y } = pos(i);
      const c = this.add.container(x, y);
      const highlight = this.add.rectangle(-4, -4, pw + 8, 116 + 8, COLORS.yellow).setOrigin(0).setVisible(false);
      const box = this.add.rectangle(0, 0, pw, 116, COLORS.panel).setOrigin(0).setStrokeStyle(3, 0x000000);
      const band = this.add.rectangle(0, 0, pw, 8, hex(p.color)).setOrigin(0);
      const face = this.add.rectangle(8, 16, 56, 56, 0xfff1e8).setOrigin(0).setStrokeStyle(3, 0x000000);
      const img = addCharacter(this, 36, 44, i, 52);
      const name = this.add.text(70, 14, p.name, { fontFamily: FONT, fontSize: '20px', color: p.color, stroke: '#000', strokeThickness: 5 });
      const tag = this.add.text(70, 42, p.human ? '玩家' : '電腦', { fontFamily: FONT, fontSize: '16px', color: '#c2c3c7' });
      const money = this.add.text(8, 78, '', { fontFamily: FONT, fontSize: '26px', color: '#ffec27' });
      const info = this.add.text(pw - 8, 84, '', { fontFamily: FONT, fontSize: '16px', color: '#fff1e8' }).setOrigin(1, 0);
      c.add([highlight, box, band, face, img, name, tag, money, info]);
      // 點玩家卡片：鏡頭移到那個角色
      box.setInteractive();
      box.on('pointerup', () => this.gs.followPlayer(p));
      return { c, highlight, money, info };
    });
    const top = MAP_VIEW.y + 10;
    this.roundChip = this.add.text(MAP_VIEW.x + 12, top, '', {
      fontFamily: FONT, fontSize: '20px', color: '#ffffff', backgroundColor: '#1d2b53', padding: { x: 8, y: 4 },
    });
    this.add.text(W - 12, top, LANDSCAPE ? '拖曳移動地圖・滾輪縮放' : '拖曳移動・兩指縮放', {
      fontFamily: FONT, fontSize: '16px', color: '#ffffff', backgroundColor: '#00000088', padding: { x: 6, y: 3 },
    }).setOrigin(1, 0);

    // 放大 / 縮小按鈕
    const zx = W - 42;
    makeButton(this, zx, top + 70, 60, 54, '＋', { fill: 0xfff1e8, fontSize: '32px', onClick: () => this.gs.setZoom(this.gs.cameras.main.zoom * 1.2) });
    makeButton(this, zx, top + 134, 60, 54, '－', { fill: 0xfff1e8, fontSize: '32px', onClick: () => this.gs.setZoom(this.gs.cameras.main.zoom / 1.2) });
  }

  refreshPanels() {
    const gs = this.gs;
    gs.players.forEach((p, i) => {
      const pan = this.panels[i];
      const owned = gs.tileState.filter((s) => s.owner === i).length;
      pan.money.setText(p.bankrupt ? '破產' : `$${p.money}`);
      pan.money.setColor(p.bankrupt ? '#ff004d' : p.money < 200 ? '#ff77a8' : '#ffec27');
      let status = `地${owned}`;
      if (p.skip > 0) status = '塞車中';
      if (p.bankrupt) status = '出局';
      pan.info.setText(status);
      pan.c.setAlpha(p.bankrupt ? 0.45 : 1);
      pan.highlight.setVisible(i === gs.current && !gs.gameOver);
    });
    this.roundChip.setText(`第 ${Math.min(gs.round, GAME_RULES.maxRounds)} / ${GAME_RULES.maxRounds} 回合`);
  }

  // ---------- 下方：骰子 + 訊息 ----------
  drawBottom() {
    // 直版：畫面最下方一整條；橫版：地圖下方（左邊欄右側）
    const x0 = LANDSCAPE ? SIDEBAR : 0;
    const y0 = LANDSCAPE ? STRIP : HUD_BOTTOM;
    const msgH = LANDSCAPE ? 108 : 124;
    const midY = y0 + (LANDSCAPE ? (H - STRIP) / 2 : 84);
    this.add.rectangle(x0, y0, W - x0, H - y0, 0x1d2b53, 0.95).setOrigin(0);
    this.add.rectangle(x0, y0, W - x0, 4, 0x000000).setOrigin(0);

    const diceX = x0 + 84;
    this.add.rectangle(diceX, midY, 104, 104, 0x29366f).setStrokeStyle(4, 0x000000);
    this.dice = this.add.image(diceX, midY - 4, 'dice1').setScale(5);

    const mx = x0 + 158;
    const mw = W - mx - 14;
    this.add.rectangle(mx, midY - msgH / 2, mw, msgH, 0x000000).setOrigin(0);
    this.add.rectangle(mx + 4, midY - msgH / 2 + 4, mw - 8, msgH - 8, 0xfff1e8).setOrigin(0);
    this.msgText = this.add.text(mx + mw / 2, midY, '', {
      fontFamily: FONT, fontSize: '24px', color: '#000000', align: 'center', lineSpacing: 6,
      wordWrap: { width: mw - 28, useAdvancedWrap: true },
    }).setOrigin(0.5);
  }

  say(text) {
    this.msgText.setText(text);
  }

  async rollDice() {
    for (let k = 0; k < 10; k++) {
      const n = Phaser.Math.Between(1, 6);
      this.dice.setTexture(`dice${n}`).setAngle(Phaser.Math.Between(-20, 20));
      Sfx.beep(300 + n * 60, 0.03);
      await this.gs.wait(60);
    }
    const roll = Phaser.Math.Between(1, 6);
    this.dice.setTexture(`dice${roll}`).setAngle(0);
    Sfx.beep(880, 0.08);
    await new Promise((res) => this.tweens.add({ targets: this.dice, scale: 6.5, duration: 100, yoyo: true, onComplete: res }));
    return roll;
  }

  // 顯示按鈕，等玩家選；電腦玩家會自動選 auto
  choose(options, player, auto) {
    return new Promise((resolve) => {
      this.choiceLayer.removeAll(true);
      const n = options.length;
      // 直版：按鈕橫排在最下面；橫版：按鈕直排在左邊欄下方
      const bw = LANDSCAPE ? SIDEBAR - 40 : (n === 1 ? 360 : 300);
      const gap = 20;
      const total = n * bw + (n - 1) * gap;
      options.forEach((o, k) => {
        const x = LANDSCAPE ? SIDEBAR / 2 - 2 : W / 2 - total / 2 + bw / 2 + k * (bw + gap);
        const y = LANDSCAPE ? (n === 1 ? 640 : 590 + k * 96) : H - 54;
        const b = makeButton(this, x, y, bw, 72, o.label, {
          fill: o.fill ?? 0xffa300, disabled: o.disabled, fontSize: '30px',
          onClick: () => { if (player.human) { this.choiceLayer.removeAll(true); resolve(o.value); } },
        });
        this.choiceLayer.add(b);
      });
      if (!player.human) {
        this.time.delayedCall(900, () => { this.choiceLayer.removeAll(true); resolve(auto); });
      }
    });
  }

  // ---------- 機會 / 命運卡 ----------
  async showCard(card, isChance, player) {
    Sfx.tune(isChance ? [659, 784, 988] : [440, 370, 311], 0.08);
    this.cardLayer.removeAll(true);
    const panel = this.add.container(MAP_VIEW.x + MAP_VIEW.w / 2, MAP_VIEW.y + MAP_VIEW.h / 2);
    panel.add(this.add.rectangle(8, 8, 520, 320, 0x000000, 0.6));
    panel.add(this.add.rectangle(0, 0, 520, 320, isChance ? 0xffec27 : 0x29adff).setStrokeStyle(6, 0x000000));
    panel.add(this.add.rectangle(0, -114, 500, 70, isChance ? 0xff004d : 0x1d2b53));
    panel.add(addIcon(this, -200, -114, isChance ? 'chance' : 'ballot', 60));
    panel.add(this.add.text(0, -114, isChance ? '機會' : '命運', { fontFamily: FONT, fontSize: '44px', color: '#fff1e8' }).setOrigin(0.5));
    panel.add(this.add.text(0, 36, card.text, { fontFamily: FONT, fontSize: '30px', color: '#000000', align: 'center', lineSpacing: 12 }).setOrigin(0.5));
    this.cardLayer.add(panel);
    panel.setScale(0.1);
    await new Promise((res) => this.tweens.add({ targets: panel, scale: 1, duration: 250, ease: 'Back.easeOut', onComplete: res }));
    await this.choose([{ label: '知道了', value: 1 }], player, 1);
    this.cardLayer.removeAll(true);
  }

  // ---------- 結算 ----------
  showResults() {
    const gs = this.gs;
    this.refreshPanels();
    this.choiceLayer.removeAll(true);
    const ranking = [...gs.players].sort((a, b) => (a.bankrupt - b.bankrupt) || (gs.assetsOf(b) - gs.assetsOf(a)));
    const winner = ranking[0];
    Sfx.win();

    const layer = this.add.container(0, 0).setDepth(100);
    layer.add(this.add.rectangle(0, 0, W, H, 0x000000, 0.88).setOrigin(0).setInteractive());
    // 直版：上下排；橫版：左邊當選人、右邊排名
    const L = LANDSCAPE
      ? { title: 70, winX: W * 0.3, img: 340, winText: 520, rankX: 700, rankR: 1180, rankY: 200, btnX: W * 0.72, btn: 620 }
      : { title: 140 + TALL_DY, winX: W / 2, img: 300 + TALL_DY, winText: 430 + TALL_DY, rankX: 140, rankR: 580, rankY: 530 + TALL_DY, btnX: W / 2, btn: 920 + TALL_DY };
    layer.add(this.add.text(W / 2, L.title, '★ 投票日 ★', { fontFamily: FONT, fontSize: '56px', color: '#ffec27', stroke: '#000', strokeThickness: 10 }).setOrigin(0.5));
    const img = addCharacter(this, L.winX, L.img, winner.id, LANDSCAPE ? 240 : 180);
    layer.add(img);
    this.tweens.add({ targets: img, y: L.img - 20, duration: 300, yoyo: true, repeat: -1, ease: 'Stepped', easeParams: [3] });
    layer.add(this.add.text(L.winX, L.winText, `${winner.name} 高票當選！`, { fontFamily: FONT, fontSize: LANDSCAPE ? '40px' : '48px', color: winner.color, stroke: '#000', strokeThickness: 10 }).setOrigin(0.5));

    ranking.forEach((p, k) => {
      const y = L.rankY + k * 70;
      layer.add(this.add.text(L.rankX, y, `${k + 1}. ${p.name}`, { fontFamily: FONT, fontSize: '32px', color: '#fff1e8' }));
      layer.add(this.add.text(L.rankR, y, p.bankrupt ? '破產' : `總資產 $${gs.assetsOf(p)}`, { fontFamily: FONT, fontSize: '28px', color: p.bankrupt ? '#ff004d' : '#ffec27' }).setOrigin(1, 0));
    });

    for (let k = 0; k < 60; k++) {
      const colors = [0xff004d, 0xffec27, 0x29adff, 0x00e436, 0xff77a8];
      const r = this.add.rectangle(Phaser.Math.Between(0, W), Phaser.Math.Between(-400, 0), 8, 8, colors[k % colors.length]);
      layer.add(r);
      this.tweens.add({ targets: r, y: H + 20, duration: Phaser.Math.Between(2000, 4000), repeat: -1, delay: Phaser.Math.Between(0, 2000) });
    }

    layer.add(makeButton(this, L.btnX, L.btn, 340, 90, '再選一次', {
      fill: 0xff004d, color: '#fff1e8', fontSize: '40px', onClick: () => gs.scene.start('title'),
    }));
  }
}
