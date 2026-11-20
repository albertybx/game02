// =====================================================================
// 特殊挑戰：英文學習格
// 題庫分四個程度（國小、國中、高中、大學），每個程度有選擇題和填空題，單字、句型都有。
//
// 題目寫法：
//   選擇題：{ q: '題目', choices: ['正確答案', '錯的', '錯的', '錯的'], note: '解說（可省略）' }
//           ※ 第一個選項永遠是正確答案，出題時會自動打亂順序
//   填空題：{ q: '題目', fill: '答案' 或 ['答案', '另一種寫法'], hint: true（顯示字首和字數）, note: '解說' }
// 想加題目，照格式往下加就好。
// =====================================================================

const QUIZ_LEVELS = [
  { key: 'elementary', name: '國小' },
  { key: 'junior', name: '國中' },
  { key: 'senior', name: '高中' },
  { key: 'college', name: '大學' },
];

const QUIZ_BANK = {
  elementary: [
    { q: '「dog」是什麼意思？', choices: ['狗', '貓', '鳥', '魚'] },
    { q: '「蘋果」的英文是？', choices: ['apple', 'banana', 'orange', 'grape'] },
    { q: 'I ___ a student.', choices: ['am', 'is', 'are', 'be'], note: '主詞是 I，要用 am。' },
    { q: 'She ___ my sister.', choices: ['is', 'am', 'are', 'be'], note: '主詞是 she（第三人稱單數），用 is。' },
    { q: '「red」是什麼顏色？', choices: ['紅色', '藍色', '綠色', '黃色'] },
    { q: 'How are you? — I\'m ___, thank you.', choices: ['fine', 'five', 'fire', 'find'] },
    { q: '「早安」的英文是？', choices: ['Good morning', 'Good night', 'Goodbye', 'Thank you'] },
    { q: 'There are seven days in a ___.', choices: ['week', 'month', 'year', 'hour'] },
    { q: '「老師」的英文是？', choices: ['teacher', 'doctor', 'student', 'farmer'] },
    { q: 'They ___ playing basketball.', choices: ['are', 'is', 'am', 'be'], note: '主詞 they 是複數，用 are。' },
    { q: '「big」的相反詞是？', choices: ['small', 'tall', 'long', 'fast'] },
    { q: 'What time is it? — It\'s ___ o\'clock.', choices: ['three', 'third', 'thirty', 'thirteenth'] },
    { q: '填入單字：貓 = ?', fill: 'cat', hint: true },
    { q: '填入單字：書 = ?', fill: 'book', hint: true },
    { q: '填空：I have two ___ .（眼睛）', fill: 'eyes', hint: true, note: '兩個眼睛是複數，要加 s。' },
    { q: '填空：One, two, ___ , four.', fill: 'three' },
    { q: '填入單字：水 = ?', fill: 'water', hint: true },
    { q: '填空：I ___ ice cream.（喜歡）', fill: 'like', hint: true },
    { q: '填空：Monday, Tuesday, ___ .（星期三）', fill: 'Wednesday', hint: true },
    { q: '填入單字：學校 = ?', fill: 'school', hint: true },
  ],
  junior: [
    { q: '「library」是什麼意思？', choices: ['圖書館', '實驗室', '醫院', '郵局'] },
    { q: 'He ___ to school every day.', choices: ['goes', 'go', 'going', 'gone'], note: '主詞 he 是第三人稱單數，現在式動詞要加 es。' },
    { q: 'I ___ TV when my mom came home.', choices: ['was watching', 'am watching', 'watch', 'watches'], note: '過去某個時間點正在做的事，用過去進行式。' },
    { q: '「borrow」是什麼意思？', choices: ['（向別人）借', '歸還', '購買', '賣出'] },
    { q: 'This book is ___ than that one.', choices: ['more interesting', 'most interesting', 'interestinger', 'interesting'], note: '兩個比較用比較級；長的形容詞用 more。' },
    { q: 'Have you ever ___ to Japan?', choices: ['been', 'went', 'go', 'going'], note: '現在完成式：have + 過去分詞 been。' },
    { q: '「expensive」的相反詞是？', choices: ['cheap', 'rich', 'poor', 'heavy'] },
    { q: 'If it ___ tomorrow, we will stay home.', choices: ['rains', 'will rain', 'rained', 'raining'], note: 'if 子句表示未來的條件，用現在式。' },
    { q: '「environment」是什麼意思？', choices: ['環境', '政府', '經濟', '教育'] },
    { q: 'She is good ___ singing.', choices: ['at', 'in', 'on', 'for'], note: 'be good at + 名詞／動名詞：擅長……' },
    { q: 'I\'m looking forward to ___ you.', choices: ['seeing', 'see', 'saw', 'seen'], note: 'look forward to 的 to 是介系詞，後面接動名詞。' },
    { q: '「選舉」的英文是？', choices: ['election', 'selection', 'collection', 'direction'] },
    { q: '填入單字：天氣 = ?', fill: 'weather', hint: true },
    { q: '填空：I have lived here ___ 2010.（自從）', fill: 'since', note: 'since + 時間點；for + 一段時間。' },
    { q: '填空：She can speak English very ___ .（好地）', fill: 'well', note: '修飾動詞用副詞 well，不是形容詞 good。' },
    { q: '填入單字：重要的 = ?', fill: 'important', hint: true },
    { q: '填空：Thank you ___ your help.', fill: 'for' },
    { q: '填入單字：政府 = ?', fill: 'government', hint: true },
    { q: '填空：How ___ is this shirt? — It\'s 300 dollars.', fill: 'much', note: '問價錢用 How much。' },
    { q: '填空：The sun rises in ___ east.（冠詞）', fill: 'the', note: '方位 east、west 前面要加 the。' },
  ],
  senior: [
    { q: '「candidate」是什麼意思？', choices: ['候選人', '選民', '議員', '市長'] },
    { q: '「campaign」在選舉中指的是？', choices: ['競選活動', '投票所', '政黨', '民調'] },
    { q: 'Not until midnight ___ home.', choices: ['did he come', 'he came', 'he did come', 'came he'], note: 'Not until 放句首要倒裝：助動詞 did 移到主詞前面。' },
    { q: '「reluctant」是什麼意思？', choices: ['不情願的', '熱心的', '可靠的', '相關的'] },
    { q: 'The policy, ___ was announced yesterday, is controversial.', choices: ['which', 'what', 'who', 'where'], note: '補充說明「事物」的關係代名詞用 which。' },
    { q: 'If I ___ you, I would vote early.', choices: ['were', 'am', 'will be', 'be'], note: '與現在事實相反的假設，be 動詞一律用 were。' },
    { q: '「majority」是什麼意思？', choices: ['多數', '少數', '主修', '成熟'] },
    { q: 'She suggested that he ___ more careful.', choices: ['be', 'is', 'was', 'being'], note: 'suggest that + 主詞 +（should）原形動詞。' },
    { q: '「approve」的名詞是？', choices: ['approval', 'approvement', 'approving', 'approver'] },
    { q: 'Hardly ___ the speech when the crowd cheered.', choices: ['had he finished', 'he had finished', 'did he finished', 'he finished'], note: 'Hardly 放句首要倒裝，搭配過去完成式。' },
    { q: '「transparent」是什麼意思？', choices: ['透明的', '暫時的', '傳統的', '翻譯的'] },
    { q: 'The number of voters ___ increasing.', choices: ['is', 'are', 'were', 'have'], note: 'the number of……（……的數量）是單數；a number of……（許多）才是複數。' },
    { q: '填入單字：民主 = ?', fill: 'democracy', hint: true },
    { q: '填入單字：投票（動詞）= ?', fill: 'vote', hint: true },
    { q: '填空：He is used to ___ up early.（get）', fill: 'getting', note: 'be used to + 動名詞：習慣於……' },
    { q: '填入單字：承諾 = ?', fill: 'promise', hint: true },
    { q: '填空：The bridge ___ in 1990.（build 的被動語態，兩個字）', fill: 'was built', note: '被動語態：be 動詞 + 過去分詞。' },
    { q: '填入單字：公民 = ?', fill: 'citizen', hint: true },
    { q: '填空：She has been working here ___ three years.', fill: 'for', note: 'for + 一段時間；since + 時間點。' },
    { q: '填入單字：政策 = ?', fill: 'policy', hint: true },
  ],
  college: [
    { q: '「constituency」是什麼意思？', choices: ['選區（的選民）', '憲法', '組成成分', '一致性'] },
    { q: '「incumbent」指的是？', choices: ['現任者', '挑戰者', '候選人', '顧問'] },
    { q: '「bipartisan」是什麼意思？', choices: ['兩黨共同的', '兩極化的', '雙語的', '二手的'] },
    { q: '「referendum」是什麼意思？', choices: ['公民投票', '參考資料', '推薦信', '退款'] },
    { q: 'Had the bill passed, the law ___ changed.', choices: ['would have been', 'will be', 'would be', 'had been'], note: '與過去事實相反的假設（省略 if 倒裝），主句用 would have + 過去分詞。' },
    { q: '「legitimate」最接近哪個字的意思？', choices: ['lawful', 'temporary', 'obvious', 'generous'] },
    { q: '「scrutiny」是什麼意思？', choices: ['仔細審查', '腳本', '雕塑', '安全'] },
    { q: 'It is essential that every vote ___ counted.', choices: ['be', 'is', 'was', 'will be'], note: 'It is essential that + 主詞 +（should）原形動詞。' },
    { q: '「ambiguous」的相反詞是？', choices: ['clear', 'vague', 'huge', 'annual'] },
    { q: '「mandate」在政治上指的是？', choices: ['選民的授權', '任期限制', '政治獻金', '議會休會'] },
    { q: 'Seldom ___ such a close election.', choices: ['have we seen', 'we have seen', 'we saw', 'saw we'], note: 'Seldom 放句首要倒裝：助動詞 have 移到主詞前面。' },
    { q: '「deliberate」（形容詞）是什麼意思？', choices: ['故意的、深思熟慮的', '匆忙的', '自由的', '精緻的'] },
    { q: '填入單字：立法 = ?', fill: 'legislation', hint: true },
    { q: '填入單字：貪污、腐敗 = ?', fill: 'corruption', hint: true },
    { q: '填入單字：投票率 = ?', fill: 'turnout', hint: true },
    { q: '填入單字：憲法 = ?', fill: 'constitution', hint: true },
    { q: '填入單字：反對（黨）= ?', fill: 'opposition', hint: true },
    { q: '填空：The proposal was rejected ___ a vote of 30 to 12.（介系詞）', fill: 'by', note: '以……票數表示用 by a vote of。' },
    { q: '填入單字：透明度 = ?', fill: 'transparency', hint: true },
    { q: '填入單字：經濟 = ?', fill: 'economy', hint: true },
  ],
};

// 依程度抽一題（同一場不重複，抽完再洗牌）
const QuizDeck = {
  decks: {},
  draw(level) {
    if (!this.decks[level] || this.decks[level].length === 0) {
      this.decks[level] = Phaser.Utils.Array.Shuffle([...QUIZ_BANK[level]]);
    }
    return this.decks[level].pop();
  },
  reset() { this.decks = {}; },
};

function quizAnswers(item) {
  return Array.isArray(item.fill) ? item.fill : [item.fill];
}

function normalizeAnswer(s) {
  return String(s).trim().toLowerCase().replace(/\s+/g, ' ').replace(/[.。]$/, '');
}

// 填空題的提示：字首 + 底線（例如 w _ _ _ _ _ _）
function quizHint(item) {
  const a = quizAnswers(item)[0];
  if (!item.hint || a.includes(' ')) return '';
  return `${a[0]} ${'_ '.repeat(a.length - 1).trim()}（${a.length} 個字母）`;
}

const escapeHTML = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// 顯示一題英文測驗（網頁視窗）。真人玩家自己作答；電腦玩家會自動作答（有時答錯）。
// 回傳 Promise<boolean>：答對是 true
function showQuiz(item, player, levelName) {
  return new Promise((resolve) => {
    const wrap = document.createElement('div');
    wrap.id = 'quiz';
    const isFill = item.fill !== undefined;
    const choices = isFill ? [] : Phaser.Utils.Array.Shuffle(item.choices.map((text, k) => ({ text, ok: k === 0 })));
    const hint = isFill ? quizHint(item) : '';
    wrap.innerHTML = `
      <div class="q-box" role="dialog" aria-label="英文挑戰">
        <div class="q-head"><span>英文挑戰・${escapeHTML(levelName)}</span><span class="q-who" style="background:${player.color}">${escapeHTML(player.name)}${player.human ? '' : '（電腦）'}</span></div>
        <div class="q-body">
          <p class="q-type">${isFill ? '填空題' : '選擇題'}</p>
          <p class="q-q">${escapeHTML(item.q)}</p>
          ${hint ? `<p class="q-hint">提示：${escapeHTML(hint)}</p>` : ''}
          ${isFill
            ? `<form class="q-fill"><input id="q-input" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="輸入英文答案"><button type="submit">送出</button></form>`
            : `<div class="q-choices">${choices.map((c, k) => `<button type="button" data-k="${k}">${escapeHTML(c.text)}</button>`).join('')}</div>`}
          <div class="q-result" hidden></div>
        </div>
      </div>`;
    document.body.appendChild(wrap);
    setGameInput(false);
    const result = wrap.querySelector('.q-result');
    let done = false;

    const finish = (ok, given) => {
      if (done) return;
      done = true;
      wrap.querySelectorAll('button, input').forEach((el) => { el.disabled = true; });
      const correct = isFill ? quizAnswers(item)[0] : choices.find((c) => c.ok).text;
      if (!isFill) {
        wrap.querySelectorAll('.q-choices button').forEach((b) => {
          const c = choices[Number(b.dataset.k)];
          if (c.ok) b.classList.add('ok');
          else if (c.text === given) b.classList.add('bad');
        });
      }
      if (ok) Sfx.buy(); else Sfx.bad();
      result.hidden = false;
      result.className = `q-result ${ok ? 'ok' : 'bad'}`;
      result.innerHTML = `
        <p class="q-verdict">${ok ? '答對了！' : '答錯了…'}</p>
        ${isFill && !ok ? `<p>你的答案：${escapeHTML(given || '（空白）')}</p>` : ''}
        ${!ok ? `<p>正確答案：<b>${escapeHTML(correct)}</b></p>` : ''}
        ${item.note ? `<p class="q-note">${escapeHTML(item.note)}</p>` : ''}
        <button type="button" class="q-next">繼續</button>`;
      const next = result.querySelector('.q-next');
      const close = () => { wrap.remove(); setGameInput(true); resolve(ok); };
      if (player.human) {
        next.disabled = false;
        next.addEventListener('click', () => { Sfx.click(); close(); });
        next.focus();
      } else {
        next.hidden = true;
        setTimeout(close, 1800);
      }
    };

    if (isFill) {
      const input = wrap.querySelector('#q-input');
      wrap.querySelector('.q-fill').addEventListener('submit', (e) => {
        e.preventDefault();
        const v = input.value;
        finish(quizAnswers(item).some((a) => normalizeAnswer(a) === normalizeAnswer(v)), v);
      });
      if (player.human) setTimeout(() => input.focus(), 50);
    } else {
      wrap.querySelectorAll('.q-choices button').forEach((b) => {
        b.addEventListener('click', () => {
          const c = choices[Number(b.dataset.k)];
          Sfx.click();
          finish(c.ok, c.text);
        });
      });
    }

    // 電腦玩家：想一下再作答，大約 60% 會答對
    if (!player.human) {
      wrap.querySelectorAll('button, input').forEach((el) => { el.disabled = true; });
      setTimeout(() => {
        const ok = Math.random() < GAME_RULES.quizCpuAccuracy;
        if (isFill) {
          const a = quizAnswers(item)[0];
          const given = ok ? a : a.slice(0, -1) + (a.endsWith('e') ? 'a' : 'e');
          wrap.querySelector('#q-input').value = given;
          finish(ok, given);
        } else {
          const pick = ok ? choices.find((c) => c.ok) : Phaser.Utils.Array.GetRandom(choices.filter((c) => !c.ok));
          finish(ok, pick.text);
        }
      }, 1400);
    }
  });
}
