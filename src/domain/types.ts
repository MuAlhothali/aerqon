export const evaluationStates = ["PASS", "FAIL", "UNKNOWN", "NOT_EVALUATED", "ACCESS_DENIED", "PARTIAL_EVIDENCE", "NOT_APPLICABLE"] as const;
export type EvaluationState = (typeof evaluationStates)[number];

export const remediationStates = ["OPEN", "ACKNOWLEDGED", "IN_PROGRESS", "RISK_ACCEPTED", "RESOLVED", "REOPENED"] as const;
export type RemediationState = (typeof remediationStates)[number];

export const severityLevels = ["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"] as const;
export type Severity = (typeof severityLevels)[number];
export const confidenceLevels = ["HIGH", "MEDIUM", "LOW"] as const;
export type Confidence = (typeof confidenceLevels)[number];
export type PriorityBand = "P0" | "P1" | "P2" | "P3";
export type EvidenceCompleteness = "COMPLETE" | "PARTIAL" | "INSUFFICIENT";
export type RetrievalState = "RETRIEVED" | "ACCESS_DENIED" | "UNAVAILABLE";
export type ValidationState = "VALID" | "INVALID";

export interface Assessment {
  assessmentId: string;
  classification: "SYNTHETIC";
  environmentName: string;
  trigger: string;
  accountPlaceholder: string;
  regions: readonly string[];
  scope: string;
  assessmentDate: string;
  reviewer: string;
  status: "DRAFT" | "COMPLETE" | "RECHECK";
  evidenceSourceIds: readonly string[];
}

export interface EvidenceSource {
  sourceId: string;
  sourceType: "SYNTHETIC_AWS_OBSERVATION" | "SYNTHETIC_SECURITY_HUB" | "SYNTHETIC_PROWLER" | "FUTURE_DIRECT_AWS" | "FUTURE_CUSTOMER_UPLOAD";
  sourceName: string;
  sourceVersion: string;
  collectedAt: string;
  classification: "SYNTHETIC";
  importerVersion: string;
}

export interface EvidenceObject {
  evidenceId: string;
  assessmentId: string;
  sourceId: string;
  service: string;
  resourceType: string;
  resourceId: string;
  resourceName: string;
  accountPlaceholder: string;
  region: string;
  sourceApi: string;
  observedAt: string;
  observedFields: Readonly<Record<string, unknown>>;
  expectedFields: readonly string[];
  completeness: EvidenceCompleteness;
  retrievalState: RetrievalState;
  validationState: ValidationState;
  limitations: readonly string[];
}

export interface RuleDefinition {
  ruleId: string; version: string; title: string; service: string; category: string; description: string;
  requiredEvidence: readonly string[]; evaluationContract: string; defaultSeverity: Severity; severityRationale: string;
  confidencePolicy: string; remediationGuidance: string; verificationCondition: string; references: readonly string[]; knownLimitations: readonly string[];
}

export interface RuleEvaluation {
  evaluationId: string; assessmentId: string; ruleId: string; ruleVersion: string; evidenceIds: readonly string[]; evaluatedAt: string;
  evaluationState: EvaluationState; rationale: string; severity: Severity; severityRationale: string; confidence: Confidence;
  confidenceRationale: string; evidenceCompleteness: EvidenceCompleteness; diagnosticCode: string; findingCreated: boolean;
}

export interface Finding {
  findingId: string; evaluationId: string; ruleId: string; ruleVersion: string; service: string; resourceType: string; resourceId: string; resourceName: string; region: string;
  severity: Severity; confidence: Confidence; evaluationState: EvaluationState; remediationState: RemediationState; priorityBand: PriorityBand; priorityRationale: string;
  title: string; summary: string; whyItMatters: string; potentialBusinessImpact: string; recommendation: string; recommendedOwner: string;
  verificationSteps: readonly string[]; limitations: readonly string[]; evidenceCompleteness: EvidenceCompleteness; firstSeenAt: string; lastSeenAt: string; resolvedAt?: string; reopenedAt?: string;
}

export interface RemediationAction { actionId: string; findingId: string; owner: string; status: RemediationState; recommendedDeadline?: string; actionDescription: string; verificationCondition: string; customerReportedAt?: string; notes: string; }
export interface TimelineEvent { eventId: string; findingId: string; eventType: "DETECTED" | "ACKNOWLEDGED" | "REMEDIATED" | "VERIFIED" | "RESOLVED" | "REOPENED"; eventAt: string; actorType: "SYSTEM" | "CUSTOMER" | "REVIEWER"; description: string; supportingEvidenceIds: readonly string[]; }
export type RecheckOutcome = "RESOLVED" | "STILL_OPEN" | "REOPENED" | "NEW" | "UNABLE_TO_VERIFY";
export interface Recheck { recheckId: string; assessmentId: string; baselineAssessmentId: string; performedAt: string; ruleManifestVersion: string; comparisonResults: readonly { findingId: string; outcome: RecheckOutcome }[]; status: "COMPLETE" | "PARTIAL"; }
export interface Report { reportId: string; assessmentId: string; classification: "SYNTHETIC"; status: "DRAFT" | "FINAL"; generatedAt: string; findingIds: readonly string[]; evidenceSourceIds: readonly string[]; limitations: readonly string[]; }
