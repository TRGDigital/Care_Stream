import { Check } from 'lucide-react'
import { PageHero } from '@/components/marketing/ui'
import { DemoForm } from '@/components/marketing/demo-form'
import { getContentSlots, makeSlot } from '@/lib/page-slots'
import { DEMO_SLOTS } from '@/lib/page-slots/demo'

export const metadata = {
  alternates: { canonical: 'https://www.carestreamai.com/demo' },
  title: 'Book a Demo',
  description: 'Book a 30-minute walkthrough of CareStreamAI using your own policies. See exactly what your team would experience, with multilingual queries and instant, evidence-based answers.',
  openGraph: {
    title: 'Book a CareStreamAI Demo',
    description: 'A 30-minute walkthrough using your own policies. No pressure, just the product.',
    url: 'https://www.carestreamai.com/demo',
  },
}

export default async function DemoPage() {
  const s = makeSlot(DEMO_SLOTS, await getContentSlots('/demo'))
  return (
    <>
      <PageHero
        label={s('hero.label')}
        title={s('hero.title')}
        subtitle={s('hero.subtitle')}
      />

      <section className="bg-white py-24">
        <div className="mx-auto max-w-content px-6">
          <div className="grid gap-16 lg:grid-cols-2">
            <div>
              <h2 className="mb-10 text-3xl font-extrabold text-neutral-dark">{s('expect.h2')}</h2>
              <div className="space-y-7">
                {[
                  { num: '01', title: s('expect.step1.title'), body: s('expect.step1.body') },
                  { num: '02', title: s('expect.step2.title'), body: s('expect.step2.body') },
                  { num: '03', title: s('expect.step3.title'), body: s('expect.step3.body') },
                  { num: '04', title: s('expect.step4.title'), body: s('expect.step4.body') },
                ].map(({ num, title, body }) => (
                  <div key={num} className="flex gap-5">
                    <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-teal text-sm font-extrabold text-white shadow-teal-glow">
                      {num}
                    </div>
                    <div>
                      <p className="mb-1.5 font-bold text-neutral-dark">{title}</p>
                      <p className="leading-relaxed text-neutral-mid">{body}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-10 rounded-2xl bg-teal-light p-6">
                <p className="mb-2 font-bold text-teal">{s('trial.title')}</p>
                <p className="text-sm leading-relaxed text-neutral-mid">
                  {s('trial.body')}
                </p>
                <div className="mt-4 flex flex-wrap gap-4 text-sm text-neutral-mid">
                  {[s('trial.chip1'), s('trial.chip2'), s('trial.chip3')].map(item => (
                    <span key={item} className="flex items-center gap-1.5">
                      <Check size={13} className="text-teal" /> {item}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <div className="rounded-2xl border border-gray-100 bg-white p-8 shadow-elevated">
                <h3 className="mb-6 text-xl font-bold text-neutral-dark">{s('form.h3')}</h3>
                <DemoForm />
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
