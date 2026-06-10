// Central registry of CareStream's PUBLIC, read-only WebMCP tools.
//
// These describe what the marketing site can answer for an AI agent. They touch
// no authenticated data, so they're safe to expose site-wide. Authenticated
// tenant tools (ask_policy_question, search_policies, …) live behind login and
// run under the user's own session — added in a later phase.
//
// Keep this curated, like lib/schema.ts: one place, accurate, no dumps.

import { SITE_URL } from '@/lib/schema'
import type { AgentToolDef } from '@/lib/webmcp'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

const PLANS = [
  {
    name: 'Starter',
    priceGBP: 49,
    billing: 'per home / month',
    includes: ['Full policy library', '50+ languages', 'Email & chat channels', 'Full audit logging'],
  },
  {
    name: 'Professional',
    priceGBP: 129,
    billing: 'per home / month',
    includes: [
      'Everything in Starter',
      'CQC Readiness Reports',
      'Policy gap detection',
      'Language analytics',
      'Individual staff engagement data',
    ],
  },
]

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
      what: 'CareStreamAI is an AI policy-access and compliance platform for UK care providers. Care teams get instant, accurate answers from their own approved policies — in 50+ languages — via web chat, email and WhatsApp.',
      grounding:
        'Answers are grounded only in the customer’s uploaded documents and a curated UK regulatory knowledge base (RAG). It does not invent content.',
      whoFor: 'Care homes, domiciliary care, supported living, and other regulated health & social care settings.',
      data: 'Per-client isolated, processed in the UK/EEA, encrypted at rest and in transit, never used to train AI models.',
      channels: ['Web chat', 'Email', 'WhatsApp'],
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
      freeTrial: '14-day free trial. A card is required to start, but you are not charged until day 14 — cancel anytime before then.',
      perUser: 'Priced per home, not per user — the whole team is included.',
      groupPricing: 'Discounts available for multiple homes — contact sales.',
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
