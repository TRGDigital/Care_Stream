'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { Menu, X } from 'lucide-react'

const LINKS = [
  { href: '/how-it-works',         label: 'How It Works' },
  { href: '/features',             label: 'Features' },
  { href: '/pricing',              label: 'Pricing' },
  { href: '/who-its-for',          label: 'Who It\'s For' },
  { href: '/cqc-compliance',       label: 'CQC & Compliance' },
]

export function MarketingNav() {
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 12)
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [])

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-white/95 shadow-elevated backdrop-blur-md'
          : 'bg-white/90 backdrop-blur-sm border-b border-gray-100/80'
      }`}
    >
      <div className="mx-auto flex h-[68px] max-w-content items-center justify-between px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <span className="text-[22px] font-extrabold tracking-tight text-teal">
            CareStream<span className="text-amber-brand">AI</span>
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-1 lg:flex">
          {LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="rounded-lg px-3.5 py-2 text-sm font-medium text-neutral-mid transition-colors hover:bg-neutral-light hover:text-neutral-dark"
            >
              {label}
            </Link>
          ))}
        </nav>

        {/* Desktop CTAs */}
        <div className="hidden items-center gap-3 lg:flex">
          <Link
            href="/login"
            className="text-sm font-medium text-neutral-mid hover:text-neutral-dark"
          >
            Sign in
          </Link>
          <Link
            href="/demo"
            className="btn-amber rounded-btn px-5 py-2.5 text-sm"
          >
            Book a Free Demo
          </Link>
        </div>

        {/* Mobile hamburger */}
        <button
          onClick={() => setOpen(!open)}
          className="rounded-lg p-2 text-neutral-mid hover:bg-neutral-light lg:hidden"
          aria-label="Toggle menu"
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="border-t border-gray-100 bg-white/98 px-6 py-5 shadow-elevated backdrop-blur-md lg:hidden">
          <nav className="flex flex-col gap-1">
            {LINKS.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-neutral-dark hover:bg-neutral-light"
              >
                {label}
              </Link>
            ))}
            <hr className="my-2 border-gray-100" />
            <Link href="/login" onClick={() => setOpen(false)} className="px-3 py-2 text-sm font-medium text-neutral-mid">
              Sign in
            </Link>
            <Link
              href="/demo"
              onClick={() => setOpen(false)}
              className="btn-amber mt-1 rounded-btn px-5 py-3 text-center text-sm"
            >
              Book a Free Demo
            </Link>
          </nav>
        </div>
      )}
    </header>
  )
}
