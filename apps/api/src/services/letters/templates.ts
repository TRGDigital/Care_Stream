// The Tier 1 HR letters: plain, warm, accurate wording for a care service. Every letter is a DRAFT that an administrator checks and approves before it is shared.
// A template is data: merge fields, then paragraphs with {{field}} placeholders and optional blocks. render.ts turns it into text, HTML and a PDF.
//
// Rules for the words in here: British English, no dashes, no legal language that is not needed, and nothing that gives legal advice. Where a letter touches the law the
// "before you send" checklist says so and links to the primary source. Tier 2 letters (sickness, discipline, capability and so on) are NOT here: see TIER2_PLANNED.

import { fmtMoney, fmtNumber, fmtPercent } from './format'

export type FieldType = 'text' | 'longtext' | 'date' | 'money' | 'number' | 'choice' | 'list'
export type FieldSource = 'staff' | 'service' | 'holiday' | 'pay' | 'reference' | 'admin'

export interface FieldDef {
  key: string
  label: string
  type: FieldType
  required: boolean
  /** Only required when this condition holds (same condition language as blocks). */
  requiredWhen?: string
  /** Where a starting value can come from. Pay and holiday figures are ADMIN ONLY data. */
  source: FieldSource
  /** The fact that fills it in (see fields.ts), for example staff.name or holiday.taken. */
  from?: string
  help?: string
  choices?: Array<{ value: string; label: string }>
  default?: string | number
}

/** One piece of the letter body. `when`: a condition on the merge fields: "key" (has a value), "!key", "key=value", "key!=value", joined with &&. */
export type Block =
  | { t: 'p'; text: string; when?: string }
  | { t: 'li'; text: string; when?: string }
  | { t: 'h'; text: string; when?: string }
  | { t: 'list'; field: string; when?: string }

export interface LetterTemplate {
  id: string
  title: string
  category: 'pay' | 'contract' | 'leave' | 'leaving' | 'development' | 'compliance' | 'recognition' | 'policy'
  description: string
  whoFor: string
  fields: FieldDef[]
  subject: string
  body: Block[]
  closing: string
  acknowledgement?: { when?: string; text: string }
  beforeYouSend: string[]
  references: Array<{ label: string; url: string }>
  /** Always true: nothing is shared until an administrator or manager has approved it. */
  approvalRequired: true
  /** Extra placeholders worked out from the values, already formatted. */
  derive?: (v: Record<string, any>) => Record<string, string>
}

// ── Reference links (each one was fetched and checked) ────────────────────────────────────────────
const REF = {
  eraS4: { label: 'Employment Rights Act 1996, section 4: statement of changes', url: 'https://www.legislation.gov.uk/ukpga/1996/18/section/4' },
  nmw: { label: 'National Minimum Wage and National Living Wage rates (GOV.UK)', url: 'https://www.gov.uk/national-minimum-wage-rates' },
  wtr14: { label: 'Working Time Regulations 1998, regulation 14: payment when employment ends', url: 'https://www.legislation.gov.uk/uksi/1998/1833/regulation/14' },
  holiday: { label: 'Holiday entitlement (GOV.UK)', url: 'https://www.gov.uk/holiday-entitlement-rights' },
  reg18: { label: 'Health and Social Care Act 2008 (Regulated Activities) Regulations 2014, regulation 18: staffing', url: 'https://www.legislation.gov.uk/uksi/2014/2936/regulation/18' },
  rtw: { label: 'Right to work checks: an employer\'s guide (GOV.UK)', url: 'https://www.gov.uk/government/publications/right-to-work-checks-employers-guide' },
}

export const FIT_NOTE = 'Check that the letter fits this person\'s contract and your own policies before you send it. CareStream does not give legal advice.'
const STATEMENT_NOTE = 'A change to the terms of employment must be confirmed to the person in writing at the earliest opportunity, and no later than one month after the change (Employment Rights Act 1996, section 4). This letter can form part of that, so check it covers what your contract says about the change.'

// ── The fields every letter has ───────────────────────────────────────────────────────────────────
export const COMMON_FIELDS: FieldDef[] = [
  { key: 'recipient_name', label: 'Full name of the person', type: 'text', required: true, source: 'staff', from: 'staff.name' },
  { key: 'recipient_role', label: 'Their job title', type: 'text', required: false, source: 'staff', from: 'staff.jobRole' },
  { key: 'letter_date', label: 'Date of the letter', type: 'date', required: true, source: 'admin', from: 'today' },
  { key: 'service_name', label: 'Name of the service', type: 'text', required: true, source: 'service', from: 'service.name' },
  { key: 'manager_name', label: 'Your name', type: 'text', required: true, source: 'admin', from: 'actor.name' },
  { key: 'manager_role', label: 'Your job title', type: 'text', required: false, source: 'admin', from: 'actor.jobRole' },
]

const UNIT_CHOICES = [{ value: 'hours', label: 'Hours' }, { value: 'days', label: 'Days' }]
const YES_NO = [{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }]
const DEAR: Block = { t: 'p', text: 'Dear {{first_name}},' }
const unitWord = (u: unknown) => (u === 'days' ? 'days' : 'hours')
const num = (x: unknown) => (typeof x === 'number' && isFinite(x) ? x : null)

/** The rise from an old to a new hourly rate, for the pay letters. */
function riseFacts(v: Record<string, any>): Record<string, string> {
  const o = num(v.old_rate), n = num(v.new_rate)
  if (o != null && n != null && n > o) return { has_rise: '1', rise_amount: fmtMoney(n - o), rise_percent: fmtPercent(((n - o) / o) * 100) }
  return {}
}

// ── The letters ───────────────────────────────────────────────────────────────────────────────────
const T: LetterTemplate[] = [
  {
    id: 'pay-review', title: 'Pay review outcome', category: 'pay', approvalRequired: true,
    description: 'Tells someone the result of their pay review: the new hourly rate, when it starts and why.',
    whoFor: 'One member of staff whose hourly rate is changing.',
    fields: [
      { key: 'effective_date', label: 'New rate starts on', type: 'date', required: true, source: 'admin' },
      { key: 'old_rate', label: 'Current hourly rate', type: 'money', required: false, source: 'pay', from: 'pay.weekday', help: 'Admin only figure. Leave blank to leave the old rate out of the letter.' },
      { key: 'new_rate', label: 'New hourly rate', type: 'money', required: true, source: 'admin' },
      { key: 'reason', label: 'Reason for the change', type: 'choice', required: true, source: 'admin', default: 'annual_review',
        choices: [{ value: 'annual_review', label: 'Annual pay review' }, { value: 'nlw', label: 'National Living Wage increase' }, { value: 'duties', label: 'A change in duties' }, { value: 'recognition', label: 'Recognition of their work' }, { value: 'other', label: 'Another reason' }] },
      { key: 'reason_note', label: 'Anything else to say (optional)', type: 'longtext', required: false, source: 'admin' },
    ],
    subject: 'Your pay review',
    derive: riseFacts,
    body: [
      DEAR,
      { t: 'p', text: 'Thank you for everything you do at {{service_name}}. I am writing to confirm the outcome of your pay review.' },
      { t: 'p', when: 'has_rise', text: 'From {{effective_date}}, your hourly rate will change from {{old_rate}} to {{new_rate}}. That is an increase of {{rise_amount}} an hour ({{rise_percent}}).' },
      { t: 'p', when: '!has_rise', text: 'From {{effective_date}}, your hourly rate will be {{new_rate}}.' },
      { t: 'p', when: 'reason=annual_review', text: 'This is the result of our annual review of pay.' },
      { t: 'p', when: 'reason=nlw', text: 'This follows the increase in the National Living Wage.' },
      { t: 'p', when: 'reason=duties', text: 'This reflects the change in your duties.' },
      { t: 'p', when: 'reason=recognition', text: 'This recognises the quality of your work and what you bring to the team.' },
      { t: 'p', when: 'reason_note', text: '{{reason_note}}' },
      { t: 'p', text: 'All the other terms of your employment stay the same. The new rate will be applied through payroll from {{effective_date}}.' },
      { t: 'p', text: 'If you have any questions, please come and talk to me.' },
    ],
    closing: 'Yours sincerely,',
    beforeYouSend: [
      'Check the new rate is at least the National Living Wage or National Minimum Wage for this person\'s age band.',
      'Check the rate and the start date match what payroll will pay.',
      STATEMENT_NOTE,
      FIT_NOTE,
    ],
    references: [REF.eraS4, REF.nmw],
  },

  {
    id: 'annual-pay-increase', title: 'Annual pay increase', category: 'pay', approvalRequired: true,
    description: 'The yearly letter that explains a pay rise, whether it follows the National Living Wage, a percentage for everyone or a fixed amount, and gives the person their new rate.',
    whoFor: 'Each member of staff, sent once a year after pay is reviewed.',
    fields: [
      { key: 'effective_date', label: 'New rates start on', type: 'date', required: true, source: 'admin' },
      { key: 'basis', label: 'What the increase is based on', type: 'choice', required: true, source: 'admin', default: 'nlw',
        choices: [{ value: 'nlw', label: 'The National Living Wage increase' }, { value: 'percent', label: 'A percentage rise for everyone' }, { value: 'fixed', label: 'A fixed amount an hour for everyone' }] },
      { key: 'national_rate', label: 'National Living Wage from that date (21 and over)', type: 'money', required: false, source: 'reference', from: 'ref.nlw_21_plus', help: 'Filled from the Data sources register when it holds a figure. Check it before you send.' },
      { key: 'percent_rise', label: 'Percentage rise', type: 'number', required: false, requiredWhen: 'basis=percent', source: 'admin' },
      { key: 'old_rate', label: 'Their current hourly rate', type: 'money', required: false, source: 'pay', from: 'pay.weekday' },
      { key: 'new_rate', label: 'Their new hourly rate', type: 'money', required: true, source: 'admin' },
      { key: 'note', label: 'Anything else to say (optional)', type: 'longtext', required: false, source: 'admin' },
    ],
    subject: 'Your pay from {{effective_date}}',
    derive: riseFacts,
    body: [
      DEAR,
      { t: 'p', text: 'Each year we review pay for everyone at {{service_name}}. I am writing to tell you what is changing for you.' },
      { t: 'p', when: 'basis=nlw&&national_rate', text: 'The National Living Wage for workers aged 21 and over rises to {{national_rate}} an hour from {{effective_date}}. We are making sure pay at {{service_name}} keeps up with this.' },
      { t: 'p', when: 'basis=nlw&&!national_rate', text: 'The National Living Wage rises from {{effective_date}}, and we are making sure pay at {{service_name}} keeps up with it.' },
      { t: 'p', when: 'basis=percent', text: 'Hourly rates are rising by {{percent_rise}}% for everyone.' },
      { t: 'p', when: 'basis=fixed&&rise_amount', text: 'Hourly rates are rising by {{rise_amount}} an hour for everyone.' },
      { t: 'p', when: 'has_rise', text: 'Your hourly rate will go from {{old_rate}} to {{new_rate}} from {{effective_date}}. That is an increase of {{rise_amount}} an hour ({{rise_percent}}).' },
      { t: 'p', when: '!has_rise', text: 'Your hourly rate from {{effective_date}} will be {{new_rate}}.' },
      { t: 'p', when: 'note', text: '{{note}}' },
      { t: 'p', text: 'The new rate will be applied through payroll from {{effective_date}}. Everything else about your employment stays the same.' },
      { t: 'p', text: 'Thank you for your hard work and for the care you give to the people we support. If you have any questions, please speak to me.' },
    ],
    closing: 'Yours sincerely,',
    beforeYouSend: [
      'Check each person\'s new rate against the National Living Wage or National Minimum Wage for their age band, including anyone under 21 and any apprentices, whose rates are lower.',
      'If the rise is a percentage or a fixed amount, check the rate in the letter is the correct result for this person.',
      'Check the dates and rates match what payroll will pay.',
      STATEMENT_NOTE,
      FIT_NOTE,
    ],
    references: [REF.nmw, REF.eraS4],
  },

  {
    id: 'contract-hours-change', title: 'Change of contracted hours', category: 'contract', approvalRequired: true,
    description: 'Confirms a change to someone\'s contracted hours, when it starts, and what happens to their holiday allowance.',
    whoFor: 'One member of staff whose weekly hours are changing.',
    fields: [
      { key: 'effective_date', label: 'New hours start on', type: 'date', required: true, source: 'admin' },
      { key: 'old_hours', label: 'Current hours a week', type: 'number', required: false, source: 'staff', from: 'staff.contractedHours' },
      { key: 'new_hours', label: 'New hours a week', type: 'number', required: true, source: 'admin' },
      { key: 'pattern', label: 'Working pattern (optional)', type: 'longtext', required: false, source: 'admin', help: 'For example: Monday, Tuesday and Friday, 8am to 8pm.' },
      { key: 'basis', label: 'Why it is changing', type: 'choice', required: true, source: 'admin', default: 'agreed',
        choices: [{ value: 'agreed', label: 'By agreement between us' }, { value: 'request', label: 'At their request' }, { value: 'service', label: 'Because of the needs of the service' }] },
      { key: 'agreed_on', label: 'Date we talked about it (optional)', type: 'date', required: false, source: 'admin' },
      { key: 'new_holiday', label: 'New annual leave allowance (optional)', type: 'number', required: false, source: 'admin', help: 'Only when the allowance changes with the hours.' },
      { key: 'holiday_unit', label: 'Allowance is in', type: 'choice', required: false, requiredWhen: 'new_holiday', source: 'holiday', from: 'holiday.unit', default: 'hours', choices: UNIT_CHOICES },
    ],
    subject: 'Confirmation of your new hours',
    derive: v => ({ holiday_unit_word: unitWord(v.holiday_unit) }),
    body: [
      DEAR,
      { t: 'p', when: '!agreed_on', text: 'I am writing to confirm the change to your contracted hours.' },
      { t: 'p', when: 'agreed_on', text: 'Following our conversation on {{agreed_on}}, I am writing to confirm the change to your contracted hours.' },
      { t: 'p', when: 'old_hours', text: 'From {{effective_date}}, your contracted hours will change from {{old_hours}} hours a week to {{new_hours}} hours a week.' },
      { t: 'p', when: '!old_hours', text: 'From {{effective_date}}, your contracted hours will be {{new_hours}} hours a week.' },
      { t: 'p', when: 'basis=request', text: 'This change is being made at your request.' },
      { t: 'p', when: 'basis=service', text: 'This change is being made because of the needs of the service.' },
      { t: 'p', when: 'pattern', text: 'Your working pattern will be: {{pattern}}' },
      { t: 'p', when: 'new_holiday', text: 'Because your hours are changing, your annual leave allowance changes too. For the leave year it will be {{new_holiday}} {{holiday_unit_word}}.' },
      { t: 'p', text: 'The rest of your terms and conditions stay the same unless we have told you otherwise in writing.' },
      { t: 'p', text: 'Please sign and return a copy of this letter to show that you agree to the change. If you have any questions, please speak to me.' },
    ],
    closing: 'Yours sincerely,',
    acknowledgement: { text: 'I confirm that I have read this letter and agree to the change to my contracted hours.' },
    beforeYouSend: [
      'A change to hours is a change to the terms of employment, so it needs the person\'s agreement or a proper process. Check which applies.',
      STATEMENT_NOTE,
      'Update the rota, payroll and the person\'s holiday allowance in CareStream when the change takes effect.',
      FIT_NOTE,
    ],
    references: [REF.eraS4, REF.holiday],
  },

  {
    id: 'role-change', title: 'Change of role or promotion', category: 'contract', approvalRequired: true,
    description: 'Confirms a promotion or a change of duties, with the new job title, start date and any change to pay.',
    whoFor: 'One member of staff who is moving into a new role.',
    fields: [
      { key: 'change_type', label: 'What kind of change', type: 'choice', required: true, source: 'admin', default: 'promotion', choices: [{ value: 'promotion', label: 'Promotion' }, { value: 'duties', label: 'Change of duties' }] },
      { key: 'effective_date', label: 'Starts on', type: 'date', required: true, source: 'admin' },
      { key: 'old_role', label: 'Current job title', type: 'text', required: false, source: 'staff', from: 'staff.jobRole' },
      { key: 'new_role', label: 'New job title', type: 'text', required: true, source: 'admin' },
      { key: 'new_rate', label: 'New hourly rate (optional)', type: 'money', required: false, source: 'admin' },
      { key: 'reports_to', label: 'Who they will report to (optional)', type: 'text', required: false, source: 'admin' },
      { key: 'trial_period', label: 'Settling in period (optional)', type: 'text', required: false, source: 'admin', help: 'For example: three months.' },
      { key: 'note', label: 'Anything else to say (optional)', type: 'longtext', required: false, source: 'admin' },
    ],
    subject: 'Your new role: {{new_role}}',
    body: [
      DEAR,
      { t: 'p', when: 'change_type=promotion', text: 'I am delighted to confirm your promotion to {{new_role}} at {{service_name}}, starting on {{effective_date}}. It is well deserved.' },
      { t: 'p', when: 'change_type=duties', text: 'I am writing to confirm a change to your role at {{service_name}}. From {{effective_date}} you will be working as {{new_role}}.' },
      { t: 'p', when: 'old_role', text: 'Until then you will continue as {{old_role}}.' },
      { t: 'p', when: 'new_rate', text: 'Your hourly rate in the new role will be {{new_rate}}.' },
      { t: 'p', when: 'reports_to', text: 'In your new role you will report to {{reports_to}}.' },
      { t: 'p', when: 'trial_period', text: 'We will review how you are settling in after {{trial_period}}, and you can talk to me at any time before then.' },
      { t: 'p', when: 'note', text: '{{note}}' },
      { t: 'p', text: 'The rest of your terms and conditions stay the same unless we have told you otherwise in writing. Please sign and return a copy of this letter.' },
      { t: 'p', text: 'Thank you for all you have done so far. I am looking forward to working with you in your new role.' },
    ],
    closing: 'Yours sincerely,',
    acknowledgement: { text: 'I confirm that I have read this letter and accept the change to my role.' },
    beforeYouSend: [
      'Check any change to pay meets the National Living Wage or National Minimum Wage for the person\'s age band.',
      STATEMENT_NOTE,
      'Update the job title and rate in CareStream and with payroll.',
      FIT_NOTE,
    ],
    references: [REF.eraS4, REF.nmw],
  },

  {
    id: 'annual-leave-statement', title: 'Annual leave statement', category: 'leave', approvalRequired: true,
    description: 'A clear summary of someone\'s holiday for the leave year: allowance, carried over, taken, booked and left.',
    whoFor: 'Any member of staff, for example at the start or the end of the leave year.',
    fields: [
      { key: 'year_start', label: 'Leave year starts', type: 'date', required: true, source: 'holiday', from: 'holiday.yearStart' },
      { key: 'year_end', label: 'Leave year ends', type: 'date', required: true, source: 'holiday', from: 'holiday.yearEnd' },
      { key: 'unit', label: 'Counted in', type: 'choice', required: true, source: 'holiday', from: 'holiday.unit', default: 'hours', choices: UNIT_CHOICES },
      { key: 'allowance', label: 'Allowance for the year', type: 'number', required: true, source: 'holiday', from: 'holiday.allowance' },
      { key: 'carried_in', label: 'Carried over from last year (optional)', type: 'number', required: false, source: 'holiday', from: 'holiday.carriedIn' },
      { key: 'taken', label: 'Taken so far', type: 'number', required: true, source: 'holiday', from: 'holiday.taken' },
      { key: 'booked', label: 'Booked and still to come', type: 'number', required: true, source: 'holiday', from: 'holiday.booked' },
      { key: 'remaining', label: 'Left to book', type: 'number', required: true, source: 'holiday', from: 'holiday.remaining' },
    ],
    subject: 'Your annual leave: {{year_start}} to {{year_end}}',
    derive: v => ({ unit_word: unitWord(v.unit) }),
    body: [
      DEAR,
      { t: 'p', text: 'Here is a summary of your annual leave for the leave year from {{year_start}} to {{year_end}}.' },
      { t: 'li', text: 'Your allowance for the year: {{allowance}} {{unit_word}}' },
      { t: 'li', when: 'carried_in', text: 'Carried over from last year: {{carried_in}} {{unit_word}}' },
      { t: 'li', text: 'Taken so far: {{taken}} {{unit_word}}' },
      { t: 'li', text: 'Booked and still to come: {{booked}} {{unit_word}}' },
      { t: 'li', text: 'Left to book: {{remaining}} {{unit_word}}' },
      { t: 'p', text: 'You can see your holiday at any time, and ask for time off, under My holidays in your CareStream hub.' },
      { t: 'p', text: 'If these figures do not match your own records, please let me know and we will check them together.' },
    ],
    closing: 'Yours sincerely,',
    beforeYouSend: [
      'Check the figures against the holiday matrix in CareStream. They were filled in from it, but you may have changed things since.',
      'For people who joined part way through the year, the allowance should already be worked out part year. Check it is right.',
      'The statutory minimum is 5.6 weeks of paid holiday a year, and your contract may give more. Check the allowance is not below it.',
      FIT_NOTE,
    ],
    references: [REF.holiday],
  },

  {
    id: 'holiday-carry-over', title: 'Holiday carried over', category: 'leave', approvalRequired: true,
    description: 'Confirms how much unused holiday is carried into the new leave year, and any date it must be used by.',
    whoFor: 'A member of staff with holiday carried over from the last leave year.',
    fields: [
      { key: 'year_end', label: 'Last leave year ended on', type: 'date', required: true, source: 'holiday', from: 'holiday.yearEnd' },
      { key: 'new_year_start', label: 'New leave year starts on', type: 'date', required: true, source: 'admin' },
      { key: 'unit', label: 'Counted in', type: 'choice', required: true, source: 'holiday', from: 'holiday.unit', default: 'hours', choices: UNIT_CHOICES },
      { key: 'carried_over', label: 'Amount carried over', type: 'number', required: true, source: 'holiday', from: 'holiday.remaining' },
      { key: 'new_allowance', label: 'Allowance for the new year (optional)', type: 'number', required: false, source: 'holiday', from: 'holiday.allowance' },
      { key: 'use_by', label: 'Must be used by (optional)', type: 'date', required: false, source: 'admin' },
      { key: 'note', label: 'Anything else to say (optional)', type: 'longtext', required: false, source: 'admin' },
    ],
    subject: 'Holiday carried over into your new leave year',
    derive: v => {
      const a = num(v.new_allowance), c = num(v.carried_over)
      return { unit_word: unitWord(v.unit), ...(a != null && c != null ? { total_available: fmtNumber(a + c) } : {}) }
    },
    body: [
      DEAR,
      { t: 'p', text: 'I am writing to confirm the holiday you are carrying over from your last leave year, which ended on {{year_end}}.' },
      { t: 'p', text: 'You are carrying over {{carried_over}} {{unit_word}}. This is added to your allowance for the new leave year, which starts on {{new_year_start}}.' },
      { t: 'p', when: 'total_available', text: 'With your new allowance of {{new_allowance}} {{unit_word}}, you have {{total_available}} {{unit_word}} available to book in the new leave year.' },
      { t: 'p', when: 'use_by', text: 'Please use the carried over holiday by {{use_by}}.' },
      { t: 'p', when: 'note', text: '{{note}}' },
      { t: 'p', text: 'You can ask for time off under My holidays in your CareStream hub. If you have any questions, please speak to me.' },
    ],
    closing: 'Yours sincerely,',
    beforeYouSend: [
      'Check the amount carried over fits your contract and your holiday policy. Holiday that the law requires people to be able to take may have special rules, so check before you limit or remove it.',
      'Check the figure against the holiday matrix in CareStream.',
      FIT_NOTE,
    ],
    references: [REF.holiday],
  },

  {
    id: 'holiday-pay-on-leaving', title: 'Holiday pay when someone leaves', category: 'leaving', approvalRequired: true,
    description: 'Sets out the holiday someone has built up and taken at their last day, and what that means for their final pay.',
    whoFor: 'A member of staff who is leaving part way through a leave year.',
    fields: [
      { key: 'last_day', label: 'Last day of employment', type: 'date', required: true, source: 'admin' },
      { key: 'year_start', label: 'Leave year started on', type: 'date', required: true, source: 'holiday', from: 'holiday.yearStart' },
      { key: 'unit', label: 'Counted in', type: 'choice', required: true, source: 'holiday', from: 'holiday.unit', default: 'hours', choices: UNIT_CHOICES },
      { key: 'accrued', label: 'Holiday built up to the last day', type: 'number', required: true, source: 'admin', help: 'Work this out part year from the allowance. The letter shows exactly what you type.' },
      { key: 'taken', label: 'Holiday taken (and booked up to the last day)', type: 'number', required: true, source: 'holiday', from: 'holiday.taken' },
      { key: 'balance', label: 'Balance (built up minus taken)', type: 'number', required: true, source: 'admin', help: 'Positive means holiday is owed to the person. Negative means they have taken more than they built up.' },
      { key: 'hourly_rate', label: 'Hourly rate used (optional)', type: 'money', required: false, source: 'pay', from: 'pay.weekday' },
      { key: 'payment', label: 'Payment for untaken holiday (optional)', type: 'money', required: false, source: 'admin' },
      { key: 'pay_date', label: 'Final pay date (optional)', type: 'date', required: false, source: 'admin' },
      { key: 'note', label: 'Anything else to say (optional)', type: 'longtext', required: false, source: 'admin' },
    ],
    subject: 'Your holiday when you leave',
    derive: v => {
      const b = num(v.balance)
      return { unit_word: unitWord(v.unit), ...(b != null ? { balance_abs: fmtNumber(Math.abs(b)), balance_status: b > 0 ? 'owed' : b < 0 ? 'over' : 'none' } : {}) }
    },
    body: [
      DEAR,
      { t: 'p', text: 'Your employment at {{service_name}} ends on {{last_day}}. This letter sets out your annual leave at that date.' },
      { t: 'li', text: 'Holiday built up in this leave year to {{last_day}}: {{accrued}} {{unit_word}}' },
      { t: 'li', text: 'Holiday taken: {{taken}} {{unit_word}}' },
      { t: 'p', when: 'balance_status=owed', text: 'You have {{balance_abs}} {{unit_word}} of holiday that has not been taken. This will be paid to you with your final pay.' },
      { t: 'p', when: 'balance_status=owed&&payment', text: 'The payment is {{payment}}, worked out at {{hourly_rate}} an hour.' },
      { t: 'p', when: 'balance_status=over', text: 'You have taken {{balance_abs}} {{unit_word}} more than you had built up by your last day.' },
      { t: 'p', when: 'balance_status=none', text: 'You have no untaken holiday, so there is no holiday payment to make.' },
      { t: 'p', when: 'pay_date', text: 'Your final pay will be paid on {{pay_date}}.' },
      { t: 'p', when: 'note', text: '{{note}}' },
      { t: 'p', text: 'If you think any of these figures are wrong, please tell me as soon as you can so that we can put it right before your final pay.' },
    ],
    closing: 'Yours sincerely,',
    beforeYouSend: [
      'When employment ends part way through a leave year, the Working Time Regulations 1998 (regulation 14) cover the payment for untaken holiday. Check the figure with your payroll provider or adviser.',
      'Check how your contract says holiday pay is calculated, and whether it allows anything to be taken from final pay if more holiday has been taken than was built up. Do not deduct unless your contract clearly allows it.',
      'The built up figure is worked out part year from the allowance. Check the leave year dates and the calculation.',
      FIT_NOTE,
    ],
    references: [REF.wtr14, REF.holiday],
  },

  {
    id: 'probation-passed', title: 'Probation passed', category: 'development', approvalRequired: true,
    description: 'Tells someone they have successfully completed their probation, with a note of what has gone well.',
    whoFor: 'A new member of staff who has completed probation.',
    fields: [
      { key: 'probation_end', label: 'Probation ended on', type: 'date', required: true, source: 'admin' },
      { key: 'strengths', label: 'What has gone well (optional)', type: 'longtext', required: false, source: 'admin' },
      { key: 'next_steps', label: 'What comes next (optional)', type: 'longtext', required: false, source: 'admin', help: 'For example training, a development goal or a change to their notice period.' },
    ],
    subject: 'Your probation',
    body: [
      DEAR,
      { t: 'p', text: 'I am very pleased to confirm that you have successfully completed your probationary period at {{service_name}}, which ended on {{probation_end}}.' },
      { t: 'p', when: 'strengths', text: '{{strengths}}' },
      { t: 'p', text: 'Thank you for the way you have settled in and for the care you have given to the people we support.' },
      { t: 'p', when: 'next_steps', text: '{{next_steps}}' },
      { t: 'p', text: 'Your employment continues on the terms in your contract. If you would like to talk about your development, please come and see me.' },
    ],
    closing: 'Yours sincerely,',
    beforeYouSend: [
      'Check the date matches your probation records and the person\'s contract.',
      'If any term changes after probation, such as notice, that is a change to the terms of employment and needs confirming in writing.',
      STATEMENT_NOTE,
      FIT_NOTE,
    ],
    references: [REF.eraS4],
  },

  {
    id: 'supervision-reminder', title: 'Supervision reminder', category: 'development', approvalRequired: true,
    description: 'A friendly reminder that a supervision is due, with a suggested date and what to bring.',
    whoFor: 'A member of staff whose supervision is due or overdue.',
    fields: [
      { key: 'due_by', label: 'Supervision is due by', type: 'date', required: true, source: 'admin' },
      { key: 'last_supervision', label: 'Last supervision (optional)', type: 'date', required: false, source: 'admin' },
      { key: 'proposed_date', label: 'Suggested date (optional)', type: 'date', required: false, source: 'admin' },
      { key: 'proposed_time', label: 'Suggested time (optional)', type: 'text', required: false, source: 'admin' },
      { key: 'location', label: 'Where (optional)', type: 'text', required: false, source: 'admin' },
      { key: 'topics', label: 'Things to think about before we meet (optional, one per line)', type: 'list', required: false, source: 'admin' },
    ],
    subject: 'Your supervision',
    body: [
      DEAR,
      { t: 'p', text: 'This is a friendly reminder that your supervision is due by {{due_by}}.' },
      { t: 'p', when: 'last_supervision', text: 'Your last supervision was on {{last_supervision}}.' },
      { t: 'p', text: 'Supervision is your time to talk about how things are going, what is working well, and anything you need from me or the team to do your job well.' },
      { t: 'p', when: 'proposed_date', text: 'I would like to suggest {{proposed_date}}.' },
      { t: 'p', when: 'proposed_time', text: 'The time would be {{proposed_time}}.' },
      { t: 'p', when: 'location', text: 'We would meet at {{location}}.' },
      { t: 'p', when: 'topics', text: 'It would help if you could think about the following before we meet:' },
      { t: 'list', field: 'topics', when: 'topics' },
      { t: 'p', text: 'If the date does not work for you, please let me know and we will find another time.' },
    ],
    closing: 'Yours sincerely,',
    beforeYouSend: [
      'Supervision and appraisal are part of the support staff are expected to receive (Health and Social Care Act 2008 (Regulated Activities) Regulations 2014, regulation 18). Record the supervision when it happens.',
      'This is a supportive reminder. If supervision has been missed because of the service, say so rather than putting the blame on the person.',
      FIT_NOTE,
    ],
    references: [REF.reg18],
  },

  {
    id: 'appraisal-invitation', title: 'Appraisal invitation', category: 'development', approvalRequired: true,
    description: 'Invites someone to their appraisal, with the date, place and how to prepare.',
    whoFor: 'A member of staff who is due an appraisal.',
    fields: [
      { key: 'appraisal_date', label: 'Appraisal date', type: 'date', required: true, source: 'admin' },
      { key: 'appraisal_time', label: 'Time', type: 'text', required: true, source: 'admin' },
      { key: 'location', label: 'Where', type: 'text', required: true, source: 'admin' },
      { key: 'review_from', label: 'Looking back from (optional)', type: 'date', required: false, source: 'admin' },
      { key: 'review_to', label: 'Looking back to (optional)', type: 'date', required: false, source: 'admin' },
      { key: 'note', label: 'Anything else to say (optional)', type: 'longtext', required: false, source: 'admin' },
    ],
    subject: 'Your appraisal on {{appraisal_date}}',
    body: [
      DEAR,
      { t: 'p', text: 'I would like to invite you to your appraisal on {{appraisal_date}} at {{appraisal_time}}. We will meet at {{location}}.' },
      { t: 'p', when: 'review_from&&review_to', text: 'We will look back at the time from {{review_from}} to {{review_to}}.' },
      { t: 'p', text: 'An appraisal is a chance to talk about what you have achieved, what you have enjoyed, and where you would like to go next. To get the most from it, it helps if you can think about:' },
      { t: 'li', text: 'What you are proud of since your last appraisal' },
      { t: 'li', text: 'What has been difficult, and what would have helped' },
      { t: 'li', text: 'Training or experience you would like' },
      { t: 'li', text: 'Your goals for the coming year' },
      { t: 'p', when: 'note', text: '{{note}}' },
      { t: 'p', text: 'If the date does not suit you, please let me know and we will find another time.' },
    ],
    closing: 'Yours sincerely,',
    beforeYouSend: [
      'Supervision and appraisal are part of the support staff are expected to receive (regulation 18 of the 2014 Regulated Activities Regulations). Record the appraisal when it happens.',
      FIT_NOTE,
    ],
    references: [REF.reg18],
  },

  {
    id: 'overdue-training', title: 'Overdue training reminder', category: 'compliance', approvalRequired: true,
    description: 'A supportive reminder that mandatory training has passed its date, listing the courses and a new date to finish them.',
    whoFor: 'A member of staff with overdue mandatory training.',
    fields: [
      { key: 'courses', label: 'Overdue courses (one per line)', type: 'list', required: true, source: 'admin' },
      { key: 'was_due', label: 'They were due on (optional)', type: 'date', required: false, source: 'admin' },
      { key: 'complete_by', label: 'Please complete by', type: 'date', required: true, source: 'admin' },
      { key: 'where', label: 'Where to do it', type: 'text', required: true, source: 'admin', default: 'in your CareStream hub under My Training' },
      { key: 'support', label: 'Help you can offer (optional)', type: 'longtext', required: false, source: 'admin', help: 'For example time on shift to do it, or a quiet space.' },
    ],
    subject: 'Training that needs to be completed',
    body: [
      DEAR,
      { t: 'p', when: 'was_due', text: 'Our records show that the following training was due on {{was_due}} and has not yet been completed:' },
      { t: 'p', when: '!was_due', text: 'Our records show that the following training has not yet been completed:' },
      { t: 'list', field: 'courses' },
      { t: 'p', text: 'This training is part of keeping the people we support safe, and it keeps your own skills up to date. Please complete it by {{complete_by}}. You can do it {{where}}.' },
      { t: 'p', when: 'support', text: '{{support}}' },
      { t: 'p', text: 'If something is making it hard to finish, or the records look wrong, please tell me and we will sort it out together.' },
    ],
    closing: 'Yours sincerely,',
    beforeYouSend: [
      'Check the list against the training records in CareStream. The course may have been completed since.',
      'Staff should have the training they need to do their job safely (Health and Social Care Act 2008 (Regulated Activities) Regulations 2014, regulation 18). Make sure people have the time to do it.',
      FIT_NOTE,
    ],
    references: [REF.reg18],
  },

  {
    id: 'dbs-right-to-work-request', title: 'DBS or right to work document request', category: 'compliance', approvalRequired: true,
    description: 'Asks someone for the documents needed to renew or complete a DBS check or a right to work check.',
    whoFor: 'A member of staff whose DBS check or right to work check needs updating.',
    fields: [
      { key: 'request_kind', label: 'Which check', type: 'choice', required: true, source: 'admin', default: 'dbs',
        choices: [{ value: 'dbs', label: 'DBS check or update' }, { value: 'rtw', label: 'Right to work check' }, { value: 'both', label: 'Both' }] },
      { key: 'reason', label: 'Why we need it', type: 'choice', required: true, source: 'admin', default: 'renewal',
        choices: [{ value: 'renewal', label: 'It is due for renewal' }, { value: 'expiring', label: 'A document is about to expire' }, { value: 'routine', label: 'A routine check' }] },
      { key: 'expiry_date', label: 'Date it runs out (optional)', type: 'date', required: false, source: 'admin' },
      { key: 'needed_by', label: 'Please bring or send by', type: 'date', required: true, source: 'admin' },
      { key: 'how', label: 'How to give it to us (optional)', type: 'text', required: false, source: 'admin', help: 'For example: bring the original documents to the office and I will check them with you.' },
    ],
    subject: 'Documents we need from you',
    body: [
      DEAR,
      { t: 'p', when: 'reason=renewal', text: 'Your records at {{service_name}} show that a check is due for renewal.' },
      { t: 'p', when: 'reason=expiring', text: 'Your records at {{service_name}} show that a document is about to expire.' },
      { t: 'p', when: 'reason=routine', text: 'We are carrying out a routine check of staff records at {{service_name}}.' },
      { t: 'p', when: 'request_kind=dbs', text: 'We need to update your DBS check.' },
      { t: 'p', when: 'request_kind=rtw', text: 'We need to check, and keep a record of, your right to work.' },
      { t: 'p', when: 'request_kind=both', text: 'We need to update your DBS check, and to check and keep a record of your right to work.' },
      { t: 'p', when: 'expiry_date', text: 'The date it runs out is {{expiry_date}}.' },
      { t: 'p', text: 'Please give us the documents you need for this by {{needed_by}}.' },
      { t: 'p', when: 'how', text: '{{how}}' },
      { t: 'p', text: 'We will only use these documents for this check and will keep them safe. If you have any questions, or are not sure which documents to bring, please speak to me.' },
    ],
    closing: 'Yours sincerely,',
    beforeYouSend: [
      'For right to work checks, follow the Home Office guide for employers, including how documents are checked and what records you must keep.',
      'Ask only for what you need, and keep the documents securely under your data protection policy.',
      FIT_NOTE,
    ],
    references: [REF.rtw],
  },

  {
    id: 'thank-you', title: 'Thank you and recognition', category: 'recognition', approvalRequired: true,
    description: 'A personal thank you for something someone has done.',
    whoFor: 'Any member of staff you want to recognise.',
    fields: [
      { key: 'reason', label: 'What you want to thank them for', type: 'longtext', required: true, source: 'admin', help: 'Write it as full sentences, for example: When Mrs Ahmed was unwell last Tuesday you stayed calm and kept her comfortable until help arrived.' },
      { key: 'occasion_date', label: 'When it happened (optional)', type: 'date', required: false, source: 'admin' },
      { key: 'gift', label: 'A thank you gift (optional)', type: 'text', required: false, source: 'admin' },
      { key: 'personal_note', label: 'A personal note (optional)', type: 'longtext', required: false, source: 'admin' },
    ],
    subject: 'Thank you',
    body: [
      DEAR,
      { t: 'p', text: 'I wanted to write to say a very sincere thank you.' },
      { t: 'p', text: '{{reason}}' },
      { t: 'p', when: 'occasion_date', text: 'This was on {{occasion_date}}.' },
      { t: 'p', text: 'It made a real difference to the people we support and to the team, and it has not gone unnoticed.' },
      { t: 'p', when: 'gift', text: 'As a small thank you, we would like to give you {{gift}}.' },
      { t: 'p', when: 'personal_note', text: '{{personal_note}}' },
      { t: 'p', text: 'Thank you for being part of {{service_name}}.' },
    ],
    closing: 'With thanks,',
    beforeYouSend: [
      'If the thank you includes a gift or a payment, check how it is treated by payroll and tax.',
      FIT_NOTE,
    ],
    references: [],
  },

  {
    id: 'long-service', title: 'Long service recognition', category: 'recognition', approvalRequired: true,
    description: 'Marks a number of years of service with a warm letter and, if you wish, an award.',
    whoFor: 'A member of staff reaching an anniversary of service.',
    fields: [
      { key: 'years', label: 'Years of service', type: 'number', required: true, source: 'admin' },
      { key: 'start_date', label: 'Date they started (optional)', type: 'date', required: false, source: 'staff', from: 'staff.startDate' },
      { key: 'recognition', label: 'Award or gift (optional)', type: 'text', required: false, source: 'admin' },
      { key: 'event', label: 'Celebration (optional)', type: 'text', required: false, source: 'admin', help: 'For example: a tea party for the team on Friday at 3pm.' },
      { key: 'note', label: 'Something personal to say (optional)', type: 'longtext', required: false, source: 'admin' },
    ],
    subject: 'Congratulations on {{years}} years',
    body: [
      DEAR,
      { t: 'p', text: 'Congratulations on {{years}} years at {{service_name}}.' },
      { t: 'p', when: 'start_date', text: 'You joined us on {{start_date}}, and in all that time you have been part of the lives of the people we support and of the team around you.' },
      { t: 'p', when: '!start_date', text: 'In all that time you have been part of the lives of the people we support and of the team around you.' },
      { t: 'p', when: 'note', text: '{{note}}' },
      { t: 'p', when: 'recognition', text: 'To say thank you, we would like to give you {{recognition}}.' },
      { t: 'p', when: 'event', text: '{{event}}' },
      { t: 'p', text: 'Thank you for your loyalty, your skill and your kindness.' },
    ],
    closing: 'With thanks,',
    beforeYouSend: [
      'If the recognition includes a gift or a payment, check how it is treated by payroll and tax.',
      FIT_NOTE,
    ],
    references: [],
  },

  {
    id: 'resignation-acknowledged', title: 'Resignation acknowledged', category: 'leaving', approvalRequired: true,
    description: 'Acknowledges someone\'s resignation, confirms their last day and what happens next.',
    whoFor: 'A member of staff who has handed in their notice.',
    fields: [
      { key: 'received_on', label: 'Date you received their resignation', type: 'date', required: true, source: 'admin' },
      { key: 'last_day', label: 'Last day of employment', type: 'date', required: true, source: 'admin' },
      { key: 'notice_note', label: 'Note about notice (optional)', type: 'text', required: false, source: 'admin', help: 'For example: in line with the four weeks in your contract.' },
      { key: 'holiday_left', label: 'Holiday left to take (optional)', type: 'number', required: false, source: 'holiday', from: 'holiday.remaining' },
      { key: 'unit', label: 'Counted in', type: 'choice', required: false, requiredWhen: 'holiday_left', source: 'holiday', from: 'holiday.unit', default: 'hours', choices: UNIT_CHOICES },
      { key: 'exit_chat', label: 'Date of a leaving conversation (optional)', type: 'date', required: false, source: 'admin' },
      { key: 'handover', label: 'Handover to arrange (optional)', type: 'longtext', required: false, source: 'admin' },
    ],
    subject: 'Your resignation',
    derive: v => ({ unit_word: unitWord(v.unit) }),
    body: [
      DEAR,
      { t: 'p', text: 'Thank you for your letter of {{received_on}}. I am sorry that you are leaving {{service_name}}, and I want to thank you for everything you have given to the people we support and to the team.' },
      { t: 'p', text: 'I can confirm that your last day of employment will be {{last_day}}.' },
      { t: 'p', when: 'notice_note', text: '{{notice_note}}' },
      { t: 'p', when: 'holiday_left', text: 'You have {{holiday_left}} {{unit_word}} of holiday left. Please talk to me about whether you would like to take it before you leave. Any holiday that has not been taken will be dealt with in your final pay, and I will write to you separately about that.' },
      { t: 'p', when: 'handover', text: '{{handover}}' },
      { t: 'p', when: 'exit_chat', text: 'I would like to invite you to a leaving conversation on {{exit_chat}}, so that we can hear how we could do things better and say a proper goodbye.' },
      { t: 'p', text: 'If there is anything you need from us before you go, please let me know.' },
    ],
    closing: 'Yours sincerely,',
    beforeYouSend: [
      'Check the last day matches the notice in the person\'s contract, or the date you have agreed with them.',
      'Record the resignation and the last day in CareStream and with payroll.',
      'Holiday pay for untaken holiday is covered by the Working Time Regulations 1998 (regulation 14). Use the holiday pay letter for the figures.',
      FIT_NOTE,
    ],
    references: [REF.wtr14],
  },

  {
    id: 'leaving-letter', title: 'Leaving letter', category: 'leaving', approvalRequired: true,
    description: 'The letter someone receives as they leave: thanks, handover, items to return, final pay and holiday.',
    whoFor: 'A member of staff who is leaving the service.',
    fields: [
      { key: 'last_day', label: 'Last day of employment', type: 'date', required: true, source: 'admin' },
      { key: 'thanks_note', label: 'A personal thank you (optional)', type: 'longtext', required: false, source: 'admin' },
      { key: 'return_items', label: 'Items to return (optional, one per line)', type: 'list', required: false, source: 'admin', help: 'For example: uniform, keys, ID badge.' },
      { key: 'handover', label: 'Handover still to do (optional)', type: 'longtext', required: false, source: 'admin' },
      { key: 'final_pay_date', label: 'Final pay will be paid on (optional)', type: 'date', required: false, source: 'admin' },
      { key: 'holiday_summary', label: 'Holiday and final pay (optional)', type: 'longtext', required: false, source: 'admin', help: 'For example: You have 12 hours of holiday that has not been taken. This will be paid with your final pay.' },
      { key: 'paperwork_note', label: 'Paperwork they will receive (optional)', type: 'text', required: false, source: 'admin', help: 'For example: Payroll will send your P45.' },
      { key: 'reference', label: 'Offer a reference', type: 'choice', required: true, source: 'admin', default: 'yes', choices: YES_NO },
    ],
    subject: 'Your last day at {{service_name}}',
    body: [
      DEAR,
      { t: 'p', text: 'Your last day of employment at {{service_name}} is {{last_day}}. On behalf of everyone here, thank you for the care and commitment you have shown.' },
      { t: 'p', when: 'thanks_note', text: '{{thanks_note}}' },
      { t: 'p', when: 'handover', text: 'Before you go, there is still some handover to do: {{handover}}' },
      { t: 'p', when: 'return_items', text: 'Please return the following on or before your last day:' },
      { t: 'list', field: 'return_items', when: 'return_items' },
      { t: 'p', when: 'holiday_summary', text: '{{holiday_summary}}' },
      { t: 'p', when: 'final_pay_date', text: 'Your final pay will be paid on {{final_pay_date}}.' },
      { t: 'p', when: 'paperwork_note', text: '{{paperwork_note}}' },
      { t: 'p', when: 'reference=yes', text: 'If you need a reference in the future, please ask and we will be happy to provide one.' },
      { t: 'p', text: 'We wish you every success and happiness in whatever comes next. You will always be welcome to visit.' },
    ],
    closing: 'With best wishes,',
    beforeYouSend: [
      'Check the last day, the holiday and the final pay figures with payroll.',
      'Holiday pay for untaken holiday is covered by the Working Time Regulations 1998 (regulation 14).',
      'Make sure the person\'s access to systems, keys and records is ended on their last day.',
      FIT_NOTE,
    ],
    references: [REF.wtr14],
  },

  {
    id: 'policy-change-notice', title: 'Staff handbook or policy change', category: 'policy', approvalRequired: true,
    description: 'Tells staff a policy or part of the handbook has changed, what changes, and where to read it, with an acknowledgement.',
    whoFor: 'All staff affected by the change.',
    fields: [
      { key: 'policy_name', label: 'Name of the policy or handbook section', type: 'text', required: true, source: 'admin' },
      { key: 'effective_date', label: 'The change starts on', type: 'date', required: true, source: 'admin' },
      { key: 'summary', label: 'Why it is changing', type: 'longtext', required: true, source: 'admin' },
      { key: 'changes', label: 'What is changing (optional, one per line)', type: 'list', required: false, source: 'admin' },
      { key: 'where_found', label: 'Where to read the new version', type: 'text', required: true, source: 'admin', default: 'in your CareStream hub under Policies' },
      { key: 'ack_required', label: 'Ask them to sign to say they have read it', type: 'choice', required: true, source: 'admin', default: 'yes', choices: YES_NO },
      { key: 'ack_by', label: 'Please read and sign by (optional)', type: 'date', required: false, source: 'admin' },
    ],
    subject: 'Change to {{policy_name}}',
    body: [
      DEAR,
      { t: 'p', text: 'I am writing to let you know about a change to our {{policy_name}}, which starts on {{effective_date}}.' },
      { t: 'p', text: '{{summary}}' },
      { t: 'p', when: 'changes', text: 'The main changes are:' },
      { t: 'list', field: 'changes', when: 'changes' },
      { t: 'p', text: 'You can read the new version {{where_found}}.' },
      { t: 'p', when: 'ack_required=yes&&ack_by', text: 'Please read it and sign below by {{ack_by}}.' },
      { t: 'p', when: 'ack_required=yes&&!ack_by', text: 'Please read it and sign below to show that you have.' },
      { t: 'p', text: 'If anything is unclear, or you would like to talk it through, please speak to me.' },
    ],
    closing: 'Yours sincerely,',
    acknowledgement: { when: 'ack_required=yes', text: 'I confirm that I have read and understood the changes to the {{policy_name}}.' },
    beforeYouSend: [
      'If the change alters a term of someone\'s contract, it needs their agreement or a proper process, and written confirmation of the change within one month (Employment Rights Act 1996, section 4). Check whether this applies.',
      'Make sure the new version of the policy is where the letter says it is before you send this.',
      FIT_NOTE,
    ],
    references: [REF.eraS4],
  },
]

/** Every Tier 1 template, with the fields every letter has added at the front. */
export const TEMPLATES: LetterTemplate[] = T.map(t => ({ ...t, fields: [...COMMON_FIELDS, ...t.fields] }))

/** Tier 2 letters Len has parked for later. Titles only: no wording is written for them, and none are in the registry. */
export const TIER2_PLANNED: string[] = [
  'Probation extension',
  'Sickness: return to work meeting invitation',
  'Sickness: absence review',
  'Sickness: welfare meeting',
  'Sickness: occupational health referral',
  'Attendance concern',
  'Flexible working request outcome',
  'Compassionate or bereavement leave',
  'Invitation to an investigation meeting',
  'Informal concerns about conduct',
  'Disciplinary hearing invitation',
  'Disciplinary warning',
  'Disciplinary appeal outcome',
  'Capability meeting invitation',
]

/** Said on every letter in the CareStream screens: it is a draft for an administrator to check. */
export const DRAFT_NOTE = 'This is a draft. Check that it fits this person\'s contract and your own policies before you send it. CareStream does not give legal advice.'
