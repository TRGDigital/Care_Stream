import OpenAI from 'openai'

// §4.1.1 / §4.1.2 — text-embedding-3-small used for both ingestion and query.
// The same model and dimensions must be used in both phases so that similarity
// scores are comparable.
//
// Dimensions: 1536 (text-embedding-3-small default).
// Batch size: 100 — well within OpenAI's per-request limit.

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! })

export const EMBEDDING_MODEL      = 'text-embedding-3-small'
export const EMBEDDING_DIMENSIONS = 1536

const EMBED_BATCH_SIZE = 100

export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return []

  const results: number[][] = new Array(texts.length)

  for (let i = 0; i < texts.length; i += EMBED_BATCH_SIZE) {
    const batch    = texts.slice(i, i + EMBED_BATCH_SIZE)
    const response = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: batch,
    })

    // OpenAI preserves input order in response.data
    for (let j = 0; j < response.data.length; j++) {
      results[i + j] = response.data[j].embedding
    }
  }

  return results
}

export async function embedText(text: string): Promise<number[]> {
  const results = await embedTexts([text])
  return results[0]
}
