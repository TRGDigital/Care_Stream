// Speech to text and translation for family video messages (a decision aid for the manager, see the spec addendum).
//
// Amazon Transcribe and Amazon Translate in London (eu-west-2), the same cloud, region and credentials as the private storage
// (services/storage/s3.ts), so the data stays in the UK region. Transcribe reads the processed MP4 straight from the private bucket
// (s3://BUCKET/KEY); no output bucket is asked for, the transcript comes back through the short-lived link Transcribe returns.
//
// IAM actions the API login needs: transcribe:StartTranscriptionJob, transcribe:GetTranscriptionJob, transcribe:DeleteTranscriptionJob,
// translate:TranslateText (plus the s3:GetObject it already has on the bucket).
//
// Everything is behind the SpeechProvider interface so tests can swap it (setSpeechProvider). Nothing here logs a link, a transcript or a key.

import {
  TranscribeClient, StartTranscriptionJobCommand, GetTranscriptionJobCommand, DeleteTranscriptionJobCommand,
} from '@aws-sdk/client-transcribe'
import { TranslateClient, TranslateTextCommand } from '@aws-sdk/client-translate'

/** Access was refused (or the service is not switched on for this login). The caller shows "Translation is not switched on yet". */
export class SpeechNotAvailable extends Error {
  constructor(message = 'Translation is not switched on yet') { super(message); this.name = 'SpeechNotAvailable' }
}

export type JobStatus = 'IN_PROGRESS' | 'QUEUED' | 'COMPLETED' | 'FAILED'
export interface JobInfo { status: JobStatus; languageCode: string | null; transcriptUri: string | null }

export interface SpeechProvider {
  /** True when the real service can be used here (a bucket and credentials are configured). */
  configured(): boolean
  startJob(jobName: string, s3Key: string): Promise<void>
  getJob(jobName: string): Promise<JobInfo>
  /** Downloads the transcript JSON from the short-lived link Transcribe returned. */
  fetchTranscript(uri: string): Promise<unknown>
  deleteJob(jobName: string): Promise<void>
  /** English translation of text written in the given Translate language code. */
  translateToEnglish(text: string, sourceLang: string): Promise<string>
}

// ─── Languages ─────────────────────────────────────────────────────────────────
// Common UK community languages plus English. Welsh is not supported by Transcribe, so it is not listed.
export const LANGUAGE_OPTIONS = [
  'en-GB', 'en-US', 'ar-SA', 'ar-AE', 'bn-IN', 'zh-CN', 'fr-FR', 'gu-IN', 'hi-IN', 'it-IT',
  'pl-PL', 'pt-PT', 'pt-BR', 'pa-IN', 'ro-RO', 'es-ES', 'es-US', 'ta-IN', 'ur-PK',
]

const NAMES: Record<string, string> = {
  en: 'English', ar: 'Arabic', bn: 'Bengali', zh: 'Chinese', fr: 'French', gu: 'Gujarati', hi: 'Hindi', it: 'Italian', pl: 'Polish',
  pt: 'Portuguese', pa: 'Punjabi', ro: 'Romanian', es: 'Spanish', ta: 'Tamil', ur: 'Urdu',
}

/** The first part of a language code, lower case: "hi-IN" gives "hi". */
const base = (code: string) => String(code || '').trim().toLowerCase().split(/[-_]/)[0]

export const isEnglish = (code: string | null | undefined) => base(code ?? '') === 'en'

/** Plain name for a Transcribe language code ("pa-IN" gives "Punjabi"). Unknown codes come back as the code itself. */
export function languageName(code: string | null | undefined): string | null {
  if (!code) return null
  return NAMES[base(code)] ?? String(code)
}

// Languages Amazon Translate can turn into English, by their Translate code.
const TRANSLATE_SUPPORTED = new Set(['ar', 'bn', 'zh', 'fr', 'gu', 'hi', 'it', 'pl', 'pt', 'pa', 'ro', 'es', 'ta', 'ur'])

/** Transcribe code (hi-IN, pa-IN, pt-PT, zh-CN) to the Translate code (hi, pa, pt-PT, zh), or null when Translate cannot do that language. */
export function translateCodeFor(code: string | null | undefined): string | null {
  if (!code) return null
  const b = base(code)
  if (!TRANSLATE_SUPPORTED.has(b)) return null
  if (b === 'pt' && /^pt[-_]pt$/i.test(code)) return 'pt-PT'
  return b
}

/** The words from a Transcribe result (the JSON of the transcript file). Empty string when nobody spoke. */
export function extractTranscriptText(result: unknown): string {
  const r: any = result
  const parts: unknown[] = Array.isArray(r?.results?.transcripts) ? r.results.transcripts : []
  const text = parts.map((p: any) => (typeof p?.transcript === 'string' ? p.transcript : '')).join(' ')
  return text.replace(/\s+/g, ' ').trim()
}

/** Splits text at sentence ends into pieces Translate accepts (it takes about 10,000 bytes a call). */
export function chunkForTranslate(text: string, max = 3000): string[] {
  const out: string[] = []
  let cur = ''
  for (const s of text.split(/(?<=[.!?。！？।۔])\s+/)) {
    if (s.length > max) {
      if (cur) { out.push(cur); cur = '' }
      for (let i = 0; i < s.length; i += max) out.push(s.slice(i, i + max))
      continue
    }
    if (cur && cur.length + s.length + 1 > max) { out.push(cur); cur = s } else cur = cur ? `${cur} ${s}` : s
  }
  if (cur) out.push(cur)
  return out
}

// ─── Errors ────────────────────────────────────────────────────────────────────
const DENIED = new Set([
  'AccessDeniedException', 'AccessDenied', 'UnrecognizedClientException', 'InvalidSignatureException', 'ExpiredTokenException',
  'UnauthorizedOperation', 'NotAuthorizedException', 'MissingAuthenticationToken', 'SubscriptionRequiredException', 'OptInRequired',
])
export function isAccessDenied(e: any): boolean {
  return DENIED.has(e?.name) || DENIED.has(e?.Code) || DENIED.has(e?.code) || e?.$metadata?.httpStatusCode === 403
}
function wrap(e: any): never {
  if (isAccessDenied(e)) throw new SpeechNotAvailable()
  throw e
}

// ─── The AWS provider ──────────────────────────────────────────────────────────
const region = () => process.env.AWS_REGION ?? 'eu-west-2'
const credentials = () => ({ accessKeyId: process.env.AWS_ACCESS_KEY_ID!, secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY! })

let _tr: TranscribeClient | null = null
let _tl: TranslateClient | null = null
const transcribe = () => (_tr ??= new TranscribeClient({ region: region(), credentials: credentials() }))
const translate = () => (_tl ??= new TranslateClient({ region: region(), credentials: credentials() }))

const awsProvider: SpeechProvider = {
  configured: () => !!process.env.S3_BUCKET && !!process.env.AWS_ACCESS_KEY_ID,
  async startJob(jobName, s3Key) {
    try {
      await transcribe().send(new StartTranscriptionJobCommand({
        TranscriptionJobName: jobName,
        Media: { MediaFileUri: `s3://${process.env.S3_BUCKET}/${s3Key}` },
        MediaFormat: 'mp4',
        IdentifyLanguage: true,
        LanguageOptions: LANGUAGE_OPTIONS as any,
      }))
    } catch (e) { wrap(e) }
  },
  async getJob(jobName) {
    try {
      const r = await transcribe().send(new GetTranscriptionJobCommand({ TranscriptionJobName: jobName }))
      const j = r.TranscriptionJob
      const status = (j?.TranscriptionJobStatus as JobStatus | undefined) ?? 'IN_PROGRESS'
      return { status, languageCode: (j?.LanguageCode as string | undefined) ?? null, transcriptUri: j?.Transcript?.TranscriptFileUri ?? null }
    } catch (e) { return wrap(e) }
  },
  async fetchTranscript(uri) {
    const res = await fetch(uri)
    if (!res.ok) throw new Error(`transcript download failed (${res.status})`)   // never include the link
    return res.json()
  },
  async deleteJob(jobName) {
    try { await transcribe().send(new DeleteTranscriptionJobCommand({ TranscriptionJobName: jobName })) } catch (e: any) {
      if (e?.name === 'BadRequestException' || e?.name === 'NotFoundException') return   // already gone
      wrap(e)
    }
  },
  async translateToEnglish(text, sourceLang) {
    const pieces: string[] = []
    try {
      for (const p of chunkForTranslate(text)) {
        const r = await translate().send(new TranslateTextCommand({ Text: p, SourceLanguageCode: sourceLang, TargetLanguageCode: 'en' }))
        pieces.push(r.TranslatedText ?? '')
      }
    } catch (e) { wrap(e) }
    return pieces.join(' ').trim()
  },
}

let provider: SpeechProvider = awsProvider
/** The service in use. Tests swap it for a stand-in so no AWS call is made. */
export const speech = (): SpeechProvider => provider
export function setSpeechProvider(p: SpeechProvider | null): void { provider = p ?? awsProvider }
