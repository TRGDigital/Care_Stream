// Where the organisation's own logo goes in a staff email. The email builders leave one of these markers; at send time (lib/org-logo.ts) the
// marker becomes the logo of the account the recipient belongs to, or is removed when there is none. A marker is an HTML comment, so an
// email that never passes through the sender (a test render) just shows nothing there.
/** A whole table row, in the person-led layout (between the CareStream header and the headline). */
export const LOGO_ROW = '<!--CS_ORG_LOGO_ROW-->'
/** A centred block at the top of the body, in the company-branded layout. */
export const LOGO_BLOCK = '<!--CS_ORG_LOGO_BLOCK-->'
