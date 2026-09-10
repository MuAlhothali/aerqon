import type { FindingDetailProjection, PrototypeProjection } from "../application/prototype-workflow";
import type { EvidenceObject, RuleEvaluation } from "../domain/types";
import { findingTitle } from "./finding-detail";
import { ruleArabic, ruleQuestions, translate, type Language, type MessageKey } from "./i18n";
import { Meta, Status, Technical } from "./primitives";

export type ReportKind = "executive" | "technical" | "package" | "recheck";
const copy = {
  executiveIntro: ["A decision brief for the security review: confirmed findings, accountable owners, verified changes and the limits of this assessment.", "موجز لاتخاذ القرار في المراجعة الأمنية: ملاحظات مؤكدة، ومسؤوليات محددة، وتغييرات متحقق منها، وحدود واضحة للتقييم."],
  technicalIntro: ["The evaluation record behind each finding. Rule versions, exact source bindings and normalized observations remain available for engineering review.", "السجل التقني الذي يستند إليه كل استنتاج، مع إصدارات القواعد والروابط الدقيقة للمصادر والملاحظات الموحّدة للمراجعة الهندسية."],
  recheckIntro: ["A preserved baseline and a separate recheck snapshot. Observation times establish freshness. Evaluation changes and remediation outcomes are separate; an inconclusive recheck is not a resolved finding.", "أدلة أساسية محفوظة ونسخة مستقلة للمقارنة؛ وتحدد أوقات الرصد حداثة الأدلة. تُعرض نتائج التقييم والمعالجة بصورة مستقلة، فإعادة التحقق غير الحاسمة لا تعني اكتمال المعالجة."],
  decisionRegister: ["Decisions & accountable actions", "القرارات ومسؤوليات المعالجة"],
  technicalRegister: ["Finding evaluation records", "سجلات تقييم الملاحظات"],
  questionRegister: ["Security questions & supporting conclusions", "الأسئلة الأمنية والأدلة الداعمة للاستنتاجات"],
  recheckRegister: ["Verification outcomes by finding", "نتائج التحقق لكل ملاحظة"],
  coverageLedger: ["Coverage ledger · not a security score", "سجل التغطية · ليس درجة أمان"],
  coverageUnit: ["Counts are resource/control evaluations. Denied, partial and unknown evidence is not a confirmed failure. Not-applicable checks do not expand the assessed scope.", "تمثل الأعداد تقييمات الموارد والقواعد. الأدلة المرفوضة أو الجزئية أو غير المعروفة ليست إخفاقًا مؤكدًا. والقواعد غير المنطبقة لا توسّع النطاق المُقيَّم."],
  outcome: ["Control outcome", "نتيجة القاعدة"], checks: ["Resource/control evaluations", "تقييمات الموارد والقواعد"],
  invalid: ["Validation failures", "حالات تعذّر التحقق من صلاحية البيانات"],
  unknownRegister: ["Uncertainty & intentional exclusions", "ما تعذّر التحقق منه والاستثناءات المقصودة"],
  unknownNote: ["These current outcomes are included even when no finding exists. They must not be read as PASS, FAIL or verified remediation.", "تُدرج هذه النتائج الحالية حتى عندما لا توجد ملاحظة أمنية. ولا يجوز اعتبارها استيفاءً أو إخفاقًا مؤكدًا أو معالجةً متحققًا منها."],
  none: ["No current uncertain or intentionally excluded control outcomes.", "لا توجد حاليًا نتائج غير حاسمة أو قواعد مستثناة قصدًا."],
  evaluated: ["Evaluated at", "وقت التقييم"], binding: ["Evidence → source binding", "رابط الدليل ← المصدر"],
  noBinding: ["No evidence was bound to this evaluation.", "لم يُربط أي دليل بهذا التقييم."],
  missingObservation: ["The bound observation is not present in this report projection.", "الملاحظة المرتبطة غير متاحة ضمن بيانات هذا التقرير."],
  noBaseline: ["Not in baseline", "غير موجود في التقييم الأساسي"], noCurrent: ["No current evaluation", "لا يوجد تقييم حالي"], newFinding: ["New finding", "ملاحظة جديدة"],
  originalTechnical: ["Original technical record · preserved verbatim", "السجل التقني الأصلي · محفوظ دون تغيير"],
  sourceLedger: ["Source collection & importer ledger", "سجل جمع المصادر وإصدارات الاستيراد"], ruleLedger: ["Versioned control register", "سجل القواعد وإصداراتها"],
  inventory: ["Normalized evidence inventory", "سجل الأدلة الموحّدة"],
  inventoryNote: ["Includes every normalized observation in both snapshots, not only evidence attached to findings. Source-declared completeness is distinct from the evaluator’s required-field checks.", "يشمل جميع الملاحظات الموحّدة في النسختين، وليس أدلة الملاحظات الأمنية فقط. اكتمال البيانات كما يصفه المصدر مستقل عن تحقق القاعدة من حقولها المطلوبة."],
  comparisonRegister: ["Applicable control comparison", "مقارنة القواعد المنطبقة"],
  comparisonNote: ["Includes passing controls and uncertainty without creating findings from those outcomes. Not-applicable combinations are counted in the coverage ledger.", "تشمل المقارنة القواعد المستوفاة والنتائج غير الحاسمة دون إنشاء ملاحظات أمنية منها. تُحتسب التركيبات غير المنطبقة في سجل التغطية."],
  records: ["Finding records", "سجلات الملاحظات"], assessmentId: ["Assessment ID", "معرّف التقييم"], findingId: ["Finding ID", "معرّف الملاحظة"],
  evaluationId: ["Evaluation ID", "معرّف التقييم التقني"], sourceType: ["Source type", "نوع المصدر"], collectedAt: ["Collection timestamp", "وقت جمع البيانات"],
  condition: ["Required evidence", "الأدلة المطلوبة"], diagnostic: ["Diagnostic reference", "المرجع التشخيصي"],
  workflowChange: ["Remediation state retained or verified", "حالة المعالجة المحفوظة أو المتحقق منها"],
} as const;
type CopyKey = keyof typeof copy;
const text = (language: Language, key: CopyKey) => copy[key][language === "ar" ? 1 : 0];
const states = ["PASS", "FAIL", "UNKNOWN", "PARTIAL_EVIDENCE", "ACCESS_DENIED", "NOT_EVALUATED", "NOT_APPLICABLE"] as const;
const snapshots = ["baseline", "current"] as const;

function CoverageLedger({ model, language }: { model: PrototypeProjection; language: Language }) {
  const t = (key: MessageKey) => translate(language, key);
  const uncertain = model.current.evaluations.filter((evaluation) => !["PASS", "FAIL", "NOT_APPLICABLE"].includes(evaluation.evaluationState));
  return <section className="report-section"><h3>{text(language, "coverageLedger")}</h3><p className="report-note">{text(language, "coverageUnit")}</p>
    <div className="report-table-wrap" role="region" aria-label={text(language, "coverageLedger")} tabIndex={0}><table className="report-table">
      <thead><tr><th scope="col">{text(language, "outcome")}</th><th scope="col">{t("baseline")}</th><th scope="col">{t("current")}</th></tr></thead>
      <tbody>{states.map((state) => <tr key={state}><th scope="row">{t(state)}</th><td>{model.baseline.coverage.counts[state]}</td><td>{model.current.coverage.counts[state]}</td></tr>)}
        <tr><th scope="row">{text(language, "checks")}</th><td>{model.baseline.coverage.total}</td><td>{model.current.coverage.total}</td></tr>
        <tr><th scope="row">{text(language, "invalid")}</th><td>{model.baseline.coverage.validationFailures}</td><td>{model.current.coverage.validationFailures}</td></tr></tbody>
    </table></div><h4>{text(language, "unknownRegister")}</h4><p className="report-note">{text(language, "unknownNote")}</p>
    {uncertain.length ? <div className="report-table-wrap" role="region" aria-label={text(language, "unknownRegister")} tabIndex={0}><table className="report-table">
      <thead><tr><th scope="col">{t("resource")}</th><th scope="col">{t("rule")}</th><th scope="col">{t("evaluation")}</th><th scope="col">{text(language, "diagnostic")}</th></tr></thead>
      <tbody>{uncertain.map((evaluation) => <tr key={evaluation.evaluationId}><th scope="row"><Technical>{evaluation.resource?.resourceId ?? "—"}</Technical></th>
        <td><Technical>{evaluation.ruleId} v{evaluation.ruleVersion}</Technical></td><td>{t(evaluation.evaluationState)}</td><td><Technical>{evaluation.diagnosticCode}</Technical></td></tr>)}</tbody>
    </table></div> : <p>{text(language, "none")}</p>}</section>;
}

function ExactIdentifier({ label, value }: { label: string; value: string }) {
  return <details className="report-identity"><summary>{label}</summary><div><Technical>{value}</Technical></div></details>;
}

function EvaluationRecord({ evaluation, evidence, language, snapshot }: { evaluation?: RuleEvaluation; evidence: readonly Readonly<EvidenceObject>[]; language: Language; snapshot: "baseline" | "current" }) {
  const t = (key: MessageKey) => translate(language, key);
  return <section className="report-proof"><h5>{t(snapshot)}</h5>{evaluation ? <>
    <ExactIdentifier label={text(language, "evaluationId")} value={evaluation.evaluationId} />
    <dl className="report-fields">
      <Meta label={text(language, "evaluated")}><Technical>{evaluation.evaluatedAt}</Technical></Meta><Meta label={t("completeness")}>{t(evaluation.evidenceCompleteness)}</Meta>
      <Meta label={text(language, "diagnostic")}><Technical>{evaluation.diagnosticCode}</Technical></Meta></dl>
    <p className="report-kicker">{text(language, "originalTechnical")}</p><p dir="ltr" className="report-provenance">{evaluation.rationale}</p>
    <h6>{text(language, "binding")}</h6>{evaluation.evidenceBindings.length ? evaluation.evidenceBindings.map((binding) => {
      const observation = evidence.find((item) => item.evidenceId === binding.evidenceId && item.sourceId === binding.sourceId);
      return <div className="report-evidence" key={JSON.stringify([binding.evidenceId, binding.sourceId])}><p className="report-provenance"><Technical>{binding.evidenceId}</Technical><br /><Technical>{binding.sourceId}</Technical></p>
        {observation ? <><p><Technical>{observation.sourceApi} · {observation.observedAt}</Technical></p><pre dir="ltr">{JSON.stringify(observation.observedFields, null, 2)}</pre></> : <p>{text(language, "missingObservation")}</p>}</div>;
    }) : <p>{text(language, "noBinding")}</p>}
  </> : <p>{text(language, snapshot === "baseline" ? "noBaseline" : "noCurrent")}</p>}</section>;
}

function FindingRecord({ detail: d, kind, language, index }: { detail: FindingDetailProjection; kind: ReportKind; language: Language; index: number }) {
  const t = (key: MessageKey) => translate(language, key);
  const localized = ruleArabic[d.finding.ruleId];
  const confirmedEvaluation = d.origin === "RECHECK" ? d.currentEvaluation : d.baselineEvaluation;
  return <section className="report-item" aria-label={`${d.finding.ruleId} ${d.finding.resourceId}`}>
    <div className="section-heading"><div><span className="report-index">{String(index + 1).padStart(2, "0")}</span><h4><Technical>{d.finding.ruleId}</Technical> · {findingTitle(d, language)}</h4></div><Status value={d.finding.remediationState} language={language} kind="remediation" /></div>
    <p className="report-control-ref"><Technical>{d.finding.resourceId} · {d.finding.region} · v{d.finding.ruleVersion}</Technical></p>
    {kind === "package" && <p className="report-decision"><strong>{t("question")}: </strong>{language === "ar" ? localized?.question : ruleQuestions[d.finding.ruleId]}</p>}
    <dl className="report-fields"><Meta label={t("baseline")}>{d.baselineEvaluation ? <Status value={d.baselineEvaluation.evaluationState} language={language} /> : text(language, "noBaseline")}</Meta>
      <Meta label={t("recheck")}>{d.currentEvaluation ? <Status value={d.currentEvaluation.evaluationState} language={language} /> : text(language, "noCurrent")}</Meta>
      <Meta label={t("verification")}>{d.verification === "NEW" ? text(language, "newFinding") : t(d.verification)}</Meta><Meta label={t("owner")}>{d.action.owner}</Meta>
      {kind !== "executive" && <><Meta label={t("severity")}>{t(d.finding.severity)}</Meta><Meta label={t("confidence")}>{t(d.finding.confidence)}</Meta></>}</dl>
    <p><strong>{t("recommended")}: </strong>{language === "ar" ? localized?.action : d.action.actionDescription}</p>
    <p><strong>{t("verificationCondition")}: </strong>{language === "ar" ? localized?.condition : d.action.verificationCondition}</p>
    {kind === "technical" && <div className="report-decision"><p className="report-kicker">{text(language, "originalTechnical")}</p>
      <h5>{t("severityWhy")}</h5><p dir="ltr">{confirmedEvaluation?.severityRationale}</p><h5>{t("confidenceWhy")}</h5><p dir="ltr">{confirmedEvaluation?.confidenceRationale}</p></div>}
    {kind === "recheck" && <div className="report-decision"><h5>{text(language, "workflowChange")}</h5><p>{t(d.initialRemediationState)} <span aria-hidden="true">{language === "ar" ? "←" : "→"}</span> {t(d.finding.remediationState)}</p><p>{t(d.evidenceFreshness)}</p>
      <h5>{t("timeline")}</h5><ol className="report-timeline">{d.timeline.map((event) => <li key={event.eventId}><Technical>{event.eventAt} · {event.eventType}</Technical><p dir="ltr">{event.description}</p></li>)}</ol></div>}
    {kind !== "executive" && <><ExactIdentifier label={text(language, "findingId")} value={d.finding.findingId} />
      <div className="report-proof-grid"><EvaluationRecord evaluation={d.baselineEvaluation} evidence={d.baselineEvidence} language={language} snapshot="baseline" /><EvaluationRecord evaluation={d.currentEvaluation} evidence={d.currentEvidence} language={language} snapshot="current" /></div></>}
    <p className="report-limitation"><strong>{t("limitations")}: </strong>{language === "ar" ? localized?.limitation : d.finding.limitations.join(" ")}</p>
  </section>;
}

function SourceAndEvidenceRegister({ model, language }: { model: PrototypeProjection; language: Language }) {
  const t = (key: MessageKey) => translate(language, key);
  return <><section className="report-section"><h3>{text(language, "sourceLedger")}</h3><p>{t("originalExplanation")}</p>
    {snapshots.map((snapshot) => <section key={snapshot}><h4>{t(snapshot)}</h4><div className="report-table-wrap" role="region" aria-label={`${text(language, "sourceLedger")} · ${t(snapshot)}`} tabIndex={0}><table className="report-table">
      <thead><tr><th scope="col">{t("source")}</th><th scope="col">{text(language, "sourceType")}</th><th scope="col">{t("version")} / {t("importer")}</th><th scope="col">{text(language, "collectedAt")}</th></tr></thead>
      <tbody>{model[snapshot].sourceManifest.map((source) => <tr key={source.sourceId}><th scope="row"><Technical>{source.sourceName}</Technical><br /><Technical>{source.sourceId}</Technical></th>
        <td><Technical>{source.sourceType}</Technical></td><td><Technical>{source.sourceVersion} / {source.importerVersion}</Technical></td><td><Technical>{source.collectedAt}</Technical></td></tr>)}</tbody></table></div></section>)}
    </section><section className="report-section"><h3>{text(language, "ruleLedger")}</h3><div className="report-table-wrap" role="region" aria-label={text(language, "ruleLedger")} tabIndex={0}><table className="report-table">
      <thead><tr><th scope="col">{t("rule")}</th><th scope="col">{t("service")}</th><th scope="col">{text(language, "condition")}</th></tr></thead>
      <tbody>{model.current.ruleManifest.map((rule) => <tr key={rule.ruleId}><th scope="row"><Technical>{rule.ruleId} v{rule.version}</Technical><br />{language === "ar" ? ruleArabic[rule.ruleId]?.title : rule.title}</th>
        <td><Technical>{rule.service}</Technical></td><td><Technical>{rule.requiredEvidence.join(" · ")}</Technical></td></tr>)}</tbody></table></div></section>
    <section className="report-section"><h3>{text(language, "inventory")}</h3><p className="report-note">{text(language, "inventoryNote")}</p>
      {snapshots.map((snapshot) => <section key={snapshot}><h4>{t(snapshot)} · {model[snapshot].normalizedEvidenceCount}</h4>
        {model[snapshot].evidence.map((observation) => <section className="report-proof" key={observation.evidenceId} aria-label={`${t(snapshot)} ${observation.resourceId} ${observation.sourceApi}`}>
          <h5><Technical>{observation.resourceId} · {observation.sourceApi}</Technical></h5><p className="report-provenance"><Technical>{observation.evidenceId}</Technical><br /><Technical>{observation.sourceId} · {observation.observedAt}</Technical></p>
          <dl className="report-fields"><Meta label={t("region")}><Technical>{observation.region}</Technical></Meta><Meta label={t("completeness")}>{t(observation.completeness)}</Meta>
            <Meta label={t("retrieval")}>{t(observation.retrievalState)}</Meta><Meta label={t("validation")}>{t(observation.validationState)}</Meta></dl>
          <p><strong>{t("expected")}: </strong><Technical>{observation.expectedFields.join(" · ")}</Technical></p><pre dir="ltr">{JSON.stringify(observation.observedFields, null, 2)}</pre>
          {observation.limitations.length > 0 && <p className="report-limitation" dir="ltr">{observation.limitations.join(" ")}</p>}
        </section>)}
      </section>)}
    </section></>;
}

function ComparisonRegister({ model, language }: { model: PrototypeProjection; language: Language }) {
  const t = (key: MessageKey) => translate(language, key);
  const applicable = model.comparisons.filter((comparison) => [comparison.baseline, comparison.current].some((evaluation) => evaluation && evaluation.evaluationState !== "NOT_APPLICABLE"));
  return <section className="report-section"><h3>{text(language, "comparisonRegister")}</h3><p className="report-note">{text(language, "comparisonNote")}</p>
    <div className="report-table-wrap" role="region" aria-label={text(language, "comparisonRegister")} tabIndex={0}><table className="report-table">
      <thead><tr><th scope="col">{t("resource")}</th><th scope="col">{t("rule")}</th><th scope="col">{t("baseline")}</th><th scope="col">{t("current")}</th></tr></thead>
      <tbody>{applicable.map((comparison) => <tr key={comparison.baseline?.evaluationId ?? comparison.current?.evaluationId}><th scope="row"><Technical>{comparison.resourceId}</Technical></th>
        <td><Technical>{comparison.ruleId} v{comparison.version}</Technical></td><td>{comparison.baseline ? t(comparison.baseline.evaluationState) : text(language, "noBaseline")}</td><td>{comparison.current ? t(comparison.current.evaluationState) : text(language, "noCurrent")}</td></tr>)}</tbody>
    </table></div></section>;
}

export function ReportView({ model, kind, language }: { model: PrototypeProjection; kind: ReportKind; language: Language }) {
  const t = (key: MessageKey) => translate(language, key);
  const report = model.reports.find((item) => item.id === kind)!;
  const title = t(kind === "recheck" ? "recheckReport" : kind);
  const findings = (kind === "executive" ? model.actions : model.details).filter((detail) => report.findingIds.includes(detail.finding.findingId));
  const intro = kind === "package" ? t("evidencePackageIntro") : text(language, `${kind}Intro`);
  const register = { executive: "decisionRegister", technical: "technicalRegister", package: "questionRegister", recheck: "recheckRegister" } as const;
  return <article className={`report-document report-${kind}`} aria-label={title}>
    <header className="report-header"><div><span className="wordmark">AERQON<span> / CLOUD</span></span><p>{t("company")} · {t("review")}</p></div><div className="report-classification">DEMO DATA<br />SYNTHETIC ENVIRONMENT<br />NOT CUSTOMER DATA</div></header>
    <p className="eyebrow">{t("product")}</p><h2>{title}</h2><p className="report-intro">{intro}</p>
    <dl className="metadata-grid"><Meta label={text(language, "assessmentId")}><Technical>{model.baseline.assessment.assessmentId}</Technical></Meta><Meta label={t("generated")}><Technical>{report.generatedAt}</Technical></Meta>
      <Meta label={t("baseline")}><Technical>{model.baseline.generatedAt}</Technical></Meta><Meta label={t("scope")}>{t("scopedesc")}</Meta></dl>
    <div className="report-summary"><div><strong>{findings.length}</strong><span>{text(language, "records")}</span></div><div><strong>{model.summary.resolved}</strong><span>{t("resolved")}</span></div><div><strong>{model.summary.open + model.summary.inProgress + model.summary.reopened}</strong><span>{t("pending")}</span></div></div>
    <p className="report-note">{t("resolutionNote")}</p><section className="report-section"><h3 className="report-section-title">{text(language, register[kind])}</h3>
      {findings.map((detail, index) => <FindingRecord key={detail.finding.findingId} detail={detail} kind={kind} language={language} index={index} />)}</section>
    <CoverageLedger model={model} language={language} />{(kind === "technical" || kind === "recheck") && <ComparisonRegister model={model} language={language} />}
    {kind === "package" && <SourceAndEvidenceRegister model={model} language={language} />}
    <footer className="report-footer"><p>{t("limitationSummary")}</p><p>{t("excluded")}</p><strong>DEMO DATA · SYNTHETIC ENVIRONMENT · NOT CUSTOMER DATA</strong></footer>
  </article>;
}
