// 台北政壇大富翁 — 共用工具
// 共用設定、音效、按鈕。

// 畫面方向：螢幕是橫的（電腦、平板橫放）用寬版面 1280x760；直的（手機）用直版面 720x1120。
// 打開網頁時決定；在標題畫面轉螢幕會自動重新整理。
const LANDSCAPE = window.innerWidth > window.innerHeight * 1.05;
const W = LANDSCAPE ? 1280 : 720;
// 直版的高度跟著手機螢幕比例調整，讓畫面填滿整個手機螢幕（不會上下留黑邊）
const H = LANDSCAPE ? 760 : Math.round(Phaser.Math.Clamp(720 * window.innerHeight / window.innerWidth, 1040, 1560));
// 直版內容是照 1120 高設計的，畫面比較高時，標題和結算畫面往下移一半的差距，保持置中
const TALL_DY = LANDSCAPE ? 0 : Math.round((H - 1120) / 2);
// 扣掉介面之後，地圖看得到的範圍（角色會出現在這塊的中間）
const MAP_VIEW = LANDSCAPE ? { x: 300, y: 0, w: 980, h: 630 } : { x: 0, y: 136, w: 720, h: H - 250 - 136 };
// 地圖鏡頭的預設放大倍率、最小、最大
const ZOOM = { start: LANDSCAPE ? 1.15 : 1.65, min: 0.6, max: 2.4 };
const TILE = 120;           // 每格大小
const BOARD = 6;            // 地圖每邊 6 格（含角落）→ 一圈 20 格
const FONT = 'Cubic11, monospace';
const COLORS = {
  bg: 0x1d2b53,
  boardCenter: 0x83c46c,
  tile: 0xfff1e8,
  border: 0x000000,
  panel: 0x29366f,
  yellow: 0xffec27,
};

const hex = (s) => parseInt(s.replace('#', ''), 16);

// ---------- 8-bit 音效（用瀏覽器內建合成器發出方波「嗶」聲） ----------
const Sfx = {
  ctx: null,
  muted: false,
  // 瀏覽器規定：要使用者點過畫面才能發出聲音。第一次點的時候建立音效系統、開始播音樂
  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();   // 總音量
      this.master.gain.value = 0.9;
      this.master.connect(this.ctx.destination);
      this.bus = this.ctx.createGain();      // 音效音量
      this.bus.gain.value = 1;
      this.bus.connect(this.master);
      Music.init(this.ctx, this.master);     // 背景音樂（music.js）
    }
    if (this.ctx.state !== 'running') this.ctx.resume();
    // iPhone：要在點擊的當下真的播一個（無聲的）聲音，音效系統才會被啟動
    const buf = this.ctx.createBuffer(1, 1, 22050);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.connect(this.ctx.destination);
    src.start(0);
    // iPhone 靜音開關：把網頁聲音當成「媒體播放」，靜音開關打開時也聽得到（iOS 17 以後）
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) { /* 不支援就算了 */ }
  },
  get ready() { return !!this.ctx && this.ctx.state === 'running'; },
  beep(freq = 440, dur = 0.06, type = 'square', vol = 0.06, delay = 0) {
    if (this.muted || !this.ctx) return;
    const t = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain).connect(this.bus);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  },
  tune(notes, step = 0.09) {
    notes.forEach((f, i) => this.beep(f, step * 0.9, 'square', 0.06, i * step));
  },
  click() { this.beep(660, 0.04); },
  hop() { this.beep(520, 0.05, 'square', 0.04); },
  coin() { this.tune([988, 1319], 0.07); },
  pay() { this.tune([392, 262], 0.1); },
  buy() { this.tune([523, 659, 784, 1047], 0.08); },
  bad() { this.tune([330, 311, 294, 277], 0.12); },
  win() { this.tune([523, 523, 784, 784, 880, 880, 784, 0, 698, 698, 659, 659, 587, 587, 523], 0.13); },
};

// ---------- 共用：像素風按鈕 ----------
function makeButton(scene, x, y, w, h, label, opts = {}) {
  const fill = opts.fill ?? 0xffa300;
  const c = scene.add.container(x, y);
  const shadow = scene.add.rectangle(4, 4, w, h, 0x000000).setOrigin(0.5);
  const body = scene.add.rectangle(0, 0, w, h, fill).setOrigin(0.5).setStrokeStyle(4, 0x000000);
  const shine = scene.add.rectangle(0, -h / 2 + 6, w - 12, 4, 0xffffff, 0.35).setOrigin(0.5);
  const text = scene.add.text(0, 0, label, {
    fontFamily: FONT, fontSize: opts.fontSize || '28px', color: opts.color || '#000000', align: 'center',
  }).setOrigin(0.5);
  c.add([shadow, body, shine, text]);
  c.setSize(w, h);
  c.body = body;
  c.label = text;
  c.setEnabled = (on) => {
    c.enabled = on;
    body.setFillStyle(on ? fill : 0x5f574f);
    text.setColor(on ? (opts.color || '#000000') : '#c2c3c7');
  };
  c.setEnabled(opts.disabled ? false : true);
  c.setInteractive({ useHandCursor: true });
  c.on('pointerdown', () => {
    if (!c.enabled) return;
    body.setPosition(3, 3); text.setPosition(3, 3); shine.setPosition(3, -h / 2 + 9);
  });
  const release = () => { body.setPosition(0, 0); text.setPosition(0, 0); shine.setPosition(0, -h / 2 + 6); };
  c.on('pointerout', release);
  c.on('pointerup', () => {
    release();
    if (!c.enabled) return;
    Sfx.unlock();
    Sfx.click();
    if (opts.onClick) opts.onClick();
  });
  return c;
}

function makeCharacterTexture(scene, idx) {
  const ch = CHARACTERS[idx];
  makePixelTexture(scene, `char${idx}`, ART[ch.body], { H: ch.hair, S: ch.suit, T: ch.tie });
  makePixelTexture(scene, `flag${idx}`, ART.flag, { T: ch.color });
}


// 角色圖：有 AI 畫的圖（charimg0…）就用，沒有就用像素小圖。height = 想要的顯示高度
function addCharacter(scene, x, y, idx, height) {
  const key = scene.textures.exists(`charimg${idx}`) ? `charimg${idx}` : `char${idx}`;
  const img = scene.add.image(x, y, key);
  img.setScale(height / img.height);
  return img;
}

// 圖示：有 AI 畫的圖（bld_xxx）就用，沒有就用像素小圖。height = 想要的顯示高度
function addIcon(scene, x, y, icon, height) {
  const key = scene.textures.exists(`bld_${icon}`) ? `bld_${icon}` : icon;
  const img = scene.add.image(x, y, key);
  img.setScale(height / img.height);
  return img;
}

// 大頭照：只顯示角色圖的頭部，縮放到 size x size 的方框裡（左上角在 x, y）
// AI 角色圖的頭在上面約 45%；像素小圖的頭在第 1～8 行
const HEAD_CROP = { ai: { x: 0.12, y: 0.0, w: 0.76, h: 0.46 }, pixel: { x: 3 / 16, y: 0, w: 10 / 16, h: 8 / 16 } };
function addHeadshot(scene, x, y, idx, size) {
  const ai = scene.textures.exists(`charimg${idx}`);
  const img = scene.add.image(0, 0, ai ? `charimg${idx}` : `char${idx}`).setOrigin(0, 0);
  const r = ai ? HEAD_CROP.ai : HEAD_CROP.pixel;
  const cx = img.width * r.x;
  const cy = img.height * r.y;
  const cw = img.width * r.w;
  const ch = img.height * r.h;
  img.setCrop(cx, cy, cw, ch);
  const s = size / Math.max(cw, ch);
  img.setScale(s);
  img.setPosition(x - cx * s + (size - cw * s) / 2, y - cy * s + (size - ch * s) / 2);
  return img;
}

// 打開網頁視窗（選戰指南、英文挑戰）時，暫停遊戲畫面的點擊，
// 免得點視窗上的按鈕時，「穿透」按到底下遊戲的按鈕或建築
function setGameInput(on) {
  if (!window.__game) return;
  const apply = () => window.__game.scene.getScenes(true).forEach((s) => { if (s.input) s.input.enabled = on; });
  if (on) setTimeout(apply, 80); // 關視窗後稍等一下再打開，吃掉最後那一下點擊
  else apply();
}
