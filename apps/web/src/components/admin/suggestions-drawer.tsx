'use client'

// CareStream Suggestions: a button beside the tenant name that opens a
// right-hand drawer of live, rules-based guidance. The suggestions are
// recomputed server-side on every open, so they change as the admin works.
// Top five shown, prioritised (compliance first); each dismissible for
// 30 days. No AI involved: every line is grounded in the tenant's real data.

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Lightbulb, Loader2, RefreshCw, X } from 'lucide-react'
import { createApiClient } from '@/lib/api-client'
import { persistentCache } from '@/lib/page-cache'

type Suggestion = {
  key: string
  category: 'setup' | 'compliance' | 'training' | 'engagement' | 'onboarding' | 'features'
  priority: number
  title: string
  body: string
  cta_label: string
  href: string
}

const CATEGORY_STYLE: Record<Suggestion['category'], { label: string; chip: string }> = {
  compliance: { label: 'Compliance', chip: 'bg-amber-100 text-amber-800' },
  training:   { label: 'Training',   chip: 'bg-indigo-50 text-indigo-600' },
  engagement: { label: 'Engagement', chip: 'bg-teal/10 text-teal' },
  onboarding: { label: 'Onboarding', chip: 'bg-purple-50 text-purple-600' },
  features:   { label: 'Features',   chip: 'bg-blue-50 text-blue-600' },
  setup:      { label: 'Setup',      chip: 'bg-gray-100 text-neutral-mid' },
}

const SHOW = 5   // advice, not a nag list

export function SuggestionsButton({ token, tenantId }: { token: string; tenantId: string }) {
  const cacheKey = `admin-suggestions-${tenantId}`
  const [open,   setOpen]   = useState(false)
  const [items,  setItems]  = useState<Suggestion[]>(() => persistentCache.get<Suggestion[]>(cacheKey) ?? [])
  const [total,  setTotal]  = useState(items.length)
  const [busy,   setBusy]   = useState(false)
  const [failed, setFailed] = useState(false)

  const load = useCallback(() => {
    if (!token) return
    setBusy(true); setFailed(false)
    createApiClient(token).suggestions.list()
      .then(d => {
        setItems(d.suggestions)
        setTotal(d.total)
        persistentCache.set(cacheKey, d.suggestions)
      })
      .catch(() => setFailed(true))
      .finally(() => setBusy(false))
  }, [token, cacheKey])

  // Badge count on mount; fresh recompute every time the drawer opens.
  useEffect(load, [load])
  useEffect(() => { if (open) load() }, [open])  // eslint-disable-line react-hooks/exhaustive-deps

  async function dismiss(key: string) {
    setItems(prev => prev.filter(s => s.key !== key))
    setTotal(t => Math.max(0, t - 1))
    try { await createApiClient(token).suggestions.dismiss(key) } catch { /* it will reappear on next load */ }
  }

  const top = items.slice(0, SHOW)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="relative ml-1 flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm font-medium text-neutral-mid hover:bg-neutral-light hover:text-neutral-dark"
        title="CareStream Suggestions"
      >
        <Lightbulb size={15} className="text-amber-500" />
        <span className="hidden lg:inline">CareStream Suggestions</span>
        {total > 0 && (
          <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold leading-none text-white">
            {total}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-0 z-[75]">
          <div className="absolute inset-0 bg-black/30" onClick={() => setOpen(false)} />
          <aside className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <div className="flex items-center gap-2">
                <Lightbulb size={17} className="text-amber-500" />
                <h2 className="text-base font-bold text-neutral-dark">CareStream Suggestions</h2>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={load} disabled={busy} aria-label="Refresh" title="Refresh" className="rounded p-1.5 text-neutral-mid hover:text-neutral-dark disabled:opacity-40">
                  <RefreshCw size={15} className={busy ? 'animate-spin' : ''} />
                </button>
                <button onClick={() => setOpen(false)} aria-label="Close" className="rounded p-1.5 text-neutral-mid hover:text-neutral-dark"><X size={17} /></button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <p className="mb-3 text-xs text-neutral-mid">
                Read live from your account just now. Work through these and they clear themselves; they update as your account changes.
              </p>

              {busy && items.length === 0 ? (
                <div className="flex justify-center py-10"><Loader2 size={20} className="animate-spin text-neutral-mid" /></div>
              ) : failed && items.length === 0 ? (
                <div className="rounded-lg border border-red-100 bg-red-50 p-4 text-sm text-red-700">
                  Couldn&rsquo;t load your suggestions. <button onClick={load} className="font-semibold underline">Retry</button>
                </div>
              ) : top.length === 0 ? (
                <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">
                  Nothing to suggest right now. Your account is in good shape; check back after your next batch of work.
                </div>
              ) : (
                <div className="space-y-3">
                  {top.map(s => {
                    const style = CATEGORY_STYLE[s.category] ?? CATEGORY_STYLE.setup
                    return (
                      <div key={s.key} className="rounded-xl border border-gray-100 p-4 shadow-sm">
                        <div className="flex items-start justify-between gap-2">
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${style.chip}`}>{style.label}</span>
                          <button
                            onClick={() => dismiss(s.key)}
                            title="Hide for 30 days"
                            aria-label={`Hide suggestion: ${s.title}`}
                            className="rounded p-0.5 text-neutral-mid/50 hover:text-neutral-dark"
                          >
                            <X size={14} />
                          </button>
                        </div>
                        <p className="mt-2 text-sm font-bold text-neutral-dark">{s.title}</p>
                        <p className="mt-1 text-xs leading-relaxed text-neutral-mid">{s.body}</p>
                        <Link
                          href={s.href}
                          onClick={() => setOpen(false)}
                          className="mt-3 inline-flex items-center gap-1.5 rounded-btn bg-teal px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-dark"
                        >
                          {s.cta_label} <ArrowRight size={12} />
                        </Link>
                      </div>
                    )
                  })}
                  {total > SHOW && (
                    <p className="pt-1 text-center text-xs text-neutral-mid">
                      {total - SHOW} more suggestion{total - SHOW === 1 ? '' : 's'} will appear as you clear these.
                    </p>
                  )}
                </div>
              )}
            </div>

            <p className="border-t border-gray-100 px-5 py-3 text-[11px] text-neutral-mid">
              Hiding a suggestion snoozes it for 30 days. Completed ones disappear on their own.
            </p>
          </aside>
        </div>
      )}
    </>
  )
}
