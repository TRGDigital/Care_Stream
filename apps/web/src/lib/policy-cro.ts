// Policy page copy written around why care managers buy, kept per policy so a policy shows it only
// once its copy is written and approved. Add a policy by adding its slug here. Same shape and rules
// as lib/course-cro.ts: whoFor under the title, two benefit ticks, and "When you need this policy"
// (the moments that send a manager looking, each with how the policy answers it). Every claim must
// be something the policy actually covers: check it against the policy's required elements.

import { GDPR_POLICY_INTENTS } from './policy-cro-gdpr'

export interface PolicyMoment { title: string; body: string }
/** A version of the top of the page for one Google Ads ad group or sitelink (?intent=<key>), so
 *  the page opens on what the ad promised. moment: the "When you need this policy" moment to lead with;
 *  slide: the gallery view it opens on. */
export interface PolicyIntent { tag: string; headline: string; sub: string; moment?: number; slide?: 'policy' | 'page' | 'law' | 'questions' }
/** story: the founder's "Our story" in his words for this policy page. Only shown where Len has approved it. */
export interface PolicyCro { whoFor?: string; benefits?: [string, string]; moments?: PolicyMoment[]; story?: string; intents?: Record<string, PolicyIntent> }

export const POLICY_CRO: Record<string, PolicyCro> = {
  'data-protection-gdpr': {
    // Ad group and sitelink versions, written in the keyword tool (scripts/gdpr_plan.py).
    intents: GDPR_POLICY_INTENTS,
    whoFor:
      'Perfect for services who need a GDPR policy that meets UK GDPR, the Data Protection Act 2018 and what CQC '
      + 'inspectors look for.',
    benefits: ['Covers UK GDPR, the Data Protection Act 2018 and the Caldicott Principles', 'Written for your service, delivered in 2 working days'],
    story:
      'I worked in the care industry for a number of years and saw first hand how many services rely on policy templates '
      + 'that are out of date, generic, or not written for the way they actually work. When CQC asks how you handle '
      + 'residents’ information, a template does not stand up. So I built CareStream: policies written for your service, '
      + 'checked against the law line by line and read by a person before they carry your name. Today it helps care '
      + 'services right across the UK.',
    moments: [
      {
        title: 'A CQC inspection is coming',
        body: 'Inspectors check how you handle residents’ information. Every required element is checked before a person signs your policy off.',
      },
      {
        title: 'You had a data breach or a near miss',
        body: 'Sets out reporting to the ICO within 72 hours, and who can report it out of hours when the manager is not there.',
      },
      {
        title: 'A family asks to see a resident’s records',
        body: 'Covers capacity, consent, Lasting Power of Attorney and subject access requests answered within one calendar month.',
      },
      {
        title: 'You are adding CCTV or new care software',
        body: 'Requires a data protection impact assessment first, and the right data processing clauses with your suppliers.',
      },
    ],
  },
}
