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
  // The health and safety family. These phrases are matched against the finished document,
  // so they cover the wording a policy actually uses, not just the settings label. The gas,
  // electrical and asbestos policies all name a Maintenance Lead.
  { re: /\bmaintenance (?:lead|manager)\b/i,                            key: 'maintenance_lead' },
  { re: /\b(?:health (?:and|&) safety lead|h&s lead)\b/i,               key: 'health_safety_lead' },
  { re: /\b(?:medicines lead|medication lead)\b/i,                      key: 'medicines_lead' },
  { re: /\b(?:data protection officer|dpo)\b/i,                         key: 'data_protection_officer' },
  { re: /\bdeputy (?:home )?manager\b/i,                                key: 'deputy_manager' },
  { re: /\b(?:moving (?:and|&) handling|manual handling) lead\b/i,      key: 'moving_handling_lead' },
  { re: /\b(?:mental capacity lead|mca lead|dols lead)\b/i,             key: 'mental_capacity_lead' },
  { re: /\b(?:end of life (?:care )?lead|palliative care lead)\b/i,     key: 'end_of_life_lead' },
  { re: /\b(?:water safety lead|legionella (?:lead|responsible person))\b/i, key: 'water_safety_lead' },
  { re: /\btraining lead\b/i,                                           key: 'training_lead' },
  { re: /\b(?:freedom to speak up guardian|speak up guardian)\b/i, key: 'freedom_to_speak_up_guardian' },
  { re: /\bcomplaints (?:lead|manager|officer)\b/i, key: 'complaints_lead' },
  { re: /\b(?:first aid (?:lead|appointed person)|appointed person for first aid)\b/i, key: 'first_aid_lead' },
  { re: /\b(?:food safety lead|allergen lead|food safety and allergen lead)\b/i, key: 'food_safety_lead' },
  { re: /\b(?:nutrition (?:and hydration )?lead|hydration lead)\b/i, key: 'nutrition_hydration_lead' },
  { re: /\bfalls (?:lead|champion|coordinator)\b/i, key: 'falls_lead' },
  { re: /\b(?:tissue viability lead|pressure ulcer lead)\b/i, key: 'tissue_viability_lead' },
  { re: /\b(?:business continuity (?:lead|manager)|emergency planning lead)\b/i, key: 'business_continuity_lead' },
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
