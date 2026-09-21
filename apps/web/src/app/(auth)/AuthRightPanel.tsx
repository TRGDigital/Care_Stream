import { SiteImage } from '@/components/site-image'
import { REVIEWS } from '@/lib/reviews'

// The branded panel beside every sign-in and account form, as in the theme. The theme uses the
// one photo on both /login and /register.

const COVER = [
  { title: 'Mandatory training renewed on time, every time', label: 'Staff Training' },
  { title: 'Staff find their own HR answers, day or night', label: 'HR Policies' },
  { title: 'Finish an audit with the actions already drafted', label: 'Care Audits' },
  { title: 'See your inspection readiness before CQC does', label: 'CQC Compliance' },
  { title: 'Every carer ready for the questions inspectors ask', label: 'CQC Staff Questions' },
  { title: 'The emergency plan in every pocket, not the office', label: 'Business Continuity' },
  { title: 'Straight answers out of a long inspection report', label: 'CQC Report Chat' },
  { title: 'One current version of every policy, on every phone', label: 'Care Policies' },
]

const svg = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' } as const

export function AuthRightPanel() {
  return (
    <aside className="lgside">
      <SiteImage className="lgphoto" src="/auth-panel.jpg" alt="" fill priority sizes="54vw" />
      <div className="lgscrim" />

      <div className="lgside-in">
        <div>
          <p className="lgeyebrow">Trusted by care homes across the UK</p>
          <h2>Policy compliance,<br />answered instantly.</h2>
          <p className="lglede">
            Your care team gets instant answers from your own policies and key regulatory frameworks, via any channel.
          </p>

          <div className="lgchips">
            <span className="lgchip"><svg {...svg}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>Chat</span>
            <span className="lgchip"><svg {...svg}><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-10 6L2 7" /></svg>Email</span>
            <span className="lgchip"><svg {...svg}><rect x="9" y="2" width="6" height="12" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v4" /></svg>Voice</span>
          </div>

          <div className="lgcover">
            <p className="lgeyebrow">Everything included in your account</p>
            <ul>
              {COVER.map(c => (
                <li key={c.label}>
                  <svg {...svg} strokeWidth={2.6}><path d="M4 12.5 9.5 18 20 6.5" /></svg>
                  <span><b>{c.title}</b><em>{c.label}</em></span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* A real review (lib/reviews), in place of the theme's placeholder quote. */}
        <figure className="lgquote">
          <blockquote>&ldquo;{REVIEWS[0].excerpt}&rdquo;</blockquote>
          <figcaption>{REVIEWS[0].name}, {REVIEWS[0].setting}</figcaption>
        </figure>
      </div>
    </aside>
  )
}
