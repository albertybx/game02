// 遊戲資料：地圖格子、角色、機會/命運卡。
// 想調整價錢、換角色名字、加新卡片，改這個檔案就好，不用動遊戲程式。

const GAME_RULES = {
  startMoney: 2000,   // 每人一開始的錢
  passGoBonus: 400,   // 經過起點拿的錢
  maxRounds: 30,      // 第幾回合結束就是「投票日」，比誰的支持者最多
  startFans: 1000,    // 每人一開始的支持者
  maxLevel: 3,        // 空地最多蓋到第幾階段（3 = 地標完工）
  rentMultiplier: [1, 3, 6, 10], // 空地 0 → 工地 1 → 小建築 2 → 地標 3：過路費是基本過路費的幾倍
  dice: 2,            // 一次擲幾顆骰子（地圖變大了，擲兩顆走比較快）
  towFine: 100,       // 拖吊場罰款
  startSpread: 2,     // 起點錯開：第 2 位玩家從第 2 格出發、第 3 位第 4 格…（先擲骰的人才不會太有利）

  // ---- 地標（賺錢為主，也帶來一些支持者）----
  buyFansRate: 0.5,     // 買下地標：支持者 + 價錢 × 0.5
  buildFansRate: 0.5,   // 每蓋一個階段：支持者 + 價錢 × 0.5
  landmarkFansRate: 0.15, // 【A】每回合開始：每個地標帶來 價錢 × 0.15 ×（總部層數 + 1）位支持者
  landmarkStealRate: 0.2, // 【B】對手踩到你的地標：倒戈 價錢 × 0.2 ×（總部層數 + 1）位支持者
  landmarkUpkeepRate: 0.01, // 地標租金：每回合開始付 價錢 × 0.01 ×（總部層數 + 1）

  // ---- 里長（便宜、過路費低，但帶來比較多支持者）----
  chiefBuyFans: 200,    // 拉攏里長：支持者 + 200
  chiefFansPerTurn: 50, // 【A】每回合開始：每位里長帶來 50 位支持者
  chiefSteal: 80,       // 【B】對手踩到你的里長格：倒戈 80 位支持者
  chiefRentRate: 0.1,   // 里長格過路費：價錢 × 0.1
  chiefVisits: 2,       // 要拜訪幾次才拉攏得到（每次付 價錢 ÷ 2）
  chiefFeeEvery: 3,     // 每擁有幾回合，要付一次「地方經營費」
  chiefFeeRate: 0.3,    // 地方經營費 = 價錢 × 0.3（付不出來，里長就跑掉）

  // ---- 其他 ----
  districtBonus: 100,   // 整區加成：同一區（2 格以上）的地標和里長全部拿下，每回合再 + 100 位支持者
  rallyCost: 150,       // 造勢晚會：擲骰子前可以花錢辦
  rallyFans: 200,       //   換到的支持者
  rallyMax: 2,          //   每場最多辦幾次
  finalRounds: 10,      // 選前衝刺：最後 10 回合，支持者的增減一回合比一回合大
  finalStep: 0.1,       //   每回合多 10%（最後一回合 ×2）
  debateGap: 600,       // 辯論挑戰：下半場，落後第一名這麼多支持者時可以發起
  debateCost: 100,
  debateFans: 250,      //   發起的人贏了：第一名有這麼多支持者倒戈過來（每人每場一次）
  debateLoseFans: 100,  //   發起的人輸了：自己有這麼多支持者倒戈給第一名


  // ---- 賺錢的方法 ----
  donationEvery: 5,       // 政治獻金：每 5 回合，有里長的人領錢
  donationBase: 80,       //   $80
  donationPerChief: 30,   //   + 每位里長 $30
  subsidyBase: 150,       // 選舉補助款：比賽過一半時，每人領 $150
  subsidyStep: 50,        //   支持者每到一個門檻再 + $50
  subsidyLevels: [2000, 3000],
  revenueEvery: 6,        // 地標營收：每 6 回合，每座完工地標依種類收錢（LANDMARK_EFFECTS 的 revenue）
  sponsorMoney: 200,      // 企業贊助：有完工地標才能接，拿 $200
  sponsorFans: 120,       //   支持者 -120（被罵財團走狗）
  sponsorEvery: 10,       //   每 10 回合一次
  darkMoney: 400,         // 神秘的金援：派戰將去找神秘金主，成功帶回 $400
  darkTurns: 2,           //   離開 2 回合
  darkEvery: 8,           //   每 8 回合一次
  darkBaseRate: 0.45,     //   成功率 = 45% + 人脈 × 8%（最高 90%）
  darkPerNetwork: 0.08,
  darkFans: 350,          //   失敗（被檢調盯上）：支持者 -350
  darkLoyalty: 15,        //   戰將忠誠度 -15
  sellRate: 0.5,          // 主動賣地：半價賣回給銀行
  ownLandmarkFansRate: 0.25, // 停在自己完工的地標：辦市民活動，支持者 + 價錢 × 0.25
  ownChiefFans: 40,       // 停在自己的里長格、又沒有戰將可以派：里民熱情招呼，支持者 + 40

  // ---- 特殊挑戰：英文學習格（首頁可以選擇要不要加入）----
  quizMoney: 200,        // 答對：錢 + 200（大幅）
  quizFans: 80,          // 答對：支持者 + 80（小幅）
  quizWrongFans: 50,     // 答錯：支持者 - 50（小幅）
  quizCpuAccuracy: 0.6,  // 電腦玩家答對的機率
};

// 首頁可以選的回合數
const ROUND_OPTIONS = [30, 50, 80];

// 台北市 12 個行政區（照路線順序）
const DISTRICTS = ['中正區', '萬華區', '大同區', '中山區', '士林區', '北投區', '內湖區', '松山區', '南港區', '信義區', '文山區', '大安區'];

// 地圖形狀：照真實台北市行政區圖做的（中間的區放大一點，格子才夠）。
// 每個字是一格陸地，'.' 是河水。(col, row) 斜 45 度畫在畫面上。
const MAP_LAND = [
  'BBB..........................',
  'BBBBT........................',
  '.BBBTTTTT....................',
  'BBBBTTTTTT...................',
  'BBBBTTTTTTTN.................',
  'BBBBTTTTTTNNNN...............',
  'BBBBTTTTTNNNNNNN.............',
  'BBBBBTTTTSNNNNNNN............',
  'BBBBBTTTTSSNNNNNNN...........',
  '.BBBBTTTSSSSOOONNNN..........',
  '.BBBTTTTSSSSSOOONNNG.........',
  '.TTTTTTTSSSSSSOOONGGXXX......',
  '..TTTTTTSSSSSSSOOOXGGGGG.....',
  '...TTTTDDSSSSSSSOOXXGGGG.....',
  '...TTTTDDTSSSSSSSOAXXGGG.....',
  '.......TTTTSSSSSSSAAXXGGG....',
  '........TTTSSSSSSSAAAXXGG....',
  '.........TTDSSSSSAAAAXXXW....',
  '.........TTDZZZZZZAAAAXWWW...',
  '..........MMZZZZZZAAAAAWWWW..',
  '..........MMMZZZZZAAAAAAWWWW.',
  '...........MMMMZZZAAAAAWWWWW.',
  '............MMMMZZZAAAAWWWWW.',
  '.............MMMMZZAAAAWWWWW.',
  '..............MMMMMAAAWWWWWW.',
  '................MMMAAAWWWWW..',
  '..................MAA........',
];

// 路線：每個點是一個轉彎處 [col, row]，照順序一格一格連起來，最後回到第一個點。
// 路線總長度要剛好等於 TILES 的格數（78 格）。
const MAP_ROUTE = [
  [16, 21], [16, 22], [14, 22], [14, 20], [12, 20], [12, 16], [10, 16], [10, 12],
  [11, 12], [11, 9], [8, 9], [8, 8], [5, 8], [5, 5], [12, 5], [12, 6],
  [14, 6], [14, 9], [16, 9], [16, 12], [20, 12], [20, 11], [21, 11], [21, 15],
  [23, 15], [23, 21], [22, 21], [22, 23], [20, 23], [20, 21],
];

// 地圖 78 格，從「起點」（中正區）出發，依序經過 12 個區。
// type: go 起點 / property 空地（可以慢慢蓋成地標）/ chief 里長 / chance 機會 / fate 命運
//       / talent 戰將招募站 / jam 塞車 / mrt 捷運站 / tow 拖吊場
const TILES = [
  { type: 'go', name: '起點', icon: 'go' }, // 0
  // ---- 中正區 ----
  { type: 'property', name: '中正空地', price: 220, district: '中正區' }, // 1
  { type: 'chief', name: '中正區里長', icon: 'chief', price: 130, district: '中正區' }, // 2
  { type: 'property', name: '中正空地', price: 220, district: '中正區' }, // 3
  { type: 'property', name: '中正空地', price: 220, district: '中正區' }, // 4
  // ---- 萬華區 ----
  { type: 'property', name: '萬華空地', price: 100, district: '萬華區' }, // 5
  { type: 'chance', name: '機會', icon: 'chance' }, // 6
  { type: 'chief', name: '萬華區里長', icon: 'chief', price: 80, district: '萬華區' }, // 7
  { type: 'property', name: '萬華空地', price: 100, district: '萬華區' }, // 8
  { type: 'jam', name: '塞車', icon: 'jam' }, // 9
  { type: 'property', name: '萬華空地', price: 100, district: '萬華區' }, // 10
  { type: 'fate', name: '命運', icon: 'ballot' }, // 11
  // ---- 大同區 ----
  { type: 'property', name: '大同空地', price: 110, district: '大同區' }, // 12
  { type: 'talent', name: '戰將招募站', icon: 'talent' }, // 13
  { type: 'chief', name: '大同區里長', icon: 'chief', price: 80, district: '大同區' }, // 14
  { type: 'property', name: '大同空地', price: 110, district: '大同區' }, // 15
  { type: 'chance', name: '機會', icon: 'chance' }, // 16
  { type: 'property', name: '大同空地', price: 110, district: '大同區' }, // 17
  // ---- 中山區 ----
  { type: 'property', name: '中山空地', price: 200, district: '中山區' }, // 18
  { type: 'fate', name: '命運', icon: 'ballot' }, // 19
  { type: 'chief', name: '中山區里長', icon: 'chief', price: 120, district: '中山區' }, // 20
  { type: 'property', name: '中山空地', price: 200, district: '中山區' }, // 21
  { type: 'mrt', name: '捷運站', icon: 'mrt' }, // 22
  { type: 'property', name: '中山空地', price: 200, district: '中山區' }, // 23
  // ---- 士林區 ----
  { type: 'property', name: '士林空地', price: 160, district: '士林區' }, // 24
  { type: 'chance', name: '機會', icon: 'chance' }, // 25
  { type: 'chief', name: '士林區里長', icon: 'chief', price: 100, district: '士林區' }, // 26
  { type: 'property', name: '士林空地', price: 160, district: '士林區' }, // 27
  { type: 'fate', name: '命運', icon: 'ballot' }, // 28
  { type: 'property', name: '士林空地', price: 160, district: '士林區' }, // 29
  { type: 'chance', name: '機會', icon: 'chance' }, // 30
  // ---- 北投區 ----
  { type: 'property', name: '北投空地', price: 120, district: '北投區' }, // 31
  { type: 'fate', name: '命運', icon: 'ballot' }, // 32
  { type: 'chief', name: '北投區里長', icon: 'chief', price: 90, district: '北投區' }, // 33
  { type: 'property', name: '北投空地', price: 120, district: '北投區' }, // 34
  { type: 'talent', name: '戰將招募站', icon: 'talent' }, // 35
  { type: 'property', name: '北投空地', price: 120, district: '北投區' }, // 36
  { type: 'chance', name: '機會', icon: 'chance' }, // 37
  // ---- 內湖區 ----
  { type: 'property', name: '內湖空地', price: 180, district: '內湖區' }, // 38
  { type: 'fate', name: '命運', icon: 'ballot' }, // 39
  { type: 'chief', name: '內湖區里長', icon: 'chief', price: 110, district: '內湖區' }, // 40
  { type: 'property', name: '內湖空地', price: 180, district: '內湖區' }, // 41
  { type: 'tow', name: '拖吊場', icon: 'siren' }, // 42
  { type: 'property', name: '內湖空地', price: 180, district: '內湖區' }, // 43
  { type: 'chance', name: '機會', icon: 'chance' }, // 44
  { type: 'fate', name: '命運', icon: 'ballot' }, // 45
  // ---- 松山區 ----
  { type: 'property', name: '松山空地', price: 200, district: '松山區' }, // 46
  { type: 'mrt', name: '捷運站', icon: 'mrt' }, // 47
  { type: 'chief', name: '松山區里長', icon: 'chief', price: 120, district: '松山區' }, // 48
  { type: 'property', name: '松山空地', price: 200, district: '松山區' }, // 49
  { type: 'chance', name: '機會', icon: 'chance' }, // 50
  { type: 'property', name: '松山空地', price: 200, district: '松山區' }, // 51
  // ---- 南港區 ----
  { type: 'property', name: '南港空地', price: 160, district: '南港區' }, // 52
  { type: 'chief', name: '南港區里長', icon: 'chief', price: 100, district: '南港區' }, // 53
  { type: 'fate', name: '命運', icon: 'ballot' }, // 54
  { type: 'property', name: '南港空地', price: 160, district: '南港區' }, // 55
  { type: 'talent', name: '戰將招募站', icon: 'talent' }, // 56
  { type: 'property', name: '南港空地', price: 160, district: '南港區' }, // 57
  // ---- 信義區 ----
  { type: 'property', name: '信義空地', price: 300, district: '信義區' }, // 58
  { type: 'chance', name: '機會', icon: 'chance' }, // 59
  { type: 'chief', name: '信義區里長', icon: 'chief', price: 140, district: '信義區' }, // 60
  { type: 'property', name: '信義空地', price: 300, district: '信義區' }, // 61
  { type: 'fate', name: '命運', icon: 'ballot' }, // 62
  { type: 'property', name: '信義空地', price: 300, district: '信義區' }, // 63
  // ---- 文山區 ----
  { type: 'property', name: '文山空地', price: 120, district: '文山區' }, // 64
  { type: 'fate', name: '命運', icon: 'ballot' }, // 65
  { type: 'chief', name: '文山區里長', icon: 'chief', price: 90, district: '文山區' }, // 66
  { type: 'property', name: '文山空地', price: 120, district: '文山區' }, // 67
  { type: 'chance', name: '機會', icon: 'chance' }, // 68
  { type: 'talent', name: '戰將招募站', icon: 'talent' }, // 69
  { type: 'property', name: '文山空地', price: 120, district: '文山區' }, // 70
  { type: 'fate', name: '命運', icon: 'ballot' }, // 71
  // ---- 大安區 ----
  { type: 'property', name: '大安空地', price: 260, district: '大安區' }, // 72
  { type: 'talent', name: '戰將招募站', icon: 'talent' }, // 73
  { type: 'chief', name: '大安區里長', icon: 'chief', price: 140, district: '大安區' }, // 74
  { type: 'property', name: '大安空地', price: 260, district: '大安區' }, // 75
  { type: 'chance', name: '機會', icon: 'chance' }, // 76
  { type: 'property', name: '大安空地', price: 260, district: '大安區' }, // 77
];

// =====================================================================
// 地標：空地慢慢蓋 → 工地 → 小建築 → 地標完工。
// 完工時，從那一區的地標裡「隨機」抽一個（同一張地圖不會重複），每個地標有特殊效果。
// =====================================================================
const BUILD_STAGES = ['空地', '工地', '小建築', '地標'];

const LANDMARK_EFFECTS = {
  tourist: { name: '觀光人潮', text: '每回合支持者再 +50', revenue: 100 },
  market:  { name: '夜市商圈', text: '過路費 ×1.5', revenue: 120 },
  temple:  { name: '香火鼎盛', text: '對手踩到時倒戈 ×2', revenue: 80 },
  gov:     { name: '政府機關', text: '同區里長免經營費、穩固度 +2', revenue: 60 },
  culture: { name: '文化地標', text: '這一區出任務效果 ×1.5', revenue: 80 },
  hub:     { name: '交通樞紐', text: '每回合 +$50', revenue: 0 },
};

const LANDMARKS = {
  中正區: [
    { key: 'station', name: '台北車站', effect: 'hub' },
    { key: 'presidential', name: '總統府', effect: 'gov' },
    { key: 'cks', name: '中正紀念堂', effect: 'culture' },
  ],
  萬華區: [
    { key: 'longshan', name: '龍山寺', effect: 'temple' },
    { key: 'redhouse', name: '西門紅樓', effect: 'market' },
    { key: 'bopiliao', name: '剝皮寮', effect: 'culture' },
  ],
  大同區: [
    { key: 'dihua', name: '迪化街', effect: 'market' },
    { key: 'xiahai', name: '霞海城隍廟', effect: 'temple' },
    { key: 'dadaocheng', name: '大稻埕碼頭', effect: 'tourist' },
  ],
  中山區: [
    { key: 'grandhotel', name: '圓山大飯店', effect: 'tourist' },
    { key: 'xingtian', name: '行天宮', effect: 'temple' },
    { key: 'artmuseum', name: '台北市立美術館', effect: 'culture' },
  ],
  士林區: [
    { key: 'palace', name: '故宮博物院', effect: 'culture' },
    { key: 'nightmarket', name: '士林夜市', effect: 'market' },
    { key: 'shilinresidence', name: '士林官邸', effect: 'gov' },
  ],
  北投區: [
    { key: 'beitou', name: '北投溫泉博物館', effect: 'tourist' },
    { key: 'beitoulibrary', name: '北投圖書館', effect: 'culture' },
    { key: 'guandu', name: '關渡宮', effect: 'temple' },
  ],
  內湖區: [
    { key: 'ferriswheel', name: '美麗華摩天輪', effect: 'tourist' },
    { key: 'sciencepark', name: '內湖科學園區', effect: 'hub' },
    { key: 'bishan', name: '碧山巖', effect: 'temple' },
  ],
  松山區: [
    { key: 'arena', name: '台北小巨蛋', effect: 'tourist' },
    { key: 'raohe', name: '饒河夜市', effect: 'market' },
    { key: 'airport', name: '松山機場', effect: 'hub' },
  ],
  南港區: [
    { key: 'nangangexpo', name: '南港展覽館', effect: 'tourist' },
    { key: 'sinica', name: '中央研究院', effect: 'culture' },
    { key: 'nangangstation', name: '南港車站', effect: 'hub' },
  ],
  信義區: [
    { key: 'taipei101', name: '台北101', effect: 'tourist' },
    { key: 'sunyatsen', name: '國父紀念館', effect: 'culture' },
    { key: 'cityhall', name: '台北市政府', effect: 'gov' },
  ],
  文山區: [
    { key: 'zoo', name: '台北市立動物園', effect: 'tourist' },
    { key: 'maokong', name: '貓空纜車', effect: 'hub' },
    { key: 'nccu', name: '政治大學', effect: 'culture' },
  ],
  大安區: [
    { key: 'daanpark', name: '大安森林公園', effect: 'tourist' },
    { key: 'ntu', name: '台灣大學', effect: 'culture' },
    { key: 'shida', name: '師大夜市', effect: 'market' },
  ],
};

const QUIZ_TILE = { type: 'quiz', name: '英文挑戰', icon: 'quiz' };
const QUIZ_TILE_SLOTS = [16, 39, 65]; // 原本是：機會、命運、命運
const BASE_TILES = TILES.map((t) => ({ ...t }));

// 開新遊戲時依首頁的選項重新排地圖格子（TILES 會被改成這一場用的版本）
function applyTileOptions({ quiz }) {
  TILES.length = 0;
  BASE_TILES.forEach((t, i) => TILES.push(quiz && QUIZ_TILE_SLOTS.includes(i) ? { ...QUIZ_TILE } : { ...t }));
}

// =====================================================================
// 戰將：可以在「戰將招募站」招攬，幫你派任務、駐守里長格、拔對手的樁
// 三項能力（1～5）：口才、人脈、魅力，加起來都是 9 點，各有專長。
// home 是出身的行政區：在家鄉出任務、拔樁、駐守都會 +1。
// ※ 目前是虛構角色；想換成別的人物，改 name、title、能力和 image 就好。
// =====================================================================
const GENERALS = [
  { id: 0, name: '林語辰', title: '網紅律師',   eloquence: 5, network: 1, charisma: 3, home: '大安區', image: 'assets/generals/gen0.png' },
  { id: 1, name: '金水伯', title: '廟口主委',   eloquence: 2, network: 5, charisma: 2, home: '萬華區', image: 'assets/generals/gen1.png' },
  { id: 2, name: '阿芳姐', title: '市場阿姨',   eloquence: 2, network: 4, charisma: 3, home: '大同區', image: 'assets/generals/gen2.png' },
  { id: 3, name: '小傑',   title: '科技新貴',   eloquence: 3, network: 2, charisma: 4, home: '內湖區', image: 'assets/generals/gen3.png' },
  { id: 4, name: '蔡大嘴', title: '電視名嘴',   eloquence: 4, network: 2, charisma: 3, home: '松山區', image: 'assets/generals/gen4.png' },
  { id: 5, name: '小安',   title: '志工隊長',   eloquence: 3, network: 3, charisma: 3, home: '文山區', image: 'assets/generals/gen5.png' },
  { id: 6, name: '陳醫師', title: '社區醫師',   eloquence: 3, network: 4, charisma: 2, home: '北投區', image: 'assets/generals/gen6.png' },
  { id: 7, name: '莉莉',   title: '前奧運國手', eloquence: 1, network: 3, charisma: 5, home: '士林區', image: 'assets/generals/gen7.png' },
  { id: 8,  name: '巴巴大俠', title: '前總統',   eloquence: 5, network: 2, charisma: 2, home: '中正區', image: 'assets/generals/gen8.png' },
  { id: 9,  name: '鷹九',     title: '前總統',   eloquence: 2, network: 4, charisma: 3, home: '中山區', image: 'assets/generals/gen9.png' },
  { id: 10, name: '木可阿伯', title: '前市長',   eloquence: 3, network: 2, charisma: 4, home: '信義區', image: 'assets/generals/gen10.png' },
  { id: 11, name: '蔡實實',   title: '前總統',   eloquence: 3, network: 4, charisma: 2, home: '南港區', image: 'assets/generals/gen11.png' },
];

// 戰將專屬技能（key 對應上面的 id）
const GENERAL_SKILLS = {
  0:  { name: '網紅帶貨', text: '媒體宣傳不用花錢' },
  1:  { name: '廟口人情', text: '跑紅白帖的效果 ×1.5' },
  2:  { name: '菜市場情報', text: '駐守防守時，三項能力 +1' },
  3:  { name: '效率至上', text: '出任務提早 1 回合回來（最少 1 回合，收穫照比例）；拉攏里長也快 1 回合' },
  4:  { name: '名嘴開講', text: '拔樁戰出「演講」+1' },
  5:  { name: '志工動員', text: '選民服務的效果 ×1.5' },
  6:  { name: '醫德清白', text: '不會鬧醜聞' },
  7:  { name: '國手魅力', text: '拔樁戰出「造勢」+1' },
  8:  { name: '辯論高手', text: '辯論挑戰時，三項能力 +2' },
  9:  { name: '晨跑達人', text: '遠端派任務也不打折' },
  10: { name: '直來直往', text: '拔樁戰平手時算他贏' },
  11: { name: '貓派穩定', text: '忠誠度不會低於 60，挖角挖不走' },
};

// 派任務：用哪項能力、要離開幾回合
const MISSIONS = [
  { key: 'wedding', name: '跑紅白帖', stat: 'charisma', turns: 1, base: 15, perStat: 15, note: '不花錢，很快回來，但收穫比較少' },
  { key: 'service', name: '選民服務', stat: 'network', turns: 2, base: 70, perStat: 30, note: '那一格樁腳更穩 +1' },
  { key: 'media', name: '媒體宣傳', stat: 'eloquence', turns: 3, base: 60, perStat: 30, note: '要花錢，效果 ×1.65' },
  // 下面兩個帶回「錢」
  { key: 'dinner', name: '募款餐會', stat: 'charisma', turns: 2, money: true, note: '看魅力，帶回錢' },
  { key: 'tender', name: '政府標案', stat: null, turns: 2, money: true, note: '先付錢，回來時里長還是你的就賺錢' },
];

const GENERAL_RULES = {
  maxPerPlayer: Infinity, // 每人最多幾位戰將（沒有上限）
  recruitCost: 300,       // 招募費
  recruitChoices: 2,      // 招募站一次翻幾張
  visitWithin: 3,         // 開局保底：前 3 回合內，每人一定有一位戰將登門拜訪、免費加入
  startLoyalty: 80,       // 剛加入時的忠誠度
  poachBelow: 60,         // 忠誠度低於多少，就可能被挖角
  poachCost: 400,         // 挖角要付的錢（成功才付）
  // 任務（在自己的里長格派出）：支持者 + 基本 + 能力 × 倍數 + 骰子 × 10（基本和倍數寫在 MISSIONS，沒寫就用這兩個）
  missionBase: 60,
  missionPerStat: 30,
  mediaCost: 100,         // 媒體宣傳要花的錢（效果比較大）
  mediaBonus: 1.65,       // 媒體宣傳的效果倍數
  skillMissionRate: 1.5,  // 金水伯的紅白帖、小安的選民服務：效果 ×1.5
  dinnerCost: 40,         // 募款餐會：場地費
  dinnerBase: 80,         //   帶回 $80 + 魅力 × 30 + 骰子 × 10
  dinnerPerStat: 30,
  tenderCost: 100,        // 政府標案：先付 $100
  tenderMoney: 290,       //   回來時里長還是你的：拿 $290
  tenderRefund: 75,       //   里長被搶走：只退 $75
  missionRest: 1,         // （舊規則，沒用到）
  remoteRate: 0.7,        // 遠端派任務（不在那一格）：效果 × 0.7
  wooTurns: 2,            // 派戰將去拉攏「拜訪過一次」的里長，要離開幾回合
  // 拔樁戰
  counterBonus: 2,        // 出的招剋到對方 +2
  homeBonus: 1,           // 在出身區 +1
  winFans: 150,           // 拔樁成功：支持者 +
  loseFans: 150,          // 拔樁失敗：支持者倒戈給對手
  loseRest: 2,            // 輸了的戰將休息幾回合
  stakeMax: 4,            // 樁腳穩固度最高
  stakeEvery: 3,          // 擁有幾回合，穩固度 +1
  // 忠誠度變化
  loyaltyMission: 3, loyaltyWin: 8, loyaltyLose: 12, loyaltyScandal: 15, loyaltyIdle: 4, idleTurns: 3,
  scandalFans: 150,       // 醜聞：支持者 -
  scandalRest: 2,
};

// 拔樁戰的三種招式：用哪一項能力、剋哪一招
const TACTICS = {
  speech: { name: '演講', stat: 'eloquence', statName: '口才', beats: 'rally' },   // 講道理壓過熱鬧
  visit:  { name: '拜訪', stat: 'network',   statName: '人脈', beats: 'speech' },  // 人情勝過空談
  rally:  { name: '造勢', stat: 'charisma',  statName: '魅力', beats: 'visit' },   // 人氣蓋過人情
};

// 角色：目前是虛構的「政治人物」角色。
// 想換成真實政治人物，改 name 就好。image 是 AI 畫的角色圖；沒有 image 時用像素小圖（body 可選 person_short / person_long / person_bald）。
// hair 頭髮、suit 西裝、tie 領帶、color 代表色（插旗、名牌用）
const CHARACTERS = [
  { name: '阿北市長', image: 'assets/characters/char0.png', body: 'person_short', hair: '#000000', suit: '#1d2b53', tie: '#ff004d', color: '#ff004d' },
  { name: '立委小美', image: 'assets/characters/char1.png', body: 'person_long',  hair: '#ab5236', suit: '#fff1e8', tie: '#29adff', color: '#29adff' },
  { name: '里長伯', image: 'assets/characters/char2.png',   body: 'person_bald',  hair: '#c2c3c7', suit: '#008751', tie: '#ffec27', color: '#00e436' },
  { name: '議員阿杰', image: 'assets/characters/char3.png', body: 'person_short', hair: '#5f574f', suit: '#7e2553', tie: '#ffa300', color: '#ffec27' },
];

// 卡片效果 effect：
//   fans: 支持者增加(正數)或減少(負數)多少
//   fansFromEach: 從每位對手身上拉走多少支持者
//   money: 拿到(正數)或付出(負數)多少錢
//   move: 前進(正)或後退(負)幾格
//   goto: 直接走到某種格子，例如 'mrt' 捷運站、'go' 起點（會經過起點就領錢）
//   jam: 直接去塞車格並暫停一回合
//   fromEach: 每位對手付你多少錢
//   perLevel: 每一層競選總部要付多少錢
const CHANCE_CARDS = [
  { text: '政見發表會大成功！\n小額捐款湧入，獲得 $150', money: 150 },
  { text: '上政論節目爆紅，\n通告費 $100 入袋', money: 100 },
  { text: '掃街拜票握手握到手痠，\n前進 3 格', move: 3 },
  { text: '搭捷運去下一個行程，\n直接前往捷運站', goto: 'mrt' },
  { text: '回到起點重新拉票，\n前往起點', goto: 'go' },
  { text: '電視辯論表現亮眼！\n每位對手付你 $30', fromEach: 30 },
  { text: '政見影片在網路爆紅！\n支持者 +300', fans: 300 },
  { text: '參加廟會遶境，跟鄉親搏感情，\n支持者 +200', fans: 200 },
  { text: '名人站台力挺！\n支持者 +400', fans: 400 },
  { text: '舉辦親子園遊會，花 $100，\n支持者 +250', money: -100, fans: 250 },
  { text: '辯論會大獲全勝！\n每位對手有 100 位支持者倒戈', fansFromEach: 100 },
  { text: '戰將們士氣大振！\n你所有戰將的忠誠度 +15', loyaltyAll: 15 },
  { text: '都更計畫通過！\n免費幫你的一塊空地加蓋一個階段', freeBuild: true },
  { text: '社區營造補助下來了！\n免費幫你的一塊空地加蓋一個階段', freeBuild: true },
  { text: '建商搶著合作！\n免費幫你的一塊空地加蓋一個階段', freeBuild: true },
  { text: '市府都市更新獎勵！\n免費幫你的一塊空地加蓋一個階段', freeBuild: true },
  { text: '里民捐地蓋活動中心！\n免費幫你的一塊空地加蓋一個階段', freeBuild: true },
  { text: '企業贊助地方建設！\n免費幫你的一塊空地加蓋一個階段', freeBuild: true },
];

const FATE_CARDS = [
  { text: '被爆料！開記者會澄清，\n付公關費 $100', money: -100 },
  { text: '宣傳車違規停車，\n罰款 $50', money: -50 },
  { text: '颱風把競選看板吹走了，\n重做看板付 $80', money: -80 },
  { text: '遊行人潮把路塞爆，\n前往塞車格，暫停一回合', jam: true },
  { text: '民調下滑，\n退後 2 格', move: -2 },
  { text: '口誤被做成迷因，聲量大漲！\n獲得 $50', money: 50 },
  { text: '競選總部要繳水電費，\n每一層付 $25', perLevel: 25 },
  { text: '失言被罵翻，\n支持者 -200', fans: -200 },
  { text: '政見跳票被抓包，\n支持者 -250', fans: -250 },
  { text: '造勢晚會遇到大雨，花 $80，\n支持者 -100', money: -80, fans: -100 },
  { text: '被假消息抹黑，\n支持者 -150', fans: -150 },
  { text: '幫鄰居修路有功，口碑變好，\n支持者 +150', fans: 150 },
  { text: '戰將醜聞！', scandal: true },
  { text: '戰將醜聞！', scandal: true },
];

// AI 畫的建築圖：把圖片放到 assets/buildings/ 資料夾，再在這裡登記。
// key 要跟上面 TILES 的 icon 名稱一樣；沒登記的地標會用程式畫的小像素圖代替。
// 圖片建議：透明背景、建築底部置中、寬度約 256 像素。
const BUILDING_IMAGES = {
  site: 'assets/buildings/site.png',       // 蓋到一半：工地
  office: 'assets/buildings/office.png',   // 小建築
  bopiliao: 'assets/buildings/bopiliao.png',
  dihua: 'assets/buildings/dihua.png',
  xiahai: 'assets/buildings/xiahai.png',
  dadaocheng: 'assets/buildings/dadaocheng.png',
  xingtian: 'assets/buildings/xingtian.png',
  artmuseum: 'assets/buildings/artmuseum.png',
  raohe: 'assets/buildings/raohe.png',
  airport: 'assets/buildings/airport.png',
  cityhall: 'assets/buildings/cityhall.png',
  daanpark: 'assets/buildings/daanpark.png',
  ntu: 'assets/buildings/ntu.png',
  shida: 'assets/buildings/shida.png',
  zoo: 'assets/buildings/zoo.png',
  maokong: 'assets/buildings/maokong.png',
  nccu: 'assets/buildings/nccu.png',
  nangangexpo: 'assets/buildings/nangangexpo.png',
  sinica: 'assets/buildings/sinica.png',
  nangangstation: 'assets/buildings/nangangstation.png',
  ferriswheel: 'assets/buildings/ferriswheel.png',
  sciencepark: 'assets/buildings/sciencepark.png',
  bishan: 'assets/buildings/bishan.png',
  shilinresidence: 'assets/buildings/shilinresidence.png',
  beitoulibrary: 'assets/buildings/beitoulibrary.png',
  guandu: 'assets/buildings/guandu.png',
  longshan: 'assets/buildings/longshan.png',
  redhouse: 'assets/buildings/redhouse.png',
  station: 'assets/buildings/station.png',
  beitou: 'assets/buildings/beitou.png',
  nightmarket: 'assets/buildings/nightmarket.png',
  palace: 'assets/buildings/palace.png',
  grandhotel: 'assets/buildings/grandhotel.png',
  arena: 'assets/buildings/arena.png',
  sunyatsen: 'assets/buildings/sunyatsen.png',
  cks: 'assets/buildings/cks.png',
  presidential: 'assets/buildings/presidential.png',
  taipei101: 'assets/buildings/taipei101.png',
  chief: 'assets/buildings/chief.png',     // 里長辦公處（12 區共用）
  talent: 'assets/buildings/talent.png',   // 戰將招募站（造勢小舞台）
  quiz: 'assets/buildings/quiz.png',       // 英文挑戰格（小黑板和書）
  // 路上的格子和道具
  go: 'assets/buildings/go.png',
  jam: 'assets/buildings/jam.png',
  mrt: 'assets/buildings/mrt.png',
  siren: 'assets/buildings/siren.png',
  chance: 'assets/buildings/chance.png',
  ballot: 'assets/buildings/ballot.png',
  flag: 'assets/buildings/flag.png', // 白色旗子，遊戲裡會染成玩家的顏色
  // 場地：菱形地板格子、河水、樹、噴水池
  grass_tile: 'assets/ground/iso_grass.png',
  road_tile: 'assets/ground/iso_road.png',
  plaza_tile: 'assets/ground/iso_plaza.png',
  water: 'assets/ground/water.png',
  tree1: 'assets/ground/tree1.png',
  tree2: 'assets/ground/tree2.png',
  tree3: 'assets/ground/tree3.png',
  fountain: 'assets/ground/fountain.png',
};
