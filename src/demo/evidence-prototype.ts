import { runEvidencePipeline } from "../application/evidence-pipeline";
import { directAwsAdapter } from "../infrastructure/synthetic/direct-aws-adapter";
import { securityHubAdapter } from "../infrastructure/synthetic/security-hub-adapter";
import { prowlerAdapter } from "../infrastructure/synthetic/prowler-adapter";
import { northstarBaseline } from "./fixtures/northstar-baseline";
import { northstarRecheck } from "./fixtures/northstar-recheck";

// Composition stays outside application/domain. No I/O or implicit clock.
export const syntheticAdapters = Object.freeze([directAwsAdapter, securityHubAdapter, prowlerAdapter]);
export function runNorthstarPrototype(recheck = false) {
  const input = recheck ? northstarRecheck() : northstarBaseline();
  return runEvidencePipeline(input.assessment, input.sources, input.options, syntheticAdapters);
}
