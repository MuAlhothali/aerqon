# AERQON

Cloud security evidence and remediation assurance for small SaaS teams using AWS.

## Current prototype

**Local synthetic product prototype**, built on the Phase 2.1.1 hardening baseline (`3d4d349`).

Evidence → validation → evaluation → prioritization → action → verification → Evidence Package. AERQON turns supplied configuration observations into an explainable remediation plan and verifies matching fresh evidence. It is not another connected scanner. Commercial demand and production readiness are not validated.

The Northstar SaaS demonstration includes three source adapters, bounded runtime validation, deterministic evaluations, coverage, findings, owner/action assignments, baseline/current evidence, verified remediation, and four printable reports. All data is **DEMO DATA**, a **SYNTHETIC ENVIRONMENT**, and **NOT CUSTOMER DATA**. Those labels remain visible in the console and reports.

Real AWS access, AI, database, authentication, billing, automatic remediation, and continuous monitoring are not implemented.

## Domain hardening contract

- Evidence validation copies only the approved envelope fields into a deeply frozen object. JSON data is bounded to depth 16, 128 keys per object, 256 array items, 10,000 characters per string, 5,000 values, and 100,000 total key/value characters per evidence object. Evaluation accepts at most 256 objects. Accessors, exotic objects, cycles, prototype-like keys, malformed booleans, and unexpected envelope fields are rejected.
- Rule-required observations determine completeness; a caller-supplied `COMPLETE` flag alone cannot establish PASS. Explicit permission denial gives `ACCESS_DENIED`; generic unavailability gives `PARTIAL_EVIDENCE`. Malformed observations give `UNKNOWN`.
- Each evaluation covers one assessment/account/region/service/resource. All relevant API observations are considered. Identical duplicate IDs are deduplicated; conflicting IDs or scalar observations produce uncertainty. Evidence/source IDs and evaluation IDs use deterministic ordering. No wall clock or randomness is used.
- SG-001 accepts TCP names/numbers and intervals containing 22, including unrestricted IPv4 and IPv6 sources. Legacy `fromPort` without `toPort` explicitly denotes a single port. All-protocol ingress includes TCP. Unrecognized CIDR forms produce uncertainty. No attachment, reachability, or exploitation is inferred.
- S3-001 requires both a boolean `publicAccessBlockEnabled` from `GetPublicAccessBlock` and boolean `isPublic` from `GetBucketPolicyStatus`. Disabled PAB plus public policy fails; non-public policy with complete PAB evidence passes. Missing observations remain partial; enabled PAB plus public policy is treated conservatively as inconsistent/UNKNOWN. This is a simplified synthetic contract, not a complete AWS public-access model.
- RDS findings describe public-access configuration only. Encryption rules require actual boolean observations, never truthy/falsy coercion.
- `generateFinding(evaluation, evidence, now, context?)` replays the evaluation, checks evidence/source/resource/rule/version identity, and derives rule wording internally. Unsupported or altered proofs are rejected. `findingEligible` replaces the premature `findingCreated` flag.
- `verifyResolution(finding, { evaluation, evidence }, verifiedAt)` requires a matching deterministic PASS and fresh observations. Naked booleans and customer reports cannot resolve findings. Phase 2.1 permits verification within the same assessment/resource lineage only; cross-assessment recheck association is intentionally deferred.
- Priority context is optional and caller-supplied from known assessment facts. Missing context is explicitly unavailable/neutral. The pure policy lives in `domain`; `application/prioritize.ts` retains a compatibility re-export. Actual comparators include stable string keys and return new sorted arrays. Bands remain an internal heuristic, not a validated risk score; no numeric score is exposed.
- Each rule explicitly requires its service, resource type (`AWS::EC2::SecurityGroup`, `AWS::S3::Bucket`, or `AWS::RDS::DBInstance`), and required API observations together. An API name alone never establishes applicability. No matching observation yields `NOT_APPLICABLE`; malformed input and cross-assessment/mixed-resource guards retain their existing uncertainty states.
- Canonical, deeply frozen `evidenceBindings` preserve each `evidenceId` → `sourceId` pair in stable ID order. Identical input duplicates are normalized. Compatibility ID arrays derive from these bindings, which also participate in evaluation identity. Finding and remediation verification replay and compare exact bindings; missing, additional, duplicate, or swapped proof bindings are rejected. These are local consistency checks, not cryptographic authentication of source claims.
- All six rules are versioned **1.2.0** and frozen because the applicability contract changes every rule's semantics. Historical 1.0.0 and 1.1.0 evaluations are not migrated or silently accepted under current verification semantics.

## Architecture

| Area | Responsibility |
| --- | --- |
| `src/domain` | Pure versioned rules, proof verification, findings, priority policy, remediation verification |
| `src/schemas` | Bounded JSON copying and runtime evidence/source validation |
| `src/infrastructure/synthetic` | Direct AWS, Security Hub and Prowler **synthetic-format** adapters; normalize observations, never decide outcomes |
| `src/application` | Evidence pipeline, source/rule manifests, assessment/coverage projections, workflow, comparisons and report descriptors |
| `src/demo` | Composition root and deterministic source factories; baseline and fresh same-assessment snapshots |
| `src/presentation` | Shared console, finding detail, reports, semantic English/Arabic messages and browser preferences |
| `src/app` | Next.js server page builds projections; interactive console consumes serializable data without evaluating rules |

The pipeline rejects unsafe envelopes and undeclared/cross-assessment sources. Invalid observations or conflicting evidence IDs yield an `INCOMPLETE` projection: valid observations remain inspectable, but **all conclusions are withheld** to avoid falsely passing after dropping malformed evidence. Canonical evidence identity includes assessment, source, original observation ID and observation time. Baseline and recheck evidence cannot overwrite one another.

Source manifests retain source type/name/version, importer version and collection time. Vendor PASS/RESOLVED labels are preserved as original data but ignored as security decisions. The three formats are deliberately controlled fixture contracts, **not general ASFF/Prowler file compatibility claims**. Adapters are trusted application code; source data is untrusted.

Workflow resolution uses a fresh snapshot in the **same assessment**, not relabeled cross-assessment evidence. The six baseline findings retain their original evidence and gain verified current outcomes. Generic comparisons also carry PASS → FAIL, UNKNOWN → PASS and ACCESS_DENIED → UNKNOWN. Newly detected FAIL findings, including new resources, enter the same Action Plan, summary and reports without inventing baseline failures. The domain's `verifyRecheck` additionally supports RESOLVED → REOPENED using fresh compatible FAIL proof. The Action Plan separates unresolved work from verified outcomes. Historical observations remain visible with an explicit freshness label and cannot establish fresh verification, including for still-open failures. Original imports come from the pipeline-owned immutable snapshot. A persistent multi-cycle case-management system is not implemented.

## Northstar demonstration

Baseline observations: 9 September 2026. Fresh recheck: 10 September 2026. Dates are fixture constants, not a live clock. Scope declares `us-east-1` and `eu-west-1`; current fixture resources are in `us-east-1`, so this does not claim regional inventory completeness.

| Resource / rule | Baseline | Recheck | Remediation |
| --- | --- | --- | --- |
| `sg-demo-admin` / SG-001 | FAIL | PASS | RESOLVED by verified evidence |
| `sg-demo-all` / SG-002 | FAIL | FAIL | OPEN |
| `northstar-demo-public-assets` / S3-001 | FAIL | PARTIAL_EVIDENCE | IN_PROGRESS, not falsely resolved |
| `northstar-demo-logs` / S3-001 | PASS | PASS | No finding |
| `northstar-demo-archive` / S3-002 | ACCESS_DENIED | ACCESS_DENIED | No finding |
| `northstar-demo-prod-db` / RDS-001 | FAIL | FAIL | OPEN; configured public access, not proven reachability |
| `northstar-demo-legacy-db` / RDS-002 | FAIL | FAIL | OPEN |
| `northstar-demo-logs` / S3-002 | NOT_EVALUATED | NOT_EVALUATED | Explicitly excluded resource/control |
| Incompatible resource/control pairs | NOT_APPLICABLE | NOT_APPLICABLE | No finding |

There are six baseline findings: SG-001 also applies to the all-protocol group. Final workflow: one resolved, four open, one in progress. Optional cost-hygiene examples are not included. All six rules remain **v1.2.0**: SG-001, SG-002, S3-001, S3-002, RDS-001, RDS-002.

## Product walkthrough

1. Open Assessment: review remaining work, evidence gaps and the separate verified-outcomes rail. Open `sg-demo-admin` from that rail.
2. Inspect separate severity/confidence explanations, original imported observations, normalized evidence, exact source bindings, ownership and verification conditions.
3. Open Recheck: SSH resolves, legacy RDS remains open, and partial S3 evidence does not resolve its finding.
4. Open Evidence and Coverage to compare baseline/current observations and all seven evaluation states. The matrix can include incompatible resource/control pairs.
5. Open Reports: Executive Report, Technical Appendix, Evidence Package and Recheck Report share the console's verified workflow. Use **Print report** for browser printing; there is no PDF-generation service.
6. Switch English/Arabic and Light/Dark/System. Only these preferences persist in browser local storage; assessment data and navigation reset on reload.

The interface uses semantic status text (not color alone), separate confidence treatment, keyboard focus, a skip link, accessible labels, reduced-motion support, logical RTL layout and locally scrollable dense tables. Raw evidence stays LTR and is rendered as escaped text. No external fonts or runtime service calls are needed.

## Prototype limitations

- Deterministic, read-only synthetic workflow: owners and actions are fixture assignments, not persisted editable tasks. No uploads, live evidence refresh or background monitoring.
- Same-assessment verification only; no cross-assessment migration or historical rule-version migration.
- Provenance checks establish local consistency, not cryptographic authenticity. Collection APIs and metadata are synthetic claims, not authenticated AWS responses.
- Six simplified configuration controls; no account inventory, complete compliance assessment, workload attachment, exploitation or end-to-end reachability proof. Coverage is not a posture percentage or certification.
- Priority bands are transparent heuristics, not validated risk scores. No revenue, customer validation or savings claims.
- Reports are printable HTML, not signed attestations. Arabic translates product copy and control explanations; identifiers, source payloads, team names and technical policy diagnostics retain their original language.
- No AWS SDK/connectivity, IAM deployment, database, authentication, multi-tenancy, billing, AI/LLM, automatic remediation, customer data or external telemetry integration.

## Tooling

- Next.js 16.3.4, React 19.2.0, and TypeScript 5.9.3
- ESLint 9.38.0
- Vitest 4.0.7 with React Testing Library
- Playwright 1.56.1

All direct dependencies are pinned exactly in `package.json`; `package-lock.json` records the resolved transitive tree.

## Commands

Use Node.js 24 or newer. On a new machine, install the locked dependencies once with `npm ci`, then install the Playwright Chromium binary if running E2E. Neither is needed again when already provisioned.

```powershell
npm ci
npm run dev
# Or production preview:
npm run build
npm run start
# Quality gates:
npm run typecheck
npm run lint
npm test
npm run build
npm run test:e2e
```

Run `npx playwright install chromium` once before the end-to-end test on a new machine.

### Local environment note

On the current machine, the global `npm` launcher resolves to a missing copy of npm under `%APPDATA%`. The project is valid, but run commands through the healthy npm bundled with Node until that machine-level installation is repaired:

```powershell
node "C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js" run build
```

## Quality gate

`npm run verify` runs typecheck, lint, unit tests, and production build. The end-to-end suite is separate because it requires the Playwright Chromium binary.

Unit/integration tests cover bounded hostile input, three adapters, source-brand neutrality, applicability, conflicting observations/IDs, exact source-binding swaps, lineage/version/freshness rejection, immutable snapshots, state transitions and report consistency. Component tests cover filtering, language, RTL, theme preferences and escaped hostile report text. Playwright covers the six primary product journeys plus keyboard navigation, coverage, print styling and narrow English/Arabic layouts.

On resource-constrained Windows machines, `npm run test -- --maxWorkers=2` avoids concurrent worker startup timeouts. The checked-in Playwright config uses port 3000. If another process owns that port, use a separate Playwright config with an unused local port and production `next start` after a successful build; do not terminate unrelated processes or reuse an unknown server. The final local review uses isolated port 3109 and the already installed browser cache. Generated `.next`, test results and dependency directories are ignored by Git.
