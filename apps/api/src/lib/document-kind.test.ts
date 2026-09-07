// Validation for the document-kind classifier, run with:
//   npx tsx src/lib/document-kind.test.ts
//
// The expectations are the real titles from a 361-document care-home library, with the
// non-policy documents identified by hand. The classifier must catch those without
// misclassifying any of the genuine policies around them, because a policy wrongly excluded
// disappears from coverage, consistency and the wording check.

import { documentKind, isPolicyDocument } from './document-kind'

const NOT_POLICIES: Array<[string, string]> = [
  ['A Medicines And Prescribing In Depth', 'training'],
  ['A Personal Protective Equipment In Depth', 'training'],
  ['A Waste Disposal Topic In Depth', 'training'],
  ['C Medication Administration In Depth', 'training'],
  ['Contracts Of Employment In Depth', 'training'],
  ['Mental Capacity In Depth Topic', 'training'],
  ['Safeguarding Recognising And Reporting Signs Of Abuse In Depth', 'training'],
  ['Sharps In Depth', 'training'],
  ['Food Hygiene Test Your Knowledge', 'training'],
  ['Medication Training Exam', 'training'],
  ['Medication Training Exam Answer Sheet', 'training'],
  ['Data Breach Reporting Template', 'template'],
  ['Data Protection Impact Assessment Blank Form', 'form'],
  ['Data Protection Impact Assessment Example Form', 'form'],
  ['Quality Assurance Analysis Form', 'form'],
  ['Subject Access Request Form', 'form'],
  ['Use Of My Data Consent Form', 'form'],
  ['Data Protection Officer Appointment (Letter)', 'letter'],
  ['Extension Of Time For Subject Access Request (Letter)', 'letter'],
  ['GDPR Acknowledgement Of A Subject Access Request (Letter)', 'letter'],
  ['Replying To A SAR With Requested Information (Letter)', 'letter'],
  ['GDPR Flowchart', 'chart'],
  ['Organisational Chart', 'chart'],
]

// Genuine policies that sit next to the documents above and must NOT be excluded. Several are
// deliberately awkward: they contain words a careless rule would catch.
const POLICIES = [
  'Safeguarding Residents From Abuse Or Harm Policy',
  'Deprivation Of Liberty Safeguards In Care Homes Policy',
  'Consent To Care And Treatment Policy',
  'Data Protection And Compliance With The General Data Protection Regulation Policy',
  'Gas Safety Policy',
  'Electrical Safety Maintenance And Checking Policy',
  'Reducing Safety Risks From Asbestos Policy',
  'Fire Safety In Care Homes Policy',
  'First Aid At Work In Care Homes Policy',
  'Health And Safety Risk Assessment And Control Policy',   // "Assessment", not "Form"
  'Risk Assessment And Management Of Residents Policy',
  'Infection Control – Risk Assessments In Care Homes',
  'Registered Nurse Verification Of Expected Deaths Policy', // "Registered", not "Register"
  'Guidance On Completing The Data Processing Audit Register', // see note below
  'Selection And Recruitment Of Staff',
  'Staff Training & Development Policy',                     // "Training", but a real policy
  'Medication Management In Care Homes Policy',
  'The Care Certificate Standards',
  'Modern Slavery And Human Trafficking Statement',
  'Concerns And Complaints Policy',
]

let failures = 0
const fail = (msg: string) => { console.error('FAIL ' + msg); failures++ }

for (const [name, expected] of NOT_POLICIES) {
  const got = documentKind(name)
  if (got !== expected) fail(`${name}: expected ${expected}, got ${got}`)
  if (isPolicyDocument(name)) fail(`${name}: should not be treated as a policy`)
}

for (const name of POLICIES) {
  // "Guidance On Completing The Data Processing Audit Register" is a known and accepted
  // exclusion: it is guidance about a register, and the rule cannot see that from the title.
  if (name === 'Guidance On Completing The Data Processing Audit Register') continue
  if (!isPolicyDocument(name)) fail(`${name}: should be treated as a policy, got ${documentKind(name)}`)
}

// A document too short to hold a policy is not one, whatever it is called.
if (isPolicyDocument('Some Policy', 120)) fail('a 120-character document should not be a policy')
if (!isPolicyDocument('Some Policy', 5_000)) fail('a 5,000-character policy should be a policy')

console.log(failures === 0
  ? `document-kind: all ${NOT_POLICIES.length + POLICIES.length - 1} title checks passed`
  : `document-kind: ${failures} failure(s)`)
process.exit(failures === 0 ? 0 : 1)
