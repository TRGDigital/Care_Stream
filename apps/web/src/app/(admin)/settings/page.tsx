'use client'

import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { signIn, signOut, useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { createApiClient } from '@/lib/api-client'
import { persistentCache } from '@/lib/page-cache'
import { Button } from '@/components/ui/button'
import {
  AlertTriangle, Bell, BedDouble, Building2, Check, ChevronDown, ChevronUp, Copy, Loader2,
  Mail, Plus, Search, ShieldCheck, SlidersHorizontal, Trash2, Upload, X,
} from 'lucide-react'

// Active search query, shared with every SettingSection so non-matching
// sections hide themselves (mirrors the Help & Guides search).
const SettingsSearchCtx = createContext('')

// ─── Email preference definitions ─────────────────────────────────────────────

const EMAIL_PREFS = [
  { key: 'policy_updates',         label: 'Policy updates',            description: 'Receive an email when a new policy version is uploaded or an existing policy is updated.',                                                          category: 'service'   },
  { key: 'monthly_usage_report',   label: 'Monthly usage report',      description: 'A monthly summary of query activity, most-cited policies, no-match rate, and staff engagement.',                                                       category: 'service'   },
  { key: 'knowledge_gap_digest',   label: 'Knowledge gap digest',      description: 'A weekly digest of staff queries that could not be matched to any policy — helps you identify gaps in your library.',                                  category: 'service'   },
  { key: 'plan_usage_warnings',    label: 'Plan usage warnings',       description: 'An alert when your monthly query usage reaches 80% and again at 95% of your plan limit.',                                                              category: 'service'   },
  { key: 'policy_review_reminders',label: 'Policy review reminders',   description: 'A reminder when a policy has not been reviewed or updated in 6 months, helping you stay audit-ready.',                                                 category: 'service'   },
  { key: 'staff_engagement_alerts',label: 'Staff engagement alerts',   description: 'A notification when staff query activity drops significantly, so you can follow up with the team.',                                                     category: 'service'   },
  { key: 'training_updates',        label: 'Training updates',          description: 'Notifications when training modules are assigned, completed, or upcoming renewals require attention.',                                               category: 'service'   },
  { key: 'audit_updates',          label: 'Audit updates',             description: 'Notifications when audits are created, completed, or have outstanding actions that require review.',                                                            category: 'service'   },
  { key: 'cqc_staff_prep',         label: 'CQC staff prep',            description: 'Notifications when new CQC preparation questions are assigned to staff or upcoming inspections require action.',                                               category: 'service'   },
  { key: 'onboarding_updates',     label: 'Onboarding',                description: 'Notifications when onboarding tasks are assigned, progressed, or completed for new staff members.',                                                            category: 'service'   },
  { key: 'monthly_invoice',        label: 'Monthly invoice',           description: 'Automatically receive a copy of your paid monthly invoice by email when your billing cycle completes.',                                                         category: 'billing'   },
  { key: 'trg_product_updates',    label: 'Information on other TRG products', description: 'Occasional updates about other products and services from TRG Digital that may be relevant to your organisation.',                                   category: 'marketing' },
] as const

type TrainingSettings = {
  notifications_enabled?: boolean
  notify_90d?: boolean
  notify_30d?: boolean
  notify_7d?: boolean
  notify_manager?: boolean
  question_trigger?: 'auto' | 'on_contact'
}

// ─── Accordion section wrapper ─────────────────────────────────────────────────

function SettingSection({
  title, description, icon: Icon, defaultOpen = false, children,
}: {
  title: string
  description: string
  icon: React.ElementType
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  const query = useContext(SettingsSearchCtx)
  const [open, setOpen] = useState(defaultOpen)

  // Hide sections that don't match the active search (title or description).
  if (query && !`${title} ${description}`.toLowerCase().includes(query)) return null
  // While searching, matching sections open so their content is visible.
  const expanded = query ? true : open

  return (
    <div data-setting-section className="rounded-card overflow-hidden bg-white shadow-card">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex w-full items-center gap-3 px-6 py-4 text-left hover:bg-neutral-light/50 transition-colors"
      >
        <Icon size={16} className="shrink-0 text-teal" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-neutral-dark">{title}</p>
          <p className="text-xs text-neutral-mid mt-0.5">{description}</p>
        </div>
        {expanded
          ? <ChevronUp size={15} className="shrink-0 text-neutral-mid" />
          : <ChevronDown size={15} className="shrink-0 text-neutral-mid" />
        }
      </button>
      {expanded && (
        <div className="border-t border-gray-100 px-6 py-5">
          {children}
        </div>
      )}
    </div>
  )
}

// ─── Danger zone (account closure) ───────────────────────────────────────────

function DangerZone({ token }: { token: string }) {
  const [confirm, setConfirm] = useState('')
  const [closing, setClosing] = useState(false)
  const [error,   setError]   = useState('')

  async function closeAccount() {
    setError(''); setClosing(true)
    try {
      await createApiClient(token).billing.closeAccount()
      // All logins are now deactivated — sign this admin out and send to login.
      await signOut({ callbackUrl: '/login' })
    } catch (e: any) {
      setError(e.message ?? 'Could not close the account.'); setClosing(false)
    }
  }

  // Neutral accordion header (matches the other Settings sections, so it doesn't
  // draw attention); the red styling only appears once the section is opened.
  return (
    <SettingSection
      title="Delete account"
      description="Close this account and remove access for everyone"
      icon={AlertTriangle}
    >
      <div className="rounded-lg border border-red-200 bg-red-50/40 p-4">
        <p className="mb-2 text-sm font-semibold text-red-700">This permanently closes your account.</p>
        <p className="mb-4 max-w-xl text-sm leading-relaxed text-neutral-dark">
          Deleting your account cancels your subscription, immediately signs out and deactivates every login on the
          account, and queues all of your data for permanent erasure. Our team can restore it for 30 days if this was a
          mistake; after that it is gone for good.
        </p>
        <p className="mb-2 text-sm text-neutral-dark">
          Type <span className="font-mono font-bold">DELETE</span> to confirm. Everyone will be signed out immediately.
        </p>
        <input
          value={confirm}
          onChange={e => setConfirm(e.target.value)}
          placeholder="DELETE"
          className="mb-3 w-full max-w-xs rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-200"
        />
        {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
        <button
          onClick={closeAccount}
          disabled={confirm !== 'DELETE' || closing}
          className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {closing ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
          {closing ? 'Closing account…' : 'Permanently delete account'}
        </button>
      </div>
    </SettingSection>
  )
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const { data: session }           = useSession()
  const router                      = useRouter()
  const userId = session?.user?.email ?? 'guest'
  const [inboundEmail,   setInboundEmail]   = useState('')
  const [accountNumber,  setAccountNumber]  = useState('')
  const [allowlist,      setAllowlist]      = useState<string[]>([])
  const [facilityType,   setFacilityType]   = useState('')
  const [roomCount,      setRoomCount]      = useState<number>(0)
  const [savingRooms,    setSavingRooms]    = useState(false)
  const [roomsSaved,     setRoomsSaved]     = useState(false)
  const [logoUrl,        setLogoUrl]        = useState<string | null>(null)
  const [newEmail,       setNewEmail]       = useState('')
  const [staffRoles,     setStaffRoles]     = useState<string[]>([])
  const [newRole,        setNewRole]        = useState('')
  const [savingRoles,    setSavingRoles]    = useState(false)
  const [specialistRoles, setSpecialistRoles] = useState<string[]>([])
  const [newSpecialist,   setNewSpecialist]   = useState('')
  const [savingSpecialists, setSavingSpecialists] = useState(false)
  const [languages,      setLanguages]      = useState<Array<{ code: string; name: string }>>([])
  const [defaultLangCodes, setDefaultLangCodes] = useState<string[]>([])
  const [newLanguage,    setNewLanguage]    = useState('')
  const [savingLanguage, setSavingLanguage] = useState(false)
  const [languageNote,   setLanguageNote]   = useState('')
  const [policySections, setPolicySections] = useState<string[]>([])
  const [newSection,     setNewSection]     = useState('')
  const [savingSections, setSavingSections] = useState(false)
  const [policyCategories, setPolicyCategories] = useState<string[]>([])
  const [newCategory,      setNewCategory]      = useState('')
  const [savingCategories, setSavingCategories] = useState(false)
  const [loading,        setLoading]        = useState(true)
  const [loadError,      setLoadError]      = useState('')
  const [saving,         setSaving]         = useState(false)
  const [savingFacility, setSavingFacility] = useState(false)
  const [logoUploading,  setLogoUploading]  = useState(false)
  const [logoError,      setLogoError]      = useState('')
  const [emailPrefs,     setEmailPrefs]     = useState<Record<string, boolean>>({})
  const [savingPrefKey,  setSavingPrefKey]  = useState<string | null>(null)
  const [error,          setError]          = useState('')
  const [copied,         setCopied]         = useState(false)
  const [trainingSettings,  setTrainingSettings]  = useState<TrainingSettings>({})
  const [savingTraining,    setSavingTraining]    = useState<string | null>(null)
  const [sites,          setSites]          = useState<any[]>([])
  const [showAddSite,    setShowAddSite]    = useState(false)
  const [newSiteName,    setNewSiteName]    = useState('')
  const [search,         setSearch]         = useState('')
  const q = search.trim().toLowerCase()
  const sectionsRef = useRef<HTMLDivElement>(null)
  const [hasResults, setHasResults] = useState(true)
  useEffect(() => {
    if (!q) { setHasResults(true); return }
    setHasResults((sectionsRef.current?.querySelectorAll('[data-setting-section]').length ?? 0) > 0)
  }, [q])
  const [addingSite,     setAddingSite]     = useState(false)
  const [siteError,      setSiteError]      = useState('')
  const [switchingTo,    setSwitchingTo]    = useState<string | null>(null)
  const [responseStyle,  setResponseStyle]  = useState<'standard' | 'concise'>('standard')
  const [savingStyle,    setSavingStyle]    = useState(false)
  const [signoff,        setSignoff]        = useState('')
  const [savingSignoff,  setSavingSignoff]  = useState(false)
  const [signoffSaved,   setSignoffSaved]   = useState(false)
  const [staffDir,       setStaffDir]       = useState<Array<{ email: string; name: string; job_role: string | null; phone_number?: string | null }>>([])

  // Hydrate instantly from the last-loaded snapshot (survives full reloads).
  useEffect(() => {
    const cached = persistentCache.get<{ data: any; sites: any[]; training: any }>(`admin-settings-${userId}`)
    if (!cached) return
    const data = cached.data
    if (data) {
      setInboundEmail(data.inbound_email ?? '')
      setAccountNumber(data.account_number ?? '')
      setAllowlist(data.email_allowlist ?? [])
      setFacilityType(data.facility_type ?? '')
      setRoomCount(data.room_count ?? 0)
      setLogoUrl(data.logo_url ?? null)
      setEmailPrefs(data.email_preferences ?? {})
      setStaffRoles(data.staff_roles ?? [])
      setSpecialistRoles(data.specialist_roles ?? [])
      setLanguages(data.languages ?? [])
      setDefaultLangCodes(data.default_language_codes ?? [])
      setPolicySections(data.policy_sections ?? [])
      setPolicyCategories(data.policy_categories ?? [])
      setResponseStyle(data.response_style ?? 'standard')
      setSignoff(data.branding_signoff ?? '')
    }
    setSites(cached.sites ?? [])
    setTrainingSettings(cached.training?.settings ?? {})
    setLoading(false)
  }, [userId])

  // Staff directory — used to label approved-sender entries with the
  // staff member's name + role for quick admin reference.
  useEffect(() => {
    if (!session?.accessToken) return
    createApiClient(session.accessToken).users.list()
      .then((d: any) => setStaffDir(Array.isArray(d) ? d : (d?.users ?? [])))
      .catch(() => {})
  }, [session?.accessToken])

  const userByEmail = new Map(staffDir.filter(u => u.email).map(u => [u.email.toLowerCase(), u]))
  const staffSuffix = (u?: { name: string; job_role: string | null }) =>
    u ? ` — ${u.name}${u.job_role ? ` (${u.job_role})` : ''}` : ''

  useEffect(() => {
    if (!session?.accessToken) return
    const api = createApiClient(session.accessToken)
    Promise.all([
      api.settings.get(),
      api.sites.list(),
      api.training.getSettings(),
    ])
      .then(([data, sitesData, trainingData]) => {
        setInboundEmail(data.inbound_email)
        setAccountNumber((data as any).account_number ?? '')
        setAllowlist(data.email_allowlist)
        setFacilityType((data as any).facility_type ?? 'care home')
        setRoomCount((data as any).room_count ?? 0)
        setLogoUrl((data as any).logo_url ?? null)
        setEmailPrefs((data as any).email_preferences ?? {})
        setStaffRoles((data as any).staff_roles ?? [])
        setSpecialistRoles((data as any).specialist_roles ?? [])
        setLanguages((data as any).languages ?? [])
        setDefaultLangCodes((data as any).default_language_codes ?? [])
        setPolicySections((data as any).policy_sections ?? [])
        setPolicyCategories((data as any).policy_categories ?? [])
        setResponseStyle((data as any).response_style ?? 'standard')
        setSignoff((data as any).branding_signoff ?? '')
        setSites(sitesData.sites)
        setTrainingSettings(trainingData.settings ?? {})
        persistentCache.set(`admin-settings-${userId}`, { data, sites: sitesData.sites, training: trainingData })
      })
      .catch((e: any) => setLoadError(e.message ?? 'Failed to load settings'))
      .finally(() => setLoading(false))
  }, [session?.accessToken])

  async function saveFacilityType() {
    if (!session?.accessToken || !facilityType.trim()) return
    setSavingFacility(true)
    try { await createApiClient(session.accessToken).settings.update({ facility_type: facilityType.trim() } as any) }
    catch (e: any) { setError(e.message ?? 'Failed to save') }
    finally { setSavingFacility(false) }
  }

  async function saveRoomCount() {
    if (!session?.accessToken) return
    const n = Math.max(0, Math.min(500, Math.floor(Number(roomCount) || 0)))
    setSavingRooms(true); setRoomsSaved(false)
    try { await createApiClient(session.accessToken).settings.update({ room_count: n } as any); setRoomCount(n); setRoomsSaved(true); setTimeout(() => setRoomsSaved(false), 2500) }
    catch (e: any) { setError(e.message ?? 'Failed to save') }
    finally { setSavingRooms(false) }
  }

  async function saveResponseStyleValue(value: 'standard' | 'concise') {
    if (!session?.accessToken) return
    setResponseStyle(value); setSavingStyle(true)
    try { await createApiClient(session.accessToken).settings.update({ response_style: value }) }
    catch (e: any) { setError(e.message ?? 'Failed to save') }
    finally { setSavingStyle(false) }
  }

  async function saveSignoff() {
    if (!session?.accessToken || !signoff.trim()) return
    setSavingSignoff(true)
    try {
      await createApiClient(session.accessToken).settings.update({ branding_signoff: signoff.trim() })
      setSignoffSaved(true); setTimeout(() => setSignoffSaved(false), 2500)
    }
    catch (e: any) { setError(e.message ?? 'Failed to save') }
    finally { setSavingSignoff(false) }
  }

  async function saveStaffRoles(updated: string[]) {
    if (!session?.accessToken) return
    setSavingRoles(true)
    try {
      const data = await createApiClient(session.accessToken).settings.update({ staff_roles: updated })
      setStaffRoles(data.staff_roles)
    } catch (e: any) { setError(e.message ?? 'Failed to save') }
    finally { setSavingRoles(false) }
  }

  function addRole() {
    const role = newRole.trim()
    if (!role) return
    if (staffRoles.includes(role)) { setError('That role already exists.'); return }
    setError('')
    const updated = [...staffRoles, role]
    setStaffRoles(updated); setNewRole('')
    saveStaffRoles(updated)
  }

  function removeRole(role: string) {
    const updated = staffRoles.filter(r => r !== role)
    setStaffRoles(updated); saveStaffRoles(updated)
  }

  async function saveSpecialistRoles(updated: string[]) {
    if (!session?.accessToken) return
    setSavingSpecialists(true)
    try {
      const data = await createApiClient(session.accessToken).settings.update({ specialist_roles: updated })
      setSpecialistRoles(data.specialist_roles)
    } catch (e: any) { setError(e.message ?? 'Failed to save') }
    finally { setSavingSpecialists(false) }
  }
  function addSpecialist() {
    const r = newSpecialist.trim()
    if (!r) return
    if (specialistRoles.includes(r)) { setError('That specialist role already exists.'); return }
    setError('')
    const updated = [...specialistRoles, r]
    setSpecialistRoles(updated); setNewSpecialist('')
    saveSpecialistRoles(updated)
  }
  function removeSpecialist(r: string) {
    const updated = specialistRoles.filter(x => x !== r)
    setSpecialistRoles(updated); saveSpecialistRoles(updated)
  }

  async function addLanguage() {
    const name = newLanguage.trim()
    if (!name || !session?.accessToken) return
    if (languages.some(l => l.name.toLowerCase() === name.toLowerCase())) {
      setError('That language is already available.'); return
    }
    setError(''); setLanguageNote(''); setSavingLanguage(true)
    try {
      const data = await createApiClient(session.accessToken).settings.update({ add_language: name })
      if ((data as any).languages) setLanguages((data as any).languages)
      setNewLanguage('')
      const added = (data as any).added_language
      if (added) {
        setLanguageNote(added.resolved
          ? `Added ${added.name} — staff can now write to CareStream in it and it will auto-detect their messages.`
          : `Added ${added.name}. CareStream will translate all outbound messages into it; inbound auto-detection may be limited, but staff with this set as their first language still receive everything translated.`)
      }
    } catch (e: any) { setError(e.message ?? 'Failed to add language') }
    finally { setSavingLanguage(false) }
  }
  async function removeLanguage(code: string) {
    if (!session?.accessToken) return
    setSavingLanguage(true); setLanguageNote('')
    try {
      const data = await createApiClient(session.accessToken).settings.update({ remove_language: code })
      if ((data as any).languages) setLanguages((data as any).languages)
    } catch (e: any) { setError(e.message ?? 'Failed to remove language') }
    finally { setSavingLanguage(false) }
  }

  async function saveSections(updated: string[]) {
    if (!session?.accessToken) return
    setSavingSections(true)
    try {
      const data = await createApiClient(session.accessToken).settings.update({ policy_sections: updated })
      setPolicySections(data.policy_sections)
    } catch (e: any) { setError(e.message ?? 'Failed to save') }
    finally { setSavingSections(false) }
  }

  function addSection() {
    const s = newSection.trim()
    if (!s) return
    if (policySections.some(x => x.toLowerCase() === s.toLowerCase())) { setError('That section already exists.'); return }
    setError('')
    const updated = [...policySections, s]
    setPolicySections(updated); setNewSection('')
    saveSections(updated)
  }

  function removeSection(s: string) {
    const updated = policySections.filter(x => x !== s)
    setPolicySections(updated); saveSections(updated)
  }

  // The 3 built-in categories are fixed and always present; tenants add their own.
  const BUILTIN_CATEGORY_LABELS = ['Internal policy', 'Staff handbook', 'CQC Report']

  async function saveCategories(updated: string[]) {
    if (!session?.accessToken) return
    setSavingCategories(true)
    try {
      const data = await createApiClient(session.accessToken).settings.update({ policy_categories: updated })
      setPolicyCategories(data.policy_categories)
    } catch (e: any) { setError(e.message ?? 'Failed to save') }
    finally { setSavingCategories(false) }
  }

  function addCategory() {
    const c = newCategory.trim()
    if (!c) return
    if (BUILTIN_CATEGORY_LABELS.some(x => x.toLowerCase() === c.toLowerCase())) { setError('That is a built-in category.'); return }
    if (policyCategories.some(x => x.toLowerCase() === c.toLowerCase())) { setError('That category already exists.'); return }
    setError('')
    const updated = [...policyCategories, c]
    setPolicyCategories(updated); setNewCategory('')
    saveCategories(updated)
  }

  function removeCategory(c: string) {
    const updated = policyCategories.filter(x => x !== c)
    setPolicyCategories(updated); saveCategories(updated)
  }

  async function uploadLogo(file: File) {
    if (!session?.accessToken) return
    setLogoError(''); setLogoUploading(true)
    try {
      const data = await createApiClient(session.accessToken).settings.uploadLogo(file)
      setLogoUrl(data.logo_url)
    } catch (e: any) { setLogoError(e.message ?? 'Failed to upload logo.') }
    finally { setLogoUploading(false) }
  }

  async function saveEmailPref(key: string, value: boolean) {
    if (!session?.accessToken) return
    const prev = emailPrefs
    const updated = { ...emailPrefs, [key]: value }
    setEmailPrefs(updated); setSavingPrefKey(key)
    const started = Date.now()
    try {
      const data = await createApiClient(session.accessToken).settings.update({ email_preferences: updated })
      setEmailPrefs(data.email_preferences)
    } catch (e: any) { setError(e.message ?? 'Failed to save preference.'); setEmailPrefs(prev) }
    finally {
      const delay = Math.max(0, 600 - (Date.now() - started))
      setTimeout(() => setSavingPrefKey(null), delay)
    }
  }

  async function removeLogo() {
    if (!session?.accessToken) return
    setLogoError(''); setLogoUploading(true)
    try { await createApiClient(session.accessToken).settings.deleteLogo(); setLogoUrl(null) }
    catch (e: any) { setLogoError(e.message ?? 'Failed to remove logo.') }
    finally { setLogoUploading(false) }
  }

  async function save(updated: string[]) {
    if (!session?.accessToken) return
    setSaving(true); setError('')
    try {
      const data = await createApiClient(session.accessToken).settings.update({ email_allowlist: updated })
      setAllowlist(data.email_allowlist)
    } catch (e: any) { setError(e.message ?? 'Failed to save') }
    finally { setSaving(false) }
  }

  function addEmail() {
    const email = newEmail.trim().toLowerCase()
    if (!email) return
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError('Please enter a valid email address.'); return }
    if (allowlist.includes(email)) { setError('That address is already on the list.'); return }
    setError('')
    const updated = [...allowlist, email]
    setAllowlist(updated); setNewEmail(''); save(updated)
  }

  function removeEmail(email: string) {
    const updated = allowlist.filter(e => e !== email)
    setAllowlist(updated); save(updated)
  }


  async function addSite() {
    if (!session?.accessToken || !newSiteName.trim()) return
    setAddingSite(true); setSiteError('')
    try {
      const result = await createApiClient(session.accessToken).sites.create({ name: newSiteName.trim() })
      setSites(prev => [...prev, { id: result.tenant.id, name: result.tenant.name, slug: result.tenant.slug, subscription_status: 'active', is_current: false, is_root: false }])
      setNewSiteName(''); setShowAddSite(false)
    } catch (e: any) { setSiteError(e.message ?? 'Failed to add site.') }
    finally { setAddingSite(false) }
  }

  async function switchSite(targetId: string, targetName: string) {
    if (!session?.accessToken || switchingTo) return
    setSwitchingTo(targetId)
    try {
      const result = await createApiClient(session.accessToken).sites.switch(targetId)
      await signIn('credentials', { redirect: false, mode: 'switch', access_token: result.access_token, refresh_token: result.refresh_token, tenant_name: result.tenant.name, user_name: session.user.name ?? '', user_email: session.user.email ?? '' })
      router.refresh()
    } catch (e: any) { setSiteError(e.message ?? 'Failed to switch site.') }
    finally { setSwitchingTo(null) }
  }

  async function saveTrainingSetting(key: keyof TrainingSettings, value: boolean | string) {
    if (!session?.accessToken) return
    const prev = trainingSettings
    const updated = { ...trainingSettings, [key]: value }
    setTrainingSettings(updated); setSavingTraining(key)
    try {
      const data = await createApiClient(session.accessToken).training.updateSettings({ [key]: value })
      setTrainingSettings(data.settings ?? updated)
    } catch (e: any) { setError(e.message ?? 'Failed to save.'); setTrainingSettings(prev) }
    finally { setSavingTraining(null) }
  }

  function copyEmail() {
    navigator.clipboard.writeText(inboundEmail).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) })
  }

  // ─── Shared input / toggle styles ──────────────────────────────────────────

  const INPUT = 'flex-1 rounded-md border border-gray-200 px-3 py-2 text-sm text-neutral-dark placeholder:text-neutral-mid focus:border-teal focus:outline-none focus:ring-1 focus:ring-teal'

  function OnOffToggle({ name, isOn, onChange, disabled }: { name: string; isOn: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
    return (
      <div className="flex shrink-0 gap-4 pt-0.5">
        {(['On', 'Off'] as const).map(label => {
          const active = label === 'On' ? isOn : !isOn
          return (
            <label key={label} className="flex cursor-pointer items-center gap-1.5 text-sm">
              <input type="radio" name={name} checked={active} onChange={() => onChange(label === 'On')} disabled={disabled} className="accent-teal" />
              <span className={active ? 'font-medium text-neutral-dark' : 'text-neutral-mid'}>{label}</span>
            </label>
          )
        })}
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="mb-2 text-2xl font-bold text-neutral-dark">Settings</h1>
          <p className="text-sm text-neutral-mid">Click any section to expand and make changes. Changes save automatically.</p>
        </div>
        {accountNumber && (
          <div className="rounded-lg border border-gray-200 bg-neutral-light px-4 py-2 text-right">
            <p className="text-xs font-medium text-neutral-mid">Account number</p>
            <p className="font-mono text-base font-semibold text-neutral-dark">{accountNumber}</p>
          </div>
        )}
      </div>

      {loadError && (
        <div className="mb-6 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
          Could not load settings: {loadError}. Make sure the API server is running.
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {/* Search */}
      <div className="mb-4">
        <div className="relative">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-mid" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search settings — e.g. email, logo, sites, language, training…"
            className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-9 text-sm focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/20"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-mid hover:text-neutral-dark"
              aria-label="Clear search"
            >
              <X size={15} />
            </button>
          )}
        </div>
      </div>

      <SettingsSearchCtx.Provider value={q}>
      <div ref={sectionsRef} className="space-y-3">

        {q && !hasResults && (
          <div className="rounded-card border border-gray-200 bg-white px-5 py-8 text-center text-sm text-neutral-mid">
            No settings match &ldquo;{search.trim()}&rdquo;.
          </div>
        )}

        {/* ── Dedicated email address ──────────────────────────────────────── */}
        <SettingSection icon={Mail} title="Dedicated email address" description="Your unique inbound email address for staff policy queries." defaultOpen>
          <p className="mb-4 text-sm text-neutral-mid">
            Staff send their policy questions to this address. CareStream responds automatically with the relevant policy information.
          </p>
          {loading ? (
            <div className="h-10 animate-pulse rounded-md bg-gray-100" />
          ) : inboundEmail ? (
            <div className="flex items-center gap-3">
              <div className="flex flex-1 items-center gap-2 rounded-md border border-gray-200 bg-neutral-light px-4 py-2.5">
                <Mail size={15} className="shrink-0 text-neutral-mid" />
                <span className="text-sm font-medium text-neutral-dark">{inboundEmail}</span>
              </div>
              <button
                onClick={copyEmail}
                className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-3 py-2.5 text-xs font-medium text-neutral-mid shadow-sm hover:bg-gray-50"
              >
                {copied ? <Check size={13} className="text-green-600" /> : <Copy size={13} />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
          ) : !loadError ? (
            <p className="text-sm text-neutral-mid">Email address not available.</p>
          ) : null}
        </SettingSection>

        {/* ── Facility type ─────────────────────────────────────────────────── */}
        <SettingSection icon={Building2} title="Facility type" description="Personalises AI responses to your type of care setting.">
          <p className="mb-4 text-sm text-neutral-mid">
            Used to personalise AI responses and knowledge extraction. Examples: care home, nursing home, residential home, supported living, domiciliary care.
          </p>
          <div className="flex gap-2">
            <input type="text" value={facilityType} onChange={e => setFacilityType(e.target.value)} onKeyDown={e => e.key === 'Enter' && saveFacilityType()} placeholder="e.g. nursing home" className={INPUT} />
            <Button onClick={saveFacilityType} disabled={savingFacility || !facilityType.trim()} size="md">
              {savingFacility ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </SettingSection>

        {/* ── Rooms ─────────────────────────────────────────────────────────── */}
        <SettingSection icon={BedDouble} title="Rooms" description="The number of rooms/beds in your home — used for per-room audits (e.g. bedroom checks).">
          <p className="mb-4 text-sm text-neutral-mid">
            When you start a room-based audit in the hub or here, you&apos;ll pick a room from <strong>1</strong> to this number. Any custom room names you type while auditing are remembered too.
          </p>
          <div className="flex items-center gap-2">
            <input
              type="number" min={0} max={500}
              value={roomCount}
              onChange={e => setRoomCount(Number(e.target.value))}
              onKeyDown={e => e.key === 'Enter' && saveRoomCount()}
              className={`${INPUT} w-32`}
            />
            <Button onClick={saveRoomCount} disabled={savingRooms} size="md">
              {savingRooms ? 'Saving…' : 'Save'}
            </Button>
            {roomsSaved && <span className="flex items-center gap-1 text-sm font-medium text-green-600"><Check size={14} /> Saved</span>}
          </div>
        </SettingSection>

        {/* ── Response detail level ─────────────────────────────────────────── */}
        <SettingSection icon={SlidersHorizontal} title="Response detail level" description="Choose how much detail CareStream includes in its responses.">
          <p className="mb-5 text-sm text-neutral-mid">
            Controls the length and depth of AI responses across all channels.
          </p>
          <div className="space-y-3">
            {([
              { value: 'standard', label: 'Standard', description: 'Thorough responses with full policy context, bullet points, regulatory references, and a practical summary. Best for desktop or email queries.' },
              { value: 'concise',  label: 'Concise',  description: 'Short, focused responses — 2 to 3 key points only, under 200 words. Best when staff need a quick answer on the go.' },
            ] as const).map(opt => {
              const active = responseStyle === opt.value
              return (
                <label
                  key={opt.value}
                  className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors ${active ? 'border-teal bg-teal-light/30' : 'border-gray-200 hover:border-gray-300'}`}
                >
                  <input
                    type="radio"
                    name="response_style"
                    value={opt.value}
                    checked={active}
                    onChange={() => saveResponseStyleValue(opt.value)}
                    disabled={loading || savingStyle}
                    className="mt-0.5 accent-teal"
                  />
                  <div>
                    <p className={`text-sm font-medium ${active ? 'text-teal' : 'text-neutral-dark'}`}>{opt.label}</p>
                    <p className="mt-0.5 text-xs text-neutral-mid">{opt.description}</p>
                  </div>
                </label>
              )
            })}
          </div>
          {savingStyle && <p className="mt-3 text-xs text-neutral-mid">Saving…</p>}
        </SettingSection>

        {/* ── AI sign-off message ───────────────────────────────────────────── */}
        <SettingSection icon={Mail} title="AI sign-off message" description="The line CareStream signs off with at the end of its answers to your staff.">
          <p className="mb-4 text-sm text-neutral-mid">
            Every AI answer ends with this line. For example <strong>The Crossways Care Team</strong>, <strong>Kind regards, the Management Team</strong>, or simply your organisation name.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              value={signoff}
              onChange={e => setSignoff(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && saveSignoff()}
              placeholder="e.g. The Crossways Care Team"
              maxLength={120}
              className={INPUT}
            />
            <Button onClick={saveSignoff} disabled={savingSignoff || !signoff.trim()} size="md">
              {savingSignoff ? 'Saving…' : 'Save'}
            </Button>
            {signoffSaved && <span className="flex items-center gap-1 text-sm font-medium text-green-600"><Check size={14} /> Saved</span>}
          </div>
        </SettingSection>

        {/* ── Organisation logo ─────────────────────────────────────────────── */}
        <SettingSection icon={Upload} title="Organisation logo" description="Appears on your CQC Inspection Evidence Report alongside the CareStream logo.">
          <p className="mb-4 text-sm text-neutral-mid">
            Accepted formats: PNG, JPEG, WebP, SVG — max 2 MB.
          </p>
          {logoError && <p className="mb-4 rounded-md bg-red-50 px-4 py-2.5 text-sm text-red-700">{logoError}</p>}
          {logoUrl ? (
            <div className="flex items-center gap-4">
              <div className="flex h-20 w-48 items-center justify-center rounded-md border border-gray-200 bg-neutral-light p-3">
                <img src={logoUrl} alt="Organisation logo" className="max-h-full max-w-full object-contain" />
              </div>
              <div className="flex flex-col gap-2">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-neutral-mid shadow-sm hover:bg-gray-50">
                  <Upload size={13} />Replace logo
                  <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="sr-only" disabled={logoUploading} onChange={e => { const f = e.target.files?.[0]; if (f) uploadLogo(f); e.target.value = '' }} />
                </label>
                <button onClick={removeLogo} disabled={logoUploading} className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50">
                  <X size={13} />Remove logo
                </button>
              </div>
              {logoUploading && <span className="text-xs text-neutral-mid">Saving…</span>}
            </div>
          ) : (
            <label className={`inline-flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-gray-300 bg-neutral-light px-5 py-4 text-sm font-medium text-neutral-mid hover:border-teal hover:text-teal ${logoUploading ? 'pointer-events-none opacity-50' : ''}`}>
              <Upload size={16} />
              {logoUploading ? 'Uploading…' : 'Upload logo'}
              <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="sr-only" disabled={logoUploading} onChange={e => { const f = e.target.files?.[0]; if (f) uploadLogo(f); e.target.value = '' }} />
            </label>
          )}
        </SettingSection>

        {/* ── Positions ─────────────────────────────────────────────────────── */}
        <SettingSection icon={Plus} title="Positions" description="The staff positions you can choose when adding a staff member.">
          <p className="mb-4 text-sm text-neutral-mid">
            A staff member&rsquo;s position drives their onboarding and training. The standard care/nursing positions are provided — add any extras specific to your home.
          </p>
          <div className="mb-4 flex gap-2">
            <input type="text" value={newRole} onChange={e => { setNewRole(e.target.value); setError('') }} onKeyDown={e => e.key === 'Enter' && addRole()} placeholder="e.g. Care Assistant" className={INPUT} />
            <Button onClick={addRole} disabled={savingRoles || !newRole.trim()} size="md">
              <Plus size={14} className="mr-1.5" />Add
            </Button>
          </div>
          {staffRoles.length === 0 ? (
            <p className="rounded-md bg-neutral-light px-4 py-3 text-sm text-neutral-mid">No roles added yet — staff will be added without a specific role.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {staffRoles.map(role => (
                <span key={role} className="flex items-center gap-1.5 rounded-full border border-gray-200 bg-neutral-light py-1 pl-3 pr-2 text-sm text-neutral-dark">
                  {role}
                  <button onClick={() => removeRole(role)} disabled={savingRoles} className="flex h-4 w-4 items-center justify-center rounded-full text-neutral-mid hover:bg-gray-300 hover:text-neutral-dark disabled:opacity-40" title="Remove">
                    <X size={10} />
                  </button>
                </span>
              ))}
            </div>
          )}
          {savingRoles && <p className="mt-3 text-xs text-neutral-mid">Saving…</p>}
        </SettingSection>

        {/* ── Specialist roles ──────────────────────────────────────────────── */}
        <SettingSection icon={Plus} title="Specialist roles" description="Specialisms a staff member can hold in addition to their position.">
          <p className="mb-4 text-sm text-neutral-mid">
            When adding staff you can flag specialist roles (e.g. Infection Control, Night Staff). These add the matching specialist onboarding &amp; training. Add any extras your home uses.
          </p>
          <div className="mb-4 flex gap-2">
            <input type="text" value={newSpecialist} onChange={e => { setNewSpecialist(e.target.value); setError('') }} onKeyDown={e => e.key === 'Enter' && addSpecialist()} placeholder="e.g. Infection Control" className={INPUT} />
            <Button onClick={addSpecialist} disabled={savingSpecialists || !newSpecialist.trim()} size="md">
              <Plus size={14} className="mr-1.5" />Add
            </Button>
          </div>
          {specialistRoles.length === 0 ? (
            <p className="rounded-md bg-neutral-light px-4 py-3 text-sm text-neutral-mid">No specialist roles yet.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {specialistRoles.map(r => (
                <span key={r} className="flex items-center gap-1.5 rounded-full border border-gray-200 bg-neutral-light py-1 pl-3 pr-2 text-sm text-neutral-dark">
                  {r}
                  <button onClick={() => removeSpecialist(r)} disabled={savingSpecialists} className="flex h-4 w-4 items-center justify-center rounded-full text-neutral-mid hover:bg-gray-300 hover:text-neutral-dark disabled:opacity-40" title="Remove">
                    <X size={10} />
                  </button>
                </span>
              ))}
            </div>
          )}
          {savingSpecialists && <p className="mt-3 text-xs text-neutral-mid">Saving…</p>}
        </SettingSection>

        {/* ── Staff languages ───────────────────────────────────────────────── */}
        <SettingSection icon={Plus} title="Languages" description="The languages you can pick as a staff member's first or second language.">
          <p className="mb-4 text-sm text-neutral-mid">
            CareStream supports 50+ languages out of the box. Add any others your team speaks — they’ll appear in the first &amp; second language dropdowns when adding or editing a staff member, so their training and communications can be personalised to them.
          </p>
          <div className="mb-1 flex gap-2">
            <input type="text" value={newLanguage} onChange={e => { setNewLanguage(e.target.value); setError('') }} onKeyDown={e => e.key === 'Enter' && addLanguage()} placeholder="e.g. Twi, Shona, Malayalam" className={INPUT} />
            <Button onClick={addLanguage} disabled={savingLanguage || !newLanguage.trim()} size="md">
              <Plus size={14} className="mr-1.5" />Add
            </Button>
          </div>
          <p className="mb-4 text-xs text-neutral-mid">Type the language’s English name (e.g. “Shona”). Default languages are always available; only the ones you add can be removed.</p>
          {languageNote && (
            <div className="mb-4 rounded-md border border-teal/20 bg-teal-light/30 px-4 py-2.5 text-xs text-neutral-dark">{languageNote}</div>
          )}
          {languages.length === 0 ? (
            <p className="rounded-md bg-neutral-light px-4 py-3 text-sm text-neutral-mid">Loading languages…</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {languages.map(l => {
                const isDefault = defaultLangCodes.includes(l.code)
                return (
                  <span key={l.code} className={`flex items-center gap-1.5 rounded-full border py-1 pl-3 text-sm ${isDefault ? 'border-gray-200 bg-neutral-light pr-3 text-neutral-mid' : 'border-teal/30 bg-teal-light/30 pr-2 text-neutral-dark'}`}>
                    {l.name}
                    {!isDefault && (
                      <button onClick={() => removeLanguage(l.code)} disabled={savingLanguage} className="flex h-4 w-4 items-center justify-center rounded-full text-neutral-mid hover:bg-gray-300 hover:text-neutral-dark disabled:opacity-40" title="Remove">
                        <X size={10} />
                      </button>
                    )}
                  </span>
                )
              })}
            </div>
          )}
          {savingLanguage && <p className="mt-3 text-xs text-neutral-mid">Saving…</p>}
        </SettingSection>

        {/* ── Policy sections ───────────────────────────────────────────────── */}
        <SettingSection icon={SlidersHorizontal} title="Policy sections" description="The sections you can file internal policies under when uploading.">
          <p className="mb-4 text-sm text-neutral-mid">
            When you bulk-upload internal policies, you can tag the batch with one of these sections (e.g. Safeguarding, GDPR). Add your own to match how your policies are organised.
          </p>
          <div className="mb-4 flex gap-2">
            <input type="text" value={newSection} onChange={e => { setNewSection(e.target.value); setError('') }} onKeyDown={e => e.key === 'Enter' && addSection()} placeholder="e.g. Medication management" className={INPUT} />
            <Button onClick={addSection} disabled={savingSections || !newSection.trim()} size="md">
              <Plus size={14} className="mr-1.5" />Add
            </Button>
          </div>
          {policySections.length === 0 ? (
            <p className="rounded-md bg-neutral-light px-4 py-3 text-sm text-neutral-mid">No sections yet.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {policySections.map(s => (
                <span key={s} className="flex items-center gap-1.5 rounded-full border border-gray-200 bg-neutral-light py-1 pl-3 pr-2 text-sm text-neutral-dark">
                  {s}
                  <button onClick={() => removeSection(s)} disabled={savingSections} className="flex h-4 w-4 items-center justify-center rounded-full text-neutral-mid hover:bg-gray-300 hover:text-neutral-dark disabled:opacity-40" title="Remove">
                    <X size={10} />
                  </button>
                </span>
              ))}
            </div>
          )}
          {savingSections && <p className="mt-3 text-xs text-neutral-mid">Saving…</p>}
        </SettingSection>

        {/* ── Document categories ───────────────────────────────────────────── */}
        <SettingSection icon={SlidersHorizontal} title="Document categories" description="The categories you can choose when uploading documents.">
          <p className="mb-4 text-sm text-neutral-mid">
            Every account has three built-in categories — <strong>Internal policy</strong>, <strong>Staff handbook</strong> and <strong>CQC Report</strong>. Add your own here (e.g. Risk Assessments, Newsletters) and they will appear in the Category dropdown when uploading.
          </p>
          <div className="mb-4 flex flex-wrap gap-2">
            {BUILTIN_CATEGORY_LABELS.map(c => (
              <span key={c} className="flex items-center gap-1.5 rounded-full border border-gray-200 bg-white py-1 px-3 text-sm text-neutral-mid">
                {c}
                <span className="text-xs text-neutral-mid/70">built-in</span>
              </span>
            ))}
          </div>
          <div className="mb-4 flex gap-2">
            <input type="text" value={newCategory} onChange={e => { setNewCategory(e.target.value); setError('') }} onKeyDown={e => e.key === 'Enter' && addCategory()} placeholder="e.g. Risk Assessments" className={INPUT} />
            <Button onClick={addCategory} disabled={savingCategories || !newCategory.trim()} size="md">
              <Plus size={14} className="mr-1.5" />Add
            </Button>
          </div>
          {policyCategories.length === 0 ? (
            <p className="rounded-md bg-neutral-light px-4 py-3 text-sm text-neutral-mid">No custom categories yet.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {policyCategories.map(c => (
                <span key={c} className="flex items-center gap-1.5 rounded-full border border-gray-200 bg-neutral-light py-1 pl-3 pr-2 text-sm text-neutral-dark">
                  {c}
                  <button onClick={() => removeCategory(c)} disabled={savingCategories} className="flex h-4 w-4 items-center justify-center rounded-full text-neutral-mid hover:bg-gray-300 hover:text-neutral-dark disabled:opacity-40" title="Remove">
                    <X size={10} />
                  </button>
                </span>
              ))}
            </div>
          )}
          {savingCategories && <p className="mt-3 text-xs text-neutral-mid">Saving…</p>}
        </SettingSection>

        {/* ── Approved sender addresses ─────────────────────────────────────── */}
        <SettingSection icon={Mail} title="Approved sender addresses" description="Restrict which email addresses can query CareStream by email.">
          <p className="mb-5 text-sm text-neutral-mid">
            Only emails received from addresses on this list will receive a response. Emails from any other address are silently discarded.
            Leave the list empty to allow any registered staff member to query via email.
          </p>
          <div className="mb-5 flex gap-2">
            <input type="email" value={newEmail} onChange={e => { setNewEmail(e.target.value); setError('') }} onKeyDown={e => e.key === 'Enter' && addEmail()} placeholder="e.g. nurses@yourcarecompany.co.uk" className={INPUT} />
            <Button onClick={addEmail} disabled={saving || !newEmail.trim()} size="md">
              <Plus size={14} className="mr-1.5" />Add
            </Button>
          </div>
          {loading ? (
            <div className="space-y-2">{[1, 2].map(i => <div key={i} className="h-10 animate-pulse rounded-md bg-gray-100" />)}</div>
          ) : allowlist.length === 0 ? (
            <p className="rounded-md bg-neutral-light px-4 py-3 text-sm text-neutral-mid">No approved addresses added yet — all registered staff can query via email.</p>
          ) : (
            <ul className="divide-y divide-gray-100 rounded-md border border-gray-200">
              {allowlist.map(email => {
                const u = userByEmail.get(email.toLowerCase())
                return (
                  <li key={email} className="flex items-center justify-between px-4 py-3">
                    <span className="text-sm text-neutral-dark">
                      {email}
                      {u && <span className="text-neutral-mid">{staffSuffix(u)}</span>}
                    </span>
                    <button onClick={() => removeEmail(email)} disabled={saving} className="rounded p-1 text-neutral-mid hover:bg-red-50 hover:text-red-600 disabled:opacity-40" title="Remove"><Trash2 size={14} /></button>
                  </li>
                )
              })}
            </ul>
          )}
          {saving && <p className="mt-3 text-xs text-neutral-mid">Saving…</p>}
        </SettingSection>

        {/* ── Sites ─────────────────────────────────────────────────────────── */}
        <SettingSection icon={Building2} title="Sites" description="Manage multiple care homes or locations under one account.">
          <p className="mb-4 text-sm text-neutral-mid">
            If you manage multiple care homes or sites, you can add them here and switch between them from the top bar. Each site has its own policies, staff, queries, and settings.
          </p>
          {siteError && <p className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{siteError}</p>}

          <div className="mb-4 flex justify-end">
            <Button size="sm" variant="secondary" onClick={() => { setShowAddSite(true); setSiteError('') }}>
              <Plus size={13} className="mr-1" />Add a site
            </Button>
          </div>

          {showAddSite && (
            <div className="mb-4 rounded-lg border border-gray-200 bg-neutral-light p-4">
              <p className="mb-3 text-sm font-medium text-neutral-dark">New site name</p>
              <div className="flex gap-2">
                <input type="text" value={newSiteName} onChange={e => setNewSiteName(e.target.value)} onKeyDown={e => e.key === 'Enter' && addSite()} placeholder="e.g. Crossways Nursing Wing" className="flex-1 rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-teal focus:outline-none focus:ring-1 focus:ring-teal" autoFocus />
                <Button onClick={addSite} disabled={addingSite || !newSiteName.trim()} size="md">
                  {addingSite ? <Loader2 size={14} className="animate-spin" /> : 'Create'}
                </Button>
                <Button variant="secondary" size="md" onClick={() => { setShowAddSite(false); setNewSiteName('') }}>Cancel</Button>
              </div>
            </div>
          )}

          {loading ? (
            <div className="space-y-2">{[1, 2].map(i => <div key={i} className="h-12 animate-pulse rounded-md bg-gray-100" />)}</div>
          ) : sites.length === 0 ? (
            <p className="rounded-md bg-neutral-light px-4 py-3 text-sm text-neutral-mid">Only one site — add a site above to manage multiple locations.</p>
          ) : (
            <ul className="divide-y divide-gray-100 rounded-md border border-gray-200">
              {sites.map(s => (
                <li key={s.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-neutral-dark">{s.name}</span>
                      {s.is_current && <span className="rounded-full bg-teal-light px-2 py-0.5 text-xs font-medium text-teal">Current</span>}
                      {!s.is_root && <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">Sub-site</span>}
                    </div>
                    <p className="text-xs text-neutral-mid">{s.slug}</p>
                  </div>
                  {!s.is_current && (
                    <button onClick={() => switchSite(s.id, s.name)} disabled={!!switchingTo} className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium text-teal hover:bg-teal-light disabled:opacity-50">
                      {switchingTo === s.id ? <Loader2 size={12} className="animate-spin" /> : null}
                      Switch to this site
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </SettingSection>

        {/* ── Email communications ──────────────────────────────────────────── */}
        <SettingSection icon={Bell} title="Email communications" description="Choose which service and billing emails you receive.">
          <div className="divide-y divide-gray-50 -mx-6">
            {EMAIL_PREFS.map((pref, i) => {
              const isOn = emailPrefs[pref.key] ?? (pref.category === 'service')
              const isOptional = pref.category !== 'service'
              return (
                <div key={pref.key} className="px-6 py-4">
                  {i === 6 && <div className="-mx-6 mb-4 border-t border-dashed border-gray-200" />}
                  <div className="flex items-start justify-between gap-6">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-neutral-dark">{pref.label}</p>
                        {isOptional && <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-600">Optional</span>}
                      </div>
                      <p className="mt-0.5 text-xs text-neutral-mid">{pref.description}</p>
                    </div>
                    <OnOffToggle
                      name={`pref-${pref.key}`}
                      isOn={isOn}
                      onChange={v => saveEmailPref(pref.key, v)}
                      disabled={loading || savingPrefKey === pref.key}
                    />
                  </div>
                </div>
              )
            })}
          </div>
          <div className="mt-2 border-t border-gray-100 pt-3">
            {savingPrefKey && <span className="text-xs text-neutral-mid">Saving…</span>}
            <p className="text-xs text-neutral-mid">Service emails help you stay on top of your policy library and staff engagement. You can change these at any time.</p>
          </div>
        </SettingSection>

        {/* ── Training renewal notifications ────────────────────────────────── */}
        <SettingSection icon={ShieldCheck} title="Training renewal notifications" description="Automatically remind staff when their annual training is due for renewal.">
          <p className="mb-5 text-sm text-neutral-mid">
            Notifications are sent to the staff member by email. Off by default — managers must opt in.
          </p>
          {savingTraining && <p className="mb-3 text-xs text-neutral-mid">Saving…</p>}

          {/* Master toggle */}
          <div className="mb-4 flex items-start justify-between gap-6">
            <div className="flex-1">
              <p className="text-sm font-medium text-neutral-dark">Enable renewal notifications</p>
              <p className="mt-0.5 text-xs text-neutral-mid">Turn this on to allow CareStream to automatically contact staff before their training expires.</p>
            </div>
            <OnOffToggle
              name="notifications_enabled"
              isOn={trainingSettings.notifications_enabled ?? false}
              onChange={v => saveTrainingSetting('notifications_enabled', v)}
              disabled={loading || savingTraining === 'notifications_enabled'}
            />
          </div>

          {/* Sub-settings */}
          <div className={`space-y-4 border-t border-dashed border-gray-200 pt-4 transition-opacity ${trainingSettings.notifications_enabled ? '' : 'pointer-events-none opacity-40'}`}>
            {[
              { key: 'notify_90d' as const, label: '90 days before expiry', description: 'An early heads-up so the team can plan ahead.' },
              { key: 'notify_30d' as const, label: '30 days before expiry', description: 'A reminder with enough time to complete renewal.' },
              { key: 'notify_7d'  as const, label: '7 days before expiry',  description: 'A final prompt for staff who have not yet renewed.' },
            ].map(pref => (
              <div key={pref.key} className="flex items-start justify-between gap-6">
                <div className="flex-1">
                  <p className="text-sm font-medium text-neutral-dark">{pref.label}</p>
                  <p className="mt-0.5 text-xs text-neutral-mid">{pref.description}</p>
                </div>
                <OnOffToggle
                  name={pref.key}
                  isOn={trainingSettings[pref.key] ?? true}
                  onChange={v => saveTrainingSetting(pref.key, v)}
                  disabled={loading || savingTraining === pref.key}
                />
              </div>
            ))}

            <div className="flex items-start justify-between gap-6 border-t border-gray-100 pt-4">
              <div className="flex-1">
                <p className="text-sm font-medium text-neutral-dark">Manager digest</p>
                <p className="mt-0.5 text-xs text-neutral-mid">Also send a summary to admin users listing all staff with upcoming renewals.</p>
              </div>
              <OnOffToggle
                name="notify_manager"
                isOn={trainingSettings.notify_manager ?? false}
                onChange={v => saveTrainingSetting('notify_manager', v)}
                disabled={loading || savingTraining === 'notify_manager'}
              />
            </div>
          </div>

          {!trainingSettings.notifications_enabled && (
            <p className="mt-3 text-xs text-neutral-mid">Enable notifications above to configure which reminders are sent.</p>
          )}

          {/* Question trigger */}
          <div className="mt-5 border-t border-gray-100 pt-5">
            <div className="flex items-start justify-between gap-6">
              <div className="flex-1">
                <p className="text-sm font-medium text-neutral-dark">When to send training questions</p>
                <p className="mt-0.5 text-xs text-neutral-mid">Choose whether the system sends training questions automatically on assignment, or waits until the staff member makes contact.</p>
              </div>
              <div className="flex shrink-0 flex-col gap-2 pt-0.5">
                {([
                  { value: 'auto',       label: 'Send automatically on assignment' },
                  { value: 'on_contact', label: 'Wait until staff initiates contact' },
                ] as const).map(opt => {
                  const active = (trainingSettings.question_trigger ?? 'on_contact') === opt.value
                  return (
                    <label key={opt.value} className="flex cursor-pointer items-center gap-2 text-sm">
                      <input type="radio" name="question_trigger" checked={active} onChange={() => saveTrainingSetting('question_trigger', opt.value)} disabled={loading || savingTraining === 'question_trigger'} className="accent-teal" />
                      <span className={active ? 'font-medium text-neutral-dark' : 'text-neutral-mid'}>{opt.label}</span>
                    </label>
                  )
                })}
              </div>
            </div>
          </div>
        </SettingSection>

        {session?.accessToken && <DangerZone token={session.accessToken} />}

      </div>
      </SettingsSearchCtx.Provider>
    </div>
  )
}
