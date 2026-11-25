// The tool use loop. The model asks for tools, the tools run (read only, this account only), the results go back wrapped as DATA, and the model writes the answer.
// Every model call is metered (usage events) and the monthly AI allowance is checked first. Hard limits on rounds, tokens and time. Non streaming for now;
// the shape (one function returning the answer) is what a streaming route would call, with onText added later.
import { withDeadEndFallback } from './dead-end'
import Anthropic from '@anthropic-ai/sdk'
import { recordUsage, withAiFeature } from '../../lib/token-usage'
import { checkAiTokenLimit } from '../../lib/ai-tokens'
import { writeAuditLog } from '../../lib/audit'
import { AGENTS, agentById, type AgentDef } from './agents'
import { buildSystemPrompt, pageContextLine } from './prompt-register'
import { TOOLS, toolByName, type ToolContext } from './tools'
import { toolAllowed, MANAGER_LINE } from './manager-access'
import { wrapToolResult } from './safety'
import { withNextStepsReminder } from './house-rules-forms'
/** The tools that save a document draft, and what kind of document each makes. */
export const DRAFT_TOOL_TYPE: Record<string, string> = { save_letter_draft: 'letter', save_newsletter_draft: 'newsletter', save_report_draft: 'report' }
import { dedupeSources, type AskSource } from './sources'
import { type ResolvedContext } from './page-context'

export const MAX_ROUNDS = 6
export const MAX_TOKENS_PER_CALL = 2200
export const MAX_RUN_MS = 70_000
const MODEL = () => process.env.ASK_MODEL ?? process.env.CLAUDE_MODEL ?? 'claude-sonnet-4-5'

export interface RunDeps {
  client?: Pick<Anthropic, 'messages'>
  checkLimit?: (tenantId: string) => Promise<void>
  record?: (model: string, usage: any) => void
  audit?: (o: Parameters<typeof writeAuditLog>[0]) => void
  now?: () => number
}
export interface HistoryMessage { role: 'user' | 'assistant'; content: string }
export interface RunResult { answer: string; sources: AskSource[]; tools_used: string[]; rounds: number; stopped: 'done' | 'rounds' | 'time' | 'length'; proposals: string[]; /** Drafts the agent saved in this turn: the chat shows each as its DESIGNED version, not as plain text. */ documents: Array<{ id: string; type: string }> }

let shared: Anthropic | null = null
const clientOf = () => (shared ??= new Anthropic())

export function toolDefsFor(agent: AgentDef, ctx?: Pick<ToolContext, 'role' | 'moneyOk'>): Anthropic.Messages.Tool[] {
  return agent.tools.filter(n => toolAllowed(ctx?.role, ctx?.moneyOk ?? true, n)).map(n => toolByName(n)).filter(Boolean).map(t => ({ name: t!.name, description: t!.description, input_schema: t!.input_schema as any }))
}

export async function runAgent(o: { agentId: string; ctx: ToolContext; orgName: string; history: HistoryMessage[]; message: string; pageContext?: ResolvedContext | null; conversationId?: string | null }, deps: RunDeps = {}): Promise<RunResult> {
  const agent = agentById(o.agentId)
  if (!agent || agent.status !== 'ready') throw new Error('That agent is not available yet.')
  const client = deps.client ?? clientOf(), now = deps.now ?? Date.now
  await (deps.checkLimit ?? checkAiTokenLimit)(o.ctx.tenantId)
  const started = now()
  // The prompts are editable on the Platform Prompts page (cached, with the code wording as the fallback); the locked safety rules are always added last.
  const system = await buildSystemPrompt(agent, o.ctx.today, o.orgName, (await pageContextLine(o.pageContext)) + (o.ctx.role === 'manager' ? MANAGER_LINE : ''))
  const tools = toolDefsFor(agent, o.ctx)
  const msgs: Anthropic.Messages.MessageParam[] = [...o.history.slice(-10).map(m => ({ role: m.role, content: m.content })), { role: 'user', content: o.message.slice(0, 4000) }]
  const proposals: string[] = []
  const documents: Array<{ id: string; type: string }> = []
  const ctx: ToolContext = { ...o.ctx, conversationId: o.conversationId ?? o.ctx.conversationId ?? null, collectProposal: (id: string) => { if (!proposals.includes(id)) proposals.push(id) } }
  const used: string[] = []; let sources: AskSource[] = []; let answer = ''; let rounds = 0; let stopped = 'done' as RunResult['stopped']

  const exec = async () => {
    for (; rounds < MAX_ROUNDS; ) {
      if (now() - started > MAX_RUN_MS) { stopped = 'time'; break }
      rounds++
      const res = await client.messages.create({ model: MODEL(), max_tokens: MAX_TOKENS_PER_CALL, temperature: 0.2, system, tools: tools.length ? tools : undefined, messages: msgs })
      ;(deps.record ?? recordUsage)(MODEL(), res.usage)
      const calls = res.content.filter((b): b is Anthropic.Messages.ToolUseBlock => b.type === 'tool_use')
      const text = res.content.filter((b): b is Anthropic.Messages.TextBlock => b.type === 'text').map(b => b.text).join('\n').trim()
      if (!calls.length || res.stop_reason !== 'tool_use') { answer = text; if (res.stop_reason === 'max_tokens') stopped = 'length'; return }
      msgs.push({ role: 'assistant', content: res.content })
      const results: Anthropic.Messages.ToolResultBlockParam[] = []
      for (const c of calls) {
        used.push(c.name)
        const tool = agent.tools.includes(c.name) && toolAllowed(ctx.role, ctx.moneyOk ?? true, c.name) ? toolByName(c.name) : undefined   // an agent can only call ITS tools
        if (!tool) { results.push({ type: 'tool_result', tool_use_id: c.id, content: wrapToolResult(c.name, { error: 'That tool is not available.' }), is_error: true }); continue }
        try {
          const r = await tool.run(ctx, c.input ?? {})
          sources = sources.concat(r.sources)
          const dt = DRAFT_TOOL_TYPE[c.name]; const did = (r.data as any)?.document_id
          if (dt && (r.data as any)?.saved === true && typeof did === 'string' && !documents.some(d => d.id === did)) documents.push({ id: did, type: dt })
          results.push({ type: 'tool_result', tool_use_id: c.id, content: wrapToolResult(c.name, { data: withNextStepsReminder(c.name, r.data), method: r.method ?? null, sources: r.sources.map(s => ({ label: s.label, as_of: s.as_of, warning: s.warning ?? null })) }) })
        } catch (e: any) {
          results.push({ type: 'tool_result', tool_use_id: c.id, content: wrapToolResult(c.name, { error: 'The data could not be read just now.' }), is_error: true })
        }
      }
      msgs.push({ role: 'user', content: results })
    }
    stopped = 'rounds'
  }
  await withAiFeature('ask_carestream', exec)
  if (!answer) answer = stopped === 'time' ? 'That took too long to work out. Please try a narrower question.' : 'I could not finish working that out. Please try asking it a little differently, or break it into smaller questions.'
  if (stopped === 'done') answer = withDeadEndFallback(answer, { agentId: agent.id, drafts: documents.length, saveTools: agent.tools.filter(t => t in DRAFT_TOOL_TYPE) }).text   // never leave a choice written in words with nothing to click (house rules 1, 2 and 7)
  ;(deps.audit ?? writeAuditLog)({ tenant_id: o.ctx.tenantId, user_id: o.ctx.userId, event_type: 'ask_run', entity_type: 'ask_conversation', entity_id: agent.id, metadata: { agent: agent.id, tools: [...new Set(used)], rounds } })
  return { answer, sources: dedupeSources(sources), tools_used: [...new Set(used)], rounds, stopped, proposals, documents }
}
export { AGENTS, TOOLS }
