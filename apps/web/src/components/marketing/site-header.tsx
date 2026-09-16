'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { TRAINING_ACCREDITED } from '@/lib/training-commerce'
import { SETTINGS_LIST } from '@/lib/settings/list'
import { MEGA_SERVICES, MEGA_WHO, type MegaItem } from './site-chrome-data'
import { DemoDialog } from './demo-dialog'
import './site-chrome.css'
import './site-chrome-extra.css'

// The site header and its two mega menus, in the theme's markup and with its behaviour: click a
// menu to open it, one at a time; while one is open, hovering another switches to it; a click
// outside, Escape or a page change closes it. The header takes its hairline once the page scrolls.
//
// The theme's placeholder links ("#") point at the live pages here. Two additions the theme does
// not have, both so nothing is lost against the header this replaces:
// - the mega menus also list the feature areas and the care settings, beside the theme's policy
//   and training collections, so every section of the site is one click from the header;
// - a menu button below 1280px. The theme hides the nav links at that width and offers nothing
//   in their place, so on a tablet or phone none of the pages would be reachable from the header.

const Chev = () => (
  <svg viewBox="0 0 12 8" fill="none" aria-hidden="true">
    <path d="M1 1.5 6 6.5l5-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
)
const Arrow = () => (
  <svg viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h13M13 6l6 6-6 6" /></svg>
)

type Col = { heading: string; links: { href: string; label: string }[]; all?: { href: string; label: string } }

const POLICY_COLLECTIONS: Col = {
  heading: 'Policy collections',
  links: [
    { href: '/collection/health-and-safety-at-work-policy', label: 'Health and safety policies' },
    { href: '/collection/safeguarding-policies', label: 'Safeguarding policies' },
    { href: '/collection/medicine-policies', label: 'Medicines policies' },
    { href: '/collection/data-protection-policies', label: 'Data protection policies' },
  ],
  // The theme links "See all collections" to /collection, which is not a page; the policies are.
  all: { href: '/care-policies', label: 'See all policies' },
}
const TRAINING_COLLECTIONS: Col = {
  heading: 'Training collections',
  links: [
    { href: '/collection/mandatory-care-training', label: 'Mandatory care training' },
    { href: '/collection/medication-training-for-care-staff', label: 'Medication training' },
    { href: '/collection/dementia-training-for-care-staff', label: 'Dementia training' },
    { href: '/collection/moving-and-handling-training', label: 'Moving and handling training' },
  ],
  all: { href: '/staff-training', label: 'See all courses' },
}
const FEATURES: Col = {
  heading: 'Features',
  links: [
    { href: '/features/staff-hub', label: 'Staff hub' },
    { href: '/features/policy-approvals', label: 'Policy approvals' },
    { href: '/features/policy-gap-detection', label: 'Policy gap detection' },
    { href: '/features/cqc-wording-alignment', label: 'CQC wording alignment' },
    { href: '/features/training', label: 'Training' },
    { href: '/features/audits', label: 'Audits' },
    { href: '/features/analytics-and-cqc-readiness', label: 'Analytics and CQC readiness' },
    { href: '/features/workforce-and-multi-site', label: 'Workforce and multi-site' },
  ],
  all: { href: '/how-it-works', label: 'How it all works' },
}
const settings = SETTINGS_LIST.map(s => ({ href: `/${s.slug}`, label: s.label }))
const SETTINGS_A: Col = { heading: 'Care settings', links: settings.slice(0, 6), all: { href: '/who-we-serve', label: 'See all settings' } }
const SETTINGS_B: Col = { heading: 'Clinical and specialist', links: settings.slice(6), all: { href: '/who-its-for', label: 'See all roles' } }

function Items({ items, onPick }: { items: MegaItem[]; onPick: () => void }) {
  return (
    <div className="mega-grid c2">
      {items.map(it => {
        // "CPD accredited" is a claim not yet held; it shows only once TRAINING_ACCREDITED is set.
        const badge = it.badge === 'CPD accredited' && !TRAINING_ACCREDITED ? null : it.badge
        return (
          <Link className={`mitem${it.hi ? ' hi' : ''}`} href={it.href} key={it.href + it.title} onClick={onPick}>
            <span className="mico" style={{ background: it.bg, color: it.fg }}>
              <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" dangerouslySetInnerHTML={{ __html: it.svg }} />
            </span>
            <span><b>{it.title}{badge && <span className="badge">{badge}</span>}</b><span>{it.desc}</span></span>
          </Link>
        )
      })}
    </div>
  )
}

function Cols({ cols, onPick }: { cols: Col[]; onPick: () => void }) {
  return (
    <div className="mcolls">
      {cols.map(c => (
        <div key={c.heading}>
          <h4>{c.heading}</h4>
          <ul>
            {c.links.map(l => (
              <li key={l.href}><Link href={l.href} onClick={onPick}><Arrow />{l.label}</Link></li>
            ))}
          </ul>
          {c.all && <Link className="all" href={c.all.href} onClick={onPick}>{c.all.label}</Link>}
        </div>
      ))}
    </div>
  )
}

function MegaFoot({ onPick }: { onPick: () => void }) {
  return (
    <div className="mega-foot">
      <div className="mega-foot-in">
        <Link className="mfl" href="/demo" onClick={onPick}>
          <svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M3 5h14v9H3z" stroke="currentColor" strokeWidth="1.5" /><path d="M7 17h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
          Book a demo
        </Link>
        <Link className="mfl" href="/how-it-works" onClick={onPick}>
          <svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.5" /><path d="M8.5 7.2 13 10l-4.5 2.8z" fill="currentColor" /></svg>
          How it works
        </Link>
        <Link className="mfl" href="/pricing" onClick={onPick}>
          <svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M3 6h14v9H3z" stroke="currentColor" strokeWidth="1.5" /><path d="M3 9h14" stroke="currentColor" strokeWidth="1.5" /></svg>
          Pricing
        </Link>
        <span className="push">Questions? <Link href="/contact" onClick={onPick} style={{ color: 'var(--accent)', fontWeight: 600, textDecoration: 'none' }}>Talk to us</Link></span>
      </div>
    </div>
  )
}

export function SiteHeader() {
  const [open, setOpen] = useState<'m1' | 'm2' | null>(null)
  const [stuck, setStuck] = useState(false)
  const [mobile, setMobile] = useState(false)
  const ref = useRef<HTMLElement>(null)
  const pathname = usePathname()

  useEffect(() => { setOpen(null); setMobile(false) }, [pathname])

  useEffect(() => {
    const onScroll = () => setStuck(window.scrollY > 8)
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) { setOpen(null); setMobile(false) }
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { setOpen(null); setMobile(false) } }
    onScroll()
    addEventListener('scroll', onScroll, { passive: true })
    document.addEventListener('click', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      removeEventListener('scroll', onScroll)
      document.removeEventListener('click', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [])

  const close = () => { setOpen(null); setMobile(false) }
  const toggle = (id: 'm1' | 'm2') => setOpen(o => (o === id ? null : id))
  const hover = (id: 'm1' | 'm2') => setOpen(o => (o ? id : o))

  return (
    <div className="cschrome cschrome-head">
      <header id="hdr" ref={ref} className={stuck ? 'stuck' : undefined}>
        <div className="wrap">
          <nav className="nav" aria-label="Main">
            <Link className="brand" href="/" onClick={close}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="cslogo" src="/logo-color.svg" alt="CareStream" width={187} height={56} />
            </Link>
            <Link className="navbtn" href="/about" onClick={close}>About Care Stream</Link>
            <Link className="navbtn" href="/how-it-works" onClick={close}>How It Works</Link>
            <button type="button" className="navbtn" aria-expanded={open === 'm1'} aria-controls="m1"
                    onClick={() => toggle('m1')} onMouseEnter={() => hover('m1')}>
              Our Services <Chev />
            </button>
            <button type="button" className="navbtn" aria-expanded={open === 'm2'} aria-controls="m2"
                    onClick={() => toggle('m2')} onMouseEnter={() => hover('m2')}>
              Who It&rsquo;s For <Chev />
            </button>
            <Link className="navbtn" href="/pricing" onClick={close}>Pricing</Link>

            <span className="spacer" />

            <div className="util">
              {/* The theme's globe button had nothing behind it; it goes to the languages page. */}
              <Link className="iconbtn" href="/languages" aria-label="Languages" onClick={close}>
                <svg viewBox="0 0 20 20" fill="none" width="18" height="18" aria-hidden="true"><circle cx="10" cy="10" r="7.6" stroke="currentColor" strokeWidth="1.4" /><path d="M2.5 10h15M10 2.4c2 2.4 2 12.8 0 15.2M10 2.4c-2 2.4-2 12.8 0 15.2" stroke="currentColor" strokeWidth="1.4" /></svg>
              </Link>
              <Link className="navbtn" href="/login" onClick={close}>Sign in</Link>
              <Link className="pill pill-ghost" href="/demo" onClick={close}>Book a demo</Link>
              <Link className="pill pill-solid" href="/register" onClick={close}>Start free trial</Link>
              <button type="button" className="iconbtn menubtn" aria-label={mobile ? 'Close menu' : 'Open menu'}
                      aria-expanded={mobile} onClick={() => { setOpen(null); setMobile(m => !m) }}>
                <svg viewBox="0 0 20 20" fill="none" width="18" height="18" aria-hidden="true">
                  {mobile
                    ? <path d="M5 5l10 10M15 5 5 15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                    : <path d="M3 5.5h14M3 10h14M3 14.5h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />}
                </svg>
              </button>
            </div>
          </nav>
        </div>

        <div className="mega-host">
          <div className={`mega${open === 'm1' ? ' open' : ''}`} id="m1">
            <Items items={MEGA_SERVICES} onPick={close} />
            <Cols cols={[POLICY_COLLECTIONS, TRAINING_COLLECTIONS, FEATURES]} onPick={close} />
            <MegaFoot onPick={close} />
          </div>
          <div className={`mega${open === 'm2' ? ' open' : ''}`} id="m2">
            <Items items={MEGA_WHO} onPick={close} />
            <Cols cols={[SETTINGS_A, SETTINGS_B]} onPick={close} />
            <MegaFoot onPick={close} />
          </div>
        </div>

        {/* Below 1280px: the theme's nav links are hidden, so the same destinations live here. */}
        <div className="mnav" hidden={!mobile}>
          <div className="wrap">
            <Link href="/about" onClick={close}>About Care Stream</Link>
            <Link href="/how-it-works" onClick={close}>How It Works</Link>
            <details>
              <summary>Our Services <Chev /></summary>
              <Items items={MEGA_SERVICES} onPick={close} />
              <Cols cols={[POLICY_COLLECTIONS, TRAINING_COLLECTIONS, FEATURES]} onPick={close} />
            </details>
            <details>
              <summary>Who It&rsquo;s For <Chev /></summary>
              <Items items={MEGA_WHO} onPick={close} />
              <Cols cols={[SETTINGS_A, SETTINGS_B]} onPick={close} />
            </details>
            <Link href="/pricing" onClick={close}>Pricing</Link>
            <Link href="/login" onClick={close}>Sign in</Link>
            <div className="mnav-cta">
              <Link className="pill pill-ghost" href="/demo" onClick={close}>Book a demo</Link>
              <Link className="pill pill-solid" href="/register" onClick={close}>Start free trial</Link>
            </div>
          </div>
        </div>
      </header>
      <DemoDialog />
    </div>
  )
}
