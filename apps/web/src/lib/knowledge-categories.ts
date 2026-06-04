// Knowledge-base category options — shared by the knowledge page and its
// (lazy-loaded) add-entry modal.

export const KNOWLEDGE_CATEGORY_OPTIONS: { value: string; label: string }[] = [
  { value: 'general',             label: 'General'                },
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
