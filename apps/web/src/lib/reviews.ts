// Real customer reviews, word for word as the customers wrote them. The single source for every
// place the site quotes a customer (home page, register, sign-in panel), so a quote cannot be
// edited in one place and drift in another.
//
// Only add a review here that a named customer actually gave. `excerpt` is for tight spaces and
// must be cut from `quote`, never reworded; the gaps are marked with an ellipsis.

export interface Review {
  quote:   string
  excerpt: string
  name:    string
  setting: string
}

export const REVIEWS: Review[] = [
  {
    quote:
      'Having used CarestreamAI for a few months now, I can honestly say it’s an excellent program. '
      + 'I haven’t found anything else as comprehensive, easy to use, or as clever; to have a tool such '
      + 'as this for our company policies to act as a living on-hand guide for my staff. The fact that '
      + 'staff can ask questions (and receive the correct answers from both our company policies and '
      + 'relevant regulations) in their own language is truly groundbreaking. The training modules and '
      + 'matrix are extremely useful, and the fact that the system analyses all the information from '
      + 'each section to create a gap analysis ensures that our service is performing to the best of '
      + 'our ability. A wonderful system that has identified a way of closing the loop between knowledge '
      + 'provided by the company and knowledge received and understood by our staff.',
    excerpt:
      'I haven’t found anything else as comprehensive, easy to use, or as clever… The fact that staff '
      + 'can ask questions (and receive the correct answers from both our company policies and relevant '
      + 'regulations) in their own language is truly groundbreaking.',
    name:    'A. Arbery',
    setting: 'Nursing Home',
  },
  {
    quote:
      'CarestreamAI has helped us to create a business compliance system that ensures we work within all '
      + 'relevant regulations for our sector. Audits are easily performed on a tablet or phone in real time '
      + 'and can then be analysed against policies, training, and staff knowledge. The system then detects '
      + 'any knowledge gaps and can even recommend how to fill those gaps. CarestreamAI has really found a '
      + 'niche in the care sector to help companies to ensure they can do their best to receive positive CQC '
      + 'results, there is even a section to prepare the staff for a CQC inspection, including the questions '
      + 'an inspector will ask!',
    excerpt:
      'Audits are easily performed on a tablet or phone in real time and can then be analysed against '
      + 'policies, training, and staff knowledge… there is even a section to prepare the staff for a CQC '
      + 'inspection, including the questions an inspector will ask!',
    name:    'R. Mannick',
    setting: 'Nursing Home',
  },
]
