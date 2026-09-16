'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import './blog-index-v2.css'

// The rebuilt /blog index.
//
// Posts still come from the blog API on the server; this only lays them out and filters them.
//
// Filtering HIDES rather than unmounts, which is what the theme does too. Every post's link
// stays in the document whatever category is selected, so the index keeps working as an
// internal-linking surface for a crawler that does not run the filter.

export interface ListedPost {
  slug: string
  title: string
  excerpt: string | null
  category: string
  publication_date: string | null
  read_time_minutes: number
  is_featured: boolean
  feature_image_url: string | null
}

export interface Copy { (key: string): string }

const Search = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
       strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />
  </svg>
)

function formatDate(iso: string | null): string {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-GB',
    { day: 'numeric', month: 'short', year: 'numeric' })
}

/** The theme colours a category tag by its position in the category list, cycling through the
 *  seven it defines. Derived rather than mapped by name, so a new category still gets a colour
 *  instead of falling back to a default that makes two categories look the same. */
function colourIndex(cats: string[], cat: string): number {
  const i = cats.indexOf(cat)
  return (i < 0 ? 0 : i) % 7 + 1
}

function Meta({ post, cats, foot }: { post: ListedPost; cats: string[]; foot?: boolean }) {
  const read = post.read_time_minutes ? `${post.read_time_minutes} min read` : ''
  const date = formatDate(post.publication_date)
  if (foot) {
    return (
      <span className="foot">{date}{date && read ? <i>·</i> : null}{read}</span>
    )
  }
  return (
    <span className="bimeta">
      <span className={`bitag c${colourIndex(cats, post.category)}`}>{post.category}</span>
      {date ? <><i>·</i>{date}</> : null}
      {read ? <><i>·</i>{read}</> : null}
    </span>
  )
}

export function BlogIndexV2({ posts, s }: { posts: ListedPost[]; s: Copy }) {
  const [cat, setCat] = useState('all')
  const [q, setQ] = useState('')

  // First-appearance order, which is the order the theme's buttons are in.
  const cats = useMemo(() => {
    const seen: string[] = []
    for (const p of posts) if (p.category && !seen.includes(p.category)) seen.push(p.category)
    return seen
  }, [posts])

  const lead = posts.find(p => p.is_featured) ?? posts[0]
  const rest = lead ? posts.filter(p => p.slug !== lead.slug) : []

  const matches = (p: ListedPost) =>
    (cat === 'all' || p.category === cat)
    && (!q.trim() || p.title.toLowerCase().includes(q.trim().toLowerCase()))

  const anyVisible = (lead ? matches(lead) : false) || rest.some(matches)
  const count = (c: string) => c === 'all' ? posts.length
                                           : posts.filter(p => p.category === c).length

  return (
    <div className="bipage-v2">
      <section className="bihero">
        <div className="biwrap bihero-in">
          <span className="uc-eyebrow">{s('hero.label')}</span>
          <h1>{s('hero.h1')}</h1>
          <p>{s('hero.lede')}</p>
        </div>
      </section>

      {posts.length > 0 && (
        <div className="bifilter">
          <div className="biwrap bifilter-in">
            <div className="bicats">
              {['all', ...cats].map(c => (
                <button type="button" className="bicat" key={c}
                        aria-pressed={cat === c} onClick={() => setCat(c)}>
                  {c === 'all' ? s('filter.all') : c}<span>{count(c)}</span>
                </button>
              ))}
            </div>
            <label className="bisearch">
              <Search />
              <input type="search" value={q} onChange={e => setQ(e.target.value)}
                     placeholder={s('filter.search')} aria-label={s('filter.search')} />
            </label>
          </div>
        </div>
      )}

      {lead && (
        <section className="bilead" hidden={!matches(lead)}>
          <div className="biwrap bilead-in">
            <Link href={`/blog/${lead.slug}`}>
              {lead.feature_image_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img className="pic" src={lead.feature_image_url} alt={lead.title}
                     fetchPriority="high" />
              )}
              <span className="txt">
                <Meta post={lead} cats={cats} />
                <h2>{lead.title}</h2>
                {lead.excerpt && <p>{lead.excerpt}</p>}
                <span className="bibtn ghost">{s('lead.cta')}</span>
              </span>
            </Link>
          </div>
        </section>
      )}

      <section className="bigrid-sec">
        <div className="biwrap bigrid-sec-in">
          <div className="bigrid">
            {rest.map(p => (
              <Link className="bicard" href={`/blog/${p.slug}`} key={p.slug}
                    hidden={!matches(p)}>
                {p.feature_image_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img className="pic" src={p.feature_image_url} alt={p.title}
                       loading="lazy" decoding="async" />
                )}
                <span className="txt">
                  <span className="bimeta">
                    <span className={`bitag c${colourIndex(cats, p.category)}`}>{p.category}</span>
                  </span>
                  <h3>{p.title}</h3>
                  {p.excerpt && <p>{p.excerpt}</p>}
                  <Meta post={p} cats={cats} foot />
                </span>
              </Link>
            ))}
          </div>
          <p className="biempty" hidden={anyVisible}>
            {posts.length === 0 ? s('empty.none') : s('empty.filtered')}
          </p>
        </div>
      </section>

      <section className="biend">
        <div className="biwrap biend-in">
          <h2>{s('end.h2')}</h2>
          <p>{s('end.lede')}</p>
          <div className="row">
            <Link className="bibtn solid" href="/register">Start free trial</Link>
            <Link className="bibtn ghost" href="/demo">Book a demo</Link>
          </div>
        </div>
      </section>
    </div>
  )
}
