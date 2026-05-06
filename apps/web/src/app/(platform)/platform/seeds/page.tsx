'use client'

import { useEffect, useState } from 'react'
import { createPlatformClient } from '@/lib/platform-api'
import { usePlatformAuth } from '@/hooks/use-platform-auth'
import { PlatformShell } from '@/components/platform-shell'
import { Button } from '@/components/ui/button'
import { Sparkles, RefreshCw, ChevronDown, ChevronUp, BookOpen } from 'lucide-react'

interface SeedRow {
  slug:         string
  category:     string
  question:     string
  answer:       string
  source_name:  string
  seeded_count: number
}

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
  if (seededCount === 0)     return 'bg-red-100 text-red-700'
  if (seededCount < total)   return 'bg-amber-100 text-amber-700'
  return 'bg-green-100 text-green-700'
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
        <Button onClick={handleSeedAll} disabled={seedingAll} size="md">
          <RefreshCw size={14} className={`mr-1.5 ${seedingAll ? 'animate-spin' : ''}`} />
          {seedingAll ? 'Seeding…' : 'Seed all tenants'}
        </Button>
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
            const isOpen        = openGroups.has(category)
            const allSeeded     = categorySeeds.every(s => s.seeded_count >= totalTenants)
            const someUnseeded  = categorySeeds.some(s => s.seeded_count === 0)
            const groupColor    = someUnseeded
              ? 'bg-red-100 text-red-700'
              : allSeeded
                ? 'bg-green-100 text-green-700'
                : 'bg-amber-100 text-amber-700'

            return (
              <div key={category} className="rounded-card bg-white shadow-card overflow-hidden">
                {/* Group header */}
                <button
                  className="w-full px-6 py-4 flex items-center justify-between gap-4 hover:bg-neutral-light/40 transition-colors text-left"
                  onClick={() => toggleGroup(category)}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <BookOpen size={15} className="shrink-0 text-teal" />
                    <span className="font-semibold text-sm text-neutral-dark">{category}</span>
                    <span className="text-xs text-neutral-mid">{categorySeeds.length} entries</span>
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

                {/* Entries */}
                {isOpen && (
                  <ul className="divide-y divide-gray-100 border-t border-gray-100">
                    {categorySeeds.map(seed => {
                      const isExpanded = expandedSlug === seed.slug
                      const coverage   = totalTenants > 0 ? Math.round((seed.seeded_count / totalTenants) * 100) : 0
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
                                  <Sparkles size={12} className="shrink-0 text-teal/70" />
                                  <p className="text-sm text-neutral-dark truncate">{seed.question}</p>
                                </div>
                                <p className="mt-0.5 ml-4.5 text-xs text-neutral-mid">{seed.source_name}</p>
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
    </PlatformShell>
  )
}
