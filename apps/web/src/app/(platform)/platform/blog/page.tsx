'use client'

import React, { useEffect, useRef, useState } from 'react'
import { usePlatformAuth } from '@/hooks/use-platform-auth'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'
import { createPlatformClient, uploadBlogImage, fetchTrainingSeoIndex, type BlogAuthor, type BlogPost, type SitePage, type Collection, type FeaturePage } from '@/lib/platform-api'
import { EMPTY_FEATURE_CONTENT, type FeaturePageContent } from '@/lib/feature-content'
import { slotsForPath, type SlotDef } from '@/lib/page-slots'
import { PlatformShell } from '@/components/platform-shell'
import { AltTagsPanel } from './AltTagsPanel'
import { Button } from '@/components/ui/button'
import {
  Check, ChevronDown, Clock, Globe, Loader2, Pencil, Plus, Trash2, Upload, User, X,
} from 'lucide-react'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const CATEGORIES = ['advice', 'news', 'guides', 'technology', 'cqc', 'care', 'other']

function slugify(str = '') {
  return str.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
}

function calcReadTime(html = '') {
  const words = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().split(' ').filter(Boolean).length
  return Math.max(1, Math.round(words / 200))
}

const STATUS_COLOURS: Record<string, string> = {
  published: 'bg-green-100 text-green-700',
  draft:     'bg-amber-100 text-amber-700',
  archived:  'bg-gray-100 text-gray-600',
}

// ─── Author form ──────────────────────────────────────────────────────────────

const EMPTY_AUTHOR = { name: '', title: '', photo_url: '', bio: '', linkedin_url: '' }

function AuthorForm({
  initial, onSave, onCancel, saving, token,
}: {
  initial?: Partial<BlogAuthor> | null
  onSave:   (data: any) => void
  onCancel: () => void
  saving:   boolean
  token:    string | null
}) {
  const [form, setForm] = useState({ ...EMPTY_AUTHOR, ...initial })
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const photoInputRef = useRef<HTMLInputElement>(null)
  const [photoUploading, setPhotoUploading] = useState(false)
  const [photoError, setPhotoError] = useState('')

  async function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !token) return
    setPhotoUploading(true); setPhotoError('')
    try {
      const prepared = await resizeImageForUpload(file, 640, 0.85)
      const url = await uploadBlogImage(token, prepared)
      set('photo_url', url)
    } catch (err: any) {
      setPhotoError(err?.message ?? 'Upload failed')
    } finally {
      setPhotoUploading(false)
      if (photoInputRef.current) photoInputRef.current.value = ''
    }
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-neutral-light p-5 space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-semibold text-neutral-mid">Full name *</label>
          <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Sarah Johnson"
            className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-teal focus:outline-none focus:ring-1 focus:ring-teal" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-neutral-mid">Title / Role</label>
          <input value={form.title ?? ''} onChange={e => set('title', e.target.value)} placeholder="e.g. Senior Care Advisor"
            className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-teal focus:outline-none focus:ring-1 focus:ring-teal" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-neutral-mid">Photo</label>
          <div className="flex items-center gap-3">
            <div className="shrink-0">
              {form.photo_url ? (
                <div className="relative">
                  <img src={form.photo_url} alt="Preview" className="h-14 w-14 rounded-full border object-cover" />
                  <button onClick={() => set('photo_url', '')}
                    className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white hover:bg-red-600">
                    <X size={10} />
                  </button>
                </div>
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded-full border border-dashed border-gray-300 bg-gray-50">
                  <User size={22} className="text-gray-400" />
                </div>
              )}
            </div>
            <div className="flex-1 space-y-1.5">
              <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
              <button type="button" onClick={() => photoInputRef.current?.click()} disabled={photoUploading || !token}
                className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 px-3 py-2 text-sm font-medium text-neutral-dark hover:bg-neutral-light disabled:opacity-50">
                {photoUploading ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
                {photoUploading ? 'Uploading…' : (form.photo_url ? 'Replace photo' : 'Upload photo')}
              </button>
              <input value={form.photo_url ?? ''} onChange={e => set('photo_url', e.target.value)} placeholder="…or paste an image URL"
                className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-teal focus:outline-none focus:ring-1 focus:ring-teal" />
              {photoError && <p className="text-xs text-red-500">{photoError}</p>}
            </div>
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-neutral-mid">LinkedIn profile URL</label>
          <input value={form.linkedin_url ?? ''} onChange={e => set('linkedin_url', e.target.value)} placeholder="https://www.linkedin.com/in/…"
            className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-teal focus:outline-none focus:ring-1 focus:ring-teal" />
          <p className="mt-1 text-xs text-neutral-mid">Adds a verified author link to the article's structured data (helps E-E-A-T).</p>
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-semibold text-neutral-mid">Short bio</label>
          <textarea value={form.bio ?? ''} onChange={e => set('bio', e.target.value)} rows={3}
            placeholder="2–3 sentences about the author's background and expertise."
            className="w-full resize-none rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-teal focus:outline-none focus:ring-1 focus:ring-teal" />
        </div>
      </div>

      {/* Preview */}
      {form.name && (
        <div className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-4">
          {form.photo_url ? (
            <img src={form.photo_url} alt={form.name} className="h-14 w-14 shrink-0 rounded-full border object-cover" />
          ) : (
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-teal-light">
              <User size={22} className="text-teal" />
            </div>
          )}
          <div>
            <p className="text-sm font-semibold text-neutral-dark">{form.name}</p>
            {form.title && <p className="text-xs font-medium text-teal">{form.title}</p>}
            {form.bio && <p className="mt-0.5 line-clamp-2 text-xs text-neutral-mid">{form.bio}</p>}
          </div>
        </div>
      )}

      <div className="flex gap-2 pt-1">
        <Button onClick={() => onSave(form)} disabled={saving || !form.name.trim()}>
          {saving ? <Loader2 size={14} className="mr-1 animate-spin" /> : <Check size={14} className="mr-1" />}
          {saving ? 'Saving…' : 'Save Author'}
        </Button>
        <Button variant="secondary" onClick={onCancel} disabled={saving}><X size={14} className="mr-1" />Cancel</Button>
      </div>
    </div>
  )
}

// ─── Rich editor (WYSIWYG) ──────────────────────────────────────────────────────
// A visual editor: you see formatted text, not HTML. Stores HTML via the
// browser's contentEditable so the public site (which renders HTML) is unchanged.

function RichEditor({ value, onChange, rows = 6, placeholder = '', token }: {
  value:       string
  onChange:    (v: string) => void
  rows?:       number
  placeholder?: string
  // When a token is supplied, an "Image" button is shown that uploads and inserts
  // an image inline. Left off elsewhere (FAQ answers, etc.) so it stays uncluttered.
  token?:      string | null
}) {
  const ref       = useRef<HTMLDivElement>(null)
  const lastHtml  = useRef<string>('')
  const savedRange = useRef<Range | null>(null)
  const imgInputRef = useRef<HTMLInputElement>(null)
  const [imgBusy, setImgBusy] = useState(false)

  // Push external value changes into the div WITHOUT resetting on our own edits
  // (which would jump the caret to the start mid-typing).
  useEffect(() => {
    const el = ref.current
    if (el && value !== lastHtml.current && value !== el.innerHTML) {
      el.innerHTML = value || ''
      lastHtml.current = value || ''
    }
  }, [value])

  function sync() {
    const html = ref.current?.innerHTML ?? ''
    lastHtml.current = html
    onChange(html)
  }

  // Remember the caret/selection so toolbar controls (esp. the dropdown, which
  // steals focus) can act on the right place in the text.
  function saveSelection() {
    const sel = window.getSelection()
    if (sel && sel.rangeCount > 0 && ref.current?.contains(sel.anchorNode)) {
      savedRange.current = sel.getRangeAt(0)
    }
  }

  function exec(command: string, arg?: string) {
    const el = ref.current
    if (!el) return
    el.focus()
    const sel = window.getSelection()
    if (savedRange.current && sel && el.contains(savedRange.current.commonAncestorContainer)) {
      sel.removeAllRanges()
      sel.addRange(savedRange.current)
    }
    document.execCommand(command, false, arg)
    saveSelection()
    sync()
  }

  function insertLink() {
    const url = window.prompt('Enter URL:', 'https://')
    if (url) exec('createLink', url)
  }

  // Upload the chosen image (resized/compressed client-side) and insert it inline
  // at the caret as a responsive <img>. Prompts for alt text (accessibility + SEO).
  async function handleImagePick(file: File) {
    if (!token) return
    setImgBusy(true)
    try {
      const prepared = await resizeImageForUpload(file)
      const url = await uploadBlogImage(token, prepared)
      const raw = window.prompt('Image description (alt text, for accessibility and SEO) — optional:', '') ?? ''
      const alt = raw.replace(/"/g, '&quot;')
      exec('insertHTML', `<img src="${url}" alt="${alt}" style="max-width:100%;height:auto;border-radius:8px;" />`)
    } catch (err: any) {
      window.alert(err?.message ?? 'Image upload failed. Please try a smaller image.')
    } finally {
      setImgBusy(false)
    }
  }

  // mousedown-preventDefault keeps the editor's selection while clicking a button
  const btn = 'rounded px-2.5 py-0.5 text-xs text-neutral-mid hover:bg-gray-200 hover:text-neutral-dark'
  const minHeight = `${Math.max(rows, 3) * 1.6}rem`

  return (
    <div>
      <div className="flex flex-wrap items-center gap-1 rounded-t-md border border-b-0 border-gray-200 bg-gray-50 px-2 py-1.5">
        <select
          value=""
          onChange={e => { if (e.target.value) exec('formatBlock', `<${e.target.value}>`); e.target.value = '' }}
          title="Text style"
          className="rounded border border-gray-200 bg-white px-1.5 py-0.5 text-xs text-neutral-mid hover:bg-gray-200 focus:outline-none cursor-pointer">
          <option value="" disabled hidden>Style</option>
          <option value="p">Normal text</option>
          <option value="h1">Heading 1</option>
          <option value="h2">Heading 2</option>
          <option value="h3">Heading 3</option>
        </select>
        <div className="mx-1 h-3.5 w-px bg-gray-300" />
        <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => exec('bold')}   title="Bold"   className={`${btn} font-bold`}>B</button>
        <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => exec('italic')} title="Italic" className={`${btn} italic`}>I</button>
        <div className="mx-1 h-3.5 w-px bg-gray-300" />
        <button type="button" onMouseDown={e => e.preventDefault()} onClick={insertLink} title="Insert link" className={btn}>Link</button>
        {token ? (
          <>
            <button type="button" onMouseDown={e => e.preventDefault()} disabled={imgBusy}
              onClick={() => imgInputRef.current?.click()} title="Insert image" className={btn}>
              {imgBusy ? 'Uploading…' : '🖼 Image'}
            </button>
            <input ref={imgInputRef} type="file" accept="image/*" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) void handleImagePick(f); e.currentTarget.value = '' }} />
          </>
        ) : null}
        <div className="mx-1 h-3.5 w-px bg-gray-300" />
        <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => exec('insertUnorderedList')} title="Bullet list"   className={btn}>• List</button>
        <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => exec('insertOrderedList')}   title="Numbered list" className={btn}>1. List</button>
        <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => exec('formatBlock', '<blockquote>')} title="Blockquote" className={btn}>❝ Quote</button>
        <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => exec('removeFormat')} title="Clear formatting" className={btn}>Clear</button>
      </div>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onInput={sync}
        onBlur={() => { saveSelection(); sync() }}
        onKeyUp={saveSelection}
        onMouseUp={saveSelection}
        data-placeholder={placeholder}
        style={{ minHeight }}
        className="prose prose-sm max-w-none overflow-y-auto rounded-b-md border border-gray-200 bg-white px-3 py-2 text-sm leading-relaxed text-neutral-dark focus:border-teal focus:outline-none focus:ring-1 focus:ring-teal prose-headings:font-bold prose-headings:text-neutral-dark prose-a:text-teal empty:before:text-gray-400 empty:before:content-[attr(data-placeholder)]"
      />
    </div>
  )
}

// ─── Accordion section ────────────────────────────────────────────────────────

function AccordionSection({ title, description, children, defaultOpen = false }: {
  title:        string
  description?: string
  children:     React.ReactNode
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex w-full items-center justify-between px-5 py-4 text-left transition-colors hover:bg-neutral-light/50"
      >
        <div>
          <p className="text-sm font-semibold text-neutral-dark">{title}</p>
          {description && <p className="mt-0.5 text-xs text-neutral-mid">{description}</p>}
        </div>
        <ChevronDown size={16} className={`shrink-0 text-neutral-mid transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="space-y-4 border-t border-gray-100 px-5 py-5">
          {children}
        </div>
      )}
    </div>
  )
}

// ─── Post form ────────────────────────────────────────────────────────────────

const EMPTY_FAQS = Array.from({ length: 5 }, () => ({ question: '', answer: '' }))

const EMPTY_POST = {
  title: '', slug: '', excerpt: '', meta_title: '', meta_description: '',
  feature_image_url: '', feature_image_alt: '', og_image_url: '',
  content: '', author_id: '', category: 'advice',
  publication_date: new Date().toISOString().split('T')[0],
  status: 'draft', is_featured: false, read_time_minutes: 1,
  cta_text: '', cta_url: '',
  special_message: '', special_message_color: 'blue',
  key_info_title: '', key_info_content: '',
  faqs: EMPTY_FAQS,
  sources: [] as Array<{ label: string; url: string }>,
}

// Resize/compress an image in the browser before upload so it stays well under
// Vercel's ~4.5MB request-body limit (oversized uploads are rejected with a
// CORS-less 413, which surfaces in the browser as "Failed to fetch").
async function resizeImageForUpload(file: File, maxWidth = 1600, quality = 0.82): Promise<File> {
  // Only raster types we can draw to a canvas; leave gif/svg untouched.
  if (!file.type.startsWith('image/') || file.type === 'image/gif' || file.type === 'image/svg+xml') return file
  try {
    const dataUrl: string = await new Promise((resolve, reject) => {
      const r = new FileReader()
      r.onload = () => resolve(r.result as string)
      r.onerror = () => reject(new Error('read failed'))
      r.readAsDataURL(file)
    })
    const img: HTMLImageElement = await new Promise((resolve, reject) => {
      const im = new Image()
      im.onload = () => resolve(im)
      im.onerror = () => reject(new Error('decode failed'))
      im.src = dataUrl
    })
    // Already small enough — keep the original
    if (img.width <= maxWidth && file.size < 3_000_000) return file
    const scale = Math.min(1, maxWidth / img.width)
    const canvas = document.createElement('canvas')
    canvas.width  = Math.round(img.width * scale)
    canvas.height = Math.round(img.height * scale)
    const ctx = canvas.getContext('2d')
    if (!ctx) return file
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    const blob: Blob | null = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', quality))
    if (!blob) return file
    return new File([blob], file.name.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' })
  } catch {
    return file
  }
}

function PostForm({
  initial, authors, token, onSave, onCancel, saving, saveError,
}: {
  initial?:   Partial<BlogPost> | null
  authors:    BlogAuthor[]
  token:      string
  onSave:     (data: any) => void
  onCancel:   () => void
  saving:     boolean
  saveError:  string
}) {
  const [form, setForm] = useState<any>(() => {
    const merged: any = { ...EMPTY_POST, ...(initial ?? {}) }
    // The DB returns null for unset optional fields (meta_title, special_message,
    // cta_url, etc.). Restore the empty-string defaults so inputs stay controlled
    // and direct .length access (e.g. char counters) never hits null.
    for (const k of Object.keys(EMPTY_POST)) {
      if (typeof (EMPTY_POST as any)[k] === 'string' && merged[k] == null) {
        merged[k] = (EMPTY_POST as any)[k]
      }
    }
    merged.publication_date = initial?.publication_date
      ? new Date(initial.publication_date).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0]
    merged.faqs = (initial?.faqs && Array.isArray(initial.faqs) && initial.faqs.length > 0)
      ? initial.faqs
      : EMPTY_FAQS
    merged.sources = Array.isArray(initial?.sources) ? initial.sources : []
    return merged
  })
  const set    = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }))
  const setFaq = (i: number, field: 'question' | 'answer', val: string) =>
    set('faqs', (form.faqs as any[]).map((f, idx) => idx === i ? { ...f, [field]: val } : f))
  const sources: Array<{ label: string; url: string }> = form.sources ?? []
  const setSource = (i: number, field: 'label' | 'url', val: string) =>
    set('sources', sources.map((s, idx) => idx === i ? { ...s, [field]: val } : s))
  const addSource    = () => set('sources', [...sources, { label: '', url: '' }])
  const removeSource = (i: number) => set('sources', sources.filter((_, idx) => idx !== i))

  const [imgUploading, setImgUploading] = useState(false)
  const [imgError,     setImgError]     = useState('')
  const imgInputRef = useRef<HTMLInputElement>(null)

  async function handleImageFile(file: File) {
    if (!token) return
    setImgUploading(true); setImgError('')
    try {
      const prepared = await resizeImageForUpload(file)
      if (prepared.size > 4_400_000) {
        setImgError('Image is too large even after compression. Please use a smaller image.')
        return
      }
      const url = await uploadBlogImage(token, prepared)
      set('feature_image_url', url)
      if (!form.feature_image_alt) set('feature_image_alt', file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' '))
    } catch (e: any) {
      setImgError(e.message ?? 'Upload failed')
    } finally {
      setImgUploading(false)
    }
  }

  const selectedAuthor = authors.find(a => a.id === form.author_id)

  return (
    <div className="space-y-3 rounded-xl border border-gray-200 bg-neutral-light p-4">

      {/* Open the live page in a new window (handy for the meta-tag tool) */}
      {initial?.id && form.slug && (
        <div className="flex items-center justify-end">
          <a
            href={`/blog/${form.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-teal/40 bg-white px-3 py-1.5 text-xs font-semibold text-teal transition hover:bg-teal hover:text-white"
          >
            Open page in new window
            <span aria-hidden>↗</span>
          </a>
        </div>
      )}

      {/* ── Core Details ─────────────────────────────────── */}
      <AccordionSection title="Core Details" description="Title, slug, excerpt, author, dates and publishing status" defaultOpen>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-semibold text-neutral-mid">Title *</label>
            <input value={form.title}
              onChange={e => { set('title', e.target.value); if (!initial?.id) set('slug', slugify(e.target.value)) }}
              placeholder="e.g. How to Choose the Right Care Home"
              className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-teal focus:outline-none focus:ring-1 focus:ring-teal" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-neutral-mid">URL Slug *</label>
            <input value={form.slug} onChange={e => set('slug', e.target.value)}
              placeholder="how-to-choose-the-right-care-home"
              className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm font-mono focus:border-teal focus:outline-none focus:ring-1 focus:ring-teal" />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-semibold text-neutral-mid">Excerpt</label>
            <input value={form.excerpt} onChange={e => set('excerpt', e.target.value)}
              placeholder="Short summary shown in listings and on the homepage"
              className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-teal focus:outline-none focus:ring-1 focus:ring-teal" />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-neutral-mid">Author</label>
            <select value={form.author_id || ''} onChange={e => set('author_id', e.target.value)}
              className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-teal focus:outline-none focus:ring-1 focus:ring-teal">
              <option value="">No author</option>
              {authors.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
            {selectedAuthor && (
              <div className="mt-2 flex items-center gap-2">
                {selectedAuthor.photo_url && (
                  <img src={selectedAuthor.photo_url} alt={selectedAuthor.name} className="h-6 w-6 rounded-full border object-cover" />
                )}
                <span className="text-xs text-neutral-mid">{selectedAuthor.name}</span>
              </div>
            )}
            {authors.length === 0 && (
              <p className="mt-1 text-xs text-neutral-mid">Add authors in the Authors tab first.</p>
            )}
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-neutral-mid">Publication Date</label>
            <input type="date" value={form.publication_date} onChange={e => set('publication_date', e.target.value)}
              className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-teal focus:outline-none focus:ring-1 focus:ring-teal" />
          </div>
          <div>
            <label className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-neutral-mid">
              <Clock size={12} /> Read Time (min)
            </label>
            <input type="number" min="1" value={form.read_time_minutes}
              onChange={e => set('read_time_minutes', parseInt(e.target.value) || 1)}
              className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-teal focus:outline-none focus:ring-1 focus:ring-teal" />
            <p className="mt-1 text-xs text-neutral-mid">Auto-calculates from content.</p>
          </div>
        </div>
        <div className="grid grid-cols-2 items-end gap-4 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-neutral-mid">Category</label>
            <select value={form.category} onChange={e => set('category', e.target.value)}
              className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-teal focus:outline-none focus:ring-1 focus:ring-teal">
              {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-neutral-mid">Status</label>
            <select value={form.status} onChange={e => set('status', e.target.value)}
              className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-teal focus:outline-none focus:ring-1 focus:ring-teal">
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>
          </div>
          <div className="flex items-center gap-2 pb-1">
            <input type="checkbox" id="is_featured" checked={Boolean(form.is_featured)}
              onChange={e => set('is_featured', e.target.checked)}
              className="h-4 w-4 accent-teal" />
            <label htmlFor="is_featured" className="cursor-pointer text-sm text-neutral-dark">Featured on homepage</label>
          </div>
        </div>
      </AccordionSection>

      {/* ── Media ────────────────────────────────────────── */}
      <AccordionSection title="Media" description="Feature image and social share image" defaultOpen>
        <div>
          <label className="mb-1 block text-xs font-semibold text-neutral-mid">Feature Image</label>
          <input
            ref={imgInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleImageFile(f) }}
          />
          {form.feature_image_url ? (
            <div className="flex items-start gap-4">
              <img src={form.feature_image_url} alt="Feature" className="h-24 w-36 rounded-lg border object-cover" />
              <div className="flex flex-col gap-2">
                <button type="button" onClick={() => imgInputRef.current?.click()}
                  disabled={imgUploading}
                  className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 px-3 py-1.5 text-xs font-medium text-neutral-mid hover:bg-neutral-light disabled:opacity-50">
                  {imgUploading ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
                  {imgUploading ? 'Uploading…' : 'Replace image'}
                </button>
                <button type="button" onClick={() => { set('feature_image_url', ''); set('feature_image_alt', '') }}
                  className="inline-flex items-center gap-1.5 text-xs text-red-500 hover:underline">
                  <X size={12} /> Remove
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => imgInputRef.current?.click()}
              disabled={imgUploading}
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleImageFile(f) }}
              className="flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed border-gray-200 px-6 py-8 text-center transition-colors hover:border-teal hover:bg-teal-light/20 disabled:opacity-50"
            >
              {imgUploading ? (
                <Loader2 size={24} className="animate-spin text-teal" />
              ) : (
                <Upload size={24} className="text-neutral-mid" />
              )}
              <span className="text-sm font-medium text-neutral-mid">
                {imgUploading ? 'Uploading…' : 'Click to upload or drag and drop'}
              </span>
              <span className="text-xs text-neutral-mid">JPG, PNG, WebP or GIF up to 10 MB</span>
            </button>
          )}
          {imgError && <p className="mt-1 text-xs text-red-500">{imgError}</p>}
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-neutral-mid">Image Alt Text</label>
          <input value={form.feature_image_alt} onChange={e => set('feature_image_alt', e.target.value)}
            placeholder="Descriptive alt text for accessibility"
            className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-teal focus:outline-none focus:ring-1 focus:ring-teal" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-neutral-mid">Social Share Image URL (og:image)</label>
          <input value={form.og_image_url} onChange={e => set('og_image_url', e.target.value)}
            placeholder="Defaults to feature image — recommended 1200×630px"
            className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-teal focus:outline-none focus:ring-1 focus:ring-teal" />
        </div>
      </AccordionSection>

      {/* ── SEO ──────────────────────────────────────────── */}
      <AccordionSection title="SEO &amp; Social" description="Meta title, description and og:image overrides">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-semibold text-neutral-mid">Meta Title</label>
            <input value={form.meta_title} onChange={e => set('meta_title', e.target.value)}
              placeholder="Defaults to post title if empty"
              className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-teal focus:outline-none focus:ring-1 focus:ring-teal" />
            <p className={`mt-1 text-xs ${form.meta_title.length > 60 ? 'text-red-500' : 'text-neutral-mid'}`}>
              {form.meta_title.length}/60 chars
            </p>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-neutral-mid">Meta Description</label>
            <input value={form.meta_description} onChange={e => set('meta_description', e.target.value)}
              placeholder="Defaults to excerpt if empty"
              className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-teal focus:outline-none focus:ring-1 focus:ring-teal" />
            <p className={`mt-1 text-xs ${form.meta_description.length > 160 ? 'text-red-500' : 'text-neutral-mid'}`}>
              {form.meta_description.length}/160 chars
            </p>
          </div>
        </div>
      </AccordionSection>

      {/* ── CTA ──────────────────────────────────────────── */}
      <AccordionSection title="CTA Button" description="Optional call-to-action displayed at the end of the post">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-semibold text-neutral-mid">Button text</label>
            <input value={form.cta_text} onChange={e => set('cta_text', e.target.value)}
              placeholder="e.g. Learn more"
              className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-teal focus:outline-none focus:ring-1 focus:ring-teal" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-neutral-mid">Destination URL</label>
            <input value={form.cta_url} onChange={e => set('cta_url', e.target.value)}
              placeholder="e.g. /contact or https://…"
              className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-teal focus:outline-none focus:ring-1 focus:ring-teal" />
          </div>
        </div>
        {form.cta_text && (
          <div className="flex items-center gap-3">
            <span className="text-xs text-neutral-mid">Preview:</span>
            <span className="inline-flex items-center rounded-lg bg-teal px-4 py-1.5 text-xs font-semibold text-white">
              {form.cta_text}
            </span>
            <span className="text-xs text-neutral-mid">to {form.cta_url || '/'}</span>
          </div>
        )}
      </AccordionSection>

      {/* ── Special Message ───────────────────────────────── */}
      <AccordionSection title="Special Message" description="Highlighted notice shown above the table of contents">
        <div>
          <label className="mb-1 block text-xs font-semibold text-neutral-mid">Message</label>
          <RichEditor
            value={form.special_message}
            onChange={v => set('special_message', v)}
            rows={3}
            placeholder="e.g. This article was reviewed by a qualified care advisor in May 2026…"
          />
        </div>
        <div className="flex items-center gap-3">
          {[
            { value: 'blue',   hex: '#1E5BD8', label: 'Blue'   },
            { value: 'purple', hex: '#7B4DDB', label: 'Purple' },
            { value: 'teal',   hex: '#0D9488', label: 'Teal'   },
          ].map(c => (
            <button key={c.value} type="button" onClick={() => set('special_message_color', c.value)}
              className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
                form.special_message_color === c.value ? 'border-transparent text-white' : 'border-gray-200 text-neutral-dark hover:border-teal'
              }`}
              style={form.special_message_color === c.value ? { backgroundColor: c.hex } : {}}>
              <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: c.hex }} />
              {c.label}
            </button>
          ))}
        </div>
      </AccordionSection>

      {/* ── Key Info Box ──────────────────────────────────── */}
      <AccordionSection title="Key Info Box" description="Highlighted callout displayed above the 3rd heading">
        <div>
          <label className="mb-1 block text-xs font-semibold text-neutral-mid">Box title</label>
          <input value={form.key_info_title} onChange={e => set('key_info_title', e.target.value)}
            placeholder="e.g. Key things to know before you read"
            className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-teal focus:outline-none focus:ring-1 focus:ring-teal" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-neutral-mid">Content</label>
          <RichEditor
            value={form.key_info_content}
            onChange={v => set('key_info_content', v)}
            rows={4}
            placeholder="Key information you want to highlight to readers…"
          />
        </div>
      </AccordionSection>

      {/* ── FAQs ─────────────────────────────────────────── */}
      <AccordionSection title="FAQs" description="Up to 5 frequently asked questions shown at the end of the post">
        <div className="space-y-6">
          {(form.faqs as Array<{ question: string; answer: string }>).map((faq, i) => (
            <div key={i} className="space-y-2">
              <p className="text-xs font-semibold text-neutral-mid">FAQ {i + 1}</p>
              <div>
                <label className="mb-1 block text-xs text-neutral-mid">Question</label>
                <input
                  value={faq.question}
                  onChange={e => setFaq(i, 'question', e.target.value)}
                  placeholder={`e.g. What is the average cost of a care home?`}
                  className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-teal focus:outline-none focus:ring-1 focus:ring-teal"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-neutral-mid">Answer</label>
                <RichEditor
                  value={faq.answer}
                  onChange={v => setFaq(i, 'answer', v)}
                  rows={3}
                  placeholder="Write a clear, helpful answer…"
                />
              </div>
            </div>
          ))}
        </div>
      </AccordionSection>

      {/* ── Sources ───────────────────────────────────────── */}
      <AccordionSection title="Source links" description="Add authoritative references (CQC, gov.uk, NICE…). These appear as a 'Sources' list at the end of the post and are added to its structured data." defaultOpen>
        <div className="space-y-3">
          {sources.length === 0 && (
            <p className="text-xs text-neutral-mid">No sources yet. Add citations to strengthen the article&rsquo;s credibility (E-E-A-T).</p>
          )}
          {sources.map((src, i) => (
            <div key={i} className="flex items-start gap-2">
              <div className="grid flex-1 grid-cols-1 gap-2 sm:grid-cols-2">
                <input
                  value={src.label}
                  onChange={e => setSource(i, 'label', e.target.value)}
                  placeholder="Label, e.g. CQC — Fundamental standards"
                  className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-teal focus:outline-none focus:ring-1 focus:ring-teal"
                />
                <input
                  value={src.url}
                  onChange={e => setSource(i, 'url', e.target.value)}
                  placeholder="https://www.cqc.org.uk/…"
                  className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-teal focus:outline-none focus:ring-1 focus:ring-teal"
                />
              </div>
              <button type="button" onClick={() => removeSource(i)}
                className="mt-1 shrink-0 rounded-md border border-red-200 p-2 text-red-500 hover:bg-red-50">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
          <button type="button" onClick={addSource}
            className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 px-3 py-2 text-sm font-medium text-neutral-dark hover:bg-neutral-light">
            <Plus size={14} /> Add source
          </button>
        </div>
      </AccordionSection>

      {/* ── Content ───────────────────────────────────────── */}
      <AccordionSection title="Content (HTML)" description="Main body of the post — HTML supported" defaultOpen>
        <RichEditor
          value={form.content}
          onChange={v => { set('content', v); set('read_time_minutes', calcReadTime(v)) }}
          rows={22}
          token={token}
          placeholder="Write your post content here. HTML is supported — headings, paragraphs, lists, bold, links etc."
        />
        <p className="text-xs text-neutral-mid">Read time auto-calculates as you type.</p>
      </AccordionSection>

      {saveError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">Save failed: {saveError}</div>
      )}

      <div className="flex gap-2 pt-1">
        <Button onClick={() => onSave(form)} disabled={saving || !form.title.trim() || !form.slug.trim()}>
          {saving ? <Loader2 size={14} className="mr-1 animate-spin" /> : <Check size={14} className="mr-1" />}
          {saving ? 'Saving…' : 'Save Post'}
        </Button>
        <Button variant="secondary" onClick={onCancel} disabled={saving}><X size={14} className="mr-1" />Cancel</Button>
      </div>
    </div>
  )
}

// ─── Site Pages ───────────────────────────────────────────────────────────────

const FOOTER_GROUPS = ['Product', 'Trust & Legal', 'Company', 'Get Started'] as const

// Primary marketing pages surfaced under the "Main site pages" tab (and excluded
// from the generic "Pages" tab so nothing is duplicated across tabs).
const MAIN_SITE_PATHS_SET = new Set(['/', '/about', '/how-it-works', '/pricing', '/care-policies', '/policy-gap-detection', '/staff-training', '/hr-policies', '/care-audits', '/cqc-compliance', '/business-continuity', '/who-we-serve', '/who-its-for', '/cqc-report-chat', '/contact', '/demo', '/faq', '/trust', '/case-studies'])

const DEFAULT_PAGES: Array<{ path: string; title: string; footer_group?: string; footer_label?: string }> = [
  { path: '/',                      title: 'Home' },
  { path: '/how-it-works',          title: 'How It Works',              footer_group: 'Product',      footer_label: 'How It Works' },
  { path: '/care-policies',         title: 'Care Policies',             footer_group: 'Product',      footer_label: 'Features' },
  { path: '/pricing',               title: 'Pricing',                   footer_group: 'Product',      footer_label: 'Pricing' },
  { path: '/who-its-for',           title: "Who It's For",              footer_group: 'Product',      footer_label: "Who It's For" },
  { path: '/cqc-compliance',        title: 'CQC & Compliance',          footer_group: 'Product',      footer_label: 'CQC & Compliance' },
  { path: '/staff-training',        title: 'Staff Training',            footer_group: 'Product',      footer_label: 'Staff Training' },
  { path: '/regulatory-knowledge',  title: 'Regulatory Knowledge',      footer_group: 'Product',      footer_label: 'Regulatory Knowledge' },
  { path: '/demo',                  title: 'Book a Demo',               footer_group: 'Product',      footer_label: 'Book a Demo' },
  { path: '/hr-policies',           title: 'HR Policies',               footer_group: 'Product',      footer_label: 'HR Policies' },
  { path: '/care-audits',           title: 'Care Audits',               footer_group: 'Product',      footer_label: 'Care Audits' },
  { path: '/cqc-staff-questions',   title: 'CQC Staff Questions',       footer_group: 'Product',      footer_label: 'CQC Staff Questions' },
  { path: '/business-continuity',   title: 'Business Continuity',       footer_group: 'Product',      footer_label: 'Business Continuity' },
  { path: '/cqc-report-chat',       title: 'CQC Report Chat',           footer_group: 'Product',      footer_label: 'CQC Report Chat' },
  { path: '/trust',                 title: 'Trust & Security',          footer_group: 'Trust & Legal', footer_label: 'Trust & Security' },
  { path: '/rag',                   title: 'How Our AI Works',          footer_group: 'Trust & Legal', footer_label: 'How Our AI Works' },
  { path: '/privacy',               title: 'Privacy Policy',            footer_group: 'Trust & Legal', footer_label: 'Privacy Policy' },
  { path: '/terms',                 title: 'Terms of Service',          footer_group: 'Trust & Legal', footer_label: 'Terms of Service' },
  { path: '/dpa',                   title: 'Data Processing Agreement', footer_group: 'Trust & Legal', footer_label: 'Data Processing Agreement' },
  { path: '/cookies',               title: 'Cookie Policy',             footer_group: 'Trust & Legal', footer_label: 'Cookie Policy' },
  { path: '/about',                 title: 'About',                     footer_group: 'Company',      footer_label: 'About' },
  { path: '/case-studies',          title: 'Case Studies',              footer_group: 'Company',      footer_label: 'Case Studies' },
  { path: '/blog',                  title: 'Blog',                      footer_group: 'Company',      footer_label: 'Blog' },
  { path: '/faq',                   title: 'FAQ',                       footer_group: 'Company',      footer_label: 'FAQ' },
  { path: '/contact',               title: 'Contact',                   footer_group: 'Company',      footer_label: 'Contact' },
  { path: '/who-we-serve',          title: 'Who We Serve' },
  { path: '/residential-care',      title: 'Residential Care' },
  { path: '/nursing-homes',         title: 'Nursing Homes' },
  { path: '/domiciliary-care',      title: 'Domiciliary Care' },
  { path: '/live-in-care',          title: 'Live-in Care' },
  { path: '/complex-care',          title: 'Complex Care' },
  { path: '/shared-lives',          title: 'Shared Lives' },
  { path: '/substance-misuse',      title: 'Substance Misuse' },
  { path: '/hospices',              title: 'Hospices' },
  { path: '/independent-hospitals', title: 'Independent Hospitals' },
  { path: '/gp-practices',          title: 'GP Practices' },
  { path: '/dental-practices',      title: 'Dental Practices' },
  { path: '/help',                  title: 'Help Centre',               footer_group: 'Get Started',   footer_label: 'Help Centre' },
  { path: '/register',              title: 'Register',                  footer_group: 'Get Started',   footer_label: 'Start Free Trial' },
  { path: '/login',                 title: 'Login',                     footer_group: 'Get Started',   footer_label: 'Sign In' },

  // Help Centre · Getting Started
  { path: '/help/getting-started/account-setup',  title: 'Help · Setting up your account' },
  { path: '/help/getting-started/upload-policy',  title: 'Help · Uploading your first policy' },
  { path: '/help/getting-started/invite-staff',   title: 'Help · Inviting staff to use CareStreamAI' },
  { path: '/help/getting-started/email-setup',    title: 'Help · Setting up email access' },
  { path: '/help/getting-started/trial',          title: 'Help · Your 14 day trial, what is included' },

  // Help Centre · Policy Management
  { path: '/help/policies/formats',           title: 'Help · Supported document formats' },
  { path: '/help/policies/update-policy',     title: 'Help · How to update a policy' },
  { path: '/help/policies/versioning',        title: 'Help · Policy version history and archiving' },
  { path: '/help/policies/review-reminders',  title: 'Help · Setting policy review reminders' },
  { path: '/help/policies/organising',        title: 'Help · Organising your policy library' },

  // Help Centre · Staff Access and Languages
  { path: '/help/languages/how-it-works',          title: 'Help · How multilingual support works' },
  { path: '/help/languages/supported-languages',   title: 'Help · Which languages are supported' },
  { path: '/help/languages/channels',              title: 'Help · Email versus web chat, which to use' },
  { path: '/help/languages/email',                 title: 'Help · Asking questions by email' },
  { path: '/help/languages/staff-access',          title: 'Help · How staff access CareStreamAI' },

  // Help Centre · Analytics and Reporting
  { path: '/help/analytics/dashboard',           title: 'Help · Understanding your analytics dashboard' },
  { path: '/help/analytics/cqc-report',          title: 'Help · Generating a CQC Readiness Report' },
  { path: '/help/analytics/gap-detection',       title: 'Help · Policy gap detection, how it works' },
  { path: '/help/analytics/export-audit',        title: 'Help · Exporting your audit log' },
  { path: '/help/analytics/language-analytics',  title: 'Help · Understanding language analytics' },

  // Help Centre · Data and Security
  { path: '/help/security/data-storage',    title: 'Help · Where is our data stored' },
  { path: '/help/security/data-isolation',  title: 'Help · How data isolation works' },
  { path: '/help/security/dpa',             title: 'Help · Requesting your Data Processing Agreement' },
  { path: '/help/security/retention',       title: 'Help · Data retention and deletion' },

  // Help Centre · Account and Billing
  { path: '/help/billing/change-plan',       title: 'Help · Changing your plan' },
  { path: '/help/billing/cancel',            title: 'Help · Cancelling your subscription' },
  { path: '/help/billing/payment-details',   title: 'Help · Updating payment details' },
  { path: '/help/billing/group-pricing',     title: 'Help · Group pricing for multiple homes' },
]

const EMPTY_PAGE: Partial<SitePage> & { path: string } = {
  path: '', title: '', description: null, og_title: null, og_description: null, og_image_url: null,
  is_footer_page: false, footer_group: null, footer_label: null, footer_sort: 0,
  page_type: 'marketing', status: 'published', faqs: [], content: '',
}

function FaqEditor({
  faqs, onChange,
}: {
  faqs: Array<{ question: string; answer: string }>
  onChange: (faqs: Array<{ question: string; answer: string }>) => void
}) {
  const items = Array.isArray(faqs) ? faqs : []
  const update = (i: number, key: 'question' | 'answer', val: string) =>
    onChange(items.map((f, idx) => (idx === i ? { ...f, [key]: val } : f)))
  const add = () => onChange([...items, { question: '', answer: '' }])
  const remove = (i: number) => onChange(items.filter((_, idx) => idx !== i))
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir
    if (j < 0 || j >= items.length) return
    const next = items.slice()
    const tmp = next[i]; next[i] = next[j]; next[j] = tmp
    onChange(next)
  }
  return (
    <div className="space-y-3">
      {items.length === 0 && (
        <p className="text-xs text-neutral-mid">No FAQs yet. Click Add FAQ to create your first question.</p>
      )}
      {items.map((f, i) => (
        <div key={i} className="rounded-lg border border-gray-200 bg-white p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold text-neutral-mid">FAQ {i + 1}</span>
            <div className="flex items-center gap-1 text-xs">
              <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="rounded px-1.5 py-0.5 text-neutral-mid hover:bg-gray-100 disabled:opacity-30">↑</button>
              <button type="button" onClick={() => move(i, 1)} disabled={i === items.length - 1} className="rounded px-1.5 py-0.5 text-neutral-mid hover:bg-gray-100 disabled:opacity-30">↓</button>
              <button type="button" onClick={() => remove(i)} className="rounded px-2 py-0.5 font-medium text-red-600 hover:bg-red-50">Remove</button>
            </div>
          </div>
          <input
            value={f.question}
            onChange={(e) => update(i, 'question', e.target.value)}
            placeholder="Question"
            className="mb-2 w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-teal focus:outline-none focus:ring-1 focus:ring-teal"
          />
          <textarea
            value={f.answer}
            onChange={(e) => update(i, 'answer', e.target.value)}
            rows={3}
            placeholder="Answer"
            className="w-full resize-none rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-teal focus:outline-none focus:ring-1 focus:ring-teal"
          />
        </div>
      ))}
      <button type="button" onClick={add} className="rounded-md border border-teal px-3 py-1.5 text-xs font-semibold text-teal hover:bg-teal-light/40">+ Add FAQ</button>
    </div>
  )
}

function PageForm({
  initial, onSave, onCancel, saving, saveError, token, inheritedImage,
}: {
  initial:        (Partial<SitePage> & { path: string }) | null
  onSave:         (data: any) => void
  onCancel:       () => void
  saving:         boolean
  saveError:      string
  token:          string | null
  inheritedImage?: string | null
}) {
  const isNew = !initial?.id
  const [form, setForm] = useState<any>({ ...EMPTY_PAGE, ...initial })
  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }))

  const [ogUploading, setOgUploading] = useState(false)
  const [ogError,     setOgError]     = useState('')
  const ogImgInputRef = useRef<HTMLInputElement>(null)
  async function handleOgImage(file: File) {
    if (!token) return
    setOgUploading(true); setOgError('')
    try {
      const prepared = await resizeImageForUpload(file)
      if (prepared.size > 4_400_000) { setOgError('Image is too large even after compression. Please use a smaller image.'); return }
      set('og_image_url', await uploadBlogImage(token, prepared))
    } catch (e: any) {
      setOgError(e.message ?? 'Upload failed')
    } finally {
      setOgUploading(false)
    }
  }

  return (
    <div className="space-y-3 rounded-xl border border-gray-200 bg-neutral-light p-4">
      <AccordionSection title="Page Details" description="Path, title and publishing status" defaultOpen>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-semibold text-neutral-mid">URL Path *</label>
            <input
              value={form.path}
              onChange={e => set('path', e.target.value)}
              placeholder="/about"
              readOnly={!isNew}
              className={`w-full rounded-md border border-gray-200 px-3 py-2 text-sm font-mono focus:border-teal focus:outline-none focus:ring-1 focus:ring-teal ${!isNew ? 'bg-gray-50 text-neutral-mid' : ''}`}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-neutral-mid">Page Title</label>
            <input value={form.title} onChange={e => set('title', e.target.value)}
              placeholder="e.g. About CareStreamAI"
              className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-teal focus:outline-none focus:ring-1 focus:ring-teal" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-neutral-mid">Status</label>
            <select value={form.status} onChange={e => set('status', e.target.value)}
              className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-teal focus:outline-none focus:ring-1 focus:ring-teal">
              <option value="published">Published</option>
              <option value="draft">Draft</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-neutral-mid">Page Type</label>
            <select value={form.page_type} onChange={e => set('page_type', e.target.value)}
              className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-teal focus:outline-none focus:ring-1 focus:ring-teal">
              <option value="marketing">Marketing</option>
              <option value="content">Content</option>
            </select>
          </div>
        </div>
      </AccordionSection>

      <AccordionSection title="SEO Metadata" description="Meta title, description and OpenGraph" defaultOpen>
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-neutral-mid">Meta Title</label>
            <input value={form.title} onChange={e => set('title', e.target.value)}
              placeholder="Defaults to page title"
              className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-teal focus:outline-none focus:ring-1 focus:ring-teal" />
            <p className={`mt-1 text-xs ${(form.title?.length ?? 0) > 60 ? 'text-red-500' : 'text-neutral-mid'}`}>
              {form.title?.length ?? 0}/60 chars
            </p>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-neutral-mid">Meta Description *</label>
            <textarea value={form.description ?? ''} onChange={e => set('description', e.target.value)} rows={3}
              placeholder="150–160 character summary for search engines"
              className="w-full resize-none rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-teal focus:outline-none focus:ring-1 focus:ring-teal" />
            <p className={`mt-1 text-xs ${(form.description?.length ?? 0) > 160 ? 'text-red-500' : 'text-neutral-mid'}`}>
              {form.description?.length ?? 0}/160 chars
            </p>
          </div>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-semibold text-neutral-mid">OG Title</label>
              <input value={form.og_title ?? ''} onChange={e => set('og_title', e.target.value)}
                placeholder="Defaults to meta title"
                className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-teal focus:outline-none focus:ring-1 focus:ring-teal" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-neutral-mid">Social sharing image</label>
              <div className="flex items-center gap-3">
                {form.og_image_url
                  ? <img src={form.og_image_url} alt="" className="h-16 w-28 shrink-0 rounded border border-gray-200 object-cover" />
                  : inheritedImage
                    ? <img src={inheritedImage} alt="" className="h-16 w-28 shrink-0 rounded border border-teal/30 object-cover" />
                    : <div className="flex h-16 w-28 shrink-0 items-center justify-center rounded border border-dashed border-gray-300 bg-white text-[10px] text-neutral-mid">No image</div>}
                <div className="flex flex-col items-start gap-1">
                  <input ref={ogImgInputRef} type="file" accept="image/*" className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) handleOgImage(f); e.target.value = '' }} />
                  <button type="button" onClick={() => ogImgInputRef.current?.click()} disabled={ogUploading}
                    className="inline-flex items-center gap-1 rounded-md border border-gray-200 px-2.5 py-1 text-xs font-medium text-neutral-dark hover:border-teal/40 hover:text-teal disabled:opacity-50">
                    {ogUploading ? 'Uploading…' : (form.og_image_url ? 'Replace image' : 'Upload image')}
                  </button>
                  {form.og_image_url && (
                    <button type="button" onClick={() => set('og_image_url', '')} className="text-xs text-neutral-mid hover:text-red-500">Remove</button>
                  )}
                </div>
              </div>
              {!form.og_image_url && inheritedImage && (
                <p className="mt-1 text-xs text-teal">Currently using this page&rsquo;s hero image as the social image. Upload an image to override it.</p>
              )}
              <input value={form.og_image_url ?? ''} onChange={e => set('og_image_url', e.target.value)}
                placeholder="Upload above, or paste an image URL. Defaults to /og-image.png"
                className="mt-2 w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-teal focus:outline-none focus:ring-1 focus:ring-teal" />
              {ogError && <p className="mt-1 text-xs text-red-500">{ogError}</p>}
              <p className="mt-1 text-xs text-neutral-mid">Shown only when this page&rsquo;s URL is shared on social media (it does not appear on the page). Recommended 1200×630.</p>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-neutral-mid">OG Description</label>
              <input value={form.og_description ?? ''} onChange={e => set('og_description', e.target.value)}
                placeholder="Short social-share description (defaults to meta description)"
                className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-teal focus:outline-none focus:ring-1 focus:ring-teal" />
            </div>
          </div>
        </div>
      </AccordionSection>

      {form.path !== '/' && (
        <AccordionSection title="Page Content" description="The body shown on this page. Used for pages without a coded layout, such as legal and agreement pages." defaultOpen>
          <RichEditor
            value={form.content ?? ''}
            onChange={(v) => set('content', v)}
            rows={14}
            placeholder="Write the page content here…"
          />
        </AccordionSection>
      )}

      {form.path === '/' && (
        <AccordionSection title="Home Page FAQs" description="Questions and answers shown in the FAQ section on the home page" defaultOpen>
          <FaqEditor faqs={form.faqs ?? []} onChange={(faqs) => set('faqs', faqs)} />
        </AccordionSection>
      )}

      <AccordionSection title="Footer" description="Control whether this page appears in the site footer">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <input type="checkbox" id="is_footer_page" checked={Boolean(form.is_footer_page)}
              onChange={e => set('is_footer_page', e.target.checked)}
              className="h-4 w-4 accent-teal" />
            <label htmlFor="is_footer_page" className="cursor-pointer text-sm text-neutral-dark">Show in footer navigation</label>
          </div>
          {form.is_footer_page && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-neutral-mid">Footer Group</label>
                <select value={form.footer_group ?? ''} onChange={e => set('footer_group', e.target.value)}
                  className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-teal focus:outline-none focus:ring-1 focus:ring-teal">
                  <option value="">— select —</option>
                  {FOOTER_GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-neutral-mid">Footer Label</label>
                <input value={form.footer_label ?? ''} onChange={e => set('footer_label', e.target.value)}
                  placeholder="Label shown in footer"
                  className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-teal focus:outline-none focus:ring-1 focus:ring-teal" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-neutral-mid">Sort Order</label>
                <input type="number" min="0" value={form.footer_sort ?? 0}
                  onChange={e => set('footer_sort', parseInt(e.target.value) || 0)}
                  className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-teal focus:outline-none focus:ring-1 focus:ring-teal" />
              </div>
            </div>
          )}
        </div>
      </AccordionSection>

      {saveError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">Save failed: {saveError}</div>
      )}

      <div className="flex gap-2 pt-1">
        <Button onClick={() => onSave(form)} disabled={saving || !form.path.trim()}>
          {saving ? <Loader2 size={14} className="mr-1 animate-spin" /> : <Check size={14} className="mr-1" />}
          {saving ? 'Saving…' : 'Save Page'}
        </Button>
        <Button variant="secondary" onClick={onCancel} disabled={saving}><X size={14} className="mr-1" />Cancel</Button>
      </div>
    </div>
  )
}

// ─── Collection image grid editor ──────────────────────────────────────────────

function ImageGridEditor({ images, token, onChange }: {
  images: Array<{ url: string; alt: string }>
  token: string
  onChange: (imgs: Array<{ url: string; alt: string }>) => void
}) {
  const items = Array.isArray(images) ? images : []
  const [uploading, setUploading] = useState<number | null>(null)
  const [error, setError] = useState('')
  const update = (i: number, key: 'url' | 'alt', val: string) =>
    onChange(items.map((im, idx) => (idx === i ? { ...im, [key]: val } : im)))
  const add = () => onChange([...items, { url: '', alt: '' }])
  const remove = (i: number) => onChange(items.filter((_, idx) => idx !== i))

  async function handleFile(i: number, file: File) {
    if (!token) return
    setUploading(i); setError('')
    try {
      const prepared = await resizeImageForUpload(file)
      if (prepared.size > 4_400_000) { setError('Image is too large even after compression.'); return }
      const url = await uploadBlogImage(token, prepared)
      update(i, 'url', url)
    } catch (e: any) {
      setError(e?.message ?? 'Upload failed.')
    } finally {
      setUploading(null)
    }
  }

  return (
    <div className="space-y-3">
      {items.length === 0 && (
        <p className="text-xs text-neutral-mid">No images yet. Add up to a few images to show in the grid (3 works well).</p>
      )}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {items.map((im, i) => (
          <div key={i} className="rounded-lg border border-gray-200 bg-white p-3">
            <div className="mb-2 flex aspect-[4/3] items-center justify-center overflow-hidden rounded-md border border-dashed border-gray-300 bg-gray-50">
              {im.url
                ? <img src={im.url} alt={im.alt || 'Preview'} className="h-full w-full object-cover" />
                : <span className="text-xs text-gray-400">No image</span>}
            </div>
            <div className="mb-2 flex items-center gap-2">
              <label className="cursor-pointer rounded-md border border-teal px-2.5 py-1 text-xs font-semibold text-teal hover:bg-teal-light/40">
                {uploading === i ? 'Uploading…' : im.url ? 'Replace' : 'Upload'}
                <input type="file" accept="image/*" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(i, f); e.target.value = '' }} />
              </label>
              <button type="button" onClick={() => remove(i)} className="rounded px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50">Remove</button>
            </div>
            <input value={im.url} onChange={e => update(i, 'url', e.target.value)} placeholder="or paste image URL…"
              className="mb-1.5 w-full rounded-md border border-gray-200 px-2.5 py-1.5 text-xs focus:border-teal focus:outline-none focus:ring-1 focus:ring-teal" />
            <input value={im.alt} onChange={e => update(i, 'alt', e.target.value)} placeholder="Alt text (for SEO & accessibility)"
              className="w-full rounded-md border border-gray-200 px-2.5 py-1.5 text-xs focus:border-teal focus:outline-none focus:ring-1 focus:ring-teal" />
          </div>
        ))}
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <button type="button" onClick={add} className="rounded-md border border-teal px-3 py-1.5 text-xs font-semibold text-teal hover:bg-teal-light/40">+ Add image</button>
    </div>
  )
}

// ─── Collection links editor ────────────────────────────────────────────────────

function LinksEditor({ links, onChange }: {
  links: Array<{ label: string; url: string }>
  onChange: (links: Array<{ label: string; url: string }>) => void
}) {
  const items = Array.isArray(links) ? links : []
  const update = (i: number, key: 'label' | 'url', val: string) =>
    onChange(items.map((l, idx) => (idx === i ? { ...l, [key]: val } : l)))
  const add = () => onChange([...items, { label: '', url: '' }])
  const remove = (i: number) => onChange(items.filter((_, idx) => idx !== i))
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir
    if (j < 0 || j >= items.length) return
    const next = items.slice(); const t = next[i]; next[i] = next[j]; next[j] = t
    onChange(next)
  }
  return (
    <div className="space-y-2">
      {items.length === 0 && <p className="text-xs text-neutral-mid">No links yet. Add links to related pages to help visitors and search engines.</p>}
      {items.map((l, i) => (
        <div key={i} className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white p-2">
          <div className="flex flex-1 flex-col gap-1.5 sm:flex-row">
            <input value={l.label} onChange={e => update(i, 'label', e.target.value)} placeholder="Link text (e.g. Junior Cricket Pads)"
              className="flex-1 rounded-md border border-gray-200 px-2.5 py-1.5 text-xs focus:border-teal focus:outline-none focus:ring-1 focus:ring-teal" />
            <input value={l.url} onChange={e => update(i, 'url', e.target.value)} placeholder="/collections/... or https://…"
              className="flex-1 rounded-md border border-gray-200 px-2.5 py-1.5 text-xs focus:border-teal focus:outline-none focus:ring-1 focus:ring-teal" />
          </div>
          <div className="flex items-center gap-0.5 text-xs">
            <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="rounded px-1.5 py-0.5 text-neutral-mid hover:bg-gray-100 disabled:opacity-30">↑</button>
            <button type="button" onClick={() => move(i, 1)} disabled={i === items.length - 1} className="rounded px-1.5 py-0.5 text-neutral-mid hover:bg-gray-100 disabled:opacity-30">↓</button>
            <button type="button" onClick={() => remove(i)} className="rounded px-2 py-0.5 font-medium text-red-600 hover:bg-red-50">✕</button>
          </div>
        </div>
      ))}
      <button type="button" onClick={add} className="rounded-md border border-teal px-3 py-1.5 text-xs font-semibold text-teal hover:bg-teal-light/40">+ Add link</button>
    </div>
  )
}

// ─── Single social-image field (upload or paste URL) ────────────────────────────

function SingleImageField({ value, token, onChange }: {
  value: string
  token: string
  onChange: (url: string) => void
}) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  async function handleFile(file: File) {
    if (!token) return
    setUploading(true); setError('')
    try {
      const prepared = await resizeImageForUpload(file)
      if (prepared.size > 4_400_000) { setError('Image is too large even after compression.'); return }
      const url = await uploadBlogImage(token, prepared)
      onChange(url)
    } catch (e: any) {
      setError(e?.message ?? 'Upload failed.')
    } finally {
      setUploading(false)
    }
  }
  return (
    <div>
      <div className="flex items-start gap-3">
        <div className="flex h-20 w-32 shrink-0 items-center justify-center overflow-hidden rounded-md border border-dashed border-gray-300 bg-gray-50">
          {value ? <img src={value} alt="Social preview" className="h-full w-full object-cover" /> : <span className="text-xs text-gray-400">No image</span>}
        </div>
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <label className="cursor-pointer rounded-md border border-teal px-2.5 py-1 text-xs font-semibold text-teal hover:bg-teal-light/40">
              {uploading ? 'Uploading…' : value ? 'Replace image' : 'Upload image'}
              <input type="file" accept="image/*" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = '' }} />
            </label>
            {value && <button type="button" onClick={() => onChange('')} className="rounded px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50">Remove</button>}
          </div>
          <input value={value} onChange={e => onChange(e.target.value)} placeholder="or paste an image URL…"
            className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-teal focus:outline-none focus:ring-1 focus:ring-teal" />
          <p className="text-[11px] text-neutral-mid">Recommended 1200×630px. Shown when the page is shared on social media.</p>
        </div>
      </div>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  )
}

// ─── Collection form ────────────────────────────────────────────────────────────

const EMPTY_COLLECTION = {
  title: '', slug: '', status: 'draft',
  meta_title: '', meta_description: '', og_image_url: '',
  intro: '', images: [] as Array<{ url: string; alt: string }>,
  body: '', links: [] as Array<{ label: string; url: string }>,
  faqs: [] as Array<{ question: string; answer: string }>,
}

function CollectionForm({
  initial, token, onSave, onCancel, saving, saveError,
}: {
  initial?: Partial<Collection> | null
  token: string
  onSave: (data: any) => void
  onCancel: () => void
  saving: boolean
  saveError: string
}) {
  const isEdit = !!initial?.id
  const [form, setForm] = useState<any>(() => {
    const merged: any = { ...EMPTY_COLLECTION, ...(initial ?? {}) }
    for (const k of Object.keys(EMPTY_COLLECTION)) {
      if (typeof (EMPTY_COLLECTION as any)[k] === 'string' && merged[k] == null) merged[k] = ''
    }
    merged.images = Array.isArray(initial?.images) ? initial!.images : []
    merged.links  = Array.isArray(initial?.links)  ? initial!.links  : []
    merged.faqs   = Array.isArray(initial?.faqs)   ? initial!.faqs   : []
    return merged
  })
  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }))
  // Auto-fill slug from the title until the user has typed a custom slug (create only).
  const setTitle = (v: string) => setForm((f: any) => ({
    ...f, title: v,
    slug: (!isEdit && (f.slug === '' || f.slug === slugify(f.title))) ? slugify(v) : f.slug,
  }))

  const input = 'w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-teal focus:outline-none focus:ring-1 focus:ring-teal'

  return (
    <div className="space-y-4 rounded-xl border border-gray-200 bg-neutral-light p-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-semibold text-neutral-mid">Collection title *</label>
          <input value={form.title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Junior Cricket Bats" className={input} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-neutral-mid">Slug *</label>
          <div className="flex items-center gap-1">
            <span className="text-xs text-neutral-mid">/collections/</span>
            <input value={form.slug} onChange={e => set('slug', slugify(e.target.value))} placeholder="junior-cricket-bats" className={input} />
          </div>
        </div>
      </div>

      <div className="w-40">
        <label className="mb-1 block text-xs font-semibold text-neutral-mid">Status</label>
        <select value={form.status} onChange={e => set('status', e.target.value)} className={input}>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
        </select>
      </div>

      <AccordionSection title="Intro paragraph" description="Shown directly under the page heading." defaultOpen>
        <RichEditor value={form.intro} onChange={v => set('intro', v)} rows={4} placeholder="A short intro paragraph that sets up the collection…" />
      </AccordionSection>

      <AccordionSection title="Image grid" description="A grid of images below the intro. Three images works well.">
        <ImageGridEditor images={form.images} token={token} onChange={v => set('images', v)} />
      </AccordionSection>

      <AccordionSection title="Main content" description="The body content below the images — 3 to 4 paragraphs.">
        <RichEditor value={form.body} onChange={v => set('body', v)} rows={10} placeholder="Write the main content here. Headings, links and lists are all supported…" />
      </AccordionSection>

      <AccordionSection title="Page links" description="A set of links to related pages, shown below the content.">
        <LinksEditor links={form.links} onChange={v => set('links', v)} />
      </AccordionSection>

      <AccordionSection title="FAQs" description="Frequently asked questions, shown at the bottom (and emitted as FAQ schema for SEO).">
        <FaqEditor faqs={form.faqs} onChange={v => set('faqs', v)} />
      </AccordionSection>

      <AccordionSection title="SEO & social" description="Meta title, description and social sharing image.">
        <div className="space-y-3">
          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="text-xs font-semibold text-neutral-mid">Meta title</label>
              <span className={`text-[11px] ${(form.meta_title?.length ?? 0) > 60 ? 'text-red-500' : 'text-neutral-mid'}`}>{form.meta_title?.length ?? 0}/60</span>
            </div>
            <input value={form.meta_title} onChange={e => set('meta_title', e.target.value)} placeholder="Defaults to the collection title" className={input} />
          </div>
          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="text-xs font-semibold text-neutral-mid">Meta description</label>
              <span className={`text-[11px] ${(form.meta_description?.length ?? 0) > 160 ? 'text-red-500' : 'text-neutral-mid'}`}>{form.meta_description?.length ?? 0}/160</span>
            </div>
            <textarea value={form.meta_description} onChange={e => set('meta_description', e.target.value)} rows={2}
              placeholder="A one or two sentence summary for search results." className={`${input} resize-none`} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-neutral-mid">Social sharing image</label>
            <SingleImageField value={form.og_image_url} token={token} onChange={v => set('og_image_url', v)} />
          </div>
        </div>
      </AccordionSection>

      {saveError && <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{saveError}</p>}

      <div className="flex gap-2 pt-1">
        <Button onClick={() => onSave(form)} disabled={saving || !form.title.trim() || !form.slug.trim()}>
          {saving ? <Loader2 size={14} className="mr-1 animate-spin" /> : <Check size={14} className="mr-1" />}
          {saving ? 'Saving…' : 'Save Collection'}
        </Button>
        <Button variant="secondary" onClick={onCancel} disabled={saving}><X size={14} className="mr-1" />Cancel</Button>
      </div>
    </div>
  )
}

// ─── Simple string-list editor (bullets, chips) ─────────────────────────────────

function StringListEditor({ items, onChange, placeholder, textarea = false }: {
  items: string[]
  onChange: (items: string[]) => void
  placeholder: string
  textarea?: boolean
}) {
  const list = Array.isArray(items) ? items : []
  const update = (i: number, v: string) => onChange(list.map((x, idx) => (idx === i ? v : x)))
  const add = () => onChange([...list, ''])
  const remove = (i: number) => onChange(list.filter((_, idx) => idx !== i))
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir; if (j < 0 || j >= list.length) return
    const next = list.slice(); const t = next[i]; next[i] = next[j]; next[j] = t; onChange(next)
  }
  return (
    <div className="space-y-2">
      {list.map((x, i) => (
        <div key={i} className="flex items-start gap-2">
          {textarea
            ? <textarea value={x} onChange={e => update(i, e.target.value)} rows={2} placeholder={placeholder}
                className="flex-1 resize-none rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-teal focus:outline-none focus:ring-1 focus:ring-teal" />
            : <input value={x} onChange={e => update(i, e.target.value)} placeholder={placeholder}
                className="flex-1 rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-teal focus:outline-none focus:ring-1 focus:ring-teal" />}
          <div className="flex shrink-0 items-center gap-0.5 pt-1 text-xs">
            <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="rounded px-1.5 py-0.5 text-neutral-mid hover:bg-gray-100 disabled:opacity-30">↑</button>
            <button type="button" onClick={() => move(i, 1)} disabled={i === list.length - 1} className="rounded px-1.5 py-0.5 text-neutral-mid hover:bg-gray-100 disabled:opacity-30">↓</button>
            <button type="button" onClick={() => remove(i)} className="rounded px-2 py-0.5 font-medium text-red-600 hover:bg-red-50">✕</button>
          </div>
        </div>
      ))}
      <button type="button" onClick={add} className="rounded-md border border-teal px-3 py-1.5 text-xs font-semibold text-teal hover:bg-teal-light/40">+ Add</button>
    </div>
  )
}

// ─── Heading/body pair-list editor (how-it-works sections, sidebar, tiles) ───────

function PairListEditor({ items, onChange, keyA, keyB, phA, phB, richBody = false }: {
  items: Array<Record<string, string>>
  onChange: (items: Array<Record<string, string>>) => void
  keyA: string; keyB: string; phA: string; phB: string
  richBody?: boolean
}) {
  const list = Array.isArray(items) ? items : []
  const update = (i: number, k: string, v: string) => onChange(list.map((x, idx) => (idx === i ? { ...x, [k]: v } : x)))
  const add = () => onChange([...list, { [keyA]: '', [keyB]: '' }])
  const remove = (i: number) => onChange(list.filter((_, idx) => idx !== i))
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir; if (j < 0 || j >= list.length) return
    const next = list.slice(); const t = next[i]; next[i] = next[j]; next[j] = t; onChange(next)
  }
  return (
    <div className="space-y-3">
      {list.map((x, i) => (
        <div key={i} className="rounded-lg border border-gray-200 bg-white p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold text-neutral-mid">Item {i + 1}</span>
            <div className="flex items-center gap-0.5 text-xs">
              <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="rounded px-1.5 py-0.5 text-neutral-mid hover:bg-gray-100 disabled:opacity-30">↑</button>
              <button type="button" onClick={() => move(i, 1)} disabled={i === list.length - 1} className="rounded px-1.5 py-0.5 text-neutral-mid hover:bg-gray-100 disabled:opacity-30">↓</button>
              <button type="button" onClick={() => remove(i)} className="rounded px-2 py-0.5 font-medium text-red-600 hover:bg-red-50">Remove</button>
            </div>
          </div>
          <input value={x[keyA] ?? ''} onChange={e => update(i, keyA, e.target.value)} placeholder={phA}
            className="mb-2 w-full rounded-md border border-gray-200 px-3 py-2 text-sm font-medium focus:border-teal focus:outline-none focus:ring-1 focus:ring-teal" />
          {richBody
            ? <RichEditor value={x[keyB] ?? ''} onChange={v => update(i, keyB, v)} rows={3} placeholder={phB} />
            : <textarea value={x[keyB] ?? ''} onChange={e => update(i, keyB, e.target.value)} rows={2} placeholder={phB}
                className="w-full resize-none rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-teal focus:outline-none focus:ring-1 focus:ring-teal" />}
        </div>
      ))}
      <button type="button" onClick={add} className="rounded-md border border-teal px-3 py-1.5 text-xs font-semibold text-teal hover:bg-teal-light/40">+ Add item</button>
    </div>
  )
}

// ─── Feature page form ───────────────────────────────────────────────────────────

function FeaturePageForm({
  initial, token, onSave, onCancel, saving, saveError,
}: {
  initial?: Partial<FeaturePage> | null
  token: string
  onSave: (data: any) => void
  onCancel: () => void
  saving: boolean
  saveError: string
}) {
  const isEdit = !!initial?.id
  const [form, setForm] = useState(() => ({
    title:  initial?.title ?? '',
    slug:   initial?.slug ?? '',
    status: initial?.status ?? 'draft',
    meta_title: initial?.meta_title ?? '',
    meta_description: initial?.meta_description ?? '',
    og_image_url: initial?.og_image_url ?? '',
    faqs:   Array.isArray(initial?.faqs) ? initial!.faqs : [],
  }))
  const [content, setContent] = useState<FeaturePageContent>(() => ({
    ...EMPTY_FEATURE_CONTENT,
    ...(initial?.content ?? {}),
    whatItIs:   { ...EMPTY_FEATURE_CONTENT.whatItIs,   ...(initial?.content?.whatItIs ?? {}) },
    howItWorks: { ...EMPTY_FEATURE_CONTENT.howItWorks, ...(initial?.content?.howItWorks ?? {}) },
    whyItWorks: { ...EMPTY_FEATURE_CONTENT.whyItWorks, ...(initial?.content?.whyItWorks ?? {}) },
    cta:        { ...EMPTY_FEATURE_CONTENT.cta,        ...(initial?.content?.cta ?? {}) },
  }))
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }))
  const setC = (k: keyof FeaturePageContent, v: any) => setContent(c => ({ ...c, [k]: v }))
  const setTitle = (v: string) => setForm(f => ({ ...f, title: v, slug: (!isEdit && (f.slug === '' || f.slug === slugify(f.title))) ? slugify(v) : f.slug }))

  const input = 'w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-teal focus:outline-none focus:ring-1 focus:ring-teal'

  return (
    <div className="space-y-4 rounded-xl border border-gray-200 bg-neutral-light p-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-semibold text-neutral-mid">Feature title *</label>
          <input value={form.title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Voice input" className={input} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-neutral-mid">Slug *</label>
          <div className="flex items-center gap-1">
            <span className="text-xs text-neutral-mid">/features/</span>
            <input value={form.slug} onChange={e => set('slug', slugify(e.target.value))} placeholder="voice-input" className={input} />
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="w-40">
          <label className="mb-1 block text-xs font-semibold text-neutral-mid">Status</label>
          <select value={form.status} onChange={e => set('status', e.target.value)} className={input}>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-neutral-mid">Eyebrow (breadcrumb)</label>
          <input value={content.eyebrow} onChange={e => setC('eyebrow', e.target.value)} placeholder="e.g. For a diverse workforce" className={input} />
        </div>
      </div>

      <AccordionSection title="Hero" description="The intro paragraph and the small pill chips." defaultOpen>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-neutral-mid">Intro paragraph</label>
            <RichEditor value={content.intro} onChange={v => setC('intro', v)} rows={3} placeholder="One or two sentences under the heading. You can add links." />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-neutral-mid">Chips (short labels, up to 4)</label>
            <StringListEditor items={content.chips} onChange={v => setC('chips', v)} placeholder="e.g. 60+ languages" />
          </div>
        </div>
      </AccordionSection>

      <AccordionSection title="What it is" description="The opening explanation block.">
        <div className="space-y-3">
          <input value={content.whatItIs.heading} onChange={e => setC('whatItIs', { ...content.whatItIs, heading: e.target.value })} placeholder="Heading" className={input} />
          <RichEditor value={content.whatItIs.body} onChange={v => setC('whatItIs', { ...content.whatItIs, body: v })} rows={5} placeholder="The paragraph explaining what the feature is. You can add links." />
        </div>
      </AccordionSection>

      <AccordionSection title="Benefits" description="Outcome statements shown as a grid.">
        <StringListEditor items={content.outcomes} onChange={v => setC('outcomes', v)} placeholder="A benefit for the service…" textarea />
      </AccordionSection>

      <AccordionSection title="How it works" description="Heading, intro, and the numbered steps.">
        <div className="space-y-3">
          <input value={content.howItWorks.heading} onChange={e => setC('howItWorks', { ...content.howItWorks, heading: e.target.value })} placeholder="Section heading" className={input} />
          <RichEditor value={content.howItWorks.intro} onChange={v => setC('howItWorks', { ...content.howItWorks, intro: v })} rows={2} placeholder="Short intro under the heading. You can add links." />
          <p className="text-xs font-semibold text-neutral-mid">Steps</p>
          <PairListEditor items={content.howItWorks.sections} onChange={v => setC('howItWorks', { ...content.howItWorks, sections: v as any })} keyA="heading" keyB="body" phA="Step heading" phB="Step description" richBody />
        </div>
      </AccordionSection>

      <AccordionSection title="At a glance" description="The bullet list of essentials.">
        <StringListEditor items={content.keyPoints} onChange={v => setC('keyPoints', v)} placeholder="A key point…" />
      </AccordionSection>

      <AccordionSection title="Sidebar cards" description="The small cards beside the key points (e.g. Who it's for).">
        <PairListEditor items={content.sidebar} onChange={v => setC('sidebar', v as any)} keyA="title" keyB="body" phA="Card title" phB="Card text" richBody />
      </AccordionSection>

      <AccordionSection title="Why it works" description="The teal band — heading, intro and four tiles.">
        <div className="space-y-3">
          <input value={content.whyItWorks.heading} onChange={e => setC('whyItWorks', { ...content.whyItWorks, heading: e.target.value })} placeholder="Section heading" className={input} />
          <RichEditor value={content.whyItWorks.intro} onChange={v => setC('whyItWorks', { ...content.whyItWorks, intro: v })} rows={2} placeholder="Short intro under the heading. You can add links." />
          <p className="text-xs font-semibold text-neutral-mid">Tiles</p>
          <PairListEditor items={content.whyItWorks.tiles} onChange={v => setC('whyItWorks', { ...content.whyItWorks, tiles: v as any })} keyA="title" keyB="body" phA="Tile title" phB="Tile text" richBody />
        </div>
      </AccordionSection>

      <AccordionSection title="FAQs" description="Shown at the bottom and emitted as FAQ schema for SEO.">
        <FaqEditor faqs={form.faqs} onChange={v => set('faqs', v)} />
      </AccordionSection>

      <AccordionSection title="Closing call to action" description="The final banner.">
        <div className="space-y-3">
          <input value={content.cta.heading} onChange={e => setC('cta', { ...content.cta, heading: e.target.value })} placeholder="CTA heading" className={input} />
          <textarea value={content.cta.sub} onChange={e => setC('cta', { ...content.cta, sub: e.target.value })} rows={2} placeholder="CTA sub-text." className={`${input} resize-none`} />
        </div>
      </AccordionSection>

      <AccordionSection title="SEO & social" description="Meta title, description and social sharing image.">
        <div className="space-y-3">
          <input value={form.meta_title} onChange={e => set('meta_title', e.target.value)} placeholder="Meta title (defaults to the feature title)" className={input} />
          <textarea value={form.meta_description} onChange={e => set('meta_description', e.target.value)} rows={2} placeholder="Meta description" className={`${input} resize-none`} />
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-neutral-mid">Social sharing image</label>
            <SingleImageField value={form.og_image_url} token={token} onChange={v => set('og_image_url', v)} />
          </div>
        </div>
      </AccordionSection>

      {saveError && <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{saveError}</p>}

      <div className="flex gap-2 pt-1">
        <Button onClick={() => onSave({ ...form, content })} disabled={saving || !form.title.trim() || !form.slug.trim()}>
          {saving ? <Loader2 size={14} className="mr-1 animate-spin" /> : <Check size={14} className="mr-1" />}
          {saving ? 'Saving…' : 'Save Feature Page'}
        </Button>
        <Button variant="secondary" onClick={onCancel} disabled={saving}><X size={14} className="mr-1" />Cancel</Button>
      </div>
    </div>
  )
}

// ─── Design-preserving slot editor ─────────────────────────────────────────────
// Edits a page's per-slot copy overrides (content_slots) — every headline/paragraph
// on the live page, grouped by section, without changing the design.

function SlotEditor({ page, defs, token, onSaved }: {
  page: SitePage
  defs: SlotDef[]
  token: string
  onSaved: (page: SitePage) => void
}) {
  const [overrides, setOverrides] = useState<Record<string, string>>(() => ({ ...(page.content_slots ?? {}) }))
  const [saving, setSaving] = useState(false)
  const [saved, setSaved]   = useState(false)
  const [error, setError]   = useState('')
  const val = (d: SlotDef) => (typeof overrides[d.key] === 'string' ? overrides[d.key] : d.default)
  const set = (k: string, v: string) => { setOverrides(o => ({ ...o, [k]: v })); setSaved(false) }
  const reset = (k: string) => { setOverrides(o => { const n = { ...o }; delete n[k]; return n }); setSaved(false) }

  const groups: Array<{ name: string; items: SlotDef[] }> = []
  for (const d of defs) {
    const g = d.group ?? 'Content'
    let grp = groups.find(x => x.name === g)
    if (!grp) { grp = { name: g, items: [] }; groups.push(grp) }
    grp.items.push(d)
  }

  async function save() {
    if (!token) return
    setSaving(true); setError('')
    try {
      const api = createPlatformClient(token)
      // Persist only real overrides (differ from the original copy) to stay lean.
      const clean: Record<string, string> = {}
      for (const d of defs) {
        const v = overrides[d.key]
        if (typeof v === 'string' && v.trim() !== '' && v !== d.default) clean[d.key] = v
      }
      const res = page.id
        ? await api.sitePages.update(page.id, { content_slots: clean } as any)
        : await api.sitePages.upsert({ path: page.path, title: page.title, content_slots: clean } as any)
      onSaved(res.page)
      setSaved(true)
    } catch (e: any) {
      setError(e.message ?? 'Failed to save content.')
    } finally {
      setSaving(false)
    }
  }

  const input = 'w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-teal focus:outline-none focus:ring-1 focus:ring-teal'
  return (
    <div className="mb-4 rounded-xl border border-teal/30 bg-white p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-neutral-dark">Page content (design-preserving)</p>
          <p className="text-xs text-neutral-mid">Edit any text on the live page. Leave a field as-is to keep the original wording; use “Reset to original” to revert.</p>
        </div>
        <Button onClick={save} disabled={saving}>
          {saving ? <Loader2 size={14} className="mr-1 animate-spin" /> : <Check size={14} className="mr-1" />}
          {saving ? 'Saving…' : 'Save content'}
        </Button>
      </div>
      {error && <p className="mb-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <div className="space-y-3">
        {groups.map(g => (
          <AccordionSection key={g.name} title={g.name} description={`${g.items.length} fields`}>
            <div className="space-y-3">
              {g.items.map(d => {
                const overridden = typeof overrides[d.key] === 'string' && overrides[d.key] !== d.default && overrides[d.key].trim() !== ''
                return (
                  <div key={d.key}>
                    <div className="mb-1 flex items-center justify-between">
                      <label className="text-xs font-semibold text-neutral-mid">{d.label}</label>
                      {overridden && <button type="button" onClick={() => reset(d.key)} className="text-[11px] font-medium text-teal hover:underline">Reset to original</button>}
                    </div>
                    {d.rich
                      ? <RichEditor value={val(d)} onChange={v => set(d.key, v)} rows={3} />
                      : d.multiline
                        ? <textarea value={val(d)} onChange={e => set(d.key, e.target.value)} rows={3} className={`${input} resize-none`} />
                        : <input value={val(d)} onChange={e => set(d.key, e.target.value)} className={input} />}
                  </div>
                )
              })}
            </div>
          </AccordionSection>
        ))}
      </div>
      {saved && <p className="mt-3 flex items-center gap-1 text-sm font-medium text-green-600"><Check size={14} /> Saved</p>}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function BlogPage() {
  const token = usePlatformAuth()
  const [tab,  setTab]  = useState<'posts' | 'authors' | 'pages' | 'mainsite' | 'training' | 'features' | 'collections' | 'altTags'>('posts')

  // Posts state
  const [posts,     setPosts]     = useState<BlogPost[]>([])
  const [showPost,  setShowPost]  = useState(false)
  const [editPost,  setEditPost]  = useState<BlogPost | null>(null)
  const [savingPost, setSavingPost] = useState(false)
  const [postError,  setPostError]  = useState('')

  // Authors state
  const [authors,       setAuthors]       = useState<BlogAuthor[]>([])
  const [showAuthor,    setShowAuthor]    = useState(false)
  const [editAuthor,    setEditAuthor]    = useState<BlogAuthor | null>(null)
  const [savingAuthor,  setSavingAuthor]  = useState(false)

  // Pages state
  const [pages,       setPages]       = useState<SitePage[]>([])
  const [pageSubTab,  setPageSubTab]  = useState<'marketing' | 'footer'>('marketing')
  const [showPage,    setShowPage]    = useState(false)
  const [editPage,    setEditPage]    = useState<SitePage | null>(null)
  const [savingPage,  setSavingPage]  = useState(false)
  const [pageError,   setPageError]   = useState('')
  const [pageSearch,  setPageSearch]  = useState('')
  // Data-driven staff-training module pages (from the public SEO index), shown as
  // editable rows alongside the coded pages.
  const [trainingPages, setTrainingPages] = useState<Array<{ path: string; title: string; description: string; image: string | null }>>([])
  const pageEditRef = useRef<HTMLDivElement>(null)

  // Collections state
  const [collections,      setCollections]      = useState<Collection[]>([])
  const [showCollection,   setShowCollection]   = useState(false)
  const [editCollection,   setEditCollection]   = useState<Collection | null>(null)
  const [savingCollection, setSavingCollection] = useState(false)
  const [collectionError,  setCollectionError]  = useState('')

  // Feature pages state
  const [featurePages,       setFeaturePages]       = useState<FeaturePage[]>([])
  const [showFeaturePage,    setShowFeaturePage]    = useState(false)
  const [editFeaturePage,    setEditFeaturePage]    = useState<FeaturePage | null>(null)
  const [savingFeaturePage,  setSavingFeaturePage]  = useState(false)
  const [featurePageError,   setFeaturePageError]   = useState('')

  // Per-page "content updated" tracker (Pages tab) — which row is mid-save.
  const [togglingPath, setTogglingPath] = useState<string | null>(null)
  const [togglingFeature, setTogglingFeature] = useState<string | null>(null)

  // When a page is opened for editing (including from the Footer Links tab),
  // The editor opens inline under the clicked row, so only nudge it into view if it is
  // off-screen ('nearest' never jumps the page to the top).
  useEffect(() => {
    if (editPage) pageEditRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [editPage])

  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')

  useEffect(() => {
    if (!token) return
    const api = createPlatformClient(token)
    Promise.all([api.blog.posts(), api.blog.authors(), api.sitePages.list().catch(() => ({ pages: [] })), fetchTrainingSeoIndex(), api.collections.list().catch(() => ({ collections: [] })), api.featurePages.list().catch(() => ({ featurePages: [] }))])
      .then(([p, a, pg, seo, col, fp]) => { setPosts(p.posts); setAuthors(a.authors); setPages(pg.pages); setTrainingPages(seo.pages); setCollections(col.collections); setFeaturePages(fp.featurePages) })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [token])

  if (!token) return null

  // ── Post handlers ─────────────────────────────────────────────────────────

  async function savePost(form: any) {
    if (!token) return
    setSavingPost(true); setPostError('')
    try {
      const api = createPlatformClient(token)
      if (editPost) {
        const res = await api.blog.updatePost(editPost.id, form)
        setPosts(prev => prev.map(p => p.id === editPost.id ? res.post : p))
        setEditPost(null)
      } else {
        const res = await api.blog.createPost(form)
        setPosts(prev => [res.post, ...prev])
        setShowPost(false)
      }
    } catch (e: any) {
      setPostError(e.message ?? 'Failed to save post.')
    } finally {
      setSavingPost(false)
    }
  }

  async function deletePost(id: string) {
    if (!token || !confirm('Delete this post?')) return
    try {
      await createPlatformClient(token).blog.deletePost(id)
      setPosts(prev => prev.filter(p => p.id !== id))
    } catch (e: any) {
      setError(e.message)
    }
  }

  // ── Author handlers ───────────────────────────────────────────────────────

  async function saveAuthor(form: any) {
    if (!token) return
    setSavingAuthor(true)
    try {
      const api = createPlatformClient(token)
      if (editAuthor) {
        const res = await api.blog.updateAuthor(editAuthor.id, form)
        setAuthors(prev => prev.map(a => a.id === editAuthor.id ? res.author : a))
        setEditAuthor(null)
      } else {
        const res = await api.blog.createAuthor(form)
        setAuthors(prev => [...prev, res.author].sort((a, b) => a.name.localeCompare(b.name)))
        setShowAuthor(false)
      }
    } catch (e: any) {
      setError(e.message ?? 'Failed to save author.')
    } finally {
      setSavingAuthor(false)
    }
  }

  async function deleteAuthor(id: string, name: string) {
    if (!token || !confirm(`Delete "${name}"?`)) return
    try {
      await createPlatformClient(token).blog.deleteAuthor(id)
      setAuthors(prev => prev.filter(a => a.id !== id))
    } catch (e: any) {
      setError(e.message)
    }
  }

  // ── Page handlers ────────────────────────────────────────────────────────────

  async function savePage(form: any) {
    if (!token) return
    setSavingPage(true); setPageError('')
    try {
      const api = createPlatformClient(token)
      if (editPage?.id) {
        // existing DB record — patch
        const res = await api.sitePages.update(editPage.id, form)
        setPages(prev => prev.map(p => p.id === editPage.id ? res.page : p))
        setEditPage(null)
      } else {
        // new or pre-seeded default — upsert by path
        const res = await api.sitePages.upsert(form)
        setPages(prev => {
          const exists = prev.find(p => p.path === res.page.path)
          if (exists) return prev.map(p => p.path === res.page.path ? res.page : p)
          return [...prev, res.page].sort((a, b) => a.path.localeCompare(b.path))
        })
        setShowPage(false)
        setEditPage(null)
      }
    } catch (e: any) {
      setPageError(e.message ?? 'Failed to save page.')
    } finally {
      setSavingPage(false)
    }
  }

  async function deletePage(id: string, path: string) {
    if (!token || !confirm(`Remove "${path}" from the CMS?`)) return
    try {
      await createPlatformClient(token).sitePages.delete(id)
      setPages(prev => prev.filter(p => p.id !== id))
    } catch (e: any) {
      setError(e.message)
    }
  }

  // Personal "I've updated this page" marker — persists but has NO effect on the
  // live page. Upserts by path for pages that don't yet have a CMS record.
  async function toggleContentUpdated(page: SitePage) {
    if (!token) return
    const next = !page.content_updated
    setTogglingPath(page.path)
    try {
      const api = createPlatformClient(token)
      const saved = page.id
        ? (await api.sitePages.update(page.id, { content_updated: next } as any)).page
        : (await api.sitePages.upsert({ path: page.path, title: page.title, content_updated: next } as any)).page
      setPages(prev => prev.some(p => p.id === saved.id) ? prev.map(p => p.id === saved.id ? saved : p) : [...prev, saved])
    } catch (e: any) {
      setError(e.message)
    } finally {
      setTogglingPath(null)
    }
  }

  // Personal "I've reviewed/updated this feature page" marker. Persists on the record
  // but has NO effect on the live page (same as the site-pages tracker above).
  async function toggleFeatureUpdated(fp: FeaturePage) {
    if (!token) return
    const next = !fp.content_updated
    setTogglingFeature(fp.id)
    try {
      const api = createPlatformClient(token)
      const res = await api.featurePages.update(fp.id, { content_updated: next } as any)
      setFeaturePages(prev => prev.map(f => f.id === fp.id ? res.featurePage : f))
    } catch (e: any) {
      setError(e.message)
    } finally {
      setTogglingFeature(null)
    }
  }

  // ── Collection handlers ────────────────────────────────────────────────────────

  async function saveCollection(form: any) {
    if (!token) return
    setSavingCollection(true); setCollectionError('')
    try {
      const api = createPlatformClient(token)
      if (editCollection) {
        const res = await api.collections.update(editCollection.id, form)
        setCollections(prev => prev.map(c => c.id === editCollection.id ? res.collection : c))
        setEditCollection(null)
      } else {
        const res = await api.collections.create(form)
        setCollections(prev => [res.collection, ...prev])
        setShowCollection(false)
      }
    } catch (e: any) {
      setCollectionError(e.message ?? 'Failed to save collection.')
    } finally {
      setSavingCollection(false)
    }
  }

  async function deleteCollection(id: string, title: string) {
    if (!token || !confirm(`Delete the "${title}" collection?`)) return
    try {
      await createPlatformClient(token).collections.delete(id)
      setCollections(prev => prev.filter(c => c.id !== id))
    } catch (e: any) {
      setError(e.message)
    }
  }

  // ── Feature page handlers ──────────────────────────────────────────────────────

  async function saveFeaturePage(form: any) {
    if (!token) return
    setSavingFeaturePage(true); setFeaturePageError('')
    try {
      const api = createPlatformClient(token)
      if (editFeaturePage) {
        const res = await api.featurePages.update(editFeaturePage.id, form)
        setFeaturePages(prev => prev.map(f => f.id === editFeaturePage.id ? res.featurePage : f))
        setEditFeaturePage(null)
      } else {
        const res = await api.featurePages.create(form)
        setFeaturePages(prev => [...prev, res.featurePage])
        setShowFeaturePage(false)
      }
    } catch (e: any) {
      setFeaturePageError(e.message ?? 'Failed to save feature page.')
    } finally {
      setSavingFeaturePage(false)
    }
  }

  async function deleteFeaturePage(id: string, title: string) {
    if (!token || !confirm(`Delete the "${title}" feature page?`)) return
    try {
      await createPlatformClient(token).featurePages.delete(id)
      setFeaturePages(prev => prev.filter(f => f.id !== id))
    } catch (e: any) {
      setError(e.message)
    }
  }

  // Merge DEFAULT_PAGES with DB pages — DB record wins if it exists
  const mergedPages = DEFAULT_PAGES.map(def => {
    const db = pages.find(p => p.path === def.path)
    return db ?? {
      id: '',
      path:           def.path,
      title:          def.title,
      description:    null,
      og_title:       null,
      og_description: null,
      og_image_url:   null,
      is_footer_page: !!def.footer_group,
      footer_group:   def.footer_group ?? null,
      footer_label:   def.footer_label ?? null,
      footer_sort:    0,
      page_type:      'marketing',
      status:         'published',
      content_updated: false,
      content_slots:  {},
      created_at:     '',
      updated_at:     '',
    } as SitePage
  })

  // Extra DB pages not in DEFAULT_PAGES
  const extraPages = pages.filter(p => !DEFAULT_PAGES.find(d => d.path === p.path))
  const codedAndDbPages = [...mergedPages, ...extraPages]

  // Data-driven training module pages that don't yet have a DB record — shown as
  // editable virtual rows; editing one creates its site_pages record (upsert).
  const trainingVirtual = trainingPages
    .filter(tp => !codedAndDbPages.find(p => p.path === tp.path))
    .map(tp => ({
      id: '', path: tp.path, title: tp.title, description: tp.description,
      og_title: null, og_description: null, og_image_url: null,
      is_footer_page: false, footer_group: null, footer_label: null, footer_sort: 0,
      page_type: 'marketing', status: 'published', content_updated: false, content_slots: {}, created_at: '', updated_at: '',
    } as SitePage))
  const allPages = [...codedAndDbPages, ...trainingVirtual]

  // Absolute hero image per staff-training path — reused as the social image when
  // no og_image_url is set. The effective image = explicit og_image_url, else hero.
  const heroByPath: Record<string, string> = Object.fromEntries(
    trainingPages.filter(t => t.image).map(t => [t.path, `${API_URL}${t.image}`]),
  )
  const effectiveImage = (p: SitePage): string | null => p.og_image_url || heroByPath[p.path] || null

  // Which pages live under the dedicated Main site / Training tabs.
  const isTrainingPath = (p: SitePage) => p.path.startsWith('/staff-training/')
  const isMainSitePath = (p: SitePage) => MAIN_SITE_PATHS_SET.has(p.path)
  const trainingPagesList = allPages.filter(isTrainingPath)
  const mainSitePagesList = allPages.filter(isMainSitePath)

  // The generic "Pages" tab shows everything that ISN'T already surfaced under the
  // dedicated Main site pages / Training pages tabs, so there are no duplicates.
  const otherPages = allPages.filter(p => !isTrainingPath(p) && !isMainSitePath(p))
  const filteredPages = pageSearch
    ? otherPages.filter(p => p.path.includes(pageSearch.toLowerCase()) || p.title.toLowerCase().includes(pageSearch.toLowerCase()))
    : otherPages

  // Footer grouped view
  const footerPages = allPages.filter(p => p.is_footer_page && p.footer_group)
  const footerByGroup = FOOTER_GROUPS.reduce<Record<string, SitePage[]>>((acc, g) => {
    acc[g] = footerPages.filter(p => p.footer_group === g).sort((a, b) => (a.footer_sort ?? 0) - (b.footer_sort ?? 0))
    return acc
  }, {} as any)

  const publishedCount = posts.filter(p => p.status === 'published').length
  const featuredCount  = posts.filter(p => p.is_featured).length

  // One page row (with its inline editor) — shared by the Pages, Training pages
  // and Main site pages tabs so they all get the same content + FAQ editor.
  const renderPageRow = (page: SitePage) => (
    <div key={page.path}>
      <div className={`flex items-center justify-between gap-4 px-5 py-3.5 hover:bg-neutral-light/50 ${editPage?.path === page.path ? 'bg-teal-light/30' : ''}`}>
        {(() => {
          const img = effectiveImage(page)
          return img
            ? <img src={img} alt="" title="Social sharing image" className="h-9 w-14 shrink-0 rounded border border-gray-200 object-cover" />
            : <div className="flex h-9 w-14 shrink-0 items-center justify-center rounded border border-dashed border-gray-200 text-[9px] text-neutral-mid" title="No social sharing image">none</div>
        })()}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Globe size={12} className="shrink-0 text-neutral-mid" />
            <span className="font-mono text-xs text-neutral-mid">{page.path}</span>
            {page.title && <span className="text-sm font-medium text-neutral-dark">{page.title}</span>}
            {page.is_footer_page && page.footer_group && (
              <span className="rounded-full bg-teal-light px-2 py-0.5 text-xs font-medium text-teal">{page.footer_group}</span>
            )}
            {!page.id && (
              <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-600">not in CMS</span>
            )}
          </div>
          {page.description ? (
            <p className="mt-0.5 max-w-xl truncate text-xs text-neutral-mid">{page.description}</p>
          ) : (
            <p className="mt-0.5 text-xs text-amber-500">No meta description — click Edit to add one</p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => toggleContentUpdated(page)}
            disabled={togglingPath === page.path}
            title={page.content_updated ? 'Marked as updated — click to unmark. This is just your tracker; it does not change the live page.' : "Mark as updated. Just your own tracker; it doesn't change the live page."}
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${page.content_updated ? 'border-green-300 bg-green-50 text-green-700' : 'border-gray-200 text-neutral-mid hover:bg-neutral-light'}`}
          >
            {togglingPath === page.path ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <span className={`relative h-3.5 w-6 rounded-full transition-colors ${page.content_updated ? 'bg-green-500' : 'bg-gray-300'}`}>
                <span className={`absolute top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full bg-white shadow transition-all ${page.content_updated ? 'left-3' : 'left-0.5'}`} />
              </span>
            )}
            {page.content_updated ? 'Updated' : 'Mark updated'}
          </button>
          {page.id && (
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${page.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
              {page.status}
            </span>
          )}
          <button
            onClick={() => { setShowPage(false); setEditPage(page.id ? page : { ...page }) }}
            className="rounded-md border border-gray-200 p-1.5 text-neutral-mid hover:bg-neutral-light hover:text-neutral-dark"
          >
            <Pencil size={14} />
          </button>
          {page.id && (
            <button
              onClick={() => deletePage(page.id, page.path)}
              className="rounded-md border border-red-200 p-1.5 text-red-500 hover:bg-red-50"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>
      {editPage?.path === page.path && (
        <div ref={pageEditRef} className="scroll-mt-4 border-t border-teal/30 bg-teal-light/10 px-5 py-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-neutral-dark">
              Editing <span className="font-mono text-teal">{editPage.path}</span>
            </p>
            <a href={editPage.path} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-teal/40 bg-white px-3 py-1.5 text-xs font-semibold text-teal transition hover:bg-teal hover:text-white">
              Open page in new window <span aria-hidden>↗</span>
            </a>
          </div>
          {(() => {
            const defs = slotsForPath(editPage.path)
            return defs ? (
              <SlotEditor
                page={editPage}
                defs={defs}
                token={token}
                onSaved={(p) => {
                  setPages(prev => prev.some(x => x.id === p.id) ? prev.map(x => x.id === p.id ? p : x) : [...prev, p])
                  setEditPage(p)
                }}
              />
            ) : null
          })()}
          <PageForm
            initial={editPage}
            onSave={savePage}
            onCancel={() => setEditPage(null)}
            saving={savingPage}
            saveError={pageError}
            token={token}
            inheritedImage={editPage ? heroByPath[editPage.path] ?? null : null}
          />
        </div>
      )}
    </div>
  )

  return (
    <PlatformShell>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-neutral-dark">Blog &amp; Pages</h1>
        </div>

        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex gap-6 overflow-x-auto">
            {(['posts', 'authors', 'pages', 'mainsite', 'training', 'features', 'collections', 'altTags'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`whitespace-nowrap pb-3 text-sm font-medium transition-colors ${
                  tab === t
                    ? 'border-b-2 border-teal text-teal'
                    : 'text-neutral-mid hover:text-neutral-dark'
                }`}
              >
                {t === 'posts' ? `Posts (${posts.length})` : t === 'authors' ? `Authors (${authors.length})` : t === 'pages' ? `Pages (${allPages.length})` : t === 'mainsite' ? `Main site pages (${mainSitePagesList.length})` : t === 'training' ? `Training pages (${trainingPagesList.length})` : t === 'features' ? `Features pages (${featurePages.length})` : t === 'collections' ? `Collections (${collections.length})` : 'Alt Tags'}
              </button>
            ))}
          </nav>
        </div>

        {/* ── Posts tab ───────────────────────────────────────────────────── */}
        {tab === 'posts' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-neutral-mid">
                {publishedCount} published · {featuredCount} featured
              </p>
              {!showPost && !editPost && (
                <Button onClick={() => setShowPost(true)}>
                  <Plus size={14} className="mr-1" /> New Post
                </Button>
              )}
            </div>

            {showPost && (
              <PostForm
                authors={authors}
                token={token}
                onSave={savePost}
                onCancel={() => setShowPost(false)}
                saving={savingPost}
                saveError={postError}
              />
            )}

            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
              {loading ? (
                <div className="flex justify-center py-10">
                  <Loader2 size={24} className="animate-spin text-neutral-mid" />
                </div>
              ) : posts.length === 0 ? (
                <p className="py-10 text-center text-sm text-neutral-mid">No posts yet. Click "New Post" to create one.</p>
              ) : (
                <div className="divide-y divide-gray-100">
                  {posts.map(post => (
                    <div key={post.id}>
                      {editPost?.id === post.id ? (
                        <div className="p-4">
                          <PostForm
                            initial={editPost}
                            authors={authors}
                            token={token}
                            onSave={savePost}
                            onCancel={() => setEditPost(null)}
                            saving={savingPost}
                            saveError={postError}
                          />
                        </div>
                      ) : (
                        <div className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-neutral-light/50">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-sm font-medium text-neutral-dark">{post.title}</p>
                              {post.is_featured && (
                                <span className="rounded-full bg-teal-light px-2 py-0.5 text-xs font-medium text-teal">Featured</span>
                              )}
                            </div>
                            <p className="mt-0.5 text-xs text-neutral-mid">
                              /blog/{post.slug} · {post.category}
                              {post.publication_date ? ` · ${new Date(post.publication_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}` : ''}
                              {post.read_time_minutes ? ` · ${post.read_time_minutes} min read` : ''}
                              {post.author?.name ? ` · ${post.author.name}` : ''}
                            </p>
                            {post.excerpt && (
                              <p className="mt-0.5 max-w-lg truncate text-xs text-neutral-mid">{post.excerpt}</p>
                            )}
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLOURS[post.status] ?? 'bg-gray-100 text-gray-600'}`}>
                              {post.status}
                            </span>
                            <button
                              onClick={() => { setEditPost(post); setShowPost(false) }}
                              className="rounded-md border border-gray-200 p-1.5 text-neutral-mid hover:bg-neutral-light hover:text-neutral-dark"
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              onClick={() => deletePost(post.id)}
                              className="rounded-md border border-red-200 p-1.5 text-red-500 hover:bg-red-50"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Authors tab ─────────────────────────────────────────────────── */}
        {tab === 'authors' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-neutral-mid">{authors.length} author{authors.length !== 1 ? 's' : ''}</p>
              {!showAuthor && !editAuthor && (
                <Button onClick={() => setShowAuthor(true)}>
                  <Plus size={14} className="mr-1" /> Add Author
                </Button>
              )}
            </div>

            {showAuthor && (
              <AuthorForm
                onSave={saveAuthor}
                onCancel={() => setShowAuthor(false)}
                saving={savingAuthor}
                token={token}
              />
            )}

            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
              {loading ? (
                <div className="flex justify-center py-10">
                  <Loader2 size={24} className="animate-spin text-neutral-mid" />
                </div>
              ) : authors.length === 0 ? (
                <p className="py-10 text-center text-sm text-neutral-mid">No authors yet. Add one above.</p>
              ) : (
                <div className="divide-y divide-gray-100">
                  {authors.map(author => (
                    <div key={author.id}>
                      {editAuthor?.id === author.id ? (
                        <div className="p-4">
                          <AuthorForm
                            initial={editAuthor}
                            onSave={saveAuthor}
                            onCancel={() => setEditAuthor(null)}
                            saving={savingAuthor}
                            token={token}
                          />
                        </div>
                      ) : (
                        <div className="flex items-center gap-4 px-5 py-4 hover:bg-neutral-light/50">
                          {author.photo_url ? (
                            <img src={author.photo_url} alt={author.name} className="h-11 w-11 shrink-0 rounded-full border object-cover" />
                          ) : (
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-teal-light">
                              <User size={18} className="text-teal" />
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-neutral-dark">{author.name}</p>
                            {author.title && <p className="text-xs font-medium text-teal">{author.title}</p>}
                            {author.bio && <p className="max-w-lg truncate text-xs text-neutral-mid">{author.bio}</p>}
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            <button
                              onClick={() => { setEditAuthor(author); setShowAuthor(false) }}
                              className="rounded-md border border-gray-200 p-1.5 text-neutral-mid hover:bg-neutral-light hover:text-neutral-dark"
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              onClick={() => deleteAuthor(author.id, author.name)}
                              className="rounded-md border border-red-200 p-1.5 text-red-500 hover:bg-red-50"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
        {/* ── Pages tab ───────────────────────────────────────────────────── */}
        {tab === 'pages' && (
          <div className="space-y-4">

            {/* Sub-tab bar */}
            <div className="flex items-center justify-between">
              <div className="flex gap-1 rounded-lg border border-gray-200 bg-gray-50 p-1">
                {(['marketing', 'footer'] as const).map(st => (
                  <button
                    key={st}
                    onClick={() => setPageSubTab(st)}
                    className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
                      pageSubTab === st ? 'bg-white text-neutral-dark shadow-sm' : 'text-neutral-mid hover:text-neutral-dark'
                    }`}
                  >
                    {st === 'marketing' ? 'Marketing Pages' : 'Footer Links'}
                  </button>
                ))}
              </div>
              {pageSubTab === 'marketing' && !showPage && !editPage && (
                <Button onClick={() => setShowPage(true)}>
                  <Plus size={14} className="mr-1" /> New Page
                </Button>
              )}
            </div>

            {/* ── Marketing Pages sub-tab ── */}
            {pageSubTab === 'marketing' && (
              <div className="space-y-4">
                {/* Search + your update-tracker progress */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <input
                    value={pageSearch}
                    onChange={e => setPageSearch(e.target.value)}
                    placeholder="Search pages by path or title…"
                    className="w-full max-w-sm rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-teal focus:outline-none focus:ring-1 focus:ring-teal"
                  />
                  {(() => {
                    const done = allPages.filter(p => p.content_updated).length
                    return (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs font-medium text-green-700">
                        <Check size={13} /> {done} of {allPages.length} marked updated
                      </span>
                    )
                  })()}
                </div>

                {showPage && (
                  <PageForm
                    initial={null}
                    onSave={savePage}
                    onCancel={() => setShowPage(false)}
                    saving={savingPage}
                    saveError={pageError}
                    token={token}
                  />
                )}

                <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
                  {loading ? (
                    <div className="flex justify-center py-10">
                      <Loader2 size={24} className="animate-spin text-neutral-mid" />
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {filteredPages.map(renderPageRow)}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── Footer Links sub-tab ── */}
            {pageSubTab === 'footer' && (
              <div className="grid gap-5 md:grid-cols-2">
                {FOOTER_GROUPS.map(group => (
                  <div key={group} className="overflow-hidden rounded-xl border border-gray-200 bg-white">
                    <div className="border-b border-gray-100 bg-neutral-light px-5 py-3">
                      <p className="text-sm font-semibold text-neutral-dark">{group}</p>
                      <p className="text-xs text-neutral-mid">{(footerByGroup[group] ?? []).length} links</p>
                    </div>
                    <div className="divide-y divide-gray-100">
                      {(footerByGroup[group] ?? []).length === 0 ? (
                        <p className="px-5 py-4 text-xs text-neutral-mid">No links in this group.</p>
                      ) : (
                        (footerByGroup[group] ?? []).map(page => (
                          <div key={page.path} className="flex items-center justify-between px-5 py-3 hover:bg-neutral-light/50">
                            <div>
                              <p className="text-sm font-medium text-neutral-dark">{page.footer_label || page.title}</p>
                              <p className="font-mono text-xs text-neutral-mid">{page.path}</p>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs text-neutral-mid">#{page.footer_sort}</span>
                              <button
                                onClick={() => { setEditPage(page); setPageSubTab('marketing') }}
                                className="rounded-md border border-gray-200 p-1.5 text-neutral-mid hover:bg-neutral-light hover:text-neutral-dark"
                              >
                                <Pencil size={12} />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                    <div className="border-t border-gray-100 px-5 py-3">
                      <button
                        onClick={() => { setPageSubTab('marketing'); setShowPage(true) }}
                        className="flex items-center gap-1.5 text-xs font-medium text-teal hover:underline"
                      >
                        <Plus size={12} /> Add link to {group}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Main site pages tab ─────────────────────────────────────────── */}
        {tab === 'mainsite' && (
          <div className="space-y-4">
            <p className="text-sm text-neutral-mid">
              Your primary marketing pages (<code className="rounded bg-neutral-light px-1 py-0.5 text-xs">/about</code>, <code className="rounded bg-neutral-light px-1 py-0.5 text-xs">/how-it-works</code> and more). Click Edit to change the SEO, add an editable content section and FAQs — these appear on the live page. Use <strong>Mark updated</strong> to track your progress.
            </p>
            {loading ? (
              <div className="flex justify-center py-10"><Loader2 size={24} className="animate-spin text-neutral-mid" /></div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-gray-200 bg-white divide-y divide-gray-100">
                {mainSitePagesList.map(renderPageRow)}
              </div>
            )}
          </div>
        )}

        {/* ── Training pages tab ───────────────────────────────────────────── */}
        {tab === 'training' && (
          <div className="space-y-4">
            <p className="text-sm text-neutral-mid">
              The per-module training pages at <code className="rounded bg-neutral-light px-1 py-0.5 text-xs">/staff-training/&hellip;</code>. Click Edit to change the SEO, add an editable content section and FAQs — these appear on the live page below the module content.
            </p>
            {loading ? (
              <div className="flex justify-center py-10"><Loader2 size={24} className="animate-spin text-neutral-mid" /></div>
            ) : trainingPagesList.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-300 bg-neutral-light/40 px-6 py-10 text-center text-sm text-neutral-mid">
                No training pages found yet.
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-gray-200 bg-white divide-y divide-gray-100">
                {trainingPagesList.map(renderPageRow)}
              </div>
            )}
          </div>
        )}

        {/* ── Features pages tab ──────────────────────────────────────────── */}
        {tab === 'features' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <p className="text-sm text-neutral-mid">
                The <code className="rounded bg-neutral-light px-1 py-0.5 text-xs">/features/&hellip;</code> pages linked from the pricing list. Edit the content and FAQs; publishing submits the page for indexing and adds it to the sitemap.
              </p>
              {!showFeaturePage && !editFeaturePage && (
                <Button onClick={() => setShowFeaturePage(true)}>
                  <Plus size={14} className="mr-1" /> New Feature Page
                </Button>
              )}
            </div>

            {showFeaturePage && (
              <FeaturePageForm
                token={token}
                onSave={saveFeaturePage}
                onCancel={() => setShowFeaturePage(false)}
                saving={savingFeaturePage}
                saveError={featurePageError}
              />
            )}

            {featurePages.length === 0 && !showFeaturePage ? (
              <div className="rounded-xl border border-dashed border-gray-300 bg-neutral-light/40 px-6 py-10 text-center">
                <p className="text-sm text-neutral-mid">No feature pages yet. Create one to add an editable <code className="rounded bg-white px-1 py-0.5 text-xs">/features/&hellip;</code> page.</p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
                {featurePages.map(f => (
                  <div key={f.id}>
                    <div className="flex items-center justify-between gap-4 border-b border-gray-100 px-5 py-3 last:border-0">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-semibold text-neutral-dark">{f.title || '(untitled)'}</p>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_COLOURS[f.status] ?? STATUS_COLOURS.draft}`}>{f.status}</span>
                        </div>
                        <p className="mt-0.5 truncate text-xs text-neutral-mid">
                          /features/{f.slug}
                          {f.status === 'published' && (
                            <a href={`https://carestreamai.com/features/${f.slug}`} target="_blank" rel="noreferrer" className="ml-2 text-teal hover:underline">View ↗</a>
                          )}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          type="button"
                          onClick={() => toggleFeatureUpdated(f)}
                          disabled={togglingFeature === f.id}
                          title={f.content_updated ? 'Marked as updated — click to unmark. This is just your tracker; it does not change the live page.' : "Mark as updated. Just your own tracker; it doesn't change the live page."}
                          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${f.content_updated ? 'border-green-300 bg-green-50 text-green-700' : 'border-gray-200 text-neutral-mid hover:bg-neutral-light'}`}
                        >
                          {togglingFeature === f.id ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : (
                            <span className={`relative h-3.5 w-6 rounded-full transition-colors ${f.content_updated ? 'bg-green-500' : 'bg-gray-300'}`}>
                              <span className={`absolute top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full bg-white shadow transition-all ${f.content_updated ? 'left-3' : 'left-0.5'}`} />
                            </span>
                          )}
                          {f.content_updated ? 'Updated' : 'Mark updated'}
                        </button>
                        <button onClick={() => { setEditFeaturePage(f); setShowFeaturePage(false) }} className="rounded-md p-1.5 text-neutral-mid hover:bg-neutral-light hover:text-teal" title="Edit"><Pencil size={15} /></button>
                        <button onClick={() => deleteFeaturePage(f.id, f.title)} className="rounded-md p-1.5 text-neutral-mid hover:bg-red-50 hover:text-red-600" title="Delete"><Trash2 size={15} /></button>
                      </div>
                    </div>
                    {editFeaturePage?.id === f.id && (
                      <div className="border-b border-gray-100 bg-neutral-light/40 px-5 py-4">
                        <FeaturePageForm
                          initial={editFeaturePage}
                          token={token}
                          onSave={saveFeaturePage}
                          onCancel={() => setEditFeaturePage(null)}
                          saving={savingFeaturePage}
                          saveError={featurePageError}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Collections tab ─────────────────────────────────────────────── */}
        {tab === 'collections' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-neutral-mid">
                Ecommerce-style SEO landing pages at <code className="rounded bg-neutral-light px-1 py-0.5 text-xs">/collections/&hellip;</code> — intro, image grid, content, links and FAQs.
              </p>
              {!showCollection && !editCollection && (
                <Button onClick={() => setShowCollection(true)}>
                  <Plus size={14} className="mr-1" /> New Collection
                </Button>
              )}
            </div>

            {showCollection && (
              <CollectionForm
                token={token}
                onSave={saveCollection}
                onCancel={() => setShowCollection(false)}
                saving={savingCollection}
                saveError={collectionError}
              />
            )}

            {collections.length === 0 && !showCollection ? (
              <div className="rounded-xl border border-dashed border-gray-300 bg-neutral-light/40 px-6 py-10 text-center">
                <p className="text-sm text-neutral-mid">No collections yet. Create your first one to build an SEO landing page.</p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
                {collections.map(c => (
                  <div key={c.id}>
                    <div className="flex items-center justify-between gap-4 border-b border-gray-100 px-5 py-3 last:border-0">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-semibold text-neutral-dark">{c.title || '(untitled)'}</p>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_COLOURS[c.status] ?? STATUS_COLOURS.draft}`}>{c.status}</span>
                        </div>
                        <p className="mt-0.5 truncate text-xs text-neutral-mid">
                          /collections/{c.slug}
                          {c.status === 'published' && (
                            <a href={`https://carestreamai.com/collections/${c.slug}`} target="_blank" rel="noreferrer" className="ml-2 text-teal hover:underline">View ↗</a>
                          )}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <button onClick={() => { setEditCollection(c); setShowCollection(false) }} className="rounded-md p-1.5 text-neutral-mid hover:bg-neutral-light hover:text-teal" title="Edit"><Pencil size={15} /></button>
                        <button onClick={() => deleteCollection(c.id, c.title)} className="rounded-md p-1.5 text-neutral-mid hover:bg-red-50 hover:text-red-600" title="Delete"><Trash2 size={15} /></button>
                      </div>
                    </div>
                    {editCollection?.id === c.id && (
                      <div className="border-b border-gray-100 bg-neutral-light/40 px-5 py-4">
                        <CollectionForm
                          initial={editCollection}
                          token={token}
                          onSave={saveCollection}
                          onCancel={() => setEditCollection(null)}
                          saving={savingCollection}
                          saveError={collectionError}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'altTags' && token && <AltTagsPanel token={token} />}

      </div>
    </PlatformShell>
  )
}
