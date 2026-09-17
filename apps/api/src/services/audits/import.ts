// Turn a home's existing audit (a PDF, Word document, text file or a photo of a paper form) into a
// draft CareStream audit. The draft is returned for review in the builder, never saved directly.
//
// PDFs and photos go to Claude as documents and images, so scanned and handwritten forms work; Word and
// text files are read as text. Claude returns JSON in the builder's shape, which is then checked by the
// same parser the builder uses, so an import can never produce an audit the builder could not.

import Anthropic from '@anthropic-ai/sdk'
import sharp from 'sharp'
import { prisma } from '../../db/client'
import { recordUsage, withAiFeature } from '../../lib/token-usage'
import { extractText } from '../rag/extractor'
import { parseEditorPayload, type EditorPayload } from './template-editor'

const client = new Anthropic()
const MODEL = process.env.CLAUDE_MODEL ?? 'claude-sonnet-4-5'

export const IMPORT_TYPES: Record<string, 'pdf' | 'docx' | 'odt' | 'text' | 'image'> = {
  'application/pdf': 'pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.oasis.opendocument.text': 'odt',
  'text/plain': 'text',
  'image/jpeg': 'image', 'image/png': 'image', 'image/webp': 'image', 'image/gif': 'image',
}

const SYSTEM = `You turn a UK care home's existing audit or checklist into a structured audit for CareStream.
Always write in British English. Never use em dashes or en dashes.

Return ONLY a JSON object, no commentary and no code fences, in exactly this shape:
{
  "name": "short audit name",
  "description": "one sentence on what it covers",
  "frequency": "daily" | "weekly" | "monthly" | "quarterly" | "periodic",
  "subject_scope": "none" | "room" | "resident" | "staff",
  "sections": [
    { "title": "section title", "questions": [
      { "key": "q1 (unique across the whole audit)", "text": "the question as written", "type": "...", "settings": { ... } or null,
        "show_if": { "key": "q0", "equals": ["yes"] } or null, "quality_statement": "exact name from the list" or null }
    ] }
  ],
  "notes": "anything the reviewer should check, for example parts that were hard to read" or null
}

Question types:
- "yes_no_na": a check that is done or not, or does not apply. Use for most tick boxes.
- "yes_no": only when not applicable is impossible.
- "number": a reading or count. settings: { "unit": "°C", "min": 2, "max": 8 } using the range or limit on the form; leave min or max out when there is none.
- "date": a date to record.
- "choice": pick one of fixed options. settings: { "options": [{ "label": "...", "fail": false }] }; set "fail": true on options that show a problem.
- "multi_choice": tick all that apply. Same settings as choice.
- "rating": a scale. settings: { "max_rating": 5, "pass_min": 3 } when a pass mark is clear, otherwise only max_rating.
- "findings": free text findings or comments with actions.
- "free_text": free text with no actions (for example the name of someone spoken to).

Rules:
- Keep every question from the document, in order, with its wording (fix only obvious spelling mistakes). Do not invent questions.
- Use the document's own sections; if it has none, group into a few sensible sections.
- Add show_if only when the form clearly says a question applies only after a particular answer (for example "if no, state why"). equals uses "yes", "no" or "na" for yes/no questions, or option labels for choice questions. The target key must be an earlier question.
- subject_scope: "room" for room-by-room checks, "resident" for one resident at a time, "staff" for one staff member at a time, otherwise "none".
- quality_statement: the single best matching CQC quality statement name from the list below, or null when none fits well.

CQC quality statements:
`

function parseJson(text: string): any {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '')
  const start = cleaned.indexOf('{'), end = cleaned.lastIndexOf('}')
  if (start < 0 || end <= start) throw new Error('The document could not be turned into an audit. Try a clearer photo or a different file.')
  return JSON.parse(cleaned.slice(start, end + 1))
}

export async function draftAuditFromFile(file: { buffer: Buffer; mimetype: string; originalname: string }): Promise<{ draft: EditorPayload & { description?: string | null }; notes: string | null; question_count: number }> {
  const kind = IMPORT_TYPES[file.mimetype] ?? (/\.docx$/i.test(file.originalname) ? 'docx' : /\.pdf$/i.test(file.originalname) ? 'pdf' : /\.txt$/i.test(file.originalname) ? 'text' : null)
  if (!kind) throw new Error('Upload a PDF, Word document, text file or a photo of the audit.')

  const statements = await (prisma as any).qualityStatement.findMany({ where: { is_active: true }, select: { id: true, name: true, key_question: true }, orderBy: [{ key_question: 'asc' }, { number: 'asc' }] }).catch(() => [])
  const system = SYSTEM + (statements as any[]).map(s => `- ${s.name} (${s.key_question})`).join('\n')

  const content: any[] = []
  if (kind === 'pdf') {
    content.push({ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: file.buffer.toString('base64') } })
  } else if (kind === 'image') {
    // Normalise orientation and size to a JPEG the model accepts.
    const jpeg = await sharp(file.buffer).rotate().resize({ width: 2000, height: 2000, fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 85 }).toBuffer()
    content.push({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: jpeg.toString('base64') } })
  } else {
    const mime = kind === 'docx' ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' : kind === 'odt' ? 'application/vnd.oasis.opendocument.text' : 'text/plain'
    const text = (await extractText(file.buffer, mime as any)).trim()
    if (text.length < 40) throw new Error('No text could be read from that document. Try a PDF or a photo of the audit instead.')
    content.push({ type: 'text', text: `The audit document:\n\n${text.slice(0, 60000)}` })
  }
  content.push({ type: 'text', text: 'Convert this audit into the JSON described.' })

  const reply = await withAiFeature('audit_import', async () => {
    const response = await client.messages.create({ model: MODEL, max_tokens: 12000, temperature: 0, system, messages: [{ role: 'user', content }] })
    recordUsage(MODEL, response.usage)
    if (response.stop_reason === 'max_tokens') throw new Error('That audit is too long to import in one go. Try splitting it into smaller files.')
    const block = response.content.find((b: any) => b.type === 'text') as any
    if (!block) throw new Error('No reply from the AI.')
    return block.text as string
  })

  return buildDraftFromReply(reply, statements as any[])
}

// Claude's reply to a checked draft: unique keys, conditions resolved, CQC names matched, and the builder's
// own validation. Separate from the call so it can be tested without the API.
export function buildDraftFromReply(reply: string, statements: Array<{ id: string; name: string }>) {
  const raw = parseJson(reply)
  const byName = new Map<string, string>((statements as any[]).map(s => [String(s.name).toLowerCase(), s.id]))
  // Keys must be unique across the audit; a condition points at the nearest earlier question with its key.
  const latest = new Map<string, string>()
  const used = new Set<string>()
  let n = 0
  const uniqueKey = (original: string) => {
    let k = original, i = 1
    while (used.has(k)) k = `${original}-${++i}`
    used.add(k); latest.set(original, k)
    return k
  }
  const body = {
    name: raw.name,
    description: raw.description ?? null,
    frequency: raw.frequency,
    subject_scope: raw.subject_scope,
    sections: (Array.isArray(raw.sections) ? raw.sections : []).map((s: any) => ({
      title: s?.title,
      questions: (Array.isArray(s?.questions) ? s.questions : []).map((q: any) => {
        const cond = q?.show_if?.key && latest.has(String(q.show_if.key)) ? { key: latest.get(String(q.show_if.key))!, equals: q.show_if.equals } : null
        return {
          key: uniqueKey(String(q?.key ?? `import-${n++}`)), text: q?.text, type: q?.type, settings: q?.settings ?? null, show_if: cond,
          quality_statement_id: q?.quality_statement ? (byName.get(String(q.quality_statement).toLowerCase()) ?? null) : null,
        }
      }),
    })),
  }
  const parsed = parseEditorPayload(body, { requireName: true })
  if ('error' in parsed) throw new Error(`The imported audit needs a manual fix: ${parsed.error}.`)
  return {
    draft: parsed.payload,
    notes: typeof raw.notes === 'string' && raw.notes.trim() ? raw.notes.trim() : null,
    question_count: parsed.payload.sections.reduce((n, s) => n + s.questions.length, 0),
  }
}
