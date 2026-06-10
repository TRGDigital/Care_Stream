import { Check } from 'lucide-react'
import { PageHero } from '@/components/marketing/ui'
import { DemoForm } from '@/components/marketing/demo-form'

export const metadata = {
  title: 'Book a Demo',
  description: 'Book a 30-minute walkthrough of CareStreamAI using your own policies. See exactly what your team would experience, with multilingual queries and instant, evidence-based answers.',
  openGraph: {
    title: 'Book a CareStreamAI Demo',
    description: 'A 30-minute walkthrough using your own policies. No pressure, just the product.',
    url: 'https://carestreamai.com/demo',
  },
}

export default function DemoPage() {
  return (
    <>
      <PageHero
        label="Book a Demo"
        title="See CareStreamAI with your own policies."
        subtitle="Book a 30-minute walkthrough with our team. We'll use your actual policies if you share them in advance, so you see exactly what your team would experience."
      />

      <section className="bg-white py-24">
        <div className="mx-auto max-w-content px-6">
          <div className="grid gap-16 lg:grid-cols-2">
            <div>
              <h2 className="mb-10 text-3xl font-extrabold text-neutral-dark">What to expect</h2>
              <div className="space-y-7">
                {[
                  { num: '01', title: '30 minutes, no pressure', body: 'A focused walkthrough of the product, not a sales presentation. We show you what it does and you tell us whether it fits.' },
                  { num: '02', title: 'Using your own documents', body: 'If you share two or three policies in advance, we will load them into a demo environment so you can see your own content in the system.' },
                  { num: '03', title: 'Live multilingual demonstration', body: 'We will show you queries submitted in multiple languages and the instant responses your team would receive.' },
                  { num: '04', title: 'Your questions, answered', body: 'We leave time for your questions, about data security, compliance, pricing, or anything else that matters to your organisation.' },
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
                <p className="mb-2 font-bold text-teal">Prefer to try it yourself first?</p>
                <p className="text-sm leading-relaxed text-neutral-mid">
                  Start a free 14-day trial — no charge until day 14. You can still book a demo any time during or after the trial.
                </p>
                <div className="mt-4 flex flex-wrap gap-4 text-sm text-neutral-mid">
                  {['14-day free trial', 'No charge until day 14', 'Set up in under an hour'].map(item => (
                    <span key={item} className="flex items-center gap-1.5">
                      <Check size={13} className="text-teal" /> {item}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <div className="rounded-2xl border border-gray-100 bg-white p-8 shadow-elevated">
                <h3 className="mb-6 text-xl font-bold text-neutral-dark">Request a demo</h3>
                <DemoForm />
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
