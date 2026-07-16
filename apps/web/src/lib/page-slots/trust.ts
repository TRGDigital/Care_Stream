import type { SlotDef } from './types'

// Editable copy for /trust. Defaults are the current live copy; editing a slot in
// the platform (Main site pages → /trust) overrides it without touching the design.
export const TRUST_SLOTS: SlotDef[] = [
  // Hero
  { key: 'hero.label', group: 'Hero', label: 'Eyebrow', default: 'Trust & Security' },
  { key: 'hero.title', group: 'Hero', label: 'Headline', default: 'Powered by your policies. Nothing else.' },
  { key: 'hero.subtitle', group: 'Hero', label: 'Subtitle', multiline: true, default: "Not the internet. Not another organisation's documents. Not guesswork. Here is exactly how CareStreamAI works, and why you can trust it with your compliance-critical information." },

  // What staff see
  { key: 'staff.label', group: 'What staff see', label: 'Eyebrow', default: 'Answers You Can Trust' },
  { key: 'staff.h2', group: 'What staff see', label: 'Heading', default: 'Every answer cites the policy it came from.' },
  { key: 'staff.body', group: 'What staff see', label: 'Paragraph', rich: true, default: 'Staff ask in the hub, in their own language, and get the answer with a reference to the exact policy and section. Nothing is invented, and everything is traceable.' },

  // How the AI works
  { key: 'ai.label', group: 'How the AI works', label: 'Eyebrow', default: 'How the AI Works' },
  { key: 'ai.h2', group: 'How the AI works', label: 'Heading', default: 'Explained for every audience.' },
  { key: 'ai.card1.audience', group: 'How the AI works', label: 'Card 1 audience', default: 'For everyone' },
  { key: 'ai.card1.body', group: 'How the AI works', label: 'Card 1 body', multiline: true, default: 'Think of CareStreamAI as a colleague who has read every policy in your library, and nothing else. When a member of your team asks a question, CareStreamAI searches your policy library, finds the most relevant sections, and uses them, and only them, to write the answer. It does not search the internet. It does not use general knowledge. It does not guess.' },
  { key: 'ai.card2.audience', group: 'How the AI works', label: 'Card 2 audience', default: 'For operations and quality leads' },
  { key: 'ai.card2.body', group: 'How the AI works', label: 'Card 2 body', multiline: true, default: 'CareStreamAI uses Retrieval Augmented Generation (RAG), the gold standard for AI systems that need to answer from a specific, trusted document set. Every query searches your private policy index first. The AI receives only the retrieved content as its input, and is explicitly instructed not to use anything outside it.' },
  { key: 'ai.card3.audience', group: 'How the AI works', label: 'Card 3 audience', default: 'For boards and legal leads' },
  { key: 'ai.card3.body', group: 'How the AI works', label: 'Card 3 body', multiline: true, default: "CareStreamAI's architecture eliminates the primary governance risk of AI in professional settings: confident but incorrect answers. Every response is bounded by your approved documents and logged in an append-only audit trail. The system cannot contradict your policies. It cannot extend beyond them." },

  // Data commitments
  { key: 'data.label', group: 'Data commitments', label: 'Eyebrow', default: 'What We Promise' },
  { key: 'data.h2', group: 'Data commitments', label: 'Heading', default: 'Your data, seven commitments.' },
  { key: 'data.c1.title', group: 'Data commitments', label: 'Commitment 1 title', default: 'Complete data isolation' },
  { key: 'data.c1.body', group: 'Data commitments', label: 'Commitment 1 detail', multiline: true, default: 'Your policy library, query history, training records and staff data are logically isolated, so no other subscriber can access them in any form.' },
  { key: 'data.c2.title', group: 'Data commitments', label: 'Commitment 2 title', default: 'Never used to train AI' },
  { key: 'data.c2.body', group: 'Data commitments', label: 'Commitment 2 detail', multiline: true, default: 'Your documents and data are never used to train AI models, by us or by the providers we use. This is set out in our Data Processing Agreement.' },
  { key: 'data.c3.title', group: 'Data commitments', label: 'Commitment 3 title', default: 'Encrypted at rest and in transit' },
  { key: 'data.c3.body', group: 'Data commitments', label: 'Commitment 3 detail', multiline: true, default: 'All data is encrypted at rest (AES-256) and in transit (TLS), using industry-standard encryption.' },
  { key: 'data.c4.title', group: 'Data commitments', label: 'Commitment 4 title', default: 'UK/EEA data storage' },
  { key: 'data.c4.body', group: 'Data commitments', label: 'Commitment 4 detail', multiline: true, default: 'Your documents, records and logs are stored in the UK/EEA. AI processing is carried out by vetted providers under agreements that forbid training on your data.' },
  { key: 'data.c5.title', group: 'Data commitments', label: 'Commitment 5 title', default: 'UK GDPR compliant' },
  { key: 'data.c5.body', group: 'Data commitments', label: 'Commitment 5 detail', multiline: true, default: 'CareStreamAI operates in full compliance with UK GDPR. A Data Processing Agreement is provided to all subscribers.' },
  { key: 'data.c6.title', group: 'Data commitments', label: 'Commitment 6 title', default: 'Append-only audit log' },
  { key: 'data.c6.body', group: 'Data commitments', label: 'Commitment 6 detail', multiline: true, default: 'Every query and every system action is recorded in an append-only, tamper-evident audit log.' },
  { key: 'data.c7.title', group: 'Data commitments', label: 'Commitment 7 title', default: 'Configurable data retention' },
  { key: 'data.c7.body', group: 'Data commitments', label: 'Commitment 7 detail', multiline: true, default: 'Query logs are retained in line with your configured retention policy, then securely deleted.' },

  // FAQ
  { key: 'faq.label', group: 'FAQ', label: 'Eyebrow', default: 'Common Questions' },
  { key: 'faq.h2', group: 'FAQ', label: 'Heading', default: 'Security questions, answered.' },
  { key: 'faq.q1.question', group: 'FAQ', label: 'Question 1', default: 'Will the AI make things up?' },
  { key: 'faq.q1.answer', group: 'FAQ', label: 'Answer 1', multiline: true, default: 'No. CareStreamAI is explicitly designed to prevent this. If no relevant policy is found, it says so, it does not generate content from general knowledge.' },
  { key: 'faq.q2.question', group: 'FAQ', label: 'Question 2', default: 'Can other organisations see our policies?' },
  { key: 'faq.q2.answer', group: 'FAQ', label: 'Answer 2', multiline: true, default: 'No. Your policy library is completely isolated. No other subscriber can access it in any form.' },
  { key: 'faq.q3.question', group: 'FAQ', label: 'Question 3', default: 'Is our data used to train AI models?' },
  { key: 'faq.q3.answer', group: 'FAQ', label: 'Answer 3', multiline: true, default: 'No. Your data is never used to train AI models, by us or by the AI providers we use, and this is set out in our Data Processing Agreement.' },
  { key: 'faq.q4.question', group: 'FAQ', label: 'Question 4', default: 'Where is our data stored and processed?' },
  { key: 'faq.q4.answer', group: 'FAQ', label: 'Answer 4', multiline: true, default: 'Your documents, records and logs are stored in the UK/EEA. AI processing is carried out by vetted providers under data processing agreements that prohibit using your data to train their models. We are happy to share the detail in our DPA.' },
  { key: 'faq.q5.question', group: 'FAQ', label: 'Question 5', default: 'What if our policy has an error in it?' },
  { key: 'faq.q5.answer', group: 'FAQ', label: 'Answer 5', multiline: true, default: 'CareStreamAI will accurately reflect what your policy says. This surfaces the need to keep policies accurate, which is the right incentive in a compliance setting.' },
  { key: 'faq.q6.question', group: 'FAQ', label: 'Question 6', default: 'What happens when we update a policy?' },
  { key: 'faq.q6.answer', group: 'FAQ', label: 'Answer 6', multiline: true, default: 'The old version is immediately retired from the retrieval system. All subsequent queries return answers based on the new version. The old version is retained in your audit archive.' },
]
