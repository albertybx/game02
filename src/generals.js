// =====================================================================
// 戰將系統：招募、挖角、派任務（要離開幾回合）、駐守、拔樁戰、辯論挑戰、
// 忠誠度、醜聞、專屬技能。
// 規則數字在 data.js 的 GENERAL_RULES、MISSIONS、GENERAL_SKILLS；戰將名單在 GENERALS。
// 畫面用網頁視窗（跟英文挑戰一樣），手機也好點。
// =====================================================================

const GR = () => GENERAL_RULES;
const STAT_NAMES = { eloquence: '口才', network: '人脈', charisma: '魅力' };
const TACTIC_KEYS = ['speech', 'visit', 'rally'];
const verImg = (path) => `${path}?v=${window.GAME_VERSION || ''}`;
const genImg = (g) => verImg(g.image);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const d6 = () => Phaser.Math.Between(1, 6);

// 技能編號（對應 GENERAL_SKILLS）
const SK = { mediaFree: 0, weddingX2: 1, guardPlus: 2, fastMission: 3, speechPlus: 4, serviceX2: 5, noScandal: 6, rallyPlus: 7, debater: 8, remoteFull: 9, tieWin: 10, loyalFloor: 11 };
const hasSkill = (g, k) => !!g && g.id === k;

// 一張戰將小卡（大頭照＋能力條＋技能）
function generalCardHTML(g, extra = '') {
  const bar = (k) => `<div class="gv-stat"><span>${STAT_NAMES[k]}</span><i>${'■'.repeat(g[k])}<em>${'■'.repeat(5 - g[k])}</em></i><b>${g[k]}</b></div>`;
  const sk = GENERAL_SKILLS[g.id];
  return `
    <div class="gv-card">
      <div class="gv-face" style="background-image:url('${genImg(g)}')"></div>
      <div class="gv-info">
        <p class="gv-name">${escapeHTML(g.name)}<small>${escapeHTML(g.title)}・${escapeHTML(g.home)}</small></p>
        ${bar('eloquence')}${bar('network')}${bar('charisma')}
        ${sk ? `<p class="gv-skill">★ ${escapeHTML(sk.name)}：${escapeHTML(sk.text)}</p>` : ''}
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
      ...g, owner: null, loyalty: GR().startLoyalty, rest: 0, stationedAt: null, style: null, idle: 0, away: 0, mission: null,
    }));
  }

  // ---------- 查詢 ----------
  ownedBy(p) { return this.list.filter((g) => g.owner === p.id); }
  free() { return this.list.filter((g) => g.owner === null); }
  available(p) { return this.ownedBy(p).filter((g) => g.rest === 0 && g.stationedAt === null && g.away === 0); }
  stationedAt(i) { return this.list.find((g) => g.stationedAt === i) || null; }
  ownChiefs(p) { return TILES.map((t, i) => i).filter((i) => TILES[i].type === 'chief' && this.gs.tileState[i].owner === p.id); }

  setLoyalty(g, v) {
    g.loyalty = Math.max(hasSkill(g, SK.loyalFloor) ? GR().poachBelow : 0, Math.min(100, v));
  }

  // 樁腳穩固度：剛拉攏是 1，每擁有 3 回合 +1，最高 4；選民服務可以再 +1
  stability(i) {
    const st = this.gs.tileState[i];
    const base = Math.min(GR().stakeMax, 1 + Math.floor((this.gs.round - (st.since || this.gs.round)) / GR().stakeEvery));
    const gov = st.owner !== null && this.gs.hasEffectIn(st.owner, TILES[i].district, 'gov') ? 2 : 0;
    return Math.min(GR().stakeMax + 3, base + (st.bonus || 0) + gov);
  }

  missionName(g) {
    if (g.mission.key === 'woo') return `去拉攏${TILES[g.mission.tile].district}里長`;
    if (g.mission.key === 'dark') return '去找神秘金主';
    return MISSIONS.find((m) => m.key === g.mission.key).name;
  }

  statusText(g) {
    if (g.stationedAt !== null) return `駐守 ${TILES[g.stationedAt].district}（已離隊）`;
    if (g.away > 0) return `${this.missionName(g)}中，${g.away} 回合後回來`;
    if (g.rest > 0) return `休息 ${g.rest} 回合`;
    return '待命';
  }

  // ---------- 回合開始：出任務的戰將回來、休息倒數、太久沒事做掉忠誠度 ----------
  async onTurnStart(p) {
    const gs = this.gs;
    for (const g of this.ownedBy(p)) {
      if (g.rest > 0) g.rest--;
      if (g.away > 0) {
        g.away--;
        if (g.away === 0) await this.finishMission(p, g);
        continue;
      }
      if (g.stationedAt === null) {
        g.idle++;
        if (g.idle >= GR().idleTurns) { this.setLoyalty(g, g.loyalty - GR().loyaltyIdle); g.idle = 0; }
      }
    }
    gs.hud.refreshPanels();
  }

  async finishMission(p, g) {
    const gs = this.gs;
    if (g.mission.key === 'woo') { await this.finishWoo(p, g); return; }
    if (g.mission.key === 'dark') { await this.finishDark(p, g); return; }
    const m = MISSIONS.find((x) => x.key === g.mission.key);
    const i = g.mission.tile;
    if (m.money) {
      this.setLoyalty(g, g.loyalty + GR().loyaltyMission);
      g.idle = 0;
      gs.followPlayer(p);
      let got = g.mission.gain;
      let msg = `${g.name} 辦完「${m.name}」回來了！\n帶回 $${got}`;
      if (m.key === 'tender' && gs.tileState[i].owner !== p.id) {
        got = GR().tenderRefund;
        msg = `${g.name} 回來了：${TILES[i].district}里長已經不是你的，\n標案沒拿到，只退回 $${got}`;
      }
      gs.hud.say(msg);
      gs.changeMoney(p, got);
      g.mission = null;
      await gs.wait(1100);
      return;
    }
    let extra = '';
    if (m.key === 'service' && gs.tileState[i].owner === p.id) {
      gs.tileState[i].bonus = Math.min(1, (gs.tileState[i].bonus || 0) + 1);
      extra = `，${TILES[i].district}的樁腳更穩了`;
    }
    this.setLoyalty(g, g.loyalty + GR().loyaltyMission);
    g.idle = 0;
    gs.followPlayer(p);
    gs.hud.say(`${g.name} 完成任務「${m.name}」回來了！\n支持者 +${g.mission.gain}${extra}`);
    gs.changeFans(p, g.mission.gain);
    g.mission = null;
    await gs.wait(1100);
  }

  release(p) { // 破產：戰將全部離開
    for (const g of this.ownedBy(p)) Object.assign(g, { owner: null, stationedAt: null, rest: 0, away: 0, mission: null, loyalty: GR().startLoyalty });
    this.gs.refreshStations();
  }

  // 里長格丟了（被拔樁、付不出經營費）：駐守的戰將回到隊伍休息 1 回合
  guardBack(i) {
    const guard = this.stationedAt(i);
    if (guard) Object.assign(guard, { stationedAt: null, rest: 1, idle: 0 });
    this.gs.refreshStations();
    return guard;
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
      else if (picks.length && p.money >= R.recruitCost + 300) {
        const homes = this.ownChiefs(p).map((i) => TILES[i].district);
        const best = picks.find((g) => homes.includes(g.home)) || picks[0];
        auto = `hire:${best.id}`;
      } else auto = 'skip';
    }

    const body = `
      <p class="gv-tip">招募費 $${R.recruitCost}，戰將人數沒有上限。你有 $${p.money}。</p>
      <div class="gv-grid">${picks.map((g) => generalCardHTML(g, `<button type="button" data-v="hire:${g.id}" ${p.money < R.recruitCost ? 'disabled' : ''}>招募 $${R.recruitCost}</button>`)).join('')}</div>
      ${poachable.length ? `<h4>可以挖角（忠誠度低於 ${R.poachBelow}）</h4>
      <div class="gv-grid">${poachable.map((g) => generalCardHTML(g, `
        <p class="gv-sub">目前在 ${escapeHTML(gs.players[g.owner].name)} 陣營・忠誠度 ${g.loyalty}・${this.statusText(g)}</p>
        <button type="button" data-v="poach:${g.id}" ${p.money < R.poachCost ? 'disabled' : ''}>挖角（成功率 ${Math.round(this.poachChance(g) * 100)}%，成功才付 $${R.poachCost}）</button>`)).join('')}</div>` : ''}
      <button type="button" class="gv-skip" data-v="skip">先不要</button>`;
    const v = await gvModal({ title: '戰將招募站', color: '#ffa300', who: p, body, autoValue: auto });
    if (v === 'skip') return;

    const [kind, idStr] = v.split(':');
    const g = this.list[Number(idStr)];
    if (kind === 'poach') {
      if (Math.random() < this.poachChance(g)) {
        const old = gs.players[g.owner];
        if (g.stationedAt !== null) this.guardBack(g.stationedAt);
        p.money -= R.poachCost;
        Object.assign(g, { owner: p.id, stationedAt: null, rest: 0, away: 0, mission: null, loyalty: R.startLoyalty, idle: 0 });
        gs.refreshStations();
        gs.hud.say(`挖角成功！${g.name} 從 ${old.name} 陣營\n轉投 ${p.name}！花費 $${R.poachCost}`);
        Sfx.buy();
      } else {
        this.setLoyalty(g, g.loyalty + 10);
        gs.hud.say(`${g.name} 拒絕了 ${p.name} 的挖角，\n對原陣營的忠誠度反而提高了`);
        Sfx.bad();
      }
      gs.hud.refreshPanels();
      await gs.wait(1400);
      return;
    }
    p.money -= R.recruitCost;
    Object.assign(g, { owner: p.id, loyalty: R.startLoyalty, rest: 0, stationedAt: null, idle: 0, away: 0, mission: null });
    Sfx.buy();
    gs.hud.say(`${g.name}（${g.title}）加入 ${p.name} 陣營！`);
    gs.hud.refreshPanels();
    await gs.wait(1200);
  }

  // =====================================================================
  // 派任務：戰將會離開隊伍幾回合，回來時帶回支持者
  // =====================================================================
  missionPlan(g, m, i, remote) {
    const R = GR();
    const s = (m.stat ? g[m.stat] : 0) + (g.home === TILES[i].district ? R.homeBonus : 0);
    let mult = 1;
    if (m.money) {
      if (remote && !hasSkill(g, SK.remoteFull)) mult *= R.remoteRate;
      const turns = Math.max(1, m.turns - (hasSkill(g, SK.fastMission) ? 1 : 0));
      if (m.key === 'tender') {
        const v = Math.round(R.tenderMoney * mult);
        return { mult, min: v, max: v, roll: () => v, turns, cost: R.tenderCost, money: true };
      }
      const base = R.dinnerBase + s * R.dinnerPerStat;
      return {
        mult, turns, cost: R.dinnerCost, money: true,
        min: Math.round((base + 10) * mult),
        max: Math.round((base + 60) * mult),
        roll: () => Math.round((base + d6() * 10) * mult),
      };
    }
    if (m.key === 'media') mult *= R.mediaBonus;
    if (m.key === 'wedding' && hasSkill(g, SK.weddingX2)) mult *= 2;
    if (m.key === 'service' && hasSkill(g, SK.serviceX2)) mult *= 2;
    if (remote && !hasSkill(g, SK.remoteFull)) mult *= R.remoteRate;
    if (g.owner !== null && this.gs.hasEffectIn(g.owner, TILES[i].district, 'culture')) mult *= 1.5;
    const base = R.missionBase + s * R.missionPerStat;
    return {
      mult,
      min: Math.round((base + 10) * mult),
      max: Math.round((base + 60) * mult),
      roll: () => Math.round((base + d6() * 10) * mult),
      turns: Math.max(1, m.turns - (hasSkill(g, SK.fastMission) ? 1 : 0)),
      cost: m.key === 'media' && !hasSkill(g, SK.mediaFree) ? R.mediaCost : 0,
    };
  }

  missionButtons(p, g, i, remote) {
    return MISSIONS.map((m) => {
      const pl = this.missionPlan(g, m, i, remote);
      const dis = p.money < pl.cost;
      const what = pl.money
        ? `${m.stat ? `看${STAT_NAMES[m.stat]}・` : ''}錢 +$${pl.min}${pl.max !== pl.min ? `～${pl.max}` : ''}`
        : `看${STAT_NAMES[m.stat]}・支持 +${pl.min}～${pl.max}`;
      const tip = m.key === 'tender' ? `・里長被搶走只退 $${GR().tenderRefund}` : '';
      return `<button type="button" data-v="m:${m.key}:${g.id}" ${dis ? 'disabled' : ''}>${m.name}（${pl.turns} 回合）<small>${what}${pl.cost ? `・先付 $${pl.cost}` : ''}${m.key === 'service' ? '・樁腳 +1' : ''}${tip}</small></button>`;
    }).join('');
  }

  // 電腦挑最好的任務：每回合平均拿到最多支持者的
  cpuBestMission(p, gens, tiles, remote) {
    let best = null;
    for (const g of gens) for (const i of tiles) for (const m of MISSIONS) {
      const pl = this.missionPlan(g, m, i, remote);
      if (pl.cost && p.money < pl.cost + (pl.money ? 100 : 400)) continue;
      // 錢的任務：越缺錢越想做
      const need = p.money < 500 ? 1.6 : p.money < 1000 ? 0.8 : 0.3;
      const val = pl.money
        ? ((pl.min + pl.max) / 2 - pl.cost) / pl.turns * need
        : (pl.min + pl.max) / 2 / pl.turns + (m.key === 'service' ? 15 : 0);
      if (!best || val > best.val) best = { val, g, m, i };
    }
    return best;
  }

  async dispatch(p, g, m, i, remote) {
    const gs = this.gs;
    const pl = this.missionPlan(g, m, i, remote);
    if (pl.cost) gs.changeMoney(p, -pl.cost);
    Object.assign(g, { away: pl.turns, idle: 0, mission: { key: m.key, tile: i, gain: pl.roll() } });
    gs.hud.say(`${g.name} 出發去${TILES[i].district}${m.name}！\n${pl.turns} 回合後帶著${pl.money ? '錢' : '支持者'}回來`);
    Sfx.tune([523, 659, 784], 0.07);
    gs.hud.refreshPanels();
    await gs.wait(1000);
  }

  // 走到自己的里長格：派任務（效果全額）或留下來駐守
  async onOwnChief(p, i) {
    const gs = this.gs;
    const t = TILES[i];
    const guard = this.stationedAt(i);
    const avail = this.available(p);
    if (!avail.length) {
      gs.hud.say(`${t.name} 是自己人，\n里民服務做得好，口碑不錯！`);
      await gs.wait(1000);
      return;
    }

    // 電腦：這格沒人守、又有兩位以上待命 → 派一位駐守；否則派最划算的任務
    let auto;
    if (!p.human) {
      if (!guard && avail.length >= 2 && Math.random() < 0.6) auto = `station:${avail[0].id}`;
      else {
        const b = this.cpuBestMission(p, avail, [i], false);
        auto = b ? `m:${b.m.key}:${b.g.id}` : 'skip';
      }
    }

    const card = (g) => generalCardHTML(g, `
      <p class="gv-sub">忠誠度 ${g.loyalty}${g.home === t.district ? '・在家鄉 +1' : ''}</p>
      <div class="gv-actions">
        ${this.missionButtons(p, g, i, false)}
        ${guard ? '' : `<button type="button" data-v="station:${g.id}">留下來駐守這格<small>對手來拔樁時由他防守。駐守後就離開隊伍，不能再派去別的地方</small></button>`}
      </div>`);
    const body = `
      <p class="gv-tip">${escapeHTML(t.name)}・樁腳穩固度 ${this.stability(i)}${guard ? `・由 ${escapeHTML(guard.name)} 駐守中` : '・目前沒有戰將駐守'}。站在這一格派任務，效果全額。</p>
      <div class="gv-grid">${avail.map(card).join('')}</div>
      <button type="button" class="gv-skip" data-v="skip">這次不派</button>`;
    const v = await gvModal({ title: '里長格：派出戰將', color: '#00e436', who: p, body, autoValue: auto });
    if (v === 'skip') return;
    const parts = v.split(':');
    if (parts[0] === 'station') {
      const g = this.list[Number(parts[1])];
      const style = await this.pickStyle(p, g);
      Object.assign(g, { stationedAt: i, style, idle: 0 });
      gs.refreshStations();
      gs.hud.say(`${g.name} 駐守 ${t.district}，離開隊伍！\n防守風格：偏愛「${TACTICS[style].name}」`);
      Sfx.buy();
      await gs.wait(1100);
      return;
    }
    await this.dispatch(p, this.list[Number(parts[2])], MISSIONS.find((x) => x.key === parts[1]), i, false);
  }

  // 擲骰子前：遠端派任務（效果 ×0.7）
  canRemote(p) { return this.available(p).length > 0 && this.ownChiefs(p).length > 0; }

  cpuWantsRemote(p) {
    const avail = this.available(p);
    if (!avail.length || !this.ownChiefs(p).length) return false;
    // 留一位待命準備拔樁；只有一位時一半機率派出去
    return avail.length >= 2 || Math.random() < 0.5;
  }

  async remoteMission(p) {
    const gs = this.gs;
    const chiefs = this.ownChiefs(p);
    const avail = this.available(p);
    let auto1;
    let auto2;
    if (!p.human) {
      const b = this.cpuBestMission(p, avail.slice(avail.length >= 2 ? 1 : 0), chiefs, true);
      if (!b) return;
      auto1 = `m:${b.m.key}:${b.g.id}`;
      auto2 = String(b.i);
    }
    const ref = chiefs[0];
    const v = await gvModal({
      title: '遠端派任務', color: '#00e436', who: p, autoValue: auto1,
      body: `<p class="gv-tip">不用走到里長格也能派任務（包括募款餐會、政府標案），但效果 ×${GR().remoteRate}。在戰將的家鄉出任務能力 +1（下面的數字先用 ${escapeHTML(TILES[ref].district)} 算，下一步再選地點）。</p>
        <div class="gv-grid">${avail.map((g) => generalCardHTML(g, `<p class="gv-sub">忠誠度 ${g.loyalty}</p><div class="gv-actions">${this.missionButtons(p, g, ref, true)}</div>`)).join('')}</div>
        <button type="button" class="gv-skip" data-v="skip">先不要</button>`,
    });
    if (v === 'skip') return;
    const [, key, idStr] = v.split(':');
    const g = this.list[Number(idStr)];
    const m = MISSIONS.find((x) => x.key === key);
    let i = chiefs[0];
    if (chiefs.length > 1) {
      const w = await gvModal({
        title: `${g.name}：去哪一區？`, color: '#00e436', who: p, autoValue: auto2,
        body: `<div class="gv-actions">${chiefs.map((c) => {
          const pl = this.missionPlan(g, m, c, true);
          return `<button type="button" data-v="${c}">${escapeHTML(TILES[c].name)}${g.home === TILES[c].district ? '（家鄉 +1）' : ''}<small>支持 +${pl.min}～${pl.max}${m.key === 'service' ? `・穩固度 ${this.stability(c)}` : ''}</small></button>`;
        }).join('')}</div>`,
      });
      i = Number(w);
    }
    await this.dispatch(p, g, m, i, true);
  }

  // ---------- 神秘的金援：派戰將去找神秘金主（人脈越高越容易成功） ----------
  darkRate(g) { return Math.min(0.9, GAME_RULES.darkBaseRate + g.network * GAME_RULES.darkPerNetwork); }

  canDark(p) { return this.available(p).length > 0 && this.gs.round >= p.darkAt + GAME_RULES.darkEvery; }

  cpuWantsDark(p) {
    if (!this.canDark(p)) return false;
    const n = this.available(p).length;
    return (p.money < 700 && n >= 2) || p.money < 300;
  }

  async dark(p) {
    const gs = this.gs;
    const R = GAME_RULES;
    const avail = [...this.available(p)].sort((a, b) => b.network - a.network);
    if (!avail.length) return;
    const v = await gvModal({
      title: '神秘的金援', color: '#7e2553', who: p, autoValue: p.human ? undefined : String(avail[0].id),
      body: `<p class="gv-tip">派一位戰將去找「神秘的金主」，離開 ${R.darkTurns} 回合。回來時：<br>
        <b>成功</b>：帶回 $${R.darkMoney}。<br>
        <b>失敗</b>（被檢調盯上）：拿不到錢，支持者 -${R.darkFans}，戰將忠誠度 -${R.darkLoyalty}。<br>
        <b>人脈</b>越高越容易成功。每 ${R.darkEvery} 回合可以做一次。</p>
        <div class="gv-grid">${avail.map((g) => generalCardHTML(g, `<button type="button" data-v="${g.id}">派他去（成功率 ${Math.round(this.darkRate(g) * 100)}%）</button>`)).join('')}</div>
        <button type="button" class="gv-skip" data-v="skip">先不要</button>`,
    });
    if (v === 'skip') return;
    const g = this.list[Number(v)];
    p.darkAt = gs.round;
    Object.assign(g, { away: R.darkTurns, idle: 0, mission: { key: 'dark', tile: null, ok: Math.random() < this.darkRate(g) } });
    gs.hud.say(`${g.name} 戴上墨鏡，悄悄出發了…\n${R.darkTurns} 回合後回來`);
    Sfx.tune([330, 294, 262], 0.1);
    gs.hud.refreshPanels();
    await gs.wait(1100);
  }

  async finishDark(p, g) {
    const gs = this.gs;
    const R = GAME_RULES;
    const ok = g.mission.ok;
    g.mission = null;
    g.idle = 0;
    gs.followPlayer(p);
    if (ok) {
      this.setLoyalty(g, g.loyalty + GR().loyaltyMission);
      gs.hud.say(`${g.name} 帶著一個沉甸甸的紙袋回來了…\n神秘的金援 +$${R.darkMoney}`);
      gs.changeMoney(p, R.darkMoney);
    } else if (hasSkill(g, SK.noScandal)) {
      gs.hud.say(`${g.name} 發現金主來路不明，當場拒絕！\n沒拿到錢，但也沒出事（醫德清白）`);
      Sfx.bad();
    } else {
      this.setLoyalty(g, g.loyalty - R.darkLoyalty);
      gs.hud.say(`糟糕！${g.name} 被檢調盯上，媒體大肆報導！\n沒拿到錢，支持者 -${R.darkFans}`);
      gs.changeFans(p, -R.darkFans);
      Sfx.bad();
    }
    gs.hud.refreshPanels();
    await gs.wait(1300);
  }

  // ---------- 派戰將去拉攏里長（自己拜訪過一次、還沒人拉攏的里長） ----------
  wooTargets(p) {
    if (!this.available(p).length) return [];
    return TILES.map((t, i) => i).filter((i) => TILES[i].type === 'chief' && this.gs.tileState[i].owner === null
      && !this.ownedBy(p).some((g) => g.mission && g.mission.key === 'woo' && g.mission.tile === i));
  }

  // 拜訪過一次：付另一半、2 回合；還沒拜訪過：付全額、3 回合
  wooCost(i, p) {
    const visited = p && this.gs.tileState[i].favor[p.id] >= 1;
    return Math.round(TILES[i].price / (visited ? GAME_RULES.chiefVisits : 1));
  }

  wooTurns(i, p, g) {
    const visited = this.gs.tileState[i].favor[p.id] >= 1;
    return Math.max(1, GENERAL_RULES.wooTurns + (visited ? 0 : 1) - (hasSkill(g, SK.fastMission) ? 1 : 0));
  }

  cpuWoo(p) {
    return this.wooTargets(p).some((i) => p.money >= this.wooCost(i, p) + 300);
  }

  async woo(p) {
    const gs = this.gs;
    const targets = this.wooTargets(p);
    const avail = this.available(p);
    if (!targets.length) return;
    let auto;
    if (!p.human) {
      // 先選拜訪過的（便宜、快）
      const i = [...targets].sort((a, b) => this.wooCost(a, p) - this.wooCost(b, p)).find((x) => p.money >= this.wooCost(x, p) + 300);
      if (i === undefined) return;
      const g = avail.find((x) => x.home === TILES[i].district) || [...avail].sort((a, b) => a.network - b.network)[0];
      auto = `${i}:${g.id}`;
    }
    const v = await gvModal({
      title: '派戰將去拉攏里長', color: '#00e436', who: p, autoValue: auto,
      body: `<p class="gv-tip">派戰將去拉攏還沒人拉攏的里長，現在先付錢，戰將回來時里長就是你的（被別人搶先就退錢）。<b>拜訪過一次的</b>：只付一半、${GENERAL_RULES.wooTurns} 回合；<b>沒拜訪過的</b>：付全額、${GENERAL_RULES.wooTurns + 1} 回合。</p>
        <div class="gv-actions">${targets.map((i) => {
          const g = avail.find((x) => x.home === TILES[i].district) || avail[0];
          return `<button type="button" data-v="${i}:${g.id}" ${p.money < this.wooCost(i, p) ? 'disabled' : ''}>${escapeHTML(TILES[i].name)}：$${this.wooCost(i, p)}${this.gs.tileState[i].favor[p.id] ? '（拜訪過）' : ''}<small>派 ${escapeHTML(g.name)} 去，${this.wooTurns(i, p, g)} 回合後回來${g.home === TILES[i].district ? '（家鄉）' : ''}</small></button>`;
        }).join('')}</div>
        <button type="button" class="gv-skip" data-v="skip">先不要</button>`,
    });
    if (v === 'skip') return;
    const [i, id] = v.split(':').map(Number);
    const g = this.list[id];
    const cost = this.wooCost(i, p);
    gs.changeMoney(p, -cost);
    Object.assign(g, { away: this.wooTurns(i, p, g), idle: 0, mission: { key: 'woo', tile: i, cost } });
    gs.refreshTile(i);
    gs.hud.say(`${g.name} 出發去拉攏 ${TILES[i].name}！\n${g.away} 回合後回來`);
    Sfx.tune([523, 659, 784], 0.07);
    await gs.wait(1000);
  }

  async finishWoo(p, g) {
    const gs = this.gs;
    const i = g.mission.tile;
    const cost = g.mission.cost;
    g.mission = null;
    g.idle = 0;
    this.setLoyalty(g, g.loyalty + GENERAL_RULES.loyaltyMission);
    gs.followPlayer(p);
    if (gs.tileState[i].owner === null) {
      gs.hud.say(`${g.name} 回來了：成功拉攏 ${TILES[i].name}！`);
      await gs.wait(700);
      await gs.acquireChief(p, i);
    } else {
      gs.hud.say(`${g.name} 回來了：${TILES[i].name} 被別人搶先拉攏，\n退還 $${cost}`);
      gs.changeMoney(p, cost);
      await gs.wait(1200);
    }
  }

  // 駐守時選防守風格（對手來拔樁時，駐守戰將 7 成會出這招）
  async pickStyle(p, g) {
    const bestStat = ['eloquence', 'network', 'charisma'].sort((a, b) => g[b] - g[a])[0];
    const best = TACTIC_KEYS.find((k) => TACTICS[k].stat === bestStat);
    if (!p.human) return best;
    return gvModal({
      title: '選擇防守風格', color: '#29adff', who: p,
      body: `<p class="gv-tip">對手來拔樁時，${escapeHTML(g.name)} 大多會出這一招。風格會公開給對手看，小心被剋！</p>
        <div class="gv-actions">${TACTIC_KEYS.map((k) => { const tc = TACTICS[k]; return `<button type="button" data-v="${k}">${tc.name}<small>用${tc.statName} ${g[tc.stat]}・剋「${TACTICS[tc.beats].name}」</small></button>`; }).join('')}</div>`,
    });
  }

  // =====================================================================
  // 對決（拔樁戰、辯論挑戰都用）：三戰兩勝。
  // 每輪雙方出一招，分數 = 能力 + 骰子(1～6) + 剋招 +2 + 家鄉 +1，平手算守方贏
  // 一方 = { name, title, image, stats, bonus: {招: 加分}, tieWin, style, general }
  // =====================================================================
  fighterFromGeneral(g, district, { guard = false, debate = false } = {}) {
    const R = GR();
    let plus = g.home === district ? R.homeBonus : 0;
    if (guard && hasSkill(g, SK.guardPlus)) plus += 1;
    if (debate && hasSkill(g, SK.debater)) plus += 2;
    return {
      name: g.name, title: g.title, image: genImg(g), general: g, style: g.style,
      stats: { eloquence: g.eloquence + plus, network: g.network + plus, charisma: g.charisma + plus },
      bonus: { speech: hasSkill(g, SK.speechPlus) ? 1 : 0, visit: 0, rally: hasSkill(g, SK.rallyPlus) ? 1 : 0 },
      tieWin: hasSkill(g, SK.tieWin),
    };
  }

  fighterFromPlayer(p, style = null) {
    return {
      name: p.name, title: '候選人本人', image: p.image ? verImg(p.image) : null, general: null, style,
      stats: { eloquence: 3, network: 3, charisma: 3 }, bonus: { speech: 0, visit: 0, rally: 0 }, tieWin: false,
    };
  }

  defenderOf(i) {
    const guard = this.stationedAt(i);
    if (guard) return { ...this.fighterFromGeneral(guard, TILES[i].district, { guard: true }), title: `${guard.title}（駐守）` };
    const s = this.stability(i);
    return { name: '地方樁腳', title: `穩固度 ${s}`, image: null, general: null, style: null, stats: { eloquence: s, network: s, charisma: s }, bonus: { speech: 0, visit: 0, rally: 0 }, tieWin: false };
  }

  defenseOdds(def) {
    if (!def.style) return { speech: 1 / 3, visit: 1 / 3, rally: 1 / 3 };
    const o = { speech: 0.1, visit: 0.1, rally: 0.1 };
    o[def.style] += 0.7;
    return o;
  }

  score(f, t, other) {
    return f.stats[TACTICS[t].stat] + f.bonus[t] + (TACTICS[t].beats === other ? GR().counterBonus : 0);
  }

  // 攻方贏一輪：分數比較高；平手時看「直來直往」技能（攻方有 → 攻方贏，否則守方贏）
  roundWinProb(atk, ta, def) {
    let p = 0;
    for (const [td, w] of Object.entries(this.defenseOdds(def))) {
      const a = this.score(atk, ta, td);
      const d = this.score(def, td, ta);
      let win = 0;
      for (let x = 1; x <= 6; x++) for (let y = 1; y <= 6; y++) if (a + x > d + y || (a + x === d + y && atk.tieWin && !def.tieWin)) win++;
      p += w * win / 36;
    }
    return p;
  }

  bestTactic(atk, def) {
    return [...TACTIC_KEYS].sort((a, b) => this.roundWinProb(atk, b, def) - this.roundWinProb(atk, a, def))[0];
  }

  // 整場勝算（每輪都出最好的招）：三戰兩勝 = p²(3 − 2p)
  duelChance(atk, def) {
    const p = this.roundWinProb(atk, this.bestTactic(atk, def), def);
    return p * p * (3 - 2 * p);
  }

  winChance(g, i) { return this.duelChance(this.fighterFromGeneral(g, TILES[i].district), this.defenderOf(i)); }

  // 對決畫面。回傳 true = 攻方贏
  async duel({ title, color = '#ff004d', p, atk, defPlayer, def, rule }) {
    const watchOnly = !p.human; // 電腦攻擊：自動進行，大家用看的
    let aw = 0;
    let dw = 0;
    const face = (f) => (f.image ? `<div class="gv-face" style="background-image:url('${f.image}')"></div>` : '<div class="gv-face gv-stake">樁</div>');
    const side = (f, pl) => `
      <div class="bt-side">
        ${face(f)}
        <p class="gv-name">${escapeHTML(f.name)}<small>${escapeHTML(f.title)}・${escapeHTML(pl.name)}</small></p>
        <p class="bt-stats">口才 ${f.stats.eloquence}・人脈 ${f.stats.network}・魅力 ${f.stats.charisma}</p>
        <p class="bt-team" style="background:${pl.color}"></p>
      </div>`;
    const wrap = document.createElement('div');
    wrap.className = 'gv-modal';
    wrap.innerHTML = `
      <div class="gv-box" role="dialog" aria-label="${escapeHTML(title)}" style="--gv:${color}">
        <div class="gv-head"><span>${escapeHTML(title)}</span><span class="bt-score">0 : 0</span></div>
        <div class="gv-body">
          <div class="bt-vs">${side(atk, p)}<div class="bt-mid">VS</div>${side(def, defPlayer)}</div>
          <p class="gv-tip bt-rule">三戰兩勝。演講剋造勢、造勢剋拜訪、拜訪剋演講。分數 = 能力 + 骰子 + 剋招 ${GR().counterBonus}，平手算守方贏。${def.style ? `守方偏愛「${TACTICS[def.style].name}」。` : ''}${rule || ''}</p>
          <div class="bt-stage"></div>
          <div class="bt-log"></div>
        </div>
      </div>`;
    document.body.appendChild(wrap);
    setGameInput(false);
    const stage = wrap.querySelector('.bt-stage');
    const log = wrap.querySelector('.bt-log');
    const scoreEl = wrap.querySelector('.bt-score');

    const cardHTML = (k, f, extra = '', tag = 'button') => {
      const tc = TACTICS[k];
      return `<${tag} ${tag === 'button' ? `type="button" data-t="${k}"` : ''} class="bt-card bt-${k}">
        <img src="${verImg(`assets/cards/${k}.png`)}" alt="">
        <b>${tc.name}</b><span>${tc.statName} ${f.stats[tc.stat] + f.bonus[k]}</span>
        <small>剋「${TACTICS[tc.beats].name}」${extra}</small></${tag}>`;
    };

    const choose = (round) => new Promise((resolve) => {
      if (watchOnly) {
        stage.innerHTML = `<p class="gv-tip bt-think">第 ${round} 輪：${escapeHTML(atk.name)} 思考中…</p>`;
        const best = this.bestTactic(atk, def);
        const ta = Math.random() < 0.7 ? best : Phaser.Utils.Array.GetRandom(TACTIC_KEYS);
        setTimeout(() => resolve(ta), 900);
        return;
      }
      stage.innerHTML = `<p class="gv-tip">第 ${round} 輪：點一張牌出招</p>
        <div class="bt-cards">${TACTIC_KEYS.map((k) => cardHTML(k, atk, `<br>這輪勝率 ${Math.round(this.roundWinProb(atk, k, def) * 100)}%`)).join('')}</div>`;
      stage.querySelectorAll('[data-t]').forEach((b) => b.addEventListener('click', () => { Sfx.click(); resolve(b.dataset.t); }));
      if (round > 1) stage.scrollIntoView({ block: 'end', behavior: 'smooth' });
    });

    for (let round = 1; aw < 2 && dw < 2; round++) {
      const ta = await choose(round);
      let r = Math.random();
      let td = 'speech';
      for (const [k, w] of Object.entries(this.defenseOdds(def))) { if ((r -= w) < 0) { td = k; break; } }
      const xa = d6();
      const xd = d6();
      const ba = this.score(atk, ta, td);
      const bd = this.score(def, td, ta);
      const sa = ba + xa;
      const sd = bd + xd;
      const win = sa > sd || (sa === sd && atk.tieWin && !def.tieWin);

      // 亮牌 → 擲骰動畫 → 大大的分數
      const half = (f, k, other, cls) => {
        const st = f.stats[TACTICS[k].stat] + f.bonus[k];
        const ct = TACTICS[k].beats === other ? GR().counterBonus : 0;
        return `
        <div class="bt-half ${cls}">
          ${cardHTML(k, f, '', 'div')}
          <div class="bt-die">?</div>
          <div class="bt-calc">${TACTICS[k].statName} ${st}${ct ? ` ＋ 剋 ${ct}` : ''} ＋ 骰子</div>
          <div class="bt-total"><b>?</b></div>
        </div>`;
      };
      stage.innerHTML = `<p class="gv-tip">第 ${round} 輪</p><div class="bt-clash">${half(atk, ta, td, 'bt-a')}<div class="bt-mid">VS</div>${half(def, td, ta, 'bt-d')}</div><p class="bt-verdict"></p>`;
      stage.scrollIntoView({ block: 'end', behavior: 'smooth' });
      const [dieA, dieD] = stage.querySelectorAll('.bt-die');
      const [totA, totD] = stage.querySelectorAll('.bt-total b');
      for (let k = 0; k < 10; k++) {
        dieA.textContent = d6();
        dieD.textContent = d6();
        dieA.classList.toggle('roll');
        dieD.classList.toggle('roll');
        Sfx.beep(300 + k * 50, 0.03);
        await sleep(70);
      }
      dieA.textContent = xa;
      dieD.textContent = xd;
      dieA.classList.remove('roll');
      dieD.classList.remove('roll');
      await sleep(250);
      totA.textContent = sa;
      totD.textContent = sd;
      stage.querySelector(win ? '.bt-a' : '.bt-d').classList.add('bt-win');
      const verdict = stage.querySelector('.bt-verdict');
      verdict.className = `bt-verdict ${win ? 'ok' : 'bad'}`;
      verdict.textContent = win ? (sa === sd ? '平手，直來直往算攻方贏！' : '攻方贏這輪！') : (sa === sd ? '平手，守方贏這輪' : '守方贏這輪');
      if (win) { aw++; Sfx.coin(); } else { dw++; Sfx.pay(); }
      scoreEl.textContent = `${aw} : ${dw}`;
      const line = document.createElement('div');
      line.className = 'bt-round';
      line.innerHTML = `<b>第 ${round} 輪</b> ${TACTICS[ta].name} ${sa} vs ${TACTICS[td].name} ${sd} → <em class="${win ? 'ok' : 'bad'}">${win ? '攻方贏' : '守方贏'}</em>`;
      log.appendChild(line);
      await sleep(watchOnly ? 1300 : 1100);
    }

    const success = aw >= 2;
    const res = document.createElement('div');
    res.className = `bt-result ${success ? 'ok' : 'bad'}`;
    res.innerHTML = `<p>${success ? `${escapeHTML(atk.name)} 贏了！` : `${escapeHTML(def.name)} 守住了！`}（${aw} : ${dw}）</p><button type="button" class="gv-next">繼續</button>`;
    stage.appendChild(res);
    res.scrollIntoView({ block: 'end', behavior: 'smooth' });
    if (success) Sfx.win(); else Sfx.bad();
    await new Promise((resolve) => {
      const btn = res.querySelector('.gv-next');
      if (p.human) btn.addEventListener('click', () => { Sfx.click(); resolve(); });
      else { btn.hidden = true; setTimeout(resolve, 1800); }
    });
    wrap.remove();
    setGameInput(true);
    return success;
  }

  // =====================================================================
  // 拔樁戰：走到對手的里長格（付完過路費之後）
  // =====================================================================
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
      ? generalCardHTML(def.general, `<p class="gv-sub">防守風格：偏愛「${TACTICS[def.style].name}」${def.general.home === t.district ? '・在家鄉 +1' : ''}</p>`)
      : `<div class="gv-card"><div class="gv-face gv-stake">樁</div><div class="gv-info"><p class="gv-name">地方樁腳<small>沒有戰將駐守</small></p><p class="gv-sub">三項能力都是穩固度 ${this.stability(i)}，出招隨機</p></div></div>`;
    const body = `
      <p class="gv-tip">${escapeHTML(t.name)} 是 ${escapeHTML(owner.name)} 的樁腳。派戰將拔樁：<b>成功</b>搶下這格；<b>失敗</b>你的 ${GR().loseFans} 位支持者倒戈，戰將休息 ${GR().loseRest} 回合。</p>
      <h4>守方</h4>${defCard}
      <h4>派誰出戰？（勝算是每輪都出最好的招時）</h4>
      <div class="gv-grid">${chances.map(({ g, c }) => generalCardHTML(g, `<button type="button" data-v="go:${g.id}">派 ${escapeHTML(g.name)} 出戰<small>勝算 ${Math.round(c * 100)}%${g.home === t.district ? '・在家鄉 +1' : ''}</small></button>`)).join('')}</div>
      <button type="button" class="gv-skip" data-v="skip">不拔樁</button>`;
    const v = await gvModal({ title: `拔樁挑戰：${t.district}`, color: '#ff004d', who: p, body, autoValue: auto, autoDelay: 1600 });
    if (v === 'skip') return;
    await this.stakeBattle(p, this.list[Number(v.split(':')[1])], i);
  }

  async stakeBattle(p, g, i) {
    const gs = this.gs;
    const R = GR();
    const t = TILES[i];
    const owner = gs.players[gs.tileState[i].owner];
    const def = this.defenderOf(i);
    const success = await this.duel({ title: `拔樁戰・${t.district}`, p, atk: this.fighterFromGeneral(g, t.district), defPlayer: owner, def });
    g.idle = 0;
    if (success) {
      const st = gs.tileState[i];
      this.guardBack(i);
      st.owner = p.id;
      st.level = 0;
      st.since = gs.round;
      st.bonus = 0;
      this.setLoyalty(g, g.loyalty + R.loyaltyWin);
      gs.refreshTile(i);
      gs.refreshStations();
      gs.flashTile(i);
      gs.hud.say(`${g.name} 拔樁成功！\n${t.name} 歸 ${p.name}，支持者 +${R.winFans}`);
      gs.changeFans(p, R.winFans);
    } else {
      const lost = -gs.changeFans(p, -R.loseFans, true);
      gs.changeFans(owner, lost, false, true);
      g.rest = R.loseRest + 1;
      this.setLoyalty(g, g.loyalty - R.loyaltyLose);
      if (def.general) this.setLoyalty(def.general, def.general.loyalty + R.loyaltyWin);
      gs.hud.say(`${g.name} 拔樁失敗…\n${lost} 位支持者倒戈給 ${owner.name}`);
    }
    gs.hud.refreshPanels();
    await gs.wait(1200);
  }

  // =====================================================================
  // 辯論挑戰：下半場，落後第一名很多時，可以向第一名下戰帖（每人每場一次）
  // =====================================================================
  debateTarget(p) {
    const gs = this.gs;
    const R = GAME_RULES;
    if (p.debated || p.money < R.debateCost || gs.round <= R.maxRounds / 2) return null;
    const leader = gs.players.filter((o) => !o.bankrupt && o.id !== p.id).sort((a, b) => b.fans - a.fans)[0];
    if (!leader || leader.fans - p.fans < R.debateGap) return null;
    return leader;
  }

  bestDebater(o) {
    const gens = this.available(o);
    if (!gens.length) return this.fighterFromPlayer(o, Phaser.Utils.Array.GetRandom(TACTIC_KEYS));
    const f = gens.map((g) => this.fighterFromGeneral(g, '', { debate: true }));
    f.sort((a, b) => (b.stats.eloquence + b.stats.network + b.stats.charisma) - (a.stats.eloquence + a.stats.network + a.stats.charisma));
    const best = f[0];
    best.style = TACTIC_KEYS.find((k) => TACTICS[k].stat === ['eloquence', 'network', 'charisma'].sort((a, b) => best.stats[b] - best.stats[a])[0]);
    return best;
  }

  cpuWantsDebate(p) {
    const leader = this.debateTarget(p);
    if (!leader) return false;
    const opts = this.debateFighters(p);
    const def = this.bestDebater(leader);
    return opts.some((f) => this.duelChance(f, def) >= 0.5);
  }

  debateFighters(p) {
    const gens = this.available(p);
    return gens.length ? gens.map((g) => this.fighterFromGeneral(g, '', { debate: true })) : [this.fighterFromPlayer(p)];
  }

  async debate(p) {
    const gs = this.gs;
    const R = GAME_RULES;
    const leader = this.debateTarget(p);
    if (!leader) return;
    const def = this.bestDebater(leader);
    const fighters = this.debateFighters(p).map((f) => ({ f, c: this.duelChance(f, def) })).sort((a, b) => b.c - a.c);
    const auto = p.human ? undefined : (fighters[0].c >= 0.5 ? '0' : 'skip');
    const v = await gvModal({
      title: '辯論挑戰', color: '#ff77a8', who: p, autoValue: auto,
      body: `<p class="gv-tip">向領先的 ${escapeHTML(leader.name)} 下戰帖！花 $${R.debateCost}，用拔樁戰的規則比三戰兩勝。<b>贏了</b>：${escapeHTML(leader.name)} 有 ${R.debateFans} 位支持者倒戈給你；<b>輸了</b>：你有 ${R.debateLoseFans} 位倒戈給他。每人每場只能發起一次。</p>
        <h4>對手派出</h4><p class="gv-sub">${escapeHTML(def.name)}（${escapeHTML(def.title)}）口才 ${def.stats.eloquence}・人脈 ${def.stats.network}・魅力 ${def.stats.charisma}・偏愛「${TACTICS[def.style].name}」</p>
        <h4>你要派誰？</h4>
        <div class="gv-actions">${fighters.map(({ f, c }, k) => `<button type="button" data-v="${k}">${escapeHTML(f.name)}<small>口才 ${f.stats.eloquence}・人脈 ${f.stats.network}・魅力 ${f.stats.charisma}・勝算 ${Math.round(c * 100)}%</small></button>`).join('')}</div>
        <button type="button" class="gv-skip" data-v="skip">先不要</button>`,
    });
    if (v === 'skip') return;
    p.debated = true;
    gs.changeMoney(p, -R.debateCost);
    const atk = fighters[Number(v)].f;
    const win = await this.duel({ title: '辯論挑戰', color: '#ff77a8', p, atk, defPlayer: leader, def });
    const [w, l] = win ? [p, leader] : [leader, p];
    const lost = -gs.changeFans(l, -(win ? R.debateFans : R.debateLoseFans), true);
    gs.changeFans(w, lost, false, true);
    if (atk.general) this.setLoyalty(atk.general, atk.general.loyalty + (win ? GR().loyaltyWin : -GR().loyaltyLose));
    gs.hud.say(win ? `${p.name} 辯論大獲全勝！\n${leader.name} 的 ${lost} 位支持者倒戈` : `${p.name} 辯論落敗…\n${lost} 位支持者倒戈給 ${leader.name}`);
    gs.hud.refreshPanels();
    await gs.wait(1300);
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
    const can = mine.filter((g) => !hasSkill(g, SK.noScandal));
    if (!can.length) {
      gs.hud.say(`有人想抹黑 ${mine[0].name}，\n但醫德清白，醜聞沒有成立！`);
      await gs.wait(1200);
      return;
    }
    const g = Phaser.Utils.Array.GetRandom(can);
    const what = Phaser.Utils.Array.GetRandom(['被翻出多年前的舊發文', '行程撞期放了大家鴿子', '受訪時說錯話', '被假消息抹黑，忙著澄清']);
    const wasGuard = g.stationedAt !== null;
    if (wasGuard) this.guardBack(g.stationedAt);
    Object.assign(g, { rest: Math.max(g.rest, R.scandalRest + 1) });
    this.setLoyalty(g, g.loyalty - R.loyaltyScandal);
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
      for (const g of mine) this.setLoyalty(g, g.loyalty + n);
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
      return `<h4 style="border-left:8px solid ${p.color};padding-left:8px">${escapeHTML(p.name)}（${mine.length} 位）</h4>
        ${mine.length ? `<div class="gv-grid">${mine.map((g) => generalCardHTML(g, `<p class="gv-sub">${this.statusText(g)}・忠誠度 <b class="${g.loyalty < R.poachBelow ? 'gv-low' : ''}">${g.loyalty}</b>${g.loyalty < R.poachBelow ? '（容易被挖角）' : ''}</p>`)).join('')}</div>` : '<p class="gv-sub">還沒有戰將</p>'}`;
    };
    const free = this.free();
    gvModal({
      title: '各陣營戰將', color: '#ffa300',
      body: `<button type="button" class="gv-skip gv-close-top" data-v="close">關閉</button>
        ${gs.players.map(team).join('')}
        <h4>還沒加入任何陣營（${free.length} 位）</h4><p class="gv-sub">${free.map((g) => `${escapeHTML(g.name)}（${escapeHTML(g.title)}）`).join('、') || '沒有'}</p>`,
    });
  }
}
