# Taipei Public Amenities Map / 台北市公共便利設施地圖

Mobile-first bilingual map for finding public toilets, riverside toilets, family-friendly toilets, motorcycle inspection stations, EV charging/swap stations, gas/LPG stations, designated smoking areas, announced no-smoking places, recycling facilities, drinking facilities, and other Taipei public amenities.

The app is static, bilingual, PWA-ready, and requires no backend, login, admin page, database, Google Maps API key, or paid map service.

## English

### Features

- Traditional Chinese UI by default, with English toggle persisted in `localStorage`.
- Leaflet + OpenStreetMap map, no Google Maps API key required.
- Local static amenity data loaded from `public/data/facilities.json`.
- Facility type filter for pedestrian garbage bins, dog-waste bag boxes, public toilets, riverside toilets, family-friendly toilets, drinking facilities, timed collection points, used-clothing recycling boxes, community recycling stations, and lactation rooms.
- Public service locations: motorcycle inspection stations, electric motorcycle charging stations, commercial EV charging/battery-swap stations, and gas/LPG stations.
- Public health, urban nature, and environmental facilities: Taipei designated smoking areas, announced no-smoking places, clean needle exchange service points, and protected trees with source fields and location references.
- Toilet layers: public toilets, riverside toilets, and family-friendly toilets.
- Public toilet category, accessible-toilet, and parent-child-toilet filters.
- Public drinking fountain place-category and opening-hour filters.
- Timed collection accepted-item/special-note filters and direct drinking station status, city, place-type, maintenance, and photo filters.
- Used-clothing recycling box village, organization, and phone filters.
- Community recycling station district-code, road-name, address, and parsed-road filters.
- Clean needle service point area-code, service-item, service-point-category, road, phone, extension, and 24-hour-service filters.
- Protected tree species, scientific-name, English-name, location-type, management-unit, size-category, coordinate-quality, and size-data-quality filters.
- Family-friendly facilities: lactation rooms, with opening-hour, contact, location-guidance, certification-information, equipment, service, and legal-list filters.
- Search across district, address, road, location, note, toilet name, toilet category, manager, public drinking fountain place name, install location, and opening hours.
- Taipei district filter and nearest-facility lookup using browser geolocation.
- Emoji map markers and legend for each facility type.
- Broad multi-layer map views are list-first: individual markers return for nearby results or a narrowed single layer with at most 500 valid coordinates.
- Lactation rooms, motorcycle inspection stations, electric motorcycle charging stations, commercial EV charging/battery-swap stations, community recycling stations, and clean needle service points are shown as searchable directories and district-level summary bubbles when the source files do not contain coordinates. Protected trees use validated source coordinates and exact markers when narrowed by search/filter/nearby.
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

The community recycling station layer uses the CP950/Big5 `臺北市社區資源回收站資訊.csv` resource:

```bash
npm run data:fetch:community-recycling
npm run data:convert:community-recycling
npm run convert:facilities
```

The source provides station name, district, district code, and address, but no coordinates. The app keeps these as address-only records, shows district summary bubbles, and uses address-based Google Maps lookup links. It does not claim real-time operating status, current opening hours, accepted recyclable items, service availability, complete recycling rules, collection schedules, waste-disposal advice, or official guarantee.

The clean needle exchange service point layer uses the CP950/Big5 `臺北市清潔針具佈點名單115s1.csv` resource:

```bash
npm run data:fetch:clean-needle
npm run data:convert:clean-needle
npm run convert:facilities
```

The source provides service item, service point category, institution code, service location, phone, extension, address, and service hours, but no coordinates. The app keeps these as address-only public health service records with district summary bubbles and address-based map lookup links. It does not claim real-time service status, inventory quantity, medical advice, emergency service, public safety risk, crime hotspots, drug-use behavior inference, neighborhood risk evaluation, or official endorsement.

The protected-tree layer uses the UTF-8-SIG `樹籍資料匯出-202603201657.csv` resource:

```bash
npm run data:fetch:protected-trees
npm run data:convert:protected-trees
npm run convert:facilities
```

The converter preserves tree ID, Chinese species name, scientific name, English name, diameter, circumference, address, latitude, longitude, location type, and management unit. It validates source WGS84 coordinates, parses district/road where practical, flags suspicious size values, and writes `public/data/protected-trees.json` plus `public/data/protected-tree-summary.json`. The app does not treat protected-tree data as real-time tree health, hazard risk, pruning/transplant permit, land ownership, cadastral boundary, maintenance progress, legal advice, or tourism ranking data.

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

The pay.taipei cardless parking layer uses the UTF-8-SIG `pay.taipei支援無卡進出停車場清單_20260211 (1).csv` resource:

```bash
npm run data:fetch:pay-taipei-parking
npm run data:convert:pay-taipei-parking
npm run convert:facilities
```

The converter preserves parking lot ID, operator ID, operator, parking lot name, support status, phone, postal code, address, and note fields. The source has addresses but no official coordinates, so records stay address-only with district summary bubbles and Google Maps lookup links. The app does not claim real-time parking availability, operating status, parking fees, payment success, cardless entry/exit success, exact entrance location, navigation advice, legal parking determination, consumer advice, or official endorsement.

The green-space adoption layer uses the Big5/CP950 `臺北市行道樹公園綠地廣場認養人資料.csv` resource:

```bash
npm run data:fetch:green-space-adoption -- --input /path/to/臺北市行道樹公園綠地廣場認養人資料.csv
npm run data:convert:green-space-adoption
npm run convert:facilities
```

The converter preserves sequence number, management unit, district, district code, adoption target, target attribute, location text, parsed road, and adopter name. The source has location descriptions but no official coordinates, so records stay address-only with district summary bubbles and Google Maps lookup links. The app does not claim land or facility ownership, complete maintenance responsibility, real-time maintenance status, plant health, public safety judgment, facility boundaries, legal advice, official ranking, or official recommendation.

The accessible public off-street parking facility layer uses the Taipei Open Data dataset `08f9bc00-b1e9-4f6e-9199-0da74d8ad930`:

```bash
npm run data:fetch:accessible-public-parking
npm run data:convert:accessible-public-parking
npm run convert:facilities
```

The converter supports UTF-8-SIG, Big5, and CP950, keeps raw accessibility values, parses non-negative space counts, reports duplicate keys, invalid numbers, unknown accessibility values, and invalid coordinates, and writes `public/data/accessible-public-parking-facilities/records.json` plus `summary.json`. The source's observed `TMPX`/`TMPY` values are TWD97/TM2 and are converted to WGS84 at build time. Records without valid coordinates remain searchable in the directory but are not rendered as markers. The module includes overview, map, district, feature, directory, data-quality, and notes views with charts and filters. It does not claim real-time vacancies, current elevator/toilet operation, parking fees, operating hours, complete accessibility certification, or guaranteed accessible-route guidance.

The bulky-waste collection booking module uses the Taipei Open Data dataset `d47fe546-e26e-4079-9eca-73c2d45a8575`:

```bash
npm run data:convert:bulky-waste-collection-booking
```

It reads the CP950/Big5 source fields for district, district code, collection team, phone, service villages, and booking hours into `public/data/bulky-waste-collection-booking/`. It is a directory-only module: the source has no coordinates or complete service-location addresses, so it creates no map markers, geocoding, routes, or service-area boundaries. Booking hours and service villages are source text only; they do not represent real-time acceptance, same-day collection, confirmed collection dates, free service, accepted item types, or urgent-collection guarantees.

The gas/LPG station layer uses the UTF-8-SIG `臺北市加油站及加氣站分布圖.csv` resource:

```bash
npm run data:fetch:gas-lpg-stations
npm run data:convert:gas-lpg-stations
npm run convert:facilities
```

The converter preserves gasoline, LPG, self-service, supplier, phone, business-hour text, and source status fields. It converts TWD97 `ADDR_X` / `ADDR_Y` coordinates to WGS84 for Leaflet markers. Business hours are source text only; the app does not claim current opening status, fuel/LPG availability, prices, or recommendations.

The designated smoking area layer uses the UTF-8-SIG `臺北市指定吸菸區.csv` resource:

```bash
npm run data:fetch:designated-smoking-areas
npm run data:convert:designated-smoking-areas
npm run convert:facilities
```

The converter preserves place name, address, type, listed opening-hour text, relative location, photo URL, managing unit, phone, and note fields. Coordinates are source WGS84 latitude/longitude. This layer is for public-data location lookup only; it does not claim real-time opening status, legal interpretation, health advice, smoking advice, or complete legal smoking boundaries.

The announced no-smoking place layer uses three Taipei Department of Health CSV resources:

- `臺北市公告戶外禁菸場所一覽表(僅包含有明確地址者用於製作禁菸地圖)1140912.csv` - UTF-8-SIG, includes WGS84 `X` / `Y` coordinates.
- `臺北市公告戶外禁菸場所一覽表0912修.csv` - Big5/CP950, includes announcement dates but no coordinates.
- `臺北市除吸菸區外全面禁菸公園綠地_0609修.csv` - Big5/CP950, includes park/green-space names and location descriptions.

```bash
npm run data:fetch:no-smoking
npm run data:convert:no-smoking
npm run convert:facilities
```

This layer complements, but does not replace, designated smoking areas. Point records are source-location references and do not represent complete legal boundaries, real-time enforcement, legal interpretation, health advice, smoking advice, or on-site signage status.

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
public/data/community-recycling-stations.json
public/data/community-recycling-station-summary.json
public/data/clean-needle-exchange-service-points.json
public/data/clean-needle-exchange-service-point-summary.json
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
public/data/green-space-adoption-records/records.json
public/data/green-space-adoption-records/summary.json
public/data/gas-lpg-stations.json
public/data/gas-lpg-station-summary.json
public/data/designated-smoking-areas.json
public/data/designated-smoking-area-summary.json
public/data/announced-no-smoking-places.json
public/data/announced-no-smoking-place-summary.json
public/data/public-amenities-summary.json
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

Public toilets, riverside toilets, family-friendly toilets, recycling-related facilities, clean needle service points, protected trees, green-space adoption records, motorcycle inspection stations, electric motorcycle charging stations, commercial EV charging/battery-swap stations, pay.taipei cardless parking lots, gas/LPG stations, designated smoking areas, and announced no-smoking places remain separate source-specific layers. Equipment counts, award fields, business hours, cleanliness, maintenance, opening status, accepted recyclable items, recycling rules, collection schedules, service availability, clean needle inventory, medical needs, tree health, plant health, hazard/risk status, pruning/transplant permits, land ownership, facility ownership, maintenance responsibility, charger availability, parking availability, parking fees, payment support, entrance precision, fuel/LPG availability, pricing, payment methods, membership requirements, battery inventory, legal boundaries, and public-safety meanings are public-data snapshots rather than real-time guarantees. Verify details with official, operator, venue, managing-unit, service-provider, station, community-management, competent-authority, or on-site notices.

## 中文

### 功能

- 預設使用繁體中文介面，並提供 English 切換；語言選擇會存在 `localStorage`。
- 使用 Leaflet + OpenStreetMap，不需要 Google Maps API key。
- 從 `public/data/facilities.json` 載入本機靜態便利設施資料。
- 支援行人專用清潔箱、狗便袋箱、公廁、河濱廁所、親子友善廁所、飲水設施、限時收受點、舊衣回收箱、社區資源回收站與哺集乳室的設施類型篩選。
- 公共服務站點：機車定檢站、電動機車充電站、營利型電動車充換電站與加油站及加氣站。
- 公共健康、城市自然與環境設施：指定吸菸區、公告禁菸場所、清潔針具服務點與受保護樹木，包含來源欄位、位置參考與必要提醒。
- 公廁圖層包含一般公廁、河濱廁所與親子友善廁所。
- 支援公廁類別、無障礙廁所、親子廁所篩選。
- 支援公共場所飲水機場所類型與開放時間資料篩選。
- 支援限時收受點收受項目／特殊備註，以及直飲臺狀態、縣市、場所類型、維護資訊與照片篩選。
- 支援舊衣回收箱里別、設置團體與電話資料篩選。
- 支援社區資源回收站行政區域代碼、道路名稱、有地址與有道路名稱篩選。
- 支援清潔針具服務點行政區域代碼、設置項目、設置點類別、道路、電話、分機與 24 小時服務篩選。
- 支援受保護樹木樹種、學名、英文名、地理位置類型、管理單位、尺寸類別、座標品質與尺寸資料品質篩選。
- 親子友善設施：哺集乳室，支援開放時間、聯絡方式、位置指引、認證資訊、設備、友善服務與依法設置清單篩選。
- 搜尋涵蓋行政區、地址、路名、位置、備註、公廁名稱、公廁類別、管理單位、飲水機場所名稱、設置地點與開放時間。
- 支援台北市行政區篩選與瀏覽器定位找附近設施。
- 不同設施類型使用 emoji 地圖標記與圖例。
- 大量未篩選結果不會直接渲染所有地圖標記，避免手機地圖過度擁擠。
- 哺集乳室、機車定檢站、電動機車充電站、營利型電動車充換電站、社區資源回收站與清潔針具服務點來源若未提供座標，會以前端清單與行政區彙總泡泡呈現。受保護樹木使用來源提供且通過範圍驗證的經緯度，於縮小範圍後顯示精確標記。
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

社區資源回收站圖層使用 CP950/Big5 的 `臺北市社區資源回收站資訊.csv`：

```bash
npm run data:fetch:community-recycling
npm run data:convert:community-recycling
npm run convert:facilities
```

來源提供回收站名稱、行政區、行政區代碼與地址，但沒有座標。本網站保留為地址型清單資料，以行政區彙總泡泡呈現，Google Maps 連結使用地址查詢。此圖層不代表即時營運狀態、即時開放時間、目前可回收項目、服務可用性、完整回收規定、清運時程、廢棄物處理建議或官方保證。

清潔針具服務點圖層使用 CP950/Big5 的 `臺北市清潔針具佈點名單115s1.csv`：

```bash
npm run data:fetch:clean-needle
npm run data:convert:clean-needle
npm run convert:facilities
```

來源提供設置項目、設置點類別、機構代碼、設置地點、電話、分機、地址與服務時間，但沒有座標。本網站保留為地址型公共衛生服務清單，以行政區彙總泡泡呈現，Google Maps 連結使用地址查詢。此圖層不代表即時服務狀態、庫存數量、醫療建議、急診服務、治安風險、犯罪熱點、用藥行為推論、周邊環境風險評價或官方背書。

受保護樹木圖層使用 UTF-8-SIG 的 `樹籍資料匯出-202603201657.csv`：

```bash
npm run data:fetch:protected-trees
npm run data:convert:protected-trees
npm run convert:facilities
```

轉換程序保留樹木編號、樹種名稱、學名、英文名、胸徑、胸圍、地址、緯度、經度、地理位置名稱與管理單位，並驗證來源 WGS84 座標、解析行政區與道路、標記可疑尺寸資料，輸出 `public/data/protected-trees.json` 與 `public/data/protected-tree-summary.json`。此圖層不代表即時樹木健康、倒塌風險、修剪或移植許可、土地權屬、地籍邊界、維護進度、法律意見或旅遊排名。

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

pay.taipei 無卡進出停車場圖層使用 UTF-8-SIG 的 `pay.taipei支援無卡進出停車場清單_20260211 (1).csv`：

```bash
npm run data:fetch:pay-taipei-parking
npm run data:convert:pay-taipei-parking
npm run convert:facilities
```

轉換程序保留停車場 ID、營運 id、營運單位、對應停車場、支援狀態、電話、郵遞區號、地址與說明。來源沒有官方經緯度，因此以前端清單與行政區彙總呈現，Google Maps 連結使用地址與停車場名稱查詢。本網站不宣稱即時車位數、即時營業狀態、停車費率保證、支付成功保證、無卡進出成功保證、入口位置精確性、導航建議、停車合法性判定、消費建議或官方背書。

加油站及加氣站圖層使用 UTF-8-SIG 的 `臺北市加油站及加氣站分布圖.csv`：

```bash
npm run data:fetch:gas-lpg-stations
npm run data:convert:gas-lpg-stations
npm run convert:facilities
```

轉換程序會保留加油、加氣、自助加油、供油廠商、電話、營業時間來源文字與來源狀態欄位，並將 TWD97 `ADDR_X` / `ADDR_Y` 轉為 WGS84 經緯度供 Leaflet 顯示。營業時間只是來源文字；本網站不宣稱即時營業狀態、油氣供應、價格或推薦程度。

指定吸菸區圖層使用 UTF-8-SIG 的 `臺北市指定吸菸區.csv`：

```bash
npm run data:fetch:designated-smoking-areas
npm run data:convert:designated-smoking-areas
npm run convert:facilities
```

轉換程序會保留地點、地址、樣態、開放時間來源文字、相對位置、照片連結、管理單位、電話與備註欄位。座標為來源 WGS84 經緯度。此圖層僅供公開資料點位查詢，不代表即時開放狀態、法規解釋、健康建議、吸菸建議或完整合法吸菸範圍。

公告禁菸場所圖層使用臺北市政府衛生局的三份 CSV 資源：

- `臺北市公告戶外禁菸場所一覽表(僅包含有明確地址者用於製作禁菸地圖)1140912.csv`：UTF-8-SIG，含 WGS84 `X` / `Y` 座標。
- `臺北市公告戶外禁菸場所一覽表0912修.csv`：Big5/CP950，含公告日期但無座標。
- `臺北市除吸菸區外全面禁菸公園綠地_0609修.csv`：Big5/CP950，含公園綠地名稱與位置描述。

```bash
npm run data:fetch:no-smoking
npm run data:convert:no-smoking
npm run convert:facilities
```

此圖層補充指定吸菸區，但不取代指定吸菸區。點位只是來源位置參考，不代表完整法定邊界、即時執法狀態、法規解釋、健康建議、吸菸建議或現場標示狀態。

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
public/data/community-recycling-stations.json
public/data/community-recycling-station-summary.json
public/data/clean-needle-exchange-service-points.json
public/data/clean-needle-exchange-service-point-summary.json
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
public/data/designated-smoking-areas.json
public/data/designated-smoking-area-summary.json
public/data/announced-no-smoking-places.json
public/data/announced-no-smoking-place-summary.json
public/data/public-amenities-summary.json
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

行人專用清潔箱、狗便袋箱、公廁、飲水設施、限時收受點、直飲臺、舊衣回收箱、社區資源回收站、清潔針具服務點、受保護樹木、機車定檢站、電動機車充電站、營利型電動車充換電站、pay.taipei 無卡進出停車場、加油站及加氣站、指定吸菸區與公告禁菸場所是不同設施或站點。收受項目依備註保守判讀，未知不代表不收受。直飲臺狀態、開放時間、收受項目、社區資源回收站營運狀態、目前可回收項目、清潔針具服務狀態、庫存數量、醫療需求、服務可用性、受保護樹木健康或風險、修剪移植許可、土地權屬、回收規定、清運時程、舊衣回收箱可投遞狀態、機車定檢站服務、充換電站可用狀態、即時車位數、停車費率、支付支援、入口位置、油氣供應、費率、付款方式、會員資格、指定吸菸區與公告禁菸場所之現場標示、法規適用與邊界、水質維護資訊請以現場、社區管理單位、服務單位、業者及主管機關公告為準。
