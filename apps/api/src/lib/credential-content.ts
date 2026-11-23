/** A credential row only counts as recorded when it holds something: a reference, a date, a note, a registration body or a document.
 *  An empty row (saved blank, or left behind after clearing) is treated as missing, not as valid. */
export function credentialHasContent(row: any): boolean {
  return !!row && !!(row.reference || row.issued_at || row.expires_at || row.notes || row.evidence_key || row.registration_body || row.sponsorship_ends_at)
}
