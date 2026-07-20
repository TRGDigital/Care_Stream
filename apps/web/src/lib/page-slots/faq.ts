import type { SlotDef } from './types'

// Editable copy for /faq. Defaults are the current live copy; editing a slot in
// the platform (Main site pages → /faq) overrides it without touching the design.
export const FAQ_SLOTS: SlotDef[] = [
  // Header
  { key: 'header.label', group: 'Header', label: 'Eyebrow', default: 'FAQ' },
  { key: 'header.title', group: 'Header', label: 'Heading', default: 'Everything you want to know.' },
  { key: 'header.subtitle', group: 'Header', label: 'Subtitle', multiline: true, default: "If the answer isn't here, contact us and we'll respond within one business day." },

  // General
  { key: 'general.title', group: 'General', label: 'Section heading', default: 'General' },
  { key: 'general.q1', group: 'General', label: 'Q1 question', default: 'What is CareStreamAI?' },
  { key: 'general.a1', group: 'General', label: 'Q1 answer', rich: true, default: 'CareStreamAI is a policy assistant built specifically for UK care settings. You upload your policies and staff handbook; your team can then ask questions and get instant, accurate answers, in any of 50+ languages. Every interaction is logged for compliance and audit purposes.' },
  { key: 'general.q2', group: 'General', label: 'Q2 question', default: 'Who is it for?' },
  { key: 'general.a2', group: 'General', label: 'Q2 answer', rich: true, default: 'CareStreamAI is designed for care homes, domiciliary care providers, supported living services, and any regulated health and social care setting. It is used by care workers, senior carers, registered managers, HR leads, and operations directors.' },
  { key: 'general.q3', group: 'General', label: 'Q3 question', default: 'Does it work for domiciliary care as well as residential care?' },
  { key: 'general.a3', group: 'General', label: 'Q3 answer', rich: true, default: 'Yes. CareStreamAI is document-agnostic, it works with any policy library. Whether you are a residential home, a domiciliary provider, or a supported living service, it will work with your documents.' },
  { key: 'general.q4', group: 'General', label: 'Q4 question', default: 'What languages does it support?' },
  { key: 'general.a4', group: 'General', label: 'Q4 answer', rich: true, default: 'CareStreamAI supports 50+ languages automatically. Staff type or email their question in any language, Polish, Romanian, Tagalog, Yoruba, Arabic, Hindi, and many more, and receive an answer in the same language. There is no language selection menu and no extra charge per language.' },
  { key: 'general.q5', group: 'General', label: 'Q5 question', default: 'Is CareStreamAI affiliated with or endorsed by CQC?' },
  { key: 'general.a5', group: 'General', label: 'Q5 answer', rich: true, default: 'No. CareStreamAI is an independent software product. It is not affiliated with, endorsed by, or certified by the Care Quality Commission. References to CQC are factual descriptions of how the product supports compliance evidence-building.' },

  // AI & Trust
  { key: 'ai.title', group: 'AI & Trust', label: 'Section heading', default: 'AI & Trust' },
  { key: 'ai.q1', group: 'AI & Trust', label: 'Q1 question', default: 'Will the AI make things up?' },
  { key: 'ai.a1', group: 'AI & Trust', label: 'Q1 answer', rich: true, default: 'No. CareStreamAI is designed specifically to prevent this. It only ever answers from your uploaded documents. If no relevant policy content is found, it says so, it does not generate content from general knowledge, training data, or the internet.' },
  { key: 'ai.q2', group: 'AI & Trust', label: 'Q2 question', default: 'How does it know the answer?' },
  { key: 'ai.a2', group: 'AI & Trust', label: 'Q2 answer', rich: true, default: 'When a question is submitted, CareStreamAI searches your policy library for the most relevant sections. It retrieves those sections and uses them, and only them, as the basis for its answer. This method is called Retrieval Augmented Generation (RAG) and is the gold standard for AI systems that need to answer from a trusted document set.' },
  { key: 'ai.q3', group: 'AI & Trust', label: 'Q3 question', default: 'What if our policy has an error in it?' },
  { key: 'ai.a3', group: 'AI & Trust', label: 'Q3 answer', rich: true, default: 'CareStreamAI will accurately reflect what your policy says. This is intentional, the system surfaces the need to keep policies accurate, which is the right incentive in a compliance setting.' },
  { key: 'ai.q4', group: 'AI & Trust', label: 'Q4 question', default: 'Can it answer questions about regulations not in our policies?' },
  { key: 'ai.a4', group: 'AI & Trust', label: 'Q4 answer', rich: true, default: 'CareStreamAI also includes a curated knowledge base of UK regulatory frameworks, GDPR, RIDDOR, the Care Act, CQC Fundamental Standards, and more. Answers are always grounded in this knowledge base, not general AI output.' },
  { key: 'ai.q5', group: 'AI & Trust', label: 'Q5 question', default: 'What happens when we update a policy?' },
  { key: 'ai.a5', group: 'AI & Trust', label: 'Q5 answer', rich: true, default: 'Upload the new version in your admin panel. CareStreamAI immediately retires the old version from the retrieval system and activates the new one. All subsequent queries return answers based on the new version. The old version is retained in your audit archive.' },

  // Data & Security
  { key: 'security.title', group: 'Data & Security', label: 'Section heading', default: 'Data & Security' },
  { key: 'security.q1', group: 'Data & Security', label: 'Q1 question', default: 'Can other organisations see our policies?' },
  { key: 'security.a1', group: 'Data & Security', label: 'Q1 answer', rich: true, default: 'No. Your policy library is completely isolated. Each subscriber has a private environment. No other subscriber can access your data in any form, at any time.' },
  { key: 'security.q2', group: 'Data & Security', label: 'Q2 question', default: 'Is our data used to train AI models?' },
  { key: 'security.a2', group: 'Data & Security', label: 'Q2 answer', rich: true, default: 'No. Your documents and query data are never used to improve AI models. This is a contractual commitment.' },
  { key: 'security.q3', group: 'Data & Security', label: 'Q3 question', default: 'Where is our data stored?' },
  { key: 'security.a3', group: 'Data & Security', label: 'Q3 answer', rich: true, default: 'All data is stored within UK/EEA regions. No data is transferred outside these regions.' },
  { key: 'security.q4', group: 'Data & Security', label: 'Q4 question', default: 'Is it encrypted?' },
  { key: 'security.a4', group: 'Data & Security', label: 'Q4 answer', rich: true, default: 'Yes. All data is encrypted using AES-256 at rest and TLS 1.3 in transit.' },
  { key: 'security.q5', group: 'Data & Security', label: 'Q5 question', default: 'Do you provide a Data Processing Agreement?' },
  { key: 'security.a5', group: 'Data & Security', label: 'Q5 answer', rich: true, default: 'Yes. A Data Processing Agreement is provided to all subscribers. CareStreamAI operates in full compliance with UK GDPR.' },
  { key: 'security.q6', group: 'Data & Security', label: 'Q6 question', default: 'How long are query logs retained?' },
  { key: 'security.a6', group: 'Data & Security', label: 'Q6 answer', rich: true, default: 'Query logs are retained for 12 months by default, then automatically deleted. The retention period is configurable.' },

  // Languages
  { key: 'languages.title', group: 'Languages', label: 'Section heading', default: 'Languages' },
  { key: 'languages.q1', group: 'Languages', label: 'Q1 question', default: 'Does staff need to select their language?' },
  { key: 'languages.a1', group: 'Languages', label: 'Q1 answer', rich: true, default: 'No. CareStreamAI detects the language of the query automatically. Staff simply type or email their question in their language and receive an answer in the same language.' },
  { key: 'languages.q2', group: 'Languages', label: 'Q2 question', default: 'What languages are supported?' },
  { key: 'languages.a2', group: 'Languages', label: 'Q2 answer', rich: true, default: 'Over 50 languages, including Polish, Romanian, Bulgarian, Hungarian, Tagalog, Hindi, Urdu, Arabic, Yoruba, Igbo, Somali, Portuguese, Spanish, French, and many more.' },
  { key: 'languages.q3', group: 'Languages', label: 'Q3 question', default: 'Are answers translated word-for-word?' },
  { key: 'languages.a3', group: 'Languages', label: 'Q3 answer', rich: true, default: "No, CareStreamAI generates a natural-language response in the staff member's language. It does not machine-translate a pre-written English answer." },
  { key: 'languages.q4', group: 'Languages', label: 'Q4 question', default: 'What if the original policy is in English and the query is in Romanian?' },
  { key: 'languages.a4', group: 'Languages', label: 'Q4 answer', rich: true, default: 'CareStreamAI retrieves the relevant English policy content, understands it, and produces a fluent Romanian response. Staff receive an answer in their language even when the source document is in English.' },

  // Pricing & Plans
  { key: 'pricing.title', group: 'Pricing & Plans', label: 'Section heading', default: 'Pricing & Plans' },
  { key: 'pricing.q1', group: 'Pricing & Plans', label: 'Q1 question', default: 'What plans are available?' },
  { key: 'pricing.a1', group: 'Pricing & Plans', label: 'Q1 answer', rich: true, default: 'CareStreamAI is available on two plans: Starter (£85/month) and Professional (£230/month). Both include full policy library, 50+ language support, email and chat channels, and full audit logging. Professional adds CQC Readiness Reports, policy gap detection, language analytics, and individual staff engagement data.' },
  { key: 'pricing.q2', group: 'Pricing & Plans', label: 'Q2 question', default: 'Is there a free trial?' },
  { key: 'pricing.a2', group: 'Pricing & Plans', label: 'Q2 answer', rich: true, default: 'Yes. A 14-day free trial is available on either plan. You add your card to start the trial, but you are not charged until day 14 — cancel anytime before then and you pay nothing.' },
  { key: 'pricing.q3', group: 'Pricing & Plans', label: 'Q3 question', default: 'Can I switch plans?' },
  { key: 'pricing.a3', group: 'Pricing & Plans', label: 'Q3 answer', rich: true, default: 'Yes. You can upgrade or downgrade at any time. Changes take effect at the next billing cycle.' },
  { key: 'pricing.q4', group: 'Pricing & Plans', label: 'Q4 question', default: 'Do you offer discounts for multiple homes?' },
  { key: 'pricing.a4', group: 'Pricing & Plans', label: 'Q4 answer', rich: true, default: 'Yes. Group pricing is available for organisations operating multiple homes. Contact us for a quote.' },
  { key: 'pricing.q5', group: 'Pricing & Plans', label: 'Q5 question', default: 'Is there a per-user charge?' },
  { key: 'pricing.a5', group: 'Pricing & Plans', label: 'Q5 answer', rich: true, default: 'No. CareStreamAI is priced per-home, not per-user. Your entire team can use it without per-seat fees.' },

  // Getting Started
  { key: 'getting.title', group: 'Getting Started', label: 'Section heading', default: 'Getting Started' },
  { key: 'getting.q1', group: 'Getting Started', label: 'Q1 question', default: 'How long does it take to get started?' },
  { key: 'getting.a1', group: 'Getting Started', label: 'Q1 answer', rich: true, default: 'Most customers are live within one hour. Upload your policies, configure your settings, and share the link with your team. There is no installation and no IT setup required.' },
  { key: 'getting.q2', group: 'Getting Started', label: 'Q2 question', default: 'Do we need IT support to set it up?' },
  { key: 'getting.a2', group: 'Getting Started', label: 'Q2 answer', rich: true, default: 'No. CareStreamAI is a browser-based web application. There is no software to install, no integration required, and no technical skills needed to get started.' },
  { key: 'getting.q3', group: 'Getting Started', label: 'Q3 question', default: 'What formats do you accept for policy uploads?' },
  { key: 'getting.a3', group: 'Getting Started', label: 'Q3 answer', rich: true, default: 'PDF, Microsoft Word (.docx), and plain text (.txt). Most policy libraries are in one of these formats.' },
  { key: 'getting.q4', group: 'Getting Started', label: 'Q4 question', default: 'Do we need to prepare our policies before uploading?' },
  { key: 'getting.a4', group: 'Getting Started', label: 'Q4 answer', rich: true, default: 'No. CareStreamAI automatically strips headers, footers, version numbers, and page numbers so the AI only processes the substantive content.' },
  { key: 'getting.q5', group: 'Getting Started', label: 'Q5 question', default: 'What happens after the free trial?' },
  { key: 'getting.a5', group: 'Getting Started', label: 'Q5 answer', rich: true, default: 'You choose your plan and add a card when you start the trial. At the end of the 14 days your plan begins automatically on that card. If you cancel before day 14 you are not charged, your account is closed and your data is deleted.' },
]
