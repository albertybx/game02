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
    scene: [TitleScene, GameScene, HudScene],
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

// 聲音解鎖：瀏覽器只在使用者「點完」（手指放開、滑鼠放開、按鍵）的當下允許開始發聲。
// 在整個網頁上監聽，點畫面任何地方都能開啟音樂和音效。
['pointerup', 'touchend', 'mouseup', 'click', 'keydown'].forEach((ev) => {
  document.addEventListener(ev, () => Sfx.unlock(), { capture: true, passive: true });
});
// 切到別的 App 再回來時，iPhone 會暫停聲音；回來後點一下就會恢復

// 在標題畫面轉螢幕（直↔橫）時，重新整理換成對應的版面；遊戲進行中不打斷
window.addEventListener('resize', () => {
  const nowLandscape = window.innerWidth > window.innerHeight * 1.05;
  if (nowLandscape === LANDSCAPE || !window.__game) return;
  if (window.__game.scene.isActive('title')) location.reload();
});
