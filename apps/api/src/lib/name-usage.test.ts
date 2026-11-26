// Where named people are used in policies, and updating a name with or without approval (the account decides).
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'fs'
import path from 'path'

const api = (f: string) => fs.readFileSync(path.resolve(__dirname, '..', f), 'utf8')
const web = (f: string) => fs.readFileSync(path.resolve(__dirname, '../../../web/src', f), 'utf8')

test('SCAN: one sweep reports, per role, every policy that names it, and per person where their NAME is written (whole name only), flagging which policies can be updated from here', () => {
  const s = api('services/analytics/role-mentions.ts')
  assert.match(s, /import \{ roleNameRegex \} from '\.\/policy-adoption'/)
  assert.match(s, /policy_list: c\.list\.sort/); assert.match(s, /name_usage: usage/)
  assert.match(s, /\(nameText\.match\(roleNameRegex\(u\.name\)\) \?\? \[\]\)\.length/)
  assert.match(s, /writable: !!own/)                                     // a working copy: the name can be replaced here
  assert.match(s, /const nameText = own \|\| body/)                       // the same text the name change itself rewrites
  const rt = api('routes/settings.ts')
  assert.match(rt, /scanRoleMentions\(user\.tenant_id, \{ names: \[\.\.\.byName\.values\(\), \.\.\.former\] \}\)/)   // current people, then archived staff
  assert.match(rt, /addName\(v\.value, 'Nominated individual'\)/); assert.match(rt, /addName\(v\.value, 'Approver'\)/)
})

test('APPROVAL CHOICE: the account decides; the server reads the setting itself; a pending name change waits in the draft with the careful matching and publishes nothing', () => {
  const rt = api('routes/settings.ts'), pa = api('services/analytics/policy-adoption.ts')
  assert.match(rt, /'show_role_names', 'require_name_change_approval'/)
  assert.match(rt, /organisation_details \?\? \{\}\) as Record<string, string>\)\.require_name_change_approval === 'on'/)
  assert.match(rt, /require_approval: needsApproval/); assert.match(rt, /ok\(res, \{ updated, failed, needs_approval: needsApproval \}\)/)
  const fn = pa.slice(pa.indexOf('export async function applyRoleNameChange'), pa.indexOf('// Push published content live'))
  const pending = fn.slice(fn.indexOf('if (input.require_approval)'), fn.indexOf('// Point release'))
  assert.match(pending, /reference_key: ROLE_NAME_KEY/); assert.match(pending, /published: false, minor: false/); assert.match(pending, /pending: true/)
  assert.doesNotMatch(pending, /published_content|policyDocumentVersion|propagatePublishedContent/)      // nothing goes live on this branch
  assert.match(pa, /if \(c\.reference_key === ROLE_NAME_KEY && c\.old_text\) \{ content = content\.replace\(roleNameRegex\(c\.old_text\), \(\) => c\.new_text\); continue \}/)
  assert.match(fn, /published: true, minor: true/)                                                        // approval off: unchanged, live at once as a small version
})

test('SETTINGS SCREEN: the approval switch, the list of where names are used, archived people flagged with a way to replace them, and the one named person change leading on to the policies', () => {
  const p = web('app/(admin)/settings/page.tsx')
  assert.match(p, /Require approval for name changes/); assert.match(p, /aria-checked=\{requireNameApproval\}/)
  assert.match(p, /Where names are used in your policies/); assert.match(p, /Show policies/); assert.match(p, /Written into <strong/)
  assert.match(p, /Choose who replaces them/); assert.match(p, /This person is archived\./); assert.match(p, /Names have changed since this was checked\. Press Check again to include them\./)
  assert.match(p, /void removeRoleName\(r\.key, r\.from, \{ label: r\.label, replacement: r\.to, scalar: true \}\)/)       // after the confirmation, the policies are offered
  assert.match(p, /void runRoleScan\(\)/)                                                                              // refreshed as soon as policies change
  assert.match(p, /<StaffNameChooser people=\{staffPeople\} taken=\{\[nameChange\.name\]\} label="Choose the person who replaces them"/)
  assert.match(p, /adds the change to each one for approval/); assert.match(p, /waiting for approval/)
  const copy = ['Names have changed since this was checked. Press Check again to include them.', 'A name written into a policy', 'Written into', 'Not written into any policy text', 'Choose who replaces them', 'This person is archived.', 'Roles named in your policies', 'adopt this policy first so it can be updated here', 'Require approval for name changes', 'When on, changing who holds a role', 'adds the change to each one for approval'].join(' ')
  assert.doesNotMatch(copy, /[–—]| - /)
})

test('FORMER STAFF: the scan also looks for archived staff names (current holders are not repeated), and the panel lists them apart with a way to replace them everywhere, without touching Organisation details', () => {
  const rt = api('routes/settings.ts'), sc = api('services/analytics/role-mentions.ts'), p = web('app/(admin)/settings/page.tsx')
  assert.match(rt, /where: \{ tenant_id: user\.tenant_id, is_active: false, is_shared: false \}/)
  assert.match(rt, /byName\.has\(name\.toLowerCase\(\)\)/)                                  // a person who is also a current holder is not listed twice
  assert.match(rt, /roles: \[a\.job_role \? `Former staff, \$\{a\.job_role\}` : 'Former staff'\], former: true/)
  assert.match(sc, /\.\.\.\(n\.former \? \{ former: true \} : \{\}\)/); assert.match(sc, /if \(!nameText\.includes\(u\.name\)\) continue/)
  assert.match(p, /Former staff named in your policies/); assert.match(p, /\.filter\(u => !u\.former\)/)
  assert.match(p, /removeRoleName\('', u\.name, \{ label: 'Former staff member' \}\)/)
  assert.match(p, /if \(!key\) return; if \(opts\.replacement\)/); assert.match(p, /if \(nc\.key\) \{\s*const next = \{/)   // no role, nothing to change in Organisation details
  assert.match(p, /\{nameChange\.key && <button onClick=\{\(\) => confirmNameChange\(false\)\}/)                      // "remove only" makes no sense without a role
  assert.doesNotMatch('Former staff named in your policies These people are archived, but their name is still written into policy text. Names run into the next word in a policy’s text can be missed here. Choose who replaces them', /[–—]| - /)
})

test('ACCORDION: "Roles your policies ask for" is closed until an admin opens it, the check button stays in the header, and what needs attention stays visible while it is closed', () => {
  const p = web('app/(admin)/settings/page.tsx')
  assert.match(p, /const \[rolesOpen, setRolesOpen\] = useState\(false\)/)
  assert.match(p, /<button type="button" onClick=\{\(\) => setRolesOpen\(o => !o\)\} aria-expanded=\{rolesOpen\}/)
  assert.match(p, /\{!rolesOpen && roleScan && \(needsName\.length > 0/)
  assert.match(p, /role needs' : 'roles need'\} a name/); assert.match(p, /former staff named in policies<\/span>/)
  const box = p.slice(p.indexOf('Roles your policies ask for</span>'), p.indexOf('Where names are used in your policies'))
  assert.match(box, /\{rolesOpen && \(\s*<>\s*\{roleScan && needsName\.length > 0/)            // the warning, the note and the panel are inside the accordion
  assert.ok(box.indexOf('Check again') > -1 && box.indexOf('Check again') < box.indexOf('{rolesOpen && ('))      // the button is in the header, outside it
})
