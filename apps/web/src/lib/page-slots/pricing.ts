import type { SlotDef } from './types'

// Editable copy for /pricing. Defaults are the current live copy; editing a slot in
// the platform (Main site pages → /pricing) overrides it without touching the design.
// NB: the comparison matrix feature rows and their section names are NOT slotted here —
// they drive the /features/ links and are editable elsewhere.
export const PRICING_SLOTS: SlotDef[] = [
  // Hero
  { key: 'hero.label', group: 'Hero', label: 'Eyebrow', default: 'Pricing' },
  { key: 'hero.title', group: 'Hero', label: 'Headline', default: 'Simple pricing. No surprises.' },
  { key: 'hero.subtitle', group: 'Hero', label: 'Subtitle', multiline: true, default: 'Every plan includes a 14-day free trial. No charge until day 14 — cancel anytime.' },

  // Plans (shared)
  { key: 'plans.cta', group: 'Plans', label: 'Plan CTA label', default: 'Start Free Trial' },

  // Plans — Starter
  { key: 'plans.starter.name', group: 'Plans · Starter', label: 'Name', default: 'Starter' },
  { key: 'plans.starter.caption', group: 'Plans · Starter', label: 'Price caption', default: '£490/year, save £98' },
  { key: 'plans.starter.feat1', group: 'Plans · Starter', label: 'Feature 1', default: '10 annual training allocations per month' },
  { key: 'plans.starter.feat2', group: 'Plans · Starter', label: 'Feature 2', default: 'Up to 25 policies, 1 handbook, 10 staff users' },
  { key: 'plans.starter.feat3', group: 'Plans · Starter', label: 'Feature 3', default: '500 queries per month' },
  { key: 'plans.starter.feat4', group: 'Plans · Starter', label: 'Feature 4', default: 'Chat, email and voice access' },
  { key: 'plans.starter.feat5', group: 'Plans · Starter', label: 'Feature 5', default: 'Basic analytics and regulatory knowledge base' },

  // Plans — Professional
  { key: 'plans.professional.name', group: 'Plans · Professional', label: 'Name', default: 'Professional' },
  { key: 'plans.professional.badge', group: 'Plans · Professional', label: 'Badge', default: 'Most popular' },
  { key: 'plans.professional.caption', group: 'Plans · Professional', label: 'Price caption', default: '£1,290/year, save £258' },
  { key: 'plans.professional.feat1', group: 'Plans · Professional', label: 'Feature 1', default: '30 annual training allocations per month' },
  { key: 'plans.professional.feat2', group: 'Plans · Professional', label: 'Feature 2', default: 'Unlimited policies, handbooks and staff users' },
  { key: 'plans.professional.feat3', group: 'Plans · Professional', label: 'Feature 3', default: '5,000 queries per month' },
  { key: 'plans.professional.feat4', group: 'Plans · Professional', label: 'Feature 4', default: 'Advanced analytics + CQC Readiness Report' },
  { key: 'plans.professional.feat5', group: 'Plans · Professional', label: 'Feature 5', default: 'Policy Gap Detection: coverage, what-to-add, legal-change tracking + gap training' },
  { key: 'plans.professional.feat6', group: 'Plans · Professional', label: 'Feature 6', default: 'Face-to-face training and matrix' },
  { key: 'plans.professional.feat7', group: 'Plans · Professional', label: 'Feature 7', default: 'Renewal tracking and mandatory-by-role gaps' },
  { key: 'plans.professional.feat8', group: 'Plans · Professional', label: 'Feature 8', default: 'CQC evidence pack (sign-in sheets, certificates)' },
  { key: 'plans.professional.feat9', group: 'Plans · Professional', label: 'Feature 9', default: 'Training payroll report (PDF, CSV and £ costing)' },

  // Plans — Enterprise
  { key: 'plans.enterprise.name', group: 'Plans · Enterprise', label: 'Name', default: 'Enterprise' },
  { key: 'plans.enterprise.badge', group: 'Plans · Enterprise', label: 'Badge', default: 'Everything included' },
  { key: 'plans.enterprise.caption', group: 'Plans · Enterprise', label: 'Price caption', default: '£2,100/year, save £443.88' },
  { key: 'plans.enterprise.feat1', group: 'Plans · Enterprise', label: 'Feature 1', default: 'Unlimited annual training allocations' },
  { key: 'plans.enterprise.feat2', group: 'Plans · Enterprise', label: 'Feature 2', default: 'Everything in Professional, plus:' },
  { key: 'plans.enterprise.feat3', group: 'Plans · Enterprise', label: 'Feature 3', default: 'Build your own audits' },
  { key: 'plans.enterprise.feat4', group: 'Plans · Enterprise', label: 'Feature 4', default: 'Effectiveness of training analytics' },
  { key: 'plans.enterprise.feat5', group: 'Plans · Enterprise', label: 'Feature 5', default: 'Audits linked to training + Training Impact' },
  { key: 'plans.enterprise.feat6', group: 'Plans · Enterprise', label: 'Feature 6', default: 'Multi-site group console and benchmarking' },
  { key: 'plans.enterprise.feat7', group: 'Plans · Enterprise', label: 'Feature 7', default: 'Workforce compliance register (DBS, right to work, registration, references)' },
  { key: 'plans.enterprise.feat8', group: 'Plans · Enterprise', label: 'Feature 8', default: 'Supervisions and appraisals tracking' },
  { key: 'plans.enterprise.feat9', group: 'Plans · Enterprise', label: 'Feature 9', default: 'Priority support and a dedicated manager' },

  // Training-only card
  { key: 'training.badge', group: 'Training only', label: 'Badge', default: 'Training only' },
  { key: 'training.heading', group: 'Training only', label: 'Heading', default: 'Just need training? Buy modules individually.' },
  { key: 'training.body', group: 'Training only', label: 'Body', multiline: true, default: 'No subscription required. Pay per module, per staff member. Each module includes the interactive lesson, the assessment, and a certificate on completion. Annual modules renew yearly. Upgrade to a full plan any time.' },
  { key: 'training.priceCaption', group: 'Training only', label: 'Price caption', default: 'per staff member, per module' },
  { key: 'training.cta', group: 'Training only', label: 'CTA label', default: 'Start with training modules' },

  // Comparison section headings (above the matrix)
  { key: 'compare.label', group: 'Compare plans', label: 'Eyebrow', default: 'Compare plans' },
  { key: 'compare.h2', group: 'Compare plans', label: 'Heading', default: 'Every feature, side by side' },

  // Guarantee strip
  { key: 'guarantee.item1', group: 'Guarantee strip', label: 'Item 1', default: '14-day free trial on any plan' },
  { key: 'guarantee.item2', group: 'Guarantee strip', label: 'Item 2', default: 'No charge until day 14' },
  { key: 'guarantee.item3', group: 'Guarantee strip', label: 'Item 3', default: 'No per-user fees' },
  { key: 'guarantee.item4', group: 'Guarantee strip', label: 'Item 4', default: 'All three channels included' },
  { key: 'guarantee.item5', group: 'Guarantee strip', label: 'Item 5', default: 'Cancel any time' },
  { key: 'guarantee.item6', group: 'Guarantee strip', label: 'Item 6', default: 'UK data residency' },

  // FAQ
  { key: 'faq.label', group: 'FAQ', label: 'Eyebrow', default: 'Pricing FAQs' },
  { key: 'faq.h2', group: 'FAQ', label: 'Heading', default: 'Common questions about pricing' },
  { key: 'faq.q1', group: 'FAQ', label: 'Question 1', default: 'What is an annual training allocation?' },
  { key: 'faq.a1', group: 'FAQ', label: 'Answer 1', rich: true, default: 'Each plan includes a monthly pool of annual-training-module allocations. One allocation is one annual training module assigned to one staff member. For example, on Starter you can assign 10 modules to one person, or one module to 10 people, or any mix up to 10 each month. The pool resets on the 1st. Professional includes 30 per month and Enterprise is unlimited.' },
  { key: 'faq.q2', group: 'FAQ', label: 'Question 2', default: 'What counts as a query?' },
  { key: 'faq.a2', group: 'FAQ', label: 'Answer 2', rich: true, default: 'Any message sent to CareStreamAI counts as one query, regardless of channel. This includes web chat messages, emails, and voice questions. Follow-up messages in the same session or thread each count as one query.' },
  { key: 'faq.q3', group: 'FAQ', label: 'Question 3', default: 'What happens if I reach a monthly limit?' },
  { key: 'faq.a3', group: 'FAQ', label: 'Answer 3', rich: true, default: 'You will receive a dashboard alert as you approach your monthly query or allocation limit. If you reach it, you can upgrade instantly from the dashboard, or wait until the pool resets at the start of the next billing period.' },
  { key: 'faq.q4', group: 'FAQ', label: 'Question 4', default: 'Can I upgrade or downgrade at any time?' },
  { key: 'faq.a4', group: 'FAQ', label: 'Answer 4', rich: true, default: 'Yes. Upgrades take effect immediately and unlock features instantly. Downgrades take effect at the start of your next billing period, and your existing data is always kept exactly as it is.' },
  { key: 'faq.q5', group: 'FAQ', label: 'Question 5', default: 'Is there a contract?' },
  { key: 'faq.a5', group: 'FAQ', label: 'Answer 5', rich: true, default: 'No. CareStreamAI is a rolling monthly subscription. Cancel any time with no penalty and no notice period.' },
  { key: 'faq.q6', group: 'FAQ', label: 'Question 6', default: 'What is Policy Gap Detection?' },
  { key: 'faq.a6', group: 'FAQ', label: 'Answer 6', rich: true, default: 'Available on Professional and Enterprise, it reads inside your uploaded policies and tells you which regulations you cover and where the gaps are. For each gap it shows exactly what to add, with example wording, the legal basis (legally required vs advised) and the source, and which policy to add it to. It also checks your wording against the CQC Single Assessment Framework and, where a policy reads too procedurally, suggests person-centred alternatives you can adopt. It only assesses the regulations that apply to your service, tracks changes to the standards and alerts you when one changes. There is a dedicated overview at /policy-gap-detection.' },
  { key: 'faq.q7', group: 'FAQ', label: 'Question 7', default: 'How do policy updates and approvals work?' },
  { key: 'faq.a7', group: 'FAQ', label: 'Answer 7', rich: true, default: 'When you adopt a gap fix, the change is applied to an editable copy of your policy as a tracked change, so your original upload is never touched. Nothing goes live until it is approved. An admin approves first, then, if you choose, it goes to your care manager for a second approval in their Policies hub, and optionally to an external person (for example a consultant or trustee) on a one-off link to approve or send feedback. You control the care manager and external steps with two toggles in your organisation details, so a smaller home can let an admin approve directly. Every approval is logged, and once the final approval is in, the new version is published to your staff Q&A automatically. Available on Professional and Enterprise.' },
  { key: 'faq.q8', group: 'FAQ', label: 'Question 8', default: 'Do you offer discounts for group operators?' },
  { key: 'faq.a8', group: 'FAQ', label: 'Answer 8', rich: true, default: 'Yes. Enterprise is built for multi-site providers and we offer volume pricing from three homes or more. Contact us for group pricing.' },
  { key: 'faq.q9', group: 'FAQ', label: 'Question 9', default: 'Is my data kept separate from other organisations?' },
  { key: 'faq.a9', group: 'FAQ', label: 'Answer 9', rich: true, default: 'Yes. Every customer has a completely isolated environment. Your policy documents, knowledge base, query history, and staff data are never shared with or accessible by any other organisation. Your documents are never used to train AI models.' },
]
