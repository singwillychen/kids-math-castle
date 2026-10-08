# Kid's Math Castle 公主與青蛙的數學城堡

給 4–7 歲小朋友的互動式加減法與心算練習網站（HTML / CSS / JS）。

**🌐 線上直接玩：https://singwillychen.github.io/kids-math-castle/**

- **最簡單**：開啟上面的網址，或下載後用瀏覽器打開 `index.html`（紀錄存在這台裝置）。
- **多台平板共用紀錄**：放到 NAS 並執行 `server.py`（見下方）。

## 功能

- **登入畫面**：每位小朋友有自己的帳號（名字、50 組頭像或上傳自己的圖片、年齡），星星與紀錄各自分開
- **年齡**：中班（5 以內）、大班（10 以內）、小一（20 以內，含湊十、借十）
- **🍎 數蘋果**、**🔟 十格框**、**🐸 數線跳跳**、**⚡ 心算練習**、**🧮 算盤教室**、**🎁 我的寶盒**
- **🔈 語音唸題**（右上角開關）：數字念成中文（6 − 4 = ? → 「六減四等於多少」），每題都有「再唸一次」按鈕
- **實體鍵盤**：數字鍵輸入、Enter 送出、Backspace 刪除
- **👨‍👩‍👧 家長專區**（乘法題或自訂家長密碼）：
  - 📊 全部比較：各小朋友的題數、一次答對率、最近 7 天、各題型表現、最需要加強的地方
  - 個別帳號：詳細分析、弱點建議、答錯題目（可看算盤解法）、學習路線、年齡與題數設定、編輯／刪除帳號
  - 💾 存檔位置狀態、立即同步、完整備份（JSON）下載與還原、CSV 匯出

## 存檔位置

| 方式 | 適合 | 說明 |
|---|---|---|
| 💻 瀏覽器（一定會存） | 單一裝置 | 清除瀏覽器資料或換裝置會不見 |
| 🗄️ NAS／電腦伺服器 | **多台平板、兩位孩子** | 用 `server.py` 開網站時自動啟用，紀錄存在 `data/` 資料夾 |
| 📁 網路硬碟資料夾 | 電腦版 Chrome／Edge | 家長專區選一個資料夾（NAS 網路磁碟機、Google Drive／OneDrive／Synology Drive 同步資料夾），自動寫入 JSON |
| 📦 備份檔 | 任何裝置 | 家長專區下載／還原完整備份 |

### 在 NAS（例如 Synology）上執行

1. 在 NAS 套件中心安裝 **Python 3**（或用家裡任何一台有 Python 3 的電腦）。
2. 把整個網站資料夾複製到 NAS，例如 `/volume1/web/math-castle`。
3. 用 SSH 登入 NAS，執行：
   ```
   cd /volume1/web/math-castle
   python3 server.py --port 8080
   ```
   想把紀錄放在別的地方：`python3 server.py --port 8080 --data /volume1/homes/me/math-data`
4. 平板、電腦的瀏覽器開啟 `http://NAS的IP:8080`，家長專區會顯示「NAS 伺服器：已連線」。
5. 想開機自動啟動：在 Synology「控制台 → 任務排程表」新增「開機時」觸發的使用者定義指令碼，內容填第 3 步的指令。

紀錄檔案：`data/settings.json`（家長密碼等）、`data/profiles/帳號ID.json`（每位小朋友一個檔）；刪除的帳號會移到 `data/trash/`。

> 伺服器沒有帳號密碼保護，只適合在家裡的區域網路使用，不要開放到網際網路。

## 檔案結構

```
├── index.html
├── server.py          選用：NAS／電腦伺服器（Python 3，不需安裝套件）
├── css/style.css
├── js/
│   ├── storage.js     存檔：瀏覽器、NAS 伺服器、網路硬碟資料夾、備份
│   ├── app.js         共用：帳號、語音、音效、數字鍵盤、星星、練習紀錄
│   ├── login.js       登入畫面與帳號編輯
│   ├── objects.js     數蘋果
│   ├── tenframe.js    十格框
│   ├── numberline.js  數線跳跳
│   ├── drill.js       心算練習
│   ├── abacus.js      算盤與撥珠步驟
│   ├── rewards.js     我的寶盒
│   └── parent.js      家長專區
└── images/            princess.svg、frog.svg、apple.svg、castle.svg
```
