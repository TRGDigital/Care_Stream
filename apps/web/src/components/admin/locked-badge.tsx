'use client'

// The lock that goes beside anything only administrators may see: pay rates and resident funding. One component so the wording is the same everywhere.
import { Lock } from 'lucide-react'

export const LOCKED_LINE = 'Locked. Only administrators can see this. Staff never see it.'

/** variant "icon": just the lock with a tooltip, for beside a label. "line": the lock and the full sentence, for under a heading. */
export function LockedBadge({ variant = 'line', managersToo = false, className = '' }: { variant?: 'icon' | 'line'; managersToo?: boolean; className?: string }) {
  const text = managersToo ? 'Locked. Only administrators and managers can see this. Staff never see it.' : LOCKED_LINE
  if (variant === 'icon') {
    return <span title={text} role="img" aria-label={text} className={`inline-flex items-center align-middle text-amber-700 ${className}`}><Lock size={13} aria-hidden="true" /></span>
  }
  return (
    <p className={`inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-900 ${className}`}>
      <Lock size={12} aria-hidden="true" /> {text}
    </p>
  )
}
