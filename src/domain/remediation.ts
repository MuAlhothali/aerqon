import type { Finding, RemediationAction } from "./types";

export function recordCustomerReportedRemediation(action: RemediationAction, reportedAt: string, notes: string): RemediationAction {
  return { ...action, customerReportedAt: reportedAt, notes };
}

export function verifyResolution(finding: Finding, verificationPassed: boolean, verifiedAt: string): Finding {
  if (!verificationPassed) return finding;
  return { ...finding, remediationState: "RESOLVED", resolvedAt: verifiedAt, lastSeenAt: verifiedAt };
}
