// =====================================================================
// HUD：疊在地圖上面、不會跟著捲動的介面
// 直版（手機）：上方玩家資訊，下方骰子、訊息、按鈕
// 橫版（電腦）：左邊欄放玩家資訊和按鈕，下方放骰子和訊息
// =====================================================================

const HUD_TOP = 136;       // 直版：上方玩家列的高度
const HUD_BOTTOM = H - 250; // 直版：下方面板從這裡開始（固定在畫面最下面 250 像素）
const SIDEBAR = 300;       // 橫版：左邊欄寬度
const STRIP = 630;         // 橫版：下方訊息列從這裡開始

class HudScene extends Phaser.Scene {
  constructor() { super('hud'); }

  init(data) {
    this.gs = data.game; // 遊戲畫面（GameScene）
  }

  create() {
    this.drawPanels();
    this.drawBottom();
    this.choiceLayer = this.add.container(0, 0).setDepth(20);
    this.cardLayer = this.add.container(0, 0).setDepth(50);
    this.drawEventBox();
    this.scene.bringToTop();
  }

  // ---------- 玩家狀態卡 ----------
  // 整張卡片是玩家的代表色；大頭照、名字、金幣和錢、支持者（大字）
  drawPanels() {
    const players = this.gs.players;
    let pw;
    let ph;
    let pos;
    if (LANDSCAPE) {
      this.add.rectangle(0, 0, SIDEBAR, H, 0x1d2b53, 0.95).setOrigin(0);
      this.add.rectangle(SIDEBAR - 4, 0, 4, H, 0x000000).setOrigin(0);
      pw = SIDEBAR - 24;
      ph = 112;
      pos = (i) => ({ x: 10, y: 10 + i * 122 });
    } else {
      this.add.rectangle(0, 0, W, HUD_TOP, 0x1d2b53, 0.92).setOrigin(0);
      this.add.rectangle(0, HUD_TOP - 4, W, 4, 0x000000).setOrigin(0);
      pw = 168;
      ph = 116;
      const gap = 8;
      const total = players.length * pw + (players.length - 1) * gap;
      const left = (W - total) / 2;
      pos = (i) => ({ x: left + i * (pw + gap), y: 10 });
    }
    const big = LANDSCAPE; // 橫版卡片比較寬，字可以大一點
    const outline = { stroke: '#000000', strokeThickness: 5 };
    this.panels = players.map((p, i) => {
      const { x, y } = pos(i);
      const c = this.add.container(x, y);
      // 輪到誰：白色粗框
      const highlight = this.add.rectangle(-5, -5, pw + 10, ph + 10, 0xffffff).setOrigin(0).setVisible(false);
      const box = this.add.rectangle(0, 0, pw, ph, hex(p.color)).setOrigin(0).setStrokeStyle(3, 0x000000);
      const shade = this.add.rectangle(0, ph * 0.55, pw, ph * 0.45, 0x000000, 0.18).setOrigin(0); // 下半部稍暗，數字更清楚
      // 大頭照
      const hs = big ? 66 : 52;
      const face = this.add.rectangle(6, 6, hs, hs, 0x1d2b53).setOrigin(0).setStrokeStyle(3, 0x000000);
      const head = addHeadshot(this, 8, 8, i, hs - 4);
      // 名字
      const nx = hs + 14;
      const name = this.add.text(nx, 6, p.name, { fontFamily: FONT, fontSize: big ? '22px' : '18px', color: '#ffffff', ...outline });
      // 金幣 + 錢
      const coinY = big ? 38 : 32;
      const coin = this.add.image(nx, coinY, 'coin').setOrigin(0, 0).setScale(big ? 1.4 : 1.15);
      const money = this.add.text(nx + (big ? 26 : 22), coinY - 1, '', { fontFamily: FONT, fontSize: big ? '22px' : '18px', color: '#ffffff', ...outline });
      // 支持者（大字）
      const fansLabel = this.add.text(8, big ? 80 : 74, '支持者', { fontFamily: FONT, fontSize: big ? '18px' : '15px', color: '#ffffff', ...outline });
      const fans = this.add.text(pw - 8, big ? 62 : 58, '', { fontFamily: FONT, fontSize: big ? '42px' : '34px', color: '#ffffff', stroke: '#000000', strokeThickness: 7 }).setOrigin(1, 0);
      // 狀態（塞車中、出局、擁有幾塊地）
      const info = big
        ? this.add.text(pw - 8, 8, '', { fontFamily: FONT, fontSize: '15px', color: '#ffffff', ...outline }).setOrigin(1, 0)
        : this.add.text(6 + hs / 2, 6 + hs, '', { fontFamily: FONT, fontSize: '13px', color: '#ffffff', backgroundColor: '#ff004d', padding: { x: 3, y: 1 } }).setOrigin(0.5, 1);
      c.add([highlight, box, shade, face, head, name, coin, money, fansLabel, fans, info]);
      // 點玩家卡片：鏡頭移到那個角色
      box.setInteractive();
      box.on('pointerup', () => this.gs.followPlayer(p));
      return { c, highlight, money, info, fans, shown: p.fans };
    });

    const top = MAP_VIEW.y + 10;
    this.roundChip = this.add.text(MAP_VIEW.x + 12, top, '', {
      fontFamily: FONT, fontSize: '20px', color: '#ffffff', backgroundColor: '#1d2b53', padding: { x: 8, y: 4 },
    });

    // 右上角：選戰指南、放大、縮小、音樂
    makeButton(this, W - 12 - 76, top + 22, 152, 44, '選戰指南', { fill: 0xffec27, fontSize: '22px', onClick: () => showGuide() });
    const zx = W - 42;
    makeButton(this, zx, top + 82, 60, 54, '＋', { fill: 0xfff1e8, fontSize: '32px', onClick: () => this.gs.setZoom(this.gs.cameras.main.zoom * 1.2) });
    makeButton(this, zx, top + 146, 60, 54, '－', { fill: 0xfff1e8, fontSize: '32px', onClick: () => this.gs.setZoom(this.gs.cameras.main.zoom / 1.2) });
    makeMusicButton(this, zx, top + 210);
    makeButton(this, zx, top + 274, 60, 54, '戰將', { fill: 0xffa300, fontSize: '20px', onClick: () => this.gs.generals.showRoster() });
    makeButton(this, zx, top + 338, 60, 54, '紀錄', { fill: 0x29adff, fontSize: '20px', onClick: () => this.showLog() });

    this.drawPoll(top + 44);
    this.drawTilePlate(top);
  }

  refreshPanels() {
    const gs = this.gs;
    gs.players.forEach((p, i) => {
      const pan = this.panels[i];
      const owned = gs.tileState.filter((s) => s.owner === i).length;
      pan.money.setText(p.bankrupt ? '破產' : `$${p.money}`);
      // 支持者數字：從舊的數字滾動到新的數字
      if (pan.shown !== p.fans) {
        const from = { v: pan.shown };
        this.tweens.killTweensOf(pan.fansCounter || {});
        pan.fansCounter = from;
        this.tweens.add({ targets: from, v: p.fans, duration: 500, onUpdate: () => pan.fans.setText(`${Math.round(from.v)}`) });
        this.tweens.add({ targets: pan.fans, scale: 1.18, duration: 120, yoyo: true });
        pan.shown = p.fans;
      } else {
        pan.fans.setText(`${p.fans}`);
      }
      let status = LANDSCAPE ? `地 ${owned}` : '';
      if (p.skip > 0) status = '塞車中';
      if (p.bankrupt) status = '出局';
      pan.info.setText(status);
      pan.info.setVisible(status !== '');
      pan.c.setAlpha(p.bankrupt ? 0.45 : 1);
      pan.highlight.setVisible(i === gs.current && !gs.gameOver);
    });
    const mult = gs.fansMult();
    this.roundChip.setText(`第 ${Math.min(gs.round, GAME_RULES.maxRounds)} / ${GAME_RULES.maxRounds} 回合${mult > 1 ? `・選前衝刺 支持者 ×${mult}` : ''}`);
    this.roundChip.setBackgroundColor(mult > 1 ? '#7e2553' : '#1d2b53');
    this.refreshPoll();
    this.trackChanges();
  }

  // ---------- 畫面中央的事件框：每個事件、錢和支持者的變化都顯示在這裡 ----------
  drawEventBox() {
    this.evLog = [];      // 「紀錄」按鈕看的歷史
    this.changeLog = [];  // 錢、支持者的每一筆變化
    this.lastVals = this.gs.players.map((p) => ({ money: p.money, fans: p.fans }));
    // 右邊有一排按鈕，框框放在按鈕左邊的正中間
    this.boxOn = 0;     // > 0 時，訊息會跳出事件框
    this.evBox = this.add.container(MAP_VIEW.x + (MAP_VIEW.w - 84) / 2, 0).setDepth(15).setVisible(false);
  }

  // 每次畫面更新時，比對大家的錢和支持者，記下變化
  trackChanges() {
    if (!this.lastVals) return;
    let changed = false;
    this.gs.players.forEach((p, i) => {
      const v = this.lastVals[i];
      if (v.money !== p.money || v.fans !== p.fans) {
        this.changeLog.push({ t: Date.now(), pid: i, money: p.money - v.money, fans: p.fans - v.fans });
        v.money = p.money;
        v.fans = p.fans;
        changed = true;
      }
    });
    if (this.changeLog.length > 400) this.changeLog.splice(0, 200);
    if (changed) {
      // 一般訊息也要記下變化（紀錄用）
      if (this.evEntry && this.evEntry !== this.boxEntry) this.evEntry.changes = this.summarize(this.evStart);
      if (this.evBox.visible) this.renderEventBox();
    }
  }

  showEvent(text, popup) {
    const gs = this.gs;
    const p = gs.players[gs.current];
    this.trackChanges();
    // 事件出現前一下下的變化也算進來（有些地方是先扣錢再顯示訊息）
    this.evStart = Date.now() - 350;
    this.evEntry = { round: Math.min(gs.round, GAME_RULES.maxRounds), who: p ? p.name : '', color: p ? p.color : '#ffec27', text, changes: '' };
    this.evLog.unshift(this.evEntry);
    if (this.evLog.length > 80) this.evLog.pop();
    if (popup) {
      this.boxEntry = this.evEntry;
      this.boxStart = this.evStart;
      this.boxShownAt = Date.now();
      this.renderEventBox(true);
    } else if (this.evBox.visible) {
      // 一般訊息：事件框至少留 2 秒再收起來
      const left = 2000 - (Date.now() - (this.boxShownAt || 0));
      const shownAt = this.boxShownAt;
      if (left <= 0) this.hideEvent();
      else this.time.delayedCall(left, () => { if (this.boxShownAt === shownAt) this.hideEvent(); });
    }
  }

  summarize(since) {
    return this.changeChips(since).map((c) => c.label).join('、');
  }

  changeChips(since) {
    const gs = this.gs;
    const agg = new Map();
    for (const c of this.changeLog) {
      if (c.t < since) continue;
      const a = agg.get(c.pid) || { money: 0, fans: 0 };
      a.money += c.money;
      a.fans += c.fans;
      agg.set(c.pid, a);
    }
    const sign = (n) => (n > 0 ? `+${n}` : `${n}`);
    return [...agg.entries()].filter(([, a]) => a.money || a.fans).map(([pid, a]) => {
      const pl = gs.players[pid];
      const parts = [];
      if (a.money) parts.push(`$${sign(a.money)}`);
      if (a.fans) parts.push(`支持 ${sign(a.fans)}`);
      return { pl, label: `${pl.name} ${parts.join('  ')}` };
    });
  }

  // 畫面中央的事件框（機會／命運、戰將成果）
  renderEventBox(pop = false) {
    const box = this.evBox;
    box.removeAll(true);
    const w = LANDSCAPE ? 600 : MAP_VIEW.w - 110;
    const chips = this.changeChips(this.boxStart);
    this.boxEntry.changes = chips.map((c) => c.label).join('、');

    const txt = this.add.text(0, 18, this.boxEntry.text, {
      fontFamily: FONT, fontSize: '30px', color: '#fff1e8', align: 'center', lineSpacing: 6,
      wordWrap: { width: w - 36, useAdvancedWrap: true },
    }).setOrigin(0.5, 0);
    let h = 18 + txt.height + 14;
    const chipObjs = [];
    const cw = w - 36;
    chips.forEach((c, k) => {
      const cx = 0;
      const cy = h + k * 46 + 20;
      chipObjs.push(this.add.rectangle(cx, cy, cw, 40, hex(c.pl.color)).setStrokeStyle(3, 0x000000));
      chipObjs.push(this.add.text(cx, cy, c.label, { fontFamily: FONT, fontSize: '23px', color: '#000000' }).setOrigin(0.5));
    });
    if (chips.length) h += chips.length * 46 + 6;
    h += 6;
    const color = hex(this.boxEntry.color);
    box.add(this.add.rectangle(6, h / 2 + 6, w, h, 0x000000, 0.5));
    box.add(this.add.rectangle(0, h / 2, w, h, 0x1d2b53, 0.94).setStrokeStyle(5, color));
    box.add(this.add.rectangle(0, 4, w, 8, color).setOrigin(0.5, 0));
    box.add(txt);
    chipObjs.forEach((o) => box.add(o));
    // 直版：民調表下面；橫版：地圖下方（上面有格子名稱牌）
    box.y = LANDSCAPE ? MAP_VIEW.y + MAP_VIEW.h - h - 14 : MAP_VIEW.y + 236;
    box.setVisible(true);
    if (pop) {
      box.setScale(0.85).setAlpha(0.4);
      this.tweens.add({ targets: box, scale: 1, alpha: 1, duration: 160, ease: 'Back.easeOut' });
    }
  }

  hideEvent() { if (this.evBox) this.evBox.setVisible(false); }

  showLog() {
    if (document.querySelector('.gv-modal')) return;
    const rows = this.evLog.map((e) => `
      <div class="lg-row" style="border-left:8px solid ${e.color}">
        <p class="lg-head">第 ${e.round} 回合・${escapeHTML(e.who)}</p>
        <p>${escapeHTML(e.text).replace(/\n/g, '<br>')}</p>
        ${e.changes ? `<p class="lg-ch">${escapeHTML(e.changes)}</p>` : ''}
      </div>`).join('');
    gvModal({
      title: '事件紀錄', color: '#29adff',
      body: `<button type="button" class="gv-skip gv-close-top" data-v="close">關閉</button><p class="gv-tip">最新的在最上面（最多 80 筆）。</p>${rows || '<p class="gv-sub">還沒有事件</p>'}`,
    });
  }

  // ---------- 即時民調：長條圖 / 圓餅圖（右上角按鈕切換，會記住選擇）----------
  drawPoll(y) {
    const players = this.gs.players;
    // 手機畫面會整個縮小，所以直版的字和圖要大一點
    const S = LANDSCAPE ? 1 : 1.3;
    const pw = Math.round(250 * S);
    const rowH = Math.round(28 * S);
    const head = Math.round(36 * S);
    const R = Math.round(46 * S); // 圓餅半徑
    const ph = Math.max(head + players.length * rowH + 4, head + R * 2 + 10);
    const x = MAP_VIEW.x + 12;
    const c = this.add.container(x, y);
    this.pollBox = c;
    c.add(this.add.rectangle(0, 0, pw, ph, 0x1d2b53, 0.88).setOrigin(0).setStrokeStyle(3, 0x000000));
    c.add(this.add.text(10, 6, '即時民調', { fontFamily: FONT, fontSize: `${Math.round(18 * S)}px`, color: '#ffec27' }));

    // 切換按鈕（顯示「另一種」圖的名字）
    // 圓餅圖先隱藏，只用長條圖（要恢復：把 SHOW_PIE 改成 true）
    const SHOW_PIE = false;
    try { this.pollMode = SHOW_PIE && localStorage.getItem('pollMode') === 'pie' ? 'pie' : 'bar'; } catch (e) { this.pollMode = 'bar'; }
    const tb = makeButton(this, pw - Math.round(38 * S), Math.round(17 * S), Math.round(64 * S), Math.round(26 * S), '', {
      fill: 0xfff1e8, fontSize: `${Math.round(15 * S)}px`,
      onClick: () => {
        this.pollMode = this.pollMode === 'bar' ? 'pie' : 'bar';
        try { localStorage.setItem('pollMode', this.pollMode); } catch (e) { /* 存不了沒關係 */ }
        this.updatePollMode();
      },
    });
    c.add(tb);
    tb.setVisible(SHOW_PIE);
    this.pollToggle = tb;

    const hs = Math.round(24 * S);
    // 長條圖
    this.pollBarGroup = this.add.container(0, 0);
    c.add(this.pollBarGroup);
    this.pollBarW = Math.round(142 * S);
    this.pollRows = players.map((p, k) => {
      const ry = head - 2 + k * rowH;
      const bx = hs + 16;
      const bh = Math.round(16 * S);
      this.pollBarGroup.add(this.add.rectangle(8, ry, hs, hs, 0xfff1e8).setOrigin(0));
      this.pollBarGroup.add(addHeadshot(this, 9, ry + 1, p.id, hs - 2));
      this.pollBarGroup.add(this.add.rectangle(bx, ry + 4, this.pollBarW, bh, 0x0b1020).setOrigin(0));
      const bar = this.add.rectangle(bx, ry + 4, 2, bh, hex(p.color)).setOrigin(0);
      this.pollBarGroup.add(bar);
      const pct = this.add.text(pw - 8, ry + 2, '', { fontFamily: FONT, fontSize: `${Math.round(16 * S)}px`, color: '#ffffff' }).setOrigin(1, 0);
      this.pollBarGroup.add(pct);
      return { bar, pct };
    });

    // 圓餅圖：左邊是圓餅，右邊是大頭照和百分比
    this.pollPieGroup = this.add.container(0, 0);
    c.add(this.pollPieGroup);
    this.pie = { cx: 10 + R, cy: head + R + 2, R, g: this.add.graphics() };
    this.pollPieGroup.add(this.pie.g);
    const lx = 10 + R * 2 + 14;
    this.pollPieRows = players.map((p, k) => {
      const ry = head - 2 + k * rowH;
      this.pollPieGroup.add(this.add.rectangle(lx, ry, hs, hs, hex(p.color)).setOrigin(0).setStrokeStyle(2, 0x000000));
      this.pollPieGroup.add(addHeadshot(this, lx + 1, ry + 1, p.id, hs - 2));
      const pct = this.add.text(pw - 8, ry + 2, '', { fontFamily: FONT, fontSize: `${Math.round(16 * S)}px`, color: '#ffffff' }).setOrigin(1, 0);
      this.pollPieGroup.add(pct);
      return { pct };
    });
    this.pieShown = players.map(() => 1 / players.length); // 圓餅目前畫出來的比例（動畫用）
    this.updatePollMode();
  }

  updatePollMode() {
    const pie = this.pollMode === 'pie';
    this.pollBarGroup.setVisible(!pie);
    this.pollPieGroup.setVisible(pie);
    this.pollToggle.label.setText(pie ? '長條' : '圓餅');
    this.drawPie();
  }

  // 畫圓餅：每位玩家一片，從 12 點鐘方向順時針
  drawPie() {
    const { cx, cy, R, g } = this.pie;
    g.clear();
    g.fillStyle(0x0b1020, 1).fillCircle(cx, cy, R + 3);
    let a = -Math.PI / 2;
    this.gs.players.forEach((p, k) => {
      const da = this.pieShown[k] * Math.PI * 2;
      if (da <= 0.001) return;
      g.fillStyle(hex(p.color), 1);
      g.slice(cx, cy, R, a, a + da, false);
      g.fillPath();
      g.lineStyle(2, 0x000000, 1);
      g.lineBetween(cx, cy, cx + Math.cos(a) * R, cy + Math.sin(a) * R);
      a += da;
    });
    g.lineStyle(3, 0x000000, 1).strokeCircle(cx, cy, R);
  }

  refreshPoll() {
    if (!this.pollRows) return;
    const players = this.gs.players;
    const fans = players.map((p) => (p.bankrupt ? 0 : p.fans));
    const total = fans.reduce((a, b) => a + b, 0) || 1;
    const max = Math.max(...fans, 1);
    players.forEach((p, k) => {
      const row = this.pollRows[k];
      const w = Math.max(2, Math.round(this.pollBarW * fans[k] / max));
      this.tweens.killTweensOf(row.bar);
      this.tweens.add({ targets: row.bar, width: w, duration: 500, ease: 'Quad.easeOut' });
      const text = `${Math.round(fans[k] * 100 / total)}%`;
      row.pct.setText(text);
      this.pollPieRows[k].pct.setText(text);
    });
    // 圓餅慢慢轉到新的比例
    const from = [...this.pieShown];
    const to = fans.map((f) => f / total);
    const t = { v: 0 };
    if (this.pieTween) this.pieTween.stop();
    this.pieTween = this.tweens.add({
      targets: t, v: 1, duration: 500, ease: 'Quad.easeOut',
      onUpdate: () => { this.pieShown = from.map((f, k) => f + (to[k] - f) * t.v); this.drawPie(); },
    });
  }

  // ---------- 目前格子的名稱（地圖上不再顯示名稱，改成這裡顯示角色踩在哪一格）----------
  drawTilePlate(y) {
    const S = LANDSCAPE ? 1 : 1.3; // 直版字大一點
    this.plateH = Math.round(56 * S);
    // 橫版：放在地圖上方中間；直版：上方太擠，放在地圖下方（訊息框上面）
    const x = MAP_VIEW.x + MAP_VIEW.w / 2;
    const py = LANDSCAPE ? y : MAP_VIEW.y + MAP_VIEW.h - this.plateH - 12;
    this.plate = this.add.container(x, py).setVisible(false);
    this.plateBg = this.add.rectangle(0, 0, 200, this.plateH, 0x1d2b53, 0.92).setOrigin(0.5, 0).setStrokeStyle(4, 0xffffff);
    this.plateName = this.add.text(0, 4, '', { fontFamily: FONT, fontSize: `${Math.round(24 * S)}px`, color: '#ffffff' }).setOrigin(0.5, 0);
    this.plateSub = this.add.text(0, Math.round(32 * S), '', { fontFamily: FONT, fontSize: `${Math.round(16 * S)}px`, color: '#c2c3c7' }).setOrigin(0.5, 0);
    this.plate.add([this.plateBg, this.plateName, this.plateSub]);
  }

  showTile(i, p) {
    if (!this.plate) return;
    const t = TILES[i];
    const st = this.gs.tileState[i];
    const dn = t.district ? TILES.filter((x) => x.district === t.district).length : 0;
    const kind = {
      go: `經過領 $${GAME_RULES.passGoBonus}`, jam: '下回合暫停一次', mrt: '可搭到另一站', tow: `罰款 $${GAME_RULES.towFine}`,
      chance: '抽一張機會卡', fate: '抽一張命運卡', talent: '招募戰將',
      quiz: `答對 $${GAME_RULES.quizMoney}、支持者 +${GAME_RULES.quizFans}`,
      property: `${t.district}${dn > 1 ? `（${dn} 格）` : ''}・地標 $${t.price}`, chief: `${t.district}${dn > 1 ? `（${dn} 格）` : ''}・里長 $${t.price}`,
    }[t.type] || '';
    const owner = st && st.owner !== null ? `・${this.gs.players[st.owner].name}的地盤` : '';
    this.plateName.setText(this.gs.tileName(i));
    this.plateSub.setText(kind + owner);
    const w = Math.max(this.plateName.width, this.plateSub.width) + 32;
    this.plateBg.setSize(w, this.plateH).setStrokeStyle(4, hex(p.color));
    this.plate.setVisible(true);
  }

  // ---------- 下方：骰子 + 訊息 ----------
  drawBottom() {
    // 直版：畫面最下方一整條；橫版：地圖下方（左邊欄右側）
    const x0 = LANDSCAPE ? SIDEBAR : 0;
    const y0 = LANDSCAPE ? STRIP : HUD_BOTTOM;
    const msgH = LANDSCAPE ? 108 : 124;
    const midY = y0 + (LANDSCAPE ? (H - STRIP) / 2 : 84);
    this.add.rectangle(x0, y0, W - x0, H - y0, 0x1d2b53, 0.95).setOrigin(0);
    this.add.rectangle(x0, y0, W - x0, 4, 0x000000).setOrigin(0);

    const diceX = x0 + 84;
    const diceBox = this.add.rectangle(diceX, midY, 120, 104, 0x29366f).setStrokeStyle(4, 0x000000);
    this.diceX = diceX;
    this.diceY = midY - 8;
    this.dice = [this.add.image(diceX - 26, midY - 8, 'dice1').setScale(3.4), this.add.image(diceX + 26, midY - 8, 'dice1').setScale(3.4)];
    this.diceLabel = this.add.text(diceX, midY + 38, '', { fontFamily: FONT, fontSize: '16px', color: '#fff1e8' }).setOrigin(0.5);
    // 點骰子：切換擲 1 顆或 2 顆（會記住）
    diceBox.setInteractive({ useHandCursor: true });
    diceBox.on('pointerup', () => {
      if (this.rolling) return;
      GAME_RULES.dice = GAME_RULES.dice === 1 ? 2 : 1;
      try { localStorage.setItem('tm_dice', String(GAME_RULES.dice)); } catch (e) { /* 不能存就算了 */ }
      Sfx.click();
      this.layoutDice();
    });
    this.layoutDice();

    const mx = x0 + 158;
    const mw = W - mx - 14;
    this.add.rectangle(mx, midY - msgH / 2, mw, msgH, 0x000000).setOrigin(0);
    this.add.rectangle(mx + 4, midY - msgH / 2 + 4, mw - 8, msgH - 8, 0xfff1e8).setOrigin(0);
    this.msgText = this.add.text(mx + mw / 2, midY, '', {
      fontFamily: FONT, fontSize: '24px', color: '#000000', align: 'center', lineSpacing: 6,
      wordWrap: { width: mw - 28, useAdvancedWrap: true },
    }).setOrigin(0.5);
  }

  say(text) {
    this.msgText.setText(text);
    this.showEvent(text, this.boxOn > 0);
  }

  layoutDice(n = GAME_RULES.dice, cpu = false) {
    const two = n === 2;
    this.dice[0].setX(two ? this.diceX - 26 : this.diceX);
    this.dice[1].setVisible(two);
    this.diceLabel.setText(cpu ? `電腦擲 ${n} 顆` : `${n} 顆・點我換`);
  }

  // n = 擲幾顆（電腦會自己決定；玩家用自己設定的）
  async rollDice(n = GAME_RULES.dice, cpu = false) {
    this.rolling = true;
    this.layoutDice(n, cpu);
    const prog = { v: 0 };
    let lastFace = -1;
    await new Promise((res) => this.tweens.add({
      targets: prog, v: 1, duration: 600, onComplete: res,
      onUpdate: () => {
        const face = Math.floor(prog.v * 10); // 600 毫秒內換 10 次
        if (face === lastFace) return;
        lastFace = face;
        const n = Phaser.Math.Between(1, 6);
        this.dice.forEach((d) => d.setTexture(`dice${Phaser.Math.Between(1, 6)}`).setAngle(Phaser.Math.Between(-20, 20)));
        Sfx.beep(300 + n * 60, 0.03);
      },
    }));
    const faces = this.dice.map(() => Phaser.Math.Between(1, 6));
    this.dice.forEach((d, k) => d.setTexture(`dice${faces[k]}`).setAngle(0).setVisible(k < n));
    Sfx.beep(880, 0.08);
    await new Promise((res) => this.tweens.add({ targets: this.dice, scale: 4.2, duration: 100, yoyo: true, onComplete: res }));
    this.rolling = false;
    return faces.slice(0, n).reduce((a, b) => a + b, 0);
  }

  // 顯示按鈕，等玩家選；電腦玩家會自動選 auto
  choose(options, player, auto) {
    return new Promise((resolve) => {
      this.choiceLayer.removeAll(true);
      const n = options.length;
      // 直版：按鈕橫排在最下面；橫版：按鈕直排在左邊欄下方
      const bw = LANDSCAPE ? SIDEBAR - 40 : (n === 1 ? 360 : 300);
      const gap = 20;
      const total = n * bw + (n - 1) * gap;
      options.forEach((o, k) => {
        const x = LANDSCAPE ? SIDEBAR / 2 - 2 : W / 2 - total / 2 + bw / 2 + k * (bw + gap);
        const y = LANDSCAPE ? (n === 1 ? 640 : 590 + k * 96) : H - 54;
        const b = makeButton(this, x, y, bw, 72, o.label, {
          fill: o.fill ?? 0xffa300, disabled: o.disabled, fontSize: '30px',
          onClick: () => { if (player.human) { this.choiceLayer.removeAll(true); resolve(o.value); } },
        });
        this.choiceLayer.add(b);
      });
      if (!player.human) {
        this.time.delayedCall(900, () => { this.choiceLayer.removeAll(true); resolve(auto); });
      }
    });
  }

  // ---------- 機會 / 命運卡 ----------
  async showCard(card, isChance, player) {
    Sfx.tune(isChance ? [659, 784, 988] : [440, 370, 311], 0.08);
    this.cardLayer.removeAll(true);
    const panel = this.add.container(MAP_VIEW.x + MAP_VIEW.w / 2, MAP_VIEW.y + MAP_VIEW.h / 2);
    panel.add(this.add.rectangle(8, 8, 520, 320, 0x000000, 0.6));
    panel.add(this.add.rectangle(0, 0, 520, 320, isChance ? 0xffec27 : 0x29adff).setStrokeStyle(6, 0x000000));
    panel.add(this.add.rectangle(0, -114, 500, 70, isChance ? 0xff004d : 0x1d2b53));
    panel.add(addIcon(this, -200, -114, isChance ? 'chance' : 'ballot', 60));
    panel.add(this.add.text(0, -114, isChance ? '機會' : '命運', { fontFamily: FONT, fontSize: '44px', color: '#fff1e8' }).setOrigin(0.5));
    panel.add(this.add.text(0, 36, card.text, { fontFamily: FONT, fontSize: '30px', color: '#000000', align: 'center', lineSpacing: 12 }).setOrigin(0.5));
    this.cardLayer.add(panel);
    panel.setScale(0.1);
    await new Promise((res) => this.tweens.add({ targets: panel, scale: 1, duration: 250, ease: 'Back.easeOut', onComplete: res }));
    await this.choose([{ label: '知道了', value: 1 }], player, 1);
    this.cardLayer.removeAll(true);
  }

  // ---------- 結算 ----------
  showResults() {
    const gs = this.gs;
    this.hideEvent();
    this.refreshPanels();
    this.choiceLayer.removeAll(true);
    // 排名：先比支持者，一樣多再比總資產；破產的排最後
    const ranking = [...gs.players].sort((a, b) => (a.bankrupt - b.bankrupt) || (b.fans - a.fans) || (gs.assetsOf(b) - gs.assetsOf(a)));
    const winner = ranking[0];
    Music.want('victory');

    const layer = this.add.container(0, 0).setDepth(100);
    layer.add(this.add.rectangle(0, 0, W, H, 0x000000, 0.88).setOrigin(0).setInteractive());
    // 直版：上下排；橫版：左邊當選人、右邊排名
    const L = LANDSCAPE
      ? { title: 70, winX: W * 0.3, img: 340, winText: 520, rankX: 700, rankR: 1180, rankY: 200, btnX: W * 0.72, btn: 620 }
      : { title: 140 + TALL_DY, winX: W / 2, img: 300 + TALL_DY, winText: 430 + TALL_DY, rankX: 140, rankR: 580, rankY: 500 + TALL_DY, btnX: W / 2, btn: 920 + TALL_DY };
    layer.add(this.add.text(W / 2, L.title, '★ 投票日 ★', { fontFamily: FONT, fontSize: '56px', color: '#ffec27', stroke: '#000', strokeThickness: 10 }).setOrigin(0.5));
    const img = addCharacter(this, L.winX, L.img, winner.id, LANDSCAPE ? 240 : 180);
    layer.add(img);
    this.tweens.add({ targets: img, y: L.img - 20, duration: 300, yoyo: true, repeat: -1, ease: 'Stepped', easeParams: [3] });
    layer.add(this.add.text(L.winX, L.winText, `${winner.name} 高票當選！`, { fontFamily: FONT, fontSize: LANDSCAPE ? '40px' : '48px', color: winner.color, stroke: '#000', strokeThickness: 10 }).setOrigin(0.5));

    ranking.forEach((p, k) => {
      const y = L.rankY + k * (LANDSCAPE ? 70 : 62);
      layer.add(this.add.text(L.rankX, y, `${k + 1}. ${p.name}`, { fontFamily: FONT, fontSize: '32px', color: '#fff1e8' }));
      layer.add(this.add.text(L.rankR, y, p.bankrupt ? '破產' : `支持者 ${p.fans}`, { fontFamily: FONT, fontSize: '28px', color: p.bankrupt ? '#ff004d' : '#ffec27' }).setOrigin(1, 0));
    });

    for (let k = 0; k < 60; k++) {
      const colors = [0xff004d, 0xffec27, 0x29adff, 0x00e436, 0xff77a8];
      const r = this.add.rectangle(Phaser.Math.Between(0, W), Phaser.Math.Between(-400, 0), 8, 8, colors[k % colors.length]);
      layer.add(r);
      this.tweens.add({ targets: r, y: H + 20, duration: Phaser.Math.Between(2000, 4000), repeat: -1, delay: Phaser.Math.Between(0, 2000) });
    }

    layer.add(makeButton(this, L.btnX, L.btn - (LANDSCAPE ? 100 : 94), 340, 76, '選戰趨勢報告', {
      fill: 0x29adff, color: '#000000', fontSize: '32px', onClick: () => showReport(gs),
    }));
    layer.add(makeButton(this, L.btnX, L.btn, 340, 90, '再選一次', {
      fill: 0xff004d, color: '#fff1e8', fontSize: '40px', onClick: () => gs.scene.start('title'),
    }));
  }
}
