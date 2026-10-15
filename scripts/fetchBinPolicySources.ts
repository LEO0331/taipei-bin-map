import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { preparePublication } from './prepareBinPolicyPublication';

// Retained entry point, but a revision-acceptance flag alone is not review evidence.
const approvalAt = process.argv.indexOf('--approval');
const outputAt = process.argv.indexOf('--output');
if (approvalAt < 0 || outputAt < 0 || !process.argv[approvalAt + 1] || !process.argv[outputAt + 1]) throw new Error('Review-controlled refresh requires --approval <reviewed-approval.json> --output <new-review-directory>. --accept-source-revision cannot approve metadata/schema or overwrite production. Use monitorBinPolicySources.ts for read-only checks.');
const approval = JSON.parse(await readFile(resolve(process.argv[approvalAt + 1]), 'utf8'));
await preparePublication(approval, process.argv[outputAt + 1]);
