'use client'

import { useAgentTool } from '@/hooks/use-agent-tool'

// Declarative-feeling wrapper for exposing an existing form as a WebMCP tool.
//
// The WebMCP *declarative* API (auto-deriving a tool from <form> markup) is still
// a spec TODO, so we describe a form's fields once and compile them into the
// imperative registerTool() call. When the HTML standard ships, only this file
// changes — the forms keep calling useAgentForm() unchanged.

export interface AgentFormField {
  /** Field name — must match the form's input `name`. */
  name: string
  /** What this field is, for the agent (e.g. "Work email address"). */
  description: string
  required?: boolean
  /** Restrict to a fixed set of values (maps a <select>). */
  enum?: string[]
}

export interface UseAgentFormOptions {
  /** Tool name — 1–128 chars, [A-Za-z0-9_-.], unique on the page. */
  name: string
  title?: string
  /** What submitting this form does + when an agent should use it. */
  description: string
  fields: AgentFormField[]
  /** Runs with the agent-supplied values — should perform the same action as a human submit. */
  onSubmit: (values: Record<string, string>) => void | Promise<unknown>
  /** Re-register when these change (e.g. to capture fresh closures). */
  deps?: unknown[]
}

function buildSchema(fields: AgentFormField[]) {
  const properties: Record<string, object> = {}
  const required: string[] = []
  for (const f of fields) {
    properties[f.name] = {
      type: 'string',
      description: f.description,
      ...(f.enum ? { enum: f.enum } : {}),
    }
    if (f.required) required.push(f.name)
  }
  return { type: 'object', properties, ...(required.length ? { required } : {}) }
}

export function useAgentForm(opts: UseAgentFormOptions) {
  useAgentTool(
    {
      name: opts.name,
      title: opts.title,
      description: opts.description,
      inputSchema: buildSchema(opts.fields),
      // Mutating action (submits a form) — deliberately NOT read-only.
      annotations: { readOnlyHint: false },
      execute: async (input) => {
        const values = (input ?? {}) as Record<string, string>
        await opts.onSubmit(values)
        return { success: true, message: `${opts.title ?? opts.name} submitted.` }
      },
    },
    opts.deps ?? [],
  )
}
