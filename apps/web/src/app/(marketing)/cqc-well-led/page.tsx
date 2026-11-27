import type { Metadata } from 'next'
import Link from 'next/link'
import { Check, ExternalLink } from 'lucide-react'
import { JsonLd } from '@/components/json-ld'
import { PageBreadcrumbJsonLd } from '@/components/page-breadcrumb-json-ld'
import { SectionLabel } from '@/components/marketing/ui'
import { faqPageSchema, SITE_URL } from '@/lib/schema'
import { CQC_WELL_LED_URL, STATEMENTS, PRODUCTS } from '@/lib/well-led'

// The Well-led hub. Wording rule: evidence FOR Well-led. Never "CQC compliant", never a promise about a rating. No dashes in the copy (site rule).

const TITLE = 'CQC Well-led: What Inspectors Look For | CareStreamAI'
const DESC  = 'CQC Well-led explained: the quality statements, what inspectors look for, and the evidence a care provider can show. See how CareStream helps.'

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESC,
  alternates: { canonical: `${SITE_URL}/cqc-well-led` },
  openGraph: { type: 'website', title: TITLE, description: DESC, url: `${SITE_URL}/cqc-well-led`, images: ['/og-image.png'] },
}

type Help = { id: string; text: string }
type Section = { topic: string; looksFor: string[]; evidence: string[]; helps: Help[]; limit: string }

const SECTIONS: Section[] = [
  {
    topic: 'gov',
    looksFor: [
      'Clear and effective governance, management and accountability, with staff who understand their roles.',
      'Systems that manage performance and risk in a proportionate way.',
      'Secure, reliable records and data that leaders use to improve the quality of care.',
      'Legal and regulatory requirements understood and acted on, including external recommendations such as safety alerts.',
    ],
    evidence: [
      'A policy library where every policy has a named owner and a review date.',
      'A record of who has opened each policy and who has been trained on it.',
      'A training matrix by role showing what is complete and what is due.',
      'A record of regulation changes and what you did about them.',
      'Audit results, and who was responsible for each action.',
    ],
    helps: [
      { id: 'roles',       text: 'Policies show the real name of your safeguarding lead, registered manager and other role holders, and follow the change when you change who holds a role.' },
      { id: 'coverage',    text: 'Your policies are checked against the regulations they should cover.' },
      { id: 'gap',         text: 'Gaps are listed with suggested wording that you review and approve.' },
      { id: 'consistency', text: 'Policies that say different things are found before an inspector finds them.' },
      { id: 'alerts',      text: 'CareStream watches the official sources behind the regulations your policies rely on, and flags changes for review.' },
      { id: 'approval',    text: 'Approval steps are recorded, so you can show who approved what, and when.' },
      { id: 'matrix',      text: 'See who is trained on what, by role.' },
      { id: 'report',      text: 'Produce an inspection evidence report you can download and take in.' },
    ],
    limit: 'CareStream does not run your governance. It gives you the records to show how it runs.',
  },
  {
    topic: 'learn',
    looksFor: [
      'Staff and leaders who know how to make improvement happen, and who measure the outcome.',
      'Learning when things go wrong, and from examples of good practice.',
      'Staff supported to develop their skills, and encouraged to speak up with ideas.',
      'Good external relationships that support improvement.',
    ],
    evidence: [
      'Audit results over time, not just the latest one.',
      'Actions with an owner, a date and a re-check.',
      'Follow up after a training question was answered wrongly.',
      'The knowledge gaps you found, and how they closed.',
    ],
    helps: [
      { id: 'audits',    text: 'Over 100 audits are free on every plan. Actions can carry photos and are re-checked at the next audit, and a weak result can lead to training.' },
      { id: 'training',  text: 'Short training is built from your own policies. A wrong answer becomes a short follow up lesson and a fresh question.' },
      { id: 'analytics', text: 'See the most missed questions, the weakest topics, and how gaps are closing.' },
      { id: 'knowledge', text: 'Staff ask questions that are answered from your own documents, and managers can see what staff are asking, which shows where a policy is unclear.' },
      { id: 'cpd',       text: 'CPD certified courses are free on every plan.' },
    ],
    limit: 'CareStream shows the trail. It does not decide what to improve, and a staff idea enters the trail when a manager adds it as an action.',
  },
  {
    topic: 'edi',
    looksFor: [
      'Leaders who review and improve culture in the context of equality, diversity and inclusion.',
      'Action where some staff have a worse experience than others.',
      'Reasonable adjustments so disabled staff can do their jobs well.',
      'Ways to hear the voices of staff who are least heard, so they feel their concerns lead to change.',
    ],
    evidence: [
      'What staff told you, and what you changed.',
      'Training that staff understood, whatever their first language.',
      'Adjustments you have made, and a record of them.',
    ],
    helps: [
      { id: 'language',  text: 'Staff can take training in their own language on paid plans. CareStream shows where answers suggest language may be getting in the way, so a manager can act.' },
      { id: 'training',  text: 'Staff can suggest a better translation, and an administrator approves it.' },
      { id: 'knowledge', text: 'Every member of staff can ask questions in the Staff Hub and get answers from your own policies.' },
      { id: 'cpd',       text: 'Free CPD certified courses for every member of staff, with certificates they keep.' },
      { id: 'matrix',    text: 'See who has finished what, so nobody is missed.' },
    ],
    limit: 'Translation is machine translation, accuracy is not tested for each language, and the Staff Hub menus stay in English. These are signals for a manager, not proof that someone understood. CQC\'s reasonable adjustments wording is about disabled staff. Language support helps you act on hearing every voice.',
  },
  {
    topic: 'cult',
    looksFor: [
      'A shared vision, values and direction that staff understand and share.',
      'A positive culture of learning and improvement.',
      'Leaders who involve staff and listen to them.',
    ],
    evidence: [
      'Staff who can say what the service is aiming for.',
      'Policies and values that are used day to day, not filed.',
      'Induction and training that reflect them.',
    ],
    helps: [
      { id: 'knowledge', text: 'Your own policies are in every member of staff\'s hand, and they can ask questions about them at any hour.' },
      { id: 'roles',     text: 'The named person for each role is shown in the policy, so staff know who to go to.' },
      { id: 'approval',  text: 'Policies are adopted in your own words and approved by the people you choose.' },
      { id: 'training',  text: 'New starters get short training built from your own policies.' },
      { id: 'cpd',       text: 'Free CPD certified training builds the same standard across the team.' },
    ],
    limit: 'CareStream has no vision or values feature of its own. It puts your own policies and training in front of staff.',
  },
]

const FAQS = [
  { q: 'What is Well-led in a CQC inspection?', a: 'Well-led is one of CQC\'s five key questions, alongside safe, effective, caring and responsive. It looks at leadership, culture and how a service learns and improves. CQC describes it as an inclusive and positive culture of continuous learning and improvement, shared by leaders and staff.' },
  { q: 'What are the Well-led quality statements?', a: 'Under CQC\'s single assessment framework, Well-led is assessed through quality statements. This guide covers four where CareStream helps most: Shared direction and culture, Workforce equality, diversity and inclusion, Governance, management and sustainability, and Learning, improvement and innovation. CQC publishes the full set on its website.' },
  { q: 'What evidence do inspectors look for?', a: 'Inspectors look for evidence that leaders know what is happening in the service and act on it: records, dates, named people and outcomes. Policies with owners, training records, audit results and the actions that followed are typical examples.' },
  { q: 'Can software give us a CQC rating?', a: 'No. Only CQC rates a service, and the judgement is always the inspector\'s. CareStream helps you keep and show the evidence. It does not predict or promise a rating.' },
  { q: 'How do we show learning from audits?', a: 'Keep the audit result, the action, who owned it, the follow up and the re-check, so you can show what changed and whether it worked. A trail over several months is stronger than a single audit.' },
  { q: 'What happened to the key lines of enquiry (KLOEs)?', a: 'The older key lines of enquiry have been replaced by quality statements under CQC\'s single assessment framework. If you worked to KLOEs before, the Well-led evidence you already keep is still useful. It is now organised under the quality statements.' },
]

const RELATED = [
  { href: '/scenarios/cqc-inspection-evidence-report-what-it-contains', label: 'What the CQC inspection evidence report contains' },
  { href: '/scenarios/audit-finding-to-action-to-recheck', label: 'From audit finding to action to re-check' },
  { href: '/scenarios/policy-wording-does-not-match-cqc-language', label: 'When policy wording does not match CQC language' },
  { href: '/scenarios/staff-whose-first-language-is-not-english', label: 'Staff whose first language is not English' },
]

export default function CqcWellLedPage() {
  return (
    <>
      <PageBreadcrumbJsonLd trail={[{ name: 'CQC Well-led', path: '/cqc-well-led' }]} />
      <JsonLd data={faqPageSchema(FAQS.map(f => ({ question: f.q, answer: f.a })))} />

      {/* Header */}
      <section className="bg-gradient-to-b from-white to-teal-light">
        <div className="mx-auto max-w-content px-6 pb-14 pt-16 md:pt-20">
          <SectionLabel>CQC Well-led</SectionLabel>
          <h1 className="max-w-3xl text-4xl font-extrabold leading-tight text-neutral-dark md:text-5xl">
            CQC Well-led: what inspectors look for and the evidence you need
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-neutral-mid">
            Well-led is the CQC key question about leadership, culture and how a service learns and improves. CQC describes it as an inclusive and positive culture of
            continuous learning and improvement, shared by leaders and staff. This guide sets out what that asks of a provider, and how CareStream helps you show the evidence.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-4">
            <Link href="/demo" className="rounded-full bg-neutral-dark px-6 py-3 text-sm font-semibold text-white hover:opacity-90">Book a demo</Link>
            <a href={CQC_WELL_LED_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm font-semibold text-teal hover:text-teal-dark">
              Read CQC&apos;s Well-led guidance <ExternalLink size={14} />
            </a>
          </div>
          <nav aria-label="On this page" className="mt-8 flex flex-wrap gap-2">
            {STATEMENTS.map(st => (
              <a key={st.anchor} href={`#${st.anchor}`} className="rounded-full border border-gray-200 bg-white px-4 py-1.5 text-sm font-medium text-neutral-dark hover:border-teal hover:text-teal-dark">{st.short}</a>
            ))}
            <a href="#faq" className="rounded-full border border-gray-200 bg-white px-4 py-1.5 text-sm font-medium text-neutral-dark hover:border-teal hover:text-teal-dark">Questions</a>
          </nav>
        </div>
      </section>

      {/* What it means */}
      <section className="bg-white py-16">
        <div className="mx-auto max-w-3xl px-6">
          <h2 className="mb-4 text-3xl font-extrabold text-neutral-dark">What CQC means by Well-led</h2>
          <p className="mb-4 leading-relaxed text-neutral-mid">
            Safe, effective, caring and responsive are mostly judged on the care people receive. Well-led is judged on how the service is run: whether leaders know what is happening,
            whether staff understand their roles, and whether the service learns and improves. It is where a provider&apos;s own systems are tested.
          </p>
          <p className="leading-relaxed text-neutral-mid">
            Inspectors look for evidence, not intentions. Under CQC&apos;s single assessment framework, Well-led is assessed through quality statements. Below are four where CareStream helps most,
            each with what inspectors look for, the evidence you can show, and the CareStream products that build it.
          </p>
        </div>
      </section>

      {/* One section per statement */}
      {STATEMENTS.map((st, i) => {
        const sec = SECTIONS.find(s => s.topic === st.topic)!
        return (
          <section key={st.anchor} id={st.anchor} className={`scroll-mt-24 py-16 ${i % 2 === 0 ? 'bg-neutral-light' : 'bg-white'}`}>
            <div className="mx-auto max-w-content px-6">
              <SectionLabel>Quality statement</SectionLabel>
              <h2 className="mb-2 max-w-3xl text-3xl font-extrabold leading-tight text-neutral-dark md:text-4xl">{st.cqcName}</h2>
              <a href={st.cqcUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm font-semibold text-teal hover:text-teal-dark">
                Read CQC&apos;s wording <ExternalLink size={13} />
              </a>

              <div className="mt-8 grid gap-5 md:grid-cols-3">
                <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-card">
                  <h3 className="mb-3 text-xs font-bold uppercase tracking-widest text-teal-dark">What inspectors look for</h3>
                  <ul className="space-y-2.5 text-sm leading-relaxed text-neutral-dark">
                    {sec.looksFor.map(t => <li key={t} className="flex gap-2.5"><span className="mt-2 h-1.5 w-1.5 flex-none rounded-full bg-teal" />{t}</li>)}
                  </ul>
                </div>
                <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-card">
                  <h3 className="mb-3 text-xs font-bold uppercase tracking-widest text-teal-dark">The evidence you can show</h3>
                  <ul className="space-y-2.5 text-sm leading-relaxed text-neutral-dark">
                    {sec.evidence.map(t => <li key={t} className="flex gap-2.5"><Check size={15} className="mt-0.5 flex-none text-teal" />{t}</li>)}
                  </ul>
                </div>
                <div className="rounded-2xl border border-teal/30 bg-teal-light p-6">
                  <h3 className="mb-3 text-xs font-bold uppercase tracking-widest text-teal-dark">How CareStream helps</h3>
                  <ul className="space-y-3 text-sm leading-relaxed text-neutral-dark">
                    {sec.helps.map(h => (
                      <li key={h.id + h.text.slice(0, 12)}>
                        <Link href={PRODUCTS[h.id].href} className="font-bold text-teal-dark hover:underline">{PRODUCTS[h.id].name}</Link>
                        <span className="block text-neutral-mid">{h.text}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              <p className="mt-5 max-w-3xl rounded-xl border border-dashed border-amber-brand/60 bg-amber-50 px-4 py-3 text-sm leading-relaxed text-neutral-dark">
                <b>What CareStream does not do here.</b> {sec.limit}
              </p>
            </div>
          </section>
        )
      })}

      {/* Plain statement of what this is */}
      <section className="bg-white py-14">
        <div className="mx-auto max-w-3xl px-6">
          <h2 className="mb-3 text-2xl font-extrabold text-neutral-dark">Evidence, not a rating</h2>
          <p className="leading-relaxed text-neutral-mid">
            CareStream helps you keep and show the evidence inspectors ask for. It does not give a CQC rating, it is not endorsed by CQC, and the judgement is always the inspector&apos;s.
            Some products, such as the policy approval trail, the inspection evidence report and training in other languages, are on paid plans. See <Link href="/pricing" className="font-semibold text-teal underline underline-offset-2">pricing</Link> for what each plan includes.
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="scroll-mt-24 bg-neutral-light py-16">
        <div className="mx-auto max-w-3xl px-6">
          <SectionLabel>Questions</SectionLabel>
          <h2 className="mb-8 text-3xl font-extrabold text-neutral-dark">CQC Well-led questions</h2>
          <div className="space-y-3">
            {FAQS.map(f => (
              <details key={f.q} className="group rounded-2xl border border-gray-100 bg-white px-5 py-4 shadow-card">
                <summary className="cursor-pointer list-none font-bold text-neutral-dark">{f.q}</summary>
                <p className="mt-3 text-sm leading-relaxed text-neutral-mid">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Related + close */}
      <section className="bg-white py-16">
        <div className="mx-auto max-w-content px-6">
          <h2 className="mb-5 text-2xl font-extrabold text-neutral-dark">See it in practice</h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {RELATED.map(r => (
              <li key={r.href}><Link href={r.href} className="block rounded-2xl border border-gray-100 bg-white p-4 text-sm font-semibold text-neutral-dark shadow-card hover:border-teal/40">{r.label} <span className="text-teal">→</span></Link></li>
            ))}
          </ul>
          <div className="mt-10 rounded-3xl bg-teal-light p-8 text-center">
            <h2 className="text-2xl font-extrabold text-neutral-dark">Start building your Well-led evidence</h2>
            <p className="mx-auto mt-2 max-w-xl text-neutral-mid">Upload your policies once and see what CareStream finds. Free to start, and no card needed for a free account.</p>
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              <Link href="/register?tier=free&source=well-led-hub" className="rounded-full bg-teal px-6 py-3 text-sm font-semibold text-white hover:bg-teal-dark">Create a free account</Link>
              <Link href="/demo" className="rounded-full border border-gray-300 bg-white px-6 py-3 text-sm font-semibold text-neutral-dark hover:bg-neutral-light">Book a demo</Link>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
