# 清潔箱資料對帳摘要

報告版本：reconcile-v1-7019c9107744；政策快照：v1-14c24bcdbade。

這是跨版本資料對帳，不是現場盤點或撤除清單。

| 分類 | 關係數 |
|---|---:|
| confirmed_match | 576 |
| probable_match | 42 |
| historical_only | 535 |
| current_only | 22 |
| possible_location_change | 13 |
| ambiguous | 23 |
| different_scope | 130 |
| invalid_source_record | 2 |
| unresolved | 0 |

分類數計算「關係」，不是箱體數；一對多模糊群組可包含多列。每一來源列僅屬於一個關係。

## 統計定義與未解釋差異

- Historical map: 1197 published rows; original resource publication date unknown; generatedAt is transformation time only.
- Current main resource: 681 CSV rows; 679 validated unique coordinates; 1 coordinate duplicate and 1 excluded bin record(s).
- Separate tourist/commercial resource: 130 rows; not automatically additive. 0 rows share a normalized district/address with main resource; overlap does not establish scope or identity.
- All 130 supplemental remarks use an integer 處 count (sum 940 處). Named-place rows are not individual-bin inventory; do not substitute the sum for groups, bins or current main-resource rows.
- The 2026-08-10 announcement reports groups and physical bins, not CSV rows or validated map positions; dates and units are not interchangeable.
- Classification counts are relationships, not inventory totals; ambiguous components can contain multiple rows. Source record counts remain separate.

confirmed_match 表示來源身分／地址及座標證據一致，不等於營運確認；probable_match 仍需人工確認。historical_only 不代表撤除、current_only 不代表新增。possible_location_change 只有地址相同而位置差異的線索，不能證實搬遷。ambiguous 不強制配對。different_scope 不加入主清單。

## 方法

- verified namespaced official ID if present
- normalized address AND source district; unique pairs only
- exact/proximate coordinates provide review leads only without identity evidence
- no operational removal/addition inference
- separate tourist/commercial scope: no additive inventory assumption

近鄰線索半徑 25 公尺；同址疑似位置變動門檻 50 公尺。來源沒有經驗證的穩定 ID；本地列號只供稽核，不用來判定跨版本身分。地址僅正規化 Unicode 全半形、臺／台、空白及括號逗號；保留 -、/、# 等可能影響門牌的符號。

## 待主管機關確認

- 1,197 列歷史清單的原始資源版本、盤點基準日與範圍為何？可否提供具有穩定設施 ID 的歷史版本？
- 681 列清單的一列代表地址、組、座、箱體或有效設施嗎？同址不同座是否應保留？
- 806 組／1,612 座（2026-08-10）與 2026-09-30 CSV 的口徑與生效日期如何對照？有無可公開的逐筆交叉表？
- 景點商圈周邊 130 列各備註 n處，合計 940 處；一列與一處的定義、座標代表位置為何？是主清單子集、增補或不同盤點範圍？能否提供逐處清單與穩定設施 ID？
- 無法配對的歷史列是否仍在營運、搬遷、重複或未收錄？請提供正式異動紀錄，勿僅依清單差額推定撤除。
- 地址相同但座標偏移、座標相同但地址不同，以及無效座標的列，正確資料與座標精度為何？

## 來源

- historical-map: 1197 列；來源更新 unknown；擷取 unknown；SHA256 6c976786b19811d5b471c7a32f825754b7b07ce474d81f6845c4a2862ad9421b
- bins: 681 列；來源更新 2026-09-30T15:55:35+08:00；擷取 2026-10-15T03:33:50.414Z；SHA256 ff3cf5528c057958f89871aa5300fc633b02d0f7b37131ab29d5ddc2f8e2370d
- bins-tourist-commercial: 130 列；來源更新 2026-08-18T16:27:22+08:00；擷取 2026-10-15T06:20:36.169Z；SHA256 47b1ddfb4f0ab4d5e57afab538f71da3d41d22e59c984bdd9c10b4248223b066

公告彙總：2026-08-10，806 組／1612 座（https://www.tldep.gov.taipei/Public/News/TpeDep_Detail.aspx?SN=9686320）。僅保存公開統計聲明，不與逐筆列數相加或互相換算。
