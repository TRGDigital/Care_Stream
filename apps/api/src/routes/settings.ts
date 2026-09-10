import { Router, Request, Response } from 'express'
import multer from 'multer'
import sharp from 'sharp'
import { prisma } from '../db/client'
import { ok, err } from '../lib/response'
import { effectiveSections } from '../lib/policy-sections'
import { normaliseCategories } from '../lib/policy-categories'
import { effectiveStaffRoles, effectiveSpecialistRoles } from '../data/onboarding-roles'
import { effectiveLanguages, resolveLanguageName, DEFAULT_LANGUAGES, languageCatalog } from '../data/languages'
import { runKnowledgeGapJobForTenant } from '../services/knowledge-gaps/digest'
import { scanRoleMentions, saveRoleMentionScan, getRoleMentionScan } from '../services/analytics/role-mentions'
import { roleNameImpact, applyRoleNameChange } from '../services/analytics/policy-adoption'
import { facilityTypeToSetting } from '../lib/care-setting'
import { SERVICE_TRIGGERS, resolveServiceProfile, sanitiseServiceProfile } from '../lib/service-triggers'
import { runCredentialExpiryForTenant } from '../services/workforce/credentialExpiry'

// Tenant settings: inbound email address, email allowlist, logo, email preferences.
// Mounted at /settings in app.ts, behind requireAuth + tenantGuard.
// Admin-only writes; reads are available to all authenticated users.

export const settingsRouter = Router()

const INBOUND_DOMAIN = process.env.INBOUND_EMAIL_DOMAIN ?? 'carestreamai.co.uk'

// Default opt-in state for each email preference key.
// Service emails default on; marketing defaults off (GDPR explicit consent).
const EMAIL_PREF_DEFAULTS: Record<string, boolean> = {
  policy_updates:          true,
  monthly_usage_report:    true,
  knowledge_gap_digest:    true,
  plan_usage_warnings:     true,
  policy_review_reminders: true,
  staff_engagement_alerts: true,
  training_updates:        true,
  audit_updates:           true,
  cqc_staff_prep:          true,
  onboarding_updates:      true,
  compliance_expiry_alerts: true,
  supervision_updates:     true,
  monthly_invoice:         false,
  trg_product_updates:     false,
}

function mergePrefs(stored: unknown): Record<string, boolean> {
  const base = stored && typeof stored === 'object' ? stored as Record<string, unknown> : {}
  const result: Record<string, boolean> = {}
  for (const key of Object.keys(EMAIL_PREF_DEFAULTS)) {
    result[key] = typeof base[key] === 'boolean' ? (base[key] as boolean) : EMAIL_PREF_DEFAULTS[key]
  }
  return result
}

const LOGO_MAX_BYTES  = 2 * 1024 * 1024  // 2 MB
// SVG is intentionally excluded — SVGs can contain <script>, and the logo is
// stored as an inline data: URL, so an SVG logo is a stored-XSS vector.
const LOGO_MIME_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp'])

const logoUpload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: LOGO_MAX_BYTES },
  fileFilter: (_req, file, cb) => {
    if (!LOGO_MIME_TYPES.has(file.mimetype)) {
      cb(new Error('INVALID_FILE_TYPE'))
    } else {
      cb(null, true)
    }
  },
})

// ─── GET /settings ────────────────────────────────────────────────────────────

settingsRouter.get('/', async (req: Request, res: Response) => {
  const tenantId = (req as any).user.tenant_id

  const tenant = await (prisma as any).tenant.findUnique({
    where:  { id: tenantId },
    select: { slug: true, name: true, account_number: true, email_allowlist: true, phone_allowlist: true, facility_type: true, service_profile: true, feature_flags: true, organisation_details: true, response_style: true, branding_signoff: true, logo_url: true, email_preferences: true, staff_roles: true, specialist_roles: true, policy_sections: true, policy_categories: true, custom_languages: true, translation_glossary: true, translation_suggestions_auto_approve: true, room_count: true },
  })

  if (!tenant) return err(res, 'NOT_FOUND', 'Tenant not found', 404)

  const setting = facilityTypeToSetting(tenant.facility_type as string)
  const serviceProfile = resolveServiceProfile(setting, (tenant.service_profile ?? {}) as Record<string, unknown>)

  // Policy role-holders combine names DERIVED from staff (their position or specialist role)
  // with any names entered MANUALLY in Organisation details. A staff member with the matching
  // position/specialism populates the role automatically; admins can add extra names too.
  const od = (tenant.organisation_details ?? {}) as Record<string, string>
  const staff = await (prisma as any).user.findMany({
    where: { tenant_id: tenantId }, select: { name: true, job_role: true, specialisms: true },
  }).catch(() => [])
  const bySpecialism = (m: RegExp) => (staff as any[])
    .filter(s => Array.isArray(s.specialisms) && s.specialisms.some((sp: string) => m.test(String(sp))))
    .map(s => String(s.name)).filter(Boolean)
  const byPosition = (m: RegExp) => (staff as any[])
    .filter(s => m.test(String(s.job_role ?? '')))
    .map(s => String(s.name)).filter(Boolean)
  const manualOf = (key: string) => String(od[key] ?? '').split(',').map(s => s.trim()).filter(Boolean)

  const ROLE_DEFS: Array<{ key: string; role: string; derived: string[] }> = [
    { key: 'registered_manager',  role: 'Registered manager',                  derived: byPosition(/care manager|registered manager/i) },
    { key: 'safeguarding_lead',   role: 'Safeguarding lead',                   derived: bySpecialism(/safeguard/i) },
    { key: 'ipc_lead',            role: 'Infection prevention & control lead', derived: bySpecialism(/infection|(?:^|\b)ipc\b/i) },
    { key: 'dignity_champion',    role: 'Dignity champion',                    derived: bySpecialism(/dignity/i) },
    { key: 'caldicott_guardian',  role: 'Caldicott Guardian',                  derived: bySpecialism(/caldicott/i) },
    { key: 'fire_safety_officer', role: 'Fire safety officer',                 derived: bySpecialism(/fire/i) },
    // Added for the health and safety policy family. The gas, electrical and asbestos
    // policies all name a Maintenance Lead, and there was no field for one, so the drafts
    // carried a bare "[name]" that nobody could fill.
    { key: 'maintenance_lead',    role: 'Maintenance lead',                    derived: [...new Set([...byPosition(/maintenance|handyperson|handyman|estates/i), ...bySpecialism(/maintenance|estates/i)])] },
    { key: 'health_safety_lead',  role: 'Health and safety lead',              derived: bySpecialism(/health (?:and|&) safety|(?:^|\b)h&s\b/i) },
    { key: 'medicines_lead',      role: 'Medicines lead',                      derived: bySpecialism(/medicat|medicine|pharmac/i) },
    { key: 'data_protection_officer', role: 'Data protection officer',         derived: bySpecialism(/data protection|(?:^|\b)dpo\b/i) },
    // Roles that real care policies name a person against. Each is optional and only ever
    // surfaces where a policy actually mentions that role, so an unused one costs nothing.
    { key: 'deputy_manager',      role: 'Deputy manager',                      derived: byPosition(/deputy (?:manager|home manager)/i) },
    { key: 'moving_handling_lead', role: 'Moving and handling lead',           derived: bySpecialism(/moving (?:and|&) handling|manual handling/i) },
    { key: 'mental_capacity_lead', role: 'Mental capacity and DoLS lead',      derived: bySpecialism(/mental capacity|(?:^|\b)mca\b|(?:^|\b)dols\b|liberty protection/i) },
    { key: 'end_of_life_lead',    role: 'End of life care lead',               derived: bySpecialism(/end of life|palliative/i) },
    { key: 'water_safety_lead',   role: 'Water safety lead (Legionella)',      derived: bySpecialism(/legionella|water safety/i) },
    { key: 'training_lead',       role: 'Training lead',                       derived: bySpecialism(/training|learning (?:and|&) development/i) },
    { key: 'freedom_to_speak_up_guardian', role: 'Freedom to Speak Up Guardian', derived: bySpecialism(/freedom to speak up|speak ?up guardian|whistleblow/i) },
    { key: 'complaints_lead', role: 'Complaints lead', derived: bySpecialism(/complaint/i) },
    { key: 'first_aid_lead', role: 'First aid appointed person', derived: bySpecialism(/first aid/i) },
    { key: 'food_safety_lead', role: 'Food safety and allergen lead', derived: bySpecialism(/food safety|food hygiene|allergen|catering|chef/i) },
    { key: 'nutrition_hydration_lead', role: 'Nutrition and hydration lead', derived: bySpecialism(/nutrition|hydration|dietetic/i) },
    { key: 'falls_lead', role: 'Falls lead', derived: bySpecialism(/falls/i) },
    { key: 'tissue_viability_lead', role: 'Tissue viability lead', derived: bySpecialism(/tissue viability|pressure (?:ulcer|area|sore)|wound/i) },
    { key: 'business_continuity_lead', role: 'Business continuity lead', derived: bySpecialism(/business continuity|emergency plan|contingenc/i) },
  ]
  const roleHolders = ROLE_DEFS.map(d => ({ key: d.key, role: d.role, derived: d.derived, manual: manualOf(d.key) }))

  const { own: glossaryOwn, excludes: glossaryExcludes } = splitGlossary(normaliseGlossary(tenant.translation_glossary))
  const platformGlossary = await platformGlossaryList()

  ok(res, {
    inbound_email:      `policies@${tenant.slug}.${INBOUND_DOMAIN}`,
    account_number:     tenant.account_number as string,
    policy_sections:    effectiveSections(tenant.policy_sections as string[]),
    policy_categories:  (tenant.policy_categories as string[]) ?? [],
    email_allowlist:    tenant.email_allowlist as string[],
    phone_allowlist:    (tenant.phone_allowlist as string[]) ?? [],
    facility_type:      tenant.facility_type as string,
    service_profile:    serviceProfile,
    service_triggers:   SERVICE_TRIGGERS.map(t => ({ key: t.key, label: t.label, desc: t.desc })),
    response_style:     (tenant.response_style as string) ?? 'standard',
    branding_signoff:   (tenant.branding_signoff as string) ?? '',
    logo_url:           tenant.logo_url as string | null,
    email_preferences:  mergePrefs(tenant.email_preferences),
    staff_roles:        effectiveStaffRoles(tenant.staff_roles as string[]),
    specialist_roles:   effectiveSpecialistRoles(tenant.specialist_roles as string[]),
    languages:          effectiveLanguages(tenant.custom_languages),
    default_language_codes: DEFAULT_LANGUAGES.map(l => l.code),
    language_catalog:   languageCatalog(),
    translation_glossary: glossaryOwn,
    glossary_excludes:    glossaryExcludes,
    platform_glossary:    platformGlossary,
    translation_suggestions_auto_approve: tenant.translation_suggestions_auto_approve === true,
    room_count:         (tenant.room_count as number) ?? 0,
    feature_flags:      (tenant.feature_flags ?? {}) as Record<string, boolean>,
    organisation_details: (tenant.organisation_details ?? {}) as Record<string, string>,
    org_context:        { home_name: tenant.name as string, has_logo: !!tenant.logo_url, role_holders: roleHolders },
  })
})

// Normalise a stored tenant glossary. Entries are either real terms
// ({ term, keep, note }) or opt-out markers ({ term, exclude: true }) that remove
// a universal (platform) term for this home. Deduped case-insensitively, capped.
type GlossaryEntry = { term: string; keep: boolean; note: string; exclude?: boolean }
function normaliseGlossary(raw: unknown): GlossaryEntry[] {
  if (!Array.isArray(raw)) return []
  const seen = new Set<string>()
  const out: GlossaryEntry[] = []
  for (const e of raw as any[]) {
    const term = typeof e?.term === 'string' ? e.term.trim() : ''
    if (!term) continue
    const key = term.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    if (e?.exclude === true) out.push({ term, keep: false, note: '', exclude: true })
    else out.push({ term, keep: e?.keep !== false, note: typeof e?.note === 'string' ? e.note.trim().slice(0, 200) : '' })
    if (out.length >= 300) break
  }
  return out
}

// Split stored entries into the home's own terms and the universal terms it has
// opted out of (by term string).
function splitGlossary(entries: GlossaryEntry[]): { own: { term: string; keep: boolean; note: string }[]; excludes: string[] } {
  const own: { term: string; keep: boolean; note: string }[] = []
  const excludes: string[] = []
  for (const e of entries) {
    if (e.exclude) excludes.push(e.term)
    else own.push({ term: e.term, keep: e.keep, note: e.note })
  }
  return { own, excludes }
}

// The active universal glossary, shown in each tenant's settings as "saved terms".
async function platformGlossaryList(): Promise<{ term: string; keep: boolean; note: string }[]> {
  try {
    const rows = await (prisma as any).platformGlossary.findMany({ orderBy: { term: 'asc' }, select: { term: true, keep: true, note: true } })
    return (rows as any[]).map(r => ({ term: r.term, keep: r.keep !== false, note: r.note ?? '' }))
  } catch { return [] }
}

// ─── PATCH /settings ─────────────────────────────────────────────────────────
// Admin only. Replaces the full email allowlist.

settingsRouter.patch('/', async (req: Request, res: Response) => {
  const user     = (req as any).user
  const tenantId = user.tenant_id

  if (user.role !== 'admin') {
    return err(res, 'FORBIDDEN', 'Only admins can update settings', 403)
  }

  const { email_allowlist, phone_allowlist, facility_type, service_profile, organisation_details, response_style, branding_signoff, email_preferences, staff_roles, specialist_roles, policy_sections, policy_categories, add_language, remove_language, translation_glossary, translation_suggestions_auto_approve, room_count } = req.body

  if (email_allowlist !== undefined && !Array.isArray(email_allowlist)) {
    return err(res, 'INVALID_INPUT', 'email_allowlist must be an array', 400)
  }

  if (phone_allowlist !== undefined && !Array.isArray(phone_allowlist)) {
    return err(res, 'INVALID_INPUT', 'phone_allowlist must be an array', 400)
  }

  if (facility_type !== undefined && (typeof facility_type !== 'string' || !facility_type.trim())) {
    return err(res, 'INVALID_INPUT', 'facility_type must be a non-empty string', 400)
  }

  const updateData: Record<string, unknown> = {}

  if (email_allowlist !== undefined) {
    const normalised = [
      ...new Set(
        (email_allowlist as unknown[])
          .filter(e => typeof e === 'string')
          .map(e => (e as string).trim().toLowerCase())
          .filter(Boolean),
      ),
    ]
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    const invalid  = normalised.filter(e => !emailRe.test(e))
    if (invalid.length > 0) {
      return err(res, 'INVALID_EMAIL', `Invalid email addresses: ${invalid.join(', ')}`, 400)
    }
    updateData.email_allowlist = normalised
  }

  if (phone_allowlist !== undefined) {
    const normalised = [...new Set(
      (phone_allowlist as unknown[])
        .filter(p => typeof p === 'string')
        .map(p => (p as string).trim())
        .filter(Boolean),
    )]
    const phoneRe = /^\+[1-9]\d{7,14}$/
    const invalid = normalised.filter(p => !phoneRe.test(p))
    if (invalid.length > 0) {
      return err(res, 'INVALID_PHONE', `Invalid phone numbers (use international format, e.g. +447911123456): ${invalid.join(', ')}`, 400)
    }
    updateData.phone_allowlist = normalised
  }

  if (facility_type !== undefined) {
    updateData.facility_type = facility_type.trim().toLowerCase()
  }

  if (service_profile !== undefined) {
    updateData.service_profile = sanitiseServiceProfile(service_profile)
  }

  // Organisation details / policy variables (registered manager, etc.) — merge fields used
  // to personalise policy wording and downloads. Whitelisted keys, trimmed and capped.
  if (organisation_details !== undefined) {
    if (typeof organisation_details !== 'object' || organisation_details === null || Array.isArray(organisation_details)) {
      return err(res, 'INVALID_INPUT', 'organisation_details must be an object', 400)
    }
    const ALLOWED = new Set(['nominated_individual', 'address', 'cqc_location_id', 'cqc_provider_id', 'review_cycle_months', 'version_scheme', 'default_approver', 'show_role_names', 'require_manager_approval', 'require_external_approval', 'require_audit_manager_approval', 'show_readiness_score'])
    // Role-holders can hold MORE THAN ONE person (comma-separated); the tenant picks which
    // one at adoption. These add to the names derived from staff positions/specialisms.
    const ROLE_KEYS = new Set(['registered_manager', 'safeguarding_lead', 'caldicott_guardian', 'ipc_lead', 'fire_safety_officer', 'dignity_champion', 'maintenance_lead', 'health_safety_lead', 'medicines_lead', 'data_protection_officer', 'deputy_manager', 'moving_handling_lead', 'mental_capacity_lead', 'end_of_life_lead', 'water_safety_lead', 'training_lead', 'freedom_to_speak_up_guardian', 'complaints_lead', 'first_aid_lead', 'food_safety_lead', 'nutrition_hydration_lead', 'falls_lead', 'tissue_viability_lead', 'business_continuity_lead'])
    const clean: Record<string, string> = {}
    for (const [k, v] of Object.entries(organisation_details as Record<string, unknown>)) {
      if (!(ALLOWED.has(k) || ROLE_KEYS.has(k)) || typeof v !== 'string') continue
      const cap = k === 'address' ? 300 : ROLE_KEYS.has(k) ? 250 : 120
      const val = v.trim().slice(0, cap)
      if (val) clean[k] = val
    }
    updateData.organisation_details = clean
  }

  if (response_style !== undefined) {
    if (response_style !== 'standard' && response_style !== 'concise') {
      return err(res, 'INVALID_INPUT', 'response_style must be "standard" or "concise"', 400)
    }
    updateData.response_style = response_style
  }

  // Sign-off line the AI uses to close its responses, e.g. "The Crossways Care Team".
  if (branding_signoff !== undefined) {
    if (typeof branding_signoff !== 'string' || !branding_signoff.trim()) {
      return err(res, 'INVALID_INPUT', 'branding_signoff must be a non-empty string', 400)
    }
    if (branding_signoff.trim().length > 120) {
      return err(res, 'INVALID_INPUT', 'branding_signoff must be 120 characters or fewer', 400)
    }
    updateData.branding_signoff = branding_signoff.trim()
  }

  if (staff_roles !== undefined) {
    if (!Array.isArray(staff_roles)) {
      return err(res, 'INVALID_INPUT', 'staff_roles must be an array', 400)
    }
    const normalised = [...new Set(
      (staff_roles as unknown[])
        .filter(r => typeof r === 'string')
        .map(r => (r as string).trim())
        .filter(r => r.length > 0 && r.length <= 100),
    )]
    updateData.staff_roles = normalised
  }

  if (specialist_roles !== undefined) {
    if (!Array.isArray(specialist_roles)) {
      return err(res, 'INVALID_INPUT', 'specialist_roles must be an array', 400)
    }
    updateData.specialist_roles = [...new Set(
      (specialist_roles as unknown[])
        .filter(r => typeof r === 'string')
        .map(r => (r as string).trim())
        .filter(r => r.length > 0 && r.length <= 100),
    )]
  }

  if (policy_sections !== undefined) {
    if (!Array.isArray(policy_sections)) {
      return err(res, 'INVALID_INPUT', 'policy_sections must be an array', 400)
    }
    const normalised = [...new Set(
      (policy_sections as unknown[])
        .filter(s => typeof s === 'string')
        .map(s => (s as string).trim())
        .filter(s => s.length > 0 && s.length <= 100),
    )]
    updateData.policy_sections = normalised
  }

  if (policy_categories !== undefined) {
    if (!Array.isArray(policy_categories)) {
      return err(res, 'INVALID_INPUT', 'policy_categories must be an array', 400)
    }
    updateData.policy_categories = normaliseCategories(policy_categories as unknown[])
  }

  if (email_preferences !== undefined) {
    if (typeof email_preferences !== 'object' || Array.isArray(email_preferences)) {
      return err(res, 'INVALID_INPUT', 'email_preferences must be an object', 400)
    }
    // Only accept known keys with boolean values
    const sanitised: Record<string, boolean> = {}
    for (const key of Object.keys(EMAIL_PREF_DEFAULTS)) {
      if (typeof email_preferences[key] === 'boolean') {
        sanitised[key] = email_preferences[key]
      }
    }
    updateData.email_preferences = sanitised
  }

  // ── Custom languages: add by name / remove by code ──────────────────────────
  // Mutates the tenant's custom_languages list. Adding resolves the typed name
  // to a real ISO 639-3 code where possible (falling back to a private-use code).
  let addedLanguage: { code: string; name: string; resolved: boolean } | null = null
  if (add_language !== undefined || remove_language !== undefined) {
    const current = await (prisma as any).tenant.findUnique({
      where: { id: tenantId }, select: { custom_languages: true },
    })
    let customList: { code: string; name: string }[] = Array.isArray(current?.custom_languages)
      ? (current.custom_languages as any[]).filter(c => c && typeof c.code === 'string' && typeof c.name === 'string')
      : []

    if (typeof add_language === 'string' && add_language.trim()) {
      const defaultCodes = DEFAULT_LANGUAGES.map(l => l.code)
      const taken = new Set<string>([...defaultCodes, ...customList.map(c => c.code)])
      const resolved = resolveLanguageName(add_language, taken)
      if (!resolved) {
        return err(res, 'INVALID_INPUT', 'Language name is required', 400)
      }
      // Skip if it's already available (default or custom) — avoids duplicates.
      const alreadyDefault = defaultCodes.includes(resolved.code)
      const alreadyCustom  = customList.some(c => c.code === resolved.code)
      if (!alreadyDefault && !alreadyCustom) {
        customList = [...customList, { code: resolved.code, name: resolved.name }]
      }
      addedLanguage = resolved
    }

    if (typeof remove_language === 'string' && remove_language.trim()) {
      // Only custom languages can be removed; defaults are always available.
      customList = customList.filter(c => c.code !== remove_language)
    }

    updateData.custom_languages = customList
  }

  // ── Translation glossary (term-locking): full-list replace ──────────────────
  if (translation_glossary !== undefined) {
    if (!Array.isArray(translation_glossary)) {
      return err(res, 'INVALID_INPUT', 'translation_glossary must be an array', 400)
    }
    updateData.translation_glossary = normaliseGlossary(translation_glossary)
  }

  if (translation_suggestions_auto_approve !== undefined) {
    updateData.translation_suggestions_auto_approve = !!translation_suggestions_auto_approve
  }

  // ── Room count (for the per-room audit picker) ──────────────────────────────
  if (room_count !== undefined) {
    const n = Number(room_count)
    if (!Number.isInteger(n) || n < 0 || n > 500) {
      return err(res, 'INVALID_INPUT', 'room_count must be a whole number between 0 and 500', 400)
    }
    updateData.room_count = n
  }

  const updated = await (prisma as any).tenant.update({
    where: { id: tenantId },
    data:  updateData,
    select: { email_allowlist: true, phone_allowlist: true, facility_type: true, service_profile: true, organisation_details: true, email_preferences: true, staff_roles: true, specialist_roles: true, policy_sections: true, policy_categories: true, custom_languages: true, translation_glossary: true, room_count: true },
  })

  ok(res, {
    email_allowlist:   updated.email_allowlist,
    phone_allowlist:   updated.phone_allowlist ?? [],
    facility_type:     updated.facility_type,
    service_profile:   resolveServiceProfile(facilityTypeToSetting(updated.facility_type as string), (updated.service_profile ?? {}) as Record<string, unknown>),
    organisation_details: (updated.organisation_details ?? {}) as Record<string, string>,
    email_preferences: mergePrefs(updated.email_preferences),
    staff_roles:       effectiveStaffRoles(updated.staff_roles),
    specialist_roles:  effectiveSpecialistRoles(updated.specialist_roles),
    policy_sections:   effectiveSections(updated.policy_sections),
    policy_categories: (updated.policy_categories as string[]) ?? [],
    languages:         effectiveLanguages(updated.custom_languages),
    added_language:    addedLanguage,
    translation_glossary: splitGlossary(normaliseGlossary(updated.translation_glossary)).own,
    glossary_excludes:    splitGlossary(normaliseGlossary(updated.translation_glossary)).excludes,
    room_count:        (updated.room_count as number) ?? 0,
  })
})

// ─── POST /settings/knowledge-gap-digest/send ─────────────────────────────────
// Admin "send now": snapshot today's gaps, then send the weekly digest to admins
// and the auto-refresher nudge to staff with open gaps (for this tenant only).

settingsRouter.post('/knowledge-gap-digest/send', async (req: Request, res: Response) => {
  const user = (req as any).user
  if (user.role !== 'admin') { return err(res, 'FORBIDDEN', 'Only admins can send the digest', 403) }
  try {
    const result = await runKnowledgeGapJobForTenant(user.tenant_id, { weekly: true })
    ok(res, result)
  } catch (e: any) {
    err(res, 'SEND_FAILED', e.message, 500)
  }
})

// ─── POST /settings/compliance-expiry/send ────────────────────────────────────
// Admin "send now": email this tenant's admins a digest of staff credentials that
// have expired or expire within 30 days (bypasses the email preference toggle).

settingsRouter.post('/compliance-expiry/send', async (req: Request, res: Response) => {
  const user = (req as any).user
  if (user.role !== 'admin') { return err(res, 'FORBIDDEN', 'Only admins can send the alerts', 403) }
  try {
    const result = await runCredentialExpiryForTenant(user.tenant_id, { force: true })
    ok(res, result)
  } catch (e: any) {
    err(res, 'SEND_FAILED', e.message, 500)
  }
})

// ─── POST /settings/logo ──────────────────────────────────────────────────────
// Upload or replace the tenant logo. Converts to base64 data URL and stores in DB.

settingsRouter.post('/logo', (req: Request, res: Response) => {
  const user = (req as any).user
  if (user.role !== 'admin') {
    return err(res, 'FORBIDDEN', 'Only admins can update settings', 403)
  }

  logoUpload.single('logo')(req, res, async (multerErr: any) => {
    if (multerErr) {
      if (multerErr.message === 'INVALID_FILE_TYPE') {
        return err(res, 'INVALID_FILE_TYPE', 'Only PNG, JPEG, and WebP images are accepted.', 400)
      }
      if (multerErr.code === 'LIMIT_FILE_SIZE') {
        return err(res, 'FILE_TOO_LARGE', 'Logo must be under 2 MB.', 413)
      }
      return err(res, 'UPLOAD_ERROR', 'Upload failed.', 500)
    }

    const file = (req as any).file
    if (!file) return err(res, 'NO_FILE', 'No file provided.', 400)

    // Optimise the logo (upload rule): cap at 400px and re-encode as WebP
    // (preserves transparency) so the stored data URL stays small.
    let buffer = file.buffer as Buffer
    let mime   = file.mimetype as string
    try {
      buffer = await sharp(file.buffer)
        .rotate()
        .resize({ width: 400, height: 400, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 85 })
        .toBuffer()
      mime = 'image/webp'
    } catch { /* keep the original bytes if optimisation fails */ }

    const dataUrl = `data:${mime};base64,${buffer.toString('base64')}`

    await (prisma as any).tenant.update({
      where: { id: user.tenant_id },
      data:  { logo_url: dataUrl },
    })

    ok(res, { logo_url: dataUrl })
  })
})

// ─── DELETE /settings/logo ────────────────────────────────────────────────────

settingsRouter.delete('/logo', async (req: Request, res: Response) => {
  const user = (req as any).user
  if (user.role !== 'admin') {
    return err(res, 'FORBIDDEN', 'Only admins can update settings', 403)
  }

  await (prisma as any).tenant.update({
    where: { id: user.tenant_id },
    data:  { logo_url: null },
  })

  ok(res, { logo_url: null })
})

// ─── Which named roles do this home's own policies actually mention? ──────────
//
// Settings offers twenty four roles. Most homes need a handful, and working out which by
// reading a form of twenty four boxes is the wrong way round. Their policies already say:
// "The Falls Lead reviews every fall at the monthly meeting" is a request for a name,
// written by the home itself.
//
// Reading the stored scan is instant. Running one is not: only a dozen of a typical library
// has its text in Postgres and the rest comes from object storage a policy at a time. So
// running is an explicit action, never a side effect of opening the page. No AI credit is
// spent either way; this is a regex sweep over text we already hold.

settingsRouter.get('/role-mentions', async (req: Request, res: Response) => {
  const user = (req as any).user
  try {
    ok(res, { scan: await getRoleMentionScan(user.tenant_id) })
  } catch (e: any) {
    err(res, 'SCAN_READ_FAILED', e?.message ?? 'could not read the role scan', 500)
  }
})

// ─── Role-holder name changes ─────────────────────────────────────────────────
//
// Removing or replacing a named role holder. Most policies need no change at all: role names
// are substituted at render time, so they show the new name immediately. These two endpoints
// cover the minority whose text NAMES the person, which would otherwise keep the old name for
// ever. See the note above roleNameImpact for why documents are never created here.

settingsRouter.post('/role-name/impact', async (req: Request, res: Response) => {
  const user = (req as any).user
  if (user.role !== 'admin') return err(res, 'FORBIDDEN', 'Only admins can do this', 403)
  const oldName = String((req.body ?? {}).old_name ?? '').trim()
  if (!oldName) return err(res, 'INVALID_INPUT', 'Provide the name being changed', 400)
  try {
    const impact = await roleNameImpact(user.tenant_id, oldName)
    // How many policies mention the ROLE, which update themselves. Read from the cached sweep
    // rather than re-scanning a whole library twice to fill in a number on a dialog.
    const scan = await getRoleMentionScan(user.tenant_id).catch(() => null)
    const roleKey = String((req.body ?? {}).key ?? '')
    const mention = scan?.mentions?.find(m => m.key === roleKey) ?? null
    ok(res, {
      policies: impact.rewritable,
      others:   impact.others,
      total_occurrences: impact.rewritable.reduce((n, p) => n + p.occurrences, 0),
      policies_scanned:    impact.policies_scanned,
      policies_unreadable: impact.policies_unreadable,
      role_mentions: mention ? mention.policies : null,
    })
  } catch (e: any) {
    err(res, 'IMPACT_FAILED', e?.message ?? 'could not check your policies', 500)
  }
})

settingsRouter.post('/role-name/apply', async (req: Request, res: Response) => {
  const user = (req as any).user
  if (user.role !== 'admin') return err(res, 'FORBIDDEN', 'Only admins can do this', 403)
  const body = (req.body ?? {}) as Record<string, unknown>
  const oldName   = String(body.old_name ?? '').trim()
  const newName   = String(body.new_name ?? '').trim()
  const roleLabel = String(body.role_label ?? 'Role holder').trim().slice(0, 80)
  const ids       = Array.isArray(body.policy_ids) ? (body.policy_ids as unknown[]).map(String) : []
  if (!oldName || !newName) return err(res, 'INVALID_INPUT', 'Provide both the old and the new name', 400)
  if (oldName === newName)  return err(res, 'INVALID_INPUT', 'That is the same name', 400)
  // Only the policies the tenant was shown and confirmed, never a set derived here.
  if (!ids.length) return err(res, 'INVALID_INPUT', 'No policies were selected', 400)

  const updated: Array<{ policy_id: string; version: string; occurrences: number; propagated: boolean }> = []
  const failed:  Array<{ policy_id: string; reason: string }> = []
  for (const policyId of ids.slice(0, 200)) {
    try {
      const r = await applyRoleNameChange(user.tenant_id, policyId, {
        role_label: roleLabel, old_name: oldName, new_name: newName, applied_by: user.sub,
      })
      if ('error' in r) failed.push({ policy_id: policyId, reason: r.error })
      else updated.push({ policy_id: policyId, ...r })
    } catch (e: any) {
      failed.push({ policy_id: policyId, reason: e?.message ?? 'failed' })
    }
  }
  ok(res, { updated, failed })
})

settingsRouter.post('/role-mentions/scan', async (req: Request, res: Response) => {
  const user = (req as any).user
  if (user.role !== 'admin') return err(res, 'FORBIDDEN', 'Only admins can run this', 403)
  try {
    const scan = await scanRoleMentions(user.tenant_id)
    await saveRoleMentionScan(user.tenant_id, scan)
    ok(res, { scan })
  } catch (e: any) {
    err(res, 'SCAN_FAILED', e?.message ?? 'could not scan your policies', 500)
  }
})
