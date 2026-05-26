import Link from 'next/link'
import { PageHero } from '@/components/marketing/ui'
import { ContactForm } from './contact-form'

export const metadata = {
  title: 'Contact',
  description: 'Reach the CareStreamAI team with questions about pricing, your specific care setting, data security, or anything else. We respond within one business day.',
  openGraph: {
    title: 'Contact CareStreamAI',
    description: 'Get in touch — we respond to every message within one business day.',
    url: 'https://carestreamai.co.uk/contact',
  },
}

export default function ContactPage() {
  return (
    <>
      <PageHero
        label="Contact"
        title="Get in touch."
        subtitle="Questions about the product, pricing, data security, or your specific situation, we respond to every message within one business day."
      />

      <section className="bg-white py-24">
        <div className="mx-auto max-w-content px-6">
          <div className="grid gap-16 lg:grid-cols-2">
            <div>
              <h2 className="mb-10 text-3xl font-extrabold text-neutral-dark">How to reach us</h2>
              <div className="space-y-5">
                {[
                  {
                    icon: '✉️',
                    title: 'General enquiries',
                    detail: 'Questions about the product, pricing, or how CareStreamAI would work in your setting.',
                    email: 'hello@carestreamai.co.uk',
                  },
                  {
                    icon: '⚖️',
                    title: 'Data protection and legal',
                    detail: 'UK GDPR enquiries, DPA requests, and legal correspondence.',
                    email: 'dpo@carestreamai.co.uk',
                  },
                  {
                    icon: '🛠️',
                    title: 'Technical support',
                    detail: 'For existing subscribers, login issues, upload problems, or anything not working as expected.',
                    email: 'support@carestreamai.co.uk',
                  },
                ].map(({ icon, title, detail, email }) => (
                  <div key={title} className="card-lift flex gap-5 rounded-2xl border border-gray-100 bg-white p-6 shadow-card">
                    <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-teal-light text-2xl">{icon}</div>
                    <div>
                      <p className="mb-1 font-bold text-neutral-dark">{title}</p>
                      <p className="mb-2 text-sm leading-relaxed text-neutral-mid">{detail}</p>
                      <a href={`mailto:${email}`} className="text-sm font-semibold text-teal hover:underline">{email}</a>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-8 rounded-2xl bg-teal-light p-6">
                <p className="mb-1 font-bold text-teal">Prefer a call?</p>
                <p className="text-sm leading-relaxed text-neutral-mid">
                  Book a 30-minute demo and we can answer your questions live.{' '}
                  <Link href="/demo" className="font-semibold text-teal hover:underline">Book here →</Link>
                </p>
              </div>
            </div>

            <div>
              <div className="rounded-2xl border border-gray-100 bg-white p-8 shadow-elevated">
                <h3 className="mb-6 text-xl font-bold text-neutral-dark">Send a message</h3>
                <ContactForm />
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
