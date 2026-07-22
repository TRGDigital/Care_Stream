// ─── Phase 2a: curated policy stale-signal reference ─────────────────────────────
//
// A precision-first catalogue of DETERMINISTIC signals that a UK adult-social-care policy
// is out of date or low quality. Every text signal is plain pattern matching — NO AI, NO
// vectors, NO credits — so the lint engine (Phase 2b) can scan the whole library for free.
//
// Curated and validated against Ferndale's real (anonymised) 320-policy library.
//
// PRECISION RULE (learned the hard way): an acronym is matched CASE-SENSITIVELY as a whole
// uppercase word, never case-insensitively. Case-insensitive "LINks" matched the ordinary word
// "links" in 30 policies — a pure false positive. Full descriptive phrases (e.g. "key lines of
// enquiry") are safe case-insensitive because they are not ordinary words. So each signal
// carries two optional detectors:
//   phrases  — full phrases, case-insensitive
//   acronyms — acronym forms, matched case-sensitively (uppercase, whole word)
// A signal fires if EITHER detector matches.
//
// Review currency is NOT read from the text (that flagged 96% — useless); it is computed from
// the policy's DB fields (last_reviewed_at / review_interval_days) — see METADATA_SIGNALS.
//
// Keep this catalogue conservative. A false "this policy is stale" erodes trust faster than a
// missed one — the same lesson that moved gap COVERAGE off name-matching onto content.

export type LintSeverity = 'high' | 'medium' | 'low'

export type LintCategory =
  | 'superseded_legislation'
  | 'superseded_body'
  | 'superseded_framework'
  | 'time_bound'
  | 'placeholder'
  | 'structure'
  | 'review_currency'
  | 'advisory_note'          // located + explained in the preview, but nothing to action (context only)

export interface TextSignal {
  id:            string
  category:      LintCategory
  severity:      LintSeverity
  label:         string          // shown to the admin — what was found
  detail:        string          // why it matters
  phrases?:      RegExp          // full-phrase detector, case-insensitive (phrases aren't common words)
  acronyms?:     string[]        // acronym forms, matched CASE-SENSITIVELY as whole uppercase words
  supersededBy?: string          // the current term/framework to replace it with
  sourceUrls?:   string[]        // authoritative page(s) evidencing the change (shown to tenants)
}

// ── Superseded legislation, regulators and frameworks ────────────────────────────
// A policy still presenting any of these as current guidance is, by definition, out of date.
export const TEXT_SIGNALS: TextSignal[] = [
  // Frameworks / standards -------------------------------------------------------
  {
    id: 'cqc-kloe',
    category: 'superseded_framework', severity: 'high',
    label: 'Refers to CQC Key Lines of Enquiry (KLOEs)',
    detail: 'The KLOEs were replaced by the CQC Single Assessment Framework and its quality statements in 2023. A policy still citing KLOEs describes an inspection model that no longer exists.',
    phrases: /key lines? of enquiry/i, acronyms: ['KLOE', 'KLOEs'],
    supersededBy: 'CQC Single Assessment Framework (quality statements)',
  },
  {
    id: 'cqc-essential-standards',
    category: 'superseded_framework', severity: 'high',
    label: 'Refers to CQC Essential Standards / numbered Outcomes',
    detail: 'The "Essential Standards of Quality and Safety" and the numbered Outcomes framework were replaced by the Fundamental Standards (2015) and now the Single Assessment Framework.',
    phrases: /essential standards of quality|\boutcome (7|8|9|1[0-9]|2[01])\b/i, acronyms: [],
    supersededBy: 'Fundamental Standards / CQC Single Assessment Framework',
  },
  {
    id: 'national-minimum-standards',
    category: 'superseded_framework', severity: 'high',
    label: 'Refers to National Minimum Standards',
    detail: 'The Care Homes National Minimum Standards were superseded by the Health and Social Care Act 2008 (Regulated Activities) Regulations and the Fundamental Standards.',
    phrases: /national minimum standards/i,
    supersededBy: 'Health and Social Care Act 2008 (Regulated Activities) Regulations 2014',
  },
  {
    id: 'cqc-star-ratings',
    category: 'superseded_framework', severity: 'medium',
    label: 'Refers to CSCI star ratings (e.g. "three-star" service)',
    detail: 'The old CSCI 0–3 star quality ratings were discontinued in 2010. CQC now uses Outstanding / Good / Requires improvement / Inadequate.',
    phrases: /(zero|one|two|three)[- ]star (rating|service|home)|star rating system/i,
    supersededBy: 'CQC ratings (Outstanding / Good / Requires improvement / Inadequate)',
  },
  {
    id: 'common-induction-standards',
    category: 'superseded_framework', severity: 'high',
    label: 'Refers to the Common Induction Standards',
    detail: 'Skills for Care’s Common Induction Standards were replaced by the Care Certificate in 2015.',
    phrases: /common induction standards/i, acronyms: ['CIS'],
    supersededBy: 'The Care Certificate',
  },
  {
    id: 'nvq-qcf',
    category: 'superseded_framework', severity: 'low',
    label: 'Refers to NVQ / QCF qualifications',
    detail: 'NVQs and the Qualifications and Credit Framework (QCF) were replaced by the Regulated Qualifications Framework (RQF) and the Diplomas in Health and Social Care from 2015.',
    phrases: /national vocational qualification|qualifications and credit framework/i, acronyms: ['NVQ', 'NVQs', 'QCF'],
    supersededBy: 'RQF Diploma in Health and Social Care',
  },

  // Legislation ------------------------------------------------------------------
  {
    id: 'dpa-1998',
    category: 'superseded_legislation', severity: 'high',
    label: 'Refers to the Data Protection Act 1998',
    detail: 'The Data Protection Act 1998 was replaced by the Data Protection Act 2018 and the UK GDPR.',
    phrases: /data protection act 1998/i,
    supersededBy: 'Data Protection Act 2018 / UK GDPR',
  },
  {
    id: 'dpa-1984',
    category: 'superseded_legislation', severity: 'high',
    label: 'Refers to the Data Protection Act 1984',
    detail: 'The Data Protection Act 1984 is two generations out of date, replaced by the 1998 Act and then the Data Protection Act 2018 / UK GDPR.',
    phrases: /data protection act 1984/i,
    supersededBy: 'Data Protection Act 2018 / UK GDPR',
  },
  {
    id: 'equality-act-predecessors',
    category: 'superseded_legislation', severity: 'high',
    label: 'Refers to the Disability Discrimination Act / other pre-2010 equality law',
    detail: 'The Disability Discrimination Act, Race Relations Act and Sex Discrimination Act were consolidated into and repealed by the Equality Act 2010.',
    phrases: /disability discrimination act|race relations act|sex discrimination act/i, acronyms: ['DDA'],
    supersededBy: 'Equality Act 2010',
  },
  {
    id: 'no-secrets',
    category: 'superseded_legislation', severity: 'high',
    label: 'Relies on the "No Secrets" (2000) guidance',
    detail: 'The "No Secrets" adult safeguarding guidance was superseded by the statutory safeguarding duties in the Care Act 2014.',
    phrases: /\bno secrets\b/i,
    supersededBy: 'Care Act 2014 (safeguarding duties)',
  },
  {
    id: 'fire-precautions-act',
    category: 'superseded_legislation', severity: 'high',
    label: 'Refers to the Fire Precautions Act 1971',
    detail: 'The Fire Precautions Act was repealed by the Regulatory Reform (Fire Safety) Order 2005, which requires a fire risk assessment rather than a fire certificate.',
    phrases: /fire precautions act|fire certificate/i,
    supersededBy: 'Regulatory Reform (Fire Safety) Order 2005',
  },
  {
    id: 'riddor-1995',
    category: 'superseded_legislation', severity: 'medium',
    label: 'Refers to RIDDOR 1995',
    detail: 'The 1995 RIDDOR regulations were replaced by RIDDOR 2013, which changed what and when you must report.',
    phrases: /riddor 1995|reporting of injuries[^.]{0,80}1995/i,
    supersededBy: 'RIDDOR 2013',
  },
  {
    id: 'care-standards-act-2000',
    category: 'superseded_legislation', severity: 'medium',
    label: 'Cites the Care Standards Act 2000 as the registration basis',
    detail: 'Registration and regulation of care homes moved to the Health and Social Care Act 2008. The Care Standards Act 2000 remains in force only for limited purposes.',
    phrases: /care standards act 2000/i,
    supersededBy: 'Health and Social Care Act 2008',
  },
  {
    id: 'fair-access-to-care',
    category: 'superseded_legislation', severity: 'medium',
    label: 'Refers to Fair Access to Care Services (FACS) eligibility',
    detail: 'The FACS eligibility bands were replaced by the national eligibility criteria under the Care Act 2014.',
    phrases: /fair access to care/i, acronyms: ['FACS'],
    supersededBy: 'Care Act 2014 national eligibility criteria',
  },
  {
    id: 'nmw-regs-1999',
    category: 'superseded_legislation', severity: 'medium',
    label: 'Refers to the National Minimum Wage Regulations 1999',
    detail: 'The National Minimum Wage Regulations 1999 were revoked and replaced by the National Minimum Wage Regulations 2015. (The National Minimum Wage Act 1998 remains correct — it is the Regulations that changed.)',
    phrases: /national minimum wage regulations 1999/i,
    supersededBy: 'National Minimum Wage Regulations 2015',
    sourceUrls: ['https://www.legislation.gov.uk/uksi/2015/621/contents/made'],
  },
  {
    id: 'misrepresentation-title',
    category: 'superseded_legislation', severity: 'low',
    label: 'Incorrect title: "Misrepresentations Act 1967"',
    detail: 'The correct statutory title is the Misrepresentation Act 1967 (singular). The Act is still in force; only the citation is mistyped.',
    phrases: /misrepresentations act 1967/i,
    supersededBy: 'Misrepresentation Act 1967',
    sourceUrls: ['https://www.legislation.gov.uk/ukpga/1967/7/contents'],
  },

  // Context notes (highlighted + explained, but nothing to change) ----------------
  {
    id: 'growth-infrastructure-2013',
    category: 'advisory_note', severity: 'low',
    label: 'Cites the Growth and Infrastructure Act 2013 (employee shareholder status)',
    detail: 'This Act is still on the statute book, so nothing needs changing. Its main employment relevance was "employee shareholder" status, whose tax advantages were removed in September 2016 and which is effectively defunct for new agreements. Keep it if you wish, but it carries little practical weight now.',
    phrases: /growth and infrastructure act 2013/i,
    sourceUrls: ['https://www.legislation.gov.uk/ukpga/2013/27/contents'],
  },

  // Regulators / bodies ----------------------------------------------------------
  {
    id: 'crb',
    category: 'superseded_body', severity: 'high',
    label: 'Refers to CRB / Criminal Records Bureau checks',
    detail: 'The Criminal Records Bureau merged into the Disclosure and Barring Service (DBS) in 2012. Checks are now DBS checks.',
    phrases: /criminal records bureau/i, acronyms: ['CRB'],
    supersededBy: 'Disclosure and Barring Service (DBS)',
  },
  {
    id: 'isa-vbs',
    category: 'superseded_body', severity: 'high',
    label: 'Refers to the Independent Safeguarding Authority / Vetting and Barring Scheme',
    detail: 'The ISA and the Vetting and Barring Scheme were replaced by the Disclosure and Barring Service (DBS) in 2012.',
    phrases: /independent safeguarding authority|vetting and barring scheme/i, acronyms: ['ISA', 'VBS'],
    supersededBy: 'Disclosure and Barring Service (DBS)',
  },
  {
    id: 'pova',
    category: 'superseded_body', severity: 'high',
    label: 'Refers to the POVA / Protection of Vulnerable Adults list',
    detail: 'The POVA list was replaced by the DBS adults’ barred list.',
    phrases: /protection of vulnerable adults list/i, acronyms: ['POVA'],
    supersededBy: 'DBS adults’ barred list',
  },
  {
    id: 'csci',
    category: 'superseded_body', severity: 'high',
    label: 'Refers to CSCI / Commission for Social Care Inspection',
    detail: 'CSCI was replaced by the Care Quality Commission (CQC) in 2009.',
    phrases: /commission for social care inspection/i, acronyms: ['CSCI'],
    supersededBy: 'Care Quality Commission (CQC)',
  },
  {
    id: 'gscc',
    category: 'superseded_body', severity: 'high',
    label: 'Refers to the General Social Care Council (GSCC)',
    detail: 'The GSCC closed in 2012; social worker regulation passed to the HCPC and now Social Work England.',
    phrases: /general social care council/i, acronyms: ['GSCC'],
    supersededBy: 'Social Work England',
  },
  {
    id: 'ukcc',
    category: 'superseded_body', severity: 'medium',
    label: 'Refers to the UKCC (nursing regulator)',
    detail: 'The United Kingdom Central Council for Nursing, Midwifery and Health Visiting was replaced by the Nursing and Midwifery Council (NMC) in 2002.',
    phrases: /united kingdom central council/i, acronyms: ['UKCC'],
    supersededBy: 'Nursing and Midwifery Council (NMC)',
  },
  {
    id: 'pct',
    category: 'superseded_body', severity: 'medium',
    label: 'Refers to Primary Care Trusts (PCTs)',
    detail: 'PCTs were abolished in 2013. Commissioning passed to CCGs and, since 2022, to Integrated Care Boards (ICBs).',
    phrases: /primary care trusts?/i, acronyms: ['PCT', 'PCTs'],
    supersededBy: 'Integrated Care Board (ICB)',
  },
  {
    id: 'ccg',
    category: 'superseded_body', severity: 'medium',
    label: 'Refers to Clinical Commissioning Groups (CCGs)',
    detail: 'CCGs were abolished in July 2022 and replaced by Integrated Care Boards (ICBs).',
    phrases: /clinical commissioning groups?/i, acronyms: ['CCG', 'CCGs'],
    supersededBy: 'Integrated Care Board (ICB)',
  },
  {
    id: 'strategic-health-authority',
    category: 'superseded_body', severity: 'medium',
    label: 'Refers to Strategic Health Authorities (SHAs)',
    detail: 'SHAs were abolished in 2013 under the Health and Social Care Act 2012.',
    phrases: /strategic health authorit(y|ies)/i, acronyms: ['SHA', 'SHAs'],
    supersededBy: 'NHS England / Integrated Care Board (ICB)',
  },
  {
    id: 'links-healthwatch',
    category: 'superseded_body', severity: 'medium',
    label: 'Refers to Local Involvement Networks (LINks)',
    detail: 'LINks were replaced by local Healthwatch organisations in 2013.',
    phrases: /local involvement networks?/i, acronyms: ['LINk', 'LINks'],
    supersededBy: 'Healthwatch',
  },
  {
    id: 'npsa',
    category: 'superseded_body', severity: 'low',
    label: 'Refers to the National Patient Safety Agency (NPSA)',
    detail: 'The NPSA was abolished in 2012; its patient-safety functions passed to NHS England.',
    phrases: /national patient safety agency/i, acronyms: ['NPSA'],
    supersededBy: 'NHS England (patient safety)',
  },
  {
    id: 'ilf',
    category: 'superseded_body', severity: 'low',
    label: 'Refers to the Independent Living Fund (ILF)',
    detail: 'The Independent Living Fund closed in 2015; support transferred to local authorities.',
    phrases: /independent living fund/i, acronyms: ['ILF'],
    supersededBy: 'Local authority adult social care support',
  },

  // ── Time-bound emergency guidance ──────────────────────────────────────────────
  // Soft signal: not automatically wrong, but pandemic-era wording should be reviewed for
  // whether it still reflects current practice rather than emergency measures.
  {
    id: 'covid-era',
    category: 'time_bound', severity: 'low',
    label: 'Contains pandemic-era (COVID-19) wording',
    detail: 'Emergency COVID-19 measures (shielding, social distancing, fixed self-isolation periods, visiting bans) have largely ended. Check the wording still reflects current, not emergency, practice.',
    phrases: /covid-?19|coronavirus|social distancing|\bshielding\b|\blockdown\b/i,
  },

  // ── Unfilled template placeholders ─────────────────────────────────────────────
  // Hard tokens (xxxx / TBC / lorem / <<>> / {{}}) had ZERO false positives on the real
  // library, so they are high-confidence defects. Square-bracket tokens are more common in
  // genuine templates; kept at medium and to be confirmed on real (non-anonymised) uploads.
  {
    id: 'placeholder-hard',
    category: 'placeholder', severity: 'high',
    label: 'Contains an unfilled placeholder (e.g. XXXX, TBC, <<...>>)',
    detail: 'A template placeholder was never filled in, so the policy is incomplete as published.',
    phrases: /\bxxxx+\b|\bTB[CD]\b|to be confirmed|lorem ipsum|<<[^>]{0,40}>>|\{\{[^}]{0,40}\}\}/i,
  },
  {
    id: 'placeholder-brackets',
    category: 'placeholder', severity: 'medium',
    label: 'Contains a square-bracket template token (e.g. [insert name])',
    detail: 'A bracketed template token appears unfilled. Confirm it is a genuine placeholder and not intentional guidance.',
    phrases: /\[(insert|enter|name of|care home|company name|provider name|manager name|date|address|telephone)[^\]]{0,40}\]/i,
  },
]

// ── Matching helpers (the ONLY place matching logic lives, so it stays consistent) ───

// Case-sensitive, whole-word acronym detector. No 'i' flag: "CRB" matches, "crb"/"scrb" do not.
export function acronymPattern(acronyms: string[]): RegExp | null {
  const list = acronyms.filter(Boolean)
  if (!list.length) return null
  const alt = list.map(a => a.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')
  return new RegExp(`\\b(?:${alt})\\b`, 'g')   // deliberately case-SENSITIVE
}

// Does this signal fire anywhere in the text?
export function signalFires(text: string, s: TextSignal): boolean {
  if (s.phrases && s.phrases.test(text)) return true
  const ap = s.acronyms && acronymPattern(s.acronyms)
  return ap ? ap.test(text) : false
}

// Every matched snippet (verbatim substring + index), so the UI can highlight it and the fix
// can pre-fill old_text -> supersededBy with NO AI. Ranges are de-duplicated and ordered.
export function signalMatches(text: string, s: TextSignal): Array<{ match: string; index: number }> {
  const hits: Array<{ match: string; index: number }> = []
  const push = (re: RegExp) => {
    const g = new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g')
    let m: RegExpExecArray | null
    while ((m = g.exec(text)) !== null) {
      hits.push({ match: m[0], index: m.index })
      if (m.index === g.lastIndex) g.lastIndex++   // guard against zero-width loops
    }
  }
  if (s.phrases) push(s.phrases)
  const ap = s.acronyms && acronymPattern(s.acronyms)
  if (ap) push(ap)
  return hits.sort((a, b) => a.index - b.index).filter((h, i, arr) => i === 0 || h.index !== arr[i - 1].index)
}

// ── Metadata / structural signals (computed by the engine, not by a text regex) ──────
// Documented here so the whole catalogue lives in one place. The engine (2b) computes these
// from the policy row + extracted text length, all still zero-AI.
export const METADATA_SIGNALS = [
  {
    id: 'thin-content',
    category: 'structure' as LintCategory,
    severity: 'medium' as LintSeverity,
    label: 'Very little content',
    detail: 'The extracted policy text is under ~600 characters, which usually means a stub, a cover sheet, or a failed text extraction rather than a complete policy.',
    // engine rule: extractedText.length < 600
  },
  {
    id: 'missing-purpose-scope',
    category: 'structure' as LintCategory,
    severity: 'medium' as LintSeverity,
    label: 'No policy statement, purpose or scope',
    detail: 'The document does not contain a policy statement, purpose, aim or scope. A compliant policy should state what it is for and who it applies to.',
    // engine rule: !/policy statement|purpose|scope|\baim\b/i.test(text)
  },
  {
    id: 'overdue-review',
    category: 'review_currency' as LintCategory,
    severity: 'high' as LintSeverity,
    label: 'Overdue for review',
    detail: 'The policy has passed its review interval (last_reviewed_at + review_interval_days) or has never recorded a review date. Review currency is taken from the policy record, not the document text.',
    // engine rule: last_reviewed_at == null OR now > last_reviewed_at + (review_interval_days ?? 365)
  },
] as const

// A stable weight per severity, for a headline policy quality score (Phase 2c).
export const SEVERITY_WEIGHT: Record<LintSeverity, number> = { high: 3, medium: 2, low: 1 }

// Rows to seed the editable policy_lint_signals table from this code catalogue (first run /
// "reset to defaults"). Regexes are stored as their source string, compiled case-insensitive.
export function defaultSignalSeeds() {
  return TEXT_SIGNALS.map((s, i) => ({
    signal_key:    s.id,
    category:      s.category,
    severity:      s.severity,
    label:         s.label,
    detail:        s.detail,
    phrase_source: s.phrases ? s.phrases.source : null,
    acronyms:      s.acronyms ?? [],
    superseded_by: s.supersededBy ?? null,
    approved:      true,   // the curated defaults are validated — live on first seed
    approved_at:   null,
    sort_order:    i,
  }))
}
