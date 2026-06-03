'use client'

import { useSession } from 'next-auth/react'
import { useAgentTools } from '@/hooks/use-agent-tool'
import { createApiClient } from '@/lib/api-client'
import type { AgentToolDef } from '@/lib/webmcp'

// Phase 2 — authenticated WebMCP tools for the logged-in tenant app.
//
// These run CLIENT-SIDE under the user's own NextAuth session: every call goes
// through createApiClient(accessToken) → the same authenticated API the UI uses,
// so tenant isolation / RLS / role checks all hold automatically. No new
// credentials, no new server surface. Read-only this phase — mutating actions
// (start audit, change settings) are deferred until they're confirmation-gated.

const stripHtml = (html: string) =>
  html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim()

function buildTenantTools(token: string): AgentToolDef[] {
  const api = createApiClient(token)

  return [
    {
      name: 'ask_policy_question',
      title: 'Ask a policy question',
      description:
        "Answer a question using this care home's own approved policies, staff handbook and UK regulatory knowledge base. Returns a grounded answer with citations. Use for any 'what does our policy say / how do I…' question.",
      inputSchema: {
        type: 'object',
        properties: {
          question: { type: 'string', description: 'The question to answer from the policies.' },
          category: {
            type: 'string',
            description: 'Optional area to focus on.',
            enum: ['internal_policy', 'staff_handbook', 'training_module', 'cqc_report', 'business_continuity'],
          },
        },
        required: ['question'],
      },
      // A lookup from the agent's view; the answer is customer-supplied content.
      annotations: { readOnlyHint: true, untrustedContentHint: true },
      execute: async (input) => {
        const question = String((input as { question?: unknown }).question ?? '').trim()
        if (!question) return { error: 'A question is required.' }
        const category = (input as { category?: string }).category
        const r = await api.query.send({
          query_text: question,
          ...(category ? { document_category: category as 'internal_policy' } : {}),
        })
        return {
          answer: stripHtml(r.responseHtml || ''),
          noMatch: r.noMatch,
          citations: r.citations.map(c => ({ policy: c.policy_name, version: c.version, category: c.document_category })),
          languageDetected: r.languageDetected,
        }
      },
    },
    {
      name: 'search_policies',
      title: 'Search policies',
      description:
        "List or search this care home's policy documents by keyword. Returns matching policy names, categories and status. Use to find which policies exist before asking about them.",
      inputSchema: {
        type: 'object',
        properties: { query: { type: 'string', description: 'Keywords to filter by. Empty returns all policies.' } },
      },
      annotations: { readOnlyHint: true, untrustedContentHint: true },
      execute: async (input) => {
        const q = String((input as { query?: unknown }).query ?? '').trim().toLowerCase()
        const data = await api.policies.list()
        const policies: Array<{ id: string; policy_name?: string; name?: string; document_category?: string; status?: string }> =
          data?.policies ?? data ?? []
        const mapped = policies.map(p => ({
          name: p.policy_name ?? p.name ?? '',
          category: p.document_category ?? null,
          status: p.status ?? null,
        }))
        const results = q ? mapped.filter(p => p.name.toLowerCase().includes(q)) : mapped
        return { count: results.length, policies: results.slice(0, 50) }
      },
    },
    {
      name: 'list_training_modules',
      title: 'List training modules',
      description:
        'List the training & learning modules available in CareStream for this care home (name, category and description). Use to see what training exists.',
      annotations: { readOnlyHint: true },
      execute: async () => {
        const data = await api.training.modules()
        return {
          modules: (data.modules ?? []).map(m => ({
            name: m.name,
            category: m.category,
            description: m.description,
            questions: m.questions?.length ?? 0,
          })),
        }
      },
    },
  ]
}

// Registers the authenticated tenant tools. Renders nothing; feature-detects
// WebMCP and no-ops where unsupported. Re-registers if the access token changes.
export function TenantAgentTools() {
  const { data: session } = useSession()
  const token = (session as { accessToken?: string } | null)?.accessToken

  useAgentTools(token ? buildTenantTools(token) : [], [token])
  return null
}
