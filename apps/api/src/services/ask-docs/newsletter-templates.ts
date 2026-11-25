// Templates for the internal STAFF newsletter. Staff only: no residents' families and no recruitment. There are 25 newsletter types in 4 categories and each has up to
// three layouts (short, standard, detailed), so an administrator can pick the one that fits. A template is a list of sections; some can be filled from the home's own
// data (counts and first names only), the rest the administrator writes or asks the agent to draft. The finished newsletter is plain text with ## headings and - bullets.
//
// Privacy rules built into the templates:
//   - Anything that names a person (new starters, birthdays, anniversaries, leavers, employee of the month, staff stories) is marked needs_ticks: the agent shows the
//     list and the administrator ticks who is included. Nobody is named without that.
//   - Birthdays use the month and day only, never an age. Anniversaries use years of service, never an age.
//   - Pay: only the national rates from the Data sources register (nlw) may appear, and only on a template marked national_rates. Never anyone's own pay.
import { stripMarks } from './inline-marks'
export type NewsletterData = 'new_starters' | 'birthdays' | 'anniversaries' | 'training' | 'training_due' | 'holiday' | 'nlw' | 'bank_holidays'
export type NewsletterLayout = 'short' | 'standard' | 'detailed'
export type NewsletterCategory = 'whole-team' | 'compliance-care' | 'rota-pay' | 'culture'
/** The tool that fills a data section: figures come from the Data sources register, the rest from the home's own records. */
export const DATA_TOOL: Record<NewsletterData, 'newsletter_data' | 'get_figures'> = { new_starters: 'newsletter_data', birthdays: 'newsletter_data', anniversaries: 'newsletter_data', training: 'newsletter_data', training_due: 'newsletter_data', holiday: 'newsletter_data', nlw: 'get_figures', bank_holidays: 'get_figures' }
export interface NewsletterSection { key: string; title: string; hint: string; data?: NewsletterData; from_data: boolean; tool: string | null; needs_ticks: boolean }
export interface NewsletterTemplate {
  id: string; type: string; type_title: string; category: NewsletterCategory; audience: string; purpose: string; layout: NewsletterLayout
  title: string; description: string; sections: NewsletterSection[]
  /** Said to the administrator before drafting (what is used, what is not). */
  heads_up: string | null
  /** A care topic (infection control, hot weather and so on): everyday care words such as "illness" are fine because they are about care, not about a member of staff. */
  care_topic: boolean
  /** May quote the national rates from the Data sources register. */
  national_rates: boolean
}
export const NEWSLETTER_CATEGORIES: Array<{ id: NewsletterCategory; title: string; blurb: string }> = [
  { id: 'whole-team', title: 'Whole team', blurb: 'News, welcomes, farewells, recognition and celebrations.' },
  { id: 'compliance-care', title: 'Compliance and care', blurb: 'Inspections, policies, training, safeguarding and seasonal care reminders.' },
  { id: 'rota-pay', title: 'Rota and pay', blurb: 'Bank holiday cover, the Christmas rota, the minimum wage and holiday booking.' },
  { id: 'culture', title: 'Culture', blurb: 'Staff stories, wellbeing, survey results and seasonal notes.' },
]
export const LAYOUT_LABEL: Record<NewsletterLayout, string> = { short: 'Short', standard: 'Standard', detailed: 'Detailed' }
const LAYOUT_BLURB: Record<NewsletterLayout, string> = { short: 'A quick note that takes a minute to read.', standard: 'The usual length, with the main sections.', detailed: 'A fuller newsletter with every section.' }

type Level = 'core' | 'standard' | 'extra'
interface S { key: string; title: string; hint: string; level: Level; data?: NewsletterData; ticks?: boolean }
interface Type { type: string; title: string; category: NewsletterCategory; audience: string; purpose: string; heads_up?: string; care_topic?: boolean; national_rates?: boolean; sections: S[] }
const s = (level: Level, key: string, title: string, hint: string, data?: NewsletterData, ticks?: boolean): S => ({ key, title, hint, level, data, ticks })
const C = (key: string, title: string, hint: string, data?: NewsletterData, ticks?: boolean) => s('core', key, title, hint, data, ticks)
const M = (key: string, title: string, hint: string, data?: NewsletterData, ticks?: boolean) => s('standard', key, title, hint, data, ticks)
const X = (key: string, title: string, hint: string, data?: NewsletterData, ticks?: boolean) => s('extra', key, title, hint, data, ticks)
const ALL = 'All staff'

const TYPES: Type[] = [
  // ── Whole team ──────────────────────────────────────────────────────────────────────
  { type: 'monthly-update', title: 'Monthly team update', category: 'whole-team', audience: ALL, purpose: 'A friendly roundup of the month: news, thank yous and what is coming up.', sections: [
    C('welcome', 'A word from the manager', 'A short, warm opening in the manager\'s own voice.'),
    C('news', 'News from the home', 'What has happened this month and what is changing.'),
    C('thanks', 'Thank you', 'Specific, kind thank yous for things people did.'),
    M('new_starters', 'Welcome to our new starters', 'Name, role and a welcome. From your staff records. You choose who is named.', 'new_starters', true),
    M('training', 'Training and learning', 'Courses completed this month, as counts.', 'training'),
    M('coming_up', 'Coming up', 'Dates for the diary.'),
    X('birthdays', 'Birthdays this month', 'First names and the day of the month only. You choose who is named.', 'birthdays', true),
    X('team_question', 'A question for the team', 'One question to get people talking, and how to reply.'),
  ] },
  { type: 'welcome-new-starters', title: 'Welcome to new starters', category: 'whole-team', audience: ALL, purpose: 'Introduce new colleagues to the team and help them settle in.',
    heads_up: 'This names new starters from your staff records. You choose who is included, and it is worth checking each person is happy to be introduced. Their staff picture goes in only if they agree: you will be asked, and it shows in the hub and the PDF (the email shows their initials).', sections: [
    C('welcome', 'A warm welcome', 'Two or three sentences from the manager.'),
    C('new_starters', 'Meet our new starters', 'Name, role and start date from your staff records. You choose who is named.', 'new_starters', true),
    C('who_to_ask', 'Who to ask', 'Who can help in the first weeks.'),
    M('about_home', 'What to expect in the first weeks', 'Shadow shifts, induction and what happens when.'),
    M('buddies', 'Your buddy', 'Who is paired with whom, if you use buddies.'),
    X('first_week', 'A first week checklist', 'A short list of what to do and where to find things.'),
    X('fun_facts', 'A little about our new starters', 'Only what each person has said they are happy to share.'),
  ] },
  { type: 'leavers-farewells', title: 'Leavers and farewells', category: 'whole-team', audience: ALL, purpose: 'Say a kind goodbye to colleagues who are leaving.',
    heads_up: 'Only name someone who has agreed to be named. Do not give reasons for anyone leaving. Their staff picture goes in only if they agree: you will be asked, and it shows in the hub and the PDF (the email shows their initials).', sections: [
    C('opening', 'A note from the manager', 'A short, warm opening.'),
    C('farewell', 'Saying goodbye', 'Who is leaving, their role and what they will be remembered for. Only with their agreement.', undefined, true),
    C('thanks', 'Thank you', 'A specific thank you for what they gave to the team.'),
    M('memories', 'Memories from the team', 'A few kind words from colleagues.'),
    M('cover', 'What happens next', 'How the work will be covered and who to ask.'),
    X('gathering', 'A farewell get together', 'When and where, and how to contribute.'),
    X('stay_in_touch', 'Staying in touch', 'How the person would like to keep in touch, if they wish.'),
  ] },
  { type: 'employee-of-the-month', title: 'Employee of the month', category: 'whole-team', audience: ALL, purpose: 'Celebrate the person chosen as employee of the month and how everyone can nominate.',
    heads_up: 'Check the person is happy to be named and to have their story shared before you send this. Their staff picture goes in only if they agree: you will be asked, and it shows in the hub and the PDF (the email shows their initials).', sections: [
    C('who', 'Our employee of the month', 'Who it is and their role. You write this: the agent does not choose.', undefined, true),
    C('why', 'Why they were chosen', 'What they did and the difference it made. Positive and specific.'),
    C('thank_you', 'A thank you', 'A closing thank you from the manager.'),
    M('quotes', 'What colleagues said', 'Two or three short quotes from nominations, with permission.'),
    M('nominate', 'How to nominate next month', 'Who to tell, by when, and what makes a good nomination.'),
    X('about', 'A little about them', 'Only what they are happy to share.'),
    X('past', 'Previous winners', 'A short list of recent winners, if they agree.', undefined, true),
  ] },
  { type: 'team-achievements', title: 'Team achievements', category: 'whole-team', audience: ALL, purpose: 'Share what the team has achieved and celebrate it together.', sections: [
    C('headline', 'What we achieved', 'The achievement in one or two sentences.'),
    C('how', 'How we did it', 'What people did to make it happen.'),
    C('thanks', 'Thank you', 'Thank the team, and any individuals who agree to be named.'),
    M('training', 'Learning we are proud of', 'Courses completed, as counts.', 'training'),
    M('difference', 'The difference it made', 'What changed for the people we support and for the team.'),
    X('next', 'What next', 'The next goal and how everyone can help.'),
    X('captions', 'Picture captions', 'Short captions for any photos you add.'),
  ] },
  { type: 'birthdays-anniversaries', title: 'Birthdays and work anniversaries', category: 'whole-team', audience: ALL, purpose: 'Mark birthdays and years of service across the team.',
    heads_up: 'Birthdays use the date of birth on each staff record, but only the month and day are shown, never an age. Work anniversaries show years of service. You choose who is included, and it is worth checking everyone is happy to be mentioned.', sections: [
    C('intro', 'Celebrating our team', 'A short, cheerful opening.'),
    C('birthdays', 'Birthdays this month', 'First names and the day of the month only. You choose who is named.', 'birthdays', true),
    C('anniversaries', 'Work anniversaries', 'First names and years of service. You choose who is named.', 'anniversaries', true),
    M('thanks', 'Thank you', 'A thank you for the time and care people give.'),
    X('how', 'How we celebrate', 'Cards, cake, a collection or time off, as you want to say.'),
  ] },
  // ── Compliance and care ─────────────────────────────────────────────────────────────
  { type: 'cqc-preparation', title: 'CQC inspection preparation', category: 'compliance-care', audience: ALL, purpose: 'Help everyone feel ready for an inspection.', sections: [
    C('why', 'Why this matters', 'A calm explanation of what an inspection is for.'),
    C('five', 'The five questions inspectors ask', 'Safe, effective, caring, responsive and well led, with one plain example of each from your home.'),
    C('actions', 'What to do now', 'Short, practical actions for this week.'),
    M('policies', 'Policies to read again', 'Which policies and where to find them.'),
    M('training', 'Training that is due soon', 'Counts of courses due soon. No names.', 'training_due'),
    M('who', 'Who to ask', 'Who can answer questions.'),
    X('questions', 'Questions you might be asked', 'A few examples and how to answer honestly.'),
    X('evidence', 'Where to find things', 'Where records and evidence are kept.'),
  ] },
  { type: 'inspection-result', title: 'After an inspection', category: 'compliance-care', audience: ALL, purpose: 'Share the outcome of an inspection and what happens next.', sections: [
    C('result', 'The result', 'The outcome, exactly as the report states it. You give the facts.'),
    C('meaning', 'What it means for us', 'In plain words.'),
    C('thanks', 'Thank you', 'Thank the team for their part.'),
    M('well', 'What we do well', 'Strengths named in the report.'),
    M('improve', 'What we will work on', 'Areas for improvement, framed constructively.'),
    M('next', 'Next steps', 'What will happen and by when.'),
    X('questions', 'Your questions', 'How to ask questions and who will answer.'),
    X('timeline', 'The timeline', 'Key dates for any follow up.'),
  ] },
  { type: 'policy-update', title: 'New or updated policy', category: 'compliance-care', audience: ALL, purpose: 'Tell staff about a new or changed policy and what to do about it.', sections: [
    C('changed', 'What has changed', 'The policy and the change in a few plain sentences.'),
    C('why', 'Why we changed it', 'The reason, such as new guidance or something we learned.'),
    C('do', 'What you need to do', 'Read it, sign it, change how you work, and by when.'),
    M('where', 'Where to find it', 'Where the policy is kept.'),
    M('deadline', 'By when', 'The date everyone needs to have read it.'),
    M('who', 'Who to ask', 'Who can help.'),
    X('example', 'An example', 'How it works in a real situation, without naming anyone.'),
    X('quiz', 'A quick question', 'One question to check understanding, with the answer.'),
  ] },
  { type: 'training-due', title: 'Training due and new courses', category: 'compliance-care', audience: ALL, purpose: 'Remind everyone about training that is due and share new courses.', sections: [
    C('intro', 'What this is about', 'One short paragraph.'),
    C('due', 'Training due soon', 'Counts of courses due soon. No names.', 'training_due'),
    C('how', 'How to complete it', 'Where to log in and how long it takes.'),
    M('done', 'Learning completed', 'Courses completed recently, as counts.', 'training'),
    M('new', 'New courses', 'New courses on offer and who they are for.'),
    X('time', 'Time to learn', 'How to get time on shift for training.'),
    X('help', 'Help with learning', 'Who can help if someone finds it hard.'),
  ] },
  { type: 'safeguarding-reminder', title: 'Safeguarding reminder', category: 'compliance-care', audience: ALL, care_topic: true, purpose: 'A clear reminder of what safeguarding is and how to raise a concern.', sections: [
    C('reminder', 'A reminder', 'What safeguarding means in our home, in plain words.'),
    C('raise', 'How to raise a concern', 'The steps, in order, with no delay.'),
    C('lead', 'Our safeguarding lead', 'Who the lead is and how to reach them, day and night.'),
    M('signs', 'What to look out for', 'Signs that something may be wrong.'),
    M('whistle', 'Speaking up', 'How whistleblowing works and that people are protected.'),
    X('training', 'Safeguarding training', 'The course and when it is due.'),
    X('scenario', 'A scenario to think about', 'A short example, with no real names, and what to do.'),
  ] },
  { type: 'infection-control', title: 'Infection control', category: 'compliance-care', audience: ALL, care_topic: true, purpose: 'Reminders about hand hygiene, PPE and what to do if infection spreads.', sections: [
    C('reminder', 'Why it matters', 'A short, calm reminder.'),
    C('hands', 'Hand hygiene and PPE', 'The key steps, as your policy states them.'),
    C('what_to_do', 'What to do if you see a problem', 'Who to tell and how quickly.'),
    M('outbreak', 'If we have an outbreak', 'What changes and who will tell you.'),
    M('cleaning', 'Cleaning and laundry', 'Reminders for the shift.'),
    X('vaccines', 'Vaccine information', 'Dates and where to find out more, as you want to state them.'),
    X('training', 'Training', 'The course and when it is due.', 'training_due'),
  ] },
  { type: 'hot-weather', title: 'Hot weather', category: 'compliance-care', audience: ALL, care_topic: true, purpose: 'Help the team keep everyone comfortable and safe in hot weather.', sections: [
    C('message', 'A note from the manager', 'A short, caring opening.'),
    C('comfort', 'Keeping people cool and comfortable', 'Fluids, shade, light clothing and room checks.'),
    C('yourself', 'Looking after yourself', 'Water, breaks and what to wear.'),
    M('signs', 'Signs to watch for', 'What to look out for and who to tell.'),
    M('rota', 'Rota and breaks', 'Any changes to breaks or shifts.'),
    X('checks', 'Room and building checks', 'What is checked and how often.'),
    X('contacts', 'Who to call', 'Who to tell if you are worried.'),
  ] },
  { type: 'winter-pressures', title: 'Winter pressures', category: 'compliance-care', audience: ALL, care_topic: true, purpose: 'Prepare the team for the winter months.', sections: [
    C('message', 'A note from the manager', 'A short, calm opening.'),
    C('safe', 'Getting to work safely', 'Travel, ice and what to do if you cannot get in.'),
    C('cover', 'Cover and rota', 'How cover will work in bad weather.'),
    M('infection', 'Keeping infection down', 'Reminders for the winter months.'),
    M('plans', 'Our emergency plans', 'Heating, power and what the plans are.'),
    X('contacts', 'Who to call', 'Who to ring if you cannot get in.'),
    X('thanks', 'Thank you', 'A thank you for turning up in difficult weather.'),
  ] },
  // ── Rota and pay ────────────────────────────────────────────────────────────────────
  { type: 'bank-holiday-cover', title: 'Bank holiday cover', category: 'rota-pay', audience: ALL, purpose: 'Share the dates and how cover will work over a bank holiday.', sections: [
    C('dates', 'The dates', 'The bank holiday dates, from the official list.', 'bank_holidays'),
    C('cover', 'How cover will work', 'Who is working, how to swap, who to ask.'),
    C('thanks', 'Thank you', 'A thank you to everyone working.'),
    M('pay', 'How bank holiday pay works', 'Say how it is paid as a rule (for example time and a half). No individual figures.'),
    M('swaps', 'Swapping shifts', 'How to ask and who approves.'),
    X('holiday', 'Booking time off', 'How to book holiday around the dates.'),
    X('contacts', 'Who to call', 'Who to contact on the day.'),
  ] },
  { type: 'christmas-rota', title: 'Christmas rota', category: 'rota-pay', audience: ALL, purpose: 'Share how the Christmas rota will work and thank the team.', sections: [
    C('message', 'A note from the manager', 'A warm opening.'),
    C('dates', 'Dates and cover', 'The bank holidays and how cover will work.', 'bank_holidays'),
    C('swaps', 'Swapping shifts', 'How to ask and who approves.'),
    M('holiday', 'Busy weeks', 'Weeks with a lot of holiday, as counts. No names.', 'holiday'),
    M('thanks', 'Thank you', 'A closing thank you.'),
    X('festive', 'Making it feel special', 'What the home is planning for the people we support and the team.'),
    X('contacts', 'Emergency contacts', 'Who to call over the holiday.'),
  ] },
  { type: 'minimum-wage-change', title: 'Minimum wage change', category: 'rota-pay', audience: ALL, national_rates: true, purpose: 'Explain a change to the national minimum wage rates.',
    heads_up: 'This quotes only the national rates from your Data sources register, with their date. It never mentions anyone\'s own pay. If the rate could not be confirmed the agent will say so and leave the figures out.', sections: [
    C('changing', 'What is changing', 'The change in plain words.'),
    C('rates', 'The new national rates', 'The rates by age band and the date they start, from the Data sources register.', 'nlw'),
    C('when', 'When it starts', 'The date, and when people will see it.'),
    M('means', 'What it means for us', 'In general terms. No individual pay.'),
    M('questions', 'Questions', 'Who to ask about their own pay.'),
    X('checked', 'How we check', 'How the home makes sure everyone is paid at least the minimum.'),
    X('more', 'More information', 'Where to read more.'),
  ] },
  { type: 'holiday-booking', title: 'Holiday booking reminder', category: 'rota-pay', audience: ALL, purpose: 'Remind everyone how to book holiday and which weeks are busy.', sections: [
    C('how', 'How to book', 'How to ask, and any dates you need early.'),
    C('busy', 'Busy weeks coming up', 'Weeks with a lot of holiday, as counts. No names.', 'holiday'),
    C('deadline', 'Deadlines', 'The dates for the next period.'),
    M('fair', 'How we keep it fair', 'How requests are decided.'),
    M('carry', 'Carrying holiday over', 'Your carry over rule, in plain words.'),
    X('swaps', 'Changing or cancelling', 'How to change or cancel a request.'),
    X('contacts', 'Who to ask', 'Who can help.'),
  ] },
  // ── Culture ─────────────────────────────────────────────────────────────────────────
  { type: 'staff-stories', title: 'Staff stories', category: 'culture', audience: ALL, purpose: 'Share a colleague\'s story, with their agreement.',
    heads_up: 'Only share a story with the person\'s permission, and let them read it first. Their staff picture goes in only if they agree: you will be asked, and it shows in the hub and the PDF (the email shows their initials).', sections: [
    C('story', 'Their story', 'Who they are and what brought them to care. Only what they are happy to share.', undefined, true),
    C('words', 'In their own words', 'A few short quotes.'),
    C('thanks', 'Thank you', 'A thank you to them for sharing.'),
    M('learned', 'What we can learn', 'What the team can take from it.'),
    X('qa', 'Quick questions', 'Three or four fun questions and their answers.'),
  ] },
  { type: 'wellbeing-support', title: 'Wellbeing and support', category: 'culture', audience: ALL, purpose: 'Remind the team that support is there and how to find it.', sections: [
    C('message', 'A note from the manager', 'A kind, genuine opening.'),
    C('support', 'Support available', 'What support the home offers, as you want to state it.'),
    C('talk', 'Who to talk to', 'Who people can go to, and how.'),
    M('tips', 'Small things that help', 'A few simple ideas for looking after yourself.'),
    M('breaks', 'Taking your breaks', 'A reminder to take breaks and where to take them.'),
    X('events', 'Coming up', 'Any social or wellbeing events.'),
    X('thanks', 'Thank you', 'A closing thank you.'),
  ] },
  { type: 'survey-results', title: 'Staff survey results', category: 'culture', audience: ALL, purpose: 'Share what staff said in a survey and what the home will do about it.',
    heads_up: 'Use only results you have checked. Never identify who said what.', sections: [
    C('thanks', 'Thank you for taking part', 'How many people took part, as you know it.'),
    C('said', 'What you told us', 'The main findings, as figures or themes you give.'),
    C('do', 'What we will do', 'The actions and who is leading them.'),
    M('did', 'You said, we did', 'Changes that came from the last survey.'),
    M('next', 'What happens next', 'When you will report back.'),
    X('timeline', 'The timeline', 'Key dates for each action.'),
  ] },
  { type: 'seasonal-christmas', title: 'Christmas note', category: 'culture', audience: ALL, purpose: 'A seasonal note for Christmas.', sections: [
    C('message', 'Our message to you', 'Warm and personal.'),
    C('practical', 'Practical information', 'Cover, rota and contacts, as you want to state them.'),
    C('thanks', 'Thank you', 'A closing thank you.'),
    M('dates', 'The dates', 'The bank holiday dates, from the official list.', 'bank_holidays'),
    M('traditions', 'Our traditions', 'What the home does together at Christmas.'),
    X('memories', 'Looking back on the year', 'A few highlights from the year.'),
  ] },
  { type: 'seasonal-summer', title: 'Summer note', category: 'culture', audience: ALL, purpose: 'A seasonal note for the summer.', sections: [
    C('message', 'Our message to you', 'Warm and personal.'),
    C('practical', 'Practical information', 'Holiday cover, the rota and contacts.'),
    C('thanks', 'Thank you', 'A closing thank you.'),
    M('holiday', 'Busy weeks', 'Weeks with a lot of holiday, as counts. No names.', 'holiday'),
    M('events', 'Summer events', 'Garden parties, outings or anything planned.'),
    X('weather', 'Looking after each other in the heat', 'A short reminder.'),
  ] },
  { type: 'seasonal-easter', title: 'Easter note', category: 'culture', audience: ALL, purpose: 'A seasonal note for Easter.', sections: [
    C('message', 'Our message to you', 'Warm and personal.'),
    C('practical', 'Practical information', 'Cover, rota and contacts for the bank holidays.'),
    C('thanks', 'Thank you', 'A closing thank you.'),
    M('dates', 'The dates', 'The bank holiday dates, from the official list.', 'bank_holidays'),
    M('events', 'Easter at home', 'What is planned for the people we support and the team.'),
    X('thoughts', 'A thought for the season', 'A short, kind reflection.'),
  ] },
  { type: 'seasonal-bank-holiday', title: 'Bank holiday note', category: 'culture', audience: ALL, purpose: 'A short note for any bank holiday.', sections: [
    C('message', 'Our message to you', 'Warm and personal.'),
    C('practical', 'Practical information', 'Cover, rota and contacts.'),
    C('thanks', 'Thank you', 'A closing thank you.'),
    M('dates', 'The date', 'The bank holiday date, from the official list.', 'bank_holidays'),
    M('swaps', 'Swapping shifts', 'How to ask and who approves.'),
    X('thoughts', 'A thought for the day', 'A short, kind line.'),
  ] },
]

const LEVELS: Record<NewsletterLayout, Level[]> = { short: ['core'], standard: ['core', 'standard'], detailed: ['core', 'standard', 'extra'] }
function build(t: Type, layout: NewsletterLayout): NewsletterTemplate {
  const sections: NewsletterSection[] = t.sections.filter(x => LEVELS[layout].includes(x.level)).map(x => ({
    key: x.key, title: x.title, hint: x.hint, ...(x.data ? { data: x.data } : {}), from_data: !!x.data, tool: x.data ? DATA_TOOL[x.data] : null, needs_ticks: !!x.ticks || x.data === 'new_starters' || x.data === 'birthdays' || x.data === 'anniversaries',
  }))
  return { id: `${t.type}-${layout}`, type: t.type, type_title: t.title, category: t.category, audience: t.audience, purpose: t.purpose, layout, title: `${t.title} (${LAYOUT_LABEL[layout].toLowerCase()})`,
    description: `${t.purpose} ${LAYOUT_BLURB[layout]}`, sections, heads_up: t.heads_up ?? null, care_topic: !!t.care_topic, national_rates: !!t.national_rates }
}
export const NEWSLETTER_TEMPLATES: NewsletterTemplate[] = TYPES.flatMap(t => (['short', 'standard', 'detailed'] as NewsletterLayout[]).map(l => build(t, l)))
export const NEWSLETTER_TYPES = TYPES.map(t => ({ type: t.type, title: t.title, category: t.category, purpose: t.purpose }))

/** The first five templates the agent offered before the library grew: old saved drafts still point at them. */
const LEGACY: Record<string, string> = { 'monthly-update': 'monthly-update-standard', 'recognition': 'team-achievements-standard', 'policy-training-reminders': 'policy-update-standard', 'holiday-rota-reminders': 'holiday-booking-standard', 'seasonal': 'seasonal-christmas-standard' }
export const newsletterTemplate = (id: string) => NEWSLETTER_TEMPLATES.find(t => t.id === (LEGACY[id] ?? id))
export const templatesInCategory = (c: NewsletterCategory) => NEWSLETTER_TEMPLATES.filter(t => t.category === c)
/** A short menu for the agent and the picker: one row per type, with the layouts it comes in. */
export const newsletterMenu = () => NEWSLETTER_CATEGORIES.map(c => ({ ...c, types: NEWSLETTER_TYPES.filter(t => t.category === c.id).map(t => ({ ...t, layouts: NEWSLETTER_TEMPLATES.filter(x => x.type === t.type).map(x => ({ id: x.id, layout: x.layout, sections: x.sections.length })) })) }))


// ── Finding the right type from what the administrator says ────────────────────────────────
// Every type has the words people use for it (synonyms), so "employee of the month newsletter" finds Employee of the month and never a story or a thank you. The match is
// ranked: the type's own title scores highest, then its keywords, then its purpose. The agent is told to ask the library with the administrator's own words first.
export const NEWSLETTER_KEYWORDS: Record<string, string[]> = {
  'monthly-update': ['monthly update', 'monthly newsletter', 'monthly', 'team update', 'news roundup', 'general update', 'this month'],
  'welcome-new-starters': ['welcome', 'new starters', 'new starter', 'new staff', 'new joiners', 'joiners', 'introduce new', 'new team members'],
  'leavers-farewells': ['leavers', 'leaver', 'farewell', 'goodbye', 'leaving', 'retiring', 'retirement', 'moving on'],
  'employee-of-the-month': ['employee of the month', 'employee of month', 'star of the month', 'carer of the month', 'staff member of the month', 'member of staff of the month', 'team member of the month', 'worker of the month', 'recognition of one person', 'winner of the month', 'eotm'],
  'team-achievements': ['team achievements', 'achievements', 'well done', 'celebrate the team', 'thank you to the team', 'recognition', 'praise', 'kudos', 'good news'],
  'birthdays-anniversaries': ['birthdays', 'birthday', 'anniversaries', 'anniversary', 'years of service', 'work anniversary', 'long service'],
  'cqc-preparation': ['cqc preparation', 'cqc inspection', 'inspection preparation', 'inspection coming', 'prepare for cqc', 'cqc visit', 'getting ready for inspection', 'cqc'],
  'inspection-result': ['inspection result', 'after an inspection', 'cqc result', 'cqc rating', 'inspection outcome', 'inspection feedback', 'rated good', 'rated outstanding'],
  'policy-update': ['policy', 'policies', 'new policy', 'updated policy', 'policy change', 'procedure change', 'new procedure'],
  'training-due': ['training', 'training due', 'new courses', 'courses', 'mandatory training', 'refresher', 'learning', 'overdue training'],
  'safeguarding-reminder': ['safeguarding', 'safeguarding reminder', 'protect', 'report a concern', 'whistleblowing'],
  'infection-control': ['infection control', 'infection', 'hand hygiene', 'ipc', 'outbreak', 'covid', 'flu', 'norovirus'],
  'hot-weather': ['hot weather', 'heatwave', 'heat', 'summer heat', 'dehydration', 'staying cool'],
  'winter-pressures': ['winter pressures', 'winter', 'cold weather', 'flu season', 'snow', 'ice'],
  'bank-holiday-cover': ['bank holiday cover', 'bank holiday rota', 'bank holiday cover note', 'cover for the bank holiday', 'bank holiday shifts'],
  'christmas-rota': ['christmas rota', 'christmas shifts', 'christmas cover', 'festive rota', 'christmas working', 'new year rota'],
  'minimum-wage-change': ['minimum wage', 'national living wage', 'living wage', 'nlw', 'pay rise', 'pay change', 'new pay rates', 'april pay'],
  'holiday-booking': ['holiday booking', 'book holiday', 'annual leave', 'holiday requests', 'holiday reminder', 'leave booking', 'holiday'],
  'staff-stories': ['staff stories', 'staff story', 'story', 'a day in the life', 'meet the team', 'profile', 'my story', 'why i care'],
  'wellbeing-support': ['wellbeing', 'well being', 'support', 'mental health', 'looking after you', 'employee assistance', 'staff support'],
  'survey-results': ['survey', 'survey results', 'staff survey', 'you said we did', 'feedback results', 'questionnaire'],
  'seasonal-christmas': ['christmas', 'festive', 'xmas', 'christmas message', 'season greetings'],
  'seasonal-summer': ['summer', 'summer note', 'summer message', 'garden party'],
  'seasonal-easter': ['easter', 'easter note', 'easter message'],
  'seasonal-bank-holiday': ['bank holiday note', 'bank holiday message', 'bank holiday', 'bank holidays'],
}
const norm = (x: string) => ` ${x.toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim()} `
export interface NewsletterMatch { type: string; title: string; category: NewsletterCategory; score: number; reason: string }
/** The newsletter types that best fit the words used, best first. A type scores highest when its own title is in the words, then by its longest matching keyword, then by shared words with its title or purpose. A type with no match is left out. */
export function matchNewsletterTypes(query: string, limit = 4): NewsletterMatch[] {
  const q = norm(String(query ?? ''))
  if (q.trim().length < 3) return []
  const qWords = new Set(q.trim().split(' ').filter(w => w.length > 2 && !['the', 'and', 'for', 'newsletter', 'letter', 'template', 'need', 'want', 'staff', 'our', 'with', 'about', 'please', 'build', 'make', 'write', 'draft', 'create'].includes(w)))
  const out: NewsletterMatch[] = []
  for (const t of NEWSLETTER_TYPES) {
    let score = 0, reason = ''
    if (q.includes(norm(t.title))) { score = 100 + t.title.length; reason = `the words match "${t.title}"` }
    for (const k of NEWSLETTER_KEYWORDS[t.type] ?? []) {
      if (q.includes(norm(k))) { const sc = 50 + k.length; if (sc > score) { score = sc; reason = `"${k}" is one of its words` } }
    }
    if (score === 0 && qWords.size) {
      const titleWords = new Set(norm(t.title).trim().split(' '))
      const shared = [...qWords].filter(w => titleWords.has(w) || (NEWSLETTER_KEYWORDS[t.type] ?? []).some(k => norm(k).includes(` ${w} `)))
      if (shared.length) { score = 10 * shared.length; reason = `shares "${shared.join('", "')}"` }
    }
    if (score > 0) out.push({ type: t.type, title: t.title, category: t.category, score, reason })
  }
  return out.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title)).slice(0, limit)
}

export const NEWSLETTER_CHECKLIST = [
  'British English, short paragraphs and plain words.',
  'No dashes in sentences (use commas, full stops or the word "to").',
  'No superlatives or boasting ("best", "world class", "outstanding").',
  'Staff only: nothing about residents by name, their relatives or recruitment.',
  'Positive or neutral about named people, and only people you chose to name. Nothing about sickness, health, pay, discipline or performance.',
  'Birthdays show the month and day only, never an age.',
  'Every date, number and policy name checked against your own records before sharing.',
]

export interface LintOptions { /** A care topic: everyday care words (illness, medical, warning) are allowed. */ careTopic?: boolean; /** The national rates that may be quoted (pounds an hour), from the Data sources register. When given, those exact figures and "pay rise" are allowed. */ nationalRates?: number[]
  /** Blocks the administrator adds themselves (a fundraising total, a prize, a ticket price): a pound amount is allowed, but pay words (salary, pay rise, hourly rate, per hour) are still refused. */ allowMoney?: boolean }
/** The options a template is checked with. The rates are looked up by the caller and passed in. */
export function lintOptionsFor(templateId: string | null | undefined, rates: number[] = []): LintOptions {
  const t = templateId ? newsletterTemplate(templateId) : undefined
  return { careTopic: !!t?.care_topic, nationalRates: t?.national_rates ? rates : undefined }
}

/** Problems that stop a newsletter being saved: a dash, a health or pay word, an age, or a superlative. Returned as plain sentences for the agent to fix. */
export function lintNewsletter(text: string, opts: LintOptions = {}): string[] {
  const out: string[] = []
  let t = stripMarks(text)   // the marks (bold, italic, underline) are not words
  if (/[–—]/.test(t)) out.push('It contains a dash. Use commas, full stops or the word "to" instead.')
  const health = opts.careTopic
    ? /\b(absence|absent|disciplin\w*|capability|grievance)\b/i
    : /\b(sick|sickness|ill|illness|unwell|absence|absent|diagnos\w*|medical|disciplin\w*|capability|grievance|warning)\b/i
  if (health.test(t)) out.push(opts.careTopic ? 'It mentions absence or discipline. A staff newsletter must not.' : 'It mentions health, absence or discipline. A staff newsletter must not.')
  // Custom blocks may carry any pound amount, but the words that make it pay stay refused below.
  if (opts.allowMoney) t = t.replace(/(£\s?\d[\d,.]*)\s*(?:an hour|\/h(?:ou)?r)\b/gi, '$1 per hour')   // an hourly figure is pay, wherever it is
  if (opts.allowMoney) t = t.replace(/£\s?\d[\d,]*(?:\.\d+)?(?:\s?[kKmM]\b)?/g, ' [amount] ')
  if (opts.nationalRates) {
    // Only the official national rates may appear, and only exactly as published. Anything else with a pound sign is still refused.
    t = t.replace(/£\s?(\d+(?:\.\d+)?)/g, (m, n) => (opts.nationalRates!.some(r => Math.abs(r - Number(n)) < 0.0051) ? ' ' : m))
    t = t.replace(/\b(per hour|an hour|hourly rate|pay rise)\b/gi, ' ')
    if (/£\s?\d|\bsalary\b/i.test(t)) out.push('It mentions a pay figure that is not one of the official national rates. Only the national rates from the Data sources register may be quoted, never anyone\'s own pay.')
  } else if (/£\s?\d|\bper hour\b|\bhourly rate\b|\bpay rise\b|\bsalary\b/i.test(t)) out.push('It mentions pay figures. Pay is private to administrators and must not go in a newsletter.')
  if (/\b(aged\s+\d+|age\s+\d+|turns?\s+\d+|turning\s+\d+|\d+(?:st|nd|rd|th)\s+birthday|\d+\s+years?\s+old)\b/i.test(t)) out.push('It mentions someone\'s age. Birthdays show the day and month only.')
  if (/\b(best|greatest|outstanding|world[- ]class|leading|unrivalled|finest|perfect)\b/i.test(t)) out.push('It uses superlatives ("best", "outstanding" and so on). Use plain, factual wording.')
  return out
}
