import type { AuditPageData } from '@/lib/audit-pages/types'
import './audit-mockup.css'

// A drawn mock-up of the first questions of an audit, for the hero of each audit page. It is built
// from the audit's own data, so every audit page gets its own. Decorative: aria-hidden.

function Answer({ type, n }: { type: string; n: number }) {
  // The first two questions show as answered Yes and the third as No, so the card reads as in use.
  const sel = n === 0 || n === 1 ? 'yes' : n === 2 ? 'no' : ''
  if (type === 'yes_no_na' || type === 'yes_no') {
    const opts = type === 'yes_no_na' ? ['Yes', 'No', 'N/A'] : ['Yes', 'No']
    return <div className="amock-opts">{opts.map(o => <span key={o} className={`amock-opt${sel && o.toLowerCase() === sel ? ` ${sel}` : ''}`}>{o}</span>)}</div>
  }
  if (type === 'number') return <span className="amock-field">Enter a number</span>
  if (type === 'date') return <span className="amock-field">dd / mm / yyyy</span>
  if (type === 'rating') return <div className="amock-opts">{[1, 2, 3, 4, 5].map(o => <span key={o} className="amock-opt">{o}</span>)}</div>
  if (type === 'choice' || type === 'multi_choice') return <span className="amock-field">Choose an answer</span>
  return <span className="amock-field area">Add your notes</span>
}

export function AuditMockup({ page: p }: { page: AuditPageData }) {
  const m = p.mock
  return (
    <div className="amock" aria-hidden="true">
      <div className="amock-top">
        <div><small>Audit in progress</small><b>{p.name}</b></div>
        <span className="amock-pill">Section {m.section_no} of {m.sections}</span>
      </div>
      <div className="amock-prog"><i /></div>
      <div className="amock-sec">{m.section}</div>
      {m.questions.slice(0, 4).map((q, i) => (
        <div className="amock-q" key={q.text}>
          <p><span>{i + 1}.</span>{q.text}</p>
          <Answer type={q.type} n={i} />
          {i === 2 && q.type.startsWith('yes_no') && <p className="amock-flag">Finding recorded. An action will be created.</p>}
        </div>
      ))}
      <div className="amock-foot"><span>3 of {p.sections.reduce((n, s) => n + s.questions.length, 0)} answered</span><b>Next section</b></div>
    </div>
  )
}
