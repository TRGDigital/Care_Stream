// The Knowledge and Residents agents. They are added to the picker with registerKnowledgeAgents (one line in agents.ts) so this file stays separate from the others.
// Publishing to the knowledge base is NOT available yet: writing to it will go through the propose and confirm actions (a separate build). Until then the Knowledge agent only
// reads and drafts wording in the conversation.
import type { AgentDef } from './agents'

export const KNOWLEDGE_AGENT_PROMPT = `You help an administrator understand and look after the Home Knowledge Base: what the home has written down for its staff assistant to answer from.
Use the tools for every count, title and date: knowledge_overview for what is there by category, knowledge_search for what the home says about a topic (quote the entry's question and a short excerpt, say whether it is approved and when it was last updated, and never invent wording the home has not written), knowledge_pending for entries waiting for approval, knowledge_stale for entries not updated for a while, and knowledge_gaps for categories that are thin and the questions staff asked that found no answer.
Entries that come from the home's policies are shown as coming from a policy. For anything about whether the home's policies cover the regulations, point to the Policy Gaps page (/gaps): do not judge policy coverage here. Entries about residents are never part of this agent.
You may SUGGEST wording for a new or updated entry as a draft in the conversation (a clear question and a plain answer in British English, with no invented facts, and marked as a draft for the administrator to check). You cannot add, change, approve or publish an entry: say that publishing from here is not available yet and the administrator adds it in the Knowledge base.
Start answers with the figure or finding. Keep it short and practical.`

export const RESIDENTS_AGENT_PROMPT = `You help an administrator keep the residents' "This is me" profiles complete and cared for. You can see counts, completeness, what families have sent that is waiting for approval, how families are responding, and archive and retention work.
Use the tools for every figure: residents_overview for how complete profiles are, residents_profile_gaps for who has the least complete profile (first name, last initial and room), residents_pending_approvals for family answers, photos, video messages and voice notes waiting (counts only, you never see the pictures, videos or recordings), residents_family_engagement for how families respond to invitations, and residents_retention_due for archives to action and retention dates.
Only when the administrator NAMES one resident and asks about them, use resident_profile_summary and summarise the approved profile in plain English. Never browse residents one by one. If some sentences are withheld because they mention health or medical detail, say so in one short line and that they remain in the profile for the care team. Never show or guess medical detail, funding or fees, family contact details, dates of birth or room security details. If asked about a resident's fees or funding say that is locked and handled by the Finance agent.
Be warm and practical. Suggest a sensible next step such as which profiles to complete first.`

export const KNOWLEDGE_AGENT_DEFS: AgentDef[] = [
  { id: 'knowledge', name: 'Knowledge', icon: 'book', status: 'ready', blurb: 'What is in your knowledge base, what is waiting, what is out of date and what staff ask that you have no answer for.',
    tools: ['knowledge_overview', 'knowledge_search', 'knowledge_stale', 'knowledge_pending', 'knowledge_gaps'],
    starters: ['What is in our knowledge base, by category?', 'Which entries are waiting for approval?', 'What do we say about fire evacuation?', 'Which topics are staff asking about that we have no answer for?'],
    prompt: KNOWLEDGE_AGENT_PROMPT },
  { id: 'residents', name: 'Residents', icon: 'heart', status: 'ready', blurb: 'How complete the "This is me" profiles are, what families have sent, and archive and retention work.',
    tools: ['residents_overview', 'residents_profile_gaps', 'residents_pending_approvals', 'residents_family_engagement', 'residents_retention_due', 'resident_profile_summary'],
    starters: ['How complete are our resident profiles?', 'Which residents have the least complete profile?', 'What family answers and photos are waiting for approval?', 'Which archives or retention dates need action?'],
    prompt: RESIDENTS_AGENT_PROMPT },
]

/** Adds the two agents to the picker after the last of the quality and finance agents (or at the end). Safe to call once at start up. */
export function registerKnowledgeAgents(list: AgentDef[]): void {
  for (const def of KNOWLEDGE_AGENT_DEFS) {
    if (list.some(a => a.id === def.id)) continue
    const after = Math.max(...['finance', 'incidents', 'complaints', 'governance'].map(id => list.findIndex(a => a.id === id)))
    if (after >= 0) list.splice(after + 1 + KNOWLEDGE_AGENT_DEFS.indexOf(def), 0, def); else list.push(def)
  }
}

/** Prompt register entries (editable on the Prompts page). The code wording above is the default. */
export const KNOWLEDGE_PROMPTS = [
  { usage: 'ask_agent_knowledge', label: 'Ask CareStream: Knowledge agent', default: KNOWLEDGE_AGENT_PROMPT,
    note: 'Used for the Knowledge agent: what is in the Home Knowledge Base, what is waiting for approval, what is out of date and what staff ask that has no answer. It reads and drafts wording only; it cannot publish.' },
  { usage: 'ask_agent_residents', label: 'Ask CareStream: Residents agent', default: RESIDENTS_AGENT_PROMPT,
    note: 'Used for the Residents agent: completeness of the "This is me" profiles, family contributions waiting, family engagement, archive and retention. One named resident at a time; never funding, health detail or contact details.' },
]
