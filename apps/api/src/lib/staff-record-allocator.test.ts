// The staff record shows who allocated each training module and when.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'fs'
import path from 'path'

test('STAFF RECORD: each training item carries the allocator as a name (people of this account only; Themselves when they chose it; empty when not recorded) and the allocation date', () => {
  const s = fs.readFileSync(path.resolve(__dirname, 'staff-record.ts'), 'utf8')
  assert.match(s, /where: \{ id: \{ in: allocatorIds \}, tenant_id: tenantId \}/)
  assert.match(s, /assigned_by_name: e\.assigned_by \? \(e\.assigned_by === userId \? 'Themselves'/)
  assert.match(s, /assigned_at: e\.created_at/)
})
test('STAFF PAGE: the Training record table has Allocated and Allocated by columns, "Not recorded" when unknown', () => {
  const p = fs.readFileSync(path.resolve(__dirname, '../../../web/src/app/(admin)/staff/[id]/page.tsx'), 'utf8')
  assert.match(p, />Allocated<\/th>/); assert.match(p, />Allocated by<\/th>/); assert.match(p, /m\.assigned_by_name \?\? 'Not recorded'/)
})

test('STAFF PAGE: a completed module in the Training record has a Certificate button that opens the same certificate as the Annual training table', () => {
  const p = fs.readFileSync(path.resolve(__dirname, '../../../web/src/app/(admin)/staff/[id]/page.tsx'), 'utf8')
  const rec = p.slice(p.indexOf('rec.training.items.map'), p.indexOf('Annual training (AI modules)'))
  assert.match(rec, /m\.status === 'complete' && \(\s*<button onClick=\{\(\) => setCertItem\(m\)\}/)
  assert.equal((p.match(/<TrainingCertificate/g) ?? []).length, 1)   // one certificate view shared by both tables
})

test('STAFF PAGE: the CPD Certified logo shows beside a course name only when that module is certified (cpd_accredited), unaltered, in both training tables', () => {
  const p = fs.readFileSync(path.resolve(__dirname, '../../../web/src/app/(admin)/staff/[id]/page.tsx'), 'utf8')
  assert.match(p, /import \{ CPD_CERTIFIED_LOGO \} from '@\/lib\/cpd'/)
  assert.equal((p.match(/\{m\.cpd_accredited && <img src=\{CPD_CERTIFIED_LOGO\} alt="CPD Certified" className="ml-2 inline-block h-6 w-auto align-middle" \/>\}/g) ?? []).length, 2)
  assert.doesNotMatch(p, /tier === 'cpd' && <img/)   // never on the kind of course alone, only once certified
})

test('STAFF PAGE: the block under the Training record is called CPD training (it is the CPD training block), not Annual training', () => {
  const p = fs.readFileSync(path.resolve(__dirname, '../../../web/src/app/(admin)/staff/[id]/page.tsx'), 'utf8')
  assert.match(p, /<GraduationCap size=\{15\} className="text-teal" \/> CPD training <InfoTip/)
  assert.doesNotMatch(p, /<\/> Annual training <InfoTip/); assert.doesNotMatch(p, /annual:     "AI-generated annual training/)
  assert.match(p, /annual:     "CPD training\. These courses are independently approved by The CPD Certification Service\./)
  assert.doesNotMatch(p, /annual:     "[^"]*(your policies|from your policies)/)   // CPD training has nothing to do with the home's policies
})
