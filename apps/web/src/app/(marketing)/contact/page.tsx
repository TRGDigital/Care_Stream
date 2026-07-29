import Link from 'next/link'
import { PageHero } from '@/components/marketing/ui'
import { ContactForm } from './contact-form'
import { getContentSlots, makeSlot } from '@/lib/page-slots'
import { CONTACT_SLOTS } from '@/lib/page-slots/contact'
import { JsonLd } from '@/components/json-ld'
import { contactPageSchema } from '@/lib/schema'

export const metadata = {
  alternates: { canonical: 'https://www.carestreamai.com/contact' },
  title: 'Contact',
  description: 'Reach the CareStreamAI team with questions about pricing, your specific care setting, data security, or anything else. We respond within one business day.',
  openGraph: {
    title: 'Contact CareStreamAI',
    description: 'Get in touch — we respond to every message within one business day.',
    url: 'https://www.carestreamai.com/contact',
  },
}

export default async function ContactPage() {
  const s = makeSlot(CONTACT_SLOTS, await getContentSlots('/contact'))
  return (
    <>
      <JsonLd data={contactPageSchema()} />
      <PageHero
        label={s('hero.label')}
        title={s('hero.title')}
        subtitle={s('hero.subtitle')}
      />

      <section className="bg-white py-24">
        <div className="mx-auto max-w-content px-6">
          <div className="grid gap-16 lg:grid-cols-2">
            <div>
              <h2 className="mb-10 text-3xl font-extrabold text-neutral-dark">{s('reach.h2')}</h2>
              <div className="space-y-5">
                {[
                  { icon: '✉️', key: 'reach.card1', email: 'hello@carestreamai.com' },
                  { icon: '⚖️', key: 'reach.card2', email: 'dpo@carestreamai.com' },
                  { icon: '🛠️', key: 'reach.card3', email: 'support@carestreamai.com' },
                ].map(({ icon, key, email }) => (
                  <div key={key} className="card-lift flex gap-5 rounded-2xl border border-gray-100 bg-white p-6 shadow-card">
                    <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-teal-light text-2xl">{icon}</div>
                    <div>
                      <p className="mb-1 font-bold text-neutral-dark">{s(`${key}.title`)}</p>
                      <p className="mb-2 text-sm leading-relaxed text-neutral-mid">{s(`${key}.detail`)}</p>
                      <a href={`mailto:${email}`} className="text-sm font-semibold text-teal hover:underline">{email}</a>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-8 rounded-2xl bg-teal-light p-6">
                <p className="mb-1 font-bold text-teal">{s('call.title')}</p>
                <p className="text-sm leading-relaxed text-neutral-mid">
                  {s('call.body')}{' '}
                  <Link href="/demo" className="font-semibold text-teal hover:underline">Book here →</Link>
                </p>
              </div>
            </div>

            <div>
              <div className="rounded-2xl border border-gray-100 bg-white p-8 shadow-elevated">
                <h3 className="mb-6 text-xl font-bold text-neutral-dark">{s('form.h3')}</h3>
                <ContactForm />
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
