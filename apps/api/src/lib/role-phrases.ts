// The wording a policy uses for each named role.
//
// Distinct from the regexes in settings.ts and policy-adoption.ts, which match a STAFF
// MEMBER'S job title or specialism to work out who holds a role. These match the ROLE AS
// WRITTEN IN A DOCUMENT, so "The Falls Lead reviews every fall" finds the falls lead.
//
// The web renderer keeps its own copy in apps/web/src/lib/policy-names.ts, because it runs in
// the browser over a rendered DOM and cannot import from the API. The two must agree, and
// apps/web/src/lib/policy-names.test.mjs fails if they drift.

export type RolePhrase = { key: string; label: string; re: RegExp }

export const ROLE_PHRASES: RolePhrase[] = [
  { key: 'registered_manager',           label: 'Registered manager',              re: /\b(?:registered manager|care manager)\b/i },
  { key: 'safeguarding_lead',            label: 'Safeguarding lead',               re: /\bsafeguarding lead\b/i },
  { key: 'ipc_lead',                     label: 'Infection prevention & control lead', re: /\b(?:infection prevention (?:and|&) control lead|ipc lead)\b/i },
  { key: 'dignity_champion',             label: 'Dignity champion',                re: /\bdignity champion\b/i },
  { key: 'caldicott_guardian',           label: 'Caldicott Guardian',              re: /\bcaldicott guardian\b/i },
  { key: 'fire_safety_officer',          label: 'Fire safety officer',             re: /\bfire safety officer\b/i },
  { key: 'maintenance_lead',             label: 'Maintenance lead',                re: /\bmaintenance (?:lead|manager)\b/i },
  { key: 'health_safety_lead',           label: 'Health and safety lead',          re: /\b(?:health (?:and|&) safety lead|h&s lead)\b/i },
  { key: 'medicines_lead',               label: 'Medicines lead',                  re: /\b(?:medicines lead|medication lead)\b/i },
  { key: 'data_protection_officer',      label: 'Data protection officer',         re: /\b(?:data protection officer|dpo)\b/i },
  { key: 'deputy_manager',               label: 'Deputy manager',                  re: /\bdeputy (?:home )?manager\b/i },
  { key: 'moving_handling_lead',         label: 'Moving and handling lead',        re: /\b(?:moving (?:and|&) handling|manual handling) lead\b/i },
  { key: 'mental_capacity_lead',         label: 'Mental capacity and DoLS lead',   re: /\b(?:mental capacity lead|mca lead|dols lead)\b/i },
  { key: 'end_of_life_lead',             label: 'End of life care lead',           re: /\b(?:end of life (?:care )?lead|palliative care lead)\b/i },
  { key: 'water_safety_lead',            label: 'Water safety lead (Legionella)',  re: /\b(?:water safety lead|legionella (?:lead|responsible person))\b/i },
  { key: 'training_lead',                label: 'Training lead',                   re: /\btraining lead\b/i },
  { key: 'freedom_to_speak_up_guardian', label: 'Freedom to Speak Up Guardian',    re: /\b(?:freedom to speak up guardian|speak up guardian)\b/i },
  { key: 'complaints_lead',              label: 'Complaints lead',                 re: /\bcomplaints (?:lead|manager|officer)\b/i },
  { key: 'first_aid_lead',               label: 'First aid appointed person',      re: /\b(?:first aid (?:lead|appointed person)|appointed person for first aid)\b/i },
  { key: 'food_safety_lead',             label: 'Food safety and allergen lead',   re: /\b(?:food safety lead|allergen lead|food safety and allergen lead)\b/i },
  { key: 'nutrition_hydration_lead',     label: 'Nutrition and hydration lead',    re: /\b(?:nutrition (?:and hydration )?lead|hydration lead)\b/i },
  { key: 'falls_lead',                   label: 'Falls lead',                      re: /\bfalls (?:lead|champion|coordinator)\b/i },
  { key: 'tissue_viability_lead',        label: 'Tissue viability lead',           re: /\b(?:tissue viability lead|pressure ulcer lead)\b/i },
  { key: 'business_continuity_lead',     label: 'Business continuity lead',        re: /\b(?:business continuity (?:lead|manager)|emergency planning lead)\b/i },
]
