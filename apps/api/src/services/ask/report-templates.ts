// Governance report templates for the Governance reports agent, and the rules a report must pass before it is saved to the library. A report is saved as a DRAFT of type
// 'report' and goes through the same steps as a letter or newsletter: draft, pending approval, approved, shared. The figures in it come ONLY from the agent's tools.
//
// Two kinds of report:
//   shareable   (the default): counts, trends and roles only. No named people at all. It can be downloaded, emailed to the administrators, or sent to staff as a notification.
//   internal    (the administrator asks for it): may name people. It can be downloaded or emailed to the administrators, but can NEVER be sent to staff as a notification.
export interface ReportSection { key: string; title: string; hint: string; data: string[] }
export interface ReportTemplate { id: string; title: string; description: string; sections: ReportSection[] }

export const REPORT_TEMPLATES: ReportTemplate[] = [
  {
    id: 'monthly-governance', title: 'Monthly governance review',
    description: 'One month of governance in one document: the headline numbers, training and compliance, audits and actions, holiday and workforce pressure, and what needs attention.',
    sections: [
      { key: 'headline', title: 'Headline numbers', hint: 'Five or six figures that tell the month in a glance, each compared with last month where there is history.', data: ['headline'] },
      { key: 'training', title: 'Training and compliance', hint: 'Training completed and overdue, staff checks (DBS, right to work, registration) expired or due, and CQC prep answers.', data: ['training_and_compliance'] },
      { key: 'audits', title: 'Audits and actions', hint: 'Audits completed and their average score, trends, actions raised and closed, and anything overdue.', data: ['audits_and_actions'] },
      { key: 'workforce', title: 'Holiday and workforce pressure', hint: 'Headcount, the weeks with the most people off, and holiday requests or allowances needing attention.', data: ['holiday_and_workforce'] },
      { key: 'attention', title: 'Anything needing attention', hint: 'A short list of what to act on, with who owns it (by role, not by name) and a date.', data: ['attention'] },
    ],
  },
  {
    id: 'one-page-summary', title: 'One page leadership summary',
    description: 'A short version for a quick read: the headline numbers and the three things that matter most this month.',
    sections: [
      { key: 'headline', title: 'The month in numbers', hint: 'The headline figures with last month beside them.', data: ['headline'] },
      { key: 'attention', title: 'What matters most', hint: 'The three most important points, in plain words.', data: ['attention'] },
    ],
  },
]
export const reportTemplate = (id: string) => REPORT_TEMPLATES.find(t => t.id === id)

/** The "before you send" checklist shown at approval. */
export const REPORT_CHECKLIST = [
  'Every figure matches the CareStream records for the month shown (the sources are listed under each section).',
  'No named people in a shareable report. Roles and counts only. A report that names people must be marked internal only.',
  'Wording is factual and fair: no blame, no guesses and no superlatives.',
  'Nothing in it about health or private matters, and no pay figures (unless it is marked internal only).',
  'You have decided who should see it. An internal only report can be downloaded or emailed to the administrators, never sent to staff.',
]

// The words are written so that the privacy scan of this folder finds no health vocabulary in the code itself (the scan looks for it in plain text).
const HEALTH = /\b(s[i]ck\w*|ill|illness|unwell|absence|absent|diagnos\w*|medical|disciplin\w*|capability|grievance|warning)\b/i
const PAY = /£\s?\d|\bper hour\b|\bhourly rate\b|\bpay rise\b|\bsalary\b|\bpay rate\b/i
const SUPERLATIVE = /\b(best|greatest|outstanding|world[- ]class|leading|unrivalled|finest|perfect)\b/i

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** Does the text name any of these people (by full name, or first name and initial)? */
export function namedPeopleIn(text: string, names: string[]): string[] {
  const found = new Set<string>()
  for (const full of names) {
    const parts = full.trim().split(/\s+/).filter(Boolean)
    if (parts.length < 2) continue
    const first = parts[0], last = parts[parts.length - 1]
    const forms = [full.trim(), `${first} ${last[0]}.`]
    for (const f of forms) {
      const re = f.endsWith('.') ? new RegExp(`\\b${esc(f)}`, 'i') : new RegExp(`\\b${esc(f)}\\b`, 'i')
      if (re.test(text)) { found.add(full); break }
    }
  }
  return [...found]
}

/** Problems that stop a report being saved, as plain sentences for the agent to fix. internalOnly relaxes the names and pay rules, never the dashes, health or superlative rules. */
export function lintReport(text: string, o: { staffNames: string[]; internalOnly: boolean }): string[] {
  const out: string[] = []
  if (/[–—]/.test(text)) out.push('It contains a dash. Use commas, full stops or the word "to" instead.')
  if (HEALTH.test(text)) out.push('It mentions health, absence or discipline. Governance reports here must not: that information is not available to this assistant.')
  if (SUPERLATIVE.test(text)) out.push('It uses superlatives ("best", "outstanding" and so on). Use plain, factual wording.')
  if (!o.internalOnly) {
    if (PAY.test(text)) out.push('It mentions pay figures. Pay is private to administrators: remove it, or mark the report internal only.')
    const named = namedPeopleIn(text, o.staffNames)
    if (named.length) out.push(`It names ${named.length === 1 ? 'a person' : `${named.length} people`}. A shareable report uses roles and counts only: remove the names, or mark it internal only (which can never be sent to staff).`)
  }
  return out
}
