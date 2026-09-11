// Writing a policy a client has paid for.
//
// The specification is not "write a good policy". It is "write a policy that comes back
// covered when the same client runs the gap analysis on it". Those are different jobs, and
// only the second one is worth £120: a beautiful document that still reports a gap is a
// refund waiting to happen.
//
// So the structure is taken from the regulation itself. The coverage judge asks two questions:
// is there a policy whose subject is this regulation, and does it meet the regulation's
// curated required elements. This writes one section per required element, in the regulation's
// own words, which is what makes the answer to both questions yes.
//
// That is not a trick. A required element exists because the law expects a home to have
// addressed it; writing a section per element is simply covering the ground.
//
// The three drafts written by hand for Ferndale are the model: policy statement, scope, a
// section per element, then roles and responsibilities, training, records, related policies,
// review. Around three thousand words.
//
// Names come from the home's own settings, and where a role has nobody named the phrase is
// left plain rather than invented. The render-time substitution in policy-names.ts then fills
// it in whenever they do name someone, without the document being rewritten.

import { prisma } from '../../db/client'
import { callClaude } from '../ai/claude'
import { ROLE_PHRASES } from '../../lib/role-phrases'

const MODEL_SONNET = 'claude-sonnet-4-5-20250929'

type Reg = {
  reference_key: string
  official_name: string
  summary: string
  care_home_context: string
  required_elements: string[]
}

/** The writer's standing instructions, editable at /platform/prompts under `policy_writer`.
 *
 *  Only the standing instructions live here. The per-policy facts (title, home, address, the
 *  regulations it must satisfy, the required elements and the home's named role holders) are
 *  assembled by buildUserMessage below and sent separately, so editing this cannot break the
 *  contract with the data. */
export const DEFAULT_POLICY_WRITER_PROMPT = `You write policies for UK adult social care providers.

You are writing a real policy for a real, named home. It will be read by their staff, and by
a CQC inspector, and it must stand up to both.

Rules that matter more than style:
- British English throughout.
- Never invent a fact about this home. If you do not know something, write the requirement
  rather than a fabricated detail. Never invent a person's name, a date, a certificate number,
  a contractor or a piece of equipment.
- Where a named role holder is given below, use that person's name once, at the point the role
  is first given a responsibility. Where no name is given, name the ROLE only and never write
  a placeholder such as [name] or TBC.
- Write plainly, in the second person plural ("we", "our"), the way a care home writes about
  itself. Short sentences. No corporate padding, no restating the heading in the first line.
- Do not use em dashes or en dashes anywhere.

Structure, exactly:
1. "## Policy Statement" — what this home commits to, in four or five sentences.
2. "## Scope" — who and what it covers.
3. One "## " section per REQUIRED ELEMENT given below, in the order given. The heading must
   describe the thing being done, not quote the element back. Each section says what this home
   does, who does it, how often, and what is written down.
4. "## Roles and Responsibilities" — each role and what it is accountable for here.
5. "## Training" — who is trained on this, when, and how it is refreshed.
6. "## Records and Evidence" — what is kept, where, and for how long.
7. "## Related Policies" — the other policies this one sits beside.
8. "## Review" — how often this policy is reviewed and by whom.

Return markdown only. No preamble, no closing commentary, no code fences.`

export const POLICY_WRITER_PROMPT_USAGE = 'policy_writer'

/** The edited prompt if a platform admin has saved one, otherwise the default above.
 *  A blank saved prompt falls back rather than sending the model no instructions at all,
 *  which would produce a plausible-looking policy with none of the rules that make it safe. */
async function getPolicyWriterPrompt(): Promise<string> {
  try {
    const row = await (prisma as any).aiPrompt.findUnique({ where: { usage: POLICY_WRITER_PROMPT_USAGE } })
    const stored = typeof row?.content === 'string' ? row.content.trim() : ''
    if (stored) return stored
  } catch { /* fall through to the default */ }
  return DEFAULT_POLICY_WRITER_PROMPT
}

function buildUserMessage(opts: {
  title: string
  homeName: string
  address: string | null
  regs: Reg[]
  roleNames: { role: string; names: string[] }[]
}): string {
  const elements = opts.regs.flatMap(r =>
    (r.required_elements ?? []).filter(Boolean).map(e => `- ${e}`))

  const named = opts.roleNames.filter(r => r.names.length)
  const unnamed = opts.roleNames.filter(r => !r.names.length)

  return [
    `POLICY TITLE: ${opts.title}`,
    ``,
    `THE HOME: ${opts.homeName}`,
    opts.address ? `ADDRESS: ${opts.address}` : '',
    ``,
    `THIS POLICY MUST SATISFY:`,
    ...opts.regs.map(r => [
      `- ${r.official_name}`,
      r.summary ? `  What it requires: ${r.summary}` : '',
      r.care_home_context ? `  In a care home: ${r.care_home_context}` : '',
    ].filter(Boolean).join('\n')),
    ``,
    `REQUIRED ELEMENTS. Write one section for each, in this order:`,
    ...(elements.length ? elements : ['- (none curated; cover the regulation thoroughly in your own structure)']),
    ``,
    named.length
      ? `NAMED ROLE HOLDERS AT THIS HOME. Use each name once, where the role first takes a responsibility:\n${named.map(r => `- ${r.role}: ${r.names.join(', ')}`).join('\n')}`
      : `NO ROLE HOLDERS HAVE BEEN NAMED. Name roles only.`,
    unnamed.length
      ? `\nROLES WITH NOBODY NAMED. Refer to the role by title only, never a placeholder:\n${unnamed.map(r => `- ${r.role}`).join('\n')}`
      : '',
  ].filter(Boolean).join('\n')
}

export type WrittenPolicy = { markdown: string; words: number; sections: number }

// revisionNotes: verification failures from a previous attempt, fed back so the rewrite
// fixes precisely what failed rather than rolling the dice again.
export async function writePolicy(purchaseId: string, revisionNotes: string[] = []): Promise<WrittenPolicy> {
  const purchase = await (prisma as any).policyPurchase.findUnique({ where: { id: purchaseId } })
  if (!purchase) throw new Error('That order was not found')

  const [regs, tenant] = await Promise.all([
    (prisma as any).externalRegulation.findMany({
      where: { reference_key: { in: purchase.reference_keys ?? [] } },
      select: {
        reference_key: true, official_name: true, summary: true,
        care_home_context: true, required_elements: true,
      },
    }) as Promise<Reg[]>,
    (prisma as any).tenant.findUnique({
      where: { id: purchase.tenant_id },
      select: { name: true, organisation_details: true },
    }) as Promise<{ name: string; organisation_details: Record<string, unknown> } | null>,
  ])
  if (!tenant) throw new Error('That client was not found')

  // Role holders as the home has recorded them. Only manual names are used here: a name
  // derived from a staff job title is a guess about who holds a role, and a guess is not
  // something to write into a policy that carries the home's name.
  const od = (tenant.organisation_details ?? {}) as Record<string, unknown>
  const roleNames = ROLE_PHRASES.map(p => ({
    role: p.label,
    names: String(od[p.key] ?? '').split(',').map(s => s.trim()).filter(Boolean),
  }))

  const baseMessage = buildUserMessage({
    title:    purchase.policy_title,
    homeName: tenant.name,
    address:  typeof od.address === 'string' ? od.address : null,
    regs,
    roleNames,
  })
  const userMessage = revisionNotes.length
    ? `${baseMessage}\n\nA PREVIOUS DRAFT OF THIS POLICY FAILED VERIFICATION. This rewrite must fix every one of these, without weakening anything else:\n${revisionNotes.map(n => `- ${n}`).join('\n')}`
    : baseMessage

  const markdown = (await callClaude(
    await getPolicyWriterPrompt(),
    userMessage,
    // Long enough for the three thousand words the hand-written drafts ran to, and a low
    // temperature because this is a compliance document, not a piece of writing.
    { model: MODEL_SONNET, maxTokens: 8000, temperature: 0.2, feature: 'policy_writer' },
  )).trim()

  if (markdown.length < 800) throw new Error('The written policy came back too short to use')

  return {
    markdown,
    words:    markdown.split(/\s+/).filter(Boolean).length,
    sections: (markdown.match(/^## /gm) ?? []).length,
  }
}
