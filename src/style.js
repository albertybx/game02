// =====================================================================
// 畫面風格切換（測試中）
// 網址後面加 ?style=2 就會用新風格，例如 https://albertybx.github.io/game02/?style=2
// 沒加就是原本的風格，一般玩家看不到這個開關。
// 新風格的圖放在 assets/style2/，檔名和原本的一樣；STYLE2_FILES 沒列到的圖就照用原本的。
// =====================================================================
const STYLE = (() => {
  try { return new URLSearchParams(window.location.search).get('style') === '2' ? 2 : 1; } catch (e) { return 1; }
})();

// 風格 2 已經有新圖的檔案
const STYLE2_FILES = new Set([
  'assets/ground/iso_grass.png',
  'assets/ground/iso_road.png',
  'assets/ground/iso_plaza.png',
  'assets/ground/water.png',
  'assets/ground/tree1.png',
  'assets/ground/tree2.png',
  'assets/ground/tree3.png',
]);

// 圖片路徑：風格 2 而且有新圖，就換成 assets/style2/ 裡的
function stylePath(path) {
  return STYLE === 2 && STYLE2_FILES.has(path) ? path.replace('assets/', 'assets/style2/') : path;
}

// 地圖的顏色：海岸側面、各區草地的顏色、區界線
// tints 是 null 就用 game.js 原本的 DISTRICT_TINTS
const MAP_STYLE = STYLE === 2 ? {
  cliffRight: 0x7a5038, cliffRightTop: 0x9b6d4b,
  cliffLeft: 0x93623f, cliffLeftTop: 0xb3825a,
  tintAlpha: 0.7,
  tints: {
    中正區: 0x6da055, 萬華區: 0x487453, 大同區: 0xa6b550, 中山區: 0xb8cf78, 士林區: 0x90c95f, 北投區: 0x536c55,
    內湖區: 0x97d562, 松山區: 0xc2d68a, 南港區: 0x7ab283, 信義區: 0x7fa35a, 文山區: 0x5f8a4e, 大安區: 0xa9c06a,
  },
  borderAlpha: 0.12,
  roadLineAlpha: 0,      // 路面格子之間不畫線（路看起來是連續的一條）
  outline: 0x2b2433,     // 深色邊線：道路外緣、島嶼邊緣、懸崖轉角和底部
  shoreLine: 0xe8eef2,   // 岸邊和水面交界的白色細邊
  treeRate: 0.45,        // 樹的多寡（1 = 跟原本一樣多）
  treeTint: 0xb4c8ac,    // 樹的顏色稍微壓深
} : {
  cliffRight: 0x6b4226, cliffRightTop: 0x7d7d7d,
  cliffLeft: 0x8a5a33, cliffLeftTop: 0x9e9e9e,
  tintAlpha: 0.45,
  tints: null,
  borderAlpha: 0.55,
  roadLineAlpha: 0.5,
  outline: null,
  shoreLine: null,
  treeRate: 1,
  treeTint: null,
};
