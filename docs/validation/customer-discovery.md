# AERQON Customer Discovery Pack

This document supports early customer validation for AERQON.

AERQON is currently a local synthetic prototype. This document must not be used to imply production readiness, real AWS connectivity, customer adoption, revenue, compliance certification, or proven risk reduction.

## Current boundaries

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

## Target interview profile

Interview people who are responsible for cloud security, infrastructure, compliance evidence, or remediation follow-up in small or medium SaaS teams.

Good interview targets:

- CTOs
- Technical founders
- DevOps engineers
- Cloud engineers
- Security engineers
- GRC or compliance owners
- Managed security service providers serving SaaS teams

## Interview goal

The goal is not to sell AERQON immediately.

The goal is to learn whether teams actually struggle with proving that cloud security remediation was completed correctly.

## Core problem hypothesis

Small SaaS teams can often detect cloud misconfigurations, but they struggle to prove that remediation was completed with fresh, trustworthy, explainable evidence.

## Interview questions

### Current workflow

1. How do you currently detect cloud misconfigurations?
2. After a finding is fixed, how do you prove it was actually resolved?
3. Do you rely on screenshots, tickets, rescans, manual notes, auditor requests, or tool status labels?
4. Who is responsible for confirming that a remediation is complete?
5. How often do findings get marked as resolved before verification is complete?

### Evidence and reporting

6. What evidence do you provide to managers, auditors, customers, or internal reviewers?
7. How long does it usually take to prepare remediation evidence?
8. What makes evidence trustworthy or untrustworthy in your current process?
9. Do you need to preserve baseline evidence and fresh recheck evidence separately?
10. What information is usually missing when someone asks, "Is this really fixed?"

### Pain and urgency

11. How painful is remediation verification today from 1 to 10?
12. What happens if a finding is falsely marked as resolved?
13. Has this caused audit delays, customer security review delays, repeated work, or production risk?
14. How frequently does this problem occur?
15. Is this problem important enough that you would pay for a tool or service to reduce it?

### Product reaction

16. Does the idea of "detection is not verification" match a real problem you face?
17. Would a tool that produces an evidence package after recheck be useful?
18. What would you need to trust the output?
19. Which integrations would matter first: AWS Config, Security Hub, Prowler, Jira, GitHub, Slack, or PDF reports?
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

## Do not claim

Do not claim that AERQON currently provides:

- live AWS scanning
- production monitoring
- customer data processing
- compliance certification
- risk reduction guarantees
- automatic remediation
- real-time alerts
- AI-based security decisions
- proven commercial demand

## Interview scoring

Score each interview after completion.

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
