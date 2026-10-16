# Session Handoff

Last reviewed: **2026-10-16 Asia/Taipei**. This file describes current repository status; [progress.md](progress.md) preserves dated historical milestones.

## Current state

- Static bilingual amenities app: 22 shared facility types, eight dedicated discovery/directory/analytics routes and `#/bin-policy`.
- v1.1 [PR #14](https://github.com/LEO0331/taipei-bin-map/pull/14) is merged; v1.2 [PR #15](https://github.com/LEO0331/taipei-bin-map/pull/15) is also merged (GitHub metadata verified during this documentation audit).
- PR #15 head: `01d07aa`; merge commit: `1280011b086f498404abf138c29f64041963e14c`. This workspace remains on `codex/bin-policy-v1-2`; no branch reset/checkout was performed. This documentation audit adds local, uncommitted updates.
- Earlier integration HTTP403 failures describe the agent's attempted PR creation, not the current PR state. No live hosting deployment or hosted workflow success was verified in this audit.

## Current policy behavior

- Mode A retains the approved `v1-14c24bcdbade` inputs: 679 valid unique bin positions / 3,395 retained 2021 bus references and original greedy A/B/C scenarios.
- Mode B is independent, lazy and research/review-required: `priority-v1-113edf6ed5e09ada`, 3,557 entities (42 vendor / 47 market / 73 MRT / 3,395 bus); 3,468 transport anchors.
- Method `policy-balanced-coverage-v1`; weights `policy-priority-weights-v1`, defaults 4/4/3/3/2/1 for tourism/vendor/market/commercial/MRT/bus, editable 0–10. Gain uses fixed category populations, not measured demand.
- Tourism acquisition is blocked (HTTP403); 235 commercial rows are context only, not spatial references. Missing categories are unavailable, without weight redistribution.
- Newer bus data is a comparison, not adopted. Monitoring and review bundles do not change approved sources or grant installation permission.
- Source, raw validation and analysis-validation dates are separate. Scoped Git attributes preserve raw archive hashes across operating systems.

## Verification evidence

The last implementation verification (2026-10-16, recorded in [v1.2 audit](docs/bin-policy-v1.2-audit.md)) passed:

| Check | Recorded result |
| --- | --- |
| `npm ci` | Zero reported vulnerabilities at that run |
| `npm test` | 308 tests / 23 files |
| `npm run build` | TypeScript and production build passed |
| Full Playwright, two workers | 142 desktop/mobile cases |
| Production-preview offline suite | 4 cases, Mode A/B on both profiles |
| Retained source reproduction / Git raw hashes | Passed |
| Node citywide benchmark | About 0.71 seconds; not physical-phone latency |

These are dated results, not fresh test runs from this docs-only audit. Earlier loading/download timeouts remain disclosed; the CSV case passed ten isolated repetitions and the final full run. No assertion that flakiness is permanently eliminated.

The retained research monitor dated 2026-10-16 intentionally reports failure/exit 1: five unchanged HTTP200 resources and blocked tourism HTTP403. This is not a passing source check. Workflow execution/Issue/PR permissions and human source approvals were not exercised by local verification.

## Documentation-audit follow-ups

- General design, tradeoffs, deployment, READMEs and policy version scopes now reflect v1.2. Historical reports retain their original dates/counts.
- Cooling has residual UI copy claiming grid clusters, but current code draws at most 80 individual points only after filtering/location. Documentation now describes actual behavior; fix the UI copy or implement the intended strategy in a separate behavior-tested change.
- Cache-update testing between two different deployments, physical-device performance, live source recovery and actual hosting smoke remain separate verification gaps.
- Do not add missing-source geometry, auto-adopt bus updates, interpret reference coverage as people/litter reduction, or enforce the stopped 2022 procedure as current siting law.

## Restart

Read [README](README.md), [feature ledger](feature_list.json), [v1.2 methodology](docs/bin-policy-v1.2-methodology.md) and [governance](docs/bin-policy-v1.2-governance.md). Use the repository root, a supported Node version and the lockfile. `bash ./init.sh` runs unit tests/build/E2E; PowerShell may run the npm commands directly. Build before `npm run test:policy-preview`; choose `PLAYWRIGHT_PORT` if 5173 is occupied. Data conversion is intentional maintenance, not a required deployment step.
