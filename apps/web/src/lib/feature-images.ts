// Curated product screenshots used on marketing feature pages. Listed here so they
// appear in the platform Alt Tags manager (Blog → Alt Tags) as editable rows, and
// so the page and the manager share the same default alt text.
export const FEATURE_IMAGES: { src: string; alt: string }[] = [
  {
    src: '/features/audit-evidence/hub-mobile.jpg',
    alt: 'Conducting a CareStream care audit on a phone, attaching evidence photos to an audit question using the Add photo button',
  },
  {
    src: '/features/audit-evidence/hub-desktop.png',
    alt: 'A CareStream care audit in the staff hub, showing four evidence photos attached to a Safety question for Resident Bedrooms Room 13',
  },
  {
    src: '/features/audit-evidence/admin-review.png',
    alt: 'A CareStream administrator reviewing a completed audit, with the captured evidence photos shown beneath the audit question',
  },
]

export const FEATURE_IMAGE_ALT: Record<string, string> = Object.fromEntries(FEATURE_IMAGES.map(i => [i.src, i.alt]))
