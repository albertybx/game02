// =====================================================================
// HUD：疊在地圖上面、不會跟著捲動的介面
// 上方：玩家資訊；下方：骰子、訊息框、按鈕；中間：機會/命運卡、結算畫面
// =====================================================================

const HUD_TOP = 136;       // 上方玩家列的高度
const HUD_BOTTOM = 870;    // 下方面板從這裡開始

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
    this.add.rectangle(0, 0, W, HUD_TOP, 0x1d2b53, 0.92).setOrigin(0);
    this.add.rectangle(0, HUD_TOP - 4, W, 4, 0x000000).setOrigin(0);
    const pw = 168;
    const gap = 8;
    const total = players.length * pw + (players.length - 1) * gap;
    const left = (W - total) / 2;
    this.panels = players.map((p, i) => {
      const x = left + i * (pw + gap);
      const y = 10;
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
    this.roundChip = this.add.text(12, HUD_TOP + 10, '', {
      fontFamily: FONT, fontSize: '20px', color: '#ffffff', backgroundColor: '#1d2b53', padding: { x: 8, y: 4 },
    });
    this.add.text(W - 12, HUD_TOP + 10, '拖曳可以移動地圖', {
      fontFamily: FONT, fontSize: '16px', color: '#ffffff', backgroundColor: '#00000088', padding: { x: 6, y: 3 },
    }).setOrigin(1, 0);
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
    this.add.rectangle(0, HUD_BOTTOM, W, H - HUD_BOTTOM, 0x1d2b53, 0.95).setOrigin(0);
    this.add.rectangle(0, HUD_BOTTOM, W, 4, 0x000000).setOrigin(0);

    this.add.rectangle(84, 954, 104, 104, 0x29366f).setStrokeStyle(4, 0x000000);
    this.dice = this.add.image(84, 950, 'dice1').setScale(5);

    this.add.rectangle(158, 892, 548, 124, 0x000000).setOrigin(0);
    this.add.rectangle(162, 896, 540, 116, 0xfff1e8).setOrigin(0);
    this.msgText = this.add.text(432, 954, '', {
      fontFamily: FONT, fontSize: '24px', color: '#000000', align: 'center', lineSpacing: 6,
      wordWrap: { width: 520, useAdvancedWrap: true },
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
      const bw = n === 1 ? 360 : 300;
      const gap = 20;
      const total = n * bw + (n - 1) * gap;
      options.forEach((o, k) => {
        const x = W / 2 - total / 2 + bw / 2 + k * (bw + gap);
        const b = makeButton(this, x, 1066, bw, 72, o.label, {
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
    const panel = this.add.container(W / 2, 500);
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
    layer.add(this.add.text(W / 2, 140, '★ 投票日 ★', { fontFamily: FONT, fontSize: '56px', color: '#ffec27', stroke: '#000', strokeThickness: 10 }).setOrigin(0.5));
    const img = addCharacter(this, W / 2, 300, winner.id, 180);
    layer.add(img);
    this.tweens.add({ targets: img, y: 280, duration: 300, yoyo: true, repeat: -1, ease: 'Stepped', easeParams: [3] });
    layer.add(this.add.text(W / 2, 430, `${winner.name} 高票當選！`, { fontFamily: FONT, fontSize: '48px', color: winner.color, stroke: '#000', strokeThickness: 10 }).setOrigin(0.5));

    ranking.forEach((p, k) => {
      const y = 530 + k * 70;
      layer.add(this.add.text(140, y, `${k + 1}. ${p.name}`, { fontFamily: FONT, fontSize: '32px', color: '#fff1e8' }));
      layer.add(this.add.text(580, y, p.bankrupt ? '破產' : `總資產 $${gs.assetsOf(p)}`, { fontFamily: FONT, fontSize: '28px', color: p.bankrupt ? '#ff004d' : '#ffec27' }).setOrigin(1, 0));
    });

    for (let k = 0; k < 60; k++) {
      const colors = [0xff004d, 0xffec27, 0x29adff, 0x00e436, 0xff77a8];
      const r = this.add.rectangle(Phaser.Math.Between(0, W), Phaser.Math.Between(-400, 0), 8, 8, colors[k % colors.length]);
      layer.add(r);
      this.tweens.add({ targets: r, y: H + 20, duration: Phaser.Math.Between(2000, 4000), repeat: -1, delay: Phaser.Math.Between(0, 2000) });
    }

    layer.add(makeButton(this, W / 2, 920, 340, 90, '再選一次', {
      fill: 0xff004d, color: '#fff1e8', fontSize: '40px', onClick: () => gs.scene.start('title'),
    }));
  }
}
