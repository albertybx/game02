// 平衡測試：用真正的遊戲程式，讓 4 位電腦各用一種策略玩，記錄支持者從哪裡來
// 用法：node bal.js <實驗名> <場數> <回合數> <策略逗號分隔> [quiz] [平行數]
const { chromium } = require('playwright');
const fs = require('fs');
const [, , name, nGames, rounds, stratStr, quizFlag, parArg] = process.argv;
const N = Number(nGames);
const PAR = Number(parArg || 6);
const STRATS = stratStr.split(',');
const SPEED = 20;

async function playOne(browser, gameNo) {
  const pg = await browser.newPage({ viewport: { width: 1280, height: 760 } });
  const errs = [];
  pg.on('pageerror', (e) => errs.push(e.message));
  await pg.addInitScript((speed) => {
    const st = window.setTimeout;
    window.setTimeout = (f, ms, ...a) => st(f, (ms || 0) / speed, ...a);
  }, SPEED);
  await pg.goto('http://localhost:8123/index.html');
  await pg.waitForFunction(() => window.__game && __game.scene.getScene('title') && __game.scene.getScene('title').sys.isActive());
  const seats = [0, 1, 2, 3].map((s) => STRATS[(s + gameNo) % STRATS.length]);
  await pg.evaluate(([rounds, quiz, seats, speed]) => {
    const t = __game.scene.getScene('title');
    t.scene.start('game', { ...t.opts, playerCount: 4, mode: 'cpu', rounds: Number(rounds), quiz });
    const g = __game.scene.getScene('game');
    const hud = __game.scene.getScene('hud');
    const tick = () => {
      if (!g.players || !g.generals) return setTimeout(tick, 1);
      g.players.forEach((p, i) => { p.human = false; p.strat = seats[i]; });
      g.time.timeScale = speed; g.tweens.timeScale = speed;
      if (hud.time) { hud.time.timeScale = speed; hud.tweens.timeScale = speed; }
      const S = (window.__S = { mon: g.players.map(() => ({})), mh: [], src: [], fans: g.players.map(() => ({})), ev: g.players.map(() => ({})), lead: [] });
      const ev = (p, k, n = 1) => { S.ev[p.id][k] = (S.ev[p.id][k] || 0) + n; };
      const withSrc = (obj, fn, src) => {
        const o = obj[fn].bind(obj);
        obj[fn] = async (...a) => { S.src.push(src); try { return await o(...a); } finally { S.src.pop(); } };
      };
      const cf = g.changeFans.bind(g);
      g.changeFans = (p, amt, silent) => {
        const d = cf(p, amt, silent);
        const s = S.src[S.src.length - 1] || 'other';
        const b = S.fans[p.id];
        b[s] = (b[s] || 0) + d;
        return d;
      };
      g.players.forEach((p) => { let m = p.money; Object.defineProperty(p, 'money', { get: () => m, set: (v) => { const d = v - m; m = v; const s = S.src[S.src.length - 1] || 'other'; const k = s + (d >= 0 ? '+' : '-'); S.mon[p.id][k] = (S.mon[p.id][k] || 0) + d; }, configurable: true }); });
      // 策略
      const has = (p, k) => p.strat.split('+').includes(k);
      const ob = g.offerBuy.bind(g);
      g.offerBuy = async (p, i) => {
        const t = TILES[i].type;
        if (has(p, 'none') || (has(p, 'chief') && t === 'property') || (has(p, 'land') && t === 'chief')) return;
        const before = g.tileState[i].owner;
        await ob(p, i);
        if (before === null && g.tileState[i].owner === p.id) ev(p, t === 'chief' ? 'buyChief' : 'buyLand');
      };
      const ou = g.offerUpgrade.bind(g);
      g.offerUpgrade = async (p, i) => {
        if (has(p, 'none') || has(p, 'chief') || has(p, 'nobuild')) return;
        const lv = g.tileState[i].level;
        await ou(p, i);
        if (g.tileState[i].level > lv) ev(p, 'build');
      };
      const G = g.generals;
      for (const fn of ['onRecruit', 'onOwnChief', 'onRivalChief', 'remoteMission']) {
        const o = G[fn].bind(G);
        G[fn] = async (p, ...a) => { if (has(p, 'nogen') || has(p, 'none')) return; return o(p, ...a); };
      }
      const ob2 = G.stakeBattle.bind(G);
      G.stakeBattle = async (p, gen, i) => { ev(p, 'battle'); await ob2(p, gen, i); if (g.tileState[i].owner === p.id) ev(p, 'battleWin'); };
      const ord = G.onRecruit.bind(G);
      G.onRecruit = async (p) => { const n = G.ownedBy(p).length; await ord(p); if (G.ownedBy(p).length > n) ev(p, 'recruit'); };
      withSrc(g, 'offerBuy', 'buy');
      withSrc(g, 'offerUpgrade', 'build');
      withSrc(g, 'freeBuild', 'build');
      withSrc(g, 'offerPassBuild', 'build');
      withSrc(g, 'payRent', 'rent');
      withSrc(g, 'doQuiz', 'quiz');
      withSrc(g, 'applyCard', 'card');
      withSrc(G, 'onOwnChief', 'mission');
      withSrc(G, 'stakeBattle', 'battle');
      withSrc(G, 'onRecruit', 'recruit');
      withSrc(G, 'finishMission', 'mission');
      withSrc(G, 'debate', 'debate');
      withSrc(g, 'rally', 'rally');
      withSrc(g, 'payUpkeep', 'upkeep'); withSrc(g, 'sellToCover', 'sell'); withSrc(G, 'woo', 'woo'); withSrc(g, 'offerChief', 'chief');
      const orr = g.rally.bind(g); g.rally = async (p) => { ev(p, 'rally'); return orr(p); };
      const ord2 = G.debate.bind(G); G.debate = async (p) => { const d = p.debated; await ord2(p); if (!d && p.debated) ev(p, 'debate'); };
      G.woo0 = G.woo.bind(G); G.woo = async (p) => { ev(p, 'woo'); return G.woo0(p); }; const odis = G.dispatch.bind(G); G.dispatch = async (p, gen, m, i, remote) => { ev(p, remote ? 'remote' : 'onsite'); ev(p, 'm_' + m.key); return odis(p, gen, m, i, remote); };
      const osc = g.sellToCover.bind(g); g.sellToCover = async (p, a) => { ev(p, 'sellCall'); return osc(p, a); }; const ogb = g.goBankrupt.bind(g); g.goBankrupt = async (p) => { ev(p, 'bk_' + (S.src[S.src.length - 1] || 'x')); return ogb(p); }; const obd = g.build.bind(g); g.build = async (p, i) => { ev(p, 'stage'); await obd(p, i); if (g.tileState[i].level === 3) ev(p, 'landmark'); }; const olt = g.loseTile.bind(g); g.loseTile = (i) => { const o = g.tileState[i].owner; if (o !== null && !g.players[o].bankrupt) ev(g.players[o], 'lostTile'); return olt(i); };
      const pt = g.playTurn.bind(g);
      g.playTurn = async (p) => {
        S.src.push('income');
        // 收入在 playTurn 一開始就發；擲骰子後改成 other
        const rd = g.resolveTile.bind(g);
        const ow = g.walk.bind(g);
        g.walk = async (...a) => { S.src[0] = 'walk'; return ow(...a); };
        try { return await pt(p); } finally { S.src.length = 0; g.walk = ow; }
      };
      // 每回合記錄排名
      const rp = g.recordPoll.bind(g);
      g.recordPoll = (who) => { rp(who); if (who === null || who === g.players.length - 1) S.mh.push(g.players.map((p) => p.money)); };
    };
    tick();
  }, [rounds, quizFlag === 'quiz', seats, SPEED]);

  const t0 = Date.now();
  while (Date.now() - t0 < 20 * 60 * 1000) {
    await pg.waitForTimeout(1000);
    const over = await pg.evaluate(() => { const g = __game.scene.getScene('game'); return g && g.gameOver; });
    if (over) break;
  }
  const res = await pg.evaluate(() => {
    const g = __game.scene.getScene('game');
    const S = window.__S;
    const G = g.generals;
    return {
      over: g.gameOver,
      round: g.round,
      players: g.players.map((p) => ({
        strat: p.strat, fans: p.bankrupt ? 0 : p.fans, money: p.money, bankrupt: p.bankrupt,
        chiefs: g.tileState.filter((s, i) => s.owner === p.id && TILES[i].type === 'chief').length,
        lands: g.tileState.filter((s, i) => s.owner === p.id && TILES[i].type === 'property').length,
        levels: g.tileState.reduce((n, s) => n + (s.owner === p.id ? s.level : 0), 0),
        gens: G.ownedBy(p).length,
        src: S.fans[p.id], ev: S.ev[p.id], mon: S.mon[p.id],
      })),
      mh: S.mh, history: g.history.filter((h) => h.who === null || h.who === g.players.length - 1).map((h) => h.fans),
    };
  });
  res.errs = errs;
  await pg.close();
  return res;
}

(async () => {
  const browser = await chromium.launch();
  const out = [];
  let next = 0;
  const worker = async () => {
    while (next < N) {
      const k = next++;
      try {
        const r = await playOne(browser, k);
        out.push(r);
        process.stdout.write(`${name} game ${k} done r${r.round} over=${r.over} errs=${r.errs.length}\n`);
      } catch (e) { process.stdout.write(`game ${k} fail ${e.message}\n`); }
      fs.writeFileSync(`${__dirname}/res_${name}.json`, JSON.stringify(out));
    }
  };
  await Promise.all(Array.from({ length: PAR }, worker));
  await browser.close();
})();
