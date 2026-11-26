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
  assert.equal((page.match(/<StaffNameChooser people=\{staffPeople\}/g) ?? []).length, 2)   // role holder rows and the two single name fields
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
