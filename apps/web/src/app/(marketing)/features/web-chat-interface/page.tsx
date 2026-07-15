import type { Metadata } from 'next'
import { MessageSquare, Globe, ShieldCheck, Clock, Users, FileText, Search, Zap } from 'lucide-react'
import { FeatureShowcasePage, type FeatureContent } from '@/components/marketing/feature-page'
import { pageMetadata } from '@/lib/page-meta'

export const revalidate = 60

// Flagship feature page — image-rich showcase template (real product screenshots).
// The lighter, no-image sibling template lives at /features/multi-language-support.

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata('/features/web-chat-interface', {
    title: 'Web Chat Interface for Care Staff | CareStreamAI',
    description: 'Give every member of your care team one place to ask anything and get an instant answer grounded in your own policies, in their own language, on any device.',
  })
}

const CONTENT: FeatureContent = {
  eyebrow: 'For your whole team',
  title: 'Web chat interface',
  intro: 'One place for every member of your team to ask anything, and get an instant answer grounded in your own policies, in their own language, on any device.',
  chips: [
    { Icon: Users, label: 'For your whole team' },
    { Icon: Globe, label: '60+ languages' },
    { Icon: Clock, label: 'Available 24/7' },
  ],
  hero: {
    Icon: MessageSquare,
    image: { src: '/images/features/web-chat/answer.png', alt: 'A staff member asks the CareStream web chat about the COSHH policy and gets a clear, sourced answer.' },
  },
  whatItIs: {
    heading: 'One question box for your whole team.',
    body: 'The web chat interface is where your care team goes to ask anything, in plain language, and get an instant, accurate answer drawn from your own policies and procedures. No folders to search, no waiting for a manager to be free, and no guessing. It puts the right guidance in the hands of every member of staff, on whatever device they already use.',
  },
  outcomes: [
    'Staff get the right answer in seconds, instead of waiting for a senior or a manager.',
    'Everyone gets the same, policy-accurate guidance, so care stays consistent across every shift.',
    'Seniors and managers are interrupted far less often for routine questions.',
    'New starters find their feet quickly, without needing someone free to ask.',
    'You get a picture of what your team is actually unsure about, so you can close the gaps.',
    'Available around the clock, on any phone, tablet or computer, wherever care happens.',
  ],
  howItWorks: {
    heading: 'A closer look at the web chat interface.',
    intro: 'Simple for staff to use, and built to give answers you can trust and stand behind at inspection.',
    sections: [
      {
        heading: 'Choose the area, then just ask',
        body: 'Staff pick a knowledge area, such as policies and procedures, then type their question the way they would ask a colleague. No jargon and no folders to dig through, and CareStream understands it.',
        image: { src: '/images/features/web-chat/topic-picker.png', alt: 'The CareStream chat home showing knowledge areas: Policies & Procedures, Staff Handbook, CQC Compliance and Business Continuity.' },
      },
      {
        heading: 'Not sure where to start? We suggest questions',
        body: 'Every area offers real, relevant questions staff can tap to get going, so even a brand new team member knows exactly what they can ask and how the chat can help them.',
        image: { src: '/images/features/web-chat/suggested-questions.png', alt: 'Suggested starter questions in the CareStream chat, such as how to handle safeguarding concerns involving staff members.' },
      },
      {
        heading: 'Answers grounded in your own policies, with the source shown',
        body: 'This is not a generic web search. Every answer is drawn from your service’s own policies, laid out as a clear summary and key points, and each response points back to the policy it is based on so staff can trust it and check it.',
        image: { src: '/images/features/web-chat/answer.png', alt: 'A policy-grounded answer with a summary and key points, referenced back to the source policy.' },
      },
      {
        heading: 'Read the full policy in a click',
        body: 'When staff want the detail, the full policy opens right there in the hub, with a read-progress indicator and the option to save it, so the answer and the source document are never more than a tap apart.',
        image: { src: '/images/features/web-chat/read-policy.png', alt: 'The full Infection Control and Cleanliness policy opened in the CareStream hub with a read-progress bar.' },
      },
      {
        heading: 'In the language they are most confident in',
        body: 'Staff can ask and read answers in over 60 languages, while your records stay in English, so a language barrier never gets in the way of the right care decision.',
        image: { src: '/images/features/web-chat/answer-hindi.png', alt: 'The same policy answer with a Hindi language option selected in the CareStream chat.' },
      },
      {
        heading: 'It flows straight into induction and training',
        body: 'The same trusted chat sits behind induction steps, training and follow-ups, so reading a policy or answering a scenario question is part of one joined-up experience, not a separate system to learn.',
        image: { src: '/images/features/web-chat/induction.png', alt: 'A Care Assistant induction checklist in CareStream with read-policy and answer-question steps.' },
      },
    ],
  },
  keyPoints: [
    'A single, familiar question box for your whole team, on any device',
    'Answers are grounded in your own uploaded policies, never generic advice',
    'Every answer is traceable back to the source policy',
    'Works in over 60 languages, with your records kept in English',
    'Unanswered questions are surfaced so you can improve your library',
  ],
  sidebar: [
    {
      Icon: Users,
      title: 'Who it’s for',
      body: 'Every member of your care team, from new starters to seniors and managers, on any phone, tablet or computer.',
    },
    {
      Icon: ShieldCheck,
      title: 'Confidence at inspection',
      body: 'Because every answer is grounded in your own policies and traceable to its source, you can show that staff are guided by your documented practice.',
    },
  ],
  whyItWorks: {
    heading: 'The right answer, in the moment it’s needed.',
    intro: 'Care doesn’t wait for office hours. The web chat interface puts accurate, policy-grounded guidance into every member of your team’s hands, whenever and wherever they need it.',
    tiles: [
      { Icon: Zap, title: 'Answers in seconds', body: 'Staff get an instant, accurate answer at the point of care, instead of pausing to find someone to ask.' },
      { Icon: FileText, title: 'From your policies', body: 'Grounded in your own documents, so the guidance reflects your service, not a template.' },
      { Icon: Globe, title: 'In any language', body: 'Over 60 languages supported, so every member of the team can use it with confidence.' },
      { Icon: Search, title: 'Surfaces the gaps', body: 'Questions your policies can’t answer are captured, so you can see and close the gaps.' },
    ],
  },
  faqs: [
    { question: 'What can staff ask the web chat?', answer: 'Anything about how your service works: policies and procedures, what to do in a situation, where to record something, who to escalate to. CareStream answers from your own uploaded policies, so the guidance is specific to your care setting.' },
    { question: 'How does it know the answers?', answer: 'CareStream reads your own policies and procedures and answers from them, pointing back to the source. It is not a generic web search, so staff get guidance that matches your documented practice.' },
    { question: 'Can staff use it in other languages?', answer: 'Yes. Staff can ask and read answers in over 60 languages, using the language they are most confident in, while your records stay in English.' },
    { question: 'What happens if a question isn’t covered?', answer: 'CareStream tells the member of staff it cannot answer from your policies, and captures the question as a gap so you can see what your library is missing and improve it.' },
  ],
  cta: {
    heading: 'Put the right answer in every team member’s hands.',
    sub: 'See how CareStream gives your whole team instant, policy-grounded guidance in the hub, in any language.',
  },
}

export default function WebChatInterfacePage() {
  return <FeatureShowcasePage content={CONTENT} />
}
