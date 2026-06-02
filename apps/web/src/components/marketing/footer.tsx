import Link from 'next/link'
import { CookieSettingsButton } from './cookie-consent'
import { SiteImage } from '@/components/site-image'

const PRODUCT = [
  { href: '/how-it-works',         label: 'How It Works' },
  { href: '/care-policies',         label: 'Features' },
  { href: '/pricing',              label: 'Pricing' },
  { href: '/who-its-for',          label: 'Who It\'s For' },
  { href: '/cqc-compliance',       label: 'CQC & Compliance' },
  { href: '/staff-training',       label: 'Staff Training' },
  { href: '/regulatory-knowledge', label: 'Regulatory Knowledge' },
  { href: '/demo',                 label: 'Book a Demo' },
]

const TRUST = [
  { href: '/trust',    label: 'Trust & Security' },
  { href: '/rag',      label: 'RAG' },
  { href: '/privacy',  label: 'Privacy Policy' },
  { href: '/terms',    label: 'Terms of Service' },
  { href: '/dpa',      label: 'Data Processing Agreement' },
  { href: '/cookies',  label: 'Cookie Policy' },
]

const COMPANY = [
  { href: '/about',        label: 'About' },
  { href: '/case-studies', label: 'Case Studies' },
  { href: '/blog',         label: 'Blog' },
  { href: '/faq',          label: 'FAQ' },
  { href: '/contact',      label: 'Contact' },
]

const GET_STARTED = [
  { href: '/register', label: 'Start Free Trial' },
  { href: '/demo',     label: 'Book a Demo' },
  { href: '/login',    label: 'Sign In' },
  { href: '/help',     label: 'Help Centre' },
]

export function MarketingFooter() {
  return (
    <footer className="bg-neutral-dark text-white">
      {/* Top section */}
      <div className="mx-auto max-w-content px-6 pb-14 pt-16">
        {/* Brand + tagline */}
        <div className="mb-12 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <SiteImage src="/logo-white.png" alt="CareStreamAI" className="h-10 w-auto" />
            <p className="mt-1 text-sm italic text-gray-400">Policy access for every voice in your team.</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Link
              href="/demo"
              className="btn-amber rounded-btn px-6 py-2.5 text-sm text-center"
            >
              Book a Free Demo
            </Link>
            <Link
              href="/register"
              className="btn-ghost-white rounded-btn px-6 py-2.5 text-sm text-center"
            >
              Start Free Trial
            </Link>
          </div>
        </div>

        {/* Links grid */}
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          {[
            { heading: 'Product',      links: PRODUCT },
            { heading: 'Trust & Legal', links: TRUST },
            { heading: 'Company',      links: COMPANY },
            { heading: 'Get Started',  links: GET_STARTED },
          ].map(({ heading, links }) => (
            <div key={heading}>
              <p className="mb-4 text-xs font-bold uppercase tracking-widest text-gray-500">{heading}</p>
              <ul className="space-y-2.5">
                {links.map(({ href, label }) => (
                  <li key={href}>
                    <Link href={href} className="text-sm text-gray-400 hover:text-white transition-colors">
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Divider */}
        <div className="my-12 border-t border-white/8" />

        {/* Bottom row */}
        <div className="flex flex-col gap-4 text-xs text-gray-500 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-1">
            <p>© 2026 CareStreamAI Limited. All rights reserved.</p>
            <p>
              CareStreamAI is not a registered legal or compliance advisor. CQC Readiness Reports provide factual audit data and do not constitute a guarantee of any inspection rating or regulatory outcome.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <CookieSettingsButton className="hover:text-white transition-colors" />
            <a href="mailto:hello@carestreamai.co.uk" className="hover:text-white transition-colors">
              hello@carestreamai.co.uk
            </a>
            <a
              href="https://linkedin.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 hover:text-white transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
              </svg>
              LinkedIn
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
