# AERQON

Cloud security evidence and remediation assurance for small SaaS teams using AWS.

## Current phase

**PHASE 2.1.1 — Applicability & Source Lineage Integrity**

The repository contains a deterministic, synthetic domain foundation for evidence, evaluations, findings, remediation actions, rechecks, and prioritization. All current data is **DEMO DATA**, a **SYNTHETIC ENVIRONMENT**, and **NOT CUSTOMER DATA**.

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

Phase 3 adapters/ingestion and Phase 4 workflows remain unimplemented. Existing UI, dependencies, and local Claude configuration are outside this correction.

## Tooling

- Next.js 16.3.4, React 19.2.0, and TypeScript 5.9.3
- ESLint 9.38.0
- Vitest 4.0.7 with React Testing Library
- Playwright 1.56.1

All direct dependencies are pinned exactly in `package.json`; `package-lock.json` records the resolved transitive tree.

## Commands

```powershell
npm install
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
