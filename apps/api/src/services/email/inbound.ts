// §8.1 — SendGrid Inbound Parse handler
// 1. Authenticate sender against tenant staff list
// 2. Detect thread via In-Reply-To / References / Message-ID headers
// 3. Strip quoted replies (email-reply-parser)
// 4. Load or create email_sessions record
// 5. Invoke RAG pipeline with full conversation history
// 6. Send reply via outbound.ts preserving thread headers
export async function handleInboundEmail(_payload: unknown): Promise<void> {
  throw new Error('Not implemented')
}
