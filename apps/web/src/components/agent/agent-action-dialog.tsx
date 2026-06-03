'use client'

import { useSyncExternalStore } from 'react'
import { Bot, ShieldAlert } from 'lucide-react'
import {
  subscribeAgentConfirm,
  getPendingSnapshot,
  resolveAgentConfirmation,
  type AgentConfirmRequest,
} from '@/lib/agent-confirm'

const EMPTY: AgentConfirmRequest[] = []

// Modal shown when an AI agent asks to perform a mutating action. Approve/Cancel
// resolves the awaiting tool. Rendered once via TenantAgentTools.
export function AgentActionDialog() {
  const pending = useSyncExternalStore(subscribeAgentConfirm, getPendingSnapshot, () => EMPTY)
  const current = pending[0]
  if (!current) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
        <div className="flex items-center gap-3 border-b border-gray-100 px-6 py-4">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-50 text-amber-600">
            <ShieldAlert size={18} />
          </span>
          <div>
            <p className="text-sm font-bold text-neutral-dark">Confirm AI agent action</p>
            <p className="flex items-center gap-1 text-xs text-neutral-mid"><Bot size={12} /> An AI agent wants to make a change</p>
          </div>
        </div>

        <div className="px-6 py-5">
          <p className="mb-1 text-sm font-semibold text-neutral-dark">{current.title}</p>
          <p className="text-sm leading-relaxed text-neutral-mid">{current.summary}</p>

          {current.details && current.details.length > 0 && (
            <div className="mt-4 space-y-1.5 rounded-lg border border-gray-100 bg-neutral-light/40 p-4">
              {current.details.map((d, i) => (
                <div key={i} className="grid grid-cols-[7rem_1fr] gap-2 text-xs">
                  <span className="font-medium text-neutral-mid">{d.label}</span>
                  <span className="break-words text-neutral-dark">{d.value}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-gray-100 px-6 py-4">
          <button
            onClick={() => resolveAgentConfirmation(current.id, false)}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-neutral-mid hover:bg-neutral-light"
          >
            Cancel
          </button>
          <button
            onClick={() => resolveAgentConfirmation(current.id, true)}
            className="rounded-lg bg-teal px-4 py-2 text-sm font-semibold text-white hover:bg-teal-dark"
          >
            {current.confirmLabel ?? 'Approve'}
          </button>
        </div>
      </div>
    </div>
  )
}
