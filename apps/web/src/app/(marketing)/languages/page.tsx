import Link from 'next/link'
import { Globe, MessageSquare, FileText, CheckCircle2, ArrowRight } from 'lucide-react'
import { PageHero, SectionLabel } from '@/components/marketing/ui'
import { pageMetadata } from '@/lib/page-meta'
import { COURSE_LANGUAGES } from '@/lib/languages'

export const revalidate = 3600

const COUNT = COURSE_LANGUAGES.length

export async function generateMetadata() {
  return pageMetadata('/languages', {
    title: `Care Training in ${COUNT} Languages | CareStreamAI`,
    description: `CareStream delivers staff training, policies and CQC tools in over 60 languages — including Polish, Romanian, Portuguese, Tagalog, Urdu and more — so your whole care team can learn in the language they are most confident in, while your records stay in English.`,
  })
}

export default function LanguagesPage() {
  return (
    <>
      <PageHero
        label="Multilingual"
        title={<>Training your whole team understands, in over 60 languages.</>}
        subtitle="Care teams are diverse. CareStream delivers every module, policy answer and CQC tool in the language each staff member is most confident in, so nothing is lost in translation, while your records stay in English."
        centered
      />

      {/* How it works */}
      <section className="bg-white py-24">
        <div className="mx-auto max-w-content px-6">
          <div className="mx-auto mb-14 max-w-2xl text-center">
            <SectionLabel>How multilingual works</SectionLabel>
            <h2 className="text-3xl font-extrabold leading-tight text-neutral-dark md:text-4xl">
              One platform, every language, no setup.
            </h2>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {[
              {
                Icon: MessageSquare,
                title: 'Staff choose their language',
                body: 'Each staff member reads and answers in the language they know best — no admin, no separate accounts, no per-language versions to maintain.',
              },
              {
                Icon: Globe,
                title: 'Teach-then-check in that language',
                body: 'Lessons, real care scenarios and the assessment are delivered in their language. A wrong answer triggers a short follow-up lesson so the gap is always closed.',
              },
              {
                Icon: FileText,
                title: 'Records stay in English',
                body: 'Completions, certificates and your audit trail stay in English — ready as evidence for CQC — while your team learns in their own language.',
              },
            ].map(({ Icon, title, body }) => (
              <div key={title} className="rounded-2xl border border-gray-100 bg-neutral-light p-7 shadow-card">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-teal-light">
                  <Icon size={20} className="text-teal" />
                </div>
                <h3 className="mb-2 text-lg font-bold text-neutral-dark">{title}</h3>
                <p className="leading-relaxed text-neutral-mid">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* The full list */}
      <section className="bg-neutral-light py-24">
        <div className="mx-auto max-w-content px-6">
          <div className="mb-10 max-w-2xl">
            <SectionLabel>The languages</SectionLabel>
            <h2 className="mb-4 text-3xl font-extrabold leading-tight text-neutral-dark md:text-4xl">
              {COUNT} languages your care team can learn in.
            </h2>
            <p className="text-lg leading-relaxed text-neutral-mid">
              These are the languages CareStream delivers training and policy access in today. Your team
              speaks one that is not listed? It is almost certainly supported too — just ask.
            </p>
          </div>
          <ul className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3 lg:grid-cols-4">
            {COURSE_LANGUAGES.map((l) => (
              <li key={l.code} className="flex items-center gap-2.5 text-neutral-dark">
                <CheckCircle2 size={16} className="flex-shrink-0 text-teal" />
                <span>{l.name}</span>
              </li>
            ))}
          </ul>
          <p className="mt-10 text-neutral-mid">
            Speak a language not shown here?{' '}
            <Link href="/contact" className="font-semibold text-teal hover:text-teal-dark">Contact us</Link>{' '}
            and we will confirm it — the list keeps growing.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-white py-20">
        <div className="mx-auto max-w-content px-6">
          <div className="flex flex-col items-center justify-between gap-6 rounded-2xl bg-hero-gradient p-10 text-center md:flex-row md:text-left">
            <div>
              <h2 className="mb-2 text-2xl font-extrabold text-white md:text-3xl">
                Give your whole team training they can understand.
              </h2>
              <p className="max-w-xl text-white/80">
                Browse the CareStream training library, or see a live module in action first.
              </p>
            </div>
            <div className="flex flex-shrink-0 flex-col gap-3 sm:flex-row">
              <Link href="/staff-training" className="inline-flex items-center justify-center gap-2 rounded-btn bg-white px-7 py-4 text-sm font-semibold text-neutral-dark transition-colors hover:bg-neutral-light">
                Browse training <ArrowRight size={16} />
              </Link>
              <Link href="/demo" className="btn-ghost-white rounded-btn border-2 border-white/30 px-7 py-4 text-center text-sm font-semibold text-white">
                Book a demo
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
