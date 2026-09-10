import type { FindingDetailProjection, PrototypeProjection } from "../application/prototype-workflow";
import { priorityExplanation, ruleArabic, translate, type Language, type MessageKey } from "./i18n";
import { Meta, Section, Status, Technical } from "./primitives";

export function findingTitle(detail: FindingDetailProjection, language: Language) {
  return language === "ar" ? ruleArabic[detail.finding.ruleId]?.title ?? detail.finding.title : detail.finding.title;
}

export function FindingDetail({ detail: d, model, language, onRecheck }: { detail: FindingDetailProjection; model: PrototypeProjection; language: Language; onRecheck?: () => void }) {
  const t = (key: MessageKey) => translate(language, key);
  const ar = ruleArabic[d.finding.ruleId]; const arabic = language === "ar";
  const confirmedEvaluation = d.origin === "RECHECK" ? d.currentEvaluation : d.baselineEvaluation;
  const detectionEvidence = d.origin === "RECHECK" ? d.currentEvidence : d.baselineEvidence;
  const detectionSources = d.origin === "RECHECK" ? model.current.originalSources : model.originalSources;
  const imported = detectionSources.filter((source) => detectionEvidence.some((evidence) => evidence.sourceId === source.sourceId) && source.sourceType !== "SYNTHETIC_AWS_OBSERVATION");
  return <>
    <div className="detail-context"><Technical>{d.finding.ruleId} / v{d.finding.ruleVersion}</Technical><Technical>{d.finding.resourceId}</Technical><span>{d.finding.service}</span><Technical>{d.finding.region}</Technical></div>
    <section className="decision-panel" aria-label={t("decisionRecord")}>
      <div className="decision-intro"><p className="eyebrow">{t("decisionRecord")}</p><p>{t("baselineNote")}</p></div>
      <div className="decision-cell"><span>{t("baseline")}</span><Status value={d.baselineEvaluation?.evaluationState ?? "NO_BASELINE"} language={language} /><small><Technical>{model.baseline.generatedAt.slice(0, 10)}</Technical></small></div>
      <div className="decision-cell"><span>{t("currentProof")}</span><Status value={d.currentEvaluation?.evaluationState ?? "NO_CURRENT"} language={language} /><small>{t(d.evidenceFreshness)}</small><small><Technical>{model.current.generatedAt.slice(0, 10)}</Technical></small></div>
      <div className="decision-cell"><span>{t("remediation")}</span><Status value={d.finding.remediationState} language={language} kind="remediation" /><small>{t(d.verification)}</small></div>
    </section>
    <div className="detail-layout"><div className="detail-main">
      <div className="interpretation-grid">
        <Section title={t("why")}><p>{arabic ? ar?.why : d.finding.whyItMatters}</p><h3>{t("impact")}</h3><p>{t("impactText")}</p></Section>
        <Section title={t("interpretation")}><div className="rationale-heading"><h3>{t("severityWhy")}</h3><Status value={d.finding.severity} language={language} kind="severity" /></div><p>{arabic ? ar?.why : confirmedEvaluation?.severityRationale}</p><div className="rationale-heading"><h3>{t("confidenceWhy")}</h3><Status value={d.finding.confidence} language={language} kind="confidence" /></div><p>{t("confidenceText")}</p></Section>
      </div>
      <Section title={t("evidence")} aside={<span className="section-count">{d.baselineEvidence.length} + {d.currentEvidence.length}</span>}>
        <div className="proof-columns">{(["baseline", "current"] as const).map((snapshot) => <div className="proof-snapshot" key={snapshot}>
          <div className="proof-heading"><h3>{t(snapshot)}</h3><Status value={(snapshot === "baseline" ? d.baselineEvaluation : d.currentEvaluation)?.evaluationState ?? (snapshot === "baseline" ? "NO_BASELINE" : "NO_CURRENT")} language={language} /></div>
          {(snapshot === "baseline" ? d.baselineEvidence : d.currentEvidence).map((evidence, index) => <details className="observation-proof" key={evidence.evidenceId} open={index === 0}>
            <summary><Technical>{evidence.sourceId}</Technical><span className="table-sub"><Technical>{evidence.sourceApi}</Technical></span></summary>
            <p className="observation-date"><Technical>{evidence.observedAt}</Technical></p>
            <div className="observed-facts">{Object.entries(evidence.observedFields).map(([key, value]) => <div className="fact-row" key={key}><Technical>{key}</Technical><code dir="ltr">{JSON.stringify(value)}</code></div>)}{!Object.keys(evidence.observedFields).length && <p className="missing-facts">{t("noFields")}</p>}</div>
            <div className="proof-flags"><Status value={evidence.retrievalState} language={language} /><Status value={evidence.completeness} language={language} /></div>
          </details>)}
          {snapshot === "baseline" && !d.baselineEvidence.length && <p>{t("noBaseline")}</p>}
        </div>)}</div>
        <details className="disclosure"><summary>{t("provenance")}</summary><div className="two-columns"><div><h3>{t("baseline")}</h3><pre dir="ltr">{JSON.stringify(d.baselineEvaluation?.evidenceBindings ?? [], null, 2)}</pre></div><div><h3>{t("current")}</h3><pre dir="ltr">{JSON.stringify(d.currentEvaluation?.evidenceBindings ?? [], null, 2)}</pre></div></div></details>
      </Section>
      {imported.length > 0 && <Section title={t("originalSource")}><div className="enrichment"><div><p>{t("originalExplanation")}</p>
        {imported.map((source) => <details className="disclosure" key={source.sourceId}><summary><Technical>{source.sourceType}</Technical></summary><dl className="metadata-grid"><Meta label={t("source")}><Technical>{source.sourceId}</Technical></Meta><Meta label={t("importer")}><Technical>{source.importerVersion}</Technical></Meta><Meta label={t("date")}><Technical>{source.collectedAt}</Technical></Meta><Meta label={t("version")}><Technical>{source.sourceVersion ?? "UNSPECIFIED"}</Technical></Meta></dl><pre dir="ltr">{JSON.stringify(source.observations, null, 2)}</pre></details>)}</div>
        <div className="enrichment-summary"><h3>{t("enrichment")}</h3><p>{t("addedValue")}</p></div></div></Section>}
      <Section title={t("timeline")}><ol className="timeline">{d.timeline.map((event) => <li key={event.eventId}><span className="timeline-node" aria-hidden="true" /><div><h3>{t(event.eventType === "DETECTED" ? "detected" : event.eventType === "ACKNOWLEDGED" ? "assigned" : "rechecked")}</h3><Technical>{event.eventAt}</Technical><p>{arabic ? event.eventType === "DETECTED" ? ar?.why : event.eventType === "ACKNOWLEDGED" ? t("customerNote") : t(d.verification) : event.description}</p></div></li>)}</ol></Section>
      <div className="limitations"><h3>{t("limitations")}</h3><p>{arabic ? ar?.limitation : d.finding.limitations.join(" ")}</p><p>{t("limitationSummary")}</p></div>
    </div><aside className="operational-record" aria-label={t("operationalRecord")}>
      <div className="operation-heading"><p className="eyebrow">{t("operationalRecord")}</p><Status value={d.finding.remediationState} language={language} kind="remediation" /></div>
      <dl className="operation-ledger"><Meta label={t("owner")}><span className="owner-avatar" aria-hidden="true">{d.action.owner.slice(0, 1)}</span>{d.action.owner}</Meta><Meta label={t("assignment")}>{t("review")}</Meta></dl>
      <h2>{t("recommended")}</h2><p>{arabic ? ar?.action : d.action.actionDescription}</p>
      <div className="verification-condition"><h3>{t("verificationCondition")}</h3><p>{arabic ? ar?.condition : d.action.verificationCondition}</p></div>
      <dl className="operation-ledger"><Meta label={t("verification")}><Status value={d.verification} language={language} kind="verification" /></Meta>{d.finding.resolvedAt && <Meta label={t("verifiedAt")}><Technical>{d.finding.resolvedAt}</Technical></Meta>}</dl>
      {onRecheck && <button className="primary-button" onClick={onRecheck}>{t("reviewRecheck")} <span className="direction-arrow" aria-hidden="true">→</span></button>}
      <p className="operation-note">{t("customerNote")}</p>
      <details className="disclosure"><summary><span className="priority-band">{d.finding.priorityBand}</span> {t("priorityPolicy")}</summary><p>{priorityExplanation(d.finding.priorityRationale, language)}</p></details>
    </aside></div>
  </>;
}
