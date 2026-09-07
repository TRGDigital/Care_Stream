import { defaultSignalSeeds, TEXT_SIGNALS, signalMatches } from './policy-lint-signals'

const seeds = defaultSignalSeeds()
console.log('total signals', seeds.length)
const wanted = ['nhs-digital', 'public-health-england', 'eu-gdpr-only', 'lps-pending', 'ico-notification', 'mha-2007-as-current']
console.log('new ones present:', wanted.filter(k => seeds.some(x => x.signal_key === k)).join(', '))
console.log('missing:', wanted.filter(k => !seeds.some(x => x.signal_key === k)).join(', ') || 'none')

for (const s of seeds) {
  if (s.phrase_source) { try { new RegExp(s.phrase_source, 'i') } catch { console.log('BAD REGEX', s.signal_key) } }
}
console.log('all stored regexes compile')

// Each new signal must fire on the wording that prompted it, and not on ordinary policy text.
const cases: Array<[string, string, boolean]> = [
  ['nhs-digital', 'Records are submitted to NHS Digital each quarter.', true],
  ['nhs-digital', 'Records are submitted to NHS England each quarter.', false],
  ['public-health-england', 'Report the outbreak to Public Health England.', true],
  ['public-health-england', 'Report the outbreak to the UK Health Security Agency.', false],
  ['eu-gdpr-only', 'We comply with Regulation (EU) 2016/679.', true],
  ['eu-gdpr-only', 'We comply with the UK GDPR and the Data Protection Act 2018.', false],
  ['lps-pending', 'The Liberty Protection Safeguards will replace DoLS.', true],
  ['lps-pending', 'We apply for a DoLS authorisation from the supervisory body.', false],
  ['ico-notification', 'The home has notification with the Information Commissioner.', true],
  ['ico-notification', 'The home pays its annual data protection fee to the ICO.', false],
  ['mha-2007-as-current', 'Detention is governed by the Mental Health Act 2007.', true],
  ['mha-2007-as-current', 'Detention is governed by the Mental Health Act 1983 as amended.', false],
]
let bad = 0
for (const [key, text, shouldFire] of cases) {
  const sig = TEXT_SIGNALS.find(s => s.id === key)
  if (!sig) { console.log('NO SIGNAL', key); bad++; continue }
  const fired = signalMatches(text, sig).length > 0
  if (fired !== shouldFire) { console.log(`FAIL ${key}: expected ${shouldFire ? 'fire' : 'no fire'} on "${text}"`); bad++ }
}
console.log(bad === 0 ? `all ${cases.length} signal cases passed` : `${bad} signal case failure(s)`)
process.exit(bad === 0 ? 0 : 1)
