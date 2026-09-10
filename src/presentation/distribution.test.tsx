import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import { buildProductDemo } from "../demo/product-demo";
import { Distribution, EvaluationDistribution, EvidenceDistribution, RecheckDistribution, RemediationDistribution, SeverityDistribution } from "./distribution";
const model = buildProductDemo();
afterEach(cleanup);
describe("truthful presentation summaries", () => {
  it("preserves all seven evaluation states including zero counts and the denominator", () => {
    render(<EvaluationDistribution projection={model.current} language="en" />);
    const entries = screen.getAllByRole("listitem");
    expect(entries).toHaveLength(7);
    expect(entries.map((li) => li.querySelector("strong")?.textContent)).toEqual(["9", "4", "0", "1", "1", "1", "38"]);
    expect(screen.getByText(/13 conclusive evaluations/)).toBeInTheDocument();
    expect(screen.getByText("54")).toBeInTheDocument();
  });
  it("keeps remediation separate from inconclusive verification", () => {
    render(<><RemediationDistribution model={model} language="en" /><RecheckDistribution model={model} language="en" /></>);
    const workflow = screen.getByRole("region", { name: "Remediation" });
    const outcomes = screen.getByRole("region", { name: "Recheck outcomes" });
    expect(within(workflow).getByText("In progress").parentElement).toHaveTextContent("1");
    expect(within(workflow).getByText("Resolved").parentElement).toHaveTextContent("1");
    expect(within(outcomes).getByText("Unable to verify").parentElement).toHaveTextContent("1");
    expect(within(outcomes).getByText("Still open").parentElement).toHaveTextContent("4");
  });
  it("does not invent severity variation or call source completeness verification", () => {
    render(<><SeverityDistribution model={model} language="en" /><EvidenceDistribution projection={model.baseline} language="en" /></>);
    expect(screen.getByText("High").parentElement).toHaveTextContent("6");
    expect(screen.getByText("Critical").parentElement).toHaveTextContent("0");
    expect(screen.getByText(/Source-declared/)).toBeInTheDocument();
    expect(screen.getByText("Complete").parentElement).toHaveTextContent("14");
  });
  it("renders an empty distribution and Arabic labels without invalid geometry", () => {
    const { container, rerender } = render(<Distribution title="Empty" note="No observations" items={[{ key: "none", label: "None", count: 0, tone: "neutral" }]} />);
    expect(container.querySelector(".distribution-bar")?.children).toHaveLength(0);
    expect(container.innerHTML).not.toMatch(/NaN|Infinity/);
    rerender(<EvaluationDistribution projection={model.current} language="ar" />);
    expect(screen.getByRole("region", { name: "توزيع نتائج القواعد" })).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(7);
  });
});
