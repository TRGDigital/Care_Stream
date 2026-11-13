import { SITE_URL } from '@/lib/schema'
import { planSentence, planFacts, pounds, MODULE_PRICE, LANGUAGES_CLAIM } from '@/lib/pricing-source'

// Serves /llms.txt: a curated map of the site for LLMs, per https://llmstxt.org/
// Format: H1 title, blockquote summary, detail paragraph, then H2 link-lists, with
// a final `## Optional` section that can be skipped when a shorter context is needed.
//
// Prices and the language figure come from lib/pricing-source.ts, the one source the pricing page,
// the schema and the WebMCP pricing tool also read, so this file cannot drift from them.

export const dynamic = 'force-static'

const u = (path: string) => `${SITE_URL}${path}`

function body(): string {
  const hasFree = planFacts().some(p => p.monthlyPence === 0)
  const freeLine = hasFree ? ' There is also a free plan with no card: CPD certified training free for every member of staff, every audit, and gap analysis of your first five policies, with unlimited staff logins.' : ''
  const annual = planFacts().filter(p => p.annualPence).map(p => `${p.name} ${pounds(p.annualPence!)}`).join(', ')
  return `# CareStreamAI

> AI-powered policy access and compliance platform for UK care providers. Care teams get instant, accurate answers from their own approved policies, in ${LANGUAGES_CLAIM} languages, via web chat, email and voice. Answers are grounded only in the customer's documents and a curated UK regulatory knowledge base. CareStreamAI also provides audits, policy gap detection, CQC evidence, accredited staff training and written care policies.

CareStreamAI is a B2B SaaS for care homes, domiciliary care, supported living and other regulated health & social care settings. Each client's data is isolated, processed in the UK/EEA, encrypted at rest and in transit, and never used to train AI models. Plans: ${planSentence()}, each with a 14 day free trial.${freeLine} Annual billing: ${annual}. Pricing is per service, not per member of staff (Starter includes 10 staff users; Professional and Enterprise are unlimited). Accredited training modules and written policies can also be bought one at a time without a subscription: CPD certified courses (the Care Certificate and the annual refreshers) are free for every member of staff on every plan, and other training modules are ${MODULE_PRICE} per staff member per course. CareStreamAI is an independent product and is not affiliated with or endorsed by the CQC.

## Product

- [How It Works](${u('/how-it-works')}): How staff ask questions and get grounded, multilingual answers from your policies.
- [Care Policies](${u('/care-policies')}): Instant access to your own policy library via chat, email and voice, and a shop of written UK care policies.
- [CQC & Compliance](${u('/cqc-compliance')}): CQC readiness reports, evidence-building and gap detection.
- [Policy Gap Detection](${u('/policy-gap-detection')}): Which regulations your policies cover, where the gaps are, and out of date content.
- [Care Audits](${u('/care-audits')}): Audits for care services, with reports and action plans.
- [Staff Training](${u('/staff-training')}): Accredited training modules, ${MODULE_PRICE} per staff member per course, delivered and tracked across channels.
- [CPD Certified Courses](${u('/cpd-certified')}): Courses certified by The CPD Certification Service.
- [Regulatory Knowledge](${u('/regulatory-knowledge')}): Curated UK frameworks, including GDPR, RIDDOR, the Care Act and the CQC Fundamental Standards.
- [Who It's For](${u('/who-its-for')}): Care homes, domiciliary, supported living and more.
- [Pricing](${u('/pricing')}): ${planSentence()}; 14 day free trial; priced per service, not per user.

## Company

- [About](${u('/about')}): What CareStreamAI is and the team behind it.
- [Contact](${u('/contact')}): Get in touch with sales, support or data protection.
- [Book a Demo](${u('/demo')}): Request a product walkthrough.
- [Trust & Security](${u('/trust')}): Data residency, encryption, isolation and GDPR posture.

## Resources

- [Blog](${u('/blog')}): Articles on CQC, compliance, care policy and AI.
- [FAQ](${u('/faq')}): Common questions on the AI, data security, pricing and getting started.

## Compliance

- [Privacy Policy](${u('/privacy')})
- [Terms of Service](${u('/terms')})
- [Data Processing Agreement](${u('/dpa')})
- [Cookie Policy](${u('/cookies')})

## Optional

- [Residential Care](${u('/residential-care')})
- [Nursing Homes](${u('/nursing-homes')})
- [Domiciliary Care](${u('/domiciliary-care')})
- [HR Policies](${u('/hr-policies')})
- [Business Continuity](${u('/business-continuity')})
- [Case Studies](${u('/case-studies')})
- [Training and policy collections](${u('/collections')})
`
}

export function GET() {
  return new Response(body(), {
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': 'public, max-age=3600, s-maxage=86400',
    },
  })
}
