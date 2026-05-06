import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { PageHero, PageCta, SectionLabel } from '@/components/marketing/ui'
import { Mockup } from '@/components/marketing/mockup'
import { MOCKUPS } from '@/components/marketing/mockup-data'

export const metadata = { title: 'How It Works — CareStreamAI' }

export default function HowItWorksPage() {
  return (
    <>
      <PageHero
        label="How It Works"
        title="Policies your whole team can actually use."
        subtitle="CareStreamAI connects your approved documents to the people who need them — in any language, at any hour, with a full audit trail for every interaction."
      />

      {/* Three interaction patterns */}
      <section className="bg-white py-24">
        <div className="mx-auto max-w-content px-6">
          <SectionLabel>Three Ways to Ask</SectionLabel>
          <h2 className="mb-14 max-w-2xl text-4xl font-extrabold leading-tight text-neutral-dark">
            Three ways staff can ask. One consistent answer.
          </h2>
          <div className="grid gap-6 md:grid-cols-3">
            {[
              {
                num: '01',
                title: 'Ask in English, get an English answer',
                query: '"Can you send me the falls policy?"',
                result: 'Instant summary of your falls policy with key points, what to do, and who to report to.',
                icon: '🇬🇧',
              },
              {
                num: '02',
                title: 'Ask in English, request another language',
                query: '"Can you send me the falls policy in Hindi?"',
                result: 'The same accurate summary, delivered in Hindi — drawn from the same English source policy.',
                icon: '🌐',
              },
              {
                num: '03',
                title: 'Ask in any language',
                query: '"maaari mo bang ipadala sa akin ang patakaran sa pagbagsak?"',
                result: 'CareStreamAI detects Tagalog, retrieves your falls policy, and responds in Tagalog. No setup required.',
                icon: '🇵🇭',
              },
            ].map(({ num, title, query, result, icon }) => (
              <div key={num} className="card-lift rounded-2xl border border-gray-100 bg-white p-7 shadow-card">
                <div className="mb-5 flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-light text-sm font-extrabold text-teal">{num}</span>
                  <span className="text-2xl">{icon}</span>
                </div>
                <h3 className="mb-4 font-bold text-neutral-dark">{title}</h3>
                <div className="mb-5 rounded-xl bg-neutral-dark px-4 py-3 text-right">
                  <p className="text-sm italic text-white/80">&ldquo;{query}&rdquo;</p>
                </div>
                <p className="text-sm leading-relaxed text-neutral-mid">{result}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Four-step process */}
      <section className="bg-neutral-light py-24">
        <div className="mx-auto max-w-content px-6">
          <SectionLabel>The Process</SectionLabel>
          <h2 className="mb-16 text-4xl font-extrabold text-neutral-dark">The four-step process</h2>
          <div className="grid gap-12 lg:grid-cols-2">
            {[
              {
                num: '01',
                title: 'Upload',
                body: 'Your admin uploads policies and your staff handbook via the dashboard. Any format — PDF, Word, plain text. CareStreamAI processes each document: stripping headers, footers, and version metadata, then building a private, encrypted index of your content.',
                mockup: 'mockup-06' as keyof typeof MOCKUPS,
              },
              {
                num: '02',
                title: 'Ask',
                body: 'Staff send a question via email or the web chat. In English, in Polish, in Tagalog — any of 50+ languages. The language is detected automatically. No selection menus. No configuration.',
                mockup: 'mockup-01' as keyof typeof MOCKUPS,
              },
              {
                num: '03',
                title: 'Retrieve & respond',
                body: 'CareStreamAI searches your private policy index for the most relevant content. It passes that content to the AI, which uses it — and only it — to generate a clear, structured response in under 30 seconds, in the language the question was asked, with a citation to the source policy.',
                mockup: 'mockup-02' as keyof typeof MOCKUPS,
              },
              {
                num: '04',
                title: 'Log & report',
                body: 'Every query is logged: who asked, what they asked, which policy was cited, what response was given, in which language, at what time. Your CQC Readiness Report is built from this log automatically.',
                mockup: 'mockup-05' as keyof typeof MOCKUPS,
              },
            ].map(({ num, title, body, mockup }) => (
              <div key={num} className="card-lift rounded-2xl bg-white p-8 shadow-card">
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-teal text-sm font-extrabold text-white shadow-teal-glow">
                  {num}
                </div>
                <h3 className="mb-3 text-xl font-bold text-neutral-dark">{title}</h3>
                <p className="mb-6 leading-relaxed text-neutral-mid">{body}</p>
                <Mockup {...MOCKUPS[mockup]} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AI explanation + channels */}
      <section className="bg-white py-24">
        <div className="mx-auto max-w-content px-6">
          <div className="grid gap-10 lg:grid-cols-2">
            <div>
              <SectionLabel>How the AI Works</SectionLabel>
              <h2 className="mb-6 text-4xl font-extrabold leading-tight text-neutral-dark">
                What it does — and doesn&apos;t do.
              </h2>
              <div className="mb-6 rounded-2xl border-l-4 border-teal bg-teal-light px-7 py-6">
                <p className="italic leading-relaxed text-neutral-dark">
                  &ldquo;Think of CareStreamAI as a colleague who has read every policy in your library — and nothing else.
                  When a staff member asks a question, CareStreamAI searches your policy library for the most relevant content.
                  It uses that content — and only that content — to write the answer. It does not search the internet.
                  It does not use general knowledge. It does not guess.&rdquo;
                </p>
              </div>
              <Link href="/trust" className="inline-flex items-center gap-2 font-semibold text-teal hover:text-teal-dark">
                Full details on AI architecture and data security <ArrowRight size={16} />
              </Link>
            </div>

            <div>
              <SectionLabel>Access Channels</SectionLabel>
              <h2 className="mb-6 text-2xl font-bold text-neutral-dark">Email vs chat — which to use?</h2>
              <div className="space-y-4">
                {[
                  {
                    icon: '💬',
                    channel: 'Web chat',
                    detail: 'Available in the CareStreamAI portal on desktop and mobile. Conversational — staff can ask follow-up questions and the system maintains context throughout the session.',
                  },
                  {
                    icon: '📧',
                    channel: 'Email',
                    detail: 'Staff email your dedicated policy address. The system replies within 30 seconds. Staff can reply to continue — the system tracks the full thread and maintains context.',
                  },
                  {
                    icon: '✓',
                    channel: 'Both channels',
                    detail: 'Full conversation history maintained. All queries logged. Same quality of response regardless of channel. No extra cost per channel.',
                  },
                ].map(({ icon, channel, detail }) => (
                  <div key={channel} className="card-lift flex gap-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-card">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-teal-light text-xl">{icon}</div>
                    <div>
                      <p className="mb-1 font-semibold text-neutral-dark">{channel}</p>
                      <p className="text-sm leading-relaxed text-neutral-mid">{detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <PageCta
        heading="See it working with your own policies."
        sub="Book a 30-minute demo and we'll show you CareStreamAI responding to real queries from your documents."
        primary={{ href: '/demo', label: 'Book a Free Demo' }}
        secondary={{ href: '/register', label: 'Start Free Trial' }}
      />
    </>
  )
}
