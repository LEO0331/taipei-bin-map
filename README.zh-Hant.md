# 臺北公共便利設施地圖

[English](README.md) | [繁體中文](README.zh-Hant.md)

這是一個以行動裝置為優先的雙語公共設施地圖與目錄。它整合臺北市官方公開資料，協助市民與旅客尋找設施、比較來源所列資訊，並了解哪些事項仍應向現場或管理單位確認。

專案採靜態網站與 PWA 架構，不需要後端、帳號、資料庫、Google Maps API 金鑰或付費地圖服務。

## 支援功能

- 預設繁體中文介面，可切換英文；語言偏好只保存在瀏覽器本機。
- 關鍵字、行政區與來源專屬條件篩選；地址查詢連結；授權後的附近排序。
- Leaflet 地圖與 CARTO 底圖；大範圍結果採清單優先，避免地圖失去操作性。
- 本機 JSON 資料、轉換品質報告與 service worker 離線快取。
- 響應式卡片、目錄、表格、CSV 匯出、鍵盤操作與行動版介面。

## 資料模組

主公共設施地圖涵蓋行人垃圾桶、狗便袋箱、一般／河濱／親子廁所、飲水設施、回收服務、哺集乳室、機車檢驗、電動車服務、加油／瓦斯站、吸菸與禁菸場所、清潔針具服務點、受保護樹木、停車、綠地認養與公有路外停車無障礙設施等資料。

另有以下依來源設計的獨立查詢模組：

| 路由 | 模組 | 使用界線 |
| --- | --- | --- |
| `#/cooling-comfort-spots` | 臺北市涼適點 | 設施、開放時間與設備是來源快照，不代表即時可用或緊急避難所。 |
| `#/public-school-sports-venues` | 公立學校運動場地搜尋 | 校園開放不表示可預約、存在特定運動場地或目前有空檔。 |
| `#/bulky-waste-collection-booking` | 巨大廢棄物清運預約 | 預約時間與電話不表示即時受理。 |
| `#/unused-medicine-collection-stations` | 廢棄藥品檢收站 | 目錄資訊不構成醫療建議或即時收受保證。 |
| `#/industrial-waste-reuse-operators` | 事業廢棄物再利用者 | 登錄紀錄不代表可現場交付或有即時處理量。 |
| `#/low-carbon-sustainable-communities` | 低碳永續家園認證 | 行政認證紀錄不代表目前碳排放、碳中和或環境品質。 |

## 資料使用原則

- 前端只讀取本機靜態 JSON，不會在使用者瀏覽時呼叫臺北市開放資料 API。
- 轉換時會盡可能保留來源原值；衍生分類會依來源與規則標示。
- 精確地圖標記只使用通過驗證的官方座標。無座標、地址型或座標異常紀錄仍會保留於目錄中，不會自動地理編碼。
- 開放時間、設備、電話、可近性、容量、價格與可用狀態都是資料更新當下的快照，使用前請向管理單位或現場公告確認。
- 只有在使用者授權後，瀏覽器才會於本次工作階段計算附近距離；專案不會保存精確位置。

## 安裝與啟動

```bash
npm install
npm run dev
```

請開啟 Vite 顯示的本機網址。

## 轉換本機資料

多數原始資料快照位於 `data/raw/`，前端使用的結果寫入 `public/data/`。

```bash
# 重建合併後的公共設施地圖資料
npm run convert:facilities

# 重建獨立查詢與目錄資料
npm run data:convert:cooling-comfort-spots
npm run data:convert:public-school-sports-venues
npm run data:convert:bulky-waste-collection-booking
npm run data:convert:unused-medicine-collection-stations
npm run data:convert:industrial-waste-reuse-operators
npm run data:convert:low-carbon-sustainable-communities
```

部分資料集需要先執行擷取指令，將官方來源複製或取得為本機快照；完整指令請見 `package.json`。轉換後請查看 `public/data/conversion-report.json` 與各模組摘要，了解來源專屬的品質檢查結果。

## 驗證

```bash
npm test
npm run build
npm run test:e2e
./init.sh
```

Playwright 會啟動自己的 Vite 伺服器。若預設連接埠被本機程序占用，可改用其他連接埠：

```powershell
$env:PLAYWRIGHT_PORT='5175'; npm run test:e2e
```

## 部署

專案可作為靜態 Vite 網站部署到 Vercel、Netlify 或 GitHub Pages。

- Framework：`Vite`
- Install：`npm ci`
- Build：`npm run build`
- Output：`dist`
- Environment variables：無

詳細內容請見[部署指南](docs/deployment.zh-Hant.md)。

## 延伸文件

- [決策應用與營運建議](docs/dashboard-decision-making.zh-Hant.md)
- [系統設計](docs/system-design.zh-Hant.md)
- [架構取捨](docs/tradeoffs.zh-Hant.md)
- [部署指南](docs/deployment.zh-Hant.md)

## 授權

請見 [LICENSE](LICENSE)。
