'use client'

import { useEffect } from 'react'
import { registerAgentTool, type AgentToolDef } from '@/lib/webmcp'

// React lifecycle wrappers around WebMCP tool registration. Tools register on
// mount and unregister on unmount (or when `deps` change), so the toolset always
// reflects the current page, role, and state — exactly what the spec wants.

/** Register one tool for the lifetime of the component (re-registers when deps change). */
export function useAgentTool(def: AgentToolDef | null | undefined, deps: unknown[] = []) {
  useEffect(() => {
    if (!def) return
    return registerAgentTool(def)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
}

/** Register a set of tools together. */
export function useAgentTools(defs: AgentToolDef[], deps: unknown[] = []) {
  useEffect(() => {
    const unregister = defs.map(registerAgentTool)
    return () => unregister.forEach(fn => fn())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
}
