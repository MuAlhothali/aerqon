import type { FindingDetailProjection, PrototypeProjection } from "../application/prototype-workflow";
import { translate, type Language, type MessageKey } from "./i18n";
import { EvaluationDistribution, RemediationDistribution } from "./distribution";
import { findingTitle } from "./finding-detail";
import { Meta, Section, Status, Technical } from "./primitives";

interface Props {
  model: PrototypeProjection; language: Language;
  onFinding: (detail: FindingDetailProjection) => void;
  onNavigate: (view: "actions" | "findings" | "recheck" | "coverage") => void;
}

export function AssessmentOverview({ model, language, onFinding, onNavigate }: Props) {
  const t = (key: MessageKey) => translate(language, key);
  const unresolved = model.summary.open + model.summary.inProgress + model.summary.reopened;
  const gaps = model.current.evaluations.filter((item) => ["UNKNOWN", "PARTIAL_EVIDENCE", "ACCESS_DENIED"].includes(item.evaluationState));
  const verified = model.details.filter((item) => item.verification === "VERIFIED_RESOLVED");
  const resources = new Set(model.baseline.evidence.map((item) => [item.accountPlaceholder, item.region, item.service, item.resourceType, item.resourceId].join("|"))).size;
  return <>
    <section className="review-brief" aria-label={t("briefing")}>
      <div><p className="eyebrow">{t("briefing")}</p><h2>{t("review")}</h2><p>{t("scopedesc")}</p></div>
      <div className="brief-date"><span>{t("asOf")}</span><Technical>{model.current.generatedAt.slice(0, 10)}</Technical><small>DEMO DATA / UTC</small></div>
    </section>
    <div className="scope-strip">
      <span>{t("baseline")}</span>
      <span><strong>{model.baseline.ruleManifest.length}</strong> {t("controls")}</span>
      <span><strong>{resources}</strong> {t("observedResources")}</span>
      <span><strong>{model.baseline.evidence.length}</strong> {t("observations")}</span>
      <span><strong>{model.baseline.sourceManifest.length}</strong> {t("sources")}</span>
      <span><strong><bdi dir="ltr">{new Set(model.baseline.evidence.map((e) => e.region)).size} / {model.baseline.assessment.regions.length}</bdi></strong> {language === "ar" ? "مناطق مرصودة / ضمن النطاق" : "observed / scoped regions"}</span>
    </div>
    <div className="metric-row briefing-metrics">
      {([[model.details.length, "confirmed", "findings", "findings"], [unresolved, "activeWork", "actions", "actions"], [model.summary.resolved, "resolved", "recheck", "recheck"],
        [gaps.length, "checksNeedEvidence", "coverage", "coverage"]] as const).map(([count, label, caption, destination]) => <div className="metric" key={label}>
        <span>{t(label)}</span><strong>{count}<span className={`metric-mark mark-${destination}`} aria-hidden="true" /></strong>
        <button className="text-link" onClick={() => onNavigate(destination)}>{t(caption)} <span className="direction-arrow" aria-hidden="true">→</span></button>
      </div>)}
    </div>
    <div className="overview-grid">
      <Section title={t("activeWork")} aside={<span className="section-count">{unresolved}</span>}>
        <p className="section-intro">{t("activeWorkNote")}</p><ol className="priority-queue">{model.actions.filter((d) => d.finding.remediationState !== "RESOLVED").slice(0, 3).map((d, index) => <li key={d.finding.findingId}><span className="queue-rank">{String(index + 1).padStart(2, "0")}</span><div><div className="queue-title"><span className="priority-band">{d.finding.priorityBand}</span><Technical>{d.finding.ruleId}</Technical><Status value={d.finding.remediationState} language={language} kind="remediation" /></div><button className="table-link" onClick={() => onFinding(d)}>{findingTitle(d, language)}</button><p><Technical>{d.finding.resourceId}</Technical></p><span className="queue-owner">{t("owner")} · {d.action.owner}</span></div></li>)}</ol><button className="text-link queue-all" onClick={() => onNavigate("actions")}>{t("priorityActions")} <span className="direction-arrow" aria-hidden="true">→</span></button>
      </Section>
      <aside className="review-rail">
        <section className="outcome-panel"><p className="eyebrow">{t("verifiedOutcomes")}</p>
          {!verified.length && <p>{t("noVerified")}</p>}
          {verified.map((detail) => <div className="verified-outcome" key={detail.finding.findingId}>
            <Status value={detail.verification} language={language} kind="verification" />
            <h3><Technical>{detail.finding.ruleId}</Technical></h3><button className="table-link" onClick={() => onFinding(detail)}><Technical>{detail.finding.resourceId}</Technical><span className="table-sub">{t("viewVerification")} <span className="direction-arrow" aria-hidden="true">→</span></span></button>
            <div className="compact-transition"><Status value={detail.baselineEvaluation?.evaluationState ?? "NO_BASELINE"} language={language} /><span className="direction-arrow" aria-hidden="true">→</span><Status value={detail.currentEvaluation?.evaluationState ?? "UNKNOWN"} language={language} /></div>
            <p>{t("resolutionNote")}</p>
          </div>)}
        </section>
        <section className="follow-up-panel"><div className="section-heading"><h2>{t("followUp")}</h2><span className="section-count">{gaps.length}</span></div><p>{t("checkCountNote")}</p>
          {gaps.map((item) => <div className="evidence-gap" key={item.evaluationId}><Technical>{item.ruleId} / {item.resource?.resourceId}</Technical><Status value={item.evaluationState} language={language} /></div>)}
          <button className="text-link" onClick={() => onNavigate("coverage")}>{t("reviewEvidence")} <span className="direction-arrow" aria-hidden="true">→</span></button>
        </section>
      </aside>
    </div>
    <div className="analytics-grid"><EvaluationDistribution projection={model.current} language={language} /><RemediationDistribution model={model} language={language} /></div>
    <Section title={t("overview")}><dl className="assessment-ledger">
      <Meta label={t("baseline")}>{model.baseline.findings.length} {t("confirmed")}</Meta>
      <Meta label={t("date")}><Technical>{model.baseline.assessment.assessmentDate.slice(0, 10)}</Technical></Meta>
      <Meta label={t("reviewer")}>{model.baseline.assessment.reviewer}</Meta>
      <Meta label={t("scope")}>{t("scopedesc")}</Meta>
    </dl></Section>
    <div className="limitations"><h3>{t("limitations")}</h3><p>{t("limitationSummary")}</p><p>{t("excluded")}</p></div>
  </>;
}
