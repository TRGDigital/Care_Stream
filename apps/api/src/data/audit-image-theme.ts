// Which theme picture an audit shows when it has no picture of its own. MUST match apps/web/src/lib/audit-image-key.ts (a test checks every audit agrees).
const THEME_RULES: Array<[string, RegExp]> = [
  ['home-visit', /home care|care worker spot check|late and missed|lone working|mar chart audit \(home care\)|moving and handling in the home|home environment|daily care notes and visit|live-in care/i],
  ['end-of-life', /bereavement|end of life|syringe driver|dnacpr/i],
  ['clinical', /dental|clinical|vaccine|oxygen|medical gases|surgical|resuscitation|medical emergenc|chaperone|test results|patient access|repeat prescribing|rapid tranquil|discharge/i],
  ['specialist', /shared lives|supported living|ligature|positive behaviour|restraint|restrictive|seclusion|right support|health action plan|person-centred outcomes|regulation 4[45]|detox|mental health act|missing from care|physical health and metabolic|opioid/i],
  ['medicines', /medic|controlled drugs|mar chart|prescrib|stomp|naloxone|self-administration/i],
  ['infection', /infection|hand hygiene|laundry|sharps|antimicrobial|decontamination/i],
  ['falls-moving', /fall|moving and handling|hoist|bed rails|pressure|skin|call bell|accident|lifting|loler/i],
  ['safeguarding', /safeguard|mental capacity|consent|duty of candour|information sharing|risk assessment and safety/i],
  ['nutrition', /kitchen|mealtime|fluid|weight monitoring|malnutrition|food/i],
  ['premises-fire', /fire|premises|health & safety|coshh|water safety|bedroom|maintenance|night shift|walkround/i],
  ['staff', /hr staff|training|supervision|competen|spot check|staff/i],
  ['dementia-wellbeing', /dementia|dignity|observation and engagement|resident feedback|resident of the day/i],
  ['records', /care plan|support plan|record|notes|personal file/i],
]


export function auditThemeKey(name: string): string {
  for (const [id, re] of THEME_RULES) if (re.test(name)) return `theme:${id}`
  return 'theme:governance'
}
