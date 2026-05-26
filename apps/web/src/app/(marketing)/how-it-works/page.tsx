import Link from 'next/link'
import {
  ArrowRight, Upload, Search, Zap, ClipboardCheck, Globe, Mail, MessageSquare,
  Mic, BarChart2, ShieldAlert, BookOpen, Layers, Check, FileText, Users, Lock,
} from 'lucide-react'
import { PageCta, SectionLabel } from '@/components/marketing/ui'

export const metadata = {
  title: 'How It Works',
  description: 'CareStreamAI works in three steps: upload your policies, let staff ask questions via WhatsApp, email, or web, and review every interaction in your analytics dashboard.',
  openGraph: {
    title: 'How CareStreamAI Works',
    description: 'Upload policies, enable staff queries in 50+ languages, review every interaction. Three steps.',
    url: 'https://carestreamai.co.uk/how-it-works',
  },
}

// ─── WhatsApp SVG (not in lucide) ────────────────────────────────────────────
function WhatsAppIcon({ size = 20, color = '#16a34a' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  )
}

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
          { color: 'bg-blue-500', label: 'Via: Web chat' },
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

// ─────────────────────────────────────────────────────────────────────────────

export default function HowItWorksPage() {
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
              <SectionLabel light>How It Works</SectionLabel>
              <h1 className="mb-5 max-w-xl text-4xl font-extrabold leading-tight text-white md:text-5xl">
                Everything you need to know about how CareStreamAI works.
              </h1>
              <p className="mb-8 max-w-xl text-lg leading-relaxed text-white/75">
                From uploading your first policy to your CQC inspection, a complete walkthrough of every feature, how it works, and why it matters for your care setting.
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
          <SectionLabel>Getting Started</SectionLabel>
          <h2 className="mb-4 text-4xl font-extrabold leading-tight text-neutral-dark md:text-5xl">
            Up and running in under an hour.
          </h2>
          <p className="mb-14 max-w-2xl text-lg leading-relaxed text-neutral-mid">
            There is no integration project, no IT department involvement, and no lengthy rollout.
            Three steps and your whole team has access.
          </p>

          <div className="grid gap-6 md:grid-cols-3">
            {[
              {
                step: '01',
                Icon: Upload,
                title: 'Upload your documents',
                body: 'Upload your policy library, staff handbook, and any supporting documents from the admin dashboard. PDF, Word, and plain text are all accepted. There is no limit on file size or number of policies.',
                detail: 'Most homes upload between 20 and 80 policy documents. The upload takes minutes.',
              },
              {
                step: '02',
                Icon: Search,
                title: 'CareStreamAI processes them',
                body: 'Each document is read, chunked into meaningful sections, and indexed for semantic search. Key facts such as named individuals, contact numbers and local procedures are extracted and made searchable.',
                detail: 'Processing typically completes in under five minutes per document, automatically.',
              },
              {
                step: '03',
                Icon: Zap,
                title: 'Your team goes live',
                body: 'Add your staff email addresses or phone numbers. They can immediately start asking questions via email, the chat portal, WhatsApp, or voice. No training needed, no app downloads, no logins required for frontline staff.',
                detail: 'Most homes are fully live within 45 minutes of starting the setup process.',
              },
            ].map(({ step, Icon, title, body, detail }) => (
              <div key={step} className="card-lift rounded-2xl border border-gray-100 bg-white p-7 shadow-card">
                <div className="mb-5 flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal text-sm font-extrabold text-white shadow-teal-glow">{step}</span>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-light">
                    <Icon size={18} className="text-teal" />
                  </div>
                </div>
                <h3 className="mb-3 text-lg font-bold text-neutral-dark">{title}</h3>
                <p className="mb-4 text-sm leading-relaxed text-neutral-mid">{body}</p>
                <p className="rounded-xl bg-neutral-light px-4 py-3 text-xs leading-relaxed text-neutral-mid">
                  {detail}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 2. The AI engine ───────────────────────────────────────────────── */}
      <section className="bg-neutral-dark py-24">
        <div className="mx-auto max-w-content px-6">
          <SectionLabel light>The AI Engine</SectionLabel>
          <h2 className="mb-6 text-4xl font-extrabold leading-tight text-white md:text-5xl">
            How the AI generates answers.
          </h2>
          <p className="mb-14 max-w-2xl text-lg leading-relaxed text-gray-300">
            CareStreamAI uses a technique called Retrieval-Augmented Generation (RAG). In plain English: it finds the right part of your policy, reads it, and writes the answer from that content only.
          </p>

          <div className="grid gap-4 md:grid-cols-4">
            {[
              {
                num: '1',
                Icon: Search,
                title: 'Semantic search',
                body: 'The question is converted into a mathematical representation and matched against your indexed policies. The most relevant sections are retrieved, even when the exact wording of the question differs from the policy.',
                color: 'bg-teal-light',
                textColor: 'text-teal',
              },
              {
                num: '2',
                Icon: FileText,
                title: 'Context assembly',
                body: 'The retrieved policy sections are assembled into a context window, along with any conversation history from the current session and the relevant regulatory framework.',
                color: 'bg-white/10',
                textColor: 'text-white',
              },
              {
                num: '3',
                Icon: Zap,
                title: 'Answer generation',
                body: 'The AI is instructed to answer using only the provided context. It cannot draw on general knowledge or training data. If the answer is not in your documents, it says so.',
                color: 'bg-white/10',
                textColor: 'text-white',
              },
              {
                num: '4',
                Icon: ClipboardCheck,
                title: 'Citation and logging',
                body: 'Every response cites the exact policy and section used. The full interaction, including question, answer, policy cited, language, channel and timestamp, is logged to the audit trail.',
                color: 'bg-white/10',
                textColor: 'text-white',
              },
            ].map(({ num, Icon, title, body, color, textColor }) => (
              <div key={num} className={`card-lift rounded-2xl border border-white/10 p-6 ${color}`}>
                <div className="mb-4 flex items-center gap-2">
                  <span className={`text-xs font-extrabold ${textColor === 'text-teal' ? 'text-teal' : 'text-white/40'}`}>STEP {num}</span>
                </div>
                <Icon size={22} className={`mb-4 ${textColor}`} />
                <h3 className={`mb-2 font-bold ${textColor === 'text-teal' ? 'text-teal' : 'text-white'}`}>{title}</h3>
                <p className="text-sm leading-relaxed text-gray-400">{body}</p>
              </div>
            ))}
          </div>

          <div className="mt-10 rounded-2xl border border-white/10 bg-white/5 px-8 py-6">
            <p className="mb-1 text-xs font-bold uppercase tracking-widest text-white/40">Why it cannot make things up</p>
            <p className="text-lg leading-relaxed text-white/80">
              The AI is given your policy content and told: answer from this, and only this. It has no access to the internet, no access to other organisations&rsquo; policies, and no access to its general training data when answering. If a question cannot be answered from your documents, it tells the staff member and flags the gap for your review.
            </p>
          </div>
        </div>
      </section>

      {/* ── 3. The four channels ───────────────────────────────────────────── */}
      <section className="bg-white py-24">
        <div className="mx-auto max-w-content px-6">
          <SectionLabel>Access Channels</SectionLabel>
          <h2 className="mb-4 text-4xl font-extrabold leading-tight text-neutral-dark md:text-5xl">
            Four ways to ask. One consistent answer.
          </h2>
          <p className="mb-14 max-w-2xl text-lg leading-relaxed text-neutral-mid">
            Every channel gives the same quality of response, drawn from the same policy library, with the same audit trail. Staff use whichever channel fits their situation.
          </p>

          <div className="grid gap-6 lg:grid-cols-2">

            {/* Chat portal */}
            <div className="card-lift rounded-2xl border border-gray-100 bg-white p-8 shadow-card">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-light">
                  <MessageSquare size={22} className="text-teal" />
                </div>
                <div>
                  <p className="font-bold text-neutral-dark">Web chat portal</p>
                  <p className="text-xs text-neutral-mid">Desktop and mobile browser</p>
                </div>
              </div>
              <p className="mb-4 leading-relaxed text-neutral-mid">
                Staff access the CareStreamAI portal on any browser. No app download is needed, though a login is required. The chat is conversational: staff can ask follow-up questions within the same session and the system maintains full context throughout.
              </p>
              <ul className="space-y-2 text-sm text-neutral-mid">
                {[
                  'Session context maintained for natural follow-up conversations',
                  'Full conversation history available to the staff member',
                  'Suggested follow-up questions after each response',
                  'Works on any smartphone or desktop browser',
                ].map(p => <li key={p} className="flex items-start gap-2"><Check size={13} className="mt-0.5 shrink-0 text-teal" />{p}</li>)}
              </ul>
            </div>

            {/* Email */}
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
              <p className="mb-4 leading-relaxed text-neutral-mid">
                Staff email your dedicated CareStreamAI address from any device. The system replies within 30 seconds. Replying to the response continues the conversation. The system reads the full thread and maintains context across multiple exchanges.
              </p>
              <ul className="space-y-2 text-sm text-neutral-mid">
                {[
                  'No login and no app required, works from any email client',
                  'Response arrives in the same email thread within 30 seconds',
                  'Thread context maintained, reply to continue the conversation',
                  'Useful for staff who prefer email or are on shift handover',
                ].map(p => <li key={p} className="flex items-start gap-2"><Check size={13} className="mt-0.5 shrink-0 text-blue-500" />{p}</li>)}
              </ul>
            </div>

            {/* WhatsApp */}
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
              <p className="mb-4 leading-relaxed text-neutral-mid">
                Staff message the CareStreamAI WhatsApp number exactly as they would text a colleague. No app, no login, no setup. Responses arrive in under 30 seconds in the language asked. WhatsApp voice notes are also supported. Staff can speak their question hands-free.
              </p>
              <ul className="space-y-2 text-sm text-neutral-mid">
                {[
                  'No login or app download, staff use their existing WhatsApp',
                  'Voice notes transcribed and answered automatically',
                  'Phone numbers allowlisted by the manager for security',
                  'Suggested follow-up questions sent as tappable buttons',
                  'Session maintained for 24 hours for natural follow-up conversations',
                ].map(p => <li key={p} className="flex items-start gap-2"><Check size={13} className="mt-0.5 shrink-0 text-green-600" />{p}</li>)}
              </ul>
            </div>

            {/* Voice */}
            <div className="card-lift rounded-2xl border border-gray-100 bg-white p-8 shadow-card">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-50">
                  <Mic size={22} className="text-purple-600" />
                </div>
                <div>
                  <p className="font-bold text-neutral-dark">Voice input</p>
                  <p className="text-xs text-neutral-mid">Via WhatsApp voice note or chat portal</p>
                </div>
              </div>
              <p className="mb-4 leading-relaxed text-neutral-mid">
                Not everyone types quickly in their second language. Voice input lets staff speak their question naturally, mid-task and hands-free, in any language. The audio is transcribed, language-detected, and answered from your policies in the same language it was spoken.
              </p>
              <ul className="space-y-2 text-sm text-neutral-mid">
                {[
                  '50+ languages supported for voice input',
                  'Transcription shown alongside the answer for transparency',
                  'Same response quality as typed queries',
                  'Logged identically, voice queries appear in the audit trail',
                ].map(p => <li key={p} className="flex items-start gap-2"><Check size={13} className="mt-0.5 shrink-0 text-purple-500" />{p}</li>)}
              </ul>
            </div>

          </div>
        </div>
      </section>

      {/* ── 4. Multilingual engine ─────────────────────────────────────────── */}
      <section className="bg-neutral-light py-24">
        <div className="mx-auto max-w-content px-6">
          <div className="grid items-center gap-16 lg:grid-cols-2">
            <div>
              <SectionLabel>Multilingual Engine</SectionLabel>
              <h2 className="mb-5 text-4xl font-extrabold leading-tight text-neutral-dark md:text-5xl">
                50+ languages. Zero configuration.
              </h2>
              <p className="mb-6 text-lg leading-relaxed text-neutral-mid">
                Language detection is automatic and happens on every query. Staff do not select a language, toggle a setting, or use a special command. They simply ask their question, in the language they think in, and the answer comes back in the same language.
              </p>
              <p className="mb-8 text-lg leading-relaxed text-neutral-mid">
                Responses are always generated from your English-language policies. The translation happens at the point of response, not at the point of upload. This means you maintain one authoritative English policy library and every language version is derived from it consistently.
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
              <p className="mb-4 text-xs font-bold uppercase tracking-widest text-neutral-mid">The same question, six languages, one policy</p>
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
              <p className="pt-1 text-center text-xs text-neutral-mid">All answered from the same Falls Policy, each in the language asked</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── 5. Regulatory intelligence ────────────────────────────────────── */}
      <section className="bg-white py-24">
        <div className="mx-auto max-w-content px-6">
          <SectionLabel>Regulatory Intelligence</SectionLabel>
          <h2 className="mb-5 text-4xl font-extrabold leading-tight text-neutral-dark md:text-5xl">
            Over 50 UK regulatory frameworks, pre-loaded.
          </h2>
          <p className="mb-12 max-w-2xl text-lg leading-relaxed text-neutral-mid">
            Your internal policies don&rsquo;t exist in isolation. They&rsquo;re built on a foundation of UK law and regulation. CareStreamAI has over 50 regulatory frameworks pre-loaded so that when a staff member asks something that touches both your policy and an external requirement, the response explains how the two interact.
          </p>

          <div className="grid gap-8 lg:grid-cols-2">
            {/* How it works */}
            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-elevated">
              <div className="border-b border-gray-100 bg-gray-50 px-6 py-4">
                <p className="text-xs font-semibold uppercase tracking-widest text-neutral-mid">How it works</p>
              </div>
              <div className="divide-y divide-gray-100">
                {[
                  {
                    icon: <FileText size={16} className="text-teal" />,
                    bg: 'bg-teal-light',
                    title: 'Your internal policy is retrieved',
                    body: 'The most relevant section of your own policy is found and used as the primary source for the response.',
                  },
                  {
                    icon: <Layers size={16} className="text-amber-brand" />,
                    bg: 'bg-amber-50',
                    title: 'Relevant regulations are overlaid',
                    body: 'CareStreamAI identifies which of the 50+ pre-loaded frameworks apply to the question, including CQC, RIDDOR, MCA and GDPR, and adds that context.',
                  },
                  {
                    icon: <MessageSquare size={16} className="text-purple-600" />,
                    bg: 'bg-purple-50',
                    title: 'The interaction is explained',
                    body: 'The response explains both what your policy requires and what the law requires, including where they align, where they differ, and where your policy goes further.',
                  },
                ].map(({ icon, bg, title, body }) => (
                  <div key={title} className="flex gap-4 px-6 py-5">
                    <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${bg}`}>{icon}</div>
                    <div>
                      <p className="mb-1 font-semibold text-neutral-dark">{title}</p>
                      <p className="text-sm leading-relaxed text-neutral-mid">{body}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Frameworks included */}
            <div>
              <p className="mb-4 text-sm font-semibold uppercase tracking-widest text-neutral-mid">A selection of included frameworks</p>
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
                  <div key={name} className="flex items-center justify-between rounded-xl border border-gray-100 bg-neutral-light px-4 py-3">
                    <span className="text-sm font-medium text-neutral-dark">{name}</span>
                    <span className="shrink-0 rounded-full bg-amber-50 px-2.5 py-0.5 text-[10px] font-bold text-amber-brand">{reg}</span>
                  </div>
                ))}
                <div className="rounded-xl bg-teal/10 px-4 py-3 text-center">
                  <span className="text-sm font-semibold text-teal">+ 42 additional frameworks included</span>
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
              <SectionLabel light>The Knowledge Base</SectionLabel>
              <h2 className="mb-5 text-4xl font-extrabold leading-tight text-white md:text-5xl">
                Not just your policies. Your home, in detail.
              </h2>
              <p className="mb-6 text-lg leading-relaxed text-gray-300">
                CareStreamAI doesn&rsquo;t just answer generic questions about policies. Because it reads your actual documents, it extracts the specific facts that make your home unique: named individuals, direct-dial numbers, shift arrangements and local procedures.
              </p>
              <p className="mb-8 text-lg leading-relaxed text-gray-300">
                Upload your staff handbook, on-call rota, local infection control guidance, or any supporting document and it becomes immediately queryable. Staff get answers that reflect how your home actually operates, not how a generic care home might.
              </p>
              <div className="space-y-3">
                {[
                  { icon: Users,     label: 'Named individuals and contact numbers from your rota and handbook' },
                  { icon: FileText,  label: 'Local procedures and site-specific instructions' },
                  { icon: BookOpen,  label: 'Staff handbook: HR policies, leave, disciplinary and onboarding' },
                  { icon: Lock,      label: 'Seeded knowledge never mixed with other tenants\' data' },
                ].map(({ icon: Icon, label }) => (
                  <div key={label} className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                    <Icon size={16} className="mt-0.5 shrink-0 text-teal" />
                    <span className="text-sm leading-relaxed text-white/80">{label}</span>
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
              <SectionLabel>Policy Gap Detection</SectionLabel>
              <h2 className="mb-5 text-4xl font-extrabold leading-tight text-neutral-dark md:text-5xl">
                Find your gaps before CQC does.
              </h2>
              <p className="mb-6 text-lg leading-relaxed text-neutral-mid">
                Every time CareStreamAI cannot find an answer in your documents, it flags the query as a gap. Over time, patterns emerge: the same questions appearing repeatedly without policy coverage.
              </p>
              <p className="mb-8 text-lg leading-relaxed text-neutral-mid">
                Your Policy Gap Report shows exactly which questions your staff are asking that your current policies don&rsquo;t address, ranked by frequency. This is actionable evidence of where your policy library needs strengthening, surfaced before an inspection identifies it first.
              </p>
              <div className="space-y-4">
                {[
                  { title: 'Real-time flagging', body: 'Every unanswered query is flagged immediately, not batched monthly.' },
                  { title: 'Ranked by frequency', body: 'The most commonly asked unanswered questions are shown first, so you fix the most impactful gaps.' },
                  { title: 'Monthly summary report', body: 'A summary is compiled automatically and available for your manager review.' },
                  { title: 'Included in CQC Readiness Report', body: 'Gap resolution evidence is included as proof of continuous improvement.' },
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
          <SectionLabel>Analytics &amp; Compliance</SectionLabel>
          <h2 className="mb-5 text-4xl font-extrabold leading-tight text-neutral-dark md:text-5xl">
            Your compliance evidence builds automatically.
          </h2>
          <p className="mb-14 max-w-2xl text-lg leading-relaxed text-neutral-mid">
            Every interaction with CareStreamAI is logged and structured. Your analytics dashboard and CQC Readiness Report are generated from this data continuously. There is nothing to compile manually.
          </p>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[
              {
                Icon: BarChart2,
                iconBg: 'bg-teal-light',
                iconColor: 'text-teal',
                title: 'Usage analytics dashboard',
                body: 'See total queries, active staff, top policies accessed, busiest times, and channel breakdown (chat, email, WhatsApp, voice), updated in real time.',
              },
              {
                Icon: Globe,
                iconBg: 'bg-blue-50',
                iconColor: 'text-blue-600',
                title: 'Language activity report',
                body: 'Which languages your staff are asking in, how frequently, and which policies are being accessed across languages. CQC evidence of equitable access.',
              },
              {
                Icon: Users,
                iconBg: 'bg-purple-50',
                iconColor: 'text-purple-600',
                title: 'Staff engagement tracking',
                body: 'Which individuals are using the system, how often, and whether engagement changes after policy updates or training events.',
              },
              {
                Icon: FileText,
                iconBg: 'bg-amber-50',
                iconColor: 'text-amber-brand',
                title: 'Query history and audit log',
                body: 'Every query is stored: who asked, what they asked, which policy was cited, the full response, and the timestamp. Searchable and exportable.',
              },
              {
                Icon: ClipboardCheck,
                iconBg: 'bg-green-50',
                iconColor: 'text-green-700',
                title: 'CQC Readiness Report',
                body: 'A structured PDF covering policy access frequency, multilingual activity, staff engagement, gap identification and resolution, and version history. Ready for inspection.',
              },
              {
                Icon: ShieldAlert,
                iconBg: 'bg-red-50',
                iconColor: 'text-red-600',
                title: 'Policy version history',
                body: 'Every version of every uploaded policy is retained. You can see which version was in use when any query was answered, which is important for post-incident review.',
              },
            ].map(({ Icon, iconBg, iconColor, title, body }) => (
              <div key={title} className="card-lift rounded-2xl border border-gray-100 bg-white p-7 shadow-card">
                <div className={`mb-5 flex h-12 w-12 items-center justify-center rounded-2xl ${iconBg}`}>
                  <Icon size={22} className={iconColor} />
                </div>
                <h3 className="mb-3 font-bold text-neutral-dark">{title}</h3>
                <p className="text-sm leading-relaxed text-neutral-mid">{body}</p>
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
                <SectionLabel light>Data &amp; Security</SectionLabel>
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
        heading="See it working with your own policies."
        sub="Book a 30-minute demo and we'll show you CareStreamAI responding to real queries from your documents."
        primary={{ href: '/demo', label: 'Book a Free Demo' }}
        secondary={{ href: '/register', label: 'Start Free Trial' }}
      />
    </>
  )
}
