import Link from 'next/link'
import {
  MessageSquare, Mail, FileText, BookOpen,
  Upload, Layers, ShieldAlert, ClipboardCheck, BadgeCheck,
  Check, Zap, Search, TrendingUp,
} from 'lucide-react'
import { PageCta, SectionLabel } from '@/components/marketing/ui'
import { EditableContentBlock } from '@/components/marketing/editable-content-block'
import { getContentSlots, makeSlot } from '@/lib/page-slots'
import { CARE_POLICIES_SLOTS } from '@/lib/page-slots/care-policies'

const RICH_LINK = '[&_a]:font-semibold [&_a]:text-teal [&_a]:underline [&_a]:underline-offset-2'
const RICH_LINK_WHITE = '[&_a]:font-semibold [&_a]:text-white [&_a]:underline [&_a]:underline-offset-2'

export const metadata = {
  alternates: { canonical: 'https://www.carestreamai.com/care-policies' },
  title: 'Care Policies',
  description: 'Upload your policy library once. Your entire team can then query any policy in 60+ languages, instantly, in the hub or by email, with every interaction logged.',
  openGraph: {
    title: 'Care Policies | CareStreamAI',
    description: 'Digital policy access for your entire team, in 60+ languages, in the hub or by email.',
    url: 'https://www.carestreamai.com/care-policies',
  },
}

// ── Feature Dashboard Mockup ──────────────────────────────────────────────────

function FeatureDashboardMockup() {
  return (
    <div className="w-full max-w-[400px] overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-white/20">
      <div className="bg-teal px-5 py-4">
        <p className="text-[10px] font-bold uppercase tracking-widest text-white/60">CareStream</p>
        <p className="text-sm font-bold text-white">Crossways Care Home · Dashboard</p>
      </div>
      <div className="grid grid-cols-3 divide-x divide-gray-100 border-b border-gray-100 bg-gray-50">
        {[
          { label: 'Queries this month', value: '847' },
          { label: 'Staff active',       value: '26' },
          { label: 'Languages used',     value: '8' },
        ].map(({ label, value }) => (
          <div key={label} className="py-3 text-center">
            <p className="text-base font-extrabold text-neutral-dark">{value}</p>
            <p className="text-[9px] text-neutral-mid">{label}</p>
          </div>
        ))}
      </div>
      <div className="border-b border-gray-100 px-5 py-4">
        <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-neutral-mid">Queries by channel</p>
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Hub',   count: 605, color: 'bg-teal' },
            { label: 'Email', count: 182, color: 'bg-blue-500' },
            { label: 'Voice', count: 60,  color: 'bg-purple-500' },
          ].map(({ label, count, color }) => (
            <div key={label} className="text-center">
              <div className="mx-auto mb-1.5 flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100">
                <div className={`h-3 w-3 rounded-full ${color}`} />
              </div>
              <p className="text-xs font-bold text-neutral-dark">{count}</p>
              <p className="text-[9px] text-neutral-mid">{label}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="px-5 py-4">
        <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-neutral-mid">Top policies this month</p>
        <div className="space-y-2.5">
          {[
            { name: 'Medication Administration', queries: 134, pct: 100 },
            { name: 'Safeguarding Adults',        queries: 112, pct: 84 },
            { name: 'Falls Management',           queries: 89,  pct: 66 },
          ].map(({ name, queries, pct }) => (
            <div key={name}>
              <div className="mb-0.5 flex items-center justify-between">
                <p className="text-[11px] font-medium text-neutral-dark">{name}</p>
                <p className="text-[10px] text-neutral-mid">{queries}</p>
              </div>
              <div className="h-1 w-full overflow-hidden rounded-full bg-gray-100">
                <div className="h-1 rounded-full bg-teal" style={{ width: `${pct}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

export default async function FeaturesPage() {
  const s = makeSlot(CARE_POLICIES_SLOTS, await getContentSlots('/care-policies'))

  const HUB_ITEMS = ['channels.hub.item1', 'channels.hub.item2', 'channels.hub.item3', 'channels.hub.item4', 'channels.hub.item5']
  const EMAIL_ITEMS = ['channels.email.item1', 'channels.email.item2', 'channels.email.item3', 'channels.email.item4', 'channels.email.item5']

  const MULTILINGUAL_STATS = [
    { key: 'multilingual.stat1' },
    { key: 'multilingual.stat2' },
    { key: 'multilingual.stat3' },
    { key: 'multilingual.stat4' },
  ]

  const POLICY_CARDS = [
    { Icon: Upload,        bg: 'bg-teal-light', color: 'text-teal',        key: 'policyMgmt.card1' },
    { Icon: Zap,           bg: 'bg-amber-50',   color: 'text-amber-brand', key: 'policyMgmt.card2' },
    { Icon: FileText,      bg: 'bg-blue-50',    color: 'text-blue-600',    key: 'policyMgmt.card3' },
    { Icon: Search,        bg: 'bg-purple-50',  color: 'text-purple-600',  key: 'policyMgmt.card4' },
    { Icon: TrendingUp,    bg: 'bg-green-50',   color: 'text-green-700',   key: 'policyMgmt.card5' },
    { Icon: ClipboardCheck, bg: 'bg-red-50',    color: 'text-red-500',     key: 'policyMgmt.card6' },
    { Icon: BookOpen,      bg: 'bg-teal-light', color: 'text-teal',        key: 'policyMgmt.card7' },
    { Icon: Layers,        bg: 'bg-amber-50',   color: 'text-amber-brand', key: 'policyMgmt.card8' },
    { Icon: BadgeCheck,    bg: 'bg-blue-50',    color: 'text-blue-600',    key: 'policyMgmt.card9' },
  ]

  const REGULATORY_STEPS = [
    { Icon: FileText,      color: 'text-teal',       bg: 'bg-teal/20',        key: 'regulatory.step1' },
    { Icon: Layers,        color: 'text-amber-brand', bg: 'bg-amber-brand/20', key: 'regulatory.step2' },
    { Icon: MessageSquare, color: 'text-purple-400', bg: 'bg-purple-500/20',  key: 'regulatory.step3' },
  ]

  const FRAMEWORKS = [
    { key: 'regulatory.fw1' },
    { key: 'regulatory.fw2' },
    { key: 'regulatory.fw3' },
    { key: 'regulatory.fw4' },
    { key: 'regulatory.fw5' },
    { key: 'regulatory.fw6' },
    { key: 'regulatory.fw7' },
    { key: 'regulatory.fw8' },
  ]

  const KNOWLEDGE_ROWS = [
    { key: 'knowledge.row1' },
    { key: 'knowledge.row2' },
    { key: 'knowledge.row3' },
    { key: 'knowledge.row4' },
  ]

  const GAP_ITEMS = [
    { key: 'gap.item1' },
    { key: 'gap.item2' },
    { key: 'gap.item3' },
    { key: 'gap.item4' },
  ]

  const ANALYTICS_ROWS: { key: string; starter: boolean; pro: boolean }[] = [
    { key: 'analytics.feat1',  starter: true,  pro: true },
    { key: 'analytics.feat2',  starter: true,  pro: true },
    { key: 'analytics.feat3',  starter: true,  pro: true },
    { key: 'analytics.feat4',  starter: true,  pro: true },
    { key: 'analytics.feat5',  starter: true,  pro: true },
    { key: 'analytics.feat6',  starter: true,  pro: true },
    { key: 'analytics.feat7',  starter: true,  pro: true },
    { key: 'analytics.feat8',  starter: false, pro: true },
    { key: 'analytics.feat9',  starter: false, pro: true },
    { key: 'analytics.feat10', starter: false, pro: true },
    { key: 'analytics.feat11', starter: false, pro: true },
    { key: 'analytics.feat12', starter: false, pro: true },
  ]

  const SECURITY_ITEMS = [
    { key: 'security.item1' },
    { key: 'security.item2' },
    { key: 'security.item3' },
    { key: 'security.item4' },
  ]

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
              <div className={`mb-8 max-w-xl text-lg leading-relaxed text-white/75 ${RICH_LINK_WHITE}`} dangerouslySetInnerHTML={{ __html: s('hero.intro') }} />
              <div className="flex flex-col gap-3 sm:flex-row">
                <Link href="/register" className="btn-amber rounded-btn px-8 py-4 text-sm">
                  {s('hero.cta1')}
                </Link>
                <Link href="/demo" className="btn-ghost-white rounded-btn px-8 py-4 text-sm">
                  {s('hero.cta2')}
                </Link>
              </div>
            </div>
            <div className="flex justify-center lg:justify-end">
              <FeatureDashboardMockup />
            </div>
          </div>
        </div>
      </section>

      {/* 1. Channels */}
      <section className="bg-white py-24">
        <div className="mx-auto max-w-content px-6">
          <SectionLabel>{s('channels.label')}</SectionLabel>
          <h2 className="mb-4 text-4xl font-extrabold leading-tight text-neutral-dark md:text-5xl">
            {s('channels.h2')}
          </h2>
          <div className={`mb-14 text-lg leading-relaxed text-neutral-mid ${RICH_LINK}`} dangerouslySetInnerHTML={{ __html: s('channels.intro') }} />

          <div className="grid gap-6 lg:grid-cols-2">

            <div className="card-lift rounded-2xl border border-gray-100 bg-white p-8 shadow-card">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-light">
                  <MessageSquare size={22} className="text-teal" />
                </div>
                <div>
                  <p className="font-bold text-neutral-dark">{s('channels.hub.title')}</p>
                  <p className="text-xs text-neutral-mid">{s('channels.hub.subtitle')}</p>
                </div>
              </div>
              <div className={`mb-5 leading-relaxed text-neutral-mid ${RICH_LINK}`} dangerouslySetInnerHTML={{ __html: s('channels.hub.body') }} />
              <ul className="space-y-2 text-sm text-neutral-mid">
                {HUB_ITEMS.map(k => (
                  <li key={k} className="flex items-start gap-2">
                    <Check size={13} className="mt-0.5 shrink-0 text-teal" />{s(k)}
                  </li>
                ))}
              </ul>
            </div>

            <div className="card-lift rounded-2xl border border-gray-100 bg-white p-8 shadow-card">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50">
                  <Mail size={22} className="text-blue-600" />
                </div>
                <div>
                  <p className="font-bold text-neutral-dark">{s('channels.email.title')}</p>
                  <p className="text-xs text-neutral-mid">{s('channels.email.subtitle')}</p>
                </div>
              </div>
              <div className={`mb-5 leading-relaxed text-neutral-mid ${RICH_LINK}`} dangerouslySetInnerHTML={{ __html: s('channels.email.body') }} />
              <ul className="space-y-2 text-sm text-neutral-mid">
                {EMAIL_ITEMS.map(k => (
                  <li key={k} className="flex items-start gap-2">
                    <Check size={13} className="mt-0.5 shrink-0 text-blue-500" />{s(k)}
                  </li>
                ))}
              </ul>
            </div>

          </div>
        </div>
      </section>

      {/* 2. Multilingual */}
      <section className="bg-neutral-light py-24">
        <div className="mx-auto max-w-content px-6">
          <div className="grid items-center gap-16 lg:grid-cols-2">
            <div>
              <SectionLabel>{s('multilingual.label')}</SectionLabel>
              <h2 className="mb-5 text-4xl font-extrabold leading-tight text-neutral-dark md:text-5xl">
                {s('multilingual.h2')}
              </h2>
              <div className={`mb-6 text-lg leading-relaxed text-neutral-mid ${RICH_LINK}`} dangerouslySetInnerHTML={{ __html: s('multilingual.p1') }} />
              <div className={`mb-8 text-lg leading-relaxed text-neutral-mid ${RICH_LINK}`} dangerouslySetInnerHTML={{ __html: s('multilingual.p2') }} />
              <div className="grid grid-cols-2 gap-4">
                {MULTILINGUAL_STATS.map(({ key }) => (
                  <div key={key} className="rounded-2xl bg-white p-5 shadow-card">
                    <p className="mb-1 text-2xl font-extrabold text-teal">{s(`${key}.value`)}</p>
                    <p className="text-sm text-neutral-mid">{s(`${key}.label`)}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-3">
              <p className="mb-4 text-xs font-bold uppercase tracking-widest text-neutral-mid">
                {s('multilingual.demoTitle')}
              </p>
              {[
                { flag: '🇵🇭', lang: 'Tagalog',  q: 'Ano ang gagawin ko pagkatapos ng pagbagsak ng residente?' },
                { flag: '🇵🇱', lang: 'Polish',   q: 'Co powinienem zrobić po upadku mieszkańca?' },
                { flag: '🇷🇴', lang: 'Romanian', q: 'Ce trebuie să fac după ce un rezident cade?' },
                { flag: '🇮🇳', lang: 'Hindi',    q: 'निवासी के गिरने के बाद मुझे क्या करना चाहिए?' },
                { flag: '🇳🇬', lang: 'Yoruba',   q: 'Kini mo yẹ ki n ṣe lẹhin ti olugbe ba subu?' },
                { flag: '🇸🇴', lang: 'Somali',   q: 'Maxaan samayn karaa marka martida ay dhacdo?' },
              ].map(({ flag, lang, q }) => (
                <div key={lang} className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-card">
                  <span className="text-xl">{flag}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-neutral-dark">{q}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-teal/10 px-2.5 py-1 text-[10px] font-bold text-teal">{lang} detected</span>
                </div>
              ))}
              <p className="pt-1 text-center text-xs text-neutral-mid">
                {s('multilingual.demoCaption')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Policy management */}
      <section className="bg-white py-24">
        <div className="mx-auto max-w-content px-6">
          <SectionLabel>{s('policyMgmt.label')}</SectionLabel>
          <h2 className="mb-4 text-4xl font-extrabold leading-tight text-neutral-dark md:text-5xl">
            {s('policyMgmt.h2')}
          </h2>
          <div className={`mb-14 text-lg leading-relaxed text-neutral-mid ${RICH_LINK}`} dangerouslySetInnerHTML={{ __html: s('policyMgmt.intro') }} />

          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {POLICY_CARDS.map(({ Icon, bg, color, key }) => (
              <div key={key} className="card-lift rounded-2xl border border-gray-100 bg-white p-7 shadow-card">
                <div className={`mb-5 flex h-12 w-12 items-center justify-center rounded-2xl ${bg}`}>
                  <Icon size={22} className={color} />
                </div>
                <h3 className="mb-3 font-bold text-neutral-dark">{s(`${key}.title`)}</h3>
                <p className="text-sm leading-relaxed text-neutral-mid">{s(`${key}.body`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. Regulatory intelligence */}
      <section className="bg-neutral-dark py-24">
        <div className="mx-auto max-w-content px-6">
          <SectionLabel light>{s('regulatory.label')}</SectionLabel>
          <h2 className="mb-5 text-4xl font-extrabold leading-tight text-white md:text-5xl">
            {s('regulatory.h2')}
          </h2>
          <div className={`mb-12 text-lg leading-relaxed text-gray-300 ${RICH_LINK_WHITE}`} dangerouslySetInnerHTML={{ __html: s('regulatory.intro') }} />

          <div className="grid gap-8 lg:grid-cols-2">
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
              <div className="border-b border-white/10 px-6 py-4">
                <p className="text-xs font-semibold uppercase tracking-widest text-white/50">{s('regulatory.howLabel')}</p>
              </div>
              <div className="divide-y divide-white/10">
                {REGULATORY_STEPS.map(({ Icon, color, bg, key }) => (
                  <div key={key} className="flex gap-4 px-6 py-5">
                    <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${bg}`}>
                      <Icon size={16} className={color} />
                    </div>
                    <div>
                      <p className="mb-1 font-semibold text-white">{s(`${key}.title`)}</p>
                      <p className="text-sm leading-relaxed text-gray-400">{s(`${key}.body`)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-4 text-xs font-bold uppercase tracking-widest text-white/50">{s('regulatory.frameworksLabel')}</p>
              <div className="space-y-2.5">
                {FRAMEWORKS.map(({ key }) => (
                  <div key={key} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                    <span className="text-sm font-medium text-white/80">{s(`${key}.name`)}</span>
                    <span className="shrink-0 rounded-full bg-amber-brand/20 px-2.5 py-0.5 text-[10px] font-bold text-amber-brand">{s(`${key}.reg`)}</span>
                  </div>
                ))}
                <div className="rounded-xl bg-teal/20 px-4 py-3 text-center">
                  <span className="text-sm font-semibold text-teal">{s('regulatory.frameworksMore')}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Knowledge base */}
      <section className="bg-white py-24">
        <div className="mx-auto max-w-content px-6">
          <SectionLabel>{s('knowledge.label')}</SectionLabel>
          <h2 className="mb-6 text-4xl font-extrabold leading-tight text-neutral-dark md:text-5xl" dangerouslySetInnerHTML={{ __html: s('knowledge.h2') }} />
          <div className={`mb-6 text-lg leading-relaxed text-neutral-mid ${RICH_LINK}`} dangerouslySetInnerHTML={{ __html: s('knowledge.p1') }} />
          <div className={`mb-14 text-lg leading-relaxed text-neutral-mid ${RICH_LINK}`} dangerouslySetInnerHTML={{ __html: s('knowledge.p2') }} />

          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-elevated">
            <div className="grid grid-cols-3 border-b border-gray-100 bg-neutral-light px-6 py-4 text-xs font-bold uppercase tracking-widest text-neutral-mid">
              <span>{s('knowledge.col1')}</span>
              <span>{s('knowledge.col2')}</span>
              <span className="text-amber-brand">{s('knowledge.col3')}</span>
            </div>
            {KNOWLEDGE_ROWS.map(({ key }, i) => (
              <div key={key} className={`grid grid-cols-3 px-6 py-5 text-sm ${i < 3 ? 'border-b border-gray-100' : ''}`}>
                <span className="pr-4 font-medium text-neutral-dark">{s(`${key}.q`)}</span>
                <span className="pr-4 italic text-neutral-mid/60">{s(`${key}.generic`)}</span>
                <span className="font-medium text-neutral-dark">{s(`${key}.specific`)}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. Policy gap detection */}
      <section className="bg-neutral-light py-24">
        <div className="mx-auto max-w-content px-6">
          <div className="grid items-center gap-16 lg:grid-cols-2">
            <div>
              <SectionLabel>{s('gap.label')}</SectionLabel>
              <h2 className="mb-5 text-4xl font-extrabold leading-tight text-neutral-dark md:text-5xl">
                {s('gap.h2')}
              </h2>
              <div className={`mb-6 text-lg leading-relaxed text-neutral-mid ${RICH_LINK}`} dangerouslySetInnerHTML={{ __html: s('gap.p1') }} />
              <div className={`mb-8 text-lg leading-relaxed text-neutral-mid ${RICH_LINK}`} dangerouslySetInnerHTML={{ __html: s('gap.p2') }} />
              <div className="space-y-4">
                {GAP_ITEMS.map(({ key }) => (
                  <div key={key} className="flex gap-4">
                    <div className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-brand">
                      <ShieldAlert size={12} className="text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-neutral-dark">{s(`${key}.title`)}</p>
                      <p className="text-sm leading-relaxed text-neutral-mid">{s(`${key}.body`)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-elevated">
              <div className="border-b border-gray-100 px-6 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold text-neutral-dark">Policy Gap Report</p>
                    <p className="text-xs text-neutral-mid">Last 30 days</p>
                  </div>
                  <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-brand">4 gaps found</span>
                </div>
              </div>
              <div className="divide-y divide-gray-50">
                {[
                  { q: 'What is the procedure for end-of-life care documentation?', count: 14, gap: true },
                  { q: 'How do we handle a resident requesting to leave against advice?', count: 9, gap: true },
                  { q: 'What is the medication review process for new admissions?', count: 22, gap: false },
                  { q: 'Who authorises CCTV footage requests?', count: 6, gap: true },
                  { q: 'What is the falls risk score threshold for bed rails?', count: 18, gap: false },
                  { q: 'Can a resident refuse a bath?', count: 11, gap: true },
                ].map(({ q, count, gap }) => (
                  <div key={q} className="flex items-start gap-3 px-6 py-4">
                    <div className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${gap ? 'bg-red-50' : 'bg-green-50'}`}>
                      {gap
                        ? <ShieldAlert size={10} className="text-red-500" />
                        : <Check size={10} className="text-green-600" />
                      }
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-neutral-dark">{q}</p>
                      <p className="mt-0.5 text-xs text-neutral-mid">{count} queries this month</p>
                    </div>
                    {gap && <span className="shrink-0 rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-600">Gap</span>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. Analytics */}
      <section className="bg-white py-24">
        <div className="mx-auto max-w-content px-6">
          <SectionLabel>{s('analytics.label')}</SectionLabel>
          <h2 className="mb-5 text-4xl font-extrabold text-neutral-dark md:text-5xl">
            {s('analytics.h2')}
          </h2>
          <div className={`mb-14 text-lg leading-relaxed text-neutral-mid ${RICH_LINK}`} dangerouslySetInnerHTML={{ __html: s('analytics.intro') }} />
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-card">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-100 bg-neutral-light text-left text-xs font-bold uppercase tracking-widest text-neutral-mid">
                <tr>
                  <th className="px-6 py-4">{s('analytics.colFeature')}</th>
                  <th className="px-6 py-4 text-center">{s('analytics.colStarter')}</th>
                  <th className="px-6 py-4 text-center">{s('analytics.colPro')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {ANALYTICS_ROWS.map(({ key, starter, pro }) => (
                  <tr key={key} className="hover:bg-neutral-light/50">
                    <td className="px-6 py-3.5 text-neutral-dark">{s(key)}</td>
                    <td className="px-6 py-3.5 text-center">
                      {starter ? <Check size={16} className="mx-auto text-teal" /> : <span className="text-xs text-gray-300">{s('analytics.notIncluded')}</span>}
                    </td>
                    <td className="px-6 py-3.5 text-center">
                      {pro ? <Check size={16} className="mx-auto text-teal" /> : <span className="text-xs text-gray-300">{s('analytics.notIncluded')}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* 8. Security */}
      <section className="bg-neutral-light py-20">
        <div className="mx-auto max-w-content px-6">
          <div className="rounded-2xl bg-neutral-dark px-10 py-12">
            <div className="grid items-center gap-10 lg:grid-cols-2">
              <div>
                <SectionLabel light>{s('security.label')}</SectionLabel>
                <h2 className="mb-5 text-3xl font-extrabold text-white md:text-4xl">
                  {s('security.h2')}
                </h2>
                <div className={`text-lg leading-relaxed text-gray-300 ${RICH_LINK_WHITE}`} dangerouslySetInnerHTML={{ __html: s('security.body') }} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                {SECURITY_ITEMS.map(({ key }) => (
                  <div key={key} className="rounded-xl border border-white/10 bg-white/5 p-4">
                    <p className="mb-1 font-semibold text-white">{s(`${key}.label`)}</p>
                    <p className="text-xs leading-relaxed text-white/50">{s(`${key}.detail`)}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <EditableContentBlock path="/care-policies" />

      <PageCta
        heading="Try every feature free for 14 days."
        sub="No charge until day 14. No commitment. Cancel any time."
        primary={{ href: '/register', label: 'Start Free Trial' }}
        secondary={{ href: '/demo', label: 'Book a Demo' }}
      />
    </>
  )
}
