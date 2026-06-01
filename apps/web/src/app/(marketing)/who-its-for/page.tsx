import React from 'react'
import Link from 'next/link'
import {
  Check, Home, Heart, Car, Users, Building2, Sunrise, Brain,
  Star, RefreshCw, Moon, ClipboardList, Camera,
} from 'lucide-react'
import { PageCta, SectionLabel } from '@/components/marketing/ui'

export const metadata = {
  title: "Who It's For",
  description: 'CareStreamAI is built for every care setting — residential, nursing, domiciliary, supported living, hospice, and more. See how it fits your specific service.',
  openGraph: {
    title: "Who CareStreamAI Is For",
    description: 'Built for residential, nursing, domiciliary, supported living, hospice, and every regulated UK care setting.',
    url: 'https://carestreamai.co.uk/who-its-for',
  },
}

// ─── Image component ──────────────────────────────────────────────────────────
// Images live in /public/images/who-its-for/{slug}.png (or .jpg).
// Slugs without a real image fall back to a styled placeholder.

const REAL_IMAGES: Record<string, string> = {
  'residential-care-homes': '/images/who-its-for/residential-care-homes.jpg',
  'nursing-homes':          '/images/who-its-for/nursing-homes.jpg',
  'home-care':              '/images/who-its-for/home-care.jpg',
  'extra-care':             '/images/who-its-for/extra-care.jpg',
  'hospices':               '/images/who-its-for/hospices.jpg',
  'day-services':           '/images/who-its-for/day-services.jpg',
  'mental-health':          '/images/who-its-for/mental-health.jpg',
  'learning-disability':    '/images/who-its-for/learning-disability.jpg',
  'reablement':             '/images/who-its-for/reablement.jpg',
  'community-care':         '/images/who-its-for/community-care.jpg',
  'supported-living':       '/images/who-its-for/supported-living.jpg',
}

function SettingImage({ slug, alt }: { slug: string; alt: string }) {
  const src = REAL_IMAGES[slug]

  if (src) {
    return (
      <div className="aspect-[4/3] w-full overflow-hidden rounded-2xl shadow-elevated">
        <img
          src={src}
          alt={alt}
          className="h-full w-full object-cover"
        />
      </div>
    )
  }

  return (
    <div className="aspect-[4/3] w-full overflow-hidden rounded-2xl border border-teal/15 bg-gradient-to-br from-teal-light via-white to-teal/5 shadow-elevated flex flex-col items-center justify-center gap-3">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-dashed border-teal/25">
        <Camera size={22} className="text-teal/35" />
      </div>
      <p className="text-xs font-medium text-neutral-mid/70">{alt}</p>
      <p className="font-mono text-[10px] text-neutral-mid/40">images/who-its-for/{slug}.png</p>
    </div>
  )
}

// ─── How it works card ────────────────────────────────────────────────────────

interface HowItWorksData {
  channel:      string
  question:     string
  sources:      Array<{ type: 'policy' | 'regulation'; label: string }>
  answerPoints: string[]
}

function HowItWorksCard({ data }: { data: HowItWorksData }) {
  return (
    <div>
      <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-teal">How it works, example</p>
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-elevated">
        <div className="border-b border-gray-100 bg-gray-50 px-6 py-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-neutral-mid">
            Staff asks via {data.channel}
          </p>
        </div>
        <div className="divide-y divide-gray-100">
          {/* Question */}
          <div className="px-6 py-5">
            <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-neutral-mid">Question</p>
            <p className="text-base font-medium text-neutral-dark">&ldquo;{data.question}&rdquo;</p>
          </div>
          {/* Sources */}
          <div className="px-6 py-5">
            <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-neutral-mid">Drawn from</p>
            <div className="space-y-2">
              {data.sources.map(s => (
                <div
                  key={s.label}
                  className={`flex items-center gap-2.5 rounded-lg px-3 py-2 ${
                    s.type === 'policy' ? 'bg-teal-light' : 'bg-amber-50'
                  }`}
                >
                  <div className={`h-2 w-2 shrink-0 rounded-full ${s.type === 'policy' ? 'bg-teal' : 'bg-amber-brand'}`} />
                  <span className={`text-xs font-semibold ${s.type === 'policy' ? 'text-teal' : 'text-amber-brand'}`}>
                    {s.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
          {/* Answer points */}
          <div className="px-6 py-5">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-neutral-mid">Answer includes</p>
            <ul className="space-y-1.5 text-sm leading-relaxed text-neutral-mid">
              {data.answerPoints.map(p => (
                <li key={p} className="flex items-start gap-2">
                  <Check size={13} className="mt-0.5 shrink-0 text-teal" />
                  {p}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Policy topics + regulatory standards ────────────────────────────────────

function PolicyTopics({ topics }: { topics: string[] }) {
  return (
    <div className="mt-8">
      <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-neutral-mid">Common policy queries</p>
      <div className="flex flex-wrap gap-2">
        {topics.map(t => (
          <span key={t} className="rounded-full bg-teal-light px-3 py-1.5 text-xs font-semibold text-teal">{t}</span>
        ))}
      </div>
    </div>
  )
}

function RegulatoryStandards({ standards }: { standards: Array<{ label: string; note: string }> }) {
  return (
    <div className="mt-6">
      <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-neutral-mid">Key regulatory standards</p>
      <div className="space-y-2">
        {standards.map(s => (
          <div key={s.label} className="rounded-lg border border-amber-100 bg-amber-50 px-4 py-3">
            <p className="mb-0.5 text-xs font-semibold text-amber-brand">{s.label}</p>
            <p className="text-xs leading-relaxed text-neutral-mid">{s.note}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Care settings ────────────────────────────────────────────────────────────

const SETTINGS: Array<{
  Icon:                React.ElementType
  slug:                string
  name:                string
  headline:            string
  desc:                string
  points:              string[]
  scenario:            string | null
  policyTopics:        string[]
  regulatoryStandards: Array<{ label: string; note: string }>
  howItWorks?: HowItWorksData
}> = [
  {
    Icon:     Home,
    slug:     'residential-care-homes',
    name:     'Residential Care Homes',
    headline: 'Policy support for every shift, not just office hours.',
    desc:     'Residential care homes rely on confident, consistent practice around the clock. CareStreamAI gives night staff, international carers, and new starters the same immediate access to your approved policies as your most experienced team member.',
    points: [
      'Night staff access the correct care and medication procedures instantly, without calling the manager out of hours.',
      'International and multilingual carers ask questions in their own language and receive answers drawn directly from your policy library.',
      'CQC inspection evidence is built automatically from every query, replacing the manual process of assembling compliance records under pressure.',
      'Policy gap detection highlights what your library is missing before an inspector does.',
    ],
    scenario: null,
    policyTopics: ['Falls Management', 'Medication Administration', 'Infection Control', 'Safeguarding Adults', 'End of Life Care', 'Moving and Handling'],
    regulatoryStandards: [
      { label: 'CQC Regulation 12, Safe Care and Treatment', note: 'Covers medication management, falls prevention, and infection control obligations across all shifts.' },
      { label: 'CQC Regulation 13, Safeguarding', note: 'Requires robust safeguarding procedures that every staff member can access and act on immediately.' },
      { label: 'CQC Regulation 17, Good Governance', note: 'Mandates accurate, complete records and documented evidence of policy engagement.' },
    ],
    howItWorks: {
      channel:  'WhatsApp',
      question: 'A resident has just had a fall. It is 3am. What observations do I need to carry out and how often?',
      sources: [
        { type: 'policy',     label: 'Your Falls and Post-Fall Management Policy' },
        { type: 'regulation', label: 'CQC Regulation 12, Safe Care and Treatment' },
        { type: 'regulation', label: 'NICE CG161, Falls in Older People'          },
      ],
      answerPoints: [
        'Your home\'s post-fall observation checklist and exact timing intervals',
        'When to escalate to the on-call GP or out-of-hours service',
        'Mandatory incident form requirements before end of shift',
        'How your policy aligns with CQC Reg 12 and NICE guidance',
      ],
    },
  },
  {
    Icon:     Heart,
    slug:     'nursing-homes',
    name:     'Nursing Homes',
    headline: 'Clinical procedures at the point of care, not at the end of a corridor.',
    desc:     'Nursing homes carry a higher level of clinical complexity than any other registered care setting. CareStreamAI ensures your clinical and care staff find the right procedure exactly when they need it, regardless of the hour or their first language.',
    points: [
      'Clinical staff access infection control, wound care, medication management, and end of life procedures in seconds.',
      'Voice notes mean staff can ask a procedure question hands-free in a clinical situation, without leaving a resident.',
      'Every query is logged with the staff member, time, and policy referenced, providing automatic CQC evidence of staff procedure engagement.',
      'Policy gap detection identifies missing clinical protocols before a CQC inspection or clinical audit.',
    ],
    scenario: null,
    policyTopics: ['Catheter Care', 'Wound Management', 'Infection Control', 'Medication Administration', 'Pressure Area Care', 'End of Life Care'],
    regulatoryStandards: [
      { label: 'CQC Regulation 12, Safe Care and Treatment', note: 'Clinical procedures must be accessible and applied consistently across day and night shifts.' },
      { label: 'NICE NG113, Urinary Tract Infection in Adults', note: 'Provides clinical guidance on catheter care and infection prevention in nursing settings.' },
      { label: 'CQC Regulation 11, Need for Consent', note: 'Informed consent must be sought and documented before every clinical intervention.' },
    ],
    howItWorks: {
      channel:  'Voice',
      question: 'A resident has a urinary catheter. They have not passed urine in six hours and the catheter bag is empty. What does the catheter care policy say I should do?',
      sources: [
        { type: 'policy',     label: 'Catheter Care and Management Policy'       },
        { type: 'regulation', label: 'CQC Regulation 12, Safe Care and Treatment' },
        { type: 'regulation', label: 'NICE NG113, Urinary Tract Infection in Adults' },
      ],
      answerPoints: [
        'Step-by-step catheter patency check, including kinking, positioning, and bladder palpation',
        'Your policy threshold for contacting the on-call GP or district nurse',
        'Signs of urinary tract infection or catheter-associated complications requiring urgent escalation',
        'Mandatory fluid balance and catheter record entries before handing over to the next shift',
      ],
    },
  },
  {
    Icon:     Car,
    slug:     'home-care',
    name:     'Home Care and Domiciliary Care',
    headline: 'Policy access for a workforce that is never in one place.',
    desc:     'Domiciliary care staff work alone, often in challenging environments, without a colleague or manager nearby. CareStreamAI gives your dispersed workforce instant access to your procedures via WhatsApp or voice, wherever they are.',
    points: [
      'Field-based carers get immediate policy answers on WhatsApp or by voice note while travelling between visits.',
      'Lone workers check safeguarding, consent, and incident procedures without travelling to the office or waiting for a callback.',
      'Managers see query patterns across the entire dispersed workforce from one dashboard, revealing where guidance or retraining is needed.',
      'All queries are logged by staff member and location, supporting lone working audits and CQC inspection evidence.',
    ],
    scenario: null,
    policyTopics: ['Lone Working', 'Safeguarding Adults', 'Medication Administration', 'Missed Visit Procedures', 'Manual Handling', 'Infection Control'],
    regulatoryStandards: [
      { label: 'CQC Regulation 13, Safeguarding Service Users', note: 'Safeguarding procedures must be accessible to lone workers in any location at any time.' },
      { label: 'CQC Regulation 12, Safe Care and Treatment', note: 'Safe medication and infection control procedures apply in every home environment visited.' },
      { label: 'CQC Regulation 17, Good Governance', note: 'Every visit, missed contact, and incident must be recorded accurately in real time.' },
    ],
    howItWorks: {
      channel:  'WhatsApp',
      question: 'I have arrived at a service user\'s home and they are not answering the door. The lights are on and I can see them through the window but they are not responding. What is the procedure?',
      sources: [
        { type: 'policy',     label: 'Lone Working and Missed Visit Policy'      },
        { type: 'policy',     label: 'Safeguarding Adults Policy'                },
        { type: 'regulation', label: 'CQC Regulation 13, Safeguarding Service Users' },
      ],
      answerPoints: [
        'Exact steps to take before calling emergency services, including contacting the office and next of kin',
        'When your policy requires you to call 999 and request a welfare check without delay',
        'What to record on the missed visit log and how to notify your manager immediately',
        'How this interaction is captured as a safeguarding concern and the referral threshold',
      ],
    },
  },
  {
    Icon:     Users,
    slug:     'supported-living',
    name:     'Supported Living',
    headline: 'Consistent, person-centred practice across every house.',
    desc:     'Supported living services operate across multiple dispersed properties with varying support needs. CareStreamAI gives support workers in every house access to the same approved procedures and individual care guidance, at any time.',
    points: [
      'Support workers in dispersed houses access behaviour support plans, safeguarding procedures, and risk management guidance in seconds.',
      'Staff in every property work from the same centrally approved policy library, eliminating inconsistent practice between houses.',
      'All query and access data is visible to managers across all sites from a single dashboard.',
      'Multilingual staff access procedures in their own language from day one, supporting rapid onboarding in high-turnover services.',
    ],
    scenario: null,
    policyTopics: ['Positive Behaviour Support', 'Safeguarding Adults', 'Mental Capacity', 'Risk Management', 'Restrictive Practice', 'Community Access Safety'],
    regulatoryStandards: [
      { label: 'CQC Regulation 11, Need for Consent', note: 'All support must be delivered with valid consent or a documented best interests decision.' },
      { label: 'CQC Regulation 13, Safeguarding', note: 'Safeguarding procedures must be embedded and accessible across every dispersed property.' },
      { label: 'NICE NG11, Challenging Behaviour and Learning Disabilities', note: 'PBS approaches underpin safe, person-centred support and guide all restrictive practice decisions.' },
    ],
    howItWorks: {
      channel:  'Chat',
      question: 'A resident is becoming very distressed and is showing early warning signs listed in their behaviour support plan. Their key worker is not on shift. What should I do right now?',
      sources: [
        { type: 'policy',     label: 'Positive Behaviour Support Policy'           },
        { type: 'policy',     label: 'Individual Behaviour Support Plan'           },
        { type: 'regulation', label: 'NICE NG11, Challenging Behaviour and Learning Disabilities' },
      ],
      answerPoints: [
        'The proactive and reactive strategies from the resident\'s individual PBS plan, in the correct sequence',
        'Environmental adjustments your policy requires before any other intervention',
        'Your escalation threshold and who to contact if early strategies do not reduce distress',
        'Recording requirements, including the time, triggers, and strategies used, before end of shift',
      ],
    },
  },
  {
    Icon:     Building2,
    slug:     'extra-care',
    name:     'Extra Care and Assisted Living',
    headline: 'Balancing housing and care regulation in one policy library.',
    desc:     'Extra care and assisted living settings navigate both housing and care regulation. CareStreamAI holds your full policy library, giving staff covering multiple flats or wings the right answer from the right document every time.',
    points: [
      'Staff covering multiple properties access the correct care and tenancy procedures quickly, without searching through separate document stores.',
      'Managers maintain housing and care policy libraries in one place, with version control ensuring staff always access current procedures.',
      'CQC and housing regulation compliance evidence is captured automatically across all interactions.',
      'International staff from diverse backgrounds engage with your full policy library in their own language from their first shift.',
    ],
    scenario: null,
    policyTopics: ['Mental Capacity and Consent', 'Medication Administration', 'Falls Prevention', 'Tenancy and Care Procedures', 'Safeguarding Adults', 'Moving and Handling'],
    regulatoryStandards: [
      { label: 'Mental Capacity Act 2005, Sections 2 and 3', note: 'Staff must apply the two-stage capacity test before any decision is made on a resident\'s behalf.' },
      { label: 'CQC Regulation 12, Safe Care and Treatment', note: 'Safe care obligations cover both the care and housing elements of the service.' },
      { label: 'CQC Regulation 10, Dignity and Respect', note: 'Residents\' rights as tenants and care recipients must be upheld in every interaction.' },
    ],
    howItWorks: {
      channel:  'Email',
      question: 'A resident is refusing their medication this morning and saying they do not want it today. How do I carry out a capacity assessment and what do I need to record?',
      sources: [
        { type: 'policy',     label: 'Mental Capacity and Consent Policy'         },
        { type: 'policy',     label: 'Medication Administration Policy'           },
        { type: 'regulation', label: 'Mental Capacity Act 2005, Sections 2 and 3' },
      ],
      answerPoints: [
        'The two-stage Mental Capacity Act test your policy requires, applied to this specific decision',
        'How to record the capacity assessment in the medication administration record',
        'Who to notify if you assess the resident as lacking capacity for this decision',
        'Your policy\'s best interests process, including family involvement and GP notification',
      ],
    },
  },
  {
    Icon:     Moon,
    slug:     'hospices',
    name:     'Hospices and Palliative Care',
    headline: 'The right procedure when it matters most.',
    desc:     'In hospice and palliative care, staff face some of the most emotionally and clinically complex situations in the sector. CareStreamAI ensures your full clinical and care procedure library is available to every staff member, at any hour.',
    points: [
      'Clinical and care staff access complex symptom management, pain management, and end of life care protocols at any time, day or night.',
      'Bereavement support, family communication, and spiritual care procedures are always available without delay.',
      'CQC inspection evidence demonstrating dignity and person-centred care practice is built from every query and policy interaction.',
      'Staff working across inpatient and community palliative care access the same approved procedure library from any channel.',
    ],
    scenario: null,
    policyTopics: ['Syringe Driver Management', 'Breakthrough Pain Protocol', 'DNACPR Procedures', 'Bereavement Support', 'Controlled Drug Administration', 'End of Life Care Planning'],
    regulatoryStandards: [
      { label: 'CQC Regulation 12, Safe Care and Treatment', note: 'Clinical symptom management protocols must be accessible and followed correctly at all hours.' },
      { label: 'NICE NG31, Care of Dying Adults in the Last Days of Life', note: 'Provides nationally recognised guidance on comfort, dignity, and communication at end of life.' },
      { label: 'CQC Regulation 11, Need for Consent', note: 'Advance decisions and DNACPR documentation must be accessible and acted on correctly.' },
    ],
    howItWorks: {
      channel:  'Voice',
      question: 'A patient on a syringe driver appears to be in breakthrough pain two hours after the driver was set up. What does the palliative pain management policy say I should check and when do I escalate?',
      sources: [
        { type: 'policy',     label: 'Syringe Driver and Subcutaneous Infusion Policy' },
        { type: 'policy',     label: 'Palliative Pain Management Protocol'             },
        { type: 'regulation', label: 'CQC Regulation 12, Safe Care and Treatment'    },
      ],
      answerPoints: [
        'Syringe driver site assessment checklist and what to look for at the infusion site',
        'Authorised breakthrough medication doses and the conditions under which you can administer them',
        'When your policy requires you to call the on-call palliative care team or prescriber',
        'Mandatory documentation in the controlled drug register and the patient\'s care record',
      ],
    },
  },
  {
    Icon:     Sunrise,
    slug:     'day-services',
    name:     'Day Services and Respite Care',
    headline: 'Policy access that moves with your team throughout the day.',
    desc:     'Day services and respite care staff often move between multiple service users and environments without a fixed base. CareStreamAI gives your team instant procedure access wherever the working day takes them.',
    points: [
      'Staff moving between service users throughout the day access procedures via WhatsApp or voice note hands-free, without pausing the activity.',
      'Safeguarding, incident, and emergency procedures are always available, including off-site and community visits.',
      'Respite coordinators can log and review every procedure query from their team from a single dashboard.',
      'Quick query logging reduces the administrative burden on staff during a busy, activity-led day.',
    ],
    scenario: null,
    policyTopics: ['Epilepsy and Seizure Management', 'First Aid and Emergencies', 'Safeguarding Adults', 'Community Access Risk', 'Medication Administration', 'Incident Reporting'],
    regulatoryStandards: [
      { label: 'CQC Regulation 12, Safe Care and Treatment', note: 'Emergency procedures and medical management plans must be accessible during all activities and outings.' },
      { label: 'CQC Regulation 13, Safeguarding', note: 'Safeguarding procedures apply in day service environments and during all community visits.' },
      { label: 'CQC Regulation 17, Good Governance', note: 'All incidents, near misses, and emergency responses must be recorded on the day they occur.' },
    ],
    howItWorks: {
      channel:  'Chat',
      question: 'A service user has had a tonic-clonic seizure during an activity session. The seizure has stopped after two minutes. What does the epilepsy management policy say I need to do right now?',
      sources: [
        { type: 'policy',     label: 'Epilepsy and Seizure Management Policy'         },
        { type: 'policy',     label: 'First Aid and Emergency Procedures Policy'      },
        { type: 'regulation', label: 'CQC Regulation 12, Safe Care and Treatment'   },
      ],
      answerPoints: [
        'Immediate post-seizure observations and the recovery position guidance from your policy',
        'Your policy\'s threshold for calling 999, including seizure duration and the five-minute rule',
        'Who to notify, including parents, carers, and the registered manager, and within what timeframe',
        'Incident form requirements, including seizure log entries, before the end of the session',
      ],
    },
  },
  {
    Icon:     Brain,
    slug:     'mental-health',
    name:     'Mental Health Residential Services',
    headline: 'Crisis procedures, de-escalation, and risk guidance when your team needs them.',
    desc:     'Mental health residential services require staff to access complex risk, medication, and de-escalation procedures under pressure. CareStreamAI gives your whole team immediate procedure access around the clock.',
    points: [
      'Risk assessment, de-escalation, and medication procedures are available instantly, including during active crisis situations.',
      'Voice note access means staff can ask a procedure question without breaking focus or leaving a service user unattended.',
      'Every procedure query is logged with staff member, time, and context, supporting post-incident reviews and CQC evidence.',
      'Policy updates reach the whole team immediately, with access tracked so managers know when a change has landed.',
    ],
    scenario: null,
    policyTopics: ['De-escalation and Restraint', 'Self-Harm Risk Management', 'Observation Levels', 'Medication Management', 'Mental Health Act Procedures', 'Post-Incident Debrief'],
    regulatoryStandards: [
      { label: 'CQC Regulation 17, Good Governance', note: 'Post-incident reviews and accurate risk documentation are core compliance requirements.' },
      { label: 'Mental Health Act 1983, Sections 2 and 3', note: 'Detention, consent to treatment, and leave procedures must be followed precisely and documented.' },
      { label: 'CQC Regulation 12, Safe Care and Treatment', note: 'Risk management and medication procedures must be accessible and consistently applied around the clock.' },
    ],
    howItWorks: {
      channel:  'Voice',
      question: 'A resident is becoming increasingly agitated, is refusing to engage, and has a documented history of self-harm. What does the de-escalation policy say I should do and at what point do I call for support?',
      sources: [
        { type: 'policy',     label: 'De-escalation and Positive Engagement Policy' },
        { type: 'policy',     label: 'Self-Harm Risk Management Policy'             },
        { type: 'regulation', label: 'CQC Regulation 17, Good Governance'         },
      ],
      answerPoints: [
        'The staged de-escalation approach from your policy, including verbal and environmental strategies in sequence',
        'Your threshold for a two-person response and the circumstances that require an immediate manager call',
        'Observations your policy requires following a self-harm risk episode, and who records them',
        'Post-incident debrief requirements and what must be entered in the risk management record',
      ],
    },
  },
  {
    Icon:     Star,
    slug:     'learning-disability',
    name:     'Learning Disability Services',
    headline: 'Plain language procedure access for every member of your team.',
    desc:     'Learning disability and autism services rely on highly consistent, person-centred practice across residential, community, and day settings. CareStreamAI makes your full procedure library accessible to every staff member, in clear language, at any time.',
    points: [
      'Support workers access positive behaviour support plans, safeguarding procedures, and individual care guidance in seconds.',
      'Multilingual staff access procedures in their own language, supporting a diverse workforce with varying English confidence.',
      'Managers track policy engagement across all registered services from a single dashboard, identifying where support or retraining is needed.',
      'Consistent procedure access across all service types reduces variation in support quality between different settings and teams.',
    ],
    scenario: null,
    policyTopics: ['Positive Behaviour Support', 'Restrictive Practice', 'Safeguarding Adults', 'Mental Capacity and Best Interests', 'Communication Support Plans', 'Community Safety'],
    regulatoryStandards: [
      { label: 'NICE NG11, Challenging Behaviour and Learning Disabilities', note: 'PBS must be the primary framework for any behaviour that challenges, before restriction is considered.' },
      { label: 'CQC Regulation 13, Safeguarding', note: 'Safeguarding procedures must be accessible to all staff across residential, community, and day settings.' },
      { label: 'Mental Capacity Act 2005', note: 'Every decision made on a person\'s behalf must follow a documented best interests process.' },
    ],
    howItWorks: {
      channel:  'Email',
      question: 'A service user has started repeatedly hitting themselves and it is escalating. What does the restrictive practice policy say about physical intervention and who has to authorise it?',
      sources: [
        { type: 'policy',     label: 'Restrictive Practice and Physical Intervention Policy' },
        { type: 'policy',     label: 'Positive Behaviour Support Policy'                    },
        { type: 'regulation', label: 'NICE NG11, Challenging Behaviour and Learning Disabilities' },
      ],
      answerPoints: [
        'The PBS-guided de-escalation steps your policy requires before any physical intervention is considered',
        'Which specific physical interventions are permitted under your policy and which are prohibited',
        'The authorisation requirement, including who must be notified and within what timeframe',
        'Post-incident recording obligations, including body map completion and the debrief process',
      ],
    },
  },
  {
    Icon:     RefreshCw,
    slug:     'reablement',
    name:     'Reablement and Intermediate Care',
    headline: 'Rapid onboarding and consistent practice during short, intensive care episodes.',
    desc:     'Reablement services are time-limited and intensely goal-focused, with staff often joining at short notice. CareStreamAI ensures your full procedure library is available to every team member from their very first shift.',
    points: [
      'New staff access your full procedure library from day one, without waiting for a formal induction session.',
      'Clinical reablement procedures are available to therapy and care staff in the field via WhatsApp or voice note.',
      'Every procedure query is logged throughout the reablement episode, providing automatic CQC evidence of consistent practice.',
      'Managers see which procedures are being queried most during the reablement period, informing team briefings and clinical supervision.',
    ],
    scenario: null,
    policyTopics: ['Falls Prevention and Management', 'Reablement Goal Setting', 'Moving and Handling', 'Infection Control', 'Medication Administration', 'Discharge Planning'],
    regulatoryStandards: [
      { label: 'CQC Regulation 12, Safe Care and Treatment', note: 'Falls management and manual handling procedures must be accessible to all reablement staff in the field.' },
      { label: 'CQC Regulation 17, Good Governance', note: 'Goal progress, incidents, and care decisions must be recorded throughout the reablement episode.' },
      { label: 'NICE NG27, Rehabilitation After Critical Illness', note: 'Rehabilitation goals must be person-centred, time-limited, and reviewed regularly with the clinical team.' },
    ],
    howItWorks: {
      channel:  'Chat',
      question: 'A service user attempted to stand from the chair without prompting and lost balance. They were not injured but are now unsettled. What is the falls protocol during a reablement episode and do I adjust today\'s goal?',
      sources: [
        { type: 'policy',     label: 'Falls Prevention and Management Policy'     },
        { type: 'policy',     label: 'Reablement Goal Management Protocol'        },
        { type: 'regulation', label: 'CQC Regulation 12, Safe Care and Treatment' },
      ],
      answerPoints: [
        'Post-incident checks your policy requires, including pain assessment and neurological observations',
        'Your protocol for pausing or modifying a reablement goal following a near-miss incident',
        'Who to notify, including the allocated occupational therapist or physiotherapist, and within what timeframe',
        'Incident recording requirements and what must be flagged in the next handover',
      ],
    },
  },
  {
    Icon:     ClipboardList,
    slug:     'community-care',
    name:     'Community Care and Outreach',
    headline: 'Procedure access for staff who are never at a desk.',
    desc:     'Community care and outreach workers operate entirely in the field, often without access to an office, a desktop, or a colleague nearby. CareStreamAI gives them full procedure access via the channels they already use.',
    points: [
      'Lone workers check safeguarding, consent, capacity, and incident procedures via WhatsApp or voice note in any community setting.',
      'Policy updates reach the entire community workforce instantly, with access tracked so managers know the change has arrived.',
      'All four channels (chat, email, WhatsApp, and voice) suit staff without regular access to a desk or an office computer.',
      'Every interaction is logged, supporting lone working safeguards and providing automatic evidence for CQC and commissioning audits.',
    ],
    scenario: null,
    policyTopics: ['Lone Working and Personal Safety', 'Safeguarding Adults', 'Financial Abuse and Exploitation', 'Mental Capacity and Consent', 'Medication Administration', 'Infection Control'],
    regulatoryStandards: [
      { label: 'CQC Regulation 13, Safeguarding Service Users', note: 'Staff must recognise, report, and document safeguarding concerns in any community setting.' },
      { label: 'Care Act 2014, Section 42', note: 'Safeguarding enquiries must be initiated when abuse or neglect is suspected, regardless of location.' },
      { label: 'CQC Regulation 12, Safe Care and Treatment', note: 'Lone workers must have access to safe care procedures during every community visit.' },
    ],
    howItWorks: {
      channel:  'WhatsApp',
      question: 'A service user has told me that their family member has been taking money from them without permission. What is the safeguarding procedure I need to follow right now, while I am still at the address?',
      sources: [
        { type: 'policy',     label: 'Safeguarding Adults Policy'                          },
        { type: 'policy',     label: 'Financial Abuse and Exploitation Procedure'          },
        { type: 'regulation', label: 'CQC Regulation 13, Safeguarding Service Users'     },
      ],
      answerPoints: [
        'Immediate steps your policy requires, including not investigating yourself or confronting the alleged perpetrator',
        'How to make a safeguarding referral to the local authority while still at the address',
        'Your policy\'s confidentiality and disclosure rules, including when you can share information without consent',
        'What to record today, including the exact words used by the service user, before leaving the visit',
      ],
    },
  },
]

// ─── Personas (by role) ───────────────────────────────────────────────────────

const PERSONAS = [
  {
    badge:    'Registered Manager',
    headline: 'Policy support for your team, even when you are not there.',
    benefits: [
      'Staff on night shifts get instant policy answers without calling you, reducing out-of-hours interruptions and giving your team confidence to act correctly.',
      'Your CQC Readiness Report is built automatically, showing inspectors exactly how your team engages with your policies.',
      'When a policy is updated, CareStreamAI tracks whether staff accessed the new version, so you know the change actually reached your team.',
      'Policy gap detection tells you what your library is missing before a CQC inspector asks.',
    ],
  },
  {
    badge:    'HR Director and People Lead',
    headline: 'Stop answering the same questions. Let your handbook answer them.',
    benefits: [
      'Annual leave, sickness procedures, disciplinary processes: staff get instant answers from your actual handbook, 24 hours a day, without HR intervention.',
      'New starters, including international recruits, can ask questions about their employment terms in their own language from day one.',
      'Handbook access is fully logged, so you can see which sections staff query most and identify where onboarding communications need improving.',
      'Reduces repetitive HR query load, freeing your team for work that requires human judgement.',
    ],
  },
  {
    badge:    'Operations Director',
    headline: 'One policy library. Consistent answers. Across every service.',
    benefits: [
      'All services draw from the same centrally managed, approved policy library, eliminating version drift and inconsistent practice.',
      'Per-service analytics show which locations are engaged and where to focus support.',
      'When a policy is updated centrally, you can see which services accessed the new version and confirm the change reached the whole team.',
      'Group CQC Readiness Reports cover all registered services in a single export.',
    ],
  },
  {
    badge:    'Finance Director and Owner',
    headline: 'A return on investment you can calculate in under five minutes.',
    benefits: [
      'If CareStreamAI saves each manager one hour per week of policy query handling, it pays for itself in the first month.',
      'Reduces procedural risk by ensuring staff act on correct, approved guidance, with a full audit trail to demonstrate due diligence.',
      'Reduces CQC preparation time: inspection evidence is built automatically, not assembled manually under pressure.',
      'Improves staff confidence and reduces early turnover, particularly for international recruits who gain full policy access in their own language from day one.',
    ],
  },
]

// ─── Care Settings Mockup ─────────────────────────────────────────────────────

function CareSettingsMockup() {
  return (
    <div className="w-full max-w-[380px] overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-white/20">
      <div className="bg-teal px-5 py-4">
        <p className="text-[10px] font-bold uppercase tracking-widest text-white/60">Who uses CareStreamAI</p>
        <p className="text-sm font-bold text-white">Across 11 care setting types</p>
      </div>
      <div className="grid grid-cols-3 gap-px bg-gray-100">
        {[
          { Icon: Home,    name: 'Residential Care',   active: true },
          { Icon: Heart,   name: 'Nursing Homes',      active: true },
          { Icon: Car,     name: 'Home Care',          active: true },
          { Icon: Brain,   name: 'Mental Health',      active: false },
          { Icon: Star,    name: 'Learning Disability', active: false },
          { Icon: Sunrise, name: 'Day Services',       active: false },
        ].map(({ Icon, name, active }) => (
          <div key={name} className={`flex flex-col items-center gap-1.5 p-4 text-center ${active ? 'bg-teal/5' : 'bg-white'}`}>
            <div className={`flex h-8 w-8 items-center justify-center rounded-xl ${active ? 'bg-teal' : 'bg-gray-100'}`}>
              <Icon size={15} className={active ? 'text-white' : 'text-neutral-mid'} />
            </div>
            <p className={`text-[10px] font-semibold leading-tight ${active ? 'text-teal' : 'text-neutral-mid'}`}>{name}</p>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-3 divide-x divide-gray-100 border-t border-gray-100">
        {[
          { value: '11',  label: 'Setting types' },
          { value: '4',   label: 'Role types' },
          { value: '50+', label: 'Languages' },
        ].map(({ value, label }) => (
          <div key={label} className="py-3 text-center">
            <p className="text-sm font-extrabold text-teal">{value}</p>
            <p className="text-[9px] text-neutral-mid">{label}</p>
          </div>
        ))}
      </div>
      <div className="border-t border-gray-100 px-5 py-3">
        <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-neutral-mid">Built for every role</p>
        <div className="flex flex-wrap gap-1.5">
          {['Registered Manager', 'HR Director', 'Operations Director', 'Finance Director'].map(role => (
            <span key={role} className="rounded-full bg-teal-light px-2.5 py-1 text-[10px] font-semibold text-teal">{role}</span>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function WhoItsForPage() {
  return (
    <>
      {/* ── Split hero ───────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-hero-gradient">
        <div className="absolute inset-0 dot-mesh" />
        <div className="absolute -right-32 -top-32 h-[420px] w-[420px] rounded-full bg-white/5" />
        <div className="absolute -bottom-24 -left-16 h-[280px] w-[280px] rounded-full bg-teal/30" />
        <div
          className="absolute bottom-0 left-0 right-0 h-16"
          style={{ background: 'linear-gradient(to bottom right, transparent 49.5%, #fff 50%)' }}
        />
        <div className="relative mx-auto max-w-content px-6 pb-20 pt-20 md:pt-24">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <SectionLabel light>Who It&apos;s For</SectionLabel>
              <h1 className="mb-5 max-w-xl text-4xl font-extrabold leading-tight text-white md:text-5xl">
                Built for every registered care provider.
              </h1>
              <p className="mb-8 max-w-xl text-lg leading-relaxed text-white/75">
                If your organisation has internal policies and a team that needs to follow them, CareStreamAI turns those policies into a 24-hour knowledge resource for every member of staff.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Link href="/register" className="btn-amber rounded-btn px-8 py-4 text-sm">
                  Start Free Trial
                </Link>
                <Link href="/demo" className="btn-ghost-white rounded-btn px-8 py-4 text-sm">
                  Book a Demo
                </Link>
              </div>
            </div>
            <div className="flex justify-center lg:justify-end">
              <CareSettingsMockup />
            </div>
          </div>
        </div>
      </section>

      {/* Care settings, alternating image and text */}
      {SETTINGS.map(({ Icon, slug, name, headline, desc, points, scenario, policyTopics, regulatoryStandards, howItWorks }, i) => (
        <section key={slug} className={`py-20 ${i % 2 === 0 ? 'bg-white' : 'bg-neutral-light'}`}>
          <div className="mx-auto max-w-content px-6">
            <div className={`grid items-start gap-12 lg:grid-cols-2 ${i % 2 !== 0 ? 'lg:[&>div:first-child]:order-last' : ''}`}>

              {/* Text */}
              <div>
                <div className="mb-5 inline-flex items-center gap-2.5 rounded-pill bg-teal-light px-4 py-2">
                  <Icon size={15} className="text-teal" />
                  <span className="text-sm font-bold text-teal">{name}</span>
                </div>
                <h2 className="mb-4 text-2xl font-extrabold leading-snug text-neutral-dark md:text-3xl">
                  {headline}
                </h2>
                <p className="mb-7 leading-relaxed text-neutral-mid">{desc}</p>
                <ul className="space-y-4">
                  {points.map(p => (
                    <li key={p} className="flex items-start gap-3.5">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal-light">
                        <Check size={11} className="text-teal" />
                      </span>
                      <p className="leading-relaxed text-neutral-mid">{p}</p>
                    </li>
                  ))}
                </ul>
                {scenario && (
                  <div className="mt-8 rounded-2xl border-l-4 border-teal bg-teal-light px-7 py-6">
                    <p className="mb-2 section-label text-teal">Real scenario</p>
                    <p className="italic leading-relaxed text-neutral-dark">{scenario}</p>
                  </div>
                )}
                <PolicyTopics topics={policyTopics} />
                <RegulatoryStandards standards={regulatoryStandards} />
              </div>

              {/* Image + optional how it works card */}
              <div className="flex flex-col gap-6">
                <SettingImage slug={slug} alt={name} />
                {howItWorks && <HowItWorksCard data={howItWorks} />}
              </div>

            </div>
          </div>
        </section>
      ))}

      {/* Disclaimer */}
      <section className="bg-white py-10 border-t border-gray-100">
        <div className="mx-auto max-w-content px-6">
          <div className="rounded-2xl border border-gray-200 bg-neutral-light px-8 py-6">
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-neutral-mid">Important notice</p>
            <p className="leading-relaxed text-neutral-mid text-sm">
              CareStreamAI does not provide professional, legal, clinical, or regulatory advice of any kind. The system retrieves and presents accurate information drawn directly from your organisation's own approved policies, procedures, and handbooks, and from publicly available external regulations and guidance. All responses reflect the content of those documents as uploaded and maintained by your organisation.
            </p>
            <p className="mt-3 leading-relaxed text-neutral-mid text-sm">
              Staff should always exercise their own professional judgement and, where required, seek guidance from a registered manager, clinician, or qualified professional. CareStreamAI is an information access tool. It does not replace supervision, professional registration, clinical decision-making, or the duty of care that rests with your organisation and its staff.
            </p>
          </div>
        </div>
      </section>

      {/* Cross-cutting benefits strip */}
      <section className="bg-neutral-dark py-16">
        <div className="mx-auto max-w-content px-6">
          <p className="mb-8 text-center text-sm font-semibold uppercase tracking-widest text-teal">
            Across every setting
          </p>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { heading: 'All four channels',   body: 'Chat, email, WhatsApp, and voice. Staff access policies whichever way suits their role and environment.' },
              { heading: '50 plus languages',   body: 'Every staff member gets the same quality of policy access regardless of their first language.' },
              { heading: 'CQC evidence built in', body: 'Every query is logged. Your CQC Readiness Report is generated automatically, not assembled under pressure.' },
              { heading: 'Always up to date',   body: 'Upload a new policy version and CareStreamAI answers from it immediately. Staff never read superseded guidance.' },
            ].map(({ heading, body }) => (
              <div key={heading} className="rounded-xl bg-white/5 p-5">
                <p className="mb-2 font-bold text-white">{heading}</p>
                <p className="text-sm leading-relaxed text-white/70">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Roles section */}
      <div>
        {PERSONAS.map(({ badge, headline, benefits }, i) => (
          <section key={badge} className={`py-24 ${i % 2 === 0 ? 'bg-neutral-light' : 'bg-white'}`}>
            <div className="mx-auto max-w-content px-6">
              <div className="grid gap-12 lg:grid-cols-[1fr_2fr] lg:items-start">
                <div className="lg:sticky lg:top-28">
                  <div className="mb-5 inline-flex items-center rounded-pill bg-teal px-5 py-2">
                    <span className="text-sm font-bold text-white">{badge}</span>
                  </div>
                  <h2 className="text-2xl font-extrabold leading-snug text-neutral-dark md:text-3xl">
                    {headline}
                  </h2>
                </div>
                <ul className="space-y-5">
                  {benefits.map(b => (
                    <li key={b} className="flex items-start gap-4">
                      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal-light">
                        <Check size={13} className="text-teal" />
                      </span>
                      <p className="leading-relaxed text-neutral-mid">{b}</p>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>
        ))}
      </div>

      <PageCta
        heading="Whatever your care setting, CareStreamAI works for you."
        primary={{ href: '/demo', label: 'Book a Free Demo' }}
        secondary={{ href: '/register', label: 'Start Free Trial' }}
      />
    </>
  )
}
