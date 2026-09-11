// The /uses/<slug> user case pages.
//
// Structure follows the agreed template: a conversion page (hero, the problem in
// three cards, three alternating capability blocks with screenshots, related
// guides, FAQ in three groups, three-card CTA) stacked on top of a long-form
// evergreen guide that does the SEO work.
//
// Adding a case is adding an entry here. Images live at
// /images/uses/<slug>/1..3.webp with a hero at /images/uses/<slug>/hero.webp;
// until they exist the page renders a labelled placeholder in their place, so a
// page can go live on copy alone and the art can follow.

export type UseCaseBlock = {
  title: string
  body: string
  tags: string[]
  image: { slot: string; alt: string }
}

export type UseCasePage = {
  slug: string
  label: string            // how it is named in the footer
  meta: { title: string; description: string }
  hero: {
    h1: string
    intro: string
    trustLine: string
    image: { slot: string; alt: string }
  }
  problem: { heading: string; standfirst?: string; cards: { title: string; body: string }[] }
  capability: { heading: string; blocks: UseCaseBlock[] }
  faq: { heading: string; groups: { title: string; items: { q: string; a: string }[] }[] }
  guide: { heading: string; sections: { heading: string; paras: string[] }[] }
}

const RESIDENT_KNOWLEDGE: UseCasePage = {
  slug: 'resident-knowledge',
  label: 'Resident Knowledge',
  meta: {
    title: 'Resident knowledge every carer can ask for | CareStream AI',
    description:
      'The things your longest serving staff know about each resident, held in your knowledge base and answerable by name in the hub. For new starters, bank and agency staff, and anyone covering a shift.',
  },
  hero: {
    h1: 'Give every carer what your longest serving staff already know',
    intro:
      'A new starter meets a resident for the first time with a care plan and not much else. The things that actually make a shift go well, what she likes to be called, the food he will genuinely eat, the routine that settles her at night, live in the heads of the people who have been there years. CareStream holds them in your knowledge base and answers questions about a resident by name.',
    trustLine: 'No card required · Set up in a day · UK data residency',
    image: { slot: 'hero', alt: 'A carer asking the hub about a resident on their phone' },
  },
  problem: {
    heading: 'A care plan tells you the clinical. It rarely tells you the person.',
    standfirst:
      'None of what follows is a failure of record keeping. It is knowledge that has never had anywhere sensible to live.',
    cards: [
      {
        title: 'New starters begin from nothing',
        body:
          'Someone on their first shift has read the care plan and met nobody. They do not know that he was a signalman for thirty five years, or that she will not settle until the curtains are shut. They find out slowly, by getting it wrong first.',
      },
      {
        title: 'Bank and agency repeat the same questions',
        body:
          'Cover staff ask the same handful of questions every time they walk in, usually of whoever is busiest. When nobody has a minute, they guess, and the resident has a worse evening than they needed to.',
      },
      {
        title: 'It lives in people, not in records',
        body:
          'The carer who knows a resident best is the one most likely to be on leave when it matters. Handover carries the clinical and the urgent. It has never been the place for the small things that make somebody feel known.',
      },
    ],
  },
  capability: {
    heading: 'What CareStream actually does here',
    blocks: [
      {
        title: 'Write down what your team already knows',
        body:
          'Add a resident entry in the knowledge base the way you would tell a colleague: background, what they like to be called, food, routines, who visits and when. No form to fight, no fields to map. It is kept apart from your policies and coloured so you can see at a glance which entries are about people.',
        tags: ['Knowledge base', 'Resident category', 'Two minutes an entry'],
        image: { slot: '1', alt: 'Adding a resident entry in the knowledge base' },
      },
      {
        title: 'Staff ask by name, on their own phone',
        body:
          'A carer opens the hub and asks about the resident in front of them, in plain words, in any of sixty languages. The answer comes from what your team wrote, not from the internet. Once you have approved your first resident, the hub tells staff they can ask.',
        tags: ['Staff hub', '60+ languages', 'Ask by name'],
        image: { slot: '2', alt: 'A carer asking the hub about a resident and getting an answer' },
      },
      {
        title: 'Nothing is live until you approve it',
        body:
          'Every entry sits as pending until an admin approves it, so nothing reaches a carer that a manager has not read. Revoke it in one click if it stops being true, and remove it when a resident leaves. You can see which entries are approved and which are waiting at the top of the page.',
        tags: ['Approval before use', 'Revoke any time', 'Audit trail'],
        image: { slot: '3', alt: 'Approved and pending resident entries in the knowledge base' },
      },
    ],
  },
  faq: {
    heading: 'Resident knowledge, answered',
    groups: [
      {
        title: 'Getting started',
        items: [
          {
            q: 'How long does it take to add a resident?',
            a: 'A couple of minutes. Write the question the way a carer would ask it, put everything worth knowing in the answer, and approve it. Most homes start with the residents who are hardest to settle, because that is where it pays back first.',
          },
          {
            q: 'Who should write them?',
            a: 'The people who know the residents best, usually your seniors and the carers who have been with you longest. It is worth half an hour in a team meeting rather than a project.',
          },
          {
            q: 'Do we need to do all of them at once?',
            a: 'No. One resident is useful on its own. The hub answers about whoever you have written up and says so plainly when it does not know.',
          },
        ],
      },
      {
        title: 'For the carer',
        items: [
          {
            q: 'How does a carer find it?',
            a: 'They open the hub and ask. Once you have an approved resident entry the Policies and Procedures topic renames itself to Policies, Procedures and Residents, which is what prompts staff to try it.',
          },
          {
            q: 'Does it work in other languages?',
            a: 'Yes. A carer can ask in their own language and get the answer back in it, from the same entry your team wrote in English.',
          },
          {
            q: 'What if the answer is wrong?',
            a: 'Staff can flag an answer, and an admin edits or revokes the entry. Because every answer comes from an entry a person wrote and approved, you can always see where it came from.',
          },
        ],
      },
      {
        title: 'Records and privacy',
        items: [
          {
            q: 'Is this a care record?',
            a: 'Treat it as one. Put in what you would be comfortable any member of your staff reading, keep it accurate, and remove it when a resident leaves. It does not replace the care plan and is not a clinical record.',
          },
          {
            q: 'Who can see it?',
            a: 'Only staff signed in to your own hub. Nothing is shared with another home, and your data stays in the UK.',
          },
          {
            q: 'What about consent?',
            a: 'Handle it the way you handle life story work: involve the resident or their representative, record that you did, and keep to what is relevant to their care.',
          },
        ],
      },
    ],
  },
  guide: {
    heading: 'A practical guide to resident knowledge in a care home',
    sections: [
      {
        heading: 'The knowledge that never had anywhere to live',
        paras: [
          'Every care home runs on two kinds of knowledge. The first is written down because it has to be: the care plan, the risk assessments, the MAR chart, the policies. The second is the knowledge that makes a shift go well, and it has almost never been written down anywhere useful.',
          'It is knowing that a resident answers to a name that is not on the door. It is knowing which chair is hers, that he takes his tea before anyone else is up, that she will eat if you sit with her and will not if you leave the plate. None of it is clinical. All of it decides whether somebody has a good day.',
          'That knowledge sits with your longest serving staff, and it leaves the building with them when they go on leave, change shift, or move on.',
        ],
      },
      {
        heading: 'Why handover does not carry it',
        paras: [
          'Handover is built for what has changed and what is urgent. It is short by design, and it should be. Asking it to also carry the accumulated character of thirty residents would make it unusable.',
          'So the small things get passed on informally, by working alongside somebody who already knows. That works well when your team is stable and barely at all when it is not. Bank staff, agency cover and new starters are exactly the people who need the knowledge most and have the least access to it.',
        ],
      },
      {
        heading: 'What belongs here, and what does not',
        paras: [
          'The test is simple: would you tell a new colleague this in the corridor on their first shift? If yes, it belongs. Preferred name, background and work, family and visitors, food they like and refuse, what helps them settle, what upsets them, how they prefer personal care to be offered.',
          'What does not belong is anything clinical that has a proper home elsewhere. Medication, wound care, DoLS, moving and handling plans, anything that must be actioned or evidenced, belongs in the care plan and the systems built for it. Resident knowledge sits alongside those records, it does not replace them.',
          'Nor does it belong if you would not be comfortable with the resident, their family or an inspector reading it. Write it as though all three will.',
        ],
      },
      {
        heading: 'A workable standard',
        paras: [
          'Start with the residents who are hardest to settle, because the return is immediate. Write each one the way you would explain the person to a colleague, in full sentences, not bullet fragments that lose their meaning out of context.',
          'Have a senior approve every entry before it goes live, and review them when something changes. Retire the entry when a resident leaves. If those three habits hold, the knowledge stays trustworthy, which is the only thing that makes staff keep using it.',
        ],
      },
      {
        heading: 'Where CareStream fits',
        paras: [
          'CareStream gives that knowledge somewhere to live and a way to ask for it. Entries are added in the knowledge base under a Resident category, kept separate from your policies, and approved by an admin before any carer sees them.',
          'Staff then ask about a resident by name in the hub, on their own phone, in their own language, and get an answer built from what your team wrote. A carer covering a shift can find out in fifteen seconds what would otherwise take three interruptions to somebody who is already busy.',
        ],
      },
    ],
  },
}

export const USE_CASE_PAGES: UseCasePage[] = [RESIDENT_KNOWLEDGE]

export const useCasePage = (slug: string): UseCasePage | undefined =>
  USE_CASE_PAGES.find(u => u.slug === slug)
