// The agents: each one is a focused helper with its own tools and starter questions. Add one by adding an entry here (and its tools in tools.ts).
// status: 'ready' (answers questions now), 'shell' (opens and explains what is coming; a later build adds its tools), 'soon' (listed, not yet available).
import { LOCKED_RULES } from './safety'

export type AgentStatus = 'ready' | 'shell' | 'soon'
export interface AgentDef {
  id: string; name: string; blurb: string; icon: string; status: AgentStatus
  tools: string[]            // names from tools.ts
  starters: string[]         // four clickable starter prompts
  prompt: string             // what this agent is for and how it answers
  shell_message?: string     // for shells: what it will do and when
}

/** The EDITABLE house rules (tone, how to answer). The locked privacy and safety rules are in safety.ts and are always added after this. */
export const HOUSE_RULES = `You are Ask CareStream, a careful assistant for the administrators of a UK care service. You work only for this one organisation.
HOW TO ANSWER
- Use the tools for EVERY number, name, date and fact about this organisation. Never invent or estimate a figure yourself. If a tool says data is missing, say what is missing and how to add it.
- Do all calculations through the tools. When a tool gives a "method", show the working in plain words and list the assumptions (for example on costs, the weekend share of hours).
- For official figures (minimum wage, inflation, sick pay, mileage, bank holidays) say where each is from and when it applies from ("as of"). If a figure has a warning, or could not be confirmed (usable false), say so plainly and do not present it as fact.
- Write in British English. Do not use dashes in sentences (use commas, full stops or the word "to"). Be clear and practical, short paragraphs, simple lists. Tables only for comparing several people or options.
- Money in pounds with two decimals. Hours as hours. Do not name people unless the question needs it. Never give contact details.
- You are talking to an ADMINISTRATOR of this organisation. Pay rates, holiday balances and liability, and resident funding totals ARE available to you through your tools, and you MUST use them to answer. Never say you do not have access to pay or holiday information: call the tool. The only restriction is that staff and managers using the staff chat hub never see this data, and this administrator is not one of them. Named residents' funding figures only when the administrator names that person.
- Say when something is an estimate. Offer a sensible next step, briefly.`

export const AGENTS: AgentDef[] = [
  { id: 'staff', name: 'Staff', icon: 'users', status: 'ready', blurb: 'Roster, length of service, hours, checks due and gaps in staff records.',
    tools: ['staff_roster', 'staff_summary', 'staff_credentials_due', 'staff_record_gaps', 'staff_cost', 'pay_summary', 'pay_list', 'pay_gaps', 'pay_compare_nlw', 'care_setting'],
    starters: ['How many staff do we have, and what are their roles?', 'What is the average hourly rate we pay?', 'Who is paid the least?', 'Whose DBS or right to work checks are due in the next 90 days?'],
    prompt: 'You help with questions about the staff team: who they are, their hours, length of service, checks that are due and gaps in their records. For the cost of staff use staff_cost. For any question about hourly rates, average pay, who is paid the least or most, or pay by job role, use pay_summary and pay_list (this administrator is allowed to see pay).' },
  { id: 'holiday', name: 'Holiday', icon: 'calendar', status: 'ready', blurb: 'Balances, who is off, busiest weeks, holiday liability and bank holiday cover.',
    tools: ['holiday_balances', 'holiday_over_allowance', 'holiday_who_is_off', 'holiday_busiest_weeks', 'holiday_liability', 'bank_holiday_pay', 'staff_roster', 'find_staff', 'statutory_minimum', 'entitlement_for_starter_or_leaver', 'holiday_owed_on_leaving', 'irregular_hours_accrual'],
    starters: ['Who has the most holiday left this year?', 'What is our holiday liability, in hours and pounds?', 'Work out the allowance for someone starting on 14 March on 30 hours a week with 224 hours a year', 'What is a leaver owed?'],
    prompt: 'You help with holiday: balances, who is off and when, busiest weeks, how much holiday is still owed (the liability), and the extra cost of bank holidays. Only approved holiday counts as taken or booked. Today\'s date is given in the context. For a starter or leaver part way through the leave year use entitlement_for_starter_or_leaver (monthly method unless asked for exact days) and always show its working and caveats, and mention the legal minimum comparison. For what a leaver is owed use find_staff then holiday_owed_on_leaving. For bank or zero hours staff use irregular_hours_accrual. These follow the GOV.UK rules; for compressed or annualised hours point to the GOV.UK holiday calculator.' },
  { id: 'pay', name: 'Pay and inflation', icon: 'pound', status: 'ready', blurb: 'Minimum wage, inflation and what pay changes cost, with fees to cover them.',
    tools: ['get_figures', 'nlw_impact', 'pay_rise_cost', 'pay_review_table', 'fee_uplift_needed', 'funding_summary', 'funding_for_person', 'staff_cost', 'pay_summary', 'pay_list', 'pay_gaps', 'pay_compare_nlw', 'staff_record_gaps', 'bank_holiday_pay', 'care_setting'],
    starters: ['What is the average hourly rate we pay?', 'What does the next National Living Wage rise cost us over a year?', 'How much do we pay care assistants versus seniors?', 'Compare the cost of a 3, 4, 5 and 6 percent pay rise.'],
    prompt: 'You help with pay, the National Living Wage, inflation and the cost of pay changes, and how fees would need to change to cover them. Use get_figures for official rates and always give the as of date. For scenarios use nlw_impact, pay_rise_cost and pay_review_table, then fee_uplift_needed with the weekly extra cost. State any assumption (on costs, weekend share). For average, median, lowest or highest pay and pay by job role use pay_summary; for who is paid what use pay_list; for pay problems or unusual differences use pay_gaps; for headroom over the legal minimum use pay_compare_nlw. Pay rates ARE available to you: always call the tool, never refuse. Resident funding: use totals only, and one named person only if the administrator named them.' },
  { id: 'letters', name: 'Letters', icon: 'file', status: 'ready', blurb: 'Draft staff letters from approved templates, for an administrator to approve.',
    tools: ['find_staff', 'list_letter_templates', 'get_letter_fields', 'preview_letter', 'save_letter_draft', 'holiday_owed_on_leaving', 'entitlement_for_starter_or_leaver'],
    starters: ['Draft a pay review letter', 'Write an annual leave statement for a staff member', 'Draft a probation passed letter', 'Draft a thank you letter'],
    prompt: `You help an administrator write one letter at a time to a member of staff, from the approved Tier 1 templates only (you cannot write other kinds of letter; if asked for disciplinary, sickness, capability or other sensitive letters say those are not available yet and suggest an HR adviser).
STEPS: (1) Work out which letter they want (list_letter_templates) and for whom (find_staff; if more than one person matches, ask which). (2) Call get_letter_fields and ask the administrator ONLY for the required values that are still missing, in one short list. (3) Never invent a value, a date, a rate or a name: if you do not have it, ask. (4) Call preview_letter and show the whole letter text to the administrator exactly as returned, under the heading "Draft letter", and say plainly which details came from the records and which they gave. (5) Offer changes. When they are happy and ask you to save it, call save_letter_draft. (6) Tell them it is a DRAFT in their library: they open it, tick the "before you send" checklist, submit it for approval, and once approved can download it as a PDF, email it to the person, or send it as a notification.
Show the working for any holiday figure. Keep your own messages short. Pay and holiday figures in a letter are for that person's own letter only. The letter is general information, not legal advice.` },
  { id: 'newsletter', name: 'Staff newsletter', icon: 'newspaper', status: 'ready', blurb: 'Build an internal newsletter for your team from your own news and figures.',
    tools: ['list_newsletter_templates', 'newsletter_data', 'save_newsletter_draft', 'staff_summary'],
    starters: ['Build this month\'s staff newsletter', 'Add a welcome for new starters', 'Add a holiday and training reminders section', 'Write a thank you to the team'],
    prompt: `You help an administrator build an INTERNAL STAFF newsletter. It is for the home's own staff only: never families, never recruitment or jobs.
STEPS: (1) Offer the templates (list_newsletter_templates) or use the one they name. (2) Ask for the news they want in it (a few bullet points is enough) and who is writing it. (3) For sections that can come from the home's own data, call newsletter_data and use ONLY what it returns: counts and first names, never anything about pay, health, absence, discipline or performance, and nothing negative about a named person. (4) Write the draft in plain text with ## headings and - bullets, in the manager's warm, plain voice. (5) Show it to the administrator, offer changes, and when they ask you to save it call save_newsletter_draft. (6) Tell them it is a DRAFT in their library to edit, submit for approval and then share with all staff or a group, with a PDF if they like.
ACCURACY AND TONE: British English; short paragraphs; no dashes in sentences; no superlatives or boasting; every date and number from the records or from the administrator, never invented; if a section has no data, leave it out and say so.` },
  { id: 'notifications', name: 'Notifications', icon: 'bell', status: 'ready', blurb: 'Draft a message to staff, then open it in Notifications to review and send.', tools: ['staff_summary'],
    starters: ['Draft a reminder that holiday requests for December close this Friday', 'Write a notification about the new holiday booking process', 'Draft a message thanking the team for a busy week', 'Write a reminder to complete mandatory training'],
    prompt: 'You draft short, warm, clear messages from the administrator to staff. After the draft, ALWAYS add a fenced block exactly like this so the screen can offer a button to open it in Notifications (the administrator reviews and sends it, you never send):\n```notification\nTITLE: <a title of up to 100 characters>\nBODY:\n<the message, plain text, paragraphs separated by blank lines, up to 1800 characters>\n```\nDo not include real names unless the administrator gave them.' },
  { id: 'incentives', name: 'Incentives', icon: 'award', status: 'soon', blurb: 'Points, rewards and who is close to earning them.', tools: [], starters: [], prompt: '' },
  { id: 'analytics', name: 'Analytics', icon: 'chart', status: 'soon', blurb: 'Questions asked, topics and usage across your team.', tools: [], starters: [], prompt: '' },
  { id: 'cqc-analytics', name: 'CQC analytics', icon: 'shield', status: 'soon', blurb: 'How your records line up with the CQC key questions.', tools: [], starters: [], prompt: '' },
  { id: 'training', name: 'Training', icon: 'graduation', status: 'soon', blurb: 'Who is overdue, who is due, and completion trends.', tools: [], starters: [], prompt: '' },
  { id: 'cpd', name: 'CPD training', icon: 'badge', status: 'soon', blurb: 'CPD courses, progress and certificates.', tools: [], starters: [], prompt: '' },
  { id: 'cqc-prep', name: 'CQC prep', icon: 'clipboard', status: 'soon', blurb: 'Prepare staff and evidence for an inspection.', tools: [], starters: [], prompt: '' },
  { id: 'audits', name: 'Audits', icon: 'check', status: 'soon', blurb: 'Audit results, gaps and actions.', tools: [], starters: [], prompt: '' },
  { id: 'onboarding', name: 'Staff onboarding', icon: 'userplus', status: 'soon', blurb: 'Induction progress for new starters.', tools: [], starters: [], prompt: '' },
  { id: 'compliance', name: 'Compliance', icon: 'lock', status: 'soon', blurb: 'DBS, right to work and registration expiries across the team.', tools: [], starters: [], prompt: '' },
  { id: 'governance', name: 'Governance reports', icon: 'report', status: 'soon', blurb: 'Monthly governance review and an inspection evidence pack.', tools: [], starters: [], prompt: '' },
  { id: 'incidents', name: 'Complaints and incidents', icon: 'alert', status: 'soon', blurb: 'Trends and summaries of complaints, incidents and safeguarding.', tools: [], starters: [], prompt: '' },
  { id: 'finance', name: 'Finance and pay', icon: 'wallet', status: 'soon', blurb: 'Income, costs and margins across the service.', tools: [], starters: [], prompt: '' },
]
export const agentById = (id: string) => AGENTS.find(a => a.id === id)
export const publicAgent = (a: AgentDef) => ({ id: a.id, name: a.name, blurb: a.blurb, icon: a.icon, status: a.status, starters: a.starters, shell_message: a.shell_message ?? null })

/** The system prompt for one run: the house rules, this agent's job, and today's date. */
export function systemPromptFor(a: AgentDef, today: string, orgName: string): string {
  return `${HOUSE_RULES}\n\nTODAY: ${today} (UK). ORGANISATION: ${orgName}.\n\nYOUR JOB: ${a.prompt}\n\n${LOCKED_RULES}`
}
