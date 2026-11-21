// =====================================================================
// 遊戲畫面：斜 45 度（等角）的台北街道地圖 + 遊戲規則
// 畫面上的按鈕、訊息、玩家資訊在 hud.js（另一層，不會跟著地圖捲動）
// =====================================================================

const ISO_W = 128;          // 一格菱形的寬
const ISO_H = 64;           // 一格菱形的高
const ORIGIN_X = 900;       // 地圖畫在世界座標的哪裡
const ORIGIN_Y = 150;
// 這些格子的 AI 圖本身就是一整塊地面，直接蓋在路上
const FULL_TILE_TYPES = ['go', 'jam', 'mrt', 'tow', 'talent', 'quiz'];
// 角色彈跳的高度（原本是 28 和 12，降低 40%）
const CAM_SMOOTH_MS = 70;   // 鏡頭追上角色的速度（毫秒，越小追越快）
const STEP_MS = 200;        // 角色走一格花多久（毫秒）
const HOP_WALK = 17;        // 走路每一步跳多高
const HOP_IDLE = 7;         // 輪到自己時原地跳多高
const LAND_MARGIN = 1;      // 路線外面留幾格陸地（越小，海岸線越貼著路線，地圖形狀越明顯）
const UNOWNED_COLOR = 0x9a9aa6;  // 還沒人買的地：灰色
const SHOW_BUILDING_NAMES = false; // 要不要在建築下面顯示名字
// 每一區的草地染一點不同的顏色（參考台北市行政區圖），一眼看得出哪幾格是同一區
const DISTRICT_TINTS = {
  中正區: 0x8dc63f, 萬華區: 0x3f7a1a, 大同區: 0xf7941d, 中山區: 0xf7cc1d, 士林區: 0xf5be91, 北投區: 0xed9471,
  內湖區: 0xc5ff49, 松山區: 0xfff949, 南港區: 0x004a80, 信義區: 0x7da7d8, 文山區: 0x002157, 大安區: 0xacd373,
};

class GameScene extends Phaser.Scene {
  constructor() { super('game'); }

  init(data) {
    this.playerCount = data.playerCount || 4;
    this.mode = data.mode || 'cpu';
    // 首頁選的回合數、要不要加入英文挑戰格、測驗程度
    if (data.rounds) GAME_RULES.maxRounds = data.rounds;
    this.quizOn = !!data.quiz;
    this.quizLevel = data.quizLevel || 'junior';
    applyTileOptions({ quiz: this.quizOn });
    try { const d = Number(localStorage.getItem('tm_dice')); if (d === 1 || d === 2) GAME_RULES.dice = d; } catch (e) { /* 沒有就用預設 */ }
    QuizDeck.reset();
    this.round = 1;
    this.current = 0;
    this.gameOver = false;
    this.tileState = TILES.map(() => ({ owner: null, level: 0, since: 0, bonus: 0, favor: [0, 0, 0, 0], landmark: null }));
    this.generals = new GeneralSystem(this);
    this.players = [];
    for (let i = 0; i < this.playerCount; i++) {
      this.players.push({
        id: i,
        ...CHARACTERS[i],
        money: GAME_RULES.startMoney,
        fans: GAME_RULES.startFans,
        pos: i * GAME_RULES.startSpread, // 起點錯開，先擲骰的人才不會太有利
        dir: 1,         // 行走方向：1 = 照路線順序，-1 = 反方向（搭捷運後會隨機換）
        darkAt: -99,    // 上次「神秘的金援」是第幾回合
        sponsorAt: -99, // 上次「企業贊助」是第幾回合
        skip: 0,
        bankrupt: false,
        rallies: 0,     // 辦過幾次造勢晚會
        debated: false, // 發起過辯論挑戰了沒
        human: this.mode === 'hotseat' || i === 0,
      });
    }
    this.chanceDeck = [];
    this.fateDeck = [];
    this.history = []; // 民調紀錄：[{ round, who, fans: [每位玩家的支持者] }]，結算畫面的趨勢報告用
  }

  recordPoll(who = null) {
    this.history.push({ round: this.round, who, fans: this.players.map((p) => (p.bankrupt ? 0 : p.fans)) });
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
    this.stationIcons = [];
    this.drawTrees();
    this.bakeStatic();
    this.createTokens();
    this.setupCamera();

    this.events.once('shutdown', () => {
      this.gameOver = true;
      this.scene.stop('hud');
    });

    // 啟動上層的 HUD，等它準備好再開始遊戲
    this.scene.launch('hud', { game: this });
    this.hud = this.scene.get('hud');
    this.hud.events.once('create', () => {
      // 機會／命運、戰將的成果：訊息跳出畫面中央的事件框
      const boxed = (obj, fn) => {
        const orig = obj[fn].bind(obj);
        obj[fn] = async (...a) => { this.hud.boxOn++; try { return await orig(...a); } finally { this.hud.boxOn--; } };
      };
      boxed(this, 'applyCard');
      ['finishMission', 'finishWoo', 'stakeBattle', 'debate', 'scandal', 'loyaltyAll', 'onRecruit'].forEach((fn) => boxed(this.generals, fn));
      // 卡片叫你移動後，走到的格子是一般訊息
      const rt = this.resolveTile.bind(this);
      this.resolveTile = async (...a) => { const s = this.hud.boxOn; this.hud.boxOn = 0; try { return await rt(...a); } finally { this.hud.boxOn = s; } };
      this.runGame();
    });
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

    // 2. 陸地：照 data.js 的 MAP_LAND（真實台北市的形狀）
    const land = new Set();
    MAP_LAND.forEach((line, r) => [...line].forEach((ch, c) => { if (ch !== '.') land.add(key(c, r)); }));
    path.forEach((p) => land.add(key(p.col, p.row)));
    const cs = [...land].map((k) => Number(k.split(',')[0]));
    const rs = [...land].map((k) => Number(k.split(',')[1]));
    const minC = Math.min(...cs) - 2;
    const maxC = Math.max(...cs) + 2;
    const minR = Math.min(...rs) - 2;
    const maxR = Math.max(...rs) + 2;

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
    const inside = new Set([...land].filter((k) => !outside.has(k) && !onPath.has(k)));

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

    // 6. 每一格陸地屬於哪一區：離它最近的路線格子是哪一區（特殊格算前一格的區）
    const tileDistrict = [];
    let last = TILES.find((t) => t.district).district;
    for (let k = 0; k < TILES.length; k++) { if (TILES[k].district) last = TILES[k].district; tileDistrict[k] = last; }
    const district = new Map();
    let frontier = path.map((p, k) => [p.col, p.row, tileDistrict[k]]);
    frontier.forEach(([c, r, d]) => district.set(key(c, r), d));
    while (frontier.length) {
      const next = [];
      for (const [c, r, d] of frontier) {
        for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const k = key(c + dc, r + dr);
          if (!land.has(k) || district.has(k)) continue;
          district.set(k, d);
          next.push([c + dc, r + dr, d]);
        }
      }
      frontier = next;
    }

    this.board = { path, land, inside, lots, park, taken, minC, maxC, minR, maxR, key, district };
  }

  // 把收集到的「不會動的地面」畫進一張大圖，然後刪掉原本的一百多個小物件
  bakeStatic() {
    const list = this.staticParts || [];
    if (!list.length) return;
    const pts = [...this.board.land].map((k) => { const [c, r] = k.split(',').map(Number); return this.iso(c, r); });
    const x0 = Math.floor(Math.min(...pts.map((q) => q.x)) - ISO_W);
    const y0 = Math.floor(Math.min(...pts.map((q) => q.y)) - ISO_H);
    const w = Math.ceil(Math.max(...pts.map((q) => q.x)) + ISO_W - x0);
    const h = Math.ceil(Math.max(...pts.map((q) => q.y)) + ISO_H + 60 - y0);
    // 照原本的前後順序畫；切成 2048 大小的幾塊（有些手機一張圖太大會畫不出來）
    list.sort((a, b) => a.depth - b.depth);
    const CH = 2048;
    for (let bx = 0; bx < w; bx += CH) {
      for (let by = 0; by < h; by += CH) {
        const cw = Math.min(CH, w - bx);
        const chh = Math.min(CH, h - by);
        const rt = this.add.renderTexture(x0 + bx, y0 + by, cw, chh).setOrigin(0).setDepth(-900);
        for (const o of list) rt.draw(o, -x0 - bx, -y0 - by);
        rt.render();
      }
    }
    for (const o of list) o.destroy();
    this.staticParts = [];
  }

  // 記下一個「不會動的地面」物件，等一下合成進大圖
  keepStatic(o) {
    (this.staticParts = this.staticParts || []).push(o);
    return o;
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
      const water = this.add.tileSprite(-2600, -1800, 8000, 6000, 'bld_water').setOrigin(0).setDepth(-1000);
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
    const g = this.keepStatic(this.add.graphics().setDepth(-900));
    const sides = this.keepStatic(this.add.graphics().setDepth(-950));
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
        this.keepStatic(this.add.image(x, y, 'bld_grass_tile').setDepth(-899));
        continue;
      }
      this.diamond(g, x, y, ISO_W, ISO_H, (col + row) % 2 === 0 ? 0x5fb34a : 0x56a843);
      for (let n = 0; n < 6; n++) {
        g.fillStyle(rnd.frac() < 0.5 ? 0x7bc85f : 0x479135, 1);
        g.fillRect(x + rnd.between(-36, 32), y + rnd.between(-12, 10), 4, 4);
      }
    }
    // 各區草地蓋一層淡淡的顏色
    const tintG = this.keepStatic(this.add.graphics().setDepth(-860));
    for (const k of land) {
      const [col, row] = k.split(',').map(Number);
      const c = DISTRICT_TINTS[this.board.district.get(k)];
      if (c === undefined) continue;
      const { x, y } = this.iso(col, row);
      this.diamond(tintG, x, y, ISO_W + 1, ISO_H + 1, c, 0.45);
    }
    // 區界線：旁邊是別的區，就在那條邊畫一條白線
    const border = this.keepStatic(this.add.graphics().setDepth(-850));
    border.lineStyle(4, 0xffffff, 0.55);
    for (const k of land) {
      const [col, row] = k.split(',').map(Number);
      const d = this.board.district.get(k);
      const { x, y } = this.iso(col, row);
      const T = { x, y: y - ISO_H / 2 };
      if (land.has(key(col - 1, row)) && this.board.district.get(key(col - 1, row)) !== d) border.lineBetween(x - ISO_W / 2, y, T.x, T.y);
      if (land.has(key(col, row - 1)) && this.board.district.get(key(col, row - 1)) !== d) border.lineBetween(T.x, T.y, x + ISO_W / 2, y);
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
    const g = this.keepStatic(this.add.graphics().setDepth(-800));
    this.roadMarkers = [];
    TILES.forEach((t, i) => {
      const { x, y } = this.tileCenter(i);
      const special = FULL_TILE_TYPES.includes(t.type);
      // 路面：有 AI 柏油路就用，沒有就畫灰色菱形
      if (this.textures.exists('bld_road_tile')) {
        this.keepStatic(this.add.image(x, y, 'bld_road_tile').setDepth(-801));
        this.addNameZone(this.add.zone(x, y, ISO_W - 10, ISO_H - 6).setDepth(-790), i);
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
    this.lotRings = [];
    this.lotBuildings = [];
    const g = this.keepStatic(this.add.graphics().setDepth(-700));
    TILES.forEach((t, i) => {
      if (t.type !== 'property' && t.type !== 'chief') return;
      const cell = this.lotCell(i);
      if (!cell) return;
      const { x, y } = this.iso(cell.col, cell.row);
      // 空地：人行磚（有 AI 地磚就用）
      if (this.textures.exists('bld_plaza_tile')) {
        this.keepStatic(this.add.image(x, y, 'bld_plaza_tile').setDepth(-701).setScale((ISO_W - 8) / ISO_W));
      } else {
        this.diamond(g, x, y, ISO_W - 8, ISO_H - 4, 0xd9cbb0);
      }
      this.diamondLine(g, x, y, ISO_W - 8, ISO_H - 4, 3, UNOWNED_COLOR);

      // 建築：里長辦公處固定；空地上的建築看蓋到哪個階段（refreshTile 換圖）
      const bld = this.add.image(x, y + ISO_H / 2 - 2 - (t.type === 'chief' ? 10 : 0), 'bld_chief').setOrigin(0.5, 1).setDepth(y + 20);
      if (t.type === 'chief') bld.setScale((ISO_W - 34) / bld.width);
      this.lotBuildings[i] = bld;
      const hit = this.add.zone(x, y - 20, ISO_W - 20, ISO_H + 40).setDepth(y + 19);

      // 地圖上不顯示名字（角色踩到哪一格，畫面上方會顯示那一格的名字）
      if (SHOW_BUILDING_NAMES) {
        this.add.text(x, y + 22, t.name, {
          fontFamily: FONT, fontSize: '18px', color: '#ffffff', backgroundColor: '#1d2b53', padding: { x: 6, y: 2 },
        }).setOrigin(0.5, 0).setDepth(y + 300);
      }

      // 地主標記放這層（之後重畫）
      this.lotOverlays[i] = this.add.container(x, y).setDepth(y + 25);
      this.lotRings[i] = this.add.container(x, y).setDepth(-600); // 地主的顏色框（在建築下面）

      // 點建築看資訊（拖曳地圖時不算）
      hit.setInteractive();
      this.addNameZone(hit, i);
      hit.on('pointerup', (p) => {
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
      if (rnd.frac() > (inside.has(k) ? 0.5 : 0.45)) continue;
      // 附近兩格內都沒有路和建築的樹，畫進大圖（不會擋到角色）
      let far = true;
      for (let dc = -2; dc <= 2 && far; dc++) for (let dr = -2; dr <= 2; dr++) if (taken.has(key(col + dc, row + dr))) { far = false; break; }
      this.treeStatic = far;
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
      if (this.treeStatic) this.keepStatic(t);
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

  // 空地上的建築：空地沒有房子 → 工地 → 小建築 → 地標
  refreshBuilding(i) {
    const bld = this.lotBuildings && this.lotBuildings[i];
    if (!bld || TILES[i].type !== 'property') return;
    const st = this.tileState[i];
    const key = st.level === 0 ? null : st.level === 1 ? 'site' : st.level === 2 ? 'office' : st.landmark;
    if (!key || !this.textures.exists(`bld_${key}`)) { bld.setVisible(false); return; }
    bld.setTexture(`bld_${key}`).setVisible(true);
    bld.setScale((st.level === 3 ? ISO_W - 6 : ISO_W - 22) / bld.width);
  }

  refreshTile(i) {
    this.refreshBuilding(i);
    const ov = this.lotOverlays[i];
    if (!ov) return;
    ov.removeAll(true);
    const ring = this.lotRings[i];
    if (ring) ring.removeAll(true);
    const st = this.tileState[i];
    // 路上的小色塊
    const mk = this.roadMarkers && this.roadMarkers[i];
    if (mk) {
      const { x, y } = this.tileCenter(i);
      mk.clear();
      this.diamond(mk, x, y, 34, 17, st.owner === null ? UNOWNED_COLOR : hex(this.players[st.owner].color));
      this.diamondLine(mk, x, y, 34, 17, 2, 0x000000);
    }
    if (st.owner === null) {
      if (TILES[i].type === 'chief') {
        st.favor.forEach((f, pid) => {
          if (!f || !this.players[pid]) return;
          const g = this.add.graphics();
          for (let k = 0; k < f; k++) {
            g.fillStyle(0x000000, 1);
            g.fillCircle(-36 + pid * 22, 14 - k * 14, 8);
            g.fillStyle(hex(this.players[pid].color), 1);
            g.fillCircle(-36 + pid * 22, 14 - k * 14, 6);
          }
          ov.add(g);
        });
      }
      return;
    }
    const color = hex(this.players[st.owner].color);
    const g = this.add.graphics();
    this.diamond(g, 0, 0, ISO_W - 8, ISO_H - 4, color, 0.28);
    this.diamondLine(g, 0, 0, ISO_W - 8, ISO_H - 4, 6, color);
    (ring || ov).add(g);
    // 地主的競選旗（每蓋一層多一支）
    const makeFlag = (fx, fy, h) => {
      if (this.textures.exists('bld_flag')) return addIcon(this, fx, fy, 'flag', h).setOrigin(0.5, 1).setTint(color);
      return this.add.image(fx, fy, `flag${st.owner}`).setOrigin(0.15, 0.8).setScale(h / 16);
    };
    ov.add(makeFlag(-44, 8, st.level === 0 || TILES[i].type === 'chief' ? 44 : 32));
  }

  // 行政區看板：每一區的第一格旁邊立一塊牌子，看得出哪幾格是同一區
  drawDistrictSigns() {
    TILES.forEach((t, i) => {
      if (!t.district || TILES.findIndex((x) => x.district === t.district) !== i) return;
      const n = TILES.filter((x) => x.district === t.district).length;
      const cell = this.lotCell(i);
      const { x, y } = this.iso(cell.col, cell.row);
      const c = this.add.container(x - 46, y - 18).setDepth(-550).setAlpha(0.9);
      const txt = this.add.text(0, -30, `${t.district}${n > 1 ? ` ${n}格` : ''}`, {
        fontFamily: FONT, fontSize: '17px', color: '#ffffff', backgroundColor: '#1d2b53', padding: { x: 5, y: 2 },
      }).setOrigin(0.5, 1);
      const g = this.add.graphics();
      g.fillStyle(0x5f574f, 1);
      g.fillRect(-2, -30, 4, 30);
      c.add([g, txt]);
    });
  }

  // 格子名稱：電腦滑鼠移過去、手機手指點一下，格子上方會出現名字
  addNameZone(zone, i) {
    zone.setInteractive();
    zone.on('pointerover', (p) => { if (!p.wasTouch) this.showNameTag(i); });
    zone.on('pointerout', (p) => { if (!p.wasTouch) this.hideNameTag(i); });
    zone.on('pointerup', (p) => { if (p.getDistance() < 12) this.showNameTag(i, 2500); });
  }

  showNameTag(i, autoHide = 0) {
    if (!this.nameTag) {
      this.nameTag = this.add.text(0, 0, '', {
        fontFamily: FONT, fontSize: '22px', color: '#ffffff', backgroundColor: '#1d2b53', padding: { x: 8, y: 4 },
        stroke: '#000000', strokeThickness: 2,
      }).setOrigin(0.5, 1).setDepth(7000);
    }
    const t = TILES[i];
    const cell = (t.type === 'property' || t.type === 'chief') && this.lotCell(i) ? this.lotCell(i) : this.ringCell(i);
    const { x, y } = this.iso(cell.col, cell.row);
    this.nameTag.setText(`${this.tileName(i)}${t.district && !this.tileName(i).startsWith(t.district) ? `・${t.district}` : ''}`)
      .setPosition(x, y - 46).setScale(1 / Math.max(this.cameras.main.zoom, 0.8)).setVisible(true);
    this.nameTagFor = i;
    if (this.nameTagTimer) this.nameTagTimer.remove();
    this.nameTagTimer = autoHide ? this.time.delayedCall(autoHide, () => this.hideNameTag(i)) : null;
  }

  hideNameTag(i) {
    if (this.nameTag && this.nameTagFor === i) this.nameTag.setVisible(false);
  }

  // 駐守中的戰將：站在里長辦公處旁邊，腳下有陣營顏色的圈
  refreshStations() {
    (this.stationIcons || []).forEach((o) => o.destroy());
    this.stationIcons = [];
    for (const g of this.generals.list) {
      if (g.stationedAt === null) continue;
      const cell = this.lotCell(g.stationedAt);
      const { x, y } = this.iso(cell.col, cell.row);
      // 駐守徽章：玩家顏色的小框＋戰將大頭照＋「駐守」字樣（不是玩家角色）
      const c = this.add.container(x + 40, y - 18).setDepth(y + 40);
      c.add(this.add.rectangle(0, 0, 46, 46, hex(this.players[g.owner].color)).setStrokeStyle(3, 0x000000));
      if (this.textures.exists(`genimg${g.id}`)) {
        const im = this.add.image(0, 0, `genimg${g.id}`).setOrigin(0, 0);
        const side = Math.round(im.width * 0.8);
        const cx = Math.round(im.width * 0.1);
        const s = 38 / side;
        im.setCrop(cx, 0, side, side).setScale(s).setPosition(-19 - cx * s, -19);
        c.add(im);
      }
      c.add(this.add.text(0, 25, '駐守', {
        fontFamily: FONT, fontSize: '15px', color: '#ffffff', backgroundColor: '#000000', padding: { x: 4, y: 1 },
      }).setOrigin(0.5, 0));
      this.stationIcons.push(c);
    }
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
    // 用瀏覽器自己的觸控數量確認是不是真的兩指
    this.touches = 0;
    const countTouches = (e) => { this.touches = e.touches ? e.touches.length : 0; };
    const evs = ['touchstart', 'touchend', 'touchcancel'];
    evs.forEach((ev) => window.addEventListener(ev, countTouches, { passive: true }));
    this.events.once('shutdown', () => evs.forEach((ev) => window.removeEventListener(ev, countTouches)));
    this.input.on('pointerdown', (p) => {
      this.dragStart = { x: p.x, y: p.y, sx: cam.scrollX, sy: cam.scrollY };
      this.dragging = false;
    });
    this.input.on('pointermove', (p) => {
      // 兩指縮放
      const p1 = this.input.pointer1;
      const p2 = this.input.pointer2;
      if (p1.isDown && p2.isDown && this.touches >= 2) {
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
      this.stopFollow();
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

  // 鏡頭跟著某位玩家的定位點（每一幀在 update() 裡追過去）
  followPlayer(p) {
    this.camTarget = this.anchors[p.id];
  }

  // 鏡頭移到某一格的空地（蓋房子時看得到）
  followTile(i) {
    const cell = this.lotCell(i);
    if (cell) this.camTarget = this.iso(cell.col, cell.row);
  }

  stopFollow() {
    this.camTarget = null;
  }

  // 每一幀：鏡頭往目標靠近。用「經過的時間」計算靠近多少，
  // 手機畫面比較卡（每秒幀數少）時，鏡頭也一樣準時跟上，不會慢半拍
  update(time, delta) {
    if (!this.camTarget) return;
    const cam = this.cameras.main;
    const o = this.followOffset();
    const tx = this.camTarget.x - o.x;
    const ty = this.camTarget.y - o.y;
    const mx = cam.scrollX + cam.width / 2;
    const my = cam.scrollY + cam.height / 2;
    const k = 1 - Math.exp(-Math.min(delta, 100) / CAM_SMOOTH_MS);
    cam.centerOn(mx + (tx - mx) * k, my + (ty - my) * k);
  }

  // 放大縮小（按鈕、兩指、滑鼠滾輪都用這個）
  setZoom(z) {
    const cam = this.cameras.main;
    cam.setZoom(Phaser.Math.Clamp(z, ZOOM.min, ZOOM.max));
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
    // 每個角色有一個看不見的「定位點」：只沿著路平滑移動、不會彈跳，鏡頭跟著它走
    this.anchors = this.players.map((p) => ({ ...this.tokenPos(p) }));
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
    this.recordPoll();
    while (!this.gameOver) {
      await this.playTurn(this.players[this.current]);
      this.recordPoll(this.current);
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
    if (p.human) this.hud.layoutDice();
    this.hud.refreshPanels();
    this.followPlayer(p);
    this.bounceToken(p);
    this.hud.showTile(p.pos, p);

    // 出任務的戰將回來
    await this.generals.onTurnStart(p);

    // 【A】每回合開始，自己的地標和里長會帶來支持者（還有整區加成）
    const income = this.fansIncomeOf(p);
    let incomeMsg = '';
    if (income > 0) {
      const got = this.changeFans(p, income);
      incomeMsg = `\n地盤支持者 +${got}${this.districtBonusOf(p) ? '（含整區）' : ''}`;
    }
    // 地標租金、里長經營費
    const hubs = TILES.filter((t, i) => this.tileState[i].owner === p.id && this.effectOf(i) === 'hub').length;
    if (hubs) { this.changeMoney(p, 50 * hubs); incomeMsg += `\n交通樞紐 +$${50 * hubs}`; }
    incomeMsg += this.turnMoney(p);
    const up = await this.payUpkeep(p);
    incomeMsg = incomeMsg ? incomeMsg + up : up.replace(/^，/, '\n');
    if (p.bankrupt) return;

    if (p.skip > 0) {
      p.skip--;
      this.hud.say(`${p.name} 還卡在車陣裡…\n這回合暫停一次${incomeMsg}`);
      Sfx.bad();
      this.hud.refreshPanels();
      await this.hud.choose([{ label: '好吧', value: 1 }], p, 1);
      return;
    }

    this.showDirArrow(p);
    await this.preRoll(p, incomeMsg);
    this.hideDirArrow();
    if (p.bankrupt) return;
    this.followPlayer(p);
    if (p.human) this.hud.layoutDice();
    const n = p.human ? GAME_RULES.dice : this.cpuDiceCount(p);
    const roll = await this.hud.rollDice(n, !p.human);
    this.hud.say(p.human ? `${p.name} 擲出 ${roll} 點！` : `${p.name} 擲 ${n} 顆骰子，擲出 ${roll} 點！`);
    await this.walk(p, roll);
    await this.resolveTile(p);
    this.hud.refreshPanels();
  }

  // 回合開始的固定收入：政治獻金、選舉補助款、地標營收
  turnMoney(p) {
    const R = GAME_RULES;
    if (p.moneyRound === this.round) return '';
    p.moneyRound = this.round;
    let total = 0;
    let msg = '';
    const chiefs = this.generals.ownChiefs(p).length;
    if (this.round % R.donationEvery === 0 && chiefs) {
      const m = R.donationBase + R.donationPerChief * chiefs;
      total += m;
      msg += `\n政治獻金 +$${m}（${chiefs} 位里長）`;
    }
    if (this.round === this.subsidyRound()) {
      const m = R.subsidyBase + R.subsidyLevels.filter((v) => p.fans >= v).length * R.subsidyStep;
      total += m;
      msg += `\n選舉補助款 +$${m}`;
    }
    if (this.round % R.revenueEvery === 0) {
      let m = 0;
      this.tileState.forEach((s, i) => {
        if (s.owner === p.id && s.level >= R.maxLevel) m += (LANDMARK_EFFECTS[this.effectOf(i)] || {}).revenue || 0;
      });
      if (m) { total += m; msg += `\n地標營收 +$${m}`; }
    }
    if (total) this.changeMoney(p, total);
    return msg;
  }

  subsidyRound() { return Math.floor(GAME_RULES.maxRounds / 2) + 1; }

  // ---------- 行走方向 ----------
  stepTile(i, k) { const L = TILES.length; return (((i + k) % L) + L) % L; }

  // 順著自己的方向，走到 target 要幾步
  stepsTo(p, target) {
    const L = TILES.length;
    return p.dir === -1 ? (p.pos - target + L) % L : (target - p.pos + L) % L;
  }

  // 角色腳下的箭頭：接下來往哪邊走（擲骰子後就消失）
  showDirArrow(p, autoHide = 0) {
    if (p.bankrupt) return;
    if (!this.dirArrow) {
      const g = this.add.graphics();
      const pts = [[-26, -11], [4, -11], [4, -24], [32, 0], [4, 24], [4, 11], [-26, 11]].map(([x, y]) => new Phaser.Math.Vector2(x, y));
      g.fillStyle(0xffec27, 1).fillPoints(pts, true);
      g.lineStyle(5, 0x000000, 1).strokePoints(pts, true);
      this.dirArrow = this.add.container(0, 0, [g]).setDepth(6800).setVisible(false);
    }
    const a = this.tileCenter(p.pos);
    const b = this.tileCenter(this.stepTile(p.pos, p.dir));
    const ang = Math.atan2(b.y - a.y, b.x - a.x);
    const x = a.x + (b.x - a.x) * 0.62;
    const y = a.y + (b.y - a.y) * 0.62;
    this.tweens.killTweensOf(this.dirArrow);
    this.dirArrow.setPosition(x, y).setRotation(ang).setScale(1, 0.75).setAlpha(1).setVisible(true);
    // 往前一點一點的動，比較看得出方向
    this.tweens.add({ targets: this.dirArrow, x: x + Math.cos(ang) * 14, y: y + Math.sin(ang) * 14, duration: 420, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    if (this.dirArrowTimer) this.dirArrowTimer.remove();
    this.dirArrowTimer = autoHide ? this.time.delayedCall(autoHide, () => this.hideDirArrow()) : null;
  }

  hideDirArrow() {
    if (!this.dirArrow) return;
    this.tweens.killTweensOf(this.dirArrow);
    this.dirArrow.setVisible(false);
  }

  bounceToken(p) {
    const t = this.tokens[p.id];
    this.tweens.killTweensOf(t);
    const { x, y } = this.tokenPos(p);
    t.setPosition(x, y);
    Object.assign(this.anchors[p.id], { x, y });
    this.tweens.add({ targets: t, y: y - HOP_IDLE, duration: 160, yoyo: true, repeat: 2, ease: 'Stepped', easeParams: [2] });
  }

  // 一格一格跳（steps 正的 = 順著自己的方向走，負的 = 往回退）
  async walk(p, steps) {
    const along = steps >= 0;
    const dir = (along ? 1 : -1) * (p.dir || 1);
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
      // 一個動畫同時算：定位點沿著路平滑前進（鏡頭跟著它）、角色在上面做拋物線彈跳
      const anchor = this.anchors[p.id];
      const sx = t.x;
      const sy = t.y;
      const prog = { v: 0 };
      await this.tweenP({
        targets: prog, v: 1, duration: STEP_MS,
        onUpdate: () => {
          const v = prog.v;
          anchor.x = sx + (x - sx) * v;
          anchor.y = sy + (y - sy) * v;
          t.setPosition(anchor.x, anchor.y - Math.sin(v * Math.PI) * HOP_WALK);
        },
      });
      anchor.x = x;
      anchor.y = y;
      t.setPosition(x, y);
      t.setDepth(y + 30);
      if (along && p.pos === 0) {
        p.money += GAME_RULES.passGoBonus;
        this.floatText(x, y - 80, `+$${GAME_RULES.passGoBonus}`, '#ffec27');
        Sfx.coin();
        this.hud.refreshPanels();
      }
      // 經過（不是停在）自己的空地：可以付錢加蓋
      if (along && k < Math.abs(steps) - 1) await this.offerPassBuild(p, p.pos);
    }
  }

  async offerPassBuild(p, i) {
    const t = TILES[i];
    const st = this.tileState[i];
    if (t.type !== 'property' || st.owner !== p.id || st.level >= GAME_RULES.maxLevel || p.bankrupt) return;
    const cost = this.upgradeCost(i);
    if (p.money < cost) return;
    const next = BUILD_STAGES[st.level + 1];
    this.hud.say(`${p.name} 經過自己的${this.tileName(i)}，\n要花 $${cost} 蓋成「${next}」嗎？${st.level === 2 ? '完工會變成地標！' : ''}`);
    const ans = await this.hud.choose([
      { label: `蓋！ $${cost}`, value: true, fill: 0x00e436 },
      { label: '繼續走', value: false, fill: 0xc2c3c7 },
    ], p, p.money - cost >= 400);
    if (ans) await this.build(p, i);
    else this.followPlayer(p);
  }

  async goTo(p, target) {
    await this.walk(p, this.stepsTo(p, target));
  }

  // 搭捷運：直接到另一個捷運站，下車後隨機換方向
  async rideMrt(p, target) {
    const t = this.tokens[p.id];
    this.tweens.killTweensOf(t);
    Sfx.tune([659, 784, 988, 1319], 0.06);
    await this.tweenP({ targets: [t, t.shadow], alpha: 0, duration: 260 });
    p.pos = target;
    const { x, y } = this.tokenPos(p);
    t.setPosition(x, y).setDepth(y + 30);
    t.shadow.setPosition(x, y).setDepth(y + 29);
    Object.assign(this.anchors[p.id], { x, y });
    this.followPlayer(p);
    this.hud.showTile(p.pos, p);
    await this.wait(350);
    await this.tweenP({ targets: [t, t.shadow], alpha: 1, duration: 260 });
    p.dir = Math.random() < 0.5 ? 1 : -1;
  }

  // ---------- 地標 ----------
  landmarkOf(i) {
    const st = this.tileState[i];
    if (TILES[i].type !== 'property' || st.level < 3 || !st.landmark) return null;
    return LANDMARKS[TILES[i].district].find((l) => l.key === st.landmark) || null;
  }

  effectOf(i) { const l = this.landmarkOf(i); return l ? l.effect : null; }

  // 這位玩家在這一區有沒有某種效果的地標
  hasEffectIn(ownerId, district, effect) {
    return TILES.some((t, i) => t.district === district && this.tileState[i].owner === ownerId && this.effectOf(i) === effect);
  }

  tileName(i) {
    const t = TILES[i];
    if (t.type !== 'property') return t.name;
    const l = this.landmarkOf(i);
    if (l) return l.name;
    const st = this.tileState[i];
    return st.owner === null ? `${t.district}空地` : `${t.district}${BUILD_STAGES[st.level]}`;
  }

  // 蓋到第 3 階段：從這一區的地標裡隨機抽一個（地圖上已經有的不再抽）
  pickLandmark(i) {
    const pool = LANDMARKS[TILES[i].district];
    const used = new Set(this.tileState.map((s) => s.landmark).filter(Boolean));
    const free = pool.filter((l) => !used.has(l.key));
    return Phaser.Utils.Array.GetRandom(free.length ? free : pool).key;
  }

  // ---------- 錢 ----------
  // 過路費（錢）
  rentOf(i) {
    const t = TILES[i];
    const st = this.tileState[i];
    if (t.type === 'chief') return Math.round(t.price * GAME_RULES.chiefRentRate);
    let base = Math.round(t.price / 10);
    if (st.level === 0 && this.ownsDistrict(st.owner, t.district)) base *= 2;
    const mult = this.effectOf(i) === 'market' ? 1.5 : 1;
    return Math.round(base * GAME_RULES.rentMultiplier[st.level] * mult);
  }

  // 【B】對手踩到時，倒戈過來的支持者
  stealOf(i) {
    const t = TILES[i];
    const st = this.tileState[i];
    if (t.type === 'chief') return GAME_RULES.chiefSteal;
    return Math.round(t.price * GAME_RULES.landmarkStealRate * (st.level + 1) * (this.effectOf(i) === 'temple' ? 2 : 1));
  }

  // 【A】這格每回合帶給地主的支持者
  fansPerTurnOf(i) {
    const t = TILES[i];
    const st = this.tileState[i];
    if (t.type === 'chief') return GAME_RULES.chiefFansPerTurn;
    return Math.round(t.price * GAME_RULES.landmarkFansRate * (st.level + 1)) + (this.effectOf(i) === 'tourist' ? 50 : 0);
  }

  fansIncomeOf(p) {
    return this.tileState.reduce((n, s, i) => n + (s.owner === p.id ? this.fansPerTurnOf(i) : 0), 0) + this.districtBonusOf(p);
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
  // raw = true：不套用選前衝刺倍數（倒戈的另一半，數字已經算過了）
  changeFans(p, amount, silent = false, raw = false) {
    if (!raw) amount = Math.round(amount * this.fansMult());
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
    if (p.money < amount) await this.sellToCover(p, amount);
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

  // 錢不夠付：先把地盤半價賣回給銀行（便宜的先賣），還是不夠才破產
  async sellToCover(p, amount) {
    const value = (i) => Math.round((TILES[i].price + this.tileState[i].level * this.upgradeCost(i)) / 2);
    const mine = TILES.map((t, i) => i).filter((i) => this.tileState[i].owner === p.id).sort((a, b) => value(a) - value(b));
    const sold = [];
    for (const i of mine) {
      if (p.money >= amount) break;
      p.money += value(i);
      sold.push(TILES[i].name);
      this.loseTile(i);
    }
    if (!sold.length) return;
    this.hud.say(`${p.name} 錢不夠，\n半價變賣了 ${sold.join('、')}`);
    this.hud.refreshPanels();
    Sfx.bad();
    await this.wait(1300);
  }

  async goBankrupt(p) {
    p.bankrupt = true;
    p.money = 0;
    this.tileState.forEach((s, i) => {
      if (s.owner === p.id) this.loseTile(i);
      s.favor[p.id] = 0;
    });
    this.generals.release(p);
    this.tokens[p.id].setVisible(false);
    this.tokens[p.id].shadow.setVisible(false);
    Sfx.bad();
    this.hud.refreshPanels();
    this.hud.say(`${p.name} 選舉經費燒光了…\n宣布退出選戰！`);
    await this.wait(1800);
  }

  // 電腦：看前面 12 格，比較擲 1 顆和 2 顆，哪個比較不會踩到對手的地盤
  // 電腦：停在第 j 格大概是好事（正）還是壞事（負）
  cpuTileValue(p, j) {
    const t = TILES[j];
    const st = this.tileState[j];
    if (t.type === 'property' || t.type === 'chief') {
      if (st.owner === null) return p.money >= (t.price || 0) + 200 ? 60 : 0;
      if (st.owner === p.id) return t.type === 'property' && st.level < GAME_RULES.maxLevel ? 30 : 10;
      return -(this.rentOf(j) + this.stealOf(j));
    }
    return { chance: 40, fate: -30, tow: -GAME_RULES.towFine, jam: -80, talent: p.money >= 500 ? 30 : 0, quiz: 40, mrt: 0, go: 0 }[t.type] || 0;
  }

  // 從 pos 往 dir 方向擲 1 顆、2 顆，平均會遇到多好（或多壞）的格子
  cpuRollValue(p, pos, dir) {
    const at = (k) => this.cpuTileValue(p, this.stepTile(pos, k * dir));
    let one = 0;
    for (let k = 1; k <= 6; k++) one += at(k) / 6;
    let two = 0;
    for (let a = 1; a <= 6; a++) for (let b = 1; b <= 6; b++) two += at(a + b) / 36;
    return { one, two };
  }

  cpuDiceCount(p) {
    const { one, two } = this.cpuRollValue(p, p.pos, p.dir);
    return one > two ? 1 : 2;
  }

  // ---------- 擲骰子前：造勢晚會、遠端派任務、辯論挑戰 ----------
  preRollActions(p) {
    const R = GAME_RULES;
    const acts = [];
    if (p.rallies < R.rallyMax && p.money >= R.rallyCost) {
      acts.push({ key: 'rally', label: `造勢晚會：花 $${R.rallyCost}，支持者 +${R.rallyFans}`, note: `每場 ${R.rallyMax} 次，還剩 ${R.rallyMax - p.rallies} 次` });
    }
    if (this.generals.canRemote(p)) {
      const here = this.generals.ownChiefs(p).includes(p.pos);
      acts.push(here
        ? { key: 'remote', label: '派戰將出任務', note: `你站在自己的${TILES[p.pos].district}里長格：派到這裡效果全額，派到別區 ×${GENERAL_RULES.remoteRate}` }
        : { key: 'remote', label: '遠端派戰將出任務', note: `不用走到里長格，效果 ×${GENERAL_RULES.remoteRate}` });
    }
    const leader = this.generals.debateTarget(p);
    if (leader) acts.push({ key: 'debate', label: `向 ${leader.name} 發起辯論挑戰`, note: `花 $${R.debateCost}，贏了 +${R.debateFans}、輸了 -${R.debateLoseFans} 位支持者，每場一次` });
    if (this.generals.wooTargets(p).length) acts.push({ key: 'woo', label: '派戰將去拉攏里長', note: `不用走到里長格，派戰將去拉攏（${GENERAL_RULES.wooTurns}～${GENERAL_RULES.wooTurns + 1} 回合）` });
    if (this.generals.canDark(p)) acts.push({ key: 'dark', label: '神秘的金援：派戰將去找金主', note: `${R.darkTurns} 回合後帶回 $${R.darkMoney}，人脈越高越容易成功；失敗會被檢調盯上，支持者 -${R.darkFans}。每 ${R.darkEvery} 回合一次` });
    if (this.canSponsor(p)) acts.push({ key: 'sponsor', label: `接受企業贊助：+$${R.sponsorMoney}`, note: `有完工的地標才能接。支持者 -${R.sponsorFans}（被罵財團走狗），每 ${R.sponsorEvery} 回合一次` });
    if (this.sellList(p).length) acts.push({ key: 'sell', label: '賣地換現金', note: '把自己的地半價賣回給銀行' });
    return acts;
  }

  cpuPreRoll(p) {
    const R = GAME_RULES;
    if (this.generals.cpuWantsDebate(p)) return 'debate';
    if (this.generals.cpuWoo(p)) return 'woo';
    if (this.generals.cpuWantsDark(p)) return 'dark';
    if (this.canSponsor(p) && p.money < 400) return 'sponsor';
    if (p.rallies < R.rallyMax && p.money >= 700 && this.round > R.maxRounds / 2) return 'rally';
    if (this.generals.cpuWantsRemote(p)) return 'remote';
    return null;
  }

  async preRoll(p, msg) {
    const done = new Set(); // 電腦：每種行動一回合最多一次
    for (;;) {
      const acts = this.preRollActions(p);
      this.hud.say(p.human
        ? `輪到 ${p.name}！${acts.length ? '先「行動」或' : '按'}「擲骰子」${msg}`
        : `輪到 ${p.name}（電腦）…${msg}`);
      msg = '';
      if (!acts.length) {
        await this.hud.choose([{ label: '擲骰子', value: 'roll', fill: 0xff004d }], p, 'roll');
        return;
      }
      let pick = null;
      if (!p.human) {
        const c = this.cpuPreRoll(p);
        if (c && !done.has(c) && acts.some((a) => a.key === c)) pick = c;
      }
      const v = await this.hud.choose([
        { label: '擲骰子', value: 'roll', fill: 0xff004d },
        { label: '行動…', value: 'act', fill: 0x00e436 },
      ], p, pick ? 'act' : 'roll');
      if (v === 'roll') return;
      if (p.human) {
        pick = await gvModal({
          title: '擲骰子前的行動', color: '#00e436', who: p,
          body: `<div class="gv-actions">${acts.map((a) => `<button type="button" data-v="${a.key}">${escapeHTML(a.label)}<small>${escapeHTML(a.note)}</small></button>`).join('')}</div>
            <button type="button" class="gv-skip" data-v="back">返回</button>`,
        });
        if (pick === 'back') continue;
      }
      done.add(pick);
      if (pick === 'rally') await this.rally(p);
      else if (pick === 'remote') await this.generals.remoteMission(p);
      else if (pick === 'debate') await this.generals.debate(p);
      else if (pick === 'woo') await this.generals.woo(p);
      else if (pick === 'dark') await this.generals.dark(p);
      else if (pick === 'sponsor') await this.sponsor(p);
      else if (pick === 'sell') await this.sellLand(p);
      if (p.bankrupt) return;
    }
  }

  // ---------- 企業贊助、賣地 ----------
  canSponsor(p) {
    return this.round >= p.sponsorAt + GAME_RULES.sponsorEvery
      && this.tileState.some((s, i) => s.owner === p.id && TILES[i].type === 'property' && s.level >= GAME_RULES.maxLevel);
  }

  async sponsor(p) {
    const R = GAME_RULES;
    p.sponsorAt = this.round;
    this.hud.say(`${p.name} 接受企業贊助！\n拿到 $${R.sponsorMoney}`);
    this.changeMoney(p, R.sponsorMoney);
    await this.wait(700);
    const lost = -this.changeFans(p, -R.sponsorFans);
    this.hud.say(`網友罵「財團走狗」…\n支持者 -${lost}`);
    await this.wait(1100);
  }

  sellValue(i) { return Math.round((TILES[i].price + this.tileState[i].level * this.upgradeCost(i)) * GAME_RULES.sellRate); }

  sellList(p) { return TILES.map((t, i) => i).filter((i) => this.tileState[i].owner === p.id); }

  async sellLand(p) {
    const list = this.sellList(p).sort((a, b) => this.sellValue(a) - this.sellValue(b));
    const lvl = (i) => (TILES[i].type === 'chief' ? '里長' : BUILD_STAGES[this.tileState[i].level]);
    const v = await gvModal({
      title: '賣地換現金', color: '#ffec27', who: p,
      body: `<p class="gv-tip">半價賣回給銀行，賣掉就不是你的了（支持者收入也沒了）。你有 $${p.money}。</p>
        <div class="gv-actions">${list.map((i) => `<button type="button" data-v="${i}">${escapeHTML(this.tileName(i))}：賣 $${this.sellValue(i)}<small>${escapeHTML(TILES[i].district || '')}・${lvl(i)}</small></button>`).join('')}</div>
        <button type="button" class="gv-skip" data-v="back">先不要</button>`,
    });
    if (v === 'back') return;
    const i = Number(v);
    const name = this.tileName(i);
    const got = this.sellValue(i);
    this.loseTile(i);
    this.changeMoney(p, got);
    this.hud.say(`${p.name} 把 ${name} 賣給銀行，\n拿到 $${got}`);
    await this.wait(1100);
  }

  async rally(p) {
    const R = GAME_RULES;
    p.rallies++;
    this.hud.say(`${p.name} 舉辦造勢晚會！\n花 $${R.rallyCost}`);
    this.changeMoney(p, -R.rallyCost);
    await this.wait(600);
    const got = this.changeFans(p, R.rallyFans);
    Sfx.tune([523, 659, 784, 1047], 0.08);
    this.hud.say(`造勢晚會人山人海！\n支持者 +${got}`);
    await this.wait(1000);
  }

  // ---------- 地標租金、里長經營費 ----------
  chiefFeeOf(i) { return Math.round(TILES[i].price * GAME_RULES.chiefFeeRate); }

  landmarkUpkeepOf(i) {
    return Math.round(TILES[i].price * GAME_RULES.landmarkUpkeepRate * (this.tileState[i].level + 1));
  }

  // 付不出來不會破產，而是失去那一格
  async payUpkeep(p) {
    const R = GAME_RULES;
    let paid = 0;
    let msg = '';
    const lost = [];
    // 里長：每擁有 3 回合付一次經營費
    for (const i of this.generals.ownChiefs(p)) {
      const held = this.round - this.tileState[i].since;
      if (held <= 0 || held % R.chiefFeeEvery !== 0) continue;
      if (this.hasEffectIn(p.id, TILES[i].district, 'gov')) continue;
      const fee = this.chiefFeeOf(i);
      if (p.money >= fee) { p.money -= fee; paid += fee; } else lost.push(i);
    }
    // 地標：每回合付租金（貴的先付）
    let rent = 0;
    const lands = TILES.map((t, i) => i).filter((i) => TILES[i].type === 'property' && this.tileState[i].owner === p.id)
      .sort((a, b) => this.landmarkUpkeepOf(b) - this.landmarkUpkeepOf(a));
    for (const i of lands) {
      const r = this.landmarkUpkeepOf(i);
      if (p.money >= r) { p.money -= r; rent += r; } else lost.push(i);
    }
    paid += rent;
    if (paid) msg += `，租金和經營費 -$${paid}`;
    if (paid) {
      const { x, y } = this.tokenPos(p);
      this.floatText(x, y - 80, `-$${paid}`, '#ff004d');
      Sfx.pay();
    }
    for (const i of lost) {
      this.loseTile(i);
      msg += `\n付不出錢，失去 ${TILES[i].name}！`;
    }
    if (lost.length) Sfx.bad();
    this.hud.refreshPanels();
    return msg;
  }

  loseTile(i) {
    Object.assign(this.tileState[i], { owner: null, level: 0, bonus: 0, favor: [0, 0, 0, 0], landmark: null });
    this.generals.guardBack(i);
    this.refreshTile(i);
  }

  // 整區加成：同一區（2 格以上）全部拿下
  districtBonusOf(p) {
    return DISTRICTS.filter((d) => TILES.filter((t) => t.district === d).length >= 2 && this.ownsDistrict(p.id, d)).length * GAME_RULES.districtBonus;
  }

  // 選前衝刺：最後幾回合支持者的增減越來越大
  fansMult() {
    const R = GAME_RULES;
    const n = Math.min(R.finalRounds, Math.ceil(R.maxRounds / 2));
    const k = Math.min(this.round, R.maxRounds) - (R.maxRounds - n);
    return k >= 1 ? Math.round((1 + R.finalStep * k * (R.finalRounds / n)) * 10) / 10 : 1;
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
        else if (st.owner === p.id) await this.generals.onOwnChief(p, i);
        else {
          await this.payRent(p, i);
          if (!p.bankrupt && !this.gameOver) await this.generals.onRivalChief(p, i);
        }
        break;
      case 'quiz':
        await this.doQuiz(p);
        break;
      case 'talent':
        await this.generals.onRecruit(p);
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
      case 'mrt': {
        const others = TILES.map((x, j) => j).filter((j) => TILES[j].type === 'mrt' && j !== i);
        if (!others.length) break;
        const target = others[Math.floor(Math.random() * others.length)];
        this.hud.say(`${p.name} 來到捷運站！\n要搭捷運到${TILES[target].name}（另一站）嗎？下車後方向隨機`);
        let cpu = false;
        if (!p.human) {
          const best = (pos, dir) => { const v = this.cpuRollValue(p, pos, dir); return Math.max(v.one, v.two); };
          cpu = (best(target, 1) + best(target, -1)) / 2 > best(i, p.dir) + 10;
        }
        const go = await this.hud.choose([
          { label: '搭捷運！', value: true, fill: 0x29adff },
          { label: '不用', value: false, fill: 0xc2c3c7 },
        ], p, cpu);
        if (!go) break;
        await this.rideMrt(p, target);
        this.hud.say(`${p.name} 搭捷運到另一站！\n接下來往${p.dir === 1 ? '原本的方向' : '反方向'}走（看箭頭）`);
        this.showDirArrow(p, 1800);
        await this.wait(1600);
        break;
      }
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
    if (t.type === 'chief') { await this.offerChief(p, i); return; }
    const canBuy = p.money >= t.price;
    this.hud.say(`${t.district}有一塊空地！要花 $${t.price} 買下嗎？\n之後可以慢慢蓋成${t.district}的地標${canBuy ? '' : '\n（錢不夠…）'}`);
    const autoBuy = canBuy && p.money - t.price >= 200;
    const ans = await this.hud.choose([
      { label: `${t.type === 'chief' ? '拉攏' : '買下'} $${t.price}`, value: true, fill: 0x00e436, disabled: !canBuy },
      { label: '不買', value: false, fill: 0xc2c3c7 },
    ], p, autoBuy);
    if (ans) {
      p.money -= t.price;
      this.tileState[i].owner = p.id;
      this.tileState[i].since = this.round;
      this.tileState[i].bonus = 0;
      this.refreshTile(i);
      this.hud.showTile(i, p);
      Sfx.buy();
      this.flashTile(i);
      const gain = this.changeFans(p, t.type === 'chief' ? GAME_RULES.chiefBuyFans : Math.round(t.price * GAME_RULES.buyFansRate), true);
      this.hud.say(t.type === 'chief'
        ? `${p.name} 拉攏了 ${t.name}！\n支持者 +${gain}，之後每回合 +${this.fansPerTurnOf(i)}`
        : `${p.name} 買下了${t.district}的空地！\n支持者 +${gain}，過路費 $${this.rentOf(i)}`);
      this.hud.refreshPanels();
      await this.wait(1000);
    } else {
      this.hud.say(`${p.name} 決定先不買。`);
      await this.wait(700);
    }
  }

  // 里長：要拜訪 2 次（每次付一半價錢）才拉攏得到，好感度是每個人自己的
  async offerChief(p, i) {
    const t = TILES[i];
    const st = this.tileState[i];
    const R = GAME_RULES;
    const need = R.chiefVisits;
    const cost = Math.round(t.price / need);
    const last = st.favor[p.id] + 1 >= need;
    const canPay = p.money >= cost;
    this.hud.say((last
      ? `${t.name} 跟你已經很熟了！\n再花 $${cost} 就能拉攏，要嗎？`
      : `${t.name} 還沒有人拉攏。花 $${cost} 拜訪建立好感？\n（好感 ${st.favor[p.id]}/${need}，滿了才拉攏得到）`) + (canPay ? '' : '\n（錢不夠…）'));
    const ans = await this.hud.choose([
      { label: `${last ? '拉攏' : '拜訪'} $${cost}`, value: true, fill: 0x00e436, disabled: !canPay },
      { label: '不要', value: false, fill: 0xc2c3c7 },
    ], p, canPay && p.money - cost >= 200);
    if (!ans) {
      this.hud.say(`${p.name} 決定先不要。`);
      await this.wait(700);
      return;
    }
    p.money -= cost;
    st.favor[p.id]++;
    if (!last) {
      this.refreshTile(i);
      Sfx.coin();
      this.hud.say(`${p.name} 拜訪了 ${t.name}，好感 ${st.favor[p.id]}/${need}。\n下次再來就能拉攏！`);
      this.hud.refreshPanels();
      await this.wait(1000);
      return;
    }
    await this.acquireChief(p, i);
  }

  async acquireChief(p, i) {
    const t = TILES[i];
    const st = this.tileState[i];
    const R = GAME_RULES;
    Object.assign(st, { owner: p.id, since: this.round, bonus: 0, favor: [0, 0, 0, 0] });
    this.refreshTile(i);
    this.hud.showTile(i, p);
    Sfx.buy();
    this.flashTile(i);
    const gain = this.changeFans(p, R.chiefBuyFans, true);
    this.hud.say(`${p.name} 拉攏了 ${t.name}！支持者 +${gain}\n之後每回合 +${this.fansPerTurnOf(i)}，每 ${R.chiefFeeEvery} 回合付經營費 $${this.chiefFeeOf(i)}`);
    this.hud.refreshPanels();
    await this.wait(1200);
  }

  // 回到自己的空地：可以蓋下一個階段（擲骰子前的「行動」也可以蓋）
  async offerUpgrade(p, i) {
    const t = TILES[i];
    const st = this.tileState[i];
    if (st.level >= GAME_RULES.maxLevel) {
      const l = this.landmarkOf(i);
      const fans = Math.round(t.price * GAME_RULES.ownLandmarkFansRate);
      this.hud.boxOn++;
      try {
        this.hud.say(`${p.name} 回到自己的${l ? l.name : t.name}，\n舉辦市民活動！支持者 +${fans}`);
        this.changeFans(p, fans);
        await this.wait(1300);
      } finally { this.hud.boxOn--; }
      return;
    }
    const cost = this.upgradeCost(i);
    const canBuild = p.money >= cost;
    const next = BUILD_STAGES[st.level + 1];
    this.hud.say(`回到自己的${this.tileName(i)}。\n要花 $${cost} 蓋成「${next}」嗎？${st.level === 2 ? '\n完工會隨機變成這區的地標！' : ''}`);
    const ans = await this.hud.choose([
      { label: `蓋！ $${cost}`, value: true, fill: 0x00e436, disabled: !canBuild },
      { label: '先不要', value: false, fill: 0xc2c3c7 },
    ], p, canBuild && p.money - cost >= 400);
    if (ans) await this.build(p, i);
  }

  async build(p, i, free = false) {
    const t = TILES[i];
    const st = this.tileState[i];
    if (!free) p.money -= this.upgradeCost(i);
    st.level++;
    if (st.level === 3) st.landmark = this.pickLandmark(i);
    this.refreshTile(i);
    this.hud.showTile(i, p);
    Sfx.buy();
    this.flashTile(i);
    const gain = this.changeFans(p, Math.round(t.price * GAME_RULES.buildFansRate), true);
    const l = this.landmarkOf(i);
    this.followTile(i);
    if (l) {
      const e = LANDMARK_EFFECTS[l.effect];
      Sfx.tune([523, 659, 784, 1047, 1319], 0.09);
      this.hud.say(`地標完工：${l.name}！支持者 +${gain}\n【${e.name}】${e.text}`);
      await this.wait(1800);
    } else {
      this.hud.say(`${t.district}的空地蓋成「${BUILD_STAGES[st.level]}」！\n支持者 +${gain}，過路費變成 $${this.rentOf(i)}`);
      await this.wait(1100);
    }
    this.followPlayer(p);
    this.hud.refreshPanels();
  }

  // 機會卡「都更計畫」：免費幫自己的一塊空地加蓋一個階段
  async freeBuild(p) {
    const list = TILES.map((t, i) => i).filter((i) => TILES[i].type === 'property' && this.tileState[i].owner === p.id && this.tileState[i].level < GAME_RULES.maxLevel);
    if (!list.length) {
      this.hud.say(`${p.name} 還沒有可以蓋的空地，\n改領補助 $100`);
      this.changeMoney(p, 100);
      await this.wait(1100);
      return;
    }
    let auto;
    if (!p.human) {
      // 電腦：先蓋快完工的、比較貴的
      auto = String([...list].sort((a, b) => (this.tileState[b].level - this.tileState[a].level) || (TILES[b].price - TILES[a].price))[0]);
    }
    const v = await gvModal({
      title: '都更計畫：免費蓋房子', color: '#00e436', who: p, autoValue: auto,
      body: `<p class="gv-tip">選一塊自己的空地，<b>免費</b>往上蓋一個階段：空地 → 工地 → 小建築 → <b>地標</b>（完工時隨機抽這一區的地標，有特殊效果）。</p>
        <div class="gv-actions">${list.map((i) => `<button type="button" data-v="${i}">${escapeHTML(this.tileName(i))} → ${BUILD_STAGES[this.tileState[i].level + 1]}<small>${TILES[i].district}・平常要 $${this.upgradeCost(i)}</small></button>`).join('')}</div>`,
    });
    await this.build(p, Number(v), true);
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
      this.changeFans(owner, lost, false, true);
    }
    await this.wait(900);
  }

  // ---------- 英文挑戰 ----------
  async doQuiz(p) {
    const level = QUIZ_LEVELS.find((lv) => lv.key === this.quizLevel) || QUIZ_LEVELS[1];
    this.hud.say(`${p.name} 遇到英文挑戰！\n答對：$${GAME_RULES.quizMoney}、支持者 +${GAME_RULES.quizFans}`);
    Sfx.tune([523, 659, 784], 0.08);
    await this.wait(700);
    const ok = await showQuiz(QuizDeck.draw(level.key), p, level.name);
    if (ok) {
      this.hud.say(`${p.name} 答對了！\n錢 +$${GAME_RULES.quizMoney}，支持者 +${GAME_RULES.quizFans}`);
      this.changeMoney(p, GAME_RULES.quizMoney);
      this.changeFans(p, GAME_RULES.quizFans, true);
    } else {
      this.hud.say(`${p.name} 答錯了…\n支持者 -${GAME_RULES.quizWrongFans}`);
      this.changeFans(p, -GAME_RULES.quizWrongFans);
    }
    await this.wait(1000);
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
    if (card.scandal) await this.generals.scandal(p);
    if (card.loyaltyAll) await this.generals.loyaltyAll(p, card.loyaltyAll);
    if (card.freeBuild) await this.freeBuild(p);
    if (card.fans) {
      this.changeFans(p, card.fans);
      await this.wait(500);
    }
    if (card.fansFromEach) {
      for (const o of this.players) {
        if (o.id === p.id || o.bankrupt) continue;
        const lost = -this.changeFans(o, -card.fansFromEach, true);
        this.changeFans(p, lost, false, true);
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
      await this.walk(p, this.stepsTo(p, jamAt));
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
        const j = this.stepTile(p.pos, k * p.dir);
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
      const favor = st.owner === null ? this.players.filter((q) => st.favor[q.id]).map((q) => `${q.name} ${st.favor[q.id]}/${GAME_RULES.chiefVisits}`).join('、') : '';
      this.hud.say(`【${t.name}】價格 $${t.price}（拜訪 ${GAME_RULES.chiefVisits} 次）\n${owner}${favor ? `・好感：${favor}` : ''}\n每回合支持者 +${this.fansPerTurnOf(i)}，過路費 $${rent}，每 ${GAME_RULES.chiefFeeEvery} 回合經營費 $${this.chiefFeeOf(i)}`);
      return;
    }
    const l = this.landmarkOf(i);
    const eff = l ? `\n${LANDMARK_EFFECTS[l.effect].name}：${LANDMARK_EFFECTS[l.effect].text}` : '';
    this.hud.say(`【${this.tileName(i)}】$${t.price}・${owner}\n每回合 +${this.fansPerTurnOf(i)} 支持・過路費 $${rent}${eff}`);
  }

  // ---------- 遊戲結束 ----------
  checkEnd() {
    const alive = this.players.filter((p) => !p.bankrupt);
    const lastTurnOfRound = this.players.slice(this.current + 1).every((p) => p.bankrupt);
    if (alive.length <= 1 || (this.round >= GAME_RULES.maxRounds && lastTurnOfRound)) {
      this.gameOver = true;
      this.stopFollow();
      this.hud.showResults();
      return true;
    }
    return false;
  }
}
