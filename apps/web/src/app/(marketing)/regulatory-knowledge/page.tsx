import Link from 'next/link'
import { PageHero, PageCta, SectionLabel } from '@/components/marketing/ui'

export const metadata = {
  title: 'Regulatory Knowledge',
  description: 'CareStreamAI includes a built-in knowledge base covering UK care regulations — CQC Fundamental Standards, GDPR, RIDDOR, the Care Act, Mental Capacity Act, and more.',
  openGraph: {
    title: 'Regulatory Knowledge | CareStreamAI',
    description: 'A built-in UK regulatory knowledge base: CQC, GDPR, RIDDOR, Care Act, Mental Capacity Act, and more.',
    url: 'https://carestreamai.com/regulatory-knowledge',
  },
}

const FRAMEWORK_GROUPS = [
  {
    icon: '🔒',
    title: 'Data, Privacy and Confidentiality',
    items: ['UK General Data Protection Regulation (UK GDPR)', 'Data Protection Act 2018', 'Common law duty of confidentiality', 'Caldicott Principles', 'Information governance frameworks'],
  },
  {
    icon: '📋',
    title: 'CQC and Regulated Activities',
    items: ['Health and Social Care Act 2008 (Regulated Activities) Regulations 2014', 'CQC Fundamental Standards, Regulations 12, 13, 16, 17 and 20', 'Duty of Candour (Regulation 20)', 'CQC statutory notifications'],
  },
  {
    icon: '🛡️',
    title: 'Safeguarding and Capacity',
    items: ['Care Act 2014 (including Section 42 safeguarding duties)', 'Mental Capacity Act 2005', 'Deprivation of Liberty Safeguards (DoLS)', 'Liberty Protection Safeguards (LPS)', 'Safeguarding Vulnerable Groups Act 2006', 'Human Rights Act 1998'],
  },
  {
    icon: '⚕️',
    title: 'Health, Safety and Medicines',
    items: ['Health and Safety at Work etc. Act 1974', 'RIDDOR 2013', 'COSHH (Control of Substances Hazardous to Health)', 'Manual Handling Operations Regulations 1992', 'Medicines Act 1968 and Misuse of Drugs Act 1971', 'Regulatory Reform (Fire Safety) Order 2005'],
  },
  {
    icon: '⚖️',
    title: 'Equality, Employment and Whistleblowing',
    items: ['Equality Act 2010', 'Employment Rights Act 1996', 'Working Time Regulations 1998', 'Public Interest Disclosure Act 1998 (whistleblowing)', 'Freedom to Speak Up guidance'],
  },
  {
    icon: '📚',
    title: 'Clinical Guidance and Professional Standards',
    items: ['NICE guidelines (including infection prevention and control)', 'The Code, NMC professional standards', 'RPS professional guidance on medicines handling', 'Gold Standards Framework (end of life care)', 'UK Health Security Agency guidance'],
  },
]

const WORKED_EXAMPLES = [
  {
    title: 'Falls and RIDDOR',
    flag: '🇬🇧',
    query: 'What do I do if a resident falls and injures themselves?',
    policy: 'The falls policy sets out the immediate response, assess for injury, do not move if spinal injury suspected, call the senior carer, complete an incident form within 30 minutes.',
    regulatory: 'Under RIDDOR 2013, certain falls resulting in specific injuries must be reported to the HSE. CareStreamAI explains which injuries trigger this requirement, the 10-day reporting window, and how this connects to your incident reporting procedure.',
    note: null,
  },
  {
    title: 'Medication and the Misuse of Drugs Act',
    flag: '🇬🇧',
    query: 'What is the procedure for controlled drugs and why is it so strict?',
    policy: 'The medication administration policy sets out the two-person verification requirement, the controlled drugs register, stock count procedures, and what to do if a discrepancy is found.',
    regulatory: 'The Misuse of Drugs Act 1971 and associated Regulations create legal requirements for how controlled drugs are stored, administered, and recorded. CareStreamAI explains why the two-person rule exists in law and how CQC views controlled drug management under Regulation 12.',
    note: null,
  },
  {
    title: 'Safeguarding and the Care Act',
    flag: '🇵🇱',
    query: '"Kiedy powinienem zgłosić obawy dotyczące zaniedbania?"',
    policy: 'The safeguarding policy sets out the internal reporting procedure, who to contact, and how to document a concern.',
    regulatory: 'Section 42 of the Care Act 2014 places a duty on local authorities to make enquiries when an adult with care and support needs may be at risk. CareStreamAI explains what constitutes a Section 42 enquiry trigger and how CQC Regulation 13 applies.',
    note: 'Response delivered in Polish, automatically.',
  },
]

export default function RegulatoryKnowledgePage() {
  return (
    <>
      <PageHero
        label="The Joined-Up Answer"
        title="Your policies don't exist in isolation. Neither should your answers."
        subtitle="When a care worker asks about a procedure, the answer often involves more than one document, your internal policy and the regulatory framework behind it. CareStreamAI understands both."
      />

      {/* The problem */}
      <section className="bg-white py-24">
        <div className="mx-auto max-w-content px-6">
          <div className="grid gap-14 lg:grid-cols-2 lg:items-center">
            <div>
              <SectionLabel>The Challenge</SectionLabel>
              <h2 className="mb-6 text-4xl font-extrabold leading-tight text-neutral-dark">
                Policies reference regulations. Most staff have no idea what those regulations actually say.
              </h2>
            </div>
            <div className="space-y-5 text-lg leading-relaxed text-neutral-mid">
              <p>
                Every care policy is shaped by external law and regulation. Your falls policy reflects RIDDOR.
                Your medication policy reflects the Misuse of Drugs Act. Your safeguarding procedure reflects the
                Care Act 2014. Your data handling practices reflect UK GDPR.
              </p>
              <p>
                But when a care worker reads your falls policy, they rarely also read RIDDOR. The result is a gap
                between what the policy says and what the regulation requires, and staff who follow procedures
                without fully understanding the framework behind them.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Worked examples */}
      <section className="bg-neutral-light py-24">
        <div className="mx-auto max-w-content px-6">
          <SectionLabel>Three Worked Examples</SectionLabel>
          <h2 className="mb-14 text-4xl font-extrabold text-neutral-dark">
            One response. Policy and regulation, together.
          </h2>
          <div className="grid gap-6 md:grid-cols-3">
            {WORKED_EXAMPLES.map(({ title, flag, query, policy, regulatory, note }) => (
              <div key={title} className="card-lift flex flex-col rounded-2xl bg-white p-7 shadow-card">
                <div className="mb-5 flex items-center gap-2">
                  <span className="text-2xl">{flag}</span>
                  <p className="font-bold text-teal">{title}</p>
                </div>
                <div className="mb-5 rounded-xl bg-neutral-dark px-4 py-3.5">
                  <p className="mb-1 text-xs font-bold text-white/40">Staff query</p>
                  <p className="text-sm italic text-white/90">&ldquo;{query}&rdquo;</p>
                  {note && <p className="mt-1.5 text-xs text-amber-brand">{note}</p>}
                </div>
                <div className="mb-4">
                  <p className="mb-2 section-label text-green-700">From your policy</p>
                  <p className="text-sm leading-relaxed text-neutral-mid">{policy}</p>
                </div>
                <div className="mt-auto rounded-xl bg-teal-light p-4">
                  <p className="mb-2 section-label text-teal">Regulatory context added</p>
                  <p className="text-sm leading-relaxed text-neutral-dark">{regulatory}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Framework groups */}
      <section className="bg-white py-24">
        <div className="mx-auto max-w-content px-6">
          <SectionLabel>What We Cover</SectionLabel>
          <h2 className="mb-5 text-4xl font-extrabold text-neutral-dark">
            The regulatory landscape of UK care.
          </h2>
          <p className="mb-14 max-w-2xl text-lg leading-relaxed text-neutral-mid">
            Our regulatory knowledge base covers the legislation, statutory guidance, professional standards,
            and regulatory frameworks that shape day-to-day practice in UK care settings.
          </p>
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {FRAMEWORK_GROUPS.map(({ icon, title, items }) => (
              <div key={title} className="card-lift rounded-2xl border border-gray-100 bg-white p-6 shadow-card">
                <div className="mb-4 flex items-center gap-3">
                  <span className="text-2xl">{icon}</span>
                  <p className="font-bold text-neutral-dark">{title}</p>
                </div>
                <ul className="space-y-2">
                  {items.map(item => (
                    <li key={item} className="flex items-start gap-2 text-sm leading-relaxed text-neutral-mid">
                      <span className="mt-0.5 flex-shrink-0 text-teal">·</span> {item}
                    </li>
                  ))}
                  <li className="text-sm italic text-gray-400">And more</li>
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Multilingual */}
      <section className="bg-neutral-dark py-24">
        <div className="mx-auto max-w-3xl px-6">
          <SectionLabel light>In Every Language</SectionLabel>
          <h2 className="mb-6 text-4xl font-extrabold leading-tight text-white md:text-5xl">
            Regulatory complexity is hard enough in English.
          </h2>
          <p className="text-lg leading-relaxed text-gray-300">
            A care worker whose first language is Tagalog, Romanian, or Yoruba faces a double barrier when
            it comes to regulatory knowledge. Not only is the legislation complex, it is written in legal
            English that is challenging even for native speakers. CareStreamAI removes both barriers at once.
          </p>
        </div>
      </section>

      <PageCta
        heading="Give your team the full picture, policy and regulation, together."
        sub="14-day free trial. No charge until day 14."
        primary={{ href: '/demo', label: 'Book a Free Demo' }}
        secondary={{ href: '/register', label: 'Start Free Trial' }}
      />
    </>
  )
}
