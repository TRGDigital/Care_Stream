// Human-confirmation gate for mutating WebMCP tools (Phase 3).
//
// A mutating tool calls requestAgentConfirmation() and AWAITS the promise. A
// mounted <AgentActionDialog> shows the request to the human and resolves the
// promise true/false on their choice. So no agent-initiated mutation ever runs
// without an explicit human click. Plain module store → connects non-React tool
// callbacks to the React modal.

export interface AgentConfirmRequest {
  id:            string
  title:         string
  summary:       string
  details?:      Array<{ label: string; value: string }>
  confirmLabel?: string
}

interface PendingConfirm extends AgentConfirmRequest {
  resolve: (approved: boolean) => void
}

let pending: PendingConfirm[] = []
const listeners = new Set<() => void>()
let counter = 0

function emit() {
  listeners.forEach(l => l())
}

export function requestAgentConfirmation(req: Omit<AgentConfirmRequest, 'id'>): Promise<boolean> {
  return new Promise<boolean>(resolve => {
    pending = [...pending, { ...req, id: `ac_${++counter}`, resolve }]
    emit()
  })
}

export function resolveAgentConfirmation(id: string, approved: boolean): void {
  const item = pending.find(p => p.id === id)
  if (!item) return
  pending = pending.filter(p => p.id !== id)
  emit()
  item.resolve(approved)
}

export function subscribeAgentConfirm(cb: () => void): () => void {
  listeners.add(cb)
  return () => { listeners.delete(cb) }
}

// Stable reference between changes — required by useSyncExternalStore.
export function getPendingSnapshot(): AgentConfirmRequest[] {
  return pending
}
