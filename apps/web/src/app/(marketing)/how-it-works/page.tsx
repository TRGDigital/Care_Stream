import Link from 'next/link'
import {
  ArrowRight, Upload, Search, Zap, ClipboardCheck, Globe, Mail, MessageSquare,
  Mic, BarChart2, ShieldAlert, BookOpen, Layers, Check, FileText, Users, Lock,
  Smartphone, GraduationCap, RefreshCw, Calendar, Bell,
} from 'lucide-react'
import { PageCta, SectionLabel } from '@/components/marketing/ui'
import { pageMetadata } from '@/lib/page-meta'
import { EditableContentBlock } from '@/components/marketing/editable-content-block'
import { getContentSlots, makeSlot } from '@/lib/page-slots'
import { HOW_IT_WORKS_SLOTS } from '@/lib/page-slots/how-it-works'

const RICH_LINK = '[&_a]:font-semibold [&_a]:text-teal [&_a]:underline [&_a]:underline-offset-2'
const RICH_LINK_WHITE = '[&_a]:font-semibold [&_a]:text-white [&_a]:underline [&_a]:underline-offset-2'

// Overridable from the platform console (Blog → Pages / site_pages).
export const generateMetadata = () => pageMetadata('/how-it-works', {
  title:       'How It Works',
  description: 'CareStreamAI in three steps: upload your policies, your team uses the hub or email in 60+ languages, and your training and CQC evidence build automatically.',
})

// ── Chat Demo Mockup ──────────────────────────────────────────────────────────

function ChatDemoMockup() {
  return (
    <div className="w-full max-w-[380px] overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-white/20">
      <div className="flex items-center justify-between bg-teal px-4 py-3">
        <div>
          <p className="text-sm font-bold text-white">CareStreamAI</p>
          <p className="text-[11px] text-white/70">Crossways Care Home</p>
        </div>
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20 text-xs font-bold text-white">SJ</div>
      </div>
      <div className="space-y-3 bg-gray-50 p-4">
        <div className="flex justify-end">
          <div className="max-w-[85%] rounded-tl-2xl rounded-tr-sm rounded-bl-2xl rounded-br-2xl bg-teal px-4 py-2.5">
            <p className="text-xs font-medium text-white">
              A resident has just fallen. What do I need to document before the end of my shift?
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-teal text-[9px] font-bold text-white">CS</div>
          <div className="max-w-[88%] rounded-tl-sm rounded-tr-2xl rounded-br-2xl rounded-bl-2xl bg-white p-3 shadow-sm">
            <p className="mb-2 text-xs font-semibold text-neutral-dark">Before end of shift you must complete:</p>
            <div className="space-y-1 text-[11px] text-neutral-mid">
              {[
                'Post-fall observation record (every 30 min for 4 hours)',
                'Accident and incident form in the resident file',
                'Notify next of kin if any injury observed or suspected',
              ].map((point, i) => (
                <div key={i} className="flex items-start gap-1.5">
                  <span className="mt-0.5 flex-shrink-0 font-bold text-teal">{i + 1}.</span>
                  <p>{point}</p>
                </div>
              ))}
            </div>
            <div className="mt-2.5 flex items-center gap-1.5 rounded-lg bg-teal/5 px-2 py-1.5">
              <div className="h-2 w-2 flex-shrink-0 rounded-full bg-teal" />
              <p className="text-[10px] font-medium text-teal">Source: Falls and Post-Fall Management Policy, Section 4.2</p>
            </div>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-4 border-t border-gray-100 bg-gray-50 px-4 py-2.5">
        {[
          { color: 'bg-teal', label: 'Logged to audit trail' },
          { color: 'bg-green-500', label: 'Source cited' },
          { color: 'bg-blue-500', label: 'Via: Hub' },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1.5">
            <div className={`h-1.5 w-1.5 rounded-full ${color}`} />
            <p className="text-[10px] text-neutral-mid">{label}</p>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 border-t border-gray-200 bg-white px-3 py-2.5">
        <div className="flex-1 rounded-full border border-gray-200 px-4 py-1.5 text-[11px] text-gray-300">Ask a policy question...</div>
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-teal text-white">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
        </div>
      </div>
    </div>
  )
}

// ── Hub mockup (self-contained, no iframe) ───────────────────────────────────
function HubMockup() {
  return (
    <div className="mx-auto w-full max-w-[360px] overflow-hidden rounded-[28px] border-[6px] border-neutral-dark bg-white shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between bg-teal px-4 py-3">
        <div>
          <p className="text-sm font-bold text-white">The hub</p>
          <p className="text-[11px] text-white/70">Crossways Care Home</p>
        </div>
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20 text-xs font-bold text-white">SJ</div>
      </div>
      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-100 bg-white px-3 pt-2">
        {([['Ask', true], ['Policies', false], ['Training', false]] as const).map(([t, active]) => (
          <div key={t} className={`rounded-t-lg px-3 py-2 text-[11px] font-semibold ${active ? 'bg-teal-light text-teal' : 'text-neutral-mid'}`}>{t}</div>
        ))}
      </div>
      {/* Body */}
      <div className="space-y-3 bg-gray-50 p-4">
        <div className="flex justify-end">
          <div className="max-w-[82%] rounded-2xl rounded-tr-sm bg-teal px-3 py-2 text-[11px] font-medium text-white">
            Ano ang gagawin ko pagkatapos ng pagbagsak ng residente?
          </div>
        </div>
        <div className="flex gap-2">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal text-[9px] font-bold text-white">CS</div>
          <div className="max-w-[86%] rounded-2xl rounded-tl-sm bg-white p-3 shadow-sm">
            <p className="mb-1.5 text-[11px] font-semibold text-neutral-dark">After a fall, before end of shift:</p>
            <div className="space-y-1 text-[10px] text-neutral-mid">
              {['Complete the post-fall observation record', 'Log the incident in the resident file', 'Tell next of kin if injury is suspected'].map((p, i) => (
                <div key={i} className="flex items-start gap-1.5"><span className="font-bold text-teal">{i + 1}.</span><p>{p}</p></div>
              ))}
            </div>
            <div className="mt-2 flex items-center gap-1.5 rounded-lg bg-teal/5 px-2 py-1">
              <div className="h-1.5 w-1.5 rounded-full bg-teal" />
              <p className="text-[9px] font-medium text-teal">Source: Falls Policy, Section 4.2</p>
            </div>
            <span className="mt-2 inline-block rounded-full bg-teal/10 px-2 py-0.5 text-[9px] font-bold text-teal">Tagalog detected</span>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-amber-100 bg-amber-50 px-3 py-2">
          <GraduationCap size={14} className="shrink-0 text-amber-brand" />
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold text-neutral-dark">New training assigned</p>
            <p className="truncate text-[9px] text-neutral-mid">Fire Safety, due in 14 days</p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

export default async function HowItWorksPage() {
  const s = makeSlot(HOW_IT_WORKS_SLOTS, await getContentSlots('/how-it-works'))
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
                <Link href="/register" className="btn-amber rounded-btn px-8 py-4 text-sm">
                  Start Free Trial
                </Link>
                <Link href="/demo" className="btn-ghost-white rounded-btn px-8 py-4 text-sm">
                  Book a Demo
                </Link>
              </div>
            </div>
            <div className="flex justify-center lg:justify-end">
              <ChatDemoMockup />
            </div>
          </div>
        </div>
      </section>

      {/* ── 1. Getting started ─────────────────────────────────────────────── */}
      <section className="bg-white py-24">
        <div className="mx-auto max-w-content px-6">
          <SectionLabel>{s('start.label')}</SectionLabel>
          <h2 className="mb-4 text-4xl font-extrabold leading-tight text-neutral-dark md:text-5xl">
            {s('start.h2')}
          </h2>
          <p className="mb-14 max-w-2xl text-lg leading-relaxed text-neutral-mid">
            {s('start.intro')}
          </p>

          <div className="grid gap-6 md:grid-cols-3">
            {[
              { step: '01', Icon: Upload, key: 'start.step1' },
              { step: '02', Icon: Search, key: 'start.step2' },
              { step: '03', Icon: Zap,    key: 'start.step3' },
            ].map(({ step, Icon, key }) => (
              <div key={step} className="card-lift rounded-2xl border border-gray-100 bg-white p-7 shadow-card">
                <div className="mb-5 flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal text-sm font-extrabold text-white shadow-teal-glow">{step}</span>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-light">
                    <Icon size={18} className="text-teal" />
                  </div>
                </div>
                <h3 className="mb-3 text-lg font-bold text-neutral-dark">{s(`${key}.title`)}</h3>
                <p className="mb-4 text-sm leading-relaxed text-neutral-mid">{s(`${key}.body`)}</p>
                <p className="rounded-xl bg-neutral-light px-4 py-3 text-xs leading-relaxed text-neutral-mid">
                  {s(`${key}.detail`)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 2. The AI engine ───────────────────────────────────────────────── */}
      <section className="bg-neutral-dark py-24">
        <div className="mx-auto max-w-content px-6">
          <SectionLabel light>{s('ai.label')}</SectionLabel>
          <h2 className="mb-6 text-4xl font-extrabold leading-tight text-white md:text-5xl">
            {s('ai.h2')}
          </h2>
          <p className="mb-14 max-w-2xl text-lg leading-relaxed text-gray-300">
            {s('ai.intro')}
          </p>

          <div className="grid gap-4 md:grid-cols-4">
            {[
              { num: '1', Icon: Search,         key: 'ai.step1', color: 'bg-teal-light', textColor: 'text-teal' },
              { num: '2', Icon: FileText,       key: 'ai.step2', color: 'bg-white/10',   textColor: 'text-white' },
              { num: '3', Icon: Zap,            key: 'ai.step3', color: 'bg-white/10',   textColor: 'text-white' },
              { num: '4', Icon: ClipboardCheck, key: 'ai.step4', color: 'bg-white/10',   textColor: 'text-white' },
            ].map(({ num, Icon, key, color, textColor }) => (
              <div key={num} className={`card-lift rounded-2xl border border-white/10 p-6 ${color}`}>
                <div className="mb-4 flex items-center gap-2">
                  <span className={`text-xs font-extrabold ${textColor === 'text-teal' ? 'text-teal' : 'text-white/40'}`}>STEP {num}</span>
                </div>
                <Icon size={22} className={`mb-4 ${textColor}`} />
                <h3 className={`mb-2 font-bold ${textColor === 'text-teal' ? 'text-teal' : 'text-white'}`}>{s(`${key}.title`)}</h3>
                <p className="text-sm leading-relaxed text-gray-400">{s(`${key}.body`)}</p>
              </div>
            ))}
          </div>

          <div className="mt-10 rounded-2xl border border-white/10 bg-white/5 px-8 py-6">
            <p className="mb-1 text-xs font-bold uppercase tracking-widest text-white/40">{s('ai.callout.label')}</p>
            <div className={`text-lg leading-relaxed text-white/80 ${RICH_LINK_WHITE}`} dangerouslySetInnerHTML={{ __html: s('ai.callout.body') }} />
          </div>
        </div>
      </section>

      {/* ── 3. The channels (hub, email, voice) ────────────────────────────── */}
      <section className="bg-white py-24">
        <div className="mx-auto max-w-content px-6">
          <SectionLabel>{s('hub.label')}</SectionLabel>
          <h2 className="mb-4 text-4xl font-extrabold leading-tight text-neutral-dark md:text-5xl">
            {s('hub.h2')}
          </h2>
          <p className="mb-14 max-w-2xl text-lg leading-relaxed text-neutral-mid">
            {s('hub.intro')}
          </p>

          <div className="grid gap-6 lg:grid-cols-2">

            {/* The hub (primary) */}
            <div className="card-lift rounded-2xl border border-gray-100 bg-white p-8 shadow-card lg:col-span-2">
              <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
                <div>
                  <div className="mb-5 flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-light">
                      <Smartphone size={22} className="text-teal" />
                    </div>
                    <div>
                      <p className="font-bold text-neutral-dark">{s('hub.app.name')}</p>
                      <p className="text-xs text-neutral-mid">{s('hub.app.sub')}</p>
                    </div>
                  </div>
                  <p className="mb-5 leading-relaxed text-neutral-mid">
                    {s('hub.app.body')}
                  </p>
                  <ul className="space-y-2 text-sm text-neutral-mid">
                    {['hub.app.b1', 'hub.app.b2', 'hub.app.b3', 'hub.app.b4', 'hub.app.b5', 'hub.app.b6'].map(k => <li key={k} className="flex items-start gap-2"><Check size={13} className="mt-0.5 shrink-0 text-teal" />{s(k)}</li>)}
                  </ul>
                </div>
                <div>
                  <HubMockup />
                </div>
              </div>
            </div>

            {/* Email */}
            <div className="card-lift rounded-2xl border border-gray-100 bg-white p-8 shadow-card">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50">
                  <Mail size={22} className="text-blue-600" />
                </div>
                <div>
                  <p className="font-bold text-neutral-dark">{s('hub.email.name')}</p>
                  <p className="text-xs text-neutral-mid">{s('hub.email.sub')}</p>
                </div>
              </div>
              <p className="mb-4 leading-relaxed text-neutral-mid">
                {s('hub.email.body')}
              </p>
              <ul className="space-y-2 text-sm text-neutral-mid">
                {['hub.email.b1', 'hub.email.b2', 'hub.email.b3', 'hub.email.b4'].map(k => <li key={k} className="flex items-start gap-2"><Check size={13} className="mt-0.5 shrink-0 text-blue-500" />{s(k)}</li>)}
              </ul>
            </div>

            {/* Voice */}
            <div className="card-lift rounded-2xl border border-gray-100 bg-white p-8 shadow-card">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-50">
                  <Mic size={22} className="text-purple-600" />
                </div>
                <div>
                  <p className="font-bold text-neutral-dark">{s('hub.voice.name')}</p>
                  <p className="text-xs text-neutral-mid">{s('hub.voice.sub')}</p>
                </div>
              </div>
              <p className="mb-4 leading-relaxed text-neutral-mid">
                {s('hub.voice.body')}
              </p>
              <ul className="space-y-2 text-sm text-neutral-mid">
                {['hub.voice.b1', 'hub.voice.b2', 'hub.voice.b3', 'hub.voice.b4'].map(k => <li key={k} className="flex items-start gap-2"><Check size={13} className="mt-0.5 shrink-0 text-purple-500" />{s(k)}</li>)}
              </ul>
            </div>

          </div>
        </div>
      </section>

      {/* ── 3b. Staff training ─────────────────────────────────────────────── */}
      <section className="bg-teal-gradient py-24">
        <div className="mx-auto max-w-content px-6">
          <SectionLabel light>{s('training.label')}</SectionLabel>
          <h2 className="mb-5 text-4xl font-extrabold leading-tight text-white md:text-5xl">
            {s('training.h2')}
          </h2>
          <p className="mb-14 max-w-2xl text-lg leading-relaxed text-white/80">
            {s('training.intro')}
          </p>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {[
              { Icon: GraduationCap, key: 'training.card1' },
              { Icon: FileText,      key: 'training.card2' },
              { Icon: ClipboardCheck,key: 'training.card3' },
              { Icon: RefreshCw,     key: 'training.card4' },
            ].map(({ Icon, key }) => (
              <div key={key} className="rounded-2xl border border-white/20 bg-white/10 p-6 backdrop-blur-sm">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-white/20"><Icon size={18} className="text-white" /></div>
                <h3 className="mb-2 font-bold text-white">{s(`${key}.title`)}</h3>
                <p className="text-sm leading-relaxed text-white/75">{s(`${key}.body`)}</p>
              </div>
            ))}
          </div>
          <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3">
            <Link href="/staff-training" className="inline-flex items-center gap-2 font-semibold text-white hover:underline">
              {s('training.cta')} <ArrowRight size={16} />
            </Link>
            <span className="inline-flex items-center gap-2 text-sm text-white/70"><Calendar size={15} /> {s('training.note1')}</span>
            <span className="inline-flex items-center gap-2 text-sm text-white/70"><Bell size={15} /> {s('training.note2')}</span>
          </div>
        </div>
      </section>

      {/* ── 4. Multilingual engine ─────────────────────────────────────────── */}
      <section className="bg-neutral-light py-24">
        <div className="mx-auto max-w-content px-6">
          <div className="grid items-center gap-16 lg:grid-cols-2">
            <div>
              <SectionLabel>{s('lang.label')}</SectionLabel>
              <h2 className="mb-5 text-4xl font-extrabold leading-tight text-neutral-dark md:text-5xl">
                {s('lang.h2')}
              </h2>
              <div className={`mb-6 text-lg leading-relaxed text-neutral-mid ${RICH_LINK}`} dangerouslySetInnerHTML={{ __html: s('lang.p1') }} />
              <div className={`mb-8 text-lg leading-relaxed text-neutral-mid ${RICH_LINK}`} dangerouslySetInnerHTML={{ __html: s('lang.p2') }} />
              <div className="grid grid-cols-2 gap-4">
                {['lang.stat1', 'lang.stat2', 'lang.stat3', 'lang.stat4'].map((key) => (
                  <div key={key} className="rounded-2xl bg-white p-5 shadow-card">
                    <p className="mb-1 text-2xl font-extrabold text-teal">{s(`${key}.value`)}</p>
                    <p className="text-sm text-neutral-mid">{s(`${key}.label`)}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-3">
              <p className="mb-4 text-xs font-bold uppercase tracking-widest text-neutral-mid">{s('lang.demo.heading')}</p>
              {[
                { flag: '🇵🇭', lang: 'Tagalog',  q: 'Ano ang gagawin ko pagkatapos ng pagbagsak ng residente?', detected: true },
                { flag: '🇵🇱', lang: 'Polish',   q: 'Co powinienem zrobić po upadku mieszkańca?',               detected: true },
                { flag: '🇷🇴', lang: 'Romanian', q: 'Ce trebuie să fac după ce un rezident cade?',               detected: true },
                { flag: '🇮🇳', lang: 'Hindi',    q: 'निवासी के गिरने के बाद मुझे क्या करना चाहिए?',             detected: true },
                { flag: '🇳🇬', lang: 'Yoruba',   q: 'Kini mo yẹ ki n ṣe lẹhin ti olugbe ba subu?',              detected: true },
                { flag: '🇸🇴', lang: 'Somali',   q: 'Maxaan samayn karaa marka martida ay dhacdo?',              detected: true },
              ].map(({ flag, lang, q }) => (
                <div key={lang} className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-card">
                  <span className="text-xl">{flag}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-neutral-dark">{q}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-teal/10 px-2.5 py-1 text-[10px] font-bold text-teal">{lang} detected</span>
                </div>
              ))}
              <p className="pt-1 text-center text-xs text-neutral-mid">{s('lang.demo.footer')}</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── 5. Regulatory intelligence ────────────────────────────────────── */}
      <section className="bg-white py-24">
        <div className="mx-auto max-w-content px-6">
          <SectionLabel>{s('reg.label')}</SectionLabel>
          <h2 className="mb-5 text-4xl font-extrabold leading-tight text-neutral-dark md:text-5xl">
            {s('reg.h2')}
          </h2>
          <p className="mb-12 max-w-2xl text-lg leading-relaxed text-neutral-mid">
            {s('reg.intro')}
          </p>

          <div className="grid gap-8 lg:grid-cols-2">
            {/* How it works */}
            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-elevated">
              <div className="border-b border-gray-100 bg-gray-50 px-6 py-4">
                <p className="text-xs font-semibold uppercase tracking-widest text-neutral-mid">{s('reg.how.label')}</p>
              </div>
              <div className="divide-y divide-gray-100">
                {[
                  { icon: <FileText size={16} className="text-teal" />,       bg: 'bg-teal-light',  key: 'reg.how1' },
                  { icon: <Layers size={16} className="text-amber-brand" />,  bg: 'bg-amber-50',    key: 'reg.how2' },
                  { icon: <MessageSquare size={16} className="text-purple-600" />, bg: 'bg-purple-50', key: 'reg.how3' },
                ].map(({ icon, bg, key }) => (
                  <div key={key} className="flex gap-4 px-6 py-5">
                    <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${bg}`}>{icon}</div>
                    <div>
                      <p className="mb-1 font-semibold text-neutral-dark">{s(`${key}.title`)}</p>
                      <p className="text-sm leading-relaxed text-neutral-mid">{s(`${key}.body`)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Frameworks included */}
            <div>
              <p className="mb-4 text-sm font-semibold uppercase tracking-widest text-neutral-mid">{s('reg.frameworks.label')}</p>
              <div className="space-y-2.5">
                {['reg.fw1', 'reg.fw2', 'reg.fw3', 'reg.fw4', 'reg.fw5', 'reg.fw6', 'reg.fw7', 'reg.fw8'].map((key) => (
                  <div key={key} className="flex items-center justify-between rounded-xl border border-gray-100 bg-neutral-light px-4 py-3">
                    <span className="text-sm font-medium text-neutral-dark">{s(`${key}.name`)}</span>
                    <span className="shrink-0 rounded-full bg-amber-50 px-2.5 py-0.5 text-[10px] font-bold text-amber-brand">{s(`${key}.reg`)}</span>
                  </div>
                ))}
                <div className="rounded-xl bg-teal/10 px-4 py-3 text-center">
                  <span className="text-sm font-semibold text-teal">{s('reg.frameworks.more')}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 6. Knowledge base ─────────────────────────────────────────────── */}
      <section className="bg-neutral-dark py-24">
        <div className="mx-auto max-w-content px-6">
          <div className="grid items-center gap-16 lg:grid-cols-2">
            <div>
              <SectionLabel light>{s('kb.label')}</SectionLabel>
              <h2 className="mb-5 text-4xl font-extrabold leading-tight text-white md:text-5xl">
                {s('kb.h2')}
              </h2>
              <div className={`mb-6 text-lg leading-relaxed text-gray-300 ${RICH_LINK_WHITE}`} dangerouslySetInnerHTML={{ __html: s('kb.p1') }} />
              <div className={`mb-8 text-lg leading-relaxed text-gray-300 ${RICH_LINK_WHITE}`} dangerouslySetInnerHTML={{ __html: s('kb.p2') }} />
              <div className="space-y-3">
                {[
                  { icon: Users,     key: 'kb.f1' },
                  { icon: FileText,  key: 'kb.f2' },
                  { icon: BookOpen,  key: 'kb.f3' },
                  { icon: Lock,      key: 'kb.f4' },
                ].map(({ icon: Icon, key }) => (
                  <div key={key} className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                    <Icon size={16} className="mt-0.5 shrink-0 text-teal" />
                    <span className="text-sm leading-relaxed text-white/80">{s(key)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Comparison table */}
            <div className="overflow-hidden rounded-2xl border border-white/10">
              <div className="grid grid-cols-3 border-b border-white/10 bg-white/10 px-5 py-3 text-xs font-bold uppercase tracking-widest text-white/40">
                <span>Staff asks</span>
                <span>Generic AI</span>
                <span className="text-amber-brand">CareStreamAI</span>
              </div>
              {[
                {
                  q: 'Who is the infection control lead?',
                  generic: '"The designated lead named in the policy."',
                  specific: '"Maria Chen. On nights, cover is the senior carer on shift."',
                },
                {
                  q: 'What colour mop for bathrooms?',
                  generic: '"Follow the colour-coding scheme in the policy."',
                  specific: '"Blue for bathrooms. Yellow for kitchen. Red for high-risk only."',
                },
                {
                  q: 'Who do I call for a medication issue overnight?',
                  generic: '"Contact the on-call manager per the Medication Policy."',
                  specific: '"Call Sarah Ambridge. Out-of-hours number is on the medication room door."',
                },
                {
                  q: 'When does annual leave reset?',
                  generic: '"Annual leave resets per your employment contract."',
                  specific: '"1 April. Unused leave cannot be carried forward per your Staff Handbook p.14."',
                },
              ].map(({ q, generic, specific }, i) => (
                <div key={q} className={`grid grid-cols-3 px-5 py-4 text-sm ${i < 3 ? 'border-b border-white/8' : ''}`}>
                  <span className="pr-3 font-medium text-white">{q}</span>
                  <span className="pr-3 italic text-white/35">{generic}</span>
                  <span className="font-medium text-white/90">{specific}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── 7. Policy gap detection ───────────────────────────────────────── */}
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
                {['gap.f1', 'gap.f2', 'gap.f3', 'gap.f4'].map((key) => (
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

            {/* Gap report panel */}
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

      {/* ── 8. Analytics & CQC Readiness ──────────────────────────────────── */}
      <section className="bg-white py-24">
        <div className="mx-auto max-w-content px-6">
          <SectionLabel>{s('analytics.label')}</SectionLabel>
          <h2 className="mb-5 text-4xl font-extrabold leading-tight text-neutral-dark md:text-5xl">
            {s('analytics.h2')}
          </h2>
          <p className="mb-14 max-w-2xl text-lg leading-relaxed text-neutral-mid">
            {s('analytics.intro')}
          </p>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[
              { Icon: BarChart2,      iconBg: 'bg-teal-light', iconColor: 'text-teal',        key: 'analytics.card1' },
              { Icon: Globe,          iconBg: 'bg-blue-50',    iconColor: 'text-blue-600',    key: 'analytics.card2' },
              { Icon: Users,          iconBg: 'bg-purple-50',  iconColor: 'text-purple-600',  key: 'analytics.card3' },
              { Icon: FileText,       iconBg: 'bg-amber-50',   iconColor: 'text-amber-brand', key: 'analytics.card4' },
              { Icon: ClipboardCheck, iconBg: 'bg-green-50',   iconColor: 'text-green-700',   key: 'analytics.card5' },
              { Icon: ShieldAlert,    iconBg: 'bg-red-50',     iconColor: 'text-red-600',     key: 'analytics.card6' },
            ].map(({ Icon, iconBg, iconColor, key }) => (
              <div key={key} className="card-lift rounded-2xl border border-gray-100 bg-white p-7 shadow-card">
                <div className={`mb-5 flex h-12 w-12 items-center justify-center rounded-2xl ${iconBg}`}>
                  <Icon size={22} className={iconColor} />
                </div>
                <h3 className="mb-3 font-bold text-neutral-dark">{s(`${key}.title`)}</h3>
                <p className="text-sm leading-relaxed text-neutral-mid">{s(`${key}.body`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 9. Security & data ────────────────────────────────────────────── */}
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
                {['security.f1', 'security.f2', 'security.f3', 'security.f4'].map((key) => (
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

      {/* CMS-editable content + FAQs (platform Blog → Main site pages). */}
      <EditableContentBlock path="/how-it-works" />

      <PageCta
        heading="See it working with your own policies."
        sub="Book a 30-minute demo and we'll show you CareStreamAI responding to real queries from your documents."
        primary={{ href: '/demo', label: 'Book a Free Demo' }}
        secondary={{ href: '/register', label: 'Start Free Trial' }}
      />
    </>
  )
}
