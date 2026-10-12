// The CPD Certification Service's "CPD Certified" trademark, as supplied to members.
// Mandatory guidelines: only on courses they have certified (training_modules.cpd_accredited)
// and on completion certificates for those courses; never altered, recoloured, bordered or
// given added text; keep its proportions; carestreamai.com only (one website). The generic
// "The CPD Certification Service" mark may not be used by members at all.
export const CPD_CERTIFIED_LOGO = '/badges/cpd-certified.png'

// The same mark, resized for the web by the Next image optimiser (WebP or AVIF, 384px wide: enough
// for every place the site shows it, at up to three times its display size). The supplied PNG is
// 480 x 438 and 137 KB; this is the same artwork, unaltered, at a fraction of the weight. Use it on
// web pages only; certificates and printed packs keep CPD_CERTIFIED_LOGO.
export const CPD_CERTIFIED_LOGO_WEB = `/_next/image?url=${encodeURIComponent(CPD_CERTIFIED_LOGO)}&w=384&q=90`
