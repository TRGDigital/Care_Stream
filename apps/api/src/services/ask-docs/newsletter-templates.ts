// Templates for the internal STAFF newsletter. Staff only: no families and no recruitment. A template is a list of sections; some can be filled from the home's own
// data (counts and first names only), the rest the administrator writes or asks the agent to draft. The finished newsletter is plain text with ## headings and - bullets.
export type NewsletterData = 'new_starters' | 'birthdays' | 'training' | 'holiday'
export interface NewsletterSection { key: string; title: string; hint: string; data?: NewsletterData }
export interface NewsletterTemplate { id: string; title: string; description: string; sections: NewsletterSection[] }

export const NEWSLETTER_TEMPLATES: NewsletterTemplate[] = [
  { id: 'monthly-update', title: 'Monthly team update', description: 'A friendly roundup for the whole team: news, welcomes, thank yous and what is coming up.',
    sections: [
      { key: 'welcome', title: 'A word from the manager', hint: 'A short, warm opening in the manager\'s own voice.' },
      { key: 'news', title: 'News from the home', hint: 'What has happened this month and what is changing.' },
      { key: 'new_starters', title: 'Welcome to our new starters', hint: 'Name, role and a welcome. From your staff records.', data: 'new_starters' },
      { key: 'thanks', title: 'Thank you', hint: 'Specific, kind thank yous for things people did.' },
      { key: 'birthdays', title: 'Birthdays this month', hint: 'First names and dates only. Only if your staff birthday greetings are switched on.', data: 'birthdays' },
      { key: 'training', title: 'Training and learning', hint: 'Courses completed this month, as counts.', data: 'training' },
      { key: 'coming_up', title: 'Coming up', hint: 'Dates for the diary.' },
    ] },
  { id: 'recognition', title: 'Recognition and thank yous', description: 'A newsletter that celebrates people and good practice.',
    sections: [
      { key: 'welcome', title: 'Why we are saying thank you', hint: 'One or two sentences.' },
      { key: 'shout_outs', title: 'Shout outs', hint: 'Who did what, and the difference it made. Positive stories only.' },
      { key: 'new_starters', title: 'Welcome to our new starters', hint: 'From your staff records.', data: 'new_starters' },
      { key: 'training', title: 'Learning we are proud of', hint: 'Courses completed, as counts.', data: 'training' },
    ] },
  { id: 'policy-training-reminders', title: 'Policy and training reminders', description: 'A short reminder of what needs doing and by when.',
    sections: [
      { key: 'intro', title: 'What this is about', hint: 'One short paragraph.' },
      { key: 'policies', title: 'Policies to read or sign', hint: 'Which policies, by when, where to find them.' },
      { key: 'training', title: 'Training', hint: 'Courses recently completed (counts) and any due dates you are announcing.', data: 'training' },
      { key: 'help', title: 'Who to ask', hint: 'Who can help.' },
    ] },
  { id: 'holiday-rota-reminders', title: 'Holiday and rota reminders', description: 'Busy weeks, how to book holiday and anything changing on the rota.',
    sections: [
      { key: 'intro', title: 'Booking your holiday', hint: 'How to ask, and any dates you need early.' },
      { key: 'busy', title: 'Busy weeks coming up', hint: 'Weeks with a lot of holiday, as counts. No names.', data: 'holiday' },
      { key: 'rota', title: 'Rota changes', hint: 'Anything changing and from when.' },
    ] },
  { id: 'seasonal', title: 'A seasonal note', description: 'A short note for a season or occasion (Christmas, summer, a bank holiday).',
    sections: [
      { key: 'message', title: 'Our message to you', hint: 'Warm and personal.' },
      { key: 'practical', title: 'Practical information', hint: 'Opening, cover, bank holiday pay and contacts, as you want to state them.' },
      { key: 'thanks', title: 'Thank you', hint: 'A closing thank you.' },
    ] },
]
export const newsletterTemplate = (id: string) => NEWSLETTER_TEMPLATES.find(t => t.id === id)

export const NEWSLETTER_CHECKLIST = [
  'British English, short paragraphs and plain words.',
  'No dashes in sentences (use commas, full stops or the word "to").',
  'No superlatives or boasting ("best", "world class", "outstanding").',
  'Staff only: nothing about residents by name, families or recruitment.',
  'Positive or neutral about named people. Nothing about sickness, health, pay, discipline or performance.',
  'Every date, number and policy name checked against your own records before sharing.',
]

/** Problems that stop a newsletter being saved: a dash, a health or pay word, or a superlative. Returned as plain sentences for the agent to fix. */
export function lintNewsletter(text: string): string[] {
  const out: string[] = []
  if (/[–—]/.test(text)) out.push('It contains a dash. Use commas, full stops or the word "to" instead.')
  if (/\b(sick|sickness|ill|illness|unwell|absence|absent|diagnos\w*|medical|disciplin\w*|capability|grievance|warning)\b/i.test(text)) out.push('It mentions health, absence or discipline. A staff newsletter must not.')
  if (/£\s?\d|\bper hour\b|\bhourly rate\b|\bpay rise\b|\bsalary\b/i.test(text)) out.push('It mentions pay figures. Pay is private to administrators and must not go in a newsletter.')
  if (/\b(best|greatest|outstanding|world[- ]class|leading|unrivalled|finest|perfect)\b/i.test(text)) out.push('It uses superlatives ("best", "outstanding" and so on). Use plain, factual wording.')
  return out
}
