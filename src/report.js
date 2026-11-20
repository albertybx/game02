// =====================================================================
// 選戰趨勢變化報告：投票日結算畫面的按鈕，打開後看整場選戰的民調走勢
// 每位玩家一條折線（支持者人數），每條線用不同的虛線樣式和名字標籤，色弱也分得出來。
// 手指或滑鼠移到圖上，會顯示那個時間點每個人的支持者。
// =====================================================================

const LINE_DASH = ['', '9 5', '3 4', '12 4 3 4']; // 每位玩家的線條樣式（實線、虛線、點線、點虛線）

function niceMax(v) {
  const step = Math.pow(10, Math.floor(Math.log10(Math.max(v, 1))));
  for (const m of [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]) if (m * step >= v) return m * step;
  return 10 * step;
}

// 從紀錄算出一些重點數字
function reportStats(history, players) {
  let leadChanges = 0;
  let lastLeader = null;
  const leadTurns = players.map(() => 0);
  let bestGain = { amount: 0, who: null, round: 0 };
  history.forEach((h, i) => {
    const max = Math.max(...h.fans);
    const leader = h.fans.indexOf(max);
    if (i > 0) {
      leadTurns[leader]++;
      if (lastLeader !== null && leader !== lastLeader) leadChanges++;
      h.fans.forEach((f, k) => {
        const d = f - history[i - 1].fans[k];
        if (d > bestGain.amount) bestGain = { amount: d, who: k, round: h.round };
      });
    }
    lastLeader = leader;
  });
  const longest = leadTurns.indexOf(Math.max(...leadTurns));
  return { leadChanges, longest, leadTurns, bestGain };
}

function reportChartSVG(history, players) {
  const narrow = window.innerWidth < 560; // 手機：用窄一點的畫布，字才不會被縮得太小
  const Wd = narrow ? 360 : 640;
  const Ht = narrow ? 280 : 330;
  const m = narrow ? { l: 42, r: 82, t: 12, b: 34 } : { l: 56, r: 96, t: 14, b: 40 };
  const pw = Wd - m.l - m.r;
  const ph = Ht - m.t - m.b;
  const N = history.length - 1;
  const maxV = niceMax(Math.max(...history.flatMap((h) => h.fans)) * 1.08);
  const X = (i) => m.l + (N ? (i / N) * pw : 0);
  const Y = (v) => m.t + ph - (v / maxV) * ph;

  // 格線和 y 軸數字
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(maxV * f));
  let grid = yTicks.map((v) => `
    <line x1="${m.l}" x2="${m.l + pw}" y1="${Y(v)}" y2="${Y(v)}" class="r-grid"/>
    <text x="${m.l - 8}" y="${Y(v) + 5}" text-anchor="end" class="r-axis">${v}</text>`).join('');

  // x 軸：回合（最多標 6 個，避免擠在一起）
  const roundStarts = [];
  history.forEach((h, i) => { if (i === 0 || h.round !== history[i - 1].round) roundStarts.push({ i, round: h.round }); });
  const every = Math.max(1, Math.ceil(roundStarts.length / (narrow ? 4 : 6)));
  grid += roundStarts.filter((r, k) => k % every === 0).map((r) => `
    <line x1="${X(r.i)}" x2="${X(r.i)}" y1="${m.t + ph}" y2="${m.t + ph + 5}" class="r-tick"/>
    <text x="${X(r.i)}" y="${m.t + ph + 22}" text-anchor="middle" class="r-axis">${r.i === 0 ? '開始' : `第${r.round}回`}</text>`).join('');
  grid += `<line x1="${m.l}" x2="${m.l + pw}" y1="${m.t + ph}" y2="${m.t + ph}" class="r-base"/>`;

  // 折線
  const lines = players.map((p, k) => {
    const d = history.map((h, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)},${Y(h.fans[k]).toFixed(1)}`).join('');
    return `<path d="${d}" fill="none" stroke="${p.color}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" stroke-dasharray="${LINE_DASH[k]}"/>`;
  }).join('');

  // 線尾的點和名字（名字彼此推開，不重疊）
  const ends = players.map((p, k) => ({ k, y: Y(history[N].fans[k]), ly: Y(history[N].fans[k]) }));
  ends.sort((a, b) => a.y - b.y);
  for (let i = 1; i < ends.length; i++) if (ends[i].ly - ends[i - 1].ly < 18) ends[i].ly = ends[i - 1].ly + 18;
  const labels = ends.map((e) => {
    const p = players[e.k];
    return `
      <circle cx="${X(N)}" cy="${e.y}" r="5" fill="${p.color}" stroke="#1d2b53" stroke-width="2"/>
      <line x1="${X(N) + 6}" y1="${e.y}" x2="${X(N) + 14}" y2="${e.ly}" class="r-tick"/>
      <text x="${X(N) + 16}" y="${e.ly + 5}" class="r-end">${escapeHTML(p.name)}</text>`;
  }).join('');

  return {
    svg: `<svg viewBox="0 0 ${Wd} ${Ht}" class="r-chart" role="img" aria-label="每位候選人支持者人數隨回合變化的折線圖">
      ${grid}${lines}${labels}
      <line class="r-cross" x1="0" x2="0" y1="${m.t}" y2="${m.t + ph}" visibility="hidden"/>
      <g class="r-dots"></g>
      <rect class="r-hit" x="${m.l}" y="${m.t}" width="${pw}" height="${ph}" fill="transparent"/>
    </svg>`,
    X, Y, N, m, pw, Wd, Ht,
  };
}

function showReport(gs) {
  if (document.getElementById('report')) return;
  const players = gs.players;
  const history = gs.history.length > 1 ? gs.history : [...gs.history, gs.history[0]];
  const stats = reportStats(history, players);
  const chart = reportChartSVG(history, players);
  const final = history[history.length - 1].fans;

  const legend = players.map((p, k) => `
    <span class="r-key">
      <svg width="30" height="10" aria-hidden="true"><line x1="1" x2="29" y1="5" y2="5" stroke="${p.color}" stroke-width="3" stroke-dasharray="${LINE_DASH[k]}"/></svg>
      ${escapeHTML(p.name)} <b>${final[k]}</b>
    </span>`).join('');

  // 每回合結束時的數字（數據表）
  const rows = [];
  history.forEach((h, i) => { if (i === 0 || i === history.length - 1 || h.round !== history[i + 1].round) rows.push({ label: i === 0 ? '開始' : `第 ${h.round} 回合`, fans: h.fans }); });
  const table = `
    <table>
      <thead><tr><th>時間</th>${players.map((p) => `<th>${escapeHTML(p.name)}</th>`).join('')}</tr></thead>
      <tbody>${rows.map((r) => `<tr><td>${r.label}</td>${r.fans.map((f) => `<td>${f}</td>`).join('')}</tr>`).join('')}</tbody>
    </table>`;

  const lead = players[stats.longest];
  const gain = stats.bestGain.who === null ? null : players[stats.bestGain.who];
  const wrap = document.createElement('div');
  wrap.id = 'report';
  wrap.innerHTML = `
    <div class="g-box" role="dialog" aria-label="選戰趨勢變化報告">
      <div class="g-head"><span>選戰趨勢變化報告</span><button type="button" id="r-close">關閉 ✕</button></div>
      <div class="g-body">
        <div class="r-stats">
          <div><span>領先換人</span><b>${stats.leadChanges} 次</b></div>
          <div><span>領先最久</span><b>${escapeHTML(lead.name)}</b><small>${stats.leadTurns[stats.longest]} 個回合</small></div>
          <div><span>單回合最大成長</span><b>${gain ? `+${stats.bestGain.amount}` : '－'}</b><small>${gain ? `${escapeHTML(gain.name)}・第 ${stats.bestGain.round} 回合` : ''}</small></div>
        </div>
        <h3>民調走勢（支持者人數）</h3>
        <div class="r-legend">${legend}</div>
        <div class="r-plot">${chart.svg}<div class="r-tip" hidden></div></div>
        <details><summary>查看每回合數據表</summary><div class="r-table">${table}</div></details>
      </div>
    </div>`;
  document.body.appendChild(wrap);
  setGameInput(false);
  const close = () => { wrap.remove(); setGameInput(true); Sfx.click(); };
  wrap.querySelector('#r-close').addEventListener('click', close);
  wrap.addEventListener('click', (e) => { if (e.target === wrap) close(); });

  // 手指或滑鼠移到圖上：顯示那個時間點每個人的支持者
  const svg = wrap.querySelector('.r-chart');
  const hit = svg.querySelector('.r-hit');
  const cross = svg.querySelector('.r-cross');
  const dots = svg.querySelector('.r-dots');
  const tip = wrap.querySelector('.r-tip');
  const plot = wrap.querySelector('.r-plot');
  const showAt = (clientX) => {
    const box = svg.getBoundingClientRect();
    const sx = (clientX - box.left) * (chart.Wd / box.width);
    const i = Math.max(0, Math.min(chart.N, Math.round(((sx - chart.m.l) / chart.pw) * chart.N)));
    const h = history[i];
    const x = chart.X(i);
    cross.setAttribute('x1', x);
    cross.setAttribute('x2', x);
    cross.setAttribute('visibility', 'visible');
    dots.innerHTML = players.map((p, k) => `<circle cx="${x}" cy="${chart.Y(h.fans[k])}" r="5" fill="${p.color}" stroke="#1d2b53" stroke-width="2"/>`).join('');
    const order = players.map((p, k) => ({ p, v: h.fans[k] })).sort((a, b) => b.v - a.v);
    tip.innerHTML = `<p>${i === 0 ? '開始' : `第 ${h.round} 回合・${escapeHTML(players[h.who] ? players[h.who].name : '')}之後`}</p>${order.map((o) => `<p><i style="background:${o.p.color}"></i>${escapeHTML(o.p.name)}<b>${o.v}</b></p>`).join('')}`;
    tip.hidden = false;
    const left = (x / chart.Wd) * box.width;
    const pbox = plot.getBoundingClientRect();
    tip.style.left = `${Math.min(Math.max(left - tip.offsetWidth / 2, 0), pbox.width - tip.offsetWidth)}px`;
  };
  const hide = () => { cross.setAttribute('visibility', 'hidden'); dots.innerHTML = ''; tip.hidden = true; };
  hit.addEventListener('pointermove', (e) => showAt(e.clientX));
  hit.addEventListener('pointerdown', (e) => showAt(e.clientX));
  hit.addEventListener('pointerleave', hide);
}
