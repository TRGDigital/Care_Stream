import type { ScenarioMock } from '@/lib/scenarios'

// Mock-ups of real CareStream screens, drawn in markup (never generated pictures) so they stay
// accurate and readable. Each one uses the labels the real screen uses: the Training screen's
// "Adhoc Training Modules & Questions" tab, the Staff Hub's Follow-up tab ("Learn & retry",
// "Just retry"), the staff record's Language settings and the Analytics "Knowledge gaps" view.
// Only the example content (module, questions, numbers) changes between pages. If a screen changes in the product,
// update it here.

function Win({ title, caption, children }: { title: string; caption: string; children: React.ReactNode }) {
  return (
    <div className="uc-shot">
      <div className="mock">
        <div className="mk-bar"><i /><i /><i /><span>{title}</span></div>
        <div className="mk-body">{children}</div>
      </div>
      <p className="mk-cap">{caption}</p>
    </div>
  )
}

export function ScenarioMockView({ m }: { m: ScenarioMock }) {
  if (m.type === 'training') {
    return (
      <Win title="Training" caption="Illustration based on the Training screen. Example questions.">
        <div className="mk-tabs"><span>Standard training</span><span className="on">Adhoc Training Modules &amp; Questions</span></div>
        <div className="mk-pill">Live policy training</div>
        <div className="mk-mod">
          <div className="mk-modhd"><b>{m.module}</b><span className="mk-lock">Questions editable</span></div>
          <div className="mk-btns"><span className="mk-btn pri">&#10022; Generate lesson &amp; questions</span><span className="mk-btn">&#10022; Questions only</span><span className="mk-btn">Preview</span></div>
          {m.questions.slice(0, 3).map((q, i) => (
            <div className="mk-q" key={i}><small>Question {i + 1}</small>{q}</div>
          ))}
          <div className="mk-assign"><b>Assign this module:</b><span className="mk-btn">Assign to specific staff&hellip;</span><span className="mk-btn pri">Assign to all staff ({m.staff_count ?? 24})</span></div>
        </div>
      </Win>
    )
  }
  if (m.type === 'followup') {
    return (
      <Win title="Staff Hub: Follow-up" caption="Illustration based on the Staff Hub Follow-up tab. Example content.">
        <div className="mk-h">Follow-up</div>
        <p className="mk-p">A few things to revisit. Learn the point, then answer, or just retry. Either way it clears from here.</p>
        <div className="mk-card"><small>{m.module}</small><b>{m.question}</b>
          <div className="mk-btns"><span className="mk-btn pri">Learn &amp; retry</span><span className="mk-btn">Just retry</span></div></div>
        <div className="mk-card les"><small className="am">Why this matters</small><p>{m.why}</p>
          <small>Remember</small><ul>{m.remember.map((r, i) => <li key={i}>{r}</li>)}</ul>
          <small>Picture this</small><p>{m.picture}</p>
          <div className="mk-btns"><span className="mk-btn pri">Continue to the question</span></div></div>
      </Win>
    )
  }
  if (m.type === 'language') {
    return (
      <Win title="Staff record: Language" caption="Illustration based on the staff record Language settings. Translation is on the paid plans.">
        <div className="mk-h">Language</div>
        <div className="mk-two"><div><small>First language</small><b>English</b></div><div><small>Second language</small><b>{m.second_language}</b></div></div>
        <div className="mk-tg"><span className="sw on" /><p><b>Always communicate in their first language</b><br />All messages CareStream sends are translated into English.</p></div>
        <div className="mk-tg"><span className="sw on" /><p><b>Allow switching a set to their second language</b><br />In the hub they can flip any single training, induction or CQC set into {m.second_language}, just for that set, if they are struggling in their first language.</p></div>
        <div className="mk-tg"><span className="sw on" /><p><b>Let them suggest better translations</b><br />They can propose improvements to translated content. Changes need your approval before going live.</p></div>
      </Win>
    )
  }
  return (
    <Win title="Analytics: Knowledge gaps" caption="Illustration based on the Knowledge gaps view. Example figures.">
      <div className="mk-stats">
        <div><small>Open gaps</small><b>{m.stats.open}</b></div>
        <div><small>Staff affected</small><b>{m.stats.affected}</b></div>
        <div><small>Closed (30 days)</small><b>{m.stats.closed}</b></div>
        <div><small>Engaged with learning</small><b>{m.stats.engaged}%</b></div>
      </div>
      <div className="mk-two2">
        <div className="mk-card"><small>Most-missed questions</small>
          {m.missed.map(([a, b], i) => <div className="mk-row" key={i}><span>{a}</span><em>{b}</em></div>)}</div>
        <div className="mk-card"><small>Weakest topics</small>
          {m.weak.map(([a, b], i) => <div className="mk-row" key={i}><span>{a}</span><em>{b}</em></div>)}</div>
      </div>
      <div className="mk-card"><small>How gaps are being closed</small>
        <div className="mk-bar2"><i style={{ width: `${m.stats.engaged}%` }} /></div>
        <div className="mk-leg"><span><u className="t" />Learn &amp; retry</span><span><u className="a" />Just retry</span></div></div>
    </Win>
  )
}
