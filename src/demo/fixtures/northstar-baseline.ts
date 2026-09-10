import { northstarAssessment } from "../northstar";
import { directAwsSource, baselineGeneratedAt } from "./direct-aws";
import { securityHubSource } from "./security-hub";
import { prowlerSource } from "./prowler";

export function northstarBaseline() {
  const sources = [directAwsSource(), securityHubSource(), prowlerSource()];
  return { assessment: { ...northstarAssessment, evidenceSourceIds: sources.map((source) => source.sourceId) },
    sources, options: { generatedAt: baselineGeneratedAt } };
}
