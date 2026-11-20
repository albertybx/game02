// 台北政壇大富翁 — 主程式
// 畫面 720 x 1120（直式，適合手機）。上面 720x720 是地圖，下面是玩家資訊。

const W = 720;
const H = 1120;
const TILE = 120;           // 每格大小
const BOARD = 6;            // 地圖每邊 6 格（含角落）→ 一圈 20 格
const FONT = 'Cubic11, monospace';
const COLORS = {
  bg: 0x1d2b53,
  boardCenter: 0x83c46c,
  tile: 0xfff1e8,
  border: 0x000000,
  panel: 0x29366f,
  yellow: 0xffec27,
};

const hex = (s) => parseInt(s.replace('#', ''), 16);

// ---------- 8-bit 音效（用瀏覽器內建合成器發出方波「嗶」聲） ----------
const Sfx = {
  ctx: null,
  muted: false,
  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) this.ctx = new AC();
    }
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  },
  beep(freq = 440, dur = 0.06, type = 'square', vol = 0.06, delay = 0) {
    if (this.muted || !this.ctx) return;
    const t = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain).connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  },
  tune(notes, step = 0.09) {
    notes.forEach((f, i) => this.beep(f, step * 0.9, 'square', 0.06, i * step));
  },
  click() { this.beep(660, 0.04); },
  hop() { this.beep(520, 0.05, 'square', 0.04); },
  coin() { this.tune([988, 1319], 0.07); },
  pay() { this.tune([392, 262], 0.1); },
  buy() { this.tune([523, 659, 784, 1047], 0.08); },
  bad() { this.tune([330, 311, 294, 277], 0.12); },
  win() { this.tune([523, 523, 784, 784, 880, 880, 784, 0, 698, 698, 659, 659, 587, 587, 523], 0.13); },
};

// ---------- 共用：像素風按鈕 ----------
function makeButton(scene, x, y, w, h, label, opts = {}) {
  const fill = opts.fill ?? 0xffa300;
  const c = scene.add.container(x, y);
  const shadow = scene.add.rectangle(4, 4, w, h, 0x000000).setOrigin(0.5);
  const body = scene.add.rectangle(0, 0, w, h, fill).setOrigin(0.5).setStrokeStyle(4, 0x000000);
  const shine = scene.add.rectangle(0, -h / 2 + 6, w - 12, 4, 0xffffff, 0.35).setOrigin(0.5);
  const text = scene.add.text(0, 0, label, {
    fontFamily: FONT, fontSize: opts.fontSize || '28px', color: opts.color || '#000000', align: 'center',
  }).setOrigin(0.5);
  c.add([shadow, body, shine, text]);
  c.setSize(w, h);
  c.body = body;
  c.label = text;
  c.setEnabled = (on) => {
    c.enabled = on;
    body.setFillStyle(on ? fill : 0x5f574f);
    text.setColor(on ? (opts.color || '#000000') : '#c2c3c7');
  };
  c.setEnabled(opts.disabled ? false : true);
  c.setInteractive({ useHandCursor: true });
  c.on('pointerdown', () => {
    if (!c.enabled) return;
    body.setPosition(3, 3); text.setPosition(3, 3); shine.setPosition(3, -h / 2 + 9);
  });
  const release = () => { body.setPosition(0, 0); text.setPosition(0, 0); shine.setPosition(0, -h / 2 + 6); };
  c.on('pointerout', release);
  c.on('pointerup', () => {
    release();
    if (!c.enabled) return;
    Sfx.unlock();
    Sfx.click();
    if (opts.onClick) opts.onClick();
  });
  return c;
}

function makeCharacterTexture(scene, idx) {
  const ch = CHARACTERS[idx];
  makePixelTexture(scene, `char${idx}`, ART[ch.body], { H: ch.hair, S: ch.suit, T: ch.tie });
  makePixelTexture(scene, `flag${idx}`, ART.flag, { T: ch.color });
}

// =====================================================================
// 標題畫面
// =====================================================================
class TitleScene extends Phaser.Scene {
  constructor() { super('title'); }

  init() {
    this.playerCount = 4;
    this.mode = 'cpu'; // cpu = 你 vs 電腦；hotseat = 大家輪流用同一支手機
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
      const img = this.add.image(x, 450, `char${i}`).setScale(5);
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
      this.add.image(60 + i * 100, H - 20, k).setOrigin(0.5, 1).setScale(k === 'taipei101' ? 8 : 5).setAlpha(0.25);
    });
    // 星星
    for (let i = 0; i < 40; i++) {
      const s = this.add.rectangle(Phaser.Math.Between(0, W), Phaser.Math.Between(0, 560), 4, 4, 0xfff1e8, 0.6);
      this.tweens.add({ targets: s, alpha: 0.1, duration: Phaser.Math.Between(400, 1400), yoyo: true, repeat: -1, ease: 'Stepped' });
    }
  }
}

// =====================================================================
// 遊戲畫面
// =====================================================================
class GameScene extends Phaser.Scene {
  constructor() { super('game'); }

  init(data) {
    this.playerCount = data.playerCount || 4;
    this.mode = data.mode || 'cpu';
    this.round = 1;
    this.current = 0;
    this.gameOver = false;
    this.tileState = TILES.map(() => ({ owner: null, level: 0 }));
    this.players = [];
    for (let i = 0; i < this.playerCount; i++) {
      this.players.push({
        id: i,
        ...CHARACTERS[i],
        money: GAME_RULES.startMoney,
        pos: 0,
        skip: 0,
        bankrupt: false,
        human: this.mode === 'hotseat' || i === 0,
      });
    }
    this.chanceDeck = [];
    this.fateDeck = [];
  }

  create() {
    this.cameras.main.setBackgroundColor(COLORS.bg);
    this.drawBoard();
    this.drawCenter();
    this.drawPanels();
    this.createTokens();
    this.events.once('shutdown', () => { this.gameOver = true; });
    this.runGame();
  }

  // ---------- 座標 ----------
  // 第 i 格的左上角位置。0 在右下角，逆時針走。
  tileXY(i) {
    let col; let row;
    if (i <= 5) { col = 5 - i; row = 5; }
    else if (i <= 10) { col = 0; row = 5 - (i - 5); }
    else if (i <= 15) { col = i - 10; row = 0; }
    else { col = 5; row = i - 15; }
    return { x: col * TILE, y: row * TILE };
  }

  tileCenter(i) {
    const { x, y } = this.tileXY(i);
    return { x: x + TILE / 2, y: y + TILE / 2 };
  }

  // ---------- 畫地圖 ----------
  drawBoard() {
    // 中間草地
    this.add.rectangle(TILE, TILE, TILE * 4, TILE * 4, COLORS.boardCenter).setOrigin(0);
    // 草地上的像素小點
    for (let i = 0; i < 70; i++) {
      this.add.rectangle(
        Phaser.Math.Between(TILE + 8, TILE * 5 - 8), Phaser.Math.Between(TILE + 8, TILE * 5 - 8),
        4, 4, 0x6aa85a,
      ).setOrigin(0);
    }

    this.tileOverlays = [];
    TILES.forEach((t, i) => {
      const { x, y } = this.tileXY(i);
      const corner = i % 5 === 0;
      this.add.rectangle(x, y, TILE, TILE, corner ? 0xffccaa : COLORS.tile).setOrigin(0).setStrokeStyle(4, COLORS.border);

      if (t.type === 'property') {
        this.add.rectangle(x + 2, y + 2, TILE - 4, 18, hex(GROUPS[t.group])).setOrigin(0);
        this.add.rectangle(x + 2, y + 20, TILE - 4, 2, 0x000000).setOrigin(0);
        this.add.image(x + TILE / 2, y + 48, t.icon).setScale(3);
        this.add.text(x + TILE / 2, y + 86, t.name, { fontFamily: FONT, fontSize: t.name.length >= 5 ? '19px' : '22px', color: '#000000' }).setOrigin(0.5);
        this.add.text(x + TILE / 2, y + 107, `$${t.price}`, { fontFamily: FONT, fontSize: '18px', color: '#5f574f' }).setOrigin(0.5);
      } else if (corner) {
        this.add.image(x + TILE / 2, y + 50, t.icon).setScale(4);
        this.add.text(x + TILE / 2, y + 100, t.name, { fontFamily: FONT, fontSize: '24px', color: '#000000' }).setOrigin(0.5);
      } else {
        this.add.image(x + TILE / 2, y + 48, t.icon).setScale(4);
        this.add.text(x + TILE / 2, y + 98, t.name, { fontFamily: FONT, fontSize: '24px', color: t.type === 'chance' ? '#ff004d' : '#1d2b53' }).setOrigin(0.5);
      }
      // 地主標記（之後依狀態重畫）
      this.tileOverlays[i] = this.add.container(x, y);
      // 點格子可以看資訊
      const hit = this.add.rectangle(x, y, TILE, TILE, 0x000000, 0).setOrigin(0).setInteractive();
      hit.on('pointerup', () => this.showTileInfo(i));
    });
  }

  refreshTile(i) {
    const ov = this.tileOverlays[i];
    ov.removeAll(true);
    const st = this.tileState[i];
    if (st.owner === null) return;
    const color = hex(this.players[st.owner].color);
    // 地主顏色的外框
    const frame = this.add.rectangle(TILE / 2, TILE / 2, TILE - 10, TILE - 10).setStrokeStyle(6, color);
    ov.add(frame);
    // 名牌小方塊
    ov.add(this.add.rectangle(6, 24, 22, 22, color).setOrigin(0).setStrokeStyle(2, 0x000000));
    ov.add(this.add.image(17, 35, `char${st.owner}`).setScale(1.2));
    // 競選總部旗子
    for (let k = 0; k < st.level; k++) {
      ov.add(this.add.image(TILE - 18 - k * 0, 30 + k * 18, `flag${st.owner}`).setScale(1.5));
    }
  }

  // ---------- 中間區域（骰子、訊息、按鈕） ----------
  drawCenter() {
    const cx = W / 2;
    this.roundText = this.add.text(cx, 146, '', { fontFamily: FONT, fontSize: '24px', color: '#1d2b53' }).setOrigin(0.5);
    this.add.text(cx, 186, '台北政壇大富翁', { fontFamily: FONT, fontSize: '40px', color: '#ffec27', stroke: '#000000', strokeThickness: 8 }).setOrigin(0.5);

    this.diceShadow = this.add.rectangle(cx + 6, 276, 80, 80, 0x000000, 0.35);
    this.dice = this.add.image(cx, 270, 'dice1').setScale(5);

    // 訊息框
    this.add.rectangle(cx, 410, 440, 150, 0x000000).setOrigin(0.5);
    this.add.rectangle(cx, 410, 432, 142, 0xfff1e8).setOrigin(0.5);
    this.msgText = this.add.text(cx, 410, '', {
      fontFamily: FONT, fontSize: '24px', color: '#000000', align: 'center', lineSpacing: 6,
      wordWrap: { width: 410, useAdvancedWrap: true },
    }).setOrigin(0.5);

    this.choiceLayer = this.add.container(0, 0);
    this.cardLayer = this.add.container(0, 0).setDepth(50);
  }

  say(text) {
    this.msgText.setText(text);
  }

  // ---------- 下方玩家資訊 ----------
  drawPanels() {
    this.panels = [];
    const top = 740;
    const pw = 340;
    const ph = 170;
    this.players.forEach((p, i) => {
      const x = 14 + (i % 2) * (pw + 12);
      const y = top + Math.floor(i / 2) * (ph + 12);
      const c = this.add.container(x, y);
      const highlight = this.add.rectangle(-6, -6, pw + 12, ph + 12, COLORS.yellow).setOrigin(0).setVisible(false);
      const box = this.add.rectangle(0, 0, pw, ph, COLORS.panel).setOrigin(0).setStrokeStyle(4, 0x000000);
      const band = this.add.rectangle(0, 0, pw, 10, hex(p.color)).setOrigin(0);
      const face = this.add.rectangle(14, 24, 88, 88, 0xfff1e8).setOrigin(0).setStrokeStyle(4, 0x000000);
      const img = this.add.image(58, 68, `char${i}`).setScale(5);
      const name = this.add.text(116, 22, p.name, { fontFamily: FONT, fontSize: '28px', color: p.color, stroke: '#000', strokeThickness: 6 });
      const tag = this.add.text(116, 60, p.human ? '玩家' : '電腦', { fontFamily: FONT, fontSize: '20px', color: '#c2c3c7' });
      const money = this.add.text(116, 86, '', { fontFamily: FONT, fontSize: '32px', color: '#ffec27' });
      const info = this.add.text(14, 128, '', { fontFamily: FONT, fontSize: '22px', color: '#fff1e8' });
      c.add([highlight, box, band, face, img, name, tag, money, info]);
      this.panels.push({ c, highlight, money, info, img });
    });
    this.refreshPanels();
  }

  refreshPanels() {
    this.players.forEach((p, i) => {
      const pan = this.panels[i];
      const owned = this.tileState.filter((s) => s.owner === i).length;
      pan.money.setText(p.bankrupt ? '破產' : `$${p.money}`);
      pan.money.setColor(p.bankrupt ? '#ff004d' : p.money < 200 ? '#ff77a8' : '#ffec27');
      let status = `地產 ${owned} 塊`;
      if (p.skip > 0) status += '　塞車中';
      if (p.bankrupt) status = '退出選戰';
      pan.info.setText(status);
      pan.c.setAlpha(p.bankrupt ? 0.45 : 1);
      pan.highlight.setVisible(i === this.current && !this.gameOver);
    });
    this.roundText.setText(`第 ${Math.min(this.round, GAME_RULES.maxRounds)} / ${GAME_RULES.maxRounds} 回合`);
  }

  // ---------- 棋子 ----------
  slotOffset(id) {
    return [[-34, -14], [34, -14], [-34, 22], [34, 22]][id];
  }

  createTokens() {
    this.tokens = this.players.map((p, i) => {
      const { x, y } = this.tileCenter(0);
      const [ox, oy] = this.slotOffset(i);
      const shadow = this.add.ellipse(x + ox, y + oy + 22, 30, 10, 0x000000, 0.35).setDepth(9);
      const t = this.add.image(x + ox, y + oy, `char${i}`).setScale(2.5).setDepth(10 + i);
      t.shadow = shadow;
      return t;
    });
  }

  // ---------- 小工具：等待 / 動畫 / 選擇 ----------
  wait(ms) {
    return new Promise((res) => this.time.delayedCall(ms, res));
  }

  tweenP(cfg) {
    return new Promise((res) => this.tweens.add({ ...cfg, onComplete: () => res() }));
  }

  // 顯示按鈕，等玩家選；電腦玩家會自動選 auto
  choose(options, player, auto) {
    return new Promise((resolve) => {
      this.choiceLayer.removeAll(true);
      const n = options.length;
      const bw = n === 1 ? 300 : 210;
      const gap = 16;
      const total = n * bw + (n - 1) * gap;
      options.forEach((o, k) => {
        const x = W / 2 - total / 2 + bw / 2 + k * (bw + gap);
        const b = makeButton(this, x, 534, bw, 70, o.label, {
          fill: o.fill ?? 0xffa300, disabled: o.disabled, fontSize: o.label.length > 6 ? '22px' : '28px',
          onClick: () => { if (player.human) { this.choiceLayer.removeAll(true); resolve(o.value); } },
        });
        this.choiceLayer.add(b);
      });
      if (!player.human) {
        this.time.delayedCall(900, () => { this.choiceLayer.removeAll(true); resolve(auto); });
      }
    });
  }

  // ---------- 遊戲主流程 ----------
  async runGame() {
    this.say('選戰開始！\n誰能買下最多台北地標？');
    await this.wait(1200);
    while (!this.gameOver) {
      await this.playTurn(this.players[this.current]);
      if (this.gameOver) break;
      if (this.checkEnd()) break;
      this.nextPlayer();
    }
  }

  nextPlayer() {
    do {
      this.current = (this.current + 1) % this.players.length;
      if (this.current === 0) this.round++;
    } while (this.players[this.current].bankrupt);
    this.refreshPanels();
  }

  async playTurn(p) {
    this.refreshPanels();
    this.bounceToken(p);

    if (p.skip > 0) {
      p.skip--;
      this.say(`${p.name} 還卡在車陣裡…\n這回合暫停一次`);
      Sfx.bad();
      this.refreshPanels();
      await this.choose([{ label: '好吧', value: 1 }], p, 1);
      return;
    }

    this.say(p.human ? `輪到 ${p.name}！\n按「擲骰子」出發` : `輪到 ${p.name}（電腦）…`);
    await this.choose([{ label: '擲骰子', value: 1, fill: 0xff004d }], p, 1);
    const roll = await this.rollDice();
    this.say(`${p.name} 擲出 ${roll} 點！`);
    await this.walk(p, roll);
    await this.resolveTile(p);
    this.refreshPanels();
  }

  bounceToken(p) {
    const t = this.tokens[p.id];
    this.tweens.killTweensOf(t);
    const { x, y } = this.tileCenter(p.pos);
    const [ox, oy] = this.slotOffset(p.id);
    t.setPosition(x + ox, y + oy);
    this.tweens.add({ targets: t, y: y + oy - 10, duration: 160, yoyo: true, repeat: 2, ease: 'Stepped', easeParams: [2] });
  }

  async rollDice() {
    for (let k = 0; k < 10; k++) {
      const n = Phaser.Math.Between(1, 6);
      this.dice.setTexture(`dice${n}`);
      this.dice.setAngle(Phaser.Math.Between(-20, 20));
      Sfx.beep(300 + n * 60, 0.03);
      await this.wait(60);
    }
    const roll = Phaser.Math.Between(1, 6);
    this.dice.setTexture(`dice${roll}`).setAngle(0);
    Sfx.beep(880, 0.08);
    await this.tweenP({ targets: this.dice, scale: 6.5, duration: 100, yoyo: true });
    return roll;
  }

  // 一格一格跳（steps 可以是負的 = 後退）
  async walk(p, steps) {
    const dir = steps >= 0 ? 1 : -1;
    const t = this.tokens[p.id];
    this.tweens.killTweensOf(t);
    for (let k = 0; k < Math.abs(steps); k++) {
      p.pos = (p.pos + dir + TILES.length) % TILES.length;
      const { x, y } = this.tileCenter(p.pos);
      const [ox, oy] = this.slotOffset(p.id);
      Sfx.hop();
      t.shadow.setPosition(x + ox, y + oy + 22);
      await this.tweenP({ targets: t, x: x + ox, y: y + oy - 24, duration: 90, ease: 'Quad.easeOut' });
      await this.tweenP({ targets: t, y: y + oy, duration: 90, ease: 'Quad.easeIn' });
      if (dir > 0 && p.pos === 0) {
        p.money += GAME_RULES.passGoBonus;
        this.floatText(x, y - 40, `+$${GAME_RULES.passGoBonus}`, '#ffec27');
        Sfx.coin();
        this.refreshPanels();
      }
    }
  }

  async goTo(p, target) {
    const steps = (target - p.pos + TILES.length) % TILES.length;
    await this.walk(p, steps);
  }

  floatText(x, y, str, color) {
    const txt = this.add.text(x, y, str, { fontFamily: FONT, fontSize: '32px', color, stroke: '#000', strokeThickness: 8 }).setOrigin(0.5).setDepth(60);
    this.tweens.add({ targets: txt, y: y - 50, alpha: 0, duration: 1100, ease: 'Quad.easeOut', onComplete: () => txt.destroy() });
  }

  // ---------- 錢 ----------
  rentOf(i) {
    const t = TILES[i];
    const st = this.tileState[i];
    let base = Math.round(t.price / 10);
    if (st.level === 0 && this.ownsGroup(st.owner, t.group)) base *= 2;
    return base * GAME_RULES.rentMultiplier[st.level];
  }

  upgradeCost(i) { return Math.round(TILES[i].price / 2); }

  ownsGroup(owner, group) {
    return TILES.every((t, i) => t.group !== group || this.tileState[i].owner === owner);
  }

  assetsOf(p) {
    let total = p.money;
    this.tileState.forEach((s, i) => {
      if (s.owner === p.id) total += TILES[i].price + s.level * this.upgradeCost(i);
    });
    return total;
  }

  changeMoney(p, amount) {
    p.money += amount;
    const { x, y } = this.tileCenter(p.pos);
    this.floatText(x, y - 40, `${amount >= 0 ? '+' : '-'}$${Math.abs(amount)}`, amount >= 0 ? '#ffec27' : '#ff004d');
    if (amount >= 0) Sfx.coin(); else Sfx.pay();
    this.refreshPanels();
  }

  // 付錢給某人（to = null 代表付給銀行）。付不出來就破產。
  async pay(p, amount, to = null) {
    const paid = Math.min(amount, Math.max(p.money, 0));
    this.changeMoney(p, -amount);
    if (to) {
      to.money += paid;
      const { x, y } = this.tileCenter(to.pos);
      this.floatText(x, y - 40, `+$${paid}`, '#ffec27');
      this.refreshPanels();
    }
    if (p.money < 0) await this.goBankrupt(p);
  }

  async goBankrupt(p) {
    p.bankrupt = true;
    p.money = 0;
    this.tileState.forEach((s, i) => {
      if (s.owner === p.id) { s.owner = null; s.level = 0; this.refreshTile(i); }
    });
    this.tokens[p.id].setVisible(false);
    this.tokens[p.id].shadow.setVisible(false);
    Sfx.bad();
    this.refreshPanels();
    this.say(`${p.name} 選舉經費燒光了…\n宣布退出選戰！`);
    await this.wait(1800);
  }

  // ---------- 走到格子上會發生的事 ----------
  async resolveTile(p) {
    const i = p.pos;
    const t = TILES[i];
    const st = this.tileState[i];

    switch (t.type) {
      case 'go':
        this.say(`${p.name} 回到起點，\n繼續拉票！`);
        await this.wait(900);
        break;

      case 'property':
        if (st.owner === null) await this.offerBuy(p, i);
        else if (st.owner === p.id) await this.offerUpgrade(p, i);
        else await this.payRent(p, i);
        break;

      case 'chance':
        await this.drawCard(p, 'chance');
        break;

      case 'fate':
        await this.drawCard(p, 'fate');
        break;

      case 'jam':
        this.say(`${p.name} 遇到大塞車！\n下回合暫停一次`);
        p.skip = 1;
        Sfx.bad();
        this.refreshPanels();
        await this.wait(1200);
        break;

      case 'mrt':
        this.say(`${p.name} 在捷運站休息一下，\n吹吹冷氣～`);
        await this.wait(1000);
        break;

      case 'tow':
        this.say(`${p.name} 的宣傳車被拖吊了！\n繳罰款 $${GAME_RULES.towFine}`);
        await this.wait(500);
        await this.pay(p, GAME_RULES.towFine);
        await this.wait(800);
        break;

      default:
        break;
    }
  }

  async offerBuy(p, i) {
    const t = TILES[i];
    const canBuy = p.money >= t.price;
    this.say(`${t.name} 還沒有人插旗！\n要花 $${t.price} 買下嗎？${canBuy ? '' : '\n（錢不夠…）'}`);
    const autoBuy = canBuy && p.money - t.price >= 200;
    const ans = await this.choose([
      { label: `買下 $${t.price}`, value: true, fill: 0x00e436, disabled: !canBuy },
      { label: '不買', value: false, fill: 0xc2c3c7 },
    ], p, autoBuy);
    if (ans) {
      p.money -= t.price;
      this.tileState[i].owner = p.id;
      this.refreshTile(i);
      Sfx.buy();
      this.flashTile(i);
      this.say(`${p.name} 買下了 ${t.name}！\n過路費 $${this.rentOf(i)}`);
      this.refreshPanels();
      await this.wait(1000);
    } else {
      this.say(`${p.name} 決定先不買。`);
      await this.wait(700);
    }
  }

  async offerUpgrade(p, i) {
    const t = TILES[i];
    const st = this.tileState[i];
    if (st.level >= GAME_RULES.maxLevel) {
      this.say(`${t.name} 的競選總部已經蓋滿了！\n過路費 $${this.rentOf(i)}`);
      await this.wait(1100);
      return;
    }
    const cost = this.upgradeCost(i);
    const canBuild = p.money >= cost;
    this.say(`回到自己的 ${t.name}。\n要花 $${cost} 蓋第 ${st.level + 1} 層競選總部嗎？`);
    const autoBuild = canBuild && p.money - cost >= 300;
    const ans = await this.choose([
      { label: `蓋！ $${cost}`, value: true, fill: 0x00e436, disabled: !canBuild },
      { label: '先不要', value: false, fill: 0xc2c3c7 },
    ], p, autoBuild);
    if (ans) {
      p.money -= cost;
      st.level++;
      this.refreshTile(i);
      Sfx.buy();
      this.flashTile(i);
      this.say(`${t.name} 蓋好第 ${st.level} 層競選總部！\n過路費變成 $${this.rentOf(i)}`);
      this.refreshPanels();
      await this.wait(1100);
    }
  }

  async payRent(p, i) {
    const owner = this.players[this.tileState[i].owner];
    const rent = this.rentOf(i);
    this.say(`${TILES[i].name} 是 ${owner.name} 的地盤！\n付過路費 $${rent}`);
    await this.wait(600);
    await this.pay(p, rent, owner);
    await this.wait(800);
  }

  flashTile(i) {
    const { x, y } = this.tileXY(i);
    const f = this.add.rectangle(x, y, TILE, TILE, 0xffffff).setOrigin(0).setDepth(40);
    this.tweens.add({ targets: f, alpha: 0, duration: 450, ease: 'Stepped', easeParams: [4], onComplete: () => f.destroy() });
  }

  // ---------- 機會 / 命運 ----------
  drawFromDeck(kind) {
    const deckKey = kind === 'chance' ? 'chanceDeck' : 'fateDeck';
    if (this[deckKey].length === 0) {
      this[deckKey] = Phaser.Utils.Array.Shuffle([...(kind === 'chance' ? CHANCE_CARDS : FATE_CARDS)]);
    }
    return this[deckKey].pop();
  }

  async drawCard(p, kind) {
    const card = this.drawFromDeck(kind);
    const isChance = kind === 'chance';
    Sfx.tune(isChance ? [659, 784, 988] : [440, 370, 311], 0.08);

    // 卡片跳出來
    this.cardLayer.removeAll(true);
    const cx = W / 2;
    const cy = 360;
    const panel = this.add.container(cx, cy);
    panel.add(this.add.rectangle(8, 8, 460, 300, 0x000000, 0.6));
    panel.add(this.add.rectangle(0, 0, 460, 300, isChance ? 0xffec27 : 0x29adff).setStrokeStyle(6, 0x000000));
    panel.add(this.add.rectangle(0, -104, 440, 64, isChance ? 0xff004d : 0x1d2b53));
    panel.add(this.add.image(-170, -104, isChance ? 'chance' : 'ballot').setScale(3));
    panel.add(this.add.text(0, -104, isChance ? '機會' : '命運', { fontFamily: FONT, fontSize: '40px', color: '#fff1e8' }).setOrigin(0.5));
    panel.add(this.add.text(0, 30, card.text, { fontFamily: FONT, fontSize: '28px', color: '#000000', align: 'center', lineSpacing: 10 }).setOrigin(0.5));
    this.cardLayer.add(panel);
    panel.setScale(0.1);
    await this.tweenP({ targets: panel, scale: 1, duration: 250, ease: 'Back.easeOut' });
    this.say(`${p.name} 抽到${isChance ? '機會' : '命運'}卡`);

    await this.choose([{ label: '知道了', value: 1 }], p, 1);
    this.cardLayer.removeAll(true);
    await this.applyCard(p, card);
  }

  async applyCard(p, card) {
    if (card.money) {
      if (card.money > 0) this.changeMoney(p, card.money);
      else await this.pay(p, -card.money);
      await this.wait(700);
    }
    if (card.fromEach) {
      for (const o of this.players) {
        if (o.id === p.id || o.bankrupt) continue;
        await this.pay(o, card.fromEach, p);
        await this.wait(300);
      }
    }
    if (card.perLevel) {
      const levels = this.tileState.reduce((n, s) => n + (s.owner === p.id ? s.level : 0), 0);
      const fee = levels * card.perLevel;
      if (fee > 0) {
        this.say(`${p.name} 有 ${levels} 層競選總部，\n共付 $${fee}`);
        await this.pay(p, fee);
      } else {
        this.say(`${p.name} 還沒有競選總部，\n不用付錢！`);
      }
      await this.wait(1000);
    }
    if (card.jam) {
      const steps = (5 - p.pos + TILES.length) % TILES.length;
      await this.walk(p, steps);
      p.skip = 1;
      this.refreshPanels();
      this.say(`${p.name} 卡在車陣裡，\n下回合暫停一次`);
      Sfx.bad();
      await this.wait(1000);
      return;
    }
    if (card.move) {
      await this.walk(p, card.move);
      await this.resolveTile(p);
      return;
    }
    if (card.goto !== undefined) {
      await this.goTo(p, card.goto);
      await this.resolveTile(p);
    }
  }

  // ---------- 點格子看資訊 ----------
  showTileInfo(i) {
    const t = TILES[i];
    if (t.type !== 'property') return;
    const st = this.tileState[i];
    const owner = st.owner === null ? '還沒有人買' : `地主：${this.players[st.owner].name}`;
    const rent = st.owner === null ? Math.round(t.price / 10) : this.rentOf(i);
    this.say(`【${t.name}】價格 $${t.price}\n${owner}\n總部 ${st.level} 層，過路費 $${rent}`);
  }

  // ---------- 遊戲結束 ----------
  checkEnd() {
    const alive = this.players.filter((p) => !p.bankrupt);
    const lastTurnOfRound = this.players.slice(this.current + 1).every((p) => p.bankrupt);
    if (alive.length <= 1 || (this.round >= GAME_RULES.maxRounds && lastTurnOfRound)) {
      this.showResults();
      return true;
    }
    return false;
  }

  showResults() {
    this.gameOver = true;
    this.refreshPanels();
    this.choiceLayer.removeAll(true);
    const ranking = [...this.players].sort((a, b) => (a.bankrupt - b.bankrupt) || (this.assetsOf(b) - this.assetsOf(a)));
    const winner = ranking[0];
    Sfx.win();

    const layer = this.add.container(0, 0).setDepth(100);
    layer.add(this.add.rectangle(0, 0, W, H, 0x000000, 0.88).setOrigin(0));
    layer.add(this.add.text(W / 2, 140, '★ 投票日 ★', { fontFamily: FONT, fontSize: '56px', color: '#ffec27', stroke: '#000', strokeThickness: 10 }).setOrigin(0.5));
    const img = this.add.image(W / 2, 300, `char${winner.id}`).setScale(9);
    layer.add(img);
    this.tweens.add({ targets: img, y: 280, duration: 300, yoyo: true, repeat: -1, ease: 'Stepped', easeParams: [3] });
    layer.add(this.add.text(W / 2, 430, `${winner.name} 高票當選！`, { fontFamily: FONT, fontSize: '48px', color: winner.color, stroke: '#000', strokeThickness: 10 }).setOrigin(0.5));

    ranking.forEach((p, k) => {
      const y = 530 + k * 70;
      layer.add(this.add.text(140, y, `${k + 1}. ${p.name}`, { fontFamily: FONT, fontSize: '32px', color: '#fff1e8' }));
      layer.add(this.add.text(580, y, p.bankrupt ? '破產' : `總資產 $${this.assetsOf(p)}`, { fontFamily: FONT, fontSize: '28px', color: p.bankrupt ? '#ff004d' : '#ffec27' }).setOrigin(1, 0));
    });

    // 彩色紙花
    for (let k = 0; k < 60; k++) {
      const colors = [0xff004d, 0xffec27, 0x29adff, 0x00e436, 0xff77a8];
      const r = this.add.rectangle(Phaser.Math.Between(0, W), Phaser.Math.Between(-400, 0), 8, 8, colors[k % colors.length]);
      layer.add(r);
      this.tweens.add({ targets: r, y: H + 20, duration: Phaser.Math.Between(2000, 4000), repeat: -1, delay: Phaser.Math.Between(0, 2000) });
    }

    layer.add(makeButton(this, W / 2, 920, 340, 90, '再選一次', { fill: 0xff004d, color: '#fff1e8', fontSize: '40px', onClick: () => this.scene.start('title') }));
  }
}

// =====================================================================
// 啟動：先等像素字型載入，再開遊戲
// =====================================================================
function startGame() {
  if (window.__game) return;
  window.__game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    width: W,
    height: H,
    backgroundColor: '#1d2b53',
    pixelArt: true,
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    scene: [TitleScene, GameScene],
  });
}

if (document.fonts && document.fonts.load) {
  Promise.race([
    document.fonts.load('24px Cubic11', '台北大富翁$0123'),
    new Promise((r) => setTimeout(r, 3000)),
  ]).then(startGame, startGame);
} else {
  startGame();
}
