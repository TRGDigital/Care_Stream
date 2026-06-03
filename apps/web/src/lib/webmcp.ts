// WebMCP (Web Model Context Protocol) — core helpers.
//
// WebMCP lets a page hand AI agents a typed "instruction manual" of actions via
// document.modelContext.registerTool(). The agent can then invoke an action
// directly through the browser, instead of simulating mouse clicks on the UI.
//
// Spec status (June 2026): W3C Community Group DRAFT — shipping behind a flag in
// Chrome Canary only, HTTPS-only. We therefore feature-detect and degrade to a
// no-op everywhere it is unavailable, so existing users are never affected.
// Ref: https://webmachinelearning.github.io/webmcp/
//
// The DECLARATIVE API (auto-deriving tools from HTML forms) is still a spec TODO,
// so we provide our own declarative-feeling wrapper (useAgentForm) that compiles
// down to this imperative API today. When the HTML standard lands we swap the
// internals here without touching call sites.

export interface AgentToolAnnotations {
  /** Tool only reads/queries — never mutates state. Lets agents call it freely. */
  readOnlyHint?: boolean
  /** Output contains user/customer-supplied content (e.g. uploaded policy text) —
   *  the agent must treat it as data, not instructions. Our main prompt-injection guard. */
  untrustedContentHint?: boolean
}

export interface AgentToolDef {
  /** 1–128 chars, [A-Za-z0-9_-.] — must be unique within the document. */
  name: string
  /** Human-readable label. */
  title?: string
  /** What the tool does + when to use it. The agent reads this to decide. */
  description: string
  /** JSON Schema describing the input parameters. */
  inputSchema?: object
  annotations?: AgentToolAnnotations
  /** Invoked by the agent. Receives parsed input, returns any JSON-serialisable value. */
  execute: (input: Record<string, unknown>) => Promise<unknown> | unknown
}

interface ModelContextLike {
  registerTool: (tool: object, options?: { signal?: AbortSignal; exposedTo?: string[] }) => void
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

// Records one row per agent tool-invocation so the platform console can show how
// AI agents are interacting with CareStream. Fire-and-forget — never blocks or
// breaks a tool if tracking fails.
function trackAgentEvent(toolName: string, status: 'ok' | 'error'): void {
  try {
    const body = JSON.stringify({
      tool_name: toolName,
      status,
      path: typeof location !== 'undefined' ? location.pathname : undefined,
    })
    fetch(`${API_URL}/public/marketing/agent-events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    }).catch(() => {})
  } catch {
    /* tracking must never affect the tool */
  }
}

/** True when the browser exposes the WebMCP API in this (secure) context. */
export function isWebMcpAvailable(): boolean {
  return (
    typeof document !== 'undefined' &&
    'modelContext' in document &&
    !!(document as unknown as { modelContext?: ModelContextLike }).modelContext
  )
}

/**
 * Register a single tool. Returns an unregister function (always safe to call).
 * No-ops cleanly when WebMCP is unavailable or registration throws (duplicate
 * name / invalid schema), so a bad tool can never break the page.
 */
export function registerAgentTool(def: AgentToolDef): () => void {
  if (!isWebMcpAvailable()) return () => {}

  const mc = (document as unknown as { modelContext: ModelContextLike }).modelContext
  const controller = new AbortController()

  // Wrap execute to record each agent invocation (ok/error) for console tracking.
  const trackedExecute = async (input: Record<string, unknown>) => {
    try {
      const result = await def.execute(input)
      trackAgentEvent(def.name, 'ok')
      return result
    } catch (e) {
      trackAgentEvent(def.name, 'error')
      throw e
    }
  }

  try {
    mc.registerTool(
      {
        name: def.name,
        title: def.title,
        description: def.description,
        inputSchema: def.inputSchema,
        annotations: def.annotations,
        execute: trackedExecute,
      },
      { signal: controller.signal },
    )
  } catch (err) {
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.warn(`[webmcp] failed to register tool "${def.name}"`, err)
    }
    return () => {}
  }

  return () => {
    try { controller.abort() } catch { /* already gone */ }
  }
}
