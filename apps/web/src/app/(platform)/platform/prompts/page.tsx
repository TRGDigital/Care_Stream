'use client'

import { useEffect, useState } from 'react'
import { usePlatformAuth } from '@/hooks/use-platform-auth'
import { createPlatformClient } from '@/lib/platform-api'
import { PlatformShell } from '@/components/platform-shell'
import { Loader2 } from 'lucide-react'

interface Prompt {
  id:      string
  label:   string
  content: string
}

export default function PromptsPage() {
  const token                   = usePlatformAuth()
  const [prompts, setPrompts]   = useState<Prompt[]>([])
  const [active,  setActive]    = useState<string | null>(null)
  const [loading, setLoading]   = useState(true)
  const [error,   setError]     = useState<string | null>(null)

  useEffect(() => {
    if (!token) return
    createPlatformClient(token).prompts()
      .then(data => {
        setPrompts(data.prompts)
        if (data.prompts.length > 0) setActive(data.prompts[0].id)
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [token])

  if (!token) return null

  const current = prompts.find(p => p.id === active)

  return (
    <PlatformShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-dark">AI Prompts</h1>
          <p className="mt-1 text-sm text-neutral-mid">
            Live prompt files used by the AI pipeline. Read-only — edit via the repository.
          </p>
        </div>

        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={28} className="animate-spin text-neutral-mid" />
          </div>
        ) : (
          <div className="flex gap-4">
            {/* Prompt selector */}
            <div className="w-56 flex-shrink-0 space-y-1">
              {prompts.map(p => (
                <button
                  key={p.id}
                  onClick={() => setActive(p.id)}
                  className={`w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors ${
                    active === p.id
                      ? 'bg-teal-light text-teal border-l-2 border-teal'
                      : 'text-neutral-mid hover:bg-neutral-light hover:text-neutral-dark'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Prompt content */}
            {current && (
              <div className="min-w-0 flex-1 rounded-xl border border-gray-200 bg-white overflow-hidden">
                <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3">
                  <h2 className="text-sm font-semibold text-neutral-dark">{current.label}</h2>
                  <span className="text-xs text-neutral-mid">{current.content.length.toLocaleString()} chars</span>
                </div>
                <pre className="overflow-x-auto p-5 text-xs leading-relaxed text-neutral-dark whitespace-pre-wrap font-mono">
                  {current.content}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
    </PlatformShell>
  )
}
