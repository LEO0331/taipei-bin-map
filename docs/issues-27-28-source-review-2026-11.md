# November source review: Taipei Travel retirement and Issues #27/#28

Reviewed **2026-11-11 (Asia/Taipei)** from `main` at `958fdb38cfb8e22e1f4b9987e9e0941ae2e54775`. The difference from the brief's `0345c725` is the Civic Explorer header-placement follow-up, not a policy-data change.

| Scope | Decision |
| --- | --- |
| Taipei Travel | Retire active acquisition, monitoring, category and weight; preserve historical evidence |
| [Issue #27: vendor concentrations](https://github.com/LEO0331/taipei-bin-map/issues/27) | **HOLD — DATA QUALITY OR PROVENANCE** |
| [Issue #28: bin inventory](https://github.com/LEO0331/taipei-bin-map/issues/28) | **HOLD — NOT APPROVED FOR BASELINE REPLACEMENT** |
| Mode A | Approved `v1-14c24bcdbade`, 679 deduplicated bins and 3,395 historical bus references unchanged |
| Mode B | Proposed retirement-only v2 on the same frozen non-tourism inputs, `review_required` |
| Deployment | No merge, deployment or automatic issue closure; human review still required |

## Retirement-only research version

The current workflow and acquisition registry no longer request Taipei Travel. The browser loads `priority-references-v2.json` only when Mode B opens; it rejects a v1 sidecar in that slot. The v2 source-health view identifies intentional retirement, not a new outage or zero tourism demand. No replacement POIs or weight redistribution were introduced. The four available reference categories and unavailable commercial geometry retain their previous meanings.

| Identity | Historical replay | Proposed active research |
| --- | --- | --- |
| Snapshot | `priority-v1-113edf6ed5e09ada` | `priority-v2-541148442bec70ac` |
| Method | `policy-balanced-coverage-v1` | `policy-balanced-coverage-v2` |
| Weights | `policy-priority-weights-v1`, 4/4/3/3/2/1 | `policy-priority-weights-v2`, vendor/market/commercial/MRT/bus **4/3/3/2/1** |
| References | 0 tourism; 42 / 47 / 0 / 73 / 3,395 remaining | 42 / 47 / 0 / 73 / 3,395 |
| Reference JSON SHA256 | `ed3d3ca35c2e7075422a16e909465b738157408031968dddee366230516487d0` | `30679c0bc3ec149198725255058a85ec9224b26652673d5be3bb218fca4f89f2` |

The active manifest (SHA256 `c781fcba0e2f7cb7882a07c8da99034bb1f65c73d1dfb47fc07e5d78165bff84`) was staged offline from the reviewed v1 bytes, retaining each non-Travel source ID, hash, official date and retrieval history. The separate v1 raw archive, blocked HTML, v1 static files, and historical research/monitor reports remain unchanged. V1 offline normalization and numerical replay are still supported; live monitoring does not contact Travel even for a legacy manifest. The separate 130-row tourist/commercial **bin reconciliation** source is not Taipei Travel and remains unchanged.

[Retirement replay evidence](../reports/issues-27-28-2026-11/retirement-replay.json) compares citywide and all 12 districts with 300 m radius, at most five selections, 0 m separation, bus+MRT candidates and no cost/budget constraint. For every sensitivity scenario, eligible reference identities, covered IDs, denominators, candidate counts, selected IDs/order, incremental coverage and scores were identical after excluding the retired empty category and version/validation-event differences. Citywide: 3,557 references, 3,468 candidates, baseline 1,211, post 1,284, gain 73, score 1.3970246734. JSON/CSV identify the v2 method, weights and source version and omit tourism from scored categories. This is equivalence for the tested frozen inputs and settings, not a new assessment of tourism demand.

The [read-only v2 monitor run](../reports/issues-27-28-2026-11/retirement-monitor/summary.md) returned `change_detected` (exit 0): five HTTP200 responses, only the vendor hash changed, and no Travel request. Its three stale-date warnings reflect frozen resource metadata, not dates re-read from the live catalogue.

## Issue #27 — vendor revision

The [official catalogue](https://data.taipei/dataset/detail?id=c013d9ec-a550-46bd-ac60-45f085930706) identifies publisher **產業局市場處**, dataset `c013d9ec-a550-46bd-ac60-45f085930706`, [CSV resource `4874f750-b972-4c42-ad76-986960670c70`](https://data.taipei/api/frontstage/tpeod/dataset/resource.download?rid=4874f750-b972-4c42-ad76-986960670c70). The captured 4,459-byte payload is HTTP200, `text/csv` with BIG-5 charset, and decodes with the existing CP950 adapter. [Raw capture receipt](../reports/issues-27-28-2026-11/vendor/source.json) records original byte identities and actual retrieval at **2026-11-11T05:38:50.2430275Z**.

- Frozen vendor SHA256 verified against the old file and manifest: `d45216082540afcbb5e059af51ea00aa85d028478dd3f81aaafb18d309545e45`. The brief's `…dd3d81…` was a transcription error. The frozen official date stays 2025-08-26 15:58:47 +08:00.
- Current CSV SHA256: `0e6da1861b242dbf1e4a6e6888d0b862b70c469a49e15ae4b298beb7ca87090c`, exactly matching the [November 9 monitor](https://github.com/LEO0331/taipei-bin-map/actions/runs/42583311574). The newly inspected catalogue gives **2026-11-03 14:26:21 +08:00** for the resource and **14:26:39 +08:00** for metadata. Those are distinct from retrieval and review. The monitor's displayed 2025 date was frozen metadata, not a fresh portal reading.
- Both versions have **47 parsed records** with the same ordered nine fields (`seqno, stitle, xbody, xcreatedDate, xstartTime, xendTime, xAddress, GTag_longitude, GTag_latitude`), CRLF and no BOM. The change is not just formatting: 35 supported pairs comprise 12 exact, 21 sequence-only and two name edits (also resequenced); 4 old-only and 8 revised-only rows; four ambiguous groups contain 8 old and 4 revised rows. No supported-pair coordinate edit or order inversion was found. One co-located 臨江街／臨江街日市 crosswalk remains unresolved. Source sequence numbers are not permanent facility IDs.
- Existing DMS parsing and district validation admit **42→39** vendor entities at **42→38** distinct coordinates. Four old positions are absent from the revised valid set; there is no new position. The revised 臨江街日市 entity shares the 臨江街 coordinate; co-location alone does not establish identity. Exclusions increase **5→8**: previously five schedule aliases, now one alias, five invalid DMS values (IDs 8/19/33/34/47), and two out-of-envelope coordinates (23/43). No coordinate was repaired or geocoded. Admitted district counts change in 萬華 8→7, 中正 4→3, 中山 8→6, and 大安 4→5. No unmatched row is treated as a business opening or closure.

The [vendor replay](../reports/issues-27-28-2026-11/vendor/review.json) substitutes **only** vendor references in memory under v2 with the same parameters as the retirement replay. Citywide candidate count remains 3,468; reference count falls 3,557→3,554, baseline coverage 1,211→1,209 and post-selection coverage 1,284→1,282. Incremental raw coverage remains 73 while the weighted score changes 1.3970246734→1.509019062, in part because the fixed vendor denominator falls 42→39. Vendor coverage is 16/42→14/39 at baseline and 26/42→25/39 after selection. The default top five changes from `1833,6651,1210,1000548,1000126` to `1833,6651,4865,1210,1000548` (all `bus-` IDs). Default order changes in 中山 and 萬華, with additional district sensitivity changes in 中正 and 大安. These are source-version effects in a model, not measured waste-service outcomes.

**HOLD — DATA QUALITY OR PROVENANCE.** Keep the frozen 42 references. Request authoritative coordinate and identity clarification and review the ranking changes before any separate adoption proposal. The revised CSV is archived only as review evidence.

## Issue #28 — approved bin baseline retained

The [official bin resource](https://data.taipei/dataset/detail?id=a835f3ba-7f50-4b0d-91a6-9df128632d1c), ID `267d550f-c6ec-46e0-b8af-fd5a464eb098`, still returns the 61,369-byte audited revision, SHA256 `a5dc928c93b99794d31eaf513bc4f82a953937488aece61d004ed0ee5faf91d1`. The [November receipt](../reports/issues-27-28-2026-11/bin/recheck.json) confirms the retrieval and the unchanged October 21 official dates. The isolated replay reproduced the October findings SHA `5fbf2b5d7249cd78df6fc1664bfd3f22d8e312a8e870293c56fe29bfea555921` and row evidence byte-for-byte. See the [October technical review](issues-22-23-technical-review.md) for complete reconciliation and scenario results.

**HOLD — NOT APPROVED FOR BASELINE REPLACEMENT.** Two invalid coordinates, 65 old-only / 45 revised-only rows, ambiguous identities and nine changed district top-five sequences still require authoritative review. 681→661 rows does not mean 20 physical bins were removed. Approved raw CSV SHA256 `ff3cf5528c057958f89871aa5300fc633b02d0f7b37131ab29d5ddc2f8e2370d` and Mode A `analysis.json` SHA256 `9c5cb3b8890e7395cc15d7c85de11ec2a228d3a4288cff629f250fda99e3f12f` remain unchanged. Mode B remains bound to that baseline and its approved bus version.

## Reproduction and interpretation

```powershell
npx tsx scripts/reviewPriorityRetirement.ts
npx tsx scripts/reviewVendorRevision.ts
npm run data:convert:policy-priority -- data/raw/bin-policy-priority/priority-v2-541148442bec70ac data/raw/bin-policy/v1-14c24bcdbade/districts.zip test-results/new-priority-v2-candidate
```

These replay the frozen evidence without fetching the retired provider or adopting source changes. The bin replay command and hash convention are documented in the October review; use an isolated copy of its report path. Official publication/resource dates, catalogue metadata dates, retrieval, validation and technical review are separate events. No production publication date is assigned by this review. The model measures reference coverage, not demand, site legality or policy effectiveness.

### Verification

- Untouched baseline: `npm ci`, 518 unit tests, production build and 228 desktop/mobile browser cases passed.
- Updated branch: `npm test -- --maxWorkers=2` passed 527 tests; `npm run build` passed; v2 acquisition, integrity, monitor, market-adapter, weighting, exports and replay checks ran. The focused source/governance/market suite passed 65 tests.
- Full `npm run test:e2e -- --workers=2`: 229/230 passed. An unrelated desktop Shade Equity case hit Chromium `ERR_NO_BUFFER_SPACE` on localhost `/@react-refresh` before the app loaded; the unchanged case passed two isolated repeats. Thus every case passed across runs, not in a single invocation. The five-weight controls, source-health copy, versioned exports and viewport checks ran on desktop/mobile Chromium in both languages. `npm run test:policy-preview` passed all four offline cases.
- The approved analysis, Mode A kernel, bus and bin inputs, separate reconciliation source, v1 research archives/sidecars and historic reports had no diff from main. `git diff --check` passed with the new byte-identical CSV copies treated as binary evidence.

## 繁體中文摘要

臺北旅遊網退出現行模式 B，不再抓取、重試或監測；移除觀光權重且不轉配，也不把觀光需求當零。歷史 v1 原檔與報告均保留；新版沿用原封存的非觀光來源，全市與十二區以相同情境重跑，覆蓋、分數與候選排序不變。商圈仍缺可用幾何，不以背景資料補點。

#27 官方攤販集中場 CSV 雜湊與十一月告警一致；47 列不變，但可納入位置由 42 減為 39，有無效度分秒及超出範圍的座標，且候選排序有變。先保留原 42 點，待主管機關釐清座標與紀錄對應再另案審查。#28 官方清潔箱修訂檔仍與十月稽核版同雜湊，重跑證據一致；無效座標、無法對應的列及行政區排序差異尚未解決，**不核准替換基線**。模式 A、原公車與獨立 130 筆對帳來源均未更動，沒有發布或政府核准。
