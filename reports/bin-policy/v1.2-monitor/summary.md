# Policy priority research-source monitor: failure

Approved fallback: v1-14c24bcdbade
Research snapshot: priority-v1-113edf6ed5e09ada
Method: policy-balanced-coverage-v1
Weights: policy-priority-weights-v1

| Source | HTTP | Changed | Validation |
|---|---|---|---|
| taipei_travel | 403 | false | failed: frozen_source_acquisition_blocked, http_failure, official_publication_date_unknown |
| taipei_mrt_gis | 200 | false | valid:  |
| vendor_concentrations | 200 | false | warning: source_older_than_365_days |
| traditional_markets | 200 | false | valid:  |
| commercial_introduction | 200 | false | warning: source_older_than_365_days |
| commercial_associations | 200 | false | warning: source_older_than_365_days |

- Research-source checks only; no approved analysis or archives were modified.
- Source, retrieval and validation dates remain distinct. HTTP headers and check dates are not publication dates.
- Remote portal metadata is not revalidated by this byte monitor; frozen audited resource identity/dates are retained and require separate review on any source revision.
- Blocked or unavailable categories remain unavailable, not zero demand. Changed bytes are not schema-approved.
- Method, weights and source revisions are independent dimensions; successful ETL is not adoption approval.
