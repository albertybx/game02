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
