'use client'

import { usePathname } from 'next/navigation'
import { CheckCircle2, Mail, Mic, MessageSquare } from 'lucide-react'
import { SiteImage } from '@/components/site-image'

const CHANNELS = [
  { label: 'Chat',  icon: <MessageSquare size={13} />, bg: 'bg-white/15' },
  { label: 'Email', icon: <Mail size={13} />,          bg: 'bg-white/15' },
  { label: 'Voice', icon: <Mic size={13} />,           bg: 'bg-white/15' },
]

const COVERAGES = [
  { text: 'Staff Training — policy answers in any language, instantly' },
  { text: 'HR Policies — staff handbook access for every team member' },
  { text: 'Care Audits — guided digital audits with AI recommendations' },
  { text: 'CQC Compliance — readiness tracking and evidence management' },
  { text: 'CQC Staff Questions — inspection preparation for your whole team' },
  { text: 'Business Continuity — plans accessible to every staff member' },
  { text: 'CQC Report Chat — chat directly with your inspection reports' },
  { text: 'Care Policies — digital policy management and distribution' },
]

const TESTIMONIAL = {
  quote:  'Staff now get instant, accurate answers instead of calling the manager at midnight. It has transformed how our team works.',
  author: 'Registered Manager, Nursing Home, Surrey',
}

// Login page — Southeast Asian lady carer reading tablet, residents in background
const IMAGE_LOGIN = '/auth-carer-female.jpg'

// Register page — South Asian male carer reading phone, residents in background
const IMAGE_REGISTER = '/auth-carer-male.jpg'

export function AuthRightPanel() {
  const pathname = usePathname()
  const imageSrc = pathname === '/register' ? IMAGE_REGISTER : IMAGE_LOGIN

  return (
    <div className="relative hidden flex-col overflow-hidden bg-teal lg:flex lg:w-[54%]">

      {/* Background photo */}
      <SiteImage
        src={imageSrc}
        alt=""
        fill
        priority
        sizes="54vw"
        className="object-cover object-center"
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
