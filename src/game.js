// =====================================================================
// 遊戲畫面：斜 45 度（等角）的台北街道地圖 + 遊戲規則
// 畫面上的按鈕、訊息、玩家資訊在 hud.js（另一層，不會跟著地圖捲動）
// =====================================================================

const ISO_W = 128;          // 一格菱形的寬
const ISO_H = 64;           // 一格菱形的高
const RING = 6;             // 道路是 6x6 的一圈（20 格）
const MAP_MIN = -2;         // 地圖從第 -2 格畫到第 7 格（外面一圈放建築和樹）
const MAP_MAX = 7;
const ORIGIN_X = 640;
const ORIGIN_Y = 260;

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
    this.cameras.main.setBackgroundColor(0x4a7fb5);
    Music.want('game');
    this.input.on('pointerdown', () => Sfx.unlock());
    this.drawWater();
    this.drawGround();
    this.drawRoad();
    this.drawLots();
    this.drawTrees();
    this.createTokens();
    this.setupCamera();

    this.events.once('shutdown', () => {
      this.gameOver = true;
      this.scene.stop('hud');
    });

    // 啟動上層的 HUD，等它準備好再開始遊戲
    this.scene.launch('hud', { game: this });
    this.hud = this.scene.get('hud');
    this.hud.events.once('create', () => this.runGame());
  }

  // ---------- 座標 ----------
  // 第 i 格在 6x6 外圈的 (col,row)。0 在「前方」角落，逆時針走一圈。
  ringCell(i) {
    if (i <= 5) return { col: 5 - i, row: 5 };
    if (i <= 10) return { col: 0, row: 5 - (i - 5) };
    if (i <= 15) return { col: i - 10, row: 0 };
    return { col: 5, row: i - 15 };
  }

  // 方格 (col,row) → 螢幕上菱形中心點
  iso(col, row) {
    return { x: ORIGIN_X + (col - row) * (ISO_W / 2), y: ORIGIN_Y + (col + row) * (ISO_H / 2) };
  }

  tileCenter(i) {
    const { col, row } = this.ringCell(i);
    return this.iso(col, row);
  }

  // 地產旁邊的空地（在道路外側）
  lotCell(i) {
    const { col, row } = this.ringCell(i);
    if (row === 5 && col > 0 && col < 5) return { col, row: 6 };
    if (col === 0 && row > 0 && row < 5) return { col: -1, row };
    if (row === 0 && col > 0 && col < 5) return { col, row: -1 };
    if (col === 5 && row > 0 && row < 5) return { col: 6, row };
    return null;
  }

  diamond(g, cx, cy, w, h, fill, alpha = 1) {
    g.fillStyle(fill, alpha);
    g.fillPoints([
      { x: cx, y: cy - h / 2 }, { x: cx + w / 2, y: cy },
      { x: cx, y: cy + h / 2 }, { x: cx - w / 2, y: cy },
    ], true);
  }

  diamondLine(g, cx, cy, w, h, width, color, alpha = 1) {
    g.lineStyle(width, color, alpha);
    g.strokePoints([
      { x: cx, y: cy - h / 2 }, { x: cx + w / 2, y: cy },
      { x: cx, y: cy + h / 2 }, { x: cx - w / 2, y: cy },
    ], true);
  }

  // ---------- 畫地圖 ----------
  drawWater() {
    // 背景的河水波紋（像淡水河）
    const g = this.add.graphics().setDepth(-1000);
    const rnd = new Phaser.Math.RandomDataGenerator(['water']);
    for (let k = 0; k < 160; k++) {
      const x = rnd.between(-400, 1700);
      const y = rnd.between(-300, 1100);
      g.fillStyle(0x6fa3d6, 0.8);
      g.fillRect(x, y, rnd.between(12, 36), 4);
    }
  }

  drawGround() {
    const g = this.add.graphics().setDepth(-900);
    const rnd = new Phaser.Math.RandomDataGenerator(['grass']);
    // 島的側面（土和石頭），讓地圖看起來像一塊浮起來的地
    const left = this.iso(MAP_MIN, MAP_MAX + 1);
    const bottom = this.iso(MAP_MAX + 1, MAP_MAX + 1);
    const right = this.iso(MAP_MAX + 1, MAP_MIN);
    const L = { x: left.x, y: left.y - ISO_H / 2 };
    const B = { x: bottom.x, y: bottom.y - ISO_H / 2 };
    const R = { x: right.x, y: right.y - ISO_H / 2 };
    g.fillStyle(0x8a5a33, 1);
    g.fillPoints([L, B, { x: B.x, y: B.y + 40 }, { x: L.x, y: L.y + 40 }], true);
    g.fillStyle(0x6b4226, 1);
    g.fillPoints([B, R, { x: R.x, y: R.y + 40 }, { x: B.x, y: B.y + 40 }], true);
    g.fillStyle(0x9e9e9e, 1);
    g.fillPoints([L, B, { x: B.x, y: B.y + 8 }, { x: L.x, y: L.y + 8 }], true);
    g.fillStyle(0x7d7d7d, 1);
    g.fillPoints([B, R, { x: R.x, y: R.y + 8 }, { x: B.x, y: B.y + 8 }], true);

    for (let col = MAP_MIN; col <= MAP_MAX; col++) {
      for (let row = MAP_MIN; row <= MAP_MAX; row++) {
        const { x, y } = this.iso(col, row);
        const shade = (col + row) % 2 === 0 ? 0x5fb34a : 0x56a843;
        this.diamond(g, x, y, ISO_W, ISO_H, shade);
        // 草的小點
        for (let k = 0; k < 6; k++) {
          g.fillStyle(rnd.frac() < 0.5 ? 0x7bc85f : 0x479135, 1);
          g.fillRect(x + rnd.between(-36, 32), y + rnd.between(-12, 10), 4, 4);
        }
      }
    }
    // 中間公園的步道和噴水池
    const c = this.iso(2.5, 2.5);
    this.diamond(g, c.x, c.y, ISO_W * 2.4, ISO_H * 2.4, 0xd9c7a3);
    this.diamond(g, c.x, c.y, ISO_W * 1.2, ISO_H * 1.2, 0xbfae8a);
    this.diamond(g, c.x, c.y, ISO_W * 0.9, ISO_H * 0.9, 0x29adff);
    this.diamond(g, c.x, c.y, ISO_W * 0.5, ISO_H * 0.5, 0x8fd3ff);
    const fountain = this.add.graphics().setDepth(c.y);
    fountain.fillStyle(0xc2c3c7, 1);
    fountain.fillRect(c.x - 6, c.y - 30, 12, 30);
    fountain.fillStyle(0xfff1e8, 1);
    fountain.fillRect(c.x - 4, c.y - 44, 8, 14);
    const spray = this.add.rectangle(c.x, c.y - 52, 20, 8, 0xdff4ff).setDepth(c.y + 1);
    this.tweens.add({ targets: spray, scaleX: 1.6, alpha: 0.4, duration: 500, yoyo: true, repeat: -1, ease: 'Stepped', easeParams: [3] });
  }

  drawRoad() {
    const g = this.add.graphics().setDepth(-800);
    TILES.forEach((t, i) => {
      const { x, y } = this.tileCenter(i);
      const corner = i % 5 === 0;
      // 路面
      this.diamond(g, x, y + 4, ISO_W, ISO_H, 0x3b3b44);
      this.diamond(g, x, y, ISO_W, ISO_H, corner ? 0xb8a98a : 0x5a5a66);
      this.diamond(g, x, y, ISO_W - 14, ISO_H - 7, corner ? 0xd6c6a0 : 0x6b6b78);
      this.diamondLine(g, x, y, ISO_W, ISO_H, 2, 0x2a2a30);
      // 地產格塗上顏色組的色塊（像大富翁的色條）
      if (t.type === 'property') {
        this.diamond(g, x, y, 34, 17, hex(GROUPS[t.group]));
        this.diamondLine(g, x, y, 34, 17, 2, 0x000000);
      }
      // 機會 / 命運 / 角落：在路上放大圖示
      if (t.type !== 'property') {
        const big = corner;
        let ic;
        if (this.textures.exists(`bld_${t.icon}`) && big) {
          // 角落：AI 圖底下是一塊路面，直接蓋在這格上
          ic = this.add.image(x, y + ISO_H / 2 + 2, `bld_${t.icon}`).setOrigin(0.5, 1);
          ic.setScale((ISO_W + 4) / ic.width);
        } else if (this.textures.exists(`bld_${t.icon}`)) {
          // 機會/命運：浮在路上的小東西
          ic = addIcon(this, x, y + 8, t.icon, 64).setOrigin(0.5, 1);
          this.tweens.add({ targets: ic, y: y + 2, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
        } else {
          ic = this.add.image(x, y + 6, t.icon).setOrigin(0.5, 1).setScale(big ? 3.5 : 3);
        }
        ic.setDepth(y - 10);
        this.add.text(x, y + 12, t.name, {
          fontFamily: FONT, fontSize: '20px', color: '#ffffff', stroke: '#000000', strokeThickness: 6,
        }).setOrigin(0.5, 0).setDepth(y + 200);
      }
    });
    // 道路中線虛線（只畫在一般格之間）
    g.fillStyle(0xffec27, 1);
    for (let i = 0; i < TILES.length; i++) {
      const a = this.tileCenter(i);
      const b = this.tileCenter((i + 1) % TILES.length);
      const mx = (a.x + b.x) / 2;
      const my = (a.y + b.y) / 2;
      g.fillRect(mx - 6, my - 2, 12, 4);
    }
  }

  drawLots() {
    this.lotOverlays = [];
    const g = this.add.graphics().setDepth(-700);
    TILES.forEach((t, i) => {
      if (t.type !== 'property') return;
      const cell = this.lotCell(i);
      const { x, y } = this.iso(cell.col, cell.row);
      // 空地：人行磚
      this.diamond(g, x, y, ISO_W - 8, ISO_H - 4, 0xd9cbb0);
      this.diamond(g, x, y, ISO_W - 24, ISO_H - 12, 0xe8dcc4);
      this.diamondLine(g, x, y, ISO_W - 8, ISO_H - 4, 3, hex(GROUPS[t.group]));

      // 建築：有 AI 畫的圖就用，沒有就用像素小圖
      let bld;
      if (this.textures.exists(`bld_${t.icon}`)) {
        // AI 圖的底部是一塊菱形地面，對齊空地的菱形
        bld = this.add.image(x, y + ISO_H / 2 - 2, `bld_${t.icon}`).setOrigin(0.5, 1);
        bld.setScale((ISO_W - 6) / bld.width);
      } else {
        bld = this.add.image(x, y + 14, t.icon).setOrigin(0.5, 1).setScale(t.icon === 'taipei101' ? 7 : 5.5);
      }
      bld.setDepth(y + 20);

      // 名牌
      this.add.text(x, y + 22, t.name, {
        fontFamily: FONT, fontSize: '18px', color: '#ffffff', backgroundColor: '#1d2b53',
        padding: { x: 6, y: 2 },
      }).setOrigin(0.5, 0).setDepth(y + 300);

      // 地主標記放這層（之後重畫）
      this.lotOverlays[i] = this.add.container(x, y).setDepth(y + 25);

      // 點建築看資訊（拖曳地圖時不算）
      bld.setInteractive({ pixelPerfect: false });
      bld.on('pointerup', (p) => {
        if (p.getDistance() < 12) this.showTileInfo(i);
      });
    });
  }

  drawTrees() {
    const rnd = new Phaser.Math.RandomDataGenerator(['trees']);
    const used = new Set();
    TILES.forEach((t, i) => {
      const lc = this.lotCell(i);
      if (lc) used.add(`${lc.col},${lc.row}`);
      const rc = this.ringCell(i);
      used.add(`${rc.col},${rc.row}`);
    });
    const spots = [];
    for (let col = MAP_MIN; col <= MAP_MAX; col++) {
      for (let row = MAP_MIN; row <= MAP_MAX; row++) {
        if (used.has(`${col},${row}`)) continue;
        const inPark = col >= 1 && col <= 4 && row >= 1 && row <= 4;
        const nearFountain = col >= 2 && col <= 3 && row >= 2 && row <= 3;
        if (nearFountain) continue;
        if (rnd.frac() < (inPark ? 0.45 : 0.75)) spots.push({ col, row });
      }
    }
    for (const s of spots) {
      const n = rnd.between(1, 2);
      for (let k = 0; k < n; k++) {
        const { x, y } = this.iso(s.col, s.row);
        this.drawTree(x + rnd.between(-30, 30), y + rnd.between(-10, 10), rnd);
      }
    }
  }

  drawTree(x, y, rnd) {
    const g = this.add.graphics().setDepth(y);
    const s = rnd.between(3, 4); // 像素大小
    const dark = rnd.frac() < 0.5 ? 0x1e7b3a : 0x2a8b46;
    g.fillStyle(0x000000, 0.25);
    g.fillEllipse(x, y, 10 * s, 3 * s);
    g.fillStyle(0x6b4226, 1);
    g.fillRect(x - s, y - 4 * s, 2 * s, 4 * s);
    const rows = [[-3, 3, -5], [-4, 4, -7], [-4, 4, -9], [-3, 3, -11], [-2, 2, -12]];
    for (const [a, b, yy] of rows) {
      g.fillStyle(dark, 1);
      g.fillRect(x + a * s, y + yy * s, (b - a) * s, 2 * s);
    }
    g.fillStyle(0x7bc85f, 1);
    g.fillRect(x - 2 * s, y - 11 * s, 2 * s, s);
    g.fillRect(x - 3 * s, y - 9 * s, s, s);
  }

  refreshTile(i) {
    const ov = this.lotOverlays[i];
    if (!ov) return;
    ov.removeAll(true);
    const st = this.tileState[i];
    if (st.owner === null) return;
    const color = hex(this.players[st.owner].color);
    const g = this.add.graphics();
    this.diamondLine(g, 0, 0, ISO_W - 8, ISO_H - 4, 6, color);
    ov.add(g);
    // 地主的競選旗（每蓋一層多一支）
    const makeFlag = (fx, fy, h) => {
      if (this.textures.exists('bld_flag')) return addIcon(this, fx, fy, 'flag', h).setOrigin(0.5, 1).setTint(color);
      return this.add.image(fx, fy, `flag${st.owner}`).setOrigin(0.15, 0.8).setScale(h / 16);
    };
    ov.add(makeFlag(-44, 8, 44));
    for (let k = 0; k < st.level; k++) ov.add(makeFlag(38 - k * 16, 12 + k * 6, 34));
  }

  // ---------- 鏡頭 ----------
  setupCamera() {
    const cam = this.cameras.main;
    cam.setBounds(-300, -420, 1880, 1640);
    cam.setZoom(ZOOM.start);
    this.dragging = false;
    this.input.addPointer(1); // 允許兩指（縮放用）
    this.input.on('pointerdown', (p) => {
      this.dragStart = { x: p.x, y: p.y, sx: cam.scrollX, sy: cam.scrollY };
      this.dragging = false;
    });
    this.input.on('pointermove', (p) => {
      // 兩指縮放
      const p1 = this.input.pointer1;
      const p2 = this.input.pointer2;
      if (p1.isDown && p2.isDown) {
        const d = Phaser.Math.Distance.Between(p1.x, p1.y, p2.x, p2.y);
        if (!this.pinch) this.pinch = { d, zoom: cam.zoom };
        else this.setZoom(this.pinch.zoom * d / this.pinch.d);
        this.dragStart = null;
        return;
      }
      this.pinch = null;
      if (!p.isDown || !this.dragStart) return;
      const dx = p.x - this.dragStart.x;
      const dy = p.y - this.dragStart.y;
      if (!this.dragging && Math.hypot(dx, dy) < 12) return;
      this.dragging = true;
      cam.stopFollow();
      cam.setScroll(this.dragStart.sx - dx / cam.zoom, this.dragStart.sy - dy / cam.zoom);
    });
    this.input.on('pointerup', () => { this.dragStart = null; this.pinch = null; });
    // 電腦：滑鼠滾輪縮放
    this.input.on('wheel', (pointer, objs, dx, dy) => this.setZoom(cam.zoom * (dy > 0 ? 0.9 : 1.1)));
  }

  // 鏡頭跟著角色，讓角色出現在「地圖看得到的範圍」中間（不被介面擋住）
  followOffset() {
    const z = this.cameras.main.zoom;
    const cx = MAP_VIEW.x + MAP_VIEW.w / 2 - W / 2;
    const cy = MAP_VIEW.y + MAP_VIEW.h / 2 + 30 - H / 2;
    return { x: -cx / z, y: -cy / z };
  }

  followPlayer(p) {
    const cam = this.cameras.main;
    const o = this.followOffset();
    cam.startFollow(this.tokens[p.id], true, 0.12, 0.12, o.x, o.y);
  }

  // 放大縮小（按鈕、兩指、滑鼠滾輪都用這個）
  setZoom(z) {
    const cam = this.cameras.main;
    cam.setZoom(Phaser.Math.Clamp(z, ZOOM.min, ZOOM.max));
    if (cam._follow) {
      const o = this.followOffset();
      cam.setFollowOffset(o.x, o.y);
    }
  }

  // ---------- 棋子 ----------
  slotOffset(id) {
    return [[-22, -2], [22, -2], [-6, 12], [10, 14]][id];
  }

  tokenPos(p) {
    const { x, y } = this.tileCenter(p.pos);
    const [ox, oy] = this.slotOffset(p.id);
    return { x: x + ox, y: y + oy };
  }

  createTokens() {
    this.tokens = this.players.map((p) => {
      const { x, y } = this.tokenPos(p);
      const shadow = this.add.ellipse(x, y, 34, 12, 0x000000, 0.35);
      const t = addCharacter(this, x, y, p.id, 72).setOrigin(0.5, 0.95);
      t.shadow = shadow;
      t.setDepth(y + 30);
      shadow.setDepth(y + 29);
      return t;
    });
  }

  // ---------- 小工具 ----------
  wait(ms) {
    return new Promise((res) => this.time.delayedCall(ms, res));
  }

  tweenP(cfg) {
    return new Promise((res) => this.tweens.add({ ...cfg, onComplete: () => res() }));
  }

  floatText(x, y, str, color) {
    const txt = this.add.text(x, y, str, { fontFamily: FONT, fontSize: '32px', color, stroke: '#000', strokeThickness: 8 }).setOrigin(0.5).setDepth(5000);
    this.tweens.add({ targets: txt, y: y - 60, alpha: 0, duration: 1200, ease: 'Quad.easeOut', onComplete: () => txt.destroy() });
  }

  flashTile(i) {
    const cell = this.lotCell(i);
    const { x, y } = this.iso(cell.col, cell.row);
    const g = this.add.graphics().setDepth(4000);
    this.diamond(g, x, y, ISO_W, ISO_H, 0xffffff);
    this.tweens.add({ targets: g, alpha: 0, duration: 500, ease: 'Stepped', easeParams: [4], onComplete: () => g.destroy() });
  }

  // ---------- 遊戲主流程 ----------
  async runGame() {
    this.hud.refreshPanels();
    this.followPlayer(this.players[0]);
    this.hud.say('選戰開始！\n誰能買下最多台北地標？');
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
    this.hud.refreshPanels();
  }

  async playTurn(p) {
    this.hud.refreshPanels();
    this.followPlayer(p);
    this.bounceToken(p);

    if (p.skip > 0) {
      p.skip--;
      this.hud.say(`${p.name} 還卡在車陣裡…\n這回合暫停一次`);
      Sfx.bad();
      this.hud.refreshPanels();
      await this.hud.choose([{ label: '好吧', value: 1 }], p, 1);
      return;
    }

    this.hud.say(p.human ? `輪到 ${p.name}！\n按「擲骰子」出發` : `輪到 ${p.name}（電腦）…`);
    await this.hud.choose([{ label: '擲骰子', value: 1, fill: 0xff004d }], p, 1);
    this.followPlayer(p);
    const roll = await this.hud.rollDice();
    this.hud.say(`${p.name} 擲出 ${roll} 點！`);
    await this.walk(p, roll);
    await this.resolveTile(p);
    this.hud.refreshPanels();
  }

  bounceToken(p) {
    const t = this.tokens[p.id];
    this.tweens.killTweensOf(t);
    const { x, y } = this.tokenPos(p);
    t.setPosition(x, y);
    this.tweens.add({ targets: t, y: y - 12, duration: 160, yoyo: true, repeat: 2, ease: 'Stepped', easeParams: [2] });
  }

  // 一格一格跳（steps 可以是負的 = 後退）
  async walk(p, steps) {
    const dir = steps >= 0 ? 1 : -1;
    const t = this.tokens[p.id];
    this.tweens.killTweensOf(t);
    this.followPlayer(p);
    for (let k = 0; k < Math.abs(steps); k++) {
      p.pos = (p.pos + dir + TILES.length) % TILES.length;
      const { x, y } = this.tokenPos(p);
      // 往左走時角色轉向
      t.setFlipX(x < t.x);
      Sfx.hop();
      t.shadow.setPosition(x, y).setDepth(y + 29);
      t.setDepth(Math.max(t.depth, y + 30));
      await this.tweenP({ targets: t, x: (t.x + x) / 2, y: Math.min(t.y, y) - 28, duration: 110, ease: 'Quad.easeOut' });
      await this.tweenP({ targets: t, x, y, duration: 110, ease: 'Quad.easeIn' });
      t.setDepth(y + 30);
      if (dir > 0 && p.pos === 0) {
        p.money += GAME_RULES.passGoBonus;
        this.floatText(x, y - 80, `+$${GAME_RULES.passGoBonus}`, '#ffec27');
        Sfx.coin();
        this.hud.refreshPanels();
      }
    }
  }

  async goTo(p, target) {
    const steps = (target - p.pos + TILES.length) % TILES.length;
    await this.walk(p, steps);
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
    const { x, y } = this.tokenPos(p);
    this.floatText(x, y - 80, `${amount >= 0 ? '+' : '-'}$${Math.abs(amount)}`, amount >= 0 ? '#ffec27' : '#ff004d');
    if (amount >= 0) Sfx.coin(); else Sfx.pay();
    this.hud.refreshPanels();
  }

  // 付錢給某人（to = null 代表付給銀行）。付不出來就破產。
  async pay(p, amount, to = null) {
    const paid = Math.min(amount, Math.max(p.money, 0));
    this.changeMoney(p, -amount);
    if (to) {
      to.money += paid;
      const { x, y } = this.tokenPos(to);
      this.floatText(x, y - 80, `+$${paid}`, '#ffec27');
      this.hud.refreshPanels();
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
    this.hud.refreshPanels();
    this.hud.say(`${p.name} 選舉經費燒光了…\n宣布退出選戰！`);
    await this.wait(1800);
  }

  // ---------- 走到格子上會發生的事 ----------
  async resolveTile(p) {
    const i = p.pos;
    const t = TILES[i];
    const st = this.tileState[i];

    switch (t.type) {
      case 'go':
        this.hud.say(`${p.name} 回到起點，\n繼續拉票！`);
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
        this.hud.say(`${p.name} 遇到大塞車！\n下回合暫停一次`);
        p.skip = 1;
        Sfx.bad();
        this.hud.refreshPanels();
        await this.wait(1200);
        break;
      case 'mrt':
        this.hud.say(`${p.name} 在捷運站休息一下，\n吹吹冷氣～`);
        await this.wait(1000);
        break;
      case 'tow':
        this.hud.say(`${p.name} 的宣傳車被拖吊了！\n繳罰款 $${GAME_RULES.towFine}`);
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
    this.hud.say(`${t.name} 還沒有人插旗！\n要花 $${t.price} 買下嗎？${canBuy ? '' : '\n（錢不夠…）'}`);
    const autoBuy = canBuy && p.money - t.price >= 200;
    const ans = await this.hud.choose([
      { label: `買下 $${t.price}`, value: true, fill: 0x00e436, disabled: !canBuy },
      { label: '不買', value: false, fill: 0xc2c3c7 },
    ], p, autoBuy);
    if (ans) {
      p.money -= t.price;
      this.tileState[i].owner = p.id;
      this.refreshTile(i);
      Sfx.buy();
      this.flashTile(i);
      this.hud.say(`${p.name} 買下了 ${t.name}！\n過路費 $${this.rentOf(i)}`);
      this.hud.refreshPanels();
      await this.wait(1000);
    } else {
      this.hud.say(`${p.name} 決定先不買。`);
      await this.wait(700);
    }
  }

  async offerUpgrade(p, i) {
    const t = TILES[i];
    const st = this.tileState[i];
    if (st.level >= GAME_RULES.maxLevel) {
      this.hud.say(`${t.name} 的競選總部已經蓋滿了！\n過路費 $${this.rentOf(i)}`);
      await this.wait(1100);
      return;
    }
    const cost = this.upgradeCost(i);
    const canBuild = p.money >= cost;
    this.hud.say(`回到自己的 ${t.name}。\n要花 $${cost} 蓋第 ${st.level + 1} 層競選總部嗎？`);
    const autoBuild = canBuild && p.money - cost >= 300;
    const ans = await this.hud.choose([
      { label: `蓋！ $${cost}`, value: true, fill: 0x00e436, disabled: !canBuild },
      { label: '先不要', value: false, fill: 0xc2c3c7 },
    ], p, autoBuild);
    if (ans) {
      p.money -= cost;
      st.level++;
      this.refreshTile(i);
      Sfx.buy();
      this.flashTile(i);
      this.hud.say(`${t.name} 蓋好第 ${st.level} 層競選總部！\n過路費變成 $${this.rentOf(i)}`);
      this.hud.refreshPanels();
      await this.wait(1100);
    }
  }

  async payRent(p, i) {
    const owner = this.players[this.tileState[i].owner];
    const rent = this.rentOf(i);
    this.hud.say(`${TILES[i].name} 是 ${owner.name} 的地盤！\n付過路費 $${rent}`);
    await this.wait(600);
    await this.pay(p, rent, owner);
    await this.wait(800);
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
    this.hud.say(`${p.name} 抽到${isChance ? '機會' : '命運'}卡`);
    await this.hud.showCard(card, isChance, p);
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
        this.hud.say(`${p.name} 有 ${levels} 層競選總部，\n共付 $${fee}`);
        await this.pay(p, fee);
      } else {
        this.hud.say(`${p.name} 還沒有競選總部，\n不用付錢！`);
      }
      await this.wait(1000);
    }
    if (card.jam) {
      const steps = (5 - p.pos + TILES.length) % TILES.length;
      await this.walk(p, steps);
      p.skip = 1;
      this.hud.refreshPanels();
      this.hud.say(`${p.name} 卡在車陣裡，\n下回合暫停一次`);
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

  // ---------- 點建築看資訊 ----------
  showTileInfo(i) {
    const t = TILES[i];
    const st = this.tileState[i];
    const owner = st.owner === null ? '還沒有人買' : `地主：${this.players[st.owner].name}`;
    const rent = st.owner === null ? Math.round(t.price / 10) : this.rentOf(i);
    this.hud.say(`【${t.name}】價格 $${t.price}\n${owner}\n總部 ${st.level} 層，過路費 $${rent}`);
  }

  // ---------- 遊戲結束 ----------
  checkEnd() {
    const alive = this.players.filter((p) => !p.bankrupt);
    const lastTurnOfRound = this.players.slice(this.current + 1).every((p) => p.bankrupt);
    if (alive.length <= 1 || (this.round >= GAME_RULES.maxRounds && lastTurnOfRound)) {
      this.gameOver = true;
      this.cameras.main.stopFollow();
      this.hud.showResults();
      return true;
    }
    return false;
  }
}
