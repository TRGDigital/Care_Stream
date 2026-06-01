'use client'

import React, { useEffect, useRef, useState } from 'react'
import { usePlatformAuth } from '@/hooks/use-platform-auth'
import { createPlatformClient, uploadBlogImage, type BlogAuthor, type BlogPost, type SitePage } from '@/lib/platform-api'
import { PlatformShell } from '@/components/platform-shell'
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

const EMPTY_AUTHOR = { name: '', title: '', photo_url: '', bio: '' }

function AuthorForm({
  initial, onSave, onCancel, saving,
}: {
  initial?: Partial<BlogAuthor> | null
  onSave:   (data: any) => void
  onCancel: () => void
  saving:   boolean
}) {
  const [form, setForm] = useState({ ...EMPTY_AUTHOR, ...initial })
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

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
          <label className="mb-1 block text-xs font-semibold text-neutral-mid">Photo URL</label>
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
            <input value={form.photo_url ?? ''} onChange={e => set('photo_url', e.target.value)} placeholder="Paste image URL…"
              className="flex-1 rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-teal focus:outline-none focus:ring-1 focus:ring-teal" />
          </div>
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

// ─── Rich editor ──────────────────────────────────────────────────────────────

function RichEditor({ value, onChange, rows = 6, placeholder = '' }: {
  value:       string
  onChange:    (v: string) => void
  rows?:       number
  placeholder?: string
}) {
  const ref = useRef<HTMLTextAreaElement>(null)

  function wrapSelection(before: string, after: string) {
    const el = ref.current
    if (!el) return
    const start = el.selectionStart
    const end   = el.selectionEnd
    const selected = value.slice(start, end)
    const newVal    = value.slice(0, start) + before + selected + after + value.slice(end)
    const newCursor = end + before.length + after.length
    onChange(newVal)
    requestAnimationFrame(() => { el.focus(); el.setSelectionRange(newCursor, newCursor) })
  }

  function insertLink() {
    const el = ref.current
    if (!el) return
    const start    = el.selectionStart
    const end      = el.selectionEnd
    const selected = value.slice(start, end)
    const url      = window.prompt('Enter URL:', 'https://')
    if (!url) return
    const linkText = selected || 'link text'
    const insert   = `<a href="${url}">${linkText}</a>`
    const newVal   = value.slice(0, start) + insert + value.slice(end)
    const cursor   = start + insert.length
    onChange(newVal)
    requestAnimationFrame(() => { el.focus(); el.setSelectionRange(cursor, cursor) })
  }

  // Wrap the selection in a <ul>/<ol>, one <li> per non-empty selected line.
  function insertList(ordered: boolean) {
    const el = ref.current
    if (!el) return
    const start    = el.selectionStart
    const end      = el.selectionEnd
    const selected = value.slice(start, end)
    const tag      = ordered ? 'ol' : 'ul'
    const lines    = selected ? selected.split('\n').filter(l => l.trim() !== '') : []
    const items    = (lines.length ? lines : ['']).map(l => `  <li>${l.trim()}</li>`).join('\n')
    const insert   = `<${tag}>\n${items}\n</${tag}>`
    const newVal   = value.slice(0, start) + insert + value.slice(end)
    const cursor   = start + insert.length
    onChange(newVal)
    requestAnimationFrame(() => { el.focus(); el.setSelectionRange(cursor, cursor) })
  }

  // Prompt for a URL + alt text and insert an inline <img>.
  function insertImage() {
    const el = ref.current
    if (!el) return
    const start  = el.selectionStart
    const end    = el.selectionEnd
    const url    = window.prompt('Image URL:', 'https://')
    if (!url) return
    const alt    = window.prompt('Alt text (for accessibility & SEO):', '') ?? ''
    const insert = `<img src="${url}" alt="${alt}" />`
    const newVal = value.slice(0, start) + insert + value.slice(end)
    const cursor = start + insert.length
    onChange(newVal)
    requestAnimationFrame(() => { el.focus(); el.setSelectionRange(cursor, cursor) })
  }

  return (
    <div>
      <div className="flex items-center gap-1 rounded-t-md border border-b-0 border-gray-200 bg-gray-50 px-2 py-1.5">
        <select
          value=""
          onChange={e => {
            const tag = e.target.value
            if (tag) wrapSelection(`<${tag}>`, `</${tag}>`)
            e.target.value = ''
          }}
          title="Heading — wraps the selected text"
          className="rounded border border-gray-200 bg-white px-1.5 py-0.5 text-xs text-neutral-mid hover:bg-gray-200 hover:text-neutral-dark focus:outline-none cursor-pointer">
          <option value="" disabled hidden>Heading</option>
          <option value="h1">H1 — Title</option>
          <option value="h2">H2 — Section</option>
          <option value="h3">H3 — Subsection</option>
        </select>
        <div className="mx-1 h-3.5 w-px bg-gray-300" />
        <button type="button" onClick={() => wrapSelection('<strong>', '</strong>')}
          title="Bold"
          className="rounded px-2.5 py-0.5 text-xs font-bold text-neutral-mid hover:bg-gray-200 hover:text-neutral-dark">B</button>
        <button type="button" onClick={() => wrapSelection('<em>', '</em>')}
          title="Italic"
          className="rounded px-2.5 py-0.5 text-xs italic text-neutral-mid hover:bg-gray-200 hover:text-neutral-dark">I</button>
        <div className="mx-1 h-3.5 w-px bg-gray-300" />
        <button type="button" onClick={insertLink}
          title="Insert link"
          className="rounded px-2.5 py-0.5 text-xs text-neutral-mid hover:bg-gray-200 hover:text-neutral-dark">Link</button>
        <div className="mx-1 h-3.5 w-px bg-gray-300" />
        <button type="button" onClick={() => insertList(false)}
          title="Bullet list"
          className="rounded px-2.5 py-0.5 text-xs text-neutral-mid hover:bg-gray-200 hover:text-neutral-dark">• List</button>
        <button type="button" onClick={() => insertList(true)}
          title="Numbered list"
          className="rounded px-2.5 py-0.5 text-xs text-neutral-mid hover:bg-gray-200 hover:text-neutral-dark">1. List</button>
        <button type="button" onClick={() => wrapSelection('<blockquote>', '</blockquote>')}
          title="Blockquote"
          className="rounded px-2.5 py-0.5 text-xs text-neutral-mid hover:bg-gray-200 hover:text-neutral-dark">❝ Quote</button>
        <button type="button" onClick={insertImage}
          title="Insert image"
          className="rounded px-2.5 py-0.5 text-xs text-neutral-mid hover:bg-gray-200 hover:text-neutral-dark">Image</button>
      </div>
      <textarea
        ref={ref}
        value={value}
        onChange={e => onChange(e.target.value)}
        rows={rows}
        placeholder={placeholder}
        className="w-full resize-y rounded-b-md border border-gray-200 bg-white px-3 py-2 text-sm focus:border-teal focus:outline-none focus:ring-1 focus:ring-teal"
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
  const [form, setForm] = useState<any>(() => ({
    ...EMPTY_POST,
    ...(initial ?? {}),
    publication_date: initial?.publication_date
      ? new Date(initial.publication_date).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0],
    faqs: (initial?.faqs && Array.isArray(initial.faqs) && initial.faqs.length > 0)
      ? initial.faqs
      : EMPTY_FAQS,
  }))
  const set    = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }))
  const setFaq = (i: number, field: 'question' | 'answer', val: string) =>
    set('faqs', (form.faqs as any[]).map((f, idx) => idx === i ? { ...f, [field]: val } : f))

  const [imgUploading, setImgUploading] = useState(false)
  const [imgError,     setImgError]     = useState('')
  const imgInputRef = useRef<HTMLInputElement>(null)

  async function handleImageFile(file: File) {
    if (!token) return
    setImgUploading(true); setImgError('')
    try {
      const url = await uploadBlogImage(token, file)
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

      {/* ── Content ───────────────────────────────────────── */}
      <AccordionSection title="Content (HTML)" description="Main body of the post — HTML supported" defaultOpen>
        <RichEditor
          value={form.content}
          onChange={v => { set('content', v); set('read_time_minutes', calcReadTime(v)) }}
          rows={22}
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
  { path: '/residential-care',      title: 'Residential Care' },
  { path: '/nursing-homes',         title: 'Nursing Homes' },
  { path: '/domiciliary-care',      title: 'Domiciliary Care' },
  { path: '/help',                  title: 'Help Centre',               footer_group: 'Get Started',   footer_label: 'Help Centre' },
  { path: '/register',              title: 'Register',                  footer_group: 'Get Started',   footer_label: 'Start Free Trial' },
  { path: '/login',                 title: 'Login',                     footer_group: 'Get Started',   footer_label: 'Sign In' },
]

const EMPTY_PAGE: Partial<SitePage> & { path: string } = {
  path: '', title: '', description: null, og_title: null, og_description: null, og_image_url: null,
  is_footer_page: false, footer_group: null, footer_label: null, footer_sort: 0,
  page_type: 'marketing', status: 'published',
}

function PageForm({
  initial, onSave, onCancel, saving, saveError,
}: {
  initial:    (Partial<SitePage> & { path: string }) | null
  onSave:     (data: any) => void
  onCancel:   () => void
  saving:     boolean
  saveError:  string
}) {
  const isNew = !initial?.id
  const [form, setForm] = useState<any>({ ...EMPTY_PAGE, ...initial })
  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }))

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
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-neutral-mid">OG Title</label>
              <input value={form.og_title ?? ''} onChange={e => set('og_title', e.target.value)}
                placeholder="Defaults to meta title"
                className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-teal focus:outline-none focus:ring-1 focus:ring-teal" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-neutral-mid">OG Image URL</label>
              <input value={form.og_image_url ?? ''} onChange={e => set('og_image_url', e.target.value)}
                placeholder="Defaults to /og-image.png"
                className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-teal focus:outline-none focus:ring-1 focus:ring-teal" />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-semibold text-neutral-mid">OG Description</label>
              <input value={form.og_description ?? ''} onChange={e => set('og_description', e.target.value)}
                placeholder="Short social-share description (defaults to meta description)"
                className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-teal focus:outline-none focus:ring-1 focus:ring-teal" />
            </div>
          </div>
        </div>
      </AccordionSection>

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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function BlogPage() {
  const token = usePlatformAuth()
  const [tab,  setTab]  = useState<'posts' | 'authors' | 'pages'>('posts')

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

  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')

  useEffect(() => {
    if (!token) return
    const api = createPlatformClient(token)
    Promise.all([api.blog.posts(), api.blog.authors(), api.sitePages.list().catch(() => ({ pages: [] }))])
      .then(([p, a, pg]) => { setPosts(p.posts); setAuthors(a.authors); setPages(pg.pages) })
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
      created_at:     '',
      updated_at:     '',
    } as SitePage
  })

  // Extra DB pages not in DEFAULT_PAGES
  const extraPages = pages.filter(p => !DEFAULT_PAGES.find(d => d.path === p.path))
  const allPages   = [...mergedPages, ...extraPages]

  const filteredPages = pageSearch
    ? allPages.filter(p => p.path.includes(pageSearch.toLowerCase()) || p.title.toLowerCase().includes(pageSearch.toLowerCase()))
    : allPages

  // Footer grouped view
  const footerPages = allPages.filter(p => p.is_footer_page && p.footer_group)
  const footerByGroup = FOOTER_GROUPS.reduce<Record<string, SitePage[]>>((acc, g) => {
    acc[g] = footerPages.filter(p => p.footer_group === g).sort((a, b) => (a.footer_sort ?? 0) - (b.footer_sort ?? 0))
    return acc
  }, {} as any)

  const publishedCount = posts.filter(p => p.status === 'published').length
  const featuredCount  = posts.filter(p => p.is_featured).length

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
          <nav className="-mb-px flex gap-6">
            {(['posts', 'authors', 'pages'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`pb-3 text-sm font-medium transition-colors ${
                  tab === t
                    ? 'border-b-2 border-teal text-teal'
                    : 'text-neutral-mid hover:text-neutral-dark'
                }`}
              >
                {t === 'posts' ? `Posts (${posts.length})` : t === 'authors' ? `Authors (${authors.length})` : `Pages (${allPages.length})`}
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
                {/* Search */}
                <input
                  value={pageSearch}
                  onChange={e => setPageSearch(e.target.value)}
                  placeholder="Search pages by path or title…"
                  className="w-full max-w-sm rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-teal focus:outline-none focus:ring-1 focus:ring-teal"
                />

                {showPage && (
                  <PageForm
                    initial={null}
                    onSave={savePage}
                    onCancel={() => setShowPage(false)}
                    saving={savingPage}
                    saveError={pageError}
                  />
                )}

                <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
                  {loading ? (
                    <div className="flex justify-center py-10">
                      <Loader2 size={24} className="animate-spin text-neutral-mid" />
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {filteredPages.map(page => (
                        <div key={page.path}>
                          {editPage?.id === page.id ? (
                            <div className="p-4">
                              <PageForm
                                initial={editPage}
                                onSave={savePage}
                                onCancel={() => setEditPage(null)}
                                saving={savingPage}
                                saveError={pageError}
                              />
                            </div>
                          ) : (
                            <div className="flex items-center justify-between gap-4 px-5 py-3.5 hover:bg-neutral-light/50">
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
                                {page.id && (
                                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${page.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                    {page.status}
                                  </span>
                                )}
                                <button
                                  onClick={() => {
                                    setShowPage(false)
                                    setEditPage(page.id ? page : { ...page })
                                  }}
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
                          )}
                        </div>
                      ))}
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

      </div>
    </PlatformShell>
  )
}
