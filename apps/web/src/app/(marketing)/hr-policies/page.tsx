import Link from 'next/link'
import {
  CheckCircle2, Mail, Globe, BarChart2,
  BookOpen, Users, Clock, ShieldCheck, Zap, Bell, Lock,
  MessageSquare, Mic, Volume2, Languages, Smartphone, Layers,
} from 'lucide-react'
import { PageCta, SectionLabel } from '@/components/marketing/ui'
import { EditableContentBlock } from '@/components/marketing/editable-content-block'
import { getContentSlots, makeSlot } from '@/lib/page-slots'
import { HR_POLICIES_SLOTS } from '@/lib/page-slots/hr-policies'

const RICH_LINK = '[&_a]:font-semibold [&_a]:text-teal [&_a]:underline [&_a]:underline-offset-2'

export const metadata = {
  title:       'HR Policies and Staff Handbook | CareStreamAI',
  description: 'Give every member of your team instant answers to HR and employment questions from your actual staff handbook. Available in any language, in the CareStream hub or by email, 24 hours a day.',
  openGraph: {
    title: 'HR Policies and Staff Handbook | CareStreamAI',
    description: 'Instant HR and employment answers from your actual staff handbook, in any language, in the hub or by email, 24/7.',
    url: 'https://www.carestreamai.com/hr-policies',
  },
}

// ── Staff Handbook Dashboard Mockup ───────────────────────────────────────────

function HandbookMockup() {
  const topics = [
    { label: 'Annual Leave',       queries: 48, pct: 100 },
    { label: 'Sick Pay',           queries: 34, pct: 71  },
    { label: 'Disciplinary',       queries: 27, pct: 56  },
    { label: 'Working Hours',      queries: 21, pct: 44  },
    { label: 'Expenses',           queries: 14, pct: 29  },
  ]
  return (
    <div className="w-full max-w-[400px] overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-white/20">
      <div className="bg-teal px-5 py-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/60">Staff Handbook</p>
            <p className="text-sm font-bold text-white">Crossways Care Home</p>
          </div>
          <div className="rounded-xl bg-white/20 px-3 py-2 text-center">
            <p className="text-lg font-extrabold leading-none text-white">9</p>
            <p className="mt-0.5 text-[9px] font-medium text-white/70">languages</p>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-3 divide-x divide-gray-100 border-b border-gray-100 bg-gray-50">
        {[
          { label: 'Questions this month', value: '312' },
          { label: 'Staff asking',         value: '24'  },
          { label: 'Avg response',         value: '18s' },
        ].map(({ label, value }) => (
          <div key={label} className="py-3 text-center">
            <p className="text-base font-extrabold text-neutral-dark">{value}</p>
            <p className="text-[9px] text-neutral-mid">{label}</p>
          </div>
        ))}
      </div>
      <div className="px-5 py-4">
        <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-neutral-mid">Top topics this month</p>
        <div className="space-y-3">
          {topics.map(({ label, queries, pct }) => (
            <div key={label}>
              <div className="mb-1 flex items-center justify-between">
                <p className="text-xs font-medium text-neutral-dark">{label}</p>
                <p className="text-[10px] text-neutral-mid">{queries} queries</p>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                <div className="h-1.5 rounded-full bg-teal" style={{ width: `${pct}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="border-t border-teal/10 bg-teal/5 px-5 py-3">
        <div className="flex items-center gap-2">
          <Globe size={13} className="flex-shrink-0 text-teal" />
          <p className="text-[11px] font-medium text-teal">Questions asked in Polish, Romanian, Tagalog and 6 more languages this month.</p>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

export default async function HRPoliciesPage() {
  const s = makeSlot(HR_POLICIES_SLOTS, await getContentSlots('/hr-policies'))
  return (
    <>
      {/* ── Split hero ───────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-hero-gradient">
        <div className="absolute inset-0 dot-mesh" />
        <div className="absolute -right-32 -top-32 h-[420px] w-[420px] rounded-full bg-white/5" />
        <div className="absolute -bottom-24 -left-16 h-[280px] w-[280px] rounded-full bg-teal/30" />
        <div
          className="absolute bottom-0 left-0 right-0 h-16"
          style={{ background: 'linear-gradient(to bottom right, transparent 49.5%, #fff 50%)' }}
        />
        <div className="relative mx-auto max-w-content px-6 pb-20 pt-20 md:pt-24">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <SectionLabel light>{s('hero.label')}</SectionLabel>
              <h1 className="mb-5 max-w-xl text-4xl font-extrabold leading-tight text-white md:text-5xl">
                {s('hero.h1')}
              </h1>
              <p className="mb-8 max-w-xl text-lg leading-relaxed text-white/75">
                {s('hero.intro')}
              </p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Link href="/register" className="btn-amber rounded-btn px-8 py-4 text-sm">Start Free Trial</Link>
                <Link href="/demo"     className="btn-ghost-white rounded-btn px-8 py-4 text-sm">Book a Demo</Link>
              </div>
            </div>
            <div className="flex justify-center lg:justify-end">
              <HandbookMockup />
            </div>
          </div>
        </div>
      </section>

      {/* ── The problem ───────────────────────────────────────────────────── */}
      <section className="bg-white py-24">
        <div className="mx-auto max-w-content px-6">
          <div className="grid gap-14 lg:grid-cols-2 lg:items-center">
            <div>
              <SectionLabel>{s('problem.label')}</SectionLabel>
              <h2 className="mb-6 text-4xl font-extrabold leading-tight text-neutral-dark">
                {s('problem.h2')}
              </h2>
              <div className={`space-y-4 text-lg leading-relaxed text-neutral-mid ${RICH_LINK}`}>
                <div dangerouslySetInnerHTML={{ __html: s('problem.p1') }} />
                <div dangerouslySetInnerHTML={{ __html: s('problem.p2') }} />
              </div>
            </div>
            <div className="grid gap-4">
              {[
                { icon: '📁', key: 'problem.card1', dim: true },
                { icon: '💬', key: 'problem.card2', dim: false },
              ].map(({ icon, key, dim }) => (
                <div
                  key={key}
                  className={`card-lift rounded-2xl p-6 ${dim ? 'border border-gray-100 bg-white shadow-card' : 'bg-teal-gradient shadow-teal-glow'}`}
                >
                  <div className="mb-3 flex items-center gap-3">
                    <span className="text-2xl">{icon}</span>
                    <p className={`text-xs font-bold uppercase tracking-widest ${dim ? 'text-neutral-mid' : 'text-white/60'}`}>{s(`${key}.label`)}</p>
                  </div>
                  <p className={`leading-relaxed ${dim ? 'text-neutral-mid' : 'text-white'}`}>{s(`${key}.body`)}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── How it works ──────────────────────────────────────────────────── */}
      <section className="bg-neutral-light py-24">
        <div className="mx-auto max-w-content px-6">
          <SectionLabel>{s('how.label')}</SectionLabel>
          <h2 className="mb-4 text-4xl font-extrabold leading-tight text-neutral-dark">
            {s('how.h2')}
          </h2>
          <p className="mb-14 text-lg leading-relaxed text-neutral-mid">
            {s('how.intro')}
          </p>
          <div className="grid gap-6 md:grid-cols-3">
            {[
              { step: '01', Icon: BookOpen,       key: 'how.step1' },
              { step: '02', Icon: MessageSquare,  key: 'how.step2' },
              { step: '03', Icon: BarChart2,      key: 'how.step3' },
            ].map(({ step, Icon, key }) => (
              <div key={step} className="card-lift rounded-2xl border border-gray-100 bg-white p-7 shadow-card">
                <div className="mb-5 flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal text-sm font-extrabold text-white shadow-teal-glow">{step}</span>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-light">
                    <Icon size={18} className="text-teal" />
                  </div>
                </div>
                <h3 className="mb-3 text-lg font-bold text-neutral-dark">{s(`${key}.title`)}</h3>
                <p className="text-sm leading-relaxed text-neutral-mid">{s(`${key}.body`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── See it in action ──────────────────────────────────────────────── */}
      <section className="bg-white py-24">
        <div className="mx-auto max-w-content px-6">
          <SectionLabel>{s('action.label')}</SectionLabel>
          <h2 className="mb-10 text-4xl font-extrabold leading-tight text-neutral-dark">
            {s('action.h2')}
          </h2>

          {/* Hub */}
          <div className="mb-16 grid items-start gap-10 lg:grid-cols-2">
            <div>
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-light">
                  <Smartphone size={18} className="text-teal" />
                </div>
                <span className="text-xl font-bold text-neutral-dark">{s('action.hub.label')}</span>
              </div>
              <h3 className="mb-4 text-2xl font-extrabold leading-tight text-neutral-dark">
                {s('action.hub.h3')}
              </h3>
              <div className={`mb-4 text-lg leading-relaxed text-neutral-mid ${RICH_LINK}`} dangerouslySetInnerHTML={{ __html: s('action.hub.p1') }} />
              <div className={`mb-4 text-lg leading-relaxed text-neutral-mid ${RICH_LINK}`} dangerouslySetInnerHTML={{ __html: s('action.hub.p2') }} />
              <div className="rounded-xl border border-teal/20 bg-teal/5 px-4 py-3">
                <div className="mb-2.5 flex items-center gap-2">
                  <Globe size={15} className="flex-shrink-0 text-teal" />
                  <p className="text-sm font-medium text-neutral-dark">{s('action.hub.languagesNote')}</p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { flag: '🇵🇱', name: 'Polski' },
                    { flag: '🇷🇴', name: 'Română' },
                    { flag: '🇵🇭', name: 'Filipino' },
                    { flag: '🇳🇬', name: 'Yorùbá' },
                    { flag: '🇮🇳', name: 'हिन्दी' },
                  ].map(({ flag, name }) => (
                    <span key={name} className="flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-xs font-medium text-neutral-dark ring-1 ring-gray-200">
                      <span>{flag}</span><span>{name}</span>
                    </span>
                  ))}
                  <span className="flex items-center rounded-full bg-white px-2.5 py-1 text-xs font-medium text-neutral-mid ring-1 ring-gray-200">+ 55 more</span>
                </div>
              </div>
            </div>

            {/* Hub phone mockup */}
            <div className="flex justify-center">
              <div className="w-full max-w-[380px] rounded-[2.5rem] bg-gray-900 p-2.5 shadow-2xl ring-1 ring-white/10">
                <div className="overflow-hidden rounded-[2rem] bg-gray-50">
                  <div className="flex items-center gap-3 bg-teal px-4 py-3">
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-white/20 text-[10px] font-extrabold text-white">CS</div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold text-white">CareStream</p>
                      <p className="text-[10px] text-white/60">Staff Handbook</p>
                    </div>
                    <span className="flex items-center gap-1 rounded-full bg-white/20 px-2 py-0.5 text-[9px] font-bold text-white">
                      <Globe size={9} /> Polski
                    </span>
                  </div>
                  <div className="space-y-2 px-3 py-3">
                    {/* Staff question in Polish (voice) */}
                    <div className="ml-auto w-fit max-w-[82%] rounded-tl-2xl rounded-tr-sm rounded-bl-2xl rounded-br-2xl bg-teal px-3 py-2">
                      <p className="text-[11px] leading-snug text-white">Ile dni wcześniej muszę zgłosić urlop wypoczynkowy?</p>
                      <p className="mt-0.5 flex items-center gap-1 text-[9px] text-white/60"><Mic size={9} /> wykryto: polski</p>
                    </div>
                    {/* AI response in Polish */}
                    <div className="max-w-[92%] overflow-hidden rounded-tr-2xl rounded-br-2xl rounded-bl-2xl border border-gray-100 bg-white shadow-sm">
                      <div className="p-3">
                        <p className="mb-0.5 text-[10px] font-semibold text-teal">Z Twojego Regulaminu Pracowniczego</p>
                        <p className="text-[11px] leading-relaxed text-neutral-dark">
                          Zgodnie z regulaminem, wnioski urlopowe należy składać z minimum 2 tygodniowym wyprzedzeniem w przypadku urlopu do 3 dni oraz z 4 tygodniowym wyprzedzeniem w przypadku dłuższego urlopu.
                        </p>
                        <p className="mt-1.5 text-[10px] leading-snug text-neutral-mid">
                          Wnioski składa się bezpośrednio do kierownika zmiany.
                        </p>
                      </div>
                      <div className="flex items-center justify-between border-t border-gray-100 px-3 py-2">
                        <p className="text-[9px] text-neutral-mid">Źródło: Regulamin Pracowniczy, Sekcja 6</p>
                        <span className="flex items-center gap-1 rounded-full bg-teal/10 px-2 py-0.5 text-[9px] font-semibold text-teal">
                          <Volume2 size={9} /> Odsłuchaj
                        </span>
                      </div>
                    </div>
                    {/* Follow-up */}
                    <div className="ml-auto w-fit max-w-[82%] rounded-tl-2xl rounded-tr-sm rounded-bl-2xl rounded-br-2xl bg-teal px-3 py-2">
                      <p className="text-[11px] text-white">Dziękuję, a ile mam dni urlopu rocznie?</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 border-t border-gray-200 bg-white px-3 py-2.5">
                    <div className="flex-1 rounded-full bg-gray-100 px-3 py-1.5 text-[10px] text-gray-400">Napisz wiadomość</div>
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-teal/10 text-teal"><Mic size={13} /></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Email channel */}
          <div className="grid items-start gap-10 lg:grid-cols-2">
            <div className="order-2 lg:order-1">
              <div className="overflow-hidden rounded-2xl border border-gray-200 shadow-xl">
                <div className="flex items-center gap-2 border-b border-gray-200 bg-gray-100 px-4 py-2.5">
                  <div className="h-3 w-3 rounded-full bg-red-400" />
                  <div className="h-3 w-3 rounded-full bg-yellow-400" />
                  <div className="h-3 w-3 rounded-full bg-green-400" />
                  <div className="ml-3 flex-1 rounded-md bg-white px-3 py-1 text-[11px] text-gray-400">hr@crossways.carestreamai.co.uk</div>
                </div>
                <div className="border-b border-gray-100 bg-white px-5 py-4">
                  <div className="mb-0.5 text-[11px] text-gray-400">From: <span className="text-gray-600">Anya Kowalski &lt;a.kowalski@crosswayscare.co.uk&gt;</span></div>
                  <div className="mb-0.5 text-[11px] text-gray-400">To: <span className="text-gray-600">hr@crossways.carestreamai.co.uk</span></div>
                  <div className="text-[11px] text-gray-400">Subject: <span className="font-semibold text-gray-800">Sick pay question</span></div>
                </div>
                <div className="bg-white px-5 py-4">
                  <p className="mb-3 text-xs text-gray-600">What is the sick pay policy if I am off for more than a week? I have not been here long and am not sure what I am entitled to.</p>
                  <div className="rounded-lg border-l-4 border-teal bg-teal/5 p-4">
                    <p className="mb-1 text-xs font-bold text-teal">From your Staff Handbook: Sick Pay</p>
                    <div className="space-y-2 text-[11px] leading-relaxed text-gray-700">
                      <p>During your probationary period (first 6 months), the service pays Statutory Sick Pay (SSP) from day 4 of absence.</p>
                      <p>After completing 6 months, you are entitled to contractual sick pay: full pay for the first 2 weeks, then SSP for a further 4 weeks, subject to a return-to-work meeting.</p>
                      <p>All absences over 7 days require a fit note from your GP.</p>
                    </div>
                    <p className="mt-2 text-[10px] italic text-gray-400">Source: Staff Handbook, Section 8.3, Sick Pay and Absence</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="order-1 lg:order-2">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100">
                  <Mail size={18} className="text-blue-600" />
                </div>
                <span className="text-xl font-bold text-neutral-dark">{s('action.email.label')}</span>
              </div>
              <h3 className="mb-4 text-2xl font-extrabold leading-tight text-neutral-dark">
                {s('action.email.h3')}
              </h3>
              <div className={`mb-4 text-lg leading-relaxed text-neutral-mid ${RICH_LINK}`} dangerouslySetInnerHTML={{ __html: s('action.email.p1') }} />
              <div className={`text-lg leading-relaxed text-neutral-mid ${RICH_LINK}`} dangerouslySetInnerHTML={{ __html: s('action.email.p2') }} />
            </div>
          </div>
        </div>
      </section>

      {/* ── Handbook topics ───────────────────────────────────────────────── */}
      <section className="bg-teal-gradient py-24">
        <div className="mx-auto max-w-content px-6">
          <SectionLabel light>{s('topics.label')}</SectionLabel>
          <h2 className="mb-6 text-4xl font-extrabold leading-tight text-white">
            {s('topics.h2')}
          </h2>
          <p className="mb-14 text-lg leading-relaxed text-white/80">
            {s('topics.intro')}
          </p>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[
              { Icon: Clock,      key: 'topics.card1' },
              { Icon: ShieldCheck, key: 'topics.card2' },
              { Icon: Users,      key: 'topics.card3' },
              { Icon: Zap,        key: 'topics.card4' },
              { Icon: BookOpen,   key: 'topics.card5' },
              { Icon: Bell,       key: 'topics.card6' },
            ].map(({ Icon, key }) => (
              <div key={key} className="card-lift rounded-2xl border border-white/20 bg-white/10 p-6 backdrop-blur-sm">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-white/20">
                  <Icon size={18} className="text-white" />
                </div>
                <h3 className="mb-2 font-bold text-white">{s(`${key}.title`)}</h3>
                <p className="text-sm leading-relaxed text-white/75">{s(`${key}.body`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Equality and confidence ───────────────────────────────────────── */}
      <section className="bg-white py-24">
        <div className="mx-auto max-w-content px-6">
          <SectionLabel>{s('equality.label')}</SectionLabel>
          <h2 className="mb-6 text-4xl font-extrabold leading-tight text-neutral-dark">
            {s('equality.h2')}
          </h2>
          <div className={`mb-12 text-lg leading-relaxed text-neutral-mid ${RICH_LINK}`} dangerouslySetInnerHTML={{ __html: s('equality.p1') }} />
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-card">
            <div className="grid grid-cols-[1fr_2fr] border-b border-gray-100 bg-neutral-light px-6 py-4 text-xs font-bold uppercase tracking-widest text-neutral-mid">
              <span>{s('equality.tableHead1')}</span>
              <span>{s('equality.tableHead2')}</span>
            </div>
            {[
              'equality.row1', 'equality.row2', 'equality.row3',
              'equality.row4', 'equality.row5', 'equality.row6',
            ].map((key, i) => (
              <div key={key} className={`grid grid-cols-[1fr_2fr] px-6 py-5 ${i < 5 ? 'border-b border-gray-100' : ''}`}>
                <div className="flex items-start gap-2 pr-4">
                  <CheckCircle2 size={15} className="mt-0.5 flex-shrink-0 text-teal" />
                  <span className="font-semibold text-neutral-dark">{s(`${key}.what`)}</span>
                </div>
                <span className="text-sm leading-relaxed text-neutral-mid">{s(`${key}.why`)}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Feature summary ───────────────────────────────────────────────── */}
      <section className="bg-neutral-light py-24">
        <div className="mx-auto max-w-content px-6">
          <SectionLabel>{s('features.label')}</SectionLabel>
          <h2 className="mb-12 text-4xl font-extrabold text-neutral-dark">
            {s('features.h2')}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: BookOpen,      key: 'features.card1', iconBg: 'bg-blue-100',   iconColor: 'text-blue-600'   },
              { icon: Layers,        key: 'features.card2', iconBg: 'bg-green-100',  iconColor: 'text-green-600'  },
              { icon: Smartphone,    key: 'features.card3', iconBg: 'bg-teal-light', iconColor: 'text-teal'       },
              { icon: Languages,     key: 'features.card4', iconBg: 'bg-purple-100', iconColor: 'text-purple-600' },
              { icon: Mic,           key: 'features.card5', iconBg: 'bg-amber-100',  iconColor: 'text-amber-600'  },
              { icon: CheckCircle2,  key: 'features.card6', iconBg: 'bg-orange-100', iconColor: 'text-orange-600' },
              { icon: BarChart2,     key: 'features.card7', iconBg: 'bg-indigo-100', iconColor: 'text-indigo-600' },
              { icon: Lock,          key: 'features.card8', iconBg: 'bg-cyan-100',   iconColor: 'text-cyan-600'   },
            ].map(({ icon: Icon, key, iconBg, iconColor }) => (
              <div key={key} className="card-lift rounded-2xl border border-gray-100 bg-white p-6 shadow-card">
                <div className={`mb-4 flex h-9 w-9 items-center justify-center rounded-lg ${iconBg}`}>
                  <Icon size={16} className={iconColor} />
                </div>
                <p className="mb-1.5 font-semibold text-neutral-dark">{s(`${key}.title`)}</p>
                <p className="text-sm leading-relaxed text-neutral-mid">{s(`${key}.body`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Stats ─────────────────────────────────────────────────────────── */}
      <section className="bg-white py-24">
        <div className="mx-auto max-w-4xl px-6">
          <div className="grid gap-16 text-center md:gap-0 md:grid-cols-2 md:divide-x md:divide-gray-100">
            <div className="md:px-12">
              <p className="mb-6 text-5xl font-extrabold leading-none text-teal">{s('stats.stat1.figure')}</p>
              <p className="mb-5 text-xl font-bold leading-snug text-neutral-dark">
                {s('stats.stat1.label')}
              </p>
              <p className="text-base leading-loose text-neutral-mid">
                {s('stats.stat1.body')}
              </p>
            </div>
            <div className="md:px-12">
              <p className="mb-6 text-5xl font-extrabold leading-none text-teal">{s('stats.stat2.figure')}</p>
              <p className="mb-5 text-xl font-bold leading-snug text-neutral-dark">
                {s('stats.stat2.label')}
              </p>
              <p className="text-base leading-loose text-neutral-mid">
                {s('stats.stat2.body')}
              </p>
            </div>
          </div>
        </div>
      </section>

      <EditableContentBlock path="/hr-policies" />

      <PageCta
        heading="Give every member of your team equal access to the information they are entitled to."
        sub="See how CareStream HR policies work for your service."
        primary={{ label: 'Book a demo', href: '/demo' }}
        secondary={{ label: 'See pricing', href: '/pricing' }}
      />
    </>
  )
}
