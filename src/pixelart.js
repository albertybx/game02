// 像素圖：每張圖是 16x16 的文字格子，一個字元 = 一個像素。
// '.' 是透明，其他字母對照下面的 PALETTE 顏色。
// 想改圖，直接改字母就好；想加新顏色，在 PALETTE 加一行。

const PALETTE = {
  k: '#000000', // 黑
  w: '#fff1e8', // 白
  g: '#5f574f', // 深灰
  l: '#c2c3c7', // 淺灰
  r: '#ff004d', // 紅
  R: '#7e2553', // 暗紅
  o: '#ffa300', // 橘
  y: '#ffec27', // 黃
  G: '#00e436', // 綠
  d: '#008751', // 深綠
  b: '#29adff', // 藍
  B: '#1d2b53', // 深藍
  p: '#ff77a8', // 粉紅
  n: '#ab5236', // 咖啡
  s: '#ffccaa', // 膚色
  // 下面 H/S/T 是角色用的「可替換顏色」，畫角色時會換成各自的顏色
  H: '#000000', // 頭髮
  S: '#1d2b53', // 西裝
  T: '#ff004d', // 領帶
};

const ART = {
  // ===== 台北地標 =====
  taipei101: [
    '.......kk.......',
    '.......ll.......',
    '.......ll.......',
    '......kddk......',
    '.....dbbbbd.....',
    '......kddk......',
    '.....dbbbbd.....',
    '......kddk......',
    '.....dbbbbd.....',
    '......kddk......',
    '.....dbbbbd.....',
    '......dbbd......',
    '.....dbbbbd.....',
    '....dbbbbbbd....',
    '....dbbkkbbd....',
    '..dddddddddddd..',
  ],
  presidential: [ // 總統府
    '.......ww.......',
    '.......rr.......',
    '......rwwr......',
    '......rkkr......',
    '......rwwr......',
    '......rkkr......',
    '......rrrr......',
    '.wwwwwwwwwwwwww.',
    '.rrrrrrrrrrrrrr.',
    '.rkrkrkrrkrkrkr.',
    '.wwwwwwwwwwwwww.',
    '.rrrrrrrrrrrrrr.',
    '.rkrkrkwwkrkrkr.',
    '.rrrrrrwwrrrrrr.',
    '.wwwwwwwwwwwwww.',
    'gggggggggggggggg',
  ],
  cks: [ // 中正紀念堂
    '.......yy.......',
    '......BBBB......',
    '.....BBBBBB.....',
    '....BBBBBBBB....',
    '...yyyyyyyyyy...',
    '.....BBBBBB.....',
    '....BBBBBBBB....',
    '..yyyyyyyyyyyy..',
    '...wwwwwwwwww...',
    '...wwwwkkwwww...',
    '...wwwwkkwwww...',
    '...wwwwkkwwww...',
    '..wwwwwwwwwwww..',
    '.llllllllllllll.',
    'llllllllllllllll',
    'llllllllllllllll',
  ],
  sunyatsen: [ // 國父紀念館
    '................',
    '................',
    '................',
    'y..............y',
    'yy............yy',
    '.yyyyyyyyyyyyyy.',
    '..oooooooooooo..',
    '...yyyyyyyyyy...',
    '...wwwwwwwwww...',
    '...rwwrwwrwwr...',
    '...rwwrwwrwwr...',
    '...rwwrkkrwwr...',
    '...rwwrkkrwwr...',
    '..llllllllllll..',
    '.llllllllllllll.',
    '................',
  ],
  longshan: [ // 龍山寺
    '................',
    '.G............G.',
    '.GG..yyyyyy..GG.',
    '..rrrrrrrrrrrr..',
    '.rrrrrrrrrrrrrr.',
    '...nnnnnnnnnn...',
    '...nyynyynyyn...',
    '.G............G.',
    '.GG..yyyyyy..GG.',
    '..rrrrrrrrrrrr..',
    '.rrrrrrrrrrrrrr.',
    '..nnnnnnnnnnnn..',
    '..nrrrrkkrrrrn..',
    '..nrrrrkkrrrrn..',
    '.llllllllllllll.',
    'llllllllllllllll',
  ],
  redhouse: [ // 西門紅樓
    '................',
    '.......kk.......',
    '......RRRR......',
    '.....RRRRRR.....',
    '....wwwwwwww....',
    '....rrrrrrrr....',
    '...rrrrrrrrrr...',
    '..rrwrrwwrrwrr..',
    '..rrwrrwwrrwrr..',
    '..rrrrrrrrrrrr..',
    '..wwwwwwwwwwww..',
    '..rrrrrrrrrrrr..',
    '..rrwrrkkrrwrr..',
    '..rrwrrkkrrwrr..',
    '.llllllllllllll.',
    '................',
  ],
  station: [ // 台北車站
    '................',
    '................',
    '......nnnn......',
    '.....nnnnnn.....',
    '....nnnnnnnn....',
    '...yyyyyyyyyy...',
    '..oooooooooooo..',
    '..wwwwwwwwwwww..',
    '..wbwbwbbwbwbw..',
    '..wbwbwbbwbwbw..',
    '..wwwwwwwwwwww..',
    '..wbwbwbbwbwbw..',
    '..wbwbwbbwbwbw..',
    '..wwwwwkkwwwww..',
    '.llllllllllllll.',
    '................',
  ],
  grandhotel: [ // 圓山大飯店
    '................',
    '.......yy.......',
    '.....oooooo.....',
    '....oooooooo....',
    '.....rrrrrr.....',
    '.oooooooooooooo.',
    'oooooooooooooooo',
    '.rrrrrrrrrrrrrr.',
    '.ryryryryryryry.',
    '.rrrrrrrrrrrrrr.',
    '.ryryryryryryry.',
    '.rrrrrrrrrrrrrr.',
    '.rrrrrrkkrrrrrr.',
    '.rrrrrrkkrrrrrr.',
    'GGGGGGGGGGGGGGGG',
    'dddddddddddddddd',
  ],
  palace: [ // 故宮
    '................',
    '................',
    '......GGGG......',
    '....GGGGGGGG....',
    '...yyyyyyyyyy...',
    '.....wwwwww.....',
    '.GGGGGGGGGGGGGG.',
    'GGGGGGGGGGGGGGGG',
    '.yyyyyyyyyyyyyy.',
    '.wwwwwwwwwwwwww.',
    '.wwbwwwwwwwwbww.',
    '.wwwwwwkkwwwwww.',
    '.wwwwwwkkwwwwww.',
    'llllllllllllllll',
    '.llllllllllllll.',
    '..llllllllllll..',
  ],
  nightmarket: [ // 士林夜市
    '................',
    '.r..r..r..r..r..',
    '.o..o..o..o..o..',
    'rrwwrrwwrrwwrrww',
    'rrwwrrwwrrwwrrww',
    '.n............n.',
    '.n..yy....yy..n.',
    '.n..yy....yy..n.',
    '.nnnnnnnnnnnnnn.',
    '.noooonnnnoooon.',
    '.nnnnnnnnnnnnnn.',
    '................',
    '..s....s....s...',
    '.rrr..bbb..GGG..',
    '.rrr..bbb..GGG..',
    '..k....k....k...',
  ],
  beitou: [ // 北投溫泉
    '..l....l....l...',
    '.l....l....l....',
    '..l....l....l...',
    '...l....l....l..',
    '..l....l....l...',
    '................',
    '...nnnnnnnnnn...',
    '..nnnnnnnnnnnn..',
    '...wwwwwwwwww...',
    '...wnnwwwwnnw...',
    '...wnnwkkwnnw...',
    '...wwwwkkwwww...',
    'llllllllllllllll',
    'lbbbbbbbbbbbbbbl',
    'lbbwbbbbbbwbbbbl',
    'llllllllllllllll',
  ],
  arena: [ // 小巨蛋
    '................',
    '................',
    '................',
    '......wwww......',
    '....wwwwwwww....',
    '...wwlwwwwlww...',
    '..wwwwwwwwwwww..',
    '.wwwwwwwwwwwwww.',
    '.llllllllllllll.',
    '.bbbbbbbbbbbbbb.',
    '.bkbkbkbbkbkbkb.',
    '.bbbbbbbbbbbbbb.',
    '.bbbbbbkkbbbbbb.',
    'llllllllllllllll',
    '................',
    '................',
  ],

  // ===== 角落與特殊格 =====
  go: [ // 起點箭頭（往左）
    '................',
    '................',
    '.......r........',
    '......rr........',
    '.....rrr........',
    '....rrrrrrrrrr..',
    '...rrrrrrrrrrr..',
    '..rrrrrrrrrrrr..',
    '...rrrrrrrrrrr..',
    '....rrrrrrrrrr..',
    '.....rrr........',
    '......rr........',
    '.......r........',
    '................',
    '................',
    '................',
  ],
  jam: [ // 塞車
    '................',
    '................',
    '................',
    '.....rrrrrr.....',
    '....rbbrrbbr....',
    '...rrbbrrbbrr...',
    '.rrrrrrrrrrrrrr.',
    '.ryrrrrrrrrrryr.',
    '.rrrrrrrrrrrrrr.',
    '..kkk......kkk..',
    '..klk......klk..',
    '..kkk......kkk..',
    '................',
    'yy..yy..yy..yy..',
    '................',
    '................',
  ],
  mrt: [ // 捷運
    '................',
    '................',
    '..llllllllllll..',
    '.llllllllllllll.',
    '.lbbbbllllbbbbl.',
    '.lbbbbllllbbbbl.',
    '.lbbbbllllbbbbl.',
    '.llllllllllllll.',
    '.bbbbbbbbbbbbbb.',
    '.llllllllllllll.',
    '.lyllllllllllyl.',
    '.llllllllllllll.',
    '..kk........kk..',
    'gggggggggggggggg',
    '................',
    '................',
  ],
  siren: [ // 拖吊（警示燈）
    '................',
    '..y....y....y...',
    '...y...y...y....',
    '................',
    '......rrrr......',
    '.....rrwwrr.....',
    '....rrwwrrrr....',
    '....rrrrrrrr....',
    '....rrrrrrrr....',
    '..gggggggggggg..',
    '..gggggggggggg..',
    '................',
    '................',
    '................',
    '................',
    '................',
  ],
  chance: [ // 機會（問號）
    '................',
    '.oooooooooooooo.',
    '.oyyyyyyyyyyyyo.',
    '.oyyyykkkkyyyyo.',
    '.oyyykkyykkyyyo.',
    '.oyyyyyyykkyyyo.',
    '.oyyyyyykkyyyyo.',
    '.oyyyyykkyyyyyo.',
    '.oyyyyykkyyyyyo.',
    '.oyyyyyyyyyyyyo.',
    '.oyyyyykkyyyyyo.',
    '.oyyyyykkyyyyyo.',
    '.oyyyyyyyyyyyyo.',
    '.oooooooooooooo.',
    '................',
    '................',
  ],
  ballot: [ // 命運（投票箱）
    '................',
    '.....wwwwww.....',
    '.....wkkkkw.....',
    '.....wwwwww.....',
    '......wwww......',
    '..BBBBkkkkBBBB..',
    '..bbbbbbbbbbbb..',
    '..bbwwwwwwwwbb..',
    '..bbwrrrrrrwbb..',
    '..bbwrwwwwrwbb..',
    '..bbwrrrrrrwbb..',
    '..bbwwwwwwwwbb..',
    '..bbbbbbbbbbbb..',
    '..BBBBBBBBBBBB..',
    '................',
    '................',
  ],
  flag: [ // 競選旗（蓋競選總部時的小標記）
    '................',
    '..k.............',
    '..kTTTTTTTT.....',
    '..kTTTTTTTT.....',
    '..kTTwwwwTT.....',
    '..kTTTTTTTT.....',
    '..kTTTTTTTT.....',
    '..k.............',
    '..k.............',
    '..k.............',
    '..k.............',
    '..k.............',
    '.kkk............',
    '................',
    '................',
    '................',
  ],

  // ===== 角色（H 頭髮 / S 西裝 / T 領帶 會換成角色自己的顏色） =====
  person_short: [
    '................',
    '.....HHHHHH.....',
    '....HHHHHHHH....',
    '....HHssssHH....',
    '....ssksskss....',
    '....ssssssss....',
    '.....ssrrss.....',
    '......ssss......',
    '...SSSwTTwSSS...',
    '..SSSSwTTwSSSS..',
    '..SSSSSTTSSSSS..',
    '..sSSSSTTSSSSs..',
    '....SSSSSSSS....',
    '....SSS..SSS....',
    '....SSS..SSS....',
    '...kkkk..kkkk...',
  ],
  person_long: [
    '................',
    '.....HHHHHH.....',
    '....HHHHHHHH....',
    '...HHHssssHHH...',
    '...HssksskssH...',
    '...HssssssssH...',
    '...HHssrrssHH...',
    '...HH.ssss.HH...',
    '...SSSwTTwSSS...',
    '..SSSSwTTwSSSS..',
    '..SSSSSTTSSSSS..',
    '..sSSSSTTSSSSs..',
    '...SSSSSSSSSS...',
    '....SSSSSSSS....',
    '.....ss..ss.....',
    '....kkk..kkk....',
  ],
  person_bald: [ // 頭頂比較亮的大叔
    '................',
    '................',
    '.....ssssss.....',
    '....ssssssss....',
    '....HssssssH....',
    '....ssksskss....',
    '....ssssssss....',
    '.....sHHHHs.....',
    '...SSSwTTwSSS...',
    '..SSSSwTTwSSSS..',
    '..SSSSSTTSSSSS..',
    '..sSSSSTTSSSSs..',
    '....SSSSSSSS....',
    '....SSS..SSS....',
    '....SSS..SSS....',
    '...kkkk..kkkk...',
  ],
};

// 骰子點數位置（16x16 圖裡的格子座標）
const DICE_PIPS = {
  1: [[7, 7]],
  2: [[4, 4], [10, 10]],
  3: [[3, 3], [7, 7], [11, 11]],
  4: [[4, 4], [10, 4], [4, 10], [10, 10]],
  5: [[3, 3], [11, 3], [7, 7], [3, 11], [11, 11]],
  6: [[4, 3], [10, 3], [4, 7], [10, 7], [4, 11], [10, 11]],
};

// 把文字格子畫成 Phaser 可以用的圖（texture）
function makePixelTexture(scene, key, rows, colorOverrides = {}) {
  if (scene.textures.exists(key)) scene.textures.remove(key);
  const size = 16;
  const tex = scene.textures.createCanvas(key, size, size);
  const ctx = tex.getContext();
  rows.forEach((row, y) => {
    if (row.length !== size) console.warn(`像素圖 ${key} 第 ${y} 行長度是 ${row.length}，應該是 16`);
    for (let x = 0; x < size; x++) {
      const ch = row[x];
      if (!ch || ch === '.' || ch === ' ') continue;
      ctx.fillStyle = colorOverrides[ch] || PALETTE[ch] || '#ff00ff';
      ctx.fillRect(x, y, 1, 1);
    }
  });
  tex.refresh();
}

function makeDiceTextures(scene) {
  for (let n = 1; n <= 6; n++) {
    const key = `dice${n}`;
    if (scene.textures.exists(key)) continue;
    const tex = scene.textures.createCanvas(key, 16, 16);
    const ctx = tex.getContext();
    ctx.fillStyle = '#000000';
    ctx.fillRect(1, 0, 14, 16);
    ctx.fillRect(0, 1, 16, 14);
    ctx.fillStyle = '#fff1e8';
    ctx.fillRect(1, 1, 14, 14);
    ctx.fillStyle = '#c2c3c7';
    ctx.fillRect(1, 14, 14, 1);
    ctx.fillStyle = n === 1 ? '#ff004d' : '#000000';
    for (const [px, py] of DICE_PIPS[n]) ctx.fillRect(px, py, 2, 2);
    tex.refresh();
  }
}
