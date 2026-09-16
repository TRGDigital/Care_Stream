import Link from 'next/link'
import { SiteImage } from '@/components/site-image'
import { RAG_ICONS } from '@/lib/rag-icons'
import { Shapes } from './setting-page-v2'
import './rag-page-v2.css'

// The rebuilt /rag page: how the AI is bounded, and why.
//
// All the copy is in RAG_V2_SLOTS, generated from the theme with a completeness assertion. A
// page whose whole subject is that answers come from a source is the last place to lose a
// paragraph quietly, so the generator proves nothing was dropped rather than asserting it.
//
// The six "why it matters" icons are shapes in lib/rag-icons.ts: an icon is not copy.

export interface Copy { (key: string): string }

/** A slot that may not be set renders nothing rather than an empty element. */
function P({ s, k }: { s: Copy; k: string }) {
  const v = s(k)
  return v ? <p>{v}</p> : null
}

function Prose({ s, k, n }: { s: Copy; k: string; n: number }) {
  return (
    <div className="prose">
      {Array.from({ length: n }, (_, i) => <P s={s} k={`${k}.p${i + 1}`} key={i} />)}
    </div>
  )
}

export function RagPageV2({ s }: { s: Copy }) {
  return (
    <div className="rgpage-v2">
      <section className="rghero">
        <div className="rgwrap rghero-in">
          <span className="rgeyebrow">{s('hero.label')}</span>
          <h1>{s('hero.h1')}</h1>
          <p>{s('hero.lede')}</p>
        </div>
      </section>

      <section className="rgsec">
        <div className="rgwrap">
          <span className="rglabel">{s('principle.label')}</span>
          <h2>{s('principle.h2')}</h2>
          <Prose s={s} k="principle" n={3} />
          <div className="rgsteps">
            {[1, 2, 3].map(n => (
              <div className="rgstep" key={n}>
                <span className="n">{s(`principle.s${n}.n`)}</span>
                <b>{s(`principle.s${n}.title`)}</b>
                <p>{s(`principle.s${n}.body`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="rgsec tint">
        <div className="rgwrap rgsplit">
          <div>
            <span className="rglabel">{s('policy.label')}</span>
            <h2>{s('policy.h2')}</h2>
            <Prose s={s} k="policy" n={3} />
          </div>
          <ol className="rgflow">
            {[1, 2, 3, 4, 5].map(n => (
              <li key={n}>
                <span className="n">{s(`policy.f${n}.n`)}</span>
                <div><b>{s(`policy.f${n}.title`)}</b><p>{s(`policy.f${n}.body`)}</p></div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="rgsec">
        <div className="rgwrap rgsplit flip">
          <div>
            <span className="rglabel">{s('training.label')}</span>
            <h2>{s('training.h2')}</h2>
            <Prose s={s} k="training" n={3} />
          </div>
          <div className="rgcards">
            {[1, 2, 3, 4].map(n => (
              <div className="rgcard" key={n}>
                <b>{s(`training.c${n}.title`)}</b>
                <p>{s(`training.c${n}.body`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="rgsec tint">
        <div className="rgwrap">
          <span className="rglabel">{s('why.label')}</span>
          <h2>{s('why.h2')}</h2>
          <div className="rgwhy">
            {[1, 2, 3, 4, 5, 6].map(n => (
              <div key={n}>
                <span className="ic">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                       strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <Shapes shapes={RAG_ICONS[n - 1] ?? []} />
                  </svg>
                </span>
                <b>{s(`why.w${n}.title`)}</b>
                <p>{s(`why.w${n}.body`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="rgsec">
        <div className="rgwrap">
          <div className="rgnote">
            <span className="rglabel">{s('note.label')}</span>
            <h2>{s('note.h2')}</h2>
            {[1, 2].map(n => <P s={s} k={`note.p${n}`} key={n} />)}
          </div>
        </div>
      </section>

      <section className="rgsec tint">
        <div className="rgwrap">
          <span className="rglabel">{s('practice.label')}</span>
          <h2>{s('practice.h2')}</h2>
          <p className="prose">{s('practice.lede')}</p>
          <div className="rgshot">
            <SiteImage src="/images/rag/1.webp" alt="How our AI works" />
          </div>
        </div>
      </section>

      <section className="rgcta">
        <div className="rgwrap rgcta-in">
          <div>
            <h2>{s('cta.h2')}</h2>
            <p>{s('cta.lede')}</p>
          </div>
          <div className="btns">
            <Link className="solid" href="/demo">Book a demo</Link>
            <Link className="ghost" href="/trust">Trust and security</Link>
          </div>
        </div>
      </section>
    </div>
  )
}
