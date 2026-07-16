import type { SlotDef } from './types'

// Editable copy for /cqc-report-chat. Defaults are the current live copy; editing a
// slot in the platform (Main site pages → /cqc-report-chat) overrides it without
// touching the design.
export const CQC_REPORT_CHAT_SLOTS: SlotDef[] = [
  // Hero
  { key: 'hero.label', group: 'Hero', label: 'Eyebrow', default: 'CQC Report Chat' },
  { key: 'hero.h1', group: 'Hero', label: 'Headline', default: 'Your CQC inspection report. Now you can talk to it.' },
  { key: 'hero.intro', group: 'Hero', label: 'Intro paragraph', multiline: true, default: 'Upload your latest CQC inspection report and ask it anything in plain English. CareStream cross-references it against your own policies and the CQC framework to find action points, explain findings, and help you plan your response, in seconds, not hours.' },

  // What you can ask
  { key: 'ask.label', group: 'What you can ask', label: 'Eyebrow', default: 'Built For Care Managers' },
  { key: 'ask.h2', group: 'What you can ask', label: 'Heading', default: 'Stop hunting through 17 pages. Just ask the question.' },
  { key: 'ask.card1.title', group: 'What you can ask', label: 'Card 1 title', default: 'Find action points instantly' },
  { key: 'ask.card1.body', group: 'What you can ask', label: 'Card 1 body', multiline: true, default: 'Ask "What action points did the inspector raise?" and get a structured, numbered list drawn directly from your report, with section references where the report provides them.' },
  { key: 'ask.card2.title', group: 'What you can ask', label: 'Card 2 title', default: 'Understand any finding' },
  { key: 'ask.card2.body', group: 'What you can ask', label: 'Card 2 body', multiline: true, default: 'Ask about any CQC finding and get a plain English explanation. CareStream draws on the CQC framework to tell you what the inspector meant and what evidence you would need to address it.' },
  { key: 'ask.card3.title', group: 'What you can ask', label: 'Card 3 title', default: 'Plan your response' },
  { key: 'ask.card3.body', group: 'What you can ask', label: 'Card 3 body', multiline: true, default: 'Ask "What do I need to do to address the Safe domain findings?" and get a clear action list, cross-referenced with the policies you already have in place.' },

  // How it works
  { key: 'how.label', group: 'How it works', label: 'Eyebrow', default: 'How It Works' },
  { key: 'how.h2', group: 'How it works', label: 'Heading', default: 'Three steps from report to clarity.' },
  { key: 'how.step1.title', group: 'How it works', label: 'Step 1 title', default: 'Upload your CQC report' },
  { key: 'how.step1.body', group: 'How it works', label: 'Step 1 body', multiline: true, default: 'Drag and drop your latest CQC inspection report PDF. CareStream reads and indexes the full document in moments. No CQC login required.' },
  { key: 'how.step2.title', group: 'How it works', label: 'Step 2 title', default: 'Ask in plain English' },
  { key: 'how.step2.body', group: 'How it works', label: 'Step 2 body', multiline: true, default: 'Type any question about your report, action points, specific domain findings, inspector language, what evidence is needed. No keyword searching, no page numbers.' },
  { key: 'how.step3.title', group: 'How it works', label: 'Step 3 title', default: 'Get specific answers' },
  { key: 'how.step3.body', group: 'How it works', label: 'Step 3 body', multiline: true, default: 'Every answer is grounded in your report and cross-referenced with your policies and the CQC framework, with section references where the report provides them. Precise answers about your inspection, your home.' },

  // More than a search tool
  { key: 'more.label', group: 'More than a search tool', label: 'Eyebrow', default: 'More Than A Search Tool' },
  { key: 'more.h2', group: 'More than a search tool', label: 'Heading', default: 'It reads your report against your whole compliance picture.' },
  { key: 'more.h3', group: 'More than a search tool', label: 'Sub-heading', default: 'Not the report in isolation. The report against your policies and the CQC framework.' },
  { key: 'more.p1', group: 'More than a search tool', label: 'Paragraph 1', rich: true, default: 'CQC Report Chat does not read your inspection report on its own. It cross-references the report against your own policies and the CQC assessment framework, so it can tell you not just what the inspector said, but whether your policies already answer it and what evidence would support your case.' },
  { key: 'more.p2', group: 'More than a search tool', label: 'Paragraph 2', rich: true, default: 'It can also help you draft a factual-accuracy challenge, the formal response you can send to CQC to correct factual errors in a draft report. CareStream drafts it from your report and your policies. You review it, and you decide whether to send it.' },
  { key: 'more.item1.label', group: 'More than a search tool', label: 'Feature 1 label', default: 'Cross-references your policies' },
  { key: 'more.item1.text', group: 'More than a search tool', label: 'Feature 1 text', multiline: true, default: 'Sees where your existing policies already address a finding, so you can evidence it.' },
  { key: 'more.item2.label', group: 'More than a search tool', label: 'Feature 2 label', default: 'Maps to the CQC framework' },
  { key: 'more.item2.text', group: 'More than a search tool', label: 'Feature 2 text', multiline: true, default: 'Explains what the inspector means and what evidence is expected, using the CQC assessment framework.' },
  { key: 'more.item3.label', group: 'More than a search tool', label: 'Feature 3 label', default: 'Drafts your challenge' },
  { key: 'more.item3.text', group: 'More than a search tool', label: 'Feature 3 text', multiline: true, default: 'Helps you draft a factual-accuracy challenge grounded in your report and policies, for you to review and send.' },

  // Sample questions
  { key: 'questions.label', group: 'Sample questions', label: 'Eyebrow', default: 'Questions You Can Ask' },
  { key: 'questions.h2', group: 'Sample questions', label: 'Heading', default: 'The questions care managers actually ask.' },
  { key: 'questions.q1', group: 'Sample questions', label: 'Question 1', default: 'What action points did the inspector raise?' },
  { key: 'questions.q2', group: 'Sample questions', label: 'Question 2', default: 'What did the inspector say about medication management?' },
  { key: 'questions.q3', group: 'Sample questions', label: 'Question 3', default: 'Which CQC key questions were rated Requires Improvement?' },
  { key: 'questions.q4', group: 'Sample questions', label: 'Question 4', default: 'What evidence did the inspector say was missing?' },
  { key: 'questions.q5', group: 'Sample questions', label: 'Question 5', default: 'Do my policies already cover the handover finding?' },
  { key: 'questions.q6', group: 'Sample questions', label: 'Question 6', default: 'What does the inspector mean by "embedding"?' },
  { key: 'questions.q7', group: 'Sample questions', label: 'Question 7', default: 'Help me draft a factual-accuracy challenge for the staffing finding.' },
  { key: 'questions.q8', group: 'Sample questions', label: 'Question 8', default: 'Show me everything the inspector said about staffing.' },
  { key: 'questions.q9', group: 'Sample questions', label: 'Question 9', default: 'What does section 5.3 mean in plain English?' },

  // Trust strip
  { key: 'trust.item1.stat', group: 'Trust strip', label: 'Item 1 stat', default: 'No CQC login' },
  { key: 'trust.item1.label', group: 'Trust strip', label: 'Item 1 label', multiline: true, default: 'Just upload your PDF, the report stays private to your account' },
  { key: 'trust.item2.stat', group: 'Trust strip', label: 'Item 2 stat', default: 'Secure' },
  { key: 'trust.item2.label', group: 'Trust strip', label: 'Item 2 label', multiline: true, default: 'Reports are encrypted at rest and never used to train AI models' },
  { key: 'trust.item3.stat', group: 'Trust strip', label: 'Item 3 stat', default: 'Ready in moments' },
  { key: 'trust.item3.label', group: 'Trust strip', label: 'Item 3 label', multiline: true, default: 'Your report is indexed and ready to query before the kettle boils' },

  // Legal note
  { key: 'legal.title', group: 'Legal note', label: 'Heading', default: 'For information and planning purposes' },
  { key: 'legal.body', group: 'Legal note', label: 'Body', multiline: true, default: 'CQC Report Chat helps you understand and navigate your inspection report. It does not provide regulatory advice and does not guarantee any particular outcome at future inspections. Any factual-accuracy challenge it drafts is a starting point for you to review. Always verify important decisions with your regulatory lead or legal adviser.' },
]
