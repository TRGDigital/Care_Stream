// The 11 care-setting pages, exported from apps/web/src/lib/settings/<slug>.ts by importing
// the real modules (apps/web/scripts/export-setting-configs.ts), so this is exactly what the
// live pages render today. Nothing here was retyped or rewritten.
//
// It exists so the copy can move into the database and be edited in the console. Once a page
// is seeded, the row is what the site renders; the TypeScript config stays as the fallback for
// a page with no row, and as the thing this seed is generated from.
//
// `config` carries structural fields too (icon keys, the slug) because they are part of the
// same object. The console deliberately exposes only the words.

export interface SettingPageSeed {
  slug: string
  label: string
  sort: number
  config: Record<string, unknown>
}

export const SETTING_PAGE_SEEDS: SettingPageSeed[] = [
  {
    "slug": "residential-care",
    "label": "Residential Care Homes",
    "sort": 0,
    "config": {
      "slug": "residential-care",
      "label": "Residential Care Homes",
      "settingNoun": "residential care home",
      "navDescription": "24/7 policy access for care assistants and seniors, in any language, with CQC evidence that builds itself.",
      "iconKey": "home",
      "meta": {
        "title": "CareStream for Residential Care Homes",
        "description": "CareStream gives care assistants and senior carers instant access to your care and HR policies, training, audits and CQC tools, in any language, on every shift, with every query logged for inspection.",
        "ogDescription": "Instant access to your care policies, training and CQC tools for care assistants and seniors, in any language, on every shift."
      },
      "hero": {
        "h1": "The right answer for your care team, on every shift, in every language they speak.",
        "subtitle": "Residential homes deliver personal care around the clock, often with a high turnover of staff, regular agency cover and a workforce that speaks many languages. CareStream gives every care assistant and senior carer instant access to your care and HR policies, training and CQC tools, grounded in your own documents."
      },
      "mockup": {
        "orgName": "Oakfield Residential Home",
        "badge": "Night shift",
        "tabs": [
          "Policies",
          "Handbook",
          "Training",
          "CQC"
        ],
        "question": "A resident has had a fall, what do I need to do?",
        "policyName": "From your Falls Management Policy",
        "answer": "Do not move the resident if a serious injury is suspected. Reassure them, check for injury, call the senior on shift, and complete a body map and an incident form.",
        "citation": "Falls Policy v3.1 · Section 2",
        "followups": [
          "When do I call 999?",
          "Where do I record this?"
        ]
      },
      "challenge": {
        "h2": "Personal care around the clock, a changing team, and a watchful regulator.",
        "para1": "A care assistant on a night shift, with no manager on site, needs a clear answer about a resident who has had a fall. A new starter is unsure how to support a resident with dementia who is distressed. A staff member whose first language is not English struggles to follow a written procedure while a call bell is ringing.",
        "para2": "Residential homes deliver personal care to vulnerable people every hour of the day, and CQC looks closely at how staff keep residents safe, caring and well-led. CareStream closes the gap between the procedure on paper and the practice on the floor, for every member of the team, at any hour.",
        "items": [
          {
            "iconKey": "clock",
            "title": "Care needed around the clock",
            "body": "Questions about falls, medication support and safeguarding come up at 3am, when there is no manager on site to ask."
          },
          {
            "iconKey": "refresh",
            "title": "High turnover and agency cover",
            "body": "New starters and agency carers need consistent answers from the same approved procedures, from their very first shift."
          },
          {
            "iconKey": "globe",
            "title": "A multilingual workforce",
            "body": "A large part of the care workforce speaks English as a second language and needs guidance they can follow under pressure."
          },
          {
            "iconKey": "shield",
            "title": "Close CQC scrutiny",
            "body": "Inspectors look hard at how staff keep residents safe, deliver caring support and follow your policies in practice."
          }
        ]
      },
      "servicesH2": "One platform for everyday answers, training, audits and CQC.",
      "serviceDescriptions": {
        "policies": "Personal care procedures answerable at the point of care, in any language, with the source policy and version cited.",
        "hr": "Your staff handbook on demand for your care team. Leave, pay and employment questions answered 24/7.",
        "training": "Modules built from your own care policies, delivered in the hub, with renewal reminders for mandatory training.",
        "audits": "Guided audits for medication support, infection control, falls and care planning, scored as you go and inspection-ready.",
        "cqc": "Evidence that builds itself, plus regulation coverage showing where your policies leave a gap.",
        "staffq": "Prepare your care assistants and seniors for the conversations inspectors have on the floor.",
        "reportchat": "Upload your inspection report and chat with it, cross-referenced against your own policies.",
        "continuity": "Make your continuity information instantly reachable by every member of staff, on any shift."
      },
      "scenarios": {
        "h2": "How your residential home uses CareStream, day to day.",
        "sub": "CareStream is not another system your team has to remember to use. It fits the moments that already happen on every shift, and gives the right answer at the moment it matters.",
        "items": [
          {
            "tag": "On a night shift",
            "body": "A care assistant finds a resident on the floor after a fall, with no manager on site. Rather than guess, they ask CareStream and get your exact falls steps, drawn from your own policy, in seconds. They reassure the resident, complete a body map and an incident form, and escalate correctly."
          },
          {
            "tag": "A new starter finding their feet",
            "body": "A care assistant on their first week is not yet sure of your local processes. Instead of interrupting the senior or guessing, they ask the hub and receive your approved procedure every time, so their practice matches the rest of the team from their very first shift."
          },
          {
            "tag": "During a medication round",
            "body": "A senior carer is unsure whether a resident can have a PRN painkiller, or how to record a refused dose. They check the medication support policy in the hub at the trolley, see the answer with the source, and complete the MAR chart correctly."
          },
          {
            "tag": "When a resident is distressed",
            "body": "A resident with dementia becomes anxious and resistant to personal care in the evening. A carer checks your approach to behaviour that challenges and dementia care, and responds calmly and consistently, the same way every member of the team would."
          },
          {
            "tag": "In a language they are confident in",
            "body": "A carer whose first language is Romanian asks a moving-and-handling question by voice, in Romanian, and listens to the answer read back. The guidance is exactly the same as an English-speaking colleague would receive."
          },
          {
            "tag": "Getting ready for inspection",
            "body": "Before an inspection, the registered manager sends CQC practice questions to the team, reviews who has answered, and checks the regulation coverage report to see where a policy needs strengthening, all before the inspector arrives."
          }
        ]
      },
      "deepDive": {
        "label": "Personal Care, On Demand",
        "h2": "Your everyday care procedures, answered the moment they are needed.",
        "para1": "Staff ask a question in plain language and get the answer from your own care policy, with the source and version shown. No hunting through a folder, no waiting for the senior to be free, and no guessing while a call bell rings.",
        "para2": "Because every answer is grounded in your documents and cites them, your care assistants and senior carers act on the same approved guidance, every time, whoever is on shift.",
        "chips": [
          "Moving and handling",
          "Falls management",
          "Safeguarding",
          "Medication support and MAR charts",
          "Nutrition and hydration",
          "Continence care",
          "Dementia and behaviour that challenges",
          "End-of-life care"
        ],
        "panelH3": "In the language your team thinks in.",
        "panelBody": "Your policies stay in English. A care assistant can ask in Polish, Tagalog, Romanian or any of over 60 languages, by typing or speaking, and hear the answer read back in the same language. Nobody is held back by a written procedure they find hard to follow at speed.",
        "points": [
          "Over 60 languages, detected automatically",
          "Speak the question and listen to the answer",
          "The same accurate guidance for every member of the team"
        ]
      },
      "outcomes": {
        "h2": "Safer care, a confident team, and inspection evidence that builds itself.",
        "items": [
          {
            "iconKey": "home",
            "title": "Answers on every shift",
            "body": "Staff get approved guidance at the point of care, day or night, even when no manager is on site."
          },
          {
            "iconKey": "users",
            "title": "Consistent care across the team",
            "body": "Care assistants and senior carers act on the same procedures, so residents get consistent care regardless of who is on shift."
          },
          {
            "iconKey": "globe",
            "title": "A workforce supported in its own language",
            "body": "Every member of the team understands your procedures, whatever language they are most confident in."
          },
          {
            "iconKey": "graduation",
            "title": "Mandatory training kept current",
            "body": "Training built from your own policies, with automatic renewal reminders and a live compliance dashboard."
          },
          {
            "iconKey": "chart",
            "title": "Inspection evidence on tap",
            "body": "Every query is logged, and your CQC readiness builds itself from real, day-to-day policy use."
          },
          {
            "iconKey": "refresh",
            "title": "New and agency staff up to speed fast",
            "body": "A new starter can ask your exact procedures from day one, instead of relying on whoever is nearby."
          }
        ]
      },
      "cqc": {
        "h2": "Built around the areas inspectors look at most.",
        "intro": "Residential homes are assessed closely on whether residents are safe, well cared for and well-led. CareStream gives you evidence that your policies are live and in use, prepares your team for inspector conversations, and shows you where your policies leave a gap before an inspection finds it.",
        "cards": [
          {
            "iconKey": "chart",
            "title": "Evidence of policy use",
            "body": "Every policy query is logged by role, language and date, building a CQC Readiness Report you can download as a PDF."
          },
          {
            "iconKey": "staffq",
            "title": "Staff ready to be asked",
            "body": "Inspector-style questions across the five key questions, answered by staff in their own words and scored by AI, with review and retry."
          },
          {
            "iconKey": "shield",
            "title": "Regulation coverage",
            "body": "CareStream reads the content of your policies and shows which regulations are covered, partly covered, or a gap."
          }
        ]
      },
      "faqs": [
        {
          "question": "Can it answer everyday care questions, not just admin policies?",
          "answer": "Yes. CareStream answers from the documents you upload, including your care procedures. A care assistant can ask about a fall, moving and handling, continence care or your safeguarding steps and get an answer drawn from your own policy, with the source and version shown so they can check it."
        },
        {
          "question": "We use a lot of agency and new staff. Does it help?",
          "answer": "Yes. A new starter or an agency carer can ask your exact procedures from their first shift, in plain language, and get the approved answer every time. This means consistent care across the team, even with a workforce that changes often."
        },
        {
          "question": "Our team speaks many languages. Does it help?",
          "answer": "Yes. Staff can ask in over 60 languages and get the answer back in the same language, while your policies stay in English. This is a real help for the international care workforce in most homes."
        },
        {
          "question": "How does it help with mandatory training and renewals?",
          "answer": "CareStream can build training modules from your own policies, deliver them in the hub, and send automatic renewal reminders at 90, 30 and 7 days, with a live compliance dashboard so you can see exactly who is current and who is due."
        },
        {
          "question": "Is resident information kept private and secure?",
          "answer": "Yes. Your library is stored in an isolated environment for your home alone, is never used to train AI models, and is never shared with other organisations. Data is encrypted at rest and in transit, and every query is logged for your audit trail."
        },
        {
          "question": "How quickly can a residential home get started?",
          "answer": "Most homes are up and running the same day. You upload your policies, invite your team with a one-tap sign-in link, and staff can begin asking questions straight away."
        }
      ],
      "cta": {
        "heading": "Give your whole care team the right answer, on every shift.",
        "sub": "See how CareStream works for your residential care home."
      }
    }
  },
  {
    "slug": "nursing-homes",
    "label": "Nursing Homes",
    "sort": 1,
    "config": {
      "slug": "nursing-homes",
      "label": "Nursing Homes",
      "settingNoun": "nursing home",
      "navDescription": "Clinical answers at the bedside for your mixed nursing and care team, in any language, on every shift.",
      "iconKey": "stethoscope",
      "meta": {
        "title": "CareStream for Nursing Homes",
        "description": "CareStream gives nursing and care teams instant access to your clinical and care policies, training, audits and CQC tools, in any language, on every shift, with every query logged for inspection.",
        "ogDescription": "Instant access to clinical procedures, training and CQC tools for your whole nursing team, in any language, on every shift."
      },
      "hero": {
        "h1": "Clinical answers at the bedside, on every shift, in every language your team speaks.",
        "subtitle": "Nursing homes carry clinical risk around the clock, with a mixed team of registered nurses and care assistants and a workforce that often speaks many languages. CareStream gives every member of your team instant access to your clinical and care policies, training and CQC tools, grounded in your own documents."
      },
      "mockup": {
        "orgName": "Crossways Nursing Home",
        "badge": "Night shift",
        "tabs": [
          "Policies",
          "Handbook",
          "Training",
          "CQC"
        ],
        "question": "What are the early warning signs of sepsis I should escalate?",
        "policyName": "From your Sepsis and Deteriorating Resident Policy",
        "answer": "Escalate immediately for a new high NEWS2 score, raised respiratory rate, low blood pressure, new confusion or mottled skin. Inform the nurse in charge and follow the escalation pathway.",
        "citation": "Sepsis Policy v2.4 · Section 3",
        "followups": [
          "What is the NEWS2 threshold?",
          "Who do I call overnight?"
        ]
      },
      "challenge": {
        "h2": "Clinical complexity, a mixed team, and a regulator that looks closely.",
        "para1": "A care assistant on a night shift needs a clear answer about a deteriorating resident, but the nurse in charge is busy and the policy folder is in the office. A new registered nurse is unsure of your exact escalation pathway. A staff member whose first language is not English struggles to follow a written procedure under pressure.",
        "para2": "Nursing homes face the most clinical scrutiny at inspection, particularly under the Safe and Effective key questions. CareStream closes the gap between the procedure on paper and the practice on the floor, for every member of the team, at any hour.",
        "items": [
          {
            "iconKey": "clock",
            "title": "Around-the-clock clinical risk",
            "body": "Questions about medicines, deterioration and end-of-life care come up at 3am, not only during the day."
          },
          {
            "iconKey": "users",
            "title": "A mixed nursing and care team",
            "body": "Registered nurses and care assistants need consistent answers from the same approved procedures."
          },
          {
            "iconKey": "globe",
            "title": "A multilingual workforce",
            "body": "A large part of the nursing and care workforce speaks English as a second language."
          },
          {
            "iconKey": "shield",
            "title": "Close CQC scrutiny",
            "body": "Inspectors look hard at clinical safety, medicines and how staff apply your policies in practice."
          }
        ]
      },
      "servicesH2": "One platform for clinical answers, training, audits and CQC.",
      "serviceDescriptions": {
        "policies": "Clinical and care procedures answerable at the bedside, in any language, with the source policy and version cited.",
        "hr": "Your staff handbook on demand for your nursing and care team. Leave, pay and employment questions answered 24/7.",
        "training": "Modules built from your own clinical policies, delivered in the hub, with renewal reminders for mandatory training.",
        "audits": "Guided audits for medicines, infection control, falls and pressure care, scored as you go and inspection-ready.",
        "cqc": "Evidence that builds itself, plus regulation coverage showing where your policies leave a gap.",
        "staffq": "Prepare your registered nurses and carers for the conversations inspectors have on the floor.",
        "reportchat": "Upload your inspection report and chat with it, cross-referenced against your own policies.",
        "continuity": "Make your continuity information instantly reachable by every member of staff, on any shift."
      },
      "scenarios": {
        "h2": "How your nursing home uses CareStream, day to day.",
        "sub": "CareStream is not another system your team has to remember to use. It fits the moments that already happen on every shift, and gives the right answer at the moment it matters.",
        "items": [
          {
            "tag": "On a night shift",
            "body": "A care assistant notices a resident becoming drowsy and harder to rouse. Rather than wait for the nurse in charge to be free, they ask CareStream and get your exact deterioration and escalation steps, drawn from your own policy, in seconds. They act with confidence and the resident is reviewed sooner."
          },
          {
            "tag": "A new nurse settling in",
            "body": "A newly registered nurse is not yet sure of your local processes. Instead of interrupting colleagues or guessing, they ask the hub and receive your approved procedure every time, so their practice matches the rest of the team from their very first shift."
          },
          {
            "tag": "During the medicines round",
            "body": "A senior carer is unsure whether a PRN protocol applies, or how a covert medication should be handled. They check the medicines policy in the hub at the trolley, see the answer with the source, and record it correctly."
          },
          {
            "tag": "When a relative asks a question",
            "body": "A family member asks about visiting during an outbreak, or about your approach to end-of-life care. Any member of staff can check the relevant policy and answer clearly and consistently, rather than promising to find out and get back to them."
          },
          {
            "tag": "In a language they are confident in",
            "body": "A carer whose first language is Romanian asks a moving-and-handling question by voice, in Romanian, and listens to the answer read back. The guidance is exactly the same as an English-speaking colleague would receive."
          },
          {
            "tag": "Getting ready for inspection",
            "body": "Before an inspection, the registered manager sends CQC practice questions to the team, reviews who has answered, and checks the regulation coverage report to see where a policy needs strengthening, all before the inspector arrives."
          }
        ]
      },
      "deepDive": {
        "label": "At the Point of Care",
        "h2": "Your clinical procedures, answered the moment they are needed.",
        "para1": "Staff ask a question in plain language and get the answer from your own clinical policy, with the source and version shown. No hunting through a folder, no waiting until morning, and no guessing.",
        "para2": "Because every answer is grounded in your documents and cites them, your registered nurses and care assistants act on the same approved guidance, every time.",
        "chips": [
          "Medicines and MAR charts",
          "Sepsis and NEWS2 escalation",
          "Wound and pressure care",
          "Syringe drivers",
          "Catheter care",
          "Falls management",
          "PEG feeding",
          "End-of-life and anticipatory medicines"
        ],
        "panelH3": "In the language your team thinks in.",
        "panelBody": "Your policies stay in English. A nurse or carer can ask in Polish, Tagalog, Romanian or any of over 60 languages, by typing or speaking, and hear the answer read back in the same language. Nobody is held back by a written procedure they find hard to follow at speed.",
        "points": [
          "Over 60 languages, detected automatically",
          "Speak the question and listen to the answer",
          "The same accurate guidance for every member of the team"
        ]
      },
      "outcomes": {
        "h2": "Safer practice, a confident team, and inspection evidence that builds itself.",
        "items": [
          {
            "iconKey": "stethoscope",
            "title": "Clinical answers on every shift",
            "body": "Staff get approved guidance at the point of care, day or night, without waiting for the nurse in charge."
          },
          {
            "iconKey": "users",
            "title": "Consistent practice across the team",
            "body": "Registered nurses and care assistants act on the same procedures, so practice is consistent regardless of who is on shift."
          },
          {
            "iconKey": "globe",
            "title": "A workforce supported in its own language",
            "body": "Every member of the team understands your procedures, whatever language they are most confident in."
          },
          {
            "iconKey": "graduation",
            "title": "Mandatory training kept current",
            "body": "Training built from your own policies, with automatic renewal reminders and a live compliance dashboard."
          },
          {
            "iconKey": "chart",
            "title": "Inspection evidence on tap",
            "body": "Every query is logged, and your CQC readiness builds itself from real, day-to-day policy use."
          },
          {
            "iconKey": "clock",
            "title": "New and agency nurses up to speed fast",
            "body": "A new starter can ask your exact procedures from day one, instead of relying on whoever is nearby."
          }
        ]
      },
      "cqc": {
        "h2": "Built around the areas inspectors look at most.",
        "intro": "Nursing homes are assessed closely on clinical safety and effectiveness. CareStream gives you evidence that your policies are live and in use, prepares your team for inspector conversations, and shows you where your policies leave a gap before an inspection finds it.",
        "cards": [
          {
            "iconKey": "chart",
            "title": "Evidence of policy use",
            "body": "Every policy query is logged by role, language and date, building a CQC Readiness Report you can download as a PDF."
          },
          {
            "iconKey": "staffq",
            "title": "Staff ready to be asked",
            "body": "Inspector-style questions across the five key questions, answered by staff in their own words and scored by AI, with review and retry."
          },
          {
            "iconKey": "shield",
            "title": "Regulation coverage",
            "body": "CareStream reads the content of your policies and shows which regulations are covered, partly covered, or a gap."
          }
        ]
      },
      "faqs": [
        {
          "question": "Can it answer clinical procedure questions, not just admin policies?",
          "answer": "Yes. CareStream answers from the documents you upload, including your clinical and care procedures. A nurse can ask about wound care, a syringe driver, catheter care or your sepsis pathway and get an answer drawn from your own policy, with the source and version shown so they can check it."
        },
        {
          "question": "Does it replace clinical judgement or training?",
          "answer": "No. CareStream points staff to your own approved procedures and guidance. It supports professional judgement and your training, it does not replace them, and every answer cites the policy it came from."
        },
        {
          "question": "Our team speaks many languages. Does it help?",
          "answer": "Yes. Staff can ask in over 60 languages and get the answer back in the same language, while your policies stay in English. This is a real help for the international nursing and care workforce in most homes."
        },
        {
          "question": "How does it help with mandatory training and renewals?",
          "answer": "CareStream can build training modules from your own policies, deliver them in the hub, and send automatic renewal reminders at 90, 30 and 7 days, with a live compliance dashboard so you can see exactly who is current and who is due."
        },
        {
          "question": "Is resident and clinical information kept private and secure?",
          "answer": "Yes. Your library is stored in an isolated environment for your home alone, is never used to train AI models, and is never shared with other organisations. Data is encrypted at rest and in transit, and every query is logged for your audit trail."
        },
        {
          "question": "How quickly can a nursing home get started?",
          "answer": "Most homes are up and running the same day. You upload your policies, invite your team with a one-tap sign-in link, and staff can begin asking questions straight away."
        }
      ],
      "cta": {
        "heading": "Give your whole nursing team the right answer, on every shift.",
        "sub": "See how CareStream works for your nursing home."
      }
    }
  },
  {
    "slug": "domiciliary-care",
    "label": "Domiciliary Care",
    "sort": 2,
    "config": {
      "slug": "domiciliary-care",
      "label": "Domiciliary Care",
      "settingNoun": "domiciliary care service",
      "iconKey": "mapPin",
      "navDescription": "Approved answers for lone care workers in clients’ homes, on any phone, in any language.",
      "meta": {
        "title": "CareStream for Domiciliary Care",
        "description": "CareStream gives lone care workers instant access to your care and HR policies, training, audits and CQC tools, on their own phone, in any language, in any client’s home, with every query logged for inspection.",
        "ogDescription": "Approved answers for dispersed lone care workers, on their own phone, in any language, in any client’s home."
      },
      "hero": {
        "h1": "Approved answers in your client’s home, on the phone in your worker’s pocket.",
        "subtitle": "Domiciliary care workers are out on rounds all day, often alone in a client’s home with no colleague or office nearby. CareStream puts your care and HR policies, training and CQC tools in the hub on their own phone, grounded in your own documents, so the right answer is always within reach wherever they are."
      },
      "mockup": {
        "orgName": "Bluebird Home Care",
        "badge": "On a visit",
        "tabs": [
          "Policies",
          "Handbook",
          "Training",
          "CQC"
        ],
        "question": "My client is refusing their medication, what should I do?",
        "policyName": "From your Medication Policy",
        "answer": "Do not force or hide medication unless a specific covert plan is in place. Record the refusal, try again later if appropriate, and report it to the office and the GP if it continues.",
        "citation": "Medication Policy v2.0 · Section 5",
        "followups": [
          "How do I report a missed dose?",
          "Who do I call out of hours?"
        ]
      },
      "challenge": {
        "h2": "A dispersed team, lone working, and a regulator that still expects consistency.",
        "para1": "A care worker is alone in a client’s home and the client is refusing their medication, but there is no colleague to ask and the office line is engaged. A new worker is unsure how to record a missed visit. A worker whose first language is not English struggles to follow a written procedure on their own under pressure.",
        "para2": "Domiciliary care is delivered out of sight, in dozens of separate homes, by people who are usually working alone. CareStream closes the gap between the procedure on paper and the practice on the doorstep, for every worker, on every round, on the phone already in their pocket.",
        "items": [
          {
            "iconKey": "mapPin",
            "title": "Lone working, out on rounds",
            "body": "Workers are alone in clients’ homes all day, with no colleague nearby and no office to walk into."
          },
          {
            "iconKey": "pill",
            "title": "Medication in the home",
            "body": "Refusals, missed doses and covert questions come up at the doorstep, far from any senior to ask."
          },
          {
            "iconKey": "globe",
            "title": "A multilingual workforce",
            "body": "A large part of the care workforce speaks English as a second language and works without support."
          },
          {
            "iconKey": "shield",
            "title": "CQC across many homes",
            "body": "Inspectors expect consistent, safe practice across every worker and every visit, however dispersed."
          }
        ]
      },
      "servicesH2": "One platform for care answers, training, audits and CQC, on every round.",
      "serviceDescriptions": {
        "policies": "Care procedures answerable in the client’s home, in any language, with the source policy and version cited.",
        "hr": "Your staff handbook on demand for workers out on rounds. Travel, pay and lone-working questions answered 24/7.",
        "training": "Modules built from your own care policies, delivered in the hub on the phone, with renewal reminders for mandatory training.",
        "audits": "Guided audits for medication, infection prevention and care records, scored as you go and inspection-ready.",
        "cqc": "Evidence that builds itself, plus regulation coverage showing where your policies leave a gap.",
        "staffq": "Prepare your care workers for the conversations inspectors have about practice in the home.",
        "reportchat": "Upload your inspection report and chat with it, cross-referenced against your own policies.",
        "continuity": "Make your continuity information instantly reachable by every worker, wherever they are on their round."
      },
      "scenarios": {
        "h2": "How your domiciliary care service uses CareStream, visit to visit.",
        "sub": "CareStream is not another system your workers have to remember when they are back at base. It lives on their own phone and gives the right answer at the doorstep, in the moments that already happen on every round.",
        "items": [
          {
            "tag": "Alone on a visit",
            "body": "A worker is alone with a client who is refusing their medication. Rather than wait on hold to the office, they ask CareStream and get your exact steps on refusals and recording, drawn from your own medication policy, in seconds. They act correctly and report it through the right channel."
          },
          {
            "tag": "A new worker on rounds",
            "body": "A newly started care worker is not yet sure how your service handles a missed or late visit. Instead of guessing in the client’s home, they ask the hub and receive your approved procedure every time, so their practice matches the rest of the team from their very first round."
          },
          {
            "tag": "Moving and handling on the doorstep",
            "body": "A worker arriving for a transfer is unsure whether the client’s mobility has changed since the care plan was written. They check your moving-and-handling policy in the hub before they begin, see the answer with the source, and keep both themselves and the client safe."
          },
          {
            "tag": "When a relative asks a question",
            "body": "A family member at the home asks about your approach to a safeguarding concern or to end-of-life care. The worker can check the relevant policy on their phone and answer clearly and consistently, rather than promising to find out and ring back later."
          },
          {
            "tag": "In a language they are confident in",
            "body": "A worker whose first language is Romanian asks an infection-prevention question by voice, in Romanian, and listens to the answer read back. The guidance is exactly the same as an English-speaking colleague would receive."
          },
          {
            "tag": "Getting ready for inspection",
            "body": "Before an inspection, the registered manager sends CQC practice questions to workers out in the field, reviews who has answered, and checks the regulation coverage report to see where a policy needs strengthening, all before the inspector arrives."
          }
        ]
      },
      "deepDive": {
        "label": "Approved Answers, Wherever Your Staff Are",
        "h2": "Your care procedures, answered in the home, on the worker’s own phone.",
        "para1": "A lone worker asks a question in plain language and gets the answer from your own care policy, with the source and version shown. No hunting through a folder left at base, no waiting on hold to the office, and no guessing on the doorstep.",
        "para2": "Because the hub installs on their own phone and every answer is grounded in your documents and cites them, dispersed workers act on the same approved guidance, in every client’s home, every time.",
        "chips": [
          "Lone working",
          "Medication in the home",
          "Moving and handling",
          "Safeguarding",
          "Missed and late visits",
          "Infection prevention",
          "End-of-life care at home",
          "The client’s care plan"
        ],
        "panelH3": "In the language your team thinks in.",
        "panelBody": "Your policies stay in English. A worker can ask in Polish, Tagalog, Romanian or any of over 60 languages, by typing or speaking, and hear the answer read back in the same language. Nobody is held back by a written procedure they find hard to follow alone, at speed, in a client’s home.",
        "points": [
          "Over 60 languages, detected automatically",
          "Speak the question and listen to the answer",
          "The same accurate guidance for every worker on every round"
        ]
      },
      "outcomes": {
        "h2": "Safer visits, a confident lone workforce, and inspection evidence that builds itself.",
        "items": [
          {
            "iconKey": "mapPin",
            "title": "Answers in every client’s home",
            "body": "Workers get approved guidance at the doorstep, on any round, without waiting on hold to the office."
          },
          {
            "iconKey": "users",
            "title": "Consistent practice across the team",
            "body": "Every care worker acts on the same procedures, so practice is consistent across dozens of separate homes."
          },
          {
            "iconKey": "globe",
            "title": "A workforce supported in its own language",
            "body": "Every worker understands your procedures, whatever language they are most confident in, even when alone."
          },
          {
            "iconKey": "graduation",
            "title": "Mandatory training kept current",
            "body": "Training built from your own policies, delivered on the phone, with automatic renewal reminders and a live compliance dashboard."
          },
          {
            "iconKey": "chart",
            "title": "Inspection evidence on tap",
            "body": "Every query is logged, and your CQC readiness builds itself from real, day-to-day policy use in the field."
          },
          {
            "iconKey": "clock",
            "title": "New workers up to speed fast",
            "body": "A new starter can ask your exact procedures from their first round, instead of relying on whoever they can reach."
          }
        ]
      },
      "cqc": {
        "h2": "Built around the areas inspectors look at most.",
        "intro": "Domiciliary care is assessed on whether safe, consistent practice reaches every client’s home, even though no manager is there to see it. CareStream gives you evidence that your policies are live and in use across your dispersed team, prepares your workers for inspector conversations, and shows you where your policies leave a gap before an inspection finds it.",
        "cards": [
          {
            "iconKey": "chart",
            "title": "Evidence of policy use",
            "body": "Every policy query is logged by role, language and date, building a CQC Readiness Report you can download as a PDF."
          },
          {
            "iconKey": "staffq",
            "title": "Staff ready to be asked",
            "body": "Inspector-style questions across the five key questions, answered by workers in their own words and scored by AI, with review and retry."
          },
          {
            "iconKey": "shield",
            "title": "Regulation coverage",
            "body": "CareStream reads the content of your policies and shows which regulations are covered, partly covered, or a gap."
          }
        ]
      },
      "faqs": [
        {
          "question": "Can lone workers use it out in clients’ homes, away from the office?",
          "answer": "Yes. The hub installs on each worker’s own phone like an app, with a one-tap passwordless sign-in. They can ask a question and get an answer from your own policies in any client’s home, with the source and version shown so they can check it, without needing to ring the office or return to base."
        },
        {
          "question": "Does it replace the office, the on-call line or professional judgement?",
          "answer": "No. CareStream points workers to your own approved procedures and guidance, and tells them when to report or escalate through your usual channels. It supports professional judgement and your on-call arrangements, it does not replace them, and every answer cites the policy it came from."
        },
        {
          "question": "Our workers speak many languages. Does it help?",
          "answer": "Yes. Workers can ask in over 60 languages and get the answer back in the same language, while your policies stay in English. This is a real help for the international care workforce in most domiciliary services, especially when working alone."
        },
        {
          "question": "How does it help with mandatory training and renewals?",
          "answer": "CareStream can build training modules from your own policies, deliver them in the hub on the worker’s phone, and send automatic renewal reminders at 90, 30 and 7 days, with a live compliance dashboard so you can see exactly who is current and who is due, however spread out your team is."
        },
        {
          "question": "Is client and care information kept private and secure?",
          "answer": "Yes. Your library is stored in an isolated environment for your service alone, is never used to train AI models, and is never shared with other organisations. Data is encrypted at rest and in transit, and every query is logged for your audit trail."
        },
        {
          "question": "How quickly can a domiciliary care service get started?",
          "answer": "Most services are up and running the same day. You upload your policies, invite your workers with a one-tap sign-in link they open on their own phone, and they can begin asking questions out on their rounds straight away."
        }
      ],
      "cta": {
        "heading": "Give every lone worker the right answer, in every client’s home.",
        "sub": "See how CareStream works for your domiciliary care service."
      }
    }
  },
  {
    "slug": "live-in-care",
    "label": "Live-in Care Providers",
    "sort": 3,
    "config": {
      "slug": "live-in-care",
      "label": "Live-in Care Providers",
      "settingNoun": "live-in care service",
      "navDescription": "A constant source of approved answers for carers living and working alone in a client’s home.",
      "iconKey": "home",
      "meta": {
        "title": "CareStream for Live-in Care Providers",
        "description": "CareStream gives your live-in carers instant access to your policies, the client’s care plan, training and CQC tools from their own phone, in any language, at any hour, even when they are the only carer in the home.",
        "ogDescription": "Instant, approved answers for live-in carers working alone in a client’s home, in any language, at any hour of the day or night."
      },
      "hero": {
        "h1": "A colleague in their pocket, for the carer who is working alone.",
        "subtitle": "A live-in carer often lives and works alone in a client’s home, with no colleague nearby to ask, on placements that run day and night. CareStream puts your policies, the client’s care plan, training and CQC tools on the carer’s phone, grounded in your own documents, so a confident answer is always within reach."
      },
      "mockup": {
        "orgName": "Hartwell Live-in Care",
        "badge": "Overnight",
        "tabs": [
          "Policies",
          "Handbook",
          "Training",
          "CQC"
        ],
        "question": "My client seems confused and more breathless than usual tonight",
        "policyName": "From your Deteriorating Health Policy",
        "answer": "Reassure your client and check for signs that need urgent help. Contact the on-call manager. If you are worried about their breathing or they are seriously unwell, call 999 and follow the escalation steps.",
        "citation": "Deterioration Policy v1.3 · Section 2",
        "followups": [
          "When should I call 999?",
          "Who is on call tonight?"
        ]
      },
      "challenge": {
        "h2": "One carer, alone in a client’s home, with no colleague to turn to.",
        "para1": "A live-in carer is often the only person in the home. At two in the morning their client becomes confused and breathless, and there is nobody in the next room to ask. A carer on a long placement is unsure whether a medication can be given, or how to record a concern, and the office is closed. A carer whose first language is not English struggles to follow a written procedure under pressure.",
        "para2": "Live-in care is delivered out of sight of colleagues and managers, yet the care manager is still accountable for it and the CQC still inspects it. CareStream closes the gap between the procedure on paper and the carer on their own in the home, at any hour, in the language they are most confident in.",
        "items": [
          {
            "iconKey": "home",
            "title": "Working alone in the home",
            "body": "A live-in carer is frequently the only carer present, with no colleague nearby to check a procedure with."
          },
          {
            "iconKey": "clock",
            "title": "Long placements, day and night",
            "body": "Questions about deterioration, medication and emergencies come up overnight and at weekends, not only in office hours."
          },
          {
            "iconKey": "globe",
            "title": "A multilingual carer workforce",
            "body": "Many live-in carers speak English as a second language and find a written procedure hard to follow at speed."
          },
          {
            "iconKey": "shield",
            "title": "Care delivered out of sight",
            "body": "Care happens inside a private home, so the manager needs confidence that approved guidance is always to hand."
          }
        ]
      },
      "servicesH2": "One platform for approved answers, the care plan, training and CQC.",
      "serviceDescriptions": {
        "policies": "Your care procedures answerable in the home, in any language, with the source policy and version cited so the carer can check it.",
        "hr": "Your staff handbook on demand. Questions about placements, breaks, pay and time off answered 24/7, wherever the carer is.",
        "training": "Modules built from your own policies, delivered in the hub, with renewal reminders so mandatory training never lapses on a long placement.",
        "audits": "Guided audits for medication, the care environment and record keeping, scored as you go and ready to print.",
        "cqc": "Evidence that builds itself from real carer questions, plus regulation coverage showing where your policies leave a gap.",
        "staffq": "Prepare your live-in carers for the conversations inspectors have, even when they work out in clients’ homes.",
        "reportchat": "Upload your inspection report and chat with it, cross-referenced against your own policies.",
        "continuity": "Make your continuity information instantly reachable by a carer working alone, whatever happens in the home."
      },
      "scenarios": {
        "h2": "How your live-in carers use CareStream, day to day.",
        "sub": "CareStream is not another system a carer has to remember to open. It lives on their phone and fits the moments that already happen on a placement, giving the right answer at the moment it matters, even with nobody else in the home.",
        "items": [
          {
            "tag": "Alone overnight",
            "body": "A carer notices their client is more confused and breathless than usual in the early hours. With no colleague to ask, they put the question to CareStream and get your exact deterioration and escalation steps, drawn from your own policy, in seconds. They reassure the client, contact the on-call manager, and know when to call 999."
          },
          {
            "tag": "During a medication round",
            "body": "A carer is unsure whether a PRN medicine applies, or how to handle a missed dose. They check the medication policy in the hub at the client’s side, see the answer with the source and version, and record it correctly."
          },
          {
            "tag": "A new carer on their first placement",
            "body": "A carer new to your service is not yet sure of your local processes. Instead of guessing or waiting until the office opens, they ask the hub and receive your approved procedure every time, so their practice matches the rest of the team from day one."
          },
          {
            "tag": "When a safeguarding worry arises",
            "body": "A carer becomes concerned about a visitor to the home, or about their client’s wellbeing. They ask the hub how to raise a safeguarding concern and follow your reporting steps clearly, rather than sitting on a worry until someone is reachable."
          },
          {
            "tag": "In a language they are confident in",
            "body": "A carer whose first language is Romanian asks a moving-and-handling question by voice, in Romanian, and listens to the answer read back. The guidance is exactly the same as an English-speaking colleague would receive."
          },
          {
            "tag": "Looking after their own wellbeing",
            "body": "A carer on a long placement wants to know their entitlement to breaks and rest, or how to ask for support. They check the staff handbook in the hub and get a clear answer, so working alone does not mean facing things alone."
          }
        ]
      },
      "deepDive": {
        "label": "Support For A Carer Working Alone",
        "h2": "Approved answers for the carer who has nobody to ask.",
        "para1": "A live-in carer is often the only person in the home, so there is no colleague in the next room to check a procedure with. They ask a question in plain language and get the answer from your own policy, with the source and version shown. No hunting through a folder, no waiting until the office opens, and no guessing.",
        "para2": "Because every answer is grounded in your documents and cites them, a carer working entirely alone acts on the same approved guidance as the rest of your team, every time, at any hour of the night.",
        "chips": [
          "Deterioration and escalation",
          "Medication",
          "Moving and handling",
          "Safeguarding",
          "The client’s care plan",
          "Emergencies",
          "Your own wellbeing and breaks",
          "Reporting concerns"
        ],
        "panelH3": "In the language your carers think in.",
        "panelBody": "Your policies stay in English. A carer can ask in Polish, Tagalog, Romanian or any of over 60 languages, by typing or speaking, and hear the answer read back in the same language. A carer working alone is never held back by a written procedure they find hard to follow at speed.",
        "points": [
          "Over 60 languages, detected automatically",
          "Speak the question and listen to the answer",
          "The same accurate guidance for every carer, in every home"
        ]
      },
      "outcomes": {
        "h2": "A confident carer, safer placements, and inspection evidence that builds itself.",
        "items": [
          {
            "iconKey": "home",
            "title": "A colleague always within reach",
            "body": "A carer working alone gets approved guidance on their phone, day or night, without waiting for the office to open."
          },
          {
            "iconKey": "users",
            "title": "Consistent practice across every home",
            "body": "Carers in different homes act on the same procedures, so practice is consistent wherever your service delivers care."
          },
          {
            "iconKey": "globe",
            "title": "A workforce supported in its own language",
            "body": "Every carer understands your procedures, whatever language they are most confident in."
          },
          {
            "iconKey": "heart",
            "title": "Carer wellbeing taken seriously",
            "body": "A carer on a long placement can check their entitlement to breaks and support, so working alone never means coping alone."
          },
          {
            "iconKey": "graduation",
            "title": "Mandatory training kept current",
            "body": "Training built from your own policies, with automatic renewal reminders so nothing lapses while a carer is away on a placement."
          },
          {
            "iconKey": "chart",
            "title": "Inspection evidence on tap",
            "body": "Every query is logged, and your CQC readiness builds itself from real, day-to-day policy use out in clients’ homes."
          }
        ]
      },
      "cqc": {
        "h2": "Built for care that is delivered out in clients’ homes.",
        "intro": "Live-in care is delivered away from the office, often by a lone carer, yet it is inspected just as closely. CareStream gives you evidence that your policies are live and in use, prepares your carers for inspector conversations, and shows you where your policies leave a gap before an inspection finds it.",
        "cards": [
          {
            "iconKey": "chart",
            "title": "Evidence of policy use",
            "body": "Every policy query is logged by role, language and date, building a CQC Readiness Report you can download as a PDF."
          },
          {
            "iconKey": "staffq",
            "title": "Carers ready to be asked",
            "body": "Inspector-style questions across the five key questions, answered by carers in their own words and scored by AI, with review and retry."
          },
          {
            "iconKey": "shield",
            "title": "Regulation coverage",
            "body": "CareStream reads the content of your policies and shows which regulations are covered, partly covered, or a gap."
          }
        ]
      },
      "faqs": [
        {
          "question": "Does it work when the carer is the only person in the home?",
          "answer": "Yes. That is exactly what CareStream is for. The hub lives on the carer’s own phone, so even with no colleague nearby and the office closed, they can ask a question and get an answer drawn from your own policy, with the source and version shown so they can check it."
        },
        {
          "question": "Can it answer questions at any hour, including overnight?",
          "answer": "Yes. There are no office hours. A carer on a long placement can ask about deterioration, medication, safeguarding or an emergency at two in the morning and get your approved guidance straight away, the same as they would in the day."
        },
        {
          "question": "Does it replace the on-call manager or the carer’s judgement?",
          "answer": "No. CareStream points the carer to your own approved procedures and escalation steps, including when to contact the on-call manager or call 999. It supports professional judgement and your on-call arrangements, it does not replace them, and every answer cites the policy it came from."
        },
        {
          "question": "Our carers speak many languages. Does it help?",
          "answer": "Yes. Carers can ask in over 60 languages and get the answer back in the same language, by typing or by voice, while your policies stay in English. This is a real help for the international workforce that delivers much of live-in care."
        },
        {
          "question": "How does it help with mandatory training and renewals?",
          "answer": "CareStream can build training modules from your own policies, deliver them in the hub, and send automatic renewal reminders at 90, 30 and 7 days, with a manager digest, so a carer’s training never quietly lapses while they are away on a placement."
        },
        {
          "question": "Is client and care information kept private and secure?",
          "answer": "Yes. Your library is stored in an isolated environment for your service alone, is never used to train AI models, and is never shared with other organisations. Data is encrypted at rest and in transit, and every query is logged for your audit trail."
        }
      ],
      "cta": {
        "heading": "Give every carer working alone the right answer, at any hour.",
        "sub": "See how CareStream works for your live-in care service."
      }
    }
  },
  {
    "slug": "complex-care",
    "label": "Complex Care",
    "sort": 4,
    "config": {
      "slug": "complex-care",
      "label": "Complex Care",
      "settingNoun": "complex care service",
      "navDescription": "Your clinical protocols and client care plans, exactly as trained, for support workers delivering complex care at home.",
      "iconKey": "activity",
      "meta": {
        "title": "CareStream for Complex Care",
        "description": "CareStream gives complex care support workers instant access to your clinical protocols and the specific client care plan they are working to, in any language, in the person’s own home, with every answer cited and every query logged for inspection.",
        "ogDescription": "Your clinical protocols and the specific client’s care plan, exactly as trained, for support workers delivering complex care at home."
      },
      "hero": {
        "h1": "The exact protocol, and this client’s care plan, in the person’s own home.",
        "subtitle": "Complex care happens one to one, often alone, in someone’s home, with very high clinical risk and the family in the room. CareStream gives your trained support workers instant access to your clinical protocols and the specific client’s care plan, grounded in your own uploaded documents, so they carry out delegated healthcare tasks exactly as documented and exactly as trained."
      },
      "mockup": {
        "orgName": "Meridian Complex Care",
        "badge": "On shift",
        "tabs": [
          "Care plan",
          "Policies",
          "Training",
          "CQC"
        ],
        "question": "What suction technique should I use for my client’s tracheostomy?",
        "policyName": "From your client’s Tracheostomy Care Plan",
        "answer": "Follow the suction technique and pressure set out in this client’s care plan and your training. Suction on withdrawal only, keep it brief, and stop and escalate if you see any signs of distress or obstruction.",
        "citation": "Tracheostomy Care Plan · Section 3",
        "followups": [
          "What are the signs of a blocked tube?",
          "Who do I escalate to?"
        ]
      },
      "challenge": {
        "h2": "Very high clinical risk, one support worker, and a regulator that looks closely.",
        "para1": "A support worker is alone in a client’s home, carrying out a delegated healthcare task such as tracheostomy suction or PEG feeding, and needs to be certain of the exact technique set out for this particular person. The clinical lead is not in the room, the family is, and there is no folder to leaf through under pressure. A worker whose first language is not English needs to be just as sure as a colleague who speaks English fluently.",
        "para2": "Complex care at home draws close CQC scrutiny, particularly around safe delivery of delegated healthcare tasks and how staff follow each client’s plan in practice. CareStream closes the gap between the documented protocol and what happens in the home, for every support worker, on every visit.",
        "items": [
          {
            "iconKey": "activity",
            "title": "Very high clinical risk",
            "body": "Tracheostomy, ventilation, PEG feeding, catheter care, seizure and bowel care leave no room for guessing the technique."
          },
          {
            "iconKey": "home",
            "title": "Delivered alone in the home",
            "body": "A support worker is often one to one in the person’s own home, without a colleague or the clinical lead beside them."
          },
          {
            "iconKey": "file",
            "title": "The exact protocol and this client’s plan",
            "body": "The right answer is the documented procedure and the specific care plan for this person, never a general rule of thumb."
          },
          {
            "iconKey": "shield",
            "title": "Close CQC scrutiny",
            "body": "Inspectors look hard at how delegated healthcare tasks are delivered safely and how staff follow each client’s plan."
          }
        ]
      },
      "servicesH2": "One platform for clinical protocols, care plans, training, audits and CQC.",
      "serviceDescriptions": {
        "policies": "Your clinical protocols and each client’s care plan answerable in the home, in any language, with the source document and version cited.",
        "hr": "Your staff handbook on demand for your support workers. Leave, pay, travel and employment questions answered 24/7.",
        "training": "Modules built from your own clinical protocols, delivered in the hub, with renewal reminders so competencies stay current.",
        "audits": "Guided audits for medicines, infection prevention and care plan adherence, scored as you go and inspection-ready.",
        "cqc": "Evidence that builds itself, plus regulation coverage showing where your protocols and plans leave a gap.",
        "staffq": "Prepare your support workers for the conversations inspectors have about delegated healthcare tasks.",
        "reportchat": "Upload your inspection report and chat with it, cross-referenced against your own protocols and care plans.",
        "continuity": "Make your continuity information instantly reachable by every support worker, in any home, on any visit."
      },
      "scenarios": {
        "h2": "How your complex care service uses CareStream, visit to visit.",
        "sub": "CareStream is not another system your team has to remember to use. It fits the moments that already happen on every visit, and gives the right answer, from the right document, at the moment it matters.",
        "items": [
          {
            "tag": "Alone with a ventilated client",
            "body": "A support worker has a question about the ventilator alarm sequence for the person they support. Rather than wait for the clinical lead to call back, they ask CareStream and get the exact steps from this client’s care plan and their training, in seconds, so they respond calmly with the family looking on."
          },
          {
            "tag": "A new worker on their first visit",
            "body": "A support worker new to a package is not yet sure of the bowel care routine documented for this client. Instead of guessing or improvising, they check the hub and receive the person’s own plan, so their practice matches what the client and family expect from the very first visit."
          },
          {
            "tag": "During a PEG feed",
            "body": "A support worker is unsure of the flush volume or the rate set out for this client’s enteral feed. They check the care plan in the hub at the bedside, see the answer with the source, and feed exactly as documented and as they were trained."
          },
          {
            "tag": "When a seizure starts",
            "body": "A client begins seizing and the support worker needs to be certain of the rescue medication protocol written for this person. They ask the hub, follow the documented steps and escalation point, and act without delay, because the answer comes from the client’s own plan."
          },
          {
            "tag": "In a language they are confident in",
            "body": "A support worker whose first language is Portuguese asks a catheter care question by voice, in Portuguese, and listens to the answer read back. The guidance is exactly the same as an English-speaking colleague would receive, drawn from the same documents."
          },
          {
            "tag": "Getting ready for inspection",
            "body": "Before an inspection, the registered manager sends CQC practice questions to the team, reviews who has answered, and checks the regulation coverage report to see where a protocol needs strengthening, all before the inspector arrives."
          }
        ]
      },
      "deepDive": {
        "label": "Clinical Procedures, Exactly As Trained",
        "h2": "The precise documented procedure, and this client’s plan, at the point of care.",
        "para1": "A support worker asks a question in plain language and gets the answer from your own clinical protocol and the specific client’s care plan, with the source and version shown. No hunting through a folder, no waiting for a callback, and no improvising in the home.",
        "para2": "Because every answer is grounded in your documents and cites them, your support workers confirm the exact procedure for the person in front of them, every time. CareStream supports them to follow your documented protocols, the client’s care plan and their training. It does not give clinical advice of its own and never replaces training or sign-off for a delegated healthcare task.",
        "chips": [
          "Tracheostomy care",
          "Ventilation",
          "PEG and enteral feeding",
          "Catheter care",
          "Seizure management",
          "Bowel care",
          "Emergency protocols",
          "Infection prevention"
        ],
        "panelH3": "In the language your team thinks in.",
        "panelBody": "Your protocols and care plans stay in English. A support worker can ask in Portuguese, Romanian, Tagalog or any of over 60 languages, by typing or speaking, and hear the answer read back in the same language. Nobody is held back by a written procedure they find hard to follow at speed in the home.",
        "points": [
          "Over 60 languages, detected automatically",
          "Speak the question and listen to the answer",
          "The same accurate guidance for every support worker"
        ]
      },
      "outcomes": {
        "h2": "Safer delegated care, a confident workforce, and inspection evidence that builds itself.",
        "items": [
          {
            "iconKey": "activity",
            "title": "The exact protocol at the point of care",
            "body": "Support workers confirm the documented procedure and the client’s plan in the home, without waiting for the clinical lead."
          },
          {
            "iconKey": "file",
            "title": "Care delivered to each client’s plan",
            "body": "Answers are grounded in the specific person’s care plan, so practice matches what is documented for them, every visit."
          },
          {
            "iconKey": "globe",
            "title": "A workforce supported in its own language",
            "body": "Every support worker understands your protocols and the care plan, whatever language they are most confident in."
          },
          {
            "iconKey": "graduation",
            "title": "Competencies kept current",
            "body": "Training built from your own protocols, with automatic renewal reminders and a live compliance dashboard."
          },
          {
            "iconKey": "chart",
            "title": "Inspection evidence on tap",
            "body": "Every query is logged, and your CQC readiness builds itself from real, visit-to-visit use of your protocols and plans."
          },
          {
            "iconKey": "shield",
            "title": "Clear about its limits",
            "body": "CareStream points staff to your documented procedures and the client’s plan. It never gives clinical advice of its own or replaces sign-off."
          }
        ]
      },
      "cqc": {
        "h2": "Built around the areas inspectors look at most.",
        "intro": "Complex care at home is assessed closely on the safe delivery of delegated healthcare tasks and on how staff follow each client’s plan. CareStream gives you evidence that your protocols and care plans are live and in use, prepares your team for inspector conversations, and shows you where your documents leave a gap before an inspection finds it.",
        "cards": [
          {
            "iconKey": "chart",
            "title": "Evidence of protocol use",
            "body": "Every query is logged by role, language and date, building a CQC Readiness Report you can download as a PDF."
          },
          {
            "iconKey": "staffq",
            "title": "Staff ready to be asked",
            "body": "Inspector-style questions across the five key questions, answered by staff in their own words and scored by AI, with review and retry."
          },
          {
            "iconKey": "shield",
            "title": "Regulation coverage",
            "body": "CareStream reads the content of your protocols and care plans and shows which regulations are covered, partly covered, or a gap."
          }
        ]
      },
      "faqs": [
        {
          "question": "Can it answer questions about a specific client’s care plan, not just general policies?",
          "answer": "Yes. CareStream answers from the documents you upload, including the client care plans you add. A support worker can ask about this person’s tracheostomy suction, PEG feed or seizure protocol and get an answer drawn from that client’s own plan, with the source and version shown so they can check it."
        },
        {
          "question": "Does it give clinical advice or replace training and sign-off?",
          "answer": "No. CareStream supports staff to follow your documented protocols, the client’s care plan and their training. It does not give clinical advice of its own, and it never replaces the training or sign-off required for a delegated healthcare task. Every answer cites the document it came from."
        },
        {
          "question": "Our support workers speak many languages. Does it help?",
          "answer": "Yes. Staff can ask in over 60 languages and get the answer back in the same language, while your protocols and care plans stay in English. This is a real help for the international workforce in many complex care services, and the guidance is identical to what an English speaker receives."
        },
        {
          "question": "How does it help with competencies and renewals?",
          "answer": "CareStream can build training modules from your own protocols, deliver them in the hub, and send automatic renewal reminders at 90, 30 and 7 days, with a manager digest and a live compliance dashboard so you can see exactly who is current and who is due."
        },
        {
          "question": "Is client and clinical information kept private and secure?",
          "answer": "Yes. Your library, including the care plans you upload, is stored in an isolated environment for your service alone, is never used to train AI models, and is never shared with other organisations. Data is encrypted at rest and in transit, and every query is logged for your audit trail."
        },
        {
          "question": "How quickly can a complex care service get started?",
          "answer": "Most services are up and running the same day. You upload your protocols and client care plans, invite your team with a one-tap sign-in link, and support workers can begin asking questions straight away."
        }
      ],
      "cta": {
        "heading": "Give every support worker the exact protocol, and this client’s plan, in the home.",
        "sub": "See how CareStream works for your complex care service."
      }
    }
  },
  {
    "slug": "shared-lives",
    "label": "Shared Lives Schemes",
    "sort": 5,
    "config": {
      "slug": "shared-lives",
      "label": "Shared Lives Schemes",
      "settingNoun": "Shared Lives scheme",
      "navDescription": "Consistent guidance for Shared Lives carers supporting an adult in their own family home.",
      "iconKey": "heart",
      "meta": {
        "title": "CareStream for Shared Lives Schemes",
        "description": "CareStream gives Shared Lives carers and scheme staff instant access to your scheme policies and the person they support, in any language, in the carer’s own home, with every query logged for inspection.",
        "ogDescription": "Consistent scheme guidance for dispersed Shared Lives carers, in any language, in their own home, with every query logged."
      },
      "hero": {
        "h1": "The same scheme guidance for every carer, in their own home, in every language.",
        "subtitle": "Shared Lives carers support an adult in the carer’s own family home, often far from the scheme office, and they are not clinical staff. CareStream gives every carer instant access to your scheme policies and the person’s support plan, grounded in your own documents."
      },
      "mockup": {
        "orgName": "Town and Country Shared Lives",
        "badge": "At home",
        "tabs": [
          "Policies",
          "Support plan",
          "Training",
          "CQC"
        ],
        "question": "I think the person I support may be being financially exploited by a relative, what do I do?",
        "policyName": "From your Safeguarding Policy",
        "answer": "Keep the person safe and do not confront the relative. Record exactly what you have seen or heard, and report your concern to the scheme straight away so it can be raised through the safeguarding process.",
        "citation": "Safeguarding Policy v2.2 · Section 4",
        "followups": [
          "Who do I report to?",
          "What should I write down?"
        ]
      },
      "challenge": {
        "h2": "Dispersed carers, no office nearby, and a regulator that still inspects the scheme.",
        "para1": "A Shared Lives carer supporting an adult in their own home has a question about consent, or notices a possible safeguarding concern, but the scheme office is miles away and the policy folder is somewhere in a drawer. A new carer is unsure how to handle the person’s money safely. A carer whose first language is not English struggles to follow a written procedure on their own.",
        "para2": "Shared Lives schemes are CQC regulated, yet the support happens in many separate family homes rather than one building. CareStream closes the gap between the scheme’s policies and what happens in each carer’s home, so every carer gets the same answer wherever they are.",
        "items": [
          {
            "iconKey": "home",
            "title": "Support in many separate homes",
            "body": "Carers are based in their own family homes and are very dispersed, with no shared office to walk into for an answer."
          },
          {
            "iconKey": "users",
            "title": "Carers who are not clinical staff",
            "body": "Carers support adults with learning disabilities, autism, mental health needs or older people, and need clear, plain guidance."
          },
          {
            "iconKey": "globe",
            "title": "Carers in their own language",
            "body": "Carers come from many backgrounds, and a written scheme procedure can be hard to follow alone and under pressure."
          },
          {
            "iconKey": "shield",
            "title": "A CQC regulated scheme",
            "body": "Inspectors look at safeguarding, consent and how carers across the scheme actually apply your policies."
          }
        ]
      },
      "servicesH2": "One platform for scheme guidance, the support plan, training, audits and CQC.",
      "serviceDescriptions": {
        "policies": "Scheme policies answerable in the carer’s own home, in any language, with the source policy and version cited.",
        "hr": "Your carer handbook and scheme agreement on demand. Approval, payment and arrangement questions answered 24/7.",
        "training": "Modules built from your own scheme policies, delivered in the hub, with renewal reminders for required training.",
        "audits": "Guided audits for safeguarding, medication and monitoring visits, scored as you go and inspection-ready.",
        "cqc": "Evidence that builds itself, plus regulation coverage showing where your scheme policies leave a gap.",
        "staffq": "Prepare your carers and scheme workers for the conversations inspectors have during a visit.",
        "reportchat": "Upload your inspection report and chat with it, cross-referenced against your own scheme policies.",
        "continuity": "Make your continuity information instantly reachable by every carer, in every home."
      },
      "scenarios": {
        "h2": "How your scheme uses CareStream, day to day.",
        "sub": "CareStream is not another system carers have to remember to use. It fits the moments that already happen in each home, and gives the right answer at the moment it matters.",
        "items": [
          {
            "tag": "A possible safeguarding concern",
            "body": "A carer becomes worried that a relative may be taking money from the person they support. Rather than guess or wait, they ask CareStream and get your exact safeguarding and reporting steps, drawn from your own policy, in seconds. They keep the person safe and report it correctly straight away."
          },
          {
            "tag": "A new carer settling in",
            "body": "A newly approved carer is not yet sure how your scheme handles the person’s money or how to record an arrangement. Instead of phoning the office for every question, they ask the hub and receive your approved guidance every time, so they get it right from the start."
          },
          {
            "tag": "Around medication",
            "body": "A carer is unsure whether they should be prompting or administering a medicine, or how to record it. They check the medication policy in the hub at home, see the answer with the source, and record it the way your scheme expects."
          },
          {
            "tag": "A question about consent",
            "body": "A carer is not sure whether the person they support can make a particular decision themselves. They ask the hub and get your scheme’s guidance on mental capacity and consent, so they support the person to decide rather than deciding for them."
          },
          {
            "tag": "In a language they are confident in",
            "body": "A carer whose first language is Portuguese asks a finance question by voice, in Portuguese, and listens to the answer read back. The guidance is exactly the same as an English-speaking carer would receive."
          },
          {
            "tag": "On a monitoring visit",
            "body": "A scheme worker carrying out a monitoring visit checks a point about the support plan or a recording standard in the hub, and gives the carer a consistent answer drawn from the scheme’s own policy, rather than promising to check and come back."
          }
        ]
      },
      "deepDive": {
        "label": "Consistent Guidance For Carers In Their Own Homes",
        "h2": "Your scheme policies and the support plan, answered the moment they are needed.",
        "para1": "A carer asks a question in plain language and gets the answer from your own scheme policy, with the source and version shown. No hunting through a folder, no waiting until the office opens, and no guessing on their own at home.",
        "para2": "Because every answer is grounded in your documents and cites them, dispersed carers across many separate homes act on the same scheme guidance and the same support plan, every time.",
        "chips": [
          "Safeguarding",
          "The person’s support plan",
          "Medication",
          "Mental capacity and consent",
          "Managing finances",
          "Reporting concerns",
          "Scheme policies",
          "Emergencies"
        ],
        "panelH3": "In the language your carers and scheme staff think in.",
        "panelBody": "Your policies stay in English. A carer or scheme worker can ask in Polish, Portuguese, Romanian or any of over 60 languages, by typing or speaking, and hear the answer read back in the same language. Nobody is left alone with a written procedure they find hard to follow.",
        "points": [
          "Over 60 languages, detected automatically",
          "Speak the question and listen to the answer",
          "The same accurate guidance for every carer in the scheme"
        ]
      },
      "outcomes": {
        "h2": "Safer support, confident carers, and inspection evidence that builds itself.",
        "items": [
          {
            "iconKey": "home",
            "title": "Answers in every home",
            "body": "Carers get approved guidance where they actually support someone, without waiting for the scheme office to be free."
          },
          {
            "iconKey": "users",
            "title": "Consistent practice across the scheme",
            "body": "Every carer acts on the same scheme policies and the same support plan, so practice is consistent across many separate homes."
          },
          {
            "iconKey": "globe",
            "title": "Carers supported in their own language",
            "body": "Every carer understands your scheme guidance, whatever language they are most confident in."
          },
          {
            "iconKey": "graduation",
            "title": "Required training kept current",
            "body": "Training built from your own scheme policies, with automatic renewal reminders and a live compliance dashboard."
          },
          {
            "iconKey": "chart",
            "title": "Inspection evidence on tap",
            "body": "Every query is logged, and your CQC readiness builds itself from real, day-to-day use across the scheme."
          },
          {
            "iconKey": "shield",
            "title": "Concerns reported the right way",
            "body": "When something worries a carer, they get your safeguarding and reporting steps at once, so concerns reach the scheme quickly."
          }
        ]
      },
      "cqc": {
        "h2": "Built around the areas inspectors look at most.",
        "intro": "Shared Lives schemes are assessed on safeguarding, consent and how consistently carers apply your policies across many homes. CareStream gives you evidence that your policies are live and in use, prepares your carers and scheme workers for inspector conversations, and shows you where your policies leave a gap before an inspection finds it.",
        "cards": [
          {
            "iconKey": "chart",
            "title": "Evidence of policy use",
            "body": "Every policy query is logged by role, language and date, building a CQC Readiness Report you can download as a PDF."
          },
          {
            "iconKey": "staffq",
            "title": "Carers ready to be asked",
            "body": "Inspector-style questions across the five key questions, answered by carers and scheme staff in their own words and scored by AI, with review and retry."
          },
          {
            "iconKey": "shield",
            "title": "Regulation coverage",
            "body": "CareStream reads the content of your scheme policies and shows which regulations are covered, partly covered, or a gap."
          }
        ]
      },
      "faqs": [
        {
          "question": "Can carers use it in their own home, away from the office?",
          "answer": "Yes. CareStream installs on a carer’s phone like an app, with a one-tap sign-in and no password to remember. Wherever a carer is supporting someone, they can ask a question and get an answer from your own scheme policies, with the source and version shown so they can check it."
        },
        {
          "question": "Does it replace the support plan or the scheme’s judgement?",
          "answer": "No. CareStream points carers to your own approved policies and the information you have given it. It supports the person’s support plan and the scheme’s decisions, it does not replace them, and every answer cites the document it came from."
        },
        {
          "question": "Our carers come from many backgrounds. Does it help?",
          "answer": "Yes. Carers can ask in over 60 languages and get the answer back in the same language, while your policies stay in English. This helps every carer follow the same scheme guidance, whatever language they are most confident in."
        },
        {
          "question": "How does it help with required training and renewals?",
          "answer": "CareStream can build training modules from your own scheme policies, deliver them in the hub, and send automatic renewal reminders at 90, 30 and 7 days, with a live compliance dashboard so you can see exactly which carers are current and who is due."
        },
        {
          "question": "Is the person’s information kept private and secure?",
          "answer": "Yes. Your library is stored in an isolated environment for your scheme alone, is never used to train AI models, and is never shared with other organisations. Data is encrypted at rest and in transit, and every query is logged for your audit trail."
        },
        {
          "question": "How quickly can a Shared Lives scheme get started?",
          "answer": "Most schemes are up and running the same day. You upload your scheme policies, invite your carers and scheme workers with a one-tap sign-in link, and they can begin asking questions straight away."
        }
      ],
      "cta": {
        "heading": "Give every Shared Lives carer the same answer, in every home.",
        "sub": "See how CareStream works for your Shared Lives scheme."
      }
    }
  },
  {
    "slug": "substance-misuse",
    "label": "Substance Misuse and Rehabilitation",
    "sort": 6,
    "config": {
      "slug": "substance-misuse",
      "label": "Substance Misuse and Rehabilitation",
      "settingNoun": "rehabilitation service",
      "navDescription": "Fast, clear answers from your own protocols for residential detox and rehabilitation teams.",
      "iconKey": "pill",
      "meta": {
        "title": "CareStream for Substance Misuse and Rehabilitation",
        "description": "CareStream gives residential detox and rehabilitation teams instant access to your own clinical and treatment protocols, training, audits and CQC tools, in any language, on every shift, with every query logged for inspection.",
        "ogDescription": "Fast, exact answers from your own protocols for residential detox and rehab teams, in any language, on every shift."
      },
      "hero": {
        "h1": "Fast, exact answers from your own protocols, for the moments that matter most.",
        "subtitle": "Residential detox and rehabilitation carry real clinical risk, with a mixed workforce of nurses and recovery workers and a population at risk of overdose and withdrawal. CareStream gives every member of your team instant access to your own emergency and treatment protocols, training and CQC tools, grounded in your own documents."
      },
      "mockup": {
        "orgName": "Riverside Recovery",
        "badge": "On shift",
        "tabs": [
          "Policies",
          "Protocols",
          "Training",
          "CQC"
        ],
        "question": "A resident appears to have overdosed, what do I do?",
        "policyName": "From your Overdose and Emergency Response Policy",
        "answer": "Call 999 immediately. Check breathing and response, place them in the recovery position, and administer naloxone if it is available and you are trained to do so. Stay with them and follow your emergency protocol until help arrives.",
        "citation": "Overdose Policy v1.4 · Section 1",
        "followups": [
          "Where is the naloxone kept?",
          "How do I record this?"
        ]
      },
      "challenge": {
        "h2": "High clinical risk, a mixed workforce, and a regulator that looks closely.",
        "para1": "A recovery worker on shift notices a resident becoming unresponsive and needs to know exactly what to do, but the nurse is with someone else and the policy folder is in the office. A new staff member is unsure how your withdrawal scoring or medication-assisted treatment protocol works. A staff member whose first language is not English struggles to follow a written procedure when seconds count.",
        "para2": "Residential detox and rehab face close scrutiny at inspection, particularly around medicines, risk and safeguarding. CareStream closes the gap between the protocol on paper and the practice on the floor, for every member of the team, on every shift, with consistent answers whoever is on duty.",
        "items": [
          {
            "iconKey": "clock",
            "title": "Overdose and withdrawal risk",
            "body": "Questions about overdose, withdrawal and naloxone come up at any hour, not only when a nurse is free."
          },
          {
            "iconKey": "users",
            "title": "A mixed clinical and recovery workforce",
            "body": "Nurses and recovery workers need consistent answers from the same approved protocols."
          },
          {
            "iconKey": "globe",
            "title": "A multilingual workforce",
            "body": "A large part of the workforce speaks English as a second language and needs answers in their own."
          },
          {
            "iconKey": "shield",
            "title": "Close CQC scrutiny",
            "body": "Inspectors look hard at medicines, risk, safeguarding and how staff apply your protocols in practice."
          }
        ]
      },
      "servicesH2": "One platform for protocol answers, training, audits and CQC.",
      "serviceDescriptions": {
        "policies": "Emergency and treatment protocols answerable on shift, in any language, with the source protocol and version cited.",
        "hr": "Your staff handbook on demand for your clinical and recovery team. Leave, pay and employment questions answered 24/7.",
        "training": "Modules built from your own protocols, delivered in the hub, with renewal reminders for mandatory training.",
        "audits": "Guided audits for medicines, naloxone, risk and safeguarding, scored as you go and inspection-ready.",
        "cqc": "Evidence that builds itself, plus regulation coverage showing where your protocols leave a gap.",
        "staffq": "Prepare your nurses and recovery workers for the conversations inspectors have on the floor.",
        "reportchat": "Upload your inspection report and chat with it, cross-referenced against your own protocols.",
        "continuity": "Make your continuity information instantly reachable by every member of staff, on any shift."
      },
      "scenarios": {
        "h2": "How your service uses CareStream, day to day.",
        "sub": "CareStream is not another system your team has to remember to use. It fits the moments that already happen on every shift, and gives the right answer at the moment it matters.",
        "items": [
          {
            "tag": "In an emergency",
            "body": "A recovery worker finds a resident unresponsive and suspects an overdose. Rather than wait for the nurse to be free, they ask CareStream and get your exact emergency steps, drawn from your own protocol, in seconds. CareStream points them straight to calling 999 and following your overdose response, so they act with confidence while help is on the way."
          },
          {
            "tag": "A new starter settling in",
            "body": "A new recovery worker is not yet sure of your local processes. Instead of interrupting colleagues or guessing, they ask the hub and receive your approved protocol every time, so their practice matches the rest of the team from their very first shift."
          },
          {
            "tag": "During the medication round",
            "body": "A nurse is checking how a medication-assisted treatment protocol applies, or how a missed dose should be handled. They check the medicines protocol in the hub at the trolley, see the answer with the source, and record it correctly."
          },
          {
            "tag": "Managing withdrawal",
            "body": "A staff member is unsure how to act on a rising withdrawal score, or when to escalate. They ask the hub, see your detox and escalation steps from your own protocol, and know exactly who to inform and when."
          },
          {
            "tag": "In a language they are confident in",
            "body": "A recovery worker whose first language is Polish asks a safeguarding question by voice, in Polish, and listens to the answer read back. The guidance is exactly the same as an English-speaking colleague would receive."
          },
          {
            "tag": "Getting ready for inspection",
            "body": "Before an inspection, the registered manager sends CQC practice questions to the team, reviews who has answered, and checks the regulation coverage report to see where a protocol needs strengthening, all before the inspector arrives."
          }
        ]
      },
      "deepDive": {
        "label": "Clear Answers When Minutes Matter",
        "h2": "Your emergency and treatment protocols, answered the moment they are needed.",
        "para1": "Staff ask a question in plain language and get the answer from your own protocol, with the source and version shown. No hunting through a folder, no waiting for the nurse to be free, and no guessing when seconds count.",
        "para2": "Because every answer is grounded in your documents and cites them, your nurses and recovery workers act on the same approved guidance, every time, whoever is on shift.",
        "chips": [
          "Overdose and naloxone",
          "Withdrawal and detox",
          "Medication-assisted treatment",
          "Safeguarding",
          "Blood-borne viruses",
          "Mental health and risk",
          "Searches and contraband",
          "Discharge planning"
        ],
        "panelH3": "In the language your team thinks in.",
        "panelBody": "Your protocols stay in English. A nurse or recovery worker can ask in Polish, Romanian, Portuguese or any of over 60 languages, by typing or speaking, and hear the answer read back in the same language. Nobody is held back by a written procedure they find hard to follow at speed.",
        "points": [
          "Over 60 languages, detected automatically",
          "Speak the question and listen to the answer",
          "The same accurate guidance for every member of the team"
        ]
      },
      "outcomes": {
        "h2": "Safer practice, a confident team, and inspection evidence that builds itself.",
        "items": [
          {
            "iconKey": "pill",
            "title": "Protocol answers on every shift",
            "body": "Staff get approved guidance on shift, day or night, without waiting for the nurse to be free."
          },
          {
            "iconKey": "users",
            "title": "Consistent practice across the team",
            "body": "Nurses and recovery workers act on the same protocols, so practice is consistent regardless of who is on shift."
          },
          {
            "iconKey": "globe",
            "title": "A workforce supported in its own language",
            "body": "Every member of the team understands your protocols, whatever language they are most confident in."
          },
          {
            "iconKey": "graduation",
            "title": "Mandatory training kept current",
            "body": "Training built from your own protocols, with automatic renewal reminders and a live compliance dashboard."
          },
          {
            "iconKey": "chart",
            "title": "Inspection evidence on tap",
            "body": "Every query is logged, and your CQC readiness builds itself from real, day-to-day protocol use."
          },
          {
            "iconKey": "clock",
            "title": "New and bank staff up to speed fast",
            "body": "A new starter can ask your exact protocols from day one, instead of relying on whoever is nearby."
          }
        ]
      },
      "cqc": {
        "h2": "Built around the areas inspectors look at most.",
        "intro": "Residential detox and rehab are assessed closely on medicines, risk and safeguarding. CareStream gives you evidence that your protocols are live and in use, prepares your team for inspector conversations, and shows you where your protocols leave a gap before an inspection finds it.",
        "cards": [
          {
            "iconKey": "chart",
            "title": "Evidence of protocol use",
            "body": "Every protocol query is logged by role, language and date, building a CQC Readiness Report you can download as a PDF."
          },
          {
            "iconKey": "staffq",
            "title": "Staff ready to be asked",
            "body": "Inspector-style questions across the five key questions, answered by staff in their own words and scored by AI, with review and retry."
          },
          {
            "iconKey": "shield",
            "title": "Regulation coverage",
            "body": "CareStream reads the content of your protocols and shows which regulations are covered, partly covered, or a gap."
          }
        ]
      },
      "faqs": [
        {
          "question": "Can it give the right steps in an emergency like an overdose?",
          "answer": "CareStream answers from the documents you upload, including your overdose and emergency response protocols. It points staff to your own approved steps, with the source and version shown, so they can act fast and check it. It supports your protocols, it does not give clinical advice of its own, so in any emergency staff should always call 999 and follow your protocol."
        },
        {
          "question": "Does it replace clinical judgement or training?",
          "answer": "No. CareStream points staff to your own approved protocols and guidance. It supports professional judgement and your training, it does not replace them, and it does not give medical advice of its own. Every answer cites the protocol it came from."
        },
        {
          "question": "Our team speaks many languages. Does it help?",
          "answer": "Yes. Staff can ask in over 60 languages and get the answer back in the same language, while your protocols stay in English. This is a real help for the mixed clinical and recovery workforce in most services."
        },
        {
          "question": "How does it help with mandatory training and renewals?",
          "answer": "CareStream can build training modules from your own protocols, deliver them in the hub, and send automatic renewal reminders at 90, 30 and 7 days, with a live compliance dashboard so you can see exactly who is current and who is due."
        },
        {
          "question": "Is resident and clinical information kept private and secure?",
          "answer": "Yes. Your library is stored in an isolated environment for your service alone, is never used to train AI models, and is never shared with other organisations. Data is encrypted at rest and in transit, and every query is logged for your audit trail."
        },
        {
          "question": "How quickly can a rehabilitation service get started?",
          "answer": "Most services are up and running the same day. You upload your protocols, invite your team with a one-tap sign-in link, and staff can begin asking questions straight away."
        }
      ],
      "cta": {
        "heading": "Give your whole team the right answer, when minutes matter.",
        "sub": "See how CareStream works for your detox and rehabilitation service."
      }
    }
  },
  {
    "slug": "hospices",
    "label": "Hospices",
    "sort": 7,
    "config": {
      "slug": "hospices",
      "label": "Hospices",
      "settingNoun": "hospice",
      "navDescription": "Palliative and end-of-life answers from your own policies for adult and children's hospice teams.",
      "iconKey": "heart",
      "meta": {
        "title": "CareStream for Hospices",
        "description": "CareStream gives your clinical, nursing and care teams instant access to your palliative and end-of-life policies, training, audits and CQC tools, in any language, on every shift, with every query logged for inspection.",
        "ogDescription": "Palliative and end-of-life answers from your own policies, for your whole hospice team, in any language, day or night."
      },
      "hero": {
        "h1": "The exact policy in your hand, at the most sensitive moments, day or night.",
        "subtitle": "Hospices carry clinical and emotional weight around the clock, with a mix of clinical, nursing and care staff and many volunteers, all supporting patients and families through some of life's hardest moments. CareStream gives every member of your team instant access to your palliative and end-of-life policies, training and CQC tools, grounded in your own documents."
      },
      "mockup": {
        "orgName": "St Catherine's Hospice",
        "badge": "Night shift",
        "tabs": [
          "Policies",
          "Handbook",
          "Training",
          "CQC"
        ],
        "question": "How do I set up a syringe driver for this patient?",
        "policyName": "From your Syringe Driver and Anticipatory Medicines Policy",
        "answer": "Set up the syringe driver following your policy and the patient's prescription. Check the medicines, the rate and the site, document the start, and monitor the site and the patient's symptoms at the intervals your policy requires.",
        "citation": "Syringe Driver Policy v2.1 · Section 4",
        "followups": [
          "How often do I check the site?",
          "What do I do if it alarms?"
        ]
      },
      "challenge": {
        "h2": "Sensitive care, a mixed team and high expectations at inspection.",
        "para1": "A nurse setting up a syringe driver overnight needs your exact procedure to hand, but the policy folder is in the office. A care assistant supporting a family at the moment of death is unsure what your policy asks of them next. A volunteer or a new member of staff whose first language is not English wants to be certain they are following your guidance, at a moment when getting it right matters deeply.",
        "para2": "Hospices are held to high expectations at inspection, particularly around safe symptom control, medicines and end-of-life care. CareStream closes the gap between the policy on paper and the practice at the bedside, for every member of the team, at any hour, while always pointing back to your own documents.",
        "items": [
          {
            "iconKey": "clock",
            "title": "Sensitive moments at any hour",
            "body": "Questions about anticipatory medicines, symptom control and verification of death arise overnight, not only during the day."
          },
          {
            "iconKey": "users",
            "title": "A mixed team and many volunteers",
            "body": "Clinical, nursing and care staff, alongside volunteers, all need consistent answers from the same approved policies."
          },
          {
            "iconKey": "heart",
            "title": "Emotionally demanding work",
            "body": "Staff support patients and families through end-of-life care and bereavement, and need clear guidance at hard moments."
          },
          {
            "iconKey": "shield",
            "title": "High expectations at inspection",
            "body": "Inspectors look closely at symptom control, medicines and how staff apply your policies in practice."
          }
        ]
      },
      "servicesH2": "One platform for palliative answers, training, audits and CQC.",
      "serviceDescriptions": {
        "policies": "Palliative and end-of-life procedures answerable at the bedside, in any language, with the source policy and version cited.",
        "hr": "Your staff handbook on demand for your clinical, nursing and care team. Leave, pay and employment questions answered 24/7.",
        "training": "Modules built from your own palliative policies, delivered in the hub, with renewal reminders for mandatory training.",
        "audits": "Guided audits for medicines, syringe drivers, infection control and end-of-life care, scored as you go and inspection-ready.",
        "cqc": "Evidence that builds itself, plus regulation coverage showing where your policies leave a gap.",
        "staffq": "Prepare your nurses, carers and volunteers for the conversations inspectors have on the floor.",
        "reportchat": "Upload your inspection report and chat with it, cross-referenced against your own policies.",
        "continuity": "Make your continuity information instantly reachable by every member of staff, on any shift."
      },
      "scenarios": {
        "h2": "How your hospice uses CareStream, day to day.",
        "sub": "CareStream is not another system your team has to remember to use. It fits the moments that already happen on every shift, and gives the right answer, from your own policy, at the moment it matters most.",
        "items": [
          {
            "tag": "On a night shift",
            "body": "A nurse needs to set up a syringe driver and wants to be certain of every step. Rather than wait until morning or hunt through a folder, they ask CareStream and get your exact procedure, drawn from your own policy, in seconds. They act with confidence and follow your policy and the patient's prescription throughout."
          },
          {
            "tag": "At the moment of death",
            "body": "A care assistant is with a patient as they die and is unsure what your policy asks of them next, including verification of death and how to support the family present. They check the hub quietly and follow your approved steps, calmly and consistently."
          },
          {
            "tag": "During a symptom-control review",
            "body": "A nurse is unsure how a particular anticipatory medicine should be handled, or how your policy guides escalating pain. They check the relevant policy in the hub at the bedside, see the answer with the source, and record it correctly."
          },
          {
            "tag": "Supporting a family",
            "body": "A family member asks about advance care plans, or about your approach to spiritual and bereavement support. Any member of staff can check the relevant policy and answer clearly and consistently, rather than promising to find out and get back to them at a difficult time."
          },
          {
            "tag": "In a language they are confident in",
            "body": "A carer or volunteer whose first language is Portuguese asks a question by voice, in Portuguese, and listens to the answer read back. The guidance is exactly the same as an English-speaking colleague would receive, drawn from the same policy."
          },
          {
            "tag": "Getting ready for inspection",
            "body": "Before an inspection, the registered manager sends CQC practice questions to the team, reviews who has answered, and checks the regulation coverage report to see where a policy needs strengthening, all before the inspector arrives."
          }
        ]
      },
      "deepDive": {
        "label": "Palliative Care, Supported At Every Moment",
        "h2": "Your end-of-life policies, there at the most sensitive and urgent moments.",
        "para1": "Staff ask a question in plain language and get the answer from your own palliative policy, with the source and version shown. No hunting through a folder, no waiting until morning, and no guessing, at exactly the moments when certainty matters most.",
        "para2": "Because every answer is grounded in your documents and cites them, your nurses, carers and volunteers follow the same approved guidance, every time. CareStream supports your team to follow your policies and the patient's plan, it does not give clinical advice of its own.",
        "chips": [
          "Anticipatory medicines",
          "Syringe drivers",
          "Symptom control",
          "Verification of death",
          "Advance care plans",
          "Family and bereavement support",
          "Children's palliative care",
          "Spiritual care"
        ],
        "panelH3": "In the language your team and volunteers think in.",
        "panelBody": "Your policies stay in English. A nurse, carer or volunteer can ask in Polish, Tagalog, Portuguese or any of over 60 languages, by typing or speaking, and hear the answer read back in the same language. Nobody on a multilingual workforce is held back by a written procedure they find hard to follow at a sensitive moment.",
        "points": [
          "Over 60 languages, detected automatically",
          "Speak the question and listen to the answer",
          "The same accurate guidance for staff and volunteers alike"
        ]
      },
      "outcomes": {
        "h2": "Calmer practice, a confident team, and inspection evidence that builds itself.",
        "items": [
          {
            "iconKey": "heart",
            "title": "The right policy at sensitive moments",
            "body": "Staff get your approved guidance at the bedside, day or night, including verification of death and family support."
          },
          {
            "iconKey": "users",
            "title": "Consistent practice across the team",
            "body": "Nurses, carers and volunteers act on the same procedures, so practice is consistent regardless of who is on shift."
          },
          {
            "iconKey": "globe",
            "title": "A workforce supported in its own language",
            "body": "Every member of the team understands your procedures, whatever language they are most confident in."
          },
          {
            "iconKey": "graduation",
            "title": "Mandatory training kept current",
            "body": "Training built from your own palliative policies, with automatic renewal reminders and a live compliance dashboard."
          },
          {
            "iconKey": "chart",
            "title": "Inspection evidence on tap",
            "body": "Every query is logged, and your CQC readiness builds itself from real, day-to-day policy use."
          },
          {
            "iconKey": "clock",
            "title": "New staff and volunteers up to speed fast",
            "body": "A new starter can ask your exact procedures from day one, instead of relying on whoever is nearby."
          }
        ]
      },
      "cqc": {
        "h2": "Built around the areas inspectors look at most.",
        "intro": "Hospices are assessed closely on safe symptom control, medicines and end-of-life care. CareStream gives you evidence that your policies are live and in use, prepares your team for inspector conversations, and shows you where your policies leave a gap before an inspection finds it.",
        "cards": [
          {
            "iconKey": "chart",
            "title": "Evidence of policy use",
            "body": "Every policy query is logged by role, language and date, building a CQC Readiness Report you can download as a PDF."
          },
          {
            "iconKey": "staffq",
            "title": "Staff ready to be asked",
            "body": "Inspector-style questions across the five key questions, answered by staff in their own words and scored by AI, with review and retry."
          },
          {
            "iconKey": "shield",
            "title": "Regulation coverage",
            "body": "CareStream reads the content of your policies and shows which regulations are covered, partly covered, or a gap."
          }
        ]
      },
      "faqs": [
        {
          "question": "Can it answer palliative and end-of-life procedure questions, not just admin policies?",
          "answer": "Yes. CareStream answers from the documents you upload, including your clinical and palliative procedures. A nurse can ask about a syringe driver, anticipatory medicines, symptom control or verification of death and get an answer drawn from your own policy, with the source and version shown so they can check it."
        },
        {
          "question": "Does it give clinical advice or replace professional judgement?",
          "answer": "No. CareStream points staff to your own approved procedures and to what your policy and the patient's plan require. It supports professional judgement and your training, it does not give clinical advice of its own, and every answer cites the policy it came from."
        },
        {
          "question": "Does it work for both adult and children's hospices?",
          "answer": "Yes. CareStream answers from whichever policies you upload, so it supports adult and children's palliative and end-of-life care equally. Your guidance for children's palliative care, family support and bereavement is answerable in the same way as the rest of your library."
        },
        {
          "question": "Our team and volunteers speak many languages. Does it help?",
          "answer": "Yes. Staff and volunteers can ask in over 60 languages and get the answer back in the same language, while your policies stay in English. This is a real help for a mixed workforce and the many volunteers a hospice relies on."
        },
        {
          "question": "How does it help with mandatory training and renewals?",
          "answer": "CareStream can build training modules from your own policies, deliver them in the hub, and send automatic renewal reminders at 90, 30 and 7 days, with a live compliance dashboard so you can see exactly who is current and who is due."
        },
        {
          "question": "Is patient and clinical information kept private and secure?",
          "answer": "Yes. Your library is stored in an isolated environment for your hospice alone, is never used to train AI models, and is never shared with other organisations. Data is encrypted at rest and in transit, and every query is logged for your audit trail."
        }
      ],
      "cta": {
        "heading": "Give your whole hospice team the right answer, at the moments that matter most.",
        "sub": "See how CareStream works for your hospice."
      }
    }
  },
  {
    "slug": "independent-hospitals",
    "label": "Independent Hospitals and Private Clinics",
    "sort": 8,
    "config": {
      "slug": "independent-hospitals",
      "label": "Independent Hospitals and Private Clinics",
      "settingNoun": "hospital or clinic",
      "navDescription": "Clinical governance, consent and infection control made accessible to every clinician and agency worker.",
      "iconKey": "building",
      "meta": {
        "title": "CareStream for Independent Hospitals and Private Clinics",
        "description": "CareStream gives clinicians and clinical staff instant access to your governance, consent, infection prevention and CQC procedures, in any language, with every query grounded in your own policies and logged for inspection.",
        "ogDescription": "Instant access to clinical governance, consent and infection control for every clinician, including agency and locum staff, in any language."
      },
      "hero": {
        "h1": "Clinical governance at every clinician’s fingertips, including your agency and locum staff.",
        "subtitle": "Independent hospitals and private clinics run a mixed clinical workforce, often with agency and locum staff who need to find the local way of doing things fast. CareStream gives every clinician instant access to your consent, infection control, medicines and governance procedures, grounded in your own documents and answered in plain language."
      },
      "mockup": {
        "orgName": "Parkview Private Hospital",
        "badge": "Pre-op",
        "tabs": [
          "Policies",
          "Governance",
          "Training",
          "CQC"
        ],
        "question": "What is our consent process before a procedure?",
        "policyName": "From your Consent to Treatment Policy",
        "answer": "Confirm the patient has capacity, has been given the information they need, and has consented voluntarily. Check the signed consent form, confirm the procedure and the site, and escalate to the responsible clinician if anything is unclear before proceeding.",
        "citation": "Consent Policy v3.0 · Section 2",
        "followups": [
          "What if the patient lacks capacity?",
          "Where is consent recorded?"
        ]
      },
      "challenge": {
        "h2": "A mixed clinical workforce, strong governance expectations, and a regulator that looks closely.",
        "para1": "A locum surgeon arriving for a theatre list needs your exact consent and surgical safety steps, but the governance lead is in a meeting and the policy folder is in the office. An agency nurse on a ward is unsure of your local infection prevention and control practice. A clinician whose first language is not English struggles to follow a written procedure quickly before a procedure begins.",
        "para2": "Independent hospitals and private clinics face strong clinical governance expectations at inspection, particularly around consent, infection prevention, surgical and procedural safety, medicines, and incident reporting with duty of candour. CareStream closes the gap between the procedure on paper and the practice on the floor, for every clinician, including those who only join you for a single list or shift.",
        "items": [
          {
            "iconKey": "users",
            "title": "A mixed clinical workforce",
            "body": "Substantive, agency and locum clinicians all need consistent answers from the same approved procedures."
          },
          {
            "iconKey": "shield",
            "title": "Strong governance expectations",
            "body": "Consent, infection prevention and procedural safety are scrutinised closely, and staff must apply your current policy."
          },
          {
            "iconKey": "clock",
            "title": "New staff need to find the local way fast",
            "body": "Agency and locum staff need the local way of doing things quickly, often before a list or shift begins."
          },
          {
            "iconKey": "globe",
            "title": "A multilingual workforce",
            "body": "A large part of the clinical workforce speaks English as a second language and needs to follow procedures with confidence."
          }
        ]
      },
      "servicesH2": "One platform for governance answers, training, audits and CQC.",
      "serviceDescriptions": {
        "policies": "Consent, infection control, medicines and surgical safety procedures answerable on the spot, in any language, with the source policy and version cited.",
        "hr": "Your staff handbook on demand for your clinical and support teams. Leave, pay and employment questions answered 24/7.",
        "training": "Modules built from your own governance policies, delivered in the hub, with renewal reminders for mandatory training.",
        "audits": "Guided audits for consent, infection prevention, surgical safety and medicines, scored as you go, with a printable PDF.",
        "cqc": "A Readiness Report that builds itself, plus regulation coverage showing where your policies leave a gap.",
        "staffq": "Prepare your clinicians and clinical staff for the conversations inspectors have on the floor.",
        "reportchat": "Upload your inspection report and chat with it, cross-referenced against your own policies.",
        "continuity": "Make your continuity information instantly reachable by every member of staff, on any shift."
      },
      "scenarios": {
        "h2": "How your hospital or clinic uses CareStream, day to day.",
        "sub": "CareStream is not another system your team has to remember to use. It fits the moments that already happen on every list and every shift, and gives the right answer at the moment it matters.",
        "items": [
          {
            "tag": "Before a procedure",
            "body": "A clinician preparing a patient for theatre wants to be sure of your consent and surgical safety steps. Rather than wait for the governance lead, they ask CareStream and get your exact process, drawn from your own policy, in seconds. The site is confirmed, the consent form is checked, and the list runs on time."
          },
          {
            "tag": "An agency nurse on a ward",
            "body": "An agency nurse covering a shift is not yet sure of your local infection prevention and control practice. Instead of guessing or interrupting colleagues, they ask the hub and receive your approved procedure every time, so their practice matches the substantive team from their very first hour."
          },
          {
            "tag": "During a medicines task",
            "body": "A clinician is unsure how a controlled drug should be checked and recorded, or how a particular medicine is handled here. They check the medicines policy in the hub at the point of care, see the answer with the source, and record it correctly."
          },
          {
            "tag": "After an incident",
            "body": "Following a patient safety incident, a member of staff needs to know your reporting steps and how duty of candour applies. They ask CareStream, see your exact escalation and reporting process with the source policy, and act promptly rather than waiting to ask in the morning."
          },
          {
            "tag": "In a language they are confident in",
            "body": "A clinician whose first language is Spanish asks an infection control question by voice, in Spanish, and listens to the answer read back. The guidance is exactly the same as an English-speaking colleague would receive."
          },
          {
            "tag": "Getting ready for inspection",
            "body": "Before an inspection, the registered manager sends CQC practice questions to clinicians, reviews who has answered, and checks the regulation coverage report to see where a policy needs strengthening, all before the inspector arrives."
          }
        ]
      },
      "deepDive": {
        "label": "Clinical Governance, Accessible To Every Clinician",
        "h2": "Your current policies and procedures at every clinician’s fingertips.",
        "para1": "A clinician asks a question in plain language and gets the answer from your own current policy, with the source and version shown. No hunting through a folder, no waiting for the governance lead, and no guessing, even for an agency or locum clinician on their first day.",
        "para2": "Because every answer is grounded in your documents and cites them, your substantive, agency and locum clinicians all act on the same approved guidance, every time.",
        "chips": [
          "Consent",
          "Infection prevention and control",
          "Medicines management",
          "Surgical safety checks",
          "Safeguarding",
          "Incident reporting and duty of candour",
          "Resuscitation",
          "Patient identification"
        ],
        "panelH3": "In the language your team thinks in.",
        "panelBody": "Your policies stay in English. A clinician can ask in Spanish, Tagalog, Romanian or any of over 60 languages, by typing or speaking, and hear the answer read back in the same language. Nobody is held back by a written procedure they find hard to follow at speed before a list or procedure.",
        "points": [
          "Over 60 languages, detected automatically",
          "Speak the question and listen to the answer",
          "The same accurate guidance for every clinician"
        ]
      },
      "outcomes": {
        "h2": "Safer practice, a confident clinical team, and inspection evidence that builds itself.",
        "items": [
          {
            "iconKey": "shield",
            "title": "Governance answers at the point of care",
            "body": "Clinicians get approved guidance on consent, infection control and safety at the moment it is needed, without waiting for the governance lead."
          },
          {
            "iconKey": "users",
            "title": "Consistent practice across the team",
            "body": "Substantive, agency and locum clinicians act on the same procedures, so practice is consistent regardless of who is on the list."
          },
          {
            "iconKey": "clock",
            "title": "Agency and locum staff up to speed fast",
            "body": "A new agency or locum clinician can ask your exact local procedures from their first hour, instead of relying on whoever is nearby."
          },
          {
            "iconKey": "globe",
            "title": "A workforce supported in its own language",
            "body": "Every clinician understands your procedures, whatever language they are most confident in."
          },
          {
            "iconKey": "graduation",
            "title": "Mandatory training kept current",
            "body": "Training built from your own governance policies, with automatic renewal reminders and a live compliance dashboard."
          },
          {
            "iconKey": "chart",
            "title": "Inspection evidence on tap",
            "body": "Every query is logged, and your CQC readiness builds itself from real, day-to-day policy use."
          }
        ]
      },
      "cqc": {
        "h2": "Built around the areas inspectors look at most.",
        "intro": "Independent hospitals and private clinics are assessed closely on clinical governance, consent, infection prevention and procedural safety. CareStream gives you evidence that your policies are live and in use, prepares your clinicians for inspector conversations, and shows you where your policies leave a gap before an inspection finds it.",
        "cards": [
          {
            "iconKey": "chart",
            "title": "Evidence of policy use",
            "body": "Every policy query is logged by role, language and date, building a CQC Readiness Report you can download as a PDF."
          },
          {
            "iconKey": "staffq",
            "title": "Staff ready to be asked",
            "body": "Inspector-style questions across the five key questions, answered by clinicians in their own words and scored by AI, with review and retry."
          },
          {
            "iconKey": "shield",
            "title": "Regulation coverage",
            "body": "CareStream reads the content of your policies and shows which regulations are covered, partly covered, or a gap."
          }
        ]
      },
      "faqs": [
        {
          "question": "Can it answer clinical governance and procedure questions, not just admin policies?",
          "answer": "Yes. CareStream answers from the documents you upload, including your consent, infection control, medicines and surgical safety procedures. A clinician can ask about a consent process, a surgical safety check or your incident reporting steps and get an answer drawn from your own policy, with the source and version shown so they can check it."
        },
        {
          "question": "How does it help agency and locum staff find the local way of doing things?",
          "answer": "An agency or locum clinician can ask the hub from their first hour and get your exact local procedure, grounded in your own documents and cited. They do not have to track down the governance lead or rely on whoever is nearby to learn how you do things here."
        },
        {
          "question": "Does it replace clinical judgement or training?",
          "answer": "No. CareStream points clinicians to your own approved procedures and guidance. It supports professional judgement and your training, it does not replace them, and every answer cites the policy it came from."
        },
        {
          "question": "Our clinicians speak many languages. Does it help?",
          "answer": "Yes. Staff can ask in over 60 languages and get the answer back in the same language, while your policies stay in English. This is a real help for a mixed clinical workforce that includes staff who speak English as a second language."
        },
        {
          "question": "How does it help with mandatory training and renewals?",
          "answer": "CareStream can build training modules from your own governance policies, deliver them in the hub, and send automatic renewal reminders at 90, 30 and 7 days, with a live compliance dashboard so you can see exactly who is current and who is due."
        },
        {
          "question": "Is patient and clinical information kept private and secure?",
          "answer": "Yes. Your library is stored in an isolated environment for your hospital or clinic alone, is never used to train AI models, and is never shared with other organisations. Data is encrypted at rest and in transit, every query is logged for your audit trail, and it supports your information governance."
        }
      ],
      "cta": {
        "heading": "Give every clinician the right answer, including your agency and locum staff.",
        "sub": "See how CareStream works for your independent hospital or clinic."
      }
    }
  },
  {
    "slug": "gp-practices",
    "label": "GP Practices and Primary Care",
    "sort": 9,
    "config": {
      "slug": "gp-practices",
      "label": "GP Practices and Primary Care",
      "settingNoun": "practice",
      "navDescription": "One place for the whole practice team to find the current policy, from reception to the consulting room.",
      "iconKey": "stethoscope",
      "meta": {
        "title": "CareStream for GP Practices and Primary Care",
        "description": "CareStream gives the whole practice team instant access to your policies and protocols, training, audits and CQC tools, in any language, between patients, with every query logged for inspection.",
        "ogDescription": "Instant access to practice policies, protocols, training and CQC tools for clinical, nursing, reception and admin staff, in any language."
      },
      "hero": {
        "h1": "The right answer between patients, for the whole practice team, in every language they speak.",
        "subtitle": "GP practices are small busy teams with a large set of policies and protocols, where the practice manager often wears many hats and clinical, nursing, reception and admin staff all need quick answers. CareStream gives everyone instant access to your current policies, training and CQC tools, grounded in your own documents."
      },
      "mockup": {
        "orgName": "Elm Tree Surgery",
        "badge": "Morning clinic",
        "tabs": [
          "Policies",
          "Protocols",
          "Training",
          "CQC"
        ],
        "question": "What is our chaperone policy for intimate examinations?",
        "policyName": "From your Chaperone Policy",
        "answer": "Offer a chaperone to every patient for an intimate examination and record whether one was accepted or declined, and who acted as chaperone. Do not proceed if a patient wants a chaperone and one is not available.",
        "citation": "Chaperone Policy v1.2 · Section 1",
        "followups": [
          "Where do I record this?",
          "Who can act as a chaperone?"
        ]
      },
      "challenge": {
        "h2": "Small busy teams, a large policy set, and a regulator that looks closely.",
        "para1": "A GP needs to confirm your chaperone policy without leaving the consulting room. A healthcare assistant is unsure of your infection prevention and control protocol. A receptionist is asked about a complaint or a significant event and is not sure of the process. The practice manager, who often has no dedicated compliance support, cannot answer every question in person.",
        "para2": "Primary care is inspected closely on safety, governance and how staff apply your policies in practice. CareStream closes the gap between the protocol on file and what happens at the front desk or in the clinic, for every member of the team, between one patient and the next.",
        "items": [
          {
            "iconKey": "clock",
            "title": "Answers between patients",
            "body": "People need the right answer in the few minutes between appointments, without leaving the room or the desk."
          },
          {
            "iconKey": "users",
            "title": "A mixed clinical and admin team",
            "body": "GPs, practice nurses, healthcare assistants, reception and admin staff all need consistent answers from the same current policies."
          },
          {
            "iconKey": "policies",
            "title": "A large set of policies and protocols",
            "body": "Practices carry a big library covering clinical, infection control, governance and employment, often with no spare capacity to manage it."
          },
          {
            "iconKey": "shield",
            "title": "Close CQC scrutiny",
            "body": "Inspectors look hard at safety, infection prevention, safeguarding, significant events and information governance."
          }
        ]
      },
      "servicesH2": "One platform for policies, protocols, training, audits and CQC.",
      "serviceDescriptions": {
        "policies": "Clinical policies and practice protocols answerable between patients, in any language, with the source policy and version cited.",
        "hr": "Your staff handbook on demand for clinical, nursing, reception and admin staff. Leave, pay and employment questions answered any time.",
        "training": "Modules built from your own policies and protocols, delivered in the hub, with renewal reminders for mandatory training.",
        "audits": "Guided audits for infection prevention and control, significant events and prescribing, scored as you go and inspection-ready.",
        "cqc": "Evidence that builds itself, plus regulation coverage showing where your policies leave a gap.",
        "staffq": "Prepare your clinical, nursing, reception and admin staff for the conversations inspectors have around the practice.",
        "reportchat": "Upload your inspection report and chat with it, cross-referenced against your own policies.",
        "continuity": "Make your continuity information instantly reachable by every member of the practice team."
      },
      "scenarios": {
        "h2": "How your practice uses CareStream, day to day.",
        "sub": "CareStream is not another system your team has to remember to use. It fits the moments that already happen across a busy practice day, and gives the right answer at the moment it matters.",
        "items": [
          {
            "tag": "In the consulting room",
            "body": "A GP is about to carry out an intimate examination and wants to confirm the chaperone process and where to record it. Rather than step out or guess, they ask CareStream and get your exact policy, with the source shown, in seconds, and document it correctly."
          },
          {
            "tag": "At the front desk",
            "body": "A receptionist is asked how to raise a complaint, or notices something that may be a significant event. Instead of promising to find out, they check the hub and follow your approved process straight away, so nothing is missed."
          },
          {
            "tag": "During a treatment room session",
            "body": "A healthcare assistant is unsure of your infection prevention and control steps for a procedure. They check the protocol in the hub at the point of care, see the answer with the source, and carry it out correctly."
          },
          {
            "tag": "A new starter settling in",
            "body": "A new practice nurse is not yet sure of your local processes. Instead of interrupting colleagues, they ask the hub and receive your approved protocol every time, so their practice matches the rest of the team from their first day."
          },
          {
            "tag": "In a language they are confident in",
            "body": "A cleaner or admin assistant whose first language is not English asks an infection control or safeguarding question by voice, in their own language, and listens to the answer read back. The guidance is exactly the same an English-speaking colleague would receive."
          },
          {
            "tag": "Getting ready for inspection",
            "body": "Before an inspection, the practice manager sends CQC practice questions to the team, reviews who has answered, and checks the regulation coverage report to see where a policy needs strengthening, all before the inspector arrives."
          }
        ]
      },
      "deepDive": {
        "label": "Answers For The Whole Practice Team",
        "h2": "Your policies and protocols, answered the moment they are needed.",
        "para1": "Clinical, nursing, reception and admin staff ask a question in plain language and get the answer from your own current policy, with the source and version shown. No hunting through a shared drive, no waiting to ask the practice manager, and no guessing.",
        "para2": "Because every answer is grounded in your documents and cites them, everyone from the GP to the front desk acts on the same approved guidance, every time.",
        "chips": [
          "Infection prevention and control",
          "Chaperoning",
          "Safeguarding",
          "Significant event reporting",
          "Medicines and prescribing",
          "Consent and capacity",
          "Complaints",
          "Health and safety"
        ],
        "panelH3": "In the language your team thinks in.",
        "panelBody": "Your policies stay in English. Any member of the team, clinical, reception, admin or cleaning, whose first language is not English can ask in their own language, by typing or speaking, and hear the answer read back. Nobody is held back by a written protocol they find hard to follow at speed.",
        "points": [
          "Over 60 languages, detected automatically",
          "Speak the question and listen to the answer",
          "The same accurate guidance for every member of the team"
        ]
      },
      "outcomes": {
        "h2": "A confident team, less on the practice manager, and inspection evidence that builds itself.",
        "items": [
          {
            "iconKey": "stethoscope",
            "title": "Answers between patients",
            "body": "Staff get approved guidance at the point of care or the front desk, without leaving the room or waiting to ask."
          },
          {
            "iconKey": "users",
            "title": "Consistent practice across the team",
            "body": "Clinical, nursing, reception and admin staff act on the same current policies, so practice is consistent whoever is asked."
          },
          {
            "iconKey": "heart",
            "title": "Less pressure on the practice manager",
            "body": "The team self-serves the right answer from your own documents, so the practice manager is not the single point of every query."
          },
          {
            "iconKey": "graduation",
            "title": "Mandatory training kept current",
            "body": "Training built from your own policies, with automatic renewal reminders and a live compliance dashboard."
          },
          {
            "iconKey": "chart",
            "title": "Inspection evidence on tap",
            "body": "Every query is logged, and your CQC readiness builds itself from real, day-to-day policy use."
          },
          {
            "iconKey": "globe",
            "title": "A workforce supported in its own language",
            "body": "Every member of the team understands your protocols, whatever language they are most confident in."
          }
        ]
      },
      "cqc": {
        "h2": "Built around the areas inspectors look at most.",
        "intro": "Practices are assessed closely on safety, governance and how staff apply your policies. CareStream gives you evidence that your policies are live and in use, prepares your team for inspector conversations, and shows you where your policies leave a gap before an inspection finds it.",
        "cards": [
          {
            "iconKey": "chart",
            "title": "Evidence of policy use",
            "body": "Every policy query is logged by role, language and date, building a CQC Readiness Report you can download as a PDF."
          },
          {
            "iconKey": "staffq",
            "title": "Staff ready to be asked",
            "body": "Inspector-style questions across the five key questions, answered by staff in their own words and scored by AI, with review and retry."
          },
          {
            "iconKey": "shield",
            "title": "Regulation coverage",
            "body": "CareStream reads the content of your policies and shows which regulations are covered, partly covered, or a gap."
          }
        ]
      },
      "faqs": [
        {
          "question": "Can it answer protocol questions, not just admin policies?",
          "answer": "Yes. CareStream answers from the documents you upload, including your clinical protocols and practice procedures. A clinician can ask about chaperoning, infection control, prescribing or safeguarding and get an answer drawn from your own policy, with the source and version shown so they can check it."
        },
        {
          "question": "Does it replace clinical judgement or training?",
          "answer": "No. CareStream points staff to your own approved policies and protocols. It supports professional judgement and your training, it does not replace them, and every answer cites the policy it came from."
        },
        {
          "question": "Our team includes staff whose first language is not English. Does it help?",
          "answer": "Yes. Any member of the team, clinical, reception, admin or cleaning, can ask in over 60 languages and get the answer back in the same language, while your policies stay in English. It means everyone follows the same guidance, whatever language they are most confident in."
        },
        {
          "question": "How does it help with mandatory training and renewals?",
          "answer": "CareStream can build training modules from your own policies, deliver them in the hub, and send automatic renewal reminders at 90, 30 and 7 days, with a live compliance dashboard so you can see exactly who is current and who is due."
        },
        {
          "question": "Is patient and practice information kept private and secure?",
          "answer": "Yes. Your library is stored in an isolated environment for your practice alone, is never used to train AI models, and is never shared with other organisations. Data is encrypted at rest and in transit, and every query is logged, supporting your information governance."
        },
        {
          "question": "How quickly can a practice get started?",
          "answer": "Most practices are up and running the same day. You upload your policies, invite your team with a one-tap sign-in link, and staff can begin asking questions straight away."
        }
      ],
      "cta": {
        "heading": "Give your whole practice team the right answer, between patients.",
        "sub": "See how CareStream works for your practice."
      }
    }
  },
  {
    "slug": "dental-practices",
    "label": "Dental Practices",
    "sort": 10,
    "config": {
      "slug": "dental-practices",
      "label": "Dental Practices",
      "settingNoun": "practice",
      "iconKey": "shield",
      "navDescription": "Decontamination, radiography and emergency answers for the whole dental team, between patients.",
      "meta": {
        "title": "CareStream for Dental Practices",
        "description": "CareStream gives the whole dental team instant access to your decontamination, radiography, emergency and compliance policies, in any language, between patients, with every query logged for inspection.",
        "ogDescription": "Instant access to decontamination, radiography, emergency and compliance answers for your whole dental team, in any language, between patients."
      },
      "hero": {
        "h1": "The right answer between patients, for the whole dental team, in every language they speak.",
        "subtitle": "Dental practices run small teams to a packed appointment book, with decontamination, radiography, medical emergencies and a regulator that expects CQC and GDC standards to be met together. CareStream gives every member of your team instant access to your protocols and policies, grounded in your own documents, without leaving the surgery."
      },
      "mockup": {
        "orgName": "Bridge Street Dental",
        "badge": "Between patients",
        "tabs": [
          "Policies",
          "Protocols",
          "Training",
          "CQC"
        ],
        "question": "What is our decontamination process between patients?",
        "policyName": "From your Decontamination Policy",
        "answer": "Follow your decontamination cycle: clean, inspect, sterilise and store instruments correctly, and record each cycle. Use the right PPE and keep clean and dirty areas separated at all times.",
        "citation": "Decontamination Policy v2.3 · Section 3",
        "followups": [
          "How do I record a cycle?",
          "What PPE is needed?"
        ]
      },
      "challenge": {
        "h2": "A small team, a packed book, and two sets of standards to meet at once.",
        "para1": "A dental nurse needs the decontamination steps confirmed before the next patient walks in, but the practice manager is on a call and the policy folder is in the office. A new associate is unsure of your local radiography protocol. A team member whose first language is not English struggles to follow a written procedure with the next patient already waiting.",
        "para2": "Dental practices are inspected by CQC while the clinical team also works to GDC standards, all with a small team and very little spare time. CareStream closes the gap between the protocol on paper and the practice in the surgery, for every member of the team, between patients.",
        "items": [
          {
            "iconKey": "clock",
            "title": "A packed appointment book",
            "body": "Questions about decontamination, radiography and protocols come up between patients, with no time to hunt through a folder."
          },
          {
            "iconKey": "users",
            "title": "A small, mixed team",
            "body": "Dentists, hygienists, therapists, nurses and reception all need consistent answers from the same approved protocols."
          },
          {
            "iconKey": "shield",
            "title": "Decontamination and infection control",
            "body": "Instrument processing, PPE and clean and dirty separation have to be right every single time, and recorded."
          },
          {
            "iconKey": "cqc",
            "title": "CQC alongside GDC standards",
            "body": "Inspectors look at safety, radiography and emergencies, while the clinical team also works to GDC expectations."
          }
        ]
      },
      "servicesH2": "One platform for protocols, training, audits and CQC.",
      "serviceDescriptions": {
        "policies": "Decontamination, radiography and emergency protocols answerable in the surgery, in any language, with the source policy and version cited.",
        "hr": "Your staff handbook on demand for the whole practice. Leave, pay and employment questions answered any time.",
        "training": "Modules built from your own protocols, delivered in the hub, with renewal reminders for mandatory training.",
        "audits": "Guided audits for decontamination, infection control, radiography and health and safety, scored as you go and inspection-ready.",
        "cqc": "Evidence that builds itself, plus regulation coverage showing where your policies leave a gap.",
        "staffq": "Prepare your dentists, nurses and reception for the conversations inspectors have on the floor.",
        "reportchat": "Upload your inspection report and chat with it, cross-referenced against your own policies.",
        "continuity": "Make your continuity information instantly reachable by every member of the team, on any day."
      },
      "scenarios": {
        "h2": "How your practice uses CareStream, day to day.",
        "sub": "CareStream is not another system your team has to remember to use. It fits the moments that already happen between patients, and gives the right answer at the moment it matters.",
        "items": [
          {
            "tag": "Between patients",
            "body": "A dental nurse turning the surgery around wants to confirm the decontamination steps before the next patient is seated. Rather than wait for the practice manager, they ask CareStream and get your exact cycle, drawn from your own policy, in seconds. The room is ready on time and recorded correctly."
          },
          {
            "tag": "A new associate settling in",
            "body": "A newly arrived associate is not yet sure of your local radiography protocol. Instead of interrupting colleagues or guessing, they ask the hub and receive your approved procedure every time, so their practice matches the rest of the team from their very first list."
          },
          {
            "tag": "A medical emergency in the chair",
            "body": "A patient becomes faint and unwell in the chair. A team member checks your medical emergency protocol in the hub, sees the immediate steps and where the emergency kit and drugs are kept, drawn from your own policy, and the team responds together."
          },
          {
            "tag": "When a patient raises a concern",
            "body": "A patient at reception raises a complaint about their treatment. Reception checks your complaints procedure in the hub and follows your exact steps and timescales, rather than promising to find out and ring back."
          },
          {
            "tag": "In a language they are confident in",
            "body": "A dental nurse whose first language is Portuguese asks an infection control question by voice, in Portuguese, and listens to the answer read back. The guidance is exactly the same as an English-speaking colleague would receive."
          },
          {
            "tag": "Getting ready for inspection",
            "body": "Before an inspection, the practice manager sends CQC practice questions to the team, reviews who has answered, and checks the regulation coverage report to see where a policy needs strengthening, all before the inspector arrives."
          }
        ]
      },
      "deepDive": {
        "label": "Answers Between Patients, For The Whole Team",
        "h2": "Your protocols, answered the moment they are needed, without leaving the surgery.",
        "para1": "Any member of the team asks a question in plain language and gets the answer from your own protocol, with the source and version shown. No hunting through a folder, no waiting until the manager is free, and no guessing with the next patient already waiting.",
        "para2": "Because every answer is grounded in your documents and cites them, your dentists, nurses, hygienists, therapists and reception act on the same approved guidance, every time.",
        "chips": [
          "Decontamination and infection control",
          "Radiography",
          "Medical emergencies",
          "Safeguarding",
          "Consent",
          "Complaints",
          "CQC and GDC standards",
          "Health and safety"
        ],
        "panelH3": "In the language your team thinks in.",
        "panelBody": "Your policies stay in English. A team member whose first language is not English can ask in Portuguese, Romanian, Polish or any of over 60 languages, by typing or speaking, and hear the answer read back in the same language. Nobody is held back by a written procedure they find hard to follow at speed.",
        "points": [
          "Over 60 languages, detected automatically",
          "Speak the question and listen to the answer",
          "The same accurate guidance for every member of the team"
        ]
      },
      "outcomes": {
        "h2": "Safer practice, a confident team, and inspection evidence that builds itself.",
        "items": [
          {
            "iconKey": "shield",
            "title": "Protocol answers between patients",
            "body": "The team gets approved guidance in the surgery, between patients, without waiting for the practice manager to be free."
          },
          {
            "iconKey": "users",
            "title": "Consistent practice across the team",
            "body": "Dentists, nurses, hygienists, therapists and reception act on the same protocols, so practice is consistent whoever is in."
          },
          {
            "iconKey": "globe",
            "title": "A team supported in its own language",
            "body": "Every member of the team understands your protocols, whatever language they are most confident in."
          },
          {
            "iconKey": "graduation",
            "title": "Mandatory training kept current",
            "body": "Training built from your own protocols, with automatic renewal reminders and a live compliance dashboard."
          },
          {
            "iconKey": "chart",
            "title": "Inspection evidence on tap",
            "body": "Every query is logged, and your CQC readiness builds itself from real, day-to-day policy use."
          },
          {
            "iconKey": "clock",
            "title": "New and locum staff up to speed fast",
            "body": "A new starter can ask your exact protocols from day one, instead of relying on whoever is nearby."
          }
        ]
      },
      "cqc": {
        "h2": "Built around the areas inspectors look at most.",
        "intro": "Dental practices are inspected by CQC on safety and effectiveness, while the clinical team also works to GDC standards. CareStream gives you evidence that your policies are live and in use, prepares your team for inspector conversations, and shows you where your policies leave a gap before an inspection finds it.",
        "cards": [
          {
            "iconKey": "chart",
            "title": "Evidence of policy use",
            "body": "Every policy query is logged by role, language and date, building a CQC Readiness Report you can download as a PDF."
          },
          {
            "iconKey": "staffq",
            "title": "Staff ready to be asked",
            "body": "Inspector-style questions across the five key questions, answered by staff in their own words and scored by AI, with review and retry."
          },
          {
            "iconKey": "shield",
            "title": "Regulation coverage",
            "body": "CareStream reads the content of your policies and shows which regulations are covered, partly covered, or a gap."
          }
        ]
      },
      "faqs": [
        {
          "question": "Can it answer clinical protocol questions, not just admin policies?",
          "answer": "Yes. CareStream answers from the documents you upload, including your clinical protocols. A team member can ask about decontamination, radiography, consent or your medical emergency protocol and get an answer drawn from your own policy, with the source and version shown so they can check it."
        },
        {
          "question": "Does it replace clinical judgement or training?",
          "answer": "No. CareStream points the team to your own approved protocols and guidance. It supports professional judgement, your training and GDC expectations, it does not replace them, and every answer cites the policy it came from."
        },
        {
          "question": "Our team speaks more than one language. Does it help?",
          "answer": "Yes. Staff can ask in over 60 languages and get the answer back in the same language, while your policies stay in English. This is a real help for the mixed teams found in many practices."
        },
        {
          "question": "How does it help with mandatory training and renewals?",
          "answer": "CareStream can build training modules from your own protocols, deliver them in the hub, and send automatic renewal reminders at 90, 30 and 7 days, with a live compliance dashboard so you can see exactly who is current and who is due."
        },
        {
          "question": "Is patient and practice information kept private and secure?",
          "answer": "Yes. Your library is stored in an isolated environment for your practice alone, is never used to train AI models, and is never shared with other organisations. Data is encrypted at rest and in transit, and every query is logged for your audit trail, supporting your information governance."
        },
        {
          "question": "How quickly can a dental practice get started?",
          "answer": "Most practices are up and running the same day. You upload your policies, invite your team with a one-tap sign-in link, and staff can begin asking questions straight away."
        }
      ],
      "cta": {
        "heading": "Give your whole dental team the right answer, between patients.",
        "sub": "See how CareStream works for your dental practice."
      }
    }
  }
]
