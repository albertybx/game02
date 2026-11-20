// 遊戲資料：地圖格子、角色、機會/命運卡。
// 想調整價錢、換角色名字、加新卡片，改這個檔案就好，不用動遊戲程式。

const GAME_RULES = {
  startMoney: 1500,   // 每人一開始的錢
  passGoBonus: 200,   // 經過起點拿的錢
  maxRounds: 20,      // 第幾回合結束就是「投票日」，比總資產
  maxLevel: 3,        // 競選總部最多蓋幾層
  rentMultiplier: [1, 4, 10, 20], // 0~3 層時，過路費是基本過路費的幾倍
  towFine: 100,       // 拖吊場罰款
};

// 地產顏色組（同一組全部買下，空地過路費加倍）
const GROUPS = {
  brown:  '#ab5236',
  sky:    '#29adff',
  pink:   '#ff77a8',
  orange: '#ffa300',
  red:    '#ff004d',
  navy:   '#1d2b53',
};

// 地圖 20 格，從右下角「起點」開始，逆時針走一圈。
// type: go 起點 / property 地產 / chance 機會 / fate 命運 / jam 塞車 / mrt 捷運站 / tow 拖吊場
const TILES = [
  { type: 'go',       name: '起點',       icon: 'go' },
  { type: 'property', name: '龍山寺',     icon: 'longshan',     price: 60,  group: 'brown' },
  { type: 'chance',   name: '機會',       icon: 'chance' },
  { type: 'property', name: '西門紅樓',   icon: 'redhouse',     price: 60,  group: 'brown' },
  { type: 'property', name: '台北車站',   icon: 'station',      price: 100, group: 'sky' },
  { type: 'jam',      name: '塞車',       icon: 'jam' },
  { type: 'property', name: '北投溫泉',   icon: 'beitou',       price: 120, group: 'sky' },
  { type: 'fate',     name: '命運',       icon: 'ballot' },
  { type: 'property', name: '士林夜市',   icon: 'nightmarket',  price: 140, group: 'pink' },
  { type: 'property', name: '故宮',       icon: 'palace',       price: 160, group: 'pink' },
  { type: 'mrt',      name: '捷運站',     icon: 'mrt' },
  { type: 'property', name: '圓山飯店',   icon: 'grandhotel',   price: 180, group: 'orange' },
  { type: 'chance',   name: '機會',       icon: 'chance' },
  { type: 'property', name: '小巨蛋',     icon: 'arena',        price: 200, group: 'orange' },
  { type: 'property', name: '國父紀念館', icon: 'sunyatsen',    price: 220, group: 'red' },
  { type: 'tow',      name: '拖吊場',     icon: 'siren' },
  { type: 'property', name: '中正紀念堂', icon: 'cks',          price: 240, group: 'red' },
  { type: 'fate',     name: '命運',       icon: 'ballot' },
  { type: 'property', name: '總統府',     icon: 'presidential', price: 300, group: 'navy' },
  { type: 'property', name: '台北101',    icon: 'taipei101',    price: 350, group: 'navy' },
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
//   money: 拿到(正數)或付出(負數)多少錢
//   move: 前進(正)或後退(負)幾格
//   goto: 直接走到第幾格（會經過起點就領錢）
//   jam: 直接去塞車格並暫停一回合
//   fromEach: 每位對手付你多少錢
//   perLevel: 每一層競選總部要付多少錢
const CHANCE_CARDS = [
  { text: '政見發表會大成功！\n小額捐款湧入，獲得 $150', money: 150 },
  { text: '上政論節目爆紅，\n通告費 $100 入袋', money: 100 },
  { text: '掃街拜票握手握到手痠，\n前進 3 格', move: 3 },
  { text: '搭捷運去下一個行程，\n直接前往捷運站', goto: 10 },
  { text: '回到起點重新拉票，\n前往起點', goto: 0 },
  { text: '電視辯論表現亮眼！\n每位對手付你 $30', fromEach: 30 },
];

const FATE_CARDS = [
  { text: '被爆料！開記者會澄清，\n付公關費 $100', money: -100 },
  { text: '宣傳車違規停車，\n罰款 $50', money: -50 },
  { text: '颱風把競選看板吹走了，\n重做看板付 $80', money: -80 },
  { text: '遊行人潮把路塞爆，\n前往塞車格，暫停一回合', jam: true },
  { text: '民調下滑，\n退後 2 格', move: -2 },
  { text: '口誤被做成迷因，聲量大漲！\n獲得 $50', money: 50 },
  { text: '競選總部要繳水電費，\n每一層付 $25', perLevel: 25 },
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
  // 路上的格子和道具
  go: 'assets/buildings/go.png',
  jam: 'assets/buildings/jam.png',
  mrt: 'assets/buildings/mrt.png',
  siren: 'assets/buildings/siren.png',
  chance: 'assets/buildings/chance.png',
  ballot: 'assets/buildings/ballot.png',
  flag: 'assets/buildings/flag.png', // 白色旗子，遊戲裡會染成玩家的顏色
};
