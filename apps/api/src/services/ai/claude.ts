import Anthropic from '@anthropic-ai/sdk'

// §4.3 — Claude API client
// Model: claude-sonnet-4-5 (upgradeable to claude-opus-4 for premium tiers)
// Prompt A: summary/question | Prompt B: full policy formatter
const client = new Anthropic()

export async function callClaude(_systemPrompt: string, _userMessage: string): Promise<string> {
  throw new Error('Not implemented')
}
