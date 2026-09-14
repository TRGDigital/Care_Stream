// The starting copy for the 14 /uses pages, lifted out of the rebuilt content theme by
// carestream-theme-preview/extract_uses_content.py so nobody had to retype it.
//
// This is a STARTING POINT, not the source of truth. Once a page is seeded, the row in
// user_case_pages is what the site renders and what the console edits. Re-running the seed
// refreshes a page back to this copy, which is what you want after a theme change and is very
// much not what you want after someone has edited it, so the seed endpoint skips pages that
// have been touched unless it is explicitly told to overwrite.
//
// `slug` matches lib/use-cases.ts, which is what blog posts are allocated to.

export interface UserCaseSection {
  heading: string
  bullets: string[]
  links: { label: string; href: string }[]
  image: string | null
  image_alt: string
}

export interface UserCaseContent {
  /** Small label above the H1. */
  eyebrow: string
  /** Hero sub-paragraph. */
  lede: string
  /** The alternating copy/screenshot blocks that carry the argument. */
  sections: UserCaseSection[]
  /** The three supporting points below the sections. */
  cards: { title: string; body: string }[]
  /** The "general guidance, not legal advice" line. */
  note: string
}

/** FAQs are grouped under headings, which is how the page presents them. */
export interface UserCaseFaqGroup {
  label: string
  items: { question: string; answer: string }[]
}

export interface UserCasePageSeed {
  slug: string
  title: string
  meta_title: string
  meta_description: string
  hero_image_url: string
  content: UserCaseContent
  faqs: UserCaseFaqGroup[]
  sort: number
}

export const USER_CASE_PAGE_SEEDS: UserCasePageSeed[] = [
  {
    "slug": "multilingual-staff-hub",
    "title": "Give every carer your policies in the language <em>they think in</em>",
    "meta_title": "Staff Hub in 60+ languages | CareStreamAI",
    "meta_description": "Around one in five care workers in England reads English as a second language. Your policies are written in English, your read receipts say they were read, and nobody has ever checked whether they were understood. CareStream serves the same policy in over sixty languages, on the carer's own phone.",
    "hero_image_url": "/images/uses/multilingual-staff-hub/1.webp",
    "content": {
      "eyebrow": "User case",
      "lede": "Around one in five care workers in England reads English as a second language. Your policies are written in English, your read receipts say they were read, and nobody has ever checked whether they were understood. CareStream serves the same policy in over sixty languages, on the carer's own phone.",
      "sections": [
        {
          "heading": "One library, sixty plus languages",
          "bullets": [
            "Policies translated as a whole, not phrase by phrase, so meaning survives",
            "Update the English and every language follows, with the version recorded",
            "Staff pick their language once and everything arrives in it"
          ],
          "links": [
            {
              "label": "Care Policies",
              "href": "/care-policies"
            },
            {
              "label": "Staff Hub",
              "href": "/staff-training"
            },
            {
              "label": "HR Policies",
              "href": "/hr-policies"
            }
          ],
          "image": "/images/uses/multilingual-staff-hub/1.webp",
          "image_alt": "Screenshot slot Staff hub, policy in Igbo"
        },
        {
          "heading": "Ask a question, get an answer from your own policies",
          "bullets": [
            "Plain language questions, answered from your library rather than the internet",
            "The source section is shown, so the carer can read the actual wording",
            "Asked and answered in their language, without involving a colleague"
          ],
          "links": [
            {
              "label": "Staff Hub",
              "href": "/staff-training"
            },
            {
              "label": "Care Policies",
              "href": "/care-policies"
            }
          ],
          "image": "/images/uses/multilingual-staff-hub/2.webp",
          "image_alt": "Screenshot slot Question and answer with source shown"
        },
        {
          "heading": "Evidence that means something",
          "bullets": [
            "Read receipts recorded against the version live that day",
            "Language recorded alongside the read, so you can show what they read",
            "Comprehension checks logged separately from the read itself"
          ],
          "links": [
            {
              "label": "CQC and Compliance",
              "href": "/cqc-compliance"
            },
            {
              "label": "Training Matrix",
              "href": "/training-platform"
            }
          ],
          "image": "/images/uses/multilingual-staff-hub/3.webp",
          "image_alt": "Screenshot slot Read receipts by staff member and language"
        }
      ],
      "cards": [
        {
          "title": "Sixty plus languages, one policy",
          "body": "You maintain one English policy. Every carer reads it in their own language, and when you update the English the translation follows automatically."
        },
        {
          "title": "On their phone, not a shared PC",
          "body": "No work email, no password to forget. They sign in on their own device and the whole library is there, in their language, on a break."
        },
        {
          "title": "Questions answered privately",
          "body": "A new carer can ask what to do about a refused medication without having to admit to a colleague that they did not understand the policy."
        }
      ],
      "note": "General guidance, not legal advice. Regulatory requirements change and vary by service type. Check the current CQC guidance and your own registration conditions before relying on any of the above."
    },
    "faqs": [
      {
        "label": "Getting started",
        "items": [
          {
            "question": "Which languages are supported?",
            "answer": "More than sixty. Staff choose their own language the first time they sign in and can change it at any point."
          },
          {
            "question": "Do we have to translate our policies ourselves?",
            "answer": "No. You maintain the English version and translation happens automatically, including when you update it."
          },
          {
            "question": "What if a policy uses terms specific to our service?",
            "answer": "Service specific terms can be added so they translate consistently across the whole library rather than differently in each policy."
          }
        ]
      },
      {
        "label": "For the carer",
        "items": [
          {
            "question": "Do they need a work email address?",
            "answer": "No. The staff hub works on their own phone and they can sign in without a password."
          },
          {
            "question": "What if they cannot read well in any language?",
            "answer": "Translation does not solve literacy, and you should not treat it as though it does. Modules can be read aloud, and the comprehension check should be a conversation."
          },
          {
            "question": "Can they ask questions in their own language?",
            "answer": "Yes, and the answer comes back in the same language with the source section shown."
          }
        ]
      },
      {
        "label": "Evidence",
        "items": [
          {
            "question": "Does an inspector accept a translated policy as evidence?",
            "answer": "The evidence is that the person could access and understand the policy. A read receipt in a language they read is stronger than one in a language they do not."
          },
          {
            "question": "Can we show which language someone read a policy in?",
            "answer": "Yes, it is recorded with the read."
          },
          {
            "question": "What happens when we update the English?",
            "answer": "Every language updates, the new version goes to everyone it applies to, and the previous version stays on the record."
          }
        ]
      }
    ],
    "sort": 0
  },
  {
    "slug": "policy-gaps",
    "title": "Find what your policy set is missing <em>before an inspector does</em>",
    "meta_title": "Policy Gaps | CareStreamAI",
    "meta_description": "You have a folder of policies. What nobody can tell you is what is not in it. Policy Gap Detection reads your whole library against what your service type is expected to hold, and names the absences.",
    "hero_image_url": "/images/uses/policy-gaps/1.webp",
    "content": {
      "eyebrow": "User case",
      "lede": "You have a folder of policies. What nobody can tell you is what is not in it. Policy Gap Detection reads your whole library against what your service type is expected to hold, and names the absences.",
      "sections": [
        {
          "heading": "A guided scan, not a wall of findings",
          "bullets": [
            "Four stages, so you are never looking at ninety findings at once",
            "Runs are resumable, so a scan interrupted by a shift picks up where it left off",
            "Guardrails before anything is published, with a clear summary of what will change"
          ],
          "links": [
            {
              "label": "Policy Gap Detection",
              "href": "/policy-gap-detection"
            },
            {
              "label": "Care Policies",
              "href": "/care-policies"
            }
          ],
          "image": "/images/uses/policy-gaps/1.webp",
          "image_alt": "Screenshot slot Gap scan, stage two of four"
        },
        {
          "heading": "Legal changes tracked against your library",
          "bullets": [
            "Regulatory changes matched to the specific policies they affect",
            "Policies flagged for review with a date, rather than a general alert",
            "Mark as updated per item, so the list actually empties"
          ],
          "links": [
            {
              "label": "Policy Gap Detection",
              "href": "/policy-gap-detection"
            },
            {
              "label": "CQC and Compliance",
              "href": "/cqc-compliance"
            }
          ],
          "image": "/images/uses/policy-gaps/2.webp",
          "image_alt": "Screenshot slot Policies affected by a regulation change"
        },
        {
          "heading": "From gap to trained staff",
          "bullets": [
            "Close a gap and the new policy goes to the roles it applies to",
            "An adhoc training module can be generated from the policy you just added",
            "Read receipts and module scores land on the same staff record"
          ],
          "links": [
            {
              "label": "Adhoc Training",
              "href": "/training-platform"
            },
            {
              "label": "Staff Hub",
              "href": "/staff-training"
            }
          ],
          "image": "/images/uses/policy-gaps/3.webp",
          "image_alt": "Screenshot slot New policy assigned by role"
        }
      ],
      "cards": [
        {
          "title": "Measured against your service type",
          "body": "A nursing home is expected to hold a different set from a domiciliary agency. The scan compares your library against the right list, not a generic one."
        },
        {
          "title": "Thin as well as missing",
          "body": "A policy that exists but does not cover a required area is a gap that a folder audit will pass and an inspection will not."
        },
        {
          "title": "You approve every change",
          "body": "Nothing is rewritten for you. Each suggestion is accepted or rejected, and what you accept is recorded with who accepted it."
        }
      ],
      "note": "General guidance, not legal advice. Regulatory requirements change and vary by service type. Check the current CQC guidance and your own registration conditions before relying on any of the above."
    },
    "faqs": [
      {
        "label": "The scan",
        "items": [
          {
            "question": "How long does a scan take?",
            "answer": "Minutes for the scan itself. The time is in reviewing what it found, which is the part that should not be rushed."
          },
          {
            "question": "Does it change our policies?",
            "answer": "No. It proposes, you decide. Nothing is published without an explicit approval step."
          },
          {
            "question": "What if we disagree with a finding?",
            "answer": "Reject it. Rejections are remembered so the same suggestion does not come back every scan."
          }
        ]
      },
      {
        "label": "Coverage",
        "items": [
          {
            "question": "Does it know our service type?",
            "answer": "Yes, the expected set differs for residential, nursing, domiciliary and the rest, and the scan uses the right one."
          },
          {
            "question": "Will it find gaps in a policy, or only missing policies?",
            "answer": "Both. A policy that exists but does not cover a required area is reported as thin rather than missing."
          },
          {
            "question": "What about policies we hold for our own reasons?",
            "answer": "They are left alone. The scan reports absences against the expected set, it does not prune what you have chosen to keep."
          }
        ]
      },
      {
        "label": "Afterwards",
        "items": [
          {
            "question": "What happens when we close a gap?",
            "answer": "The new policy is assigned to the roles it applies to and appears in their staff hub, in their language."
          },
          {
            "question": "Do we have to retrain everyone?",
            "answer": "No. Assignment is by role, so only the people the policy applies to receive it."
          },
          {
            "question": "How often should we rescan?",
            "answer": "Quarterly is a reasonable rhythm, and after any significant regulatory change."
          }
        ]
      }
    ],
    "sort": 1
  },
  {
    "slug": "policy-inconsistencies",
    "title": "Stop two of your policies telling staff <em>different things</em>",
    "meta_title": "Policy Inconsistencies | CareStreamAI",
    "meta_description": "Your safeguarding policy names one reporting route. Your whistleblowing policy names another. A carer follows whichever they read last, and the difference only surfaces when something has already gone wrong.",
    "hero_image_url": "/images/uses/policy-inconsistencies/1.webp",
    "content": {
      "eyebrow": "User case",
      "lede": "Your safeguarding policy names one reporting route. Your whistleblowing policy names another. A carer follows whichever they read last, and the difference only surfaces when something has already gone wrong.",
      "sections": [
        {
          "heading": "Cross policy checking",
          "bullets": [
            "Compares every policy against every other, which no reviewer does by hand",
            "Reports the specific sentences that disagree, not just the policy names",
            "Groups conflicts by type so you can fix a class of problem in one pass"
          ],
          "links": [
            {
              "label": "Policy Gap Detection",
              "href": "/policy-gap-detection"
            },
            {
              "label": "Care Policies",
              "href": "/care-policies"
            }
          ],
          "image": "/images/uses/policy-inconsistencies/1.webp",
          "image_alt": "Screenshot slot Two policies side by side, conflict highlighted"
        },
        {
          "heading": "Fix it in one place",
          "bullets": [
            "Edit the wording directly in the policy panel, no download and re-upload",
            "Replace a named role or a phrase across the whole library at once",
            "Every change recorded with who made it and when"
          ],
          "links": [
            {
              "label": "Care Policies",
              "href": "/care-policies"
            },
            {
              "label": "Compliance",
              "href": "/cqc-compliance"
            }
          ],
          "image": "/images/uses/policy-inconsistencies/2.webp",
          "image_alt": "Screenshot slot Editing wording in the policy panel"
        },
        {
          "heading": "Staff see the resolution",
          "bullets": [
            "The corrected policy goes to everyone it applies to",
            "Read receipts recorded against the corrected version",
            "The superseded version stays available for the record"
          ],
          "links": [
            {
              "label": "Staff Hub",
              "href": "/staff-training"
            },
            {
              "label": "Training Matrix",
              "href": "/training-platform"
            }
          ],
          "image": "/images/uses/policy-inconsistencies/3.webp",
          "image_alt": "Screenshot slot Updated policy pushed to staff"
        }
      ],
      "cards": [
        {
          "title": "Reads the whole set at once",
          "body": "A human reviewer checks one policy at a time. Contradictions only exist between documents, which is exactly what that method cannot see."
        },
        {
          "title": "Roles and thresholds, not just wording",
          "body": "Different escalation windows, different named roles and different thresholds are the conflicts that actually reach the floor."
        },
        {
          "title": "Fix once, everywhere",
          "body": "Change a route or a role and it updates across every policy that names it, with the old version kept on the record."
        }
      ],
      "note": "General guidance, not legal advice. Regulatory requirements change and vary by service type. Check the current CQC guidance and your own registration conditions before relying on any of the above."
    },
    "faqs": [
      {
        "label": "The check",
        "items": [
          {
            "question": "How does it find a contradiction?",
            "answer": "It reads the whole library together and compares what each policy says about the same subject, rather than checking policies one at a time."
          },
          {
            "question": "Will it flag things that are not really conflicts?",
            "answer": "Sometimes. Anything flagged is reviewed by you and rejections are remembered."
          },
          {
            "question": "Does it work on policies we wrote ourselves?",
            "answer": "Yes. It works on your library whatever the source, which matters most when the set was assembled from several template packs."
          }
        ]
      },
      {
        "label": "Fixing",
        "items": [
          {
            "question": "Can we fix wording without republishing everything?",
            "answer": "Yes. Minor edits apply directly and are recorded as changes, without resetting anyone’s acknowledgement."
          },
          {
            "question": "What if two policies disagree and both are wrong?",
            "answer": "Then you decide the correct position once and apply it to both, which is the point of doing this as a set rather than document by document."
          },
          {
            "question": "Is there an audit trail?",
            "answer": "Every change is recorded with the author, the date and what it replaced."
          }
        ]
      },
      {
        "label": "Scale",
        "items": [
          {
            "question": "We have about a hundred policies. Is that a problem?",
            "answer": "No. The check is more useful at that scale, because a hundred documents is well past what anyone reconciles by reading."
          },
          {
            "question": "Do we need to do this more than once?",
            "answer": "Run it after any significant edit or import. Contradictions are introduced by change, not by time."
          },
          {
            "question": "What if we run multiple services?",
            "answer": "Each service has its own library, and the check runs per service."
          }
        ]
      }
    ],
    "sort": 2
  },
  {
    "slug": "cqc-wording-alignment",
    "title": "Say it the way CQC says it, <em>so your evidence lands</em>",
    "meta_title": "CQC Wording Alignment | CareStreamAI",
    "meta_description": "Your policies describe good practice in your own words. An inspector is looking for theirs. Wording alignment reviews what you already have against the assessment framework language and proposes the edits, which you approve.",
    "hero_image_url": "/images/uses/cqc-wording-alignment/1.webp",
    "content": {
      "eyebrow": "User case",
      "lede": "Your policies describe good practice in your own words. An inspector is looking for theirs. Wording alignment reviews what you already have against the assessment framework language and proposes the edits, which you approve.",
      "sections": [
        {
          "heading": "Reviewed against the framework, not a template",
          "bullets": [
            "Checked against the quality statements each policy should evidence",
            "Terms that carry specific regulatory meaning flagged where used loosely",
            "Suggestions show current and proposed wording side by side"
          ],
          "links": [
            {
              "label": "CQC and Compliance",
              "href": "/cqc-compliance"
            },
            {
              "label": "Policy Gap Detection",
              "href": "/policy-gap-detection"
            }
          ],
          "image": "/images/uses/cqc-wording-alignment/1.webp",
          "image_alt": "Screenshot slot Suggested wording, before and after"
        },
        {
          "heading": "Applied to what you already have",
          "bullets": [
            "No rewrite. Alignment is added to your existing policies",
            "Accept, edit or reject each suggestion individually",
            "A phrase can be replaced across the whole library in one pass"
          ],
          "links": [
            {
              "label": "Care Policies",
              "href": "/care-policies"
            }
          ],
          "image": "/images/uses/cqc-wording-alignment/2.webp",
          "image_alt": "Screenshot slot Accepting a wording suggestion"
        },
        {
          "heading": "Evidence an inspector can follow",
          "bullets": [
            "The mapping from policy to quality statement is visible",
            "Staff read the aligned version, recorded against that version",
            "CQC prep questions draw on the same language"
          ],
          "links": [
            {
              "label": "CQC Prep Questions",
              "href": "/cqc-staff-questions"
            },
            {
              "label": "Compliance",
              "href": "/cqc-compliance"
            }
          ],
          "image": "/images/uses/cqc-wording-alignment/3.webp",
          "image_alt": "Screenshot slot Policy mapped to quality statements"
        }
      ],
      "cards": [
        {
          "title": "Mapped to quality statements",
          "body": "Each policy is checked against the quality statements it should evidence, so the mapping is visible rather than implied."
        },
        {
          "title": "Edits proposed, not imposed",
          "body": "Every suggestion shows the current wording and the proposed wording. You accept, edit or reject each one."
        },
        {
          "title": "It still sounds like you",
          "body": "The aim is policies an inspector recognises, not policies that read as though they were written for an inspector."
        }
      ],
      "note": "General guidance, not legal advice. Regulatory requirements change and vary by service type. Check the current CQC guidance and your own registration conditions before relying on any of the above."
    },
    "faqs": [
      {
        "label": "The review",
        "items": [
          {
            "question": "Does it rewrite our policies?",
            "answer": "No. It proposes wording and you decide. Nothing changes without an approval."
          },
          {
            "question": "Will our policies end up sounding generic?",
            "answer": "They should not. The suggestions target terms that carry regulatory meaning, not your house style."
          },
          {
            "question": "How long does a review take?",
            "answer": "The review runs in minutes. Working through the suggestions is the real time, and it can be done in stages."
          }
        ]
      },
      {
        "label": "The framework",
        "items": [
          {
            "question": "Is this based on the current framework?",
            "answer": "It is based on the quality statements in the single assessment framework, which replaced the key lines of enquiry."
          },
          {
            "question": "Do we need to restructure our policies around quality statements?",
            "answer": "No, and we would not recommend it. The mapping can be made visible without reorganising the document."
          },
          {
            "question": "What about terms specific to our service?",
            "answer": "They are left alone unless they clash with a term that has a defined regulatory meaning."
          }
        ]
      },
      {
        "label": "Afterwards",
        "items": [
          {
            "question": "Do staff need to reread every policy?",
            "answer": "Only where the change is substantive. Minor wording corrections do not reset acknowledgements."
          },
          {
            "question": "Can we see what changed?",
            "answer": "Yes, every accepted suggestion is recorded with the previous wording."
          },
          {
            "question": "Does this help with inspection preparation?",
            "answer": "It should, because the prep questions and your policies then use the same language, which is what makes a staff answer sound grounded."
          }
        ]
      }
    ],
    "sort": 3
  },
  {
    "slug": "out-of-date-policies",
    "title": "Bring a stale policy set back up to date <em>without starting again</em>",
    "meta_title": "Policies Out of Date | CareStreamAI",
    "meta_description": "Half your policies were last reviewed in 2022. Rewriting all of them is not realistic and not necessary. Find what has actually been overtaken, fix that, and leave the rest alone.",
    "hero_image_url": "/images/uses/out-of-date-policies/1.webp",
    "content": {
      "eyebrow": "User case",
      "lede": "Half your policies were last reviewed in 2022. Rewriting all of them is not realistic and not necessary. Find what has actually been overtaken, fix that, and leave the rest alone.",
      "sections": [
        {
          "heading": "See what is actually due",
          "bullets": [
            "Review dates held per policy and editable, not a blanket annual cycle",
            "A dashboard of what is due, with a banner when something is overdue",
            "Mark as updated per item, so the list empties as you work"
          ],
          "links": [
            {
              "label": "Care Policies",
              "href": "/care-policies"
            },
            {
              "label": "Policy Gap Detection",
              "href": "/policy-gap-detection"
            }
          ],
          "image": "/images/uses/out-of-date-policies/1.webp",
          "image_alt": "Screenshot slot Policies due for review"
        },
        {
          "heading": "Find the content that has been overtaken",
          "bullets": [
            "Superseded guidance and dated phrasing found across the whole set",
            "Named roles that no longer exist flagged wherever they appear",
            "COVID era wording surfaced so you can decide what stays"
          ],
          "links": [
            {
              "label": "Policy Gap Detection",
              "href": "/policy-gap-detection"
            }
          ],
          "image": "/images/uses/out-of-date-policies/2.webp",
          "image_alt": "Screenshot slot Dated phrases found across the library"
        },
        {
          "heading": "Fix it without a rewrite",
          "bullets": [
            "Edit wording directly in the policy panel",
            "Replace or remove a phrase across every policy at once, in your words",
            "Staff get the updated version, recorded against that version"
          ],
          "links": [
            {
              "label": "Care Policies",
              "href": "/care-policies"
            },
            {
              "label": "Staff Hub",
              "href": "/staff-training"
            }
          ],
          "image": "/images/uses/out-of-date-policies/3.webp",
          "image_alt": "Screenshot slot Replacing a dated phrase"
        }
      ],
      "cards": [
        {
          "title": "Review dates that are real",
          "body": "A review date per policy, a dashboard of what is due, and a way to mark a policy reviewed with a record of who did it."
        },
        {
          "title": "Find the dated content",
          "body": "Superseded guidance, roles that no longer exist and thresholds that have moved, found across the library rather than policy by policy."
        },
        {
          "title": "Replace a phrase everywhere",
          "body": "Change a dated phrase once and it updates across every policy that uses it, with your wording rather than an imposed replacement."
        }
      ],
      "note": "General guidance, not legal advice. Regulatory requirements change and vary by service type. Check the current CQC guidance and your own registration conditions before relying on any of the above."
    },
    "faqs": [
      {
        "label": "Triage",
        "items": [
          {
            "question": "Do we have to rewrite everything?",
            "answer": "No, and you should not. Most stale policies need a specific correction, and identifying which is the whole job."
          },
          {
            "question": "How often should policies be reviewed?",
            "answer": "Annually for most, sooner for anything safety critical, and immediately when something changes that affects the policy."
          },
          {
            "question": "What counts as out of date?",
            "answer": "Content overtaken by guidance, roles that no longer exist, thresholds that have moved, and links that no longer resolve."
          }
        ]
      },
      {
        "label": "COVID era wording",
        "items": [
          {
            "question": "Should we delete all the COVID content?",
            "answer": "No. Some of it became permanent good practice. The judgement is which, and the post on this is worth reading before you start deleting."
          },
          {
            "question": "Can we remove a phrase across the whole set?",
            "answer": "Yes, and you can replace it with your own wording rather than accept a suggested one."
          },
          {
            "question": "Will removing it reset staff acknowledgements?",
            "answer": "Not for minor corrections. Substantive changes are treated as a new version."
          }
        ]
      },
      {
        "label": "Keeping it current",
        "items": [
          {
            "question": "How do we stop drifting again?",
            "answer": "Review dates per policy, a dashboard that surfaces what is due, and legal change tracking that tells you which policies a regulatory change affects."
          },
          {
            "question": "Who should own the review?",
            "answer": "One named person for the schedule, with subject owners for the content. The failure mode is a schedule nobody owns."
          },
          {
            "question": "Can we see the history?",
            "answer": "Every version is kept, with what changed and who changed it."
          }
        ]
      }
    ],
    "sort": 4
  },
  {
    "slug": "staff-compliance",
    "title": "Know who is compliant today, <em>without chasing anyone</em>",
    "meta_title": "Staff Compliance | CareStreamAI",
    "meta_description": "Most services find out that someone's training lapsed when they need the certificate. Compliance should be a live position you can see, not a report you assemble under pressure.",
    "hero_image_url": "/images/uses/staff-compliance/1.webp",
    "content": {
      "eyebrow": "User case",
      "lede": "Most services find out that someone's training lapsed when they need the certificate. Compliance should be a live position you can see, not a report you assemble under pressure.",
      "sections": [
        {
          "heading": "A live position, not a monthly snapshot",
          "bullets": [
            "Completions, scores and competencies land as they happen",
            "Renewal dates tracked per person, with warnings ahead of the date",
            "No manual updating, so the view is never quietly out of date"
          ],
          "links": [
            {
              "label": "CQC and Compliance",
              "href": "/cqc-compliance"
            },
            {
              "label": "Training Matrix",
              "href": "/training-platform"
            }
          ],
          "image": "/images/uses/staff-compliance/1.webp",
          "image_alt": "Screenshot slot Compliance overview, exceptions first"
        },
        {
          "heading": "Chasing that targets one person",
          "bullets": [
            "Push notification to the staff hub on their own phone, task attached",
            "The senior sees who is outstanding rather than sending to everyone",
            "Escalation when a renewal is close rather than after it has passed"
          ],
          "links": [
            {
              "label": "Staff Hub",
              "href": "/staff-training"
            },
            {
              "label": "Training",
              "href": "/training-platform"
            }
          ],
          "image": "/images/uses/staff-compliance/2.webp",
          "image_alt": "Screenshot slot Notification with the task attached"
        },
        {
          "heading": "Evidence you do not have to prepare",
          "bullets": [
            "Any staff member's full position produced without assembling anything",
            "Version aware, so you can show what they read and when",
            "Face to face sessions recorded on the same record as online modules"
          ],
          "links": [
            {
              "label": "Compliance",
              "href": "/cqc-compliance"
            },
            {
              "label": "Care Audits",
              "href": "/care-audits"
            }
          ],
          "image": "/images/uses/staff-compliance/3.webp",
          "image_alt": "Screenshot slot One staff member’s full record"
        }
      ],
      "cards": [
        {
          "title": "One record per person",
          "body": "Policy reads, module scores, observed competencies and renewal dates on the same staff record, updating as things happen."
        },
        {
          "title": "Exceptions, not percentages",
          "body": "A view built around what is overdue and who owns it, rather than a headline number that is always reassuring."
        },
        {
          "title": "Targeted, not broadcast",
          "body": "A notification to the person who needs it, with the task attached, instead of a reminder to everyone."
        }
      ],
      "note": "General guidance, not legal advice. Regulatory requirements change and vary by service type. Check the current CQC guidance and your own registration conditions before relying on any of the above."
    },
    "faqs": [
      {
        "label": "What is tracked",
        "items": [
          {
            "question": "What counts towards compliance?",
            "answer": "Statutory training, observed competencies, policy read receipts and renewal dates, held together per person."
          },
          {
            "question": "Can we define our own requirements?",
            "answer": "Yes. What is required is set by role, so a nurse, a carer and a kitchen assistant carry different lists."
          },
          {
            "question": "Does it include face to face training?",
            "answer": "Yes, in person sessions are recorded against the same record as online modules."
          }
        ]
      },
      {
        "label": "Chasing",
        "items": [
          {
            "question": "Do staff get chased automatically?",
            "answer": "They get a notification with the task attached, on their own phone. The senior sees who is outstanding rather than broadcasting to everyone."
          },
          {
            "question": "Will this fix poor completion rates?",
            "answer": "Partly. It removes the friction and the excuse. Persistent non completion is a management issue and software will not resolve it."
          },
          {
            "question": "Can we turn notifications off?",
            "answer": "Yes, per requirement."
          }
        ]
      },
      {
        "label": "Reporting",
        "items": [
          {
            "question": "Can we produce evidence for one person on demand?",
            "answer": "Yes, without assembling anything, which is the point."
          },
          {
            "question": "Does it work across multiple services?",
            "answer": "Each service has its own view, with a group level position where relevant."
          },
          {
            "question": "What about agency staff?",
            "answer": "They can be tracked on a shorter requirement set covering what applies to anyone on shift."
          }
        ]
      }
    ],
    "sort": 5
  },
  {
    "slug": "annual-training",
    "title": "Get the statutory training done, <em>evidenced and off your desk</em>",
    "meta_title": "Annual Training | CareStreamAI",
    "meta_description": "The annual round comes due for everyone at once, usually in the middle of a staffing problem. CPD accredited courses your team completes in the staff hub, with completion feeding the matrix without anyone typing it in.",
    "hero_image_url": "/images/uses/annual-training/1.webp",
    "content": {
      "eyebrow": "User case",
      "lede": "The annual round comes due for everyone at once, usually in the middle of a staffing problem. CPD accredited courses your team completes in the staff hub, with completion feeding the matrix without anyone typing it in.",
      "sections": [
        {
          "heading": "The statutory subjects, ready to assign",
          "bullets": [
            "CPD accredited modules covering the annual round",
            "Assigned by role, so people only get what applies to them",
            "Available in over sixty languages in the staff hub"
          ],
          "links": [
            {
              "label": "Annual Training",
              "href": "/staff-training"
            },
            {
              "label": "Training",
              "href": "/training-platform"
            }
          ],
          "image": "/images/uses/annual-training/1.webp",
          "image_alt": "Screenshot slot Annual course catalogue"
        },
        {
          "heading": "Spread the load across the year",
          "bullets": [
            "A calendar that shows renewals colliding before you commit",
            "Renewals rebalanced so an induction cohort does not all fall due in March",
            "Warnings ahead of expiry rather than after it"
          ],
          "links": [
            {
              "label": "Training Calendar",
              "href": "/training-platform"
            },
            {
              "label": "Compliance",
              "href": "/cqc-compliance"
            }
          ],
          "image": "/images/uses/annual-training/2.webp",
          "image_alt": "Screenshot slot Training calendar, renewals by month"
        },
        {
          "heading": "Proof that assembles itself",
          "bullets": [
            "Scores recorded, not just completions",
            "The matrix updates as each person finishes",
            "Face to face sessions recorded on the same record"
          ],
          "links": [
            {
              "label": "Training Matrix",
              "href": "/training-platform"
            },
            {
              "label": "Care Audits",
              "href": "/care-audits"
            }
          ],
          "image": "/images/uses/annual-training/3.webp",
          "image_alt": "Screenshot slot Matrix updating on completion"
        }
      ],
      "cards": [
        {
          "title": "CPD accredited courses",
          "body": "Ready made annual courses covering the statutory subjects, bought per module and completed in the staff hub."
        },
        {
          "title": "Done on shift, on their phone",
          "body": "Short modules in the carer's own language, done between tasks rather than in a booked afternoon nobody can cover."
        },
        {
          "title": "Evidence without admin",
          "body": "Completion and score land in the matrix as they happen. Nobody transcribes a certificate into a spreadsheet."
        }
      ],
      "note": "General guidance, not legal advice. Regulatory requirements change and vary by service type. Check the current CQC guidance and your own registration conditions before relying on any of the above."
    },
    "faqs": [
      {
        "label": "The courses",
        "items": [
          {
            "question": "Which subjects are covered?",
            "answer": "The statutory annual round for adult social care, including safeguarding, fire safety, infection prevention, moving and handling and medication awareness."
          },
          {
            "question": "Are they CPD accredited?",
            "answer": "Yes."
          },
          {
            "question": "How are they priced?",
            "answer": "Per module, so you buy what your team needs rather than a bundle you will not use."
          }
        ]
      },
      {
        "label": "Completion",
        "items": [
          {
            "question": "How long does a module take?",
            "answer": "Most are short enough to complete between tasks rather than requiring booked time off the floor."
          },
          {
            "question": "Can staff do them in their own language?",
            "answer": "Yes, in over sixty languages in the staff hub."
          },
          {
            "question": "Is there an assessment?",
            "answer": "Yes, and the score is recorded, not just the completion."
          }
        ]
      },
      {
        "label": "Evidence",
        "items": [
          {
            "question": "Does completion update our records automatically?",
            "answer": "Yes, it lands in the training matrix as it happens."
          },
          {
            "question": "Can we see who is outstanding?",
            "answer": "Yes, at any point, without producing a report."
          },
          {
            "question": "What about training we deliver ourselves?",
            "answer": "Face to face sessions are recorded against the same staff record, so the two do not live apart."
          }
        ]
      }
    ],
    "sort": 6
  },
  {
    "slug": "adhoc-training",
    "title": "Turn an incident into training <em>by the end of the week</em>",
    "meta_title": "Adhoc Training | CareStreamAI",
    "meta_description": "Something happened on Tuesday. The learning from it should reach the people it applies to before it happens again, not in next year's annual round.",
    "hero_image_url": "/images/uses/adhoc-training/1.webp",
    "content": {
      "eyebrow": "User case",
      "lede": "Something happened on Tuesday. The learning from it should reach the people it applies to before it happens again, not in next year's annual round.",
      "sections": [
        {
          "heading": "Generated from your own policy",
          "bullets": [
            "A module built from the specific policy the incident touched",
            "Uses your wording, not a generic course on the subject",
            "Reviewed by you before it goes anywhere"
          ],
          "links": [
            {
              "label": "Adhoc Training",
              "href": "/training-platform"
            },
            {
              "label": "Care Policies",
              "href": "/care-policies"
            }
          ],
          "image": "/images/uses/adhoc-training/1.webp",
          "image_alt": "Screenshot slot Module generated from a policy"
        },
        {
          "heading": "Assigned to the right people",
          "bullets": [
            "Assignment by role, so the population is the affected one",
            "Delivered to their staff hub in their own language",
            "Outstanding staff visible without producing a report"
          ],
          "links": [
            {
              "label": "Staff Hub",
              "href": "/staff-training"
            },
            {
              "label": "Compliance",
              "href": "/cqc-compliance"
            }
          ],
          "image": "/images/uses/adhoc-training/2.webp",
          "image_alt": "Screenshot slot Assignment by role"
        },
        {
          "heading": "Closed with evidence",
          "bullets": [
            "Scores recorded alongside completion",
            "Competency observation logged where the subject is practical",
            "The whole response sits on the record next to the incident"
          ],
          "links": [
            {
              "label": "Training Matrix",
              "href": "/training-platform"
            },
            {
              "label": "Care Audits",
              "href": "/care-audits"
            }
          ],
          "image": "/images/uses/adhoc-training/3.webp",
          "image_alt": "Screenshot slot Incident response on the record"
        }
      ],
      "cards": [
        {
          "title": "Built from the policy it touched",
          "body": "The module comes from your own policy on the subject, so what staff learn matches what your policy actually says."
        },
        {
          "title": "Only the people it applies to",
          "body": "Assigned by role, so you are not sending a medication module to the kitchen and diluting the point."
        },
        {
          "title": "Days, not the next annual cycle",
          "body": "From investigation outcome to assigned module in an afternoon, which is the only timescale that changes behaviour."
        }
      ],
      "note": "General guidance, not legal advice. Regulatory requirements change and vary by service type. Check the current CQC guidance and your own registration conditions before relying on any of the above."
    },
    "faqs": [
      {
        "label": "Speed",
        "items": [
          {
            "question": "How quickly can we get a module out?",
            "answer": "Same day. The module is generated from the policy, reviewed by you, and assigned."
          },
          {
            "question": "Do we have to write it?",
            "answer": "No. It is generated from your policy and you review it, which is a different job from writing a course."
          },
          {
            "question": "Can we edit it before it goes out?",
            "answer": "Yes, and you should. The generated module is a draft."
          }
        ]
      },
      {
        "label": "Scope",
        "items": [
          {
            "question": "Who receives it?",
            "answer": "Whoever the policy applies to, by role. You can narrow it further."
          },
          {
            "question": "Does everyone need retraining after an incident?",
            "answer": "Usually not, and sending it to everyone is not thoroughness. It is an inability to tell who is affected."
          },
          {
            "question": "Can we use this for policy changes as well as incidents?",
            "answer": "Yes, that is the same mechanism. A changed policy can carry a short module explaining what changed."
          }
        ]
      },
      {
        "label": "Evidence",
        "items": [
          {
            "question": "Does this count as evidence of a response?",
            "answer": "Combined with the investigation record, it evidences that learning reached the people it applied to and that they demonstrated it."
          },
          {
            "question": "What about practical subjects?",
            "answer": "An observed competency is recorded alongside the module, because a score alone does not evidence a practical skill."
          },
          {
            "question": "Is it kept separate from annual training?",
            "answer": "It sits on the same staff record but is identifiable as adhoc, so the annual position stays readable."
          }
        ]
      }
    ],
    "sort": 7
  },
  {
    "slug": "face-to-face-training",
    "title": "Get your in person sessions onto <em>the same record as everything else</em>",
    "meta_title": "Face to Face Training | CareStreamAI",
    "meta_description": "Your best training happens in a room, with a trainer, on real equipment. It also leaves no trace an inspector can follow. Face to face sessions recorded against the same staff record as the online modules.",
    "hero_image_url": "/images/uses/face-to-face-training/1.webp",
    "content": {
      "eyebrow": "User case",
      "lede": "Your best training happens in a room, with a trainer, on real equipment. It also leaves no trace an inspector can follow. Face to face sessions recorded against the same staff record as the online modules.",
      "sections": [
        {
          "heading": "Record the session, not just the register",
          "bullets": [
            "Trainer named, content covered, date and duration",
            "Attendance logged per person rather than as a headcount",
            "Competency outcome recorded individually, including anyone to reassess"
          ],
          "links": [
            {
              "label": "Face to Face",
              "href": "/training-platform"
            },
            {
              "label": "Care Audits",
              "href": "/care-audits"
            }
          ],
          "image": "/images/uses/face-to-face-training/1.webp",
          "image_alt": "Screenshot slot Session record with attendees"
        },
        {
          "heading": "It lands in the matrix",
          "bullets": [
            "Completion appears beside the online modules for that subject",
            "Renewal dates set from the session date",
            "Gaps visible immediately, including who did not attend"
          ],
          "links": [
            {
              "label": "Training Matrix",
              "href": "/training-platform"
            },
            {
              "label": "Compliance",
              "href": "/cqc-compliance"
            }
          ],
          "image": "/images/uses/face-to-face-training/2.webp",
          "image_alt": "Screenshot slot Matrix showing in person and online"
        },
        {
          "heading": "Prepare the room time",
          "bullets": [
            "Pre reading pushed to the staff hub before the session",
            "The session spent on practice rather than on the theory",
            "Scheduled against the rota so cover is planned, not improvised"
          ],
          "links": [
            {
              "label": "Staff Hub",
              "href": "/staff-training"
            },
            {
              "label": "Training Calendar",
              "href": "/training-platform"
            }
          ],
          "image": "/images/uses/face-to-face-training/3.webp",
          "image_alt": "Screenshot slot Pre reading assigned before a session"
        }
      ],
      "cards": [
        {
          "title": "In person, properly recorded",
          "body": "Date, trainer, content covered, who attended and what each person demonstrated, held as a record rather than a sheet."
        },
        {
          "title": "One record, both kinds",
          "body": "Online and in person sit on the same staff record, so nobody has to reconcile a spreadsheet with a folder."
        },
        {
          "title": "Competency, not just attendance",
          "body": "Attendance proves presence. The observation is what evidences that the person can do the thing."
        }
      ],
      "note": "General guidance, not legal advice. Regulatory requirements change and vary by service type. Check the current CQC guidance and your own registration conditions before relying on any of the above."
    },
    "faqs": [
      {
        "label": "Recording",
        "items": [
          {
            "question": "What does a session record hold?",
            "answer": "Date, trainer, content covered, attendees and a competency outcome per person."
          },
          {
            "question": "Can we record a session that already happened?",
            "answer": "Yes, retrospectively, with the actual date."
          },
          {
            "question": "What if someone attended but was not signed off?",
            "answer": "That is recorded as attended without competency, which is the honest position and the one an inspector expects to see used."
          }
        ]
      },
      {
        "label": "Blended",
        "items": [
          {
            "question": "Does this replace our online modules?",
            "answer": "No. It puts the two on the same record so a subject can be part online and part in person without the evidence splitting."
          },
          {
            "question": "What has to be face to face?",
            "answer": "Anything requiring practical assessment, most obviously moving and handling and basic life support. Much of the rest is habit rather than requirement."
          },
          {
            "question": "Can we assign pre reading before a session?",
            "answer": "Yes, to the staff hub, so the room time is spent on practice."
          }
        ]
      },
      {
        "label": "Practicalities",
        "items": [
          {
            "question": "Who can record a session?",
            "answer": "Whoever delivered it, or an administrator on their behalf with the trainer named."
          },
          {
            "question": "Does it handle external trainers?",
            "answer": "Yes, the trainer is named whether internal or external."
          },
          {
            "question": "How does this work with the rota?",
            "answer": "Sessions are scheduled through the training calendar so cover is visible before you commit."
          }
        ]
      }
    ],
    "sort": 8
  },
  {
    "slug": "training-matrix",
    "title": "See the whole team’s training <em>on one page, live</em>",
    "meta_title": "Training Matrix | CareStreamAI",
    "meta_description": "Your matrix is a spreadsheet somebody updates monthly, which means it is accurate on one day in thirty. A live matrix updates as people complete things, and shows competency alongside completion.",
    "hero_image_url": "/images/uses/training-matrix/1.webp",
    "content": {
      "eyebrow": "User case",
      "lede": "Your matrix is a spreadsheet somebody updates monthly, which means it is accurate on one day in thirty. A live matrix updates as people complete things, and shows competency alongside completion.",
      "sections": [
        {
          "heading": "The grid, built properly",
          "bullets": [
            "Completion, score, competency observation and renewal date per subject",
            "Requirements set by role, so the grid is not full of irrelevant cells",
            "In person and online sessions in the same view"
          ],
          "links": [
            {
              "label": "Training Matrix",
              "href": "/training-platform"
            },
            {
              "label": "Annual Training",
              "href": "/staff-training"
            }
          ],
          "image": "/images/uses/training-matrix/1.webp",
          "image_alt": "Screenshot slot Full training matrix"
        },
        {
          "heading": "Gaps that are actionable",
          "bullets": [
            "Anyone with a completion but no competency observation surfaced separately",
            "Renewals due in the next thirty days shown before they lapse",
            "Filter by role, subject or person without exporting anything"
          ],
          "links": [
            {
              "label": "Compliance",
              "href": "/cqc-compliance"
            },
            {
              "label": "Training",
              "href": "/training-platform"
            }
          ],
          "image": "/images/uses/training-matrix/2.webp",
          "image_alt": "Screenshot slot Matrix filtered to gaps"
        },
        {
          "heading": "From reporting to planning",
          "bullets": [
            "Read the matrix against the rota to spot uncovered shifts",
            "Plan sessions around who actually needs them",
            "Evidence produced on demand rather than assembled"
          ],
          "links": [
            {
              "label": "Training Calendar",
              "href": "/training-platform"
            },
            {
              "label": "Care Audits",
              "href": "/care-audits"
            }
          ],
          "image": "/images/uses/training-matrix/3.webp",
          "image_alt": "Screenshot slot Matrix read against a rota"
        }
      ],
      "cards": [
        {
          "title": "Completion and competency",
          "body": "Two different columns, because a score and an observation are two different kinds of evidence."
        },
        {
          "title": "Updates as things happen",
          "body": "No monthly refresh, no transcribing certificates. The grid is the record rather than a report about it."
        },
        {
          "title": "Readable against the rota",
          "body": "Not just who is missing training, but which shifts have nobody trained in something they might need."
        }
      ],
      "note": "General guidance, not legal advice. Regulatory requirements change and vary by service type. Check the current CQC guidance and your own registration conditions before relying on any of the above."
    },
    "faqs": [
      {
        "label": "The grid",
        "items": [
          {
            "question": "What is in each cell?",
            "answer": "Completion, score, competency observation where relevant, and the renewal date."
          },
          {
            "question": "Can we set different requirements per role?",
            "answer": "Yes, and you should. A grid where every subject applies to everyone is mostly empty cells."
          },
          {
            "question": "Does it include face to face training?",
            "answer": "Yes, in the same view as the online modules."
          }
        ]
      },
      {
        "label": "Accuracy",
        "items": [
          {
            "question": "Who updates it?",
            "answer": "Nobody. Completions, scores and observations land as they happen."
          },
          {
            "question": "What about training done before we started using CareStream?",
            "answer": "It can be imported so the grid reflects the real position from day one."
          },
          {
            "question": "Can we correct a mistake?",
            "answer": "Yes, and the correction is recorded."
          }
        ]
      },
      {
        "label": "Using it",
        "items": [
          {
            "question": "Can we export it?",
            "answer": "Yes, though the point is that you can show it live rather than exporting to prove something."
          },
          {
            "question": "Does it work across multiple services?",
            "answer": "Per service, with a group view where relevant."
          },
          {
            "question": "Can seniors see it, or only managers?",
            "answer": "Access is by permission, and seniors seeing their own team is usually the version that changes behaviour."
          }
        ]
      }
    ],
    "sort": 9
  },
  {
    "slug": "training-calendar",
    "title": "Plan a year of training without <em>a spreadsheet and a wall chart</em>",
    "meta_title": "Training Calendar | CareStreamAI",
    "meta_description": "Renewals fall due unevenly, cover is tight, and the plan usually lives in one person's head. A calendar that shows the collisions before you commit to dates.",
    "hero_image_url": "/images/uses/training-calendar/1.webp",
    "content": {
      "eyebrow": "User case",
      "lede": "Renewals fall due unevenly, cover is tight, and the plan usually lives in one person's head. A calendar that shows the collisions before you commit to dates.",
      "sections": [
        {
          "heading": "The whole year, visible",
          "bullets": [
            "Every renewal plotted by month, per subject and per person",
            "Collisions flagged before you commit to a date",
            "Sessions and online rounds on the same calendar"
          ],
          "links": [
            {
              "label": "Training Calendar",
              "href": "/training-platform"
            },
            {
              "label": "Training Matrix",
              "href": "/training-platform"
            }
          ],
          "image": "/images/uses/training-calendar/1.webp",
          "image_alt": "Screenshot slot Twelve month training calendar"
        },
        {
          "heading": "Scheduling that respects the rota",
          "bullets": [
            "See which shifts can release staff before booking",
            "Group people who need the same subject into one session",
            "Repeat a session rather than force one date on everyone"
          ],
          "links": [
            {
              "label": "Training",
              "href": "/training-platform"
            },
            {
              "label": "Compliance",
              "href": "/cqc-compliance"
            }
          ],
          "image": "/images/uses/training-calendar/2.webp",
          "image_alt": "Screenshot slot Session scheduled against cover"
        },
        {
          "heading": "Nothing expires unnoticed",
          "bullets": [
            "Warnings ahead of the renewal date, not after",
            "Escalation to the senior who owns the person, not a broadcast",
            "Overdue surfaced on the dashboard until it is cleared"
          ],
          "links": [
            {
              "label": "Compliance",
              "href": "/cqc-compliance"
            },
            {
              "label": "Staff Hub",
              "href": "/staff-training"
            }
          ],
          "image": "/images/uses/training-calendar/3.webp",
          "image_alt": "Screenshot slot Renewal warnings ahead of expiry"
        }
      ],
      "cards": [
        {
          "title": "See the year at once",
          "body": "Renewals plotted across twelve months, so the pile up is visible in January rather than discovered in March."
        },
        {
          "title": "Rebalance deliberately",
          "body": "Bring a renewal forward to flatten a month. Better slightly early than a fortnight late and unplanned."
        },
        {
          "title": "Scheduled against the rota",
          "body": "A session is only bookable if the shift can release the people. Cover planned rather than improvised."
        }
      ],
      "note": "General guidance, not legal advice. Regulatory requirements change and vary by service type. Check the current CQC guidance and your own registration conditions before relying on any of the above."
    },
    "faqs": [
      {
        "label": "Planning",
        "items": [
          {
            "question": "How far ahead can we plan?",
            "answer": "A full twelve months, with renewals projected from current completion dates."
          },
          {
            "question": "Can we move a renewal earlier?",
            "answer": "Yes, and flattening an overloaded month is usually worth a slightly early renewal."
          },
          {
            "question": "Does it handle recurring sessions?",
            "answer": "Yes, including repeating the same session for different groups."
          }
        ]
      },
      {
        "label": "Cover",
        "items": [
          {
            "question": "Does it know our rota?",
            "answer": "It shows the constraint so you can schedule against it rather than booking and discovering the problem later."
          },
          {
            "question": "What about staff who work nights only?",
            "answer": "They are the group most often missed, and the calendar makes that visible rather than leaving it to memory."
          },
          {
            "question": "Can we schedule for one service or a group?",
            "answer": "Either."
          }
        ]
      },
      {
        "label": "Expiry",
        "items": [
          {
            "question": "When do we get warned?",
            "answer": "Ahead of the date, with the lead time set by you."
          },
          {
            "question": "Who gets the warning?",
            "answer": "The person and the senior who owns them, rather than everyone."
          },
          {
            "question": "What happens if something lapses anyway?",
            "answer": "It stays on the dashboard as overdue until it is cleared, rather than disappearing into a percentage."
          }
        ]
      }
    ],
    "sort": 10
  },
  {
    "slug": "cqc-prep-questions",
    "title": "Prepare every staff member for the questions <em>they will actually be asked</em>",
    "meta_title": "CQC Prep Questions | CareStreamAI",
    "meta_description": "Inspectors talk to your carers, not to you. Role matched questions your team practises in the staff hub, in their own language, so nobody is asked something for the first time on the day.",
    "hero_image_url": "/images/uses/cqc-prep-questions/1.webp",
    "content": {
      "eyebrow": "User case",
      "lede": "Inspectors talk to your carers, not to you. Role matched questions your team practises in the staff hub, in their own language, so nobody is asked something for the first time on the day.",
      "sections": [
        {
          "heading": "Question sets by role",
          "bullets": [
            "Core set everyone gets, plus role specific sets on top",
            "Ancillary roles covered properly rather than as an afterthought",
            "Practised in the staff hub, on their own phone"
          ],
          "links": [
            {
              "label": "CQC Prep Questions",
              "href": "/cqc-staff-questions"
            },
            {
              "label": "Staff Hub",
              "href": "/staff-training"
            }
          ],
          "image": "/images/uses/cqc-prep-questions/1.webp",
          "image_alt": "Screenshot slot Role matched question sets"
        },
        {
          "heading": "Understanding, not scripts",
          "bullets": [
            "Each question links to the policy section the answer comes from",
            "No model answers to memorise and repeat back",
            "What is built is recall of practice rather than of a sentence"
          ],
          "links": [
            {
              "label": "Care Policies",
              "href": "/care-policies"
            },
            {
              "label": "Compliance",
              "href": "/cqc-compliance"
            }
          ],
          "image": "/images/uses/cqc-prep-questions/2.webp",
          "image_alt": "Screenshot slot Question with its source policy"
        },
        {
          "heading": "Readiness you can see",
          "bullets": [
            "Who has practised, by role, without producing a report",
            "The roles nobody has covered surfaced before an inspector finds them",
            "Print a set for a supervision conversation if you prefer paper"
          ],
          "links": [
            {
              "label": "CQC and Compliance",
              "href": "/cqc-compliance"
            },
            {
              "label": "Care Audits",
              "href": "/care-audits"
            }
          ],
          "image": "/images/uses/cqc-prep-questions/3.webp",
          "image_alt": "Screenshot slot Readiness by role"
        }
      ],
      "cards": [
        {
          "title": "Matched to the role",
          "body": "A nurse, a care assistant and a kitchen assistant get different questions, because they will be asked different questions."
        },
        {
          "title": "Sends them back to the policy",
          "body": "An answer is not supplied. The question points at the policy the answer comes from, so what is built is understanding."
        },
        {
          "title": "In their own language",
          "body": "Practising in a second language on the spot is a bad way to find out whether someone knows the answer."
        }
      ],
      "note": "General guidance, not legal advice. Regulatory requirements change and vary by service type. Check the current CQC guidance and your own registration conditions before relying on any of the above."
    },
    "faqs": [
      {
        "label": "The questions",
        "items": [
          {
            "question": "Where do the questions come from?",
            "answer": "They reflect what inspectors ask staff in practice, grouped by theme and matched to the role."
          },
          {
            "question": "Are model answers provided?",
            "answer": "No, deliberately. Each question points at the policy the answer comes from, because rehearsed answers are transparent and undermine confidence."
          },
          {
            "question": "Can we add our own?",
            "answer": "Yes, including questions specific to your service."
          }
        ]
      },
      {
        "label": "Coverage",
        "items": [
          {
            "question": "Which roles are covered?",
            "answer": "Care assistants, seniors, nurses, and the ancillary roles that are usually missed, including kitchen, maintenance and administration."
          },
          {
            "question": "Do agency staff need this?",
            "answer": "Anyone on shift can be spoken to, so a short core set for agency is sensible."
          },
          {
            "question": "How long does it take a staff member?",
            "answer": "Short sessions rather than one sitting, done on their own phone between tasks."
          }
        ]
      },
      {
        "label": "On the day",
        "items": [
          {
            "question": "Will this make our staff sound rehearsed?",
            "answer": "It should do the opposite, because there is nothing to rehearse. The practice sends them to the policy rather than to a script."
          },
          {
            "question": "Can we see who is ready?",
            "answer": "Yes, by role, which is how the uncovered groups surface."
          },
          {
            "question": "What if someone freezes anyway?",
            "answer": "That happens, and it is a normal human response. What preparation changes is whether they had ever considered the question before."
          }
        ]
      }
    ],
    "sort": 11
  },
  {
    "slug": "staff-onboarding",
    "title": "Get a new starter safe, trained and <em>signed off in their first week</em>",
    "meta_title": "Staff Onboarding | CareStreamAI",
    "meta_description": "Staff onboarding is the moment a service is most exposed. New people are on the floor before the paperwork catches up, and the evidence that they were ready is scattered across a folder, an inbox and somebody's memory.",
    "hero_image_url": "/images/uses/staff-onboarding/1.webp",
    "content": {
      "eyebrow": "User case",
      "lede": "Staff onboarding is the moment a service is most exposed. New people are on the floor before the paperwork catches up, and the evidence that they were ready is scattered across a folder, an inbox and somebody's memory.",
      "sections": [
        {
          "heading": "The first day pack builds itself",
          "bullets": [
            "Policies assigned by role, not a blanket send to everyone",
            "Read receipts against the exact version live that day",
            "On their own phone, no work email needed"
          ],
          "links": [
            {
              "label": "Care Policies",
              "href": "/care-policies"
            },
            {
              "label": "HR Policies",
              "href": "/hr-policies"
            },
            {
              "label": "Staff Hub",
              "href": "/staff-training"
            }
          ],
          "image": "/images/uses/staff-onboarding/1.webp",
          "image_alt": "Screenshot slot Staff hub, first day pack"
        },
        {
          "heading": "Training built from your own policies",
          "bullets": [
            "Adhoc modules generated from the policy they have just read",
            "CPD accredited annual courses for the statutory subjects",
            "Face to face sessions recorded on the same record as the online ones"
          ],
          "links": [
            {
              "label": "Adhoc Training",
              "href": "/training-platform"
            },
            {
              "label": "Annual Training",
              "href": "/staff-training"
            },
            {
              "label": "Face to Face",
              "href": "/training-platform"
            }
          ],
          "image": "/images/uses/staff-onboarding/2.webp",
          "image_alt": "Screenshot slot Module generated from a policy"
        },
        {
          "heading": "Sign off you can put in front of an inspector",
          "bullets": [
            "The training matrix shows the whole team and the gaps, live",
            "Competency observations sit alongside the completions",
            "CQC prep questions matched to the role, so they are ready to be asked"
          ],
          "links": [
            {
              "label": "Training Matrix",
              "href": "/training-platform"
            },
            {
              "label": "CQC Prep Questions",
              "href": "/cqc-staff-questions"
            },
            {
              "label": "Compliance",
              "href": "/cqc-compliance"
            }
          ],
          "image": "/images/uses/staff-onboarding/3.webp",
          "image_alt": "Screenshot slot Training matrix, gaps highlighted"
        }
      ],
      "cards": [
        {
          "title": "Nothing quietly gets missed",
          "body": "The role decides the pack. A nurse, a care assistant and a kitchen assistant each get what applies to them, assigned on their start date."
        },
        {
          "title": "They can actually read it",
          "body": "A new starter whose first language is not English reads every policy in their own, on their own phone, without asking anyone for help."
        },
        {
          "title": "Evidence assembles itself",
          "body": "Every read, score and observation lands in the matrix as it happens. Nobody reconstructs the first week six months later."
        }
      ],
      "note": "General guidance, not legal advice. Regulatory requirements change and vary by service type. Check the current CQC guidance and your own registration conditions before relying on any of the above."
    },
    "faqs": [
      {
        "label": "Getting started",
        "items": [
          {
            "question": "How long does it take to set up a sequence?",
            "answer": "An afternoon. Pick a role, tick the policies and modules that apply, set the day each is due, and every new starter in that role gets it automatically."
          },
          {
            "question": "Do we have to upload our policies first?",
            "answer": "Yes, and you can bulk upload the whole set in one go. Most services are through this in a session."
          },
          {
            "question": "What if we already use a paper induction booklet?",
            "answer": "Keep it. Face to face sessions and observed competencies are recorded against the same staff record, so the two do not live apart."
          }
        ]
      },
      {
        "label": "For the new starter",
        "items": [
          {
            "question": "Do they need a work email address?",
            "answer": "No. The staff hub works on their own phone and they can sign in without a password."
          },
          {
            "question": "Which languages are supported?",
            "answer": "More than sixty. They pick one and everything arrives in it."
          },
          {
            "question": "What if they cannot find the answer in a policy?",
            "answer": "They can ask in plain language and get an answer drawn from your policies with the source shown."
          }
        ]
      },
      {
        "label": "Evidence",
        "items": [
          {
            "question": "What can we show an inspector?",
            "answer": "The policies they were given, the version live at the time, when they read it, what they scored and who observed their competency."
          },
          {
            "question": "Does it prove understanding or only that they opened it?",
            "answer": "Both are recorded separately. A read receipt is a read receipt. Understanding is evidenced by the score and, for practical subjects, an observed competency."
          },
          {
            "question": "What happens if a policy changes mid induction?",
            "answer": "The new version goes to everyone it applies to and the record keeps both."
          }
        ]
      }
    ],
    "sort": 12
  },
  {
    "slug": "resident-knowledge",
    "title": "Give every carer what your longest serving staff <em>already know</em>",
    "meta_title": "Resident Knowledge | CareStreamAI",
    "meta_description": "A new starter meets a resident for the first time with a care plan and not much else. The things that actually make a shift go well, what she likes to be called, the food he will genuinely eat, the routine that settles her at night, live in the heads of the people who have been there years. CareStre",
    "hero_image_url": "/images/uses/resident-knowledge/1.webp",
    "content": {
      "eyebrow": "User case",
      "lede": "A new starter meets a resident for the first time with a care plan and not much else. The things that actually make a shift go well, what she likes to be called, the food he will genuinely eat, the routine that settles her at night, live in the heads of the people who have been there years. CareStream holds them in your knowledge base and answers questions about a resident by name.",
      "sections": [
        {
          "heading": "Write down what your team already knows",
          "bullets": [
            "Add an entry the way you would tell a colleague, in plain sentences",
            "Background, preferred name, food, routines, visitors, what settles them",
            "Kept apart from your policies and coloured so you can see it at a glance"
          ],
          "links": [
            {
              "label": "Care Policies",
              "href": "/care-policies"
            },
            {
              "label": "How It Works",
              "href": "/how-it-works"
            },
            {
              "label": "Regulatory Knowledge",
              "href": "/regulatory-knowledge"
            }
          ],
          "image": "/images/uses/resident-knowledge/1.webp",
          "image_alt": "Adding a resident entry in the knowledge base"
        },
        {
          "heading": "Staff ask by name, on their own phone",
          "bullets": [
            "A carer asks about the resident in front of them in plain words",
            "Answers come from what your team wrote, never from the internet",
            "Ask in any of sixty plus languages and get the answer back in it"
          ],
          "links": [
            {
              "label": "Staff Hub",
              "href": "/staff-training"
            },
            {
              "label": "60+ Languages",
              "href": "/languages"
            },
            {
              "label": "How Our AI Works",
              "href": "/rag"
            }
          ],
          "image": "/images/uses/resident-knowledge/2.webp",
          "image_alt": "A carer asking the hub about a resident and getting an answer"
        },
        {
          "heading": "Nothing is live until you approve it",
          "bullets": [
            "Every entry sits as pending until an admin has read it",
            "Revoke in one click if it stops being true, remove it when a resident leaves",
            "Approved and pending counts sit at the top of the page"
          ],
          "links": [
            {
              "label": "Trust & Security",
              "href": "/trust"
            },
            {
              "label": "Care Policies",
              "href": "/care-policies"
            },
            {
              "label": "How It Works",
              "href": "/how-it-works"
            }
          ],
          "image": "/images/uses/resident-knowledge/3.webp",
          "image_alt": "Approved resident entries in the knowledge base"
        }
      ],
      "cards": [
        {
          "title": "New starters begin from nothing",
          "body": "Someone on their first shift has read the care plan and met nobody. They do not know he was a signalman for thirty five years, or that she will not settle until the curtains are shut. They find out slowly, by getting it wrong first."
        },
        {
          "title": "Bank and agency repeat the same questions",
          "body": "Cover staff ask the same handful of questions every time they walk in, usually of whoever is busiest. When nobody has a minute they guess, and the resident has a worse evening than they needed to."
        },
        {
          "title": "It lives in people, not in records",
          "body": "The carer who knows a resident best is the one most likely to be on leave when it matters. Handover carries the clinical and the urgent. It has never been the place for the small things that make somebody feel known."
        }
      ],
      "note": "Resident knowledge sits alongside the care plan. It does not replace it, and nothing clinical or actionable should live here."
    },
    "faqs": [
      {
        "label": "Getting started",
        "items": [
          {
            "question": "How long does it take to add a resident?",
            "answer": "A couple of minutes. Write the question the way a carer would ask it, put everything worth knowing in the answer, and approve it. Most homes start with the residents who are hardest to settle, because that is where it pays back first."
          },
          {
            "question": "Who should write them?",
            "answer": "The people who know the residents best, usually your seniors and the carers who have been with you longest. It is worth half an hour in a team meeting rather than a project."
          },
          {
            "question": "Do we need to do all of them at once?",
            "answer": "No. One resident is useful on its own. The hub answers about whoever you have written up and says so plainly when it does not know."
          }
        ]
      },
      {
        "label": "For the carer",
        "items": [
          {
            "question": "How does a carer find it?",
            "answer": "They open the hub and ask. Once you have an approved resident entry the Policies and Procedures topic renames itself to Policies, Procedures and Residents, which is what prompts staff to try it."
          },
          {
            "question": "Does it work in other languages?",
            "answer": "Yes. A carer can ask in their own language and get the answer back in it, from the same entry your team wrote in English."
          },
          {
            "question": "What if an answer is wrong?",
            "answer": "Staff can flag it and an admin edits or revokes the entry. Because every answer comes from an entry a person wrote and approved, you can always see where it came from."
          }
        ]
      },
      {
        "label": "Records and privacy",
        "items": [
          {
            "question": "Is this a care record?",
            "answer": "Treat it as one. Put in what you would be comfortable any member of your staff reading, keep it accurate, and remove it when a resident leaves. It does not replace the care plan and is not a clinical record."
          },
          {
            "question": "Who can see it?",
            "answer": "Only staff signed in to your own hub. Nothing is shared with another home, and your data stays in the UK."
          },
          {
            "question": "What about consent?",
            "answer": "Handle it the way you handle life story work: involve the resident or their representative, record that you did, and keep to what is relevant to their care."
          }
        ]
      }
    ],
    "sort": 13
  }
]
