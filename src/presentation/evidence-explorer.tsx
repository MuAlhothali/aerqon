"use client";
import { useState } from "react";
import type { AssessmentProjection } from "../application/assessment-projection";
import { translate, type Language, type MessageKey } from "./i18n";
import { Meta, Status, Technical } from "./primitives";
import type { FindingDetailProjection } from "../application/prototype-workflow";
import { EvidenceDistribution } from "./distribution";

export function EvidenceExplorer({ projection, language, findings = [], onFinding }: { projection: AssessmentProjection; language: Language; findings?: readonly FindingDetailProjection[]; onFinding?: (detail: FindingDetailProjection) => void }) {
  const t = (key: MessageKey) => translate(language, key);
  const [query, setQuery] = useState("");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [selectedId, setSelectedId] = useState<string>();
  const visibleSourceFilter = projection.sourceManifest.some((source) => source.sourceId === sourceFilter) ? sourceFilter : "all";
  const filtered = projection.evidence.filter((item) => (visibleSourceFilter === "all" || item.sourceId === visibleSourceFilter)
    && [item.resourceId, item.sourceId, item.sourceApi, item.service].join(" ").toLowerCase().includes(query.toLowerCase()));
  const selected = filtered.find((item) => item.evidenceId === selectedId) ?? filtered[0];
  const source = projection.sourceManifest.find((item) => item.sourceId === selected?.sourceId);
  return <>
    <EvidenceDistribution projection={projection} language={language} />
    <div className="filter-bar evidence-filters"><label className="search-label"><span>{t("searchEvidence")}</span><input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("searchEvidence")} /></label>
      <label>{t("source")}<select aria-label={t("source")} value={visibleSourceFilter} onChange={(e) => setSourceFilter(e.target.value)}><option value="all">{t("allSources")}</option>{projection.sourceManifest.map((item) => <option key={item.sourceId} value={item.sourceId}>{item.sourceId}</option>)}</select></label><span className="result-count">{filtered.length} / {projection.evidence.length} {t("observations")}</span></div>
    <div className="evidence-workbench">
      <div className="table-wrap evidence-index" tabIndex={0} role="region" aria-label={t("evidence")}><table><caption className="sr-only">{t("evidence")}</caption><thead><tr><th>{t("resource")} / {t("sourceApi")}</th><th>{t("retrieval")}</th></tr></thead><tbody>{filtered.map((item) => <tr key={item.evidenceId} className={selected?.evidenceId === item.evidenceId ? "selected-row" : undefined}>
        <td><button className="table-link" aria-pressed={selected?.evidenceId === item.evidenceId} onClick={() => setSelectedId(item.evidenceId)}><Technical>{item.resourceId}</Technical></button><span className="table-sub"><Technical>{item.sourceApi}</Technical></span><span className="table-sub"><Technical>{item.sourceId}</Technical></span></td><td><Status value={item.retrievalState} language={language} /></td>
      </tr>)}</tbody></table>{!filtered.length && <div className="empty-state"><p>{t("selectEvidence")}</p><button onClick={() => { setQuery(""); setSourceFilter("all"); }}>{t("clear")}</button></div>}</div>
      <section className="evidence-inspector" aria-label={t("inspector")} aria-live="polite">
        {selected ? <>
          <div className="inspector-heading"><p className="eyebrow">{t("normalized")}</p><h2><Technical>{selected.resourceId}</Technical></h2><p><Technical>{selected.sourceApi}</Technical></p></div>
          <dl className="inspector-ledger"><Meta label={t("retrieval")}><Status value={selected.retrievalState} language={language} /></Meta><Meta label={t("sourceDeclared")}><Status value={selected.completeness} language={language} /></Meta><Meta label={t("region")}><Technical>{selected.region}</Technical></Meta><Meta label={t("collected")}><Technical>{selected.observedAt}</Technical></Meta></dl>
          <h3>{t("observed")}</h3><div className="observed-facts">{Object.entries(selected.observedFields).map(([key, value]) => <div className="fact-row" key={key}><Technical>{key}</Technical><code dir="ltr">{JSON.stringify(value)}</code></div>)}{!Object.keys(selected.observedFields).length && <p className="missing-facts">{t("noFields")}</p>}</div>
          <div className="lineage-heading"><p className="eyebrow">{language === "ar" ? "مسار الاستنتاج" : "CONCLUSION LINEAGE"}</p><h3>{t("linked")}</h3><p><Technical>{selected.sourceId}</Technical> <span className="direction-arrow" aria-hidden="true">→</span> {t("normalized")} <span className="direction-arrow" aria-hidden="true">→</span> {t("evaluation")}</p></div>
          <div className="linked-evaluations">{projection.evaluations.filter((item) => item.evidenceIds.includes(selected.evidenceId)).map((item) => {
            const linked = findings.find((d) => d.baselineEvaluation?.evaluationId === item.evaluationId || d.currentEvaluation?.evaluationId === item.evaluationId);
            return <div key={item.evaluationId}><Technical>{item.ruleId} / v{item.ruleVersion}</Technical><Status value={item.evaluationState} language={language} />{linked && onFinding ? <button className="text-link" onClick={() => onFinding(linked)}>{language === "ar" ? "فتح الملاحظة المرتبطة" : "Open linked finding"} <span className="direction-arrow" aria-hidden="true">→</span></button> : <span className="table-sub">{language === "ar" ? "لا يوجد سجل ملاحظة مرتبط" : "No linked finding record"}</span>}</div>;
          })}</div>
          <details className="disclosure"><summary>{t("provenance")}</summary><dl className="inspector-ledger"><Meta label={t("evidenceId")}><Technical>{selected.evidenceId}</Technical></Meta><Meta label={t("source")}><Technical>{selected.sourceId}</Technical></Meta><Meta label={t("sourceRecord")}><Technical>{source?.sourceType}</Technical></Meta><Meta label={t("importer")}><Technical>{source?.importerVersion}</Technical></Meta><Meta label={t("expected")}><Technical>{selected.expectedFields.join(", ")}</Technical></Meta><Meta label={t("validation")}><Status value={selected.validationState} language={language} /></Meta></dl></details>
          <details className="disclosure"><summary>{t("viewRaw")}</summary><pre dir="ltr">{JSON.stringify(selected, null, 2)}</pre></details>
          <div className="limitations"><h3>{t("limitations")}</h3><p>{selected.limitations.join(" ")}</p></div>
        </> : <p>{t("selectEvidence")}</p>}
      </section>
    </div>
  </>;
}
