import { createApiClient } from '@/lib/api-client'

// Shared by the changes modal's Download button and the policy preview's
// Print / Download PDF buttons, so every route to paper produces the same document.
export type OrgCtx = Awaited<ReturnType<ReturnType<typeof createApiClient>['analytics']['adoptionContext']>>

export const esc = (s: string) => (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// A print-ready (A4) HTML document: letterhead from the tenant's organisation details, the
// policy content, and a sign-off block. Opened in a new tab for Save-as-PDF / print. No AI,
// no server rendering — reuses the already-rendered policy DOM.
export function buildPrintDoc(policyName: string, contentHtml: string, version: string, tracked: boolean, org: OrgCtx | null): string {
  const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })
  const months = Number(org?.review_cycle_months || '12') || 12
  const next = new Date(); next.setMonth(next.getMonth() + months)
  const nextReview = next.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })
  const homeName = esc(org?.home_name || '')
  const approver = esc(org?.default_approver || org?.registered_manager || '')
  const manager  = esc(org?.registered_manager || '')
  const csLogo   = (typeof window !== 'undefined' ? window.location.origin : '') + '/logo-color.png'
  const line = '<span style="display:inline-block;min-width:200px;border-bottom:1px solid #999">&nbsp;</span>'
  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(policyName)}</title><style>
    @page { size: A4; margin: 20mm 18mm 22mm; }
    * { box-sizing: border-box; }
    body { font-family: Georgia, 'Times New Roman', serif; color: #1a1a1a; font-size: 11pt; line-height: 1.55; margin: 0; }
    .letterhead { display: flex; align-items: center; gap: 16px; border-bottom: 2px solid #0d9488; padding-bottom: 12px; }
    .letterhead img { max-height: 60px; max-width: 200px; }
    .home { font-size: 15pt; font-weight: bold; }
    .addr { font-size: 9pt; color: #555; white-space: pre-line; }
    h1.title { font-size: 19pt; margin: 20px 0 4px; }
    .meta { font-size: 9pt; color: #555; margin-bottom: 18px; }
    h2 { font-size: 13pt; margin: 20px 0 6px; }
    h3 { font-size: 11.5pt; margin: 14px 0 4px; }
    p, li { margin: 6px 0; }
    ul, ol { padding-left: 20px; }
    [class*="bg-green"] { background: #dcfce7; border-radius: 3px; }
    [class*="border-l-"] { border-left: 3px solid #4ade80; padding-left: 10px; margin: 8px 0; }
    .signoff { margin-top: 30px; border-top: 1px solid #ccc; padding-top: 14px; font-size: 10pt; }
    .signoff table { border-collapse: collapse; }
    .signoff td { padding: 5px 14px 5px 0; vertical-align: top; }
    .signoff td:first-child { color: #555; white-space: nowrap; }
    .foot { margin-top: 28px; border-top: 1px solid #eee; padding-top: 8px; font-size: 8pt; color: #999; }
  </style></head><body>
    <div class="letterhead">${org?.logo_url ? `<img src="${org.logo_url}" alt="">` : ''}<div><div class="home">${homeName}</div><div class="addr">${esc(org?.address || '')}</div></div></div>
    <h1 class="title">${esc(policyName)}</h1>
    <div class="meta">Version ${esc(version || '1.0')} &middot; ${tracked ? 'Tracked changes copy' : 'Approved copy'} &middot; Printed ${today}</div>
    <div class="content">${contentHtml}</div>
    <div class="signoff"><table>
      <tr><td>Registered manager:</td><td>${manager || line}</td></tr>
      <tr><td>Approved by:</td><td>${approver || line}</td></tr>
      <tr><td>Date approved:</td><td>${today}</td></tr>
      <tr><td>Next review:</td><td>${nextReview}</td></tr>
      <tr><td>Signature:</td><td>${line}</td></tr>
    </table></div>
    <div class="foot"><div style="display:flex;align-items:center;justify-content:space-between;gap:12px"><span>${homeName} &middot; ${esc(policyName)} &middot; v${esc(version || '1.0')} &middot; Uncontrolled when printed</span><img src="${csLogo}" alt="CareStream" style="height:22px;width:auto"></div></div>
    <script>window.onload=function(){setTimeout(function(){window.print()},350)}</script>
  </body></html>`
}

// Opens the built document in a new tab; the page fires the print dialog itself,
// where "Save as PDF" is the download. Returns false when a pop-up blocker ate it.
export function openPrintDoc(printHtml: string): boolean {
  const w = window.open('', '_blank')
  if (!w) return false
  w.document.open(); w.document.write(printHtml); w.document.close()
  return true
}
