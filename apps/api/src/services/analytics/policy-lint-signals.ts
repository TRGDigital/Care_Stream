// ─── Phase 2a: curated policy stale-signal reference ─────────────────────────────
//
// A precision-first catalogue of DETERMINISTIC signals that a UK adult-social-care policy
// is out of date or low quality. Every text signal here is a plain regex — NO AI, NO vectors,
// NO credits — so the lint engine (Phase 2b) can scan the whole library for free.
//
// Curated and validated against Ferndale's real (anonymised) 320-policy library. Signals that
// proved noisy on real content were deliberately dropped (e.g. "missing responsibilities
// section" flagged 43% — too broad). Review currency is NOT read from the text (that flagged
// 96%); it is computed from the policy's DB fields (last_reviewed_at / review_interval_days)
// by the engine — see METADATA_SIGNALS.
//
// Severity: 'high'  = factually wrong (cites superseded law/framework as current)
//           'medium' = likely stale or a quality defect worth a look
//           'low'    = informational / weak signal
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

export interface TextSignal {
  id:          string
  category:    LintCategory
  severity:    LintSeverity
  label:       string        // shown to the admin — what was found
  detail:      string        // why it matters
  pattern:     RegExp        // deterministic detector (case-insensitive)
  supersededBy?: string      // the current term/framework to replace it with
}

// ── Superseded legislation, regulators and frameworks ────────────────────────────
// A policy still presenting any of these as current guidance is, by definition, out of date.
export const TEXT_SIGNALS: TextSignal[] = [
  {
    id: 'cqc-kloe',
    category: 'superseded_framework',
    severity: 'high',
    label: 'Refers to CQC Key Lines of Enquiry (KLOEs)',
    detail: 'The KLOEs were replaced by the CQC Single Assessment Framework and its quality statements in 2023. A policy still citing KLOEs describes an inspection model that no longer exists.',
    pattern: /key lines? of enquiry|\bKLOEs?\b/i,
    supersededBy: 'CQC Single Assessment Framework (quality statements)',
  },
  {
    id: 'cqc-essential-standards',
    category: 'superseded_framework',
    severity: 'high',
    label: 'Refers to CQC Essential Standards / numbered Outcomes',
    detail: 'The "Essential Standards of Quality and Safety" and the numbered Outcomes framework were replaced by the Fundamental Standards (2015) and now the Single Assessment Framework.',
    pattern: /essential standards of quality|\bCQC outcomes?\b|\boutcome (7|8|9|1[0-9]|2[01])\b/i,
    supersededBy: 'Fundamental Standards / CQC Single Assessment Framework',
  },
  {
    id: 'national-minimum-standards',
    category: 'superseded_framework',
    severity: 'high',
    label: 'Refers to National Minimum Standards',
    detail: 'The Care Homes National Minimum Standards were superseded by the Health and Social Care Act 2008 (Regulated Activities) Regulations and the Fundamental Standards.',
    pattern: /national minimum standards/i,
    supersededBy: 'Health and Social Care Act 2008 (Regulated Activities) Regulations 2014',
  },
  {
    id: 'dpa-1998',
    category: 'superseded_legislation',
    severity: 'high',
    label: 'Refers to the Data Protection Act 1998',
    detail: 'The Data Protection Act 1998 was replaced by the Data Protection Act 2018 and the UK GDPR.',
    pattern: /data protection act 1998/i,
    supersededBy: 'Data Protection Act 2018 / UK GDPR',
  },
  {
    id: 'crb',
    category: 'superseded_body',
    severity: 'high',
    label: 'Refers to CRB / Criminal Records Bureau checks',
    detail: 'The Criminal Records Bureau merged into the Disclosure and Barring Service (DBS) in 2012. Checks are now DBS checks.',
    pattern: /criminal records bureau|\bCRB\b(?!\s*check\s*(is|was)\s*now)/i,
    supersededBy: 'Disclosure and Barring Service (DBS)',
  },
  {
    id: 'isa-vbs',
    category: 'superseded_body',
    severity: 'high',
    label: 'Refers to the Independent Safeguarding Authority / Vetting and Barring Scheme',
    detail: 'The ISA and the Vetting and Barring Scheme were replaced by the Disclosure and Barring Service (DBS) in 2012.',
    pattern: /independent safeguarding authority|vetting and barring scheme|\bISA\b(?= (list|check|register))/i,
    supersededBy: 'Disclosure and Barring Service (DBS)',
  },
  {
    id: 'pova',
    category: 'superseded_body',
    severity: 'high',
    label: 'Refers to the POVA / Protection of Vulnerable Adults list',
    detail: 'The POVA list was replaced by the DBS adults’ barred list.',
    pattern: /protection of vulnerable adults list|\bPOVA\b/i,
    supersededBy: 'DBS adults’ barred list',
  },
  {
    id: 'csci',
    category: 'superseded_body',
    severity: 'high',
    label: 'Refers to CSCI / Commission for Social Care Inspection',
    detail: 'CSCI was replaced by the Care Quality Commission (CQC) in 2009.',
    pattern: /commission for social care inspection|\bCSCI\b/i,
    supersededBy: 'Care Quality Commission (CQC)',
  },
  {
    id: 'gscc',
    category: 'superseded_body',
    severity: 'high',
    label: 'Refers to the General Social Care Council (GSCC)',
    detail: 'The GSCC closed in 2012; social worker regulation passed to the HCPC and now Social Work England.',
    pattern: /general social care council|\bGSCC\b/i,
    supersededBy: 'Social Work England',
  },
  {
    id: 'no-secrets',
    category: 'superseded_legislation',
    severity: 'high',
    label: 'Relies on the "No Secrets" (2000) guidance',
    detail: 'The "No Secrets" guidance was superseded by the statutory safeguarding duties in the Care Act 2014.',
    pattern: /\bno secrets\b/i,
    supersededBy: 'Care Act 2014 (safeguarding duties)',
  },
  {
    id: 'care-standards-act-2000',
    category: 'superseded_legislation',
    severity: 'medium',
    label: 'Refers to the Care Standards Act 2000 as the registration basis',
    detail: 'Registration and regulation of care homes moved to the Health and Social Care Act 2008. The Care Standards Act 2000 remains in force only for limited purposes.',
    pattern: /care standards act 2000/i,
    supersededBy: 'Health and Social Care Act 2008',
  },
  {
    id: 'pct',
    category: 'superseded_body',
    severity: 'medium',
    label: 'Refers to Primary Care Trusts (PCTs)',
    detail: 'PCTs were abolished in 2013. Commissioning passed to CCGs and, since 2022, to Integrated Care Boards (ICBs).',
    pattern: /primary care trusts?|\bPCTs?\b/i,
    supersededBy: 'Integrated Care Board (ICB)',
  },
  {
    id: 'ccg',
    category: 'superseded_body',
    severity: 'medium',
    label: 'Refers to Clinical Commissioning Groups (CCGs)',
    detail: 'CCGs were abolished in July 2022 and replaced by Integrated Care Boards (ICBs).',
    pattern: /clinical commissioning groups?|\bCCGs?\b/i,
    supersededBy: 'Integrated Care Board (ICB)',
  },
  {
    id: 'strategic-health-authority',
    category: 'superseded_body',
    severity: 'medium',
    label: 'Refers to Strategic Health Authorities (SHAs)',
    detail: 'SHAs were abolished in 2013 under the Health and Social Care Act 2012.',
    pattern: /strategic health authorit(y|ies)|\bSHAs?\b/i,
    supersededBy: 'NHS England / Integrated Care Board (ICB)',
  },

  // ── Time-bound emergency guidance ──────────────────────────────────────────────
  // Soft signal: not automatically wrong, but pandemic-era wording should be reviewed for
  // whether it still reflects current practice rather than emergency measures.
  {
    id: 'covid-era',
    category: 'time_bound',
    severity: 'low',
    label: 'Contains pandemic-era (COVID-19) wording',
    detail: 'Emergency COVID-19 measures (shielding, social distancing, fixed self-isolation periods, visiting bans) have largely ended. Check the wording still reflects current, not emergency, practice.',
    pattern: /covid-?19|coronavirus|social distancing|\bshielding\b|\blockdown\b/i,
  },

  // ── Unfilled template placeholders ─────────────────────────────────────────────
  // Hard tokens (xxxx / TBC / lorem / <<>> / {{}}) had ZERO false positives on the real
  // library, so they are high-confidence defects. Square-bracket tokens are more common in
  // genuine templates; kept at medium and to be confirmed on real (non-anonymised) uploads.
  {
    id: 'placeholder-hard',
    category: 'placeholder',
    severity: 'high',
    label: 'Contains an unfilled placeholder (e.g. XXXX, TBC, <<...>>)',
    detail: 'A template placeholder was never filled in, so the policy is incomplete as published.',
    pattern: /\bxxxx+\b|\bTB[CD]\b|to be confirmed|lorem ipsum|<<[^>]{0,40}>>|\{\{[^}]{0,40}\}\}/i,
  },
  {
    id: 'placeholder-brackets',
    category: 'placeholder',
    severity: 'medium',
    label: 'Contains a square-bracket template token (e.g. [insert name])',
    detail: 'A bracketed template token appears unfilled. Confirm it is a genuine placeholder and not intentional guidance.',
    pattern: /\[(insert|enter|name of|care home|company name|provider name|manager name|date|address|telephone)[^\]]{0,40}\]/i,
  },
]

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
