// Knowledge-base category options — shared by the knowledge page and its
// (lazy-loaded) add-entry modal.

export const KNOWLEDGE_CATEGORY_OPTIONS: { value: string; label: string }[] = [
  { value: 'general',             label: 'General'                },
  { value: 'resident',            label: 'Resident'               },
  { value: 'business_continuity', label: 'Business Continuity'    },
  { value: 'policies_procedures', label: 'Policies & Procedures'  },
  { value: 'hr_staff',            label: 'HR & Staff Handbook'    },
  { value: 'health_safety',       label: 'Health & Safety'        },
  { value: 'medication',          label: 'Medication'             },
  { value: 'infection_control',   label: 'Infection Control'      },
]

export const KNOWLEDGE_CATEGORY_LABELS: Record<string, string> = Object.fromEntries(
  KNOWLEDGE_CATEGORY_OPTIONS.map(o => [o.value, o.label]),
)

// Resident knowledge is about a named person rather than a procedure, so it is
// coloured differently from everything else on the page: violet, which nothing
// else here uses (green and amber mean approved and pending, red means delete).
export type CategoryAccent = {
  icon: string        // tailwind text colour for the category icon
  card: string        // border + tint for the group card
  header: string      // header row background
  title: string       // group title colour
  row: string         // left accent + tint on each entry row
  badge: string       // small "Resident" pill
}

const DEFAULT_ACCENT: CategoryAccent = {
  icon:   'text-teal',
  card:   'border-gray-200 bg-white',
  header: 'hover:bg-neutral-light/50',
  title:  'text-neutral-dark',
  row:    '',
  badge:  'bg-neutral-light text-neutral-mid',
}

const RESIDENT_ACCENT: CategoryAccent = {
  icon:   'text-violet-600',
  card:   'border-violet-200 bg-violet-50/40',
  header: 'hover:bg-violet-50',
  title:  'text-violet-900',
  row:    'border-l-4 border-violet-300 bg-violet-50/30',
  badge:  'bg-violet-100 text-violet-700',
}

export function categoryAccent(category: string): CategoryAccent {
  return category === 'resident' ? RESIDENT_ACCENT : DEFAULT_ACCENT
}

export const isResidentCategory = (category?: string | null) => category === 'resident'
