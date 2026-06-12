# Taipei Street Cleanliness Map / 台北市街頭清潔便利地圖

Mobile-first public web app for finding two Taipei street-cleanliness facility types:

- Pedestrian garbage bins / 行人專用清潔箱
- Dog-waste bag boxes / 狗便袋箱

The app is static, bilingual, PWA-ready, and requires no backend, login, admin page, database, Google Maps API key, or paid map service.

## English

### Features

- Traditional Chinese UI by default, with English toggle persisted in `localStorage`.
- Leaflet + OpenStreetMap map, no Google Maps API key required.
- Local static facility data loaded from `public/data/facilities.json`.
- Facility type filter for all facilities, pedestrian garbage bins, or dog-waste bag boxes.
- Search across district, address, road, location, and note fields.
- Taipei district filter and nearest-facility lookup using browser geolocation.
- Distinct map styling and legend for each facility type.
- Conversion report for dropped rows, missing fields, and coordinate outliers.
- PWA manifest, icons, and service worker caching for repeat visits.

### Install

```bash
npm install
```

### Convert CSV Data

Both source CSV files are Big5/CP950 encoded. The converter reads:

- `/Users/Leo/Downloads/●行人專用清潔箱總表.csv`
- `/Users/Leo/Downloads/狗便袋箱位置總表 .csv`

If the pedestrian-bin CSV is not available, the converter falls back to the existing cleaned `public/data/bins.json` so the repo can still regenerate combined facility data.

```bash
npm run convert:facilities
```

`npm run convert:bins` is kept as a compatibility alias.

Default outputs:

```text
public/data/facilities.json
public/data/pedestrian-bins.json
public/data/dog-waste-bag-boxes.json
public/data/conversion-report.json
```

Inspect `public/data/conversion-report.json` after conversion. Coordinate outliers are kept, marked with `isCoordinateOutlier: true`, and surfaced in the UI instead of silently discarded.

### Development

```bash
npm run dev
```

Open the URL printed by Vite. The app loads static JSON locally and does not require a backend.

### Tests

```bash
npm test
npm run build
npm run test:e2e
./init.sh
```

### Production Build

```bash
npm run build
npm run preview
```

### Vercel Deployment

Use these Vercel settings:

- Framework Preset: `Vite`
- Root Directory: `./`
- Install Command: `npm ci`
- Build Command: `npm run build`
- Output Directory: `dist`
- Environment Variables: none

More detail: [docs/deployment.en.md](docs/deployment.en.md)

### Design Docs

- [System design](docs/system-design.en.md)
- [Tradeoff decisions](docs/tradeoffs.en.md)
- [Deployment guide](docs/deployment.en.md)

### Data Notice

Pedestrian garbage bins and dog-waste bag boxes are different facility types. Dog-waste bag boxes are not trash bins; they indicate places where dog owners can obtain bags or identify dog-waste cleanup facilities. Actual locations should be verified on site.

## 中文

### 功能

- 預設使用繁體中文介面，並提供 English 切換；語言選擇會存在 `localStorage`。
- 使用 Leaflet + OpenStreetMap，不需要 Google Maps API key。
- 從 `public/data/facilities.json` 載入本機靜態設施資料。
- 支援全部設施、行人專用清潔箱、狗便袋箱的設施類型篩選。
- 搜尋涵蓋行政區、地址、路名、位置與備註。
- 支援台北市行政區篩選與瀏覽器定位找附近設施。
- 不同設施類型使用不同地圖樣式與圖例。
- 轉換報告會記錄刪除列、缺漏欄位與座標疑似異常列。
- 已具備 PWA manifest、icons 與 service worker，支援重複造訪時的快取。

### 安裝

```bash
npm install
```

### 轉換 CSV 資料

兩份來源 CSV 都是 Big5/CP950 編碼。轉換腳本讀取：

- `/Users/Leo/Downloads/●行人專用清潔箱總表.csv`
- `/Users/Leo/Downloads/狗便袋箱位置總表 .csv`

若行人專用清潔箱來源 CSV 不在本機，轉換腳本會回退使用既有的 `public/data/bins.json`，讓此 repo 仍可重新產生合併設施資料。

```bash
npm run convert:facilities
```

`npm run convert:bins` 保留為相容 alias。

預設輸出：

```text
public/data/facilities.json
public/data/pedestrian-bins.json
public/data/dog-waste-bag-boxes.json
public/data/conversion-report.json
```

轉換後請檢查 `public/data/conversion-report.json`。座標疑似異常列不會被靜默刪除，而是保留並標記 `isCoordinateOutlier: true`，前端也會顯示提醒。

### 開發

```bash
npm run dev
```

開啟 Vite 顯示的網址即可。此 app 使用本機靜態 JSON，不需要後端。

### 測試

```bash
npm test
npm run build
npm run test:e2e
./init.sh
```

### Production Build

```bash
npm run build
npm run preview
```

### Vercel 部署

使用以下 Vercel 設定：

- Framework Preset：`Vite`
- Root Directory：`./`
- Install Command：`npm ci`
- Build Command：`npm run build`
- Output Directory：`dist`
- Environment Variables：無

詳細說明：[docs/deployment.zh-Hant.md](docs/deployment.zh-Hant.md)

### 設計文件

- [系統設計](docs/system-design.zh-Hant.md)
- [取捨決策](docs/tradeoffs.zh-Hant.md)
- [部署指南](docs/deployment.zh-Hant.md)

### 資料提醒

行人專用清潔箱與狗便袋箱是不同設施。狗便袋箱不是垃圾桶，而是提供犬便袋或犬便清理相關設施的位置。實際位置請以現場為準。
