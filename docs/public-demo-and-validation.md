# AERQON Public Demo and Validation Guide

This document explains how to present AERQON as a public demo and how to validate whether the product idea solves a real customer problem.

AERQON is currently a local synthetic prototype for cloud security evidence and remediation assurance.

It demonstrates one core idea:

**Detection is not verification.**

A finding should not be considered resolved because someone reports it as fixed. Resolution requires fresh compatible evidence that supports a passing evaluation.

## Current boundaries

- DEMO DATA
- SYNTHETIC ENVIRONMENT
- NOT CUSTOMER DATA
- NO LIVE AWS
- No production readiness claim
- No commercial validation claim
- No customer data processing
- No live AWS scanning
- No authentication
- No billing
- No database
- No AI/LLM
- No automatic remediation
- No compliance certification
- No guaranteed risk reduction

## Run locally

Install dependencies once:

    npm ci

Start the local app:

    npm run dev

Open:

    http://localhost:3000

On this Windows machine, use the bundled Node npm launcher if the global npm command is broken:

    node "C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js" run dev

## Three-minute demo walkthrough

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

    Baseline: FAIL
    Fresh recheck: PASS

Explain that AERQON compares the original evidence with fresh compatible evidence instead of trusting a manual status label.

### 4. Explain verified resolution

Show the resolved state:

    RESOLVED by verified evidence

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

## Customer discovery goal

The goal is not to sell AERQON immediately.

The goal is to learn whether teams actually struggle with proving that cloud security remediation was completed correctly.

## Target interview profile

Interview people responsible for cloud security, infrastructure, compliance evidence, or remediation follow-up in small or medium SaaS teams.

Good interview targets:

- CTOs
- Technical founders
- DevOps engineers
- Cloud engineers
- Security engineers
- GRC or compliance owners
- Managed security service providers serving SaaS teams

## Core problem hypothesis

Small SaaS teams can often detect cloud misconfigurations, but they struggle to prove that remediation was completed with fresh, trustworthy, explainable evidence.

## Interview questions

1. How do you currently detect cloud misconfigurations?
2. After a finding is fixed, how do you prove it was actually resolved?
3. Do you rely on screenshots, tickets, rescans, manual notes, auditor requests, or tool status labels?
4. Who is responsible for confirming that remediation is complete?
5. How often do findings get marked as resolved before verification is complete?
6. What evidence do you provide to managers, auditors, customers, or internal reviewers?
7. How long does it usually take to prepare remediation evidence?
8. What makes evidence trustworthy or untrustworthy in your current process?
9. Do you need to preserve baseline evidence and fresh recheck evidence separately?
10. What information is usually missing when someone asks, "Is this really fixed?"
11. How painful is remediation verification today from 1 to 10?
12. What happens if a finding is falsely marked as resolved?
13. Has this caused audit delays, customer security review delays, repeated work, or production risk?
14. How frequently does this problem occur?
15. Is this problem important enough that you would pay for a tool or service to reduce it?
16. Does the idea of "detection is not verification" match a real problem you face?
17. Would a tool that produces an evidence package after recheck be useful?
18. What would you need to trust the output?
19. Which integrations would matter first: AWS Config, Security Hub, Prowler, Jira, GitHub, Slack, or printable reports?
20. What would make this product unacceptable or not worth using?

## Validation signals

Strong positive signals:

- The team already spends time proving remediation.
- The team has audit, customer security review, or compliance evidence pressure.
- The team distrusts manual resolved labels.
- The team wants baseline and fresh evidence preserved separately.
- The team can name a recent painful remediation verification example.
- The team asks for a pilot, sample report, or integration path.

Weak or negative signals:

- The team does not track remediation evidence.
- The team trusts existing scanner status without concern.
- No one owns verification.
- The problem happens rarely.
- The team would not pay or allocate time for this workflow.
- The team only wants a generic vulnerability scanner.

## Interview scoring

| Area | Score 0 | Score 1 | Score 2 |
| --- | --- | --- | --- |
| Problem exists | No problem | Occasional problem | Clear recurring problem |
| Pain level | Low | Medium | High |
| Evidence need | Not needed | Sometimes needed | Frequently required |
| Budget signal | No budget | Possible budget | Clear willingness to pay |
| Workflow fit | Poor fit | Partial fit | Strong fit |

Maximum score: 10.

Suggested interpretation:

- 0-3: weak validation
- 4-6: continue discovery
- 7-10: strong candidate for pilot discussion

## Minimum validation target

Before building live AWS integration, collect:

- 10 customer discovery interviews
- at least 3 strong pain examples
- at least 2 requests for a pilot or paid assessment
- clear ranking of first required integration
- clear rejection reasons from non-buyers

## Next product decision

Only consider live AWS integration after customer discovery shows that remediation verification is a real and repeated problem worth paying for.

Until then, keep AERQON positioned as a validation-ready synthetic prototype, not a production platform.
