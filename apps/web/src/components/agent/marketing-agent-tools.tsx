'use client'

import { useAgentTools } from '@/hooks/use-agent-tool'
import { PUBLIC_AGENT_TOOLS } from '@/lib/agent-tools'

// Registers CareStream's public, read-only WebMCP tools for the marketing site.
// Renders nothing — feature-detects WebMCP and no-ops where unsupported.
export function MarketingAgentTools() {
  useAgentTools(PUBLIC_AGENT_TOOLS)
  return null
}
