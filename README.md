# Taipei Public Amenities Map / 台北市公共便利設施地圖

Mobile-first bilingual map for finding public toilets, pedestrian garbage bins, dog-waste bag boxes, drinking facilities, and timed collection points in Taipei.

The app is static, bilingual, PWA-ready, and requires no backend, login, admin page, database, Google Maps API key, or paid map service.

## English

### Features

- Traditional Chinese UI by default, with English toggle persisted in `localStorage`.
- Leaflet + OpenStreetMap map, no Google Maps API key required.
- Local static amenity data loaded from `public/data/facilities.json`.
- Facility type filter for pedestrian garbage bins, dog-waste bag boxes, public toilets, public-place drinking fountains, timed collection points, and direct drinking stations.
- Public toilet category, accessible-toilet, and parent-child-toilet filters.
- Public drinking fountain place-category and opening-hour filters.
- Timed collection accepted-item/special-note filters and direct drinking station status, city, place-type, maintenance, and photo filters.
- Search across district, address, road, location, note, toilet name, toilet category, manager, public drinking fountain place name, install location, and opening hours.
- Taipei district filter and nearest-facility lookup using browser geolocation.
- Emoji map markers and legend for each facility type.
- Marker rendering is capped for large unfiltered result sets to avoid mobile clutter.
- Conversion report for dropped rows, missing fields, invalid coordinates, and coordinate outliers.
- PWA manifest, icons, and service worker caching for repeat visits.

### Install

```bash
npm install
```

### Convert CSV Data

The converter reads three local source datasets:

- `/Users/Leo/Downloads/●行人專用清潔箱總表.csv` - Big5/CP950
- `/Users/Leo/Downloads/狗便袋箱位置總表 .csv` - Big5/CP950
- `/Users/Leo/Downloads/臺北市公廁點位資訊.csv` - UTF-8-SIG

The public-place drinking fountain layer is fetched from Taipei Open Data and stored as raw local JSON before conversion:

- Dataset: `臺北市公共場所飲水機資訊`
- API: `https://data.taipei/api/v1/dataset/52538305-ed23-490c-8f67-3efff2d777c3?scope=resourceAquire`
- Raw JSON: `data/raw/drinking-fountains/`

Two Big5/CP950 CSV layers use local raw-data copies:

- `●115年開放時間 (限時收受點csv) 1150223.csv` → `data/raw/timed-collection-points/`
- `11505_直飲臺基本資料.csv` → `data/raw/direct-drinking-stations/`

```bash
npm run data:fetch:timed-collection
npm run data:fetch:direct-drinking
npm run convert:facilities
```

Fetch the raw API JSON, then regenerate the static public data:

```bash
npm run fetch:drinking-fountains
npm run convert:facilities
```

If a CSV source is unavailable, the converter falls back to the existing cleaned JSON for that dataset and records the fallback in `conversion-report.json`.

```bash
npm run convert:facilities
```

`npm run convert:bins` is kept as a compatibility alias.

Optional path overrides:

```bash
npm run convert:facilities -- \
  --pedestrian-csv /path/to/pedestrian-bins.csv \
  --dog-waste-csv /path/to/dog-waste-bag-boxes.csv \
  --public-toilet-csv /path/to/public-toilets.csv \
  --out-dir public/data
```

Environment variables: `PEDESTRIAN_BINS_CSV`, `DOG_WASTE_BAG_BOXES_CSV`, `PUBLIC_TOILETS_CSV`, `FACILITY_DATA_OUTPUT_DIR`, `PEDESTRIAN_BINS_FALLBACK_JSON`, `DOG_WASTE_BAG_BOXES_FALLBACK_JSON`, and `PUBLIC_TOILETS_FALLBACK_JSON`.

Default outputs:

```text
public/data/facilities.json
public/data/pedestrian-bins.json
public/data/dog-waste-bag-boxes.json
public/data/public-toilets.json
public/data/drinking-fountains.json
public/data/timed-collection-points.json
public/data/direct-drinking-stations.json
public/data/conversion-report.json
```

Inspect `public/data/conversion-report.json` after conversion. Coordinate outliers are kept, marked with `isCoordinateOutlier: true`, surfaced in the UI, and excluded from map marker rendering. Drinking fountain rows with missing or invalid coordinates are kept in JSON, reported, and excluded from map marker rendering.

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

Pedestrian garbage bins, dog-waste bag boxes, public toilets, public-place drinking fountains, timed collection points, and direct drinking stations are different facility types. Accepted-item flags are conservatively inferred from notes; unknown does not mean unavailable. Listed station status, opening hours, accepted items, availability, and water-quality information must be verified with on-site and official notices.

## 中文

### 功能

- 預設使用繁體中文介面，並提供 English 切換；語言選擇會存在 `localStorage`。
- 使用 Leaflet + OpenStreetMap，不需要 Google Maps API key。
- 從 `public/data/facilities.json` 載入本機靜態便利設施資料。
- 支援行人專用清潔箱、狗便袋箱、公廁、公共場所飲水機、限時收受點與直飲臺的設施類型篩選。
- 支援公廁類別、無障礙廁所、親子廁所篩選。
- 支援公共場所飲水機場所類型與開放時間資料篩選。
- 支援限時收受點收受項目／特殊備註，以及直飲臺狀態、縣市、場所類型、維護資訊與照片篩選。
- 搜尋涵蓋行政區、地址、路名、位置、備註、公廁名稱、公廁類別、管理單位、飲水機場所名稱、設置地點與開放時間。
- 支援台北市行政區篩選與瀏覽器定位找附近設施。
- 不同設施類型使用 emoji 地圖標記與圖例。
- 大量未篩選結果不會直接渲染所有地圖標記，避免手機地圖過度擁擠。
- 轉換報告會記錄刪除列、缺漏欄位、無效座標與座標疑似異常列。
- 已具備 PWA manifest、icons 與 service worker，支援重複造訪時的快取。

### 安裝

```bash
npm install
```

### 轉換 CSV 資料

轉換腳本讀取三份本機來源資料：

- `/Users/Leo/Downloads/●行人專用清潔箱總表.csv` - Big5/CP950
- `/Users/Leo/Downloads/狗便袋箱位置總表 .csv` - Big5/CP950
- `/Users/Leo/Downloads/臺北市公廁點位資訊.csv` - UTF-8-SIG

公共場所飲水機圖層會先從台北資料大平台擷取 API，存成原始 JSON 後再轉換：

- 資料集：`臺北市公共場所飲水機資訊`
- API：`https://data.taipei/api/v1/dataset/52538305-ed23-490c-8f67-3efff2d777c3?scope=resourceAquire`
- 原始 JSON：`data/raw/drinking-fountains/`

另外兩個 Big5/CP950 CSV 圖層會先複製到本機 raw data：

- `●115年開放時間 (限時收受點csv) 1150223.csv` → `data/raw/timed-collection-points/`
- `11505_直飲臺基本資料.csv` → `data/raw/direct-drinking-stations/`

```bash
npm run data:fetch:timed-collection
npm run data:fetch:direct-drinking
npm run convert:facilities
```

先擷取 API，再重新產生靜態資料：

```bash
npm run fetch:drinking-fountains
npm run convert:facilities
```

若來源 CSV 不在本機，轉換腳本會回退使用該資料集既有的 cleaned JSON，並在 `conversion-report.json` 記錄 fallback。

```bash
npm run convert:facilities
```

`npm run convert:bins` 保留為相容 alias。

也可以指定路徑：

```bash
npm run convert:facilities -- \
  --pedestrian-csv /path/to/pedestrian-bins.csv \
  --dog-waste-csv /path/to/dog-waste-bag-boxes.csv \
  --public-toilet-csv /path/to/public-toilets.csv \
  --out-dir public/data
```

環境變數：`PEDESTRIAN_BINS_CSV`、`DOG_WASTE_BAG_BOXES_CSV`、`PUBLIC_TOILETS_CSV`、`FACILITY_DATA_OUTPUT_DIR`、`PEDESTRIAN_BINS_FALLBACK_JSON`、`DOG_WASTE_BAG_BOXES_FALLBACK_JSON`、`PUBLIC_TOILETS_FALLBACK_JSON`。

預設輸出：

```text
public/data/facilities.json
public/data/pedestrian-bins.json
public/data/dog-waste-bag-boxes.json
public/data/public-toilets.json
public/data/drinking-fountains.json
public/data/timed-collection-points.json
public/data/direct-drinking-stations.json
public/data/conversion-report.json
```

轉換後請檢查 `public/data/conversion-report.json`。座標疑似異常列會保留並標記 `isCoordinateOutlier: true`，前端也會顯示提醒，且不渲染為地圖標記。飲水機資料若有缺漏或無效座標，會保留在 JSON、寫入報告，且不渲染為地圖標記。

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

行人專用清潔箱、狗便袋箱、公廁、公共場所飲水機、限時收受點與直飲臺是不同設施。收受項目依備註保守判讀，未知不代表不收受。直飲臺狀態、開放時間、收受項目、可用狀態與水質維護資訊請以現場及主管機關公告為準。
