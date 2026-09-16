'use client'

// The one Save (bookmark) control for a course, shared by the sticky course bar
// and the library cards so the toggle semantics and screen-reader wording stay
// identical wherever a visitor saves from. Saved courses surface on /basket.

import { Bookmark, BookmarkCheck } from 'lucide-react'
import { useSavedCourses } from '@/lib/saved-courses'

export function SaveCourseButton({
  slug,
  title,
  variant = 'light',
  compact = false,
  className = '',
}: {
  slug: string
  title: string
  /** 'dark' sits on the navy sticky bar; 'light' on white cards; 'theme' is the rebuilt
   *  design, which styles the button entirely through the class it is given. */
  variant?: 'dark' | 'light' | 'theme'
  /** Icon only — no visible "Save" label (used on space-tight cards). */
  compact?: boolean
  className?: string
}) {
  const { isSaved, savedCourses } = useSavedCourses()
  const saved = isSaved(slug)

  // The rebuilt design's markup, with none of the utility classes below. Given those as well,
  // the theme's `tsave` rule and a 42px bordered button fought over the same element, which the
  // rendered class diff on the training collections caught.
  if (variant === 'theme') {
    return (
      <button type="button" className={className} onClick={() => savedCourses.toggle({ slug, title })}
              aria-pressed={saved}
              aria-label={saved ? `${title} is saved for later` : `Save ${title} for later`}
              title={saved ? 'Saved, click to remove' : 'Save for later'}>
        <svg viewBox="0 0 24 24" fill={saved ? 'currentColor' : 'none'} stroke="currentColor"
             strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
        </svg>
      </button>
    )
  }

  const styles = variant === 'dark'
    ? saved
      ? 'border-white/40 bg-white/15 text-white'
      : 'border-white/30 text-white/90 hover:border-white/60 hover:bg-white/10 hover:text-white'
    : saved
      ? 'border-teal bg-teal-light text-teal'
      : 'border-gray-200 text-neutral-mid hover:border-teal hover:text-teal'

  return (
    <button
      type="button"
      onClick={() => savedCourses.toggle({ slug, title })}
      aria-pressed={saved}
      title={saved ? 'Saved, click to remove' : 'Save this course for later'}
      className={`inline-flex flex-shrink-0 items-center justify-center gap-2 rounded-btn border font-semibold transition-colors ${
        compact ? 'h-[42px] w-[42px] text-sm' : 'px-4 py-3 text-sm md:text-base'
      } ${styles} ${className}`}
    >
      {saved ? <BookmarkCheck size={compact ? 17 : 19} /> : <Bookmark size={compact ? 17 : 19} />}
      {!compact && <span className="hidden lg:inline">{saved ? 'Saved' : 'Save'}</span>}
      <span className="sr-only">{saved ? `${title} is saved for later` : `Save ${title} for later`}</span>
    </button>
  )
}
