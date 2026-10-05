'use client'

import { useEffect, useState } from 'react'
import { fi, fiFeedback } from '@/lib/funnel-insights'
import './shop-questions.css'

// Two short questions that tell us what is costing sales. Answers go to Funnel Insights › Feedback.
//
// ExitQuestion: two stages. First a small ask ("Before you leave, can you answer a quick
// question?"); only if they say yes, the full question. When someone on a course, policy, buy or basket page is about to leave (the
// pointer heads for the browser bar on a computer; a long pause on a phone), ask once per visit
// what stopped them. Quick choices, because a tick gets answered far more than an empty box, plus
// a box for anything else. Never shown to anyone who has clicked Buy now or Checkout.
//
// BuyerQuestions: on the thank-you pages, what happened just before they looked, then
// AlmostStopped: what almost stopped them. What almost stopped a buyer is usually what actually
// stopped the people who left, so it is the best guide to what to fix.

type Funnel = 'training' | 'policies'

const EXIT_CHOICES: Record<Funnel, string[]> = {
  training: ['I need to check with my manager first', 'The price', 'I need to pay by invoice or purchase order',
    'I am comparing other training providers', 'Not sure it covers what we need', 'Just looking for now'],
  policies: ['I need to check with my manager first', 'The price', 'I need to pay by invoice or purchase order',
    'I am comparing other policy providers', 'Not sure it fits our service', 'Just looking for now'],
}
// What happened just before they looked: the moments that send a manager looking (DRIP's
// "category entry points"). The answers decide what the course page's "When you need this"
// section and the ad headlines lead with (lib/course-cro.ts).
const TRIGGER_CHOICES: Record<Funnel, string[]> = {
  training: ['A new starter joined', 'A CQC inspection is coming', 'Training was due for renewal',
    'CQC, the local authority or a commissioner asked for it', 'Staff needed it in their own language', 'An incident or complaint'],
  policies: ['A CQC inspection is coming', 'Our policy was out of date', 'An incident, breach or complaint',
    'CQC, the local authority or a commissioner asked for it', 'We are opening or registering a service', 'A change in the law or guidance'],
}
const ALMOST_CHOICES = ['No, it was easy', 'The price', 'I needed approval first', 'Not sure it would cover what we need',
  'The checkout or payment', 'Something about the website']

const once = (k: string, set = false) => {
  try { if (set) sessionStorage.setItem(k, '1'); return sessionStorage.getItem(k) === '1' } catch { return false }
}

function Choices({ choices, picked, setPicked }: { choices: string[]; picked: string; setPicked: (c: string) => void }) {
  return (
    <div className="sq-choices" role="radiogroup">
      {[...choices, 'Something else'].map(c => (
        <button type="button" key={c} role="radio" aria-checked={picked === c} className={picked === c ? 'on' : ''} onClick={() => setPicked(c)}>{c}</button>
      ))}
    </div>
  )
}

export function ExitQuestion({ funnel, product }: { funnel: Funnel; product?: string }) {
  const [open, setOpen] = useState(false)
  const [stage, setStage] = useState<'ask' | 'questions'>('ask')
  const [picked, setPicked] = useState('')
  const [text, setText] = useState('')
  const [sent, setSent] = useState(false)

  useEffect(() => {
    // ?exitq=1 shows it straight away, for checking it without leaving the page.
    if (new URLSearchParams(window.location.search).get('exitq') === '1') { setOpen(true); return }
    if (once('cs-exitq')) return
    // Anyone who reaches for Buy now or Checkout is not leaving unhappy: never ask them.
    const buying = (e: Event) => {
      const t = e.target as HTMLElement | null
      if (t?.closest('.offerbtn, .ckpay, .bybtn, .pcbuynow, .add')) once('cs-exitq', true)
    }
    const show = () => { if (!once('cs-exitq')) { once('cs-exitq', true); setOpen(true) } }
    const leave = (e: MouseEvent) => { if (e.clientY <= 0 && !e.relatedTarget) show() }
    let idle: ReturnType<typeof setTimeout> | undefined
    const touch = window.matchMedia?.('(pointer: coarse)').matches
    const restart = () => { clearTimeout(idle); idle = setTimeout(show, 45_000) }
    document.addEventListener('click', buying, true)
    document.addEventListener('mouseout', leave)
    if (touch) { restart(); window.addEventListener('scroll', restart, { passive: true }); window.addEventListener('touchstart', restart, { passive: true }) }
    return () => {
      document.removeEventListener('click', buying, true); document.removeEventListener('mouseout', leave)
      clearTimeout(idle); window.removeEventListener('scroll', restart); window.removeEventListener('touchstart', restart)
    }
  }, [])

  if (!open) return null
  const answer = (yes: boolean) => {
    fi('cta', { funnel, option: product, label: yes ? 'exit-question-yes' : 'exit-question-no' })
    if (yes) setStage('questions'); else setOpen(false)
  }
  // Stage 1: the small ask. The full question only appears if they agree.
  if (stage === 'ask') {
    return (
      <div className="sq-overlay sq-overlay-light" role="dialog" aria-modal="true" aria-labelledby="sq-ask-title" onClick={e => { if (e.target === e.currentTarget) setOpen(false) }}>
        <div className="sq-box sq-ask">
          <button type="button" className="sq-close" aria-label="Close" onClick={() => setOpen(false)}>×</button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="sq-logo" src="/logo-color.svg" alt="CareStream" />
          <h2 id="sq-ask-title">Before you leave, can you answer a quick question?</h2>
          <p>It takes one tap and helps us make this better for care teams like yours.</p>
          <button type="button" className="sq-send" onClick={() => answer(true)}>Yes, happy to help</button>
          <button type="button" className="sq-later" onClick={() => answer(false)}>No thanks</button>
        </div>
      </div>
    )
  }
  const send = () => {
    fiFeedback({ kind: 'exit', choice: picked || undefined, answer: text || undefined, funnel, product })
    setSent(true)
  }
  return (
    <div className="sq-overlay" role="dialog" aria-modal="true" aria-labelledby="sq-title" onClick={e => { if (e.target === e.currentTarget) setOpen(false) }}>
      <div className="sq-box">
        <button type="button" className="sq-close" aria-label="Close" onClick={() => setOpen(false)}>×</button>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="sq-logo" src="/logo-color.svg" alt="CareStream" />
        {sent ? (
          <>
            <h2 id="sq-title">Thank you, that really helps</h2>
            {picked === 'I need to pay by invoice or purchase order' && <p>We can invoice you instead. <a href="/contact?about=Invoice%20or%20purchase%20order">Ask us for an invoice</a>.</p>}
            {picked === 'I need to check with my manager first' && <p>You can send your basket to your manager from the basket page, with the price and a link to buy.</p>}
            <button type="button" className="sq-send" onClick={() => setOpen(false)}>Back to the page</button>
          </>
        ) : (
          <>
            <h2 id="sq-title">What stopped you buying today?</h2>
            <p>One tap. It helps us make this better for care teams like yours.</p>
            <Choices choices={EXIT_CHOICES[funnel]} picked={picked} setPicked={setPicked} />
            <textarea value={text} onChange={e => setText(e.target.value)} maxLength={1000} rows={2}
                      placeholder={picked === 'Something else' ? 'Tell us what stopped you' : 'Anything to add? (optional)'} />
            <button type="button" className="sq-send" disabled={!picked && !text.trim()} onClick={send}>Send</button>
          </>
        )}
      </div>
    </div>
  )
}

/** On the thank-you pages, first: what happened just before they looked. Then AlmostStopped. */
export function BuyerQuestions({ funnel, product, preview = false }: { funnel: Funnel; product?: string | null; preview?: boolean }) {
  const [picked, setPicked] = useState('')
  const [text, setText] = useState('')
  const [sent, setSent] = useState(false)
  if (sent) return <AlmostStopped funnel={funnel} preview={preview} />
  return (
    <div className="sq-card">
      <h3>What happened just before you looked for this {funnel === 'training' ? 'course' : 'policy'}?</h3>
      <Choices choices={TRIGGER_CHOICES[funnel]} picked={picked} setPicked={setPicked} />
      <textarea value={text} onChange={e => setText(e.target.value)} maxLength={1000} rows={2} placeholder="Tell us more (optional)" />
      <button type="button" className="sq-send" disabled={!picked && !text.trim()}
              onClick={() => { if (!preview) fiFeedback({ kind: 'trigger', choice: picked || undefined, answer: text || undefined, funnel, product: product ?? undefined }); setSent(true) }}>
        Send
      </button>
    </div>
  )
}

export function AlmostStopped({ funnel, preview = false }: { funnel: Funnel; preview?: boolean }) {
  const [picked, setPicked] = useState('')
  const [text, setText] = useState('')
  const [sent, setSent] = useState(false)
  if (sent) return <div className="sq-card"><p className="sq-thanks">Thank you. We read every answer.</p></div>
  return (
    <div className="sq-card">
      <h3>Was there anything that almost stopped you buying today?</h3>
      <Choices choices={ALMOST_CHOICES} picked={picked} setPicked={setPicked} />
      <textarea value={text} onChange={e => setText(e.target.value)} maxLength={1000} rows={2} placeholder="Tell us more (optional)" />
      <button type="button" className="sq-send" disabled={!picked && !text.trim()}
              onClick={() => { if (!preview) fiFeedback({ kind: 'almost_stopped', choice: picked || undefined, answer: text || undefined, funnel }); setSent(true) }}>
        Send
      </button>
    </div>
  )
}
