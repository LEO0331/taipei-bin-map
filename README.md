# Taipei Public Amenities Map / 台北市公共便利設施地圖

Mobile-first bilingual map for finding public toilets, riverside toilets, family-friendly toilets, motorcycle inspection stations, EV charging/swap stations, gas/LPG stations, recycling facilities, drinking facilities, and other Taipei public amenities.

The app is static, bilingual, PWA-ready, and requires no backend, login, admin page, database, Google Maps API key, or paid map service.

## English

### Features

- Traditional Chinese UI by default, with English toggle persisted in `localStorage`.
- Leaflet + OpenStreetMap map, no Google Maps API key required.
- Local static amenity data loaded from `public/data/facilities.json`.
- Facility type filter for pedestrian garbage bins, dog-waste bag boxes, public toilets, riverside toilets, family-friendly toilets, drinking facilities, timed collection points, used-clothing recycling boxes, and lactation rooms.
- Public service locations: motorcycle inspection stations, electric motorcycle charging stations, commercial EV charging/battery-swap stations, and gas/LPG stations.
- Toilet layers: public toilets, riverside toilets, and family-friendly toilets.
- Public toilet category, accessible-toilet, and parent-child-toilet filters.
- Public drinking fountain place-category and opening-hour filters.
- Timed collection accepted-item/special-note filters and direct drinking station status, city, place-type, maintenance, and photo filters.
- Used-clothing recycling box village, organization, and phone filters.
- Family-friendly facilities: lactation rooms, with opening-hour, contact, location-guidance, certification-information, equipment, service, and legal-list filters.
- Search across district, address, road, location, note, toilet name, toilet category, manager, public drinking fountain place name, install location, and opening hours.
- Taipei district filter and nearest-facility lookup using browser geolocation.
- Emoji map markers and legend for each facility type.
- Broad multi-layer map views are list-first: individual markers return for nearby results or a narrowed single layer with at most 500 valid coordinates.
- Lactation rooms, motorcycle inspection stations, electric motorcycle charging stations, and commercial EV charging/battery-swap stations are shown as searchable directories and district-level summary bubbles when the source files do not contain coordinates.
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

The used-clothing recycling layer also uses a local Big5/CP950 CSV copy:

```bash
npm run data:fetch:used-clothing
npm run data:convert:used-clothing
npm run convert:facilities
```

Fields map from approval ID, district, village, approved location, organization, phone, longitude, and latitude into the shared facility model.

The lactation-room layer uses two Big5/CP950 resources from `臺北市哺集乳室`:

- `台北哺乳室建置資料清單-1141231.csv` is the richer primary source.
- `臺北市依法設置哺集乳室清單.csv` is cross-referenced by normalized facility name and address.

```bash
npm run data:fetch:lactation-rooms
npm run data:convert:lactation-rooms
npm run convert:facilities
```

The converter deduplicates matching records, parses semicolon-separated equipment fields, converts ROC certification dates when possible, and reports unmatched or unparseable examples. Since neither source contains coordinates, the app uses district summary bubbles and address-based Google Maps links. Manually verified coordinates may be added later to `public/data/lactation-room-locations.json`; automatic or paid geocoding is not used.

Two additional Big5/CP950 toilet layers use local CSV snapshots:

- `115年度河濱公廁點位(含景觀)0209.csv`: WGS84 map coordinates, TWD97 reference fields, riverside park, location, type, and remarks.
- `臺北市親子友善廁所點位資訊.csv`: toilet identity, category, grade, manager, diaper-table count, child-seat count, and award field.

```bash
npm run data:fetch:riverside-toilets
npm run data:fetch:family-friendly-toilets
npm run convert:facilities
```

Family-friendly records are kept as a specialized layer and softly cross-referenced to general public toilets by normalized name and address. Blank award fields are preserved as “not listed,” not interpreted as poor quality.

The motorcycle inspection station layer uses the UTF-8-SIG `115年臺北市定檢站(245).csv` resource:

```bash
npm run data:fetch:motorcycle-inspection-stations
npm run data:convert:motorcycle-inspection-stations
npm run convert:facilities
```

The source has no coordinates, so the app shows a district-level directory and address-based Google Maps links. `負責人` is preserved in JSON for source fidelity but is not shown on default cards or popups. Manually verified coordinates can be added later to `public/data/motorcycle-inspection-station-locations.json`; automatic geocoding is not used.

The electric motorcycle charging station layer uses the UTF-8-SIG `115年臺北市電動機車充電地點(398).csv` resource:

```bash
npm run data:fetch:electric-motorcycle-charging-stations
npm run data:convert:electric-motorcycle-charging-stations
npm run convert:facilities
```

The source has no coordinates, so the app shows a district-level directory and address-based Google Maps links. `備註` is parsed into location categories such as inspection station, public parking lot, service factory, and cleaning team. Manually verified coordinates can be added later to `public/data/electric-motorcycle-charging-station-locations.json`; automatic geocoding is not used. The app does not claim real-time charger availability, pricing, charging speed, or equipment status.

The commercial EV charging and battery-swap layer uses three Big5/CP950 local CSV snapshots:

- `臺北市營利電動車充電站-240站.csv`
- `臺北市營利電動機車充電站-12站.csv`
- `臺北市營利電動機車換電站-365站.csv`

```bash
npm run data:fetch:commercial-ev
npm run data:convert:commercial-ev
npm run convert:facilities
```

The source files do not provide coordinates, so records stay address-only with district summary bubbles and address-based Google Maps links. Service type is derived from the source filename. This layer is distinct from the non-commercial electric motorcycle charging station dataset and does not claim real-time availability, pricing, payment support, membership eligibility, charging speed, or battery inventory.

The gas/LPG station layer uses the UTF-8-SIG `臺北市加油站及加氣站分布圖.csv` resource:

```bash
npm run data:fetch:gas-lpg-stations
npm run data:convert:gas-lpg-stations
npm run convert:facilities
```

The converter preserves gasoline, LPG, self-service, supplier, phone, business-hour text, and source status fields. It converts TWD97 `ADDR_X` / `ADDR_Y` coordinates to WGS84 for Leaflet markers. Business hours are source text only; the app does not claim current opening status, fuel/LPG availability, prices, or recommendations.

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
public/data/riverside-toilets.json
public/data/riverside-toilet-summary.json
public/data/family-friendly-toilets.json
public/data/family-friendly-toilet-summary.json
public/data/toilet-summary.json
public/data/drinking-fountains.json
public/data/timed-collection-points.json
public/data/direct-drinking-stations.json
public/data/used-clothing-recycling-boxes.json
public/data/lactation-rooms.json
public/data/lactation-room-summary.json
public/data/lactation-room-locations.json
public/data/motorcycle-inspection-stations.json
public/data/motorcycle-inspection-station-summary.json
public/data/motorcycle-inspection-station-locations.json
public/data/electric-motorcycle-charging-stations.json
public/data/electric-motorcycle-charging-station-summary.json
public/data/electric-motorcycle-charging-station-locations.json
public/data/commercial-ev-charging-swap-stations.json
public/data/commercial-ev-charging-swap-station-summary.json
public/data/commercial-ev-charging-swap-station-locations.json
public/data/gas-lpg-stations.json
public/data/gas-lpg-station-summary.json
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

Public toilets, riverside toilets, family-friendly toilets, motorcycle inspection stations, electric motorcycle charging stations, commercial EV charging/battery-swap stations, and gas/LPG stations remain separate source-specific layers. Equipment counts, award fields, business hours, cleanliness, maintenance, opening status, charger availability, fuel/LPG availability, pricing, payment methods, membership requirements, battery inventory, and service availability are public-data snapshots rather than real-time guarantees. Verify details with official, operator, venue, managing-unit, station, or on-site notices.

## 中文

### 功能

- 預設使用繁體中文介面，並提供 English 切換；語言選擇會存在 `localStorage`。
- 使用 Leaflet + OpenStreetMap，不需要 Google Maps API key。
- 從 `public/data/facilities.json` 載入本機靜態便利設施資料。
- 支援行人專用清潔箱、狗便袋箱、公廁、河濱廁所、親子友善廁所、飲水設施、限時收受點、舊衣回收箱與哺集乳室的設施類型篩選。
- 公共服務站點：機車定檢站、電動機車充電站、營利型電動車充換電站與加油站及加氣站。
- 公廁圖層包含一般公廁、河濱廁所與親子友善廁所。
- 支援公廁類別、無障礙廁所、親子廁所篩選。
- 支援公共場所飲水機場所類型與開放時間資料篩選。
- 支援限時收受點收受項目／特殊備註，以及直飲臺狀態、縣市、場所類型、維護資訊與照片篩選。
- 支援舊衣回收箱里別、設置團體與電話資料篩選。
- 親子友善設施：哺集乳室，支援開放時間、聯絡方式、位置指引、認證資訊、設備、友善服務與依法設置清單篩選。
- 搜尋涵蓋行政區、地址、路名、位置、備註、公廁名稱、公廁類別、管理單位、飲水機場所名稱、設置地點與開放時間。
- 支援台北市行政區篩選與瀏覽器定位找附近設施。
- 不同設施類型使用 emoji 地圖標記與圖例。
- 大量未篩選結果不會直接渲染所有地圖標記，避免手機地圖過度擁擠。
- 哺集乳室、機車定檢站、電動機車充電站與營利型電動車充換電站來源若未提供座標，會以前端清單與行政區彙總泡泡呈現。
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

舊衣回收箱圖層也使用 Big5/CP950 本機 CSV：

```bash
npm run data:fetch:used-clothing
npm run data:convert:used-clothing
npm run convert:facilities
```

欄位會將核准編號、行政區、里別、核准地點、團體名稱、電話與座標映射到共用設施模型。

哺集乳室圖層使用 `臺北市哺集乳室` 的兩份 Big5/CP950 資料：

- `台北哺乳室建置資料清單-1141231.csv` 作為欄位較完整的主要來源。
- `臺北市依法設置哺集乳室清單.csv` 依正規化後的機構名稱與地址交叉比對。

```bash
npm run data:fetch:lactation-rooms
npm run data:convert:lactation-rooms
npm run convert:facilities
```

轉換程序會去除重複設施、解析分號分隔設備欄位、轉換民國認證日期，並記錄未配對或無法解析的範例。兩份來源都沒有座標，因此地圖只顯示行政區彙總，Google Maps 連結使用地址查詢。日後可將人工驗證座標加入 `public/data/lactation-room-locations.json`；目前不使用自動或付費地理編碼。

另外兩個 Big5/CP950 公廁圖層使用本機 CSV 快照：

- `115年度河濱公廁點位(含景觀)0209.csv`：包含 WGS84 地圖座標、TWD97 參考座標、河濱公園、位置、類型與備註。
- `臺北市親子友善廁所點位資訊.csv`：包含公廁識別、類別、等級、管理單位、尿布臺、兒童座椅與評鑑獲獎欄位。

```bash
npm run data:fetch:riverside-toilets
npm run data:fetch:family-friendly-toilets
npm run convert:facilities
```

親子友善廁所會保留為獨立專門圖層，並依正規化名稱與地址與一般公廁進行柔性比對。評鑑欄位空白只表示資料未列值，不代表品質不佳。

機車定檢站圖層使用 UTF-8-SIG 的 `115年臺北市定檢站(245).csv`：

```bash
npm run data:fetch:motorcycle-inspection-stations
npm run data:convert:motorcycle-inspection-stations
npm run convert:facilities
```

來源沒有座標，因此以前端清單與行政區彙總呈現，Google Maps 連結使用地址查詢。`負責人` 會保存在 JSON 以保留來源欄位，但不顯示於預設卡片或彈窗。日後可將人工驗證座標加入 `public/data/motorcycle-inspection-station-locations.json`；目前不使用自動地理編碼。

電動機車充電站圖層使用 UTF-8-SIG 的 `115年臺北市電動機車充電地點(398).csv`：

```bash
npm run data:fetch:electric-motorcycle-charging-stations
npm run data:convert:electric-motorcycle-charging-stations
npm run convert:facilities
```

來源沒有座標，因此以前端清單與行政區彙總呈現，Google Maps 連結使用地址查詢。`備註` 會解析為檢驗站、公有停車場、服務廠、清潔隊等地點分類。日後可將人工驗證座標加入 `public/data/electric-motorcycle-charging-station-locations.json`；目前不使用自動地理編碼。本網站不宣稱即時可用、充電價格、充電速度或設備狀態。

營利型電動車充換電站圖層使用三份 Big5/CP950 本機 CSV 快照：

- `臺北市營利電動車充電站-240站.csv`
- `臺北市營利電動機車充電站-12站.csv`
- `臺北市營利電動機車換電站-365站.csv`

```bash
npm run data:fetch:commercial-ev
npm run data:convert:commercial-ev
npm run convert:facilities
```

來源沒有座標，因此以前端清單與行政區彙總呈現，Google Maps 連結使用地址查詢。服務類型由來源檔名判斷。此圖層與非營利的電動機車充電站資料分開處理，且不宣稱即時可用、費率、付款方式、會員資格、充電速度或可換電池庫存。

加油站及加氣站圖層使用 UTF-8-SIG 的 `臺北市加油站及加氣站分布圖.csv`：

```bash
npm run data:fetch:gas-lpg-stations
npm run data:convert:gas-lpg-stations
npm run convert:facilities
```

轉換程序會保留加油、加氣、自助加油、供油廠商、電話、營業時間來源文字與來源狀態欄位，並將 TWD97 `ADDR_X` / `ADDR_Y` 轉為 WGS84 經緯度供 Leaflet 顯示。營業時間只是來源文字；本網站不宣稱即時營業狀態、油氣供應、價格或推薦程度。

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
public/data/riverside-toilets.json
public/data/riverside-toilet-summary.json
public/data/family-friendly-toilets.json
public/data/family-friendly-toilet-summary.json
public/data/toilet-summary.json
public/data/drinking-fountains.json
public/data/timed-collection-points.json
public/data/direct-drinking-stations.json
public/data/used-clothing-recycling-boxes.json
public/data/lactation-rooms.json
public/data/lactation-room-summary.json
public/data/lactation-room-locations.json
public/data/motorcycle-inspection-stations.json
public/data/motorcycle-inspection-station-summary.json
public/data/motorcycle-inspection-station-locations.json
public/data/electric-motorcycle-charging-stations.json
public/data/electric-motorcycle-charging-station-summary.json
public/data/electric-motorcycle-charging-station-locations.json
public/data/commercial-ev-charging-swap-stations.json
public/data/commercial-ev-charging-swap-station-summary.json
public/data/commercial-ev-charging-swap-station-locations.json
public/data/gas-lpg-stations.json
public/data/gas-lpg-station-summary.json
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

行人專用清潔箱、狗便袋箱、公廁、飲水設施、限時收受點、直飲臺、舊衣回收箱、機車定檢站、電動機車充電站、營利型電動車充換電站與加油站及加氣站是不同設施或站點。收受項目依備註保守判讀，未知不代表不收受。直飲臺狀態、開放時間、收受項目、舊衣回收箱可投遞狀態、機車定檢站服務、充換電站可用狀態、油氣供應、費率、付款方式、會員資格與水質維護資訊請以現場、業者及主管機關公告為準。
