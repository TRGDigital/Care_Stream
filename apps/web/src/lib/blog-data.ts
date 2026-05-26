export type BlogPost = {
  slug: string
  date: string
  category: string
  categoryColor: string
  title: string
  summary: string
  readTime: string
  featured?: boolean
}

export const POSTS: BlogPost[] = [
  {
    slug: 'cqc-equality-diversity-evidence',
    date: '2 May 2025',
    category: 'CQC & Compliance',
    categoryColor: 'bg-teal-light text-teal',
    title: 'How to evidence equality and diversity for CQC',
    summary: "CQC's Equality & Diversity requirements go beyond a signed policy. Inspectors want to see evidence that your workforce has equitable access to guidance, training, and support.",
    readTime: '5 min read',
    featured: true,
  },
  {
    slug: 'riddor-reporting-care-homes',
    date: '18 Apr 2025',
    category: 'Regulatory Knowledge',
    categoryColor: 'bg-amber-50 text-amber-brand',
    title: 'RIDDOR in care homes: which incidents must you report and when',
    summary: 'RIDDOR applies to care settings, but the specific triggers are often misunderstood. A clear breakdown of what must be reported, to whom, and within what timeframe.',
    readTime: '6 min read',
    featured: true,
  },
  {
    slug: 'overseas-care-workers-policy-access',
    date: '4 Apr 2025',
    category: 'Workforce',
    categoryColor: 'bg-green-50 text-green-700',
    title: 'The hidden risk in your international workforce',
    summary: "Over 190,000 overseas workers were recruited into UK care in 2023–24. Many navigate complex policies written in legal English — in a language they may have learned only recently.",
    readTime: '7 min read',
    featured: true,
  },
  {
    slug: 'rag-ai-care-compliance',
    date: '21 Mar 2025',
    category: 'Technology',
    categoryColor: 'bg-purple-50 text-purple-700',
    title: 'Why RAG is the right AI approach for care compliance',
    summary: 'Not all AI systems are the same — and in a compliance setting, the architecture matters. Why Retrieval Augmented Generation is the only responsible approach.',
    readTime: '8 min read',
    featured: true,
  },
  {
    slug: 'cqc-readiness-report-what-it-is',
    date: '7 Mar 2025',
    category: 'CQC & Compliance',
    categoryColor: 'bg-teal-light text-teal',
    title: 'What is a CQC Readiness Report and why should you have one?',
    summary: 'CQC inspectors look for evidence that staff actively understand and apply your policies. A CQC Readiness Report provides that evidence in a structured, presentable format.',
    readTime: '4 min read',
    featured: false,
  },
  {
    slug: 'night-shift-policy-access',
    date: '20 Feb 2025',
    category: 'Registered Manager',
    categoryColor: 'bg-neutral-light text-neutral-mid',
    title: 'Night shifts and policy access: the gap most managers do not know they have',
    summary: 'Most policy access in care homes happens during office hours. But clinical uncertainty does not keep office hours — staff working at 3am often have fewer resources than they need.',
    readTime: '5 min read',
    featured: false,
  },
]
