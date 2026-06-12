# Vercel 部署指南

## 建議流程

此專案可作為 Vite 靜態前端部署到 Vercel。

1. 將 repository 推到 GitHub。
2. 在 Vercel 選擇 **Add New Project**。
3. 匯入 GitHub repository。
4. 使用以下專案設定：
   - Framework Preset：`Vite`
   - Root Directory：`./`
   - Install Command：`npm ci`
   - Build Command：`npm run build`
   - Output Directory：`dist`
   - Environment Variables：無
5. 部署 preview。
6. 用桌機與手機開啟 preview URL。
7. 上 production 前，對 Vercel preview URL 跑 Lighthouse。

## 上線前檢查

```bash
npm ci
npm run convert:facilities
./init.sh
```

此 app 不需要 API key，也沒有後端。它會以靜態資源方式載入 `public/data/facilities.json`、`public/data/pedestrian-bins.json`、`public/data/dog-waste-bag-boxes.json`、`public/data/public-toilets.json` 與 `public/data/conversion-report.json`。

## Production URL Metadata

確定正式 Vercel production URL 後，再加入：

- canonical URL
- `og:url`
- 使用正式網址的 sitemap

不要在正式網域確定前硬寫猜測的 Vercel URL。

## 離線行為

Service worker 會快取 app shell、PWA icons 與本機設施 JSON。OpenStreetMap 圖磚是外部網路資源，離線時可能不完整。
