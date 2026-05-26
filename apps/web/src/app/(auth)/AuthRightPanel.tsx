'use client'

import { usePathname } from 'next/navigation'
import { CheckCircle2, Mail, Mic, MessageSquare } from 'lucide-react'

const CHANNELS = [
  { label: 'Chat',      icon: <MessageSquare size={13} />, bg: 'bg-white/15' },
  { label: 'Email',     icon: <Mail size={13} />,          bg: 'bg-white/15' },
  {
    label: 'WhatsApp',
    bg: 'bg-white/15',
    icon: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
      </svg>
    ),
  },
  { label: 'Voice', icon: <Mic size={13} />, bg: 'bg-white/15' },
]

const COVERAGES = [
  { text: 'Staff Training — policy answers in any language, instantly' },
  { text: 'HR Policies — staff handbook access for every team member' },
  { text: 'Care Audits — guided digital audits with AI recommendations' },
  { text: 'CQC Compliance — readiness tracking and evidence management' },
  { text: 'CQC Staff Questions — KLOE preparation for your whole team' },
  { text: 'Business Continuity — plans accessible to every staff member' },
  { text: 'CQC Report Chat — chat directly with your inspection reports' },
  { text: 'Care Policies — digital policy management and distribution' },
]

const TESTIMONIAL = {
  quote:  'Staff now get instant, accurate answers instead of calling the manager at midnight. It has transformed how our team works.',
  author: 'Registered Manager, Nursing Home, Surrey',
}

// Login page — Southeast Asian lady carer reading tablet, residents in background
const IMAGE_LOGIN = '/auth-carer-female.png'

// Register page — South Asian male carer reading phone, residents in background
const IMAGE_REGISTER = '/auth-carer-male.png'

export function AuthRightPanel() {
  const pathname = usePathname()
  const imageSrc = pathname === '/register' ? IMAGE_REGISTER : IMAGE_LOGIN

  return (
    <div className="relative hidden flex-col overflow-hidden bg-teal lg:flex lg:w-[54%]">

      {/* Background photo */}
      <img
        src={imageSrc}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 h-full w-full object-cover object-center"
      />

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-teal/70 via-teal/80 to-teal/95" />

      {/* Content */}
      <div className="relative z-10 flex h-full flex-col justify-between px-12 py-12">

        {/* Top section */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-white/50">
            Trusted by care homes across the UK
          </p>

          <h2 className="mt-5 text-4xl font-extrabold leading-tight tracking-tight text-white">
            Policy compliance,<br />answered instantly.
          </h2>

          <p className="mt-3 text-base leading-relaxed text-white/75">
            Your care team gets instant answers from your own policies and key regulatory frameworks, via any channel.
          </p>

          {/* Channel icons */}
          <div className="mt-6 flex flex-wrap gap-2">
            {CHANNELS.map(({ label, icon, bg }) => (
              <span
                key={label}
                className={`inline-flex items-center gap-1.5 rounded-full ${bg} border border-white/20 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-sm`}
              >
                {icon}
                {label}
              </span>
            ))}
          </div>

          {/* Coverage list */}
          <div className="mt-8">
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-white/50">
              Everything included in your account
            </p>
            <ul className="space-y-2.5">
              {COVERAGES.map(({ text }) => (
                <li key={text} className="flex items-start gap-2.5">
                  <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-amber-brand" />
                  <span className="text-sm leading-snug text-white/85">{text}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Testimonial */}
        <div className="rounded-2xl border border-white/15 bg-white/10 px-6 py-5 backdrop-blur-sm">
          <p className="text-sm italic leading-relaxed text-white/90">
            &ldquo;{TESTIMONIAL.quote}&rdquo;
          </p>
          <p className="mt-2.5 text-xs font-semibold text-white/55">{TESTIMONIAL.author}</p>
        </div>

      </div>
    </div>
  )
}
