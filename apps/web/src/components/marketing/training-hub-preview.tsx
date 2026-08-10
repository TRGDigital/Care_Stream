import { GraduationCap, ShieldCheck, Users, Activity, Award, CheckCircle2 } from 'lucide-react'
import { SectionLabel } from '@/components/marketing/ui'
import { SiteImage } from '@/components/site-image'

// "How your team gets trained" — explains delivery and shows a faithful, on-brand
// recreation of the CareStream hub "My Training" view (modules allocated to a staff
// member, their status, Start/Review/Certificate, and the Follow-up tab). The
// current module is featured as a row so it ties to the page.
export function TrainingHubPreview({ moduleTitle, illustrationUrl }: { moduleTitle: string; illustrationUrl?: string }) {
  const steps = [
    { n: '01', title: 'Buy & allocate', body: `Assign ${moduleTitle} to each staff member in seconds — no course-builder, no per-person setup.` },
    { n: '02', title: 'They complete it in the hub', body: 'Staff work through the module on any device, in over 60 languages. Teach, then check — a wrong answer sends a short follow-up lesson.' },
    { n: '03', title: 'You track it', body: 'See live completion status and a certificate for every person — audit-ready evidence for CQC.' },
  ]

  const rows = [
    { title: 'Safeguarding Adults', Icon: ShieldCheck, tint: 'bg-rose-100 text-rose-600', done: true },
    { title: moduleTitle, Icon: GraduationCap, tint: 'bg-teal-light text-teal', done: false, featured: true, img: illustrationUrl },
    { title: 'Moving & Handling of People', Icon: Users, tint: 'bg-amber-50 text-amber-brand', done: false },
    { title: 'Infection Prevention & Control', Icon: Activity, tint: 'bg-blue-50 text-blue-600', done: true },
  ]

  const stats = [
    { n: '2', l: 'To do', c: 'text-amber-brand' },
    { n: '0', l: 'In progress', c: 'text-blue-600' },
    { n: '3', l: 'Completed', c: 'text-green-600' },
    { n: '0%', l: 'Avg score', c: 'text-amber-brand' },
  ]

  return (
    <section className="bg-white py-24">
      <div className="mx-auto max-w-content px-6">
        <div className="mb-14 max-w-2xl">
          <SectionLabel>How your team gets trained</SectionLabel>
          <h2 className="mb-4 text-3xl font-extrabold leading-tight text-neutral-dark md:text-4xl">
            From your dashboard to your team, in the CareStream hub.
          </h2>
          <p className="text-lg leading-relaxed text-neutral-mid">
            Training is delivered in the hub each staff member logs into. You allocate the modules, they
            complete them in their own language, and you get the completion records and certificates for
            your CQC evidence — with any gaps closed by automatic follow-up training.
          </p>
        </div>

        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          {/* Steps */}
          <ol className="space-y-8">
            {steps.map((s) => (
              <li key={s.n} className="flex gap-5">
                <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-teal text-sm font-extrabold text-white shadow-teal-glow">{s.n}</span>
                <div>
                  <h3 className="mb-1 text-lg font-bold text-neutral-dark">{s.title}</h3>
                  <p className="leading-relaxed text-neutral-mid">{s.body}</p>
                </div>
              </li>
            ))}
          </ol>

          {/* Hub "My Training" mock */}
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-elevated">
            {/* window bar */}
            <div className="flex items-center gap-1.5 border-b border-gray-100 bg-neutral-light px-4 py-2.5">
              <span className="h-2.5 w-2.5 rounded-full bg-gray-300" />
              <span className="h-2.5 w-2.5 rounded-full bg-gray-300" />
              <span className="h-2.5 w-2.5 rounded-full bg-gray-300" />
              <span className="ml-3 text-xs text-neutral-mid">The CareStream hub</span>
            </div>
            {/* tabs */}
            <div className="flex items-center gap-5 border-b border-gray-100 px-5 pt-4">
              <span className="border-b-2 border-teal pb-2.5 text-sm font-bold text-neutral-dark">My Training</span>
              <span className="flex items-center gap-1.5 pb-2.5 text-sm font-semibold text-neutral-mid">
                Follow-up
                <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">15</span>
              </span>
            </div>
            {/* body */}
            <div className="bg-[#faf8ff] p-5">
              <div className="mb-5 grid grid-cols-4 gap-2.5">
                {stats.map((s) => (
                  <div key={s.l} className="rounded-xl border border-gray-100 bg-white p-3 text-center">
                    <div className={`text-xl font-extrabold ${s.c}`}>{s.n}</div>
                    <div className="mt-0.5 text-[10px] leading-tight text-neutral-mid">{s.l}</div>
                  </div>
                ))}
              </div>
              <div className="space-y-2.5">
                {rows.map((r) => (
                  <div
                    key={r.title}
                    className={`flex items-center gap-3 rounded-xl border p-3 ${r.featured ? 'border-teal bg-teal-light/25 ring-1 ring-teal' : 'border-gray-100 bg-white'}`}
                  >
                    {r.img ? (
                      <SiteImage src={r.img} alt="" className="h-9 w-9 flex-shrink-0 rounded-lg object-cover" />
                    ) : (
                      <span className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg ${r.tint}`}>
                        <r.Icon size={18} />
                      </span>
                    )}
                    {r.done ? (
                      <CheckCircle2 size={16} className="flex-shrink-0 text-green-500" />
                    ) : (
                      <span className="h-4 w-4 flex-shrink-0 rounded-full border-2 border-gray-300" />
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-neutral-dark">{r.title}</p>
                      <div className="mt-1 flex gap-1.5">
                        <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700">Statutory</span>
                        <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${r.done ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {r.done ? 'Complete' : 'Not started'}
                        </span>
                      </div>
                    </div>
                    <div className="ml-auto flex flex-shrink-0 items-center gap-1.5">
                      {r.done ? (
                        <>
                          <span className="hidden items-center gap-1 rounded-md border border-gray-200 px-2 py-1 text-[11px] font-semibold text-neutral-mid sm:inline-flex">
                            <Award size={12} /> Certificate
                          </span>
                          <span className="rounded-md bg-purple-600 px-2.5 py-1 text-[11px] font-semibold text-white">Review</span>
                        </>
                      ) : (
                        <span className="rounded-md bg-purple-600 px-3 py-1 text-[11px] font-semibold text-white">Start</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
