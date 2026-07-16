import type { SlotDef } from './types'

// Editable copy for /hr-policies. Defaults are the current live copy; editing a slot
// in the platform (Main site pages → /hr-policies) overrides it without touching the design.
export const HR_POLICIES_SLOTS: SlotDef[] = [
  // Hero
  { key: 'hero.label', group: 'Hero', label: 'Eyebrow', default: 'HR Policies and Staff Handbook' },
  { key: 'hero.h1', group: 'Hero', label: 'Headline', default: 'Every staff member deserves to know their rights. In their own language. Right now.' },
  { key: 'hero.intro', group: 'Hero', label: 'Intro paragraph', multiline: true, default: 'Care setting workforces are multilingual, work across multiple shifts, and rarely have access to HR during the moments when they need it most. CareStream gives every member of your team instant, accurate answers to employment questions from your actual staff handbook, in the hub or by email, in any language, at any hour.' },

  // The problem
  { key: 'problem.label', group: 'The Problem', label: 'Eyebrow', default: 'The Problem With HR Accessibility' },
  { key: 'problem.h2', group: 'The Problem', label: 'Heading', default: 'Staff have employment questions every week. HR is not available every week.' },
  { key: 'problem.p1', group: 'The Problem', label: 'Paragraph 1', rich: true, default: 'A care worker on a Saturday night shift who wants to know how much notice they need to book annual leave cannot reach HR until Monday morning. A staff member whose first language is Romanian who does not fully understand their contract has no practical way to get clarification. A new starter who wants to know the expenses process has to find the right person to ask and hope they know the answer.' },
  { key: 'problem.p2', group: 'The Problem', label: 'Paragraph 2', rich: true, default: 'These questions go unanswered, are answered inconsistently by colleagues, or create unnecessary pressure on managers during busy shifts. CareStream makes the full staff handbook accessible to everyone, instantly, around the clock.' },
  { key: 'problem.card1.label', group: 'The Problem', label: 'Card 1 label', default: 'Without CareStream' },
  { key: 'problem.card1.body', group: 'The Problem', label: 'Card 1 body', multiline: true, default: 'Staff either wait for HR office hours, ask a manager who may not know the answer, or go without the information they are entitled to. Language barriers make this worse for a large proportion of the workforce.' },
  { key: 'problem.card2.label', group: 'The Problem', label: 'Card 2 label', default: 'With CareStream' },
  { key: 'problem.card2.body', group: 'The Problem', label: 'Card 2 body', multiline: true, default: 'Any staff member can ask any question from the staff handbook in the hub or by email at any time of day. The answer comes from your actual document, in the language they asked in, within 30 seconds.' },

  // How it works
  { key: 'how.label', group: 'How It Works', label: 'Eyebrow', default: 'How CareStream HR Policies Works' },
  { key: 'how.h2', group: 'How It Works', label: 'Heading', default: 'Upload your handbook once. Your whole team can ask anything from it immediately.' },
  { key: 'how.intro', group: 'How It Works', label: 'Intro', multiline: true, default: 'Your staff handbook joins your clinical policies in the same knowledge base. Staff do not need to know where to look or who to ask. They simply ask their question in the hub and receive an answer drawn from your actual document.' },
  { key: 'how.step1.title', group: 'How It Works', label: 'Step 1 title', default: 'Upload your staff handbook' },
  { key: 'how.step1.body', group: 'How It Works', label: 'Step 1 body', multiline: true, default: 'Add your staff handbook, employment contracts, HR policies, and any other employment documents to the CareStream knowledge base. Large handbooks are indexed chapter by chapter, so answers come from the right part of a long document. Everything is processed automatically within minutes.' },
  { key: 'how.step2.title', group: 'How It Works', label: 'Step 2 title', default: 'Staff ask in the hub, typing or speaking' },
  { key: 'how.step2.body', group: 'How It Works', label: 'Step 2 body', multiline: true, default: 'Any staff member can ask any employment question in the CareStream hub on their phone, by typing or by speaking, or by email. Questions can be asked in any language. The hub detects the language and answers in the same one.' },
  { key: 'how.step3.title', group: 'How It Works', label: 'Step 3 title', default: 'Managers see what staff are asking' },
  { key: 'how.step3.body', group: 'How It Works', label: 'Step 3 body', multiline: true, default: 'The analytics dashboard shows which handbook topics are being asked about most. Topics with high query volumes and unclear answers are surfaced as gaps, helping HR and managers see where the handbook needs to be clearer or where staff need more support.' },

  // See it in action
  { key: 'action.label', group: 'See It In Action', label: 'Eyebrow', default: 'See It In Action' },
  { key: 'action.h2', group: 'See It In Action', label: 'Heading', default: 'An employment question answered in seconds. In any language.' },
  { key: 'action.hub.label', group: 'See It In Action', label: 'Hub channel label', default: 'The hub' },
  { key: 'action.hub.h3', group: 'See It In Action', label: 'Hub sub-heading', default: 'A staff member asks about annual leave in Polish, by typing or speaking, and gets the answer in Polish.' },
  { key: 'action.hub.p1', group: 'See It In Action', label: 'Hub paragraph 1', rich: true, default: 'CareStream detects the language of the question automatically. Your handbook stays in English. The answer is translated at the point of response, so every member of staff receives the same accurate information regardless of what language they speak.' },
  { key: 'action.hub.p2', group: 'See It In Action', label: 'Hub paragraph 2', rich: true, default: 'Staff who are not confident typing can speak their question in the hub and listen to the answer read back. No language selection and no separate version of the handbook. The same document answers questions in over 60 languages.' },
  { key: 'action.hub.languagesNote', group: 'See It In Action', label: 'Languages note', default: 'Languages used by care setting workforces across the UK.' },
  { key: 'action.email.label', group: 'See It In Action', label: 'Email channel label', default: 'Email' },
  { key: 'action.email.h3', group: 'See It In Action', label: 'Email sub-heading', default: 'An employment question answered from the exact section of the handbook.' },
  { key: 'action.email.p1', group: 'See It In Action', label: 'Email paragraph 1', rich: true, default: 'Staff who prefer email can ask the same questions and get the same answers. Every response cites the section of the handbook it came from, so staff can read the original wording themselves and know exactly what applies to them.' },
  { key: 'action.email.p2', group: 'See It In Action', label: 'Email paragraph 2', rich: true, default: 'The staff member can reply to the same email thread to ask a follow-up question. The conversation is kept with full context, so they do not have to repeat their situation with each new message.' },

  // Handbook topics
  { key: 'topics.label', group: 'Handbook Topics', label: 'Eyebrow', default: 'Everything in Your Handbook. Accessible.' },
  { key: 'topics.h2', group: 'Handbook Topics', label: 'Heading', default: 'Every topic your staff have questions about. Available on demand.' },
  { key: 'topics.intro', group: 'Handbook Topics', label: 'Intro', multiline: true, default: 'CareStream does not limit which parts of the handbook staff can ask about. The entire document is indexed and every topic is answerable.' },
  { key: 'topics.card1.title', group: 'Handbook Topics', label: 'Card 1 title', default: 'Annual leave and holiday pay' },
  { key: 'topics.card1.body', group: 'Handbook Topics', label: 'Card 1 body', multiline: true, default: 'How much leave staff are entitled to, how to book it, the notice required, what happens to unused leave, and how bank holidays are treated. Questions that come up every single week in every care setting.' },
  { key: 'topics.card2.title', group: 'Handbook Topics', label: 'Card 2 title', default: 'Sick pay and absence' },
  { key: 'topics.card2.body', group: 'Handbook Topics', label: 'Card 2 body', multiline: true, default: 'Statutory sick pay entitlements, contractual sick pay periods, the fit note requirement, return-to-work processes, and the difference between short-term and long-term absence procedures.' },
  { key: 'topics.card3.title', group: 'Handbook Topics', label: 'Card 3 title', default: 'Disciplinary and grievance' },
  { key: 'topics.card3.body', group: 'Handbook Topics', label: 'Card 3 body', multiline: true, default: 'What triggers a disciplinary process, what the stages are, what rights the staff member has during the process, and how to raise a formal grievance. Sensitive questions staff often do not want to ask a manager directly.' },
  { key: 'topics.card4.title', group: 'Handbook Topics', label: 'Card 4 title', default: 'Pay, expenses and benefits' },
  { key: 'topics.card4.body', group: 'Handbook Topics', label: 'Card 4 body', multiline: true, default: 'Pay dates, overtime rates, expense claim procedures, uniform allowances, mileage rates, and any other financial entitlements set out in the contract or handbook.' },
  { key: 'topics.card5.title', group: 'Handbook Topics', label: 'Card 5 title', default: 'Working hours and shifts' },
  { key: 'topics.card5.body', group: 'Handbook Topics', label: 'Card 5 body', multiline: true, default: 'Contracted hours, shift patterns, rest break entitlements, the right to refuse additional shifts, and the process for requesting a change to contracted hours.' },
  { key: 'topics.card6.title', group: 'Handbook Topics', label: 'Card 6 title', default: 'Probation and onboarding' },
  { key: 'topics.card6.body', group: 'Handbook Topics', label: 'Card 6 body', multiline: true, default: 'The length of the probationary period, what happens at the end of it, what is assessed during probation, and what support new starters are entitled to during their first weeks.' },

  // Equality of access
  { key: 'equality.label', group: 'Equality of Access', label: 'Eyebrow', default: 'Equality of Access' },
  { key: 'equality.h2', group: 'Equality of Access', label: 'Heading', default: 'A staff member who speaks Romanian has the same access to their rights as one who speaks English.' },
  { key: 'equality.p1', group: 'Equality of Access', label: 'Paragraph', rich: true, default: 'Language should not determine whether a staff member understands their employment rights. CareStream removes that barrier entirely. The same handbook, the same answers, available in any language your team uses.' },
  { key: 'equality.tableHead1', group: 'Equality of Access', label: 'Table heading 1', default: 'What CareStream provides' },
  { key: 'equality.tableHead2', group: 'Equality of Access', label: 'Table heading 2', default: 'What this means for your team' },
  { key: 'equality.row1.what', group: 'Equality of Access', label: 'Row 1 — provides', default: 'Handbook answers in any language' },
  { key: 'equality.row1.why', group: 'Equality of Access', label: 'Row 1 — means', multiline: true, default: 'A staff member whose first language is Tagalog, Polish, or Romanian receives the same accurate answer from the same section of the handbook as an English-speaking colleague.' },
  { key: 'equality.row2.what', group: 'Equality of Access', label: 'Row 2 — provides', default: 'No language configuration required' },
  { key: 'equality.row2.why', group: 'Equality of Access', label: 'Row 2 — means', multiline: true, default: 'Staff do not select a language or use a special command. CareStream detects the language of each message and answers in the same one.' },
  { key: 'equality.row3.what', group: 'Equality of Access', label: 'Row 3 — provides', default: 'Source document always in English' },
  { key: 'equality.row3.why', group: 'Equality of Access', label: 'Row 3 — means', multiline: true, default: 'Your handbook stays in one language. There is no version control problem and no risk of a translated copy going out of date.' },
  { key: 'equality.row4.what', group: 'Equality of Access', label: 'Row 4 — provides', default: 'Speak the question, hear the answer' },
  { key: 'equality.row4.why', group: 'Equality of Access', label: 'Row 4 — means', multiline: true, default: 'Staff who are not confident typing in English can speak their question in the hub in their own language and listen to the answer read back to them.' },
  { key: 'equality.row5.what', group: 'Equality of Access', label: 'Row 5 — provides', default: 'Sensitive questions asked privately' },
  { key: 'equality.row5.why', group: 'Equality of Access', label: 'Row 5 — means', multiline: true, default: 'Questions about disciplinary procedures, grievances, or pay can be asked in the hub or by email without going through a manager, so staff can understand their position before escalating.' },
  { key: 'equality.row6.what', group: 'Equality of Access', label: 'Row 6 — provides', default: 'Consistent answers at all hours' },
  { key: 'equality.row6.why', group: 'Equality of Access', label: 'Row 6 — means', multiline: true, default: 'A night shift worker who needs to know their sick pay entitlement gets the same accurate answer as a manager asking the same question during the working day.' },

  // Feature summary
  { key: 'features.label', group: 'Everything Included', label: 'Eyebrow', default: 'Everything Included' },
  { key: 'features.h2', group: 'Everything Included', label: 'Heading', default: 'The complete HR handbook access toolkit.' },
  { key: 'features.card1.title', group: 'Everything Included', label: 'Card 1 title', default: 'Full handbook indexing' },
  { key: 'features.card1.body', group: 'Everything Included', label: 'Card 1 body', multiline: true, default: 'Upload your complete staff handbook and all employment documents. Every section is indexed and answerable immediately.' },
  { key: 'features.card2.title', group: 'Everything Included', label: 'Card 2 title', default: 'Chapter-aware retrieval' },
  { key: 'features.card2.body', group: 'Everything Included', label: 'Card 2 body', multiline: true, default: 'Large handbooks are indexed chapter by chapter, so answers are drawn from the right part of a long document.' },
  { key: 'features.card3.title', group: 'Everything Included', label: 'Card 3 title', default: 'Hub and email access' },
  { key: 'features.card3.body', group: 'Everything Included', label: 'Card 3 body', multiline: true, default: 'Staff ask in the hub on their phone or by email. No new system to learn, and the hub installs like an app.' },
  { key: 'features.card4.title', group: 'Everything Included', label: 'Card 4 title', default: '60-plus language support' },
  { key: 'features.card4.body', group: 'Everything Included', label: 'Card 4 body', multiline: true, default: 'Questions detected and answered in any language. One handbook, every language your team speaks.' },
  { key: 'features.card5.title', group: 'Everything Included', label: 'Card 5 title', default: 'Voice input and read-aloud' },
  { key: 'features.card5.body', group: 'Everything Included', label: 'Card 5 body', multiline: true, default: 'Staff can speak a question in their own language and listen to the answer read back, with no typing required.' },
  { key: 'features.card6.title', group: 'Everything Included', label: 'Card 6 title', default: 'Source-cited answers' },
  { key: 'features.card6.body', group: 'Everything Included', label: 'Card 6 body', multiline: true, default: 'Every response cites the section of the handbook it came from, so staff can read the original wording for themselves.' },
  { key: 'features.card7.title', group: 'Everything Included', label: 'Card 7 title', default: 'Topic analytics for HR teams' },
  { key: 'features.card7.body', group: 'Everything Included', label: 'Card 7 body', multiline: true, default: 'See which topics staff ask about most. High-volume topics with unclear answers are evidence that the handbook needs updating in that area.' },
  { key: 'features.card8.title', group: 'Everything Included', label: 'Card 8 title', default: 'Private and confidential' },
  { key: 'features.card8.body', group: 'Everything Included', label: 'Card 8 body', multiline: true, default: 'Sensitive questions about grievances, disciplinary procedures, or pay can be asked without going through a manager first.' },

  // Stats
  { key: 'stats.stat1.figure', group: 'Stats', label: 'Stat 1 figure', default: '60+' },
  { key: 'stats.stat1.label', group: 'Stats', label: 'Stat 1 lead', default: 'languages supported for staff handbook questions, with no configuration required.' },
  { key: 'stats.stat1.body', group: 'Stats', label: 'Stat 1 body', multiline: true, default: 'The language of the question is detected automatically. Your handbook stays in English and answers are delivered in the language each staff member used.' },
  { key: 'stats.stat2.figure', group: 'Stats', label: 'Stat 2 figure', default: '24/7' },
  { key: 'stats.stat2.label', group: 'Stats', label: 'Stat 2 lead', default: 'access to the full staff handbook, on every shift and at any hour.' },
  { key: 'stats.stat2.body', group: 'Stats', label: 'Stat 2 body', multiline: true, default: 'The question that previously meant an email to HR and a wait until the next working day is answered in the hub in seconds, day or night.' },
]
