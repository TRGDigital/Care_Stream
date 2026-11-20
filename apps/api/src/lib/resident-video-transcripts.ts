// "This is me" video messages: what is said, for the manager's approval (spec addendum, speech to text and translation).
//
// A family video can be spoken in a language the manager does not speak. After a family clip is ready, a speech to text job is started
// (services/speech/transcribe.ts). Nothing runs in the background: whenever the manager's screen asks about a pending transcript, the
// check happens then (refreshTranscript), the text is saved, translated into English when needed, and the job is deleted so the cloud
// service keeps nothing.
//
// The words are a decision aid. They are machine generated and labelled as such. Only managers see them, unless a manager switches on
// "Show the English text to staff" for one video, in which case the play route returns the English text with the video (and only for an
// approved clip). They are never used by the assistant, for search, or for anything else, and they are deleted with the video in every case
// (removeVideoFiles in resident-videos.ts calls removeTranscriptFor).
//
// Everything tolerates the table not existing yet (the SQL is run by the owner after the code ships) and access being refused
// (state not_available, "Translation is not switched on yet"). Approving or rejecting never waits for any of this.

import { prisma } from '../db/client'
import { cleanText } from './residents'
import { speech, SpeechNotAvailable, isEnglish, languageName, translateCodeFor, extractTranscriptText } from '../services/speech/transcribe'

const db = prisma as any

export type TranscriptState = 'pending' | 'ready' | 'no_speech' | 'failed' | 'not_available'
export const TEXT_MAX = 20000
export const EDIT_MAX = 10000
const NO_JOB_STUCK_MS = 3 * 60 * 1000       // claimed for finishing but never completed
const JOB_STUCK_MS = 20 * 60 * 1000         // a job that never finished

export const NOT_ON_MESSAGE = 'Translation is not switched on yet'
export const MACHINE_LABEL = 'Machine generated. Check anything important with someone who speaks the language.'
export const STAFF_LABEL = 'English translation, machine generated and checked by a manager'

/** True when the transcripts table exists (the SQL may not have been run yet). */
export async function transcriptsReady(): Promise<boolean> {
  try { await db.residentVideoTranscript.findFirst({ select: { id: true } }); return true } catch { return false }
}

const MESSAGES: Record<string, string> = {
  pending: 'Reading the speech in this video',
  no_speech: 'No speech found in this video',
  failed: 'Could not read the speech in this video',
  not_available: NOT_ON_MESSAGE,
}

/** The English text a manager has settled on: their edit if there is one, else the machine translation. */
export const effectiveTranslation = (t: any): string | null => (t?.edited_translation_text?.trim() ? t.edited_translation_text : (t?.translation_text?.trim() ? t.translation_text : null))

/** Manager view of a transcript. Text is only here for managers (the staff view is staffTranslationFor). */
export function adminTranscriptDto(t: any) {
  const english = isEnglish(t.language_code)
  const translation = effectiveTranslation(t)
  let message: string | null = MESSAGES[t.state] ?? null
  if (t.state === 'ready') {
    if (english) message = 'Spoken in English'
    else if (!translation) message = t.error === 'translate_denied' ? `${NOT_ON_MESSAGE}. The original text is shown.` : 'Translation is not available for this language. The original text is shown.'
    else message = null
  }
  return {
    state: t.state as TranscriptState, message, machine_generated: true, label: MACHINE_LABEL,
    language_code: t.language_code ?? null, language_name: t.language_name ?? languageName(t.language_code),
    original_text: t.state === 'ready' ? (t.original_text ?? '') : null,
    machine_translation: t.state === 'ready' ? (t.translation_text ?? null) : null,
    translation: t.state === 'ready' && !english ? translation : null,   // what a manager would read, edited if edited
    edited: !!t.edited_translation_text, edited_by: t.edited_by ?? null,
    show_to_staff: !!t.show_to_staff && t.state === 'ready' && !!translation && !english,
    can_share_with_staff: t.state === 'ready' && !english && !!translation,
    updated_at: t.updated_at ? new Date(t.updated_at).toISOString() : null,
  }
}

/** The state shown when the table does not exist yet or nothing was ever asked. */
export const notAvailableDto = () => adminTranscriptDto({ state: 'not_available' })

/** Transcripts for a set of videos, keyed by video id. Missing table = empty. */
export async function transcriptsFor(tenantId: string, videoIds: string[]): Promise<Map<string, any>> {
  const m = new Map<string, any>()
  if (!videoIds.length) return m
  try {
    const rows: any[] = await db.residentVideoTranscript.findMany({ where: { tenant_id: tenantId, video_id: { in: videoIds } } })
    for (const r of rows) m.set(r.video_id, r)
  } catch { /* transcripts table not created yet */ }
  return m
}

export async function transcriptFor(tenantId: string, videoId: string): Promise<any | null> {
  try { return (await db.residentVideoTranscript.findFirst({ where: { tenant_id: tenantId, video_id: videoId } })) ?? null } catch { return null }
}

const deleteJobQuietly = async (name: string | null | undefined) => { if (name) { try { await speech().deleteJob(name) } catch { /* nothing to keep, nothing to report */ } } }

// ─── Start ─────────────────────────────────────────────────────────────────────
/**
 * Starts a speech job for a ready clip. Returns the row (null when the table is missing or the clip has no file). Quick: it only starts
 * the job. A clip that already has a pending or finished transcript is left alone (a failed, empty or unavailable one can be run again).
 * Never throws: the caller is an upload or a button and neither may fail because of this.
 */
export async function startTranscript(v: any): Promise<any | null> {
  try {
    if (!v?.s3_key || v.state !== 'ready' || !(await transcriptsReady())) return null
    let row = await db.residentVideoTranscript.findFirst({ where: { video_id: v.id } })
    if (row) {
      if (row.state === 'ready') return row
      if (row.state === 'pending') {
        const stale = Date.now() - new Date(row.updated_at).getTime() > JOB_STUCK_MS
        if (!stale) return row
      }
      await deleteJobQuietly(row.job_name)
    }
    const blank = { state: 'pending', language_code: null, language_name: null, original_text: null, translation_text: null, edited_translation_text: null, edited_by: null, show_to_staff: false, job_name: null, error: null }
    if (row) row = await db.residentVideoTranscript.update({ where: { id: row.id }, data: blank })
    else {
      try { row = await db.residentVideoTranscript.create({ data: { tenant_id: v.tenant_id, resident_id: v.resident_id, video_id: v.id, ...blank } }) }
      catch { row = await db.residentVideoTranscript.findFirst({ where: { video_id: v.id } }); if (!row) return null }   // two starts at once
    }
    const set = (data: Record<string, unknown>) => db.residentVideoTranscript.update({ where: { id: row.id }, data })
    if (!speech().configured()) return await set({ state: 'not_available', error: null })
    const jobName = `carestream-rv-${row.id}-${Date.now().toString(36)}`
    try {
      await speech().startJob(jobName, v.s3_key)
      return await set({ job_name: jobName })
    } catch (e: any) {
      if (e instanceof SpeechNotAvailable) return await set({ state: 'not_available', error: null })
      console.error('[resident-video-transcript] could not start:', e?.name ?? 'error')   // no text, no links
      return await set({ state: 'failed', error: 'start_failed' })
    }
  } catch (e: any) {
    console.error('[resident-video-transcript] start failed:', e?.name ?? 'error')
    return null
  }
}

// ─── Check a pending transcript ────────────────────────────────────────────────
/** When the manager's screen loads a pending transcript: ask the service, and on completion save the text and translation. */
export async function refreshTranscript(t: any): Promise<any> {
  if (!t || t.state !== 'pending') return t
  const set = (data: Record<string, unknown>) => db.residentVideoTranscript.update({ where: { id: t.id }, data })
  const age = Date.now() - new Date(t.updated_at).getTime()
  try {
    if (!t.job_name) return age > NO_JOB_STUCK_MS ? await set({ state: 'failed', error: 'stuck' }) : t
    const name: string = t.job_name
    if (age > JOB_STUCK_MS) { await deleteJobQuietly(name); return await set({ state: 'failed', error: 'timed_out', job_name: null }) }
    let info
    try { info = await speech().getJob(name) } catch (e: any) {
      if (e instanceof SpeechNotAvailable) return await set({ state: 'not_available', job_name: null })
      return t   // a passing problem: stay pending and look again next time
    }
    if (info.status === 'IN_PROGRESS' || info.status === 'QUEUED') return t
    if (info.status === 'FAILED' || !info.transcriptUri) { await deleteJobQuietly(name); return await set({ state: 'failed', error: 'job_failed', job_name: null }) }

    // Only one request finishes a job.
    const claim = await db.residentVideoTranscript.updateMany({ where: { id: t.id, state: 'pending', job_name: name }, data: { job_name: null } })
    if (claim.count !== 1) return (await db.residentVideoTranscript.findFirst({ where: { id: t.id } })) ?? t
    try {
      const text = extractTranscriptText(await speech().fetchTranscript(info.transcriptUri)).slice(0, TEXT_MAX)
      if (!text) return await set({ state: 'no_speech', error: null })
      const code = info.languageCode
      const base = { state: 'ready', language_code: code, language_name: languageName(code), original_text: text, error: null }
      if (isEnglish(code)) return await set({ ...base, translation_text: null })
      const tl = translateCodeFor(code)
      if (!tl) return await set({ ...base, translation_text: null })
      try {
        const translated = (await speech().translateToEnglish(text, tl)).slice(0, TEXT_MAX)
        return await set({ ...base, translation_text: translated || null })
      } catch (e: any) {
        if (e instanceof SpeechNotAvailable) return await set({ ...base, translation_text: null, error: 'translate_denied' })
        throw e
      }
    } catch (e: any) {
      if (e instanceof SpeechNotAvailable) return await set({ state: 'not_available' })
      console.error('[resident-video-transcript] could not finish:', e?.name ?? 'error')
      return await set({ state: 'failed', error: 'finish_failed' })
    } finally {
      await deleteJobQuietly(name)   // the cloud service keeps nothing
    }
  } catch (e: any) {
    console.error('[resident-video-transcript] refresh failed:', e?.name ?? 'error')
    return t
  }
}

// ─── Manager edits ─────────────────────────────────────────────────────────────
/** Saves the manager's corrected English text (empty text goes back to the machine translation). */
export async function editTranslation(t: any, text: unknown, editorName: string): Promise<{ ok: true; row: any } | { ok: false; status: number; code: string; message: string }> {
  if (t.state !== 'ready' || isEnglish(t.language_code)) return { ok: false, status: 409, code: 'NOT_READY', message: 'There is no translation to edit for this video.' }
  const clean = cleanText(text, EDIT_MAX)
  const row = await db.residentVideoTranscript.update({ where: { id: t.id }, data: clean ? { edited_translation_text: clean, edited_by: cleanText(editorName, 100) || 'A manager' } : { edited_translation_text: null, edited_by: null } })
  return { ok: true, row }
}

/** Switches "show the English text to staff" for one video. Only possible when there is English text to show. */
export async function setShowToStaff(t: any, on: boolean): Promise<{ ok: true; row: any } | { ok: false; status: number; code: string; message: string }> {
  if (on && (t.state !== 'ready' || isEnglish(t.language_code) || !effectiveTranslation(t))) return { ok: false, status: 409, code: 'NOT_READY', message: 'There is no English text to share for this video.' }
  const row = await db.residentVideoTranscript.update({ where: { id: t.id }, data: { show_to_staff: on } })
  return { ok: true, row }
}

// ─── Staff ─────────────────────────────────────────────────────────────────────
/**
 * The English text staff may see under a video: only when a manager switched it on for this video, the clip is approved and ready,
 * and there is text. Everything else is null (staff see nothing).
 */
export async function staffTranslationFor(v: any): Promise<{ text: string; language_name: string | null; label: string } | null> {
  if (!v || v.status !== 'approved' || v.state !== 'ready') return null
  const t = await transcriptFor(v.tenant_id, v.id)
  if (!t || t.state !== 'ready' || !t.show_to_staff || isEnglish(t.language_code)) return null
  const text = effectiveTranslation(t)
  return text ? { text, language_name: t.language_name ?? languageName(t.language_code), label: STAFF_LABEL } : null
}

// ─── Retention ─────────────────────────────────────────────────────────────────
/** Deletes one clip's transcript and translation (and any job still running). Called wherever the clip's files are removed. */
export async function removeTranscriptFor(v: { id: string }): Promise<void> {
  try {
    const rows: any[] = await db.residentVideoTranscript.findMany({ where: { video_id: v.id } })
    for (const r of rows) await deleteJobQuietly(r.job_name)
    await db.residentVideoTranscript.deleteMany({ where: { video_id: v.id } })
  } catch { /* transcripts table not created yet */ }
}

/** Deletes every transcript of a resident (profile deletion). */
export async function removeTranscriptsForResident(tenantId: string, residentId: string): Promise<void> {
  try {
    const rows: any[] = await db.residentVideoTranscript.findMany({ where: { tenant_id: tenantId, resident_id: residentId } })
    for (const r of rows) await deleteJobQuietly(r.job_name)
    await db.residentVideoTranscript.deleteMany({ where: { tenant_id: tenantId, resident_id: residentId } })
  } catch { /* transcripts table not created yet */ }
}
