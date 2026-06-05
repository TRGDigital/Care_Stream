'use client'

import { useState } from 'react'
import {
  ChevronDown, ChevronUp,
  FileText, Users, MessageSquare, Mail, Phone, ClipboardCheck,
  GraduationCap, BarChart2, BookOpen, ShieldAlert, Settings, Zap, ClipboardList,
  LifeBuoy, Upload, CheckCircle, Info, UserPlus,
} from 'lucide-react'

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
  return (
    <div className="space-y-3">
      {title && <p className="text-xs font-semibold uppercase tracking-wider text-neutral-mid">{title}</p>}
      {children}
    </div>
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
            <strong>Configure your settings.</strong> Go to <em>Settings</em> and set up your dedicated email address (for email queries), enable WhatsApp, and configure any access restrictions you need.
          </Step>
          <Step n={4}>
            <strong>Tell your team.</strong> Share the portal link, WhatsApp number, or email address with your staff so they can start asking questions.
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
              ['External Regulation',   'Legislation or external guidance (e.g. CQC Key Lines of Enquiry)'],
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
            Internal policies can be filed under a <strong>section</strong> — e.g. Safeguarding, GDPR, Infection control — so your library is organised and easy to scan. Each section shows in its own colour in a dedicated column on the Policies page.
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
            <Step n={2}>Choose their <strong>Position</strong> from the dropdown (Care Assistant, Nurse, Chef, etc.). This is the key field — it decides which onboarding and training they receive.</Step>
            <Step n={3}>If they hold a <strong>specialist role</strong> (e.g. Infection Control, Night Staff), answer <em>Yes</em> and pick one or more from the list. These add extra, specialist onboarding and training on top of their position.</Step>
            <Step n={4}>Choose the <strong>Staff type</strong> — <em>New starter</em> auto-enrols them in the onboarding for their position and specialisms; <em>Existing staff member</em> doesn't.</Step>
            <Step n={5}>Optionally add a WhatsApp number and their first/second language, then share the login details shown on screen.</Step>
          </div>
          <div className="mt-3"><Tip>Right after creating a staff member you're offered a quick <strong>Assign training</strong> step — tick the modules that apply (statutory ones are pre-selected). You can always do this later from their detail card too.</Tip></div>
        </SectionBlock>
        <SectionBlock title="Viewing & managing a staff member">
          <p className="text-sm text-neutral-mid">
            Click a staff member's <strong>name</strong> on the Staff page to open their detail card — a single view of everything they're set up for:
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-neutral-mid">
            <li>Their <strong>profile</strong> — position, specialist roles, shift, WhatsApp, email access and account status.</li>
            <li><strong>Language</strong> — their first and second language, and the communication toggle (below).</li>
            <li><strong>Training</strong> — every module assigned to them with a live status (Not started, In progress, Complete, Expired). Use <strong>+ Assign training</strong> to add more at any time.</li>
            <li><strong>Onboarding</strong> — the induction flows they're enrolled on, with step-by-step progress. Use <strong>+ Assign onboarding</strong> to enrol them on more (flows they're already on are marked and can't be double-assigned).</li>
          </ul>
          <p className="mt-2 text-sm text-neutral-mid">
            To change their details — name, position, specialisms, languages, shift or WhatsApp — use <strong>Edit details</strong> on the card (or the <strong>⋮</strong> menu on their row).
          </p>
        </SectionBlock>
        <SectionBlock title="Positions & specialist roles — how they drive onboarding & training">
          <p className="text-sm text-neutral-mid">
            A staff member's <strong>position</strong> is the single most important thing you set, because CareStream uses it to give them the <strong>right onboarding and the right training questions</strong> for their job — a Care Assistant's induction and quizzes are different from a Nurse's or a Chef's.
          </p>
          <p className="mt-2 text-sm text-neutral-mid">
            <strong>Specialist roles</strong> work on top of the position. If someone is a Senior Care Assistant who is also your Infection Control lead, they get the Senior Care Assistant onboarding <em>plus</em> the Infection Control specialist onboarding — and their training is tailored to both.
          </p>
          <p className="mt-2 text-sm text-neutral-mid">
            Both lists are managed in <strong>Settings → Positions</strong> and <strong>Settings → Specialist roles</strong>. The standard care/nursing positions and specialisms are already there; add any extras specific to your home and they'll appear in the dropdowns straight away.
          </p>
        </SectionBlock>
        <SectionBlock title="Language preferences">
          <p className="text-sm text-neutral-mid">
            When adding a staff member you can record their <strong>first language</strong> and an optional <strong>second language</strong>. CareStream uses the first language to send training questions and automated messages in the staff member's own language — if their first language is Polish, their training quiz questions arrive in Polish. The same applies to renewal reminders and other proactive communications.
          </p>
          <p className="mt-2 text-sm text-neutral-mid">
            Each staff member has an <strong>“Always communicate in their first language”</strong> toggle (in the Add / Edit forms and on their detail card). When it's <strong>on</strong> — the default — every message CareStream sends them is translated into their first language. Turn it <strong>off</strong> for staff who'd rather receive everything in English. You can flip it instantly from the detail card.
          </p>
          <p className="mt-2 text-sm text-neutral-mid">
            Over 50 languages are supported out of the box. If your team speaks one that isn't already listed, add it in <strong>Settings → Languages</strong> (type its English name, e.g. “Shona”) and it appears in the first &amp; second language dropdowns straight away.
          </p>
        </SectionBlock>
        <SectionBlock title="Approved senders & WhatsApp access (added automatically)">
          <p className="text-sm text-neutral-mid">
            When you add a staff member, their email address is automatically added to the <strong>Approved sender addresses</strong> list, and their WhatsApp number (if provided) is automatically added to the <strong>WhatsApp access</strong> list — both in <em>Settings</em>. You don't need to add them in two places.
          </p>
          <p className="mt-2 text-sm text-neutral-mid">
            Both lists in Settings show each entry alongside the staff member it belongs to — for example <em>jane@example.com — Jane Smith (Care Assistant)</em> — so you can see at a glance who each address or number belongs to. Only addresses and numbers on these lists can query CareStream by email or WhatsApp; messages from anyone else are ignored. You can still add shared or external addresses manually in Settings.
          </p>
        </SectionBlock>
        <Tip>Adding a staff member creates a login for them. You'll see their credentials once, on screen — share them securely, and use <strong>Re-send login</strong> from the staff member's menu if they're ever needed again.</Tip>
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
            Every staff member has a full <strong>record page</strong> — a single view of what they've been assigned, what they've completed, how they're scoring, and how engaged they are. Open it two ways from the <strong>Staff</strong> page:
          </p>
          <div className="mt-2 space-y-3">
            <Step n={1}>Click the small <strong>chart icon</strong> next to a name to jump straight to their record.</Step>
            <Step n={2}>Or click the <strong>name</strong> to open the quick overlay (where you assign training/onboarding), then use <strong>View full record →</strong>.</Step>
          </div>
          <div className="mt-3"><Tip>Every section of the record has an <strong>ⓘ</strong> icon — hover or tap it for a plain-English explanation of what you're looking at. The notes below are the same guidance in one place.</Tip></div>
        </SectionBlock>

        <SectionBlock title="Reading the record">
          <div className="space-y-2 text-sm text-neutral-mid">
            <p><strong className="text-neutral-dark">Completion rings</strong> — the share of assigned items finished: training modules, induction flows, and the average quiz score across completed modules. Aim for 100%; a low average score is an early sign someone may not have understood the material.</p>
            <p><strong className="text-neutral-dark">Needs attention</strong> — a coloured banner listing anything outstanding (overdue or expired training, overdue/stalled induction, never logged in). Red = urgent.</p>
            <p><strong className="text-neutral-dark">How they compare to the team</strong> — the teal bar is this person's figure; the dark tick is your home's average. A bar sitting left of the tick is below average and may be worth a conversation.</p>
            <p><strong className="text-neutral-dark">Training record</strong> — every module with its status and <strong>score</strong> (the % of quiz questions answered correctly). "Expires" applies to annual modules due for renewal; "Overdue" means past the due date and not complete. <strong>Reset</strong> clears a module so they can retake it.</p>
            <p><strong className="text-neutral-dark">Induction record</strong> — their onboarding flows, with a bar showing steps completed and an "X/Y correct" count for the question steps.</p>
            <p><strong className="text-neutral-dark">Engagement</strong> — how actively they use CareStream: questions asked in the portal, the topics they ask about, CQC prep answered, and logins. Low engagement alongside overdue training is a useful early warning.</p>
            <p><strong className="text-neutral-dark">Completions (6 months) &amp; Activity timeline</strong> — momentum over time and a dated history of everything they've done. The timeline is good evidence of ongoing development.</p>
          </div>
        </SectionBlock>

        <SectionBlock title="Actions on the record">
          <div className="space-y-2 text-sm text-neutral-mid">
            <p><strong className="text-neutral-dark">Send reminder</strong> — immediately sends the staff member their outstanding training questions by WhatsApp or email (it doesn't wait for the scheduled send).</p>
            <p><strong className="text-neutral-dark">CQC evidence (PDF)</strong> — downloads the whole record as a PDF: training matrix, scores, induction sign-off and dates. Hand this to an inspector as proof a staff member is trained and inducted.</p>
            <p><strong className="text-neutral-dark">Reset</strong> (per module) — clears someone's answers and completion so they can take a module again.</p>
          </div>
        </SectionBlock>

        <SectionBlock title="Spotting problems across the whole team">
          <p className="text-sm text-neutral-mid">
            The <strong>Analytics</strong> page has a <strong>“Staff needing attention”</strong> panel at the top. It surfaces everyone with a flag — overdue or expired training, overdue/stalled induction, or never logged in — so you can triage without opening each record. Each card links straight to that person's record, and urgent cases are dotted red.
          </p>
        </SectionBlock>

        <SectionBlock title="Policy reading engagement">
          <p className="text-sm text-neutral-mid">
            When staff read policies during their induction, CareStream records how they read them. You can see this two ways:
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-neutral-mid">
            <li><strong>On the staff record</strong> — a <strong>Policy reading</strong> table per person: the time they spent on each policy, the furthest they scrolled, and a label — <strong>Thorough</strong> (scrolled to the end), <strong>Skimmed</strong> (marked read without scrolling far) or <strong>Partial</strong>. This is included in the CQC evidence PDF.</li>
            <li><strong>On the Analytics page</strong> — a <strong>Policy reading engagement</strong> section with team-wide figures (sessions, average time, average scroll depth, and % who read to the end).</li>
          </ul>
          <p className="mt-2 text-sm text-neutral-mid">
            This data is for managers only — staff don't see their own reading stats on My Progress.
          </p>
        </SectionBlock>

        <SectionBlock title="Induction question performance">
          <p className="text-sm text-neutral-mid">
            Induction flows include questions, and CareStream marks each answer automatically — multiple-choice is graded instantly, and written answers are checked by AI. (If someone gets a multiple-choice question wrong, they're asked to try again before the step completes.) You can see how staff are doing in two places:
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-neutral-mid">
            <li><strong>On the staff record</strong> — an <strong>Induction questions</strong> section listing every question that person has answered, with a ✓ or ✗, their answer, and the correct answer where they got it wrong. A quick way to spot exactly where an individual needs support. Included in the CQC evidence PDF.</li>
            <li><strong>On the Analytics page</strong> — an <strong>Induction question performance</strong> section: the percentage answered correctly across the team, plus a <strong>“Most-missed induction questions”</strong> list that highlights the topics where knowledge is weakest, so you know what to reinforce in supervision or training.</li>
          </ul>
        </SectionBlock>

        <SectionBlock title="What staff see — “My Progress”">
          <p className="text-sm text-neutral-mid">
            Staff have their own read-only <strong>My Progress</strong> page in the portal (top menu and chat sidebar). It shows their completion rings, what's left to finish with quick links to do it, how they compare to the team, and their training &amp; induction lists.
          </p>
          <p className="mt-2 text-sm text-neutral-mid">
            If a staff member's <strong>“always communicate in their first language”</strong> setting is on, their entire My Progress page — including the ⓘ help bubbles — is shown <strong>in that language</strong>, so non-English speakers can follow their own progress without help.
          </p>
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
            An onboarding flow is a guided induction for new staff — an ordered checklist of steps they work through when they join. Each step is either a <strong>policy to read</strong> (so they confirm they've seen a key document) or a <strong>question to answer</strong>. New starters complete their flow from the staff portal, and you can track who has finished.
          </p>
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
            If a step can't be matched (because you haven't uploaded a policy for that area yet), the flow tells you so you can upload it and link the step. You can edit anything afterwards.
          </p>
        </SectionBlock>
        <SectionBlock title="Where the ready-made flows come from">
          <p className="text-sm text-neutral-mid">
            The ready-made flows are built from a library of real care-sector policies that have been <strong>anonymised</strong> — every home name, address, person and contact detail removed — so they reflect genuine, well-written procedures without belonging to any one home. When you adopt a flow, CareStream uses this as the starting point but always matches and tailors it to <em>your</em> own policies, so what your staff read and answer is specific to your home.
          </p>
        </SectionBlock>
        <SectionBlock title="Multiple-choice questions">
          <p className="text-sm text-neutral-mid">
            Questions can be <strong>multiple choice</strong> — staff pick an answer in the portal and it's marked instantly. A wrong answer asks them to review the policy and try again, so a completed flow is real evidence they understood it. You can also use free-text questions (CareStream assesses the answer) when you build your own steps.
          </p>
        </SectionBlock>
        <SectionBlock title="Building your own flow">
          <div className="space-y-3">
            <Step n={1}>Click <strong>New flow</strong>, name it, and choose which <strong>job roles</strong> it applies to (leave blank for all staff).</Step>
            <Step n={2}>Add steps — a policy to read, or a question. For a question, fill all four options for an auto-marked multiple-choice question, or leave them blank for a free-text answer.</Step>
            <Step n={3}>Make sure the flow is <strong>active</strong> — only active flows are assigned to new starters.</Step>
          </div>
        </SectionBlock>
        <SectionBlock title="Automatic enrolment for new starters">
          <p className="text-sm text-neutral-mid">
            When you add a staff member and choose <strong>New starter</strong>, CareStream automatically enrols them in every active flow (adopted or your own) that matches their <strong>position</strong> or any of their <strong>specialist roles</strong>. So a new Nurse who is also Night Staff joins both the Nurse induction and the Night Staff specialist flow. Set the flows up once and every new starter is enrolled from day one — the confirmation screen tells you how many they joined.
          </p>
        </SectionBlock>
        <SectionBlock title="Tracking progress">
          <p className="text-sm text-neutral-mid">
            Each flow shows its enrolled staff and how far through they are, giving you a clear, auditable record that every new starter completed their induction — useful CQC evidence.
          </p>
        </SectionBlock>
        <SectionBlock title="Reading policies during induction">
          <p className="text-sm text-neutral-mid">
            When an induction step asks staff to read a policy, they tap <strong>Read policy</strong> to open the full document in a clean, readable view (letterhead and contact details are stripped out and it's laid out with headings and bullet points). If the staff member's <strong>first language</strong> is set and their communication toggle is on, the policy is shown <strong>in their language</strong>. They can also <strong>Save for later</strong>, which pins the policy to a <em>Saved policies</em> list in their Chat Hub sidebar.
          </p>
          <p className="mt-2 text-sm text-neutral-mid">
            CareStream quietly records <strong>how they read each policy</strong> — the time they spent and how far they scrolled — so you can tell the difference between someone who read it properly and someone who opened it and marked it done. They can mark a policy as read at any point; we simply record what they actually did.
          </p>
          <p className="mt-2 text-sm text-neutral-mid">
            Inside the reader there's also a <strong>“Talk to this Policy”</strong> button. It opens a focused chat where every answer comes straight from that one policy, and it suggests a few practical questions about it (in the staff member's language) to get them started — so if anything in the policy isn't clear, they can ask about it there and then.
          </p>
        </SectionBlock>
        <Tip>If you add a new starter before a matching flow exists, no onboarding is assigned — adopt or create a flow for that role and future new starters will be enrolled automatically.</Tip>
      </div>
    ),
  },
  {
    id:      'chat-portal',
    icon:    MessageSquare,
    title:   'Chat Hub',
    summary: 'Web-based chat interface for staff to ask policy questions',
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
        <SectionBlock title="Replying in the staff member's language">
          <p className="text-sm text-neutral-mid">
            By default CareStream replies in whatever language the staff member writes in. Under the message box there's a <strong>“Reply in”</strong> picker — they can leave it on <em>Auto-detect</em>, or choose a fixed language so every answer comes back in it (their choice is remembered on that device). The picker lists all your available languages, including any you've added in <strong>Settings → Languages</strong>.
          </p>
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
        <SectionBlock title="Follow-up questions">
          <p className="text-sm text-neutral-mid">
            After each response, CareStream shows three suggested follow-up questions. Staff can tap these to continue the conversation without typing.
          </p>
        </SectionBlock>
        <Tip>The Chat Hub works best on mobile. Encourage staff to bookmark the portal URL on their phones for quick access during shifts.</Tip>
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
    id:      'whatsapp',
    icon:    Phone,
    title:   'WhatsApp queries',
    summary: 'Staff ask questions via WhatsApp, including voice notes',
    content: (
      <div className="space-y-5">
        <SectionBlock title="How it works">
          <p className="text-sm text-neutral-mid">
            Staff send a WhatsApp message to your CareStream number. The AI reads your policies and replies in the same conversation. Voice notes are transcribed automatically before being processed.
          </p>
        </SectionBlock>
        <SectionBlock title="Enabling WhatsApp">
          <div className="space-y-3">
            <Step n={1}>Go to <strong>Settings</strong> and expand the <em>WhatsApp</em> section.</Step>
            <Step n={2}>Enable WhatsApp and note the phone number provided.</Step>
            <Step n={3}>Share the number with your team. They add it as a contact and message it like any WhatsApp conversation.</Step>
          </div>
        </SectionBlock>
        <SectionBlock title="Voice notes">
          <p className="text-sm text-neutral-mid">
            Staff can send a voice note instead of typing. CareStream automatically transcribes the audio and processes it as a normal text query. This is especially useful for staff who find typing difficult or are on the go.
          </p>
        </SectionBlock>
        <SectionBlock title="Session continuity">
          <p className="text-sm text-neutral-mid">
            Each WhatsApp conversation is remembered for 24 hours. Follow-up messages in the same conversation are answered with full context from the earlier exchange.
          </p>
        </SectionBlock>
        <Tip>WhatsApp responses are formatted as plain text with clean spacing. Bold text appears as *asterisks* as per WhatsApp formatting conventions.</Tip>
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
            CareStream also includes a built-in library of CQC Key Lines of Enquiry covering all five domains. These are pre-loaded compliance frameworks that help answer general CQC questions even before your report is uploaded.
          </p>
        </SectionBlock>
        <Tip>Re-upload your new report after each inspection. Delete the old one first so CareStream uses your most recent findings.</Tip>
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
        <SectionBlock title="How it works">
          <p className="text-sm text-neutral-mid">
            CareStream sends training questions directly to staff via WhatsApp or email. Staff answer by replying with A, B, C, or D. Results are tracked on the Training dashboard and Analytics page. Training questions are always a separate delivery — they are never mixed into policy or CQC conversations.
          </p>
        </SectionBlock>
        <SectionBlock title="Training in your team's language">
          <p className="text-sm text-neutral-mid">
            Training questions are automatically delivered in each staff member's first language. If a staff member's first language is set to Romanian, their quiz questions and answer options arrive in Romanian. No manual translation is needed.
          </p>
          <p className="mt-2 text-sm text-neutral-mid">
            You set the language when adding a staff member on the Staff page. It can be changed at any time. A second language can also be recorded for reference. The language setting applies to training questions and automated renewal reminders.
          </p>
        </SectionBlock>
        <SectionBlock title="Asking questions about training topics">
          <p className="text-sm text-neutral-mid">
            Staff are not limited to answering quiz questions. They can also ask open questions about any training topic at any time, through the Chat Hub, email, or WhatsApp. CareStream will respond by drawing on your uploaded training materials and internal policies, and will bring in relevant external regulatory guidance where it applies. Where a training topic overlaps with a CQC inspection area, the response will reference the relevant Key Lines of Enquiry or inspection framework so staff understand the regulatory context behind what they are learning.
          </p>
          <p className="text-sm text-neutral-mid">
            For example, a staff member asking about moving and handling will receive guidance drawing from your internal manual handling policy, any relevant training module you have uploaded, the applicable health and safety regulations, and any CQC Safe domain guidance that relates to that topic.
          </p>
        </SectionBlock>
        <SectionBlock title="Training modules">
          <p className="text-sm text-neutral-mid">
            Upload training documents in the <strong>Policies</strong> section using the <em>Training Module</em> category. CareStream uses these documents as the source for quiz questions and for answering staff training queries.
          </p>
        </SectionBlock>
        <SectionBlock title="What staff see">
          <p className="text-sm text-neutral-mid">
            When a training module is assigned, CareStream sends the first question directly to the staff member as a standalone message on their preferred channel (WhatsApp or email). After each answer, the next question follows automatically. The training flow is completely separate from policy and CQC conversations.
          </p>
        </SectionBlock>
        <SectionBlock title="Viewing results">
          <p className="text-sm text-neutral-mid">
            Go to <strong>Training</strong> in the sidebar to see individual staff completion rates, correct and incorrect responses, and which modules have been covered.
          </p>
        </SectionBlock>
        <Tip>Oliver McGowan Mandatory Training is a legal requirement since 2024. Tier 1 applies to all staff, and Tier 2 applies to those working with people with learning disabilities or autism. Upload the relevant training documents to track compliance across your team.</Tip>
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
            Every query sent via any channel (web, email, WhatsApp, voice) is logged. Go to <strong>Query history</strong> to see the full list, including the question, the AI response, which policies were cited, and whether the staff member gave feedback.
          </p>
        </SectionBlock>
        <SectionBlock title="Analytics dashboard">
          <p className="text-sm text-neutral-mid">
            Go to <strong>Analytics</strong> to see a summary of activity: total queries, most frequently asked topics, channel breakdown, and top staff users. This helps you identify gaps in your policies. If the same question is asked repeatedly, your policy on that topic may need to be clearer.
          </p>
        </SectionBlock>
        <SectionBlock title="CQC report analytics">
          <p className="text-sm text-neutral-mid">
            Go to <strong>Analytics</strong> and select <strong>CQC Report</strong> to see queries specifically about your inspection report. This shows which CQC domains your staff are most focused on.
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
            The knowledge base lets you add short, structured facts about your care setting that CareStream always has access to. These are things that would not normally appear in a policy document, such as your setting's specialism, key contacts, or specific procedures unique to your service.
          </p>
        </SectionBlock>
        <SectionBlock title="Adding entries">
          <div className="space-y-3">
            <Step n={1}>Go to <strong>Knowledge Base</strong> in the sidebar.</Step>
            <Step n={2}>Click <strong>Add entry</strong> and fill in the question and answer.</Step>
            <Step n={3}>Select the <strong>Category</strong> that best describes the entry (see below).</Step>
            <Step n={4}>Optionally add a source name (e.g. the plan or policy the entry comes from).</Step>
            <Step n={5}>Save the entry — it is saved as <em>pending</em>. Approve it from the list before it is used in responses.</Step>
          </div>
        </SectionBlock>
        <SectionBlock title="Knowledge categories">
          <div className="space-y-2 text-sm text-neutral-mid">
            <p>The category you choose determines where the entry is used:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li><strong>General</strong> — available across all policy and handbook queries via the general knowledge base.</li>
              <li><strong>Business Continuity</strong> — appears exclusively in the Business Continuity chat channel. Staff can access it on the portal by selecting the Business Continuity card.</li>
              <li><strong>Policies &amp; Procedures, HR &amp; Staff, Health &amp; Safety, Medication, Infection Control</strong> — all feed into the general knowledge base and appear alongside relevant policy content.</li>
            </ul>
          </div>
        </SectionBlock>
        <SectionBlock title="Platform knowledge">
          <p className="text-sm text-neutral-mid">
            CareStream also comes pre-loaded with a library of regulatory knowledge covering CQC Key Lines of Enquiry, health and safety legislation, infection control guidance, medication regulations, and more. This is available to all care settings on the platform and does not count against your document limit.
          </p>
        </SectionBlock>
        <Tip>Use the knowledge base for things that change less often than policies — such as your registration number, registered manager, bed capacity, or emergency escalation contacts. Categorising entries correctly ensures staff can find them in the right chat channel.</Tip>
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
            The Business Continuity chat channel lets staff ask questions about your organisation&apos;s emergency procedures, escalation contacts, and contingency plans — directly from the staff portal. It reads exclusively from knowledge entries you have categorised as <strong>Business Continuity</strong>, so the answers are specific to your care setting.
          </p>
        </SectionBlock>
        <SectionBlock title="Setting it up">
          <div className="space-y-3">
            <Step n={1}>Go to <strong>Knowledge Base</strong> in the sidebar and click <strong>Add entry</strong>.</Step>
            <Step n={2}>Write a question a staff member might ask (e.g. &ldquo;What do I do if we have a power cut during a night shift?&rdquo;) and the correct answer from your plan.</Step>
            <Step n={3}>Set the <strong>Category</strong> dropdown to <strong>Business Continuity</strong>.</Step>
            <Step n={4}>Optionally add the source name (e.g. &ldquo;Business Continuity Plan v2&rdquo;).</Step>
            <Step n={5}>Save and <strong>Approve</strong> the entry — only approved entries appear in responses.</Step>
            <Step n={6}>Repeat for all key scenarios: staff shortages, IT outages, fire/evacuation, adverse weather, utility failures, supplier failures, and key person absence.</Step>
          </div>
        </SectionBlock>
        <SectionBlock title="How staff use it">
          <div className="space-y-2 text-sm text-neutral-mid">
            <p>Staff open the portal and click the <strong>Business Continuity</strong> card. They can then ask free-text questions such as:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>&ldquo;We are two carers short tonight — what is the escalation process?&rdquo;</li>
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
        <Tip>Business Continuity entries are not used in any other chat channel — they are kept separate so staff always get focused, relevant answers in an emergency situation.</Tip>
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
            CQC Staff Prep helps your team prepare for conversations with CQC inspectors. Staff are sent open-ended practice questions — the kind an inspector would actually ask — and write their answers in their own words. CareStream evaluates each answer and gives a score out of 100 with specific feedback, so staff know exactly where to improve before an inspection.
          </p>
        </SectionBlock>
        <SectionBlock title="How it works">
          <div className="space-y-3">
            <Step n={1}>Go to <strong>CQC Staff Prep</strong> in the Reporting section of the sidebar.</Step>
            <Step n={2}>The Question Bank comes pre-loaded with 21 CQC inspector-style questions organised across five domains: Safe, Effective, Caring, Responsive, and Well-led.</Step>
            <Step n={3}>Click <strong>Send to staff</strong> on any question — or use <strong>Send all to staff</strong> to send every question in a domain at once.</Step>
            <Step n={4}>Select which staff members to send to, then confirm. The question is automatically rephrased before delivery so staff cannot memorise the exact wording.</Step>
            <Step n={5}>Staff open their portal and write a free-text answer. There is no multiple choice — they must articulate their knowledge in their own words, just as they would with a real inspector.</Step>
            <Step n={6}>CareStream immediately scores the answer from 0 to 100 and gives constructive written feedback. Staff see their result straight away.</Step>
            <Step n={7}>Track progress across your whole team in the <strong>Performance</strong> tab — scores are shown per staff member and per CQC domain so you can see exactly where to focus.</Step>
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
          <p className="text-sm text-neutral-mid">
            Click <strong>Add question</strong> in the Question Bank to create your own CQC prep questions. You can write them manually or describe a topic and let CareStream generate a question and model answer for you using AI. Generated questions follow the same CQC inspector style and include a reference answer used for scoring.
          </p>
        </SectionBlock>
        <SectionBlock title="Understanding scores">
          <div className="rounded-lg border border-gray-200 divide-y divide-gray-100 text-sm">
            {[
              ['80–100', 'Excellent', 'Covers all key points clearly — staff would reassure an inspector on this topic.'],
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
          <p className="text-sm text-neutral-mid">
            The Policy Gaps tool analyses your uploaded policy documents against a set of recommended topics for registered care settings. It identifies areas where you either have no policy at all, or where your existing policy may be incomplete.
          </p>
        </SectionBlock>
        <SectionBlock title="Using policy gaps">
          <div className="space-y-3">
            <Step n={1}>Go to <strong>Policy Gaps</strong> in the sidebar.</Step>
            <Step n={2}>Review the list of flagged gaps. Each one shows the recommended topic and why it matters.</Step>
            <Step n={3}>For each gap, either upload a new policy or use the <em>Generate draft</em> feature to create a starting-point document.</Step>
          </div>
        </SectionBlock>
        <Tip>Running the policy gaps check before a CQC inspection helps you identify areas an inspector is likely to ask about.</Tip>
      </div>
    ),
  },
  {
    id:      'monthly-audits',
    icon:    ClipboardCheck,
    title:   'Monthly Audits',
    summary: 'Complete, store, and review care quality audit reports with AI-generated recommendations',
    content: (
      <div className="space-y-5">
        <SectionBlock title="What monthly audits do">
          <p className="text-sm text-neutral-mid">
            The Monthly Audits module provides 12 pre-built audit templates covering the key governance areas of a care setting. Templates span Health &amp; Safety, Medicines Management, Infection Control, Fire Safety, and more. Complete audits on the web or via WhatsApp, and generate CQC-linked AI recommendations on completion.
          </p>
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
              ['Monthly',   'Accident &amp; Incident Book Analysis'],
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
            <Step n={4}>Answers save automatically as you go. To pause and return later, click <em>Save &amp; exit</em> at the top of the form — your audit will appear in the <strong>In progress</strong> section on the Monthly Audits page.</Step>
            <Step n={5}>Once all required questions are answered, open the <strong>Summary</strong> tab. Fill in the strengths, areas for improvement, and a target completion date for any actions.</Step>
            <Step n={6}>Click <em>Complete &amp; get AI recommendations</em> to finalise the audit and generate your report.</Step>
          </div>
        </SectionBlock>

        <SectionBlock title="Completing an audit via WhatsApp">
          <div className="space-y-3">
            <Step n={1}>Send the word <strong>audit</strong> to your CareStream WhatsApp number.</Step>
            <Step n={2}>CareStream lists the available audit templates. Reply with the number of the template you want to complete.</Step>
            <Step n={3}>Reply <em>yes</em> to confirm you want to start that audit, or <em>no</em> to cancel. For the <strong>Fire Marshall Checklist</strong>, you will also be asked to select <em>day</em> or <em>night</em> shift. For the <strong>Resident Bedrooms</strong> audit, you will be asked to enter the room number.</Step>
            <Step n={4}>The system walks you through each question. For yes/no questions reply <em>yes</em>, <em>no</em>, or <em>n/a</em>. For findings questions type your observation, then reply with any planned actions (or <em>skip</em> if none).</Step>
            <Step n={5}>To pause at any time, send <strong>stop</strong> or <strong>pause</strong>. Your progress is saved and you can ask other questions as normal. To resume, send "audit" again and select the same template — the system continues from where you left off.</Step>
          </div>
          <Tip>You can start an audit on WhatsApp and finish it on the web (or vice versa) — answers are stored in real time regardless of channel.</Tip>
        </SectionBlock>

        <SectionBlock title="AI recommendations">
          <p className="text-sm text-neutral-mid">
            On completion, CareStream analyses every answer against CQC Key Lines of Enquiry and generates a structured report covering: immediate actions required, priority improvements, CQC compliance notes across the five KLOEs (Safe, Effective, Caring, Responsive, Well-Led), commendations, and recommended focus areas for the next cycle.
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
    id:      'settings',
    icon:    Settings,
    title:   'Settings',
    summary: 'Configure email, WhatsApp, access controls, and AI behaviour',
    content: (
      <div className="space-y-5">
        <SectionBlock title="Settings sections">
          <div className="rounded-lg border border-gray-200 divide-y divide-gray-100 text-sm">
            {[
              ['Dedicated email address', 'Your inbound email address for staff queries. Copy this to share with your team.'],
              ['WhatsApp',                'Enable WhatsApp queries and view your CareStream WhatsApp number.'],
              ['Portal access',           'Restrict who can access the staff Chat Hub. Options: open, PIN protected, or staff-only.'],
              ['Email allowlist',         'Limit which email addresses can receive AI replies. Leave empty to allow all registered staff.'],
              ['AI behaviour',            'Adjust the tone and verbosity of AI responses across all channels.'],
              ['Notifications',           'Configure which events trigger email notifications to managers.'],
              ['Data retention',          'Set how long query history and session data is kept.'],
              ['Branding',                'Add your care setting name and logo to the Chat Hub and email replies.'],
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
]

// ─── Accordion item ───────────────────────────────────────────────────────────

function GuideAccordion({ section }: { section: GuideSection }) {
  const [open, setOpen] = useState(section.defaultOpen ?? false)
  const Icon = section.icon

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-neutral-light/50"
        aria-expanded={open}
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal-light text-teal">
          <Icon size={17} />
        </span>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-neutral-dark text-sm">{section.title}</p>
          <p className="text-xs text-neutral-mid truncate">{section.summary}</p>
        </div>
        {open
          ? <ChevronUp size={16} className="shrink-0 text-neutral-mid" />
          : <ChevronDown size={16} className="shrink-0 text-neutral-mid" />
        }
      </button>

      {open && (
        <div className="border-t border-gray-100 px-5 py-5">
          {section.content}
        </div>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function HelpPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-neutral-dark">Help &amp; Guides</h1>
        <p className="mt-1 text-sm text-neutral-mid">
          Step-by-step guides for every part of CareStream. Click a section to expand it.
        </p>
      </div>

      <div className="space-y-3">
        {GUIDE_SECTIONS.map(section => (
          <GuideAccordion key={section.id} section={section} />
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
