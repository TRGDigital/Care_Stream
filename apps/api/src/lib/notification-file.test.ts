import test from 'node:test'
import assert from 'node:assert/strict'
import { detectNotificationFile, cleanFileName, zipEntryNames, checkTotals } from './notification-file'

// A minimal zip: local header signature, then a central directory listing the given names, then the end record. Enough for the name reader.
function zip(names: string[]): Buffer {
  const parts: Buffer[] = [Buffer.from([0x50, 0x4b, 0x03, 0x04, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0])]
  const cdStart = parts[0].length
  const cd: Buffer[] = names.map(n => { const b = Buffer.alloc(46 + n.length); b.writeUInt32LE(0x02014b50, 0); b.writeUInt16LE(n.length, 28); b.write(n, 46); return b })
  const cdBuf = Buffer.concat(cd)
  const end = Buffer.alloc(22); end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(names.length, 8); end.writeUInt16LE(names.length, 10); end.writeUInt32LE(cdBuf.length, 12); end.writeUInt32LE(cdStart, 16)
  return Buffer.concat([...parts, cdBuf, end])
}
const docx = zip(['[Content_Types].xml', 'word/document.xml'])
const xlsx = zip(['[Content_Types].xml', 'xl/workbook.xml'])
const pptx = zip(['[Content_Types].xml', 'ppt/presentation.xml'])
const pdf = Buffer.from('%PDF-1.7\nhello')
const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0])
const jpg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0])

test('real PDF, pictures and Office files are accepted when the name agrees', () => {
  assert.deepEqual(detectNotificationFile(pdf, 'Rota.pdf'), { ok: true, mime: 'application/pdf', ext: 'pdf', kind: 'pdf' })
  assert.equal((detectNotificationFile(png, 'a.PNG') as any).ok, true)
  assert.equal((detectNotificationFile(jpg, 'a.jpeg') as any).ext, 'jpg')
  assert.equal((detectNotificationFile(docx, 'Policy.docx') as any).kind, 'word')
  assert.equal((detectNotificationFile(xlsx, 'Rota.xlsx') as any).kind, 'excel')
  assert.equal((detectNotificationFile(pptx, 'Slides.pptx') as any).kind, 'powerpoint')
})

test('the name must agree with what the file really is', () => {
  const r: any = detectNotificationFile(pdf, 'Rota.docx'); assert.equal(r.ok, false); assert.match(r.reason, /really a PDF/)
  assert.equal((detectNotificationFile(png, 'photo.pdf') as any).ok, false)
})

test('macro enabled, old Office, embedded and program files are refused', () => {
  assert.equal((detectNotificationFile(zip(['[Content_Types].xml', 'word/document.xml', 'word/vbaProject.bin']), 'a.docx') as any).ok, false)
  assert.match((detectNotificationFile(docx, 'a.docm') as any).reason, /macros/)
  assert.match((detectNotificationFile(Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]), 'a.doc') as any).reason, /\.docx/)
  assert.equal((detectNotificationFile(zip(['[Content_Types].xml', 'word/document.xml', 'word/embeddings/oleObject1.bin']), 'a.docx') as any).ok, false)
  assert.equal((detectNotificationFile(zip(['[Content_Types].xml', 'word/document.xml', 'payload.exe']), 'a.docx') as any).ok, false)
  assert.match((detectNotificationFile(Buffer.from('MZ\x90\x00\x03\x00'), 'setup.pdf') as any).reason, /Programs/)
  assert.equal((detectNotificationFile(zip(['a.txt']), 'a.zip') as any).ok, false)
})

test('csv and txt must really be text', () => {
  assert.equal((detectNotificationFile(Buffer.from('name,hours\nAnna,12\n'), 'x.csv') as any).kind, 'csv')
  assert.equal((detectNotificationFile(Buffer.from('Hello team'), 'x.txt') as any).mime, 'text/plain')
  assert.equal((detectNotificationFile(Buffer.from([1, 2, 0, 3, 4, 5]), 'x.txt') as any).ok, false)
  assert.equal((detectNotificationFile(Buffer.from('<html><script>alert(1)</script>'), 'x.txt') as any).ok, false)
  assert.equal((detectNotificationFile(Buffer.from('hello there'), 'x.html') as any).ok, false)
})

test('zip names are read without unpacking and junk is refused', () => {
  assert.deepEqual(zipEntryNames(docx), ['[Content_Types].xml', 'word/document.xml'])
  assert.equal(zipEntryNames(Buffer.from('not a zip at all, just text here')), null)
})

test('names are made safe and limits are enforced', () => {
  assert.equal(cleanFileName('..\\..\\evil/Staff <rota>.pdf', 'pdf'), 'Staff rota.pdf')
  assert.equal(cleanFileName('', 'pdf'), 'document.pdf')
  assert.ok(cleanFileName('a'.repeat(300) + '.pdf', 'pdf').length <= 125)
  assert.equal(checkTotals([1, 2, 3, 4, 5, 6].map(() => ({ size_bytes: 1 }))), 'You can attach up to 5 documents.')
  assert.match(checkTotals([4, 4, 4, 4, 4, 4].slice(0, 5).map(() => ({ size_bytes: 4.5 * 1024 * 1024 })))!, /20 MB/)
  assert.equal(checkTotals([{ size_bytes: 1000 }]), null)
})

// ── The email wording and the route rules (read from the source, like the other route guards in this folder) ──
import fs from 'fs'
import path from 'path'
import { attachmentsNote, notificationCardHtml } from '../services/email/notification-content'
const routes = fs.readFileSync(path.resolve(__dirname, '../routes/notifications.ts'), 'utf8')

test('the email says documents are in the hub and never attaches them', () => {
  assert.equal(attachmentsNote(0), '')
  assert.equal(attachmentsNote(1), 'This message has 1 attachment, open it in your hub to read it.')
  assert.equal(attachmentsNote(3), 'This message has 3 attachments, open it in your hub to read them.')
  assert.match(notificationCardHtml('Rota', 'See the new rota', 2), /2 attachments, open it in your hub to read them/)
  assert.ok(!/2 attachments/.test(notificationCardHtml('Rota', 'See the new rota', 0)))
  assert.ok(!/attachments:\s*\[/.test(fs.readFileSync(path.resolve(__dirname, '../services/email/outbound.ts'), 'utf8').split('export async function sendStaffNotificationEmail')[1].slice(0, 2500)), 'no files go on the email')
})

test('a person can only download a document of a notification sent to them, in their own account', () => {
  const staff = routes.slice(routes.indexOf("meNotificationsRouter.get('/:id/files/:fileId'"), routes.indexOf("meNotificationsRouter.post('/:id/read'"))
  assert.match(staff, /staffNotificationRecipient\.findFirst\(\{ where: \{ notification_id: String\(req\.params\.id\), tenant_id: tenantOf\(req\), user_id: userOf\(req\)/)
  assert.match(staff, /notification_id: r\.notification_id, tenant_id: tenantOf\(req\)/)
  const admin = routes.slice(routes.indexOf("notificationsAdminRouter.get('/files/:fileId/download'"), routes.indexOf("notificationsAdminRouter.get('/', async"))
  assert.match(admin, /tenant_id: tenantOf\(req\)/)
})

test('a notification is never sent with a missing document, and drafts are the sender\'s own', () => {
  const send = routes.slice(routes.indexOf("notificationsAdminRouter.post('/', async"), routes.indexOf("notificationsAdminRouter.post('/:id/remind'"))
  assert.match(send, /created_by: userOf\(req\), notification_id: null/)
  assert.match(send, /files\.length !== fileIds\.length/)
  assert.ok(send.indexOf('files.length !== fileIds.length') < send.indexOf('createAndSendNotification('), 'checked before anything is created or sent')
  assert.match(routes, /notificationFileUploadMiddleware/)
  assert.match(routes, /scanBuffer/)
})
