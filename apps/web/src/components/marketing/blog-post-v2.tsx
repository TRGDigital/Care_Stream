import Link from 'next/link'
import { Fragment } from 'react'
import { buildBlogToc } from '@/lib/blog-toc'
import { splitHtmlForCtas } from '@/lib/blog-cta'
import { BlogCta, BLOG_CTA_TYPES, CtaArrow } from './blog-cta'
import { BlogTocRail } from './blog-toc-rail'
import './blog-post-v2.css'

// A blog post in the theme's template (blog/template.html in the theme preview): the head with
// category, date, read time and byline; the feature image; a contents rail beside the article;
// the tail blocks (sources, FAQs, author); related articles on a tinted band.
//
// Every field the current post page renders is kept, in the theme's blocks: the special message
// and key information boxes, the in-content CTAs, the post's own CTA (or the standard one when it
// has none), the "Last updated" line and the related-article rotation. The structured data is
// emitted by the route, as before.

export interface BlogPostV2Data {
  slug: string
  title: string
  content: string
  category: string
  publication_date: string | null
  read_time_minutes: number
  feature_image_url: string | null
  feature_image_alt: string | null
  special_message: string | null
  special_message_color: string | null
  key_info_title: string | null
  key_info_content: string | null
  cta_text: string | null
  cta_url: string | null
  cta_type: string | null
  faqs: { question: string; answer: string }[] | null
  updated_at: string | null
  sources: Array<{ label: string; url: string }> | null
  author: { name: string; title: string | null; photo_url: string | null; bio: string | null; linkedin_url: string | null } | null
}

export interface BlogRelatedV2 {
  slug: string
  title: string
  category: string
  read_time_minutes: number
  feature_image_url: string | null
}

const NOTICE = new Set(['teal', 'purple', 'blue', 'amber'])
const BANDS = ['#EFE7FA', '#E3F0EA', '#FCF0DC']

const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]!.toUpperCase()).join('')
const host = (url: string) => { try { return new URL(url).hostname.replace(/^www\./, '') } catch { return '' } }

// The theme's body treatments that the editor's HTML does not carry itself: the opening paragraph
// is set as a standfirst, and a table scrolls sideways inside its own box on a narrow screen.
function dressBody(html: string) {
  const firstH2 = html.search(/<h2[\s>]/i)
  const firstP = html.search(/<p(\s|>)/i)
  if (firstP !== -1 && (firstH2 === -1 || firstP < firstH2)) {
    const tag = /^<p(\s[^>]*)?>/i.exec(html.slice(firstP))
    if (tag && !/\bclass\s*=/i.test(tag[1] ?? '')) {
      html = html.slice(0, firstP) + `<p class="intro"${tag[1] ?? ''}>` + html.slice(firstP + tag[0].length)
    }
  }
  return html.replace(/<table[\s\S]*?<\/table>/gi, t => `<div class="btable">${t}</div>`)
}

export function BlogPostV2({ post, related }: { post: BlogPostV2Data; related: BlogRelatedV2[] }) {
  const date = post.publication_date ? fmtDate(post.publication_date) : ''
  // "Last updated" only when the post was meaningfully revised after publication (more than
  // 2 days later), so trivial edits do not churn it.
  const DAY = 86_400_000
  const showUpdated = !!(post.updated_at && post.publication_date &&
    new Date(post.updated_at).getTime() - new Date(post.publication_date).getTime() > 2 * DAY)
  const updated = showUpdated && post.updated_at ? fmtDate(post.updated_at) : ''
  const sources = (post.sources ?? []).filter(s => s?.url)
  const faqs = (post.faqs ?? []).filter(f => f?.question?.trim() && f?.answer?.trim())
  const { html, headings } = buildBlogToc(post.content, { inject: false })
  const body = dressBody(html)
  const author = post.author?.name ? post.author : null
  const hasCtas = !!post.cta_type && (BLOG_CTA_TYPES as string[]).includes(post.cta_type)
  const notice = NOTICE.has(post.special_message_color ?? '') ? post.special_message_color : 'teal'

  const avatar = (size: 'sm' | 'lg') => author?.photo_url
    // eslint-disable-next-line @next/next/no-img-element
    ? <img className="av" src={author.photo_url} alt={author.name} width={size === 'sm' ? 42 : 54} height={size === 'sm' ? 42 : 54} />
    : <span className="av">{initials(author?.name ?? 'CareStream')}</span>

  return (
    <div className="bpost-v2">
      <section className="bhead">
        <div className="bwrap bhead-in">
          <div className="bmeta">
            <span className="bcat">{post.category}</span>
            {date && <><i>·</i><span>{date}</span></>}
            <i>·</i><span>{post.read_time_minutes} min read</span>
          </div>
          <h1>{post.title}</h1>
          {author ? (
            <div className="bbyline">
              {avatar('sm')}
              <span>
                <b>{author.name}</b>
                <span>
                  {[author.title, updated && `Last updated ${updated}`].filter(Boolean).join(' · ')}
                </span>
              </span>
            </div>
          ) : updated ? (
            <p className="bupdated">Last updated <time dateTime={post.updated_at ?? undefined}>{updated}</time></p>
          ) : null}
        </div>
      </section>

      {post.feature_image_url && (
        <section className="bfeature">
          <div className="bwrap bfeature-in">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="plate" src={post.feature_image_url} alt={post.feature_image_alt ?? post.title} />
          </div>
        </section>
      )}

      <section className="bbody">
        <div className={`bwrap bbody-in${headings.length ? '' : ' notoc'}`}>
          {headings.length > 0 && <BlogTocRail headings={headings} />}

          <article className="bart">
            {post.special_message && (
              <div className={`bnotice ${notice}`} dangerouslySetInnerHTML={{ __html: post.special_message }} />
            )}

            {(post.key_info_title || post.key_info_content) && (
              <div className="bkey">
                {post.key_info_title && <b>{post.key_info_title}</b>}
                {post.key_info_content && <div dangerouslySetInnerHTML={{ __html: post.key_info_content }} />}
              </div>
            )}

            {hasCtas ? (
              splitHtmlForCtas(body, 2).map((part, idx, parts) => (
                <Fragment key={idx}>
                  <div className="bcontent" dangerouslySetInnerHTML={{ __html: part }} />
                  {idx < parts.length - 1 ? <BlogCta type={post.cta_type!} variant={idx} theme /> : null}
                </Fragment>
              ))
            ) : (
              <div className="bcontent" dangerouslySetInnerHTML={{ __html: body }} />
            )}

            {post.cta_text && post.cta_url ? (
              <div className="bcta">
                <Link className="bbtn" href={post.cta_url}>{post.cta_text} <CtaArrow /></Link>
              </div>
            ) : (
              <div className="bcta">
                <span className="eyebrow">See it in action</span>
                <b>See CareStream in action</b>
                <p>Book a demo or start your free trial today.</p>
                <div className="bbtns">
                  <Link className="bbtn" href="/demo">Book a demo <CtaArrow /></Link>
                  <Link className="bbtn ghost" href="/register">Start free trial</Link>
                </div>
              </div>
            )}

            {sources.length > 0 && (
              <div className="btail">
                <p className="btail-h">Sources</p>
                <ul className="bsources">
                  {sources.map((s, i) => (
                    <li key={i}>
                      <a href={s.url} target="_blank" rel="noopener noreferrer nofollow">{s.label || s.url}</a>
                      {host(s.url) && <span> · {host(s.url)}</span>}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {faqs.length > 0 && (
              <div className="btail">
                <p className="btail-h">Frequently asked</p>
                <div>
                  {faqs.map((f, i) => (
                    <details className="bq" key={i}>
                      <summary>
                        {f.question}
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
                      </summary>
                      <div className="ans" dangerouslySetInnerHTML={{ __html: f.answer }} />
                    </details>
                  ))}
                </div>
              </div>
            )}

            {author && (author.bio || author.title) && (
              <div className="btail">
                <p className="btail-h">Written by</p>
                <div className="bauthor">
                  {avatar('lg')}
                  <span>
                    <b>
                      {author.linkedin_url
                        ? <a href={author.linkedin_url} target="_blank" rel="noopener noreferrer">{author.name}</a>
                        : author.name}
                    </b>
                    {author.title && <span className="role">{author.title}</span>}
                    {author.bio && <p>{author.bio}</p>}
                  </span>
                </div>
              </div>
            )}
          </article>
        </div>
      </section>

      {related.length > 0 && (
        <section className="brelated">
          <div className="bwrap brelated-in">
            <p className="btail-h brelated-h">Related articles</p>
            <div className="brel-grid">
              {related.map((r, i) => (
                <Link className="brel" href={`/blog/${r.slug}`} key={r.slug}>
                  <span className="band" style={{ background: BANDS[i % BANDS.length] }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {r.feature_image_url && <img src={r.feature_image_url} alt="" loading="lazy" />}
                  </span>
                  <span className="in">
                    <h3>{r.title}</h3>
                    <span>{r.read_time_minutes} min read</span>
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  )
}
