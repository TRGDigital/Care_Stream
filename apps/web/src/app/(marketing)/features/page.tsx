import Link from 'next/link'
import { Check } from 'lucide-react'
import { PageHero, PageCta, SectionLabel } from '@/components/marketing/ui'

export const metadata = { title: 'Features — CareStreamAI' }

export default function FeaturesPage() {
  return (
    <>
      <PageHero
        label="Features"
        title="Everything your team needs. Nothing you don't."
        subtitle="CareStreamAI is purpose-built for UK care settings. Every feature exists because a registered manager, HR lead, or operations director asked for it."
      />

      <FeatureGroup
        id="language"
        label="Language & Access"
        bg="bg-white"
        features={[
          { icon: '🌍', title: '50+ language support', body: 'Staff ask questions in any of 50+ languages — including Polish, Romanian, Tagalog, Hindi, Yoruba, Arabic, and more. CareStreamAI detects the language automatically and responds in kind. No configuration. No selection menus. No extra cost per language.' },
          { icon: '💬', title: 'Email and web chat', body: 'Two channels, one system. Staff access CareStreamAI via the web portal or by sending a plain email. Both channels support full multi-turn conversations — staff can ask follow-up questions and the system maintains context throughout the thread.' },
          { icon: '📧', title: 'Threaded email conversations', body: 'Email conversations work exactly like the web chat — staff reply to continue the conversation, and the system remembers everything discussed in the thread. No need to repeat context.' },
          { icon: '📱', title: 'Mobile responsive interface', body: 'The web chat portal works on any device. Designed for use on a phone held in one hand on a care floor — not just a desktop in a manager\'s office.' },
        ]}
      />

      <FeatureGroup
        id="policies"
        label="Policy & Document Management"
        bg="bg-neutral-light"
        features={[
          { icon: '📁', title: 'Policy library', body: 'Upload and manage all your clinical and operational policies in one place. PDF, Word, and plain text supported. Policies are tagged by category, department, and regulatory framework.' },
          { icon: '📚', title: 'Staff handbook support', body: 'Upload your staff handbook separately from your clinical policies. Staff can ask HR and employment questions — about annual leave, disciplinary procedures, pay, notice periods — and get instant, accurate answers from your actual handbook.' },
          { icon: '🔄', title: 'Document versioning', body: 'When a policy is updated, upload the new version and CareStreamAI handles the rest — retiring the old version from the retrieval system, activating the new one, and logging the change. No gap in service during the transition.' },
          { icon: '✂️', title: 'Header and footer stripping', body: 'CareStreamAI automatically removes document headers, footers, version numbers, and page numbers from uploaded policies — so the AI only sees the substantive policy content, not the metadata.' },
          { icon: '🔔', title: 'Policy review reminders', body: 'Set a review interval for each policy and CareStreamAI will remind you when it\'s due — keeping your library current without requiring manual tracking.' },
        ]}
      />

      <FeatureGroup
        id="compliance"
        label="Compliance & Reporting"
        bg="bg-white"
        features={[
          { icon: '📊', title: 'CQC Readiness Report (Professional)', body: 'A structured evidence report generated automatically from your audit log. Shows policy access by document, staff engagement by role, version history, language activity, and knowledge gaps. Available on demand or on a monthly schedule. PDF export.' },
          { icon: '🔍', title: 'Full audit trail', body: 'Every query logged with: staff role, query text, policies cited, response given, language detected, channel used, and timestamp. Immutable log — entries cannot be edited or deleted.' },
          { icon: '🎯', title: 'Policy gap detection (Professional)', body: "Weekly report showing queries that returned no policy match, grouped by topic. Identifies exactly which areas your policy library doesn't cover — before they become inspection findings." },
          { icon: '⚖️', title: 'External regulatory knowledge base', body: 'CareStreamAI includes a curated knowledge base of UK regulatory frameworks — GDPR, RIDDOR, the Care Act, CQC Fundamental Standards, and more. Staff can ask about external regulations and receive plain English explanations in their language.' },
        ]}
      />

      {/* Your Home in Detail */}
      <section className="bg-neutral-dark py-24">
        <div className="mx-auto max-w-content px-6">
          <SectionLabel light>Your Home in Detail</SectionLabel>
          <h2 className="mb-6 text-4xl font-extrabold leading-tight text-white md:text-5xl">
            Not generic answers. <span style={{ color: '#E8850A' }}>Your home's answers.</span>
          </h2>
          <p className="mb-6 max-w-2xl text-lg leading-relaxed text-gray-300">
            CareStreamAI automatically analyses every uploaded policy and extracts the precise, home-specific
            facts that staff are most likely to ask about — named individuals, specific schedules, exact local procedures.
          </p>
          <p className="mb-14 max-w-2xl leading-relaxed text-gray-400">
            Admins can also add and edit knowledge entries directly — capturing the operational knowledge that lives in
            practice and making it available to everyone, instantly.
          </p>

          <div className="overflow-hidden rounded-2xl border border-white/10">
            <div className="grid grid-cols-3 border-b border-white/10 bg-white/10 px-6 py-4 text-xs font-bold uppercase tracking-widest text-white/40">
              <span>Question</span>
              <span>Generic policy answer</span>
              <span className="text-amber-brand">CareStreamAI answer</span>
            </div>
            {[
              ['Who is responsible for infection control?', '"The designated infection control lead as named in the policy."', '"Maria Chen is the Infection Control Lead. On nights and weekends, cover is provided by the senior carer on shift."'],
              ['How often is the sluice room deep-cleaned?', '"According to the cleaning schedule in the Infection Control Policy."', '"The sluice room is deep-cleaned every Monday and Thursday morning. The daily clean is recorded on the cleaning log inside the door."'],
              ['What colour mop do we use for the bathrooms?', '"Follow the colour-coding scheme as set out in the Infection Control Policy."', '"Blue mops and cloths are used for bathrooms and toilets. Yellow for kitchen areas. Red for high-risk areas only."'],
              ['Who do I call if there is a medication discrepancy overnight?', '"Contact your manager or the on-call manager as per the Medication Policy."', '"Call Sarah Ambridge on the duty manager number. If unavailable, the out-of-hours number is posted inside the medication room door."'],
            ].map(([q, generic, specific], i) => (
              <div key={q} className={`grid grid-cols-3 px-6 py-5 text-sm ${i < 3 ? 'border-b border-white/8' : ''}`}>
                <span className="pr-4 font-medium text-white">{q}</span>
                <span className="pr-4 italic text-white/40">{generic}</span>
                <span className="font-medium text-white/90">{specific}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Analytics */}
      <section className="bg-neutral-light py-24">
        <div className="mx-auto max-w-content px-6">
          <SectionLabel>Analytics</SectionLabel>
          <h2 className="mb-12 text-4xl font-extrabold text-neutral-dark">Full visibility across your organisation.</h2>
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-card">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-100 bg-neutral-light text-left text-xs font-bold uppercase tracking-widest text-neutral-mid">
                <tr>
                  <th className="px-6 py-4">Analytics feature</th>
                  <th className="px-6 py-4 text-center">Starter</th>
                  <th className="px-6 py-4 text-center">Professional</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {[
                  ['Total queries and trend', true, true],
                  ['Queries by channel (email vs chat)', true, true],
                  ['Most requested policies', true, true],
                  ['Active users this month', true, true],
                  ['Plan usage vs limit', true, true],
                  ['Policy not found rate', true, true],
                  ['Policy last updated date', true, true],
                  ['Language breakdown', false, true],
                  ['Knowledge gap detection report', false, true],
                  ['Query trend analysis (12-month)', false, true],
                  ['Staff engagement by individual', false, true],
                  ['CQC Readiness Report PDF', false, true],
                ].map(([feature, starter, pro]) => (
                  <tr key={feature as string} className="hover:bg-neutral-light/50">
                    <td className="px-6 py-3.5 text-neutral-dark">{feature as string}</td>
                    <td className="px-6 py-3.5 text-center">{starter ? <Check size={16} className="mx-auto text-teal" /> : <span className="text-gray-300">—</span>}</td>
                    <td className="px-6 py-3.5 text-center">{pro ? <Check size={16} className="mx-auto text-teal" /> : <span className="text-gray-300">—</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <PageCta
        heading="Try every feature free for 14 days."
        sub="No credit card required. No commitment. Cancel any time."
        primary={{ href: '/register', label: 'Start Free Trial' }}
        secondary={{ href: '/demo', label: 'Book a Demo' }}
      />
    </>
  )
}

function FeatureGroup({
  label, features, bg, id,
}: {
  id: string
  label: string
  bg: string
  features: Array<{ icon: string; title: string; body: string }>
}) {
  return (
    <section id={id} className={`${bg} py-24`}>
      <div className="mx-auto max-w-content px-6">
        <SectionLabel>{label}</SectionLabel>
        <div className="mt-10 grid gap-5 md:grid-cols-2">
          {features.map(({ icon, title, body }) => (
            <div key={title} className="card-lift flex gap-5 rounded-2xl border border-gray-100 bg-white p-7 shadow-card">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-teal-light text-2xl">{icon}</div>
              <div>
                <h3 className="mb-2 font-bold text-neutral-dark">{title}</h3>
                <p className="leading-relaxed text-neutral-mid">{body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
