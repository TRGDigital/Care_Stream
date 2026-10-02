// Course page copy written around why care managers buy, kept per course so a course shows it only
// once its copy is written and approved. Add a course by adding its slug here.
//
//   whoFor:   one line under the title saying who the course is for.
//   benefits: the two benefits that matter most, shown as ticks under that line.
//   moments:  "When you need this": the moments that send a manager looking for the course (what
//             DRIP calls category entry points), each with how the course answers it. The ad
//             groups' headlines should use the same moments, so the ad and the page say the same.
//             {duration} in a body becomes the course's own time to complete.
//
// Site copy rules apply: no em or en dashes, and nothing the course cannot back up.

export interface CourseMoment { title: string; body: string }
export interface CourseCro { whoFor?: string; benefits?: [string, string]; moments?: CourseMoment[] }

export const COURSE_CRO: Record<string, CourseCro> = {
  'care-certificate': {
    whoFor:
      'Perfect for new care workers, healthcare assistants and support workers starting out in health and social care, '
      + 'and for managers inducting new starters in their first 12 weeks.',
    benefits: ['Covers all 16 Care Certificate standards', 'Taken in your staff’s own language, 60+ to choose from'],
    moments: [
      {
        title: 'A new starter joins your team',
        body: 'Start them on day one. Skills for Care guidance is that new starters complete the Care Certificate within 12 weeks.',
      },
      {
        title: 'CQC asks for your induction evidence',
        body: 'Every learner gets a dated, named certificate, and your dashboard shows who has finished and their score.',
      },
      {
        title: 'English is not their first language',
        body: 'Learners take the course in their own language, so they understand every standard in detail, not just pass it.',
      },
      {
        title: 'Existing staff never completed it',
        body: 'Catch them up in about {duration} each, at their own pace, with a follow-up lesson for any wrong answer.',
      },
    ],
  },
}
