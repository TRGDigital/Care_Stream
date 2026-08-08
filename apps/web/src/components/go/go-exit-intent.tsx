'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { GoQuiz, type QuizQuestion } from './go-quiz'

// Desktop exit-intent: when the cursor leaves the top of the viewport, offer the
// gamified training gap check once per session, to recover an abandoning visitor.
export function GoExitIntent({
  slug,
  moduleTitle,
  questions,
}: {
  slug: string
  moduleTitle: string
  questions: QuizQuestion[]
}) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    try {
      if (sessionStorage.getItem('cs-go-exit-shown')) return
    } catch { /* no-op */ }
    const onLeave = (e: MouseEvent) => {
      if (e.clientY <= 0) {
        setOpen(true)
        try { sessionStorage.setItem('cs-go-exit-shown', '1') } catch { /* no-op */ }
        document.removeEventListener('mouseleave', onLeave)
      }
    }
    document.addEventListener('mouseleave', onLeave)
    return () => document.removeEventListener('mouseleave', onLeave)
  }, [])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={() => setOpen(false)}
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Close"
          className="absolute -right-3 -top-3 z-10 rounded-full bg-white p-1.5 text-neutral-dark shadow-elevated transition-colors hover:text-teal"
        >
          <X size={18} />
        </button>
        <div className="mb-3 rounded-t-2xl bg-hero-gradient px-6 py-4 text-center">
          <p className="text-sm font-bold text-white">Before you go — is your {moduleTitle} training inspection-ready?</p>
        </div>
        <GoQuiz slug={slug} moduleTitle={moduleTitle} questions={questions} />
      </div>
    </div>
  )
}
