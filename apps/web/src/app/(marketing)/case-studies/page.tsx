import { PageHero, PageCta } from '@/components/marketing/ui'
import { EditableContentBlock } from '@/components/marketing/editable-content-block'
import { getContentSlots, makeSlot } from '@/lib/page-slots'
import { CASE_STUDIES_SLOTS } from '@/lib/page-slots/case-studies'

const RICH_LINK = '[&_a]:font-semibold [&_a]:text-teal [&_a]:underline [&_a]:underline-offset-2'

export const metadata = {
  alternates: { canonical: 'https://www.carestreamai.com/case-studies' },
  title: 'Case Studies',
  description: 'See how UK care providers have used CareStreamAI to reduce out-of-hours manager calls, support international staff, and build stronger CQC inspection evidence.',
  openGraph: {
    images: ['/og-image.png'],
    title: 'CareStreamAI Case Studies',
    description: 'Real results from UK care providers using CareStreamAI.',
    url: 'https://www.carestreamai.com/case-studies',
  },
}

export default async function CaseStudiesPage() {
  const s = makeSlot(CASE_STUDIES_SLOTS, await getContentSlots('/case-studies'))

  const CASE_STUDIES = [
    { key: 'cs1', icon: '🏠' },
    { key: 'cs2', icon: '🚗' },
    { key: 'cs3', icon: '🏢' },
  ]

  return (
    <>
      <PageHero
        label={s('hero.label')}
        title={s('hero.title')}
        subtitle={s('hero.subtitle')}
      />

      <section className="bg-white py-24">
        <div className="mx-auto max-w-content px-6">
          <div className="space-y-20">
            {CASE_STUDIES.map(({ key, icon }, i) => {
              const metrics = [
                { label: s(`${key}.metric1.label`), before: s(`${key}.metric1.before`), after: s(`${key}.metric1.after`) },
                { label: s(`${key}.metric2.label`), before: s(`${key}.metric2.before`), after: s(`${key}.metric2.after`) },
              ]
              return (
                <div key={key} className={`grid gap-12 lg:grid-cols-2 lg:items-start ${i % 2 !== 0 ? 'lg:grid-flow-col-dense' : ''}`}>
                  <div className={i % 2 !== 0 ? 'lg:col-start-2' : ''}>
                    <div className="mb-5 inline-flex items-center gap-2 rounded-pill bg-teal-light px-4 py-1.5">
                      <span>{icon}</span>
                      <span className="text-xs font-bold text-teal">{s(`${key}.tag`)}</span>
                    </div>
                    <h2 className="mb-5 text-3xl font-extrabold leading-tight text-neutral-dark">{s(`${key}.title`)}</h2>
                    <div className={`mb-8 text-lg leading-relaxed text-neutral-mid ${RICH_LINK}`} dangerouslySetInnerHTML={{ __html: s(`${key}.summary`) }} />
                    <div className="rounded-2xl border-l-4 border-teal bg-teal-light px-7 py-6">
                      <p className="mb-4 text-lg italic leading-relaxed text-neutral-dark">&ldquo;{s(`${key}.quote`)}&rdquo;</p>
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-teal text-sm font-bold text-white">{s(`${key}.initials`)}</div>
                        <p className="text-sm font-semibold text-neutral-dark">{s(`${key}.attribution`)}</p>
                      </div>
                    </div>
                  </div>

                  <div className={`flex flex-col gap-5 justify-center ${i % 2 !== 0 ? 'lg:col-start-1 lg:row-start-1' : ''}`}>
                    {metrics.map(({ label, before, after }) => (
                      <div key={label} className="card-lift rounded-2xl border border-gray-100 bg-white p-7 shadow-card">
                        <p className="mb-5 font-bold text-neutral-dark">{label}</p>
                        <div className="grid grid-cols-2 gap-6">
                          <div className="rounded-xl bg-neutral-light p-4 text-center">
                            <p className="mb-1 text-xs font-bold uppercase tracking-widest text-neutral-mid">{s('metrics.beforeLabel')}</p>
                            <p className="text-sm text-neutral-mid">{before}</p>
                          </div>
                          <div className="rounded-xl bg-teal-light p-4 text-center">
                            <p className="mb-1 text-xs font-bold uppercase tracking-widest text-teal">{s('metrics.afterLabel')}</p>
                            <p className="font-bold text-neutral-dark">{after}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      <EditableContentBlock path="/case-studies" />

      <PageCta
        heading={s('cta.heading')}
        sub={s('cta.sub')}
        primary={{ href: '/demo', label: s('cta.primary') }}
        secondary={{ href: '/register', label: s('cta.secondary') }}
      />
    </>
  )
}
