# Policy priority research-source monitor: change_detected

Approved fallback: v1-14c24bcdbade
Research snapshot: priority-v2-541148442bec70ac
Method: policy-balanced-coverage-v2
Weights: policy-priority-weights-v2

| Source | HTTP | Availability | Changed | Validation |
|---|---|---|---|---|
| taipei_mrt_gis | 200 | available | false | valid:  |
| vendor_concentrations | 200 | available | true | warning: changed_content_requires_adapter_schema_and_geometry_review, source_older_than_365_days |
| traditional_markets | 200 | available | false | valid:  |
| commercial_introduction | 200 | available | false | warning: source_older_than_365_days |
| commercial_associations | 200 | available | false | warning: source_older_than_365_days |

- Research-source checks only; no approved analysis or archives were modified.
- Taipei Travel is intentionally retired from active monitoring; its historical evidence is retained. This does not imply zero tourism demand. Failures from active sources still fail the monitor.
- Source, retrieval and validation dates remain distinct. HTTP headers and check dates are not publication dates.
- Remote portal metadata is not revalidated by this byte monitor; frozen audited resource identity/dates are retained and require separate review on any source revision.
- Blocked or unavailable categories remain unavailable, not zero demand. Changed bytes are not schema-approved.
- Method, weights and source revisions are independent dimensions; successful ETL is not adoption approval.
