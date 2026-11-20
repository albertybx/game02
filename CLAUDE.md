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
取最新版，覆蓋 `.claude/skills/`，並保留 `.claude/skills-license/` 裡的授權檔。

## 發佈新版（這個遊戲專案）

- 遊戲網址：https://albertybx.github.io/game02/ （GitHub Pages，合併到 `main` 後一兩分鐘自動更新）
- **每次改遊戲都要把 `index.html` 裡的 `window.GAME_VERSION` 改成新的版本號**（例如 `2026.11.20-3`），
  不然手機瀏覽器會沿用舊的暫存檔，看不到新版。標題畫面左上角會顯示版本號，方便使用者確認。
