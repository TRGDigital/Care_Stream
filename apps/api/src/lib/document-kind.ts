// What KIND of document is this — a policy, or something else that happens to live in the
// policy library? Deterministic: title patterns plus a length floor. No AI, no credits, no
// stored column, so it can be called from any analysis without a migration or a batch job.
//
// Why it exists: a library is never only policies. Ferndale's holds exam papers, blank forms,
// specimen letters, a flowchart and an organisational chart. Judging those as if they were
// policies is how "no policy statement, purpose or scope" fired on a Subject Access Request
// form and how an answer sheet was offered as evidence of regulation coverage.
//
// Deliberately conservative: anything without a clear signal stays a POLICY, because wrongly
// excluding a real policy from analysis is far worse than including a stray form.

export type DocumentKind =
  | 'policy'      // sets rules, commitments or procedure — the thing every analysis is about
  | 'form'        // to be filled in
  | 'letter'      // specimen correspondence
  | 'template'    // a skeleton with placeholders
  | 'training'    // exam, quiz, answer sheet, "in depth" topic reading
  | 'chart'       // organisational chart, flowchart

// Ordered: the first match wins, so "Medication Training Exam Answer Sheet" is training,
// not a form. Each pattern is anchored on wording that does not appear in ordinary policy
// titles ("Consent Form", not the word "consent").
const TITLE_RULES: Array<{ kind: DocumentKind; re: RegExp }> = [
  { kind: 'training', re: /\bin depth\b|\bexam\b|\banswer sheet\b|test your knowledge|\bquiz\b|\bworkbook\b/i },
  { kind: 'letter',   re: /\(letter\)|\bletter to\b|^letter\b|acknowledgement of a subject access/i },
  { kind: 'chart',    re: /\bflowchart\b|organisational chart|\borganisation chart\b/i },
  { kind: 'template', re: /\btemplate\b/i },
  { kind: 'form',     re: /\bform\b|\bchecklist\b|\bregister\b(?!ed)|\baudit tool\b/i },
]

// Below this a document cannot carry a policy's content, whatever it is called.
const MIN_POLICY_CHARS = 600

export function documentKind(name: string, textLength = Number.MAX_SAFE_INTEGER): DocumentKind {
  const title = (name ?? '').trim()
  for (const r of TITLE_RULES) if (r.re.test(title)) return r.kind
  if (textLength < MIN_POLICY_CHARS) return 'form'   // a stub or a cover sheet, not a policy
  return 'policy'
}

// Should this document be judged as a policy — for coverage, structure rules, wording and
// cross-policy consistency?
export function isPolicyDocument(name: string, textLength = Number.MAX_SAFE_INTEGER): boolean {
  return documentKind(name, textLength) === 'policy'
}

// Plain-English label for the admin UI.
export const DOCUMENT_KIND_LABEL: Record<DocumentKind, string> = {
  policy:   'Policy',
  form:     'Form',
  letter:   'Letter',
  template: 'Template',
  training: 'Training material',
  chart:    'Chart',
}
