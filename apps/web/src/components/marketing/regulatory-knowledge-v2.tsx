import Link from 'next/link'
import { REGULATORY_KNOWLEDGE_ICONS } from '@/lib/regulatory-knowledge-icons'
import { Shapes } from './setting-page-v2'
import './regulatory-knowledge-v2.css'

// The rebuilt /regulatory-knowledge page: the policy answer and the regulation behind it, in
// one response.
//
// All the copy is in REGULATORY_KNOWLEDGE_V2_SLOTS, generated from the theme with a
// completeness assertion. The thirty-odd named pieces of legislation are the reason: "Health
// and Social Care Act 2008 (Regulated Activities) Regulations 2014" is not a string to copy by
// hand, and a page about regulation that misnames one is worse than no page.
//
// The six coverage icons are shapes in lib/regulatory-knowledge-icons.ts: an icon is not copy.

export interface Copy { (key: string): string }

const Join = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
       strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 5v14M5 12l7 7 7-7" />
  </svg>
)

/** Reads slot keys of the form `<base><n>` until one comes back empty. Used for the lists whose
 *  length is a property of the copy (a coverage card has four items or six), so that editing a
 *  list in the console does not need a template change. */
// A runaway guard, not a limit on content: on /care-policies a cap of 14 dropped two of sixteen
// points, so none of these helpers caps a list anywhere near a real length.
function series(s: Copy, base: string, max = 60): string[] {
  const out: string[] = []
  for (let n = 1; n <= max; n++) {
    const v = s(`${base}${n}`)
    if (!v) break
    out.push(v)
  }
  return out
}

export function RegulatoryKnowledgeV2({ s }: { s: Copy }) {
  return (
    <div className="rkpage-v2">
      <section className="rkhero">
        <div className="rkwrap rkhero-in">
          <div>
            <span className="rkeyebrow">{s('hero.label')}</span>
            <h1>{s('hero.h1')}</h1>
            <p>{s('hero.lede')}</p>
          </div>
          <div className="rkstack">
            <div className="rkq"><em>{s('hero.q.label')}</em>{s('hero.q.text')}</div>
            <div className="rksrc a">
              <span className="tag">{s('hero.src1.tag')}</span>
              <p>{s('hero.src1.body')}</p>
            </div>
            <div className="rkjoin"><Join />{s('hero.join')}</div>
            <div className="rksrc b">
              <span className="tag">{s('hero.src2.tag')}</span>
              <p>{s('hero.src2.body')}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="rksec">
        <div className="rkwrap">
          <p className="rklabel">{s('gap.label')}</p>
          <h2>{s('gap.h2')}</h2>
          {[1, 2].map(n => <p className="rklede" key={n}>{s(`gap.p${n}`)}</p>)}
          <div className="rkgap">
            <div className="rkgapc">
              <b>{s('gap.c1.title')}</b>
              <p>{s('gap.c1.body')}</p>
              <ul>{series(s, 'gap.c1.li').map(x => <li key={x}>{x}</li>)}</ul>
            </div>
            <span className="rkvs">{s('gap.vs')}</span>
            <div className="rkgapc">
              <b>{s('gap.c2.title')}</b>
              <p>{s('gap.c2.body')}</p>
              <ul>{series(s, 'gap.c2.li').map(x => <li key={x}>{x}</li>)}</ul>
            </div>
          </div>
        </div>
      </section>

      {/* The theme tints this one with an inline background rather than a modifier: there is no
          `.tint` rule on this page, so a `rksec tint` here would simply render untinted. */}
      <section className="rksec" style={{ background: 'var(--ground-2)' }}>
        <div className="rkwrap">
          <p className="rklabel">{s('ex.label')}</p>
          <h2>{s('ex.h2')}</h2>
          <p className="rklede">{s('ex.lede')}</p>
          <div className="rkex">
            {[1, 2, 3].map(n => (
              <div className="rkexc" key={n}>
                <div className="rkexh">
                  <span className="rklang">{s(`ex.e${n}.lang`)}</span>
                  <h3>{s(`ex.e${n}.title`)}</h3>
                  <div className="rkask">{s(`ex.e${n}.ask`)}</div>
                </div>
                <div className="rkexb">
                  <div className="rkpart a">
                    <span className="tag">{s(`ex.e${n}.p1.tag`)}</span>
                    <p>{s(`ex.e${n}.p1.body`)}</p>
                  </div>
                  <div className="rkpart b">
                    <span className="tag">{s(`ex.e${n}.p2.tag`)}</span>
                    <p>{s(`ex.e${n}.p2.body`)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="rksec">
        <div className="rkwrap">
          <p className="rklabel">{s('cover.label')}</p>
          <h2>{s('cover.h2')}</h2>
          <p className="rklede">{s('cover.lede')}</p>
          <div className="rkcov">
            {[1, 2, 3, 4, 5, 6].map(n => (
              <div className="rkcovc" key={n}>
                <span className="ic">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                       strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <Shapes shapes={REGULATORY_KNOWLEDGE_ICONS[n - 1] ?? []} />
                  </svg>
                </span>
                <h3>{s(`cover.c${n}.title`)}</h3>
                <ul>{series(s, `cover.c${n}.li`).map(x => <li key={x}>{x}</li>)}</ul>
                <span className="rkmore">{s('cover.more')}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="rklangband">
        <div className="rkwrap rkls">
          {/* The theme styles this band's heading, paragraph and link inline, with no rules in
              the stylesheet for them. Carried across as written: a rule added to the ported CSS
              instead would be dropped the next time port_css.py regenerates the file. */}
          <div>
            <p className="rklabel">{s('lang.label')}</p>
            <h2 style={{
              fontSize: 'clamp(1.4rem,.75vw + 1.2rem,1.95rem)', lineHeight: 1.15,
              letterSpacing: '-.03em', margin: '0 0 14px', maxWidth: '18em',
            }}>{s('lang.h2')}</h2>
            <p style={{
              margin: 0, fontSize: '1rem', lineHeight: 1.7, color: 'var(--ink-2)',
              maxWidth: '46em',
            }}>{s('lang.lede')}</p>
            <p style={{ margin: '18px 0 0' }}>
              <Link href="/languages" style={{
                fontSize: '.9rem', fontWeight: 650, color: 'var(--accent)',
                textDecoration: 'none',
              }}>{s('lang.link')}</Link>
            </p>
          </div>
          <div className="rkchips">
            {series(s, 'lang.chip', 24).map((c, i, all) => (
              // The last chip is the "and 50 more" count, which the theme styles differently.
              <span className={i === all.length - 1 ? 'more' : undefined} key={c}>{c}</span>
            ))}
          </div>
        </div>
      </section>

      <section className="rkcta">
        <div className="rkwrap">
          <h2>{s('cta.h2')}</h2>
          <p>{s('cta.lede')}</p>
          <div className="rkbtns">
            <Link className="rkbtn p" href="/demo">Book a free demo</Link>
            <Link className="rkbtn s" href="/register">Start free trial</Link>
          </div>
        </div>
      </section>
    </div>
  )
}
