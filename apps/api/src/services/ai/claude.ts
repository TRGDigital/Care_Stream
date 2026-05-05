import Anthropic from '@anthropic-ai/sdk'

// §4.3 — Claude API client.
// Model: claude-sonnet-4-5 (configurable via CLAUDE_MODEL env var).
// Temperature 0 for full-policy Prompt B (deterministic formatting).
// Temperature 0.3 for Prompt A (allows natural phrasing variation).

const client = new Anthropic()

const MODEL = process.env.CLAUDE_MODEL ?? 'claude-sonnet-4-5'

export interface ClaudeOptions {
  maxTokens?:  number
  temperature?: number
}

export async function callClaude(
  systemPrompt: string,
  userMessage:  string,
  options?:     ClaudeOptions,
): Promise<string> {
  const response = await client.messages.create({
    model:      MODEL,
    max_tokens: options?.maxTokens  ?? 4096,
    ...(options?.temperature !== undefined ? { temperature: options.temperature } : {}),
    system:     systemPrompt,
    messages:   [{ role: 'user', content: userMessage }],
  })

  const block = response.content[0]
  if (!block || block.type !== 'text') {
    throw new Error('Claude returned no text content')
  }

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
    system:     systemPrompt,
    messages,
  })

  const block = response.content[0]
  if (!block || block.type !== 'text') {
    throw new Error('Claude returned no text content')
  }

  return block.text
}
