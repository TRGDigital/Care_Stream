import type { SlotDef } from './types'

// Editable copy for /who-we-serve. Defaults are the current live copy; editing a
// slot in the platform (Main site pages → /who-we-serve) overrides it without
// touching the design. The per-setting cards below the hero are generated from the
// shared SETTINGS_LIST config and are edited there, not as slots.
export const WHO_WE_SERVE_SLOTS: SlotDef[] = [
  // Header
  { key: 'header.label', group: 'Header', label: 'Eyebrow', default: 'Who We Serve' },
  { key: 'header.title', group: 'Header', label: 'Heading', default: 'Built for every CQC-regulated setting.' },
  { key: 'header.subtitle', group: 'Header', label: 'Subtitle', multiline: true, default: 'CareStream gives your whole team instant access to your policies, training, audits and CQC tools, grounded in your own documents and in any language. Whatever kind of service you run, find out how CareStream works for you.' },
]
