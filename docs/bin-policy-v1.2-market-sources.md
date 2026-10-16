# v1.2 市場、攤販集中場與商圈資料查核

查核日期：2026-10-15。原始檔保存在 `data/raw/bin-policy-priority/markets/markets-dda160fd187e17b6/`，各檔完整 SHA256、資源識別碼、下載網址及抓取／結構驗證時間見同目錄 `sources.json`。取得及轉換成功不構成政府審查或正式資料採用；空間來源為 `review_required`，商圈來源為 `context_only`。

## 實際來源與可用範圍

| 來源 | 原始列數 | 空間參考實體 | 檔案更新時間（臺北） | 判斷 |
| --- | ---: | ---: | --- | --- |
| [臺北市臨時攤販集中場](https://data.taipei/dataset/detail?id=c013d9ec-a550-46bd-ac60-45f085930706) | 47 | 42 | 2025-08-26 15:58:47 | 納入「已驗證夜市／攤販集中場」類別中的**攤販集中場**，不宣稱所有紀錄均為夜市 |
| [臺北市市商場基本資料](https://data.taipei/dataset/detail?id=89bebb3a-990d-4070-bd67-631a575f6d4a) | 47 | 47 | 2026-09-04 11:01:23 | 官方市場參考點；不是同強度需求或可設置位置 |
| [臺北市商圈介紹](https://data.taipei/dataset/detail?id=52da1174-0d77-434b-88c3-e77b008e8624) | 65 | 0 | 2025-06-17 15:11:51 | 只有描述性坐落位置，無可驗證座標／邊界；保留背景資料 |
| [商圈公會通訊錄](https://data.taipei/dataset/detail?id=89f53365-ea7b-4132-b702-27b26a575b3b) | 170 | 0 | 2025-08-08 11:36:54 | 座標對應**商圈通訊地址**，不能當作商圈中心／服務邊界；全部保留背景資料 |

前兩項提供機關為臺北市政府產業發展局市場處，後兩項為商業處。來源頁標示公開、免費，連結[政府資料開放授權條款](https://data.gov.tw/license)。資料頁詮釋資料更新時間、檔案資源更新時間、抓取時間與驗證時間不是同一件事；本次表格使用檔案資源更新時間。來源版本由內容雜湊識別，不以抓取當日冒充資料發布當日。

## 實際欄位與座標

- 攤販集中場：`seqno, stitle, xbody, xcreatedDate, xstartTime, xendTime, xAddress, GTag_longitude, GTag_latitude`。`stitle` 是行政區簡稱，`xbody` 是場域名稱，`xAddress` 是文字範圍。CP950 CSV；經緯度實際是度分秒，例如 `121°29'29.7`、`25°01'37.7`，不是可直接 `Number()` 的十進位數字。嚴格解析度分秒，分鐘與秒需小於 60；缺漏、錯誤格式不猜測修復。
- 傳統市場：`seqno, stitle, xbody, xcreatedDate, xAddress, GTag_longitude, GTag_latitude`。UTF-8；`stitle` 是名稱、`xbody` 是介紹，經緯度為十進位。`xcreatedDate` 是原紀錄建立日期，不作為目前座標更新日期。
- 商圈介紹：`SeqNo, 商圈, 區, AreaCode, 標籤, 組織名稱, 坐落位置, 鄰近捷運, 商圈類型, 說明`。UTF-8；沒有幾何資料，不從捷運站或行政區推算中心。
- 商圈通訊錄：`分區, 商圈名稱, 組織或里辦公處, 組織代表, 職稱, 聯絡電話, 傳真, 商圈通訊地址, Longitude, Latitude`。UTF-8；即使數值座標有效也不作空間配置輸入。通訊錄中的多位聯絡人並不代表多個商圈。

所有可用市場點位均以現有凍結官方行政區多邊形進行精確點內判斷，而非以來源行政區文字猜測位置。這 89 個去重實體均落在臺北市單一行政區內。官方座標僅作經緯度參考，不代表道路入口、可及性、路側或箱體安裝精度。

## 實體與別名規則

`seqno` 可保留本版本原始紀錄身分，但沒有官方證據保證跨版本序號永久不變。沒有序號時使用整列內容 SHA256 作版本內識別，不宣稱跨版穩定。每一筆保留原欄位與來源版本、雜湊及時間。

攤販資料包含同場域不同營業日／管理協會列。只有名稱（去除尾端括號內協會）、**完全相同座標與完全相同文字範圍**同時成立才視為同一空間實體；不是以鄰近距離合併。被排除的營業列保留原始欄位、canonical ID 與理由：

- `29 → 28`：雙城街同一範圍，日／夜營業列。
- `38、39、40 → 37`：建國假日玉市同一範圍與座標，兩協會及週六／週日列。
- `42 → 41`：建國假日藝文特區週六／週日列。

因此 47 列轉為 42 個實體，5 個操作別名不另計覆蓋分母。名稱不同、範圍不同或座標不同的地點不因相近而合併。原始營業日／時間仍保存在原始檔與別名證據中，不轉為人流或營運強度權重。`xcreatedDate` 中的「日」「夜」可作營業背景，並不提供整份資料一致的夜市分類體系。

## 商圈缺口與政策解讀

商圈空間類別為 **unavailable**，不是沒有商圈、零需求或零政策重要性。65 筆介紹與 170 筆通訊紀錄均保留為背景與排除證據。後續需要主管機關認可的商圈邊界、位置定義及其精度；不能自動地址地理編碼、拿會址補位，或把鄰近捷運站當成商圈代表點。缺少商圈資料時不將其權重重分配給其他類別。

市場、攤販點可以構成政策覆蓋參考，不直接成為合格安裝候選。建物內部、公私土地、通行條件、營業時段及違規棄置風險均待現勘；資料列數不是使用人數，也不是垃圾量。

## 重現與回歸

`acquireMarketSources(outputDirectory)` 僅取得並建立內容定址的原始審查快照；不修改正式 `analysis.json` 或核准狀態。`convertMarketSources(rawDirectory, sourceEntries, locateDistrict)` 驗證來源 ID／resource ID／檔名／SHA256／欄位，將不同來源的背景與排除列明確分離；`locateDistrict` 參數順序為經度、緯度，沿用現有 GIS 實作。

獨立驗證：

```sh
npx vitest run scripts/policyPriorityMarketSources.test.ts
npx tsc -p tsconfig.node.json --noEmit
```

涵蓋度分秒、十進位、無效座標、CSV 結構、實際凍結來源的 42／47 分母、5 別名、235 背景列、商圈不可用、雜湊及路徑身分拒絕。資料來源變動後不應只修改測試期望數；必須先檢視原始差異、別名與空間語義，再經來源審查流程採用新版本。

### English summary

The official vendor CSV has 47 operating rows, representing 42 deduplicated physical references; degree/minute/second coordinates are parsed explicitly. The traditional-market source supplies 47 decimal-coordinate references. All 235 commercial introduction/association records remain contextual: textual locations and association mailing coordinates do not define commercial district geometry. Commercial coverage is unavailable, not zero demand. Original bytes, SHA256, separate publication/retrieval/validation dates, raw attributes and alias exclusions remain reproducible. No spatial source is automatically government-approved and no address is geocoded.
