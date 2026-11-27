import { ScenarioMockView } from './scenario-mocks'

// Mock-ups of the CareStream screens that produce each Well-led evidence list. Drawn in markup (never generated pictures), in the same
// window style as the scenario pages. Names and figures are examples. Each uses the labels the real screen uses.

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

export function WellLedMock({ slug }: { slug: string }) {
  if (slug === 'governance') {
    return (
      <Win title="Settings: Roles your policies ask for" caption="Illustration based on the Roles panel in Settings, Organisation details. Example names and figures.">
        <div className="mk-modhd"><b>Roles your policies ask for</b><span className="mk-lock">Example</span></div>
        <div className="mk-stats">
          <div><small>Roles named</small><b>12</b></div>
          <div><small>Policies with a role</small><b>42</b></div>
          <div><small>Staff trained</small><b>38 of 41</b></div>
        </div>
        <div className="mk-card"><small>Named role holders</small>
          <div className="mk-row"><span>Registered manager &middot; Priya</span><em>Named in 14 policies</em></div>
          <div className="mk-row"><span>Safeguarding lead &middot; Tom</span><em>Named in 9 policies</em></div>
          <div className="mk-row"><span>Infection prevention and control lead &middot; Maria</span><em>Named in 6 policies</em></div>
        </div>
        <div className="mk-card"><small>Former staff named in your policies</small>
          <div className="mk-row"><span>Sam &middot; Archived</span><em>2 policies, replace</em></div>
        </div>
      </Win>
    )
  }
  if (slug === 'learning') {
    return (
      <Win title="Audits: Call bell response" caption="Illustration of an audit with its actions and re-check. Example content.">
        <div className="mk-modhd"><b>Call bell response audit</b><span className="mk-lock">Example</span></div>
        <div className="mk-stats">
          <div><small>March</small><b>62%</b></div>
          <div><small>June re-check</small><b>81%</b></div>
          <div><small>Actions closed</small><b>3 of 3</b></div>
        </div>
        <div className="mk-card"><small>Action trail</small>
          <div className="mk-row"><span>Slow answers at the afternoon handover</span><em>Finding, March</em></div>
          <div className="mk-row"><span>Cover at handover &middot; owner Maria</span><em>Action, April</em></div>
          <div className="mk-row"><span>Short follow up lesson on call bells</span><em>Completed, May</em></div>
          <div className="mk-row"><span>Re-check shows the change</span><em>81%, June</em></div>
        </div>
      </Win>
    )
  }
  if (slug === 'inclusion') return <ScenarioMockView m={{ type: 'language', second_language: 'Polish' }} />
  return (
    <Win title="Analytics: Recent queries" caption="Illustration based on the Recent queries view of what staff ask. Example questions.">
      <div className="mk-modhd"><b>What staff are asking</b><span className="mk-lock">Example</span></div>
      <div className="mk-stats">
        <div><small>Questions this month</small><b>186</b></div>
        <div><small>Answered from policies</small><b>94%</b></div>
        <div><small>Staff using it</small><b>31</b></div>
      </div>
      <div className="mk-card"><small>Most asked</small>
        <div className="mk-row"><span>Who is our safeguarding lead?</span><em>24 times</em></div>
        <div className="mk-row"><span>What do I do if a resident falls?</span><em>19 times</em></div>
        <div className="mk-row"><span>Who do I tell about a medication error?</span><em>12 times</em></div>
      </div>
      <div className="mk-card"><small>Not found in your policies</small>
        <div className="mk-row"><span>What is our visiting policy at night?</span><em>Policy gap</em></div>
      </div>
    </Win>
  )
}
