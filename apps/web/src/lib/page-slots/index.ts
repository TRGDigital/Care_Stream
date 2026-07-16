import type { SlotDef } from './types'
import { ABOUT_SLOTS } from './about'
import { HOW_IT_WORKS_SLOTS } from './how-it-works'
import { CARE_POLICIES_SLOTS } from './care-policies'
import { HR_POLICIES_SLOTS } from './hr-policies'
import { CARE_AUDITS_SLOTS } from './care-audits'
import { CQC_COMPLIANCE_SLOTS } from './cqc-compliance'
import { POLICY_GAP_DETECTION_SLOTS } from './policy-gap-detection'
import { BUSINESS_CONTINUITY_SLOTS } from './business-continuity'
import { CQC_REPORT_CHAT_SLOTS } from './cqc-report-chat'
import { TRUST_SLOTS } from './trust'
import { CASE_STUDIES_SLOTS } from './case-studies'
import { FAQ_SLOTS } from './faq'
import { WHO_ITS_FOR_SLOTS } from './who-its-for'
import { PRICING_SLOTS } from './pricing'
import { STAFF_TRAINING_SLOTS } from './staff-training'

export type { SlotDef } from './types'
export { makeSlot } from './types'

// Registry of which marketing paths have editable content slots (design-preserving
// copy editing). Add a page here + a manifest to make its copy editable.
export const PAGE_SLOTS: Record<string, SlotDef[]> = {
  '/about': ABOUT_SLOTS,
  '/how-it-works': HOW_IT_WORKS_SLOTS,
  '/care-policies': CARE_POLICIES_SLOTS,
  '/hr-policies': HR_POLICIES_SLOTS,
  '/care-audits': CARE_AUDITS_SLOTS,
  '/cqc-compliance': CQC_COMPLIANCE_SLOTS,
  '/policy-gap-detection': POLICY_GAP_DETECTION_SLOTS,
  '/business-continuity': BUSINESS_CONTINUITY_SLOTS,
  '/cqc-report-chat': CQC_REPORT_CHAT_SLOTS,
  '/trust': TRUST_SLOTS,
  '/case-studies': CASE_STUDIES_SLOTS,
  '/faq': FAQ_SLOTS,
  '/who-its-for': WHO_ITS_FOR_SLOTS,
  '/pricing': PRICING_SLOTS,
  '/staff-training': STAFF_TRAINING_SLOTS,
}

export function slotsForPath(path: string): SlotDef[] | null {
  return PAGE_SLOTS[path] ?? null
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

// Server-side fetch of a page's saved slot overrides. Empty on any error so the
// page always falls back to the in-code defaults (the current copy).
export async function getContentSlots(path: string): Promise<Record<string, string>> {
  try {
    const res = await fetch(`${API_URL}/public/site-pages?path=${encodeURIComponent(path)}`, { next: { revalidate: 60 } })
    if (res.ok) {
      const slots = (await res.json())?.data?.page?.content_slots
      if (slots && typeof slots === 'object') return slots as Record<string, string>
    }
  } catch {
    // fall through
  }
  return {}
}
