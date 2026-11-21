// 遊戲資料：地圖格子、角色、機會/命運卡。
// 想調整價錢、換角色名字、加新卡片，改這個檔案就好，不用動遊戲程式。

const GAME_RULES = {
  startMoney: 1500,   // 每人一開始的錢
  passGoBonus: 200,   // 經過起點拿的錢
  maxRounds: 20,      // 第幾回合結束就是「投票日」，比誰的支持者最多
  startFans: 1000,    // 每人一開始的支持者
  maxLevel: 3,        // 地標的競選總部最多蓋幾層
  rentMultiplier: [1, 4, 10, 20], // 地標 0~3 層時，過路費是基本過路費的幾倍
  towFine: 100,       // 拖吊場罰款
  startSpread: 2,     // 起點錯開：第 2 位玩家從第 2 格出發、第 3 位第 4 格…（先擲骰的人才不會太有利）

  // ---- 地標（賺錢為主，也帶來一些支持者）----
  buyFansRate: 0.5,     // 買下地標：支持者 + 價錢 × 0.5
  buildFansRate: 0.5,   // 蓋一層競選總部：支持者 + 價錢 × 0.5
  landmarkFansRate: 0.15, // 【A】每回合開始：每個地標帶來 價錢 × 0.15 ×（總部層數 + 1）位支持者
  landmarkStealRate: 0.2, // 【B】對手踩到你的地標：倒戈 價錢 × 0.2 ×（總部層數 + 1）位支持者
  landmarkUpkeepRate: 0.02, // 地標租金：每回合開始付 價錢 × 0.02 ×（總部層數 + 1）

  // ---- 里長（便宜、過路費低，但帶來比較多支持者）----
  chiefBuyFans: 200,    // 拉攏里長：支持者 + 200
  chiefFansPerTurn: 50, // 【A】每回合開始：每位里長帶來 50 位支持者
  chiefSteal: 80,       // 【B】對手踩到你的里長格：倒戈 80 位支持者
  chiefRentRate: 0.1,   // 里長格過路費：價錢 × 0.1
  chiefVisits: 2,       // 要拜訪幾次才拉攏得到（每次付 價錢 ÷ 2）
  chiefFeeEvery: 3,     // 每擁有幾回合，要付一次「地方經營費」
  chiefFeeRate: 0.4,    // 地方經營費 = 價錢 × 0.4（付不出來，里長就跑掉）

  // ---- 其他 ----
  districtBonus: 100,   // 整區加成：同一區（2 格以上）的地標和里長全部拿下，每回合再 + 100 位支持者
  rallyCost: 150,       // 造勢晚會：擲骰子前可以花錢辦
  rallyFans: 200,       //   換到的支持者
  rallyMax: 2,          //   每場最多辦幾次
  finalRounds: 10,      // 選前衝刺：最後 10 回合（10 回合的短局是最後 5 回合），支持者的增減一回合比一回合大
  finalStep: 0.1,       //   每回合多 10%（最後一回合 ×2）
  debateGap: 600,       // 辯論挑戰：下半場，落後第一名這麼多支持者時可以發起
  debateCost: 100,
  debateFans: 250,      //   發起的人贏了：第一名有這麼多支持者倒戈過來（每人每場一次）
  debateLoseFans: 100,  //   發起的人輸了：自己有這麼多支持者倒戈給第一名


  // ---- 特殊挑戰：英文學習格（首頁可以選擇要不要加入）----
  quizMoney: 200,        // 答對：錢 + 200（大幅）
  quizFans: 80,          // 答對：支持者 + 80（小幅）
  quizWrongFans: 50,     // 答錯：支持者 - 50（小幅）
  quizCpuAccuracy: 0.6,  // 電腦玩家答對的機率
};

// 首頁可以選的回合數
const ROUND_OPTIONS = [10, 20, 30];

// 台北市 12 個行政區（地標和里長都屬於某一區；同一區全部買下，地標空地過路費加倍）
const DISTRICTS = ['中正區', '大安區', '文山區', '信義區', '南港區', '內湖區', '松山區', '中山區', '士林區', '北投區', '大同區', '萬華區'];

// 地圖路線：台北市的形狀（北邊是士林、北投，東邊是內湖、南港，南邊是文山，西邊是萬華、大同）。
// 每個點是一個轉彎處 [col, row]，路線會照順序一格一格連起來，最後回到第一個點。
// 路線總長度要剛好等於 TILES 的格數（36 格）。
const MAP_ROUTE = [
  [2, 7], [2, 9], [5, 9], [5, 11], [8, 11], [8, 9], [10, 9],
  [10, 5], [6, 5], [6, 1], [3, 1], [3, 4], [2, 4],
];

// 地圖 36 格，從「起點」（台北車站旁）出發。
// type: go 起點 / property 地標 / chief 里長 / chance 機會 / fate 命運 / talent 戰將招募站
//       / jam 塞車 / mrt 捷運站 / tow 拖吊場
const TILES = [
  { type: 'go',       name: '起點',         icon: 'go' },
  { type: 'property', name: '台北車站',     icon: 'station',      price: 100, district: '中正區' },
  { type: 'chief',    name: '中正區里長',   icon: 'chief',        price: 120, district: '中正區' },
  { type: 'property', name: '總統府',       icon: 'presidential', price: 300, district: '中正區' },
  { type: 'chance',   name: '機會',         icon: 'chance' },
  { type: 'property', name: '中正紀念堂',   icon: 'cks',          price: 240, district: '中正區' },
  { type: 'chief',    name: '大安區里長',   icon: 'chief',        price: 140, district: '大安區' },
  { type: 'fate',     name: '命運',         icon: 'ballot' },
  { type: 'chief',    name: '文山區里長',   icon: 'chief',        price: 90,  district: '文山區' },
  { type: 'jam',      name: '塞車',         icon: 'jam' },
  { type: 'property', name: '國父紀念館',   icon: 'sunyatsen',    price: 220, district: '信義區' },
  { type: 'chief',    name: '信義區里長',   icon: 'chief',        price: 140, district: '信義區' },
  { type: 'property', name: '台北101',      icon: 'taipei101',    price: 350, district: '信義區' },
  { type: 'talent',   name: '戰將招募站',   icon: 'talent' },
  { type: 'chief',    name: '南港區里長',   icon: 'chief',        price: 90,  district: '南港區' },
  { type: 'chance',   name: '機會',         icon: 'chance' },
  { type: 'chief',    name: '內湖區里長',   icon: 'chief',        price: 110, district: '內湖區' },
  { type: 'fate',     name: '命運',         icon: 'ballot' },
  { type: 'mrt',      name: '捷運站',       icon: 'mrt' },
  { type: 'property', name: '小巨蛋',       icon: 'arena',        price: 200, district: '松山區' },
  { type: 'chief',    name: '松山區里長',   icon: 'chief',        price: 110, district: '松山區' },
  { type: 'property', name: '圓山飯店',     icon: 'grandhotel',   price: 180, district: '中山區' },
  { type: 'chief',    name: '中山區里長',   icon: 'chief',        price: 120, district: '中山區' },
  { type: 'chance',   name: '機會',         icon: 'chance' },
  { type: 'property', name: '故宮',         icon: 'palace',       price: 160, district: '士林區' },
  { type: 'property', name: '士林夜市',     icon: 'nightmarket',  price: 140, district: '士林區' },
  { type: 'chief',    name: '士林區里長',   icon: 'chief',        price: 100, district: '士林區' },
  { type: 'tow',      name: '拖吊場',       icon: 'siren' },
  { type: 'property', name: '北投溫泉',     icon: 'beitou',       price: 120, district: '北投區' },
  { type: 'chief',    name: '北投區里長',   icon: 'chief',        price: 90,  district: '北投區' },
  { type: 'talent',   name: '戰將招募站',   icon: 'talent' },
  { type: 'chief',    name: '大同區里長',   icon: 'chief',        price: 80,  district: '大同區' },
  { type: 'fate',     name: '命運',         icon: 'ballot' },
  { type: 'property', name: '西門紅樓',     icon: 'redhouse',     price: 60,  district: '萬華區' },
  { type: 'property', name: '龍山寺',       icon: 'longshan',     price: 60,  district: '萬華區' },
  { type: 'chief',    name: '萬華區里長',   icon: 'chief',        price: 80,  district: '萬華區' },
];

// 加入「英文挑戰」時，把下面這幾格換成英文挑戰格（散在地圖的南、東、西北）
const QUIZ_TILE = { type: 'quiz', name: '英文挑戰', icon: 'quiz' };
const QUIZ_TILE_SLOTS = [7, 15, 32]; // 原本是：命運、機會、命運（兩個戰將招募站都保留）
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
  1:  { name: '廟口人情', text: '跑紅白帖的效果 ×2' },
  2:  { name: '菜市場情報', text: '駐守防守時，三項能力 +1' },
  3:  { name: '效率至上', text: '出任務少花 1 回合（最少 1 回合）' },
  4:  { name: '名嘴開講', text: '拔樁戰出「演講」+1' },
  5:  { name: '志工動員', text: '選民服務的效果 ×2' },
  6:  { name: '醫德清白', text: '不會鬧醜聞' },
  7:  { name: '國手魅力', text: '拔樁戰出「造勢」+1' },
  8:  { name: '辯論高手', text: '辯論挑戰時，三項能力 +2' },
  9:  { name: '晨跑達人', text: '遠端派任務也不打折' },
  10: { name: '直來直往', text: '拔樁戰平手時算他贏' },
  11: { name: '貓派穩定', text: '忠誠度不會低於 60，挖角挖不走' },
};

// 派任務：用哪項能力、要離開幾回合
const MISSIONS = [
  { key: 'wedding', name: '跑紅白帖', stat: 'charisma', turns: 1, note: '不花錢' },
  { key: 'service', name: '選民服務', stat: 'network', turns: 2, note: '那一格樁腳更穩 +1' },
  { key: 'media', name: '媒體宣傳', stat: 'eloquence', turns: 3, note: '要花錢，效果 ×1.5' },
];

const GENERAL_RULES = {
  maxPerPlayer: Infinity, // 每人最多幾位戰將（沒有上限）
  recruitCost: 300,       // 招募費
  recruitChoices: 2,      // 招募站一次翻幾張
  startLoyalty: 80,       // 剛加入時的忠誠度
  poachBelow: 60,         // 忠誠度低於多少，就可能被挖角
  poachCost: 400,         // 挖角要付的錢（成功才付）
  // 任務（在自己的里長格派出）：支持者 + 基本 + 能力 × 倍數 + 骰子 × 10
  missionBase: 60,
  missionPerStat: 30,
  mediaCost: 100,         // 媒體宣傳要花的錢（效果比較大）
  mediaBonus: 1.5,        // 媒體宣傳的效果倍數
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
