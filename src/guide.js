// =====================================================================
// 選戰指南：點「選戰指南」按鈕會打開的說明視窗
// 用網頁（HTML）做，文字多也可以上下滑動。數字都直接讀 data.js 的規則，改規則時指南會自動跟著變。
// =====================================================================

function guideImg(name) {
  const path = BUILDING_IMAGES[name];
  return path ? `<img src="${path}?v=${window.GAME_VERSION || ''}" alt="">` : '';
}

function guideHTML() {
  const R = GAME_RULES;
  const props = TILES.filter((t) => t.type === 'property');
  const chiefs = TILES.filter((t) => t.type === 'chief');
  const range = (list) => `$${Math.min(...list.map((t) => t.price))}～$${Math.max(...list.map((t) => t.price))}`;
  const pct = (x) => `${Math.round(x * 100)}%`;
  const tile = (img, title, body) => `
    <div class="g-tile">
      <div class="g-pic">${guideImg(img)}</div>
      <div><h4>${title}</h4>${body}</div>
    </div>`;

  return `
    <section>
      <h3>遊戲目標</h3>
      <p>最後一回合結束是<b>投票日</b>（回合數可以在首頁選：${ROUND_OPTIONS.join('、')} 回合），<b>支持者最多</b>的候選人當選！
      （支持者一樣多時，比總資產。）錢用光就會破產、退出選戰。</p>
    </section>

    <section>
      <h3>兩種數值</h3>
      <ul>
        <li><b>支持者</b>：決定誰當選。每人一開始有 ${R.startFans} 位。</li>
        <li><b>錢</b>：用來買地、蓋競選總部、付過路費。每人一開始有 $${R.startMoney}。</li>
      </ul>
      <p>畫面上的<b>即時民調</b>會顯示大家目前的支持者比例。</p>
    </section>

    <section>
      <h3>每回合會發生什麼</h3>
      <ol>
        <li>你擁有的<b>地標和里長</b>先幫你帶來支持者（地盤越大越多）。</li>
        <li>擲骰子，往前走。</li>
        <li>停在哪一格，就發生那一格的事。</li>
      </ol>
    </section>

    <section>
      <h3>格子的效果</h3>
      ${tile('taipei101', `地標（${props.length} 個，${range(props)}）`, `
        <p>比較貴，主要用來<b>賺錢</b>。</p>
        <ul>
          <li>買下：支持者 + 價錢的 ${pct(R.buyFansRate)}。</li>
          <li>每回合：帶來 價錢 × ${pct(R.landmarkFansRate)} ×（總部層數 + 1）位支持者。</li>
          <li>再走到自己的地標，可以花價錢的一半蓋<b>競選總部</b>（最多 ${R.maxLevel} 層），支持者 + 價錢的 ${pct(R.buildFansRate)}，過路費變成 ${R.rentMultiplier.slice(1).join(' / ')} 倍。</li>
          <li>對手踩到：付過路費（價錢的 10% × 倍數），而且有 價錢 × ${pct(R.landmarkStealRate)} ×（層數 + 1）位支持者<b>倒戈</b>到你這邊。</li>
        </ul>`)}
      ${tile('chief', `里長（${chiefs.length} 區，${range(chiefs)}）`, `
        <p>比較便宜，主要用來<b>拉支持者</b>。</p>
        <ul>
          <li>拉攏：支持者 + ${R.chiefBuyFans}。</li>
          <li>每回合：帶來 ${R.chiefFansPerTurn} 位支持者。</li>
          <li>不能蓋競選總部。</li>
          <li>對手踩到：付價錢 ${pct(R.chiefRentRate)} 的過路費，${R.chiefSteal} 位支持者倒戈。</li>
        </ul>`)}
      ${tile('go', '起點', `<p>經過或停在起點，領 $${R.passGoBonus}。</p>`)}
      ${tile('chance', `機會（${TILES.filter((t) => t.type === 'chance').length} 格）`, `<p>抽一張機會卡，大多是好事：拿錢、支持者增加、前進、名人站台……</p>`)}
      ${tile('ballot', `命運（${TILES.filter((t) => t.type === 'fate').length} 格）`, `<p>抽一張命運卡，有好有壞：被爆料、失言被罵、颱風吹走看板……</p>`)}
      ${tile('talent', '政壇人物', `<p>遇到政壇前輩傳授選戰心法，支持者 + ${R.talentFans}。（之後會改成「招攬戰將」）</p>`)}
      ${tile('quiz', '英文挑戰（首頁可選擇要不要加入）', `
        <p>隨機出一題英文<b>選擇題</b>或<b>填空題</b>，單字和句型都有。程度可以在首頁選：國小、國中、高中、大學。</p>
        <ul>
          <li>答對：錢 <b>+$${R.quizMoney}</b>，支持者 + ${R.quizFans}。</li>
          <li>答錯：支持者 - ${R.quizWrongFans}。</li>
          <li>加入後，地圖上會有 ${QUIZ_TILE_SLOTS.length} 格英文挑戰（取代 1 格機會、1 格命運、1 格政壇人物）。</li>
        </ul>`)}
      ${tile('jam', '塞車', '<p>下回合暫停一次。</p>')}
      ${tile('mrt', '捷運站', '<p>休息一下，吹吹冷氣，沒事發生。</p>')}
      ${tile('siren', '拖吊場', `<p>宣傳車被拖吊，罰款 $${R.towFine}。</p>`)}
    </section>

    <section>
      <h3>行政區</h3>
      <p>台北市有 ${DISTRICTS.length} 個行政區。把<b>同一區的地標和里長全部買下</b>，那一區的地標（還沒蓋總部時）過路費加倍。</p>
    </section>

    <section>
      <h3>怎麼操作</h3>
      <ul>
        <li><b>移動地圖</b>：用手指或滑鼠拖曳。</li>
        <li><b>放大縮小</b>：右上角 ＋／－，手機可以兩指捏合，電腦可以用滑鼠滾輪。</li>
        <li><b>看建築資訊</b>：點一下建築，看價錢、地主、過路費、每回合帶來多少支持者。</li>
        <li><b>看某位玩家</b>：點他的狀態卡，鏡頭會移到他身上。</li>
        <li><b>即時民調</b>：右上角的「圓餅／長條」按鈕可以切換圖表樣式。</li>
        <li><b>音樂</b>：右上角 ♪ 可以開關。</li>
      </ul>
    </section>`;
}

function showGuide() {
  if (document.getElementById('guide')) return;
  const wrap = document.createElement('div');
  wrap.id = 'guide';
  wrap.innerHTML = `
    <div class="g-box" role="dialog" aria-label="選戰指南">
      <div class="g-head">
        <span>選戰指南</span>
        <button type="button" id="g-close">關閉 ✕</button>
      </div>
      <div class="g-body">${guideHTML()}</div>
    </div>`;
  document.body.appendChild(wrap);
  setGameInput(false);
  const close = () => { wrap.remove(); setGameInput(true); Sfx.click(); };
  wrap.querySelector('#g-close').addEventListener('click', close);
  // 點視窗外面的暗色區域也可以關
  wrap.addEventListener('click', (e) => { if (e.target === wrap) close(); });
}
