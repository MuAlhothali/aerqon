import type { ReactNode } from "react";
import { messages, translate, type Language, type MessageKey } from "./i18n";
export function Status({ value, language, kind = "evaluation" }: { value: string; language: Language; kind?: string }) {
  return <span className={`status status-${value.toLowerCase()} status-kind-${kind}`} data-status={value}>
    <span aria-hidden="true" className="status-dot" />{value in messages ? translate(language, value as MessageKey) : value}
  </span>;
}
export function Meta({ label, children }: { label: string; children: ReactNode }) {
  return <div className="meta"><dt>{label}</dt><dd>{children}</dd></div>;
}
export function Section({ title, children, aside }: { title: string; children: ReactNode; aside?: ReactNode }) {
  return <section className="section"><div className="section-heading"><h2>{title}</h2>{aside}</div>{children}</section>;
}
export function Technical({ children }: { children: ReactNode }) { return <bdi className="technical" dir="ltr">{children}</bdi>; }

const iconPaths: Record<string, string> = {
  assessment: "M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z",
  findings: "M12 3 3 7v6c0 4 5 7 9 9 4-2 9-5 9-9V7z M12 8v5 M12 17h.01",
  actions: "M9 5h12 M9 12h12 M9 19h12 M2 5l2 2 3-4 M2 12l2 2 3-4 M2 19l2 2 3-4",
  evidence: "M4 4h16v16H4z M8 8h8 M8 12h8 M8 16h4",
  recheck: "M20 7a9 9 0 0 0-15-2L2 8 M2 3v5h5 M4 17a9 9 0 0 0 15 2l3-3 M22 21v-5h-5",
  reports: "M5 3h10l4 4v14H5z M14 3v5h5 M9 12h6 M9 16h6",
  coverage: "M3 3h18v18H3z M3 9h18 M3 15h18 M9 3v18 M15 3v18",
  settings: "M4 7h16 M4 17h16 M9 4v6 M15 14v6",
};
export function ConsoleIcon({ name }: { name: string }) {
  return <svg className="console-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={iconPaths[name]} /></svg>;
}
