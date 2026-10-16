# 靜態網站部署指南

[English](deployment.en.md) | [繁體中文](deployment.zh-Hant.md)

2026-10-16 核對。PR 已合併不代表託管部署已成功。

## Vercel 設定

匯入 GitHub repository，Root Directory 為 `./`、Framework 為 `Vite`、Install 為 `npm ci`、Build 為 `npm run build`、Output 為 `dist`。不需應用程式環境變數、API 金鑰或後端。Node 版本須符合 `package.json` 的 `^20.19.0 || >=22.12.0`。發布前核對實際部署結果與目標 commit。

## 發布前驗證

```bash
npm ci
npm test
npm run build
npm run test:e2e -- --workers=2
npm run test:policy-preview
git diff --check
```

`test:policy-preview` 須先完成 production build，會自啟 preview server。E2E 自啟嚴格連接埠 Vite server；5173 被占用時可設定 `PLAYWRIGHT_PORT`（PowerShell：`$env:PLAYWRIGHT_PORT='5175'`）。`bash ./init.sh` 包含單元測試、建置及 E2E，但不含額外 preview 驗證。

不要只為了部署而重建資料。轉換會更新保留輸出／日期，僅在刻意更新來源時執行專屬腳本與審查流程；政策來源採用須另獲審查。監測失敗不構成替換或發布資料的授權。

## 路徑與正式網址

`/#/bin-policy` 等 hash 路由不需伺服器路由處理；但執行期資料路徑與 service-worker 註冊使用根目錄絕對路徑。Vercel／Netlify 根目錄部署較直接；GitHub Pages 的專案子路徑須先檢查 base、資料路徑與 worker 範圍，不能只設定 Vite base 就宣稱支援。

canonical URL、`og:url` 與 sitemap 須使用已確認的正式網域；目前 `index.html` 未加入這些網址標籤。

## 快取、離線與空白頁排查

只在 production 註冊的 worker 對導覽、雜湊資產與政策 JSON 使用 network-first；一般資料、圖示及 manifest 使用 cache-first。政策資料在成功開啟對應模式後才快取，不隨首頁預載。外部 OpenStreetMap 圖磚不由 worker 快取，離線可能缺少；不能保證首次離線造訪可用。

一般快取資料或預載集合改變時須檢查 worker 快取版本。啟用會移除舊命名快取；controller 改變時每個瀏覽器工作階段最多自動重載一次。除乾淨載入外，也須驗證既有工作階段升版；preview 離線測試不等於涵蓋所有跨部署升版路徑。

空白頁先看瀏覽器 console 與資產／資料 HTTP 回應，確認部署 commit、HTML／chunk 相容、根路徑及 worker 狀態。介面存在但底圖空白，與應用程式渲染失敗不同。清除網站資料會刪除本機偏好與離線資料，只適合作診斷，不是永久修正。

## 上線責任

在實際 preview 網址檢查各路由、雙語及窄螢幕；核對政策來源／方法／權重版本與日期。來源監測可能合理地失敗（保留的觀光查核為 HTTP403）；本機測試通過不代表雲端權限、來源復原或設置適宜性已驗證。詳見[目前交接](../session-handoff.md)與[治理](bin-policy-v1.2-governance.md)。
