// Append the current role-holder name(s) in brackets after the FIRST mention of each role
// in a rendered policy, e.g. "Care Manager" → "Care Manager (Lenny Burgess)". Applied at
// render time (preview / review / download) from the live role-holders, so it is always
// current and never modifies the stored policy. Pure DOM, no AI.

export type RoleNames = Record<string, string[]>

const ROLE_PHRASES: Array<{ re: RegExp; key: string }> = [
  { re: /\b(?:registered manager|care manager)\b/i,                     key: 'registered_manager' },
  { re: /\bsafeguarding lead\b/i,                                       key: 'safeguarding_lead' },
  { re: /\b(?:infection prevention (?:and|&) control lead|ipc lead)\b/i, key: 'ipc_lead' },
  { re: /\bdignity champion\b/i,                                        key: 'dignity_champion' },
  { re: /\bcaldicott guardian\b/i,                                      key: 'caldicott_guardian' },
  { re: /\bfire safety officer\b/i,                                     key: 'fire_safety_officer' },
]

export function applyRoleNames(root: HTMLElement, roleNames: RoleNames | undefined) {
  if (!roleNames) return
  for (const { re, key } of ROLE_PHRASES) {
    const names = roleNames[key]
    if (!names || !names.length) continue
    const label = ` (${names.join(', ')})`
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
    let n: Node | null
    let done = false
    while (!done && (n = walker.nextNode())) {
      const node = n as Text
      const raw = node.nodeValue ?? ''
      re.lastIndex = 0
      const m = re.exec(raw)
      if (!m) continue
      const end = m.index + m[0].length
      // Already named in the source (next non-space char is "(") → leave it, first mention done.
      if (/^\s*\(/.test(raw.slice(end))) { done = true; break }
      node.nodeValue = raw.slice(0, end) + label + raw.slice(end)
      done = true
    }
  }
}
