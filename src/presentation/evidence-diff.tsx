import type { EvidenceObject } from "../domain/types";
import { translate, type Language } from "./i18n";
import { Technical } from "./primitives";

// Display-only comparison. Missing fields remain missing; this never evaluates a rule.
export function compareObservedFields(before: readonly EvidenceObject[], after: readonly EvidenceObject[]) {
  const collect = (items: readonly EvidenceObject[]) => {
    const fields = new Map<string, { api: string; field: string; values: Set<string> }>();
    for (const item of items) for (const [field, value] of Object.entries(item.observedFields)) {
      const key = JSON.stringify([item.sourceApi, field]);
      const entry = fields.get(key) ?? { api: item.sourceApi, field, values: new Set<string>() };
      entry.values.add(JSON.stringify(value)); fields.set(key, entry);
    }
    return fields;
  };
  const baseline = collect(before); const current = collect(after);
  return [...new Set([...baseline.keys(), ...current.keys()])].sort().map((key) => {
    const left = baseline.get(key); const right = current.get(key);
    const a = left ? [...left.values].sort() : undefined;
    const b = right ? [...right.values].sort() : undefined;
    return { key, api: (left ?? right)!.api, field: (left ?? right)!.field, before: a, after: b,
      changed: JSON.stringify(a) !== JSON.stringify(b) };
  });
}

export function EvidenceDiff({ before, after, language }: { before: readonly EvidenceObject[]; after: readonly EvidenceObject[]; language: Language }) {
  const rows = compareObservedFields(before, after);
  const missing = language === "ar" ? "لم يُرصد" : "Not observed";
  const title = language === "ar" ? "مقارنة الحقول المرصودة" : "Observed field comparison";
  return <div className="field-comparison"><h3>{title}</h3><p>{language === "ar" ? "القيم الفريدة لكل واجهة جمع وحقل. غياب الحقل ليس قيمة false. تُحفظ المصادر والأوقات في السجل أدناه." : "Distinct values per collection API and field. An absent field is not false. Source records and timestamps are preserved below."}</p>
    <div className="table-wrap" role="region" tabIndex={0} aria-label={title}><table><thead><tr><th>{translate(language, "observed")}</th><th>{translate(language, "baseline")}</th><th>{translate(language, "current")}</th><th>{language === "ar" ? "التغيير" : "Change"}</th></tr></thead>
      <tbody>{rows.map((row) => <tr key={row.key} className={row.changed ? "field-changed" : undefined}><th scope="row"><Technical>{row.field}</Technical><span className="table-sub"><Technical>{row.api}</Technical></span></th><td>{row.before ? <code dir="ltr">{row.before.join("\n")}</code> : missing}</td><td>{row.after ? <code dir="ltr">{row.after.join("\n")}</code> : missing}</td><td>{row.changed ? language === "ar" ? "مختلف" : "Different" : language === "ar" ? "دون تغيير" : "Unchanged"}</td></tr>)}</tbody></table>{!rows.length && <p className="empty-state">{missing}</p>}</div></div>;
}
