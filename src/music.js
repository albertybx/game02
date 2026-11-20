// =====================================================================
// 8-bit 背景音樂：用瀏覽器內建合成器即時演奏，模仿紅白機的 4 個聲道
//   lead 主旋律（方波 25%）、arp 和弦琶音（方波 12.5%）、bass 低音（三角波）、drum 鼓（雜音）
// 曲子都是原創，旋律用五聲音階（Do Re Mi Sol La），帶一點東方味。
//
// 樂譜寫法：一個記號 = 一個八分音符
//   C5 = 第 5 個八度的 Do；'-' = 前一個音延長；'.' = 休止；'|' 只是小節線，方便閱讀
// 和弦：每小節一個（C、Am、F、G…），低音和琶音會自動照和弦產生
// 鼓：K = 大鼓，S = 小鼓，h = 鈸，. = 不打（每小節 8 格）
// =====================================================================

const SONGS = {
  title: {
    bpm: 144,
    lead: `
      E5 G5 A5 G5 E5 D5 C5 D5 | E5 -  G5 -  A5 -  C6 -  | D6 C6 A5 G5 A5 -  G5 E5 | D5 -  -  -  .  .  D5 E5 |
      E5 G5 A5 G5 E5 D5 C5 D5 | E5 -  G5 -  A5 -  G5 A5 | C6 A5 G5 E5 D5 E5 D5 C5 | C5 -  -  -  .  .  G4 A4 |
      C5 -  C5 D5 E5 -  E5 G5 | A5 -  G5 E5 D5 -  C5 D5 | E5 -  E5 G5 A5 -  A5 C6 | D6 -  -  -  C6 -  A5 -  |
      G5 -  A5 G5 E5 -  D5 E5 | G5 -  E5 D5 C5 -  A4 C5 | D5 -  E5 -  G5 -  A5 -  | C6 -  -  -  -  -  .  .  |`,
    chords: 'C Am F G  C Am F C  F C Am G  C Am G C',
    drums: 'KhShKhSh',
    bassStyle: 'march',
  },
  game: {
    bpm: 116,
    lead: `
      G4 .  C5 .  D5 .  E5 G5 | E5 -  D5 -  C5 .  A4 .  | G4 .  A4 C5 D5 -  C5 D5 | E5 -  -  -  -  -  .  .  |
      G4 .  C5 .  D5 .  E5 G5 | A5 -  G5 -  E5 .  D5 .  | C5 .  D5 E5 D5 -  A4 G4 | C5 -  -  -  -  -  .  .  |
      A5 -  G5 -  E5 -  D5 -  | E5 G5 A5 -  G5 -  E5 .  | D5 -  C5 -  A4 -  C5 -  | D5 -  -  -  E5 -  G5 -  |
      A5 -  G5 -  E5 -  D5 -  | E5 G5 A5 -  C6 -  A5 .  | G5 E5 D5 C5 D5 -  E5 D5 | C5 -  -  -  .  .  .  .  |`,
    chords: 'C Am F G  C Am F C  F C Am G  F C G C',
    drums: 'K.hhS.hh',
    bassStyle: 'bounce',
  },
  victory: {
    bpm: 132,
    lead: `
      C5 E5 G5 C6 -  -  G5 C6 | D6 -  C6 -  A5 -  G5 -  | A5 C6 D6 E6 -  -  D6 E6 | G6 -  -  -  -  -  .  .  |`,
    chords: 'C F Am C',
    drums: 'KhKhSSSS',
    bassStyle: 'march',
    loop: false,
  },
};

const CHORD_NOTES = {
  C: ['C', 'E', 'G'], Am: ['A', 'C', 'E'], F: ['F', 'A', 'C'], G: ['G', 'B', 'D'], Dm: ['D', 'F', 'A'], Em: ['E', 'G', 'B'],
};
const SEMI = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

function noteFreq(name) {
  const m = /^([A-G])(#|b)?(\d)$/.exec(name);
  if (!m) return null;
  const midi = 12 * (Number(m[3]) + 1) + SEMI[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
  return 440 * Math.pow(2, (midi - 69) / 12);
}

// 把樂譜字串變成 [{ step, freq, len }]
function parseLine(str) {
  const tokens = str.split(/\s+/).filter((t) => t && t !== '|');
  const notes = [];
  tokens.forEach((t, i) => {
    if (t === '-') { if (notes.length && notes[notes.length - 1].end === i) { notes[notes.length - 1].len++; notes[notes.length - 1].end++; } return; }
    if (t === '.') return;
    notes.push({ step: i, freq: noteFreq(t), len: 1, end: i + 1 });
  });
  return { notes, steps: tokens.length };
}

// 依和弦產生低音和琶音
function buildSong(def) {
  const lead = parseLine(def.lead);
  const chords = def.chords.split(/\s+/).filter(Boolean);
  const bass = [];
  const arp = [];
  chords.forEach((c, bar) => {
    const [root, third, fifth] = CHORD_NOTES[c];
    const s = bar * 8;
    const r = noteFreq(`${root}2`);                 // 低音的根音（第 2 個八度）
    let f5 = noteFreq(`${fifth}2`);                  // 五度音，要比根音高
    if (f5 < r) f5 *= 2;
    const pattern = def.bassStyle === 'bounce'
      ? [[0, r, 1], [2, f5, 1], [4, r, 1], [5, r, 1], [6, f5, 1]]
      : [[0, r, 2], [2, f5, 2], [4, r, 2], [6, f5, 2]];
    for (const [o, fq, len] of pattern) bass.push({ step: s + o, freq: fq, len });
    const tones = [root, third, fifth, third].map((n) => noteFreq(`${n}4`));
    for (let k = 0; k < 8; k++) arp.push({ step: s + k, freq: tones[k % 4], len: 0.5 });
  });
  return { bpm: def.bpm, steps: lead.steps, lead: lead.notes, bass, arp, drums: def.drums, loop: def.loop !== false };
}

// 方波的「粗細」（duty）：25% 和 12.5% 是紅白機的招牌音色
function pulseWave(ctx, duty) {
  const n = 32;
  const real = new Float32Array(n);
  const imag = new Float32Array(n);
  for (let k = 1; k < n; k++) imag[k] = (2 / (k * Math.PI)) * Math.sin(k * Math.PI * duty);
  return ctx.createPeriodicWave(real, imag);
}

function noiseBuffer(ctx) {
  const buf = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return buf;
}

// 一個合成器：把音符排進某個 AudioContext（即時播放或離線錄音都用它）
function makeSynth(ctx, dest) {
  const waves = { p25: pulseWave(ctx, 0.25), p12: pulseWave(ctx, 0.125) };
  const noise = noiseBuffer(ctx);

  function tone(wave, freq, t, dur, vol) {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    if (wave === 'triangle') osc.type = 'triangle'; else osc.setPeriodicWave(waves[wave]);
    osc.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.005);
    g.gain.setValueAtTime(vol * 0.7, t + Math.min(0.05, dur * 0.5));
    g.gain.linearRampToValueAtTime(0, t + dur);
    osc.connect(g).connect(dest);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  function drum(kind, t) {
    if (kind === 'K') {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.frequency.setValueAtTime(140, t);
      osc.frequency.exponentialRampToValueAtTime(40, t + 0.12);
      g.gain.setValueAtTime(0.35, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
      osc.connect(g).connect(dest);
      osc.start(t);
      osc.stop(t + 0.16);
      return;
    }
    const src = ctx.createBufferSource();
    src.buffer = noise;
    const f = ctx.createBiquadFilter();
    f.type = 'highpass';
    f.frequency.value = kind === 'S' ? 1200 : 7000;
    const g = ctx.createGain();
    const len = kind === 'S' ? 0.12 : 0.035;
    g.gain.setValueAtTime(kind === 'S' ? 0.18 : 0.06, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + len);
    src.connect(f).connect(g).connect(dest);
    src.start(t, Math.random() * 0.3);
    src.stop(t + len + 0.01);
  }

  // 排第 step 格（八分音符）要發的聲音
  function step(song, i, t) {
    const sd = 60 / song.bpm / 2; // 一個八分音符幾秒
    for (const n of song.lead) if (n.step === i) tone('p25', n.freq, t, n.len * sd * 0.95, 0.085);
    for (const n of song.arp) if (n.step === i) tone('p12', n.freq, t, n.len * sd, 0.025);
    for (const n of song.bass) if (n.step === i) tone('triangle', n.freq, t, n.len * sd * 0.9, 0.22);
    const d = song.drums[i % 8];
    if (d && d !== '.') drum(d, t);
    if (d === 'K' || d === 'S') drum('h', t);
  }

  return { step };
}

const BUILT_SONGS = {};
for (const [k, def] of Object.entries(SONGS)) BUILT_SONGS[k] = buildSong(def);

// 即時播放器
const Music = {
  wanted: null,      // 想播的歌（還沒解鎖音效前先記著）
  playing: null,
  enabled: true,
  timer: null,

  init(ctx, dest) {
    this.ctx = ctx;
    this.bus = ctx.createGain();
    this.bus.gain.value = this.enabled ? 0.55 : 0;
    this.bus.connect(dest);
    this.synth = makeSynth(ctx, this.bus);
    if (this.wanted) this.play(this.wanted);
  },

  // 場景呼叫這個；如果音效還沒解鎖（還沒點過畫面），等解鎖後自動開始
  want(name) {
    this.wanted = name;
    if (this.ctx) this.play(name);
  },

  play(name) {
    if (this.playing === name && this.timer) return;
    this.stop();
    const song = BUILT_SONGS[name];
    if (!song || !this.ctx) return;
    this.playing = name;
    this.song = song;
    this.i = 0;
    this.next = this.ctx.currentTime + 0.08;
    this.timer = setInterval(() => this.tick(), 25);
  },

  tick() {
    const sd = 60 / this.song.bpm / 2;
    while (this.next < this.ctx.currentTime + 0.15) {
      this.synth.step(this.song, this.i, this.next);
      this.next += sd;
      this.i++;
      if (this.i >= this.song.steps) {
        if (!this.song.loop) { this.stop(); return; }
        this.i = 0;
      }
    }
  },

  stop() {
    clearInterval(this.timer);
    this.timer = null;
    this.playing = null;
  },

  setEnabled(on) {
    this.enabled = on;
    try { localStorage.setItem('music', on ? '1' : '0'); } catch (e) { /* 無痕模式等情況存不了，沒關係 */ }
    if (this.bus) this.bus.gain.setTargetAtTime(on ? 0.55 : 0, this.ctx.currentTime, 0.05);
  },
};

try { Music.enabled = localStorage.getItem('music') !== '0'; } catch (e) { /* 讀不到就預設開 */ }

// 音樂開關按鈕（標題和遊戲畫面都會用）
function makeMusicButton(scene, x, y) {
  const btn = makeButton(scene, x, y, 60, 54, '', { fill: 0xfff1e8, fontSize: '22px' });
  const refresh = () => btn.label.setText(Music.enabled ? '♪' : '×');
  btn.on('pointerup', () => { Music.setEnabled(!Music.enabled); refresh(); });
  refresh();
  return btn;
}
