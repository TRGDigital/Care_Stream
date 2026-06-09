import Link from 'next/link'
import { PageCta, SectionLabel } from '@/components/marketing/ui'
import { ArrowRight, Check, FileText, GraduationCap, ClipboardCheck, ShieldCheck, Smartphone, Users } from 'lucide-react'
import { pageMetadata } from '@/lib/page-meta'

// Overridable from the platform console (Blog → Pages / site_pages).
export const generateMetadata = () => pageMetadata('/about', {
  title:       'About CareStreamAI',
  description: 'CareStreamAI is one platform for UK care providers: policy access, staff training, audits and CQC tools, in any language. Built by people who understand the care sector.',
})

function AboutHeroMockup() {
  return (
    <div className="w-full overflow-hidden rounded-2xl shadow-[0_20px_60px_rgba(26,5,48,0.45)]" style={{ background: '#E2D6F2' }}>
      {/* Browser chrome */}
      <div className="flex items-center gap-2.5 px-4 py-3" style={{ background: '#EAE0F5' }}>
        <span className="h-2.5 w-2.5 rounded-full bg-[#ff6058]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#ffbc2e]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
        <div className="mx-auto rounded px-10 py-1 text-[10px] text-[#5E4D70]" style={{ background: '#EAE2F5' }}>
          carestreamai.com/dashboard
        </div>
      </div>
      {/* App shell */}
      <div className="flex" style={{ height: 340 }}>
        {/* Sidebar */}
        <div className="flex w-44 flex-shrink-0 flex-col" style={{ background: '#1A0830' }}>
          {/* Logo */}
          <div className="flex items-center gap-2 px-4 py-3.5" style={{ borderBottom: '0.5px solid rgba(255,255,255,0.08)' }}>
            <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md" style={{ background: 'linear-gradient(135deg,#8B4DB8,#C4688E)' }}>
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="5.5" stroke="white" strokeWidth="1.5"/><path d="M5 8h6M8 5v6" stroke="white" strokeWidth="1.5" strokeLinecap="round"/></svg>
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'white' }}>CareStreamAI</span>
          </div>
          {/* Nav sections */}
          {[
            { heading: 'OVERVIEW', items: [{ label: 'Dashboard', active: true }, { label: 'Query history' }] },
            { heading: 'CONTENT', items: [{ label: 'Policy library' }, { label: 'Knowledge base' }] },
            { heading: 'REPORTING', items: [{ label: 'Analytics' }, { label: 'CQC report' }, { label: 'Monthly audits' }] },
          ].map(({ heading, items }) => (
            <div key={heading} className="px-2 pt-3">
              <p style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.08em', paddingLeft: 8, marginBottom: 4 }}>{heading}</p>
              {items.map(({ label, active }) => (
                <div key={label} style={{
                  padding: '5px 8px', borderRadius: 6, marginBottom: 2, fontSize: 11,
                  color: active ? 'white' : 'rgba(255,255,255,0.6)',
                  fontWeight: active ? 600 : 400,
                  background: active ? 'rgba(255,255,255,0.10)' : 'transparent',
                  borderLeft: active ? '2px solid #C4A8E0' : '2px solid transparent',
                }}>
                  {label}
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Main content */}
        <div className="flex flex-1 flex-col overflow-hidden" style={{ background: '#F5F0FA' }}>
          {/* Top bar */}
          <div className="flex items-center justify-between px-5 py-3" style={{ background: 'white', borderBottom: '0.5px solid #E8D8F4' }}>
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#1A1530' }}>Dashboard</p>
              <p style={{ fontSize: 10, color: '#5E4D70' }}>Crossways Care Home</p>
            </div>
            <div style={{ background: 'linear-gradient(135deg,#8B4DB8,#C4688E)', borderRadius: 6, padding: '5px 12px', fontSize: 11, fontWeight: 600, color: 'white' }}>+ Add policy</div>
          </div>
          {/* Stats row */}
          <div className="grid grid-cols-4 gap-2.5 p-4">
            {[
              { n: '312', label: 'Queries this month', trend: '↑ 18%', trendColor: '#1A8754' },
              { n: '21',  label: 'Active policies',    trend: 'All accessed', trendColor: '#1A8754' },
              { n: '7',   label: 'Languages used',     trend: '↑ 2 new',     trendColor: '#1A8754' },
              { n: '2',   label: 'Due for review',     trend: '⚠ Action',    trendColor: '#C96B00' },
            ].map(({ n, label, trend, trendColor }) => (
              <div key={label} style={{ background: 'white', borderRadius: 8, padding: '10px 12px', border: '0.5px solid #E8D8F4' }}>
                <p style={{ fontSize: 20, fontWeight: 700, color: '#9B52B5', marginBottom: 2 }}>{n}</p>
                <p style={{ fontSize: 10, color: '#5E4D70', marginBottom: 3 }}>{label}</p>
                <p style={{ fontSize: 10, color: trendColor }}>{trend}</p>
              </div>
            ))}
          </div>
          {/* Recent queries table */}
          <div className="mx-4" style={{ background: 'white', borderRadius: 8, border: '0.5px solid #E8D8F4', overflow: 'hidden' }}>
            <div className="grid px-3 py-2" style={{ gridTemplateColumns: '2fr 1fr 1fr', background: '#F5F0FA', borderBottom: '0.5px solid #E8D8F4', fontSize: 9, fontWeight: 700, color: '#5E4D70', letterSpacing: '0.05em' }}>
              <span>Query</span><span>Language</span><span>Status</span>
            </div>
            {[
              { q: 'Falls policy: witness procedure', lang: 'Tagalog', status: 'Answered', statusColor: '#e8f5ee', statusText: '#1A6B45' },
              { q: 'Controlled drugs verification', lang: 'English', status: 'Answered', statusColor: '#e8f5ee', statusText: '#1A6B45' },
              { q: 'Infection control: isolation', lang: 'Yoruba', status: 'Processing', statusColor: '#fff8e6', statusText: '#854F0B' },
            ].map(({ q, lang, status, statusColor, statusText }) => (
              <div key={q} className="grid items-center px-3 py-2" style={{ gridTemplateColumns: '2fr 1fr 1fr', borderBottom: '0.5px solid #F0E8FA', fontSize: 10 }}>
                <p style={{ color: '#1A1530', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 8 }}>{q}</p>
                <p style={{ color: '#5E4D70' }}>{lang}</p>
                <span style={{ background: statusColor, color: statusText, borderRadius: 100, padding: '2px 7px', fontSize: 9, fontWeight: 600, display: 'inline-block' }}>{status}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function AboutPage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-hero-gradient">
        <div className="absolute inset-0 dot-mesh" />
        <div className="absolute -right-32 -top-32 h-[420px] w-[420px] rounded-full bg-white/5" />
        <div className="absolute -bottom-24 -left-16 h-[280px] w-[280px] rounded-full bg-teal/30" />
        <div className="absolute bottom-0 left-0 right-0 h-16" style={{ background: 'linear-gradient(to bottom right, transparent 49.5%, #fff 50%)' }} />
        <div className="relative mx-auto max-w-content px-6 pb-24 pt-20 md:pt-28">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <p className="section-label mb-3 text-white/50">About</p>
              <h1 className="mb-5 text-4xl font-extrabold leading-tight text-white md:text-5xl lg:text-[52px]">
                Built by people who understand care.
              </h1>
              <p className="mb-8 max-w-xl text-lg leading-relaxed text-white/75">
                CareStreamAI was founded with one mission: to give every member of a care team, whatever
                language they think in, the same instant access to the policies, training and guidance they
                need to do their job safely and well. Today it is one platform that does exactly that.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Link href="/demo" className="btn-amber rounded-btn px-8 py-4 text-sm text-center">
                  Book a Free Demo
                </Link>
                <Link href="/how-it-works" className="btn-ghost-white rounded-btn flex items-center justify-center gap-2 px-8 py-4 text-sm">
                  See how it works <ArrowRight size={16} />
                </Link>
              </div>
              <div className="mt-6 flex flex-wrap gap-4 text-sm text-white/50">
                <span className="flex items-center gap-1.5"><Check size={13} className="text-white/40" /> UK-built and hosted</span>
                <span className="flex items-center gap-1.5"><Check size={13} className="text-white/40" /> CQC-aligned</span>
                <span className="flex items-center gap-1.5"><Check size={13} className="text-white/40" /> 60+ languages</span>
              </div>
            </div>
            <div className="relative lg:pl-4">
              <AboutHeroMockup />
            </div>
          </div>
        </div>
      </section>

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
                  been the policies themselves, it has been getting them into the hands of the people who need
                  them, at the moment they need them, in a form they can understand.
                </p>
                <p>
                  Care workers on a night shift do not have time to search through a policy folder. New starters
                  from overseas should not have to navigate complex legal English on day one. Managers should not
                  spend their shifts fielding questions their written policies already answer.
                </p>
                <p>
                  CareStreamAI was built to close that gap, not by replacing policies, but by making them
                  genuinely accessible to everyone. The same problem, we realised, applied to mandatory
                  training and to the evidence a service needs at inspection. So CareStream grew from policy
                  access into a single hub for policies, training, audits and CQC readiness.
                </p>
              </div>
            </div>
            <div className="rounded-2xl bg-teal-gradient p-10 shadow-teal-glow">
              <p className="mb-6 text-4xl font-extrabold text-white">190,000+</p>
              <p className="mb-2 text-lg font-bold text-white/80">overseas workers joined the UK care sector in 2023/24.</p>
              <p className="text-white/60">Most were expected to navigate complex policy libraries in a second language from day one.</p>
            </div>
          </div>
        </div>
      </section>

      {/* What CareStream is today */}
      <section className="bg-neutral-light py-24">
        <div className="mx-auto max-w-content px-6">
          <SectionLabel>The Platform Today</SectionLabel>
          <h2 className="mb-4 text-4xl font-extrabold leading-tight text-neutral-dark">
            One platform for your whole care operation.
          </h2>
          <p className="mb-14 max-w-2xl text-lg leading-relaxed text-neutral-mid">
            What began as policy access has grown into a single hub for the things a care team relies on
            every day, all grounded in your own documents and available in any language.
          </p>
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {[
              { Icon: FileText,       title: 'Policy access', body: 'Instant, cited answers from your own policies, in 60+ languages, day or night.', href: '/care-policies' },
              { Icon: GraduationCap,  title: 'Staff training', body: 'Mandatory training and modules built from your own policies, delivered in the hub.', href: '/staff-training' },
              { Icon: ClipboardCheck, title: 'Care audits', body: 'Structured audits with AI recommendations, so issues are found and fixed early.', href: '/care-audits' },
              { Icon: ShieldCheck,    title: 'CQC readiness', body: 'Inspection evidence and reports that build themselves from everyday use.', href: '/cqc-compliance' },
              { Icon: Smartphone,     title: 'The hub', body: 'One app where staff find policies, training and answers, on the phone in their pocket.', href: '/how-it-works' },
              { Icon: Users,          title: 'HR policies', body: 'The same instant, grounded access for your staff handbook and HR procedures.', href: '/hr-policies' },
            ].map(({ Icon, title, body, href }) => (
              <Link key={title} href={href} className="card-lift group flex flex-col rounded-2xl border border-gray-100 bg-white p-7 shadow-card transition hover:border-teal/40">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-light">
                  <Icon size={22} className="text-teal" />
                </div>
                <h3 className="mb-2 font-bold text-neutral-dark group-hover:text-teal">{title}</h3>
                <p className="flex-1 leading-relaxed text-neutral-mid">{body}</p>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-teal">
                  Learn more <ArrowRight size={14} className="transition group-hover:translate-x-0.5" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Principles */}
      <section className="bg-white py-24">
        <div className="mx-auto max-w-content px-6">
          <SectionLabel>What We Believe</SectionLabel>
          <h2 className="mb-14 text-4xl font-extrabold text-neutral-dark">Our principles.</h2>
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {[
              { icon: '🛡️', title: 'Access is a safety issue', body: "When a care worker can't find or understand the correct procedure, the people they support are at risk. Equitable access to the right knowledge is foundational to safe care." },
              { icon: '🌍', title: 'Language should not be a barrier', body: "The UK care sector is one of the most linguistically diverse workforces in the country. A care worker whose first language is Tagalog deserves the same access to policy knowledge as a native English speaker." },
              { icon: '🤖', title: 'AI should be bounded, not speculative', body: 'In a compliance setting, confident but incorrect AI answers are dangerous. CareStreamAI is designed so the AI can only answer from approved documents, never from general knowledge, never from guesswork.' },
              { icon: '📊', title: 'Compliance should be continuous', body: 'Inspection evidence should not be assembled manually the week before a CQC visit. CareStreamAI builds that evidence automatically, one policy interaction at a time.' },
              { icon: '🔒', title: 'Data belongs to you', body: 'Your policies, your staff data, and your query history are yours. We will never use them to train AI models or share them with any other party.' },
              { icon: '📚', title: 'Knowledge should be reinforced, not filed', body: 'A policy nobody reads, or training watched once and forgotten, is a liability. CareStreamAI keeps knowledge active: accessed when it is needed, taught in short modules, checked, and demonstrably used by the people it is there to help.' },
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
      <section className="bg-neutral-light py-24">
        <div className="mx-auto max-w-3xl px-6">
          <SectionLabel>UK-Specific</SectionLabel>
          <h2 className="mb-6 text-4xl font-extrabold leading-tight text-neutral-dark">
            Built for the UK care sector, not adapted from a generic product.
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
            need. We do not build features for the sake of novelty, we build them because they solve a
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
