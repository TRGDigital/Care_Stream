'use client'

import { useState } from 'react'

// The theme's password input with its show/hide eye.
export function PasswordInput(props: Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'>) {
  const [show, setShow] = useState(false)
  return (
    <div className="lgpw">
      <input {...props} type={show ? 'text' : 'password'} />
      <button
        type="button"
        className={`lgeye${show ? ' on' : ''}`}
        aria-label={show ? 'Hide password' : 'Show password'}
        onClick={() => setShow(s => !s)}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" />
        </svg>
      </button>
    </div>
  )
}

// Icons for the one-message pages (check email, reset and verify outcomes).
const P = { fill: 'none', viewBox: '0 0 24 24', stroke: 'currentColor', strokeLinecap: 'round', strokeLinejoin: 'round' } as const
export const MailIcon = () => (
  <svg {...P} strokeWidth={1.5} aria-hidden="true"><path d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" /></svg>
)
export const TickIcon = () => (
  <svg {...P} strokeWidth={2} aria-hidden="true"><path d="M4.5 12.75l6 6 9-13.5" /></svg>
)
export const WarnIcon = () => (
  <svg {...P} strokeWidth={1.5} aria-hidden="true"><path d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>
)
export const CrossIcon = () => (
  <svg {...P} strokeWidth={1.5} aria-hidden="true"><path d="M6 18L18 6M6 6l12 12" /></svg>
)
