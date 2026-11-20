# 台北政壇大富翁（8-bit 像素風）

一款以台北地標為地圖、政治人物為角色的大富翁小遊戲。用 [Phaser 4](https://phaser.io/) 做的網頁遊戲，手機瀏覽器就能玩。

## 怎麼玩

- 2～4 位候選人，可以選「我 vs 電腦」或「朋友輪流玩」（同一支手機輪流按）。
- 擲骰子前進，走到沒人買的地標可以買下；走到別人的地標要付過路費。
- 回到自己的地標可以蓋「競選總部」（最多 3 層），過路費會變高。同一顏色兩塊都買下，空地過路費加倍。
- 機會／命運卡：政見發表會、被爆料、宣傳車被拖吊……
- 第 20 回合結束是「投票日」，總資產（現金＋地產）最高的人當選。錢燒光就退出選戰。
- 地圖是斜 45 度的台北街道，鏡頭會跟著角色走；可以拖曳移動地圖，點玩家卡片會跳到那個角色。
- 放大縮小：右上角的 ＋／－ 按鈕；手機可以兩指縮放，電腦可以用滑鼠滾輪。
- 手機直拿是直版畫面；電腦或平板橫放會自動換成寬螢幕版面（左邊玩家資訊、下方訊息）。
- 點地圖上的建築可以看價錢、地主、過路費。

## 檔案說明

| 檔案 | 用途 |
|---|---|
| `index.html` | 遊戲網頁入口 |
| `src/data.js` | **想改內容先看這裡**：地圖格子、價錢、角色名字、機會/命運卡、規則數字 |
| `src/pixelart.js` | 像素圖（16x16 的文字格子，一個字母是一個顏色） |
| `src/game.js` | 斜 45 度城市地圖、角色移動、遊戲規則（買地、付錢、卡片、結算） |
| `src/hud.js` | 疊在地圖上的介面：玩家資訊、骰子、訊息、按鈕、卡片、結算畫面 |
| `src/title.js` | 標題畫面（選人數、模式） |
| `src/common.js` | 共用工具：8-bit 音效、像素按鈕 |
| `src/boot.js` | 啟動遊戲 |
| `assets/buildings/` | （之後放 AI 畫的建築圖，在 `src/data.js` 的 `BUILDING_IMAGES` 登記） |
| `lib/phaser.min.js` | Phaser 4.2.1 遊戲引擎（MIT 授權） |
| `assets/fonts/` | 俐方體 11 號像素字型（SIL OFL 授權） |

## 在電腦上執行

在專案資料夾執行 `python3 -m http.server 8000`，再用瀏覽器打開 <http://localhost:8000>。

---

# 關於這個範本（game-starter）

我的遊戲專案範本。在 GitHub 上按 **Use this template** 建立新的遊戲 repo，新的 repo 會自帶下面這些遊戲開發 skill。在雲端 session 或桌機版 Claude Code 中打開專案，Claude 就會自動讀到。

## 裡面有什麼

`.claude/skills/` 裡放了 **77 個遊戲開發 skill + 1 個 router**：

| 類別 | 數量 | 內容 |
|---|---|---|
| 遊戲引擎 | 49 | Godot 16、Unity 8、Unreal 6、網頁（Phaser / PixiJS / three.js）6、Roblox 8、Bevy / Defold / LÖVE / pygame 4、Ebitengine 1 |
| 系統與手感 | 15 | 打擊感、存檔、對話、鏡頭、隨機生成、敵人 AI、關卡設計、效能… |
| 遊戲類型 | 9 | 平台跳躍、Roguelike、RPG、FPS、塔防、卡牌、視覺小說、生存製作、解謎 |
| 上架流程 | 4 | Game Jam、快速做原型、Steam、itch.io |
| router | 1 | 依照你用的引擎和需求，自動挑出要讀哪幾份 skill |

不用指定 skill，直接用中文說需求就好，例如「幫我的角色加二段跳」。

## 新遊戲怎麼開

1. 在這個 repo 的頁面按 **Use this template → Create a new repository**
2. 幫新遊戲取名字，例如 `my-first-game`，按建立
3. 用新的 repo 開一個 Claude 雲端 session，或 clone 到桌機，然後開始做遊戲

## 來源與更新

- 來源：[gamedev-skills/awesome-gamedev-agent-skills](https://github.com/gamedev-skills/awesome-gamedev-agent-skills)
  （commit `dcf3bbb`，2026-11-10），授權 Apache-2.0，授權條款和 NOTICE 放在 `.claude/skills-license/`。
- 原作者更新時，這裡**不會**自動同步。想更新的話，跟 Claude 說「幫我把 game-starter 的 skill 更新到最新版」就可以。
- 從範本建立出來的遊戲 repo 是獨立的副本，範本更新後不會影響它們。
