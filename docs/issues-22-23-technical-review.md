# Technical review — Issues #22 and #23

Reviewed **2026-10-29 (Asia/Taipei)** on `codex/audit-issues-22-23`, based on main `f037677`. References: [Issue #22](https://github.com/LEO0331/taipei-bin-map/issues/22), [Issue #23](https://github.com/LEO0331/taipei-bin-map/issues/23), [October 26 workflow](https://github.com/LEO0331/taipei-bin-map/actions/runs/40279402599).

## 繁體中文摘要與建議

- **#23：另開發布審查，先調查資料品質。** 10/29 官方下載檔與 10/26 告警的 SHA256 完全相同，已取得可核對的實際版本。原始列數 681→661，但不是單純刪除20筆：有65筆舊列、45筆新列無可支持的對應，另有修改、無效及歧義紀錄；不能說撤掉20個實體垃圾桶。
- 新檔有兩筆無效座標，未猜測修正；有效去重位置 679→657。相同方法與參數下，全市既有覆蓋參考點 1,137→1,109，新增5點後 1,224→1,199；12區中9區的前五名序列改變。這是輸入版本敏感度，不是服務需求或政策成效。
- **#22：不改監測／去重程式。** 觀光403仍是明確不可用警告；其他五個來源200、雜湊未變。過舊來源與商圈幾何缺漏仍須追查，不能以重下載日當發布日，也不能把缺資料當零需求。
- 核准資料、原始封存、演算法、權重及發布門檻均未更動；此 PR 不發布資料、不關閉 issue、不自動合併。

## 1. Evidence and version binding

Both alerts came from the same run; all four monitoring/alert jobs succeeded. Reports describe data-review conditions, not a failed dashboard build. The original artifact ZIPs and their SHA256 receipts are retained in [historical evidence](../reports/audit-issues-22-23-2026-10-29/historical/artifacts.json), including the original JSON/Markdown reports. Artifacts contained **reports, not the changed CSV**; the historical CSV revision was reobtained by exact SHA equality from the current official endpoint, not inferred from matching row counts.

| Bin-source fact | Approved input | Separately archived revision |
| --- | --- | --- |
| Snapshot | `v1-14c24bcdbade` | `v1-7bd6cc864b64` — audit only, not adopted |
| Raw / valid unique positions | 681 / 679 | 661 / 657 |
| Resource update | 2026-09-30 15:55:35 +08:00 | 2026-10-21 15:41:01 +08:00 |
| Dataset-metadata update | 2026-09-30 15:55:47 +08:00 | 2026-10-21 15:41:29 +08:00 |
| Actual retrieval | 2026-10-15T03:33:50.414Z | 2026-10-29T05:44:25.187Z |
| Validation | Existing approved contract | New isolated import/reconciliation; execution time in `analysis/review.json` |

Both versions use [the same official dataset](https://data.taipei/dataset/detail?id=a835f3ba-7f50-4b0d-91a6-9df128632d1c), provider **臺北市政府環境保護局**, resource `267d550f-c6ec-46e0-b8af-fd5a464eb098`. The current catalogue confirms CSV / Big5. Existing CP950 decoding accepts both versions with exactly `行政區、地址、經度、緯度、備註`; no required-schema drift was found.

```text
Approved CSV SHA256: ff3cf5528c057958f89871aa5300fc633b02d0f7b37131ab29d5ddc2f8e2370d
Revision CSV SHA256: a5dc928c93b99794d31eaf513bc4f82a953937488aece61d004ed0ee5faf91d1
```

The revision is **61,369 original bytes**; its hash equals October 26's `current_hash`, while the approved hash equals that report's `previous_hash`. The frozen capture, catalogue HTML/hash, resource fields and distinct dates are in [source evidence](../reports/audit-issues-22-23-2026-10-29/bin-revision/source.json) and [catalogue summary](../reports/audit-issues-22-23-2026-10-29/bin-revision/catalogue-summary.json). Publication/update timestamps do not establish when physical facilities changed. No blocked download or missing-byte substitution occurred for this bin revision.

## 2. Record comparison — not a removal census

The audit reuses `reconcileBinRecords`: unique address/district correspondence, existing coordinate checks, 25m proximity leads and 50m location-change threshold; there are no stable official bin IDs. Ambiguous groups are not greedily paired. [Detailed relationships](../reports/audit-issues-22-23-2026-10-29/bin-revision/analysis/review.json) and [decoded row evidence](../reports/audit-issues-22-23-2026-10-29/bin-revision/analysis/record-evidence.json) preserve source-line identities.

| Result | Old rows | New rows | Meaning |
| --- | ---: | ---: | --- |
| Supported one-to-one pairs | 601 | 601 | 598 confirmed / 3 probable relationships under existing rules, not authoritative facility IDs |
| — unchanged within those pairs | 597 | 597 | Parsed field values unchanged |
| — modified within those pairs | 4 | 4 | Three coordinate edits (about27.53m,0.50m,9.96m), one fullwidth-digit address-format change; not four verified moves |
| No supported counterpart | 65 | 45 | Old-only / new-only CSV rows, not confirmed removals/additions |
| Ambiguous | 14 | 13 | Ten relationship groups; not ten rows |
| Invalid coordinates | 1 | 2 | Outside identity matching; not automatically repaired |

The top-level partition balances `681 = 601+65+14+1` and `661 = 601+45+13+2`; the two indented rows are subsets, not additional totals. Separately, exact **parsed-row multiset** overlap is602, including rows whose identities remain ambiguous; that is not602 confirmed facility matches or byte-level record identity.

New invalid records are source line136 (大同區: longitude `121.513.652`) and line242 (中正區: longitude `25.042533`, latitude `121.51636`, reversed axes). No decimal deletion, axis swapping, geocoding or operational-status inference was applied. Coordinate duplicates increase1→2; invalid exclusions1→2 explain why valid unique positions fall by22 rather than20.

**Recommendation:** separate publication review, preceded by agency confirmation of these coordinates and investigation of unmatched/ambiguous identities. The2.94% raw-count decrease passes the existing broad count-anomaly threshold, but that threshold is not a completeness or adoption approval. No current snapshot is ready for automatic replacement.

## 3. Same-method decision sensitivity

Unchanged `greedy-equal-reference-coverage-v1` / `allocateBins`; **300m straight-line radius, at most5 additions, separation0m, no cost/budget**. The same3,395 historical bus references, boundary archive and cross-district bin handling are used before/after. Only the separately validated bin input changes.

| Citywide measure — reference locations, not people | Approved | Revision | Difference |
| --- | ---: | ---: | ---: |
| Baseline covered | 1,137 | 1,109 | −28 |
| Covered after five selected anchors | 1,224 | 1,199 | −25 |
| Incremental model coverage | 87 | 90 | +3 |

The incremental increase is **not** an improvement in overall service or intervention effectiveness; post-selection coverage is lower. Original selected order: `1814,7220,4602,1000032,1001331` (all `bus-` IDs). Revised: `964,7220,6663,4602,1000032`. Three anchors remain; `4602` moves3→4 and `1000032`4→5. Previously unselected anchors are not assigned a fabricated old rank.

| District | Valid unique positions old→new | Baseline covered references old→new |
| --- | --- | --- |
| 中山區 | 50→48 | 117→119 |
| 中正區 | 87→87 | 135→140 |
| 信義區 | 60→60 | 80→80 |
| 內湖區 | 85→86 | 184→175 |
| 北投區 | 0→0 | 1→1 |
| 南港區 | 4→9 | 6→17 |
| 士林區 | 140→113 | 230→175 |
| 大同區 | 23→21 | 77→68 |
| 大安區 | 47→45 | 116→114 |
| 文山區 | 50→51 | 59→64 |
| 松山區 | 55→55 | 107→104 |
| 萬華區 | 78→82 | 25→52 |

Raw source district labels and geometry-assigned/deduplicated positions are separate columns in the JSON; disagreements are not silently equated. 北投's one covered reference can be covered by a listed point across a district border; zero listed positions is not proof of no physical service. Nine of twelve independent district top-five sequences change. Each district scenario independently allocates five slots; these are not one citywide five-slot plan.

Mode B is **not rebased or rerun**: its reviewed reference sidecar is bound to the approved base snapshot. This review does not forge a new binding/approval or alter weights. A subsequent publication review must assess any dependent-sidecar migration separately. Scope here is verifiable Mode A input-version sensitivity, not all possible parameter choices or weighted-mode effects.

## 4. Issue #22 — six sources, no reproducible monitor defect

[Current monitor evidence](../reports/audit-issues-22-23-2026-10-29/research-current/report.json), [repeat check](../reports/audit-issues-22-23-2026-10-29/research-current/repeat-check.json) and [fresh portal verification](../reports/audit-issues-22-23-2026-10-29/research-current/portal-metadata.json) retain full hashes, identities and times. Research version stays `priority-v1-113edf6ed5e09ada`; method/weights remain `policy-balanced-coverage-v1` / `policy-priority-weights-v1`.

| Source | Current HTTP / disposition | Official resource update | Analytical boundary |
| --- | --- | --- | --- |
| Taipei Travel | 403 / known_unavailable warning | Unknown | Tourism remains unavailable; not zero demand |
| MRT GIS | 200 / valid, SHA unchanged | 2026-10-13 | Existing73 station references; not passenger counts |
| Vendor concentrations | 200 / stale warning, SHA unchanged | 2025-08-26 | Existing42 reviewed locations; not all declared night markets |
| Traditional markets | 200 / valid, SHA unchanged | 2026-09-04 | Existing47 references |
| Commercial introduction | 200 / stale warning, SHA unchanged | 2025-06-17 | Context only; no defensible commercial geometry |
| Commercial associations | 200 / stale warning, SHA unchanged | 2025-08-08 | Context only; mailing addresses are not district centres |

Only the five200 payloads have verified current-byte equality. Travel's `current_hash` is null; its previous hash identifies frozen blocked HTML, **not tourist data**. Travel `content_changed:false` must not be interpreted as byte equality or recovery.

Two October29 checks returned warning/exit0 and the same actionable fingerprint as Issue #22, `c99d0a8ff16bd9228bd23ed5f90ac7b2d765d9607fa6eb09791e3a39a4031191`. Fresh portal checks confirm all five resource IDs and resource-update dates. Four previously unknown dataset-metadata baselines are now observed separately; this is not proof of an historical metadata change or newer publication. Retrieval/check events are October29; frozen archival/analysis validation dates remain unchanged.

No duplicate-open-issue defect was reproduced. Prior alerts #17/#18 were closed on October20; the existing open-bot-issue/marker rule can therefore create #23/#22 on October26. Closing an issue does not resolve a recurring source condition. No issue delivery or closure was triggered by this review.

**Recommendation:** no monitoring/deduplication code change. Keep the explicit Travel403, stale-date and geometry warnings. Further investigation concerns authorized source access, refreshed authoritative data and commercial spatial evidence—not guessed substitutes, new publication dates or zero-demand assumptions. The separate130-row supplementary resource also retains its metadata-baseline warning and is not added to the661-row inventory.

## 5. Reproduction, verification and delivery

Frozen replay (no network, no approval declaration):

```powershell
npm ci
npx tsx scripts/reviewBinInventoryRevision.ts
npm test -- --maxWorkers=1
npm run build
$env:PLAYWRIGHT_PORT='5241'
npm run test:e2e -- --workers=1 tests/e2e/bin-policy.spec.js tests/e2e/bin-policy-governance.spec.js tests/e2e/policy-priority.spec.js
```

Current-source rechecks are separate from frozen replay; write new observations to ignored output, not over this archived case:

```powershell
npm run data:monitor:bin-policy -- test-results/issues-22-23-current
npm run data:monitor:policy-priority -- data/raw/bin-policy-priority/priority-v1-113edf6ed5e09ada public/data/bin-policy/priority-references.json test-results/issues-22-23-research
```

Verification executed: baseline484 tests, final **492 tests /32 files**, application/Node TypeScript and Vite8.3.5 build passed; **50 applicable desktop/mobile E2E** passed. Existing governance suites passed55 tests; eight new audit-glue tests cover row/ambiguity accounting, field changes, schema and output confinement. Both real monitor CLIs completed without publication (approved sources: `change_detected`; research: `warning`, exit0). Local link/diff checks passed. No standalone lint script is configured, so no lint result is claimed; the workflow was not changed or dispatched.

The only new executable is this bounded audit reproducer; no production defect/fix, approval artifact, dashboard change or method migration is claimed. [Replay verification](../reports/audit-issues-22-23-2026-10-29/bin-revision/analysis/replay-verification.json) confirms identical findings SHA256 `5fbf2b5d7249cd78df6fc1664bfd3f22d8e312a8e870293c56fe29bfea555921` and identical decoded row evidence across runs. Only execution-only `validatedAt` is excluded from that comparison; source dates and all recorded counts/rankings are preserved.

The candidate is constructed in a checked temporary directory; approved input reconstruction and reference equality are asserted. Output is confined below `reports/`. Original source/artifact bytes have scoped Git attributes to prevent newline rewriting. No protected data, scoring formula, weights or publication gate is changed. No network check needed a synthetic fallback; missing tourism and unverified physical facility events remain disclosed limitations.

Requested delivery is **one Draft PR**, title `audit: review bin inventory revision and research-source alerts (#22 #23)`, targeting main and referencing—not closing—both issues. Do not merge automatically. Recommendation remains **separate publication review for #23; no monitoring-code change for #22**, with the investigations above as prerequisites.
