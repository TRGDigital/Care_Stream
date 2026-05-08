'use client'

import { useEffect, useState } from 'react'
import { createPlatformClient } from '@/lib/platform-api'
import { usePlatformAuth } from '@/hooks/use-platform-auth'
import { PlatformShell } from '@/components/platform-shell'
import { Button } from '@/components/ui/button'
import { Sparkles, RefreshCw, ChevronDown, ChevronUp, BookOpen, Plus, X, Loader2 } from 'lucide-react'

interface SeedRow {
  slug:         string
  category:     string
  question:     string
  answer:       string
  source_name:  string
  seeded_count: number
  custom?:      boolean
}

const KNOWN_CATEGORIES = [
  'CQC & Inspection',
  'Incidents & Reporting',
  'Health & Safety',
  'Medication',
  'Infection Prevention',
  'Employment & HR',
  'Data & Privacy',
  'Mental Capacity & Rights',
  'Food Safety & Nutrition',
]

function groupByCategory(seeds: SeedRow[]): Map<string, SeedRow[]> {
  const map = new Map<string, SeedRow[]>()
  for (const seed of seeds) {
    const cat = seed.category ?? 'General'
    if (!map.has(cat)) map.set(cat, [])
    map.get(cat)!.push(seed)
  }
  return map
}

function coverageColor(seededCount: number, total: number): string {
  if (seededCount === 0)   return 'bg-red-100 text-red-700'
  if (seededCount < total) return 'bg-amber-100 text-amber-700'
  return 'bg-green-100 text-green-700'
}

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 60)
}

export default function SeedsPage() {
  const token = usePlatformAuth()

  const [seeds,        setSeeds]        = useState<SeedRow[]>([])
  const [totalTenants, setTotalTenants] = useState(0)
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState('')
  const [seedingAll,   setSeedingAll]   = useState(false)
  const [seedAllMsg,   setSeedAllMsg]   = useState('')
  const [openGroups,   setOpenGroups]   = useState<Set<string>>(new Set())
  const [expandedSlug, setExpandedSlug] = useState<string | null>(null)
  const [showAdd,      setShowAdd]      = useState(false)

  async function load(t: string) {
    setLoading(true)
    setError('')
    try {
      const data = await createPlatformClient(t).seeds.list()
      setSeeds(data.seeds)
      setTotalTenants(data.total_tenants)
    } catch (e: any) {
      setError(e.message ?? 'Failed to load seeds')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { if (token) load(token) }, [token])

  async function handleSeedAll() {
    if (!token) return
    setSeedingAll(true)
    setSeedAllMsg('')
    setError('')
    try {
      const result = await createPlatformClient(token).seeds.seedAll()
      setSeedAllMsg(`Done — ${result.total_seeded} entries added across ${result.tenants} tenant${result.tenants !== 1 ? 's' : ''}.`)
      await load(token)
    } catch (e: any) {
      setError(e.message ?? 'Seeding failed')
    } finally {
      setSeedingAll(false)
    }
  }

  function toggleGroup(category: string) {
    setOpenGroups(prev => {
      const next = new Set(prev)
      next.has(category) ? next.delete(category) : next.add(category)
      return next
    })
  }

  if (!token) return null

  const fullySeeded = seeds.filter(s => s.seeded_count >= totalTenants).length
  const partial     = seeds.filter(s => s.seeded_count > 0 && s.seeded_count < totalTenants).length
  const unseeded    = seeds.filter(s => s.seeded_count === 0).length
  const groups      = groupByCategory(seeds)
  const allCategories = Array.from(new Set([...KNOWN_CATEGORIES, ...Array.from(groups.keys())]))

  return (
    <PlatformShell>
    <div className="max-w-4xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-dark">Knowledge Seeds</h1>
          <p className="mt-1 text-sm text-neutral-mid">
            {seeds.length} generic UK care sector Q&amp;A pairs pre-loaded into every tenant across {groups.size} categories.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-neutral-dark hover:bg-neutral-light"
          >
            <Plus size={14} />
            Manually add
          </button>
          <Button onClick={handleSeedAll} disabled={seedingAll} size="md">
            <RefreshCw size={14} className={`mr-1.5 ${seedingAll ? 'animate-spin' : ''}`} />
            {seedingAll ? 'Seeding…' : 'Seed all tenants'}
          </Button>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}
      {seedAllMsg && (
        <div className="mb-4 rounded-md bg-green-50 px-4 py-3 text-sm text-green-700">{seedAllMsg}</div>
      )}

      {/* Summary cards */}
      {!loading && totalTenants > 0 && (
        <div className="mb-6 grid grid-cols-3 gap-4">
          <div className="rounded-card bg-white px-5 py-4 shadow-card">
            <p className="text-2xl font-bold text-teal">{fullySeeded}</p>
            <p className="mt-0.5 text-xs text-neutral-mid">Fully seeded across all {totalTenants} tenant{totalTenants !== 1 ? 's' : ''}</p>
          </div>
          <div className="rounded-card bg-white px-5 py-4 shadow-card">
            <p className="text-2xl font-bold text-amber-500">{partial}</p>
            <p className="mt-0.5 text-xs text-neutral-mid">Partially seeded (some tenants missing)</p>
          </div>
          <div className="rounded-card bg-white px-5 py-4 shadow-card">
            <p className="text-2xl font-bold text-red-500">{unseeded}</p>
            <p className="mt-0.5 text-xs text-neutral-mid">Not yet seeded in any tenant</p>
          </div>
        </div>
      )}

      {/* Accordion by category */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-14 animate-pulse rounded-card bg-gray-100" />
          ))}
        </div>
      ) : seeds.length === 0 ? (
        <div className="rounded-card bg-white px-6 py-8 shadow-card text-center text-sm text-neutral-mid">
          No seeds found.
        </div>
      ) : (
        <div className="space-y-3">
          {Array.from(groups.entries()).map(([category, categorySeeds]) => {
            const isOpen       = openGroups.has(category)
            const allSeeded    = categorySeeds.every(s => s.seeded_count >= totalTenants)
            const someUnseeded = categorySeeds.some(s => s.seeded_count === 0)
            const groupColor   = someUnseeded
              ? 'bg-red-100 text-red-700'
              : allSeeded
                ? 'bg-green-100 text-green-700'
                : 'bg-amber-100 text-amber-700'
            const customCount  = categorySeeds.filter(s => s.custom).length

            return (
              <div key={category} className="rounded-card bg-white shadow-card overflow-hidden">
                <button
                  className="w-full px-6 py-4 flex items-center justify-between gap-4 hover:bg-neutral-light/40 transition-colors text-left"
                  onClick={() => toggleGroup(category)}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <BookOpen size={15} className="shrink-0 text-teal" />
                    <span className="font-semibold text-sm text-neutral-dark">{category}</span>
                    <span className="text-xs text-neutral-mid">{categorySeeds.length} entries</span>
                    {customCount > 0 && (
                      <span className="inline-flex items-center rounded-full bg-teal/10 px-2 py-0.5 text-xs font-medium text-teal">
                        {customCount} custom
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${groupColor}`}>
                      {allSeeded ? 'All seeded' : someUnseeded ? 'Not seeded' : 'Partial'}
                    </span>
                    {isOpen
                      ? <ChevronUp size={14} className="text-neutral-mid" />
                      : <ChevronDown size={14} className="text-neutral-mid" />
                    }
                  </div>
                </button>

                {isOpen && (
                  <ul className="divide-y divide-gray-100 border-t border-gray-100">
                    {categorySeeds.map(seed => {
                      const isExpanded  = expandedSlug === seed.slug
                      const coverage    = totalTenants > 0 ? Math.round((seed.seeded_count / totalTenants) * 100) : 0
                      const statusColor = coverageColor(seed.seeded_count, totalTenants)

                      return (
                        <li key={seed.slug}>
                          <button
                            className="w-full px-6 py-3.5 text-left hover:bg-neutral-light/30 transition-colors"
                            onClick={() => setExpandedSlug(isExpanded ? null : seed.slug)}
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <Sparkles size={12} className={`shrink-0 ${seed.custom ? 'text-teal' : 'text-teal/70'}`} />
                                  <p className="text-sm text-neutral-dark truncate">{seed.question}</p>
                                  {seed.custom && (
                                    <span className="shrink-0 rounded-full bg-teal/10 px-1.5 py-0.5 text-[10px] font-medium text-teal">custom</span>
                                  )}
                                </div>
                                <p className="mt-0.5 ml-5 text-xs text-neutral-mid">{seed.source_name}</p>
                              </div>
                              <div className="flex items-center gap-3 shrink-0">
                                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColor}`}>
                                  {seed.seeded_count}/{totalTenants} tenants
                                  {totalTenants > 0 && ` (${coverage}%)`}
                                </span>
                                {isExpanded
                                  ? <ChevronUp size={13} className="text-neutral-mid" />
                                  : <ChevronDown size={13} className="text-neutral-mid" />
                                }
                              </div>
                            </div>
                          </button>

                          {isExpanded && (
                            <div className="border-t border-gray-50 bg-neutral-light/50 px-6 py-4">
                              <div className="mb-3">
                                <p className="text-xs font-semibold text-neutral-mid uppercase tracking-wide mb-1">Slug</p>
                                <p className="text-xs font-mono text-neutral-dark bg-gray-100 rounded px-2 py-1 inline-block">{seed.slug}</p>
                              </div>
                              <div>
                                <p className="text-xs font-semibold text-neutral-mid uppercase tracking-wide mb-1">Answer</p>
                                <p className="text-sm text-neutral-dark leading-relaxed">{seed.answer}</p>
                              </div>
                            </div>
                          )}
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>

    {showAdd && token && (
      <AddSeedModal
        token={token}
        categories={allCategories}
        onClose={() => setShowAdd(false)}
        onSaved={(newSeed) => {
          setSeeds(prev => [...prev, { ...newSeed, seeded_count: 0 }])
          setShowAdd(false)
          // Open the category accordion so the new entry is visible
          setOpenGroups(prev => new Set([...prev, newSeed.category]))
        }}
      />
    )}
    </PlatformShell>
  )
}

// ─── Add seed modal ───────────────────────────────────────────────────────────

function AddSeedModal({
  token,
  categories,
  onClose,
  onSaved,
}: {
  token:      string
  categories: string[]
  onClose:    () => void
  onSaved:    (seed: SeedRow) => void
}) {
  const [category,   setCategory]   = useState(categories[0] ?? '')
  const [customCat,  setCustomCat]  = useState('')
  const [question,   setQuestion]   = useState('')
  const [answer,     setAnswer]     = useState('')
  const [sourceName, setSourceName] = useState('')
  const [saving,     setSaving]     = useState(false)
  const [error,      setError]      = useState('')

  const useCustomCat = category === '__custom__'
  const finalCategory = useCustomCat ? customCat.trim() : category
  const autoSlug = slugify(question)

  async function handleSave() {
    if (!question.trim() || !answer.trim() || !finalCategory) return
    setSaving(true)
    setError('')
    try {
      const result = await createPlatformClient(token).seeds.create({
        slug:        autoSlug,
        category:    finalCategory,
        question:    question.trim(),
        answer:      answer.trim(),
        source_name: sourceName.trim() || finalCategory,
      })
      onSaved({ ...result, seeded_count: 0 })
    } catch (e: any) {
      setError(e.message ?? 'Failed to save seed')
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-base font-semibold text-neutral-dark">Add knowledge seed</h2>
          <button onClick={onClose} className="text-neutral-mid hover:text-neutral-dark">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4">
          {/* Category */}
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-mid">Category</label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-teal focus:outline-none focus:ring-1 focus:ring-teal"
            >
              {categories.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
              <option value="__custom__">+ New category…</option>
            </select>
            {useCustomCat && (
              <input
                type="text"
                value={customCat}
                onChange={e => setCustomCat(e.target.value)}
                placeholder="e.g. End of Life Care"
                className="mt-2 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-teal focus:outline-none focus:ring-1 focus:ring-teal"
              />
            )}
          </div>

          {/* Question */}
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-mid">Question</label>
            <textarea
              value={question}
              onChange={e => setQuestion(e.target.value)}
              rows={2}
              placeholder="e.g. What temperature should the main meal be served at?"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-teal focus:outline-none focus:ring-1 focus:ring-teal"
            />
            {question && (
              <p className="mt-1 text-xs text-neutral-mid">
                Slug: <span className="font-mono">{autoSlug}</span>
              </p>
            )}
          </div>

          {/* Answer */}
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-mid">Answer</label>
            <textarea
              value={answer}
              onChange={e => setAnswer(e.target.value)}
              rows={5}
              placeholder="Write the answer that will be seeded into every tenant's knowledge base…"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-teal focus:outline-none focus:ring-1 focus:ring-teal"
            />
          </div>

          {/* Source name */}
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-mid">Source name <span className="text-gray-400">(optional)</span></label>
            <input
              type="text"
              value={sourceName}
              onChange={e => setSourceName(e.target.value)}
              placeholder={`e.g. FSA — Food Safety Guidance`}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-teal focus:outline-none focus:ring-1 focus:ring-teal"
            />
          </div>
        </div>

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

        <p className="mt-4 text-xs text-neutral-mid">
          This seed will be added to every existing tenant immediately and to all future tenants on sign-up.
        </p>

        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm text-neutral-mid hover:bg-neutral-light"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !question.trim() || !answer.trim() || !finalCategory}
            className="flex items-center gap-2 rounded-md bg-teal px-4 py-2 text-sm font-medium text-white hover:bg-teal-dark disabled:opacity-50"
          >
            {saving && <Loader2 size={14} className="animate-spin" />}
            {saving ? 'Saving & seeding…' : 'Save & seed to all tenants'}
          </button>
        </div>
      </div>
    </div>
  )
}
