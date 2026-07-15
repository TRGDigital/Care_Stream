import type { Metadata } from 'next'
import { Globe, Users, ShieldCheck, MessageSquare, FileText, Languages, HeartHandshake, GraduationCap } from 'lucide-react'
import { FeatureSimplePage, type FeatureContent } from '@/components/marketing/feature-page'
import { pageMetadata } from '@/lib/page-meta'

export const revalidate = 60

// Light / no-image template — the sibling of the image-rich showcase used on
// /features/web-chat-interface. Use this shape for the many pricing features
// where screenshots aren't needed. Copy this file, swap the CONTENT, done.

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata('/features/multi-language-support', {
    title: 'Multi-Language Support for Care Staff | CareStreamAI',
    description: 'Let every member of your team learn, ask and work in the language they are most confident in, across 60+ languages, while your records stay in English.',
  })
}

const CONTENT: FeatureContent = {
  eyebrow: 'For a diverse workforce',
  title: 'Multi-language support',
  intro: 'Let every member of your team learn, ask and work in the language they are most confident in, across more than 60 languages, while your records stay in English.',
  chips: [
    { Icon: Globe, label: '60+ languages' },
    { Icon: Users, label: 'For every team member' },
    { Icon: ShieldCheck, label: 'Records stay in English' },
  ],
  hero: { Icon: Languages },
  whatItIs: {
    heading: 'One platform, in everyone’s language.',
    body: 'Care teams are more diverse than ever, and a language barrier should never get in the way of good care or genuine understanding. Multi-language support lets each member of staff use CareStream, its chat, policies, induction and training, in the language they are most confident in, at the tap of a button. Your official records and reporting stay in English, so nothing changes for compliance.',
  },
  outcomes: [
    'Staff truly understand your policies, rather than half-reading them in a second language.',
    'New starters from overseas get up to speed without a language barrier holding them back.',
    'Training and inductions land properly, because people learn in the language they think in.',
    'Fewer misunderstandings at the point of care, which means safer, more consistent support.',
    'Your records, audits and reporting all stay in English, so compliance is unaffected.',
    'People feel included and valued, which helps you keep the good staff you have hired.',
  ],
  howItWorks: {
    heading: 'How multi-language support works.',
    intro: 'A single toggle changes what a member of staff sees, without changing a thing about your records.',
    sections: [
      { Icon: Globe, heading: 'One tap to switch', body: 'Each member of staff chooses their language once, and the chat, policies and training all follow, with no separate app or login to manage.' },
      { Icon: MessageSquare, heading: 'Ask and read in their language', body: 'Staff type questions and read answers in the language they are most confident in, and the guidance still comes from your own policies.' },
      { Icon: GraduationCap, heading: 'Learn without a barrier', body: 'Induction steps, training modules and scenario questions all appear in the chosen language, so understanding is genuine, not guessed.' },
      { Icon: FileText, heading: 'Records stay in English', body: 'Whatever language a member of staff uses, what is stored, reported and shown at inspection stays in clear English.' },
      { Icon: HeartHandshake, heading: 'Everyone feels included', body: 'Giving people the option to work in their own language shows you value them, which supports morale and retention across a diverse team.' },
      { Icon: ShieldCheck, heading: 'Nothing to set up per person', body: 'It works out of the box for your whole team, so there is no extra admin and no per-language configuration to maintain.' },
    ],
  },
  keyPoints: [
    'More than 60 languages, chosen per member of staff',
    'Chat, policies, induction and training all follow the chosen language',
    'Official records and reporting always stay in English',
    'No separate app, login or per-person setup',
    'Supports understanding, safety, inclusion and retention',
  ],
  sidebar: [
    { Icon: Users, title: 'Who it’s for', body: 'Any service with a multilingual team, from a single home to a large group, where English is not everyone’s first language.' },
    { Icon: ShieldCheck, title: 'Confidence at inspection', body: 'Because records stay in English while staff work in their own language, you show inclusive practice without any compliance trade-off.' },
  ],
  whyItWorks: {
    heading: 'Understanding shouldn’t depend on language.',
    intro: 'When people can learn and ask in the language they think in, they genuinely understand your policies, and that shows up as safer, more consistent care.',
    tiles: [
      { Icon: Globe, title: '60+ languages', body: 'Broad coverage so almost every member of your team can work in their own language.' },
      { Icon: GraduationCap, title: 'Real understanding', body: 'People learn better in their first language, so training actually sticks.' },
      { Icon: FileText, title: 'English records', body: 'Everything you report and evidence stays in English, so compliance is unaffected.' },
      { Icon: HeartHandshake, title: 'Inclusion & retention', body: 'Valuing people’s language helps morale and helps you keep good staff.' },
    ],
  },
  faqs: [
    { question: 'How many languages are supported?', answer: 'More than 60. Each member of staff can choose the language they are most confident in, and CareStream presents the chat, policies and training in that language.' },
    { question: 'Do our records change language too?', answer: 'No. Whatever language a member of staff works in, your official records, audits and reporting stay in clear English, so nothing changes for compliance or inspection.' },
    { question: 'Is there anything to set up for each person?', answer: 'No. It works for your whole team out of the box. A member of staff simply chooses their language, and everything follows.' },
    { question: 'Does it work across training and induction too?', answer: 'Yes. The chosen language carries across the chat, policies, induction steps, training modules and follow-ups, so it is one consistent experience.' },
  ],
  cta: {
    heading: 'Give every member of your team a language they’re confident in.',
    sub: 'See how CareStream helps a diverse workforce understand your policies and training, without any compliance trade-off.',
  },
}

export default function MultiLanguageSupportPage() {
  return <FeatureSimplePage content={CONTENT} />
}
