import type { CSSProperties } from "react";
import type { PrototypeProjection } from "../application/prototype-workflow";
import type { AssessmentProjection } from "../application/assessment-projection";
import { evaluationStates, remediationStates, severityLevels } from "../domain/types";
import { translate, type Language, type MessageKey } from "./i18n";

export interface DistributionItem { key: string; label: string; count: number; tone: string }
export function Distribution({ title, note, items, compact = false }: { title: string; note: string; items: readonly DistributionItem[]; compact?: boolean }) {
  const total = items.reduce((sum, item) => sum + item.count, 0);
  return <section className={`distribution${compact ? " distribution-compact" : ""}`} aria-label={title}>
    <div className="distribution-heading"><h2>{title}</h2><strong>{total}</strong></div>
    <div className="distribution-bar" aria-hidden="true">{items.filter((item) => item.count > 0).map((item) => <span key={item.key} style={{ flexGrow: item.count, "--chart-color": `var(--chart-${item.tone})` } as CSSProperties} />)}</div>
    <ul className="distribution-legend">{items.map((item) => <li key={item.key}><span className="legend-swatch" aria-hidden="true" style={{ background: `var(--chart-${item.tone})` }} /><span>{item.label}</span><strong>{item.count}</strong></li>)}</ul>
    <p className="distribution-note">{note}</p>
  </section>;
}

const evaluationTones = { PASS: "positive", FAIL: "negative", UNKNOWN: "unknown", NOT_EVALUATED: "neutral", ACCESS_DENIED: "denied", PARTIAL_EVIDENCE: "warning", NOT_APPLICABLE: "excluded" };
export function EvaluationDistribution({ projection, language }: { projection: AssessmentProjection; language: Language }) {
  const conclusive = projection.coverage.counts.PASS + projection.coverage.counts.FAIL;
  return <Distribution title={language === "ar" ? "توزيع نتائج القواعد" : "Control evaluation distribution"} note={language === "ar" ? `${conclusive} تقييمًا حاسمًا (PASS + FAIL). وحدة العد: مورد × قاعدة. غير المنطبق ليس نجاحًا، والتغطية ليست درجة أمان.` : `${conclusive} conclusive evaluations (PASS + FAIL). Counted per resource × control. Not applicable is not a pass. Coverage is not a security score.`}
    items={evaluationStates.map((key) => ({ key, label: translate(language, key), count: projection.coverage.counts[key], tone: evaluationTones[key] }))} />;
}
export function RemediationDistribution({ model, language }: { model: PrototypeProjection; language: Language }) {
  return <Distribution title={translate(language, "remediation")} note={translate(language, "resolutionNote")} items={remediationStates.map((key) => ({ key, label: translate(language, key), count: model.details.filter((d) => d.finding.remediationState === key).length, tone: key === "RESOLVED" ? "positive" : key === "IN_PROGRESS" ? "blue" : key === "REOPENED" ? "negative" : "neutral" }))} />;
}
export function SeverityDistribution({ model, language }: { model: PrototypeProjection; language: Language }) {
  return <Distribution compact title={language === "ar" ? "الملاحظات حسب الشدة" : "Findings by severity"} note={language === "ar" ? "جميع سجلات الملاحظات، بما فيها المعالجة. الشدة مستقلة عن الثقة." : "All finding records, including resolved. Severity is independent of confidence."}
    items={severityLevels.map((key) => ({ key, label: translate(language, key as MessageKey), count: model.details.filter((d) => d.finding.severity === key).length, tone: key === "HIGH" || key === "CRITICAL" ? "negative" : key === "MEDIUM" ? "warning" : "neutral" }))} />;
}
export function EvidenceDistribution({ projection, language }: { projection: AssessmentProjection; language: Language }) {
  return <Distribution compact title={language === "ar" ? "اكتمال الملاحظات" : "Observation completeness"} note={language === "ar" ? "كما يصفه المصدر. تفحص القواعد الحقول المطلوبة بصورة مستقلة." : "Source-declared. Rules independently validate required fields."}
    items={(["COMPLETE", "PARTIAL", "INSUFFICIENT"] as const).map((key) => ({ key, label: translate(language, key), count: projection.evidence.filter((e) => e.completeness === key).length, tone: key === "COMPLETE" ? "blue" : key === "PARTIAL" ? "warning" : "neutral" }))} />;
}
export function RecheckDistribution({ model, language }: { model: PrototypeProjection; language: Language }) {
  return <Distribution title={language === "ar" ? "نتائج إعادة التحقق" : "Recheck outcomes"} note={language === "ar" ? "النتيجة لكل سجل ملاحظة؛ لا يثبت التغيير في الحقول وحده اكتمال المعالجة." : "One outcome per finding record. A field change alone does not verify remediation."}
    items={(["VERIFIED_RESOLVED", "STILL_OPEN", "UNABLE_TO_VERIFY", "REOPENED", "NEW"] as const).map((key) => ({ key, label: translate(language, key), count: model.details.filter((d) => d.verification === key).length, tone: key === "VERIFIED_RESOLVED" ? "positive" : key === "UNABLE_TO_VERIFY" ? "warning" : key === "STILL_OPEN" ? "negative" : "blue" }))} />;
}
