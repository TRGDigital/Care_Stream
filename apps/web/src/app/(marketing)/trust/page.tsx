import Link from 'next/link'
import { Check } from 'lucide-react'
import { PageHero, PageCta, SectionLabel } from '@/components/marketing/ui'
import { pageMetadata } from '@/lib/page-meta'

// Overridable from the platform console (Blog → Pages / site_pages).
export const generateMetadata = () => pageMetadata('/trust', {
  title:       'Trust & Security | CareStreamAI',
  description: 'CareStreamAI only ever answers from your uploaded documents. No internet searches, no hallucinations, no cross-contamination. Here is how we keep your compliance data safe.',
})

export default function TrustPage() {
  return (
    <>
      <PageHero
        label="Trust & Security"
        title="Powered by your policies. Nothing else."
        subtitle="Not the internet. Not another organisation's documents. Not guesswork. Here is exactly how CareStreamAI works, and why you can trust it with your compliance-critical information."
      />

      {/* How the AI works */}
      <section className="bg-white py-24">
        <div className="mx-auto max-w-content px-6">
          <SectionLabel>How the AI Works</SectionLabel>
          <h2 className="mb-14 text-4xl font-extrabold text-neutral-dark">Explained for every audience.</h2>
          <div className="grid gap-6 md:grid-cols-3">
            {[
              {
                audience: 'For everyone',
                icon: '👤',
                content: 'Think of CareStreamAI as a colleague who has read every policy in your library, and nothing else. When a member of your team asks a question, CareStreamAI searches your policy library, finds the most relevant sections, and uses them, and only them, to write the answer. It does not search the internet. It does not use general knowledge. It does not guess.',
              },
              {
                audience: 'For operations and quality leads',
                icon: '⚙️',
                content: 'CareStreamAI uses Retrieval Augmented Generation (RAG), the gold standard for AI systems that need to answer from a specific, trusted document set. Every query searches your private policy index first. The AI receives only the retrieved content as its input, and is explicitly instructed not to use anything outside it.',
              },
              {
                audience: 'For boards and legal leads',
                icon: '⚖️',
                content: "CareStreamAI's architecture eliminates the primary governance risk of AI in professional settings: confident but incorrect answers. Every response is bounded by your approved documents and logged in an append-only audit trail. The system cannot contradict your policies. It cannot extend beyond them.",
              },
            ].map(({ audience, icon, content }) => (
              <div key={audience} className="card-lift rounded-2xl border border-gray-100 bg-white p-7 shadow-card">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-neutral-light text-2xl">{icon}</div>
                <p className="mb-3 section-label text-teal">{audience}</p>
                <p className="leading-relaxed text-neutral-mid">{content}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Data commitments */}
      <section className="bg-neutral-light py-24">
        <div className="mx-auto max-w-content px-6">
          <SectionLabel>What We Promise</SectionLabel>
          <h2 className="mb-14 text-4xl font-extrabold text-neutral-dark">Your data, seven commitments.</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {[
              { commitment: 'Complete data isolation', detail: 'Your policy library, query history, training records and staff data are logically isolated, so no other subscriber can access them in any form.' },
              { commitment: 'Never used to train AI', detail: 'Your documents and data are never used to train AI models, by us or by the providers we use. This is set out in our Data Processing Agreement.' },
              { commitment: 'Encrypted at rest and in transit', detail: 'All data is encrypted at rest (AES-256) and in transit (TLS), using industry-standard encryption.' },
              { commitment: 'UK/EEA data storage', detail: 'Your documents, records and logs are stored in the UK/EEA. AI processing is carried out by vetted providers under agreements that forbid training on your data.' },
              { commitment: 'UK GDPR compliant', detail: 'CareStreamAI operates in full compliance with UK GDPR. A Data Processing Agreement is provided to all subscribers.' },
              { commitment: 'Append-only audit log', detail: 'Every query and every system action is recorded in an append-only, tamper-evident audit log.' },
              { commitment: 'Configurable data retention', detail: 'Query logs are retained in line with your configured retention policy, then securely deleted.' },
            ].map(({ commitment, detail }) => (
              <div key={commitment} className="card-lift flex gap-4 rounded-2xl bg-white p-6 shadow-card">
                <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-green-100">
                  <Check size={15} className="text-green-600" />
                </div>
                <div>
                  <p className="mb-1 font-bold text-neutral-dark">{commitment}</p>
                  <p className="text-sm leading-relaxed text-neutral-mid">{detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-white py-24">
        <div className="mx-auto max-w-2xl px-6">
          <SectionLabel>Common Questions</SectionLabel>
          <h2 className="mb-12 text-3xl font-extrabold text-neutral-dark">Security questions, answered.</h2>
          <div className="space-y-4">
            {[
              { q: 'Will the AI make things up?', a: 'No. CareStreamAI is explicitly designed to prevent this. If no relevant policy is found, it says so, it does not generate content from general knowledge.' },
              { q: 'Can other organisations see our policies?', a: 'No. Your policy library is completely isolated. No other subscriber can access it in any form.' },
              { q: 'Is our data used to train AI models?', a: 'No. Your data is never used to train AI models, by us or by the AI providers we use, and this is set out in our Data Processing Agreement.' },
              { q: 'Where is our data stored and processed?', a: 'Your documents, records and logs are stored in the UK/EEA. AI processing is carried out by vetted providers under data processing agreements that prohibit using your data to train their models. We are happy to share the detail in our DPA.' },
              { q: 'What if our policy has an error in it?', a: "CareStreamAI will accurately reflect what your policy says. This surfaces the need to keep policies accurate, which is the right incentive in a compliance setting." },
              { q: 'What happens when we update a policy?', a: 'The old version is immediately retired from the retrieval system. All subsequent queries return answers based on the new version. The old version is retained in your audit archive.' },
            ].map(({ q, a }) => (
              <div key={q} className="card-lift rounded-2xl border border-gray-100 bg-white p-6 shadow-card">
                <p className="mb-2 font-bold text-neutral-dark">{q}</p>
                <p className="leading-relaxed text-neutral-mid">{a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <PageCta
        heading="Have more questions about security or data?"
        primary={{ href: '/contact', label: 'Talk to Our Team' }}
        secondary={{ href: '/demo', label: 'Book a Demo' }}
      />
    </>
  )
}
