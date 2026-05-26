'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react'
import { POSTS } from '@/lib/blog-data'

const featured = POSTS.filter(p => p.featured)

export function HomeBlogSection() {
  const trackRef = useRef<HTMLDivElement>(null)
  const [canPrev, setCanPrev] = useState(false)
  const [canNext, setCanNext] = useState(true)

  const syncArrows = useCallback(() => {
    const el = trackRef.current
    if (!el) return
    setCanPrev(el.scrollLeft > 4)
    setCanNext(el.scrollLeft < el.scrollWidth - el.clientWidth - 4)
  }, [])

  useEffect(() => {
    const el = trackRef.current
    if (!el) return
    syncArrows()
    el.addEventListener('scroll', syncArrows, { passive: true })
    return () => el.removeEventListener('scroll', syncArrows)
  }, [syncArrows])

  function scrollBy(direction: 1 | -1) {
    const el = trackRef.current
    if (!el) return
    const card = el.querySelector<HTMLElement>('[data-blog-card]')
    const gap = 24
    const amount = direction * ((card?.offsetWidth ?? el.clientWidth / 4) + gap)
    el.scrollBy({ left: amount, behavior: 'smooth' })
  }

  return (
    <section className="bg-neutral-light py-24">
      <div className="mx-auto max-w-content px-6">
        <div className="mb-10 flex items-end justify-between gap-4">
          <div>
            <p className="mb-3 text-[0.7rem] font-bold uppercase tracking-[0.12em] text-teal">
              From the Blog
            </p>
            <h2 className="text-3xl font-extrabold text-neutral-dark md:text-4xl">
              Insight for UK care professionals.
            </h2>
          </div>

          <div className="flex flex-shrink-0 items-center gap-2">
            <button
              onClick={() => scrollBy(-1)}
              disabled={!canPrev}
              aria-label="Previous posts"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white shadow-card transition-all hover:border-teal hover:text-teal disabled:cursor-not-allowed disabled:opacity-30"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={() => scrollBy(1)}
              disabled={!canNext}
              aria-label="Next posts"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white shadow-card transition-all hover:border-teal hover:text-teal disabled:cursor-not-allowed disabled:opacity-30"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        <div
          ref={trackRef}
          className="flex gap-6 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {featured.map(post => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              data-blog-card
              className="card-lift group flex w-full flex-none flex-col rounded-2xl border border-gray-100 bg-white p-7 shadow-card md:w-[calc(50%-12px)] lg:w-[calc(25%-18px)]"
            >
              <div className="mb-5 flex items-center justify-between">
                <span className={`rounded-full px-3 py-1 text-xs font-bold ${post.categoryColor}`}>
                  {post.category}
                </span>
                <span className="text-xs text-gray-400">{post.readTime}</span>
              </div>
              <h3 className="mb-3 flex-1 font-extrabold leading-snug text-neutral-dark transition-colors group-hover:text-teal">
                {post.title}
              </h3>
              <p className="mb-6 text-sm leading-relaxed text-neutral-mid">{post.summary}</p>
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span>{post.date}</span>
                <span className="inline-flex items-center gap-1 font-semibold text-teal group-hover:underline">
                  Read <ArrowRight size={12} />
                </span>
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-10 text-center">
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 font-semibold text-teal hover:text-teal-dark"
          >
            View all articles <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </section>
  )
}
