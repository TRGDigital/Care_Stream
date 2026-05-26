import Link from 'next/link'
import { FaqAccordion } from './faq-accordion'
import { PageHero, PageCta } from '@/components/marketing/ui'

export const metadata = {
  title: 'FAQ',
  description: 'Everything you need to know about CareStreamAI — how the AI works, what it can and cannot do, data security, pricing, and getting started. Answered plainly.',
  openGraph: {
    title: 'CareStreamAI FAQ',
    description: 'Answers to the most common questions about CareStreamAI — plain and direct.',
    url: 'https://carestreamai.co.uk/faq',
  },
}

const FAQ_GROUPS = [
  {
    title: 'General',
    items: [
      { q: 'What is CareStreamAI?', a: 'CareStreamAI is a policy assistant built specifically for UK care settings. You upload your policies and staff handbook; your team can then ask questions and get instant, accurate answers, in any of 50+ languages. Every interaction is logged for compliance and audit purposes.' },
      { q: 'Who is it for?', a: 'CareStreamAI is designed for care homes, domiciliary care providers, supported living services, and any regulated health and social care setting. It is used by care workers, senior carers, registered managers, HR leads, and operations directors.' },
      { q: 'Does it work for domiciliary care as well as residential care?', a: 'Yes. CareStreamAI is document-agnostic, it works with any policy library. Whether you are a residential home, a domiciliary provider, or a supported living service, it will work with your documents.' },
      { q: 'What languages does it support?', a: 'CareStreamAI supports 50+ languages automatically. Staff type or email their question in any language, Polish, Romanian, Tagalog, Yoruba, Arabic, Hindi, and many more, and receive an answer in the same language. There is no language selection menu and no extra charge per language.' },
      { q: 'Is CareStreamAI affiliated with or endorsed by CQC?', a: 'No. CareStreamAI is an independent software product. It is not affiliated with, endorsed by, or certified by the Care Quality Commission. References to CQC are factual descriptions of how the product supports compliance evidence-building.' },
    ],
  },
  {
    title: 'AI & Trust',
    items: [
      { q: 'Will the AI make things up?', a: 'No. CareStreamAI is designed specifically to prevent this. It only ever answers from your uploaded documents. If no relevant policy content is found, it says so, it does not generate content from general knowledge, training data, or the internet.' },
      { q: 'How does it know the answer?', a: "When a question is submitted, CareStreamAI searches your policy library for the most relevant sections. It retrieves those sections and uses them, and only them, as the basis for its answer. This method is called Retrieval Augmented Generation (RAG) and is the gold standard for AI systems that need to answer from a trusted document set." },
      { q: 'What if our policy has an error in it?', a: 'CareStreamAI will accurately reflect what your policy says. This is intentional, the system surfaces the need to keep policies accurate, which is the right incentive in a compliance setting.' },
      { q: 'Can it answer questions about regulations not in our policies?', a: 'CareStreamAI also includes a curated knowledge base of UK regulatory frameworks, GDPR, RIDDOR, the Care Act, CQC Fundamental Standards, and more. Answers are always grounded in this knowledge base, not general AI output.' },
      { q: 'What happens when we update a policy?', a: 'Upload the new version in your admin panel. CareStreamAI immediately retires the old version from the retrieval system and activates the new one. All subsequent queries return answers based on the new version. The old version is retained in your audit archive.' },
    ],
  },
  {
    title: 'Data & Security',
    items: [
      { q: 'Can other organisations see our policies?', a: 'No. Your policy library is completely isolated. Each subscriber has a private environment. No other subscriber can access your data in any form, at any time.' },
      { q: 'Is our data used to train AI models?', a: 'No. Your documents and query data are never used to improve AI models. This is a contractual commitment.' },
      { q: 'Where is our data stored?', a: 'All data is stored within UK/EEA regions. No data is transferred outside these regions.' },
      { q: 'Is it encrypted?', a: 'Yes. All data is encrypted using AES-256 at rest and TLS 1.3 in transit.' },
      { q: 'Do you provide a Data Processing Agreement?', a: 'Yes. A Data Processing Agreement is provided to all subscribers. CareStreamAI operates in full compliance with UK GDPR.' },
      { q: 'How long are query logs retained?', a: 'Query logs are retained for 12 months by default, then automatically deleted. The retention period is configurable.' },
    ],
  },
  {
    title: 'Languages',
    items: [
      { q: 'Does staff need to select their language?', a: 'No. CareStreamAI detects the language of the query automatically. Staff simply type or email their question in their language and receive an answer in the same language.' },
      { q: 'What languages are supported?', a: 'Over 50 languages, including Polish, Romanian, Bulgarian, Hungarian, Tagalog, Hindi, Urdu, Arabic, Yoruba, Igbo, Somali, Portuguese, Spanish, French, and many more.' },
      { q: 'Are answers translated word-for-word?', a: "No, CareStreamAI generates a natural-language response in the staff member's language. It does not machine-translate a pre-written English answer." },
      { q: 'What if the original policy is in English and the query is in Romanian?', a: 'CareStreamAI retrieves the relevant English policy content, understands it, and produces a fluent Romanian response. Staff receive an answer in their language even when the source document is in English.' },
    ],
  },
  {
    title: 'Pricing & Plans',
    items: [
      { q: 'What plans are available?', a: 'CareStreamAI is available on two plans: Starter (£49/month) and Professional (£129/month). Both include full policy library, 50+ language support, email and chat channels, and full audit logging. Professional adds CQC Readiness Reports, policy gap detection, language analytics, and individual staff engagement data.' },
      { q: 'Is there a free trial?', a: 'Yes. A 14-day free trial is available on either plan. No credit card is required.' },
      { q: 'Can I switch plans?', a: 'Yes. You can upgrade or downgrade at any time. Changes take effect at the next billing cycle.' },
      { q: 'Do you offer discounts for multiple homes?', a: 'Yes. Group pricing is available for organisations operating multiple homes. Contact us for a quote.' },
      { q: 'Is there a per-user charge?', a: 'No. CareStreamAI is priced per-home, not per-user. Your entire team can use it without per-seat fees.' },
    ],
  },
  {
    title: 'Getting Started',
    items: [
      { q: 'How long does it take to get started?', a: 'Most customers are live within one hour. Upload your policies, configure your settings, and share the link with your team. There is no installation and no IT setup required.' },
      { q: 'Do we need IT support to set it up?', a: 'No. CareStreamAI is a browser-based web application. There is no software to install, no integration required, and no technical skills needed to get started.' },
      { q: 'What formats do you accept for policy uploads?', a: 'PDF, Microsoft Word (.docx), and plain text (.txt). Most policy libraries are in one of these formats.' },
      { q: 'Do we need to prepare our policies before uploading?', a: 'No. CareStreamAI automatically strips headers, footers, version numbers, and page numbers so the AI only processes the substantive content.' },
      { q: 'What happens after the free trial?', a: 'At the end of your 14-day trial, you choose a plan and enter your payment details. If you choose not to continue, your account is closed and your data is deleted.' },
    ],
  },
]

export default function FaqPage() {
  return (
    <>
      <PageHero
        label="FAQ"
        title="Everything you want to know."
        subtitle="If the answer isn't here, contact us and we'll respond within one business day."
      />

      <section className="bg-white py-24">
        <div className="mx-auto max-w-3xl px-6">
          <FaqAccordion groups={FAQ_GROUPS} />
        </div>
      </section>

      <PageCta
        heading="Still have a question?"
        sub="We respond to all enquiries within one business day."
        primary={{ href: '/contact', label: 'Contact Us' }}
        secondary={{ href: '/demo', label: 'Book a Demo' }}
      />
    </>
  )
}
