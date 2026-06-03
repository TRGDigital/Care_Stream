'use client'

import { useSession } from 'next-auth/react'
import { useAgentTools } from '@/hooks/use-agent-tool'
import { createApiClient } from '@/lib/api-client'
import type { AgentToolDef } from '@/lib/webmcp'
import { requestAgentConfirmation } from '@/lib/agent-confirm'
import { AgentActionDialog } from './agent-action-dialog'

type TenantApi = ReturnType<typeof createApiClient>

// Runs a mutating action only after the human approves it in the dialog, and
// records the decision (approved/declined/error) to the agent-initiated audit
// log. This is the Phase 3 confirmation + audit gate.
async function gatedMutation(
  api: TenantApi,
  opts: {
    toolName: string
    title: string
    summary: string
    details?: Array<{ label: string; value: string }>
    confirmLabel?: string
    run: () => Promise<unknown>
  },
): Promise<unknown> {
  const approved = await requestAgentConfirmation({
    title: opts.title,
    summary: opts.summary,
    details: opts.details,
    confirmLabel: opts.confirmLabel,
  })
  if (!approved) {
    api.agentActions.log({ tool_name: opts.toolName, summary: opts.summary, confirmed: false, status: 'declined' }).catch(() => {})
    return { declined: true, message: 'The user declined this action — nothing was changed.' }
  }
  try {
    const result = await opts.run()
    api.agentActions.log({ tool_name: opts.toolName, summary: opts.summary, confirmed: true, status: 'ok' }).catch(() => {})
    return { success: true, ...(result as object) }
  } catch (e) {
    api.agentActions.log({ tool_name: opts.toolName, summary: opts.summary, confirmed: true, status: 'error' }).catch(() => {})
    throw e
  }
}

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

function buildTenantTools(token: string, role?: string): AgentToolDef[] {
  const api = createApiClient(token)

  const readOnly: AgentToolDef[] = [
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

  // Mutating tools are admin-only and gated by human confirmation + audit log.
  if (role !== 'admin') return readOnly

  const adminTools: AgentToolDef[] = [
    {
      name: 'list_audit_templates',
      title: 'List audit templates',
      description: 'List available compliance-audit templates (id + name) so an audit can be started with start_audit. Admin only.',
      annotations: { readOnlyHint: true },
      execute: async () => {
        const data = await api.audits.templates()
        return { templates: (data.templates ?? []).map((t: { id: string; name: string }) => ({ id: t.id, name: t.name })) }
      },
    },
    {
      name: 'create_knowledge_entry',
      title: 'Add a knowledge-base entry',
      description:
        "Add an approved question→answer entry to this care home's knowledge base so future queries can use it. Admin only. The user must confirm before it is saved.",
      inputSchema: {
        type: 'object',
        properties: {
          question: { type: 'string', description: 'The question staff might ask.' },
          answer: { type: 'string', description: 'The approved answer to store.' },
          category: { type: 'string', description: 'Optional knowledge category.' },
        },
        required: ['question', 'answer'],
      },
      annotations: { readOnlyHint: false },
      execute: async (input) => {
        const question = String((input as { question?: unknown }).question ?? '').trim()
        const answer = String((input as { answer?: unknown }).answer ?? '').trim()
        if (!question || !answer) return { error: 'Both question and answer are required.' }
        const category = (input as { category?: string }).category
        return gatedMutation(api, {
          toolName: 'create_knowledge_entry',
          title: 'Add a knowledge-base entry',
          summary: 'Add a new question & answer to your knowledge base.',
          details: [
            { label: 'Question', value: question },
            { label: 'Answer', value: answer.length > 300 ? answer.slice(0, 300) + '…' : answer },
          ],
          confirmLabel: 'Add entry',
          run: async () => {
            const entry = await api.knowledge.create({ question, answer, ...(category ? { knowledge_category: category } : {}) })
            return { created: { id: (entry as { id?: string })?.id ?? null, question } }
          },
        })
      },
    },
    {
      name: 'start_audit',
      title: 'Start a compliance audit',
      description:
        'Start a new monthly compliance-audit run from a template. Admin only. Call list_audit_templates first to get a template_id. The user must confirm before it starts.',
      inputSchema: {
        type: 'object',
        properties: {
          template_id: { type: 'string', description: 'Template id from list_audit_templates.' },
          audit_month: { type: 'string', description: 'Month to audit, e.g. "2026-06".' },
        },
        required: ['template_id', 'audit_month'],
      },
      annotations: { readOnlyHint: false },
      execute: async (input) => {
        const template_id = String((input as { template_id?: unknown }).template_id ?? '').trim()
        const audit_month = String((input as { audit_month?: unknown }).audit_month ?? '').trim()
        if (!template_id || !audit_month) return { error: 'template_id and audit_month are required.' }
        return gatedMutation(api, {
          toolName: 'start_audit',
          title: 'Start a compliance audit',
          summary: `Start a new compliance-audit run for ${audit_month}.`,
          details: [
            { label: 'Month', value: audit_month },
            { label: 'Template', value: template_id },
          ],
          confirmLabel: 'Start audit',
          run: async () => {
            const r = await api.audits.createRun({ template_id, audit_month })
            return { run: { id: (r as { run?: { id?: string } })?.run?.id ?? null, month: audit_month } }
          },
        })
      },
    },
  ]

  return [...readOnly, ...adminTools]
}

// Registers the authenticated tenant tools + renders the confirmation dialog for
// mutating actions. Feature-detects WebMCP and no-ops where unsupported.
// Re-registers if the access token or role changes.
export function TenantAgentTools() {
  const { data: session } = useSession()
  const token = (session as { accessToken?: string } | null)?.accessToken
  const role = (session?.user as { role?: string } | undefined)?.role

  useAgentTools(token ? buildTenantTools(token, role) : [], [token, role])
  return <AgentActionDialog />
}
