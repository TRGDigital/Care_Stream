import Anthropic from '@anthropic-ai/sdk'
import { recordUsage } from '../../lib/token-usage'

// §4.3 — Claude API client.
// Model: claude-sonnet-4-5 (configurable via CLAUDE_MODEL env var).
// Temperature 0 for full-policy Prompt B (deterministic formatting).
// Temperature 0.3 for Prompt A (allows natural phrasing variation).

const client = new Anthropic()

const MODEL = process.env.CLAUDE_MODEL ?? 'claude-sonnet-4-5'

// Applied to every system prompt: this is a UK care product, so all generated content must
// use British English. Translations use a separate client and are unaffected.
const BRITISH_ENGLISH = 'Always write in British English. Use British spelling and terminology throughout (e.g. authorise, organise, recognise, prioritise, minimise, colour, behaviour, centre, licence, enrolment, fulfil, programme, practising, whilst). Never use American spellings such as authorize, organize, color, behavior, center, license, enrollment.'
const withBritishEnglish = (systemPrompt: string) => `${BRITISH_ENGLISH}\n\n${systemPrompt}`

export interface ClaudeOptions {
  maxTokens?:  number
  temperature?: number
  model?:      string
}

export async function callClaude(
  systemPrompt: string,
  userMessage:  string,
  options?:     ClaudeOptions,
): Promise<string> {
  const model = options?.model ?? MODEL
  const response = await client.messages.create({
    model,
    max_tokens: options?.maxTokens  ?? 4096,
    ...(options?.temperature !== undefined ? { temperature: options.temperature } : {}),
    system:     withBritishEnglish(systemPrompt),
    messages:   [{ role: 'user', content: userMessage }],
  })

  recordUsage(model, response.usage)

  const block = response.content[0]
  if (!block || block.type !== 'text') {
    throw new Error('Claude returned no text content')
  }

  return block.text
}

// Streaming variant — emits text deltas via onText as they arrive, and resolves with the
// full text once complete. Used by the chat to stream the answer paragraph by paragraph.
export async function callClaudeStream(
  systemPrompt: string,
  messages:     Anthropic.Messages.MessageParam[],
  options:      ClaudeOptions | undefined,
  onText:       (delta: string) => void,
): Promise<string> {
  const model = options?.model ?? MODEL
  const stream = client.messages.stream({
    model,
    max_tokens: options?.maxTokens ?? 4096,
    ...(options?.temperature !== undefined ? { temperature: options.temperature } : {}),
    system:   withBritishEnglish(systemPrompt),
    messages,
  })
  stream.on('text', (delta) => onText(delta))
  const final = await stream.finalMessage()
  recordUsage(model, final.usage)
  const block = final.content[0]
  if (!block || block.type !== 'text') throw new Error('Claude returned no text content')
  return block.text
}

// §8.2 — Multi-turn variant for email conversation threads.
// Accepts a full messages array so prior turns are visible to Claude.
export async function callClaudeWithHistory(
  systemPrompt: string,
  messages:     Anthropic.Messages.MessageParam[],
  options?:     ClaudeOptions,
): Promise<string> {
  const response = await client.messages.create({
    model:      MODEL,
    max_tokens: options?.maxTokens  ?? 4096,
    ...(options?.temperature !== undefined ? { temperature: options.temperature } : {}),
    system:     withBritishEnglish(systemPrompt),
    messages,
  })

  recordUsage(MODEL, response.usage)

  const block = response.content[0]
  if (!block || block.type !== 'text') {
    throw new Error('Claude returned no text content')
  }

  return block.text
}
