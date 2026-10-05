import Link from 'next/link'
import { pageMetadata } from '@/lib/page-meta'
import { CPD_CERTIFIED_LOGO } from '@/lib/cpd'
import { ShopInfoPage } from '@/components/marketing/shop-info'

// What "CPD Certified" means on our training, and the proof: the listing on The CPD Certification
// Service's register. The CPD Certified mark is only used for certified training (lib/cpd.ts); the
// service's own logo is never used. Add a course here when it is certified.

export const generateMetadata = () => pageMetadata('/cpd-certified', {
  title: 'CPD Certified Care Staff Training | CareStreamAI',
  description: 'Our Care Certificate training is certified by The CPD Certification Service: 1.5 CPD hours, the CPD mark on every certificate, and a listing you can check yourself.',
})

const CERTIFIED = [
  { slug: 'care-certificate', title: 'Care Certificate', hours: '1.5 CPD hours', since: 'September 2026' },
]

export default function CpdCertifiedPage() {
  return (
    <ShopInfoPage
      path="/cpd-certified"
      eyebrow="CPD Certified"
      title="CPD Certified care staff training"
      lead="Our training is independently reviewed by The CPD Certification Service, so you know it meets recognised standards for continuing professional development."
    >
      <div className="si-card si-cpd">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={CPD_CERTIFIED_LOGO} alt="CPD Certified" width={132} height={120} />
        <div>
          <h3>CareStream is CPD Provider No. 50224</h3>
          <p style={{ margin: 0 }}>You can check our listing and our certified courses on The CPD Certification Service&apos;s own website: <a href="https://www.cpduk.co.uk/providers/carestream" rel="noopener noreferrer" target="_blank">cpduk.co.uk/providers/carestream</a>.</p>
        </div>
      </div>

      <h2>Certified courses</h2>
      <table>
        <thead><tr><th>Course</th><th>CPD</th><th>Certified</th></tr></thead>
        <tbody>
          {CERTIFIED.map(c => (
            <tr key={c.slug}><td><Link href={`/staff-training/${c.slug}`}>{c.title}</Link></td><td>{c.hours}</td><td>{c.since}</td></tr>
          ))}
        </tbody>
      </table>
      <p className="si-note">More of our courses are with The CPD Certification Service for review. Each is added here once it is certified.</p>

      <h2>What it means for your staff</h2>
      <ul className="si-ticks">
        <li>Every learner who passes gets a named, dated certificate showing the CPD mark and their CPD hours.</li>
        <li>They can add those hours to their own development record, and you have the certificate for supervision and CQC.</li>
        <li>The course is reviewed against CPD standards for its content, structure and learning outcomes, and kept up to date when the standards or CQC guidance change.</li>
      </ul>

      <div className="si-actions">
        <Link className="si-btn" href="/staff-training/care-certificate">See the Care Certificate course</Link>
        <Link className="si-btn ghost" href="/staff-training/team-pricing">Team pricing</Link>
      </div>
    </ShopInfoPage>
  )
}
