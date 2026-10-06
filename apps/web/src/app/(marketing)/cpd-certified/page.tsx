import Link from 'next/link'
import { pageMetadata } from '@/lib/page-meta'
import { CPD_CERTIFIED_LOGO } from '@/lib/cpd'
import { ShopInfoPage } from '@/components/marketing/shop-info'

// What "CPD Certified" means on our training, and the proof: the listing on The CPD Certification
// Service's register. The CPD Certified mark is only used for certified training (lib/cpd.ts); the
// service's own logo is never used.
//
// The list builds itself from the training catalogue: any course whose module is flagged
// cpd_accredited appears here with its CPD hours. Add the month it was certified to
// CERTIFIED_SINCE when a course is certified (docs/cpd-certification-checklist.md).

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'
export const revalidate = 900

const CERTIFIED_SINCE: Record<string, string> = {
  'care-certificate': 'September 2026',
  'coshh-control-of-substances-hazardous-to-health': 'October 2026',
  'end-of-life-palliative-care': 'October 2026',
  'food-hygiene': 'October 2026',
  'gdpr-data-protection': 'October 2026',
  'general-health-and-safety-awareness': 'October 2026',
  'infection-prevention-and-control': 'October 2026',
  'medication-administration-and-competency': 'October 2026',
  'mental-health-awareness': 'October 2026',
  'moving-and-handling-of-people': 'October 2026',
}
const WORDS = ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve']
const countWord = (n: number) => WORDS[n] ?? String(n)

type Certified = { slug: string; title: string; hours: string; since: string }

async function getCertified(): Promise<Certified[]> {
  try {
    const res = await fetch(`${API_URL}/public/training/standard-modules`, { next: { revalidate: 900 } })
    if (!res.ok) return []
    const topics = ((await res.json())?.data?.topics ?? []) as Array<{ slug: string; title: string; cpd_accredited?: boolean; duration_minutes?: number | null }>
    return topics.filter(t => t.cpd_accredited).map(t => {
      const h = Math.round(((t.duration_minutes || 60) / 60) * 10) / 10
      return { slug: t.slug, title: t.title, hours: `${h} ${h === 1 ? 'CPD hour' : 'CPD hours'}`, since: CERTIFIED_SINCE[t.slug] ?? 'Recently' }
    }).sort((a, b) => Number(b.slug === 'care-certificate') - Number(a.slug === 'care-certificate') || a.title.localeCompare(b.title))
  } catch {
    return []
  }
}

export async function generateMetadata() {
  const n = (await getCertified()).length
  return pageMetadata('/cpd-certified', {
    title: 'CPD Certified Care Staff Training | CareStreamAI',
    description: `${countWord(n)} CareStream care training courses are certified by The CPD Certification Service, including the Care Certificate, with the CPD mark on every certificate and a listing you can check yourself.`,
  })
}

export default async function CpdCertifiedPage() {
  const CERTIFIED = await getCertified()
  return (
    <ShopInfoPage
      path="/cpd-certified"
      eyebrow="CPD Certified"
      title="CPD Certified care staff training"
      lead={`${countWord(CERTIFIED.length)} of our courses are independently reviewed and certified by The CPD Certification Service, so you know they meet recognised standards for continuing professional development.`}
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
      <p className="si-note">Each course is added here once The CPD Certification Service has certified it.</p>

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
