// =====================================================================
// 戰將系統：招募、派任務、駐守、拔樁戰、忠誠度、挖角、醜聞
// 規則數字都在 data.js 的 GENERAL_RULES；戰將名單在 GENERALS。
// 畫面用網頁視窗（跟英文挑戰一樣），手機也好點。
// =====================================================================

const GR = () => GENERAL_RULES;
const STAT_NAMES = { eloquence: '口才', network: '人脈', charisma: '魅力' };
const genImg = (g) => `${g.image}?v=${window.GAME_VERSION || ''}`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// 一張戰將小卡（大頭照＋能力條）
function generalCardHTML(g, extra = '') {
  const bar = (k) => `<div class="gv-stat"><span>${STAT_NAMES[k]}</span><i>${'■'.repeat(g[k])}<em>${'■'.repeat(5 - g[k])}</em></i><b>${g[k]}</b></div>`;
  return `
    <div class="gv-card">
      <div class="gv-face" style="background-image:url('${genImg(g)}')"></div>
      <div class="gv-info">
        <p class="gv-name">${escapeHTML(g.name)}<small>${escapeHTML(g.title)}・${escapeHTML(g.home)}</small></p>
        ${bar('eloquence')}${bar('network')}${bar('charisma')}
        ${extra}
      </div>
    </div>`;
}

// 打開一個視窗，按下某個按鈕（data-v）就回傳那個值
function gvModal({ title, color = '#ffa300', who, body, autoValue, autoDelay = 1300 }) {
  return new Promise((resolve) => {
    const wrap = document.createElement('div');
    wrap.className = 'gv-modal';
    wrap.innerHTML = `
      <div class="gv-box" role="dialog" aria-label="${escapeHTML(title)}" style="--gv:${color}">
        <div class="gv-head"><span>${escapeHTML(title)}</span>${who ? `<span class="gv-who" style="background:${who.color}">${escapeHTML(who.name)}${who.human ? '' : '（電腦）'}</span>` : ''}</div>
        <div class="gv-body">${body}</div>
      </div>`;
    document.body.appendChild(wrap);
    setGameInput(false);
    let done = false;
    const finish = (v) => {
      if (done) return;
      done = true;
      wrap.remove();
      setGameInput(true);
      resolve(v);
    };
    wrap.querySelectorAll('[data-v]').forEach((b) => b.addEventListener('click', () => { Sfx.click(); finish(b.dataset.v); }));
    // 電腦玩家：顯示一下就自動選
    if (autoValue !== undefined) {
      wrap.querySelectorAll('button').forEach((b) => { b.disabled = true; });
      const pick = wrap.querySelector(`[data-v="${autoValue}"]`);
      if (pick) pick.classList.add('gv-picked');
      setTimeout(() => finish(String(autoValue)), autoDelay);
    }
  });
}

class GeneralSystem {
  constructor(gs) {
    this.gs = gs;
    this.list = GENERALS.map((g) => ({
      ...g, owner: null, loyalty: GR().startLoyalty, rest: 0, stationedAt: null, style: null, idle: 0,
    }));
  }

  // ---------- 查詢 ----------
  ownedBy(p) { return this.list.filter((g) => g.owner === p.id); }
  free() { return this.list.filter((g) => g.owner === null); }
  available(p) { return this.ownedBy(p).filter((g) => g.rest === 0 && g.stationedAt === null); }
  stationedAt(i) { return this.list.find((g) => g.stationedAt === i) || null; }

  // 樁腳穩固度：剛買是 1，每擁有 3 回合 +1，最高 4；選民服務可以再加
  stability(i) {
    const st = this.gs.tileState[i];
    const base = Math.min(GR().stakeMax, 1 + Math.floor((this.gs.round - (st.since || this.gs.round)) / GR().stakeEvery));
    return Math.min(GR().stakeMax + 1, base + (st.bonus || 0));
  }

  statusText(g) {
    if (g.stationedAt !== null) return `駐守 ${TILES[g.stationedAt].district}`;
    if (g.rest > 0) return `休息 ${g.rest} 回合`;
    return '待命';
  }

  // ---------- 回合開始：休息倒數、太久沒出任務會掉忠誠度 ----------
  onTurnStart(p) {
    for (const g of this.ownedBy(p)) {
      if (g.rest > 0) g.rest--;
      if (g.stationedAt === null) {
        g.idle++;
        if (g.idle >= GR().idleTurns) { g.loyalty = Math.max(0, g.loyalty - GR().loyaltyIdle); g.idle = 0; }
      }
    }
  }

  release(p) { // 破產：戰將全部離隊
    for (const g of this.ownedBy(p)) Object.assign(g, { owner: null, stationedAt: null, rest: 0, loyalty: GR().startLoyalty });
    this.gs.refreshStations();
  }

  // =====================================================================
  // 戰將招募站：翻 2 張挑 1 位；也可以挖角對手忠誠度低的戰將
  // =====================================================================
  poachChance(g) {
    return Math.min(0.95, 0.4 + (GR().poachBelow - g.loyalty) / 50);
  }

  async onRecruit(p) {
    const gs = this.gs;
    const R = GR();
    const picks = Phaser.Utils.Array.Shuffle(this.free()).slice(0, R.recruitChoices);
    const poachable = this.list.filter((g) => g.owner !== null && g.owner !== p.id && g.loyalty < R.poachBelow);
    const mine = this.ownedBy(p);
    const full = mine.length >= R.maxPerPlayer;
    if (!picks.length && !poachable.length) {
      gs.hud.say(`${p.name} 來到戰將招募站，\n可惜今天沒有人可以招募`);
      await gs.wait(1000);
      return;
    }
    gs.hud.say(`${p.name} 來到戰將招募站！`);

    // 電腦怎麼選
    let auto;
    if (!p.human) {
      const target = poachable.find((g) => p.money >= R.poachCost + 200);
      if (target) auto = `poach:${target.id}`;
      else if (!full && picks.length && p.money >= R.recruitCost + 300) {
        // 優先挑出身在自己有里長的區
        const myDistricts = TILES.filter((t, i) => t.type === 'chief' && gs.tileState[i].owner === p.id).map((t) => t.district);
        const best = picks.find((g) => myDistricts.includes(g.home)) || picks[0];
        auto = `hire:${best.id}`;
      } else auto = 'skip';
    }

    const body = `
      <p class="gv-tip">招募費 $${R.recruitCost}，每人最多 ${R.maxPerPlayer} 位戰將${full ? '（已滿，招募新人要先請一位離隊）' : ''}。你有 $${p.money}。</p>
      <div class="gv-grid">${picks.map((g) => generalCardHTML(g, `<button type="button" data-v="hire:${g.id}" ${p.money < R.recruitCost ? 'disabled' : ''}>招募 $${R.recruitCost}</button>`)).join('')}</div>
      ${poachable.length ? `<h4>可以挖角（忠誠度低於 ${R.poachBelow}）</h4>
      <div class="gv-grid">${poachable.map((g) => generalCardHTML(g, `
        <p class="gv-sub">目前在 ${escapeHTML(gs.players[g.owner].name)} 陣營・忠誠度 ${g.loyalty}</p>
        <button type="button" data-v="poach:${g.id}" ${p.money < R.poachCost ? 'disabled' : ''}>挖角（成功率 ${Math.round(this.poachChance(g) * 100)}%，成功才付 $${R.poachCost}）</button>`)).join('')}</div>` : ''}
      <button type="button" class="gv-skip" data-v="skip">先不要</button>`;
    const v = await gvModal({ title: '戰將招募站', color: '#ffa300', who: p, body, autoValue: auto });
    if (v === 'skip') return;

    const [kind, idStr] = v.split(':');
    const g = this.list[Number(idStr)];
    if (kind === 'poach') {
      if (Math.random() < this.poachChance(g)) {
        const old = gs.players[g.owner];
        p.money -= R.poachCost;
        Object.assign(g, { owner: p.id, stationedAt: null, rest: 0, loyalty: R.startLoyalty, idle: 0 });
        gs.refreshStations();
        gs.hud.say(`挖角成功！${g.name} 從 ${old.name} 陣營\n轉投 ${p.name}！花費 $${R.poachCost}`);
        Sfx.buy();
        await this.makeRoom(p, g);
      } else {
        g.loyalty = Math.min(100, g.loyalty + 10);
        gs.hud.say(`${g.name} 拒絕了 ${p.name} 的挖角，\n對原陣營的忠誠度反而提高了`);
        Sfx.bad();
      }
      gs.hud.refreshPanels();
      await gs.wait(1400);
      return;
    }
    // 招募
    if (full && !(await this.makeRoom(p, null))) return;
    p.money -= R.recruitCost;
    Object.assign(g, { owner: p.id, loyalty: R.startLoyalty, rest: 0, stationedAt: null, idle: 0 });
    Sfx.buy();
    gs.hud.say(`${g.name}（${g.title}）加入 ${p.name} 陣營！`);
    gs.hud.refreshPanels();
    await gs.wait(1200);
  }

  // 戰將滿了：選一位離隊。newcomer 已經加入時（挖角），從三位裡選
  async makeRoom(p, newcomer) {
    const mine = this.ownedBy(p);
    if (mine.length <= GR().maxPerPlayer) return true;
    const auto = p.human ? undefined : mine.filter((g) => g !== newcomer).sort((a, b) => a.loyalty - b.loyalty)[0].id;
    const v = await gvModal({
      title: '戰將名額已滿', color: '#ff77a8', who: p, autoValue: auto,
      body: `<p class="gv-tip">每人最多 ${GR().maxPerPlayer} 位戰將，請選一位離隊。</p>
        <div class="gv-grid">${mine.map((g) => generalCardHTML(g, `<p class="gv-sub">忠誠度 ${g.loyalty}・${this.statusText(g)}</p><button type="button" data-v="${g.id}">請他離隊</button>`)).join('')}</div>
        ${newcomer ? '' : '<button type="button" class="gv-skip" data-v="cancel">不招募了</button>'}`,
    });
    if (v === 'cancel') return false;
    const g = this.list[Number(v)];
    Object.assign(g, { owner: null, stationedAt: null, rest: 0, loyalty: GR().startLoyalty });
    this.gs.refreshStations();
    return true;
  }

  // =====================================================================
  // 走到自己的里長格：派任務（跑紅白帖／選民服務／媒體宣傳）或駐守
  // =====================================================================
  missionGain(g, stat, tile) {
    const R = GR();
    const s = g[stat] + (g.home === tile.district ? R.homeBonus : 0);
    return { s, min: R.missionBase + s * R.missionPerStat + 10, max: R.missionBase + s * R.missionPerStat + 60 };
  }

  async onOwnChief(p, i) {
    const gs = this.gs;
    const R = GR();
    const t = TILES[i];
    const guard = this.stationedAt(i);
    const avail = this.available(p);
    if (!avail.length && !guard) {
      gs.hud.say(`${t.name} 是自己人，\n里民服務做得好，口碑不錯！`);
      await gs.wait(1000);
      return;
    }
    const MISSIONS = [
      { key: 'wedding', name: '跑紅白帖', stat: 'charisma', note: '不花錢' },
      { key: 'service', name: '選民服務', stat: 'network', note: '這格樁腳更穩 +1' },
      { key: 'media', name: '媒體宣傳', stat: 'eloquence', note: `花 $${R.mediaCost}，效果 ×${R.mediaBonus}` },
    ];

    // 電腦：這格沒人守、又有兩位可用 → 派一位駐守；否則派最強的任務
    let auto;
    if (!p.human) {
      if (!guard && avail.length >= 2 && Math.random() < 0.6) auto = `station:${avail[0].id}`;
      else if (avail.length) {
        let best = null;
        for (const g of avail) for (const m of MISSIONS) {
          if (m.key === 'media' && p.money < R.mediaCost + 200) continue;
          const val = this.missionGain(g, m.stat, t).s * (m.key === 'media' ? R.mediaBonus : 1);
          if (!best || val > best.val) best = { val, v: `m:${m.key}:${g.id}` };
        }
        auto = best ? best.v : 'skip';
      } else auto = 'skip';
    }

    const card = (g) => generalCardHTML(g, `
      <p class="gv-sub">忠誠度 ${g.loyalty}${g.home === t.district ? '・在家鄉 +1' : ''}</p>
      <div class="gv-actions">
        ${MISSIONS.map((m) => {
          const r = this.missionGain(g, m.stat, t);
          const mult = m.key === 'media' ? R.mediaBonus : 1;
          const dis = m.key === 'media' && p.money < R.mediaCost;
          return `<button type="button" data-v="m:${m.key}:${g.id}" ${dis ? 'disabled' : ''}>${m.name}<small>看${STAT_NAMES[m.stat]}・支持 +${Math.round(r.min * mult)}～${Math.round(r.max * mult)}・${m.note}</small></button>`;
        }).join('')}
        ${guard ? '' : `<button type="button" data-v="station:${g.id}">留下來駐守這格<small>對手來拔樁時由他防守</small></button>`}
      </div>`);
    const body = `
      <p class="gv-tip">${escapeHTML(t.name)}・樁腳穩固度 ${this.stability(i)}${guard ? `・目前由 ${escapeHTML(guard.name)} 駐守` : '・目前沒有戰將駐守'}</p>
      ${guard ? `<button type="button" class="gv-skip" data-v="recall:${guard.id}">撤回駐守的 ${escapeHTML(guard.name)}</button>` : ''}
      <div class="gv-grid">${avail.map(card).join('')}</div>
      <button type="button" class="gv-skip" data-v="skip">這次不派</button>`;
    const v = await gvModal({ title: '里長格：派出戰將', color: '#00e436', who: p, body, autoValue: auto });
    if (v === 'skip') return;
    const parts = v.split(':');
    if (parts[0] === 'recall') {
      const g = this.list[Number(parts[1])];
      g.stationedAt = null;
      g.idle = 0;
      gs.refreshStations();
      gs.hud.say(`${g.name} 撤回待命`);
      await gs.wait(800);
      return;
    }
    if (parts[0] === 'station') {
      const g = this.list[Number(parts[1])];
      const style = await this.pickStyle(p, g);
      Object.assign(g, { stationedAt: i, style, idle: 0 });
      gs.refreshStations();
      gs.hud.say(`${g.name} 駐守 ${t.district}！\n防守風格：偏愛「${TACTICS[style].name}」`);
      Sfx.buy();
      await gs.wait(1100);
      return;
    }
    // 任務
    const m = MISSIONS.find((x) => x.key === parts[1]);
    const g = this.list[Number(parts[2])];
    const r = this.missionGain(g, m.stat, t);
    let gain = R.missionBase + r.s * R.missionPerStat + Phaser.Math.Between(1, 6) * 10;
    if (m.key === 'media') { p.money -= R.mediaCost; gain = Math.round(gain * R.mediaBonus); }
    if (m.key === 'service') gs.tileState[i].bonus = Math.min(1, (gs.tileState[i].bonus || 0) + 1);
    Object.assign(g, { rest: R.missionRest + 1, idle: 0, loyalty: Math.min(100, g.loyalty + R.loyaltyMission) });
    gs.hud.say(`${g.name} 出任務：${m.name}！\n支持者 +${gain}${m.key === 'service' ? '，樁腳更穩了' : ''}`);
    gs.changeFans(p, gain);
    await gs.wait(1200);
  }

  // 駐守時選防守風格（電腦玩家來拔樁時，駐守戰將 7 成會出這招）
  async pickStyle(p, g) {
    const bestStat = ['eloquence', 'network', 'charisma'].sort((a, b) => g[b] - g[a])[0];
    const best = Object.keys(TACTICS).find((k) => TACTICS[k].stat === bestStat);
    if (!p.human) return best;
    const v = await gvModal({
      title: '選擇防守風格', color: '#29adff', who: p,
      body: `<p class="gv-tip">對手來拔樁時，${escapeHTML(g.name)} 大多會出這一招。風格會公開給對手看，小心被剋！</p>
        <div class="gv-actions">${Object.entries(TACTICS).map(([k, tc]) => `<button type="button" data-v="${k}">${tc.name}<small>用${tc.statName} ${g[tc.stat]}・剋「${TACTICS[tc.beats].name}」</small></button>`).join('')}</div>`,
    });
    return v;
  }

  // =====================================================================
  // 拔樁戰：三戰兩勝。每輪雙方出一招，分數 = 能力 + 骰子(1～6) + 剋招 +2 + 家鄉 +1，平手算守方贏
  // =====================================================================
  defenderOf(i) {
    const guard = this.stationedAt(i);
    const t = TILES[i];
    if (guard) {
      const home = guard.home === t.district ? GR().homeBonus : 0;
      return { name: guard.name, title: `${guard.title}（駐守）`, general: guard, style: guard.style, image: genImg(guard), stats: { eloquence: guard.eloquence + home, network: guard.network + home, charisma: guard.charisma + home }, home };
    }
    const s = this.stability(i);
    return { name: '地方樁腳', title: `穩固度 ${s}`, general: null, style: null, image: null, stats: { eloquence: s, network: s, charisma: s }, home: 0 };
  }

  attackerStats(g, i) {
    const home = g.home === TILES[i].district ? GR().homeBonus : 0;
    return { eloquence: g.eloquence + home, network: g.network + home, charisma: g.charisma + home };
  }

  // 守方出招的機率：有風格 → 7 成出風格那招，其他平分；樁腳 → 三招平均
  defenseOdds(def) {
    if (!def.style) return { speech: 1 / 3, visit: 1 / 3, rally: 1 / 3 };
    const o = { speech: 0.1, visit: 0.1, rally: 0.1 };
    o[def.style] += 0.7;
    return o;
  }

  // 一輪：攻方出 ta 時贏的機率（精確計算，不用模擬）
  roundWinProb(atk, ta, def) {
    const odds = this.defenseOdds(def);
    let p = 0;
    for (const [td, w] of Object.entries(odds)) {
      const a = atk[TACTICS[ta].stat] + (TACTICS[ta].beats === td ? GR().counterBonus : 0);
      const d = def.stats[TACTICS[td].stat] + (TACTICS[td].beats === ta ? GR().counterBonus : 0);
      let win = 0;
      for (let x = 1; x <= 6; x++) for (let y = 1; y <= 6; y++) if (a + x > d + y) win++;
      p += w * win / 36;
    }
    return p;
  }

  bestTactic(atk, def) {
    return Object.keys(TACTICS).sort((a, b) => this.roundWinProb(atk, b, def) - this.roundWinProb(atk, a, def))[0];
  }

  // 整場勝算（每輪都出最好的招）：三戰兩勝 = p²(3 − 2p)
  winChance(g, i) {
    const atk = this.attackerStats(g, i);
    const def = this.defenderOf(i);
    const p = this.roundWinProb(atk, this.bestTactic(atk, def), def);
    return p * p * (3 - 2 * p);
  }

  // 走到對手的里長格（付完過路費之後）：要不要派戰將拔樁？
  async onRivalChief(p, i) {
    const gs = this.gs;
    const avail = this.available(p);
    if (!avail.length || p.bankrupt) return;
    const t = TILES[i];
    const owner = gs.players[gs.tileState[i].owner];
    const def = this.defenderOf(i);
    const chances = avail.map((g) => ({ g, c: this.winChance(g, i) })).sort((a, b) => b.c - a.c);

    let auto;
    if (!p.human) {
      const behind = gs.players.some((o) => !o.bankrupt && o.fans > p.fans);
      auto = chances[0].c >= (behind ? 0.4 : 0.5) ? `go:${chances[0].g.id}` : 'skip';
    }
    const defCard = def.general
      ? generalCardHTML(def.general, `<p class="gv-sub">防守風格：偏愛「${TACTICS[def.style].name}」${def.home ? '・在家鄉 +1' : ''}</p>`)
      : `<div class="gv-card"><div class="gv-face gv-stake">樁</div><div class="gv-info"><p class="gv-name">地方樁腳<small>沒有戰將駐守</small></p><p class="gv-sub">三項能力都是穩固度 ${this.stability(i)}，出招隨機</p></div></div>`;
    const body = `
      <p class="gv-tip">${escapeHTML(t.name)} 是 ${escapeHTML(owner.name)} 的樁腳。派戰將拔樁：<b>成功</b>搶下這格；<b>失敗</b>你的 ${GR().loseFans} 位支持者倒戈，戰將休息 ${GR().loseRest} 回合。</p>
      <h4>守方</h4>${defCard}
      <h4>派誰出戰？（勝算是每輪都出最好的招時）</h4>
      <div class="gv-grid">${chances.map(({ g, c }) => generalCardHTML(g, `<button type="button" data-v="go:${g.id}">派 ${escapeHTML(g.name)} 出戰<small>勝算 ${Math.round(c * 100)}%${g.home === t.district ? '・在家鄉 +1' : ''}</small></button>`)).join('')}</div>
      <button type="button" class="gv-skip" data-v="skip">不拔樁</button>`;
    const v = await gvModal({ title: `拔樁挑戰：${t.district}`, color: '#ff004d', who: p, body, autoValue: auto, autoDelay: 1600 });
    if (v === 'skip') return;
    const g = this.list[Number(v.split(':')[1])];
    await this.battle(p, g, i);
  }

  // 拔樁戰本體
  async battle(p, g, i) {
    const gs = this.gs;
    const R = GR();
    const t = TILES[i];
    const owner = gs.players[gs.tileState[i].owner];
    const def = this.defenderOf(i);
    const atk = this.attackerStats(g, i);
    const watchOnly = !p.human; // 電腦攻擊：自動進行，大家用看的
    let aw = 0;
    let dw = 0;

    const wrap = document.createElement('div');
    wrap.className = 'gv-modal';
    const side = (name, title, img, stats, color) => `
      <div class="bt-side">
        ${img ? `<div class="gv-face" style="background-image:url('${img}')"></div>` : '<div class="gv-face gv-stake">樁</div>'}
        <p class="gv-name">${escapeHTML(name)}<small>${escapeHTML(title)}</small></p>
        <p class="bt-stats">口才 ${stats.eloquence}・人脈 ${stats.network}・魅力 ${stats.charisma}</p>
        <p class="bt-team" style="background:${color}"></p>
      </div>`;
    wrap.innerHTML = `
      <div class="gv-box" role="dialog" aria-label="拔樁戰" style="--gv:#ff004d">
        <div class="gv-head"><span>拔樁戰・${escapeHTML(t.district)}</span><span class="bt-score">0 : 0</span></div>
        <div class="gv-body">
          <div class="bt-vs">
            ${side(g.name, `${g.title}・${p.name}`, genImg(g), atk, p.color)}
            <div class="bt-mid">VS</div>
            ${side(def.name, `${def.title}・${owner.name}`, def.image, def.stats, owner.color)}
          </div>
          <p class="gv-tip bt-rule">三戰兩勝。演講剋造勢、造勢剋拜訪、拜訪剋演講。分數 = 能力 + 骰子 + 剋招 ${R.counterBonus} + 家鄉 ${R.homeBonus}，平手算守方贏。${def.style ? `守方偏愛「${TACTICS[def.style].name}」。` : ''}</p>
          <div class="bt-log"></div>
          <div class="bt-pick"></div>
        </div>
      </div>`;
    document.body.appendChild(wrap);
    setGameInput(false);
    const log = wrap.querySelector('.bt-log');
    const pickBox = wrap.querySelector('.bt-pick');
    const scoreEl = wrap.querySelector('.bt-score');

    const choose = (round) => new Promise((resolve) => {
      const best = this.bestTactic(atk, def);
      if (watchOnly) {
        const ta = Math.random() < 0.7 ? best : Phaser.Utils.Array.GetRandom(Object.keys(TACTICS));
        setTimeout(() => resolve(ta), 900);
        pickBox.innerHTML = `<p class="gv-tip">第 ${round} 輪：${escapeHTML(g.name)} 思考中…</p>`;
        return;
      }
      pickBox.innerHTML = `<p class="gv-tip">第 ${round} 輪：選一招</p><div class="gv-actions bt-tactics">${Object.entries(TACTICS).map(([k, tc]) => `
        <button type="button" data-t="${k}">${tc.name}<small>${tc.statName} ${atk[tc.stat]}・剋「${TACTICS[tc.beats].name}」・這輪勝率 ${Math.round(this.roundWinProb(atk, k, def) * 100)}%</small></button>`).join('')}</div>`;
      pickBox.querySelectorAll('[data-t]').forEach((b) => b.addEventListener('click', () => { Sfx.click(); resolve(b.dataset.t); }));
    });

    for (let round = 1; aw < 2 && dw < 2; round++) {
      const ta = await choose(round);
      const odds = this.defenseOdds(def);
      let r = Math.random();
      let td = 'speech';
      for (const [k, w] of Object.entries(odds)) { if ((r -= w) < 0) { td = k; break; } }
      pickBox.innerHTML = '';
      const da = Phaser.Math.Between(1, 6);
      const dd = Phaser.Math.Between(1, 6);
      const ca = TACTICS[ta].beats === td ? R.counterBonus : 0;
      const cd = TACTICS[td].beats === ta ? R.counterBonus : 0;
      const sa = atk[TACTICS[ta].stat] + da + ca;
      const sd = def.stats[TACTICS[td].stat] + dd + cd;
      const win = sa > sd;
      const line = document.createElement('div');
      line.className = 'bt-round';
      line.innerHTML = `<b>第 ${round} 輪</b> ${escapeHTML(g.name)} 出「${TACTICS[ta].name}」 vs ${escapeHTML(def.name)} 出「${TACTICS[td].name}」<span class="bt-dice">擲骰中…</span>`;
      log.appendChild(line);
      for (let k = 0; k < 6; k++) { Sfx.beep(300 + k * 60, 0.03); await sleep(90); line.querySelector('.bt-dice').textContent = `🎲 ${Phaser.Math.Between(1, 6)} : ${Phaser.Math.Between(1, 6)}`; }
      line.querySelector('.bt-dice').innerHTML = `${atk[TACTICS[ta].stat]}+骰${da}${ca ? `+剋${ca}` : ''} = <b>${sa}</b>　vs　${def.stats[TACTICS[td].stat]}+骰${dd}${cd ? `+剋${cd}` : ''} = <b>${sd}</b>　→ <em class="${win ? 'ok' : 'bad'}">${win ? '攻方贏' : (sa === sd ? '平手，守方贏' : '守方贏')}</em>`;
      if (win) { aw++; Sfx.coin(); } else { dw++; Sfx.pay(); }
      scoreEl.textContent = `${aw} : ${dw}`;
      log.scrollTop = log.scrollHeight;
      await sleep(watchOnly ? 900 : 500);
    }

    const success = aw >= 2;
    const res = document.createElement('div');
    res.className = `bt-result ${success ? 'ok' : 'bad'}`;
    res.innerHTML = `<p>${success ? `拔樁成功！${escapeHTML(t.name)} 歸 ${escapeHTML(p.name)} 了！` : `拔樁失敗… ${R.loseFans} 位支持者倒戈給 ${escapeHTML(owner.name)}`}</p><button type="button" class="gv-next">繼續</button>`;
    pickBox.appendChild(res);
    if (success) Sfx.win(); else Sfx.bad();
    await new Promise((resolve) => {
      const btn = res.querySelector('.gv-next');
      if (p.human) btn.addEventListener('click', () => { Sfx.click(); resolve(); });
      else { btn.hidden = true; setTimeout(resolve, 2000); }
    });
    wrap.remove();
    setGameInput(true);

    // 結果
    g.idle = 0;
    if (success) {
      const st = gs.tileState[i];
      const guard = def.general;
      if (guard) Object.assign(guard, { stationedAt: null, rest: 1 });
      st.owner = p.id;
      st.level = 0;
      st.since = gs.round;
      st.bonus = 0;
      g.loyalty = Math.min(100, g.loyalty + R.loyaltyWin);
      gs.refreshTile(i);
      gs.refreshStations();
      gs.flashTile(i);
      gs.hud.say(`${g.name} 拔樁成功！\n${t.name} 歸 ${p.name}，支持者 +${R.winFans}`);
      gs.changeFans(p, R.winFans);
    } else {
      const lost = -gs.changeFans(p, -R.loseFans, true);
      gs.changeFans(owner, lost);
      g.rest = R.loseRest + 1;
      g.loyalty = Math.max(0, g.loyalty - R.loyaltyLose);
      if (def.general) def.general.loyalty = Math.min(100, def.general.loyalty + R.loyaltyWin);
      gs.hud.say(`${g.name} 拔樁失敗…\n${lost} 位支持者倒戈給 ${owner.name}`);
    }
    gs.hud.refreshPanels();
    await gs.wait(1200);
  }

  // =====================================================================
  // 卡片：戰將醜聞、士氣大振
  // =====================================================================
  async scandal(p) {
    const gs = this.gs;
    const R = GR();
    const mine = this.ownedBy(p);
    if (!mine.length) {
      gs.hud.say(`${p.name} 的幕僚發言失當，\n支持者 -100`);
      gs.changeFans(p, -100);
      await gs.wait(1000);
      return;
    }
    const g = Phaser.Utils.Array.GetRandom(mine);
    const what = Phaser.Utils.Array.GetRandom(['被翻出多年前的舊發文', '行程撞期放了大家鴿子', '受訪時說錯話', '被假消息抹黑，忙著澄清']);
    const wasGuard = g.stationedAt !== null;
    Object.assign(g, { rest: R.scandalRest + 1, stationedAt: null, loyalty: Math.max(0, g.loyalty - R.loyaltyScandal) });
    gs.refreshStations();
    gs.hud.say(`${g.name} ${what}！\n暫停活動 ${R.scandalRest} 回合${wasGuard ? '、撤回駐守' : ''}，支持者 -${R.scandalFans}`);
    gs.changeFans(p, -R.scandalFans);
    await gs.wait(1400);
  }

  async loyaltyAll(p, n) {
    const gs = this.gs;
    const mine = this.ownedBy(p);
    if (!mine.length) {
      gs.hud.say(`${p.name} 還沒有戰將，\n改成支持者 +100`);
      gs.changeFans(p, 100);
    } else {
      for (const g of mine) g.loyalty = Math.min(100, g.loyalty + n);
      gs.hud.say(`${mine.map((g) => g.name).join('、')} 士氣大振！\n忠誠度 +${n}`);
      Sfx.buy();
    }
    await gs.wait(1000);
  }

  // =====================================================================
  // 「戰將」按鈕：看所有陣營的戰將
  // =====================================================================
  showRoster() {
    if (document.querySelector('.gv-modal')) return;
    const gs = this.gs;
    const R = GR();
    const team = (p) => {
      const mine = this.ownedBy(p);
      return `<h4 style="border-left:8px solid ${p.color};padding-left:8px">${escapeHTML(p.name)}（${mine.length}/${R.maxPerPlayer}）</h4>
        ${mine.length ? `<div class="gv-grid">${mine.map((g) => generalCardHTML(g, `<p class="gv-sub">${this.statusText(g)}・忠誠度 <b class="${g.loyalty < R.poachBelow ? 'gv-low' : ''}">${g.loyalty}</b>${g.loyalty < R.poachBelow ? '（容易被挖角）' : ''}</p>`)).join('')}</div>` : '<p class="gv-sub">還沒有戰將</p>'}`;
    };
    const free = this.free();
    gvModal({
      title: '各陣營戰將', color: '#ffa300',
      body: `${gs.players.map(team).join('')}
        <h4>還沒加入任何陣營（${free.length} 位）</h4><p class="gv-sub">${free.map((g) => `${escapeHTML(g.name)}（${escapeHTML(g.title)}）`).join('、') || '沒有'}</p>
        <button type="button" class="gv-skip" data-v="close">關閉</button>`,
    });
  }
}
