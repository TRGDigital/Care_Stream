// Which picture an audit card shows. The 19 new home care audits each have their own picture (keyed by the audit's page slug); every other audit
// shows the picture for its theme (key "theme:<id>"). The pictures are made by the API (apps/api/src/data/audit-image-scenes.ts) and listed at
// /public/audit-images. A card with no picture yet simply has none.
import { AUDIT_PAGE_NAME_SLUG } from './audit-pages/slugs'

// First matching rule wins; the last (governance) is the default.
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

/** The keys to look for, best first: the audit's own picture, then its theme's. */
export function auditImageKeys(name: string): string[] {
  const own = AUDIT_PAGE_NAME_SLUG[name]
  return [...(own ? [own] : []), auditThemeKey(name)]
}
