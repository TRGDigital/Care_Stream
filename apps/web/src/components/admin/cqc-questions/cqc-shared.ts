// Shared types & constants for the CQC Questions admin page and its modals.

export type Domain = 'safe' | 'effective' | 'caring' | 'responsive' | 'well_led'

export type Question = {
  id:           string
  domain:       Domain
  question:     string
  model_answer: string
  is_active:    boolean
  is_seed:      boolean
  created_at:   string
}

export type Delivery = {
  id:          string
  user_id:     string
  question_id: string
  rephrased_q: string
  channel:     string
  answer_text: string | null
  score:       number | null
  feedback:    string | null
  status:      'pending' | 'answered' | 'evaluated'
  sent_at:     string
  answered_at: string | null
  user:        { id: string; name: string; job_role: string | null }
  question:    { id: string; domain: string; question: string; model_answer: string }
}

export type StaffUser = { id: string; name: string; job_role: string | null }

export const DOMAINS: { key: Domain; label: string; short: string; color: string; bg: string }[] = [
  { key: 'safe',       label: 'Safe',       short: 'Safe',  color: 'text-red-700',    bg: 'bg-red-50 border-red-200'       },
  { key: 'effective',  label: 'Effective',  short: 'Eff.',  color: 'text-blue-700',   bg: 'bg-blue-50 border-blue-200'     },
  { key: 'caring',     label: 'Caring',     short: 'Care',  color: 'text-purple-700', bg: 'bg-purple-50 border-purple-200' },
  { key: 'responsive', label: 'Responsive', short: 'Resp.', color: 'text-amber-700',  bg: 'bg-amber-50 border-amber-200'   },
  { key: 'well_led',   label: 'Well-led',   short: 'W/Led', color: 'text-teal-700',   bg: 'bg-teal-50 border-teal-200'     },
]
