// 台北政壇大富翁 — 共用工具
// 共用設定、音效、按鈕。畫面 720 x 1120（直式，適合手機）。

const W = 720;
const H = 1120;
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
  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) this.ctx = new AC();
    }
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  },
  beep(freq = 440, dur = 0.06, type = 'square', vol = 0.06, delay = 0) {
    if (this.muted || !this.ctx) return;
    const t = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain).connect(this.ctx.destination);
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
