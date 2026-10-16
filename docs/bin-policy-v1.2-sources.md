# v1.2 政策參考資料：來源稽核與可重現性

本資料是**待審查的研究快照**，不是經主管機關核定的設置資料。`priority-references.json` 與原有 `analysis.json` 分開；後者的清潔箱與 2021 公車參考位置完全不變。所有 POI 都只是服務涵蓋參考，不表示人流、垃圾量、公共土地或可合法設置清潔箱的位置。

## 本次實際取得與排除

稽核日期：2026-10-15。研究快照：`priority-v1-113edf6ed5e09ada`。每個原始檔的完整 SHA256、官方資源 ID、擷取與驗證時間，保存在該版本 `sources.json`；資源發布日期、擷取日期與驗證日期分開。未知發布日期保留 `null`，不拿 HTTP 日期代替。

| 類別 | 官方資料與實際結構 | 原始／納入 | 處理與限制 |
| --- | --- | --- | --- |
| 觀光景點 | [臺北旅遊網 API](https://travel.taipei/open-api/swagger/ui/index)，`/{lang}/Attractions/All`；目標語系 `zh-tw` | 未取得／0 | API 與 Swagger JSON 回傳 HTTP 403 Cloudflare；`www` 主機亦同。保存回應原文、狀態、時間與雜湊，不繞過防護、不使用搜尋摘要補點。標示「無法取得」，不是沒有觀光需求。 |
| 夜市／攤販集中場 | [臨時攤販集中場](https://data.taipei/dataset/detail?id=c013d9ec-a550-46bd-ac60-45f085930706)，CSV `seqno/stitle/xbody/xAddress/GTag_longitude/GTag_latitude` | 47／42 | 官方座標為度分秒，嚴格解析。資料沒有獨立夜市營業分類，因此本類表示已列管攤販集中場，不宣稱每處都是夜市。營業日期與時間只保留背景資訊。 |
| 傳統市場 | [市商場基本資料](https://data.taipei/dataset/detail?id=89bebb3a-990d-4070-bd67-631a575f6d4a)，CSV，十進位經緯度 | 47／47 | 保留官方名稱、地址、識別與原欄位；市場內部參考點不代表人行道可設置點。各市場實際使用強度未知。 |
| 商圈介紹 | [商圈介紹](https://data.taipei/dataset/detail?id=52da1174-0d77-434b-88c3-e77b008e8624)，CSV，描述性位置 | 65／0 | 無可靠商圈點位或範圍，僅作背景資料。不可自創中心點或從行政區推估座標。 |
| 商圈公會 | [商圈公會通訊錄](https://data.taipei/dataset/detail?id=89f53365-ea7b-4132-b702-27b26a575b3b)，CSV，聯絡地址與部分座標 | 170／0 | 通訊／辦公座標不是商圈幾何，235 筆商圈背景資料與排除理由完整保留，不納入分數。 |
| 捷運 | [捷運系統車站點位圖](https://data.taipei/dataset/detail?id=758e5ae0-e6ee-448b-81f5-316eb68a5ba7)，GeoJSON `FeatureCollection`，宣告 `EPSG:3826`，Point，`FID CODE/NAME/LOC` | 124／73 | 48 筆位於臺北市外或無唯一行政區，3 筆是已核對轉乘站重複表示。使用既有 TWD97 TM2→WGS84 轉換，不把公尺當經緯度。車站中心不是出入口。 |
| 公車 | 已核准 v1.0/v1.1 公車 GIS | 3,407／3,395 | 原快照、來源日期與雜湊不變；未採用較新 StopLocation 比較資料。 |

資源發布日期：攤販 2025-08-26、市場 2026-09-04、商圈介紹 2025-06-17、商圈公會 2025-08-08、捷運 2026-10-13。捷運詮釋資料的收錄期間截止 2026-08-30；近期檔案更新不保證每站幾何都在當日實測。API 清單的語系／端點可由官方 Swagger 頁查得，但實際授權語系列舉、分類詳細 schema 與最新景點資料本次因 403 無法驗證，不作已完整稽核的宣稱。

## 明確的實體與別名政策

- 原始資料保存在版本目錄，不做破壞性清洗。納入紀錄有來源 ID、原始識別、來源版本、類別、WGS84 經緯度、行政區、點位精度、發布／擷取／驗證日期、雜湊、限制及原欄位。
- 行政區使用已稽核的官方行政區面資料逐點判斷；無唯一行政區者排除，不從名稱猜測。
- 獨立地點不因「很近」就合併。攤販別名僅在官方基礎名稱、完全相同座標與完全相同地址範圍一致時合併營業日／組織表示；本次為 `29→28`、`38/39/40→37`、`42→41`，原列留在品質排除證據。
- 捷運只使用人工核對的官方 ID 對：`109→17` 中山、`103→68` 南京復興、`104→91` 松江南京。官方名稱與 `LOC` 同一交叉口、分線表示可供核查；採原主紀錄座標，不平均或創造新點。原別名完整保留。若配對名稱改變，ETL 直接拒絕。未核對站名不會自動按字串或距離合併。
- 跨類別只有明確證據共用 `canonicalId` 才採主類別順序 `tourism > night_market > traditional_market > commercial > mrt > bus`；來源各自的不同 POI 不以相鄰當作同一實體。以後若觀光 API 恢復，須獨立核對跨來源別名，不可把同名誤當同一設施。
- 公車 source version 是既有 `bus.sha256`，不是新 StopLocation 資料版本；研究 JSON 同時包含 `baseSnapshotId` 與 `busSourceVersion`，避免不知情混用。

## 原始檔與重現

```powershell
# 只擷取到新的研究原始版本，不更新任何正式分析。
npx tsx scripts/fetchPolicyPrioritySources.ts

# 明確指定本次版本與已稽核行政區檔，不使用「最新目錄」猜測。
npx tsx scripts/convertPolicyPrioritySources.ts data/raw/bin-policy-priority/priority-v1-113edf6ed5e09ada data/raw/bin-policy/v1-14c24bcdbade/districts.zip

npx vitest run scripts/policyPrioritySources.test.ts scripts/policyPriorityMarketSources.test.ts
```

擷取先放入程序獨立 staging 目錄；成功後才更名為內容定址版本。失敗不覆蓋原版本。轉換驗證每份原始檔 SHA256、資源識別、投影、行政區與原始版本，產出獨立的 `public/data/bin-policy/priority-references.json` 及 `priority-source-inventory.json`。`approvalStatus: review_required` 不會因 ETL 或測試成功變成正式核准。

目前 adapter 假設總筆數欄位為 `Total`，但尚未取得實際 API 回應驗證；恢復授權存取後須先核對真實欄位、座標與分類，再確認完整分頁，不同頁總數變動、重複 ID、提前空頁或超過安全上限都拒絕，不接受部分景點母體。目前 API 處於受阻狀態；分頁、座標與分類 adapter 的合成測試僅證明驗證行為，不表示官方 API 這次取得成功。

研究原始版本中的市場資料夾另有四來源 manifest；版本中的全來源 manifest 是治理稽核的主入口。監測只報告變更或取得失敗；未經明確審查不得覆寫 `analysis.json` 或把資料視為政府已核准的選址資料。

## 解讀與後續查核

缺少觀光與商圈幾何時，這兩類別必須顯示不可用，不將權重轉給公車／捷運。47 個市場或 73 個車站數不是使用人數；42 個攤販參考點也不是夜間人流調查。小樣本與地理涵蓋不完整會使排序敏感，應看類別分母、各類增量及 ±25% 權重敏感度，再規劃現勘。

正式使用前需確認 API 存取、商圈公共空間與範圍、跨資料來源實體別名、公共通行權、無障礙與維護條件。這些未知不得轉成精確設置主張。

原始資料以 `.gitattributes` 的 `-text` 保留原位元組，不讓 Git 換行轉換破壞 SHA256；已核對 Git 內六個來源物件皆與 manifest 相符。來源的 `validatedAt` 表示封存檢查事件；`analysisValidatedAt` 另記實際完成研究快照空間／契約驗證的時間，納入實體也保留該次驗證時間。區界 ZIP 必須與核准基線雜湊一致，並列入衍生來源沿革。
