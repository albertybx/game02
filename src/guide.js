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
  const GR = GENERAL_RULES;
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
    </section>

    <section>
      <h3>每回合會發生什麼</h3>
      <ol>
        <li>出任務的戰將回來，帶回支持者或錢。</li>
        <li>有時候會有<b>固定收入</b>：政治獻金、選舉補助款、地標營收（見「怎麼賺錢」）。</li>
        <li>你擁有的<b>地標和里長</b>帶來支持者；同時付<b>地標租金</b>（每回合）和<b>里長經營費</b>（每 ${R.chiefFeeEvery} 回合）。付不出來就會失去那一格。</li>
        <li>擲骰子前可以按「<b>行動</b>」（見下面），然後擲骰子（點骰子可以換 1 顆或 2 顆），照角色腳下<b>黃色箭頭</b>的方向走。</li>
        <li>停在哪一格，就發生那一格的事。</li>
      </ol>
      <p>大家的起點是錯開的（每人往前 ${R.startSpread} 格），先擲骰子的人才不會太佔便宜。經過起點領 $${R.passGoBonus}。</p>
    </section>

    <section>
      <h3>地標的特殊效果</h3>
      <ul>${Object.values(LANDMARK_EFFECTS).map((e) => `<li><b>${e.name}</b>：${e.text}</li>`).join('')}</ul>
      <p>各區的地標：${DISTRICTS.map((d) => `${d}（${LANDMARKS[d].map((l) => `${l.name}・${LANDMARK_EFFECTS[l.effect].name}`).join('、')}）`).join('；')}</p>
    </section>

    <section>
      <h3>擲骰子前的「行動」</h3>
      <ul>
        <li><b>造勢晚會</b>：花 $${R.rallyCost}，支持者 + ${R.rallyFans}。每場最多 ${R.rallyMax} 次。</li>
        <li><b>遠端派戰將出任務</b>：不用走到里長格也能派，但效果 ×${GR.remoteRate}。</li>
        <li><b>派戰將去拉攏里長</b>：還沒人拉攏的里長，派戰將去拉攏。拜訪過一次的只付一半、${GR.wooTurns} 回合；沒拜訪過的付全額、${GR.wooTurns + 1} 回合。</li>
        <li><b>神秘的金援</b>：派一位戰將去找神秘金主，${R.darkTurns} 回合後回來。成功帶回 $${R.darkMoney}；失敗被檢調盯上，支持者 - ${R.darkFans}、戰將忠誠度 - ${R.darkLoyalty}。成功率 = ${pct(R.darkBaseRate)} + 人脈 × ${pct(R.darkPerNetwork)}。每 ${R.darkEvery} 回合一次。</li>
        <li><b>企業贊助</b>：有完工的地標才能接。拿 $${R.sponsorMoney}，但支持者 - ${R.sponsorFans}。每 ${R.sponsorEvery} 回合一次。</li>
        <li><b>賣地換現金</b>：自己的地半價賣回給銀行。</li>
        <li><b>辯論挑戰</b>：下半場落後第一名 ${R.debateGap} 位以上，可以花 $${R.debateCost} 向第一名下戰帖。贏了：第一名有 ${R.debateFans} 位支持者倒戈給你；輸了：你有 ${R.debateLoseFans} 位倒戈給他。每人每場一次。</li>
      </ul>
    </section>

    <section>
      <h3>選前衝刺</h3>
      <p>最後 ${R.finalRounds} 回合，所有支持者的增減會<b>一回合比一回合大</b>，最後一回合是 2 倍。左上角會顯示目前的倍數。落後的人別放棄！</p>
    </section>

    <section>
      <h3>怎麼賺錢</h3>
      <ul>
        <li><b>經過起點</b>：$${R.passGoBonus}。</li>
        <li><b>政治獻金</b>：每 ${R.donationEvery} 回合，<b>有里長</b>的人領 $${R.donationBase} + 每位里長 $${R.donationPerChief}。</li>
        <li><b>選舉補助款</b>：比賽過一半（第 ${Math.floor(R.maxRounds / 2) + 1} 回合）每人領 $${R.subsidyBase}，支持者到 ${R.subsidyLevels.join('、')} 各再 + $${R.subsidyStep}。</li>
        <li><b>地標營收</b>：每 ${R.revenueEvery} 回合，每座完工地標收錢：${Object.values(LANDMARK_EFFECTS).filter((e) => e.revenue).map((e) => `${e.name} $${e.revenue}`).join('、')}（交通樞紐本來就每回合 +$50）。</li>
        <li><b>募款餐會、政府標案</b>：派戰將去自己的里長那裡辦（見「戰將」）。</li>
        <li><b>神秘的金援、企業贊助、賣地</b>：擲骰子前的行動。</li>
        <li>對手踩到你的地付<b>過路費</b>，機會卡、英文挑戰也有錢。</li>
      </ul>
      <p>付過路費、罰款時錢不夠，會先把你的地盤<b>半價賣回給銀行</b>（便宜的先賣），還是不夠才破產。</p>
    </section>

    <section>
      <h3>格子的效果</h3>
      ${tile('site', `空地 → 地標（${props.length} 塊，${range(props)}）`, `
        <p>每一區有 3 塊空地。買下後可以<b>慢慢蓋</b>：空地 → 工地 → 小建築 → <b>地標</b>。</p>
        <ul>
          <li>買下：支持者 + 價錢的 ${pct(R.buyFansRate)}。</li>
          <li>蓋下一階段：停在或<b>經過</b>自己的空地時，可以花價錢的一半蓋，支持者 + 價錢的 ${pct(R.buildFansRate)}。抽到機會卡「都更計畫」等，可以<b>免費</b>蓋一次。</li>
          <li>蓋到第 3 階段就完工，<b>隨機</b>變成這一區的地標（例如信義區：台北101、國父紀念館、台北市政府），每個地標有<b>特殊效果</b>（見下面）。</li>
          <li>每回合：帶來 價錢 × ${pct(R.landmarkFansRate)} ×（階段 + 1）位支持者，要付租金 價錢 × ${pct(R.landmarkUpkeepRate)} ×（階段 + 1）。</li>
          <li>對手踩到：付過路費（價錢的 10% × ${R.rentMultiplier.join(' / ')} 倍），而且有 價錢 × ${pct(R.landmarkStealRate)} ×（階段 + 1）位支持者<b>倒戈</b>到你這邊。</li>
        </ul>`)}
      ${tile('chief', `里長（${chiefs.length} 區，${range(chiefs)}）`, `
        <p>比較便宜，主要用來<b>拉支持者</b>。</p>
        <ul>
          <li>要<b>拜訪 ${R.chiefVisits} 次</b>才拉攏得到（每次付一半價錢）。也可以派戰將去拉攏（見「行動」）。好感度會用玩家顏色的小圓點顯示在里長格上。</li>
          <li>拉攏：支持者 + ${R.chiefBuyFans}。</li>
          <li>每擁有 ${R.chiefFeeEvery} 回合，付一次地方經營費（價錢 × ${pct(R.chiefFeeRate)}），付不出來里長就跑掉。</li>
          <li>每回合：帶來 ${R.chiefFansPerTurn} 位支持者。</li>
          <li>不能蓋競選總部。</li>
          <li>對手踩到：付價錢 ${pct(R.chiefRentRate)} 的過路費，${R.chiefSteal} 位支持者倒戈。</li>
          <li>走到<b>自己的</b>里長：可以派戰將出任務，或留下來駐守。</li>
          <li>走到<b>對手的</b>里長：付完過路費，可以派戰將<b>拔樁</b>，搶下這一格。</li>
        </ul>`)}
      ${tile('go', '起點', `<p>經過或停在起點，領 $${R.passGoBonus}。</p>`)}
      ${tile('chance', `機會（${TILES.filter((t) => t.type === 'chance').length} 格）`, `<p>抽一張機會卡，大多是好事：拿錢、支持者增加、前進、名人站台……</p>`)}
      ${tile('ballot', `命運（${TILES.filter((t) => t.type === 'fate').length} 格）`, `<p>抽一張命運卡，有好有壞：被爆料、失言被罵、颱風吹走看板……</p>`)}
      ${tile('talent', `戰將招募站（${TILES.filter((t) => t.type === 'talent').length} 格）`, `<p>翻 ${GR.recruitChoices} 張戰將卡，挑 1 位花 $${GR.recruitCost} 招募，也可以不要。戰將人數沒有上限。對手忠誠度低於 ${GR.poachBelow} 的戰將，也可以在這裡<b>挖角</b>（成功才付 $${GR.poachCost}）。</p>`)}
      ${tile('quiz', '英文挑戰（首頁可選擇要不要加入）', `
        <p>隨機出一題英文<b>選擇題</b>或<b>填空題</b>，單字和句型都有。程度可以在首頁選：國小、國中、高中、大學。</p>
        <ul>
          <li>答對：錢 <b>+$${R.quizMoney}</b>，支持者 + ${R.quizFans}。</li>
          <li>答錯：支持者 - ${R.quizWrongFans}。</li>
          <li>加入後，地圖上會有 ${QUIZ_TILE_SLOTS.length} 格英文挑戰（取代 1 格機會、2 格命運）。</li>
        </ul>`)}
      ${tile('jam', '塞車', '<p>下回合暫停一次。</p>')}
      ${tile('mrt', '捷運站', '<p>可以選擇<b>搭捷運</b>到另一個捷運站。下車後方向隨機：可能照原方向走，也可能開始反方向走（看角色腳下的箭頭）。反方向走一樣會經過起點領錢。</p>')}
      ${tile('siren', '拖吊場', `<p>宣傳車被拖吊，罰款 $${R.towFine}。</p>`)}
    </section>

    <section>
      <h3>戰將</h3>
      <p>戰將有三項能力（1～5）：<b>口才</b>、<b>人脈</b>、<b>魅力</b>，還有出身的行政區（在家鄉做事 +${GR.homeBonus}）。右上角「戰將」按鈕可以看各陣營的戰將。</p>
      <p><b>派任務</b>：戰將會離開隊伍幾回合，回來時帶回支持者。站在自己的里長格派，效果全額；擲骰子前遠端派，效果 ×${GR.remoteRate}。</p>
      <ul>
        <li>跑紅白帖（${MISSIONS[0].turns} 回合）：看魅力，不花錢。</li>
        <li>選民服務（${MISSIONS[1].turns} 回合）：看人脈，那一格的樁腳更穩，比較不容易被拔。</li>
        <li>媒體宣傳（${MISSIONS[2].turns} 回合）：看口才，花 $${GR.mediaCost}，效果 ×${GR.mediaBonus}。</li>
        <li><b>募款餐會</b>（${MISSIONS[3].turns} 回合）：看魅力，先付場地費 $${GR.dinnerCost}，帶回 $${GR.dinnerBase} + 魅力 × ${GR.dinnerPerStat} + 骰子 × 10 的錢。</li>
        <li><b>政府標案</b>（${MISSIONS[4].turns} 回合）：先付 $${GR.tenderCost}，回來時里長還是你的就拿 $${GR.tenderMoney}；被搶走只退 $${GR.tenderRefund}。</li>
        <li>駐守：站在自己的里長格時，可以讓戰將留下來防守。駐守後就<b>離開隊伍</b>，不能再派去別的地方；那一格被搶走時才會回來。駐守時要選一個「防守風格」（他最常出的招），對手看得到。</li>
      </ul>
      <p><b>專屬技能</b>：每位戰將都有一個，寫在戰將卡上（★）。</p>
      <p><b>拔樁戰</b>（在對手的里長格）：三戰兩勝，每輪點一張牌出招，雙方擲骰子比分數。</p>
      <ul>
        <li>演講（口才）剋 造勢；造勢（魅力）剋 拜訪；拜訪（人脈）剋 演講。</li>
        <li>分數 = 能力 + 骰子（1～6）+ 剋到對方 ${GR.counterBonus} + 在家鄉 ${GR.homeBonus}。平手算守方贏。</li>
        <li>沒有戰將駐守時，由「地方樁腳」防守：三項能力都等於<b>穩固度</b>。剛拉攏時是 1，每擁有 ${GR.stakeEvery} 回合 +1，最多 ${GR.stakeMax}（樁腳越老越穩）。</li>
        <li>出戰前會顯示<b>勝算</b>。成功：搶下這格，支持者 + ${GR.winFans}。失敗：${GR.loseFans} 位支持者倒戈給對手，戰將休息 ${GR.loseRest} 回合。</li>
      </ul>
      <p><b>忠誠度</b>：一開始 ${GR.startLoyalty}。出任務、打贏會上升；打輸、鬧醜聞、太久沒事做會下降。低於 ${GR.poachBelow} 就可能被對手挖角。</p>
      <p><b>戰將醜聞</b>（命運卡）：隨機一位戰將出包，暫停活動 ${GR.scandalRest} 回合，支持者 - ${GR.scandalFans}。</p>
    </section>

    <section>
      <h3>行政區</h3>
      <p>地圖是照真實台北市的形狀做的（中間的區放大一點），有 ${DISTRICTS.length} 個行政區。每一區的草地有不同的顏色，區和區之間有白線。想知道某一格的名字：手機<b>點一下</b>那一格，電腦把<b>滑鼠移過去</b>。把<b>同一區的地標和里長全部拿下</b>：</p>
      <ul>
        <li>那一區的地標（還沒蓋總部時）過路費加倍。</li>
        <li><b>整區加成</b>：2 格以上的區，每回合再 + ${R.districtBonus} 位支持者。</li>
      </ul>
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
