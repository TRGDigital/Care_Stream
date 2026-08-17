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
  /** 'dark' sits on the navy sticky bar; 'light' on white cards. */
  variant?: 'dark' | 'light'
  /** Icon only — no visible "Save" label (used on space-tight cards). */
  compact?: boolean
  className?: string
}) {
  const { isSaved, savedCourses } = useSavedCourses()
  const saved = isSaved(slug)

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
      title={saved ? 'Saved — click to remove' : 'Save this course for later'}
      className={`inline-flex flex-shrink-0 items-center justify-center gap-2 rounded-btn border text-sm font-semibold transition-colors ${
        compact ? 'h-[42px] w-[42px]' : 'px-3 py-2.5'
      } ${styles} ${className}`}
    >
      {saved ? <BookmarkCheck size={17} /> : <Bookmark size={17} />}
      {!compact && <span className="hidden lg:inline">{saved ? 'Saved' : 'Save'}</span>}
      <span className="sr-only">{saved ? `${title} is saved for later` : `Save ${title} for later`}</span>
    </button>
  )
}
