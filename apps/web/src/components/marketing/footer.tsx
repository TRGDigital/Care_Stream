import Link from 'next/link'
import { CookieSettingsButton } from './cookie-consent'
import { SETTINGS_LIST } from '@/lib/settings/list'
import './site-chrome.css'
import './site-chrome-extra.css'

// The site footer, in the theme's markup (.site-foot, .fbrand, .fcols, .fbase), styled by the
// ported chrome stylesheet.
//
// Kept from the footer this replaces, because each does a job the theme's footer does not:
// - links added in the console (Pages tab, "Show in footer navigation") still join their column;
// - Cookie settings, so a visitor can change their consent from any page;
// - the line that CareStream is not a legal or compliance adviser and that a readiness report is
//   no guarantee of a rating.
// The ICO registration the theme adds is checked: ZC221613 is TRG Digital Ltd on the public
// register, valid to 12 August 2027.

// Accreditations shown above the footer base. Each links to the body that issued it, so a
// visitor can check the claim rather than take a logo on trust. Only add a badge we actually
// hold: an accreditation mark is a claim about the business, not decoration.
type Badge = {
  src: string; alt: string; href: string; label: string
  /** Natural size of the asset, so Next can reserve the space and nothing shifts on load. */
  w: number; h: number
  /** Landscape lockup with fine print, so it needs a slightly larger cap to stay legible. */
  wide?: boolean
  /** Our own statement rather than a third party's mark: stays internal, no new tab. */
  selfDeclared?: boolean
}

const BADGES: Badge[] = [
  {
    src: '/badges/gbc-accredited.png', w: 112, h: 120,
    alt: 'Good Business Charter accredited',
    href: 'https://www.goodbusinesscharter.com/',
    label: 'Good Business Charter',
  },
  {
    src: '/badges/cpd-certification-service.png', w: 189, h: 120, wide: true,
    // CareStream is an accredited CPD PROVIDER (No. 50224). The training modules
    // themselves are still going through certification, so nothing here may say or
    // imply "CPD certified training" — that claim belongs to a module, not to us.
    alt: 'CPD Certification Service accredited provider',
    href: 'https://www.cpduk.co.uk/providers/carestream',
    label: 'CPD accredited provider',
  },
  {
    src: '/badges/ico-registered.png', w: 119, h: 120,
    alt: "Registered with the Information Commissioner's Office",
    // The same register entry the base row links to: ZC221613, TRG Digital Ltd.
    href: 'https://ico.org.uk/ESDWebPages/Entry/ZC221613',
    label: 'ICO registered',
  },
  {
    // Level 1, Committed — the file DWP issued with the accreditation. The mark is Crown
    // Copyright: do not rebuild, recolour, stretch or substitute a redrawn copy, and do not
    // swap in another level's badge. Valid for 3 years from sign-up, so it comes down (or
    // moves up a level) when the accreditation is renewed.
    src: '/badges/disability-confident-committed.png', w: 249, h: 120,
    alt: 'Disability Confident Committed',
    href: 'https://www.gov.uk/government/collections/disability-confident-campaign',
    label: 'Disability Confident Committed',
  },
  {
    // Unlike the four above, this is NOT issued or checked by anyone: there is no general
    // "GDPR compliant" certification, and this graphic carries no issuer. It is our own
    // statement about how we handle data, so it links to /trust where that statement is
    // actually made and can be read, rather than standing as a bare claim. Keep it last,
    // after the marks a third party did issue.
    src: '/badges/gdpr-compliant.png', w: 286, h: 120,
    alt: 'GDPR compliant',
    href: '/trust',
    label: 'GDPR compliant',
    selfDeclared: true,
  },
]

type LinkItem = { href: string; label: string }

const USER_CASES: LinkItem[] = [
  { href: '/uses/multilingual-staff-hub', label: 'Staff Hub in 60+ languages' },
  { href: '/uses/resident-knowledge', label: 'Resident Knowledge' },
  { href: '/uses/policy-gaps', label: 'Policy Gaps' },
  { href: '/uses/policy-inconsistencies', label: 'Policy Inconsistencies' },
  { href: '/uses/cqc-wording-alignment', label: 'CQC Wording Alignment' },
  { href: '/uses/out-of-date-policies', label: 'Policies Out of Date' },
  { href: '/uses/staff-compliance', label: 'Staff Compliance' },
  { href: '/uses/annual-training', label: 'Annual Training' },
  { href: '/uses/adhoc-training', label: 'Adhoc Training' },
  { href: '/uses/face-to-face-training', label: 'Face to Face Training' },
  { href: '/uses/training-matrix', label: 'Training Matrix' },
  { href: '/uses/training-calendar', label: 'Training Calendar' },
  { href: '/uses/cqc-prep-questions', label: 'CQC Prep Questions' },
  { href: '/uses/staff-onboarding', label: 'Staff Onboarding' },
]
const PRODUCT: LinkItem[] = [
  { href: '/how-it-works', label: 'How It Works' },
  { href: '/care-policies', label: 'Features' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/who-its-for', label: 'Who It\'s For' },
  { href: '/cqc-compliance', label: 'CQC & Compliance' },
  { href: '/training-platform', label: 'Training' },
  { href: '/staff-training', label: 'Annual Training' },
  { href: '/languages', label: 'Languages' },
  { href: '/features/web-chat-interface', label: 'Web Chat Interface' },
  { href: '/regulatory-knowledge', label: 'Regulatory Knowledge' },
  { href: '/demo', label: 'Book a Demo' },
]
const WHO_WE_SERVE: LinkItem[] = [
  { href: '/who-we-serve', label: 'All settings' },
  ...SETTINGS_LIST.map(s => ({ href: `/${s.slug}`, label: s.label })),
]
const TRUST: LinkItem[] = [
  { href: '/trust', label: 'Trust & Security' },
  { href: '/rag', label: 'RAG' },
  { href: '/privacy', label: 'Privacy Policy' },
  { href: '/terms', label: 'Terms of Service' },
  { href: '/dpa', label: 'Data Processing Agreement' },
  { href: '/cookies', label: 'Cookie Policy' },
]
const COMPANY: LinkItem[] = [
  { href: '/about', label: 'About' },
  { href: '/case-studies', label: 'Case Studies' },
  { href: '/blog', label: 'Blog' },
  { href: '/faq', label: 'FAQ' },
  { href: '/contact', label: 'Contact' },
]
const GET_STARTED: LinkItem[] = [
  { href: '/register', label: 'Start Free Trial' },
  { href: '/demo', label: 'Book a Demo' },
  { href: '/login', label: 'Sign In' },
  { href: '/help', label: 'Help Centre' },
]

// The console's footer groups, matched to the theme's columns.
const GROUPS: { heading: string; consoleGroup: string | null; links: LinkItem[]; wide?: boolean }[] = [
  { heading: 'User cases', consoleGroup: null, links: USER_CASES, wide: true },
  { heading: 'Product', consoleGroup: 'Product', links: PRODUCT },
  { heading: 'Who we serve', consoleGroup: 'Who We Serve', links: WHO_WE_SERVE },
  { heading: 'Trust & legal', consoleGroup: 'Trust & Legal', links: TRUST },
  { heading: 'Company', consoleGroup: 'Company', links: COMPANY },
  { heading: 'Get started', consoleGroup: 'Get Started', links: GET_STARTED },
]

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

interface FooterPage { path: string; title: string; footer_group: string | null; footer_label: string | null; footer_sort: number }

async function getFooterPages(): Promise<FooterPage[]> {
  try {
    const res = await fetch(`${API_URL}/public/site-pages/footer`, { next: { revalidate: 60 } })
    if (res.ok) return (await res.json())?.data?.pages ?? []
  } catch {
    // fall back to the static links only
  }
  return []
}

const stripBrand = (t: string) => t.replace(/\s*\|\s*CareStream\s*$/i, '').trim()

export async function MarketingFooter() {
  const dbPages = await getFooterPages()
  const groups = GROUPS.map(g => {
    const extra = dbPages
      .filter(p => g.consoleGroup && p.footer_group === g.consoleGroup && !g.links.some(l => l.href === p.path))
      .sort((a, b) => (a.footer_sort || 0) - (b.footer_sort || 0))
      .map(p => ({ href: p.path, label: p.footer_label || stripBrand(p.title || p.path) }))
    return { ...g, links: [...g.links, ...extra] }
  })

  return (
    <div className="cschrome">
      {/* Accreditation strip. Deliberately OUTSIDE <footer>: these are claims about the
          business, not footer navigation, and sitting above the footer they read as a
          closing statement rather than small print. Rendered by MarketingFooter, so it
          appears on the home page and every page in the (marketing) group. */}
      <section className="faccred" aria-label="Accreditations and registrations">
        <div className="wrap">
          <p className="faccred-lead">Accreditations and compliance</p>
          <ul className="faccred-row">
            {BADGES.map(b => (
              <li key={b.label}>
                <a
                  href={b.href}
                  title={b.label}
                  {...(b.selfDeclared ? {} : { rel: 'noopener noreferrer', target: '_blank' })}
                >
                  <img className={b.wide ? 'wide' : undefined} src={b.src} alt={b.alt} width={b.w} height={b.h} loading="lazy" />
                </a>
              </li>
            ))}
          </ul>
          <p className="faccred-note">
            CPD Provider No. 50224 · ICO registration ZC221613
          </p>
        </div>
      </section>

      <footer className="site-foot">
        <div className="wrap">
          <div className="fcols">
            {groups.map(g => (
              <div className={`fcol${g.wide ? ' wide' : ''}`} key={g.heading}>
                <h4>{g.heading}</h4>
                {g.links.map(l => <Link href={l.href} key={l.href}>{l.label}</Link>)}
              </div>
            ))}
          </div>

          <div className="fbrand">
            <span className="brand">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="cslogo" src="/logo-color.svg" alt="CareStream" width={187} height={56} />
            </span>
            <p>Policy, training and CQC evidence for care services in England. Built by people who have sat through an inspection.</p>
            <address className="faddr">Suite Ra01, 195-197 Wood Street,<br />London, E17 3NU</address>
            <Link className="fcontact" href="/contact">
              Contact us
              <svg viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M3 7h8M7.5 3.5 11 7l-3.5 3.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </Link>
          </div>

          <div className="fbase">
            <span>© 2026 TRG Digital Ltd · Company 11731704 · Registered in England</span>
            <a className="fico" href="https://ico.org.uk/ESDWebPages/Entry/ZC221613" rel="noopener noreferrer" target="_blank">
              <span>ICO registered: ZC221613</span>
            </a>
            <span className="fsocial">
              {/* Google Preferred Sources, via the deeplink rather than Google's button script.
                  The scripted version pulls news.google.com/swg/js/v1/publisher.js onto every
                  page, which is a third-party script running before anyone touches our cookie
                  banner. This is a plain link: nothing loads, nothing is set, and it opens the
                  same Google preferences screen. */}
              <a
                href="https://www.google.com/preferences/source?q=carestreamai.com"
                rel="noopener noreferrer"
                target="_blank"
              >Add us to Google preferred sources</a>
              <CookieSettingsButton className="fcookie" />
              <a href="https://www.linkedin.com/company/carestreamai/" rel="noopener noreferrer" target="_blank">LinkedIn</a>
              <a href="mailto:hello@carestreamai.com">hello@carestreamai.com</a>
            </span>
          </div>
          <p className="fdisclaim">
            CareStreamAI is a product of TRG Digital Ltd. It is not a registered legal or compliance
            advisor, and CQC Readiness Reports provide factual audit data, not a guarantee of any
            inspection rating or regulatory outcome.
          </p>
        </div>
      </footer>
    </div>
  )
}
