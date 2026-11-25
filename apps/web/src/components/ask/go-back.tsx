'use client'

// HOUSE RULE 14: a way back on every interaction. Deliberately quiet: a small text link, never a button that competes with the main action. It takes away the last step so the one before is showing again.
import { ArrowLeft } from 'lucide-react'

export function GoBack({ onBack, disabled, className = '' }: { onBack: () => void; disabled?: boolean; className?: string }) {
  return (
    <button type="button" onClick={onBack} disabled={disabled} className={`inline-flex items-center gap-1 text-xs font-medium text-neutral-mid hover:text-neutral-dark hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-teal disabled:opacity-50 ${className}`}>
      <ArrowLeft size={12} aria-hidden="true" />Go back
    </button>
  )
}
