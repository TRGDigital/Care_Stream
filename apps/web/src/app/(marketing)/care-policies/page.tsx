import Link from 'next/link'
import {
  MessageSquare, Mail, Mic, FileText, BookOpen,
  Upload, Layers, ShieldAlert, ClipboardCheck, Lock,
  Check, Zap, Search, TrendingUp,
} from 'lucide-react'
import { PageCta, SectionLabel } from '@/components/marketing/ui'

export const metadata = {
  title: 'Care Policies',
  description: 'Upload your policy library once. Your entire team can then query any policy in 50+ languages, instantly, via WhatsApp, email, or web — with every interaction logged.',
  openGraph: {
    title: 'Care Policies | CareStreamAI',
    description: 'Digital policy access for your entire team — 50+ languages, WhatsApp, email, and web.',
    url: 'https://carestreamai.co.uk/care-policies',
  },
}

function WhatsAppIcon({ size = 20, color = '#16a34a' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  )
}

// ── Feature Dashboard Mockup ──────────────────────────────────────────────────

function FeatureDashboardMockup() {
  return (
    <div className="w-full max-w-[400px] overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-white/20">
      <div className="bg-teal px-5 py-4">
        <p className="text-[10px] font-bold uppercase tracking-widest text-white/60">CareStreamAI</p>
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
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: 'Chat',     count: 412, color: 'bg-teal' },
            { label: 'WhatsApp', count: 243, color: 'bg-green-500' },
            { label: 'Email',    count: 142, color: 'bg-blue-500' },
            { label: 'Voice',    count: 50,  color: 'bg-purple-500' },
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

export default function FeaturesPage() {
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
              <SectionLabel light>Features</SectionLabel>
              <h1 className="mb-5 max-w-xl text-4xl font-extrabold leading-tight text-white md:text-5xl">
                Everything your care team needs. Nothing they don&apos;t.
              </h1>
              <p className="mb-8 max-w-xl text-lg leading-relaxed text-white/75">
                CareStreamAI is purpose-built for UK care settings. Every feature addresses a real challenge that registered managers, HR leads, and frontline staff face every day.
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
              <FeatureDashboardMockup />
            </div>
          </div>
        </div>
      </section>

      {/* 1. Four channels */}
      <section className="bg-white py-24">
        <div className="mx-auto max-w-content px-6">
          <SectionLabel>Access Channels</SectionLabel>
          <h2 className="mb-4 text-4xl font-extrabold leading-tight text-neutral-dark md:text-5xl">
            Four ways to ask. One consistent answer.
          </h2>
          <p className="mb-14 max-w-2xl text-lg leading-relaxed text-neutral-mid">
            Every channel draws from the same policy library and generates the same quality of response. Staff use whichever channel fits their situation, and every interaction lands in the same audit trail.
          </p>

          <div className="grid gap-6 lg:grid-cols-2">

            <div className="card-lift rounded-2xl border border-gray-100 bg-white p-8 shadow-card">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-light">
                  <MessageSquare size={22} className="text-teal" />
                </div>
                <div>
                  <p className="font-bold text-neutral-dark">Web Chat Portal</p>
                  <p className="text-xs text-neutral-mid">Desktop and mobile browser</p>
                </div>
              </div>
              <p className="mb-5 leading-relaxed text-neutral-mid">
                A full conversational interface accessible on any device from any browser. Staff log in once and can ask follow-up questions naturally within the same session. The system retains full context for the entire conversation.
              </p>
              <ul className="space-y-2 text-sm text-neutral-mid">
                {[
                  'Full session context maintained across multiple questions',
                  'Conversation history visible to the staff member',
                  'Suggested follow-up questions after every response',
                  'Works on any smartphone, tablet, or desktop browser',
                  'Formatted responses with section headings and bullet points',
                ].map(p => (
                  <li key={p} className="flex items-start gap-2">
                    <Check size={13} className="mt-0.5 shrink-0 text-teal" />{p}
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
                  <p className="font-bold text-neutral-dark">Email</p>
                  <p className="text-xs text-neutral-mid">Any email client, any device</p>
                </div>
              </div>
              <p className="mb-5 leading-relaxed text-neutral-mid">
                Staff email your dedicated CareStreamAI address from any device. A reply arrives within 30 seconds. Replying to the response continues the conversation with full thread context maintained across every exchange.
              </p>
              <ul className="space-y-2 text-sm text-neutral-mid">
                {[
                  'No login and no app required to use',
                  'Response delivered into the same email thread within 30 seconds',
                  'Reply to ask a follow-up question at any time',
                  'Works from any email app on any device',
                  'Ideal during shift handover or when away from the home',
                ].map(p => (
                  <li key={p} className="flex items-start gap-2">
                    <Check size={13} className="mt-0.5 shrink-0 text-blue-500" />{p}
                  </li>
                ))}
              </ul>
            </div>

            <div className="card-lift rounded-2xl border border-gray-100 bg-white p-8 shadow-card">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-green-50">
                  <WhatsAppIcon size={22} color="#16a34a" />
                </div>
                <div>
                  <p className="font-bold text-neutral-dark">WhatsApp</p>
                  <p className="text-xs text-neutral-mid">Any smartphone, iOS or Android</p>
                </div>
              </div>
              <p className="mb-5 leading-relaxed text-neutral-mid">
                Staff message the CareStreamAI WhatsApp number exactly as they would text a colleague. No app to download, no login to create. Responses arrive in under 30 seconds. Voice notes are fully supported for hands-free queries.
              </p>
              <ul className="space-y-2 text-sm text-neutral-mid">
                {[
                  'Staff use their existing WhatsApp with no setup required',
                  'Voice notes transcribed and answered automatically',
                  'Tappable follow-up question buttons sent after each response',
                  '24-hour session window for natural follow-up conversations',
                  'Phone number allowlist ensures only registered staff can query',
                  'Responses in the language the message was sent in',
                ].map(p => (
                  <li key={p} className="flex items-start gap-2">
                    <Check size={13} className="mt-0.5 shrink-0 text-green-600" />{p}
                  </li>
                ))}
              </ul>
            </div>

            <div className="card-lift rounded-2xl border border-gray-100 bg-white p-8 shadow-card">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-50">
                  <Mic size={22} className="text-purple-600" />
                </div>
                <div>
                  <p className="font-bold text-neutral-dark">Voice Input</p>
                  <p className="text-xs text-neutral-mid">Via WhatsApp voice note or chat portal</p>
                </div>
              </div>
              <p className="mb-5 leading-relaxed text-neutral-mid">
                Not everyone types quickly in their second language, or has two hands free on a care floor. Voice input lets staff speak their question naturally in any language. The audio is transcribed, language-detected, and answered from your policies in the same language it was spoken.
              </p>
              <ul className="space-y-2 text-sm text-neutral-mid">
                {[
                  'Over 50 languages detected and supported for voice input',
                  'Transcription shown alongside the answer for transparency',
                  'Same response quality and citation detail as typed queries',
                  'Appears identically in the audit trail as any other query',
                ].map(p => (
                  <li key={p} className="flex items-start gap-2">
                    <Check size={13} className="mt-0.5 shrink-0 text-purple-500" />{p}
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
              <SectionLabel>Multilingual Engine</SectionLabel>
              <h2 className="mb-5 text-4xl font-extrabold leading-tight text-neutral-dark md:text-5xl">
                50+ languages. Zero configuration.
              </h2>
              <p className="mb-6 text-lg leading-relaxed text-neutral-mid">
                Language detection is automatic on every query. Staff do not select a language, toggle a setting, or use any special command. They ask their question in the language they think in, and the answer arrives in the same language.
              </p>
              <p className="mb-8 text-lg leading-relaxed text-neutral-mid">
                Your policies remain in English. Translation happens at the point of response, not at the point of upload. One authoritative English policy library, consistently available in every language your workforce uses.
              </p>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: 'Languages detected', value: '50+' },
                  { label: 'Source policy language', value: 'English' },
                  { label: 'Setup required', value: 'None' },
                  { label: 'Extra cost per language', value: '£0' },
                ].map(({ label, value }) => (
                  <div key={label} className="rounded-2xl bg-white p-5 shadow-card">
                    <p className="mb-1 text-2xl font-extrabold text-teal">{value}</p>
                    <p className="text-sm text-neutral-mid">{label}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-3">
              <p className="mb-4 text-xs font-bold uppercase tracking-widest text-neutral-mid">
                The same question, six languages, one policy
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
                All answered from the same Falls Policy, each in the language asked
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Policy management */}
      <section className="bg-white py-24">
        <div className="mx-auto max-w-content px-6">
          <SectionLabel>Policy Management</SectionLabel>
          <h2 className="mb-4 text-4xl font-extrabold leading-tight text-neutral-dark md:text-5xl">
            A policy library that works as hard as you do.
          </h2>
          <p className="mb-14 max-w-2xl text-lg leading-relaxed text-neutral-mid">
            Upload once and CareStreamAI handles the rest. Documents are automatically processed, indexed, and made searchable within minutes of upload with no manual work required.
          </p>

          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {[
              {
                Icon: Upload,
                bg: 'bg-teal-light',
                color: 'text-teal',
                title: 'PDF, Word and plain text',
                body: 'Upload any combination of file formats. CareStreamAI reads and indexes all common document types with no conversion or reformatting needed from you.',
              },
              {
                Icon: Zap,
                bg: 'bg-amber-50',
                color: 'text-amber-brand',
                title: 'Live within minutes of upload',
                body: 'Documents are processed and indexed automatically. Staff can query a newly uploaded policy within minutes of it being added to the library.',
              },
              {
                Icon: FileText,
                bg: 'bg-blue-50',
                color: 'text-blue-600',
                title: 'Header and footer stripping',
                body: 'Page numbers, version stamps, document headers and footers are removed automatically. The AI reads only the substantive policy content.',
              },
              {
                Icon: Search,
                bg: 'bg-purple-50',
                color: 'text-purple-600',
                title: 'Semantic chunking and indexing',
                body: 'Each document is broken into meaningful sections and indexed for semantic search. Answers are retrieved even when the wording of the question differs from the policy.',
              },
              {
                Icon: TrendingUp,
                bg: 'bg-green-50',
                color: 'text-green-700',
                title: 'Version control and history',
                body: 'Upload a revised policy and the old version is retired from the retrieval system automatically. The full version history is retained for post-incident review.',
              },
              {
                Icon: ClipboardCheck,
                bg: 'bg-red-50',
                color: 'text-red-500',
                title: 'Review date reminders',
                body: 'Set a review interval for each policy and CareStreamAI will remind you when it is due. Your library stays current without any manual tracking.',
              },
              {
                Icon: BookOpen,
                bg: 'bg-teal-light',
                color: 'text-teal',
                title: 'Staff handbook support',
                body: 'Upload your staff handbook alongside your clinical policies. Staff can ask about annual leave, disciplinary procedures, pay and onboarding and receive accurate answers from your actual document.',
              },
              {
                Icon: Layers,
                bg: 'bg-amber-50',
                color: 'text-amber-brand',
                title: 'Policy categories and tagging',
                body: 'Organise your library by category, department, or regulatory framework. Makes browsing and reporting easier for managers and auditors.',
              },
              {
                Icon: Lock,
                bg: 'bg-blue-50',
                color: 'text-blue-600',
                title: 'No document count limit',
                body: 'Upload your complete policy library with no cap on the number of documents or file size. All plans include unlimited policy storage.',
              },
            ].map(({ Icon, bg, color, title, body }) => (
              <div key={title} className="card-lift rounded-2xl border border-gray-100 bg-white p-7 shadow-card">
                <div className={`mb-5 flex h-12 w-12 items-center justify-center rounded-2xl ${bg}`}>
                  <Icon size={22} className={color} />
                </div>
                <h3 className="mb-3 font-bold text-neutral-dark">{title}</h3>
                <p className="text-sm leading-relaxed text-neutral-mid">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. Regulatory intelligence */}
      <section className="bg-neutral-dark py-24">
        <div className="mx-auto max-w-content px-6">
          <SectionLabel light>Regulatory Intelligence</SectionLabel>
          <h2 className="mb-5 text-4xl font-extrabold leading-tight text-white md:text-5xl">
            Over 50 UK regulatory frameworks, pre-loaded.
          </h2>
          <p className="mb-12 max-w-2xl text-lg leading-relaxed text-gray-300">
            Your internal policies are built on UK law and regulation. CareStreamAI has over 50 regulatory frameworks already loaded so that when a staff member asks something that touches both your policy and an external requirement, the response explains how the two interact.
          </p>

          <div className="grid gap-8 lg:grid-cols-2">
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
              <div className="border-b border-white/10 px-6 py-4">
                <p className="text-xs font-semibold uppercase tracking-widest text-white/50">How it works</p>
              </div>
              <div className="divide-y divide-white/10">
                {[
                  {
                    Icon: FileText,
                    color: 'text-teal',
                    bg: 'bg-teal/20',
                    title: 'Your internal policy is retrieved',
                    body: 'The most relevant section of your own policy is found and used as the primary source for the response.',
                  },
                  {
                    Icon: Layers,
                    color: 'text-amber-brand',
                    bg: 'bg-amber-brand/20',
                    title: 'Relevant regulations are overlaid',
                    body: 'CareStreamAI identifies which of the pre-loaded frameworks apply to the question and adds that regulatory context to the response.',
                  },
                  {
                    Icon: MessageSquare,
                    color: 'text-purple-400',
                    bg: 'bg-purple-500/20',
                    title: 'The interaction is explained',
                    body: 'The response covers what your policy requires and what the law requires, and explains where they align, where they differ, and where your policy goes further.',
                  },
                ].map(({ Icon, color, bg, title, body }) => (
                  <div key={title} className="flex gap-4 px-6 py-5">
                    <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${bg}`}>
                      <Icon size={16} className={color} />
                    </div>
                    <div>
                      <p className="mb-1 font-semibold text-white">{title}</p>
                      <p className="text-sm leading-relaxed text-gray-400">{body}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-4 text-xs font-bold uppercase tracking-widest text-white/50">A selection of included frameworks</p>
              <div className="space-y-2.5">
                {[
                  { name: 'CQC Fundamental Standards',              reg: 'Reg 9 to 20'   },
                  { name: 'Health and Safety at Work Act 1974',      reg: 'HSWA 1974'     },
                  { name: 'GDPR and Data Protection Act 2018',       reg: 'UK GDPR'       },
                  { name: 'Mental Capacity Act 2005',                reg: 'MCA 2005'      },
                  { name: 'Care Act 2014 Safeguarding',              reg: 'Care Act 2014' },
                  { name: 'RIDDOR 2013',                             reg: 'RIDDOR 2013'   },
                  { name: 'Equality Act 2010',                       reg: 'EA 2010'       },
                  { name: 'Control of Substances Hazardous to Health', reg: 'COSHH 2002'  },
                ].map(({ name, reg }) => (
                  <div key={name} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                    <span className="text-sm font-medium text-white/80">{name}</span>
                    <span className="shrink-0 rounded-full bg-amber-brand/20 px-2.5 py-0.5 text-[10px] font-bold text-amber-brand">{reg}</span>
                  </div>
                ))}
                <div className="rounded-xl bg-teal/20 px-4 py-3 text-center">
                  <span className="text-sm font-semibold text-teal">42 additional frameworks included</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Knowledge base */}
      <section className="bg-white py-24">
        <div className="mx-auto max-w-content px-6">
          <SectionLabel>The Knowledge Base</SectionLabel>
          <h2 className="mb-6 text-4xl font-extrabold leading-tight text-neutral-dark md:text-5xl">
            Not generic answers. <span style={{ color: '#E8850A' }}>Your home&rsquo;s answers.</span>
          </h2>
          <p className="mb-6 max-w-2xl text-lg leading-relaxed text-neutral-mid">
            CareStreamAI automatically analyses every uploaded policy and extracts the precise, home-specific facts that staff are most likely to ask about: named individuals, specific schedules and exact local procedures.
          </p>
          <p className="mb-14 max-w-2xl text-lg leading-relaxed text-neutral-mid">
            Managers can also add and edit knowledge entries directly, capturing the operational knowledge that lives in practice and making it immediately available to everyone on the team.
          </p>

          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-elevated">
            <div className="grid grid-cols-3 border-b border-gray-100 bg-neutral-light px-6 py-4 text-xs font-bold uppercase tracking-widest text-neutral-mid">
              <span>Staff asks</span>
              <span>Generic policy answer</span>
              <span className="text-amber-brand">CareStreamAI answer</span>
            </div>
            {[
              {
                q: 'Who is responsible for infection control?',
                generic: '"The designated infection control lead as named in the policy."',
                specific: '"Maria Chen is the Infection Control Lead. On nights and weekends, cover is provided by the senior carer on shift."',
              },
              {
                q: 'How often is the sluice room deep-cleaned?',
                generic: '"According to the cleaning schedule in the Infection Control Policy."',
                specific: '"The sluice room is deep-cleaned every Monday and Thursday morning. The daily clean is recorded on the log inside the door."',
              },
              {
                q: 'What colour mop for the bathrooms?',
                generic: '"Follow the colour-coding scheme set out in the Infection Control Policy."',
                specific: '"Blue mops for bathrooms and toilets. Yellow for kitchen areas. Red for high-risk areas only."',
              },
              {
                q: 'Who do I call for a medication issue overnight?',
                generic: '"Contact the on-call manager per the Medication Policy."',
                specific: '"Call Sarah Ambridge on the duty manager number. The out-of-hours number is posted inside the medication room door."',
              },
            ].map(({ q, generic, specific }, i) => (
              <div key={q} className={`grid grid-cols-3 px-6 py-5 text-sm ${i < 3 ? 'border-b border-gray-100' : ''}`}>
                <span className="pr-4 font-medium text-neutral-dark">{q}</span>
                <span className="pr-4 italic text-neutral-mid/60">{generic}</span>
                <span className="font-medium text-neutral-dark">{specific}</span>
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
              <SectionLabel>Policy Gap Detection</SectionLabel>
              <h2 className="mb-5 text-4xl font-extrabold leading-tight text-neutral-dark md:text-5xl">
                Find your gaps before CQC does.
              </h2>
              <p className="mb-6 text-lg leading-relaxed text-neutral-mid">
                Every time CareStreamAI cannot find an answer in your documents, it flags the query as a gap. Over time, patterns emerge: the same questions appearing repeatedly without any policy coverage.
              </p>
              <p className="mb-8 text-lg leading-relaxed text-neutral-mid">
                Your Policy Gap Report shows exactly which questions your staff are asking that your current policies do not address, ranked by frequency. This is actionable evidence of where your library needs strengthening, surfaced before an inspection identifies it first.
              </p>
              <div className="space-y-4">
                {[
                  {
                    title: 'Real-time flagging',
                    body: 'Every unanswered query is flagged immediately rather than batched for a monthly report.',
                  },
                  {
                    title: 'Ranked by frequency',
                    body: 'The most commonly asked unanswered questions appear first, so you address the most impactful gaps first.',
                  },
                  {
                    title: 'Monthly summary report',
                    body: 'A summary is compiled automatically and made available for your manager review cycle.',
                  },
                  {
                    title: 'Evidence for CQC',
                    body: 'Gap identification and resolution is included in your CQC Readiness Report as proof of continuous improvement.',
                  },
                ].map(({ title, body }) => (
                  <div key={title} className="flex gap-4">
                    <div className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-brand">
                      <ShieldAlert size={12} className="text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-neutral-dark">{title}</p>
                      <p className="text-sm leading-relaxed text-neutral-mid">{body}</p>
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
          <SectionLabel>Analytics and Compliance</SectionLabel>
          <h2 className="mb-5 text-4xl font-extrabold text-neutral-dark md:text-5xl">
            Your compliance evidence builds automatically.
          </h2>
          <p className="mb-14 max-w-2xl text-lg leading-relaxed text-neutral-mid">
            Every interaction with CareStreamAI is logged and structured. Your analytics dashboard and CQC Readiness Report are generated from this data continuously, with nothing to compile manually.
          </p>
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
                  ['Total queries and trend over time', true, true],
                  ['Queries by channel (chat, email, WhatsApp, voice)', true, true],
                  ['Most requested policies this month', true, true],
                  ['Active staff members this month', true, true],
                  ['Plan usage vs allowance', true, true],
                  ['Policy not found rate', true, true],
                  ['Policy last updated date', true, true],
                  ['Language breakdown across all queries', false, true],
                  ['Knowledge gap detection report', false, true],
                  ['Query trend analysis over 12 months', false, true],
                  ['Staff engagement by individual', false, true],
                  ['CQC Readiness Report PDF', false, true],
                ].map(([feature, starter, pro]) => (
                  <tr key={feature as string} className="hover:bg-neutral-light/50">
                    <td className="px-6 py-3.5 text-neutral-dark">{feature as string}</td>
                    <td className="px-6 py-3.5 text-center">
                      {starter ? <Check size={16} className="mx-auto text-teal" /> : <span className="text-xs text-gray-300">Not included</span>}
                    </td>
                    <td className="px-6 py-3.5 text-center">
                      {pro ? <Check size={16} className="mx-auto text-teal" /> : <span className="text-xs text-gray-300">Not included</span>}
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
                <SectionLabel light>Data and Security</SectionLabel>
                <h2 className="mb-5 text-3xl font-extrabold text-white md:text-4xl">
                  Your data stays yours.
                </h2>
                <p className="text-lg leading-relaxed text-gray-300">
                  Every tenant&rsquo;s policy library is stored in a completely isolated environment. Your policies are never used to train any model, never shared with other organisations, and never accessible to anyone outside your account. Data is encrypted at rest and in transit. UK data residency is available on Professional and Enterprise plans.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: 'Tenant isolation', detail: 'Complete data separation between all organisations' },
                  { label: 'Encrypted at rest', detail: 'AES-256 encryption for all stored documents and logs' },
                  { label: 'Never used for training', detail: 'Your documents are never used to train AI models' },
                  { label: 'UK data residency', detail: 'Available on Professional and Enterprise plans' },
                ].map(({ label, detail }) => (
                  <div key={label} className="rounded-xl border border-white/10 bg-white/5 p-4">
                    <p className="mb-1 font-semibold text-white">{label}</p>
                    <p className="text-xs leading-relaxed text-white/50">{detail}</p>
                  </div>
                ))}
              </div>
            </div>
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
