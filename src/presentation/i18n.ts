export type Language = "en" | "ar";
export const messages = {
  assessment: ["Assessment", "التقييم"], findings: ["Findings", "الملاحظات الأمنية"], actions: ["Action Plan", "خطة المعالجة"], evidence: ["Evidence", "الأدلة"],
  recheck: ["Recheck", "إعادة التحقق"], reports: ["Reports", "التقارير"], coverage: ["Coverage", "نطاق التغطية"], settings: ["Settings", "الإعدادات"],
  workspace: ["SECURITY WORKSPACE", "مساحة العمل الأمنية"], company: ["Northstar SaaS", "Northstar SaaS"], product: ["Evidence & remediation assurance", "الأدلة الأمنية والتحقق من المعالجة"],
  demo: ["DEMO DATA", "بيانات تجريبية"], synthetic: ["SYNTHETIC ENVIRONMENT", "بيئة اصطناعية"], notCustomer: ["NOT CUSTOMER DATA", "ليست بيانات عملاء"],
  offline: ["Local prototype · no cloud connection", "نموذج محلي · دون اتصال سحابي"], language: ["Language", "اللغة"], theme: ["Theme", "المظهر"], light: ["Light", "فاتح"], dark: ["Dark", "داكن"], system: ["System", "النظام"],
  review: ["Enterprise customer security review", "مراجعة أمنية لعميل مؤسسي"], assessmentTitle: ["Clarity before the next security conversation.", "صورة واضحة قبل المراجعة الأمنية القادمة."],
  assessmentIntro: ["Validated evidence, accountable actions, and a verifiable record of what changed. A synthetic assessment for Northstar SaaS.", "أدلة متحقق منها، ومسؤوليات واضحة، وسجل موثّق للتغييرات. تقييم اصطناعي لشركة Northstar SaaS."],
  snapshot: ["Baseline → recheck", "التقييم الأساسي ← إعادة التحقق"], baseline: ["Baseline", "التقييم الأساسي"], current: ["Current evidence", "الأدلة الحالية"],
  confirmed: ["Confirmed findings", "ملاحظات مؤكدة"], resolved: ["Verified resolved", "تم التحقق من معالجتها"], pending: ["Remaining actions", "إجراءات متبقية"], uncertain: ["Could not verify", "تعذّر التحقق"],
  evidenceCount: ["Normalized observations", "ملاحظات أدلة موحّدة"], sources: ["Sources", "المصادر"], source: ["Source", "المصدر"], resource: ["Resource", "المورد"], service: ["Service", "الخدمة"], region: ["Region", "المنطقة"],
  priority: ["Priority", "الأولوية"], severity: ["Severity", "الشدة"], confidence: ["Confidence", "درجة الثقة"], evaluation: ["Evaluation", "نتيجة التقييم"], remediation: ["Remediation", "حالة المعالجة"], owner: ["Owner", "المسؤول"],
  rule: ["Rule", "القاعدة"], version: ["Version", "الإصدار"], all: ["All", "الكل"], search: ["Search findings or resources", "ابحث عن ملاحظة أو مورد"], noResults: ["No findings match these filters.", "لا توجد ملاحظات مطابقة لهذه المرشحات."], clear: ["Clear filters", "مسح المرشحات"],
  viewAll: ["View all findings", "عرض جميع الملاحظات"], priorityActions: ["Prioritized action plan", "خطة المعالجة حسب الأولوية"], priorityIntro: ["Severity and confidence are separate. Missing business context stays neutral.", "الشدة ودرجة الثقة مستقلتان. السياق التجاري غير المتوفر لا يؤثر في الأولوية."],
  overview: ["Assessment context", "سياق التقييم"], trigger: ["Trigger", "سبب التقييم"], scope: ["Scope", "النطاق"], regions: ["Regions", "المناطق"], date: ["Assessment date", "تاريخ التقييم"], reviewer: ["Reviewer", "المراجع"],
  scopedesc: ["EC2 security groups, S3 buckets and RDS instances. Six versioned configuration controls.", "مجموعات أمان EC2 وحاويات S3 ومثيلات RDS. ست قواعد لإعدادات الأمان بإصدارات محددة."],
  limitations: ["Limitations & remaining unknowns", "القيود وما لم يتم التحقق منه"], limitationSummary: ["Configuration evidence is not proof of end-to-end reachability. Coverage is not a security score or a certification.", "أدلة الإعدادات لا تثبت قابلية الوصول الفعلية. التغطية ليست درجة أمان أو شهادة امتثال."],
  excluded: ["Outside this assessment: IAM, Kubernetes, other cloud providers, workload attachment and end-to-end reachability.", "خارج نطاق التقييم: IAM وKubernetes ومزوّدو السحابة الآخرون وارتباط أحمال العمل وقابلية الوصول الفعلية."],
  back: ["Back to findings", "العودة إلى الملاحظات"], decision: ["Decision summary", "ملخص القرار"], why: ["Why it matters", "لماذا يهم؟"], impact: ["Potential business impact", "الأثر المحتمل على الأعمال"],
  impactText: ["Review in the context of the enterprise security conversation. Business impact is not quantified or inferred from severity.", "تُراجع هذه الملاحظة في سياق المراجعة الأمنية المؤسسية. لا يُقدَّر الأثر التجاري رقميًا ولا يُستنتج من الشدة."],
  interpretation: ["Interpretation", "تفسير الأدلة"], severityWhy: ["Severity rationale", "مبررات الشدة"], confidenceWhy: ["Confidence rationale", "مبررات درجة الثقة"],
  confidenceText: ["Complete validated rule-required observations support the confirmed decision.", "تدعم القرار المؤكد ملاحظات متحقق منها تستوفي الأدلة المطلوبة للقاعدة."],
  recommended: ["Recommended action", "الإجراء الموصى به"], verificationCondition: ["Verification condition", "شرط التحقق من المعالجة"], timeline: ["Evidence timeline", "التسلسل الزمني للأدلة"],
  originalSource: ["Original source", "المصدر الأصلي"], enrichment: ["AERQON operational enrichment", "الإثراء التشغيلي من AERQON"],
  originalExplanation: ["Synthetic imported observations include vendor labels. Labels such as PASS or RESOLVED are not AERQON conclusions.", "تتضمن الملاحظات المستوردة الاصطناعية تصنيفات المزوّد. تصنيفات مثل PASS أو RESOLVED ليست استنتاجات AERQON."],
  addedValue: ["Validated evidence → independent evaluation → owner and action → verification record.", "أدلة متحقق منها ← تقييم مستقل ← مسؤول وإجراء ← سجل تحقق."],
  observed: ["Observed fields", "الحقول المرصودة"], expected: ["Expected fields", "الحقول المطلوبة"], collected: ["Observed at", "وقت الرصد"], completeness: ["Completeness", "اكتمال الأدلة"], retrieval: ["Retrieval", "حالة الاسترجاع"], validation: ["Validation", "حالة التحقق"],
  sourceApi: ["Collection API", "واجهة جمع الأدلة"], provenance: ["Exact provenance", "ترابط الأدلة ومصادرها"], evidenceId: ["Evidence ID", "معرّف الدليل"], importer: ["Importer version", "إصدار محوّل الاستيراد"],
  linked: ["Linked evaluations", "التقييمات المرتبطة"], raw: ["Inspect normalized evidence", "فحص الأدلة الموحّدة"], evidenceIntro: ["Each observation retains its source and collection context. Completeness here is source-declared; evaluations independently check rule-required fields. Imported text is displayed as data, never executed.", "تحتفظ كل ملاحظة بمصدرها وسياق جمعها. الاكتمال هنا كما يصفه المصدر؛ وتتحقق القواعد بصورة مستقلة من الحقول المطلوبة. يُعرض النص المستورد كبيانات ولا يُنفَّذ."],
  recheckIntro: ["A separate recheck snapshot. Observation times determine freshness; baseline evidence is preserved.", "نسخة مستقلة لإعادة التحقق. تحدد أوقات الرصد حداثة الأدلة، وتبقى الأدلة الأساسية محفوظة."],
  compare: ["Compare evidence", "مقارنة الأدلة"], allComparisons: ["All control comparisons", "مقارنة جميع القواعد"], verification: ["Verification result", "نتيجة التحقق"], evidenceDiff: ["Baseline / current observations", "الملاحظات الأساسية / الحالية"],
  resolutionNote: ["Only fresh, compatible PASS evidence can verify resolution. Partial or denied evidence retains the prior remediation state.", "لا تُعتمد المعالجة إلا بأدلة حديثة ومتوافقة بنتيجة PASS. الأدلة الجزئية أو المرفوضة تُبقي حالة المعالجة السابقة."],
  customerNote: ["Customer-reported remediation is not verified resolution.", "الإبلاغ عن المعالجة لا يعني التحقق من اكتمالها."],
  reportsIntro: ["One evidence model. Four views for the security conversation.", "نموذج أدلة واحد. أربعة تقارير تدعم المراجعة الأمنية."], executive: ["Executive Report", "التقرير التنفيذي"], technical: ["Technical Appendix", "الملحق التقني"], package: ["Evidence Package", "حزمة الأدلة"], recheckReport: ["Recheck Report", "تقرير إعادة التحقق"],
  print: ["Print report", "طباعة التقرير"], generated: ["Generated at", "أُنشئ في"], question: ["Security question", "السؤال الأمني"], evidencePackageIntro: ["A traceable record of the question, evidence, action and verified outcome. Synthetic demonstration only; not an audit attestation.", "سجل قابل للتتبع يربط السؤال بالدليل والإجراء والنتيجة المتحقق منها. عرض اصطناعي فقط، وليس إقرار تدقيق."],
  coverageIntro: ["What was observed, what remains uncertain, and what was outside scope. Counts represent resource/control evaluations, not posture percentages.", "ما تم رصده وما بقي غير مؤكد وما كان خارج النطاق. الأعداد تمثل تقييمات الموارد والقواعد، وليست نسبًا للوضع الأمني."],
  controlMatrix: ["Control coverage matrix", "مصفوفة تغطية القواعد"], settingsIntro: ["Read-only prototype configuration. No accounts, credentials or cloud connections.", "إعدادات النموذج للقراءة فقط. لا حسابات أو بيانات اعتماد أو اتصالات سحابية."],
  manifest: ["Rule manifest", "سجل القواعد"], sourceManifest: ["Evidence source manifest", "سجل مصادر الأدلة"], localOnly: ["Preferences are stored locally in this browser. Evidence and workflow are deterministic demo snapshots, not a live service.", "تُحفظ التفضيلات محليًا في هذا المتصفح. الأدلة وسير العمل نسخ تجريبية حتمية وليست خدمة حية."],
  skip: ["Skip to main content", "انتقل إلى المحتوى الرئيسي"], openFinding: ["Open finding", "فتح الملاحظة"], inspect: ["Inspect", "فحص"],
  HIGH: ["High", "مرتفعة"], MEDIUM: ["Medium", "متوسطة"], LOW: ["Low", "منخفضة"], INFO: ["Info", "معلوماتية"], CRITICAL: ["Critical", "حرجة"],
  PASS: ["Pass", "مستوفٍ"], FAIL: ["Fail", "غير مستوفٍ"], UNKNOWN: ["Unknown", "غير معروف"], PARTIAL_EVIDENCE: ["Partial evidence", "أدلة جزئية"], ACCESS_DENIED: ["Access denied", "رُفض الوصول"], NOT_EVALUATED: ["Not evaluated", "لم يُقيَّم"], NOT_APPLICABLE: ["Not applicable", "غير منطبق"],
  OPEN: ["Open", "مفتوحة"], ACKNOWLEDGED: ["Acknowledged", "تمت المراجعة"], IN_PROGRESS: ["In progress", "قيد المعالجة"], RISK_ACCEPTED: ["Risk accepted", "المخاطر مقبولة"], RESOLVED: ["Resolved", "تمت المعالجة"], REOPENED: ["Reopened", "أُعيد فتحها"],
  COMPLETE: ["Complete", "مكتملة"], PARTIAL: ["Partial", "جزئية"], INSUFFICIENT: ["Insufficient", "غير كافية"], RETRIEVED: ["Retrieved", "تم الاسترجاع"], UNAVAILABLE: ["Unavailable", "غير متاحة"], VALID: ["Valid", "صالحة"], INVALID: ["Invalid", "غير صالحة"],
  VERIFIED_RESOLVED: ["Verified resolved", "معالجة متحقق منها"], STILL_OPEN: ["Still open", "لا تزال مفتوحة"], UNABLE_TO_VERIFY: ["Unable to verify", "تعذّر التحقق"],
  detected: ["Finding detected", "رصد الملاحظة الأمنية"], assigned: ["Owner & action assigned", "تحديد المسؤول والإجراء"], rechecked: ["Recheck reviewed", "مراجعة أدلة إعادة التحقق"],
  reviewRecheck: ["Review recheck", "مراجعة إعادة التحقق"], noCloud: ["No customer data or cloud access.", "لا بيانات عملاء ولا وصول إلى السحابة."],
  briefing: ["Security review briefing", "ملخص المراجعة الأمنية"], activeWork: ["Active remediation", "المعالجة الجارية"], verifiedOutcomes: ["Verified outcomes", "نتائج متحقق منها"],
  activeWorkNote: ["Open work, ordered by the domain priority policy. Verified closures are shown separately.", "الإجراءات المتبقية مرتبة وفق سياسة الأولوية. تُعرض المعالجات المتحقق منها بصورة مستقلة."],
  followUp: ["Evidence follow-up", "استكمال الأدلة"], checksNeedEvidence: ["Checks needing evidence", "قواعد تحتاج إلى أدلة"], checkCountNote: ["Control evaluations, not additional findings", "تقييمات قواعد، وليست ملاحظات أمنية إضافية"],
  asOf: ["Verification snapshot", "نسخة التحقق"], observations: ["observations", "ملاحظة أدلة"], observedResources: ["Observed resources", "الموارد المرصودة"], controls: ["Controls", "القواعد"],
  viewVerification: ["View verification", "عرض سجل التحقق"], reviewEvidence: ["Review evidence gaps", "مراجعة نقص الأدلة"], noVerified: ["No verified closures in this snapshot.", "لا توجد معالجات متحقق منها في هذه النسخة."],
  sourceRecord: ["Source record", "سجل المصدر"], normalized: ["Normalized observation", "الملاحظة الموحّدة"], inspector: ["Evidence inspector", "فاحص الأدلة"], selectEvidence: ["Select an observation to inspect its facts and lineage.", "اختر ملاحظة لفحص حقائقها وترابط مصادرها."],
  searchEvidence: ["Search resource, API or source", "ابحث بالمورد أو الواجهة أو المصدر"], allSources: ["All sources", "جميع المصادر"], fields: ["Field", "الحقل"], observedValue: ["Observed value", "القيمة المرصودة"], noFields: ["No fields were retrieved.", "لم تُسترجع أي حقول."],
  sourceDeclared: ["Source-declared completeness", "اكتمال الأدلة بحسب المصدر"], baselineProof: ["Original decision", "القرار عند الرصد"], currentProof: ["Recheck evaluation", "نتيجة إعادة التحقق"],
  decisionRecord: ["Decision record", "سجل القرار"], operationalRecord: ["Remediation record", "سجل المعالجة"], proofChain: ["Evidence trail", "مسار الدليل"], baselineNote: ["The original decision is retained. Current evidence and remediation are separate states.", "يُحفظ القرار الأصلي. نتيجة الأدلة الحالية وحالة المعالجة مستقلتان."],
  viewRaw: ["View raw normalized JSON", "عرض JSON الموحّد"], noBaseline: ["No baseline observation", "لا توجد ملاحظة أساسية"], NEW: ["Newly detected", "مكتشفة حديثًا"], NO_BASELINE: ["No baseline", "لا يوجد تقييم أساسي"],
  verifiedAt: ["Verified at", "وقت التحقق"], priorityPolicy: ["Priority policy", "سياسة الأولوية"], assignment: ["Synthetic assignment", "تكليف تجريبي"],
  FRESH: ["Meets observation freshness check", "تستوفي شرط حداثة الأدلة"], HISTORICAL: ["Historical observations", "ملاحظات تاريخية"], MISSING: ["No matching observations", "لا توجد ملاحظات مطابقة"], NO_CURRENT: ["No recheck evaluation", "لا يوجد تقييم لإعادة التحقق"],
} as const;
export type MessageKey = keyof typeof messages;
export const translate = (language: Language, key: MessageKey) => messages[key][language === "ar" ? 1 : 0];

// Translate the domain's fixed policy vocabulary; never recompute priority.
export function priorityExplanation(rationale: string, language: Language) {
  if (language === "en") return rationale;
  const terms: Record<string, string> = {
    "Confirmed failure": "إخفاق مؤكد", "severity": "الشدة", "confidence": "درجة الثقة",
    "production": "بيئة إنتاج", "external exposure relevance": "صلة بالانكشاف الخارجي", "commercial trigger relevance": "صلة بسبب التقييم التجاري",
    "remediation feasibility": "إمكانية تنفيذ المعالجة", "unavailable (neutral)": "غير متوفر (محايد)", "true": "نعم", "false": "لا",
    "Bands are an internal prioritization heuristic, not a validated risk score.": "الفئات سياسة داخلية لترتيب الأولويات، وليست درجة مخاطر معتمدة.",
    "HIGH": "مرتفعة", "MEDIUM": "متوسطة", "LOW": "منخفضة", "INFO": "معلوماتية", "CRITICAL": "حرجة",
  };
  return Object.entries(terms).reduce((text, [from, to]) => text.replaceAll(from, to), rationale);
}

export const ruleQuestions: Record<string, string> = {
  "SG-001": "Is administrative SSH ingress unrestricted?",
  "SG-002": "Does the security group allow unrestricted all-protocol ingress?",
  "S3-001": "Do the observations confirm the public-exposure rule condition?",
  "S3-002": "Is default bucket encryption configured?",
  "RDS-001": "Is the DB instance configured as publicly accessible?",
  "RDS-002": "Is DB storage encryption enabled?",
};

export function sourceCount(language: Language, count: number): string {
  if (language === "en") return `${count} ${count === 1 ? "source" : "sources"}`;
  if (count === 0) return "لا توجد مصادر";
  if (count === 1) return "مصدر واحد";
  if (count === 2) return "مصدران";
  return `${count} ${count % 100 >= 3 && count % 100 <= 10 ? "مصادر" : "مصدرًا"}`;
}

export const ruleArabic: Record<string, { title: string; action: string; condition: string; why: string; limitation: string; question: string }> = {
  "SG-001": { title: "وصول SSH غير مقيّد", action: "قيّد الوصول الإداري عبر SSH بعناوين الإدارة المعتمدة أو أزل قاعدة الدخول.", condition: "تؤكد أدلة حديثة غياب الوصول إلى TCP/22 من نطاق IPv4 أو IPv6 غير مقيّد.", why: "قد يزيد انكشاف الوصول الإداري عبر SSH من سطح الهجوم.", limitation: "لم يُقيَّم ارتباط أحمال العمل أو قابلية الوصول الفعلية عبر الشبكة.", question: "هل الوصول الإداري عبر SSH غير مقيّد؟" },
  "SG-002": { title: "دخول غير مقيّد لجميع البروتوكولات", action: "قيّد البروتوكولات ونطاقات المصادر بالحد الأدنى اللازم.", condition: "تؤكد إعادة التحقق غياب قاعدة تسمح بجميع البروتوكولات من مصدر غير مقيّد.", why: "السماح غير المقيّد بجميع البروتوكولات يوسّع سطح الهجوم.", limitation: "لا يثبت ذلك ارتباط مورد فعلي أو إمكانية الوصول إليه عبر الإنترنت.", question: "هل تسمح مجموعة الأمان بدخول غير مقيّد لجميع البروتوكولات؟" },
  "S3-001": { title: "مؤشرات وصول عام إلى الحاوية", action: "راجع سياسة الحاوية وضوابط الوصول العام.", condition: "تتوفر أدلة مكتملة لحالة السياسة وحظر الوصول العام، وتكون isPublic مساوية لـfalse.", why: "قد تتيح الحاويات العامة الوصول إلى البيانات.", limitation: "تعطيل حظر الوصول العام وحده لا يثبت أن الحاوية متاحة للعامة.", question: "هل تؤكد الأدلة مؤشرات وصول عام إلى الحاوية؟" },
  "S3-002": { title: "إعداد التشفير الافتراضي للحاوية", action: "اضبط التشفير الافتراضي للحاوية.", condition: "ترصد إعادة التحقق تفعيل التشفير الافتراضي بأدلة مكتملة.", why: "يدعم التشفير الافتراضي متطلبات حماية البيانات.", limitation: "قاعدة اصطناعية مبسطة؛ رفض الوصول لا يعني غياب التشفير.", question: "هل تم ضبط التشفير الافتراضي للحاوية؟" },
  "RDS-001": { title: "تفعيل إعداد الوصول العام لقاعدة البيانات", action: "عطّل إعداد الوصول العام ما لم توجد حاجة معتمدة إليه.", condition: "ترصد إعادة التحقق أن PubliclyAccessible تساوي false.", why: "قد يزيد إعداد الوصول العام من أهمية مراجعة الانكشاف.", limitation: "المثيل مُعدّ للوصول العام؛ لم تثبت قابلية الوصول الفعلية إليه عبر الشبكة.", question: "هل مثيل قاعدة البيانات مُعدّ للوصول العام؟" },
  "RDS-002": { title: "تشفير التخزين غير مفعّل", action: "فعّل تشفير التخزين عبر مسار ترحيل معتمد.", condition: "ترصد إعادة التحقق أن StorageEncrypted تساوي true.", why: "قد يزيد التخزين غير المشفّر من مخاطر البيانات المخزنة.", limitation: "الاستنتاج يتعلق بالإعدادات فقط؛ لم يُستنتج تصنيف البيانات.", question: "هل تشفير تخزين قاعدة البيانات مفعّل؟" },
};
