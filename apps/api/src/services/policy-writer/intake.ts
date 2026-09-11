// Intake for paid policies: which buyer details an order needs before writing can
// start, and where each answer lives.
//
// Shared identity fields (company name, CQC IDs, registered manager…) are stored on
// tenant.organisation_details, so they are asked ONCE per buyer and every later
// purchase finds them already supplied. Per-policy answers (a gas engineer, an ICO
// number's counterpart date, a survey date) are stored on the purchase itself.
//
// An order maps to a catalogue product by product_slug, set at reconcile time by an
// exact title match. Orders with no product (bespoke gap titles that are not in the
// catalogue) fall back to the shared identity set alone, which the writer needs anyway.

import { prisma } from '../../db/client'
import { SHARED_INTAKE_FIELDS, type IntakeField } from '../../data/policy-products-seed'

export type IntakeFieldState = IntakeField & { supplied: boolean; value: string | null }
export type IntakeState = { fields: IntakeFieldState[]; missing: number; complete: boolean }

export async function productForTitle(title: string): Promise<{ slug: string; intake_fields: IntakeField[] } | null> {
  const p = await (prisma as any).policyProduct.findFirst({
    where: { title: { equals: title, mode: 'insensitive' } },
    select: { slug: true, intake_fields: true },
  }).catch(() => null)
  return p ? { slug: p.slug, intake_fields: (p.intake_fields as IntakeField[]) ?? [] } : null
}

export function intakeStateFor(
  fields: IntakeField[] | null,
  organisationDetails: Record<string, unknown>,
  intakeData: Record<string, unknown>,
): IntakeState {
  const list = (fields && fields.length ? fields : SHARED_INTAKE_FIELDS)
  const states: IntakeFieldState[] = list.map(f => {
    const raw = f.shared ? organisationDetails[f.key] : intakeData[f.key]
    const value = typeof raw === 'string' && raw.trim() ? raw.trim() : null
    return { ...f, supplied: value !== null, value }
  })
  const missing = states.filter(s => !s.supplied).length
  return { fields: states, missing, complete: missing === 0 }
}

/** Intake state for a purchase row (loads its product and tenant org details). */
export async function purchaseIntakeState(purchase: any): Promise<IntakeState> {
  const [tenant, product] = await Promise.all([
    (prisma as any).tenant.findUnique({
      where: { id: purchase.tenant_id }, select: { organisation_details: true },
    }),
    purchase.product_slug
      ? (prisma as any).policyProduct.findUnique({
          where: { slug: purchase.product_slug }, select: { intake_fields: true },
        }).catch(() => null)
      : Promise.resolve(null),
  ])
  return intakeStateFor(
    (product?.intake_fields as IntakeField[]) ?? null,
    (tenant?.organisation_details ?? {}) as Record<string, unknown>,
    (purchase.intake_data ?? {}) as Record<string, unknown>,
  )
}
