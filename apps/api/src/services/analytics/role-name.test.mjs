// Mirrors roleNameRegex in apps/api/src/services/analytics/policy-adoption.ts.
// This regex rewrites live policy text, so its boundaries are pinned by tests.
function roleNameRegex(name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`(?<![\\p{L}\\p{N}'’-])${escaped}(?![\\p{L}\\p{N}-])`, 'gu')
}
const count = (text, name) => (text.match(roleNameRegex(name)) ?? []).length
const apply = (text, name, next) => text.replace(roleNameRegex(name), next)

let fails = 0
const check = (label, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want)
  if (!ok) { fails++; console.log(`FAIL ${label}\n  got  ${JSON.stringify(got)}\n  want ${JSON.stringify(want)}`) }
  else console.log(`ok   ${label}`)
}

// Must not match inside a longer word.
check('Ann not in Announcement', count('Announcement of the annual review.', 'Ann'), 0)
check('Ann matches standalone',  count('Ann checks the register.', 'Ann'), 1)

// Compound names: the case that would corrupt text.
check('Anne not in Anne-Marie',  count('Anne-Marie signs off.', 'Anne'), 0)
check('Marie not in Anne-Marie', count('Anne-Marie signs off.', 'Marie'), 0)
check('Brien not in O\'Brien',   count("Sean O'Brien signs off.", 'Brien'), 0)

// Full names with punctuation still match.
check("O'Brien full",  count("Reported to Sean O'Brien weekly.", "Sean O'Brien"), 1)
check('Anne-Marie full', count('Anne-Marie Duff signs it off.', 'Anne-Marie Duff'), 1)

// Possessives must update, or a policy is left half-renamed.
check('possessive straight', apply("Priya Shah's report is filed.", 'Priya Shah', 'Tom Reid'),
  "Tom Reid's report is filed.")
check('possessive typographic', apply('Priya Shah’s report is filed.', 'Priya Shah', 'Tom Reid'),
  'Tom Reid’s report is filed.')

// Every occurrence moves, unlike a proofreading fix.
const doc = 'Priya Shah is the Medicines Lead. Priya Shah audits monthly. See Priya Shah.'
check('counts all', count(doc, 'Priya Shah'), 3)
check('replaces all', apply(doc, 'Priya Shah', 'Tom Reid'),
  'Tom Reid is the Medicines Lead. Tom Reid audits monthly. See Tom Reid.')

// Punctuation boundaries.
check('before comma',    count('Contact Priya Shah, the lead.', 'Priya Shah'), 1)
check('inside brackets', count('the Medicines Lead (Priya Shah) reviews', 'Priya Shah'), 1)
check('end of line',     count('Signed: Priya Shah\nDate:', 'Priya Shah'), 1)

// Case is exact on purpose: case-insensitively, a name that is also an ordinary word would
// rewrite real sentences.
check('lowercase word left alone', count('Send the bill to finance.', 'Bill'), 0)
check('capitalised name matches',  count('Bill checks the register.', 'Bill'), 1)

// Regex metacharacters in a name must not become a pattern.
check('no regex injection', count('Contact A.B. Smith today.', 'A.B. Smith'), 1)
check('dot is literal',     count('Contact AXBY Smith today.', 'A.B. Smith'), 0)

console.log(fails ? `\n${fails} FAILED` : '\nall passed')
process.exit(fails ? 1 : 0)
