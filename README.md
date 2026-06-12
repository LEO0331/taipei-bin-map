# Taipei Pedestrian Garbage Bin Map

Mobile-first public web app for finding pedestrian-use public garbage bins in Taipei.

中文說明見下方「中文」章節。

## English

### Features

- Traditional Chinese UI by default, with English toggle persisted in `localStorage`.
- Leaflet + OpenStreetMap map, no Google Maps API key required.
- Local static bin data loaded from `public/data/bins.json`.
- Data metadata loaded from `public/data/bins.metadata.json` and shown in the footer.
- Address keyword search, Taipei district filter, and nearest-bin lookup using browser geolocation.
- PWA-ready manifest, PNG icons, and service worker caching for repeat visits.

### Install

```bash
npm install
```

### Convert CSV Data

The source CSV is Big5/CP950 encoded. The converter decodes it, drops empty or invalid-coordinate rows, ignores `Unnamed: 5`, converts coordinates to numbers, and writes normalized records plus metadata. Source: https://data.taipei/dataset/detail?id=a835f3ba-7f50-4b0d-91a6-9df128632d1c

```bash
npm run convert:bins
```

Default outputs:

```text
public/data/bins.json
public/data/bins.metadata.json
```

You can also pass explicit paths:

```bash
npm run convert:bins -- /path/to/source.csv public/data/bins.json
```

### Development

```bash
npm run dev
```

Open the URL printed by Vite. The app loads data locally and does not require a backend.

### Tests

```bash
npm test
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

The app displays Taipei pedestrian-use public garbage bins. Household garbage is strictly prohibited and violators may be fined NT$6,000. Actual locations should be verified on site.

## 中文

### 功能

- 預設使用繁體中文介面，並提供 English 切換；語言選擇會存在 `localStorage`。
- 使用 Leaflet + OpenStreetMap，不需要 Google Maps API key。
- 從 `public/data/bins.json` 載入本機靜態清潔箱資料。
- 從 `public/data/bins.metadata.json` 載入資料產生時間與筆數，並顯示在 footer。
- 支援地址/地點關鍵字搜尋、台北市行政區篩選、瀏覽器定位找附近清潔箱。
- 已具備 PWA manifest、PNG icons 與 service worker，支援重複造訪時的快取。

### 安裝

```bash
npm install
```

### 轉換 CSV 資料

來源 CSV 是 Big5/CP950 編碼。轉換腳本會解碼、移除空白列與無效經緯度列、忽略 `Unnamed: 5`、將經緯度轉為數字，並輸出標準化資料與 metadata。資料來源：https://data.taipei/dataset/detail?id=a835f3ba-7f50-4b0d-91a6-9df128632d1c

```bash
npm run convert:bins
```

預設輸出：

```text
public/data/bins.json
public/data/bins.metadata.json
```

也可以指定路徑：

```bash
npm run convert:bins -- /path/to/source.csv public/data/bins.json
```

### 開發

```bash
npm run dev
```

開啟 Vite 顯示的網址即可。此 app 使用本機靜態資料，不需要後端。

### 測試

```bash
npm test
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

此 app 顯示台北市行人專用公共清潔箱。嚴禁投入家用垃圾，違者可能被處新臺幣 6,000 元罰鍰。實際位置請以現場為準。
