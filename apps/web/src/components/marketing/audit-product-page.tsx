import { JsonLd } from '@/components/json-ld'
import { ServicePageV2, type ServiceBlock, type ServiceItem, type ServicePage, type ServicePart } from '@/components/marketing/service-page-v2'
import { faqPageSchema, howToSchema, breadcrumbSchema } from '@/lib/schema'
import { getSitePageContent } from '@/lib/site-page-content'
import { SERVICE_LABEL } from '@/lib/audit-catalogue'
import type { AuditPageData } from '@/lib/audit-pages/types'

// A product page for one audit, built on the SAME V2 service template as /care-audits, so it
// carries the current theme (lavender hero, black pill buttons, tinted bands, theme cards, steps
// and question accordions). The page is assembled as a ServicePage record from the audit's data.

const FREQ: Record<string, string> = { daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly', quarterly: 'Quarterly', periodic: 'Periodic' }
const SCOPE: Record<string, string> = { resident: 'One person at a time', staff: 'One staff member at a time', room: 'One room at a time', none: 'Whole service' }
const SCOPE_SHORT: Record<string, string> = { resident: 'Per person', staff: 'Per staff', room: 'Per room', none: 'Whole site' }
const HERO_IMAGE = '/images/our-services/care-audits/1.webp'

const item = (title: string, paras: string[] = [], more: Partial<ServiceItem> = {}): ServiceItem =>
  ({ marker: '', tag: '', tone: '', title, paras, bullets: [], ...more })
const part = (kind: string, more: Partial<ServicePart>): ServicePart =>
  ({ kind, where: '', items: [], bullets: [], ...more })
const block = (label: string, heading: string, parts: ServicePart[], more: Partial<ServiceBlock> = {}): ServiceBlock =>
  ({ kind: 'cards', tint: false, label, heading, intro: [], image: null, parts, ...more })

export async function AuditProductPage({ page: p }: { page: AuditPageData }) {
  const path = `/care-audits/${p.slug}`
  const total = p.sections.reduce((n, s) => n + s.questions.length, 0)
  const register = `/register?tier=free&source=audit-${p.slug}`
  const short = p.name.replace(/\s*\(.*\)$/, '')
  const { faqs: consoleFaqs } = await getSitePageContent(path)
  // Questions written for this audit first, then any added in the console (Blog, Main site pages).
  const faqs = [...p.faqs, ...consoleFaqs.filter(f => !p.faqs.some(x => x.question === f.question))]

  const record: ServicePage = {
    slug: `care-audits-${p.slug}`,
    title: p.h1_html ?? p.h1,
    hero_image_url: HERO_IMAGE,
    content: {
      eyebrow: `Free audit · ${FREQ[p.frequency] ?? p.frequency} · ${SCOPE[p.scope] ?? p.scope}`,
      lede: [p.intro],
      actions: [
        { label: 'Run this audit free', href: register, style: 'solid', play: false },
        { label: `See all ${total} checks`, href: '#questions', style: 'ghost', play: false },
      ],
      blocks: [
        block('At a glance', `${short}, in short.`, [part('stats', { items: [
          item('How often', [`Run it ${(FREQ[p.frequency] ?? p.frequency).toLowerCase()}, ${(SCOPE[p.scope] ?? '').toLowerCase()}.`], { marker: FREQ[p.frequency] ?? p.frequency }),
          item('The checks', [`${p.sections.length} sections, each scored, with a space for findings and actions.`], { marker: String(total) }),
          item('Who runs it', [`${p.who_runs_it}. ${p.evidence_note}`], { marker: SCOPE_SHORT[p.scope] ?? 'Audit' }),
          item('Cost', ['Free to run on every plan. No card needed.'], { marker: 'Free' }),
        ] })], { kind: 'stats', id: 'at-a-glance' }),

        block('What it covers', p.what_it_is_title, [part('cards', { items: p.sections.map(s =>
          item(s.title, [s.questions.find(q => !/^(number|how many|date|name)/i.test(q)) ?? s.questions[0]], { tag: `${s.questions.length} checks` })) })],
          { id: 'what-it-covers', tint: true, intro: [p.what_it_is] }),

        block('How to use it', `How to run the ${short}, step by step.`, [part('steps', { items: p.steps.map((s, i) =>
          item(s.name, [s.text], { marker: String(i + 1).padStart(2, '0') })) })], { kind: 'steps', id: 'how-to-use' }),

        block('The full question set', `All ${total} checks, section by section.`, [part('faq', { items: p.sections.map(s =>
          item(`${s.title} (${s.questions.length})`, s.questions.map((q, i) => `${i + 1}. ${q}`))) })],
          { kind: 'faq', id: 'questions', tint: true, narrow: true, intro: ['You can read every check before you sign up. Inside CareStream each one is scored, can carry a finding and can raise an action.'] }),

        block('Who it is for', 'Care services this audit suits.', [
          part('cards', { items: [
            item('Care services', [p.evidence_note], { bullets: p.services.map(s => SERVICE_LABEL[s] ?? s) }),
            item('Regulations it supports', ['This audit checks that things are in place, recorded and reviewed. It does not give clinical or legal advice.'], { bullets: p.regulations.map(r => `${r.ref}: ${r.title}`) }),
          ] }),
          part('links', { sub: 'Read the regulation', items: p.regulations.map(r => item(r.ref, [], { href: r.url })) }),
        ], { id: 'who-for' }),

        { kind: 'end', tint: false, label: '', heading: `Run the ${short} <em>free.</em>`, intro: ['Create a free account and run it today. No card needed.', `More free audits: ${p.related.join(', ')}.`], image: null,
          actions: [
            { label: 'Run this audit free', href: register, style: 'solid', play: false },
            { label: 'Browse all free audits', href: '/care-audits#audit-library', style: 'ghost', play: false },
          ] },
      ],
    },
  }

  return (
    <>
      <JsonLd data={breadcrumbSchema([{ name: 'Home', path: '/' }, { name: 'Care audits', path: '/care-audits' }, { name: p.name, path }])} />
      <JsonLd data={howToSchema({ name: `How to run the ${p.name}`, description: p.description, path, steps: p.steps })} />
      <JsonLd data={faqPageSchema(faqs)} />
      <ServicePageV2 page={record} faqs={faqs} />
    </>
  )
}
