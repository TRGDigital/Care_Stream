'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { TrainingDemo, type TrainingDemoData } from '@/components/marketing/training-demo'
import { GoQuiz, type QuizQuestion } from './go-quiz'

// The hero's interactive demo plus its "free gap check" quiz overlay. When a
// visitor finishes the demo they can buy now, or open the quiz as a modal.
export function GoDemoWithQuiz({
  demo,
  buyHref,
  slug,
  moduleTitle,
  questions,
}: {
  demo: TrainingDemoData
  buyHref: string
  slug: string
  moduleTitle: string
  questions: QuizQuestion[]
}) {
  const [quizOpen, setQuizOpen] = useState(false)

  return (
    <>
      <TrainingDemo demo={demo} buyHref={buyHref} variant="card" onTakeQuiz={() => setQuizOpen(true)} />

      {quizOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setQuizOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <div className="relative w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setQuizOpen(false)}
              aria-label="Close"
              className="absolute -right-3 -top-3 z-10 rounded-full bg-white p-1.5 text-neutral-dark shadow-elevated transition-colors hover:text-teal"
            >
              <X size={18} />
            </button>
            <GoQuiz slug={slug} moduleTitle={moduleTitle} questions={questions} />
          </div>
        </div>
      )}
    </>
  )
}
