"use client";
import { Fragment, useEffect, useRef, useState } from "react";
import type { FindingDetailProjection, PrototypeProjection } from "../application/prototype-workflow";
import { FindingDetail, findingTitle } from "./finding-detail";
import { ReportView, type ReportKind } from "./report-view";
import { priorityExplanation, ruleArabic, sourceCount, translate, type MessageKey } from "./i18n";
import { AssessmentOverview } from "./assessment-overview";
import { EvidenceExplorer } from "./evidence-explorer";
import { ConsoleIcon, Meta, Section, Status, Technical } from "./primitives";
import { EvidenceDiff } from "./evidence-diff";
import { usePreferences } from "./preferences";
import { EvaluationDistribution, RemediationDistribution, RecheckDistribution, SeverityDistribution } from "./distribution";

const navigation = ["assessment", "findings", "actions", "evidence", "recheck", "reports", "coverage", "settings"] as const;
type View = typeof navigation[number];

export function ProductConsole({ model }: { model: PrototypeProjection }) {
  const { language, theme, update } = usePreferences();
  const t = (key: MessageKey) => translate(language, key);
  const [view, setView] = useState<View>("assessment");
  const [menuOpen, setMenuOpen] = useState(false);
  const [navigationRevision, setNavigationRevision] = useState(0);
  const [detailId, setDetailId] = useState<string>();
  const [query, setQuery] = useState("");
  const [stateFilter, setStateFilter] = useState("all");
  const [serviceFilter, setServiceFilter] = useState("all");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [snapshot, setSnapshot] = useState<"baseline" | "current">("baseline");
  const [includeNA, setIncludeNA] = useState(false);
  const [report, setReport] = useState<ReportKind>("executive");
  const heading = useRef<HTMLHeadingElement>(null);
  const initialView = useRef(true);
  useEffect(() => { document.documentElement.lang = language; document.documentElement.dir = language === "ar" ? "rtl" : "ltr"; document.documentElement.dataset.theme = theme; }, [language, theme]);
  useEffect(() => {
    if (initialView.current) { initialView.current = false; return; }
    heading.current?.focus(); window.scrollTo({ top: 0, behavior: "instant" });
  }, [view, detailId, navigationRevision]);
  function navigate(next: View, selected?: string) {
    setView(next); setDetailId(selected); setMenuOpen(false); setNavigationRevision((value) => value + 1);
  }
  const selected = model.details.find((item) => item.finding.findingId === detailId);
  const filtered = model.actions.filter((item) => {
    const text = [findingTitle(item, language), item.finding.resourceId, item.finding.ruleId].join(" ").toLowerCase();
    return text.includes(query.toLowerCase()) && (stateFilter === "all" || item.finding.remediationState === stateFilter)
      && (serviceFilter === "all" || item.finding.service === serviceFilter) && (severityFilter === "all" || item.finding.severity === severityFilter);
  });
  const projection = model[snapshot];
  const title = view === "findings" && selected ? findingTitle(selected, language) : t(view);
  const openDetail = (item: FindingDetailProjection) => navigate("findings", item.finding.findingId);

  function renderFindingsTable(items: readonly FindingDetailProjection[]) {
    return <div className="table-wrap" role="region" aria-label={t("findings")} tabIndex={0}><table><caption className="sr-only">{t("findings")}: {items.length}</caption><thead><tr>
      <th>{t("priority")}</th><th>{t("findings")} / {t("resource")}</th><th>{t("severity")}</th><th>{t("confidence")}</th><th>{t("baseline")}</th><th>{t("remediation")}</th><th>{t("source")}</th>
    </tr></thead><tbody>{items.map((d) => <tr key={d.finding.findingId}><td><span className="priority-band">{d.finding.priorityBand}</span></td><td><button className="table-link" onClick={() => openDetail(d)}><Technical>{d.finding.ruleId}</Technical> {findingTitle(d, language)}</button><span className="table-sub"><Technical>{d.finding.resourceId}</Technical></span><span className="table-sub">{d.finding.service} · <Technical>{d.finding.region}</Technical></span></td>
      <td><Status value={d.finding.severity} language={language} kind="severity" /></td><td><Status value={d.finding.confidence} language={language} kind="confidence" /></td><td><Status value={d.baselineEvaluation?.evaluationState ?? "NO_BASELINE"} language={language} /></td><td><Status value={d.finding.remediationState} language={language} kind="remediation" /></td><td>{sourceCount(language, new Set((d.origin === "RECHECK" ? d.currentEvidence : d.baselineEvidence).map((e) => e.sourceId)).size)}</td></tr>)}</tbody></table>
      {!items.length && <div className="empty-state"><p>{t("noResults")}</p><button onClick={() => { setQuery(""); setStateFilter("all"); setServiceFilter("all"); setSeverityFilter("all"); }}>{t("clear")}</button></div>}</div>;
  }
  function renderSnapshotControl() { return <div className="segmented" aria-label={t("snapshot")}>{(["baseline", "current"] as const).map((key) => <button key={key} aria-pressed={snapshot === key} onClick={() => setSnapshot(key)}>{t(key)}</button>)}</div>; }

  return <div className="app-shell" dir={language === "ar" ? "rtl" : "ltr"}>
    <a href="#main" className="skip-link">{t("skip")}</a>
    <aside className="sidebar" data-menu-open={menuOpen} onKeyDown={(event) => { if (event.key === "Escape" && menuOpen) { setMenuOpen(false); event.currentTarget.querySelector<HTMLButtonElement>(".mobile-menu-toggle")?.focus(); } }}>
      <div className="brand"><span className="brand-symbol" aria-hidden="true">A</span><div className="wordmark">AERQON<span>CLOUD ASSURANCE</span></div></div>
      <div className="workspace-card"><span className="workspace-avatar" aria-hidden="true">N</span><div><strong>{t("company")}</strong><span>{language === "ar" ? "بيئة تجريبية" : "Synthetic workspace"}</span></div></div>
      <button className="mobile-menu-toggle" aria-expanded={menuOpen} aria-controls="console-navigation" onClick={() => setMenuOpen(!menuOpen)}><ConsoleIcon name={view} />{t(view)}<span>{language === "ar" ? "التنقل" : "Navigation"} {menuOpen ? "−" : "+"}</span></button>
      <nav id="console-navigation" aria-label={t("workspace")}>{[
        { label: language === "ar" ? "المراجعة الأمنية" : "SECURITY REVIEW", items: navigation.slice(0, 3) },
        { label: language === "ar" ? "الأدلة والتحقق" : "EVIDENCE & ASSURANCE", items: navigation.slice(3, 7) },
        { label: language === "ar" ? "مساحة العمل" : "WORKSPACE", items: navigation.slice(7) },
      ].map((group) => <div className="nav-group" key={group.label}><p className="nav-eyebrow">{group.label}</p>{group.items.map((key) => <button key={key} aria-current={view === key ? "page" : undefined} onClick={() => navigate(key)}><ConsoleIcon name={key} /><span>{t(key)}</span>{key === "findings" && <span className="nav-count">{model.details.length}</span>}</button>)}</div>)}</nav>
      <div className="sidebar-footer"><p className="nav-eyebrow">{language === "ar" ? "تفضيلات العرض" : "DISPLAY PREFERENCES"}</p>
        <div className="preferences"><label><span>Language / اللغة</span><select aria-label="Language" value={language} onChange={(e) => update(e.target.value, theme)}><option value="en">English</option><option value="ar">العربية</option></select></label>
          <label><span>{t("theme")}</span><select aria-label={t("theme")} value={theme} onChange={(e) => update(language, e.target.value)}>{(["light", "dark", "system"] as const).map((key) => <option key={key} value={key}>{t(key)}</option>)}</select></label></div>
        <p className="local-classification">{t("offline")}</p>
      </div>
    </aside>
    <div className="workspace"><header className="topbar"><div className="assessment-context"><ConsoleIcon name={view} /><div><strong>{t("workspace")}</strong><span>{t(view)}</span></div></div><span className="read-only-label">{language === "ar" ? "عرض محلي · للقراءة فقط" : "LOCAL PREVIEW / READ ONLY"}</span></header>
    <div className="demo-banner"><strong>DEMO DATA</strong><span>SYNTHETIC ENVIRONMENT</span><span>NOT CUSTOMER DATA</span>{language === "ar" && <span>{t("demo")} · {t("notCustomer")}</span>}</div>
    <main id="main"><div className="page-heading"><div><p className="eyebrow">AERQON / {t("company")}</p><h1 ref={heading} tabIndex={-1}>{title}</h1></div><div className="page-actions">{view === "reports" ? <button className="primary-button" onClick={() => window.print()}>{t("print")} ↗</button> : <button onClick={() => { setReport("package"); navigate("reports"); }}>{t("package")} <span aria-hidden="true">↗</span></button>}</div></div>
    {view === "assessment" && <AssessmentOverview model={model} language={language} onFinding={openDetail} onNavigate={navigate} />}
    {view === "findings" && (selected ? <><button className="back-link" onClick={() => navigate("findings")}><span className="direction-arrow" aria-hidden="true">←</span> {t("back")}</button><FindingDetail detail={selected} model={model} language={language} onRecheck={() => navigate("recheck")} /></> : <>
      <p className="page-intro">{t("priorityIntro")}</p><SeverityDistribution model={model} language={language} /><div className="filter-bar"><label className="search-label"><span className="sr-only">{t("search")}</span><input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("search")} /></label>
        <label>{t("remediation")}<select value={stateFilter} onChange={(e) => setStateFilter(e.target.value)}><option value="all">{t("all")}</option>{["OPEN", "ACKNOWLEDGED", "IN_PROGRESS", "RISK_ACCEPTED", "RESOLVED", "REOPENED"].map((key) => <option key={key} value={key}>{t(key as MessageKey)}</option>)}</select></label>
        <label>{t("service")}<select value={serviceFilter} onChange={(e) => setServiceFilter(e.target.value)}><option value="all">{t("all")}</option>{["EC2", "S3", "RDS"].map((key) => <option key={key}>{key}</option>)}</select></label>
        <label>{t("severity")}<select value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value)}><option value="all">{t("all")}</option>{["HIGH", "MEDIUM", "LOW"].map((key) => <option value={key} key={key}>{t(key as MessageKey)}</option>)}</select></label></div>{renderFindingsTable(filtered)}
    </>)}
    {view === "actions" && <>
      <p className="page-intro">{t("priorityIntro")}</p>
      <RemediationDistribution model={model} language={language} />
      <div className="action-list">{model.actions.filter((item) => item.finding.remediationState !== "RESOLVED").map((d, index) => <section className="action-row" key={d.finding.findingId}>
        <div className="action-number">{String(index + 1).padStart(2, "0")}</div>
        <div>
          <div className="action-title"><span className="priority-band">{d.finding.priorityBand}</span><button className="table-link" onClick={() => openDetail(d)}><Technical>{d.finding.ruleId}</Technical> · {findingTitle(d, language)}</button></div>
          <p className="action-resource"><Technical>{d.finding.resourceId}</Technical> · <Technical>{d.finding.region}</Technical></p>
          <p>{language === "ar" ? ruleArabic[d.finding.ruleId]?.action : d.action.actionDescription}</p>
          <dl className="metadata-grid">
            <Meta label={t("owner")}>{d.action.owner}</Meta>
            <Meta label={t("verificationCondition")}>{language === "ar" ? ruleArabic[d.finding.ruleId]?.condition : d.action.verificationCondition}</Meta>
            <Meta label={t("current") + " · " + t("completeness")}><Status value={d.currentEvaluation?.evidenceCompleteness ?? "INSUFFICIENT"} language={language} /></Meta>
            <Meta label={t("trigger")}>{t("review")}</Meta>
          </dl>
          <details className="disclosure"><summary>{t("priority")}: {t("interpretation")}</summary><p>{priorityExplanation(d.finding.priorityRationale, language)}</p></details>
        </div><Status value={d.action.status} language={language} kind="remediation" />
      </section>)}</div><p className="muted">{t("customerNote")}</p>
    </>}
    {view === "actions" && <details className="disclosure completed-actions"><summary>{t("verifiedOutcomes")} ({model.summary.resolved})</summary>{renderFindingsTable(model.actions.filter((item) => item.finding.remediationState === "RESOLVED"))}</details>}
    {view === "evidence" && <><p className="page-intro">{t("evidenceIntro")}</p>{renderSnapshotControl()}<EvidenceExplorer projection={projection} language={language} findings={model.details} onFinding={openDetail} /></>}
    {view === "recheck" && <><p className="page-intro">{t("recheckIntro")}</p><div className="notice-line">{t("resolutionNote")}</div><RecheckDistribution model={model} language={language} /><div className="comparison-list">{([...model.actions].sort((a, b) => ["VERIFIED_RESOLVED", "STILL_OPEN", "REOPENED", "NEW", "UNABLE_TO_VERIFY"].indexOf(a.verification) - ["VERIFIED_RESOLVED", "STILL_OPEN", "REOPENED", "NEW", "UNABLE_TO_VERIFY"].indexOf(b.verification))).map((d, index, items) => <Fragment key={d.finding.findingId}>{(index === 0 || items[index - 1].verification !== d.verification) && <div className="outcome-group-heading"><h2>{t(d.verification)}</h2><span className="section-count">{items.filter((item) => item.verification === d.verification).length}</span></div>}<section className="comparison" data-outcome={d.verification}><div className="comparison-heading"><div><button className="table-link" onClick={() => openDetail(d)}><Technical>{d.finding.ruleId}</Technical> · {findingTitle(d, language)}</button><p><Technical>{d.finding.resourceId}</Technical></p></div><Status value={d.verification} language={language} kind="verification" /></div><div className="state-comparison"><div><span>{t("baseline")}</span><Status value={d.baselineEvaluation?.evaluationState ?? "NO_BASELINE"} language={language} /><small>{t(d.initialRemediationState)}</small></div><span className="direction-arrow" aria-hidden="true">→</span><div><span>{t("current")}</span><Status value={d.currentEvaluation?.evaluationState ?? "NO_CURRENT"} language={language} /><small>{t(d.evidenceFreshness)}</small><Status value={d.finding.remediationState} language={language} kind="remediation" /></div><div className="comparison-owner"><span>{t("owner")}</span><strong>{d.action.owner}</strong><Technical>v{d.finding.ruleVersion}</Technical></div></div><details className="disclosure"><summary>{t("compare")}</summary><EvidenceDiff before={d.baselineEvidence} after={d.currentEvidence} language={language} /><div className="two-columns"><div><h3>{t("baseline")}</h3>{d.baselineEvidence.map((item) => <pre dir="ltr" key={item.evidenceId}>{item.sourceId + "\n" + item.observedAt + "\n" + JSON.stringify(item.observedFields, null, 2)}</pre>)}</div><div><h3>{t("current")}</h3>{d.currentEvidence.map((item) => <pre dir="ltr" key={item.evidenceId}>{item.sourceId + "\n" + item.observedAt + "\n" + JSON.stringify(item.observedFields, null, 2)}</pre>)}</div></div><p>{t("limitationSummary")}</p></details></section></Fragment>)}</div></>}
    {view === "recheck" && <details className="disclosure"><summary>{t("allComparisons")}</summary><div className="table-wrap" role="region" tabIndex={0} aria-label={t("allComparisons")}><table><caption className="sr-only">{t("allComparisons")}</caption><thead><tr><th>{t("resource")}</th><th>{t("rule")}</th><th>{t("baseline")}</th><th>{t("current")}</th></tr></thead><tbody>{model.comparisons.map((item) => <tr key={item.baseline?.evaluationId ?? item.current?.evaluationId}><td><Technical>{item.resourceId}</Technical></td><td><Technical>{item.ruleId} / {item.version}</Technical></td><td><Status value={item.baseline?.evaluationState ?? "NO_BASELINE"} language={language} /></td><td><Status value={item.current?.evaluationState ?? "NO_CURRENT"} language={language} /></td></tr>)}</tbody></table></div></details>}
    {view === "reports" && <><p className="page-intro">{t("reportsIntro")}</p><div className="report-tabs" aria-label={t("reports")}>{(["executive", "technical", "package", "recheck"] as const).map((key) => <button key={key} aria-pressed={report === key} onClick={() => setReport(key)}>{t(key === "recheck" ? "recheckReport" : key)}</button>)}</div><ReportView model={model} kind={report} language={language} /></>}
    {view === "coverage" && <><p className="page-intro">{t("coverageIntro")}</p>{renderSnapshotControl()}<EvaluationDistribution projection={projection} language={language} /><Section title={t("controlMatrix")} aside={<label className="checkbox-label"><input type="checkbox" checked={includeNA} onChange={(e) => setIncludeNA(e.target.checked)} />{t("NOT_APPLICABLE")}</label>}><div className="table-wrap" tabIndex={0} role="region" aria-label={title}><table><caption className="sr-only">{t("controlMatrix")}</caption><thead><tr><th>{t("resource")}</th><th>{t("rule")}</th><th>{t("evaluation")}</th><th>{t("confidence")}</th></tr></thead><tbody>{projection.evaluations.filter((item) => includeNA || item.evaluationState !== "NOT_APPLICABLE").map((item) => <tr key={item.evaluationId}><td><Technical>{item.resource?.resourceId ?? "—"}</Technical></td><td><Technical>{item.ruleId} / {item.ruleVersion}</Technical></td><td><Status value={item.evaluationState} language={language} /></td><td><Status value={item.confidence} language={language} kind="confidence" /></td></tr>)}</tbody></table></div></Section><div className="limitations"><h3>{t("limitations")}</h3><p>{t("excluded")}</p><p>{t("limitationSummary")}</p></div></>}
    {view === "settings" && <><p className="page-intro">{t("settingsIntro")}</p><Section title={t("overview")}><dl className="metadata-grid"><Meta label="Assessment ID"><Technical>{model.baseline.assessment.assessmentId}</Technical></Meta><Meta label={t("trigger")}>{t("review")}</Meta><Meta label={t("regions")}><Technical>{model.baseline.assessment.regions.join(" · ")}</Technical></Meta><Meta label={t("date")}><Technical>{model.baseline.assessment.assessmentDate}</Technical></Meta></dl></Section><Section title={t("manifest")}><div className="table-wrap" tabIndex={0} role="region" aria-label={title}><table><thead><tr><th>{t("rule")}</th><th>{t("version")}</th><th>{t("service")}</th><th>{t("resource")}</th><th>{t("expected")}</th></tr></thead><tbody>{model.baseline.ruleManifest.map((rule) => <tr key={rule.ruleId}><td><Technical>{rule.ruleId}</Technical></td><td>{rule.version}</td><td>{rule.service}</td><td><Technical>{rule.applicableResourceType}</Technical></td><td><Technical>{rule.requiredEvidence.join(", ")}</Technical></td></tr>)}</tbody></table></div></Section><Section title={t("sourceManifest")}>{model.baseline.sourceManifest.map((source) => <details className="disclosure" key={source.sourceId}><summary>{source.sourceName}</summary><pre dir="ltr">{JSON.stringify(source, null, 2)}</pre></details>)}</Section><p className="muted">{t("localOnly")}</p></>}
    <footer className="app-footer"><span>AERQON Cloud · {t("product")}</span><span>{t("noCloud")}</span></footer></main></div>
  </div>;
}
