// The generated module content is written for a care-home voice ("our home"). CareStream serves
// every kind of CQC-regulated service, so the public pages present it as "care setting".
//
// Shared rather than duplicated: the current /staff-training page and the rebuilt one must say
// the same words, and a second copy of these rules would drift the moment either is edited. The
// theme's own generator does something similar but leaks an "our home" through, so the app's
// version is the one to keep.
export function careSetting(input?: string | null): string {
  if (!input) return ''
  return input
    .replace(/\bat our home\b/gi, 'at the care setting')
    .replace(/\bcare homes\b/gi, 'care settings')
    .replace(/\bcare home\b/gi, 'care setting')
    .replace(/\bnursing homes\b/gi, 'care settings')
    .replace(/\bnursing home\b/gi, 'care setting')
    .replace(/\bour home\b/gi, 'the care setting')
    .replace(/\bthe home\b/gi, 'the care setting')
    .replace(/\bthis home\b/gi, 'this care setting')
    .replace(/\byour home\b/gi, 'your care setting')
}
