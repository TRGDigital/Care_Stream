import { PageHero, PageCta, SectionLabel } from '@/components/marketing/ui'

export const metadata = { title: 'About — CareStreamAI' }

export default function AboutPage() {
  return (
    <>
      <PageHero
        label="About"
        title="Built by people who understand care."
        subtitle="CareStreamAI was founded with one mission: to give every care worker — regardless of language — the same access to the knowledge they need to do their job safely and confidently."
      />

      {/* Origin */}
      <section className="bg-white py-24">
        <div className="mx-auto max-w-content px-6">
          <div className="grid gap-14 lg:grid-cols-2 lg:items-center">
            <div>
              <SectionLabel>Where We Started</SectionLabel>
              <h2 className="mb-6 text-4xl font-extrabold leading-tight text-neutral-dark">
                The problem was always the same.
              </h2>
              <div className="space-y-5 text-lg leading-relaxed text-neutral-mid">
                <p>
                  Every care organisation invests time and money in writing good policies. The challenge has never
                  been the policies themselves — it has been getting them into the hands of the people who need
                  them, at the moment they need them, in a form they can understand.
                </p>
                <p>
                  Care workers on a night shift do not have time to search through a policy folder. New starters
                  from overseas should not have to navigate complex legal English on day one. Managers should not
                  spend their shifts fielding questions their written policies already answer.
                </p>
                <p>
                  CareStreamAI was built to close that gap — not by replacing policies, but by making them
                  genuinely accessible to everyone.
                </p>
              </div>
            </div>
            <div className="rounded-2xl bg-teal-gradient p-10 shadow-teal-glow">
              <p className="mb-6 text-4xl font-extrabold text-white">190,000+</p>
              <p className="mb-2 text-lg font-bold text-white/80">overseas workers joined the UK care sector in 2023–24.</p>
              <p className="text-white/60">Most were expected to navigate complex policy libraries in a second language from day one.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Principles */}
      <section className="bg-neutral-light py-24">
        <div className="mx-auto max-w-content px-6">
          <SectionLabel>What We Believe</SectionLabel>
          <h2 className="mb-14 text-4xl font-extrabold text-neutral-dark">Our principles.</h2>
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {[
              { icon: '🛡️', title: 'Policy access is a safety issue', body: "When a care worker can't find or understand the correct procedure, patient safety is at risk. Equitable access to policy knowledge is foundational to safe care delivery." },
              { icon: '🌍', title: 'Language should not be a barrier', body: "The UK care sector is one of the most linguistically diverse workforces in the country. A care worker whose first language is Tagalog deserves the same access to policy knowledge as a native English speaker." },
              { icon: '🤖', title: 'AI should be bounded, not speculative', body: 'In a compliance setting, confident but incorrect AI answers are dangerous. CareStreamAI is designed so the AI can only answer from approved documents — never from general knowledge, never from guesswork.' },
              { icon: '📊', title: 'Compliance should be continuous', body: 'Inspection evidence should not be assembled manually the week before a CQC visit. CareStreamAI builds that evidence automatically, one policy interaction at a time.' },
              { icon: '🔒', title: 'Data belongs to you', body: 'Your policies, your staff data, and your query history are yours. We will never use them to train AI models or share them with any other party.' },
              { icon: '📚', title: 'The policy library is a living resource', body: 'A policy that nobody reads is not a resource — it is a liability. CareStreamAI makes your policy library active: accessed, tracked, and demonstrably used by the people it is there to help.' },
            ].map(({ icon, title, body }) => (
              <div key={title} className="card-lift rounded-2xl bg-white p-7 shadow-card">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-light text-2xl">{icon}</div>
                <h3 className="mb-3 font-bold text-neutral-dark">{title}</h3>
                <p className="leading-relaxed text-neutral-mid">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* UK-focused */}
      <section className="bg-white py-24">
        <div className="mx-auto max-w-3xl px-6">
          <SectionLabel>UK-Specific</SectionLabel>
          <h2 className="mb-6 text-4xl font-extrabold leading-tight text-neutral-dark">
            Built for the UK care sector — not adapted from a generic product.
          </h2>
          <div className="space-y-5 text-lg leading-relaxed text-neutral-mid">
            <p>
              CareStreamAI is not a general-purpose AI assistant with a care skin applied to it. It was
              designed from the ground up for the regulatory environment of UK health and social care.
            </p>
            <p>
              Our regulatory knowledge base is built specifically around UK law and guidance: UK GDPR, the
              Care Act 2014, CQC Fundamental Standards, RIDDOR, the Misuse of Drugs Act, the NMC Code, and more.
            </p>
            <p>
              All data is stored within the UK and EEA. Our data processing agreements are written under
              UK law. Our product development is informed by people with direct experience of UK care regulation
              and CQC inspection.
            </p>
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="bg-neutral-dark py-24">
        <div className="mx-auto max-w-3xl px-6">
          <SectionLabel light>The Team</SectionLabel>
          <h2 className="mb-6 text-4xl font-extrabold leading-tight text-white">
            Shaped by people who know the sector.
          </h2>
          <p className="text-lg leading-relaxed text-gray-300">
            CareStreamAI is developed with direct input from registered managers, quality leads, HR directors,
            and care workers. Every feature exists because someone working in the sector identified a real
            need. We do not build features for the sake of novelty — we build them because they solve a
            problem that matters to the people delivering care.
          </p>
        </div>
      </section>

      <PageCta
        heading="Want to learn more or talk to the team?"
        primary={{ href: '/demo', label: 'Book a Free Demo' }}
        secondary={{ href: '/contact', label: 'Contact Us' }}
      />
    </>
  )
}
