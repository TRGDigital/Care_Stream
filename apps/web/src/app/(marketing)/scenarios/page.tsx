import type { Metadata } from 'next'
import Link from 'next/link'
import { SiteImage } from '@/components/site-image'
import { PageBreadcrumbJsonLd } from '@/components/page-breadcrumb-json-ld'
import { SITE_URL } from '@/lib/schema'
import { publishedScenarios } from '@/data/scenarios'
import '@/components/marketing/user-case-page.css'
import '@/components/marketing/scenario-page.css'

export const revalidate = 300

export const metadata: Metadata = {
  title: { absolute: 'Care Home Scenarios: How CareStream Is Used | CareStreamAI' },
  description: 'Real situations in care homes, from "they attended the training but did they understand it?" to preparing for an inspection, and how CareStream is used in each.',
  alternates: { canonical: `${SITE_URL}/scenarios` },
}

export default function ScenariosHub() {
  const list = publishedScenarios()
  return (
    <div className="ucpage scn">
      <PageBreadcrumbJsonLd trail={[{ name: 'Scenarios', path: '/scenarios' }]} />
      <section className="uc-hero">
        <div className="uc-wrap" style={{ paddingBlock: '64px 56px' }}>
          <span className="uc-eyebrow">Scenarios</span>
          <h1 style={{ maxWidth: '20ch' }}>Why should I use <em>CareStream?</em></h1>
          <p className="uc-lede" style={{ maxWidth: '44em' }}>Real situations in care homes, and how CareStream is used in each. Pick the one that sounds like your week.</p>
        </div>
      </section>
      <section className="uc-sec">
        <div className="uc-wrap">
          <div className="uc-cards">
            {list.map(s => (
              <Link className="uc-res" href={`/scenarios/${s.slug}`} key={s.slug}>
                <span className="uc-band"><SiteImage src={s.image} alt={s.image_alt} /></span>
                <span className="body"><h3>{s.card_title}</h3><p>{s.card_snippet}</p><span className="uc-more">Read the scenario</span></span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
