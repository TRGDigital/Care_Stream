import Link from 'next/link'
import { FileText, MessageSquare, Search, Shield, Zap } from 'lucide-react'
import { PageCta, SectionLabel } from '@/components/marketing/ui'

export const metadata = {
  title: 'CQC Report Chat | CareStreamAI',
  description: 'Upload your CQC inspection report and ask it anything. CareStream cross-references it against your policies and the CQC framework to find action points, explain findings, and help you draft a factual-accuracy challenge.',
  openGraph: {
    title: 'CQC Report Chat | CareStreamAI',
    description: 'Chat with your CQC inspection report, cross-referenced against your policies and the CQC framework.',
    url: 'https://carestreamai.com/cqc-report-chat',
  },
}

// ── CQC Report Chat Mockup ────────────────────────────────────────────────────

function CqcReportChatMockup() {
  return (
    <div className="w-full max-w-[400px] overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-white/20">
      {/* Header */}
      <div className="flex items-center justify-between bg-teal px-4 py-3">
        <div>
          <p className="text-sm font-bold text-white">CQC Report Chat</p>
          <p className="text-[11px] text-white/70">Crossways Care Home</p>
        </div>
        <div className="flex items-center gap-1.5 rounded-lg bg-white/20 px-2.5 py-1.5">
          <FileText size={12} className="text-white" />
          <span className="text-[10px] font-medium text-white">Report loaded</span>
        </div>
      </div>
      {/* Document pill */}
      <div className="border-b border-gray-100 bg-teal/5 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-teal/10">
            <FileText size={13} className="text-teal" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-[11px] font-semibold text-neutral-dark">
              CQC Inspection Report, Crossways Care Home
            </p>
            <p className="text-[10px] text-neutral-mid">March 2026 · 17 pages · ✓ Ready</p>
          </div>
        </div>
      </div>
      {/* Chat area */}
      <div className="space-y-3 bg-gray-50 p-4">
        {/* User message */}
        <div className="flex justify-end">
          <div className="max-w-[85%] rounded-tl-2xl rounded-tr-sm rounded-bl-2xl rounded-br-2xl bg-teal px-4 py-2.5">
            <p className="text-xs font-medium text-white">
              What action points did the inspector raise around staffing?
            </p>
          </div>
        </div>
        {/* AI response */}
        <div className="flex gap-2">
          <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-teal text-[9px] font-bold text-white">
            CS
          </div>
          <div className="max-w-[88%] rounded-tl-sm rounded-tr-2xl rounded-br-2xl rounded-bl-2xl bg-white p-3 shadow-sm">
            <p className="mb-2 text-xs font-semibold text-neutral-dark">
              Your March 2026 report raised 3 staffing action points:
            </p>
            <div className="space-y-1.5 text-[11px] text-neutral-mid">
              <div className="flex items-start gap-1.5">
                <span className="mt-0.5 flex-shrink-0 font-bold text-teal">1.</span>
                <p>Improve consistency of handover documentation (Section 4.2)</p>
              </div>
              <div className="flex items-start gap-1.5">
                <span className="mt-0.5 flex-shrink-0 font-bold text-teal">2.</span>
                <p>Review agency staff induction process</p>
              </div>
              <div className="flex items-start gap-1.5">
                <span className="mt-0.5 flex-shrink-0 font-bold text-teal">3.</span>
                <p>Ensure night shift competency records are up to date</p>
              </div>
            </div>
            <p className="mt-2 text-[10px] italic text-gray-400">
              Your Handover Policy already covers point 1. Want me to draft a response?
            </p>
          </div>
        </div>
      </div>
      {/* Input */}
      <div className="flex items-center gap-2 border-t border-gray-200 bg-white px-3 py-2.5">
        <div className="flex-1 rounded-full border border-gray-200 px-4 py-1.5 text-[11px] text-gray-300">
          Ask anything about your report…
        </div>
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-teal text-white">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </div>
      </div>
    </div>
  )
}

// ── Factual-accuracy challenge mockup ─────────────────────────────────────────

function ChallengeMockup() {
  return (
    <div className="w-full max-w-[400px] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl">
      <div className="flex items-center justify-between bg-teal px-4 py-3">
        <div>
          <p className="text-sm font-bold text-white">Factual accuracy challenge</p>
          <p className="text-[11px] text-white/70">Safe, handover documentation</p>
        </div>
        <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold text-white">Draft</span>
      </div>
      <div className="space-y-3 p-4">
        <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
          <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-neutral-mid">The finding (Section 4.2)</p>
          <p className="text-[11px] leading-snug text-neutral-dark">
            Handover records were found to be inconsistent across shifts.
          </p>
        </div>
        <div className="rounded-xl border border-teal/20 bg-teal/5 p-3">
          <p className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-teal">
            <FileText size={11} /> Suggested response
          </p>
          <p className="text-[11px] leading-relaxed text-neutral-dark">
            Our Handover Policy (v3, January 2026) requires a structured SBAR handover at every shift.
            Completed handover records for 1 to 14 March are available and show consistent use. We
            respectfully ask that this point be reviewed against that evidence.
          </p>
        </div>
        <p className="text-[10px] text-neutral-mid">Drafted from your report and your policies. Review before you send.</p>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

export default function CqcReportChatPage() {
  return (
    <>
      {/* ── Split hero ─────────────────────────────────────────────────────── */}
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
              <SectionLabel light>CQC Report Chat</SectionLabel>
              <h1 className="mb-5 max-w-xl text-4xl font-extrabold leading-tight text-white md:text-5xl">
                Your CQC inspection report. Now you can talk to it.
              </h1>
              <p className="mb-8 max-w-xl text-lg leading-relaxed text-white/75">
                Upload your latest CQC inspection report and ask it anything in plain English. CareStream
                cross-references it against your own policies and the CQC framework to find action points,
                explain findings, and help you plan your response, in seconds, not hours.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Link href="/register" className="btn-amber rounded-btn px-8 py-4 text-sm">
                  Start Free Trial
                </Link>
                <Link href="/demo" className="btn-ghost-white rounded-btn px-8 py-4 text-sm">
                  See a Demo
                </Link>
              </div>
            </div>
            <div className="flex justify-center lg:justify-end">
              <CqcReportChatMockup />
            </div>
          </div>
        </div>
      </section>

      {/* ── What you can ask ───────────────────────────────────────────────── */}
      <section className="bg-white py-24">
        <div className="mx-auto max-w-content px-6">
          <SectionLabel>Built For Care Managers</SectionLabel>
          <h2 className="mb-14 text-4xl font-extrabold leading-tight text-neutral-dark">
            Stop hunting through 17 pages. Just ask the question.
          </h2>
          <div className="grid gap-6 md:grid-cols-3">
            {[
              {
                Icon: Search,
                iconBg: 'bg-blue-100',
                iconColor: 'text-blue-600',
                title: 'Find action points instantly',
                body: 'Ask "What action points did the inspector raise?" and get a structured, numbered list drawn directly from your report, with section references where the report provides them.',
              },
              {
                Icon: MessageSquare,
                iconBg: 'bg-purple-100',
                iconColor: 'text-purple-600',
                title: 'Understand any finding',
                body: 'Ask about any CQC finding and get a plain English explanation. CareStream draws on the CQC framework to tell you what the inspector meant and what evidence you would need to address it.',
              },
              {
                Icon: Shield,
                iconBg: 'bg-green-100',
                iconColor: 'text-green-600',
                title: 'Plan your response',
                body: 'Ask "What do I need to do to address the Safe domain findings?" and get a clear action list, cross-referenced with the policies you already have in place.',
              },
            ].map(({ Icon, iconBg, iconColor, title, body }) => (
              <div key={title} className="card-lift rounded-2xl border border-gray-100 bg-white p-7 shadow-card">
                <div className={`mb-5 flex h-11 w-11 items-center justify-center rounded-xl ${iconBg}`}>
                  <Icon size={20} className={iconColor} />
                </div>
                <h3 className="mb-3 text-lg font-bold text-neutral-dark">{title}</h3>
                <p className="text-sm leading-relaxed text-neutral-mid">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ───────────────────────────────────────────────────── */}
      <section className="bg-neutral-light py-24">
        <div className="mx-auto max-w-content px-6">
          <SectionLabel>How It Works</SectionLabel>
          <h2 className="mb-14 text-4xl font-extrabold leading-tight text-neutral-dark">
            Three steps from report to clarity.
          </h2>
          <div className="grid gap-6 md:grid-cols-3">
            {[
              {
                step: '01',
                Icon: FileText,
                iconBg: 'bg-blue-100',
                iconColor: 'text-blue-600',
                title: 'Upload your CQC report',
                body: 'Drag and drop your latest CQC inspection report PDF. CareStream reads and indexes the full document in moments. No CQC login required.',
              },
              {
                step: '02',
                Icon: MessageSquare,
                iconBg: 'bg-purple-100',
                iconColor: 'text-purple-600',
                title: 'Ask in plain English',
                body: 'Type any question about your report, action points, specific domain findings, inspector language, what evidence is needed. No keyword searching, no page numbers.',
              },
              {
                step: '03',
                Icon: Zap,
                iconBg: 'bg-teal-light',
                iconColor: 'text-teal',
                title: 'Get specific answers',
                body: 'Every answer is grounded in your report and cross-referenced with your policies and the CQC framework, with section references where the report provides them. Precise answers about your inspection, your home.',
              },
            ].map(({ step, Icon, iconBg, iconColor, title, body }) => (
              <div key={step} className="card-lift rounded-2xl border border-gray-100 bg-white p-7 shadow-card">
                <div className="mb-5 flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal text-sm font-extrabold text-white shadow-teal-glow">
                    {step}
                  </span>
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${iconBg}`}>
                    <Icon size={18} className={iconColor} />
                  </div>
                </div>
                <h3 className="mb-3 text-lg font-bold text-neutral-dark">{title}</h3>
                <p className="text-sm leading-relaxed text-neutral-mid">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── More than a search tool ────────────────────────────────────────── */}
      <section className="bg-white py-24">
        <div className="mx-auto max-w-content px-6">
          <SectionLabel>More Than A Search Tool</SectionLabel>
          <h2 className="mb-10 text-4xl font-extrabold leading-tight text-neutral-dark">
            It reads your report against your whole compliance picture.
          </h2>
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <h3 className="mb-4 text-2xl font-extrabold leading-tight text-neutral-dark">
                Not the report in isolation. The report against your policies and the CQC framework.
              </h3>
              <p className="mb-4 text-lg leading-relaxed text-neutral-mid">
                CQC Report Chat does not read your inspection report on its own. It cross-references the
                report against your own policies and the CQC assessment framework, so it can tell you not
                just what the inspector said, but whether your policies already answer it and what evidence
                would support your case.
              </p>
              <p className="mb-6 text-lg leading-relaxed text-neutral-mid">
                It can also help you draft a factual-accuracy challenge, the formal response you can send to
                CQC to correct factual errors in a draft report. CareStream drafts it from your report and
                your policies. You review it, and you decide whether to send it.
              </p>
              <div className="space-y-3">
                {[
                  { Icon: Search,   label: 'Cross-references your policies', text: 'Sees where your existing policies already address a finding, so you can evidence it.' },
                  { Icon: Shield,   label: 'Maps to the CQC framework',     text: 'Explains what the inspector means and what evidence is expected, using the CQC assessment framework.' },
                  { Icon: FileText, label: 'Drafts your challenge',         text: 'Helps you draft a factual-accuracy challenge grounded in your report and policies, for you to review and send.' },
                ].map(({ Icon, label, text }) => (
                  <div key={label} className="flex gap-3 rounded-xl border border-gray-100 bg-gray-50 p-4">
                    <Icon size={18} className="mt-0.5 flex-shrink-0 text-teal" />
                    <div>
                      <p className="mb-0.5 text-sm font-semibold text-neutral-dark">{label}</p>
                      <p className="text-sm leading-relaxed text-neutral-mid">{text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex justify-center lg:justify-end">
              <ChallengeMockup />
            </div>
          </div>
        </div>
      </section>

      {/* ── Sample questions ───────────────────────────────────────────────── */}
      <section className="bg-neutral-light py-24">
        <div className="mx-auto max-w-content px-6">
          <SectionLabel>Questions You Can Ask</SectionLabel>
          <h2 className="mb-12 text-4xl font-extrabold text-neutral-dark">
            The questions care managers actually ask.
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[
              'What action points did the inspector raise?',
              'What did the inspector say about medication management?',
              'Which CQC key questions were rated Requires Improvement?',
              'What evidence did the inspector say was missing?',
              'Do my policies already cover the handover finding?',
              'What does the inspector mean by "embedding"?',
              'Help me draft a factual-accuracy challenge for the staffing finding.',
              'Show me everything the inspector said about staffing.',
              'What does section 5.3 mean in plain English?',
            ].map((q) => (
              <div key={q} className="flex items-start gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-card">
                <div className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-teal/10">
                  <MessageSquare size={10} className="text-teal" />
                </div>
                <p className="text-sm font-medium text-neutral-dark">{q}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Trust strip ────────────────────────────────────────────────────── */}
      <section className="bg-teal-gradient py-16">
        <div className="mx-auto max-w-content px-6">
          <div className="grid gap-8 text-center md:grid-cols-3">
            {[
              {
                stat: 'No CQC login',
                label: 'Just upload your PDF, the report stays private to your account',
              },
              {
                stat: 'Secure',
                label: 'Reports are encrypted at rest and never used to train AI models',
              },
              {
                stat: 'Ready in moments',
                label: 'Your report is indexed and ready to query before the kettle boils',
              },
            ].map(({ stat, label }) => (
              <div key={stat}>
                <p className="mb-2 text-2xl font-extrabold text-white">{stat}</p>
                <p className="text-sm leading-relaxed text-white/75">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Legal note ─────────────────────────────────────────────────────── */}
      <section className="bg-amber-50 py-14">
        <div className="mx-auto max-w-3xl px-6">
          <div className="flex gap-4">
            <div className="mt-1 text-2xl text-amber-600">⚠</div>
            <div>
              <p className="mb-1 font-bold text-amber-900">For information and planning purposes</p>
              <p className="text-sm leading-relaxed text-amber-800">
                CQC Report Chat helps you understand and navigate your inspection report. It does not provide
                regulatory advice and does not guarantee any particular outcome at future inspections. Any
                factual-accuracy challenge it drafts is a starting point for you to review. Always verify
                important decisions with your regulatory lead or legal adviser.
              </p>
            </div>
          </div>
        </div>
      </section>

      <PageCta
        heading="Start talking to your CQC report today."
        sub="Upload your latest inspection report and ask your first question in minutes."
        primary={{ href: '/register', label: 'Start Free Trial' }}
        secondary={{ href: '/demo', label: 'Book a Demo' }}
      />
    </>
  )
}
