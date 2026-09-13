# AGENTS.md — AERQON

## Project identity

AERQON is a Cloud Security Evidence & Remediation Assurance product.

Core logic:

OBSERVE → EVALUATE → ACT → RECHECK → VERIFY

AERQON is not a generic vulnerability scanner, not a CNAPP clone, not a full CSPM replacement, and not an autonomous remediation platform.

The current state is a local synthetic prototype.

## Non-negotiable boundaries

Always preserve:

- DEMO DATA
- SYNTHETIC ENVIRONMENT
- NOT CUSTOMER DATA
- NO LIVE AWS
- Current prototype only
- Northstar SaaS is synthetic, not a real customer
- No customer adoption is established
- No commercial traction is established
- No production readiness is established
- No authenticated AWS connector is currently implemented
- Future capabilities must be labeled: FUTURE / NOT IMPLEMENTED

Never claim production SaaS, live AWS integration, real customer deployment or data, verified revenue, signed partners, guaranteed risk reduction, autonomous remediation, complete CNAPP/CSPM replacement, compliance certification, or market-leading status.

## Core trust invariants

Preserve these rules:

- ACCESS_DENIED != FAIL
- Missing evidence != PASS
- PARTIAL_EVIDENCE != FAIL
- Reported fix != RESOLVED
- Severity != Confidence
- Evaluation State != Remediation State
- Exact evidenceId-to-sourceId bindings are required
- Source swapping invalidates proof replay
- A status label is not proof
- Fresh compatible PASS is required for verified resolution

## Engineering rules

Use boring, explicit, testable engineering. Do not add features before preserving domain correctness. Do not collapse uncertainty states into PASS or FAIL, and do not treat source-native labels as AERQON decisions.

Do not add live AWS, authentication, billing, persistence, tenant isolation, or production workflow unless the task explicitly authorizes that phase.

Keep these concepts separate:

- source
- evidence
- evaluation
- finding
- action
- recheck
- report

## Source and evidence rules

All source-shaped inputs are untrusted. Validation establishes shape, not authenticity. Normalization maps supported source records into `EvidenceObject`; adapters must not create PASS or FAIL decisions. Rule evaluation belongs in the domain layer.

Evidence must retain:

- assessmentId
- sourceId
- evidenceId
- resourceId
- observedAt
- sourceApi
- observedFields
- expectedFields
- retrievalState
- completeness
- validationState
- limitations

## Evaluation rules

Every evaluation state has a distinct meaning:

- PASS: complete evidence establishes absence of the failure condition for one control.
- FAIL: complete evidence confirms the rule violation.
- UNKNOWN: absent, invalid, contradictory, or temporally invalid evidence.
- ACCESS_DENIED: required evidence collection was denied.
- PARTIAL_EVIDENCE: required observation, API, or field is incomplete or unavailable.
- NOT_APPLICABLE: no compatible service, resource type, and API contract.
- NOT_EVALUATED: explicit scope exclusion after prior guards.

PASS does not certify a resource, cloud account, or organization.

## Remediation rules

A finding starts work; it does not prove remediation. A reported fix is not a verified resolution. Only domain verification can produce RESOLVED.

Resolution requires:

1. Same assessment compatibility
2. Same rule identity and rule version
3. Same resource identity
4. Fresh compatible evidence
5. Exact replay against evidence
6. Current evaluation state = PASS

## Current prototype scope

The current prototype may include synthetic source normalization, six deterministic controls, versioned rule evaluation, traceable findings, same-assessment recheck, printable evidence reports, and the Northstar synthetic scenario.

It does not include live AWS collection, customer onboarding, credential intake, authentication, database persistence, tenant isolation, billing, durable audit history, or a production approval workflow.

## Future scope

Future items must always be labeled `FUTURE / NOT IMPLEMENTED` unless actually implemented and tested. Possible future items include an authenticated read-only AWS connector, IAM role, External ID, STS AssumeRole, identity, tenant isolation, encrypted durable history, RBAC, audit logs, evidence analytics, and production operations.

## Testing instructions

Before declaring work complete, run relevant checks. For this TypeScript / Next.js project, use npm commands:

```powershell
npm ci
npm run lint
npm run typecheck
npm test
npm run build -- --webpack
npm run test:e2e
```
