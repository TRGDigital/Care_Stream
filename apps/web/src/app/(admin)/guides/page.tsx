'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { createApiClient } from '@/lib/api-client'
import {
  ChevronDown, ChevronUp, Search, X,
  FileText, Users, MessageSquare, Mail, ClipboardCheck,
  GraduationCap, BarChart2, BookOpen, ShieldAlert, Settings, Zap, ClipboardList,
  LifeBuoy, Upload, CheckCircle, Info, UserPlus, RefreshCw, CalendarDays, Lightbulb, Loader2, Building2, BadgeCheck,
} from 'lucide-react'

function FeatureRequestModal({ open, onClose, token }: { open: boolean; onClose: () => void; token?: string }) {
  const [title, setTitle]         = useState('')
  const [details, setDetails]     = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone]           = useState(false)
  const [error, setError]         = useState('')
  if (!open) return null

  function close() { setTitle(''); setDetails(''); setDone(false); setError(''); onClose() }
  async function submit() {
    if (!token || !title.trim() || !details.trim()) return
    setSubmitting(true); setError('')
    try { await createApiClient(token).featureRequests.create(title.trim(), details.trim()); setDone(true) }
    catch (e: any) { setError(e?.message ?? 'Could not submit. Please try again.') }
    finally { setSubmitting(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={close}>
      <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-2 border-b border-gray-100 px-6 py-4">
          <Lightbulb size={18} className="text-teal" />
          <h2 className="flex-1 text-base font-bold text-neutral-dark">Request a new feature</h2>
          <button onClick={close} className="text-neutral-mid hover:text-neutral-dark"><X size={18} /></button>
        </div>
        {done ? (
          <div className="px-6 py-8 text-center">
            <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-green-100"><CheckCircle size={22} className="text-green-600" /></div>
            <p className="mb-1 font-semibold text-neutral-dark">Thank you</p>
            <p className="mb-5 text-sm text-neutral-mid">Your idea has been sent to the CareStream team. We read every request.</p>
            <button onClick={close} className="rounded-lg bg-teal px-5 py-2 text-sm font-semibold text-white hover:bg-teal-dark">Done</button>
          </div>
        ) : (
          <div className="px-6 py-5">
            <p className="mb-4 text-sm text-neutral-mid">Got an idea for something you would like CareStream to do? Tell us about it and our team will review it.</p>
            <label className="mb-3 block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-neutral-mid">Title</span>
              <input value={title} onChange={e => setTitle(e.target.value)} maxLength={200} placeholder="A short summary of your idea" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/20" />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-neutral-mid">Details</span>
              <textarea value={details} onChange={e => setDetails(e.target.value)} rows={5} maxLength={5000} placeholder="What would you like it to do, and what problem would it solve for you?" className="w-full resize-y rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/20" />
            </label>
            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={close} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-neutral-mid hover:bg-neutral-light">Cancel</button>
              <button onClick={submit} disabled={submitting || !title.trim() || !details.trim()} className="inline-flex items-center gap-1.5 rounded-lg bg-teal px-4 py-2 text-sm font-semibold text-white hover:bg-teal-dark disabled:opacity-50">
                {submitting ? <Loader2 size={15} className="animate-spin" /> : <Lightbulb size={15} />} Submit request
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface GuideSection {
  id:          string
  icon:        React.ElementType
  title:       string
  summary:     string
  defaultOpen?: boolean
  content:     React.ReactNode
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-2 rounded-lg border border-teal/20 bg-teal-light/40 p-3 text-sm text-teal-dark">
      <Info size={15} className="mt-0.5 shrink-0 text-teal" />
      <span>{children}</span>
    </div>
  )
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal text-[11px] font-bold text-white">
        {n}
      </span>
      <p className="text-sm text-neutral-dark leading-relaxed">{children}</p>
    </div>
  )
}

function SectionBlock({ title, children }: { title?: string; children: React.ReactNode }) {
  // Titles of the form "Main, subtitle" render the main part large and bold with
  // the rest as a lighter subtitle.
  const [main, sub] = (title ?? '').split(', ')
  return (
    <section className="rounded-xl border border-gray-100 bg-neutral-light/40 p-4 sm:p-5">
      {title && (
        <div className="mb-3 border-b border-gray-200/70 pb-2.5">
          <h3 className="text-lg font-bold leading-snug text-neutral-dark">{main}</h3>
          {sub && <p className="mt-0.5 text-sm text-neutral-mid">{sub}</p>}
        </div>
      )}
      <div className="space-y-3">{children}</div>
    </section>
  )
}

// ─── Guide content ────────────────────────────────────────────────────────────

const GUIDE_SECTIONS: GuideSection[] = [
  {
    id:          'getting-started',
    icon:        Zap,
    title:       'Getting started',
    summary:     'Complete setup checklist for new CareStream accounts',
    defaultOpen: true,
    content: (
      <div className="space-y-4">
        <p className="text-sm text-neutral-mid">Follow these steps to get CareStream working for your team. Each step unlocks more of the platform.</p>
        <div className="space-y-3">
          <Step n={1}>
            <strong>Upload your policies.</strong> Go to <em>Policies</em> in the sidebar and upload your policy documents (PDF or Word). CareStream reads these to answer staff questions.
          </Step>
          <Step n={2}>
            <strong>Add your staff.</strong> Go to <em>Staff</em> and add each team member with their name, email address, and role. This lets CareStream personalise responses and track training progress.
          </Step>
          <Step n={3}>
            <strong>Configure your settings.</strong> Go to <em>Settings</em> and set up your dedicated email address (for email queries), configure any access restrictions you need, and set your <strong>AI sign-off message</strong> — the line every answer ends with (e.g. &ldquo;The Crossways Care Team&rdquo;). Until you set it, answers sign off as &ldquo;The CareStream Team&rdquo;.
          </Step>
          <Step n={4}>
            <strong>Tell your team.</strong> Share the portal link or email address with your staff so they can start asking questions.
          </Step>
          <Step n={5}>
            <strong>Upload your CQC report.</strong> Go to <em>Policies</em>, select category <em>CQC Report</em>, and upload your most recent inspection report. This enables the CQC Report Chat feature.
          </Step>
        </div>
        <Tip>You can complete steps 1 to 3 in any order, but you must add at least one policy document before staff can use the Chat Hub.</Tip>
      </div>
    ),
  },
  {
    id:      'policies',
    icon:    FileText,
    title:   'Uploading policies & documents',
    summary: 'How to add, update and categorise your policy documents',
    content: (
      <div className="space-y-5">
        <SectionBlock title="What to upload">
          <p className="text-sm text-neutral-mid">
            Upload any document your staff might need to reference: care policies, staff handbooks, risk assessments, procedures, or your CQC report. Supported formats are PDF and Word (.docx).
          </p>
        </SectionBlock>
        <SectionBlock title="How to upload">
          <div className="space-y-3">
            <Step n={1}>Go to <strong>Policies</strong> in the left sidebar.</Step>
            <Step n={2}>Click <strong>Upload document</strong> and select your file.</Step>
            <Step n={3}>Choose the correct category. This controls which AI pipeline is used to answer questions about it.</Step>
            <Step n={4}>Wait for the status to show <em>Indexed</em>. This usually takes 30 to 60 seconds depending on file size.</Step>
          </div>
        </SectionBlock>
        <SectionBlock title="Document categories">
          <div className="rounded-lg border border-gray-200 divide-y divide-gray-100 text-sm">
            {[
              ['Policies & Procedures', 'Your internal care setting policies, SOPs, and risk assessments'],
              ['Staff Handbook',        'Employee handbook, HR policies, and onboarding documents'],
              ['External Regulation',   'Legislation or external guidance (e.g. CQC Key Questions)'],
              ['Training Module',       'Training materials and learning resources for staff'],
              ['CQC Report',            'Your most recent CQC inspection report. Enables CQC Report Chat.'],
            ].map(([cat, desc]) => (
              <div key={cat} className="grid grid-cols-[11rem_1fr] gap-3 px-4 py-3">
                <span className="font-medium text-neutral-dark">{cat}</span>
                <span className="text-neutral-mid">{desc}</span>
              </div>
            ))}
          </div>
        </SectionBlock>
        <SectionBlock title="Policy sections (internal policies)">
          <p className="text-sm text-neutral-mid">
            Internal policies can be filed under a <strong>section</strong>: e.g. Safeguarding, GDPR, Infection control, so your library is organised and easy to scan. Each section shows in its own colour in a dedicated column on the Policies page.
          </p>
          <div className="mt-3 space-y-3">
            <Step n={1}>When you upload internal policies, choose the <strong>Section</strong> shown next to the category. For a bulk upload it applies to the whole batch, so upload each section&rsquo;s policies together.</Step>
            <Step n={2}>To add your own sections, go to <strong>Settings → Policy sections</strong>, type a name and click <strong>Add</strong>. Remove one with the <strong>×</strong> on its chip.</Step>
            <Step n={3}>Any section you add appears in the dropdown the next time you upload, and gets its own colour automatically.</Step>
          </div>
          <div className="mt-3"><Tip>You start with 15 standard sections (Activities, Admission management, Safeguarding, Training, and more). Add as many of your own as you need to match how your policies are grouped.</Tip></div>
        </SectionBlock>
        <Tip>If you update a policy, delete the old version and re-upload the new one. CareStream will re-index it automatically.</Tip>
      </div>
    ),
  },
  {
    id:      'staff',
    icon:    Users,
    title:   'Managing staff',
    summary: 'Adding team members, roles, and access controls',
    content: (
      <div className="space-y-5">
        <SectionBlock title="Adding staff members">
          <div className="space-y-3">
            <Step n={1}>Go to <strong>Staff</strong> in the sidebar and click <strong>Add staff member</strong>; enter their name and email address.</Step>
            <Step n={2}>Choose their <strong>Position</strong> from the dropdown (Care Assistant, Nurse, Chef, etc.). This is the key field, it decides which onboarding and training they receive.</Step>
            <Step n={3}>If they hold a <strong>specialist role</strong> (e.g. Infection Control, Night Staff), answer <em>Yes</em> and pick one or more from the list. These add extra, specialist onboarding and training on top of their position.</Step>
            <Step n={4}>Choose the <strong>Staff type</strong>: <em>New starter</em> auto-enrols them in the onboarding for their position and specialisms; <em>Existing staff member</em> doesn't.</Step>
            <Step n={5}>Optionally set their first/second language, then share the login details shown on screen.</Step>
          </div>
          <div className="mt-3"><Tip>Right after creating a staff member you're offered a quick <strong>Assign training</strong> step, tick the modules that apply (statutory ones are pre-selected). You can always do this later from their detail card too.</Tip></div>
        </SectionBlock>
        <SectionBlock title="Viewing & managing a staff member">
          <p className="text-sm text-neutral-mid">
            Click a staff member's <strong>name</strong> on the Staff page to open their detail card, a single view of everything they're set up for:
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-neutral-mid">
            <li>Their <strong>profile</strong>: position, specialist roles, shift, email access and account status.</li>
            <li><strong>Language</strong>: their first and second language, and the communication toggle (below).</li>
            <li><strong>Training</strong>: every module assigned to them with a live status (Not started, In progress, Complete, Expired). Use <strong>+ Assign training</strong> to add more at any time.</li>
            <li><strong>Onboarding</strong>: the induction flows they're enrolled on, with step-by-step progress. Use <strong>+ Assign onboarding</strong> to enrol them on more (flows they're already on are marked and can't be double-assigned).</li>
          </ul>
          <p className="mt-2 text-sm text-neutral-mid">
            To change their details (name, position, specialisms, languages or shift) use <strong>Edit details</strong> on the card (or the <strong>⋮</strong> menu on their row).
          </p>
        </SectionBlock>
        <SectionBlock title="Getting staff into the hub (no password)">
          <div className="space-y-3">
            <p className="text-sm text-neutral-mid">
              The easiest way to get a care assistant signed in on their phone is a <strong>passwordless sign-in link</strong>: no password to type or remember. On a staff member&apos;s detail card, click <strong>Sign-in link</strong>. You&apos;ll get a <strong>QR code</strong> they can scan, a link you can <strong>copy</strong>, or an <strong>Email it to them</strong> button. It works once and lasts 14 days; signing in this way also keeps them logged in on that phone for a long time.
            </p>
            <p className="text-sm text-neutral-mid">
              Staff can also get themselves in: on the sign-in page there&apos;s an <strong>“Email me a sign-in link”</strong> option, so they never need to remember a password.
            </p>
            <p className="text-sm text-neutral-mid">
              Once they&apos;re in, encourage them to <strong>add CareStream to their home screen</strong> and turn on notifications (see the Chat Hub guide), that&apos;s how the hub keeps staff nudged.
            </p>
          </div>
        </SectionBlock>
        <SectionBlock title="Positions & specialist roles — how they drive onboarding & training">
          <p className="text-sm text-neutral-mid">
            A staff member's <strong>position</strong> is the single most important thing you set, because CareStream uses it to give them the <strong>right onboarding and the right training questions</strong> for their job, a Care Assistant's induction and quizzes are different from a Nurse's or a Chef's.
          </p>
          <p className="mt-2 text-sm text-neutral-mid">
            <strong>Specialist roles</strong> work on top of the position. If someone is a Senior Care Assistant who is also your Infection Control lead, they get the Senior Care Assistant onboarding <em>plus</em> the Infection Control specialist onboarding, and their training is tailored to both.
          </p>
          <p className="mt-2 text-sm text-neutral-mid">
            Both lists are managed in <strong>Settings → Positions</strong> and <strong>Settings → Specialist roles</strong>. The standard care/nursing positions and specialisms are already there; add any extras specific to your home and they'll appear in the dropdowns straight away.
          </p>
        </SectionBlock>
        <SectionBlock title="Language preferences">
          <p className="text-sm text-neutral-mid">
            When adding a staff member you can record their <strong>first language</strong> and an optional <strong>second language</strong>. CareStream uses the first language to send training questions and automated messages in the staff member's own language, if their first language is Polish, their training quiz questions arrive in Polish. The same applies to renewal reminders and other proactive communications.
          </p>
          <p className="mt-2 text-sm text-neutral-mid">
            Each staff member has an <strong>“Always communicate in their first language”</strong> toggle (in the Add / Edit forms and on their detail card). When it's <strong>on</strong>: the default, every message CareStream sends them is translated into their first language. Turn it <strong>off</strong> for staff who'd rather receive everything in English. You can flip it instantly from the detail card.
          </p>
          <p className="mt-2 text-sm text-neutral-mid">
            Over 180 languages are supported. If your team speaks one that isn't already listed, you don't have to leave the form: click <strong>“Language not listed? Add it”</strong> beneath the first or second language dropdown and start typing the language's English name. Matching languages appear as you type, so pick one from the list to avoid misspellings (e.g. start typing “Sho” and choose “Shona”). If it isn't in our catalogue, type the full name and press <strong>Add</strong>. Either way it's saved to your account, selected on the form, and appears in the first &amp; second language dropdowns from then on. You can also add or remove languages any time in <strong>Settings → Languages</strong>.
          </p>
          <div className="mt-3 rounded-lg border border-teal/20 bg-teal-light/20 px-4 py-3">
            <p className="text-sm font-semibold text-teal">A note on translation quality</p>
            <p className="mt-1 text-sm text-neutral-mid">
              CareStream translates content into a staff member's language on demand, so it isn't limited to a fixed list, you can add almost any language. Quality does vary by how widely a language is written online:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-neutral-mid">
              <li><strong>Excellent</strong> for the languages most of your team are likely to speak, for example Polish, Romanian, Portuguese, Spanish, Arabic, Urdu, Hindi and the major Indian languages, Tagalog, Swahili, Yoruba, Somali, Amharic and all European languages.</li>
              <li><strong>Good</strong> for most other widely spoken languages, such as Shona, Twi, Igbo, Nepali and Sinhala.</li>
              <li><strong>Best effort</strong> for very small or rarely written languages. Here the translation may be partial, and if it can't be produced reliably CareStream <strong>falls back to clear English</strong> rather than showing anything incorrect, so a staff member is never left with a broken screen.</li>
            </ul>
            <p className="mt-2 text-sm text-neutral-mid">
              In short: adding a language always makes it selectable, and for the languages your workforce actually speaks the translation is dependable. To get the best results, set the staff member's <strong>first language</strong> to the one they read most comfortably, and keep the &ldquo;always communicate in their first language&rdquo; toggle on.
            </p>
          </div>
          <p className="mt-3 text-sm text-neutral-mid">
            <strong>Translation glossary (term-locking).</strong> You can make translations more consistent by pinning important terms in <strong>Settings → Translation glossary</strong>. Add words that should <strong>never</strong> be translated, your care setting&rsquo;s name, staff names, medication names, systems like &ldquo;CQC&rdquo; or &ldquo;eMAR&rdquo;, and role titles, so they stay in English in every language. You can also add a short <strong>note</strong> explaining what a term means (for example &ldquo;eMAR&rdquo; = &ldquo;electronic Medication Administration Record&rdquo;) so it&rsquo;s translated correctly every time. The glossary applies everywhere CareStream translates, training questions, annual modules, inductions, CQC prep, policies and staff messages, and takes effect straight away. You&rsquo;ll also see a set of <strong>Saved terms</strong> at the top of the glossary, common sector words like CQC, DoLS, eMAR and NMC that CareStream maintains for every care setting. They&rsquo;re applied automatically; if one doesn&rsquo;t suit your care setting you can <strong>Remove</strong> it (and add it back any time), and your own entry for a term always takes priority.
          </p>
          <p className="mt-3 text-sm text-neutral-mid">
            <strong>Staff-improved translations (Translation Review).</strong> Beyond the glossary, you can let a trusted bilingual team member improve translations directly. Turn on <strong>&ldquo;Let them suggest better translations&rdquo;</strong> on a staff member&rsquo;s Edit screen (it&rsquo;s off for everyone by default). They then see a <strong>&ldquo;Suggest a better translation&rdquo;</strong> option on translated training, lessons, induction and CQC prep in their hub. Their suggestions come to you under <strong>Translation Review</strong> (in the sidebar), where you <strong>Approve</strong>, <strong>Edit</strong> or <strong>Reject</strong> each one. An approved suggestion replaces the machine translation of that exact phrase, in that language, for your care setting, everywhere it appears. Approval is required by default; you can switch on <strong>Auto-approve</strong> in Translation Review to let your permitted staff&rsquo;s suggestions go live immediately. Over time this builds a library of human-checked translations, useful evidence that staff can understand their training.
          </p>
        </SectionBlock>
        <SectionBlock title="Letting staff switch a set into their second language">
          <p className="text-sm text-neutral-mid">
            Some staff have good English but a different native tongue. The idea is that everyone learns in English, but when a particular set is hard to follow they can read just that one in their own language. To allow this, set the staff member up with a <strong>first language</strong> of English and their native tongue as the <strong>second language</strong>, then turn on <strong>“Allow switching a set to their second language”</strong> (in the Add / Edit forms and on their detail card, just below the communication toggle). Hover the <strong>i</strong> next to it for a reminder of what it does.
          </p>
          <p className="mt-2 text-sm text-neutral-mid">
            With it on, that staff member sees a small <strong>language button</strong> on each individual set in their hub, across <strong>My Training</strong>, <strong>Annual Training</strong>, <strong>Induction</strong>, <strong>Follow-up</strong> and <strong>CQC Prep</strong>. Tapping it flips just that one set (the lesson, the questions and the multiple-choice answers) into their second language so they can understand it. The button then reads <strong>“1st language”</strong> so they can flip straight back.
          </p>
          <p className="mt-2 text-sm text-neutral-mid">
            The switch is <strong>session only</strong>: nothing is remembered, so every visit starts in their first language. It only changes what they read, their answers, scores and progress are unaffected. The toggle stays hidden unless the staff member has a second language set.
          </p>
          <p className="mt-2 text-sm text-neutral-mid">
            Every time a staff member flips a set, CareStream records it so you can see where the language and training gaps are. The team-wide picture is on <strong>Analytics → Overview</strong> (“Second-language switching”) and the per-staff breakdown is on <strong>Analytics → Staff</strong>. If you see the same set switched often, it is a good prompt to offer extra support or simplify the wording.
          </p>
        </SectionBlock>
        <SectionBlock title="Improving translations: glossary &amp; staff review">
          <p className="text-sm text-neutral-mid">
            CareStream translates training, lessons, induction, CQC prep and messages into each staff member&rsquo;s language automatically. Two tools let you make those translations more accurate for your care setting, and they work together.
          </p>
          <p className="mt-3 text-sm font-semibold text-neutral-dark">1. Translation glossary (pin the right words)</p>
          <p className="mt-1 text-sm text-neutral-mid">
            In <strong>Settings → Translation glossary</strong> you pin terms so they&rsquo;re always handled your way, either <strong>kept in English</strong> (your care setting&rsquo;s name, staff names, medication names, systems like CQC or eMAR, role titles) or with a short <strong>note</strong> explaining what a term means. The <strong>Saved terms</strong> at the top are common sector words CareStream maintains for every care setting (CQC, DoLS, eMAR, NMC and so on); you can Remove any that don&rsquo;t suit you and add them back later. Your own entry for a term always wins.
          </p>
          <p className="mt-3 text-sm font-semibold text-neutral-dark">2. Staff-verified translations (Translation Review)</p>
          <p className="mt-1 text-sm text-neutral-mid">
            The glossary fixes individual words; this fixes whole phrases. A trusted bilingual team member can propose better wording directly, and you approve it. Here&rsquo;s the flow:
          </p>
          <ul className="mt-2 list-decimal space-y-1.5 pl-5 text-sm text-neutral-mid">
            <li><strong>Grant permission.</strong> On a staff member&rsquo;s <strong>Edit</strong> screen (or their detail card when you click their name), turn on <strong>&ldquo;Let them suggest better translations&rdquo;</strong>. It&rsquo;s off for everyone by default, so only the people you choose can suggest.</li>
            <li><strong>They suggest.</strong> When that person views content <em>in their own language</em>, they can improve it in two ways. On <strong>questions and answers</strong> (training, induction, CQC prep) a small <strong>&ldquo;Suggest a better translation&rdquo;</strong> link opens the wording to edit. On <strong>lesson text</strong>, they simply <strong>click the paragraph or heading</strong> (a small pencil appears on hover), fix it in place and send. This also works when a staff member reads a set in their <em>second</em> language via the language button.</li>
            <li><strong>You review.</strong> Suggestions arrive under <strong>Translation Review</strong> in the sidebar (with a count on the Pending tab). Each shows the English source, the current machine translation and the staff member&rsquo;s version side by side. You can <strong>Approve</strong>, <strong>Edit &amp; approve</strong>, or <strong>Reject</strong>.</li>
            <li><strong>It goes live.</strong> Once approved, that wording replaces the machine translation for that exact phrase, in that language, for your care setting, everywhere it appears, instantly and permanently.</li>
          </ul>
          <p className="mt-3 text-sm text-neutral-mid">
            <strong>Approval is required by default</strong>, so nothing your staff suggest changes what others see until you&rsquo;ve checked it. If you&rsquo;d rather your permitted staff&rsquo;s suggestions go live immediately, turn on <strong>Auto-approve</strong> at the top of Translation Review. Rejecting a suggestion simply keeps the machine translation. Over time this builds a library of human-checked translations, useful evidence for inspection that staff can understand their training in their own language.
          </p>
          <p className="mt-2 text-sm text-neutral-mid">
            Nothing here can make a translation worse: if a phrase has no approved wording, staff simply see the normal machine translation (which always falls back to clear English if a language can&rsquo;t be produced reliably).
          </p>
        </SectionBlock>
        <SectionBlock title="Approved senders (added automatically)">
          <p className="text-sm text-neutral-mid">
            When you add a staff member, their email address is automatically added to the <strong>Approved sender addresses</strong> list in <em>Settings</em>. You don't need to add them in two places.
          </p>
          <p className="mt-2 text-sm text-neutral-mid">
            The list in Settings shows each entry alongside the staff member it belongs to, for example <em>jane@example.com, Jane Smith (Care Assistant)</em>, so you can see at a glance who each address belongs to. Only addresses on this list can query CareStream by email; messages from anyone else are ignored. You can still add shared or external addresses manually in Settings.
          </p>
        </SectionBlock>
        <Tip>Adding a staff member creates a login for them. You'll see their credentials once, on screen, share them securely, and use <strong>Re-send login</strong> from the staff member's menu if they're ever needed again.</Tip>
      </div>
    ),
  },
  {
    id:      'staff-records',
    icon:    BarChart2,
    title:   'Staff records & analytics',
    summary: 'The individual staff record, attention flags, and how to read it',
    content: (
      <div className="space-y-5">
        <SectionBlock title="Opening a staff record">
          <p className="text-sm text-neutral-mid">
            Every staff member has a full <strong>record page</strong>: a single view of what they've been assigned, what they've completed, how they're scoring, and how engaged they are. Open it two ways from the <strong>Staff</strong> page:
          </p>
          <div className="mt-2 space-y-3">
            <Step n={1}>Click the small <strong>chart icon</strong> next to a name to jump straight to their record.</Step>
            <Step n={2}>Or click the <strong>name</strong> to open the quick overlay (where you assign training/onboarding), then use <strong>View full record →</strong>.</Step>
          </div>
          <div className="mt-3"><Tip>Every section of the record has an <strong>ⓘ</strong> icon, hover or tap it for a plain-English explanation of what you're looking at. The notes below are the same guidance in one place.</Tip></div>
        </SectionBlock>

        <SectionBlock title="Reading the record">
          <div className="space-y-2 text-sm text-neutral-mid">
            <p><strong className="text-neutral-dark">Completion rings</strong>: the share of assigned items finished: training modules, induction flows, and the average quiz score across completed modules. Aim for 100%; a low average score is an early sign someone may not have understood the material.</p>
            <p><strong className="text-neutral-dark">Needs attention</strong>: a coloured banner listing anything outstanding (overdue or expired training, overdue/stalled induction, never logged in). Red = urgent.</p>
            <p><strong className="text-neutral-dark">How they compare to the team</strong>: the teal bar is this person's figure; the dark tick is your home's average. A bar sitting left of the tick is below average and may be worth a conversation.</p>
            <p><strong className="text-neutral-dark">Training record</strong>: every module with its status and <strong>score</strong> (the % of quiz questions answered correctly). "Expires" applies to annual modules due for renewal; "Overdue" means past the due date and not complete. <strong>Reset</strong> clears a module so they can retake it.</p>
            <p><strong className="text-neutral-dark">Induction record</strong>: their onboarding flows, with a bar showing steps completed and an "X/Y correct" count for the question steps.</p>
            <p><strong className="text-neutral-dark">Engagement</strong>: how actively they use CareStream: questions asked in the portal, the topics they ask about, CQC prep answered, and logins. Low engagement alongside overdue training is a useful early warning.</p>
            <p><strong className="text-neutral-dark">Completions (6 months) &amp; Activity timeline</strong>: momentum over time and a dated history of everything they've done. The timeline is good evidence of ongoing development.</p>
          </div>
        </SectionBlock>

        <SectionBlock title="Actions on the record">
          <div className="space-y-2 text-sm text-neutral-mid">
            <p><strong className="text-neutral-dark">Send reminder</strong>: immediately sends the staff member their outstanding training questions by email (it doesn't wait for the scheduled send).</p>
            <p><strong className="text-neutral-dark">CQC evidence (PDF)</strong>: downloads the whole record as a PDF: training matrix, scores, induction sign-off and dates. Hand this to an inspector as proof a staff member is trained and inducted.</p>
            <p><strong className="text-neutral-dark">Reset</strong> (per module), clears someone's answers and completion so they can take a module again.</p>
          </div>
        </SectionBlock>

        <SectionBlock title="Spotting problems across the whole team">
          <p className="text-sm text-neutral-mid">
            The <strong>Analytics</strong> page has a <strong>“Staff needing attention”</strong> panel at the top. It surfaces everyone with a flag, overdue or expired training, overdue/stalled induction, or never logged in, so you can triage without opening each record. Each card links straight to that person's record, and urgent cases are dotted red.
          </p>
        </SectionBlock>

        <SectionBlock title="Policy reading engagement">
          <p className="text-sm text-neutral-mid">
            When staff read policies during their induction, CareStream records how they read them. You can see this two ways:
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-neutral-mid">
            <li><strong>On the staff record</strong>: a <strong>Policy reading</strong> table per person: the time they spent on each policy, the furthest they scrolled, and a label, <strong>Thorough</strong> (scrolled to the end), <strong>Skimmed</strong> (marked read without scrolling far) or <strong>Partial</strong>. This is included in the CQC evidence PDF.</li>
            <li><strong>On the Analytics page</strong>: a <strong>Policy reading engagement</strong> section with team-wide figures (sessions, average time, average scroll depth, and % who read to the end).</li>
          </ul>
          <p className="mt-2 text-sm text-neutral-mid">
            This data is for managers only, staff don't see their own reading stats on My Progress.
          </p>
        </SectionBlock>

        <SectionBlock title="Induction question performance">
          <p className="text-sm text-neutral-mid">
            Induction flows include questions, and CareStream marks each answer automatically, multiple-choice is graded instantly, and written answers are checked by AI. (If someone gets a multiple-choice question wrong, they're asked to try again before the step completes.) You can see how staff are doing in two places:
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-neutral-mid">
            <li><strong>On the staff record</strong>: an <strong>Induction questions</strong> section listing every question that person has answered, with a ✓ or ✗, their answer, and the correct answer where they got it wrong. A quick way to spot exactly where an individual needs support. Included in the CQC evidence PDF.</li>
            <li><strong>On the Analytics page</strong>: an <strong>Induction question performance</strong> section: the percentage answered correctly across the team, plus a <strong>“Most-missed induction questions”</strong> list that highlights the topics where knowledge is weakest, so you know what to reinforce in supervision or training.</li>
            <li><strong>CQC Staff Prep</strong>: each staff record also has a <strong>CQC Staff Prep</strong> section showing every prep question that person was assigned, their AI score, and any improvement after reviewing the model answer and retrying. The team-wide view (including the review-and-retry improvement) is in <strong>Analytics → CQC Staff Prep</strong>. Both feed the CQC evidence PDF.</li>
          </ul>
        </SectionBlock>

        <SectionBlock title="Second-language switching">
          <p className="text-sm text-neutral-mid">
            If you let a staff member switch a set into their second language (see <strong>Managing staff → Language preferences</strong>), CareStream records each time they do it, so you can see where the language and training gaps are. You can read this two ways:
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-neutral-mid">
            <li><strong>Analytics → Overview</strong>: a <strong>“Second-language switching”</strong> card with the team-wide picture, total switches, how many staff use it, a breakdown by language and by area, and the most switched sets. No individual names, this is the generalist view.</li>
            <li><strong>Analytics → Staff</strong>: a per-staff breakdown showing exactly who switched, which sets they flipped, and how often. A set that is switched again and again is a good prompt to offer extra support or to simplify its wording.</li>
          </ul>
        </SectionBlock>

        <SectionBlock title="What staff see — “My Progress”">
          <p className="text-sm text-neutral-mid">
            Staff have their own read-only <strong>My Progress</strong> page in the portal (top menu and chat sidebar). It shows their completion rings, what's left to finish with quick links to do it, how they compare to the team, and their training &amp; induction lists.
          </p>
          <p className="mt-2 text-sm text-neutral-mid">
            If a staff member's <strong>“always communicate in their first language”</strong> setting is on, their entire My Progress page, including the ⓘ help bubbles, is shown <strong>in that language</strong>, so non-English speakers can follow their own progress without help.
          </p>
        </SectionBlock>
      </div>
    ),
  },
  {
    id:      'knowledge-gaps',
    icon:    RefreshCw,
    title:   'Knowledge gaps & follow-up',
    summary: 'How wrong answers turn into reinforced learning, and how you track it',
    content: (
      <div className="space-y-5">
        <SectionBlock title="The idea">
          <p className="text-sm text-neutral-mid">
            When a staff member gets a training or induction question wrong, that&rsquo;s a <strong>knowledge gap</strong>. Rather than letting it sit,
            CareStream turns it into a short piece of learning and then checks they&rsquo;ve got it, so the gap actually closes. The whole loop is automatic;
            this section explains what your team sees and what you can track.
          </p>
        </SectionBlock>

        <SectionBlock title="What staff see — “Follow-up” in the Chat Hub">
          <p className="text-sm text-neutral-mid">
            Anyone with an unanswered or incorrectly-answered question gets a <strong>Follow-up</strong> item in their hub (with a red badge). Opening it, they choose:
          </p>
          <div className="mt-2 space-y-3">
            <Step n={1}><strong>Learn &amp; retry</strong>: a short, plain-language micro-lesson built from <em>your own policies</em>: why the right answer matters, the key points to remember, a real-life scenario to think through, an optional &ldquo;ask about this policy&rdquo; chat, and then a <strong>fresh</strong> question to confirm they&rsquo;ve understood (never the identical one).</Step>
            <Step n={2}><strong>Just retry</strong>: simply re-answer the original question. If they get it wrong, there&rsquo;s a nudge to learn the point instead.</Step>
          </div>
          <p className="mt-2 text-sm text-neutral-mid">
            The lesson is shown in the staff member&rsquo;s <strong>first language</strong> if their &ldquo;always communicate in first language&rdquo; setting is on. Answering correctly clears the item from their Follow-up immediately.
          </p>
          <Tip>The micro-lessons are grounded only in your home&rsquo;s policies (and anonymised reference policies for general training topics), they won&rsquo;t invent rules. They&rsquo;re generated once and reused, so they appear quickly.</Tip>
        </SectionBlock>

        <SectionBlock title="On the staff record — “How gaps get resolved”">
          <p className="text-sm text-neutral-mid">
            Each person&rsquo;s record (<strong>Staff → record</strong>) shows two things about gaps:
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-neutral-mid">
            <li><strong>Recommended follow-up</strong>: the questions they currently have wrong, with actions to re-send the questions or mark the gap as reviewed (supervision evidence).</li>
            <li><strong>How gaps get resolved</strong>: a count of <strong>Learn &amp; retry</strong> vs <strong>Just retry</strong>, an &ldquo;engaged with learning&rdquo; percentage, and a recent list. A healthy lean towards <em>Learn &amp; retry</em> means the person is genuinely engaging, not just clicking through. Both are included in the CQC evidence PDF.</li>
          </ul>
        </SectionBlock>

        <SectionBlock title="Across the team — the “Knowledge gaps” analytics">
          <p className="text-sm text-neutral-mid">
            The <strong>Analytics</strong> page has a <strong>Knowledge gaps</strong> section pulling training and induction together:
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-neutral-mid">
            <li><strong>Summary</strong>: open gaps, staff affected, gaps closed in the last 30 days, and the team&rsquo;s &ldquo;engaged with learning&rdquo; percentage.</li>
            <li><strong>Most-missed questions</strong> &amp; <strong>Weakest topics</strong>: exactly where to aim a refresher or supervision.</li>
            <li><strong>Knowledge gaps over time</strong>: a trend chart showing whether open gaps are rising or falling (it builds up from a daily snapshot).</li>
            <li><strong>How gaps are being closed</strong>: the team-wide Learn-vs-retry split and a recent feed.</li>
          </ul>
        </SectionBlock>

        <SectionBlock title="Weekly digest &amp; staff reminders">
          <p className="text-sm text-neutral-mid">
            Every <strong>Monday</strong>, CareStream emails admins a <strong>knowledge-gap digest</strong> (open gaps with a week-on-week change, most-missed questions and weakest topics), and sends staff with open gaps a gentle reminder to complete their Follow-up.
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-neutral-mid">
            <li>Both honour the <strong>Knowledge-gap digest</strong> switch in <strong>Settings → Email preferences</strong>: turn it off to stop all of it.</li>
            <li>Use <strong>Send digest now</strong> on the Analytics page to email yourself the current digest at any time (handy before a supervision or inspection).</li>
          </ul>
        </SectionBlock>
      </div>
    ),
  },
  {
    id:      'onboarding',
    icon:    UserPlus,
    title:   'Staff onboarding flows',
    summary: 'Guided inductions for new starters, assigned automatically',
    content: (
      <div className="space-y-5">
        <SectionBlock title="What an onboarding flow is">
          <p className="text-sm text-neutral-mid">
            An onboarding flow is a guided induction for new staff, an ordered checklist of steps they work through when they join. Each step is either a <strong>policy to read</strong> (so they confirm they've seen a key document) or a <strong>question to answer</strong>. New starters complete their flow from the staff portal, and you can track who has finished.
          </p>
          <p className="mt-2 text-sm text-neutral-mid">There are <strong>three ways</strong> to get a flow:</p>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-neutral-mid">
            <li><strong className="text-neutral-dark">CareStream ready-made role flows</strong> (teal) — full inductions for common roles, mapped to your own policies when you adopt them.</li>
            <li><strong className="text-neutral-dark">Generic onboarding policies</strong> (amber) — one of your own policies flagged for onboarding, added as a one-step read-and-confirm flow.</li>
            <li><strong className="text-neutral-dark">Build your own</strong> — a flow you create from scratch with read and question steps.</li>
          </ul>
          <p className="mt-2 text-sm text-neutral-mid">The sections below cover each, and the &ldquo;Not ready&rdquo; state that stops you enrolling staff on a flow that still has an unlinked read step.</p>
        </SectionBlock>
        <SectionBlock title="Ready-made flows (the quickest way to start)">
          <p className="text-sm text-neutral-mid">
            On the <strong>Onboarding</strong> page you'll see a set of <strong>ready-made flows</strong> built by CareStream for common care-home roles and specialisms. Click <strong>Adopt</strong> and CareStream:
          </p>
          <div className="mt-3 space-y-3">
            <Step n={1}>copies the flow into your own editable copy;</Step>
            <Step n={2}>automatically <strong>matches each step to your own uploaded policies</strong> (so &ldquo;read the infection control policy&rdquo; links to <em>your</em> infection control policy); and</Step>
            <Step n={3}>tailors the questions to the wording of your policies.</Step>
          </div>
          <p className="mt-3 text-sm text-neutral-mid">
            If a step can't be matched (because you haven't uploaded a policy for that area yet), the flow tells you so you can upload it and link the step. You can edit anything afterwards. A flow with any unmatched <em>read policy</em> step is marked <strong>&ldquo;Not ready&rdquo;</strong> and you <strong>can't enrol staff on it</strong> until those steps are linked to a policy, so nobody is ever sent an induction with nothing to read. If you haven't uploaded any policies yet, upload them first: the ready-made flows read <em>your</em> policies.
          </p>
        </SectionBlock>
        <SectionBlock title="Where the ready-made flows come from">
          <p className="text-sm text-neutral-mid">
            The ready-made flows are built from a library of real care-sector policies that have been <strong>anonymised</strong>: every home name, address, person and contact detail removed, so they reflect genuine, well-written procedures without belonging to any one home. When you adopt a flow, CareStream uses this as the starting point but always matches and tailors it to <em>your</em> own policies, so what your staff read and answer is specific to your home.
          </p>
        </SectionBlock>
        <SectionBlock title="Generic onboarding policies (turn any policy into a one-step flow)">
          <p className="text-sm text-neutral-mid">
            Sometimes you just want new staff to <strong>read and confirm a specific policy</strong> as part of induction, without building a whole flow. Any of your own policies can be turned into a one-step onboarding flow.
          </p>
          <div className="mt-2 space-y-3">
            <Step n={1}>Flag the policy as a generic onboarding policy. When you <strong>upload</strong> a policy, set <strong>Generic Onboarding policy</strong> to <strong>Yes</strong>. For a policy already in your library, open the <strong>⋯ menu</strong> on the Policies page and choose <strong>Use as onboarding policy</strong> (a small amber <strong>Onboarding</strong> tag then shows on it). You can remove it the same way.</Step>
            <Step n={2}>Go to <strong>Onboarding → Ready-made flows</strong>. Flagged policies appear in their own <strong>amber &ldquo;Generic onboarding policies&rdquo;</strong> section, separate from the CareStream role templates. Click <strong>Add as onboarding flow</strong> to create a one-step &ldquo;read &amp; confirm this policy&rdquo; flow.</Step>
            <Step n={3}>It moves to <strong>Active flows</strong>, where you <strong>Enrol staff</strong> exactly like any other flow. Reading time and completion are tracked and count towards your CQC evidence.</Step>
          </div>
          <div className="mt-3"><Tip>These are ideal for one-off must-reads (a new fire procedure, an updated visiting policy) that every staff member should acknowledge, without the overhead of a full role induction.</Tip></div>
        </SectionBlock>
        <SectionBlock title="Multiple-choice questions">
          <p className="text-sm text-neutral-mid">
            Questions can be <strong>multiple choice</strong>: staff pick an answer in the portal and it's marked instantly. A wrong answer asks them to review the policy and try again, so a completed flow is real evidence they understood it. You can also use free-text questions (CareStream assesses the answer) when you build your own steps.
          </p>
        </SectionBlock>
        <SectionBlock title="Building your own flow">
          <div className="space-y-3">
            <Step n={1}>Click <strong>New flow</strong>, name it, and choose which <strong>job roles</strong> it applies to (leave blank for all staff).</Step>
            <Step n={2}>Add steps, a policy to read, or a question. When you add a <strong>read policy</strong> step, start typing the policy name and pick it from the list of your uploaded policies. For a question, fill all four options for an auto-marked multiple-choice question, or leave them blank for a free-text answer.</Step>
            <Step n={3}>Make sure the flow is <strong>active</strong>: only active flows are assigned to new starters.</Step>
          </div>
          <p className="mt-3 text-sm text-neutral-mid">
            Flows you build yourself are marked <strong>Custom</strong> with a violet outline in <strong>Active flows</strong>, so you can tell them apart from CareStream ready-made flows and generic policy flows at a glance.
          </p>
        </SectionBlock>
        <SectionBlock title="Generate questions from a policy with AI">
          <p className="text-sm text-neutral-mid">
            When you build your own flow, CareStream can write the knowledge check questions for you, based on your own policy. This saves drafting multiple-choice questions by hand and keeps them faithful to what your policy actually says.
          </p>
          <div className="mt-2 space-y-3">
            <Step n={1}>Add a <strong>Read policy</strong> step and link it to a policy (start typing the policy name and choose it from the list).</Step>
            <Step n={2}>At the bottom of the steps, use the <strong>Generate questions from policy</strong> panel. Choose how many questions you want (1 to 5), and if your flow links more than one policy, pick which policy to use.</Step>
            <Step n={3}>Click <strong>Generate with AI</strong>. CareStream reads the linked policy and adds multiple-choice question steps, each with four options and the correct answer marked.</Step>
            <Step n={4}>Review and edit before saving. To try a different set, use <strong>Re-generate with AI</strong>, which replaces all the question steps in one go.</Step>
          </div>
          <p className="mt-3 text-sm text-neutral-mid">
            A policy needs to have finished processing before you can generate from it. If it's still being read in, CareStream asks you to try again shortly.
          </p>
          <div className="mt-3"><Tip>No policy linked yet? The panel reminds you to add a <strong>Read policy</strong> step and link a policy first, that policy is what the questions are drawn from.</Tip></div>
        </SectionBlock>
        <SectionBlock title="Automatic enrolment for new starters">
          <p className="text-sm text-neutral-mid">
            When you add a staff member and choose <strong>New starter</strong>, CareStream automatically enrols them in every active flow (adopted or your own) that matches their <strong>position</strong> or any of their <strong>specialist roles</strong>. So a new Nurse who is also Night Staff joins both the Nurse induction and the Night Staff specialist flow. Set the flows up once and every new starter is enrolled from day one, the confirmation screen tells you how many they joined.
          </p>
        </SectionBlock>
        <SectionBlock title="Tracking progress">
          <p className="text-sm text-neutral-mid">
            Each flow shows its enrolled staff and how far through they are, giving you a clear, auditable record that every new starter completed their induction, useful CQC evidence.
          </p>
        </SectionBlock>
        <SectionBlock title="Reading policies during induction">
          <p className="text-sm text-neutral-mid">
            When an induction step asks staff to read a policy, they tap <strong>Read policy</strong> to open the full document in a clean, readable view (letterhead and contact details are stripped out and it's laid out with headings and bullet points). If the staff member's <strong>first language</strong> is set and their communication toggle is on, the policy is shown <strong>in their language</strong>. They can also <strong>Save for later</strong>, which pins the policy to a <em>Saved policies</em> list in their Chat Hub sidebar.
          </p>
          <p className="mt-2 text-sm text-neutral-mid">
            CareStream quietly records <strong>how they read each policy</strong>: the time they spent and how far they scrolled, so you can tell the difference between someone who read it properly and someone who opened it and marked it done. They can mark a policy as read at any point; we simply record what they actually did.
          </p>
          <p className="mt-2 text-sm text-neutral-mid">
            Inside the reader there's also a <strong>“Talk to this Policy”</strong> button. It opens a focused chat where every answer comes straight from that one policy, and it suggests a few practical questions about it (in the staff member's language) to get them started, so if anything in the policy isn't clear, they can ask about it there and then.
          </p>
        </SectionBlock>
        <Tip>If you add a new starter before a matching flow exists, no onboarding is assigned, adopt or create a flow for that role and future new starters will be enrolled automatically.</Tip>
      </div>
    ),
  },
  {
    id:      'chat-portal',
    icon:    MessageSquare,
    title:   'Chat Hub',
    summary: 'Web-based chat interface for staff to ask policy questions, with role-tailored, rotating suggested questions in each staff member\'s language',
    content: (
      <div className="space-y-5">
        <SectionBlock title="What it does">
          <p className="text-sm text-neutral-mid">
            The Chat Hub is a web page your staff can open on any device to ask questions about your policies. CareStream reads your uploaded documents and responds with a referenced answer, including the exact policy it drew from.
          </p>
        </SectionBlock>
        <SectionBlock title="How staff access it">
          <p className="text-sm text-neutral-mid">
            Staff visit your portal URL (shown in Settings under <em>Portal access</em>). They enter their name and ask their question. No login is required unless you have enabled access restrictions.
          </p>
        </SectionBlock>
        <SectionBlock title="Personalise the AI sign-off">
          <p className="text-sm text-neutral-mid">
            Every answer CareStream gives your staff ends with a short sign-off line. To set your own, go to <strong>Settings → AI sign-off message</strong>, type the line you&apos;d like (for example <em>&ldquo;The Crossways Care Team&rdquo;</em> or <em>&ldquo;Kind regards, the Management Team&rdquo;</em>) and click <strong>Save</strong>. It applies to the next answer. Until you set your own, answers sign off as <em>&ldquo;The CareStream Team&rdquo;</em>.
          </p>
        </SectionBlock>
        <SectionBlock title="Replying in the staff member's language">
          <p className="text-sm text-neutral-mid">
            The <strong>“Reply in”</strong> picker under the message box now <strong>defaults to each staff member&apos;s own first language</strong> (the one set on their profile), so a Polish-speaking carer gets Polish answers straight away. They can still change it on the device, or leave it on a language of their choice; the picker lists all your available languages, including any you&apos;ve added in <strong>Settings → Languages</strong>.
          </p>
        </SectionBlock>
        <SectionBlock title="Voice — speak and listen">
          <div className="space-y-3">
            <p className="text-sm text-neutral-mid">
              Staff don&apos;t have to type. The <strong>microphone</strong> button next to the message box lets them <strong>speak their question</strong>: and it now listens in their <strong>own language</strong>, not just English, so a carer can ask in Romanian or Tagalog by voice.
            </p>
            <p className="text-sm text-neutral-mid">
              Every answer also has a <strong>“Listen”</strong> button that <strong>reads the reply aloud</strong> in the answer&apos;s language, a real help for staff who find reading on a phone difficult, or who simply prefer to listen on shift.
            </p>
          </div>
        </SectionBlock>
        <SectionBlock title="What staff can ask">
          <div className="space-y-2 text-sm text-neutral-mid">
            <p>Staff choose a topic area before they start chatting. Each area uses a different knowledge source:</p>
            <ul className="list-disc list-inside space-y-1.5 ml-2">
              <li><strong>Policies &amp; Procedures:</strong> "What is the medication administration procedure?"</li>
              <li><strong>Staff Handbook:</strong> "What are my annual leave entitlements?"</li>
              <li><strong>Training &amp; Learning:</strong> "Can you explain the key principles of safeguarding adults?"</li>
              <li><strong>CQC Compliance:</strong> "What did the inspector say about our Well-led rating?"</li>
              <li><strong>Auditing:</strong> "What actions are outstanding from our most recent audits?"</li>
              <li><strong>Business Continuity:</strong> "What should I do if we have a serious staff shortage?"</li>
            </ul>
          </div>
        </SectionBlock>
        <SectionBlock title="Suggested questions are tailored to each staff member">
          <div className="space-y-2 text-sm text-neutral-mid">
            <p>
              When a staff member starts a new chat and picks a topic, the <strong>suggested starter questions</strong> aren&rsquo;t a fixed list, CareStream generates them for <strong>that person&rsquo;s job role</strong>. A nurse, a care assistant, a cook and a maintenance person will each see prompts relevant to their day-to-day work.
            </p>
            <p>
              The suggestions also <strong>rotate</strong>, so a returning staff member isn&rsquo;t shown the same three prompts every time, and they take account of <strong>what that person has recently asked</strong>, offering fresh, related questions rather than repeating ones they&rsquo;ve already used. Everything is shown in the staff member&rsquo;s own language.
            </p>
            <p className="rounded-md border border-teal/20 bg-teal-light/20 px-3 py-2 text-neutral-dark">
              <strong>To get the most from this:</strong> make sure each staff member has their <strong>Position</strong> set on their profile (Staff &rarr; add or edit a staff member). Staff with no position still get useful, rotating prompts, just not role-specific ones. There&rsquo;s nothing else to switch on, it works automatically.
            </p>
          </div>
        </SectionBlock>
        <SectionBlock title="Follow-up questions">
          <p className="text-sm text-neutral-mid">
            After each response, CareStream shows three suggested follow-up questions. Staff can tap these to continue the conversation without typing.
          </p>
        </SectionBlock>
        <SectionBlock title="Installing the hub as an app + notifications">
          <div className="space-y-3">
            <p className="text-sm text-neutral-mid">
              Staff can <strong>install the hub to their phone&apos;s home screen</strong> so it opens like an app, no browser, no typing in a URL. When they open it on their phone they&apos;ll see a prompt: on Android it&apos;s an <strong>Install</strong> button; on iPhone they tap <strong>Share → Add to Home Screen</strong>.
            </p>
            <p className="text-sm text-neutral-mid">
              Once installed, the app offers to turn on <strong>notifications</strong>. With these on, staff get a tap on the shoulder when there&apos;s new training, a CQC practice question, or a renewal due, a proactive nudge landing straight in the hub. (Notifications are an extra: email still works as before.)
            </p>
            <p className="text-sm text-neutral-mid">
              Encourage your team to install the app and allow notifications, it&apos;s the easiest way to keep them engaged as more moves into the hub.
            </p>
          </div>
        </SectionBlock>
        <Tip>The Chat Hub works best on mobile. The quickest setup for staff: open the portal URL once on their phone, install it to the home screen, and allow notifications.</Tip>
      </div>
    ),
  },
  {
    id:      'email',
    icon:    Mail,
    title:   'Email queries',
    summary: 'Staff can email policy questions and receive AI replies',
    content: (
      <div className="space-y-5">
        <SectionBlock title="How it works">
          <p className="text-sm text-neutral-mid">
            CareStream provides a dedicated email address for your care setting (e.g. <code className="rounded bg-gray-100 px-1 py-0.5 text-xs">policies@yourcaresetting.carestreamai.co.uk</code>). When a staff member emails this address, CareStream reads the question, searches your policies, and replies directly to the thread.
          </p>
        </SectionBlock>
        <SectionBlock title="Setting up your email address">
          <div className="space-y-3">
            <Step n={1}>Go to <strong>Settings</strong> and expand the <em>Dedicated email address</em> section.</Step>
            <Step n={2}>Your address is shown there. Share it with your team.</Step>
            <Step n={3}>Optionally add an allowlist to restrict which addresses can receive replies.</Step>
          </div>
        </SectionBlock>
        <SectionBlock title="Thread continuity">
          <p className="text-sm text-neutral-mid">
            CareStream remembers the conversation for 7 days. If a staff member replies to an AI response, it continues the same thread and they do not need to repeat context.
          </p>
        </SectionBlock>
        <SectionBlock title="Intent routing">
          <p className="text-sm text-neutral-mid">
            When the system is not sure whether an email is about a policy, training, or a CQC report, it sends a short clarification reply asking the staff member to choose. Once they reply with their choice, the conversation continues automatically.
          </p>
        </SectionBlock>
        <Tip>Email replies are formatted with bold headings, bullet points, and policy references that appear clearly in any email client.</Tip>
      </div>
    ),
  },
  {
    id:      'cqc-report',
    icon:    ClipboardCheck,
    title:   'CQC Report Chat',
    summary: 'Ask questions directly about your CQC inspection report',
    content: (
      <div className="space-y-5">
        <SectionBlock title="What it does">
          <p className="text-sm text-neutral-mid">
            After uploading your CQC inspection report, staff can ask specific questions about it across all five key question domains (Safe, Effective, Caring, Responsive, Well-led). CareStream replies with the inspector's exact findings and the rating, citing the report.
          </p>
        </SectionBlock>
        <SectionBlock title="Enabling CQC Report Chat">
          <div className="space-y-3">
            <Step n={1}>Go to <strong>Policies</strong> and upload your CQC report as a PDF.</Step>
            <Step n={2}>Select the category <strong>CQC Report</strong>.</Step>
            <Step n={3}>Wait for indexing to complete. The CQC Report Chat is now active on all channels.</Step>
          </div>
        </SectionBlock>
        <SectionBlock title="Example questions">
          <div className="space-y-1 text-sm text-neutral-mid">
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>"What areas did the inspector flag as needing improvement?"</li>
              <li>"What was our Safe rating and what were the key findings?"</li>
              <li>"What did the report say about staffing levels?"</li>
              <li>"What actions do we need to take following the inspection?"</li>
            </ul>
          </div>
        </SectionBlock>
        <SectionBlock title="Built-in CQC knowledge">
          <p className="text-sm text-neutral-mid">
            CareStream also includes a built-in library of CQC Key Questions covering all five domains. These are pre-loaded compliance frameworks that help answer general CQC questions even before your report is uploaded.
          </p>
        </SectionBlock>
        <Tip>Re-upload your new report after each inspection. Delete the old one first so CareStream uses your most recent findings.</Tip>
      </div>
    ),
  },
  {
    id:      'annual-training',
    icon:    GraduationCap,
    title:   'Annual training modules',
    summary: 'Standard or policy-tailored annual training, AI credits, cover images, certificates & renewals',
    content: (
      <div className="space-y-5">
        <SectionBlock title="What it is">
          <p className="text-sm text-neutral-mid">
            Annual training modules <strong>teach</strong> a topic then <strong>assess</strong> it. Each module has clear <strong>learning outcomes</strong>, an estimated <strong>duration</strong>, and an interactive lesson made of <strong>sections</strong>: every section teaches a point, then applies it with a real <strong>care scenario</strong> and a quick <strong>knowledge check</strong>: followed by the multiple-choice assessment. Staff complete them in the hub <strong>in their first language</strong>, and passing issues a certificate. Find it at <strong>Training → Annual training modules</strong>.
          </p>
        </SectionBlock>

        <SectionBlock title="Two ways to get a module">
          <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm text-neutral-mid">
            <li><strong>Assign standard</strong>: a ready-made module from the CareStream <strong>standard library</strong>, written against good-practice care-sector guidance. These are <strong>free</strong> to assign and don&apos;t use any AI credits. Quickest way to get started.</li>
            <li><strong>Tailor to our policies</strong>: the AI reads <strong>your own uploaded policies</strong> (plus anonymised reference policies) and writes a module specific to how <em>your</em> home works, citing the policies it used. Tailoring a module uses <strong>1 AI credit</strong>.</li>
          </ul>
          <Tip>Both kinds work identically for staff, the difference is only how the content was created. Start with standard modules and tailor the ones where your policies differ from the norm.</Tip>
        </SectionBlock>

        <SectionBlock title="AI credits">
          <p className="text-sm text-neutral-mid">
            Tailoring modules, generating cover images and a few other AI features draw on your plan&apos;s <strong>monthly AI credits</strong> (Starter 5, Professional 25). The remaining balance is shown at the top of the Annual training page and on your dashboard. Credits are <strong>separate</strong> from everyday <em>queries</em> (the questions staff ask in the hub), running low on one never affects the other. The balance resets at the start of each month. When you&apos;re out, you can still assign standard modules for free, or upgrade your plan.
          </p>
        </SectionBlock>

        <SectionBlock title="Reviewing &amp; approving">
          <div className="space-y-3">
            <Step n={1}>Open <strong>Annual training modules</strong>. You&apos;ll see a catalogue of UK care topics grouped by area, each with a default frequency and a <em>practical-also-required</em> flag where relevant.</Step>
            <Step n={2}>Use <strong>Assign standard</strong> (free) or <strong>Tailor to our policies</strong> (1 credit) on a topic. Tailored modules arrive as a <strong>draft</strong> with a lesson + question bank, citing the policies used.</Step>
            <Step n={3}>Click <strong>Review</strong> to read and edit the <strong>learning outcomes</strong>, the <strong>lesson sections</strong> (each with its scenario and quick check), and every assessment question (mark the correct answer); set the <strong>pass mark</strong>, <strong>duration</strong> and <strong>frequency</strong>; optionally <strong>generate a cover image</strong>, then <strong>Approve &amp; publish</strong>. Nothing reaches staff until you approve it.</Step>
            <Step n={4}>Because this is your own AI-generated module, a quick confirmation appears before publishing, you acknowledge it&apos;s <strong>internally generated</strong> and that you&apos;ve reviewed it (see &ldquo;Your own training vs the standard library&rdquo; below).</Step>
            <Step n={5}><strong>Assign</strong> a published module to staff, individually or tap a <strong>role</strong> to select everyone in it, with an optional due date.</Step>
          </div>
          <Tip>Always review AI-generated clinical content before publishing. You can tune the generation prompt in the Platform Console → AI Prompts → &ldquo;Annual Training, Module Generation&rdquo;.</Tip>
        </SectionBlock>

        <SectionBlock title="Your own training vs the standard library">
          <p className="text-sm text-neutral-mid">
            The <strong>standard library</strong> modules are controlled by CareStream and are <strong>independently reviewed</strong> (and, over time, CPD-accredited). When you <strong>tailor a module to your own policies</strong>, it&apos;s <strong>your home&apos;s internal training material</strong>: it sits <strong>outside</strong> that independently-reviewed library. That&apos;s why publishing your own module asks you to confirm you understand this and have reviewed it. You remain responsible for checking your tailored content is accurate and appropriate for your service.
          </p>
        </SectionBlock>

        <SectionBlock title="Cover images (optional)">
          <p className="text-sm text-neutral-mid">
            In the review screen you can <strong>Generate image</strong> to create a friendly cover illustration for the module, it appears below the title in the hub and helps staff recognise it. Generating an image uses <strong>1 AI credit</strong>; you can regenerate it if you&apos;d like a different one. It&apos;s entirely optional and modules work fine without one. Standard-library modules already come with images at no cost.
          </p>
        </SectionBlock>

        <SectionBlock title="What staff see">
          <p className="text-sm text-neutral-mid">
            Staff get an <strong>Annual Training</strong> item in the hub (separate from My Training). They see the <strong>outcomes</strong> and estimated time, then work through the <strong>interactive sections</strong>: reading each point, trying the scenario (with a reveal-able answer) and a quick instant-feedback check, then take the assessment. Pass and they get a <strong>certificate</strong>; fail and they can review and retry. On passing they&apos;re asked a short <strong>confidence/usefulness</strong> question (optional). A prominent <strong>&ldquo;Ask about the policies behind this training&rdquo;</strong> panel lets them open any source policy and ask questions, all in their own language.
          </p>
          <Tip>Completion, average score, claimed-vs-actual lesson time and learner feedback all roll up under <strong>Analytics → Training → Annual training</strong>.</Tip>
        </SectionBlock>

        <SectionBlock title="Certificates, renewals &amp; practical sign-off">
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-neutral-mid">
            <li><strong>Certificates</strong> are honest <em>knowledge-assessment</em> records (not accredited qualifications), viewable and printable on the staff record and included in the CQC evidence PDF.</li>
            <li><strong>Renewals</strong> follow the module&apos;s frequency (annual = +12 months, etc.) and resurface automatically when due, admins are reminded, and it shows as &ldquo;due for renewal&rdquo; on the record.</li>
            <li><strong>Practical-required topics</strong> (e.g. Moving &amp; Handling, Medication, First Aid) show a banner that the module is the knowledge component only. On the staff record, use <strong>&ldquo;Record practical&rdquo;</strong> to log the observed assessment (with your name + date).</li>
          </ul>
        </SectionBlock>

        <SectionBlock title="Where it shows up">
          <p className="text-sm text-neutral-mid">
            Per person: the <strong>Annual training</strong> section on their staff record (status, score, renews, certificate, practical). Team-wide: the <strong>Annual training</strong> section on the <strong>Analytics → Training</strong> tab (completion, certificates issued, renewals due, practicals to record, and a per-module breakdown).
          </p>
        </SectionBlock>
      </div>
    ),
  },
  {
    id:      'training',
    icon:    GraduationCap,
    title:   'Training system',
    summary: 'Track staff training completion, send quiz questions, and answer training queries',
    content: (
      <div className="space-y-5">
        <SectionBlock title="Two kinds of training module">
          <p className="text-sm text-neutral-mid">
            A module can be a <strong>full scenario-based lesson</strong> (a short lesson that teaches each point through a real care-home scenario, then a quick check, followed by an assessment) or a simpler <strong>assessment-only question set</strong>. Both are built on the <strong>Training → Adhoc Training Modules &amp; Questions</strong> tab and taken by staff in the hub, in their first language.
          </p>
        </SectionBlock>
        <SectionBlock title="Building a module — Adhoc Training Modules & Questions tab">
          <p className="mb-2 text-sm text-neutral-mid">Open <strong>Training → Adhoc Training Modules &amp; Questions</strong> and use the buttons on each module:</p>
          <ul className="space-y-1.5 text-sm text-neutral-mid">
            <li><strong className="text-neutral-dark">Generate lesson &amp; questions</strong> (recommended) — the AI writes a full scenario lesson <em>and</em> a fresh assessment, grounded in your own policies, and reuses the matching standard module&rsquo;s images. The questions then open in the editor so you can review and <strong>Save</strong>.</li>
            <li><strong className="text-neutral-dark">Questions only</strong> — generates just the assessment questions, with no lesson.</li>
            <li><strong className="text-neutral-dark">Generate answer options</strong> — if you wrote your own question texts, this fills the A/B/C/D options.</li>
            <li><strong className="text-neutral-dark">Preview</strong> — step through the lesson and questions read-only, exactly as staff will see it (appears once a module has a lesson).</li>
            <li><strong className="text-neutral-dark">Save changes</strong> — saves your edits as a new version (kept in Question History).</li>
            <li><strong className="text-neutral-dark">Lock / Unlock</strong> — date-stamps the exact questions in use, as CQC evidence of what was assessed and when.</li>
          </ul>
        </SectionBlock>
        <SectionBlock title="What staff see (the hub)">
          <p className="text-sm text-neutral-mid">
            Once you assign a module, it appears in the staff member&rsquo;s <strong>My Training</strong> in the hub. A module with a lesson plays <strong>step by step</strong>, the same way Annual training does: they read the lesson, work through the scenarios, then take the assessment, and a <strong>certificate</strong> is issued when they pass. An assessment-only module shows as a simple question list. Everything is in their first language.
          </p>
        </SectionBlock>
        <SectionBlock title="Training in your team's language">
          <p className="text-sm text-neutral-mid">
            Lessons and questions are automatically delivered in each staff member&rsquo;s first language. If their first language is set to Romanian, the lesson and answer options arrive in Romanian. No manual translation is needed.
          </p>
          <p className="mt-2 text-sm text-neutral-mid">
            You set the language when adding a staff member on the Staff page; it can be changed at any time. It also applies to automated renewal reminders.
          </p>
        </SectionBlock>
        <SectionBlock title="Scheduling question delivery">
          <p className="text-sm text-neutral-mid">
            The <strong>Schedule Training Questions Delivery</strong> tab lets you set when training questions are sent out to staff (for example, a few questions a week), so training is drip-fed rather than landing all at once.
          </p>
        </SectionBlock>
        <SectionBlock title="Asking questions about training topics">
          <p className="text-sm text-neutral-mid">
            Staff are not limited to the assessment. They can ask open questions about any training topic at any time, through the Chat Hub, email, or voice. CareStream answers from your uploaded training materials and internal policies, bringing in relevant external regulatory guidance, and referencing the relevant CQC Key Questions where a topic overlaps an inspection area.
          </p>
        </SectionBlock>
        <SectionBlock title="Viewing results">
          <p className="text-sm text-neutral-mid">
            Go to <strong>Training → Compliance</strong> to see the live grid of every staff member against every assigned module (complete, in progress, expired), each person&rsquo;s score, and what&rsquo;s overdue. Individual records and the Analytics page give the same detail per person.
          </p>
        </SectionBlock>
      </div>
    ),
  },
  {
    id:      'analytics',
    icon:    BarChart2,
    title:   'Analytics & query history',
    summary: 'Understand what your staff are asking and how the AI is performing',
    content: (
      <div className="space-y-5">
        <SectionBlock title="Query history">
          <p className="text-sm text-neutral-mid">
            Every query sent via any channel (web, email, voice) is logged. Go to <strong>Query history</strong> to see the full list, including the question, the AI response, which policies were cited, and whether the staff member gave feedback.
          </p>
        </SectionBlock>
        <SectionBlock title="Analytics dashboard">
          <p className="text-sm text-neutral-mid">
            Go to <strong>Analytics</strong> to see a summary of activity: total queries, most frequently asked topics, channel breakdown, and top staff users. This helps you identify gaps in your policies. If the same question is asked repeatedly, your policy on that topic may need to be clearer.
          </p>
        </SectionBlock>
        <SectionBlock title="Engagement (weekly active staff)">
          <div className="space-y-3">
            <p className="text-sm text-neutral-mid">
              Go to <strong>Analytics → Engagement</strong> for the single most important number as you move your team onto the staff hub: <strong>weekly active staff %</strong>. A staff member counts as active in a week if they opened the hub, asked a question, or read a policy. The tab also shows how many were active, your team size, and an <strong>8-week trend</strong> so you can see the direction of travel.
            </p>
            <p className="text-sm text-neutral-mid">
              The <strong>channel mix</strong> shows where questions are coming in, hub vs email vs voice, over the last 30 days, with the <strong>hub&apos;s share</strong> called out. As you encourage staff onto the hub, you want weekly active % to hold steady (or rise) and the hub&apos;s share of questions to grow.
            </p>
          </div>
        </SectionBlock>
        <SectionBlock title="CQC report analytics">
          <p className="text-sm text-neutral-mid">
            Go to <strong>Analytics</strong> and select <strong>CQC Report</strong> to see queries specifically about your inspection report. This shows which CQC domains your staff are most focused on.
          </p>
        </SectionBlock>
        <SectionBlock title="Effectiveness of Training">
          <p className="text-sm text-neutral-mid">
            Go to <strong>Analytics → Effectiveness of Training</strong> for evidence that your training and follow-up are genuinely improving knowledge, not just being completed. It draws entirely on data CareStream already collects, and it&apos;s the report to show CQC, commissioners and families when they ask what measurable difference your training makes.
          </p>
          <p className="mt-2 text-sm text-neutral-mid">What it shows:</p>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-neutral-mid">
            <li><strong>Questions put right</strong>: how often a staff member got a question wrong, worked through the follow-up, then answered correctly. The core proof that gaps are being closed.</li>
            <li><strong>Gaps resolved</strong> and <strong>engaged with learning</strong>: the share of knowledge gaps put right, and how often staff worked through the policy-grounded micro-lesson (&ldquo;Learn &amp; retry&rdquo;) rather than just re-answering.</li>
            <li><strong>Assessment accuracy</strong> and <strong>training completed</strong>: the team&apos;s current knowledge level and completion rate.</li>
            <li><strong>Confidence to apply</strong> and <strong>rated useful</strong>: how staff rate the training after finishing it (see below).</li>
            <li><strong>CQC prep improvement</strong>: the average score before and after a staff member reviews the model answer and retries.</li>
            <li><strong>Language is not a barrier</strong>: completion and accuracy for staff who use second-language support compared with the rest of the team, an inclusion point for CQC.</li>
          </ul>
          <p className="mt-3 text-sm text-neutral-mid">
            <strong>How staff rate their training:</strong> when a staff member finishes a piece of training, a short optional rating appears, how <strong>confident</strong> they feel applying it and how <strong>useful</strong> it was, with room for a comment. It shows across <strong>My Training</strong>, <strong>Annual Training</strong>, <strong>Follow-up</strong> and <strong>CQC Prep</strong> (on the completed item, or right after they finish it), and feeds the <strong>Confidence to apply</strong> and <strong>Rated useful</strong> figures. It only asks once per item and can always be skipped.
          </p>
          <p className="mt-2 text-sm text-neutral-mid">
            These measures prove the training is landing, that staff react well to it, learn from it, and put it into practice. Linking training directly to care outcomes such as antipsychotic use, falls or incident rates is a planned next step that needs those outcomes to be recorded in CareStream.
          </p>
        </SectionBlock>
        <SectionBlock title="Training Impact (does the training change practice?)">
          <p className="text-sm text-neutral-mid">
            <strong>Analytics → Training Impact</strong> goes a step further: it shows whether your training is improving real, audited practice, not just quiz scores. You <strong>link an audit to the training module(s)</strong> it measures, and CareStream tracks that audit&apos;s compliance score over time alongside how many staff have completed the training.
          </p>
          <p className="mt-2 text-sm text-neutral-mid"><strong>How to set it up:</strong></p>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-neutral-mid">
            <li>When you <strong>build your own audit</strong> (Monthly Audits, then <strong>Build your own audit</strong>), tick the training module(s) it relates to under <strong>Linked training</strong>.</li>
            <li>For an audit you&apos;ve already built, go to <strong>Monthly Audits</strong> and use the <strong>Linked training</strong> button on it to choose the modules.</li>
          </ul>
          <p className="mt-2 text-sm text-neutral-mid">
            <strong>What you see:</strong> for each linked audit, the <strong>first</strong> and <strong>latest</strong> compliance score and the change between them, plus a month-by-month trend with two bars, the <strong>audit score</strong> and the <strong>cumulative training completion</strong>. If they rise together as staff complete the training, that is strong evidence the training is landing in practice.
          </p>
          <p className="mt-2 text-sm text-neutral-mid">
            It needs several monthly audit runs to show a meaningful trend (one run is just a point), and it shows a correlation rather than proof of cause. Even so, it is exactly the continuous-improvement loop, train, audit, improve, re-audit, that CQC&apos;s &ldquo;Well-led&rdquo; question looks for. Linking currently works on your own custom audits.
          </p>
        </SectionBlock>
        <Tip>Use the analytics data in your management meetings as evidence of staff engagement with policies. This is useful material for CQC inspections.</Tip>
      </div>
    ),
  },
  {
    id:      'knowledge-base',
    icon:    BookOpen,
    title:   'Knowledge base',
    summary: 'Add and manage facts that CareStream always knows about your service',
    content: (
      <div className="space-y-5">
        <SectionBlock title="What the knowledge base is for">
          <p className="text-sm text-neutral-mid">
            The knowledge base lets you add short, structured facts about your care setting that CareStream always has access to. These are the things unique to <em>your</em> home that would not appear in a standard policy document, and they are exactly what makes chat answers specific to you.
          </p>
          <p className="mt-2 text-sm text-neutral-mid">
            For example, you might have <strong>two COSHH storage cupboards</strong>: one under the stairs for substances in use, and one in the laundry room for unused stock. No policy would spell that out, but it is exactly what a staff member needs to know. Add it here and CareStream will use it when someone asks where COSHH substances are kept. The same applies to your registration number, registered manager, bed capacity, specialism, or emergency escalation contacts.
          </p>
        </SectionBlock>
        <SectionBlock title="Where your knowledge comes from">
          <p className="text-sm text-neutral-mid">The Knowledge Base page groups entries into three types:</p>
          <div className="mt-2 rounded-lg border border-gray-200 divide-y divide-gray-100 text-sm">
            {[
              ['Manual entries', 'Facts you type in yourself, the home and care-setting nuances unique to your service (like the COSHH cupboards above). Shown first on the page because this is where your own knowledge lives.'],
              ['From uploaded policies', 'Question-and-answer pairs CareStream generates automatically from the policy documents you upload. Use "Regenerate all" to (re)build them.'],
              ['CareStream standard entries', 'A pre-loaded library of UK care regulatory knowledge (CQC Key Questions, health & safety, infection control, medication and more), provided as a starting point. You can edit these to make them specific to your home. They do not count against your document limit.'],
            ].map(([type, desc]) => (
              <div key={type} className="grid grid-cols-[11rem_1fr] gap-3 px-4 py-3">
                <span className="font-medium text-neutral-dark">{type}</span>
                <span className="text-neutral-mid">{desc}</span>
              </div>
            ))}
          </div>
        </SectionBlock>
        <SectionBlock title="Approval, nothing goes live until you approve it">
          <p className="text-sm text-neutral-mid">
            Every entry, whichever of the three types it is, is <strong>pending approval</strong> until you approve it, and <strong>only approved entries are ever used</strong> to answer staff or shown as a source in chat. This applies equally to your manual entries, the policy-generated ones, <em>and</em> the pre-loaded CareStream entries: pre-loaded entries are guides for what you could add, and you are meant to review, edit and approve them so they fit your home before staff ever see them.
          </p>
          <div className="mt-2 space-y-3">
            <Step n={1}>Go to <strong>Knowledge Base</strong> in the sidebar.</Step>
            <Step n={2}>For a manual fact, click <strong>Add entry</strong>, fill in the question and answer, and choose a <strong>Category</strong> (see below). For a pre-loaded or policy-generated entry, open it and edit it so it matches your home.</Step>
            <Step n={3}>Each entry shows a green <strong>Approved</strong> or amber <strong>Pending approval</strong> badge. Click <strong>Approve</strong> to make it live; you can <strong>Revoke</strong> at any time to take it back out of use.</Step>
          </div>
          <Tip>You will see a running count of approved vs pending entries at the top of the page. Staff only ever benefit from the approved ones.</Tip>
        </SectionBlock>
        <SectionBlock title="Knowledge categories">
          <div className="space-y-2 text-sm text-neutral-mid">
            <p>The category you choose for a manual entry determines where it is used:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li><strong>General</strong>: available across all policy and handbook queries via the general knowledge base.</li>
              <li><strong>Business Continuity</strong>: appears exclusively in the Business Continuity chat channel. Staff can access it on the portal by selecting the Business Continuity card.</li>
              <li><strong>Policies &amp; Procedures, HR &amp; Staff, Health &amp; Safety, Medication, Infection Control</strong>: all feed into the general knowledge base and appear alongside relevant policy content.</li>
            </ul>
          </div>
        </SectionBlock>
        <SectionBlock title="How your knowledge shows in chat answers, the source colours">
          <p className="text-sm text-neutral-mid">
            When CareStream answers a staff question it lists what it drew from under <strong>&ldquo;sources referenced&rdquo;</strong> beneath the answer. Each kind of source has its own colour so staff (and inspectors) can see exactly where an answer came from:
          </p>
          <div className="mt-2 rounded-lg border border-gray-200 divide-y divide-gray-100 text-sm">
            {[
              ['bg-teal', 'Company policy', 'One of your uploaded policy documents. Includes a "Read full policy" button to open the full text.'],
              ['bg-yellow-400', 'Home knowledge', 'One of your approved manual knowledge base entries, the nuances unique to your home (e.g. the COSHH cupboards).'],
              ['bg-purple-500', 'CareStream guidance', 'An approved pre-loaded CareStream regulatory entry that helped ground the answer.'],
              ['bg-blue-500', 'CareStream Seeded', 'An external regulation the policy quotes (Care Act, COSHH, DoLS, and similar), labelled as CareStream seeded.'],
            ].map(([dot, label, desc]) => (
              <div key={label} className="grid grid-cols-[10rem_1fr] items-start gap-3 px-4 py-3">
                <span className="flex items-center gap-2 font-medium text-neutral-dark">
                  <span className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ${dot}`} />
                  {label}
                </span>
                <span className="text-neutral-mid">{desc}</span>
              </div>
            ))}
          </div>
          <p className="mt-2 text-sm text-neutral-mid">
            Because of the approval gate above, a <strong>yellow &ldquo;Home knowledge&rdquo;</strong> or <strong>purple &ldquo;CareStream guidance&rdquo;</strong> source only ever appears once you have approved that entry.
          </p>
        </SectionBlock>
        <Tip>Use the knowledge base for things that change less often than policies, such as your registration number, registered manager, bed capacity, or emergency escalation contacts. Categorising entries correctly ensures staff can find them in the right chat channel.</Tip>
      </div>
    ),
  },
  {
    id:      'business-continuity',
    icon:    LifeBuoy,
    title:   'Business Continuity',
    summary: 'Give staff instant access to emergency procedures and contingency plans via the Chat Hub',
    content: (
      <div className="space-y-5">
        <SectionBlock title="What it does">
          <p className="text-sm text-neutral-mid">
            The Business Continuity chat channel lets staff ask questions about your organisation&apos;s emergency procedures, escalation contacts, and contingency plans, directly from the staff portal. It reads exclusively from knowledge entries you have categorised as <strong>Business Continuity</strong>, so the answers are specific to your care setting.
          </p>
        </SectionBlock>
        <SectionBlock title="Setting it up">
          <div className="space-y-3">
            <Step n={1}>Go to <strong>Knowledge Base</strong> in the sidebar and click <strong>Add entry</strong>.</Step>
            <Step n={2}>Write a question a staff member might ask (e.g. &ldquo;What do I do if we have a power cut during a night shift?&rdquo;) and the correct answer from your plan.</Step>
            <Step n={3}>Set the <strong>Category</strong> dropdown to <strong>Business Continuity</strong>.</Step>
            <Step n={4}>Optionally add the source name (e.g. &ldquo;Business Continuity Plan v2&rdquo;).</Step>
            <Step n={5}>Save and <strong>Approve</strong> the entry, only approved entries appear in responses.</Step>
            <Step n={6}>Repeat for all key scenarios: staff shortages, IT outages, fire/evacuation, adverse weather, utility failures, supplier failures, and key person absence.</Step>
          </div>
        </SectionBlock>
        <SectionBlock title="How staff use it">
          <div className="space-y-2 text-sm text-neutral-mid">
            <p>Staff open the portal and click the <strong>Business Continuity</strong> card. They can then ask free-text questions such as:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>&ldquo;We are two carers short tonight, what is the escalation process?&rdquo;</li>
              <li>&ldquo;Who do I call if the fire alarm system fails?&rdquo;</li>
              <li>&ldquo;What are the steps if we need to transfer residents to another facility?&rdquo;</li>
            </ul>
          </div>
        </SectionBlock>
        <SectionBlock title="What to include">
          <div className="space-y-2 text-sm text-neutral-mid">
            <p>Suggested scenarios to cover in your Business Continuity entries:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li><strong>Staffing:</strong> serious shortage, key person absence, agency escalation contacts</li>
              <li><strong>Utilities:</strong> power cut, water failure, heating failure procedures</li>
              <li><strong>IT &amp; communications:</strong> system outage, loss of internet, CCTV failure</li>
              <li><strong>Building:</strong> fire, evacuation to assembly point, invacuation procedure</li>
              <li><strong>Supplies:</strong> medication delivery failure, food supply disruption</li>
              <li><strong>Regulatory:</strong> when to notify CQC, local authority, and next of kin</li>
            </ul>
          </div>
        </SectionBlock>
        <Tip>Business Continuity entries are not used in any other chat channel, they are kept separate so staff always get focused, relevant answers in an emergency situation.</Tip>
      </div>
    ),
  },
  {
    id:      'face-to-face',
    icon:    CalendarDays,
    title:   'Face-to-face training',
    summary: 'Log in-person sessions, mark attendance and competency, track renewals in a compliance matrix, keep CQC evidence, and run a payroll report',
    content: (
      <div className="space-y-5">
        <SectionBlock title="What it's for">
          <p className="text-sm text-neutral-mid">
            Most homes run <strong>in-person group training</strong> each month. The <strong>Face-to-face Training</strong> tab (under <strong>Training</strong>) lets you record those sessions in a <strong>calendar</strong>, mark who attended and who missed, and keep evidence of both. It sits alongside the digital training, it does <strong>not</strong> change anyone&apos;s training matrix on its own; instead you decide who should also complete the module digitally.
          </p>
        </SectionBlock>
        <SectionBlock title="Logging a session">
          <div className="space-y-3">
            <Step n={1}>Go to <strong>Training</strong> and open the <strong>Face-to-face Training</strong> tab, then click <strong>New session</strong> (or click a day in the calendar to open that day and add a session for it).</Step>
            <Step n={2}>Choose the <strong>training topic</strong> from the dropdown (the same modules you can assign digitally). The title fills in from the module; you can edit it.</Step>
            <Step n={3}>Set the <strong>date</strong> and the <strong>session length</strong> (1 to 5 hours), and record <strong>who delivered it</strong>, either a staff member or a free-typed name for an external trainer. The length sets how many hours off-shift attendees are owed on the payroll report. Optionally add a <strong>start/end time</strong>, <strong>location/room</strong> and <strong>capacity</strong>. To schedule a regular session, use <strong>Repeat</strong> to create a monthly series in one go (each copy carries the same details and allocated staff). Use <strong>Renews after</strong> if the training expires (e.g. 12 months) so the compliance matrix can track it.</Step>
            <Step n={4}>Tick the <strong>staff who were allocated</strong> to attend. For anyone who attended <strong>off shift</strong>, also tick <strong>Owed pay</strong>, this marks them as payable and owes them the session hours on the report. Leave it unticked for anyone who was on shift (already paid); by default nobody is owed. Then <strong>Create session</strong>. Add notes if useful.</Step>
          </div>
        </SectionBlock>
        <SectionBlock title="Marking attendance">
          <p className="text-sm text-neutral-mid">
            Open a session from the calendar and mark each person <strong>attended</strong>, <strong>missed</strong>, or leave them <strong>unmarked</strong>. Use <strong>All attended</strong> / <strong>All missed</strong> to set everyone at once, then adjust. This is your evidence of who was at each formal session.
          </p>
        </SectionBlock>
        <SectionBlock title="Who gets paid: the &ldquo;Owed pay&rdquo; tick">
          <p className="text-sm text-neutral-mid">
            Some staff attend training <strong>on shift</strong> (they&apos;re already being paid for that time) and some attend <strong>off shift</strong> on their own time (so they&apos;re owed the hours). The <strong>Owed pay</strong> tick is how you tell payroll who falls into the second group.
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-neutral-mid">
            <li><strong>Tick Owed pay</strong> next to anyone who attended <strong>off shift</strong>. They become payable and are owed <strong>hours equal to the session length</strong> (so a 2 hour session = 2 hours owed).</li>
            <li><strong>Leave it unticked</strong> for anyone who was on shift. By default nobody is ticked, so you only tick the exceptions.</li>
            <li>The tick is all you need, you do <strong>not</strong> have to mark attendance first for it to count. The only thing that cancels pay is marking someone <strong>missed</strong> (absent), since they didn&apos;t attend.</li>
          </ul>
          <p className="mt-2 text-sm text-neutral-mid">
            <strong>Example:</strong> a 2 hour Moving &amp; Handling session with five staff. Three were on shift (leave unticked), two came in off shift (tick <strong>Owed pay</strong>). The report shows those two as payable, 2 hours each, and a total of 4 hours owed.
          </p>
          <p className="mt-2 text-sm text-neutral-mid">
            You can set this when you create the session or change it later: open the session, click <strong>Edit session</strong>, and adjust the ticks.
          </p>
        </SectionBlock>
        <SectionBlock title="Reading the calendar">
          <p className="text-sm text-neutral-mid">
            The calendar is colour-coded so you can see all training at a glance: <strong className="text-teal">teal</strong> for face-to-face sessions, <strong className="text-orange-600">orange</strong> for adhoc training and <strong className="text-indigo-600">indigo</strong> for annual training, with <strong>+N allocated</strong> and <strong>✓N completed</strong> counts. <strong>Click any day</strong> to open it and see the full detail: the face-to-face sessions that day (click through to mark attendance), plus the adhoc and annual training allocated or completed, by staff member.
          </p>
        </SectionBlock>
        <SectionBlock title="Producing the monthly payroll report (PDF)">
          <div className="space-y-3">
            <Step n={1}>Click <strong>Payroll report</strong> at the top of the Face-to-face tab.</Step>
            <Step n={2}>Pick the <strong>month</strong> you&apos;re running payroll for. The summary shows how many face-to-face attendances are payable and the total hours owed.</Step>
            <Step n={3}>Click <strong>Download PDF</strong> to save it, or type an email address and click <strong>Send</strong> to email it as an attachment (for example to your payroll provider).</Step>
          </div>
          <p className="mt-3 text-sm text-neutral-mid">
            The PDF carries the <strong>CareStream logo</strong> and the <strong>date it was generated</strong>, and separates training into three sections:
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-neutral-mid">
            <li><strong>Face-to-face</strong> (outlined in blue): one row per staff member per session, with the session length, attendance, a <strong>Pay?</strong> column and <strong>Hours owed</strong>. Payable rows (Owed pay ticked) are highlighted, and the section ends with a <strong>total hours owed</strong> for the month.</li>
            <li><strong>Adhoc training</strong>: digital adhoc modules allocated and completed in the month.</li>
            <li><strong>Annual training</strong>: annual modules allocated and completed in the month.</li>
          </ul>
          <p className="mt-2 text-sm text-neutral-mid">Only face-to-face training carries a pay figure, adhoc and annual are for the training record, not payroll.</p>
          <p className="mt-2 text-sm text-neutral-mid">If you set a <strong>training hourly rate</strong> on a staff member (edit their profile under Staff), the report also costs their owed hours into a <strong>&pound; total</strong>. Use <strong>CSV</strong> instead of the PDF to export the same data as a spreadsheet for your payroll system.</p>
        </SectionBlock>
        <SectionBlock title="The compliance matrix">
          <p className="text-sm text-neutral-mid">
            Switch the Face-to-face tab from <strong>Calendar</strong> to <strong>Matrix</strong> for an at-a-glance compliance grid: every staff member down the side, every training topic across the top. Each cell shows their latest <strong>attended</strong> session for that topic, colour-coded:
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-neutral-mid">
            <li><strong className="text-green-700">In date</strong> — trained and still valid (or no expiry set).</li>
            <li><strong className="text-amber-700">Due soon</strong> — valid but expires within 60 days.</li>
            <li><strong className="text-red-600">Overdue</strong> — past its renewal date (set <em>Renews after</em> on the session to drive this).</li>
            <li><strong className="text-red-600">Missing</strong> — the topic is mandatory for their role and they don&apos;t hold it.</li>
          </ul>
          <p className="mt-2 text-sm text-neutral-mid">
            Use <strong>Mandatory by role</strong> to choose which training each job role must hold. Anyone in that role without it is flagged <strong>missing</strong>, so you can see your gaps before an inspection. The chips at the top total your overdue, due-soon and missing counts.
          </p>
        </SectionBlock>
        <SectionBlock title="Evidence for CQC (sign-in sheets, files, certificates)">
          <p className="text-sm text-neutral-mid">Open a session and use the <strong>Evidence</strong> panel to build a defensible record:</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-neutral-mid">
            <li><strong>Sign-in sheet</strong>: download a printable register (session details + a signature line per allocated staff member). Staff sign on the day, then you scan it.</li>
            <li><strong>Upload file</strong>: attach the signed scan, photos, or the trainer&apos;s certificate (PDF or image, up to 15 MB). Files are stored privately and open with a click.</li>
            <li><strong>Competency</strong>: for each attendee, record <em>competent</em> or <em>not yet competent</em> where the training was practically assessed.</li>
          </ul>
          <p className="mt-2 text-sm text-neutral-mid">The Evidence panel <strong>always shows an &ldquo;Uploaded files&rdquo; list</strong> with a count, so you can see exactly what is held against a session, and it tells you clearly when nothing has been uploaded yet. On the calendar, any session that has evidence shows a small <strong>paperclip</strong> with the file count, so you can spot at a glance which sessions have their paperwork.</p>
          <p className="mt-2 text-sm text-neutral-mid">Uploaded files are kept safe automatically: every file is checked to confirm it is a genuine PDF or image and scanned for malware before it is stored. Anything that fails is rejected and never saved, and a small <strong>scanned</strong> tag shows on files that passed.</p>
        </SectionBlock>
        <SectionBlock title="Evidence log (everything in one place)">
          <p className="text-sm text-neutral-mid">
            Click <strong>Evidence log</strong> at the top of the Face-to-face tab (next to <strong>Payroll report</strong>) to see <strong>every file uploaded across all sessions</strong> in one list, grouped by training session with its date and file count. Open any file with a click, or click a session to jump straight to it. It is the quickest way to answer an inspector who asks to see your face-to-face training records, without opening each session one by one.
          </p>
        </SectionBlock>
        <SectionBlock title="Completion certificates (issued and tracked)">
          <p className="text-sm text-neutral-mid">
            In a session, each attendee has a <strong>Certificate</strong> button. It produces a branded, full-page completion certificate named after the course and date.
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-neutral-mid">
            <li><strong>Attended only</strong>: the button activates once you mark the person <strong>attended</strong> (the green tick). You can&apos;t issue a certificate to someone who missed or isn&apos;t marked yet.</li>
            <li><strong>Saved automatically</strong>: issuing a certificate downloads it <em>and</em> stores it against that staff member. A tick on the button shows one has been issued; re-issuing replaces it.</li>
            <li><strong>On the staff record</strong>: every certificate appears in a <strong>Training certificates</strong> section on the individual&apos;s staff page (Staff → open a person), where you can re-open any of them.</li>
            <li><strong>In analytics</strong>: <strong>Analytics → Staff</strong> shows a <strong>Completion certificates</strong> list across all staff, plus a per-person count, so you have one place to see and open everything issued.</li>
          </ul>
        </SectionBlock>
        <SectionBlock title="Reminding allocated staff by email">
          <p className="text-sm text-neutral-mid">
            Reminders are <strong>never sent automatically</strong>, you decide when. While creating a session, use <strong>Create &amp; email reminder</strong> to create it and email the allocated staff that they&apos;re booked in. For an existing session, open it and click <strong>Email reminder to allocated staff</strong> (handy to send again closer to the date). The session shows when a reminder was <strong>last sent</strong>.
          </p>
        </SectionBlock>
        <SectionBlock title="Sending the digital module to anyone who missed">
          <p className="text-sm text-neutral-mid">
            In the session, the <strong>Send the digital module</strong> panel lets you pick exactly who should complete the training digitally, click <strong>Select those who missed</strong> for the obvious case, or choose anyone. They get the module in their hub <strong>My Training</strong>, and the session shows a <strong>sent</strong> marker against them.
          </p>
          <p className="mt-2 text-sm text-neutral-mid">
            A module can only be sent once it has been <strong>built</strong> (it has a lesson or questions). If it hasn&apos;t, you&apos;ll see a prompt to add a lesson or questions in <strong>Training → Adhoc Training Modules &amp; Questions</strong> first, and unbuilt topics are marked <strong>&ldquo;not built yet&rdquo;</strong> in the session form.
          </p>
        </SectionBlock>
        <SectionBlock title="Backfilling the last 12 months">
          <p className="text-sm text-neutral-mid">
            To get started, add your <strong>past sessions</strong>: create a session as normal but set a <strong>past date</strong>, pick the topic and trainer, and mark who attended/missed. This builds up your history so the record and analytics reflect the training you&apos;ve already delivered.
          </p>
        </SectionBlock>
        <SectionBlock title="Planning ahead">
          <p className="text-sm text-neutral-mid">
            Use the calendar arrows to move into next year and schedule future sessions. From <strong>October</strong> each year, a reminder appears prompting you to start planning the following year if nothing is booked yet.
          </p>
        </SectionBlock>
        <SectionBlock title="Seeing it across the platform">
          <p className="text-sm text-neutral-mid">You can review face-to-face training in three places:</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-neutral-mid">
            <li><strong>Analytics → Staff</strong>: a <strong>Face-to-face training</strong> section showing who missed sessions, who was sent the digital module as a result, and whether they&apos;ve completed it.</li>
            <li><strong>The hub</strong>: an admin-only <strong>F2F Training</strong> tab gives you the same picture on your phone.</li>
            <li><strong>Each staff record</strong>: a <strong>Face-to-face training</strong> section listing the sessions that person was allocated to, whether they attended or missed, and the status of any catch-up module. It&apos;s part of their record for CQC evidence.</li>
          </ul>
        </SectionBlock>
        <Tip>Face-to-face is admin-only. Staff don&apos;t see the calendar; they only receive the digital module if you choose to send it to them.</Tip>
      </div>
    ),
  },
  {
    id:      'cqc-staff-prep',
    icon:    ClipboardList,
    title:   'CQC Staff Prep',
    summary: 'Build staff confidence for CQC inspector interviews with practice questions and AI-scored answers',
    content: (
      <div className="space-y-5">
        <SectionBlock title="What it is">
          <p className="text-sm text-neutral-mid">
            CQC Staff Prep helps your team prepare for conversations with CQC inspectors. Staff are sent open-ended practice questions, the kind an inspector would actually ask, and write their answers in their own words. CareStream evaluates each answer and gives a score out of 100 with specific feedback, so staff know exactly where to improve before an inspection.
          </p>
        </SectionBlock>
        <SectionBlock title="How it works">
          <div className="space-y-3">
            <Step n={1}>Go to <strong>CQC Staff Prep</strong> in the Reporting section of the sidebar.</Step>
            <Step n={2}>The Question Bank comes pre-loaded with 21 CQC inspector-style questions organised across five domains: Safe, Effective, Caring, Responsive, and Well-led. Each question shows its <strong>model answer</strong>: the standard a strong answer is measured against, and its own tracking line: how many staff it&apos;s been <strong>assigned</strong> to, how many have <strong>answered</strong>, and their <strong>average score</strong>.</Step>
            <Step n={3}>To send a question out, use <strong>Assign to all staff</strong> to send it to everyone at once, or <strong>Assign to specific staff</strong> to pick individuals. A domain header also has <strong>Assign all to staff</strong> to send every question in that domain in one go. (Admins are never included, only active staff are assigned.)</Step>
            <Step n={4}>The question is automatically rephrased before delivery so staff cannot memorise the exact wording. (If someone already has that question, they aren&apos;t sent a duplicate.)</Step>
            <Step n={5}>Staff open their portal and write a free-text answer. There is no multiple choice, they must articulate their knowledge in their own words, just as they would with a real inspector.</Step>
            <Step n={6}>CareStream immediately scores the answer from 0 to 100, against the model answer, and gives constructive written feedback. Staff see their result, and the <strong>model answer</strong>, straight away.</Step>
            <Step n={7}>If a staff member scores below 60, they can <strong>review the model answer and feedback, then try again</strong> in their own words. The new attempt is re-scored and replaces the old one, so the follow-up is built in, no manual re-sending needed.</Step>
            <Step n={8}>Track progress across your whole team in the <strong>Performance</strong> tab, scores are shown per staff member and per CQC domain so you can see exactly where to focus.</Step>
          </div>
        </SectionBlock>
        <SectionBlock title="The five CQC domains">
          <div className="rounded-lg border border-gray-200 divide-y divide-gray-100 text-sm">
            {[
              ['Safe',        'Safeguarding, medication, infection control, risk management, and responding to incidents.'],
              ['Effective',   'Person-centred care, nutrition and hydration, independence, consent, and staff training.'],
              ['Caring',      'Dignity and respect, communication, emotional wellbeing, and family involvement.'],
              ['Responsive',  'Meeting individual needs, handling complaints, and responding to changes in condition.'],
              ['Well-led',    'Open reporting culture, team communication, following policies, and raising concerns.'],
            ].map(([domain, desc]) => (
              <div key={domain} className="grid grid-cols-[7rem_1fr] gap-3 px-4 py-3">
                <span className="font-medium text-neutral-dark">{domain}</span>
                <span className="text-neutral-mid">{desc}</span>
              </div>
            ))}
          </div>
        </SectionBlock>
        <SectionBlock title="Adding your own questions">
          <div className="space-y-3">
            <p className="text-sm text-neutral-mid">
              Click <strong>Add question</strong> in the Question Bank to create a single CQC prep question. You can write it manually, or describe a topic and let CareStream draft the question and model answer for you using AI.
            </p>
            <p className="text-sm text-neutral-mid">
              To create several at once, click <strong>Generate with AI</strong>. Choose a single domain or a <strong>balanced mix across all five</strong>, pick how many (3, 5 or 10), and optionally give a focus theme (e.g. dementia care, medication). CareStream generates that many brand-new questions and model answers, saves them straight to your bank, and avoids duplicating questions you already have.
            </p>
            <p className="text-sm text-neutral-mid">
              All generated questions follow the same CQC inspector style and include a model answer used for scoring. <strong>AI generation uses 1 AI credit per question generated</strong>: so a batch of 5 uses 5 credits. The cost is shown before you confirm.
            </p>
          </div>
        </SectionBlock>
        <SectionBlock title="Understanding scores">
          <div className="rounded-lg border border-gray-200 divide-y divide-gray-100 text-sm">
            {[
              ['80–100', 'Excellent', 'Covers all key points clearly, staff would reassure an inspector on this topic.'],
              ['60–79',  'Good',      'Solid knowledge with minor gaps. A little more detail would strengthen the answer.'],
              ['40–59',  'Partial',   'Some good points but significant gaps. An inspector would probe further.'],
              ['0–39',   'Needs work','Key knowledge is missing or vague. This area needs focused attention before an inspection.'],
            ].map(([range, label, desc]) => (
              <div key={range} className="grid grid-cols-[4rem_6rem_1fr] gap-3 px-4 py-3">
                <span className="font-medium text-neutral-dark">{range}</span>
                <span className="font-medium text-neutral-dark">{label}</span>
                <span className="text-neutral-mid">{desc}</span>
              </div>
            ))}
          </div>
        </SectionBlock>
        <SectionBlock title="Learn &amp; retry">
          <p className="text-sm text-neutral-mid">
            After answering, staff see the model answer. If they score below 60 they get a <strong>Review &amp; try again</strong> option: they read the model answer and feedback, then re-answer in their own words. The new attempt is re-scored and replaces the old one, and we keep their first score so the <strong>improvement</strong> is recorded, built-in follow-up, with no manual re-sending.
          </p>
        </SectionBlock>
        <SectionBlock title="Tracking &amp; evidence">
          <div className="space-y-3">
            <p className="text-sm text-neutral-mid">
              In the <strong>Question Bank</strong>, each question shows how many staff it&apos;s been assigned to, how many answered, and the average score.
            </p>
            <p className="text-sm text-neutral-mid">
              In <strong>Analytics → CQC Staff Prep</strong>, you get the whole-team picture: scores by inspection domain, a per-staff table, and a <strong>Review &amp; retry</strong> summary showing how many answers were re-attempted and the average score improvement, direct evidence staff are learning.
            </p>
            <p className="text-sm text-neutral-mid">
              On each <strong>staff record</strong>, a <strong>CQC Staff Prep</strong> section lists every question that person was assigned, their score, and any improvement after retrying. It&apos;s included in the CQC evidence PDF.
            </p>
          </div>
        </SectionBlock>
        <Tip>Focus sending questions to the domains where your team's scores are lowest. Running CQC Staff Prep regularly in the weeks before an inspection significantly builds staff confidence and reduces inspection anxiety.</Tip>
      </div>
    ),
  },
  {
    id:      'policy-gaps',
    icon:    ShieldAlert,
    title:   'Policy gaps',
    summary: 'Identify missing or incomplete policies in your document library',
    content: (
      <div className="space-y-5">
        <SectionBlock title="What it does">
          <div className="space-y-3">
            <p className="text-sm text-neutral-mid">
              Policy Gaps checks the regulations that apply to a registered care setting against the <strong>actual content</strong> of your uploaded policies, it reads inside the documents rather than matching on titles. For each regulation it tells you whether your policies <strong>cover</strong> it, partially cover it, or leave a <strong>gap</strong>, and names the policy that provides the evidence.
            </p>
            <p className="text-sm text-neutral-mid">
              It also surfaces <strong>unanswered staff questions</strong>: recurring themes where staff asked something the assistant couldn&apos;t answer from your policies, which is real-world evidence of a missing or unclear policy.
            </p>
          </div>
        </SectionBlock>
        <SectionBlock title="How coverage is judged">
          <div className="space-y-3">
            <p className="text-sm text-neutral-mid">
              CareStream keeps a library of the regulations that apply to registered care settings (CQC fundamental standards, the Care Act, health &amp; safety law, MCA/DoLS, infection control, and more). For each one, the coverage check works in three steps:
            </p>
            <ol className="list-decimal space-y-1.5 pl-5 text-sm text-neutral-mid">
              <li><strong>Find the relevant policy passages.</strong> The regulation is turned into a search and run against the indexed content of <em>all</em> your uploaded policies, the same retrieval that powers the staff chat, to pull out the passages most likely to address it.</li>
              <li><strong>Judge from the content.</strong> An AI compliance auditor reads those passages and decides, from your documents&apos; actual wording, not their titles, whether they substantively address the regulation.</li>
              <li><strong>Record the verdict and evidence.</strong> Each regulation is marked Covered, Partial or Gap, with the policy that provides the evidence and a one-line reason. Results are cached so the page is instant until you re-run it.</li>
            </ol>
            <p className="text-sm text-neutral-mid">
              This is the key difference from a simple checklist: a regulation is only flagged when your policies genuinely don&apos;t address it in content, so with a complete, well-maintained library the vast majority come back Covered.
            </p>
          </div>
        </SectionBlock>
        <SectionBlock title="Covered, Partial and Gap">
          <div className="rounded-lg border border-gray-200 divide-y divide-gray-100 text-sm">
            {[
              ['Covered', 'A policy clearly and substantively addresses the regulation. The evidence policy is named.'],
              ['Partial', 'The topic is touched on but the policy is incomplete for what the regulation requires. The policy that partly covers it is named so you can strengthen it.'],
              ['Gap',     'Nothing in your uploaded policies addresses the regulation, add a policy that covers it.'],
            ].map(([label, desc]) => (
              <div key={label} className="grid grid-cols-[6rem_1fr] gap-3 px-4 py-3">
                <span className="font-medium text-neutral-dark">{label}</span>
                <span className="text-neutral-mid">{desc}</span>
              </div>
            ))}
          </div>
        </SectionBlock>
        <SectionBlock title="Unanswered staff questions">
          <p className="text-sm text-neutral-mid">
            Alongside regulation coverage, the page clusters questions your staff asked, in the Chat Hub, by email or by voice, that the assistant <strong>could not answer from your policies</strong> in the last 90 days. Recurring themes here are real-world evidence that a policy is missing, unclear, or not yet uploaded, straight from how your team actually uses CareStream.
          </p>
        </SectionBlock>
        <SectionBlock title="Using policy gaps">
          <div className="space-y-3">
            <Step n={1}>Go to <strong>Policy Gaps</strong> in the sidebar.</Step>
            <Step n={2}>Click <strong>Run coverage analysis</strong>. CareStream reads through your policies and judges each regulation against their content, this takes about a minute. The result is saved, so re-open the page any time; re-run it after you&apos;ve uploaded or updated policies.</Step>
            <Step n={3}>Review anything flagged as a <strong>Gap</strong> or <strong>Partial</strong>. Each shows why, and partials name the policy that partly covers it.</Step>
            <Step n={4}>For each gap, upload a policy that addresses it (or strengthen the partial one). Re-run the analysis to confirm it&apos;s now covered.</Step>
          </div>
        </SectionBlock>
        <Tip>Because coverage is judged from policy content, a regulation only shows as a gap when your policies genuinely don&apos;t address it, not just because no policy happens to be titled with the regulation&apos;s name. Re-run the analysis before a CQC inspection for an up-to-date picture.</Tip>
      </div>
    ),
  },
  {
    id:      'monthly-audits',
    icon:    ClipboardCheck,
    title:   'Monthly Audits',
    summary: 'Complete, store, and review care quality audits, on the web or in the hub, with AI recommendations',
    content: (
      <div className="space-y-5">
        <SectionBlock title="What audits do">
          <p className="text-sm text-neutral-mid">
            The Audits module provides pre-built audit templates covering the key governance areas of a care setting, Health &amp; Safety, Medicines Management, Infection Control, Fire Safety, bedroom checks and more, at daily, monthly, quarterly and periodic frequencies. Complete audits on the web or in the <strong>Chat Hub</strong>, and generate CQC-linked AI recommendations on completion. You can also <strong>build your own audits</strong> for anything specific to your service.
          </p>
        </SectionBlock>

        <SectionBlock title="Building your own audit">
          <p className="text-sm text-neutral-mid">
            Beyond the ready-made templates, you can create audits tailored to your service, a kitchen hygiene check, a maintenance walk-round, a supervision checklist, anything you audit.
          </p>
          <div className="mt-2 space-y-3">
            <Step n={1}>On the <strong>Monthly Audits</strong> page click <strong>Build your own audit</strong>.</Step>
            <Step n={2}>Give it a <strong>name</strong> and choose <strong>how often</strong> it runs (Periodic, Daily, Weekly, Monthly or Quarterly).</Step>
            <Step n={3}>Add your <strong>questions</strong>. For each one, pick the response type: <strong>Yes / No / N/A + notes</strong> (the default), <strong>Yes / No + notes</strong>, or <strong>Free-text findings</strong>. Add as many questions as you need.</Step>
            <Step n={4}>Optionally, under <strong>Linked training</strong>, tick the training module(s) this audit measures. CareStream then tracks whether completing that training improves this audit&rsquo;s scores over time, shown in <strong>Analytics → Training Impact</strong>. You can also set this later with the <strong>Linked training</strong> button on the audit under <strong>Your audits</strong>.</Step>
            <Step n={5}>Click <strong>Create audit</strong>. It now appears under <strong>Your audits</strong> on this page (delete it there if you no longer need it).</Step>
            <Step n={6}>To put it in front of staff, go to <strong>Staff</strong>, add or edit a person, set <strong>Access level</strong> to <em>Staff + Audits</em>, and tick your new audit. It then shows in that staff member&rsquo;s hub for them to complete, answering each question with the response buttons plus a notes field, exactly like the built-in audits, including the AI recommendations on completion.</Step>
          </div>
          <Tip>Your custom audits sit alongside the pre-built ones everywhere, the allocation list, the hub, the repository and the AI recommendations, so there&rsquo;s nothing extra to learn.</Tip>
        </SectionBlock>

        <SectionBlock title="Available templates">
          <div className="rounded-lg border border-gray-200 divide-y divide-gray-100 text-sm">
            {[
              ['Daily',     'Fire Marshall Checklist'],
              ['Daily',     'Resident Bedrooms'],
              ['Monthly',   'Health &amp; Safety'],
              ['Monthly',   'Resident Bedroom Audit'],
              ['Monthly',   'Medicines Management'],
              ['Monthly',   'Kitchen Audit'],
              ['Monthly',   'Accident &amp; Incident Book Audit'],
              ['Quarterly', 'Infection Control'],
              ['Quarterly', 'Fire Drill Record Form'],
              ['Periodic',  'Quality Assurance'],
              ['Periodic',  'GDPR Audit Checklist'],
            ].map(([freq, name]) => (
              <div key={name} className="grid grid-cols-[6rem_1fr] gap-3 px-4 py-2.5">
                <span className="text-xs font-medium text-teal">{freq}</span>
                <span className="text-neutral-dark" dangerouslySetInnerHTML={{ __html: name }} />
              </div>
            ))}
          </div>
        </SectionBlock>

        <SectionBlock title="Completing an audit on the web">
          <div className="space-y-3">
            <Step n={1}>Go to <strong>Monthly Audits</strong> in the sidebar and click <em>New audit</em>.</Step>
            <Step n={2}>Choose the audit type, select the month, and optionally enter the auditor's name and role. Click <em>Start audit</em>, then confirm the details on the next screen.</Step>
            <Step n={3}>Work through each section using the tabs at the top. Answer yes/no questions by tapping Yes or No (or N/A where applicable). For findings-based audits, type your observations directly into the Findings field and record any planned actions in Actions &amp; Timescales.</Step>
            <Step n={4}>Answers save automatically as you go. To pause and return later, click <em>Save &amp; exit</em> at the top of the form, your audit will appear in the <strong>In progress</strong> section on the Monthly Audits page.</Step>
            <Step n={5}>Once all required questions are answered, open the <strong>Summary</strong> tab. Fill in the strengths, areas for improvement, and a target completion date for any actions.</Step>
            <Step n={6}>Click <em>Complete &amp; get AI recommendations</em> to finalise the audit and generate your report.</Step>
          </div>
        </SectionBlock>

        <SectionBlock title="Doing audits in the Chat Hub">
          <p className="text-sm text-neutral-mid">
            Staff whose role is <strong>Admin</strong> get an <strong>Audits</strong> item in the Chat Hub sidebar, handy for completing checks on a phone or tablet while walking the home.
          </p>
          <div className="mt-2 space-y-3">
            <Step n={1}>Open the hub and choose <strong>Audits</strong>. Templates are grouped by frequency (Daily, Weekly, Monthly…), with anything in progress shown at the top to resume.</Step>
            <Step n={2}>Tap <strong>Start</strong> to begin a run, answer each question (Yes/No/N-A, findings or free-text, saved automatically), then <strong>Complete audit</strong> to generate the AI recommendations.</Step>
            <Step n={3}>Audits done in the hub are the same records as on the web, they appear in your <strong>Audit section</strong> (and repository) automatically. Nothing is duplicated.</Step>
          </div>
        </SectionBlock>

        <SectionBlock title="Per-room audits (bedrooms)">
          <p className="text-sm text-neutral-mid">
            Bedroom audits are completed <strong>one room at a time</strong>. When you start one, you pick a room number first, and each room is tracked as its own record (a daily bedroom audit resets per room, per day).
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-neutral-mid">
            <li>Set how many rooms your home has in <strong>Settings → Rooms</strong>. The room picker then offers <strong>1</strong> to that number.</li>
            <li>Need a named room (e.g. "Lavender")? Just type it into the room box when starting, it&apos;s remembered for next time.</li>
          </ul>
        </SectionBlock>

        <SectionBlock title="Daily reminders">
          <p className="text-sm text-neutral-mid">
            Each morning CareStream emails admins a reminder to finish any in-progress audits and start recurring ones (e.g. daily bedroom checks) not yet done. Turn these on/off with the <strong>Audit updates</strong> switch in <strong>Settings → Email communications</strong>.
          </p>
        </SectionBlock>

        <SectionBlock title="AI recommendations">
          <p className="text-sm text-neutral-mid">
            On completion, CareStream analyses every answer against CQC Key Questions and generates a structured report covering: immediate actions required, priority improvements, CQC compliance notes across the five key questions (Safe, Effective, Caring, Responsive, Well-Led), commendations, and recommended focus areas for the next cycle.
          </p>
          <Tip>The AI recommendations prompt can be customised in the Platform Console under AI Prompts → Audit Recommendations, so you can tailor the output style for your organisation.</Tip>
        </SectionBlock>

        <SectionBlock title="Audit repository">
          <p className="text-sm text-neutral-mid">
            All completed audits are stored in the Audit Repository at the bottom of the Monthly Audits page. Click any row to view the full report, review the AI recommendations, or print a PDF-ready version. In-progress audits appear separately at the top so you can return to them at any time.
          </p>
        </SectionBlock>
      </div>
    ),
  },
  {
    id:      'group',
    icon:    Building2,
    title:   'Managing multiple homes (Group)',
    summary: 'Benchmark every home in your group and switch between them',
    content: (
      <div className="space-y-5">
        <SectionBlock title="What the Group console is">
          <p className="text-sm text-neutral-mid">
            If your organisation runs more than one home, they can be linked together as a <strong>group</strong>. A <strong>Group</strong> item then appears at the top of the sidebar (you only see it when your account has more than one site). It gives regional and head-office managers a single place to see how every home is doing and to jump straight into any one of them.
          </p>
        </SectionBlock>
        <SectionBlock title="The group overview">
          <p className="text-sm text-neutral-mid">Open <strong>Group</strong> to see:</p>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-neutral-mid">
            <li><strong className="text-neutral-dark">Summary cards</strong> across the whole group: number of homes, total staff, and group-wide Training, Onboarding, Audits and an Overall compliance score.</li>
            <li><strong className="text-neutral-dark">A league table</strong> of your homes, ranked by overall compliance. Each home shows its staff count and its Training, Onboarding and Audit percentages, colour coded (green is strong, amber is worth watching, red needs action).</li>
            <li><strong className="text-neutral-dark">An Attention count</strong> per home: overdue inductions plus expired training, so you can see at a glance where to focus.</li>
          </ul>
          <p className="mt-2 text-sm text-neutral-mid">A home with no activity yet shows a dash rather than a percentage, until its staff start training, onboarding or audits.</p>
        </SectionBlock>
        <SectionBlock title="Opening a home">
          <div className="space-y-3">
            <Step n={1}>On the Group table, click <strong>Open</strong> next to any home.</Step>
            <Step n={2}>CareStream switches you into that home. Everything (policies, staff, training, audits) is now that home&rsquo;s data, and the site name in the top bar updates.</Step>
            <Step n={3}>Switch back the same way, from the Group page or the site switcher in the top bar. The home you are currently in is marked <strong>You are here</strong>.</Step>
          </div>
        </SectionBlock>
        <SectionBlock title="Adding a home">
          <p className="text-sm text-neutral-mid">
            To add another home yourself, go to <strong>Settings</strong>, open the <strong>Sites</strong> section, and click <strong>Add a site</strong>. You can also switch between your homes from there, or from the site switcher in the top bar. Or ask the CareStream team to set one up for you. New homes appear in the Group overview automatically.
          </p>
        </SectionBlock>
        <Tip>Each home keeps its own policies, staff and records. The Group overview never mixes them, it simply totals and compares them so you can manage the whole group from one place.</Tip>
      </div>
    ),
  },
  {
    id:      'workforce',
    icon:    BadgeCheck,
    title:   'Workforce compliance register (Enterprise)',
    summary: 'DBS, right to work, registration, references, document uploads, expiry alerts, supervisions and appraisals',
    content: (
      <div className="space-y-5">
        <SectionBlock title="What it is">
          <p className="text-sm text-neutral-mid">
            The Workforce compliance register is an <strong>Enterprise feature</strong>. It keeps each staff member&rsquo;s &ldquo;safe to work&rdquo; credentials in one place, with expiry dates and a live Red/Amber/Green view. It is the evidence CQC looks for under safe recruitment (Regulation 19), so nothing quietly lapses.
          </p>
          <p className="mt-2 text-sm text-neutral-mid">Open it from <strong>Compliance</strong> in the Team section of the sidebar. It tracks five credentials per person:</p>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-neutral-mid">
            <li><strong className="text-neutral-dark">DBS check</strong> (certificate number and renewal date)</li>
            <li><strong className="text-neutral-dark">Right to work</strong> (document type, plus expiry for time-limited visas)</li>
            <li><strong className="text-neutral-dark">Passport</strong> (number and expiry date, important for overseas staff)</li>
            <li><strong className="text-neutral-dark">Professional registration</strong> (for example NMC, with renewal date)</li>
            <li><strong className="text-neutral-dark">References</strong> (received or outstanding)</li>
          </ul>
        </SectionBlock>
        <SectionBlock title="The register">
          <p className="text-sm text-neutral-mid">
            The register shows every active staff member with a colour-coded status for each credential: <strong className="text-green-700">green</strong> when it is valid, <strong className="text-amber-700">amber</strong> when it expires within 30 days, and <strong className="text-red-600">red</strong> when it is expired or missing. The summary cards at the top total how many are valid, expiring soon, expired or missing across your whole team.
          </p>
        </SectionBlock>
        <SectionBlock title="Recording a credential">
          <div className="space-y-3">
            <Step n={1}>Click a staff member&rsquo;s row to open their compliance record.</Step>
            <Step n={2}>For each credential, enter the reference (for example the DBS certificate number), the issue date, and the expiry or renewal date, then click <strong>Save</strong>.</Step>
            <Step n={3}>The register updates straight away, and the colour reflects the new expiry date. Use <strong>Clear</strong> to remove a credential if it was added by mistake.</Step>
          </div>
        </SectionBlock>
        <SectionBlock title="Uploading the documents">
          <p className="text-sm text-neutral-mid">
            You can attach the actual document to each credential (the DBS certificate, visa, registration card or reference letter). Open a staff member&rsquo;s record from the register and use <strong>Upload</strong> next to a credential to add a PDF or image (up to 15 MB). Files are validated and virus-scanned before they are stored securely.
          </p>
          <p className="mt-2 text-sm text-neutral-mid">
            Once uploaded, a paperclip appears on that credential in the register, and you can <strong>View</strong> or <strong>Replace</strong> the document at any time. Each staff member&rsquo;s record page also has a <strong>Compliance credentials</strong> section showing their status and letting you open the uploaded documents, so everything is together as CQC evidence.
          </p>
        </SectionBlock>
        <SectionBlock title="Expiry alerts">
          <p className="text-sm text-neutral-mid">
            CareStream can email your admins a digest of any credentials that have expired or expire within the next 30 days, so renewals never slip. This runs automatically each day. You can turn it on or off under <strong>Settings &rarr; Email communications &rarr; Compliance credential expiry</strong>.
          </p>
          <p className="mt-2 text-sm text-neutral-mid">
            You can also send it on demand: on the <strong>Compliance</strong> page, click <strong>Email expiry alerts</strong> at the top right and your admins get the digest straight away.
          </p>
          <p className="mt-2 text-sm text-neutral-mid">
            <strong>Passports</strong> are treated a little differently: as well as the admin digest, the <strong>staff member is emailed personally</strong> as their passport comes up for renewal (and if it has expired), so overseas staff can keep it valid. All of these emails use the <strong>Compliance credential expiry</strong> toggle under Settings.
          </p>
        </SectionBlock>
        <SectionBlock title="Supervisions and appraisals">
          <p className="text-sm text-neutral-mid">
            The <strong>Supervisions &amp; appraisals</strong> tab on the Compliance page tracks each staff member&rsquo;s 1:1 supervisions and annual appraisals, showing their last session and their next booked or due date, colour coded so overdue ones stand out.
          </p>
          <div className="mt-2 space-y-3">
            <Step n={1}>Open the <strong>Compliance</strong> page and switch to the <strong>Supervisions &amp; appraisals</strong> tab.</Step>
            <Step n={2}>Click a staff member and use <strong>Log a session</strong>: choose supervision or appraisal, the date, who is conducting it, an optional next-due date, and notes.</Step>
            <Step n={3}>Choose a <strong>future date to book</strong> an upcoming session, or a past date to record one already held. Booked sessions show as <strong>Booked</strong> on the register with their date.</Step>
          </div>
          <p className="mt-3 text-sm text-neutral-mid">
            When you book a future session, the staff member gets an <strong>email confirmation</strong>, and both the staff member and your admins get a <strong>reminder the day before</strong>. Staff can also see their booked and past sessions in their own hub under <strong>Supervisions</strong>. You can turn these emails on or off under <strong>Settings &rarr; Email communications &rarr; Supervisions &amp; appraisals</strong>. Each staff member&rsquo;s record page shows their latest supervision and appraisal as CQC evidence.
          </p>
        </SectionBlock>
        <Tip>Enter the renewal date even for credentials without a fixed expiry (like a DBS on the update service), so the register can warn you in good time. Anything red or amber is where to focus before your next inspection.</Tip>
      </div>
    ),
  },
  {
    id:      'settings',
    icon:    Settings,
    title:   'Settings',
    summary: 'Configure email, access controls, and AI behaviour',
    content: (
      <div className="space-y-5">
        <SectionBlock title="Settings sections">
          <div className="rounded-lg border border-gray-200 divide-y divide-gray-100 text-sm">
            {[
              ['Dedicated email address', 'Your inbound email address for staff queries. Copy this to share with your team.'],
              ['Portal access',           'Restrict who can access the staff Chat Hub. Options: open, PIN protected, or staff-only.'],
              ['Email allowlist',         'Limit which email addresses can receive AI replies. Leave empty to allow all registered staff.'],
              ['AI behaviour',            'Adjust the tone and verbosity of AI responses across all channels.'],
              ['Notifications',           'Configure which events trigger email notifications to managers.'],
              ['Data retention',          'Set how long query history and session data is kept.'],
              ['Branding',                'Add your care setting name and logo to the Chat Hub and email replies.'],
              ['Danger zone',             'Delete account: closes the account, signs everyone out, and queues your data for permanent erasure. See "Plans, billing & closing your account" below.'],
            ].map(([setting, desc]) => (
              <div key={setting} className="grid grid-cols-[11rem_1fr] gap-3 px-4 py-3">
                <span className="font-medium text-neutral-dark">{setting}</span>
                <span className="text-neutral-mid">{desc}</span>
              </div>
            ))}
          </div>
        </SectionBlock>
        <Tip>Settings changes take effect immediately and there is no separate publish or save step for most settings.</Tip>
      </div>
    ),
  },
  {
    id:      'billing-account',
    icon:    ShieldAlert,
    title:   'Plans, billing & closing your account',
    summary: 'Upgrade your plan, manage billing, and how to delete your account',
    content: (
      <div className="space-y-5">
        <SectionBlock title="Your plan & upgrading">
          <p className="text-sm text-neutral-mid">
            Your current plan, monthly price, and annual training allocation are shown on the <strong>Dashboard</strong> and
            on the <strong>Billing</strong> page. Each plan includes a monthly pool of annual training allocations
            (Starter 10, Professional 30, Enterprise unlimited) — one allocation is one annual training module assigned to
            one staff member.
          </p>
          <div className="space-y-3">
            <Step n={1}>Go to <strong>Billing</strong> in the sidebar (or click <strong>Upgrade plan</strong> on the Dashboard).</Step>
            <Step n={2}>Under <strong>Upgrade your plan</strong>, the higher tiers available to you are listed with their features and price.</Step>
            <Step n={3}>Click <strong>Upgrade to …</strong> to go to secure Stripe checkout. Upgrades take effect immediately and unlock the new features straight away.</Step>
          </div>
          <Tip>Locked features (for example Face-to-face training, Build your own audit, or the Effectiveness and Training Impact reports) show an <strong>Upgrade</strong> prompt that takes you to Billing. Your existing data is always kept exactly as it is when you change plan.</Tip>
        </SectionBlock>

        <SectionBlock title="Managing payment & invoices">
          <p className="text-sm text-neutral-mid">
            Use <strong>Manage billing</strong> on the Billing page to open the secure Stripe portal, where you can update
            your card, change payment details, and download invoices. Your invoice history is also listed on the Billing
            page. CareStream never sees or stores your card details.
          </p>
        </SectionBlock>

        <SectionBlock title="Deleting your account">
          <p className="text-sm text-neutral-mid">
            If you need to close your account, you can do it yourself from <strong>Settings → Danger zone → Delete account</strong>.
            This is a serious, account-wide action, so it asks you to confirm by typing <strong>DELETE</strong>.
          </p>
          <p className="text-sm font-medium text-neutral-dark">When you delete your account, we immediately:</p>
          <ul className="ml-1 space-y-1.5 text-sm text-neutral-mid">
            <li className="flex gap-2"><CheckCircle size={15} className="mt-0.5 shrink-0 text-teal" /> Cancel your subscription so you are not billed again.</li>
            <li className="flex gap-2"><CheckCircle size={15} className="mt-0.5 shrink-0 text-teal" /> Sign out and deactivate <strong>every</strong> login on the account, so no one (admins or staff) can sign in.</li>
            <li className="flex gap-2"><CheckCircle size={15} className="mt-0.5 shrink-0 text-teal" /> Queue all of your data (policies, staff, training, audits) for permanent erasure.</li>
          </ul>
          <Tip>
            Changed your mind? Our team can restore a closed account for <strong>30 days</strong>. After that, the data is
            permanently erased and cannot be recovered. To restore, contact support before the 30 days are up.
          </Tip>
          <p className="text-sm text-neutral-mid">
            Only an <strong>admin</strong> can delete the account. If you only want to stop being billed but keep your data,
            use <strong>Manage billing</strong> to cancel your subscription instead of deleting the account.
          </p>
        </SectionBlock>
      </div>
    ),
  },
]

// ─── Accordion item ───────────────────────────────────────────────────────────

function GuideAccordion({ section, isOpen, onToggle }: { section: GuideSection; isOpen: boolean; onToggle: () => void }) {
  const Icon = section.icon

  return (
    <div className="overflow-hidden rounded-card bg-white shadow-card">
      <button
        onClick={onToggle}
        className="flex w-full items-center gap-3 px-6 py-4 text-left transition-colors hover:bg-neutral-light/50"
        aria-expanded={isOpen}
      >
        <Icon size={18} className="shrink-0 text-teal" />
        <div className="flex-1 min-w-0">
          <p className="text-base font-semibold text-neutral-dark">{section.title}</p>
          <p className="mt-0.5 text-xs text-neutral-mid">{section.summary}</p>
        </div>
        {isOpen
          ? <ChevronUp size={16} className="shrink-0 text-neutral-mid" />
          : <ChevronDown size={16} className="shrink-0 text-neutral-mid" />
        }
      </button>

      {isOpen && (
        <div className="space-y-5 border-t border-gray-100 px-6 py-6">
          {section.content}
        </div>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function HelpPage() {
  const { data: session } = useSession()
  const [query, setQuery] = useState('')
  const [showRequest, setShowRequest] = useState(false)
  // Single-open accordion: only one section expanded at a time.
  const [openId, setOpenId] = useState<string | null>(GUIDE_SECTIONS.find(s => s.defaultOpen)?.id ?? null)
  const q = query.trim().toLowerCase()
  const filtered = q
    ? GUIDE_SECTIONS.filter(s => s.title.toLowerCase().includes(q) || s.summary.toLowerCase().includes(q))
    : GUIDE_SECTIONS

  return (
    <div className="space-y-6">
      <FeatureRequestModal open={showRequest} onClose={() => setShowRequest(false)} token={session?.accessToken} />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-neutral-dark">Help &amp; Guides</h1>
          <p className="mt-1 text-sm text-neutral-mid">
            Step-by-step guides for every part of CareStream. Search or click a section to expand it.
          </p>
        </div>
        <button onClick={() => setShowRequest(true)} className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-teal px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-teal-dark">
          <Lightbulb size={16} /> Request New Feature
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-xl">
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-mid" />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search guides…"
          className="w-full rounded-card border border-gray-200 bg-white py-2.5 pl-9 pr-9 text-sm shadow-card outline-none focus:border-teal focus:ring-2 focus:ring-teal/20"
        />
        {query && (
          <button onClick={() => setQuery('')} aria-label="Clear search" className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-mid hover:text-neutral-dark">
            <X size={15} />
          </button>
        )}
      </div>

      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="rounded-card bg-white px-6 py-10 text-center text-sm text-neutral-mid shadow-card">
            No guides match &ldquo;{query}&rdquo;.
          </div>
        ) : filtered.map(section => (
          <GuideAccordion
            key={section.id}
            section={section}
            isOpen={openId === section.id}
            onToggle={() => setOpenId(prev => prev === section.id ? null : section.id)}
          />
        ))}
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex gap-3">
          <CheckCircle size={18} className="shrink-0 text-teal mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-neutral-dark">Need more help?</p>
            <p className="mt-1 text-sm text-neutral-mid">
              Contact the CareStream team at <a href="mailto:support@carestreamai.com" className="text-teal underline underline-offset-2 hover:opacity-80">support@carestreamai.com</a>. We typically respond within one business day.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
