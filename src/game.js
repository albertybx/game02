// =====================================================================
// 遊戲畫面：斜 45 度（等角）的台北街道地圖 + 遊戲規則
// 畫面上的按鈕、訊息、玩家資訊在 hud.js（另一層，不會跟著地圖捲動）
// =====================================================================

const ISO_W = 128;          // 一格菱形的寬
const ISO_H = 64;           // 一格菱形的高
const ORIGIN_X = 900;       // 地圖畫在世界座標的哪裡
const ORIGIN_Y = 150;
// 這些格子的 AI 圖本身就是一整塊地面，直接蓋在路上
const FULL_TILE_TYPES = ['go', 'jam', 'mrt', 'tow', 'talent'];
const LAND_MARGIN = 1;      // 路線外面留幾格陸地（越小，海岸線越貼著路線，地圖形狀越明顯）
const UNOWNED_COLOR = 0x9a9aa6;  // 還沒人買的地：灰色
const SHOW_BUILDING_NAMES = false; // 要不要在建築下面顯示名字

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
        fans: GAME_RULES.startFans,
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
    this.buildBoard();
    this.drawWater();
    this.drawGround();
    this.drawRoad();
    this.drawLots();
    TILES.forEach((t, i) => this.refreshTile(i));
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

  // ---------- 地圖形狀 ----------
  // 照 data.js 的 MAP_ROUTE 算出：路線上每一格、陸地範圍、每個地標/里長的空地、中間公園的位置
  buildBoard() {
    const key = (c, r) => `${c},${r}`;
    // 1. 路線：從每個轉彎點一格一格走到下一個轉彎點
    const path = [];
    for (let k = 0; k < MAP_ROUTE.length; k++) {
      const [c0, r0] = MAP_ROUTE[k];
      const [c1, r1] = MAP_ROUTE[(k + 1) % MAP_ROUTE.length];
      const dc = Math.sign(c1 - c0);
      const dr = Math.sign(r1 - r0);
      let c = c0;
      let r = r0;
      while (c !== c1 || r !== r1) { path.push({ col: c, row: r }); c += dc; r += dr; }
    }
    if (path.length !== TILES.length) console.warn(`地圖路線有 ${path.length} 格，但 TILES 有 ${TILES.length} 格，兩個要一樣`);
    const onPath = new Set(path.map((p) => key(p.col, p.row)));

    // 2. 範圍（路線外面多留 3 格放樹和海岸）
    const cols = path.map((p) => p.col);
    const rows = path.map((p) => p.row);
    const minC = Math.min(...cols) - 3;
    const maxC = Math.max(...cols) + 3;
    const minR = Math.min(...rows) - 3;
    const maxR = Math.max(...rows) + 3;

    // 3. 從外圍往內灌水，灌不到的就是路線圍起來的「城市內部」
    const outside = new Set();
    const stack = [[minC, minR]];
    while (stack.length) {
      const [c, r] = stack.pop();
      const k = key(c, r);
      if (c < minC || c > maxC || r < minR || r > maxR || outside.has(k) || onPath.has(k)) continue;
      outside.add(k);
      stack.push([c + 1, r], [c - 1, r], [c, r + 1], [c, r - 1]);
    }
    const inside = new Set();
    const land = new Set(onPath);
    for (let c = minC; c <= maxC; c++) {
      for (let r = minR; r <= maxR; r++) {
        const k = key(c, r);
        if (!outside.has(k) && !onPath.has(k)) { inside.add(k); land.add(k); }
        // 路線外面緊鄰的一圈也是陸地（放建築和樹），海岸線就會跟著路線的形狀
        if (outside.has(k) && path.some((p) => Math.max(Math.abs(p.col - c), Math.abs(p.row - r)) <= LAND_MARGIN)) land.add(k);
      }
    }

    // 4. 地標和里長的空地：選路旁邊一格。優先選「後面」（畫面上方），建築才不會擋住路上的角色
    const taken = new Set(onPath);
    const lots = [];
    TILES.forEach((t, i) => {
      if (t.type !== 'property' && t.type !== 'chief') return;
      const { col, row } = path[i];
      const cands = [[col - 1, row], [col, row - 1], [col + 1, row], [col, row + 1]];
      const pick = cands.find(([c, r]) => land.has(key(c, r)) && !taken.has(key(c, r)));
      if (!pick) { console.warn(`${t.name} 旁邊找不到空地`); return; }
      taken.add(key(pick[0], pick[1]));
      lots[i] = { col: pick[0], row: pick[1] };
    });

    // 5. 公園（噴水池佔 2x2 格）：找城市內部最靠近中心、四格都空著的位置
    const insideList = [...inside].map((k) => k.split(',').map(Number));
    const cx = insideList.reduce((n, [c]) => n + c, 0) / insideList.length;
    const cy = insideList.reduce((n, [, r]) => n + r, 0) / insideList.length;
    let park = null;
    let best = Infinity;
    for (const [c, r] of insideList) {
      const block = [[c, r], [c + 1, r], [c, r + 1], [c + 1, r + 1]];
      if (!block.every(([a, b]) => inside.has(key(a, b)) && !taken.has(key(a, b)))) continue;
      const d = (c + 0.5 - cx) ** 2 + (r + 0.5 - cy) ** 2;
      if (d < best) { best = d; park = { col: c, row: r }; }
    }
    if (park) [[0, 0], [1, 0], [0, 1], [1, 1]].forEach(([a, b]) => taken.add(key(park.col + a, park.row + b)));

    this.board = { path, land, inside, lots, park, taken, minC, maxC, minR, maxR, key };
  }

  // ---------- 座標 ----------
  // 第 i 格在地圖上的 (col,row)
  ringCell(i) {
    return this.board.path[i];
  }

  // 方格 (col,row) → 螢幕上菱形中心點
  iso(col, row) {
    return { x: ORIGIN_X + (col - row) * (ISO_W / 2), y: ORIGIN_Y + (col + row) * (ISO_H / 2) };
  }

  tileCenter(i) {
    const { col, row } = this.ringCell(i);
    return this.iso(col, row);
  }

  // 地標/里長旁邊的空地
  lotCell(i) {
    return this.board.lots[i] || null;
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
    // 背景的河水：有 AI 畫的材質就鋪滿並慢慢流動，沒有就畫簡單的波紋
    if (this.textures.exists('bld_water')) {
      const water = this.add.tileSprite(-1200, -1200, 4800, 4000, 'bld_water').setOrigin(0).setDepth(-1000);
      this.tweens.add({ targets: water, tilePositionX: 128, tilePositionY: 64, duration: 9000, repeat: -1 });
      return;
    }
    const g = this.add.graphics().setDepth(-1000);
    const rnd = new Phaser.Math.RandomDataGenerator(['water']);
    for (let k = 0; k < 300; k++) {
      g.fillStyle(0x6fa3d6, 0.8);
      g.fillRect(rnd.between(-800, 2600), rnd.between(-600, 1800), rnd.between(12, 36), 4);
    }
  }

  drawGround() {
    const { land, key, park } = this.board;
    const g = this.add.graphics().setDepth(-900);
    const sides = this.add.graphics().setDepth(-950);
    const rnd = new Phaser.Math.RandomDataGenerator(['grass']);
    const textured = this.textures.exists('bld_grass_tile');
    for (const k of land) {
      const [col, row] = k.split(',').map(Number);
      const { x, y } = this.iso(col, row);
      // 海岸：前面（右下、左下）沒有陸地的邊，畫出土和石頭的側面，像一塊浮在水上的地
      const R = { x: x + ISO_W / 2, y };
      const B = { x, y: y + ISO_H / 2 };
      const L = { x: x - ISO_W / 2, y };
      if (!land.has(key(col + 1, row))) {
        sides.fillStyle(0x6b4226, 1).fillPoints([R, B, { x: B.x, y: B.y + 40 }, { x: R.x, y: R.y + 40 }], true);
        sides.fillStyle(0x7d7d7d, 1).fillPoints([R, B, { x: B.x, y: B.y + 8 }, { x: R.x, y: R.y + 8 }], true);
      }
      if (!land.has(key(col, row + 1))) {
        sides.fillStyle(0x8a5a33, 1).fillPoints([L, B, { x: B.x, y: B.y + 40 }, { x: L.x, y: L.y + 40 }], true);
        sides.fillStyle(0x9e9e9e, 1).fillPoints([L, B, { x: B.x, y: B.y + 8 }, { x: L.x, y: L.y + 8 }], true);
      }
      if (textured) {
        this.add.image(x, y, 'bld_grass_tile').setDepth(-899);
        continue;
      }
      this.diamond(g, x, y, ISO_W, ISO_H, (col + row) % 2 === 0 ? 0x5fb34a : 0x56a843);
      for (let n = 0; n < 6; n++) {
        g.fillStyle(rnd.frac() < 0.5 ? 0x7bc85f : 0x479135, 1);
        g.fillRect(x + rnd.between(-36, 32), y + rnd.between(-12, 10), 4, 4);
      }
    }
    // 城市中間的公園噴水池（佔 2x2 格）
    if (park) {
      const c = this.iso(park.col + 0.5, park.row + 0.5);
      if (this.textures.exists('bld_fountain')) {
        const f = this.add.image(c.x, c.y + ISO_H + 2, 'bld_fountain').setOrigin(0.5, 1);
        f.setScale((ISO_W * 2 + 4) / f.width).setDepth(c.y);
      } else {
        this.diamond(g, c.x, c.y, ISO_W * 1.8, ISO_H * 1.8, 0xd9c7a3);
        this.diamond(g, c.x, c.y, ISO_W * 0.9, ISO_H * 0.9, 0x29adff);
      }
    }
  }

  drawRoad() {
    const g = this.add.graphics().setDepth(-800);
    this.roadMarkers = [];
    TILES.forEach((t, i) => {
      const { x, y } = this.tileCenter(i);
      const special = FULL_TILE_TYPES.includes(t.type);
      // 路面：有 AI 柏油路就用，沒有就畫灰色菱形
      if (this.textures.exists('bld_road_tile')) {
        this.add.image(x, y, 'bld_road_tile').setDepth(-801);
        this.diamondLine(g, x, y, ISO_W, ISO_H, 2, 0x2a2a30, 0.5);
      } else {
        this.diamond(g, x, y + 4, ISO_W, ISO_H, 0x3b3b44);
        this.diamond(g, x, y, ISO_W, ISO_H, special ? 0xb8a98a : 0x5a5a66);
        this.diamondLine(g, x, y, ISO_W, ISO_H, 2, 0x2a2a30);
      }
      // 地標、里長格：路上的小色塊（還沒人買是灰色，買下後換成地主的顏色，在 refreshTile 畫）
      if (t.type === 'property' || t.type === 'chief') {
        this.roadMarkers[i] = this.add.graphics().setDepth(-799);
        return;
      }
      // 其他格子：在路上放圖示
      let ic;
      if (this.textures.exists(`bld_${t.icon}`) && special) {
        // 起點、塞車、捷運、拖吊、政壇人物：AI 圖底下有一塊地面，直接蓋在這格上
        ic = this.add.image(x, y + ISO_H / 2 + 2, `bld_${t.icon}`).setOrigin(0.5, 1);
        ic.setScale((ISO_W + 4) / ic.width);
      } else if (this.textures.exists(`bld_${t.icon}`)) {
        // 機會/命運：浮在路上的小東西
        ic = addIcon(this, x, y + 8, t.icon, 64).setOrigin(0.5, 1);
        this.tweens.add({ targets: ic, y: y + 2, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      } else {
        ic = this.add.image(x, y + 6, this.textures.exists(t.icon) ? t.icon : 'chance').setOrigin(0.5, 1).setScale(3);
      }
      ic.setDepth(y - 10);
    });
  }

  drawLots() {
    this.lotOverlays = [];
    const g = this.add.graphics().setDepth(-700);
    TILES.forEach((t, i) => {
      if (t.type !== 'property' && t.type !== 'chief') return;
      const cell = this.lotCell(i);
      if (!cell) return;
      const { x, y } = this.iso(cell.col, cell.row);
      // 空地：人行磚（有 AI 地磚就用）
      if (this.textures.exists('bld_plaza_tile')) {
        this.add.image(x, y, 'bld_plaza_tile').setDepth(-701).setScale((ISO_W - 8) / ISO_W);
      } else {
        this.diamond(g, x, y, ISO_W - 8, ISO_H - 4, 0xd9cbb0);
      }
      this.diamondLine(g, x, y, ISO_W - 8, ISO_H - 4, 3, UNOWNED_COLOR);

      // 建築：有 AI 畫的圖就用，沒有就用像素小圖。里長辦公處比地標小一點
      let bld;
      const wid = t.type === 'chief' ? ISO_W - 34 : ISO_W - 6;
      if (this.textures.exists(`bld_${t.icon}`)) {
        bld = this.add.image(x, y + ISO_H / 2 - 2 - (t.type === 'chief' ? 10 : 0), `bld_${t.icon}`).setOrigin(0.5, 1);
        bld.setScale(wid / bld.width);
      } else {
        bld = this.add.image(x, y + 14, this.textures.exists(t.icon) ? t.icon : 'station').setOrigin(0.5, 1).setScale(t.icon === 'taipei101' ? 7 : 5);
      }
      bld.setDepth(y + 20);

      // 地圖上不顯示名字（角色踩到哪一格，畫面上方會顯示那一格的名字）
      if (SHOW_BUILDING_NAMES) {
        this.add.text(x, y + 22, t.name, {
          fontFamily: FONT, fontSize: '18px', color: '#ffffff', backgroundColor: '#1d2b53', padding: { x: 6, y: 2 },
        }).setOrigin(0.5, 0).setDepth(y + 300);
      }

      // 地主標記放這層（之後重畫）
      this.lotOverlays[i] = this.add.container(x, y).setDepth(y + 25);

      // 點建築看資訊（拖曳地圖時不算）
      bld.setInteractive();
      bld.on('pointerup', (p) => {
        if (p.getDistance() < 12) this.showTileInfo(i);
      });
    });
  }

  drawTrees() {
    const { land, inside, taken, key } = this.board;
    const rnd = new Phaser.Math.RandomDataGenerator(['trees']);
    for (const k of land) {
      if (taken.has(k)) continue;
      const [col, row] = k.split(',').map(Number);
      // 斜 45 度的畫面裡，樹會擋住「在它後面（左上方）」的東西。
      // 後面緊鄰的是路、建築或公園的話就不種樹，免得擋住
      if (taken.has(key(col - 1, row)) || taken.has(key(col, row - 1)) || taken.has(key(col - 1, row - 1))) continue;
      if (rnd.frac() > (inside.has(k) ? 0.55 : 0.75)) continue;
      const n = rnd.between(1, 2);
      for (let m = 0; m < n; m++) {
        const { x, y } = this.iso(col, row);
        this.drawTree(x + rnd.between(-26, 26), y + rnd.between(-8, 8), rnd);
      }
    }
  }

  drawTree(x, y, rnd) {
    const kinds = [['tree1', 58, 6], ['tree2', 88, 2], ['tree3', 32, 4]] // [圖, 高度, 出現機率]
      .filter(([k]) => this.textures.exists(`bld_${k}`));
    if (kinds.length) {
      const total = kinds.reduce((n, k) => n + k[2], 0);
      let pick = rnd.frac() * total;
      const [key, h] = kinds.find((k) => (pick -= k[2]) < 0) || kinds[0];
      const t = addIcon(this, x, y + 4, key, h * rnd.realInRange(0.85, 1.1)).setOrigin(0.5, 1).setDepth(y);
      if (rnd.frac() < 0.5) t.setFlipX(true);
      return;
    }
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
    // 路上的小色塊
    const mk = this.roadMarkers && this.roadMarkers[i];
    if (mk) {
      const { x, y } = this.tileCenter(i);
      mk.clear();
      this.diamond(mk, x, y, 34, 17, st.owner === null ? UNOWNED_COLOR : hex(this.players[st.owner].color));
      this.diamondLine(mk, x, y, 34, 17, 2, 0x000000);
    }
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
    // 鏡頭可以移動的範圍：整塊陸地再往外留一些
    const pts = [...this.board.land].map((k) => { const [c, r] = k.split(',').map(Number); return this.iso(c, r); });
    // 留寬一點，縮小畫面時鏡頭也能把邊緣的角色移到正中間（外面都是河水）
    const minX = Math.min(...pts.map((q) => q.x)) - 900;
    const maxX = Math.max(...pts.map((q) => q.x)) + 900;
    const minY = Math.min(...pts.map((q) => q.y)) - 900;
    const maxY = Math.max(...pts.map((q) => q.y)) + 900;
    cam.setBounds(minX, minY, maxX - minX, maxY - minY);
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
    // 角色在螢幕上的位置 = 畫面中心 + 偏移 × 放大倍率，所以偏移要除以放大倍率
    return { x: cx / z, y: cy / z };
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
    this.hud.say('選戰開始！\n投票日支持者最多的人當選！');
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
    this.hud.showTile(p.pos, p);

    // 【A】每回合開始，自己的地標和里長會帶來支持者
    const income = this.fansIncomeOf(p);
    let incomeMsg = '';
    if (income > 0) {
      this.changeFans(p, income);
      incomeMsg = `\n地盤帶來支持者 +${income}`;
    }

    if (p.skip > 0) {
      p.skip--;
      this.hud.say(`${p.name} 還卡在車陣裡…\n這回合暫停一次${incomeMsg}`);
      Sfx.bad();
      this.hud.refreshPanels();
      await this.hud.choose([{ label: '好吧', value: 1 }], p, 1);
      return;
    }

    this.hud.say(p.human ? `輪到 ${p.name}！按「擲骰子」出發${incomeMsg}` : `輪到 ${p.name}（電腦）…${incomeMsg}`);
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
      this.hud.showTile(p.pos, p);
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
  // 過路費（錢）
  rentOf(i) {
    const t = TILES[i];
    const st = this.tileState[i];
    if (t.type === 'chief') return Math.round(t.price * GAME_RULES.chiefRentRate);
    let base = Math.round(t.price / 10);
    if (st.level === 0 && this.ownsDistrict(st.owner, t.district)) base *= 2;
    return base * GAME_RULES.rentMultiplier[st.level];
  }

  // 【B】對手踩到時，倒戈過來的支持者
  stealOf(i) {
    const t = TILES[i];
    const st = this.tileState[i];
    if (t.type === 'chief') return GAME_RULES.chiefSteal;
    return Math.round(t.price * GAME_RULES.landmarkStealRate * (st.level + 1));
  }

  // 【A】這格每回合帶給地主的支持者
  fansPerTurnOf(i) {
    const t = TILES[i];
    const st = this.tileState[i];
    if (t.type === 'chief') return GAME_RULES.chiefFansPerTurn;
    return Math.round(t.price * GAME_RULES.landmarkFansRate * (st.level + 1));
  }

  fansIncomeOf(p) {
    return this.tileState.reduce((n, s, i) => n + (s.owner === p.id ? this.fansPerTurnOf(i) : 0), 0);
  }

  upgradeCost(i) { return Math.round(TILES[i].price / 2); }

  // 是否拿下整個行政區（這區的地標和里長全部都買下）
  ownsDistrict(owner, district) {
    return TILES.every((t, i) => t.district !== district || this.tileState[i].owner === owner);
  }

  assetsOf(p) {
    let total = p.money;
    this.tileState.forEach((s, i) => {
      if (s.owner === p.id) total += TILES[i].price + s.level * this.upgradeCost(i);
    });
    return total;
  }

  // 支持者增減：畫面上飄出藍色的「+300 支持」
  changeFans(p, amount, silent = false) {
    const before = p.fans;
    p.fans = Math.max(0, p.fans + amount);
    const diff = p.fans - before;
    if (diff !== 0) {
      const { x, y } = this.tokenPos(p);
      this.floatText(x, y - 120, `${diff >= 0 ? '+' : '-'}${Math.abs(diff)} 支持`, diff >= 0 ? '#29adff' : '#ff77a8');
      if (!silent) { if (diff >= 0) Sfx.tune([784, 988, 1175], 0.06); else Sfx.tune([392, 330], 0.1); }
    }
    this.hud.refreshPanels();
    return diff;
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
      case 'chief':
        if (st.owner === null) await this.offerBuy(p, i);
        else if (st.owner === p.id) {
          this.hud.say(`${t.name} 是自己人，\n里民服務做得好，口碑不錯！`);
          await this.wait(1000);
        } else await this.payRent(p, i);
        break;
      case 'talent':
        // 戰將功能做好前的暫時效果
        this.hud.say(`${p.name} 遇到政壇前輩，\n傳授選戰心法！`);
        await this.wait(500);
        this.changeFans(p, GAME_RULES.talentFans);
        await this.wait(900);
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
    const what = t.type === 'chief' ? `拉攏 ${t.name}` : `買下 ${t.name}`;
    this.hud.say(`${t.name} 還沒有人插旗！\n要花 $${t.price} ${what} 嗎？${canBuy ? '' : '\n（錢不夠…）'}`);
    const autoBuy = canBuy && p.money - t.price >= 200;
    const ans = await this.hud.choose([
      { label: `${t.type === 'chief' ? '拉攏' : '買下'} $${t.price}`, value: true, fill: 0x00e436, disabled: !canBuy },
      { label: '不買', value: false, fill: 0xc2c3c7 },
    ], p, autoBuy);
    if (ans) {
      p.money -= t.price;
      this.tileState[i].owner = p.id;
      this.refreshTile(i);
      this.hud.showTile(i, p);
      Sfx.buy();
      this.flashTile(i);
      const gain = this.changeFans(p, t.type === 'chief' ? GAME_RULES.chiefBuyFans : Math.round(t.price * GAME_RULES.buyFansRate), true);
      this.hud.say(t.type === 'chief'
        ? `${p.name} 拉攏了 ${t.name}！\n支持者 +${gain}，之後每回合 +${this.fansPerTurnOf(i)}`
        : `${p.name} 買下了 ${t.name}！\n支持者 +${gain}，過路費 $${this.rentOf(i)}`);
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
      const gain = this.changeFans(p, Math.round(t.price * GAME_RULES.buildFansRate), true);
      this.hud.say(`${t.name} 蓋好第 ${st.level} 層競選總部！\n支持者 +${gain}，過路費變成 $${this.rentOf(i)}`);
      this.hud.refreshPanels();
      await this.wait(1100);
    }
  }

  async payRent(p, i) {
    const owner = this.players[this.tileState[i].owner];
    const rent = this.rentOf(i);
    const steal = this.stealOf(i);
    this.hud.say(`${TILES[i].name} 是 ${owner.name} 的地盤！\n付過路費 $${rent}，支持者有 ${steal} 人倒戈`);
    await this.wait(600);
    await this.pay(p, rent, owner);
    if (!p.bankrupt) {
      const lost = -this.changeFans(p, -steal, true);
      this.changeFans(owner, lost);
    }
    await this.wait(900);
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
    if (card.fans) {
      this.changeFans(p, card.fans);
      await this.wait(500);
    }
    if (card.fansFromEach) {
      for (const o of this.players) {
        if (o.id === p.id || o.bankrupt) continue;
        const lost = -this.changeFans(o, -card.fansFromEach, true);
        this.changeFans(p, lost);
        await this.wait(300);
      }
    }
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
      const jamAt = TILES.findIndex((t) => t.type === 'jam');
      const steps = (jamAt - p.pos + TILES.length) % TILES.length;
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
      // 往前走到「下一個」這種格子
      let target = p.pos;
      for (let k = 1; k <= TILES.length; k++) {
        const j = (p.pos + k) % TILES.length;
        if (TILES[j].type === card.goto) { target = j; break; }
      }
      await this.goTo(p, target);
      await this.resolveTile(p);
    }
  }

  // ---------- 點建築看資訊 ----------
  showTileInfo(i) {
    const t = TILES[i];
    const st = this.tileState[i];
    const owner = st.owner === null ? '還沒有人買' : `地主：${this.players[st.owner].name}`;
    const rent = this.rentOf(i);
    if (t.type === 'chief') {
      this.hud.say(`【${t.name}】價格 $${t.price}\n${owner}\n每回合支持者 +${this.fansPerTurnOf(i)}，過路費 $${rent}`);
      return;
    }
    this.hud.say(`【${t.name}】${t.district}・價格 $${t.price}\n${owner}・總部 ${st.level} 層\n每回合支持者 +${this.fansPerTurnOf(i)}，過路費 $${rent}`);
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
