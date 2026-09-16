import Link from 'next/link'
import { ContactForm } from '@/app/(marketing)/contact/contact-form'
import './contact-pages-v2.css'

// The rebuilt /contact page.
//
// No new slot set: the theme's copy and the live CONTACT_SLOTS defaults are the same words, so
// both templates read the same slots. Two slots are added for what the theme has and the
// current page does not, the closing block and the note under the button.
//
// The form is the SAME ContactForm, in `variant="theme"`. It keeps the real lead POST and the
// WebMCP agent tool; only the markup differs.
//
// ONE DELIBERATE DIFFERENCE, worth a decision. The theme shows two contact routes, general and
// technical support. The live page has a third, "Data protection and legal", for UK GDPR and
// DPA requests. That is a real channel rather than a design flourish, so it is kept, in the
// theme's own card. Say the word and it comes out.

export interface Copy { (key: string): string }

const Mail = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"
       strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3.5 6.5 8.5 6 8.5-6" />
  </svg>
)

const Play = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"
       strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M8 5.5v13l10-6.5z" />
  </svg>
)

const ROUTES: { key: string; email: string }[] = [
  { key: 'reach.card1', email: 'hello@carestreamai.com' },
  { key: 'reach.card2', email: 'dpo@carestreamai.com' },
  { key: 'reach.card3', email: 'support@carestreamai.com' },
]

export function ContactPageV2({ s }: { s: Copy }) {
  return (
    <div className="cfpage-v2">
      <section className="cfhero">
        <div className="cfwrap cfhero-in">
          <span className="uc-eyebrow">{s('hero.label')}</span>
          <h1>{s('hero.title')}</h1>
          <p>{s('hero.subtitle')}</p>
        </div>
      </section>

      <section className="cfsec">
        <div className="cfwrap cfsec-in cfsplit">
          <div>
            <span className="cflabel">{s('reach.h2')}</span>
            <div className="cfroutes">
              {ROUTES.map(r => s(`${r.key}.title`) && (
                <div className="cfroute" key={r.key}>
                  <b>{s(`${r.key}.title`)}</b>
                  <p>{s(`${r.key}.detail`)}</p>
                  <a href={`mailto:${r.email}`}><Mail /> {r.email}</a>
                </div>
              ))}
              <div className="cfcall">
                <b>{s('call.title')}</b>
                <p>{s('call.body')}</p>
                <Link href="/demo"><Play /> Book a demo</Link>
              </div>
            </div>
          </div>

          <ContactForm
            variant="theme"
            formHeading={s('form.h3')}
            note={<>
              {s('form.note.before')}{' '}
              <Link href="/privacy">{s('form.note.link')}</Link>.
            </>}
          />
        </div>
      </section>

      <section className="cfend">
        <div className="cfwrap cfend-in">
          <h2>{s('end.h2')}</h2>
          <p>{s('end.lede')}</p>
          <div className="row">
            <Link className="cfbtn solid" href="/faq">Read the FAQ</Link>
            <Link className="cfbtn ghost" href="/demo">Book a demo</Link>
          </div>
        </div>
      </section>
    </div>
  )
}
