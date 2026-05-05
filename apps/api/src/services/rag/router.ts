// §4.6.5 — Query routing: determines which Pinecone namespace(s) to search and
// whether the platform regulation knowledge base should be included.
//
// Routing is signal-based (keyword matching on the query text):
//
//   Handbook signals  → prioritise staff_handbook namespace
//   Policy signals    → prioritise internal_policy namespace
//   Regulation signal → include platform knowledge base
//   Ambiguous         → search all sources

import type { DocumentCategory } from '../../types'

export interface RouteDecision {
  tenantCategories:   DocumentCategory[]   // which tenant namespaces to search first
  includeRegulations: boolean              // also query platform knowledge base
  reasoning:          'policy' | 'handbook' | 'regulations' | 'all'
}

// ─── Signal keywords ──────────────────────────────────────────────────────────

// HR / employment topics that point strongly at the staff handbook
const HANDBOOK_KEYWORDS = [
  'handbook', 'staff handbook', 'hr policy', 'hr policies',
  'annual leave', 'holiday entitlement', 'sick leave', 'sickness absence',
  'maternity', 'paternity', 'parental leave', 'compassionate leave',
  'disciplinary', 'grievance', 'redundancy', 'notice period',
  'pay', 'salary', 'wages', 'pension', 'benefits', 'expenses',
  'appraisal', 'performance review', 'probation',
  'code of conduct', 'dress code', 'working hours', 'shift',
  'absence', 'flexi', 'overtime',
]

// Well-known UK care regulations and frameworks
const REGULATION_KEYWORDS = [
  'gdpr', 'data protection', 'uk gdpr', 'ico',
  'riddor', 'reporting of injuries',
  'cqc', 'cqc fundamental standards', 'care quality commission',
  'care act', 'mental capacity act', 'mca', 'dols',
  'safeguarding', 'prevent', 'prevent duty',
  'health and safety', 'health & safety', 'hswa', 'coshh',
  'equality act', 'protected characteristics',
  'mhra', 'nice guidelines',
  'cwp', 'whistleblowing', 'public interest disclosure',
  'fire safety', 'fire regulations',
]

// Phrases that unambiguously reference an internal care policy
const POLICY_KEYWORDS = [
  'policy', 'procedure', 'protocol', 'guideline', 'guidance',
  'falls policy', 'medication policy', 'infection control', 'safeguarding policy',
  'moving and handling', 'pressure ulcer', 'nutrition', 'hydration',
  'end of life', 'dementia', 'wound care', 'catheter',
]

function containsAny(text: string, terms: string[]): boolean {
  const lower = text.toLowerCase()
  return terms.some(t => lower.includes(t))
}

export function routeQuery(queryText: string, _tenantId: string): RouteDecision {
  const hasHandbook    = containsAny(queryText, HANDBOOK_KEYWORDS)
  const hasRegulation  = containsAny(queryText, REGULATION_KEYWORDS)
  const hasPolicy      = containsAny(queryText, POLICY_KEYWORDS)

  // Explicit handbook reference with no policy/regulation crossover
  if (hasHandbook && !hasPolicy && !hasRegulation) {
    return {
      tenantCategories:   ['staff_handbook'],
      includeRegulations: false,
      reasoning:          'handbook',
    }
  }

  // Explicit regulation reference — query knowledge base and tenant policies
  if (hasRegulation && !hasHandbook) {
    return {
      tenantCategories:   ['internal_policy', 'staff_handbook'],
      includeRegulations: true,
      reasoning:          'regulations',
    }
  }

  // Explicit policy reference with no handbook crossover
  if (hasPolicy && !hasHandbook) {
    return {
      tenantCategories:   ['internal_policy'],
      includeRegulations: hasRegulation,
      reasoning:          'policy',
    }
  }

  // Ambiguous or mixed signals — search everything
  return {
    tenantCategories:   ['internal_policy', 'staff_handbook'],
    includeRegulations: hasRegulation,
    reasoning:          'all',
  }
}
