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
