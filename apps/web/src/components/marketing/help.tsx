import Link from 'next/link'
import { PageHero, PageCta } from './ui'

// ─── Types ──────────────────────────────────────────────────────────────────

export type HelpBlock =
  | { type: 'p'; text: string }
  | { type: 'subheading'; text: string }
  | { type: 'steps'; items: string[] }
  | { type: 'bullets'; items: string[] }
  | { type: 'note'; text: string }

export type RelatedLink = { title: string; href: string }

// ─── Browser frame wrapper for dashboard mockups ─────────────────────────────

export function MockFrame({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-teal/15 bg-white shadow-elevated">
      <div className="flex items-center gap-2 border-b border-gray-100 bg-neutral-light px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-red-300" />
        <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
        <span className="h-2.5 w-2.5 rounded-full bg-green-300" />
        <span className="ml-3 truncate text-xs font-medium text-neutral-mid">{label}</span>
      </div>
      <div className="bg-white p-5">{children}</div>
    </div>
  )
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-neutral-light/60 p-4">
      <p className="text-2xl font-extrabold text-neutral-dark">{value}</p>
      <p className="mt-1 text-xs font-medium text-neutral-mid">{label}</p>
    </div>
  )
}

function Bar({ w, label, value }: { w: string; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 text-xs">
      <span className="w-20 shrink-0 text-neutral-mid">{label}</span>
      <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-gray-100">
        <span className="block h-full rounded-full bg-teal" style={{ width: w }} />
      </span>
      <span className="w-8 shrink-0 text-right font-semibold text-neutral-dark">{value}</span>
    </div>
  )
}

function Pill({ children, tone = 'teal' }: { children: React.ReactNode; tone?: 'teal' | 'green' | 'amber' | 'gray' }) {
  const tones: Record<string, string> = {
    teal: 'bg-teal/10 text-teal',
    green: 'bg-green-50 text-green-700',
    amber: 'bg-amber-50 text-amber-700',
    gray: 'bg-gray-100 text-neutral-mid',
  }
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${tones[tone]}`}>{children}</span>
}

// ─── Dashboard mockups ───────────────────────────────────────────────────────

export function MockDashboard() {
  return (
    <MockFrame label="CareStreamAI · Dashboard">
      <div className="grid grid-cols-3 gap-3">
        <Stat value="42" label="Active policies" />
        <Stat value="68" label="Registered staff" />
        <Stat value="1,204" label="Questions this month" />
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
        <div className="rounded-lg bg-teal/10 py-2 font-medium text-teal">Web chat</div>
        <div className="rounded-lg bg-indigo-50 py-2 font-medium text-indigo-600">Email</div>
        <div className="rounded-lg bg-purple-50 py-2 font-medium text-purple-600">Voice</div>
      </div>
      <div className="mt-4 flex h-20 items-end gap-1.5">
        {[40, 55, 35, 70, 60, 85, 50, 75, 65, 90, 80, 95].map((h, i) => (
          <span key={i} className="flex-1 rounded-t bg-teal/30" style={{ height: `${h}%` }} />
        ))}
      </div>
    </MockFrame>
  )
}

export function MockUpload() {
  return (
    <MockFrame label="CareStreamAI · Policies · Upload">
      <div className="rounded-xl border-2 border-dashed border-teal/30 bg-teal-light/30 py-8 text-center">
        <div className="mb-2 text-3xl">📄</div>
        <p className="text-sm font-semibold text-neutral-dark">Click to select a file</p>
        <p className="mt-1 text-xs text-neutral-mid">PDF, Word or plain text</p>
      </div>
      <div className="mt-4 space-y-3">
        <div>
          <p className="mb-1 text-xs font-semibold text-neutral-mid">Policy name</p>
          <div className="rounded-md border border-gray-200 px-3 py-2 text-sm text-neutral-dark">Medication Management Policy</div>
        </div>
        <div className="flex gap-2">
          <Pill>Internal policy</Pill>
          <Pill tone="gray">Staff handbook</Pill>
          <Pill tone="gray">CQC report</Pill>
        </div>
      </div>
    </MockFrame>
  )
}

export function MockPolicyLibrary() {
  const rows = [
    { name: 'Medication Management Policy', v: 'v3.1', cat: 'Internal policy' },
    { name: 'Safeguarding Adults Policy', v: 'v2.0', cat: 'Internal policy' },
    { name: 'Infection Prevention and Control', v: 'v4.2', cat: 'Internal policy' },
    { name: 'Staff Handbook', v: 'v1.6', cat: 'Staff handbook' },
  ]
  return (
    <MockFrame label="CareStreamAI · Policy Library">
      <div className="space-y-2">
        {rows.map((r) => (
          <div key={r.name} className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2.5">
            <div className="flex items-center gap-2">
              <span className="text-base">📄</span>
              <span className="text-sm font-medium text-neutral-dark">{r.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <Pill tone="gray">{r.cat}</Pill>
              <Pill tone="green">{r.v}</Pill>
            </div>
          </div>
        ))}
      </div>
    </MockFrame>
  )
}

export function MockStaff() {
  const rows = [
    { name: 'Sarah Mitchell', role: 'Deputy Manager', status: 'Active' },
    { name: 'Anya Kowalski', role: 'Senior Carer', status: 'Active' },
    { name: 'David Osei', role: 'Care Assistant', status: 'Invited' },
  ]
  return (
    <MockFrame label="CareStreamAI · Staff">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold text-neutral-dark">Team members</p>
        <span className="rounded-md bg-teal px-3 py-1.5 text-xs font-semibold text-white">Invite staff</span>
      </div>
      <div className="space-y-2">
        {rows.map((r) => (
          <div key={r.name} className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2.5">
            <div>
              <p className="text-sm font-medium text-neutral-dark">{r.name}</p>
              <p className="text-xs text-neutral-mid">{r.role}</p>
            </div>
            <Pill tone={r.status === 'Active' ? 'green' : 'amber'}>{r.status}</Pill>
          </div>
        ))}
      </div>
    </MockFrame>
  )
}

export function MockEmailSettings() {
  return (
    <MockFrame label="CareStreamAI · Settings · Email">
      <p className="mb-1 text-xs font-semibold text-neutral-mid">Your team email address</p>
      <div className="rounded-md border border-gray-200 bg-neutral-light/60 px-3 py-2 font-mono text-sm text-teal">policies@crossways.carestreamai.co.uk</div>
      <p className="mb-2 mt-4 text-xs font-semibold text-neutral-mid">Approved senders</p>
      <div className="space-y-2">
        {['s.mitchell@crossways.co.uk', 'a.kowalski@crossways.co.uk', 'd.osei@crossways.co.uk'].map((e) => (
          <div key={e} className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2 text-sm">
            <span className="text-neutral-dark">{e}</span>
            <Pill tone="green">Allowed</Pill>
          </div>
        ))}
      </div>
    </MockFrame>
  )
}

export function MockChat() {
  return (
    <MockFrame label="CareStreamAI · Web chat">
      <div className="space-y-3">
        <div className="ml-auto max-w-[80%] rounded-2xl rounded-br-sm bg-teal px-4 py-2.5 text-sm text-white">
          What do I need to record after a medication error?
        </div>
        <div className="max-w-[85%] rounded-2xl rounded-bl-sm bg-neutral-light px-4 py-2.5 text-sm text-neutral-dark">
          <p>Follow the steps in your Medication Management Policy:</p>
          <ul className="mt-1.5 list-inside list-disc space-y-0.5 text-neutral-mid">
            <li>Make the person safe and inform the nurse in charge</li>
            <li>Complete a medication incident record</li>
            <li>Tell the manager before the end of your shift</li>
          </ul>
          <p className="mt-2 text-xs text-teal">Source: Medication Management Policy, Section 4.2</p>
        </div>
      </div>
      <div className="mt-4 flex items-center gap-2 rounded-full border border-gray-200 px-4 py-2 text-sm text-neutral-mid">
        Ask a policy question...
      </div>
    </MockFrame>
  )
}

export function MockEmail() {
  return (
    <MockFrame label="Email · CareStreamAI">
      <div className="space-y-3 text-sm">
        <div className="rounded-lg border border-gray-100 p-3">
          <p className="text-xs text-neutral-mid">To: policies@crossways.carestreamai.co.uk</p>
          <p className="mt-1 font-semibold text-neutral-dark">Annual leave question</p>
          <p className="mt-1 text-neutral-mid">How much notice do I need to give to book annual leave?</p>
        </div>
        <div className="rounded-lg border border-teal/20 bg-teal-light/30 p-3">
          <p className="text-xs text-neutral-mid">From: CareStreamAI</p>
          <p className="mt-1 text-neutral-dark">From your Staff Handbook: you need to give at least four weeks notice to book annual leave.</p>
          <p className="mt-2 text-xs text-teal">Source: Staff Handbook, Section 6.2</p>
        </div>
      </div>
    </MockFrame>
  )
}

export function MockAnalytics() {
  return (
    <MockFrame label="CareStreamAI · Analytics">
      <p className="mb-3 text-sm font-semibold text-neutral-dark">Top policies this month</p>
      <div className="space-y-2.5">
        <Bar w="92%" label="Medication" value="312" />
        <Bar w="68%" label="Safeguarding" value="231" />
        <Bar w="54%" label="Infection" value="183" />
        <Bar w="38%" label="Moving" value="129" />
      </div>
      <p className="mb-2 mt-5 text-sm font-semibold text-neutral-dark">Questions by channel</p>
      <div className="grid grid-cols-3 gap-2 text-center text-xs">
        <div className="rounded-lg bg-teal/10 py-2"><span className="block font-bold text-teal">54%</span>Web chat</div>
        <div className="rounded-lg bg-indigo-50 py-2"><span className="block font-bold text-indigo-600">31%</span>Email</div>
        <div className="rounded-lg bg-purple-50 py-2"><span className="block font-bold text-purple-600">15%</span>Voice</div>
      </div>
    </MockFrame>
  )
}

export function MockCqcReport() {
  const rows = [
    ['Safe', '78%'],
    ['Effective', '85%'],
    ['Caring', '91%'],
    ['Responsive', '64%'],
    ['Well led', '80%'],
  ]
  return (
    <MockFrame label="CareStreamAI · CQC Readiness Report">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm font-semibold text-neutral-dark">Crossways Care Home</p>
        <span className="rounded-md bg-teal px-3 py-1.5 text-xs font-semibold text-white">Download PDF</span>
      </div>
      <div className="space-y-2.5">
        {rows.map(([q, v]) => (
          <Bar key={q} w={v} label={q} value={v} />
        ))}
      </div>
      <p className="mt-4 text-xs text-neutral-mid">Evidence gathered across the five key questions.</p>
    </MockFrame>
  )
}

export function MockGaps() {
  const rows = [
    { theme: 'Insulin administration', count: '12 questions', tone: 'amber' as const },
    { theme: 'Visitor sign in process', count: '7 questions', tone: 'amber' as const },
    { theme: 'Lone working at night', count: '5 questions', tone: 'gray' as const },
  ]
  return (
    <MockFrame label="CareStreamAI · Policy Gap Report">
      <p className="mb-3 text-sm font-semibold text-neutral-dark">Questions your policies do not yet answer</p>
      <div className="space-y-2">
        {rows.map((r) => (
          <div key={r.theme} className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2.5">
            <span className="text-sm font-medium text-neutral-dark">{r.theme}</span>
            <Pill tone={r.tone}>{r.count}</Pill>
          </div>
        ))}
      </div>
      <p className="mt-4 text-xs text-neutral-mid">Coverage score this month: 74 percent</p>
    </MockFrame>
  )
}

export function MockBilling() {
  return (
    <MockFrame label="CareStreamAI · Billing">
      <div className="rounded-xl border border-teal/20 bg-teal-light/30 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-neutral-mid">Current plan</p>
            <p className="text-lg font-extrabold text-neutral-dark">Professional</p>
          </div>
          <span className="rounded-md border border-teal px-3 py-1.5 text-xs font-semibold text-teal">Change plan</span>
        </div>
      </div>
      <div className="mt-3 space-y-2 text-sm">
        <div className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2">
          <span className="text-neutral-mid">Billing period</span>
          <span className="font-medium text-neutral-dark">Monthly</span>
        </div>
        <div className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2">
          <span className="text-neutral-mid">Payment method</span>
          <span className="font-medium text-neutral-dark">Visa ending 4242</span>
        </div>
        <div className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2">
          <span className="text-neutral-mid">Staff users</span>
          <span className="font-medium text-neutral-dark">Unlimited</span>
        </div>
      </div>
    </MockFrame>
  )
}

export function MockSecurity() {
  return (
    <MockFrame label="CareStreamAI · Trust and Security">
      <div className="flex items-start gap-4">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal/10 text-2xl">🔒</span>
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2"><Pill tone="green">UK GDPR</Pill> Compliant</div>
          <div className="flex items-center gap-2"><Pill tone="green">UK and EEA</Pill> Data stored in region</div>
          <div className="flex items-center gap-2"><Pill tone="green">Private</Pill> Never used to train AI</div>
        </div>
      </div>
    </MockFrame>
  )
}

// ─── Article renderer ────────────────────────────────────────────────────────

function Blocks({ blocks }: { blocks: HelpBlock[] }) {
  return (
    <div className="space-y-5">
      {blocks.map((b, i) => {
        if (b.type === 'p') return <p key={i} className="text-base leading-relaxed text-neutral-mid">{b.text}</p>
        if (b.type === 'subheading') return <h2 key={i} className="pt-2 text-xl font-bold text-neutral-dark">{b.text}</h2>
        if (b.type === 'note')
          return (
            <div key={i} className="rounded-xl border border-teal/20 bg-teal-light/30 px-5 py-4 text-sm leading-relaxed text-neutral-dark">
              {b.text}
            </div>
          )
        if (b.type === 'bullets')
          return (
            <ul key={i} className="space-y-2">
              {b.items.map((it, j) => (
                <li key={j} className="flex gap-2.5 text-base leading-relaxed text-neutral-mid">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-teal" />
                  <span>{it}</span>
                </li>
              ))}
            </ul>
          )
        // steps
        return (
          <ol key={i} className="space-y-3">
            {b.items.map((it, j) => (
              <li key={j} className="flex gap-3.5">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-teal text-sm font-bold text-white">{j + 1}</span>
                <span className="pt-0.5 text-base leading-relaxed text-neutral-mid">{it}</span>
              </li>
            ))}
          </ol>
        )
      })}
    </div>
  )
}

export function HelpArticle({
  category,
  title,
  intro,
  mockup,
  mockupCaption,
  blocks,
  related,
}: {
  category: string
  title: string
  intro: string
  mockup?: React.ReactNode
  mockupCaption?: string
  blocks: HelpBlock[]
  related?: RelatedLink[]
}) {
  return (
    <>
      <PageHero label={category} title={title} subtitle={intro} />

      <section className="bg-white py-16">
        <div className="mx-auto max-w-3xl px-6">
          {/* Breadcrumb */}
          <nav className="mb-8 flex items-center gap-2 text-sm text-neutral-mid">
            <Link href="/help" className="hover:text-teal">Help Centre</Link>
            <span className="text-gray-300">›</span>
            <span className="font-medium text-neutral-dark">{category}</span>
          </nav>

          {mockup && (
            <figure className="mb-10">
              {mockup}
              {mockupCaption && <figcaption className="mt-3 text-center text-xs text-neutral-mid">{mockupCaption}</figcaption>}
            </figure>
          )}

          <article className="space-y-5">
            <Blocks blocks={blocks} />
          </article>

          {related && related.length > 0 && (
            <div className="mt-14 border-t border-gray-100 pt-8">
              <p className="section-label mb-4 text-teal">Related articles</p>
              <ul className="space-y-2.5">
                {related.map((r) => (
                  <li key={r.href}>
                    <Link href={r.href} className="flex items-center gap-2 text-sm text-neutral-mid transition-colors hover:text-teal">
                      <span className="text-gray-300">→</span> {r.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </section>

      <PageCta
        heading="Still need a hand?"
        sub="Our team replies to every support enquiry within one business day."
        primary={{ href: '/contact', label: 'Contact Support' }}
        secondary={{ href: '/demo', label: 'Book a Demo' }}
      />
    </>
  )
}
