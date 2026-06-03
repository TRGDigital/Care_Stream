import { SITE_URL } from '@/lib/schema'

// Serves /llms.txt — a curated map of the site for LLMs, per https://llmstxt.org/
// Format: H1 title, blockquote summary, detail paragraph, then H2 link-lists, with
// a final `## Optional` section that can be skipped when a shorter context is needed.

export const dynamic = 'force-static'

const u = (path: string) => `${SITE_URL}${path}`

const BODY = `# CareStreamAI

> AI-powered policy access and compliance platform for UK care providers. Care teams get instant, accurate answers from their own approved policies — in 50+ languages — via web chat, email and WhatsApp. Answers are grounded only in the customer's documents and a curated UK regulatory knowledge base (RAG), so the AI never invents content.

CareStreamAI is a B2B SaaS for care homes, domiciliary care, supported living and other regulated health & social care settings. Each client's data is isolated, processed in the UK/EEA, encrypted at rest and in transit, and never used to train AI models. Plans: Starter £49/home/month and Professional £129/home/month, with a 14-day free trial. CareStreamAI is an independent product and is not affiliated with or endorsed by the CQC.

## Product

- [How It Works](${u('/how-it-works')}): How staff ask questions and get grounded, multilingual answers from your policies.
- [Care Policies](${u('/care-policies')}): Instant access to your own policy library via chat, email and WhatsApp.
- [CQC & Compliance](${u('/cqc-compliance')}): CQC readiness reports, evidence-building and gap detection.
- [Staff Training](${u('/staff-training')}): Deliver and track training modules across channels.
- [Regulatory Knowledge](${u('/regulatory-knowledge')}): Curated UK frameworks — GDPR, RIDDOR, the Care Act, CQC Fundamental Standards.
- [Who It's For](${u('/who-its-for')}): Care homes, domiciliary, supported living and more.
- [Pricing](${u('/pricing')}): Starter £49 and Professional £129 per home / month; 14-day free trial, priced per home not per user.

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
`

export function GET() {
  return new Response(BODY, {
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': 'public, max-age=3600, s-maxage=86400',
    },
  })
}
