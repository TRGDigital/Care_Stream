// Central registry of CareStream's PUBLIC, read-only WebMCP tools.
//
// These describe what the marketing site can answer for an AI agent. They touch
// no authenticated data, so they're safe to expose site-wide. Authenticated
// tenant tools (ask_policy_question, search_policies, …) live behind login and
// run under the user's own session — added in a later phase.
//
// Keep this curated, like lib/schema.ts: one place, accurate, no dumps.

import { SITE_URL } from '@/lib/schema'
import { publicPlans, planFacts, MODULE_PRICE, LANGUAGES_CLAIM } from '@/lib/pricing-source'
import type { AgentToolDef } from '@/lib/webmcp'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

// Built from the one price source (lib/pricing-source.ts), so this can never drift from /pricing.
const PLANS = publicPlans().map(p => {
  const f = planFacts().find(x => x.name === p.name)
  return {
    name: p.name,
    priceGBP: f ? f.monthlyPence / 100 : null,
    annualPriceGBP: f?.annualPence ? f.annualPence / 100 : null,
    billing: 'per service per month',
    summary: p.line,
    includes: p.features.map(x => x.text),
  }
})

interface BlogListPost {
  slug: string
  title: string
  excerpt: string | null
  category: string | null
  publication_date: string | null
}

/** Tools exposed on every public marketing page. */
export const PUBLIC_AGENT_TOOLS: AgentToolDef[] = [
  {
    name: 'carestream_overview',
    title: 'About CareStreamAI',
    description:
      'Explain what CareStreamAI is, who it is for, and the core capabilities. Use this to answer "what is CareStream / what does it do / who is it for".',
    annotations: { readOnlyHint: true },
    execute: () => ({
      what: 'CareStreamAI is an AI policy-access and compliance platform for UK care providers. Care teams get instant, accurate answers from their own approved policies, in 60+ languages, via web chat, email and voice.',
      grounding:
        'Answers are grounded only in the customer’s uploaded documents and a curated UK regulatory knowledge base (RAG). It does not invent content.',
      whoFor: 'Care homes, domiciliary care, supported living, and other regulated health & social care settings.',
      data: 'Per-client isolated, processed in the UK/EEA, encrypted at rest and in transit, never used to train AI models.',
      channels: ['Web chat', 'Email', 'Voice'],
      url: SITE_URL,
    }),
  },
  {
    name: 'get_pricing',
    title: 'CareStreamAI pricing',
    description:
      'Return CareStreamAI subscription plans, prices and what each includes. Use for questions about cost, plans, trial, or per-user fees.',
    annotations: { readOnlyHint: true },
    execute: () => ({
      currency: 'GBP',
      plans: PLANS,
      freeTrial: '14 day free trial. A card is required to start, but you are not charged until the trial ends, and you can cancel before then.',
      perUser: 'Priced per service, not per member of staff. Starter includes up to 10 staff users; Professional and Enterprise include unlimited staff users.',
      groupPricing: 'Enterprise includes the multi site group console. Talk to sales about group pricing for more than three services.',
      annual: 'Annual billing saves two months on every paid plan.',
      ...(PLANS.some(p => p.priceGBP === 0) ? { freePlan: 'A free plan needs no card: CPD certified training free for every member of staff, every audit template, and gap analysis on your first 5 policies in total, with unlimited staff logins. AI recommendations at the end of audits and more than 5 policies are on the paid plans.' } : {}),
      trainingModules: `CPD certified courses (the Care Certificate and the annual refreshers) are free for every member of staff on every plan, with a free account. Other training modules can be bought without a subscription at ${MODULE_PRICE} per staff member per course.`,
      languages: `Staff can use the hub in ${LANGUAGES_CLAIM} languages.`,
      url: `${SITE_URL}/pricing`,
    }),
  },
  {
    name: 'search_blog',
    title: 'Search the CareStream blog',
    description:
      'Search CareStreamAI’s published articles (CQC, compliance, care policy, AI) by keyword and return matching titles, summaries and links.',
    inputSchema: {
      type: 'object',
      properties: { query: { type: 'string', description: 'Keywords to search for. Empty returns the latest posts.' } },
    },
    annotations: { readOnlyHint: true, untrustedContentHint: true },
    execute: async (input) => {
      const query = String((input as { query?: unknown })?.query ?? '').trim().toLowerCase()
      const res = await fetch(`${API_URL}/public/blog/posts`)
      if (!res.ok) return { results: [], error: 'Blog unavailable' }
      const body = await res.json()
      const posts: BlogListPost[] = body?.data?.posts ?? []
      const matched = query
        ? posts.filter(p => `${p.title} ${p.excerpt ?? ''} ${p.category ?? ''}`.toLowerCase().includes(query))
        : posts
      return {
        results: matched.slice(0, 10).map(p => ({
          title: p.title,
          summary: p.excerpt ?? '',
          category: p.category,
          date: p.publication_date,
          url: `${SITE_URL}/blog/${p.slug}`,
        })),
      }
    },
  },
]
