// Shared types for the onboarding admin page and its lazy-loaded modals.

export type Step = {
  title: string
  type: 'read_policy' | 'answer_question'
  policy_id?: string
  policy_section?: string | null
  question?: string
  options?: string[]
  correct_option?: number | null
}

export type Flow = {
  id: string
  name: string
  description?: string
  job_roles: string[]
  is_active: boolean
  steps: Array<Step & { id: string; order: number }>
  enrollments: Array<{ id: string; completed_at: string | null }>
}
