# AERQON Demo Script

AERQON is a cloud security evidence and remediation assurance prototype for small SaaS teams using AWS.

This demo shows one core idea:

**Detection is not verification.**

AERQON does not treat a finding as resolved because someone says it was fixed. A finding is resolved only when fresh compatible evidence supports a passing evaluation.

## Current boundaries

This repository is a local synthetic prototype.

- DEMO DATA
- SYNTHETIC ENVIRONMENT
- NOT CUSTOMER DATA
- NO LIVE AWS
- No production readiness claim
- No commercial validation claim
- No authentication
- No billing
- No database
- No AI/LLM
- No automatic remediation

## Run locally

Install dependencies once:

```powershell
npm ci
```

Start the local app:

```powershell
npm run dev
```

Open:

```text
http://localhost:3000
```

On this Windows machine, use the bundled Node npm launcher if the global npm command is broken:

```powershell
node "C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js" run dev
```

## Three-minute walkthrough

### 1. Open the assessment

Start at the main AERQON console.

Explain that the screen represents a synthetic Northstar SaaS assessment. It contains evidence, evaluations, findings, owners, actions, recheck results, and printable reports.

Make clear that this is not live AWS data.

### 2. Open SG-001

Open the SG-001 security group finding.

Explain it simply:

A security group allowed risky SSH exposure in the baseline evidence.

Do not describe this as exploitation, reachability proof, or a complete AWS security assessment. It is a configuration evidence example.

### 3. Compare baseline and fresh evidence

Show that SG-001 changed from:

```text
Baseline: FAIL
Fresh recheck: PASS
```

Explain that AERQON compares the original evidence with fresh compatible evidence instead of trusting a manual status label.

### 4. Explain verified resolution

Show the resolved state:

```text
RESOLVED by verified evidence
```

Explain:

AERQON does not resolve the finding because a user reported a fix. It resolves the finding only when fresh evidence matches the expected resource, rule, source bindings, and passing evaluation.

### 5. Open Recheck

Open the Recheck view.

Explain that not every item becomes resolved:

- SG-001 resolves because fresh compatible evidence supports PASS.
- Some findings remain OPEN.
- Some findings remain IN_PROGRESS or PARTIAL_EVIDENCE when evidence is incomplete.

This prevents false confidence.

### 6. Open Evidence Package

Open the Evidence Package or reports area.

Explain that the reports are printable HTML outputs for review and communication. They are not signed attestations, compliance certificates, or production audit reports.

### 7. Close with the product thesis

Use this closing line:

AERQON is not trying to be another scanner. It is trying to make remediation evidence explainable, repeatable, and harder to falsely mark as resolved.

## What this demo proves

This demo proves that the local prototype can:

- accept synthetic evidence
- validate bounded evidence objects
- evaluate known controls deterministically
- separate severity from confidence
- distinguish detection from verification
- keep unresolved and verified outcomes separate
- produce explainable reports

## What this demo does not prove

This demo does not prove:

- real AWS integration
- production security readiness
- complete CSPM/CNAPP coverage
- customer adoption
- commercial demand
- compliance certification
- automatic remediation
- real-world risk reduction

## Suggested demo duration

```text
Intro: 30 seconds
Assessment view: 30 seconds
SG-001 finding: 45 seconds
Recheck and verified resolution: 45 seconds
Evidence Package / reports: 30 seconds
Close: 15 seconds
```

Total: approximately 3 minutes.
