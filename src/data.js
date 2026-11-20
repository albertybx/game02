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

  // ---- 地標（賺錢為主，也帶來一些支持者）----
  buyFansRate: 0.5,     // 買下地標：支持者 + 價錢 × 0.5
  buildFansRate: 0.5,   // 蓋一層競選總部：支持者 + 價錢 × 0.5
  landmarkFansRate: 0.1, // 【A】每回合開始：每個地標帶來 價錢 × 0.1 ×（總部層數 + 1）位支持者
  landmarkStealRate: 0.2, // 【B】對手踩到你的地標：倒戈 價錢 × 0.2 ×（總部層數 + 1）位支持者

  // ---- 里長（便宜、過路費低，但帶來比較多支持者）----
  chiefBuyFans: 300,    // 買下里長：支持者 + 300
  chiefFansPerTurn: 60, // 【A】每回合開始：每位里長帶來 60 位支持者
  chiefSteal: 80,       // 【B】對手踩到你的里長格：倒戈 80 位支持者
  chiefRentRate: 0.1,   // 里長格過路費：價錢 × 0.1

  talentFans: 150,      // 政壇人物格（戰將功能做好前的暫時效果）：支持者 + 150
};

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
// type: go 起點 / property 地標 / chief 里長 / chance 機會 / fate 命運 / talent 政壇人物
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
  { type: 'talent',   name: '政壇人物',     icon: 'talent' },
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
  { type: 'talent',   name: '政壇人物',     icon: 'talent' },
  { type: 'chief',    name: '大同區里長',   icon: 'chief',        price: 80,  district: '大同區' },
  { type: 'fate',     name: '命運',         icon: 'ballot' },
  { type: 'property', name: '西門紅樓',     icon: 'redhouse',     price: 60,  district: '萬華區' },
  { type: 'property', name: '龍山寺',       icon: 'longshan',     price: 60,  district: '萬華區' },
  { type: 'chief',    name: '萬華區里長',   icon: 'chief',        price: 80,  district: '萬華區' },
];

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
  talent: 'assets/buildings/talent.png',   // 政壇人物格（造勢小舞台）
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
