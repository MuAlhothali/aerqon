import { describe, expect, it } from "vitest";
import { syntheticAdapterContract } from "../../../test/synthetic-adapter-contract";
import { directAwsSource } from "../../demo/fixtures/direct-aws";
import { directAwsAdapter } from "./direct-aws-adapter";

syntheticAdapterContract(directAwsAdapter, directAwsSource, "fields", "resource", "type", "api");
describe("direct collection metadata", () => {
  it("preserves explicit denial and partial evidence without fabricating facts", () => {
    const result = directAwsAdapter.normalize(directAwsSource());
    if (!result.success) throw new Error("Expected source");
    const archive = result.evidence.find((item) => item.resourceId === "northstar-demo-archive")!;
    expect(archive.retrievalState).toBe("ACCESS_DENIED"); expect(archive.observedFields).toEqual({});
    expect(archive.limitations).toContain("Encryption API explicitly denied; encryption configuration is unverified.");
    expect(result.evidence.find((item) => item.resourceId === "northstar-demo-logs" && item.sourceApi === "GetPublicAccessBlock")!.observedFields).toEqual({ publicAccessBlockEnabled: true });
  });
});
