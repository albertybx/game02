# 專案說明（給 Claude）

## 這個 repo 是什麼

這是使用者的遊戲專案範本（或從範本 `game-starter` 建立的遊戲專案）。`.claude/skills/` 裡有來自
[gamedev-skills/awesome-gamedev-agent-skills](https://github.com/gamedev-skills/awesome-gamedev-agent-skills)
的 77 個遊戲開發 skill，加上一個 `router`。做遊戲相關的工作時，先用 `router` skill 挑出要讀的 skill，讀完再動手。

## 使用者

- 第一次用 AI 做遊戲，是程式新手。請用**繁體中文**、白話回覆，少用術語；非用不可時順便解釋一句。
- 常用手機在雲端 session 上操作，不一定有電腦在手邊。
- **能直接幫使用者做的事就直接做，不要叫使用者自己操作。**例如開新的雲端對話（用 `create_session`）、開 PR。只有真的做不到時（例如工具權限不允許建立新 repo、按 Merge 這類要本人決定的事），才說明原因並給最短的步驟或直接連結。
- 如果還沒決定引擎，用下面的方式建議：
  - 想快點看到成果、用手機或瀏覽器就能玩 → **Phaser**（網頁遊戲）。雲端可以直接測試，也能分享網址給別人玩。
  - 想認真做、以後上 Steam → **Godot**。要在電腦上裝 Godot 編輯器才能打開來玩、調整。
- 一開始先做很小、能玩的版本（例如 1 到 2 關），再慢慢加功能。

## Git 與分支

- 雲端 session 會把改動推到 `claude/` 開頭的工作分支。新的 session 讀的是 `main`。
- **使用者已經同意：改完、測試過之後，直接開 PR 並合併到 `main`，不用再詢問。**合併後等 GitHub Pages
  更新完成，再告訴使用者新版已上線、版本號是多少。
- 跟使用者解釋分支時，可以用「影印一份設計圖來改，改好再謄回正式圖」的比喻，使用者之前聽得懂。

## 更新 skill

`.claude/skills/` 是建立 repo 當下從範本複製過來的，不會自動更新。使用者想更新時，從上面的上游 repo
取最新版，覆蓋 `.claude/skills/`，並保留 `.claude/skills-license/` 裡的授權檔，以及我們自己寫的
`.claude/skills/taipei-art-pipeline/`（上游沒有，覆蓋時不要刪掉）。

## 發佈新版（這個遊戲專案）

- 遊戲網址：https://albertybx.github.io/game02/ （GitHub Pages，合併到 `main` 後一兩分鐘自動更新）
- **每次改遊戲都要把 `index.html` 裡的 `window.GAME_VERSION` 改成新的版本號**（例如 `2026.11.20-3`），
  不然手機瀏覽器會沿用舊的暫存檔，看不到新版。標題畫面左上角會顯示版本號，方便使用者確認。

## 遊戲現況（給接手的對話串）

「台北政壇大富翁」：Phaser 4 像素風、斜 45 度地圖的台灣政治大富翁，手機直版、電腦橫版都能玩。規則、玩法說明看 `README.md`，遊戲裡的「選戰指南」（`src/guide.js`）也有完整規則。

| 檔案 | 內容 |
|---|---|
| `src/data.js` | 所有數字和資料：`GAME_RULES`、`GENERAL_RULES`、地圖 `MAP_LAND`／`MAP_ROUTE`／`TILES`（78 格）、地標、戰將、任務、卡片 |
| `src/game.js` | 遊戲流程（`playTurn`、`walk`、`resolveTile`、擲骰前行動 `preRoll`）、地圖繪製、電腦判斷（`cpu*`） |
| `src/generals.js` | 戰將：招募、登門拜訪、任務、駐守、拔樁戰、辯論、神秘的金援 |
| `src/hud.js` | 畫面上的介面：玩家卡、骰子、訊息、事件框、即時民調、紀錄 |
| `src/title.js` | 首頁：選角色、人數、玩法、回合數、設定 |
| `src/common.js`／`src/music.js` | 共用工具、音效、背景音樂（自己合成，不用 Phaser 的聲音） |
| `docs/` | 之前的分析報告（金錢流量、任務平衡、難度設計意見） |
| `tools/balance.js` | 平衡測試：用真正的遊戲讓 4 位電腦對打，記錄錢和支持者從哪來 |
| `assets/ASSETS.md` | 每張素材的來源和授權紀錄，換圖或加圖時要補一行 |
| `tools/ask_gemini.py` | 請 Gemini 讀遊戲程式回答問題：`python3 tools/ask_gemini.py "問題" 輸出.md`（金鑰在雲端環境的網路密鑰裡，代理自動加上） |

**測試方式**：在 repo 根目錄 `python3 -m http.server 8123`，用 Playwright 開 `http://localhost:8123/index.html`，
分別用 iPhone 13 模擬和 1440×860 桌機各測一次並看截圖。平衡測試：`node tools/balance.js 名稱 8 30 all 0 8`
（8 場、30 回合，會用到上面的本機伺服器），再 `python3 tools/balance_report.py tools/res_名稱.json`。

**畫圖、換圖**：先讀 `.claude/skills/taipei-art-pipeline/SKILL.md`。重點：請 Codex 用 `image_gen` 畫（不要寫程式一格一格畫，試過效果很差），
建築要對齊 2:1 菱形地磚，一定要縮到遊戲實際大小給使用者看。

**風格切換（測試中）**：網址加 `?style=2` 就換成新風格（`src/style.js`）。新圖放 `assets/style2/`、檔名和原本一樣，
並登記在 `STYLE2_FILES`；沒登記的照用原本的圖。地圖顏色、樹的多寡在 `MAP_STYLE`。改程式時兩種風格都要測，原本的風格不能變。
目前風格 2 換了：草地、道路、人行磚、河水、樹，以及各區草地顏色、海岸。

**還沒決定的事**：
- 轉蛋／政策牛肉／道具：三方意見在 `docs/轉蛋道具-Codex.md`、`docs/轉蛋道具-Gemini.md`，Claude 的意見在對話裡，使用者還在決定。
- 神明：Claude 和 Codex 各提過方案（王船、城隍爺、關帝廟擲筊、媽祖…），使用者還在決定。
- 難度：使用者還在考慮。A＝照 Codex 只改電腦判斷（`docs/難度設計-Codex意見.md`）；B＝A 再加上困難模式公開的小優勢（例如電腦多 300 位支持者）；C＝先不做。難度要放在首頁「設定」視窗。
- 電腦玩家目前不會選「政府標案」任務。

## 請其他 AI 一起給意見

- 使用者用代號點名：**#C = Claude（你）**、**#X = Codex**、**#G = Gemini**。例如「#C #X 給意見」就是你和 Codex 各給一份；只寫 #C 就是只要你做。
- 使用者常說「你和 Codex（或 Gemini）各自給意見」：自己想一份，也請它們各想一份，再整理比較。
- **Codex**：雲端環境開機時會裝好 `codex`（已登入）。把要讀的檔案複製到暫存資料夾，寫好 `TASK.md`，執行 `codex exec --skip-git-repo-check -s workspace-write "請讀 TASK.md 並完成裡面的任務。"`，請它寫 `codex_report.md`。
- **Gemini**：用 `tools/ask_gemini.py`（預設 gemini-3-flash-preview，免費版可用；忙線會自動換模型）。

## 多個對話串一起做

- 每個對話串開始工作前先拉最新的 `main`，用**自己的分支**（例如 `claude/難度`、`claude/新地圖`），不要共用分支。
- 一次只做一件事，做完、測試完就開 PR 合併，盡量不要讓分支放很久，減少互相衝突。
- 合併前如果 `main` 已經被別的對話串更新，先把 `main` 合併進自己的分支再測一次。
  最常衝突的是 `index.html` 的 `GAME_VERSION`：用當天日期、比 `main` 上的號碼再多 1。
- 兩個對話串不要同時大改同一個檔案的同一塊（例如都在改 `src/game.js` 的 `playTurn`），使用者分派工作時可以提醒。
