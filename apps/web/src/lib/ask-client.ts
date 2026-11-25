// Ask CareStream (apps/api/src/routes/ask.ts): administrators on the pilot account only. Every call is a plain authenticated request.
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

export class AskError extends Error { constructor(public code: string, message: string, public status: number) { super(message) } }
async function call<T>(path: string, token: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, { ...init, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(init.headers ?? {}) } })
  let body: any = null
  try { body = await res.json() } catch { /* not json */ }
  if (!res.ok || !body?.success) throw new AskError(body?.error?.code ?? 'ERROR', body?.error?.message ?? `Something went wrong (${res.status}).`, res.status)
  return body.data as T
}

export type AgentStatus = 'ready' | 'shell' | 'soon'
export interface AskAgent { id: string; name: string; blurb: string; icon: string; status: AgentStatus; starters: string[]; shell_message: string | null; uploads?: { kinds: string[]; hint: string } | null }
export interface AskSource { label: string; as_of: string | null; warning?: string | null; url?: string | null; /** A draft the agent saved in this answer (shown designed, with its buttons). */ document_id?: string; doc_type?: string }
export interface AskMessage { id: string; role: 'user' | 'assistant'; content: string; sources?: AskSource[]; created_at?: string | null }
export type ActionStatus = 'proposed' | 'confirmed' | 'cancelled' | 'expired' | 'failed' | 'done'
export interface SharePlan { ok: boolean; blockers: string[]; what: string; how: string | null; who: string | null; how_text: string; who_text: string; count: number; names: string[]; more: number; left_out: number; channels: string[]; notification_email: boolean; needs_approval: boolean; preview: { doc_id: string | null; kind: string } }
export interface ActionPerson { id: string; name: string; job_role: string | null; photo_url: string | null; has_email?: boolean; is_admin?: boolean }
export interface AskActionCard {
  id: string; type: 'send_staff_notification' | 'remind_unread_notification' | 'allocate_training' | 'send_training_reminders'; label: string; status: ActionStatus
  expires_at: string; created_at: string; recipients: ActionPerson[]; suggested: string[]; max_recipients: number; result: any; summary: string; notes: string[]
  title?: string; body?: string; email?: boolean; email_allowed?: boolean; all_staff?: boolean; personalised?: string[]; unknown_fields?: string[]
  preview?: { for_name: string; title: string; body: string } | null
  notification_title?: string; courses?: string[]; due_date?: string | null; skipped?: Array<{ user_id: string; name: string; course: string; reason: string }>
  scope?: string; within_days?: number; items?: Array<{ user_id: string; name: string; courses: string[] }>
}
export interface AskSettingsView { actions_enabled: boolean; notifications_enabled: boolean; training_enabled: boolean; emails_enabled: boolean; max_recipients: number; min_gap_minutes: number; managers_can_use: boolean; approver_emails?: boolean }
export interface AskConversation { id: string; agent_id: string; title: string; updated_at: string | null }
export interface AskDocument { id: string; type: string; title: string; status: string; mine?: boolean; staff_name?: string | null; updated_at: string | null }
export interface AskDocActions { needs_approval: boolean; edit: boolean; submit: boolean; approve: boolean; return: boolean; reopen: boolean; share: Array<'pdf' | 'email' | 'notification' | 'hub'> }
export interface ShareIntent { hub: boolean; email: boolean; print_only: boolean }
export interface HubShare { id: string; person: string; shared_at: string | null; read_at: string | null; needs_acknowledgement: boolean; acknowledged_at: string | null; withdrawn_at: string | null; signed: boolean }
export interface AskDocField { key: string; label: string; type: string; required: boolean; choices: Array<{ value: string; label: string }> | null }
export interface NewsletterEditItem { id: string; kind: 'section' | 'custom'; type: string; title: string; summary: string; style: string | null; can_edit: boolean }
export interface NewsletterEditState {
  can_edit: boolean; items: NewsletterEditItem[]; accent: string | null; brand_colour: string | null; category_colour: string
  palettes: Array<{ id: string; label: string; accent: string }>; block_types: Array<{ id: string; label: string; hint: string }>; callout_icons: string[]; styles: string[]; max_custom: number
}
export type NewsletterOp =
  | { op: 'add'; type: string; content: unknown; after?: string | null }
  | { op: 'update'; id: string; content: unknown }
  | { op: 'update_section'; id: string; title?: string; text?: string }
  | { op: 'delete'; id: string } | { op: 'duplicate'; id: string } | { op: 'move'; id: string; dir: 'up' | 'down' }
  | { op: 'style'; id: string; style: string | null } | { op: 'reset_styles' } | { op: 'accent'; accent: string | null }

export interface AskDocFull {
  id: string; type: string; title: string; body: string; status: string; version: number; updated_at: string | null; mine: boolean; created_by: string
  staff_name: string | null; internal_only?: boolean; checklist: string[]; references: Array<{ label: string; url: string }>; shared: Array<{ method: string; at: string }>
  share_intent?: ShareIntent | null; share_intent_text?: string; ack_default?: boolean; hub_shares?: HubShare[]
  values?: Record<string, string | number>; fields?: AskDocField[]; actions: AskDocActions; data?: { custom_blocks?: Array<{ id: string; type: string; content: Record<string, any> }>; review_note?: { note: string; at: string }; photo?: { user_id: string; include: boolean } | null; photos?: Array<{ user_id: string; include: boolean }>; gift?: { text?: string; image_id?: string | null } | null; template_id?: string | null } | null
}
export type UploadRetention = 'chat_end' | '30d' | 'keep'
export interface MatchRowView { row: number; file_name: string; status: 'matched' | 'ambiguous' | 'unmatched'; staff_id: string | null; candidates: Array<{ id: string; name: string }>; chosen?: string | null }
export interface AskUpload {
  id: string; filename: string; agent_id: string; conversation_id: string; doc_kind: 'payroll' | 'invoice' | 'rota' | 'holiday' | 'training' | 'other'; kind: string; row_count: number; status: 'ready' | 'needs_match' | 'deleted'
  columns: Array<{ name: string; meaning: string | null }>; dropped: Array<{ column: string; reason: string }>; sheet_name: string | null; sheets_found: number | null
  text_totals?: Array<{ label: string; amount: number }>; created_at: string | null; expires_at: string | null; retention_note: string
  match: null | { confirmed: boolean; matched: number; ambiguous: number; unmatched: number; total: number; rows: MatchRowView[]; staff: Array<{ id: string; name: string }> }
}
export interface AskApproval { id: string; type: string; title: string; staff_name: string | null; mine: boolean; can_approve?: boolean; updated_at: string | null }

export interface OptionPreview { kind: string; title: string; html: string; css: string; sample: boolean; has_logo: boolean; brand_colour: string | null; note: string | null }
export interface NewsletterSample { id: string; layout: 'short' | 'standard' | 'detailed' | string; title: string; html: string }
export interface NewsletterLibrary {
  categories: Array<{ id: string; title: string; blurb: string; types: Array<{ type: string; title: string; purpose: string; layouts: Array<{ id: string; layout: 'short' | 'standard' | 'detailed'; sections: number }> }> }>
  templates: Array<{ id: string; type: string; layout: string; title: string; heads_up: string | null; sections: Array<{ key: string; title: string; from_data: boolean; needs_ticks: boolean }> }>
}

export const ask = {
  meta: (t: string) => call<{ enabled: boolean; ready: boolean; role?: 'admin' | 'manager'; agents: AskAgent[] }>('/ask/meta', t),
  chat: (t: string, b: { agent_id: string; conversation_id?: string | null; message: string; context?: { page: string; staffUserId?: string; residentId?: string; year?: number; month?: string } }) =>
    call<{ conversation_id: string; message: AskMessage; actions?: AskActionCard[]; tools_used: string[] }>('/ask/chat', t, { method: 'POST', body: JSON.stringify(b) }),
  conversations: (t: string) => call<{ conversations: AskConversation[] }>('/ask/conversations', t),
  conversation: (t: string, id: string) => call<{ conversation: AskConversation; messages: AskMessage[]; actions?: Array<{ message_id: string | null; card: AskActionCard }> }>(`/ask/conversations/${encodeURIComponent(id)}`, t),
  rename: (t: string, id: string, title: string) => call<{ renamed: boolean }>(`/ask/conversations/${encodeURIComponent(id)}`, t, { method: 'PATCH', body: JSON.stringify({ title }) }),
  remove: (t: string, id: string) => call<{ deleted: boolean }>(`/ask/conversations/${encodeURIComponent(id)}`, t, { method: 'DELETE' }),
  actions: {
    settings: (t: string) => call<{ settings: AskSettingsView; ready: boolean }>('/ask/actions/settings', t),
    saveSettings: (t: string, b: Partial<AskSettingsView>) => call<{ settings: AskSettingsView }>('/ask/actions/settings', t, { method: 'PUT', body: JSON.stringify(b) }),
    staff: (t: string) => call<{ staff: ActionPerson[] }>('/ask/actions/staff', t),
    get: (t: string, id: string) => call<{ card: AskActionCard }>(`/ask/actions/${encodeURIComponent(id)}`, t),
    edit: (t: string, id: string, b: { title?: string; body?: string; user_ids?: string[]; due_date?: string | null; email?: boolean }) => call<{ card: AskActionCard }>(`/ask/actions/${encodeURIComponent(id)}`, t, { method: 'PATCH', body: JSON.stringify(b) }),
    confirm: (t: string, id: string) => call<{ card: AskActionCard; result: any }>(`/ask/actions/${encodeURIComponent(id)}/confirm`, t, { method: 'POST', body: '{}' }),
    cancel: (t: string, id: string) => call<{ cancelled: boolean }>(`/ask/actions/${encodeURIComponent(id)}/cancel`, t, { method: 'POST', body: '{}' }),
  },
  uploads: {
    config: (t: string) => call<{ retention: UploadRetention; retentions: Array<{ id: UploadRetention; label: string; note: string }>; max_mb: number; accept: string; per_chat: number }>('/ask/uploads/config', t),
    saveConfig: (t: string, retention: UploadRetention) => call<{ retention: UploadRetention }>('/ask/uploads/config', t, { method: 'PUT', body: JSON.stringify({ retention }) }),
    list: (t: string, conversationId: string) => call<{ uploads: AskUpload[] }>(`/ask/uploads?conversation_id=${encodeURIComponent(conversationId)}`, t),
    /** One file, as multipart (the browser sets the content type). The reply carries the chat it belongs to (a new one when the file was the first thing in the chat). */
    add: async (t: string, file: File, agentId: string, conversationId: string | null): Promise<{ upload: AskUpload }> => {
      const fd = new FormData(); fd.append('agent_id', agentId); if (conversationId) fd.append('conversation_id', conversationId); fd.append('file', file)
      const res = await fetch(`${API_URL}/ask/uploads`, { method: 'POST', headers: { Authorization: `Bearer ${t}` }, body: fd })
      let body: any = null; try { body = await res.json() } catch { /* not json */ }
      if (!res.ok || !body?.success) throw new AskError(body?.error?.code ?? 'ERROR', body?.error?.message ?? `That file could not be added (${res.status}).`, res.status)
      return body.data
    },
    match: (t: string, id: string, choices: Record<string, string | null>, confirm: boolean) => call<{ upload: AskUpload }>(`/ask/uploads/${encodeURIComponent(id)}/match`, t, { method: 'POST', body: JSON.stringify({ choices, confirm }) }),
    remove: (t: string, id: string) => call<{ deleted: boolean }>(`/ask/uploads/${encodeURIComponent(id)}`, t, { method: 'DELETE' }),
  },
  newsletterTemplates: (t: string) => call<NewsletterLibrary>('/ask/newsletter-templates', t),
  /** Sample designs (marked SAMPLE) of every layout of one newsletter type, for choosing a layout by its looks. */
  /** A SAMPLE of one option an agent offers (placeholder words, the organisation's own logo and colour). Never reads real records. */
  optionPreview: (t: string, p: { kind: string; template_id: string | null; layout: string | null; document_id?: string | null }) => call<OptionPreview>(`/ask-docs/option-preview?kind=${encodeURIComponent(p.kind)}${p.template_id ? `&template_id=${encodeURIComponent(p.template_id)}` : ''}${p.layout ? `&layout=${encodeURIComponent(p.layout)}` : ''}${p.document_id ? `&document_id=${encodeURIComponent(p.document_id)}` : ''}`, t),
  newsletterSamples: (t: string, type: string) => call<{ designs: NewsletterSample[] }>(`/ask-docs/newsletter-samples/${encodeURIComponent(type)}`, t),
  /** The designed newsletter for text that is being edited and is not saved yet. */
  previewDraft: (t: string, id: string, b: { title?: string; body?: string }) => call<{ html: string }>(`/ask-docs/${encodeURIComponent(id)}/preview-draft`, t, { method: 'POST', body: JSON.stringify(b) }),
  /** Include one person's staff photo in the newsletter (null removes it). */
  newsletterPhoto: (t: string, id: string, userId: string | null, consent = false) => call<{ saved: boolean; photo_user_id: string | null; has_picture: boolean }>(`/ask-docs/${encodeURIComponent(id)}/newsletter-photo`, t, { method: 'POST', body: JSON.stringify({ user_id: userId, consent }) }),
  /** The optional gift picture (png, jpg or webp, up to 1 MB): kept privately for this account; returns the id to use. */
  giftImage: async (t: string, file: File): Promise<{ image_id: string }> => {
    const fd = new FormData(); fd.append('file', file)
    const res = await fetch(`${API_URL}/ask-docs/gift-image`, { method: 'POST', headers: { Authorization: `Bearer ${t}` }, body: fd })
    let body: any = null; try { body = await res.json() } catch { /* not json */ }
    if (!res.ok || !body?.success) throw new AskError(body?.error?.code ?? 'ERROR', body?.error?.message ?? `That picture could not be added (${res.status}).`, res.status)
    return body.data
  },
  setGift: (t: string, id: string, b: { text: string; image_id: string | null }) => call<{ saved: boolean; gift: { text: string; image_id: string | null } | null }>(`/ask-docs/${encodeURIComponent(id)}/gift`, t, { method: 'PUT', body: JSON.stringify(b) }),
  /** Changing a newsletter in the panel: colours (overall and per block) and the blocks a tenant adds, moves, copies or deletes. */
  newsletterEdit: (t: string, id: string) => call<NewsletterEditState>(`/ask-docs/${encodeURIComponent(id)}/newsletter-edit`, t),
  newsletterOp: (t: string, id: string, op: NewsletterOp) => call<{ saved: boolean; id: string | null; items: NewsletterEditItem[]; accent: string | null }>(`/ask-docs/${encodeURIComponent(id)}/newsletter-edit`, t, { method: 'POST', body: JSON.stringify(op) }),
  /** The picture of a picture block (png, jpg or webp, up to 1 MB): kept privately for this account; returns the id to use. */
  blockImage: async (t: string, file: File): Promise<{ image_id: string }> => {
    const fd = new FormData(); fd.append('file', file)
    const res = await fetch(`${API_URL}/ask-docs/block-image`, { method: 'POST', headers: { Authorization: `Bearer ${t}` }, body: fd })
    let body: any = null; try { body = await res.json() } catch { /* not json */ }
    if (!res.ok || !body?.success) throw new AskError(body?.error?.code ?? 'ERROR', body?.error?.message ?? `That picture could not be added (${res.status}).`, res.status)
    return body.data
  },
  newsletterPhotoStatus: (t: string, id: string) => call<{ chosen: boolean; name?: string | null; consent?: boolean; has_picture?: boolean }>(`/ask-docs/${encodeURIComponent(id)}/newsletter-photo`, t),
  documents: (t: string) => call<{ documents: AskDocument[] }>('/ask/documents', t),
  document: (t: string, id: string) => call<{ document: AskDocFull }>(`/ask/documents/${encodeURIComponent(id)}`, t),
  approvals: (t: string) => call<{ approvals: AskApproval[]; waiting_for_me?: number }>('/ask/approvals', t),
  editDocument: (t: string, id: string, b: { title?: string; body?: string; internal_only?: boolean; values?: Record<string, string | number> }) => call<{ saved: boolean; missing?: string[]; unreadable?: string[]; body?: string }>(`/ask/documents/${encodeURIComponent(id)}`, t, { method: 'PATCH', body: JSON.stringify(b) }),
  submit: (t: string, id: string) => call<{ status: string }>(`/ask/documents/${encodeURIComponent(id)}/submit`, t, { method: 'POST', body: '{}' }),
  approve: (t: string, id: string, checklist_confirmed: boolean) => call<{ status: string }>(`/ask/documents/${encodeURIComponent(id)}/approve`, t, { method: 'POST', body: JSON.stringify({ checklist_confirmed }) }),
  returnToDraft: (t: string, id: string, note?: string) => call<{ status: string }>(`/ask/documents/${encodeURIComponent(id)}/return`, t, { method: 'POST', body: JSON.stringify({ note }) }),
  reopen: (t: string, id: string) => call<{ status: string }>(`/ask/documents/${encodeURIComponent(id)}/reopen`, t, { method: 'POST', body: '{}' }),
  share: (t: string, id: string, b: { method: 'email' | 'notification' | 'hub' | 'now'; audience?: 'all' | 'selected'; user_ids?: string[]; sign?: boolean; needs_acknowledgement?: boolean }) => call<{ shared: boolean; method: string; channels?: string[] }>(`/ask/documents/${encodeURIComponent(id)}/share`, t, { method: 'POST', body: JSON.stringify(b) }),
  /** How a letter is to be shared: in their hub, by email, hub and email, or print only (exclusive). */
  setShareIntent: (t: string, id: string, b: ShareIntent) => call<{ share_intent: ShareIntent; share_intent_text: string }>(`/ask/documents/${encodeURIComponent(id)}/share-intent`, t, { method: 'POST', body: JSON.stringify(b) }),
  /** Takes one shared letter out of the person's hub (the record stays here). */
  withdrawHubShare: (t: string, id: string, letterId: string) => call<{ withdrawn: boolean }>(`/ask/documents/${encodeURIComponent(id)}/hub-shares/${encodeURIComponent(letterId)}/withdraw`, t, { method: 'POST', body: '{}' }),
  /** HOUSE RULE 4: the document as a PDF or Word file. Approved: the finished copy. Not approved yet: pass draft, and it comes back stamped DRAFT on every page (nothing is recorded as shared). */
  documentBlob: async (t: string, id: string, format: 'pdf' | 'docx', o: { sign?: boolean; draft?: boolean } = {}): Promise<Blob> => {
    const qs = [o.sign ? 'sign=1' : '', o.draft ? 'draft=1' : ''].filter(Boolean).join('&')
    const path = format === 'pdf' ? `/ask/documents/${encodeURIComponent(id)}/pdf` : `/ask-docs/${encodeURIComponent(id)}/docx`
    const res = await fetch(`${API_URL}${path}${qs ? `?${qs}` : ''}`, { headers: { Authorization: `Bearer ${t}` } })
    if (!res.ok) { let m = format === 'pdf' ? 'The PDF could not be made just now.' : 'The Word document could not be made just now.'; try { m = (await res.json())?.error?.message ?? m } catch { /* not json */ } throw new AskError(format === 'pdf' ? 'PDF_FAILED' : 'DOCX_FAILED', m, res.status) }
    return res.blob()
  },
  /** A SAMPLE (an option preview) as a PDF with SAMPLE printed on every page. */
  samplePdfBlob: async (t: string, p: { kind: string; template_id?: string | null; layout?: string | null }): Promise<Blob> => {
    const qs = new URLSearchParams({ kind: p.kind, ...(p.template_id ? { template_id: p.template_id } : {}), ...(p.layout ? { layout: p.layout } : {}) })
    const res = await fetch(`${API_URL}/ask-docs/option-preview/pdf?${qs}`, { headers: { Authorization: `Bearer ${t}` } })
    if (!res.ok) throw new AskError('PDF_FAILED', 'The sample PDF could not be made just now.', res.status)
    return res.blob()
  },
  /** HOUSE RULE 5: what a send WOULD do (counts, names for ten or fewer, limits, approval). Sends nothing. */
  sharePlan: (t: string, id: string, b: { how: string; who: string; user_ids?: string[] }) => call<{ plan: SharePlan; summary: string }>(`/ask/documents/${encodeURIComponent(id)}/share-plan`, t, { method: 'POST', body: JSON.stringify(b) }),
  /** The send itself: only ever with confirm: true, from the Send button. */
  shareSend: (t: string, id: string, b: { how: string; who: string; user_ids?: string[]; sign?: boolean; needs_acknowledgement?: boolean }) => call<{ sent: boolean; count: number; channels: string[] }>(`/ask/documents/${encodeURIComponent(id)}/share-send`, t, { method: 'POST', body: JSON.stringify({ ...b, confirm: true }) }),
  /** The finished PDF as a blob address, for printing (an approved document only). */
  pdfBlobUrl: async (t: string, id: string, sign = false) => {
    const res = await fetch(`${API_URL}/ask/documents/${encodeURIComponent(id)}/pdf${sign ? '?sign=1' : ''}`, { headers: { Authorization: `Bearer ${t}` } })
    if (!res.ok) { let m = 'The PDF could not be made just now.'; try { m = (await res.json())?.error?.message ?? m } catch { /* not json */ } throw new AskError('PDF_FAILED', m, res.status) }
    return URL.createObjectURL(await res.blob())
  },
  /** Downloads the finished PDF (an approved document only) and saves it in the browser. */
  downloadPdf: async (t: string, id: string, fallbackName: string, sign = false) => {
    const res = await fetch(`${API_URL}/ask/documents/${encodeURIComponent(id)}/pdf${sign ? '?sign=1' : ''}`, { headers: { Authorization: `Bearer ${t}` } })
    if (!res.ok) { let m = 'The PDF could not be made just now.'; try { m = (await res.json())?.error?.message ?? m } catch { /* not json */ } throw new AskError('PDF_FAILED', m, res.status) }
    const url = URL.createObjectURL(await res.blob()); const a = document.createElement('a'); a.href = url; a.download = `${fallbackName.replace(/[^a-zA-Z0-9 _-]/g, '').trim().replace(/\s+/g, '-') || 'document'}.pdf`; a.click(); URL.revokeObjectURL(url)
  },
  /** The finished Word document (.docx), on the organisation's letterhead. `sign` adds MY signature (only mine, only when I ask). */
  downloadDocx: async (t: string, id: string, fallbackName: string, sign = false) => {
    const res = await fetch(`${API_URL}/ask-docs/${encodeURIComponent(id)}/docx${sign ? '?sign=1' : ''}`, { headers: { Authorization: `Bearer ${t}` } })
    if (!res.ok) { let m = 'The Word document could not be made just now.'; try { m = (await res.json())?.error?.message ?? m } catch { /* not json */ } throw new AskError('DOCX_FAILED', m, res.status) }
    const url = URL.createObjectURL(await res.blob()); const a = document.createElement('a'); a.href = url; a.download = `${fallbackName.replace(/[^a-zA-Z0-9 _-]/g, '').trim().replace(/\s+/g, '-') || 'document'}.docx`; a.click(); URL.revokeObjectURL(url)
  },
  /** Is the letterhead set up, what is missing, and do I have a signature (never the picture). */
  docStatus: (t: string) => call<{ letterhead_ready: boolean; trading_name: string; missing: string[]; signature: boolean }>('/ask-docs/status', t),
  /** The headed page as HTML (made by the server with the same layout as the PDF and Word), for the on screen preview. */
  preview: (t: string, id: string, sign = false) => call<{ html: string; css: string }>(`/ask-docs/${encodeURIComponent(id)}/preview${sign ? '?sign=1' : ''}`, t),
  save: (t: string, b: { type?: string; title: string; body: string; sources?: AskSource[] }) => call<{ id: string }>('/ask/documents', t, { method: 'POST', body: JSON.stringify(b) }),
  updateDocument: (t: string, id: string, b: { title?: string; body?: string }) => call<{ saved: boolean }>(`/ask/documents/${encodeURIComponent(id)}`, t, { method: 'PATCH', body: JSON.stringify(b) }),
  removeDocument: (t: string, id: string) => call<{ deleted: boolean }>(`/ask/documents/${encodeURIComponent(id)}`, t, { method: 'DELETE' }),
}

/** A notification draft the Notifications agent puts in a fenced block: pulled out so the screen can offer "Open in Notifications". */
export function parseNotificationDraft(text: string): { title: string; body: string } | null {
  const m = /```notification\s*\n([\s\S]*?)```/i.exec(text)
  if (!m) return null
  const t = /^TITLE:\s*(.+)$/im.exec(m[1]); const b = /^BODY:\s*\n?([\s\S]*)$/im.exec(m[1])
  if (!t || !b) return null
  return { title: t[1].trim().slice(0, 120), body: b[1].trim().slice(0, 2000) }
}
export const withoutDraftBlock = (text: string) => text.replace(/```notification[\s\S]*?```/gi, '').trim()
export const notificationsLink = (d: { title: string; body: string }) => `/notifications?title=${encodeURIComponent(d.title)}&body=${encodeURIComponent(d.body)}`

/** The agent offers layouts with a fenced block (type: employee-of-the-month): pulled out so the screen can show a small picture of each layout. */
export function parseNewsletterLayouts(text: string): string | null {
  const m = /```newsletter-layouts\s*\n([\s\S]*?)```/i.exec(text)
  const t = m ? /^type:\s*([a-z0-9-]{3,60})\s*$/im.exec(m[1]) : null
  return t ? t[1] : null
}
export const withoutLayoutsBlock = (text: string) => text.replace(/```newsletter-layouts[\s\S]*?```/gi, '').trim()
