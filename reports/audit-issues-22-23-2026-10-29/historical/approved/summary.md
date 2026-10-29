# Bin policy source monitor: change_detected

Checked: 2026-10-26T06:22:24.435Z; published snapshot: v1-14c24bcdbade

| Source | HTTP | Content changed | Rows (previous → current) | Validation |
|---|---|---|---|---|
| bins | 200 | true | 681 → 661 | warning: excluded_invalid_or_outside_records |
| bus | 200 | false | 3407 → 3407 | warning: source_older_than_365_days, excluded_invalid_or_outside_records |
| districts | 200 | false | 12 → 12 | warning: source_older_than_365_days |
| bins-tourist-commercial | 200 | false | 130 → 130 | warning: provider_metadata_baseline_unknown |

- Provider resource identity and timestamps are parsed from the official portal SSR JSON. Unavailable or changed page structure becomes a warning, not fabricated metadata.
- HTTP Last-Modified changes are reported separately and never become source publication dates.
- Three approved policy-analysis sources and the separately scoped tourist/commercial reconciliation resource are monitored. Proposed modern bus adapters are excluded until adoption approval.
- Validation warnings do not update published data. Record-count thresholds flag <80% or >150% of the published raw count; coordinate exclusions remain visible.

No production snapshot was modified. Changes require explicit review and a separate publication PR.
