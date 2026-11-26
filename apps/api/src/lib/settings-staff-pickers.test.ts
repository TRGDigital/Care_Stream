// Organisation details: named people are chosen from the staff (picture, searchable) instead of typed, and every name already stored is kept exactly as it is.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'fs'
import path from 'path'

const page = fs.readFileSync(path.resolve(__dirname, '../../../web/src/app/(admin)/settings/page.tsx'), 'utf8')

test('NAMES ARE KEPT: a chosen name is stored in the same plain text, comma separated, as a typed one; stored names still show as chips whoever they are', () => {
  assert.match(page, /function addRoleName\(key: string, picked\?: string\) \{\s*const name = \(picked \?\? roleInput\[key\] \?\? ''\)\.trim\(\)/)
  assert.match(page, /\[key\]: \[\.\.\.cur, name\]\.join\(', '\)/)                       // unchanged storage format
  assert.match(page, /function setScalar\(key: string, picked\?: string\)/)
  assert.match(page, /manual\.filter\(n => !rh\.derived\.some\(d => d\.toLowerCase\(\) === n\.toLowerCase\(\)\)\)\.map\(name =>/)   // every stored name still listed
  assert.doesNotMatch(page, /orgDetails\[[^\]]+\]\s*=\s*''[^;]*staff/i)                    // nothing rewrites stored names to match the staff list
})

test('PICKER: role holders, Nominated individual and Default approver use the shared staff picker, with typing kept for people who are not staff', () => {
  assert.match(page, /import \{ StaffPicker \} from '@\/components\/ask\/staff-picker'/)
  assert.equal((page.match(/<StaffNameChooser people=\{staffPeople\}/g) ?? []).length, 3)   // role holder rows, the two single name fields, and the person who replaces someone
  assert.match(page, /Not on your staff list\? Type a name/)
  assert.match(page, /\(staffPeople\.length === 0 \|\| typedOpen\[rh\.key\]\)/)             // no staff loaded: the typed box is still there
  assert.doesNotMatch(page, /\bloadStaff\b|ask\.actions\.staff/)                                // not the Ask only staff endpoint: it is not available to every account
})

test('ARCHIVED AND PICTURES: a name that belongs to an archived person gets an Archived tag, and every chip shows the person picture (initials when none)', () => {
  assert.match(page, /const isArchivedName = \(n: string\) => archivedKeys\.has\(nameKey\(n\)\) && !activeKeys\.has\(nameKey\(n\)\)/)
  assert.equal((page.match(/isArchivedName\((name|val)\) && <ArchivedTag \/>/g) ?? []).length, 3)
  assert.equal((page.match(/namePic\((name|val)\)/g) ?? []).length, 3)
  assert.match(page, /<StaffAvatar name=\{u\.name\} photoUrl=\{u\.photo_url \?\? null\} size=\{22\} onRefresh=\{reloadStaffDir\}/)
  const copy = [...page.matchAll(/(Choose a staff member…|Everyone on your staff is already chosen|Not on your staff list\? Type a name|This person is archived\.[^"]*)/g)].map(m => m[1]).join(' ')
  assert.doesNotMatch(copy, /[–—]| - /)
})

test('CLOSE AND CONFIRM: the open picker has a Close button, and a second person for a role is only added after the admin confirms (picked or typed)', () => {
  assert.match(page, /const closeButton = \(\s*<button type="button" onClick=\{\(\) => setOpen\(false\)\} className="inline-flex[^"]*border[^"]*">\s*<X size=\{12\} aria-hidden="true" \/> Close/)
  assert.equal((page.match(/\{closeButton\}/g) ?? []).length, 2)          // a visible button at the top and the bottom of the open list
  assert.match(page, /function askAddRoleName\(key: string, role: string, existing: string\[\], picked\?: string\)/)
  assert.match(page, /if \(existing\.length === 0 \|\| existing\.some\(n => n\.toLowerCase\(\) === name\.toLowerCase\(\)\)\) \{ addRoleName\(key, picked\); return \}/)   // first holder, or the same name again: no question
  assert.match(page, /onPick=\{n => askAddRoleName\(rh\.key, rh\.role, \[\.\.\.rh\.derived, \.\.\.manual\], n\)\}/)
  assert.match(page, /askAddRoleName\(rh\.key, rh\.role, \[\.\.\.rh\.derived, \.\.\.manual\]\)\} disabled=\{savingOrg/)   // the typed Add button asks too
  assert.match(page, /Add more than one \{moreThanOne\.role\}\?/); assert.match(page, /No, leave it as it is/); assert.match(page, /Yes, add them as well/)
  assert.doesNotMatch(page, /onPick=\{n => addRoleName\(/)                                                       // nothing adds a picked name without the check
})

test('CHANGE CONFIRM: the one named person (nominated individual, default approver) is only changed after the admin confirms, whether picked or typed; the first name and the same name need no question', () => {
  assert.match(page, /function askSetScalar\(key: string, label: string, picked\?: string\)/)
  assert.match(page, /if \(!from \|\| from\.toLowerCase\(\) === to\.toLowerCase\(\)\) \{ setScalar\(key, picked\); return \}/)
  assert.match(page, /onPick=\{n => askSetScalar\(f\.key, f\.label, n\)\}/)
  assert.match(page, /askSetScalar\(f\.key, f\.label\) : setScalar\(f\.key\)\)\} disabled=\{savingOrg/)   // the typed Update button asks too
  assert.match(page, /Change the \{replaceHolder\.label\}\?/); assert.match(page, /No, keep \{replaceHolder\.from\}/); assert.match(page, /Yes, change to \{replaceHolder\.to\}/)
  assert.doesNotMatch(page, /onPick=\{n => setScalar\(/)
})
