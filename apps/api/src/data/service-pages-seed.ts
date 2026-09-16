// The starting copy for the seven /our-services pages, lifted out of the rebuilt content theme
// by carestream-theme-preview/extract_services_content.py so nobody had to retype it.
//
// This is a STARTING POINT, not the source of truth. Once a page is seeded, the row in
// service_pages is what the site renders and what the console edits. Re-running the seed
// refreshes a page back to this copy, which is what you want after a theme change and very much
// not what you want after someone has edited it, so the seed endpoint skips pages that already
// exist unless it is explicitly told to overwrite.
//
// `slug` is the LIVE flat URL (/care-audits), not the theme's nested path
// (/our-services/care-audits). No URL changes in this switchover.

/** An icon as shapes, rebuilt as real elements by the template. Never stored as markup. */
export interface ServiceIconShape {
  tag: 'path' | 'circle' | 'rect'
  d?: string
  cx?: string; cy?: string; r?: string
  x?: string; y?: string; width?: string; height?: string; rx?: string
}

/** One entry in a part: a card, a step, a stat, a question. The shapes differ in the design but
 *  reduce to the same parts, which is why one template can render all of them. */
export interface ServiceItem {
  /** The card's icon. Empty where the design has none. */
  icon?: ServiceIconShape[]
  /** A flag emoji, on the language demo's rows. */
  flag?: string
  /** "01", or a figure like "Under an hour". Empty where the design has none. */
  marker: string
  tag: string
  /** 'dim' or 'good' on the two-column comparison, empty elsewhere. */
  tone: string
  title: string
  /** A LIST, because some items put a bullet list between their paragraphs. Joining across
   *  that invented a sentence that appears nowhere on the page. */
  paras: string[]
  bullets: string[]
}

/** One part of a section. A section is NOT one kind: the theme builds sections out of parts
 *  (a table and a list inside an image split, cards hoisted below it), and storing each section
 *  as a single kind flattened or lost everything but the first. */
export interface ServicePart {
  kind: 'cards' | 'steps' | 'stats' | 'table' | 'ticks' | 'compare' | 'timeline' | 'note'
    | 'prompts' | 'asks' | 'channels' | 'langdemo' | 'frameworks' | 'faq'
  /** Where it sits when the section has an image: in the copy column beside it, or after the
   *  split at full width. Empty when the section has no split. */
  where: '' | 'in' | 'after'
  /** A small subheading above the part ("How it works"). */
  sub: string
  /** The layout modifiers, read from the theme: column count, hoisted, inplace. */
  variant: string
  items: ServiceItem[]
  bullets: string[]
  /** A line above and below the items, on the language demo and the frameworks list. */
  header: string
  footer: string
  /** Tables only. Rows, not prose: flattening a table loses which cell is which. */
  head?: string[]
  rows?: string[][]
  /** Notes only. */
  title?: string
  paras?: string[]
}

/** A button. Its wording, target and style are content: they differ between pages. */
export interface ServiceAction {
  label: string
  href: string
  style: 'solid' | 'ghost'
  /** Carries the play mark, as the hero's demo button does. */
  play: boolean
}

/** One section of the page. */
export interface ServiceBlock {
  /** The first part's kind, 'prose' for a section with none, or 'end' for the closing band. */
  kind: ServicePart['kind'] | 'prose' | 'end' | 'split'
  /** The anchor the page's contents nav links to, where the theme gives one. */
  id: string
  /** The theme alternates plain and tinted bands. Losing this is what flattened /uses. */
  tint: boolean
  label: string
  heading: string
  intro: string[]
  image: string | null
  /** Whether the section puts its copy beside its image. */
  split?: boolean
  flip: boolean
  narrow: boolean
  parts: ServicePart[]
  actions?: ServiceAction[]
}

export interface ServicePageSeed {
  slug: string
  title: string
  meta_title: string
  meta_description: string
  hero_image_url: string
  content: {
    eyebrow: string
    lede: string[]
    actions: ServiceAction[]
    /** The "On this page" nav, on /how-it-works. */
    toc: { href: string; label: string }[]
    blocks: ServiceBlock[]
  }
  sort: number
}

export const SERVICE_PAGE_SEEDS: ServicePageSeed[] = [
  {
    "slug": "business-continuity",
    "title": "When things go wrong, your staff need answers fast. Not a folder they have never read.",
    "meta_title": "When things go wrong, your staff need answers fast. Not a folder they have never read. | CareStreamAI",
    "meta_description": "CQC requires every registered care service to have a business continuity plan. But a plan that sits in a filing cabinet and has never been accessed by frontline staff is not a plan your service can actually use. CareStreamAI makes every procedure in your plan instantly queryable by any member of you",
    "hero_image_url": "/images/our-services/business-continuity/1.webp",
    "content": {
      "eyebrow": "Business Continuity",
      "lede": [
        "CQC requires every registered care service to have a business continuity plan. But a plan that sits in a filing cabinet and has never been accessed by frontline staff is not a plan your service can actually use. CareStreamAI makes every procedure in your plan instantly queryable by any member of your team, on any channel, at any time."
      ],
      "actions": [
        {
          "label": "Start free trial",
          "href": "/register",
          "style": "solid",
          "play": false
        },
        {
          "label": "Book a demo",
          "href": "/demo",
          "style": "ghost",
          "play": true
        }
      ],
      "toc": [],
      "blocks": [
        {
          "kind": "compare",
          "id": "",
          "tint": true,
          "label": "The Problem With Business Continuity Plans",
          "heading": "Most BC plans are written for inspectors. Not for staff who need them at 2am.",
          "intro": [
            "Care setting managers spend hours writing business continuity plans that cover power failures, staff shortages, IT outages, severe weather, and supply disruptions. Those plans are filed, reviewed at the annual inspection, and rarely opened again.",
            "When a real disruption happens, the care worker on a night shift does not know where the plan is, what it says about their specific scenario, or who to contact. CareStreamAI makes the plan accessible to everyone, in the moment they need it, on the phone already in their pocket."
          ],
          "image": null,
          "split": false,
          "flip": false,
          "narrow": false,
          "parts": [
            {
              "kind": "compare",
              "where": "",
              "sub": "",
              "variant": "",
              "items": [
                {
                  "icon": [],
                  "flag": "",
                  "marker": "",
                  "tag": "Traditional BC plan",
                  "tone": "dim",
                  "title": "",
                  "paras": [
                    "A detailed document that satisfies inspectors during a visit, but which frontline staff have never read and cannot access during an actual disruption."
                  ],
                  "bullets": []
                },
                {
                  "icon": [],
                  "flag": "",
                  "marker": "",
                  "tag": "CareStreamAI BC plan",
                  "tone": "good",
                  "title": "",
                  "paras": [
                    "Your business continuity procedures are uploaded as knowledge and instantly queryable by any staff member via the hub, email, or voice, even when other systems are unavailable."
                  ],
                  "bullets": []
                }
              ],
              "bullets": [],
              "header": "",
              "footer": ""
            }
          ],
          "actions": []
        },
        {
          "kind": "steps",
          "id": "",
          "tint": false,
          "label": "How CareStreamAI Business Continuity Works",
          "heading": "Upload your plan once. Your whole team can query it instantly.",
          "intro": [
            "No new system. No login. No session to attend. Your business continuity plan becomes a live, queryable resource that any staff member can access via the hub or email, even when your care management system or internet connection is unavailable."
          ],
          "image": null,
          "split": false,
          "flip": false,
          "narrow": false,
          "parts": [
            {
              "kind": "steps",
              "where": "",
              "sub": "",
              "variant": "inplace",
              "items": [
                {
                  "icon": [],
                  "flag": "",
                  "marker": "01",
                  "tag": "",
                  "tone": "",
                  "title": "Upload your business continuity plan",
                  "paras": [
                    "Add your business continuity plan to the CareStreamAI knowledge base. It joins your policies, procedures, and other documents as a source the AI can draw from when staff ask questions. Updates to the plan are reflected immediately."
                  ],
                  "bullets": []
                },
                {
                  "icon": [],
                  "flag": "",
                  "marker": "02",
                  "tag": "",
                  "tone": "",
                  "title": "Staff ask what to do in any scenario",
                  "paras": [
                    "During a disruption, any staff member can ask CareStreamAI exactly what the procedure is for their specific situation. Via the hub, email, or voice, they get an answer drawn from your actual plan, not a generic response."
                  ],
                  "bullets": []
                },
                {
                  "icon": [],
                  "flag": "",
                  "marker": "03",
                  "tag": "",
                  "tone": "",
                  "title": "Gaps in your plan are surfaced automatically",
                  "paras": [
                    "CareStreamAI identifies questions your staff ask that your current plan does not cover. The policy gaps report shows you which scenarios are undocumented, so you can update the plan before a real disruption exposes the weakness."
                  ],
                  "bullets": []
                }
              ],
              "bullets": [],
              "header": "",
              "footer": ""
            }
          ],
          "actions": []
        },
        {
          "kind": "cards",
          "id": "",
          "tint": true,
          "label": "See It In Action",
          "heading": "A staff member gets the right answer in under 30 seconds during a live incident.",
          "intro": [
            "When a care worker asks what to do during a specific disruption, CareStreamAI retrieves the relevant section of your business continuity plan and delivers a clear, step-by-step response. The answer is specific to your service and your procedures, not a generic guide.",
            "Because the response comes via the hub or email, staff can access it on any device, even when your care management system or internet connection is down.",
            "The answer comes from your plan. Not from memory."
          ],
          "image": "/images/our-services/business-continuity/2.webp",
          "split": true,
          "flip": true,
          "narrow": false,
          "parts": [
            {
              "kind": "cards",
              "where": "after",
              "sub": "",
              "variant": "hoisted c3",
              "items": [
                {
                  "icon": [
                    {
                      "tag": "path",
                      "d": "M12 4v5M12 15v5M4 12h5M15 12h5"
                    },
                    {
                      "tag": "circle",
                      "cx": "12",
                      "cy": "12",
                      "r": "2.6"
                    }
                  ],
                  "flag": "",
                  "marker": "",
                  "tag": "",
                  "tone": "",
                  "title": "Staff shortage",
                  "paras": [
                    "We have three call-outs this morning and cannot safely cover the floor. What is the procedure?"
                  ],
                  "bullets": []
                },
                {
                  "icon": [
                    {
                      "tag": "path",
                      "d": "M12 4v5M12 15v5M4 12h5M15 12h5"
                    },
                    {
                      "tag": "circle",
                      "cx": "12",
                      "cy": "12",
                      "r": "2.6"
                    }
                  ],
                  "flag": "",
                  "marker": "",
                  "tag": "",
                  "tone": "",
                  "title": "IT outage",
                  "paras": [
                    "The care management system is down on a night shift and we cannot access care records. What do we do?"
                  ],
                  "bullets": []
                },
                {
                  "icon": [
                    {
                      "tag": "path",
                      "d": "M12 4v5M12 15v5M4 12h5M15 12h5"
                    },
                    {
                      "tag": "circle",
                      "cx": "12",
                      "cy": "12",
                      "r": "2.6"
                    }
                  ],
                  "flag": "",
                  "marker": "",
                  "tag": "",
                  "tone": "",
                  "title": "Severe weather",
                  "paras": [
                    "Two members of staff cannot get in due to snow. What are the steps for managing a weather-related staff shortage?"
                  ],
                  "bullets": []
                }
              ],
              "bullets": [],
              "header": "",
              "footer": ""
            }
          ],
          "actions": []
        },
        {
          "kind": "cards",
          "id": "",
          "tint": false,
          "label": "Built for Real Disruptions",
          "heading": "A business continuity resource that actually works when things go wrong.",
          "intro": [
            "The true test of a business continuity plan is not whether it satisfies an inspector. It is whether a care worker on a night shift can use it."
          ],
          "image": null,
          "split": false,
          "flip": false,
          "narrow": false,
          "parts": [
            {
              "kind": "cards",
              "where": "",
              "sub": "",
              "variant": "inplace c3",
              "items": [
                {
                  "icon": [
                    {
                      "tag": "path",
                      "d": "M12 4v5M12 15v5M4 12h5M15 12h5"
                    },
                    {
                      "tag": "circle",
                      "cx": "12",
                      "cy": "12",
                      "r": "2.6"
                    }
                  ],
                  "flag": "",
                  "marker": "",
                  "tag": "",
                  "tone": "",
                  "title": "Accessible on any device when other systems are down",
                  "paras": [
                    "The hub runs on any phone or browser, independently of your care management system, your local network, and your building infrastructure. Staff can access your BC plan procedures even when everything else is unavailable."
                  ],
                  "bullets": []
                },
                {
                  "icon": [
                    {
                      "tag": "path",
                      "d": "M12 4v5M12 15v5M4 12h5M15 12h5"
                    },
                    {
                      "tag": "circle",
                      "cx": "12",
                      "cy": "12",
                      "r": "2.6"
                    }
                  ],
                  "flag": "",
                  "marker": "",
                  "tag": "",
                  "tone": "",
                  "title": "Automatic gap detection",
                  "paras": [
                    "When staff ask questions that your current plan does not cover, CareStreamAI flags the gap in the policy gaps report. You find weaknesses before an incident exposes them."
                  ],
                  "bullets": []
                },
                {
                  "icon": [
                    {
                      "tag": "path",
                      "d": "M12 4v5M12 15v5M4 12h5M15 12h5"
                    },
                    {
                      "tag": "circle",
                      "cx": "12",
                      "cy": "12",
                      "r": "2.6"
                    }
                  ],
                  "flag": "",
                  "marker": "",
                  "tag": "",
                  "tone": "",
                  "title": "Instant plan updates",
                  "paras": [
                    "When you revise your business continuity plan, the updated version is available to all staff immediately. No printing, no distribution, no waiting for the next staff meeting."
                  ],
                  "bullets": []
                },
                {
                  "icon": [
                    {
                      "tag": "path",
                      "d": "M12 4v5M12 15v5M4 12h5M15 12h5"
                    },
                    {
                      "tag": "circle",
                      "cx": "12",
                      "cy": "12",
                      "r": "2.6"
                    }
                  ],
                  "flag": "",
                  "marker": "",
                  "tag": "",
                  "tone": "",
                  "title": "Accessible to every staff member",
                  "paras": [
                    "Every member of your team can query the plan, not only managers. A care worker, a kitchen assistant, or a new starter can ask what to do in a specific scenario and get the right answer."
                  ],
                  "bullets": []
                },
                {
                  "icon": [
                    {
                      "tag": "path",
                      "d": "M12 4v5M12 15v5M4 12h5M15 12h5"
                    },
                    {
                      "tag": "circle",
                      "cx": "12",
                      "cy": "12",
                      "r": "2.6"
                    }
                  ],
                  "flag": "",
                  "marker": "",
                  "tag": "",
                  "tone": "",
                  "title": "Staff familiarisation testing",
                  "paras": [
                    "Use CareStreamAI to send scenario-based questions about your business continuity procedures to staff as part of their onboarding or annual refresher. Build genuine familiarity, not just a signed acknowledgement."
                  ],
                  "bullets": []
                },
                {
                  "icon": [
                    {
                      "tag": "path",
                      "d": "M12 4v5M12 15v5M4 12h5M15 12h5"
                    },
                    {
                      "tag": "circle",
                      "cx": "12",
                      "cy": "12",
                      "r": "2.6"
                    }
                  ],
                  "flag": "",
                  "marker": "",
                  "tag": "",
                  "tone": "",
                  "title": "CQC-ready evidence at all times",
                  "paras": [
                    "Every staff query to the BC plan is logged. When an inspector asks how your staff access continuity procedures in a real emergency, you have a timestamped record of exactly how the plan is used."
                  ],
                  "bullets": []
                }
              ],
              "bullets": [],
              "header": "",
              "footer": ""
            }
          ],
          "actions": []
        },
        {
          "kind": "table",
          "id": "",
          "tint": true,
          "label": "CQC Evidence",
          "heading": "Evidence that your business continuity plan is genuinely embedded in practice.",
          "intro": [
            "CQC inspectors assess whether your business continuity arrangements are robust and whether staff know what to do in an emergency. A written plan is necessary but not sufficient. CareStreamAI gives you the evidence that the plan is actually used."
          ],
          "image": null,
          "split": false,
          "flip": false,
          "narrow": false,
          "parts": [
            {
              "kind": "table",
              "where": "",
              "sub": "",
              "variant": "inplace",
              "items": [],
              "bullets": [],
              "header": "",
              "footer": "",
              "head": [
                "What CareStream records",
                "What this shows"
              ],
              "rows": [
                [
                  "Staff queries to the BC plan",
                  "A log of every time a staff member accessed the business continuity plan via a question, showing it is a working resource rather than a document filed away for inspection purposes."
                ],
                [
                  "Specific scenarios queried",
                  "The exact scenarios staff have asked about, demonstrating which parts of the plan are actively known and where gaps in staff awareness exist."
                ],
                [
                  "Gap detection and remediation",
                  "When the system identifies a scenario not covered by the current plan, and the manager updates the plan in response, that sequence is recorded as evidence of active plan management."
                ],
                [
                  "Staff familiarisation testing",
                  "Records of scenario-based questions sent to staff about BC procedures, showing that familiarisation with the plan is a formal, tracked activity and not just a one-off briefing."
                ],
                [
                  "After-hours and out-of-hours access",
                  "Queries made outside normal working hours demonstrate that the plan is accessible to night staff and weekend workers, not only to managers during the working day."
                ],
                [
                  "Plan review dates and update history",
                  "The knowledge base records when each version of the plan was uploaded, providing a clear audit trail of review activity that satisfies the requirement for regular plan maintenance."
                ]
              ]
            },
            {
              "kind": "ticks",
              "where": "",
              "sub": "",
              "variant": "",
              "items": [],
              "bullets": [
                "What CareStreamAI records",
                "What this shows an inspector"
              ],
              "header": "",
              "footer": ""
            }
          ],
          "actions": []
        },
        {
          "kind": "cards",
          "id": "",
          "tint": false,
          "label": "Everything Included",
          "heading": "A business continuity plan your whole team can actually use.",
          "intro": [],
          "image": null,
          "split": false,
          "flip": false,
          "narrow": false,
          "parts": [
            {
              "kind": "cards",
              "where": "",
              "sub": "",
              "variant": "inplace c4",
              "items": [
                {
                  "icon": [
                    {
                      "tag": "path",
                      "d": "M12 4v5M12 15v5M4 12h5M15 12h5"
                    },
                    {
                      "tag": "circle",
                      "cx": "12",
                      "cy": "12",
                      "r": "2.6"
                    }
                  ],
                  "flag": "",
                  "marker": "",
                  "tag": "",
                  "tone": "",
                  "title": "Queryable BC plan",
                  "paras": [
                    "Upload your business continuity plan to the knowledge base and make every procedure instantly accessible to any staff member on any channel."
                  ],
                  "bullets": []
                },
                {
                  "icon": [
                    {
                      "tag": "path",
                      "d": "M12 4v5M12 15v5M4 12h5M15 12h5"
                    },
                    {
                      "tag": "circle",
                      "cx": "12",
                      "cy": "12",
                      "r": "2.6"
                    }
                  ],
                  "flag": "",
                  "marker": "",
                  "tag": "",
                  "tone": "",
                  "title": "Hub, email and voice access",
                  "paras": [
                    "Staff query the plan on the same channels they use for policy questions. No new system and no separate login."
                  ],
                  "bullets": []
                },
                {
                  "icon": [
                    {
                      "tag": "path",
                      "d": "M12 4v5M12 15v5M4 12h5M15 12h5"
                    },
                    {
                      "tag": "circle",
                      "cx": "12",
                      "cy": "12",
                      "r": "2.6"
                    }
                  ],
                  "flag": "",
                  "marker": "",
                  "tag": "",
                  "tone": "",
                  "title": "Offline-resilient delivery",
                  "paras": [
                    "The hub runs on any internet-connected device, independently of your care management system. The plan remains accessible even when other systems are unavailable."
                  ],
                  "bullets": []
                },
                {
                  "icon": [
                    {
                      "tag": "path",
                      "d": "M12 4v5M12 15v5M4 12h5M15 12h5"
                    },
                    {
                      "tag": "circle",
                      "cx": "12",
                      "cy": "12",
                      "r": "2.6"
                    }
                  ],
                  "flag": "",
                  "marker": "",
                  "tag": "",
                  "tone": "",
                  "title": "Automatic gap detection",
                  "paras": [
                    "Questions staff ask that the plan cannot answer are surfaced in the policy gaps report, helping you identify and fix weaknesses proactively."
                  ],
                  "bullets": []
                },
                {
                  "icon": [
                    {
                      "tag": "path",
                      "d": "M12 4v5M12 15v5M4 12h5M15 12h5"
                    },
                    {
                      "tag": "circle",
                      "cx": "12",
                      "cy": "12",
                      "r": "2.6"
                    }
                  ],
                  "flag": "",
                  "marker": "",
                  "tag": "",
                  "tone": "",
                  "title": "Staff familiarisation testing",
                  "paras": [
                    "Send scenario-based questions about BC procedures to staff as part of onboarding or annual review. Build genuine familiarity."
                  ],
                  "bullets": []
                },
                {
                  "icon": [
                    {
                      "tag": "path",
                      "d": "M12 4v5M12 15v5M4 12h5M15 12h5"
                    },
                    {
                      "tag": "circle",
                      "cx": "12",
                      "cy": "12",
                      "r": "2.6"
                    }
                  ],
                  "flag": "",
                  "marker": "",
                  "tag": "",
                  "tone": "",
                  "title": "Instant plan updates",
                  "paras": [
                    "When you revise the plan, the updated version is available immediately to all staff. No printing and no distribution required."
                  ],
                  "bullets": []
                },
                {
                  "icon": [
                    {
                      "tag": "path",
                      "d": "M12 4v5M12 15v5M4 12h5M15 12h5"
                    },
                    {
                      "tag": "circle",
                      "cx": "12",
                      "cy": "12",
                      "r": "2.6"
                    }
                  ],
                  "flag": "",
                  "marker": "",
                  "tag": "",
                  "tone": "",
                  "title": "Query analytics",
                  "paras": [
                    "See which scenarios staff ask about most frequently, which sections of the plan are accessed in real incidents, and where knowledge gaps are concentrated."
                  ],
                  "bullets": []
                },
                {
                  "icon": [
                    {
                      "tag": "path",
                      "d": "M12 4v5M12 15v5M4 12h5M15 12h5"
                    },
                    {
                      "tag": "circle",
                      "cx": "12",
                      "cy": "12",
                      "r": "2.6"
                    }
                  ],
                  "flag": "",
                  "marker": "",
                  "tag": "",
                  "tone": "",
                  "title": "CQC-ready audit log",
                  "paras": [
                    "A full log of all staff interactions with the BC plan, providing timestamped evidence that the plan is a genuinely embedded operational resource."
                  ],
                  "bullets": []
                }
              ],
              "bullets": [],
              "header": "",
              "footer": ""
            }
          ],
          "actions": []
        },
        {
          "kind": "stats",
          "id": "",
          "tint": true,
          "label": "",
          "heading": "",
          "intro": [],
          "image": null,
          "split": false,
          "flip": false,
          "narrow": false,
          "parts": [
            {
              "kind": "stats",
              "where": "",
              "sub": "",
              "variant": "",
              "items": [
                {
                  "icon": [],
                  "flag": "",
                  "marker": "30 sec",
                  "tag": "",
                  "tone": "",
                  "title": "average time for a staff member to get a specific BC procedure in the hub.",
                  "paras": [
                    "The same time it takes to find the right person to call, your staff already have the answer and can act."
                  ],
                  "bullets": []
                },
                {
                  "icon": [],
                  "flag": "",
                  "marker": "24/7",
                  "tag": "",
                  "tone": "",
                  "title": "your business continuity plan is accessible to every shift, including nights and weekends.",
                  "paras": [
                    "Disruptions do not only happen during office hours. CareStreamAI is available at all times on all channels."
                  ],
                  "bullets": []
                }
              ],
              "bullets": [],
              "header": "",
              "footer": ""
            }
          ],
          "actions": []
        },
        {
          "kind": "end",
          "id": "",
          "tint": false,
          "label": "",
          "heading": "See Business Continuity against your own policies",
          "intro": [
            "Plans accessible to every staff member, any time. Upload what you already have and see it working inside a fortnight."
          ],
          "image": null,
          "flip": false,
          "narrow": false,
          "parts": [],
          "actions": [
            {
              "label": "Start free trial",
              "href": "/register",
              "style": "solid",
              "play": false
            },
            {
              "label": "Book a demo",
              "href": "/demo",
              "style": "ghost",
              "play": false
            }
          ]
        }
      ]
    },
    "sort": 0
  },
  {
    "slug": "care-audits",
    "title": "Structured audits that take minutes to complete and produce a report you can actually use.",
    "meta_title": "Structured audits that take minutes to complete and produce a report you can actually use. | CareStreamAI",
    "meta_description": "Regular audits are a CQC expectation, but completing them manually is slow, inconsistently formatted, and rarely produces findings that lead to clear action. CareStream guides your team through structured audits in the hub, scores every section, and generates a formatted report with AI recommendatio",
    "hero_image_url": "/images/our-services/care-audits/1.webp",
    "content": {
      "eyebrow": "Care Audits",
      "lede": [
        "Regular audits are a CQC expectation, but completing them manually is slow, inconsistently formatted, and rarely produces findings that lead to clear action. CareStream guides your team through structured audits in the hub, scores every section, and generates a formatted report with AI recommendations the moment you finish."
      ],
      "actions": [
        {
          "label": "Start Free Trial",
          "href": "/register",
          "style": "solid",
          "play": false
        },
        {
          "label": "Book a Demo",
          "href": "/demo",
          "style": "ghost",
          "play": true
        }
      ],
      "toc": [],
      "blocks": [
        {
          "kind": "cards",
          "id": "",
          "tint": true,
          "label": "The Problem With Manual Audits",
          "heading": "Most care setting audits take too long, read differently every time, and rarely lead to action.",
          "intro": [
            "A care manager filling in a paper audit form or a spreadsheet can spend two to three hours on a single audit. The questions vary from month to month depending on who does it. The resulting report is filed, a few actions are noted, and the cycle repeats with the same weaknesses.",
            "CQC inspectors want to see that internal audits are consistent, that they produce clear findings, and that those findings come with sensible actions. CareStream gives every audit the same structure, scores each section as you go, and turns your answers into a formatted report with prioritised recommendations."
          ],
          "image": null,
          "split": false,
          "flip": false,
          "narrow": false,
          "parts": [
            {
              "kind": "cards",
              "where": "",
              "sub": "",
              "variant": "inplace c2",
              "items": [
                {
                  "icon": [
                    {
                      "tag": "path",
                      "d": "M12 4v5M12 15v5M4 12h5M15 12h5"
                    },
                    {
                      "tag": "circle",
                      "cx": "12",
                      "cy": "12",
                      "r": "2.6"
                    }
                  ],
                  "flag": "",
                  "marker": "",
                  "tag": "",
                  "tone": "",
                  "title": "Traditional manual audit",
                  "paras": [
                    "A manager spends two hours on a spreadsheet. The format changes each time. Findings are noted but inconsistently. The audit exists on paper but rarely reads the same way twice."
                  ],
                  "bullets": []
                },
                {
                  "icon": [
                    {
                      "tag": "path",
                      "d": "M12 4v5M12 15v5M4 12h5M15 12h5"
                    },
                    {
                      "tag": "circle",
                      "cx": "12",
                      "cy": "12",
                      "r": "2.6"
                    }
                  ],
                  "flag": "",
                  "marker": "",
                  "tag": "",
                  "tone": "",
                  "title": "CareStream audit",
                  "paras": [
                    "A structured audit is completed in the hub in well under an hour. Every section is scored, findings and actions are captured against each question, and a formatted report with AI recommendations is generated the moment you finish."
                  ],
                  "bullets": []
                }
              ],
              "bullets": [],
              "header": "",
              "footer": ""
            }
          ],
          "actions": []
        },
        {
          "kind": "cards",
          "id": "",
          "tint": false,
          "label": "How CareStream Audits Work",
          "heading": "Choose it, work through it, receive your report. No formatting, no spreadsheets.",
          "intro": [
            "Pre-built audit templates cover the areas CQC inspects. You work through each one section by section in the hub, and the report is generated automatically the moment the audit is complete."
          ],
          "image": null,
          "split": false,
          "flip": false,
          "narrow": false,
          "parts": [
            {
              "kind": "cards",
              "where": "",
              "sub": "",
              "variant": "inplace c3",
              "items": [
                {
                  "icon": [
                    {
                      "tag": "path",
                      "d": "M12 4v5M12 15v5M4 12h5M15 12h5"
                    },
                    {
                      "tag": "circle",
                      "cx": "12",
                      "cy": "12",
                      "r": "2.6"
                    }
                  ],
                  "flag": "",
                  "marker": "",
                  "tag": "",
                  "tone": "",
                  "title": "Choose the audit and start",
                  "paras": [
                    "CareStream ships with pre-built templates for medicines management, infection control, health and safety, fire safety, resident bedrooms, the kitchen, accident and incident records, and more. Choose a template, add your own, and start the audit yourself or have any manager or senior complete it."
                  ],
                  "bullets": []
                },
                {
                  "icon": [
                    {
                      "tag": "path",
                      "d": "M12 4v5M12 15v5M4 12h5M15 12h5"
                    },
                    {
                      "tag": "circle",
                      "cx": "12",
                      "cy": "12",
                      "r": "2.6"
                    }
                  ],
                  "flag": "",
                  "marker": "",
                  "tag": "",
                  "tone": "",
                  "title": "Guided, structured completion in the hub",
                  "paras": [
                    "You work through the audit section by section. Each question takes a clear Yes, No or Not Applicable, with space to record what you found and the action required. Your answers save as you go, so you can pause and pick up later on any device."
                  ],
                  "bullets": []
                },
                {
                  "icon": [
                    {
                      "tag": "path",
                      "d": "M12 4v5M12 15v5M4 12h5M15 12h5"
                    },
                    {
                      "tag": "circle",
                      "cx": "12",
                      "cy": "12",
                      "r": "2.6"
                    }
                  ],
                  "flag": "",
                  "marker": "",
                  "tag": "",
                  "tone": "",
                  "title": "Formatted report generated automatically",
                  "paras": [
                    "When the audit is complete, CareStream produces a formatted report showing each section score, your findings, the actions you recorded, your summary, and AI recommendations. The report is locked and ready to print, save as a PDF, or present to a CQC inspector."
                  ],
                  "bullets": []
                }
              ],
              "bullets": [],
              "header": "",
              "footer": ""
            }
          ],
          "actions": []
        },
        {
          "kind": "cards",
          "id": "",
          "tint": true,
          "label": "Build Your Own Audits",
          "heading": "Not just our templates, your audits too.",
          "intro": [
            "Every service audits things the standard templates do not cover. With CareStream you build your own audit in minutes, name it, add your questions, choose how often it runs, and it works exactly like the built-in ones. No spreadsheets, no setup, no formatting."
          ],
          "image": null,
          "split": false,
          "flip": false,
          "narrow": false,
          "parts": [
            {
              "kind": "cards",
              "where": "",
              "sub": "",
              "variant": "inplace c4",
              "items": [
                {
                  "icon": [
                    {
                      "tag": "path",
                      "d": "M12 4v5M12 15v5M4 12h5M15 12h5"
                    },
                    {
                      "tag": "circle",
                      "cx": "12",
                      "cy": "12",
                      "r": "2.6"
                    }
                  ],
                  "flag": "",
                  "marker": "",
                  "tag": "",
                  "tone": "",
                  "title": "Audit anything, your way",
                  "paras": [
                    "Build an audit for whatever matters to your service: kitchen hygiene, a maintenance walk-round, a supervision checklist, medication spot-checks. Add as many questions as you need, each with Yes, No, N/A and notes, or free-text findings."
                  ],
                  "bullets": []
                },
                {
                  "icon": [
                    {
                      "tag": "path",
                      "d": "M12 4v5M12 15v5M4 12h5M15 12h5"
                    },
                    {
                      "tag": "circle",
                      "cx": "12",
                      "cy": "12",
                      "r": "2.6"
                    }
                  ],
                  "flag": "",
                  "marker": "",
                  "tag": "",
                  "tone": "",
                  "title": "The same structured experience",
                  "paras": [
                    "Custom audits behave exactly like the ready-made ones: clear response buttons and a notes field on every question, answers that save as you go, section-by-section scoring, and a formatted report on completion."
                  ],
                  "bullets": []
                },
                {
                  "icon": [
                    {
                      "tag": "path",
                      "d": "M12 4v5M12 15v5M4 12h5M15 12h5"
                    },
                    {
                      "tag": "circle",
                      "cx": "12",
                      "cy": "12",
                      "r": "2.6"
                    }
                  ],
                  "flag": "",
                  "marker": "",
                  "tag": "",
                  "tone": "",
                  "title": "Allocate to the right people",
                  "paras": [
                    "Assign each audit to the staff who should carry it out. It appears in their hub on any device, ready to complete while they walk the home, so the right people own the right checks."
                  ],
                  "bullets": []
                },
                {
                  "icon": [
                    {
                      "tag": "path",
                      "d": "M12 4v5M12 15v5M4 12h5M15 12h5"
                    },
                    {
                      "tag": "circle",
                      "cx": "12",
                      "cy": "12",
                      "r": "2.6"
                    }
                  ],
                  "flag": "",
                  "marker": "",
                  "tag": "",
                  "tone": "",
                  "title": "Inspection-ready, automatically",
                  "paras": [
                    "Every audit, custom or built-in, generates AI recommendations mapped to the CQC Key Questions and is stored, formatted and ready to show an inspector. One consistent process instead of scattered paper and spreadsheets."
                  ],
                  "bullets": []
                }
              ],
              "bullets": [],
              "header": "",
              "footer": ""
            }
          ],
          "actions": []
        },
        {
          "kind": "ticks",
          "id": "",
          "tint": false,
          "label": "Link Audits to Training",
          "heading": "Close the loop, from policy to proven impact.",
          "intro": [
            "Build your own audit, link it to the training it measures, and CareStream shows you whether that training is actually improving practice. It joins up the whole cycle, in one place."
          ],
          "image": "/images/our-services/care-audits/2.webp",
          "split": true,
          "flip": false,
          "narrow": false,
          "parts": [
            {
              "kind": "ticks",
              "where": "in",
              "sub": "",
              "variant": "",
              "items": [],
              "bullets": [
                "It needs a few monthly audit runs to show a meaningful trend, and it shows a correlation rather than proof of cause. Even so, it is exactly the train, audit, improve and re-audit cycle that CQC's well-led question looks for."
              ],
              "header": "",
              "footer": ""
            },
            {
              "kind": "cards",
              "where": "after",
              "sub": "",
              "variant": "hoisted c4",
              "items": [
                {
                  "icon": [
                    {
                      "tag": "path",
                      "d": "M12 4v5M12 15v5M4 12h5M15 12h5"
                    },
                    {
                      "tag": "circle",
                      "cx": "12",
                      "cy": "12",
                      "r": "2.6"
                    }
                  ],
                  "flag": "",
                  "marker": "",
                  "tag": "",
                  "tone": "",
                  "title": "Upload your policies",
                  "paras": [
                    "Add your own policy documents. They become the single source of truth everything else is built from."
                  ],
                  "bullets": []
                },
                {
                  "icon": [
                    {
                      "tag": "path",
                      "d": "M12 4v5M12 15v5M4 12h5M15 12h5"
                    },
                    {
                      "tag": "circle",
                      "cx": "12",
                      "cy": "12",
                      "r": "2.6"
                    }
                  ],
                  "flag": "",
                  "marker": "",
                  "tag": "",
                  "tone": "",
                  "title": "Training generated from them",
                  "paras": [
                    "CareStream creates training modules grounded in your policies, so staff learn your way of working, not a generic course."
                  ],
                  "bullets": []
                },
                {
                  "icon": [
                    {
                      "tag": "path",
                      "d": "M12 4v5M12 15v5M4 12h5M15 12h5"
                    },
                    {
                      "tag": "circle",
                      "cx": "12",
                      "cy": "12",
                      "r": "2.6"
                    }
                  ],
                  "flag": "",
                  "marker": "",
                  "tag": "",
                  "tone": "",
                  "title": "Build an audit, linked to the training",
                  "paras": [
                    "Create an audit for the practice that training should improve, and link it to the module. The audit becomes your real-world measure of whether it worked."
                  ],
                  "bullets": []
                },
                {
                  "icon": [
                    {
                      "tag": "path",
                      "d": "M12 4v5M12 15v5M4 12h5M15 12h5"
                    },
                    {
                      "tag": "circle",
                      "cx": "12",
                      "cy": "12",
                      "r": "2.6"
                    }
                  ],
                  "flag": "",
                  "marker": "",
                  "tag": "",
                  "tone": "",
                  "title": "See the training impact",
                  "paras": [
                    "CareStream tracks the audit's compliance score against training completion over time, so you can see whether the training is landing in practice."
                  ],
                  "bullets": []
                }
              ],
              "bullets": [],
              "header": "",
              "footer": ""
            }
          ],
          "actions": []
        },
        {
          "kind": "prose",
          "id": "",
          "tint": true,
          "label": "See It In Action",
          "heading": "Every question is consistent, and every answer is captured in the same structure.",
          "intro": [
            "The guided audit walks you through every required question in the right order. Each question takes a Yes, No or Not Applicable, with space for what you found and the action to take, so every audit is formatted the same way regardless of who completes it.",
            "It can be completed on any device, at any time. Answers save as you go, so a manager finishing a medicines audit at the end of a shift takes the same structured path as one completing it at the start of the day.",
            "A clear answer and a note for every question, formatted identically every time."
          ],
          "image": "/images/our-services/care-audits/3.webp",
          "split": true,
          "flip": false,
          "narrow": false,
          "parts": [],
          "actions": []
        },
        {
          "kind": "cards",
          "id": "",
          "tint": false,
          "label": "Photo evidence",
          "heading": "Capture the evidence, right on the question.",
          "intro": [
            "When you spot something as you walk the floor, take a photo there and then. On a phone or tablet, your team can attach one or more images to any audit question as they go. The photos are optional, compressed automatically, and stored against that exact question, so when the audit is reviewed the evidence is right there beside the answer."
          ],
          "image": "/images/our-services/care-audits/4.webp",
          "split": true,
          "flip": true,
          "narrow": false,
          "parts": [
            {
              "kind": "cards",
              "where": "in",
              "sub": "",
              "variant": "stack3",
              "items": [
                {
                  "icon": [
                    {
                      "tag": "path",
                      "d": "M12 4v5M12 15v5M4 12h5M15 12h5"
                    },
                    {
                      "tag": "circle",
                      "cx": "12",
                      "cy": "12",
                      "r": "2.6"
                    }
                  ],
                  "flag": "",
                  "marker": "",
                  "tag": "",
                  "tone": "",
                  "title": "Every photo is waiting when the audit is reviewed.",
                  "paras": [
                    "When a manager or inspector reviews the completed audit, the photos appear beneath each question. Click any thumbnail to open it full size as part of your evidence trail."
                  ],
                  "bullets": []
                },
                {
                  "icon": [
                    {
                      "tag": "path",
                      "d": "M12 4v5M12 15v5M4 12h5M15 12h5"
                    },
                    {
                      "tag": "circle",
                      "cx": "12",
                      "cy": "12",
                      "r": "2.6"
                    }
                  ],
                  "flag": "",
                  "marker": "",
                  "tag": "",
                  "tone": "",
                  "title": "Attached to the exact question in the staff hub.",
                  "paras": [
                    "The evidence sits right under the answer, so anyone opening the audit can see exactly what was checked and what it looked like, not just a Yes or a No."
                  ],
                  "bullets": []
                },
                {
                  "icon": [
                    {
                      "tag": "path",
                      "d": "M12 4v5M12 15v5M4 12h5M15 12h5"
                    },
                    {
                      "tag": "circle",
                      "cx": "12",
                      "cy": "12",
                      "r": "2.6"
                    }
                  ],
                  "flag": "",
                  "marker": "",
                  "tag": "",
                  "tone": "",
                  "title": "Take or upload photos on a phone or tablet, question by question.",
                  "paras": [
                    "Out on the floor, tap Add to snap a photo or choose one from the gallery. Each image attaches to the question you are on, and they are compressed automatically so they upload quickly, even on care home wifi."
                  ],
                  "bullets": []
                }
              ],
              "bullets": [],
              "header": "",
              "footer": ""
            }
          ],
          "actions": []
        },
        {
          "kind": "prose",
          "id": "",
          "tint": true,
          "label": "The Finished Report",
          "heading": "A formatted report with every response, every section score, and your summary. Generated instantly.",
          "intro": [
            "The moment the last question is answered, the report is ready. No formatting, no copying responses into a template. The completed audit is stored in CareStream and can be printed, saved as a PDF, shared with the management team, or presented directly to a CQC inspector."
          ],
          "image": "/images/our-services/care-audits/5.webp",
          "split": true,
          "flip": false,
          "narrow": false,
          "parts": [],
          "actions": []
        },
        {
          "kind": "cards",
          "id": "",
          "tint": false,
          "label": "AI-Generated Recommendations",
          "heading": "Every completed audit generates a prioritised improvement plan. Automatically.",
          "intro": [
            "CareStream reads the responses from each completed audit and generates specific, prioritised recommendations based on what your findings actually show. Not generic advice from a template. Every recommendation is drawn from the answers you gave and the actions you recorded in that audit.",
            "Each recommendation references the specific finding it is based on, the risk it addresses, a suggested action, and a priority level, so managers can act immediately without having to interpret the audit data themselves.",
            "Each completed audit is stored alongside its recommendations and an overall AI rating of Outstanding, Good, Requires Improvement, or Inadequate, giving you a clear, consistent picture of where the service stands at the end of every audit.",
            "Recommendations tied directly to the findings that generated them."
          ],
          "image": "/images/our-services/care-audits/6.webp",
          "split": true,
          "flip": false,
          "narrow": false,
          "parts": [
            {
              "kind": "cards",
              "where": "after",
              "sub": "",
              "variant": "hoisted c3",
              "items": [
                {
                  "icon": [
                    {
                      "tag": "path",
                      "d": "M12 4v5M12 15v5M4 12h5M15 12h5"
                    },
                    {
                      "tag": "circle",
                      "cx": "12",
                      "cy": "12",
                      "r": "2.6"
                    }
                  ],
                  "flag": "",
                  "marker": "",
                  "tag": "",
                  "tone": "",
                  "title": "Specific to your findings",
                  "paras": [
                    "Recommendations reference the exact questions that returned a No, not the audit as a whole."
                  ],
                  "bullets": []
                },
                {
                  "icon": [
                    {
                      "tag": "path",
                      "d": "M12 4v5M12 15v5M4 12h5M15 12h5"
                    },
                    {
                      "tag": "circle",
                      "cx": "12",
                      "cy": "12",
                      "r": "2.6"
                    }
                  ],
                  "flag": "",
                  "marker": "",
                  "tag": "",
                  "tone": "",
                  "title": "Prioritised for you",
                  "paras": [
                    "Each recommendation carries a clear priority so the management team knows what to deal with first."
                  ],
                  "bullets": []
                },
                {
                  "icon": [
                    {
                      "tag": "path",
                      "d": "M12 4v5M12 15v5M4 12h5M15 12h5"
                    },
                    {
                      "tag": "circle",
                      "cx": "12",
                      "cy": "12",
                      "r": "2.6"
                    }
                  ],
                  "flag": "",
                  "marker": "",
                  "tag": "",
                  "tone": "",
                  "title": "An overall rating",
                  "paras": [
                    "Every completed audit is given an Outstanding, Good, Requires Improvement, or Inadequate rating based on the responses."
                  ],
                  "bullets": []
                }
              ],
              "bullets": [],
              "header": "",
              "footer": ""
            }
          ],
          "actions": []
        },
        {
          "kind": "cards",
          "id": "",
          "tint": true,
          "label": "A Complete Audit Toolkit",
          "heading": "From guided completion to section scoring to AI recommendations. One place for the whole audit.",
          "intro": [
            "CareStream gives every audit the same structure, scores it as you go, and turns your answers into a formatted, inspection-ready report."
          ],
          "image": null,
          "split": false,
          "flip": false,
          "narrow": false,
          "parts": [
            {
              "kind": "cards",
              "where": "",
              "sub": "",
              "variant": "inplace c3",
              "items": [
                {
                  "icon": [
                    {
                      "tag": "path",
                      "d": "M12 4v5M12 15v5M4 12h5M15 12h5"
                    },
                    {
                      "tag": "circle",
                      "cx": "12",
                      "cy": "12",
                      "r": "2.6"
                    }
                  ],
                  "flag": "",
                  "marker": "",
                  "tag": "",
                  "tone": "",
                  "title": "Ten pre-built templates",
                  "paras": [
                    "Medicines management, infection control, health and safety, fire safety, resident bedrooms, the kitchen, accident and incident records, and data protection. All ready to use, and you can build your own."
                  ],
                  "bullets": []
                },
                {
                  "icon": [
                    {
                      "tag": "path",
                      "d": "M12 4v5M12 15v5M4 12h5M15 12h5"
                    },
                    {
                      "tag": "circle",
                      "cx": "12",
                      "cy": "12",
                      "r": "2.6"
                    }
                  ],
                  "flag": "",
                  "marker": "",
                  "tag": "",
                  "tone": "",
                  "title": "Section-by-section scoring",
                  "paras": [
                    "Every Yes, No or Not Applicable is scored as you go, so you can see exactly which sections are strong and which need attention before you finish."
                  ],
                  "bullets": []
                },
                {
                  "icon": [
                    {
                      "tag": "path",
                      "d": "M12 4v5M12 15v5M4 12h5M15 12h5"
                    },
                    {
                      "tag": "circle",
                      "cx": "12",
                      "cy": "12",
                      "r": "2.6"
                    }
                  ],
                  "flag": "",
                  "marker": "",
                  "tag": "",
                  "tone": "",
                  "title": "Auto-save and resume",
                  "paras": [
                    "Answers save automatically as you work. Pause an audit and pick it up later on any device, exactly where you left off."
                  ],
                  "bullets": []
                },
                {
                  "icon": [
                    {
                      "tag": "path",
                      "d": "M12 4v5M12 15v5M4 12h5M15 12h5"
                    },
                    {
                      "tag": "circle",
                      "cx": "12",
                      "cy": "12",
                      "r": "2.6"
                    }
                  ],
                  "flag": "",
                  "marker": "",
                  "tag": "",
                  "tone": "",
                  "title": "Shift and room-by-room audits",
                  "paras": [
                    "Run audits by day or night shift, or room by room for resident bedroom checks, so the record matches how the audit is actually carried out."
                  ],
                  "bullets": []
                },
                {
                  "icon": [
                    {
                      "tag": "path",
                      "d": "M12 4v5M12 15v5M4 12h5M15 12h5"
                    },
                    {
                      "tag": "circle",
                      "cx": "12",
                      "cy": "12",
                      "r": "2.6"
                    }
                  ],
                  "flag": "",
                  "marker": "",
                  "tag": "",
                  "tone": "",
                  "title": "Inspection-ready reports",
                  "paras": [
                    "Each completed audit is locked and formatted, ready to print, save as a PDF, or present directly to a CQC inspector."
                  ],
                  "bullets": []
                },
                {
                  "icon": [
                    {
                      "tag": "path",
                      "d": "M12 4v5M12 15v5M4 12h5M15 12h5"
                    },
                    {
                      "tag": "circle",
                      "cx": "12",
                      "cy": "12",
                      "r": "2.6"
                    }
                  ],
                  "flag": "",
                  "marker": "",
                  "tag": "",
                  "tone": "",
                  "title": "AI recommendations and rating",
                  "paras": [
                    "Every completed audit generates prioritised recommendations from your findings, plus an overall rating of Outstanding, Good, Requires Improvement, or Inadequate."
                  ],
                  "bullets": []
                }
              ],
              "bullets": [],
              "header": "",
              "footer": ""
            }
          ],
          "actions": []
        },
        {
          "kind": "table",
          "id": "",
          "tint": false,
          "label": "CQC Evidence",
          "heading": "An audit record that shows inspectors a consistent, structured approach to quality.",
          "intro": [
            "CQC inspectors assess whether internal audits are consistent, whether they produce clear findings, and whether those findings come with sensible actions. CareStream generates the evidence for all three."
          ],
          "image": null,
          "split": false,
          "flip": false,
          "narrow": false,
          "parts": [
            {
              "kind": "table",
              "where": "",
              "sub": "",
              "variant": "inplace",
              "items": [],
              "bullets": [],
              "header": "",
              "footer": "",
              "head": [
                "What CareStream records",
                "What this shows an inspector"
              ],
              "rows": [
                [
                  "Structured report for every audit",
                  "A formatted report for every completed audit, with section scores, your findings, and the actions recorded. The same format regardless of who completed it."
                ],
                [
                  "Section scores",
                  "A clear score for each section of the audit, showing which areas were met in full and which were flagged for action on the day."
                ],
                [
                  "Findings and actions on every question",
                  "Each question carries the outcome of the audit and the action to be taken, so inspectors can see findings are noted and followed with a clear next step."
                ],
                [
                  "AI recommendations and overall rating",
                  "Each completed audit is stored with prioritised recommendations and an Outstanding, Good, Requires Improvement, or Inadequate rating, showing a structured approach to quality improvement."
                ],
                [
                  "A timestamped completion record",
                  "Every audit shows who completed it and when, demonstrating that audits are carried out and recorded as part of the routine of the service."
                ]
              ]
            }
          ],
          "actions": []
        },
        {
          "kind": "cards",
          "id": "",
          "tint": true,
          "label": "Everything Included",
          "heading": "The complete care audit toolkit.",
          "intro": [],
          "image": null,
          "split": false,
          "flip": false,
          "narrow": false,
          "parts": [
            {
              "kind": "cards",
              "where": "",
              "sub": "",
              "variant": "inplace c4",
              "items": [
                {
                  "icon": [
                    {
                      "tag": "path",
                      "d": "M12 4v5M12 15v5M4 12h5M15 12h5"
                    },
                    {
                      "tag": "circle",
                      "cx": "12",
                      "cy": "12",
                      "r": "2.6"
                    }
                  ],
                  "flag": "",
                  "marker": "",
                  "tag": "",
                  "tone": "",
                  "title": "Ten pre-built templates",
                  "paras": [
                    "Medicines, infection control, health and safety, fire, resident bedrooms, kitchen, accident and incident, and data protection. All ready to use, and you can build your own."
                  ],
                  "bullets": []
                },
                {
                  "icon": [
                    {
                      "tag": "path",
                      "d": "M12 4v5M12 15v5M4 12h5M15 12h5"
                    },
                    {
                      "tag": "circle",
                      "cx": "12",
                      "cy": "12",
                      "r": "2.6"
                    }
                  ],
                  "flag": "",
                  "marker": "",
                  "tag": "",
                  "tone": "",
                  "title": "Guided, structured completion",
                  "paras": [
                    "Work through each audit section by section with a clear Yes, No or Not Applicable and notes on every question. Consistent regardless of who completes it."
                  ],
                  "bullets": []
                },
                {
                  "icon": [
                    {
                      "tag": "path",
                      "d": "M12 4v5M12 15v5M4 12h5M15 12h5"
                    },
                    {
                      "tag": "circle",
                      "cx": "12",
                      "cy": "12",
                      "r": "2.6"
                    }
                  ],
                  "flag": "",
                  "marker": "",
                  "tag": "",
                  "tone": "",
                  "title": "Automatic report generation",
                  "paras": [
                    "A formatted report with section scores, your findings, your summary, and AI recommendations is generated the moment the audit is complete."
                  ],
                  "bullets": []
                },
                {
                  "icon": [
                    {
                      "tag": "path",
                      "d": "M12 4v5M12 15v5M4 12h5M15 12h5"
                    },
                    {
                      "tag": "circle",
                      "cx": "12",
                      "cy": "12",
                      "r": "2.6"
                    }
                  ],
                  "flag": "",
                  "marker": "",
                  "tag": "",
                  "tone": "",
                  "title": "Section-by-section scoring",
                  "paras": [
                    "Every answer is scored as you go, so you can see which sections are strong and which need attention before you finish."
                  ],
                  "bullets": []
                },
                {
                  "icon": [
                    {
                      "tag": "path",
                      "d": "M12 4v5M12 15v5M4 12h5M15 12h5"
                    },
                    {
                      "tag": "circle",
                      "cx": "12",
                      "cy": "12",
                      "r": "2.6"
                    }
                  ],
                  "flag": "",
                  "marker": "",
                  "tag": "",
                  "tone": "",
                  "title": "Auto-save and resume",
                  "paras": [
                    "Answers save automatically as you work. Pause and pick the audit up later on any device, exactly where you left off."
                  ],
                  "bullets": []
                },
                {
                  "icon": [
                    {
                      "tag": "path",
                      "d": "M12 4v5M12 15v5M4 12h5M15 12h5"
                    },
                    {
                      "tag": "circle",
                      "cx": "12",
                      "cy": "12",
                      "r": "2.6"
                    }
                  ],
                  "flag": "",
                  "marker": "",
                  "tag": "",
                  "tone": "",
                  "title": "Shift and room-by-room audits",
                  "paras": [
                    "Run audits by day or night shift, or room by room for resident bedroom checks, so the record matches how the audit was carried out."
                  ],
                  "bullets": []
                },
                {
                  "icon": [
                    {
                      "tag": "path",
                      "d": "M12 4v5M12 15v5M4 12h5M15 12h5"
                    },
                    {
                      "tag": "circle",
                      "cx": "12",
                      "cy": "12",
                      "r": "2.6"
                    }
                  ],
                  "flag": "",
                  "marker": "",
                  "tag": "",
                  "tone": "",
                  "title": "Inspection-ready reports",
                  "paras": [
                    "Each completed audit is locked and formatted, ready to print, save as a PDF, or present directly to a CQC inspector."
                  ],
                  "bullets": []
                },
                {
                  "icon": [
                    {
                      "tag": "path",
                      "d": "M12 4v5M12 15v5M4 12h5M15 12h5"
                    },
                    {
                      "tag": "circle",
                      "cx": "12",
                      "cy": "12",
                      "r": "2.6"
                    }
                  ],
                  "flag": "",
                  "marker": "",
                  "tag": "",
                  "tone": "",
                  "title": "AI recommendations and rating",
                  "paras": [
                    "Every completed audit generates prioritised recommendations from your findings, plus an overall Outstanding to Inadequate rating."
                  ],
                  "bullets": []
                }
              ],
              "bullets": [],
              "header": "",
              "footer": ""
            }
          ],
          "actions": []
        },
        {
          "kind": "stats",
          "id": "",
          "tint": false,
          "label": "",
          "heading": "",
          "intro": [],
          "image": null,
          "split": false,
          "flip": false,
          "narrow": false,
          "parts": [
            {
              "kind": "stats",
              "where": "",
              "sub": "",
              "variant": "",
              "items": [
                {
                  "icon": [],
                  "flag": "",
                  "marker": "Under an hour",
                  "tag": "",
                  "tone": "",
                  "title": "to complete a structured audit in the hub instead of an afternoon on a spreadsheet.",
                  "paras": [
                    "A guided, structured audit with answers that save as you go is far quicker than a blank form, and produces a better formatted report at the end of it."
                  ],
                  "bullets": []
                },
                {
                  "icon": [],
                  "flag": "",
                  "marker": "10",
                  "tag": "",
                  "tone": "",
                  "title": "pre-built audit templates covering the areas CQC inspects, ready to use out of the box.",
                  "paras": [
                    "Medicines, infection control, health and safety, fire, resident bedrooms, the kitchen, accident and incident records, and data protection. Use them as they are or build your own."
                  ],
                  "bullets": []
                }
              ],
              "bullets": [],
              "header": "",
              "footer": ""
            }
          ],
          "actions": []
        },
        {
          "kind": "end",
          "id": "",
          "tint": false,
          "label": "",
          "heading": "See Care Audits against your own policies",
          "intro": [
            "Guided digital audits with AI recommendations. Upload what you already have and see it working inside a fortnight."
          ],
          "image": null,
          "flip": false,
          "narrow": false,
          "parts": [],
          "actions": [
            {
              "label": "Start free trial",
              "href": "/register",
              "style": "solid",
              "play": false
            },
            {
              "label": "Book a demo",
              "href": "/demo",
              "style": "ghost",
              "play": false
            }
          ]
        }
      ]
    },
    "sort": 1
  },
  {
    "slug": "cqc-compliance",
    "title": "Stop preparing for CQC. Start being ready for CQC.",
    "meta_title": "Stop preparing for CQC. Start being ready for CQC. | CareStreamAI",
    "meta_description": "CareStream builds your compliance evidence in real time, one policy interaction at a time, and checks which regulations your policies actually cover. When the inspector arrives, your evidence is already prepared.",
    "hero_image_url": "/images/our-services/cqc-compliance/1.webp",
    "content": {
      "eyebrow": "CQC & Compliance",
      "lede": [
        "CareStream builds your compliance evidence in real time, one policy interaction at a time, and checks which regulations your policies actually cover. When the inspector arrives, your evidence is already prepared."
      ],
      "actions": [
        {
          "label": "Start free trial",
          "href": "/register",
          "style": "solid",
          "play": false
        },
        {
          "label": "Book a demo",
          "href": "/demo",
          "style": "ghost",
          "play": true
        }
      ],
      "toc": [],
      "blocks": [
        {
          "kind": "cards",
          "id": "",
          "tint": true,
          "label": "The Gap Most Care Settings Have",
          "heading": "Policies exist. Evidence of use does not.",
          "intro": [
            "CQC inspectors look for evidence that staff actively use and understand your policies, not just that the policies exist. Most care organisations can show the policy folder. Very few can show the inspector that their team actually reads and applies it.",
            "CareStream closes that gap by logging every policy interaction in a structured, auditable format, and generating a CQC Readiness Report that makes that evidence immediately presentable."
          ],
          "image": null,
          "split": false,
          "flip": false,
          "narrow": false,
          "parts": [
            {
              "kind": "cards",
              "where": "",
              "sub": "",
              "variant": "c2",
              "items": [
                {
                  "icon": [
                    {
                      "tag": "path",
                      "d": "M12 4v5M12 15v5M4 12h5M15 12h5"
                    },
                    {
                      "tag": "circle",
                      "cx": "12",
                      "cy": "12",
                      "r": "2.6"
                    }
                  ],
                  "flag": "",
                  "marker": "",
                  "tag": "",
                  "tone": "",
                  "title": "What most homes can show",
                  "paras": [
                    "A policy folder. Documents in place. Dated and versioned."
                  ],
                  "bullets": []
                },
                {
                  "icon": [
                    {
                      "tag": "path",
                      "d": "M12 4v5M12 15v5M4 12h5M15 12h5"
                    },
                    {
                      "tag": "circle",
                      "cx": "12",
                      "cy": "12",
                      "r": "2.6"
                    }
                  ],
                  "flag": "",
                  "marker": "",
                  "tag": "",
                  "tone": "",
                  "title": "What CQC wants to see",
                  "paras": [
                    "Evidence that staff read, query, and act on your policies, by role, over time, across languages."
                  ],
                  "bullets": []
                }
              ],
              "bullets": [],
              "header": "",
              "footer": ""
            }
          ],
          "actions": []
        },
        {
          "kind": "steps",
          "id": "",
          "tint": false,
          "label": "How It Works",
          "heading": "Evidence that builds itself, every day.",
          "intro": [],
          "image": null,
          "split": false,
          "flip": false,
          "narrow": false,
          "parts": [
            {
              "kind": "steps",
              "where": "",
              "sub": "",
              "variant": "",
              "items": [
                {
                  "icon": [],
                  "flag": "",
                  "marker": "01",
                  "tag": "",
                  "tone": "",
                  "title": "Staff ask policy questions",
                  "paras": [
                    "Every time a staff member queries a policy in the hub or by email, CareStream logs the interaction, the policy accessed, the role, the language, and the date."
                  ],
                  "bullets": []
                },
                {
                  "icon": [],
                  "flag": "",
                  "marker": "02",
                  "tag": "",
                  "tone": "",
                  "title": "Every interaction is recorded",
                  "paras": [
                    "CareStream structures each interaction into an auditable record, who accessed which policy, when, in what language, building a live evidence base that grows automatically with every query."
                  ],
                  "bullets": []
                },
                {
                  "icon": [],
                  "flag": "",
                  "marker": "03",
                  "tag": "",
                  "tone": "",
                  "title": "Generate your Readiness Report",
                  "paras": [
                    "With one click, generate a CQC Readiness Report that presents your evidence clearly, policy access summaries, staff engagement data, knowledge gap logs, and more, ready to download as a PDF."
                  ],
                  "bullets": []
                }
              ],
              "bullets": [],
              "header": "",
              "footer": ""
            }
          ],
          "actions": []
        },
        {
          "kind": "cards",
          "id": "",
          "tint": true,
          "label": "Regulation Coverage",
          "heading": "See which regulations your policies cover, and where the gaps are.",
          "intro": [
            "CareStream reads the actual content of your policies, not just the titles, and checks them against each regulation that applies to a care service. For every regulation it decides whether your policies cover it, partly cover it, or leave a gap, and points to the policy that best evidences the decision.",
            "Gaps are listed first, so you know what to write or update before an inspector finds it. Every judgement comes with a short reason and a confidence level, and the picture refreshes as your policies change.",
            "Your policies, checked against the regulations that apply to a care service."
          ],
          "image": "/images/our-services/cqc-compliance/2.webp",
          "split": true,
          "flip": true,
          "narrow": false,
          "parts": [
            {
              "kind": "cards",
              "where": "after",
              "sub": "",
              "variant": "c3 hoisted",
              "items": [
                {
                  "icon": [
                    {
                      "tag": "path",
                      "d": "M12 4v5M12 15v5M4 12h5M15 12h5"
                    },
                    {
                      "tag": "circle",
                      "cx": "12",
                      "cy": "12",
                      "r": "2.6"
                    }
                  ],
                  "flag": "",
                  "marker": "",
                  "tag": "",
                  "tone": "",
                  "title": "Covered",
                  "paras": [
                    "A policy clearly and substantively addresses the regulation."
                  ],
                  "bullets": []
                },
                {
                  "icon": [
                    {
                      "tag": "path",
                      "d": "M12 4v5M12 15v5M4 12h5M15 12h5"
                    },
                    {
                      "tag": "circle",
                      "cx": "12",
                      "cy": "12",
                      "r": "2.6"
                    }
                  ],
                  "flag": "",
                  "marker": "",
                  "tag": "",
                  "tone": "",
                  "title": "Partial",
                  "paras": [
                    "The topic is touched on, but is incomplete for what the regulation requires."
                  ],
                  "bullets": []
                },
                {
                  "icon": [
                    {
                      "tag": "path",
                      "d": "M12 4v5M12 15v5M4 12h5M15 12h5"
                    },
                    {
                      "tag": "circle",
                      "cx": "12",
                      "cy": "12",
                      "r": "2.6"
                    }
                  ],
                  "flag": "",
                  "marker": "",
                  "tag": "",
                  "tone": "",
                  "title": "Gap",
                  "paras": [
                    "The regulation is not addressed in your current policies."
                  ],
                  "bullets": []
                }
              ],
              "bullets": [],
              "header": "",
              "footer": ""
            }
          ],
          "actions": []
        },
        {
          "kind": "table",
          "id": "",
          "tint": false,
          "label": "What the Report Covers · Professional plan",
          "heading": "The CQC Readiness Report.",
          "intro": [],
          "image": "/images/our-services/cqc-compliance/3.webp",
          "split": true,
          "flip": false,
          "narrow": false,
          "parts": [
            {
              "kind": "table",
              "where": "in",
              "sub": "",
              "variant": "",
              "items": [],
              "bullets": [],
              "header": "",
              "footer": "",
              "head": [
                "What CareStream records",
                "What this shows"
              ],
              "rows": [
                [
                  "Policy Access Summary",
                  "Every active policy with total queries, number of staff who accessed it, and date of most recent access. Proof that policies are live and in use."
                ],
                [
                  "Policies Not Accessed",
                  "Policies that received zero queries in the period, an honest self-assessment that shows CQC you identify and address gaps proactively."
                ],
                [
                  "Policy Version History",
                  "When each policy was updated and whether staff accessed it after the update, evidence that new guidance reached the team."
                ],
                [
                  "Staff Engagement by Role",
                  "Query activity by care staff, seniors, and management, showing policies are accessed at the point of care delivery, not just by management."
                ],
                [
                  "Regulatory Framework Activity",
                  "Queries referencing RIDDOR, safeguarding, CQC Fundamental Standards, showing staff engage with the regulatory framework."
                ],
                [
                  "Multilingual Access",
                  "Languages used to access policies, direct evidence supporting CQC Equality and Diversity considerations for a multilingual workforce."
                ],
                [
                  "Knowledge Gap Log",
                  "Unanswered queries captured as they happen, evidence of ongoing quality improvement and proactive gap identification."
                ]
              ]
            },
            {
              "kind": "ticks",
              "where": "in",
              "sub": "",
              "variant": "",
              "items": [],
              "bullets": [
                "Report section",
                "Why it matters at inspection"
              ],
              "header": "",
              "footer": ""
            }
          ],
          "actions": []
        },
        {
          "kind": "faq",
          "id": "",
          "tint": true,
          "label": "CQC Key Questions",
          "heading": "How CareStream contributes to each key question.",
          "intro": [],
          "image": null,
          "split": false,
          "flip": false,
          "narrow": false,
          "parts": [
            {
              "kind": "faq",
              "where": "",
              "sub": "",
              "variant": "",
              "items": [
                {
                  "icon": [],
                  "flag": "",
                  "marker": "",
                  "tag": "",
                  "tone": "",
                  "title": "Well-Led",
                  "paras": [
                    "An inclusive culture where all staff, regardless of language, have equal access to policy guidance. Leadership demonstrated through the audit trail."
                  ],
                  "bullets": []
                },
                {
                  "icon": [],
                  "flag": "",
                  "marker": "",
                  "tag": "",
                  "tone": "",
                  "title": "Responsive",
                  "paras": [
                    "Services organised to meet the diverse needs of the workforce delivering them. Multilingual access and language analytics demonstrate responsiveness."
                  ],
                  "bullets": []
                },
                {
                  "icon": [],
                  "flag": "",
                  "marker": "",
                  "tag": "",
                  "tone": "",
                  "title": "Safe",
                  "paras": [
                    "Staff acting on correct, approved procedures, with a full log of every policy query and the guidance given."
                  ],
                  "bullets": []
                },
                {
                  "icon": [],
                  "flag": "",
                  "marker": "",
                  "tag": "",
                  "tone": "",
                  "title": "Effective",
                  "paras": [
                    "Staff knowledge and competence evidenced through policy access frequency, version adoption, and knowledge gap resolution."
                  ],
                  "bullets": []
                },
                {
                  "icon": [],
                  "flag": "",
                  "marker": "",
                  "tag": "",
                  "tone": "",
                  "title": "Caring",
                  "paras": [
                    "Equitable support for all staff, including those whose first language is not English, enabling confident, informed care delivery."
                  ],
                  "bullets": []
                }
              ],
              "bullets": [],
              "header": "",
              "footer": ""
            }
          ],
          "actions": []
        },
        {
          "kind": "cards",
          "id": "",
          "tint": false,
          "label": "Part of Your CQC Toolkit",
          "heading": "Readiness is more than a report.",
          "intro": [],
          "image": null,
          "split": false,
          "flip": false,
          "narrow": false,
          "parts": [
            {
              "kind": "cards",
              "where": "",
              "sub": "",
              "variant": "c2",
              "items": [
                {
                  "icon": [
                    {
                      "tag": "path",
                      "d": "M12 4v5M12 15v5M4 12h5M15 12h5"
                    },
                    {
                      "tag": "circle",
                      "cx": "12",
                      "cy": "12",
                      "r": "2.6"
                    }
                  ],
                  "flag": "",
                  "marker": "",
                  "tag": "",
                  "tone": "",
                  "title": "CQC Report Chat",
                  "paras": [
                    "Upload your inspection report and chat with it. CareStream cross-references it against your policies and the CQC framework to help you understand findings and draft a factual-accuracy challenge.",
                    "Explore CQC Report Chat"
                  ],
                  "bullets": []
                },
                {
                  "icon": [
                    {
                      "tag": "path",
                      "d": "M12 4v5M12 15v5M4 12h5M15 12h5"
                    },
                    {
                      "tag": "circle",
                      "cx": "12",
                      "cy": "12",
                      "r": "2.6"
                    }
                  ],
                  "flag": "",
                  "marker": "",
                  "tag": "",
                  "tone": "",
                  "title": "CQC Staff Questions",
                  "paras": [
                    "Prepare your team for the conversations inspectors have on the floor. Open-ended, inspector-style questions across the five key questions, scored by AI, with review and retry.",
                    "Explore CQC Staff Questions"
                  ],
                  "bullets": []
                }
              ],
              "bullets": [],
              "header": "",
              "footer": ""
            }
          ],
          "actions": []
        },
        {
          "kind": "note",
          "id": "",
          "tint": false,
          "label": "",
          "heading": "",
          "intro": [],
          "image": null,
          "split": false,
          "flip": false,
          "narrow": true,
          "parts": [
            {
              "kind": "note",
              "where": "",
              "sub": "",
              "variant": "",
              "items": [],
              "bullets": [],
              "header": "",
              "footer": "",
              "paras": [
                "The CareStream CQC Readiness Report provides factual audit data, evidence of policy access and staff engagement. It does not make any assessment of, or claim to influence, CQC inspection ratings. CQC assessments involve many factors. CareStream provides one part of the evidence base."
              ],
              "title": "Inspection evidence, not a rating guarantee"
            }
          ],
          "actions": []
        },
        {
          "kind": "end",
          "id": "",
          "tint": false,
          "label": "",
          "heading": "See CQC and Compliance against your own policies",
          "intro": [
            "Readiness tracking and evidence management. Upload what you already have and see it working inside a fortnight."
          ],
          "image": null,
          "flip": false,
          "narrow": false,
          "parts": [],
          "actions": [
            {
              "label": "Start free trial",
              "href": "/register",
              "style": "solid",
              "play": false
            },
            {
              "label": "Book a demo",
              "href": "/demo",
              "style": "ghost",
              "play": false
            }
          ]
        }
      ]
    },
    "sort": 2
  },
  {
    "slug": "cqc-report-chat",
    "title": "Your CQC inspection report. Now you can talk to it.",
    "meta_title": "Your CQC inspection report. Now you can talk to it. | CareStreamAI",
    "meta_description": "Upload your latest CQC inspection report and ask it anything in plain English. CareStream cross-references it against your own policies and the CQC framework to find action points, explain findings, and help you plan your response, in seconds, not hours.",
    "hero_image_url": "/images/our-services/cqc-report-chat/1.webp",
    "content": {
      "eyebrow": "CQC Report Chat",
      "lede": [
        "Upload your latest CQC inspection report and ask it anything in plain English. CareStream cross-references it against your own policies and the CQC framework to find action points, explain findings, and help you plan your response, in seconds, not hours."
      ],
      "actions": [
        {
          "label": "Start free trial",
          "href": "/register",
          "style": "solid",
          "play": false
        },
        {
          "label": "Book a demo",
          "href": "/demo",
          "style": "ghost",
          "play": true
        }
      ],
      "toc": [],
      "blocks": [
        {
          "kind": "cards",
          "id": "",
          "tint": true,
          "label": "Built For Care Managers",
          "heading": "Stop hunting through 17 pages. Just ask the question.",
          "intro": [],
          "image": null,
          "split": false,
          "flip": false,
          "narrow": false,
          "parts": [
            {
              "kind": "cards",
              "where": "",
              "sub": "",
              "variant": "inplace c3",
              "items": [
                {
                  "icon": [
                    {
                      "tag": "path",
                      "d": "M12 4v5M12 15v5M4 12h5M15 12h5"
                    },
                    {
                      "tag": "circle",
                      "cx": "12",
                      "cy": "12",
                      "r": "2.6"
                    }
                  ],
                  "flag": "",
                  "marker": "",
                  "tag": "",
                  "tone": "",
                  "title": "Find action points instantly",
                  "paras": [
                    "Ask \"What action points did the inspector raise?\" and get a structured, numbered list drawn directly from your report, with section references where the report provides them."
                  ],
                  "bullets": []
                },
                {
                  "icon": [
                    {
                      "tag": "path",
                      "d": "M12 4v5M12 15v5M4 12h5M15 12h5"
                    },
                    {
                      "tag": "circle",
                      "cx": "12",
                      "cy": "12",
                      "r": "2.6"
                    }
                  ],
                  "flag": "",
                  "marker": "",
                  "tag": "",
                  "tone": "",
                  "title": "Understand any finding",
                  "paras": [
                    "Ask about any CQC finding and get a plain English explanation. CareStream draws on the CQC framework to tell you what the inspector meant and what evidence you would need to address it."
                  ],
                  "bullets": []
                },
                {
                  "icon": [
                    {
                      "tag": "path",
                      "d": "M12 4v5M12 15v5M4 12h5M15 12h5"
                    },
                    {
                      "tag": "circle",
                      "cx": "12",
                      "cy": "12",
                      "r": "2.6"
                    }
                  ],
                  "flag": "",
                  "marker": "",
                  "tag": "",
                  "tone": "",
                  "title": "Plan your response",
                  "paras": [
                    "Ask \"What do I need to do to address the Safe domain findings?\" and get a clear action list, cross-referenced with the policies you already have in place."
                  ],
                  "bullets": []
                }
              ],
              "bullets": [],
              "header": "",
              "footer": ""
            }
          ],
          "actions": []
        },
        {
          "kind": "steps",
          "id": "",
          "tint": false,
          "label": "How It Works",
          "heading": "Three steps from report to clarity.",
          "intro": [],
          "image": null,
          "split": false,
          "flip": false,
          "narrow": false,
          "parts": [
            {
              "kind": "steps",
              "where": "",
              "sub": "",
              "variant": "inplace",
              "items": [
                {
                  "icon": [],
                  "flag": "",
                  "marker": "01",
                  "tag": "",
                  "tone": "",
                  "title": "Upload your CQC report",
                  "paras": [
                    "Drag and drop your latest CQC inspection report PDF. CareStream reads and indexes the full document in moments. No CQC login required."
                  ],
                  "bullets": []
                },
                {
                  "icon": [],
                  "flag": "",
                  "marker": "02",
                  "tag": "",
                  "tone": "",
                  "title": "Ask in plain English",
                  "paras": [
                    "Type any question about your report, action points, specific domain findings, inspector language, what evidence is needed. No keyword searching, no page numbers."
                  ],
                  "bullets": []
                },
                {
                  "icon": [],
                  "flag": "",
                  "marker": "03",
                  "tag": "",
                  "tone": "",
                  "title": "Get specific answers",
                  "paras": [
                    "Every answer is grounded in your report and cross-referenced with your policies and the CQC framework, with section references where the report provides them. Precise answers about your inspection, your home."
                  ],
                  "bullets": []
                }
              ],
              "bullets": [],
              "header": "",
              "footer": ""
            }
          ],
          "actions": []
        },
        {
          "kind": "cards",
          "id": "",
          "tint": true,
          "label": "More Than A Search Tool",
          "heading": "It reads your report against your whole compliance picture.",
          "intro": [
            "CQC Report Chat does not read your inspection report on its own. It cross-references the report against your own policies and the CQC assessment framework, so it can tell you not just what the inspector said, but whether your policies already answer it and what evidence would support your case.",
            "It can also help you draft a factual-accuracy challenge, the formal response you can send to CQC to correct factual errors in a draft report. CareStream drafts it from your report and your policies. You review it, and you decide whether to send it.",
            "Not the report in isolation. The report against your policies and the CQC framework."
          ],
          "image": "/images/our-services/cqc-report-chat/2.webp",
          "split": true,
          "flip": true,
          "narrow": false,
          "parts": [
            {
              "kind": "cards",
              "where": "after",
              "sub": "",
              "variant": "hoisted c3",
              "items": [
                {
                  "icon": [
                    {
                      "tag": "path",
                      "d": "M12 4v5M12 15v5M4 12h5M15 12h5"
                    },
                    {
                      "tag": "circle",
                      "cx": "12",
                      "cy": "12",
                      "r": "2.6"
                    }
                  ],
                  "flag": "",
                  "marker": "",
                  "tag": "",
                  "tone": "",
                  "title": "Cross-references your policies",
                  "paras": [
                    "Sees where your existing policies already address a finding, so you can evidence it."
                  ],
                  "bullets": []
                },
                {
                  "icon": [
                    {
                      "tag": "path",
                      "d": "M12 4v5M12 15v5M4 12h5M15 12h5"
                    },
                    {
                      "tag": "circle",
                      "cx": "12",
                      "cy": "12",
                      "r": "2.6"
                    }
                  ],
                  "flag": "",
                  "marker": "",
                  "tag": "",
                  "tone": "",
                  "title": "Maps to the CQC framework",
                  "paras": [
                    "Explains what the inspector means and what evidence is expected, using the CQC assessment framework."
                  ],
                  "bullets": []
                },
                {
                  "icon": [
                    {
                      "tag": "path",
                      "d": "M12 4v5M12 15v5M4 12h5M15 12h5"
                    },
                    {
                      "tag": "circle",
                      "cx": "12",
                      "cy": "12",
                      "r": "2.6"
                    }
                  ],
                  "flag": "",
                  "marker": "",
                  "tag": "",
                  "tone": "",
                  "title": "Drafts your challenge",
                  "paras": [
                    "Helps you draft a factual-accuracy challenge grounded in your report and policies, for you to review and send."
                  ],
                  "bullets": []
                }
              ],
              "bullets": [],
              "header": "",
              "footer": ""
            }
          ],
          "actions": []
        },
        {
          "kind": "prompts",
          "id": "",
          "tint": false,
          "label": "Questions You Can Ask",
          "heading": "The questions care managers actually ask.",
          "intro": [],
          "image": null,
          "split": false,
          "flip": false,
          "narrow": false,
          "parts": [
            {
              "kind": "prompts",
              "where": "",
              "sub": "",
              "variant": "",
              "items": [],
              "bullets": [
                "What action points did the inspector raise?",
                "What did the inspector say about medication management?",
                "Which CQC key questions were rated Requires Improvement?",
                "What evidence did the inspector say was missing?",
                "Do my policies already cover the handover finding?",
                "What does the inspector mean by \"embedding\"?",
                "Help me draft a factual-accuracy challenge for the staffing finding.",
                "Show me everything the inspector said about staffing.",
                "What does section 5.3 mean in plain English?"
              ],
              "header": "",
              "footer": ""
            }
          ],
          "actions": []
        },
        {
          "kind": "cards",
          "id": "",
          "tint": true,
          "label": "",
          "heading": "",
          "intro": [],
          "image": null,
          "split": false,
          "flip": false,
          "narrow": false,
          "parts": [
            {
              "kind": "cards",
              "where": "",
              "sub": "",
              "variant": "inplace c3",
              "items": [
                {
                  "icon": [
                    {
                      "tag": "path",
                      "d": "M12 4v5M12 15v5M4 12h5M15 12h5"
                    },
                    {
                      "tag": "circle",
                      "cx": "12",
                      "cy": "12",
                      "r": "2.6"
                    }
                  ],
                  "flag": "",
                  "marker": "",
                  "tag": "",
                  "tone": "",
                  "title": "Just upload your PDF, the report stays private to your account",
                  "paras": [
                    "No CQC login"
                  ],
                  "bullets": []
                },
                {
                  "icon": [
                    {
                      "tag": "path",
                      "d": "M12 4v5M12 15v5M4 12h5M15 12h5"
                    },
                    {
                      "tag": "circle",
                      "cx": "12",
                      "cy": "12",
                      "r": "2.6"
                    }
                  ],
                  "flag": "",
                  "marker": "",
                  "tag": "",
                  "tone": "",
                  "title": "Reports are encrypted at rest and never used to train AI models",
                  "paras": [
                    "Secure"
                  ],
                  "bullets": []
                },
                {
                  "icon": [
                    {
                      "tag": "path",
                      "d": "M12 4v5M12 15v5M4 12h5M15 12h5"
                    },
                    {
                      "tag": "circle",
                      "cx": "12",
                      "cy": "12",
                      "r": "2.6"
                    }
                  ],
                  "flag": "",
                  "marker": "",
                  "tag": "",
                  "tone": "",
                  "title": "Your report is indexed and ready to query before the kettle boils",
                  "paras": [
                    "Ready in moments"
                  ],
                  "bullets": []
                }
              ],
              "bullets": [],
              "header": "",
              "footer": ""
            }
          ],
          "actions": []
        },
        {
          "kind": "note",
          "id": "",
          "tint": false,
          "label": "",
          "heading": "",
          "intro": [],
          "image": null,
          "split": false,
          "flip": false,
          "narrow": true,
          "parts": [
            {
              "kind": "note",
              "where": "",
              "sub": "",
              "variant": "",
              "items": [],
              "bullets": [],
              "header": "",
              "footer": "",
              "paras": [
                "CQC Report Chat helps you understand and navigate your inspection report. It does not provide regulatory advice and does not guarantee any particular outcome at future inspections. Any factual-accuracy challenge it drafts is a starting point for you to review. Always verify important decisions with your regulatory lead or legal adviser."
              ],
              "title": "For information and planning purposes"
            }
          ],
          "actions": []
        },
        {
          "kind": "end",
          "id": "",
          "tint": false,
          "label": "",
          "heading": "See CQC Report Chat against your own policies",
          "intro": [
            "Chat directly with your inspection reports. Upload what you already have and see it working inside a fortnight."
          ],
          "image": null,
          "flip": false,
          "narrow": false,
          "parts": [],
          "actions": [
            {
              "label": "Start free trial",
              "href": "/register",
              "style": "solid",
              "play": false
            },
            {
              "label": "Book a demo",
              "href": "/demo",
              "style": "ghost",
              "play": false
            }
          ]
        }
      ]
    },
    "sort": 3
  },
  {
    "slug": "cqc-staff-questions",
    "title": "CQC inspectors speak to your staff directly. Are they ready to answer?",
    "meta_title": "CQC inspectors speak to your staff directly. Are they ready to answer? | CareStreamAI",
    "meta_description": "During every CQC inspection, inspectors speak to frontline care workers individually and ask them about safeguarding, medication, care planning, and values. Staff who have never practised those conversations give hesitant, inconsistent answers. CareStream lets every member of your team practise in t",
    "hero_image_url": "/images/our-services/cqc-staff-questions/1.webp",
    "content": {
      "eyebrow": "CQC Staff Preparation",
      "lede": [
        "During every CQC inspection, inspectors speak to frontline care workers individually and ask them about safeguarding, medication, care planning, and values. Staff who have never practised those conversations give hesitant, inconsistent answers. CareStream lets every member of your team practise in their own words and shows you exactly where they stand before the inspector arrives."
      ],
      "actions": [
        {
          "label": "Start free trial",
          "href": "/register",
          "style": "solid",
          "play": false
        },
        {
          "label": "Book a demo",
          "href": "/demo",
          "style": "ghost",
          "play": true
        }
      ],
      "toc": [],
      "blocks": [
        {
          "kind": "compare",
          "id": "",
          "tint": true,
          "label": "The Problem With Unprepared Staff",
          "heading": "Inspectors ask your care workers questions you cannot predict in advance.",
          "intro": [
            "CQC inspectors are trained to seek out inconsistency. When they speak to a senior carer on the floor and a care assistant on a different unit and get two different answers to the same question, that becomes a finding.",
            "Most managers focus inspection preparation on documentation, policies, and paperwork. The staff conversation is the part that is hardest to prepare for, because it needs every member of your team to have regular practice with the exact types of questions inspectors ask."
          ],
          "image": null,
          "split": false,
          "flip": false,
          "narrow": false,
          "parts": [
            {
              "kind": "compare",
              "where": "",
              "sub": "",
              "variant": "",
              "items": [
                {
                  "icon": [],
                  "flag": "",
                  "marker": "",
                  "tag": "Without preparation",
                  "tone": "dim",
                  "title": "",
                  "paras": [
                    "Staff give vague, inconsistent answers to inspector questions. Gaps in knowledge become visible in conversation, not in documentation."
                  ],
                  "bullets": []
                },
                {
                  "icon": [],
                  "flag": "",
                  "marker": "",
                  "tag": "With CareStream",
                  "tone": "good",
                  "title": "",
                  "paras": [
                    "Staff have practised answering inspector-style questions across all five key questions in the hub, with an AI score and feedback on every answer. Their answers are confident, consistent, and accurate."
                  ],
                  "bullets": []
                }
              ],
              "bullets": [],
              "header": "",
              "footer": ""
            }
          ],
          "actions": []
        },
        {
          "kind": "steps",
          "id": "",
          "tint": false,
          "label": "How It Works",
          "heading": "Inspector-style questions, answered in their own words, scored instantly.",
          "intro": [
            "No training day and no classroom. Questions aligned to the five CQC key questions are sent to each staff member in the hub, answered in their own words, and scored instantly."
          ],
          "image": "/images/our-services/cqc-staff-questions/2.webp",
          "split": true,
          "flip": false,
          "narrow": false,
          "parts": [
            {
              "kind": "steps",
              "where": "after",
              "sub": "",
              "variant": "hoisted",
              "items": [
                {
                  "icon": [],
                  "flag": "",
                  "marker": "01",
                  "tag": "",
                  "tone": "",
                  "title": "Questions mapped to every key question",
                  "paras": [
                    "CareStream ships with a bank of open-ended, inspector-style questions covering all five CQC key questions: Safe, Effective, Caring, Responsive, and Well-led. Each one comes with a best-practice model answer, and you can generate more questions with AI whenever you need them."
                  ],
                  "bullets": []
                },
                {
                  "icon": [],
                  "flag": "",
                  "marker": "02",
                  "tag": "",
                  "tone": "",
                  "title": "Answered in their own words, in the hub",
                  "paras": [
                    "Staff are notified in the hub and answer in their own time, writing a real answer rather than picking from options. Each question is reworded slightly on delivery, so staff build genuine understanding instead of memorising a fixed reply."
                  ],
                  "bullets": []
                },
                {
                  "icon": [],
                  "flag": "",
                  "marker": "03",
                  "tag": "",
                  "tone": "",
                  "title": "Scored instantly with feedback",
                  "paras": [
                    "Every answer is scored out of 100 against the model answer, with clear feedback on what was strong and what to improve. Staff review the model answer and try the question again, and the improvement is tracked."
                  ],
                  "bullets": []
                }
              ],
              "bullets": [],
              "header": "",
              "footer": ""
            }
          ],
          "actions": []
        },
        {
          "kind": "asks",
          "id": "",
          "tint": true,
          "label": "A Real Practice Question",
          "heading": "A practice question that mirrors exactly what an inspector asks.",
          "intro": [
            "CareStream does not send multiple-choice quizzes. It sends open-ended, scenario-based questions that reflect how inspectors actually test understanding. Staff are asked what they would do, and they write the answer themselves.",
            "Questions are spread across all five key questions, so every member of the team builds familiarity with the full range of what an inspector may ask.",
            "Open-ended, scenario-based questions across all five key questions."
          ],
          "image": null,
          "split": false,
          "flip": false,
          "narrow": false,
          "parts": [
            {
              "kind": "asks",
              "where": "",
              "sub": "",
              "variant": "",
              "items": [
                {
                  "icon": [],
                  "flag": "",
                  "marker": "",
                  "tag": "Safe",
                  "tone": "",
                  "title": "",
                  "paras": [
                    "A resident shows you an unexplained bruise and seems distressed. You are alone with them. What is your immediate responsibility?"
                  ],
                  "bullets": []
                },
                {
                  "icon": [],
                  "flag": "",
                  "marker": "",
                  "tag": "Caring",
                  "tone": "",
                  "title": "",
                  "paras": [
                    "A resident tells you they feel their preferences about personal care are not being respected. How do you respond?"
                  ],
                  "bullets": []
                },
                {
                  "icon": [],
                  "flag": "",
                  "marker": "",
                  "tag": "Responsive",
                  "tone": "",
                  "title": "",
                  "paras": [
                    "A family member tells you their relative has been waiting three weeks to see a GP. What steps do you take?"
                  ],
                  "bullets": []
                }
              ],
              "bullets": [],
              "header": "",
              "footer": ""
            }
          ],
          "actions": []
        },
        {
          "kind": "cards",
          "id": "",
          "tint": false,
          "label": "In Their Own Language",
          "heading": "Staff practise in their own language. Your reporting stays in English.",
          "intro": [
            "Care is delivered by people from all over the world. A member of staff who is most confident in Polish or Romanian knows the safeguarding procedure perfectly well, but will struggle to show it if they can only practise inspector questions in English.",
            "CareStream shows the question, the model answer, and the feedback to each staff member in their own language, and lets them answer in it too.",
            "Confidence in the answer, not in the English."
          ],
          "image": "/images/our-services/cqc-staff-questions/3.webp",
          "split": true,
          "flip": false,
          "narrow": false,
          "parts": [
            {
              "kind": "cards",
              "where": "after",
              "sub": "",
              "variant": "hoisted c3",
              "items": [
                {
                  "icon": [
                    {
                      "tag": "path",
                      "d": "M12 4v5M12 15v5M4 12h5M15 12h5"
                    },
                    {
                      "tag": "circle",
                      "cx": "12",
                      "cy": "12",
                      "r": "2.6"
                    }
                  ],
                  "flag": "",
                  "marker": "",
                  "tag": "",
                  "tone": "",
                  "title": "Set once, applied everywhere",
                  "paras": [
                    "The language on each staff profile is used automatically, so staff do not have to choose it every time."
                  ],
                  "bullets": []
                },
                {
                  "icon": [
                    {
                      "tag": "path",
                      "d": "M12 4v5M12 15v5M4 12h5M15 12h5"
                    },
                    {
                      "tag": "circle",
                      "cx": "12",
                      "cy": "12",
                      "r": "2.6"
                    }
                  ],
                  "flag": "",
                  "marker": "",
                  "tag": "",
                  "tone": "",
                  "title": "Answer naturally",
                  "paras": [
                    "Staff reply in the language they think in, and still receive a score out of 100 with clear feedback."
                  ],
                  "bullets": []
                },
                {
                  "icon": [
                    {
                      "tag": "path",
                      "d": "M12 4v5M12 15v5M4 12h5M15 12h5"
                    },
                    {
                      "tag": "circle",
                      "cx": "12",
                      "cy": "12",
                      "r": "2.6"
                    }
                  ],
                  "flag": "",
                  "marker": "",
                  "tag": "",
                  "tone": "",
                  "title": "Consistent reporting in English",
                  "paras": [
                    "The manager dashboard keeps every score and record in English, so the whole team can be compared at a glance whatever language each person practised in."
                  ],
                  "bullets": []
                }
              ],
              "bullets": [],
              "header": "",
              "footer": ""
            }
          ],
          "actions": []
        },
        {
          "kind": "cards",
          "id": "",
          "tint": true,
          "label": "Manager Visibility",
          "heading": "Know exactly where every member of your team stands before the inspector arrives.",
          "intro": [
            "CQC inspections are rarely announced with much notice. CareStream keeps your team in a state of continuous readiness and shows you the score for every member of staff across all five key questions."
          ],
          "image": "/images/our-services/cqc-staff-questions/4.webp",
          "split": true,
          "flip": false,
          "narrow": false,
          "parts": [
            {
              "kind": "cards",
              "where": "after",
              "sub": "",
              "variant": "hoisted c3",
              "items": [
                {
                  "icon": [
                    {
                      "tag": "path",
                      "d": "M12 4v5M12 15v5M4 12h5M15 12h5"
                    },
                    {
                      "tag": "circle",
                      "cx": "12",
                      "cy": "12",
                      "r": "2.6"
                    }
                  ],
                  "flag": "",
                  "marker": "",
                  "tag": "",
                  "tone": "",
                  "title": "Live readiness dashboard",
                  "paras": [
                    "See the team average and the average score for each key question at any time, so you know which areas are strong and which need attention before the next inspection."
                  ],
                  "bullets": []
                },
                {
                  "icon": [
                    {
                      "tag": "path",
                      "d": "M12 4v5M12 15v5M4 12h5M15 12h5"
                    },
                    {
                      "tag": "circle",
                      "cx": "12",
                      "cy": "12",
                      "r": "2.6"
                    }
                  ],
                  "flag": "",
                  "marker": "",
                  "tag": "",
                  "tone": "",
                  "title": "Individual staff scores",
                  "paras": [
                    "Every staff member has their own score in each key question. A new starter or recently returned member of staff is clearly visible and can be prioritised for catch-up practice."
                  ],
                  "bullets": []
                },
                {
                  "icon": [
                    {
                      "tag": "path",
                      "d": "M12 4v5M12 15v5M4 12h5M15 12h5"
                    },
                    {
                      "tag": "circle",
                      "cx": "12",
                      "cy": "12",
                      "r": "2.6"
                    }
                  ],
                  "flag": "",
                  "marker": "",
                  "tag": "",
                  "tone": "",
                  "title": "Review and retry",
                  "paras": [
                    "After answering, staff see the model answer and the feedback, then try the question again. The improvement from their first attempt to their latest is tracked, so you can show real learning."
                  ],
                  "bullets": []
                },
                {
                  "icon": [
                    {
                      "tag": "path",
                      "d": "M12 4v5M12 15v5M4 12h5M15 12h5"
                    },
                    {
                      "tag": "circle",
                      "cx": "12",
                      "cy": "12",
                      "r": "2.6"
                    }
                  ],
                  "flag": "",
                  "marker": "",
                  "tag": "",
                  "tone": "",
                  "title": "Send practice to weaker areas",
                  "paras": [
                    "When the dashboard shows a key question is weak across the team, push a focused batch of practice questions to the staff who need it most, ahead of an inspection."
                  ],
                  "bullets": []
                },
                {
                  "icon": [
                    {
                      "tag": "path",
                      "d": "M12 4v5M12 15v5M4 12h5M15 12h5"
                    },
                    {
                      "tag": "circle",
                      "cx": "12",
                      "cy": "12",
                      "r": "2.6"
                    }
                  ],
                  "flag": "",
                  "marker": "",
                  "tag": "",
                  "tone": "",
                  "title": "Reworded so staff cannot memorise",
                  "paras": [
                    "Each question is reworded slightly when it is sent, so it tests the same knowledge without letting staff fall back on a memorised reply. They build genuine understanding instead."
                  ],
                  "bullets": []
                },
                {
                  "icon": [
                    {
                      "tag": "path",
                      "d": "M12 4v5M12 15v5M4 12h5M15 12h5"
                    },
                    {
                      "tag": "circle",
                      "cx": "12",
                      "cy": "12",
                      "r": "2.6"
                    }
                  ],
                  "flag": "",
                  "marker": "",
                  "tag": "",
                  "tone": "",
                  "title": "Consistent answers across the team",
                  "paras": [
                    "When every member of staff has practised the same questions against the same model answers, the team gives an inspector one consistent account rather than several conflicting ones."
                  ],
                  "bullets": []
                }
              ],
              "bullets": [],
              "header": "",
              "footer": ""
            }
          ],
          "actions": []
        },
        {
          "kind": "table",
          "id": "",
          "tint": false,
          "label": "CQC Evidence",
          "heading": "A preparation record that shows inspectors exactly how you develop staff competence.",
          "intro": [
            "When an inspector asks how you ensure staff are competent to carry out their roles, a supervision record from six months ago is a limited answer. CareStream gives you something more current and specific."
          ],
          "image": "/images/our-services/cqc-staff-questions/5.webp",
          "split": true,
          "flip": true,
          "narrow": false,
          "parts": [
            {
              "kind": "table",
              "where": "after",
              "sub": "",
              "variant": "hoisted",
              "items": [],
              "bullets": [],
              "header": "",
              "footer": "",
              "head": [
                "What CareStream records",
                "What this shows an inspector"
              ],
              "rows": [
                [
                  "Average score per key question, per staff member",
                  "Each staff member has a tracked score against every key question, showing how their knowledge compares across all five inspection categories."
                ],
                [
                  "Every question, answer, score and feedback",
                  "The exact question asked, the answer the staff member wrote, the AI score out of 100, and the feedback given. Evidence that staff knowledge is actively tested, not only supervised."
                ],
                [
                  "Improvement from first attempt to latest",
                  "Where a staff member reviewed the model answer and tried again, the record shows their score improving, demonstrating learning rather than a one-off result."
                ],
                [
                  "A live readiness dashboard",
                  "Team-wide and per-staff readiness across all five key questions, available at any point, showing inspection preparation is a structured, ongoing process."
                ],
                [
                  "Targeted practice to weaker areas",
                  "When a category is weak, the record shows the manager sent focused practice to the staff who needed it, which is exactly the type of active oversight inspectors look for."
                ]
              ]
            }
          ],
          "actions": []
        },
        {
          "kind": "cards",
          "id": "",
          "tint": true,
          "label": "Everything Included",
          "heading": "The complete CQC staff preparation toolkit.",
          "intro": [],
          "image": "/images/our-services/cqc-staff-questions/6.webp",
          "split": true,
          "flip": false,
          "narrow": false,
          "parts": [
            {
              "kind": "cards",
              "where": "after",
              "sub": "",
              "variant": "hoisted c4",
              "items": [
                {
                  "icon": [
                    {
                      "tag": "path",
                      "d": "M12 4v5M12 15v5M4 12h5M15 12h5"
                    },
                    {
                      "tag": "circle",
                      "cx": "12",
                      "cy": "12",
                      "r": "2.6"
                    }
                  ],
                  "flag": "",
                  "marker": "",
                  "tag": "",
                  "tone": "",
                  "title": "Question bank mapped to the key questions",
                  "paras": [
                    "Open-ended, inspector-style questions across all five key questions, each with a model answer. Generate more with AI whenever you need them."
                  ],
                  "bullets": []
                },
                {
                  "icon": [
                    {
                      "tag": "path",
                      "d": "M12 4v5M12 15v5M4 12h5M15 12h5"
                    },
                    {
                      "tag": "circle",
                      "cx": "12",
                      "cy": "12",
                      "r": "2.6"
                    }
                  ],
                  "flag": "",
                  "marker": "",
                  "tag": "",
                  "tone": "",
                  "title": "Answers in their own words",
                  "paras": [
                    "Staff write a real answer rather than picking from options, exactly as they would in conversation with an inspector."
                  ],
                  "bullets": []
                },
                {
                  "icon": [
                    {
                      "tag": "path",
                      "d": "M12 4v5M12 15v5M4 12h5M15 12h5"
                    },
                    {
                      "tag": "circle",
                      "cx": "12",
                      "cy": "12",
                      "r": "2.6"
                    }
                  ],
                  "flag": "",
                  "marker": "",
                  "tag": "",
                  "tone": "",
                  "title": "AI scoring with feedback",
                  "paras": [
                    "Every answer is scored out of 100 against the model answer, with clear feedback on what was strong and what to improve."
                  ],
                  "bullets": []
                },
                {
                  "icon": [
                    {
                      "tag": "path",
                      "d": "M12 4v5M12 15v5M4 12h5M15 12h5"
                    },
                    {
                      "tag": "circle",
                      "cx": "12",
                      "cy": "12",
                      "r": "2.6"
                    }
                  ],
                  "flag": "",
                  "marker": "",
                  "tag": "",
                  "tone": "",
                  "title": "Review and retry",
                  "paras": [
                    "Staff see the model answer after answering, then try again. The improvement from first attempt to latest is tracked."
                  ],
                  "bullets": []
                },
                {
                  "icon": [
                    {
                      "tag": "path",
                      "d": "M12 4v5M12 15v5M4 12h5M15 12h5"
                    },
                    {
                      "tag": "circle",
                      "cx": "12",
                      "cy": "12",
                      "r": "2.6"
                    }
                  ],
                  "flag": "",
                  "marker": "",
                  "tag": "",
                  "tone": "",
                  "title": "Readiness scores per key question",
                  "paras": [
                    "Track each staff member and the whole team across Safe, Effective, Caring, Responsive, and Well-led. See gaps at a glance."
                  ],
                  "bullets": []
                },
                {
                  "icon": [
                    {
                      "tag": "path",
                      "d": "M12 4v5M12 15v5M4 12h5M15 12h5"
                    },
                    {
                      "tag": "circle",
                      "cx": "12",
                      "cy": "12",
                      "r": "2.6"
                    }
                  ],
                  "flag": "",
                  "marker": "",
                  "tag": "",
                  "tone": "",
                  "title": "Targeted practice delivery",
                  "paras": [
                    "Send a focused batch of questions to any key question that is weak across the team, to the staff who need it most."
                  ],
                  "bullets": []
                },
                {
                  "icon": [
                    {
                      "tag": "path",
                      "d": "M12 4v5M12 15v5M4 12h5M15 12h5"
                    },
                    {
                      "tag": "circle",
                      "cx": "12",
                      "cy": "12",
                      "r": "2.6"
                    }
                  ],
                  "flag": "",
                  "marker": "",
                  "tag": "",
                  "tone": "",
                  "title": "In their first language",
                  "paras": [
                    "Staff see the question, the model answer, and the feedback in their own language, and answer in their own words, just like the rest of CareStream."
                  ],
                  "bullets": []
                },
                {
                  "icon": [
                    {
                      "tag": "path",
                      "d": "M12 4v5M12 15v5M4 12h5M15 12h5"
                    },
                    {
                      "tag": "circle",
                      "cx": "12",
                      "cy": "12",
                      "r": "2.6"
                    }
                  ],
                  "flag": "",
                  "marker": "",
                  "tag": "",
                  "tone": "",
                  "title": "Notified in the hub",
                  "paras": [
                    "Staff are nudged with a notification when a new question is waiting, and answer in the hub on any device whenever it suits them."
                  ],
                  "bullets": []
                }
              ],
              "bullets": [],
              "header": "",
              "footer": ""
            }
          ],
          "actions": []
        },
        {
          "kind": "stats",
          "id": "",
          "tint": false,
          "label": "",
          "heading": "",
          "intro": [],
          "image": null,
          "split": false,
          "flip": false,
          "narrow": false,
          "parts": [
            {
              "kind": "stats",
              "where": "",
              "sub": "",
              "variant": "",
              "items": [
                {
                  "icon": [],
                  "flag": "",
                  "marker": "5",
                  "tag": "",
                  "tone": "",
                  "title": "CQC key questions that inspectors use to assess every care service.",
                  "paras": [
                    "CareStream maps every practice question to a specific key question, so you always know where your team is strong and where they need more work."
                  ],
                  "bullets": []
                },
                {
                  "icon": [],
                  "flag": "",
                  "marker": "0 to 100",
                  "tag": "",
                  "tone": "",
                  "title": "every answer scored, with feedback and a model answer to learn from.",
                  "paras": [
                    "Staff answer in their own words in the hub, see exactly how they did, and try again to improve. One question, one answer, readiness score updated."
                  ],
                  "bullets": []
                }
              ],
              "bullets": [],
              "header": "",
              "footer": ""
            }
          ],
          "actions": []
        },
        {
          "kind": "end",
          "id": "",
          "tint": false,
          "label": "",
          "heading": "See CQC Staff Questions against your own policies",
          "intro": [
            "Inspection preparation for your whole team. Upload what you already have and see it working inside a fortnight."
          ],
          "image": null,
          "flip": false,
          "narrow": false,
          "parts": [],
          "actions": [
            {
              "label": "Start free trial",
              "href": "/register",
              "style": "solid",
              "play": false
            },
            {
              "label": "Book a demo",
              "href": "/demo",
              "style": "ghost",
              "play": false
            }
          ]
        }
      ]
    },
    "sort": 4
  },
  {
    "slug": "hr-policies",
    "title": "Every staff member deserves to know their rights. In their own language. Right now.",
    "meta_title": "Every staff member deserves to know their rights. In their own language. Right now. | CareStreamAI",
    "meta_description": "Care setting workforces are multilingual, work across multiple shifts, and rarely have access to HR during the moments when they need it most. CareStream gives every member of your team instant, accurate answers to employment questions from your actual staff handbook, in the hub or by email, in any ",
    "hero_image_url": "/images/our-services/hr-policies/1.webp",
    "content": {
      "eyebrow": "HR Policies and Staff Handbook",
      "lede": [
        "Care setting workforces are multilingual, work across multiple shifts, and rarely have access to HR during the moments when they need it most. CareStream gives every member of your team instant, accurate answers to employment questions from your actual staff handbook, in the hub or by email, in any language, at any hour."
      ],
      "actions": [
        {
          "label": "Start free trial",
          "href": "/register",
          "style": "solid",
          "play": false
        },
        {
          "label": "Book a demo",
          "href": "/demo",
          "style": "ghost",
          "play": true
        }
      ],
      "toc": [],
      "blocks": [
        {
          "kind": "cards",
          "id": "",
          "tint": true,
          "label": "The Problem With HR Accessibility",
          "heading": "Staff have employment questions every week. HR is not available every week.",
          "intro": [
            "A care worker on a Saturday night shift who wants to know how much notice they need to book annual leave cannot reach HR until Monday morning. A staff member whose first language is Romanian who does not fully understand their contract has no practical way to get clarification. A new starter who wants to know the expenses process has to find the right person to ask and hope they know the answer.",
            "These questions go unanswered, are answered inconsistently by colleagues, or create unnecessary pressure on managers during busy shifts. CareStream makes the full staff handbook accessible to everyone, instantly, around the clock."
          ],
          "image": null,
          "split": false,
          "flip": false,
          "narrow": false,
          "parts": [
            {
              "kind": "cards",
              "where": "",
              "sub": "",
              "variant": "inplace c2",
              "items": [
                {
                  "icon": [
                    {
                      "tag": "path",
                      "d": "M12 4v5M12 15v5M4 12h5M15 12h5"
                    },
                    {
                      "tag": "circle",
                      "cx": "12",
                      "cy": "12",
                      "r": "2.6"
                    }
                  ],
                  "flag": "",
                  "marker": "",
                  "tag": "",
                  "tone": "",
                  "title": "Without CareStream",
                  "paras": [
                    "Staff either wait for HR office hours, ask a manager who may not know the answer, or go without the information they are entitled to. Language barriers make this worse for a large proportion of the workforce."
                  ],
                  "bullets": []
                },
                {
                  "icon": [
                    {
                      "tag": "path",
                      "d": "M12 4v5M12 15v5M4 12h5M15 12h5"
                    },
                    {
                      "tag": "circle",
                      "cx": "12",
                      "cy": "12",
                      "r": "2.6"
                    }
                  ],
                  "flag": "",
                  "marker": "",
                  "tag": "",
                  "tone": "",
                  "title": "With CareStream",
                  "paras": [
                    "Any staff member can ask any question from the staff handbook in the hub or by email at any time of day. The answer comes from your actual document, in the language they asked in, within 30 seconds."
                  ],
                  "bullets": []
                }
              ],
              "bullets": [],
              "header": "",
              "footer": ""
            }
          ],
          "actions": []
        },
        {
          "kind": "steps",
          "id": "",
          "tint": false,
          "label": "How CareStream HR Policies Works",
          "heading": "Upload your handbook once. Your whole team can ask anything from it immediately.",
          "intro": [
            "Your staff handbook joins your clinical policies in the same knowledge base. Staff do not need to know where to look or who to ask. They simply ask their question in the hub and receive an answer drawn from your actual document."
          ],
          "image": null,
          "split": false,
          "flip": false,
          "narrow": false,
          "parts": [
            {
              "kind": "steps",
              "where": "",
              "sub": "",
              "variant": "",
              "items": [
                {
                  "icon": [],
                  "flag": "",
                  "marker": "01",
                  "tag": "",
                  "tone": "",
                  "title": "Upload your staff handbook",
                  "paras": [
                    "Add your staff handbook, employment contracts, HR policies, and any other employment documents to the CareStream knowledge base. Large handbooks are indexed chapter by chapter, so answers come from the right part of a long document. Everything is processed automatically within minutes."
                  ],
                  "bullets": []
                },
                {
                  "icon": [],
                  "flag": "",
                  "marker": "02",
                  "tag": "",
                  "tone": "",
                  "title": "Staff ask in the hub, typing or speaking",
                  "paras": [
                    "Any staff member can ask any employment question in the CareStream hub on their phone, by typing or by speaking, or by email. Questions can be asked in any language. The hub detects the language and answers in the same one."
                  ],
                  "bullets": []
                },
                {
                  "icon": [],
                  "flag": "",
                  "marker": "03",
                  "tag": "",
                  "tone": "",
                  "title": "Managers see what staff are asking",
                  "paras": [
                    "The analytics dashboard shows which handbook topics are being asked about most. Topics with high query volumes and unclear answers are surfaced as gaps, helping HR and managers see where the handbook needs to be clearer or where staff need more support."
                  ],
                  "bullets": []
                }
              ],
              "bullets": [],
              "header": "",
              "footer": ""
            }
          ],
          "actions": []
        },
        {
          "kind": "cards",
          "id": "",
          "tint": true,
          "label": "See It In Action",
          "heading": "An employment question answered in seconds. In any language.",
          "intro": [],
          "image": "/images/our-services/hr-policies/2.webp",
          "split": true,
          "flip": true,
          "narrow": false,
          "parts": [
            {
              "kind": "cards",
              "where": "after",
              "sub": "",
              "variant": "c2 hoisted",
              "items": [
                {
                  "icon": [
                    {
                      "tag": "path",
                      "d": "M12 4v5M12 15v5M4 12h5M15 12h5"
                    },
                    {
                      "tag": "circle",
                      "cx": "12",
                      "cy": "12",
                      "r": "2.6"
                    }
                  ],
                  "flag": "",
                  "marker": "",
                  "tag": "",
                  "tone": "",
                  "title": "The hub",
                  "paras": [
                    "A staff member asks about annual leave in Polish, by typing or speaking, and gets the answer in Polish.",
                    "CareStream detects the language of the question automatically. Your handbook stays in English. The answer is translated at the point of response, so every member of staff receives the same accurate information regardless of what language they speak.",
                    "Staff who are not confident typing can speak their question in the hub and listen to the answer read back. No language selection and no separate version of the handbook. The same document answers questions in over 60 languages."
                  ],
                  "bullets": []
                },
                {
                  "icon": [
                    {
                      "tag": "path",
                      "d": "M12 4v5M12 15v5M4 12h5M15 12h5"
                    },
                    {
                      "tag": "circle",
                      "cx": "12",
                      "cy": "12",
                      "r": "2.6"
                    }
                  ],
                  "flag": "",
                  "marker": "",
                  "tag": "",
                  "tone": "",
                  "title": "Email",
                  "paras": [
                    "An employment question answered from the exact section of the handbook.",
                    "Staff who prefer email can ask the same questions and get the same answers. Every response cites the section of the handbook it came from, so staff can read the original wording themselves and know exactly what applies to them.",
                    "The staff member can reply to the same email thread to ask a follow-up question. The conversation is kept with full context, so they do not have to repeat their situation with each new message."
                  ],
                  "bullets": []
                }
              ],
              "bullets": [],
              "header": "",
              "footer": ""
            }
          ],
          "actions": []
        },
        {
          "kind": "cards",
          "id": "",
          "tint": false,
          "label": "Everything in Your Handbook. Accessible.",
          "heading": "Every topic your staff have questions about. Available on demand.",
          "intro": [
            "CareStream does not limit which parts of the handbook staff can ask about. The entire document is indexed and every topic is answerable."
          ],
          "image": null,
          "split": false,
          "flip": false,
          "narrow": false,
          "parts": [
            {
              "kind": "cards",
              "where": "",
              "sub": "",
              "variant": "c3",
              "items": [
                {
                  "icon": [
                    {
                      "tag": "path",
                      "d": "M12 4v5M12 15v5M4 12h5M15 12h5"
                    },
                    {
                      "tag": "circle",
                      "cx": "12",
                      "cy": "12",
                      "r": "2.6"
                    }
                  ],
                  "flag": "",
                  "marker": "",
                  "tag": "",
                  "tone": "",
                  "title": "Annual leave and holiday pay",
                  "paras": [
                    "How much leave staff are entitled to, how to book it, the notice required, what happens to unused leave, and how bank holidays are treated. Questions that come up every single week in every care setting."
                  ],
                  "bullets": []
                },
                {
                  "icon": [
                    {
                      "tag": "path",
                      "d": "M12 4v5M12 15v5M4 12h5M15 12h5"
                    },
                    {
                      "tag": "circle",
                      "cx": "12",
                      "cy": "12",
                      "r": "2.6"
                    }
                  ],
                  "flag": "",
                  "marker": "",
                  "tag": "",
                  "tone": "",
                  "title": "Sick pay and absence",
                  "paras": [
                    "Statutory sick pay entitlements, contractual sick pay periods, the fit note requirement, return-to-work processes, and the difference between short-term and long-term absence procedures."
                  ],
                  "bullets": []
                },
                {
                  "icon": [
                    {
                      "tag": "path",
                      "d": "M12 4v5M12 15v5M4 12h5M15 12h5"
                    },
                    {
                      "tag": "circle",
                      "cx": "12",
                      "cy": "12",
                      "r": "2.6"
                    }
                  ],
                  "flag": "",
                  "marker": "",
                  "tag": "",
                  "tone": "",
                  "title": "Disciplinary and grievance",
                  "paras": [
                    "What triggers a disciplinary process, what the stages are, what rights the staff member has during the process, and how to raise a formal grievance. Sensitive questions staff often do not want to ask a manager directly."
                  ],
                  "bullets": []
                },
                {
                  "icon": [
                    {
                      "tag": "path",
                      "d": "M12 4v5M12 15v5M4 12h5M15 12h5"
                    },
                    {
                      "tag": "circle",
                      "cx": "12",
                      "cy": "12",
                      "r": "2.6"
                    }
                  ],
                  "flag": "",
                  "marker": "",
                  "tag": "",
                  "tone": "",
                  "title": "Pay, expenses and benefits",
                  "paras": [
                    "Pay dates, overtime rates, expense claim procedures, uniform allowances, mileage rates, and any other financial entitlements set out in the contract or handbook."
                  ],
                  "bullets": []
                },
                {
                  "icon": [
                    {
                      "tag": "path",
                      "d": "M12 4v5M12 15v5M4 12h5M15 12h5"
                    },
                    {
                      "tag": "circle",
                      "cx": "12",
                      "cy": "12",
                      "r": "2.6"
                    }
                  ],
                  "flag": "",
                  "marker": "",
                  "tag": "",
                  "tone": "",
                  "title": "Working hours and shifts",
                  "paras": [
                    "Contracted hours, shift patterns, rest break entitlements, the right to refuse additional shifts, and the process for requesting a change to contracted hours."
                  ],
                  "bullets": []
                },
                {
                  "icon": [
                    {
                      "tag": "path",
                      "d": "M12 4v5M12 15v5M4 12h5M15 12h5"
                    },
                    {
                      "tag": "circle",
                      "cx": "12",
                      "cy": "12",
                      "r": "2.6"
                    }
                  ],
                  "flag": "",
                  "marker": "",
                  "tag": "",
                  "tone": "",
                  "title": "Probation and onboarding",
                  "paras": [
                    "The length of the probationary period, what happens at the end of it, what is assessed during probation, and what support new starters are entitled to during their first weeks."
                  ],
                  "bullets": []
                }
              ],
              "bullets": [],
              "header": "",
              "footer": ""
            }
          ],
          "actions": []
        },
        {
          "kind": "table",
          "id": "",
          "tint": true,
          "label": "Equality of Access",
          "heading": "A staff member who speaks Romanian has the same access to their rights as one who speaks English.",
          "intro": [
            "Language should not determine whether a staff member understands their employment rights. CareStream removes that barrier entirely. The same handbook, the same answers, available in any language your team uses."
          ],
          "image": null,
          "split": false,
          "flip": false,
          "narrow": false,
          "parts": [
            {
              "kind": "table",
              "where": "",
              "sub": "",
              "variant": "",
              "items": [],
              "bullets": [],
              "header": "",
              "footer": "",
              "head": [
                "What CareStream provides",
                "What this means for your team"
              ],
              "rows": [
                [
                  "Handbook answers in any language",
                  "A staff member whose first language is Tagalog, Polish, or Romanian receives the same accurate answer from the same section of the handbook as an English-speaking colleague."
                ],
                [
                  "No language configuration required",
                  "Staff do not select a language or use a special command. CareStream detects the language of each message and answers in the same one."
                ],
                [
                  "Source document always in English",
                  "Your handbook stays in one language. There is no version control problem and no risk of a translated copy going out of date."
                ],
                [
                  "Speak the question, hear the answer",
                  "Staff who are not confident typing in English can speak their question in the hub in their own language and listen to the answer read back to them."
                ],
                [
                  "Sensitive questions asked privately",
                  "Questions about disciplinary procedures, grievances, or pay can be asked in the hub or by email without going through a manager, so staff can understand their position before escalating."
                ],
                [
                  "Consistent answers at all hours",
                  "A night shift worker who needs to know their sick pay entitlement gets the same accurate answer as a manager asking the same question during the working day."
                ]
              ]
            },
            {
              "kind": "ticks",
              "where": "",
              "sub": "",
              "variant": "",
              "items": [],
              "bullets": [
                "What CareStream provides",
                "What this means for your team"
              ],
              "header": "",
              "footer": ""
            }
          ],
          "actions": []
        },
        {
          "kind": "cards",
          "id": "",
          "tint": false,
          "label": "Everything Included",
          "heading": "The complete HR handbook access toolkit.",
          "intro": [],
          "image": null,
          "split": false,
          "flip": false,
          "narrow": false,
          "parts": [
            {
              "kind": "cards",
              "where": "",
              "sub": "",
              "variant": "c4",
              "items": [
                {
                  "icon": [
                    {
                      "tag": "path",
                      "d": "M12 4v5M12 15v5M4 12h5M15 12h5"
                    },
                    {
                      "tag": "circle",
                      "cx": "12",
                      "cy": "12",
                      "r": "2.6"
                    }
                  ],
                  "flag": "",
                  "marker": "",
                  "tag": "",
                  "tone": "",
                  "title": "Full handbook indexing",
                  "paras": [
                    "Upload your complete staff handbook and all employment documents. Every section is indexed and answerable immediately."
                  ],
                  "bullets": []
                },
                {
                  "icon": [
                    {
                      "tag": "path",
                      "d": "M12 4v5M12 15v5M4 12h5M15 12h5"
                    },
                    {
                      "tag": "circle",
                      "cx": "12",
                      "cy": "12",
                      "r": "2.6"
                    }
                  ],
                  "flag": "",
                  "marker": "",
                  "tag": "",
                  "tone": "",
                  "title": "Chapter-aware retrieval",
                  "paras": [
                    "Large handbooks are indexed chapter by chapter, so answers are drawn from the right part of a long document."
                  ],
                  "bullets": []
                },
                {
                  "icon": [
                    {
                      "tag": "path",
                      "d": "M12 4v5M12 15v5M4 12h5M15 12h5"
                    },
                    {
                      "tag": "circle",
                      "cx": "12",
                      "cy": "12",
                      "r": "2.6"
                    }
                  ],
                  "flag": "",
                  "marker": "",
                  "tag": "",
                  "tone": "",
                  "title": "Hub and email access",
                  "paras": [
                    "Staff ask in the hub on their phone or by email. No new system to learn, and the hub installs like an app."
                  ],
                  "bullets": []
                },
                {
                  "icon": [
                    {
                      "tag": "path",
                      "d": "M12 4v5M12 15v5M4 12h5M15 12h5"
                    },
                    {
                      "tag": "circle",
                      "cx": "12",
                      "cy": "12",
                      "r": "2.6"
                    }
                  ],
                  "flag": "",
                  "marker": "",
                  "tag": "",
                  "tone": "",
                  "title": "60-plus language support",
                  "paras": [
                    "Questions detected and answered in any language. One handbook, every language your team speaks."
                  ],
                  "bullets": []
                },
                {
                  "icon": [
                    {
                      "tag": "path",
                      "d": "M12 4v5M12 15v5M4 12h5M15 12h5"
                    },
                    {
                      "tag": "circle",
                      "cx": "12",
                      "cy": "12",
                      "r": "2.6"
                    }
                  ],
                  "flag": "",
                  "marker": "",
                  "tag": "",
                  "tone": "",
                  "title": "Voice input and read-aloud",
                  "paras": [
                    "Staff can speak a question in their own language and listen to the answer read back, with no typing required."
                  ],
                  "bullets": []
                },
                {
                  "icon": [
                    {
                      "tag": "path",
                      "d": "M12 4v5M12 15v5M4 12h5M15 12h5"
                    },
                    {
                      "tag": "circle",
                      "cx": "12",
                      "cy": "12",
                      "r": "2.6"
                    }
                  ],
                  "flag": "",
                  "marker": "",
                  "tag": "",
                  "tone": "",
                  "title": "Source-cited answers",
                  "paras": [
                    "Every response cites the section of the handbook it came from, so staff can read the original wording for themselves."
                  ],
                  "bullets": []
                },
                {
                  "icon": [
                    {
                      "tag": "path",
                      "d": "M12 4v5M12 15v5M4 12h5M15 12h5"
                    },
                    {
                      "tag": "circle",
                      "cx": "12",
                      "cy": "12",
                      "r": "2.6"
                    }
                  ],
                  "flag": "",
                  "marker": "",
                  "tag": "",
                  "tone": "",
                  "title": "Topic analytics for HR teams",
                  "paras": [
                    "See which topics staff ask about most. High-volume topics with unclear answers are evidence that the handbook needs updating in that area."
                  ],
                  "bullets": []
                },
                {
                  "icon": [
                    {
                      "tag": "path",
                      "d": "M12 4v5M12 15v5M4 12h5M15 12h5"
                    },
                    {
                      "tag": "circle",
                      "cx": "12",
                      "cy": "12",
                      "r": "2.6"
                    }
                  ],
                  "flag": "",
                  "marker": "",
                  "tag": "",
                  "tone": "",
                  "title": "Private and confidential",
                  "paras": [
                    "Sensitive questions about grievances, disciplinary procedures, or pay can be asked without going through a manager first."
                  ],
                  "bullets": []
                }
              ],
              "bullets": [],
              "header": "",
              "footer": ""
            }
          ],
          "actions": []
        },
        {
          "kind": "stats",
          "id": "",
          "tint": true,
          "label": "",
          "heading": "",
          "intro": [],
          "image": null,
          "split": false,
          "flip": false,
          "narrow": false,
          "parts": [
            {
              "kind": "stats",
              "where": "",
              "sub": "",
              "variant": "",
              "items": [
                {
                  "icon": [],
                  "flag": "",
                  "marker": "60+",
                  "tag": "",
                  "tone": "",
                  "title": "languages supported for staff handbook questions, with no configuration required.",
                  "paras": [
                    "The language of the question is detected automatically. Your handbook stays in English and answers are delivered in the language each staff member used."
                  ],
                  "bullets": []
                },
                {
                  "icon": [],
                  "flag": "",
                  "marker": "24/7",
                  "tag": "",
                  "tone": "",
                  "title": "access to the full staff handbook, on every shift and at any hour.",
                  "paras": [
                    "The question that previously meant an email to HR and a wait until the next working day is answered in the hub in seconds, day or night."
                  ],
                  "bullets": []
                }
              ],
              "bullets": [],
              "header": "",
              "footer": ""
            }
          ],
          "actions": []
        },
        {
          "kind": "end",
          "id": "",
          "tint": false,
          "label": "",
          "heading": "See HR Policies against your own policies",
          "intro": [
            "Staff handbook access in any language. Upload what you already have and see it working inside a fortnight."
          ],
          "image": null,
          "flip": false,
          "narrow": false,
          "parts": [],
          "actions": [
            {
              "label": "Start free trial",
              "href": "/register",
              "style": "solid",
              "play": false
            },
            {
              "label": "Book a demo",
              "href": "/demo",
              "style": "ghost",
              "play": false
            }
          ]
        }
      ]
    },
    "sort": 5
  },
  {
    "slug": "policy-gap-detection",
    "title": "Know exactly where your policies fall short. Then close the gap.",
    "meta_title": "Know exactly where your policies fall short. Then close the gap. | CareStreamAI",
    "meta_description": "CareStream reads inside your policies, tells you which regulations you cover and where the gaps are, checks the wording against the CQC Single Assessment Framework and suggests person-centred alternatives, shows what to add and why it is required, and tracks changes to the standards.",
    "hero_image_url": "/images/our-services/policy-gap-detection/1.webp",
    "content": {
      "eyebrow": "Professional & Enterprise",
      "lede": [
        "CareStream reads inside your policies, tells you which regulations you cover and where the gaps are, checks the wording against the CQC Single Assessment Framework and suggests person-centred alternatives, shows what to add and why it is required, and tracks changes to the standards."
      ],
      "actions": [
        {
          "label": "Start Free Trial",
          "href": "/register",
          "style": "solid",
          "play": false
        },
        {
          "label": "Book a Demo",
          "href": "/demo",
          "style": "ghost",
          "play": true
        }
      ],
      "toc": [],
      "blocks": [
        {
          "kind": "cards",
          "id": "",
          "tint": true,
          "label": "What we check for",
          "heading": "Three checks across your whole policy library.",
          "intro": [
            "Policy Gap Detection runs three different checks over everything you have uploaded. One finds what is missing, one finds what has gone out of date, and one finds where your policies disagree with each other. Together they turn a shelf of documents into a measured, defensible picture of where you stand."
          ],
          "image": null,
          "split": false,
          "flip": false,
          "narrow": false,
          "parts": [
            {
              "kind": "cards",
              "where": "",
              "sub": "",
              "variant": "c3",
              "items": [
                {
                  "icon": [
                    {
                      "tag": "path",
                      "d": "M12 4v5M12 15v5M4 12h5M15 12h5"
                    },
                    {
                      "tag": "circle",
                      "cx": "12",
                      "cy": "12",
                      "r": "2.6"
                    }
                  ],
                  "flag": "",
                  "marker": "",
                  "tag": "",
                  "tone": "",
                  "title": "Regulation coverage",
                  "paras": [
                    "We read the actual content of every policy, not just its title, and judge each regulation that applies to your service as covered, partly covered or a gap, mapped to the CQC Single Assessment Framework. You get a coverage score, and the policy that evidences each requirement is named for you.",
                    "Covered · Partial · Gap"
                  ],
                  "bullets": []
                },
                {
                  "icon": [
                    {
                      "tag": "path",
                      "d": "M12 4v5M12 15v5M4 12h5M15 12h5"
                    },
                    {
                      "tag": "circle",
                      "cx": "12",
                      "cy": "12",
                      "r": "2.6"
                    }
                  ],
                  "flag": "",
                  "marker": "",
                  "tag": "",
                  "tone": "",
                  "title": "Out-of-date content",
                  "paras": [
                    "We scan your whole library for policies that have quietly gone stale: superseded law and regulators, retired frameworks like the CQC Key Lines of Enquiry, pandemic-era wording and unfilled template placeholders. It runs instantly and uses no AI credits, and every flag shows what changed, what it should say now, and a link to the source.",
                    "Superseded law · Stale wording"
                  ],
                  "bullets": []
                },
                {
                  "icon": [
                    {
                      "tag": "path",
                      "d": "M12 4v5M12 15v5M4 12h5M15 12h5"
                    },
                    {
                      "tag": "circle",
                      "cx": "12",
                      "cy": "12",
                      "r": "2.6"
                    }
                  ],
                  "flag": "",
                  "marker": "",
                  "tag": "",
                  "tone": "",
                  "title": "Cross-policy consistency",
                  "paras": [
                    "We compare related and near-duplicate policies and surface where they contradict each other on the same point: conflicting timeframes, escalation routes, named roles or definitions, and drift between two versions of a policy that have slowly grown apart. You resolve the conflict yourself, before it turns up in an inspection.",
                    "Contradictions · Drift"
                  ],
                  "bullets": []
                }
              ],
              "bullets": [],
              "header": "",
              "footer": ""
            }
          ],
          "actions": []
        },
        {
          "kind": "timeline",
          "id": "",
          "tint": false,
          "label": "How it works",
          "heading": "From “are we compliant?” to exactly what to do about it.",
          "intro": [
            "Most homes assume coverage rather than verify it. This turns policy compliance from a guess into a measured, defensible, actionable picture, and keeps it current as the rules change."
          ],
          "image": null,
          "split": false,
          "flip": false,
          "narrow": false,
          "parts": [
            {
              "kind": "timeline",
              "where": "",
              "sub": "",
              "variant": "",
              "items": [
                {
                  "icon": [],
                  "flag": "",
                  "marker": "01",
                  "tag": "Regulation coverage",
                  "tone": "",
                  "title": "It reads inside your policies, not just the titles.",
                  "paras": [
                    "For every regulation that applies to your service, CareStream searches the actual content of your whole policy library and an AI auditor judges whether you substantively cover it: covered, partial, or a gap. A policy is only ever flagged when your documents genuinely do not address it, never because nothing happens to be named after it."
                  ],
                  "bullets": [
                    "A coverage score mapped to the CQC framework",
                    "Covered, partial and gap verdicts with the evidencing policy named",
                    "Checked against every uploaded policy, so nothing held elsewhere is missed"
                  ]
                },
                {
                  "icon": [],
                  "flag": "",
                  "marker": "02",
                  "tag": "What to add",
                  "tone": "",
                  "title": "Not just where you fall short, exactly what to add.",
                  "paras": [
                    "Drill into any partial or gap and CareStream shows the specific requirements you are missing, with example wording you can adapt, verified against your whole library first so it never tells you to add something you already hold in another policy."
                  ],
                  "bullets": [
                    "Requirement-by-requirement checklist per regulation",
                    "Example wording to review, adapt and approve",
                    "Highlights exactly where an existing policy already covers part of it"
                  ]
                },
                {
                  "icon": [],
                  "flag": "",
                  "marker": "03",
                  "tag": "CQC wording alignment",
                  "tone": "",
                  "title": "Whether your policy reads the way CQC expects, not just whether it covers the rule.",
                  "paras": [
                    "The CQC Single Assessment Framework looks for policies that are person-centred and outcomes-focused, not just procedurally correct. CareStream checks your wording against the framework, and where a policy covers the requirement but reads too procedurally, it flags it and suggests person-centred alternative wording in your policy’s own voice, that you can adopt in a click."
                  ],
                  "bullets": [
                    "Checked against the CQC Single Assessment Framework quality statements",
                    "Suggested person-centred wording, numbered and highlighted in the policy",
                    "Adopt it straight into your policy, through the same review and approval"
                  ]
                },
                {
                  "icon": [],
                  "flag": "",
                  "marker": "04",
                  "tag": "The legal basis",
                  "tone": "",
                  "title": "Every recommendation shows why it matters.",
                  "paras": [
                    "Each item is marked Legally required or Advised good practice, and names the regulation or guidance behind it with a link to the source. So a recommendation is never a black-box suggestion, it is a defensible, cited requirement your inspectors would recognise."
                  ],
                  "bullets": [
                    "Legally required vs advised, at a glance",
                    "The citing legislation, regulation or guidance named",
                    "Direct links to the source for evidence"
                  ]
                },
                {
                  "icon": [],
                  "flag": "",
                  "marker": "05",
                  "tag": "Where it goes",
                  "tone": "",
                  "title": "It tells you which policy to put it in.",
                  "paras": [
                    "For a partial, CareStream opens the policy that partly covers the regulation and highlights the passages that already address it. For a gap, it points to the existing policy the wording belongs in, or tells you a new policy is needed."
                  ],
                  "bullets": [
                    "Matched to the right policy in your library",
                    "Covered passages highlighted in the document",
                    "Flags when a brand-new policy is required"
                  ]
                },
                {
                  "icon": [],
                  "flag": "",
                  "marker": "06",
                  "tag": "Right for your service",
                  "tone": "",
                  "title": "Only tested against what actually applies to you.",
                  "paras": [
                    "A short service profile, pre-filled from your setting type, tells CareStream what your service actually does. So a home that holds no controlled drugs is never assessed against controlled-drug rules, and a service that does not support people under the Mental Health Act is never flagged for it."
                  ],
                  "bullets": [
                    "Scoped by care setting and what your service does",
                    "The CQC Fundamental Standards apply to everyone",
                    "No irrelevant gaps, no noise"
                  ]
                },
                {
                  "icon": [],
                  "flag": "",
                  "marker": "07",
                  "tag": "Track legal changes",
                  "tone": "",
                  "title": "When the standards change, you know.",
                  "paras": [
                    "CareStream tracks changes to the regulations and standards you are assessed against. When one changes, the homes affected are alerted on their gaps page so they can review and re-check their policies, before it becomes an inspection finding."
                  ],
                  "bullets": [
                    "Change history for every standard",
                    "Homes assessed against a changed standard are alerted",
                    "Re-check coverage in a click"
                  ]
                },
                {
                  "icon": [],
                  "flag": "",
                  "marker": "08",
                  "tag": "Turn changes into training",
                  "tone": "",
                  "title": "Every policy change becomes staff training.",
                  "paras": [
                    "Once you add the recommended wording, or when a standard updates, generate a short, ready-to-assign training module built from exactly that change. Diagnose the gap, close it, and make sure your staff learn it, in one flow."
                  ],
                  "bullets": [
                    "A micro-lesson and assessment from the change",
                    "Lands as a draft for you to review and publish",
                    "Reuses your existing training and certificate flow"
                  ]
                }
              ],
              "bullets": [],
              "header": "",
              "footer": ""
            }
          ],
          "actions": []
        },
        {
          "kind": "ticks",
          "id": "",
          "tint": true,
          "label": "Professional & Enterprise",
          "heading": "Policy Gap Detection is included on the Professional and Enterprise plans.",
          "intro": [
            "Regulation coverage, remediation guidance with the legal basis, change tracking and gap-driven training are all part of Professional and Enterprise. Starter customers can upgrade in a click."
          ],
          "image": null,
          "split": false,
          "flip": false,
          "narrow": false,
          "parts": [
            {
              "kind": "ticks",
              "where": "",
              "sub": "",
              "variant": "",
              "items": [],
              "bullets": [
                "See plans & pricing"
              ],
              "header": "",
              "footer": ""
            }
          ],
          "actions": []
        },
        {
          "kind": "end",
          "id": "",
          "tint": false,
          "label": "",
          "heading": "See Policy Gap Detection against your own policies",
          "intro": [
            "Find gaps, track legal changes, auto train staff. Upload what you already have and see it working inside a fortnight."
          ],
          "image": null,
          "flip": false,
          "narrow": false,
          "parts": [],
          "actions": [
            {
              "label": "Start free trial",
              "href": "/register",
              "style": "solid",
              "play": false
            },
            {
              "label": "Book a demo",
              "href": "/demo",
              "style": "ghost",
              "play": false
            }
          ]
        }
      ]
    },
    "sort": 6
  },
  {
    "slug": "how-it-works",
    "title": "Everything you need to know about how CareStreamAI works.",
    "meta_title": "Everything you need to know about how CareStreamAI works. | CareStreamAI",
    "meta_description": "From uploading your first policy to your CQC inspection, a complete walkthrough of every feature, how it works, and why it matters for your care setting.",
    "hero_image_url": "/images/how-it-works/1.webp",
    "content": {
      "eyebrow": "How It Works",
      "lede": [
        "From uploading your first policy to your CQC inspection, a complete walkthrough of every feature, how it works, and why it matters for your care setting."
      ],
      "actions": [
        {
          "label": "Start free trial",
          "href": "/register",
          "style": "solid",
          "play": false
        },
        {
          "label": "Book a demo",
          "href": "/demo",
          "style": "ghost",
          "play": true
        }
      ],
      "toc": [
        {
          "href": "#start",
          "label": "Getting started"
        },
        {
          "href": "#ai",
          "label": "The AI engine"
        },
        {
          "href": "#hub",
          "label": "Channels"
        },
        {
          "href": "#training",
          "label": "Training"
        },
        {
          "href": "#lang",
          "label": "Languages"
        },
        {
          "href": "#reg",
          "label": "Regulations"
        },
        {
          "href": "#kb",
          "label": "Knowledge base"
        },
        {
          "href": "#gap",
          "label": "Policy gaps"
        },
        {
          "href": "#analytics",
          "label": "Analytics"
        },
        {
          "href": "#security",
          "label": "Security"
        }
      ],
      "blocks": [
        {
          "kind": "steps",
          "id": "start",
          "tint": false,
          "label": "Getting Started",
          "heading": "Up and running in under an hour.",
          "intro": [
            "There is no integration project, no IT department involvement, and no lengthy rollout. Three steps and your whole team has access."
          ],
          "image": "/images/how-it-works/2.webp",
          "split": true,
          "flip": false,
          "narrow": false,
          "parts": [
            {
              "kind": "steps",
              "where": "in",
              "sub": "",
              "variant": "",
              "items": [
                {
                  "icon": [],
                  "flag": "",
                  "marker": "01",
                  "tag": "Most care settings upload between 20 and 80 policy documents. The upload takes minutes.",
                  "tone": "",
                  "title": "Upload your documents",
                  "paras": [
                    "Upload your policy library, staff handbook, and any supporting documents from the admin dashboard. PDF, Word, and plain text are all accepted. There is no limit on file size or number of policies."
                  ],
                  "bullets": []
                },
                {
                  "icon": [],
                  "flag": "",
                  "marker": "02",
                  "tag": "Processing typically completes in under five minutes per document, automatically.",
                  "tone": "",
                  "title": "CareStreamAI processes them",
                  "paras": [
                    "Each document is read, chunked into meaningful sections, and indexed for semantic search. Key facts such as named individuals, contact numbers and local procedures are extracted and made searchable."
                  ],
                  "bullets": []
                },
                {
                  "icon": [],
                  "flag": "",
                  "marker": "03",
                  "tag": "Most care settings are fully live within 45 minutes of starting the setup process.",
                  "tone": "",
                  "title": "Your team goes live",
                  "paras": [
                    "Add your staff and they get the hub on their phone, with email as a backup. They can immediately ask questions, read policies and start their training, in the language they think in, with voice input when typing is harder."
                  ],
                  "bullets": []
                }
              ],
              "bullets": [],
              "header": "",
              "footer": ""
            }
          ],
          "actions": []
        },
        {
          "kind": "steps",
          "id": "ai",
          "tint": true,
          "label": "The AI Engine",
          "heading": "How the AI generates answers.",
          "intro": [
            "CareStreamAI uses a technique called Retrieval-Augmented Generation (RAG). In plain English: it finds the right part of your policy, reads it, and writes the answer from that content only."
          ],
          "image": "/images/how-it-works/3.webp",
          "split": true,
          "flip": false,
          "narrow": false,
          "parts": [
            {
              "kind": "steps",
              "where": "in",
              "sub": "",
              "variant": "",
              "items": [
                {
                  "icon": [],
                  "flag": "",
                  "marker": "01",
                  "tag": "",
                  "tone": "",
                  "title": "Semantic search",
                  "paras": [
                    "The question is converted into a mathematical representation and matched against your indexed policies. The most relevant sections are retrieved, even when the exact wording of the question differs from the policy."
                  ],
                  "bullets": []
                },
                {
                  "icon": [],
                  "flag": "",
                  "marker": "02",
                  "tag": "",
                  "tone": "",
                  "title": "Context assembly",
                  "paras": [
                    "The retrieved policy sections are assembled into a context window, along with any conversation history from the current session and the relevant regulatory framework."
                  ],
                  "bullets": []
                },
                {
                  "icon": [],
                  "flag": "",
                  "marker": "03",
                  "tag": "",
                  "tone": "",
                  "title": "Answer generation",
                  "paras": [
                    "The AI is instructed to answer using only the provided context. It cannot draw on general knowledge or training data. If the answer is not in your documents, it says so."
                  ],
                  "bullets": []
                },
                {
                  "icon": [],
                  "flag": "",
                  "marker": "04",
                  "tag": "",
                  "tone": "",
                  "title": "Citation and logging",
                  "paras": [
                    "Every response cites the exact policy and section used. The full interaction, including question, answer, policy cited, language, channel and timestamp, is logged to the audit trail."
                  ],
                  "bullets": []
                }
              ],
              "bullets": [],
              "header": "",
              "footer": ""
            },
            {
              "kind": "note",
              "where": "in",
              "sub": "",
              "variant": "",
              "items": [],
              "bullets": [],
              "header": "",
              "footer": "",
              "paras": [
                "The AI is given your policy content and told: answer from this, and only this. It has no access to the internet, no access to other organisations’ policies, and no access to its general training data when answering. If a question cannot be answered from your documents, it tells the staff member and flags the gap for your review."
              ],
              "title": "Why it cannot make things up"
            }
          ],
          "actions": []
        },
        {
          "kind": "channels",
          "id": "hub",
          "tint": false,
          "label": "The Hub",
          "heading": "One hub on their phone. Email and voice when it suits.",
          "intro": [
            "The hub is where your team lives day to day: their policies, their training and instant answers, in one place. Email and voice give the same quality of response, drawn from the same library, with the same audit trail."
          ],
          "image": null,
          "split": false,
          "flip": false,
          "narrow": false,
          "parts": [
            {
              "kind": "channels",
              "where": "",
              "sub": "",
              "variant": "",
              "items": [
                {
                  "icon": [
                    {
                      "tag": "path",
                      "d": "M12 4v5M12 15v5M4 12h5M15 12h5"
                    },
                    {
                      "tag": "circle",
                      "cx": "12",
                      "cy": "12",
                      "r": "2.6"
                    }
                  ],
                  "flag": "",
                  "marker": "",
                  "tag": "On any smartphone, plus desktop browser",
                  "tone": "",
                  "title": "The hub app",
                  "paras": [
                    "The hub is the one place for your whole team. Staff open it to ask a policy question, read a procedure, or complete a piece of training, all in the language they think in. The chat is conversational, so they can ask follow-ups within the same session and the system keeps full context. Reminders and new training arrive as notifications, so nothing gets missed."
                  ],
                  "bullets": [
                    "Policies, training and answers in one place",
                    "Push notifications for reminders and new training",
                    "Conversational follow-ups with full session context",
                    "Voice input for hands-free questions mid-task",
                    "Suggested follow-up questions after each response",
                    "Works on any smartphone or desktop browser"
                  ]
                },
                {
                  "icon": [
                    {
                      "tag": "path",
                      "d": "M12 4v5M12 15v5M4 12h5M15 12h5"
                    },
                    {
                      "tag": "circle",
                      "cx": "12",
                      "cy": "12",
                      "r": "2.6"
                    }
                  ],
                  "flag": "",
                  "marker": "",
                  "tag": "Any email client, any device",
                  "tone": "",
                  "title": "Email",
                  "paras": [
                    "Staff email your dedicated CareStreamAI address from any device. The system replies within 30 seconds. Replying to the response continues the conversation. The system reads the full thread and maintains context across multiple exchanges."
                  ],
                  "bullets": [
                    "No login and no app required, works from any email client",
                    "Response arrives in the same email thread within 30 seconds",
                    "Thread context maintained, reply to continue the conversation",
                    "Useful for staff who prefer email or are on shift handover"
                  ]
                },
                {
                  "icon": [
                    {
                      "tag": "path",
                      "d": "M12 4v5M12 15v5M4 12h5M15 12h5"
                    },
                    {
                      "tag": "circle",
                      "cx": "12",
                      "cy": "12",
                      "r": "2.6"
                    }
                  ],
                  "flag": "",
                  "marker": "",
                  "tag": "In the hub, hands-free",
                  "tone": "",
                  "title": "Voice input",
                  "paras": [
                    "Not everyone types quickly in their second language. Voice input lets staff speak their question naturally, mid-task and hands-free, in any language. The audio is transcribed, language-detected, and answered from your policies in the same language it was spoken."
                  ],
                  "bullets": [
                    "60+ languages supported for voice input",
                    "Transcription shown alongside the answer for transparency",
                    "Same response quality as typed queries",
                    "Logged identically, voice queries appear in the audit trail"
                  ]
                }
              ],
              "bullets": [],
              "header": "",
              "footer": ""
            }
          ],
          "actions": []
        },
        {
          "kind": "ticks",
          "id": "",
          "tint": true,
          "label": "The hub in use",
          "heading": "What your team actually sees.",
          "intro": [
            "The same answer, the same citation, whichever way they ask."
          ],
          "image": "/images/how-it-works/4.webp",
          "split": true,
          "flip": false,
          "narrow": false,
          "parts": [
            {
              "kind": "ticks",
              "where": "in",
              "sub": "",
              "variant": "",
              "items": [],
              "bullets": [
                "Ask in the hub app, by email or by voice, and the answer cites the policy section it came from",
                "Staff ask in their own language and get the answer back in it, across 60 or more languages",
                "Every answer is logged with who asked, what was cited and when, ready for the audit trail",
                "Training, inductions, audits and CQC prep live in the same hub, so there is one place to go"
              ],
              "header": "",
              "footer": ""
            }
          ],
          "actions": []
        },
        {
          "kind": "ticks",
          "id": "training",
          "tint": false,
          "label": "Staff Training",
          "heading": "Training that lives in the same hub.",
          "intro": [
            "CareStream is not only about answering questions. It delivers your mandatory training and modules built from your own policies, in the hub your team already uses, in 60+ languages, with renewals tracked for you."
          ],
          "image": "/images/how-it-works/5.webp",
          "split": true,
          "flip": true,
          "narrow": false,
          "parts": [
            {
              "kind": "ticks",
              "where": "in",
              "sub": "",
              "variant": "",
              "items": [],
              "bullets": [
                "Renewal reminders at 90, 30 and 7 days",
                "New training arrives as a hub notification"
              ],
              "header": "",
              "footer": ""
            },
            {
              "kind": "cards",
              "where": "after",
              "sub": "",
              "variant": "c4 hoisted",
              "items": [
                {
                  "icon": [
                    {
                      "tag": "path",
                      "d": "M12 4v5M12 15v5M4 12h5M15 12h5"
                    },
                    {
                      "tag": "circle",
                      "cx": "12",
                      "cy": "12",
                      "r": "2.6"
                    }
                  ],
                  "flag": "",
                  "marker": "",
                  "tag": "",
                  "tone": "",
                  "title": "Mandatory library",
                  "paras": [
                    "Every annual mandatory subject, ready to assign, from safeguarding to moving and handling."
                  ],
                  "bullets": []
                },
                {
                  "icon": [
                    {
                      "tag": "path",
                      "d": "M12 4v5M12 15v5M4 12h5M15 12h5"
                    },
                    {
                      "tag": "circle",
                      "cx": "12",
                      "cy": "12",
                      "r": "2.6"
                    }
                  ],
                  "flag": "",
                  "marker": "",
                  "tag": "",
                  "tone": "",
                  "title": "Built from your policies",
                  "paras": [
                    "Generate a module from your own policy documents, so it teaches your procedures, not generic content."
                  ],
                  "bullets": []
                },
                {
                  "icon": [
                    {
                      "tag": "path",
                      "d": "M12 4v5M12 15v5M4 12h5M15 12h5"
                    },
                    {
                      "tag": "circle",
                      "cx": "12",
                      "cy": "12",
                      "r": "2.6"
                    }
                  ],
                  "flag": "",
                  "marker": "",
                  "tag": "",
                  "tone": "",
                  "title": "Teach, then assess",
                  "paras": [
                    "Each module teaches in short sections, applies a real care scenario, and finishes with an assessment."
                  ],
                  "bullets": []
                },
                {
                  "icon": [
                    {
                      "tag": "path",
                      "d": "M12 4v5M12 15v5M4 12h5M15 12h5"
                    },
                    {
                      "tag": "circle",
                      "cx": "12",
                      "cy": "12",
                      "r": "2.6"
                    }
                  ],
                  "flag": "",
                  "marker": "",
                  "tag": "",
                  "tone": "",
                  "title": "Learn and retry",
                  "paras": [
                    "A wrong answer triggers a short follow-up lesson and a fresh question, so the gap is closed."
                  ],
                  "bullets": []
                }
              ],
              "bullets": [],
              "header": "",
              "footer": ""
            }
          ],
          "actions": [
            {
              "label": "See how training works",
              "href": "/staff-training",
              "style": "ghost",
              "play": false
            }
          ]
        },
        {
          "kind": "stats",
          "id": "lang",
          "tint": true,
          "label": "Multilingual Engine",
          "heading": "60+ languages. Zero configuration.",
          "intro": [
            "Language detection is automatic and happens on every query. Staff do not select a language, toggle a setting, or use a special command. They simply ask their question, in the language they think in, and the answer comes back in the same language.",
            "Responses are always generated from your English-language policies. The translation happens at the point of response, not at the point of upload. This means you maintain one authoritative English policy library and every language version is derived from it consistently."
          ],
          "image": null,
          "split": false,
          "flip": false,
          "narrow": false,
          "parts": [
            {
              "kind": "stats",
              "where": "",
              "sub": "",
              "variant": "",
              "items": [
                {
                  "icon": [],
                  "flag": "",
                  "marker": "60+",
                  "tag": "",
                  "tone": "",
                  "title": "Languages detected",
                  "paras": [],
                  "bullets": []
                },
                {
                  "icon": [],
                  "flag": "",
                  "marker": "English",
                  "tag": "",
                  "tone": "",
                  "title": "Source policy language",
                  "paras": [],
                  "bullets": []
                },
                {
                  "icon": [],
                  "flag": "",
                  "marker": "None",
                  "tag": "",
                  "tone": "",
                  "title": "Setup required",
                  "paras": [],
                  "bullets": []
                },
                {
                  "icon": [],
                  "flag": "",
                  "marker": "£0",
                  "tag": "",
                  "tone": "",
                  "title": "Extra cost per language",
                  "paras": [],
                  "bullets": []
                }
              ],
              "bullets": [],
              "header": "",
              "footer": ""
            },
            {
              "kind": "langdemo",
              "where": "",
              "sub": "",
              "variant": "",
              "items": [
                {
                  "icon": [],
                  "flag": "🇵🇭",
                  "marker": "",
                  "tag": "🇵🇭",
                  "tone": "",
                  "title": "Tagalog",
                  "paras": [
                    "Ano ang gagawin ko pagkatapos ng pagbagsak ng residente?"
                  ],
                  "bullets": [
                    "🇵🇭 Tagalog Ano ang gagawin ko pagkatapos ng pagbagsak ng residente? Detected"
                  ]
                },
                {
                  "icon": [],
                  "flag": "🇵🇱",
                  "marker": "",
                  "tag": "🇵🇱",
                  "tone": "",
                  "title": "Polish",
                  "paras": [
                    "Co powinienem zrobić po upadku mieszkańca?"
                  ],
                  "bullets": [
                    "🇵🇱 Polish Co powinienem zrobić po upadku mieszkańca? Detected"
                  ]
                },
                {
                  "icon": [],
                  "flag": "🇷🇴",
                  "marker": "",
                  "tag": "🇷🇴",
                  "tone": "",
                  "title": "Romanian",
                  "paras": [
                    "Ce trebuie să fac după ce un rezident cade?"
                  ],
                  "bullets": [
                    "🇷🇴 Romanian Ce trebuie să fac după ce un rezident cade? Detected"
                  ]
                },
                {
                  "icon": [],
                  "flag": "🇮🇳",
                  "marker": "",
                  "tag": "🇮🇳",
                  "tone": "",
                  "title": "Hindi",
                  "paras": [
                    "निवासी के गिरने के बाद मुझे क्या करना चाहिए?"
                  ],
                  "bullets": [
                    "🇮🇳 Hindi निवासी के गिरने के बाद मुझे क्या करना चाहिए? Detected"
                  ]
                },
                {
                  "icon": [],
                  "flag": "🇳🇬",
                  "marker": "",
                  "tag": "🇳🇬",
                  "tone": "",
                  "title": "Yoruba",
                  "paras": [
                    "Kini mo yẹ ki n ṣe lẹhin ti olugbe ba subu?"
                  ],
                  "bullets": [
                    "🇳🇬 Yoruba Kini mo yẹ ki n ṣe lẹhin ti olugbe ba subu? Detected"
                  ]
                },
                {
                  "icon": [],
                  "flag": "🇸🇴",
                  "marker": "",
                  "tag": "🇸🇴",
                  "tone": "",
                  "title": "Somali",
                  "paras": [
                    "Maxaan samayn karaa marka martida ay dhacdo?",
                    "All answered from the same Falls Policy, each in the language asked"
                  ],
                  "bullets": [
                    "🇸🇴 Somali Maxaan samayn karaa marka martida ay dhacdo? Detected"
                  ]
                }
              ],
              "bullets": [],
              "header": "The same question, six languages, one policy",
              "footer": "All answered from the same Falls Policy, each in the language asked"
            }
          ],
          "actions": []
        },
        {
          "kind": "steps",
          "id": "reg",
          "tint": false,
          "label": "Regulatory Intelligence",
          "heading": "Over 50 UK regulatory frameworks, pre-loaded.",
          "intro": [
            "Your internal policies don’t exist in isolation. They’re built on a foundation of UK law and regulation. CareStreamAI has over 50 regulatory frameworks pre-loaded so that when a staff member asks something that touches both your policy and an external requirement, the response explains how the two interact."
          ],
          "image": null,
          "split": false,
          "flip": false,
          "narrow": false,
          "parts": [
            {
              "kind": "steps",
              "where": "",
              "sub": "How it works",
              "variant": "",
              "items": [
                {
                  "icon": [],
                  "flag": "",
                  "marker": "01",
                  "tag": "",
                  "tone": "",
                  "title": "Your internal policy is retrieved",
                  "paras": [
                    "The most relevant section of your own policy is found and used as the primary source for the response."
                  ],
                  "bullets": []
                },
                {
                  "icon": [],
                  "flag": "",
                  "marker": "02",
                  "tag": "",
                  "tone": "",
                  "title": "Relevant regulations are overlaid",
                  "paras": [
                    "CareStreamAI identifies which of the 50+ pre-loaded frameworks apply to the question, including CQC, RIDDOR, MCA and GDPR, and adds that context."
                  ],
                  "bullets": []
                },
                {
                  "icon": [],
                  "flag": "",
                  "marker": "03",
                  "tag": "",
                  "tone": "",
                  "title": "The interaction is explained",
                  "paras": [
                    "The response explains both what your policy requires and what the law requires, including where they align, where they differ, and where your policy goes further."
                  ],
                  "bullets": []
                }
              ],
              "bullets": [],
              "header": "",
              "footer": ""
            },
            {
              "kind": "frameworks",
              "where": "",
              "sub": "",
              "variant": "",
              "items": [
                {
                  "icon": [],
                  "flag": "",
                  "marker": "",
                  "tag": "Reg 9 to 20",
                  "tone": "",
                  "title": "CQC Fundamental Standards",
                  "paras": [],
                  "bullets": [
                    "CQC Fundamental Standards Reg 9 to 20"
                  ]
                },
                {
                  "icon": [],
                  "flag": "",
                  "marker": "",
                  "tag": "HSWA 1974",
                  "tone": "",
                  "title": "Health and Safety at Work Act 1974",
                  "paras": [],
                  "bullets": [
                    "Health and Safety at Work Act 1974 HSWA 1974"
                  ]
                },
                {
                  "icon": [],
                  "flag": "",
                  "marker": "",
                  "tag": "UK GDPR",
                  "tone": "",
                  "title": "GDPR and Data Protection Act 2018",
                  "paras": [],
                  "bullets": [
                    "GDPR and Data Protection Act 2018 UK GDPR"
                  ]
                },
                {
                  "icon": [],
                  "flag": "",
                  "marker": "",
                  "tag": "MCA 2005",
                  "tone": "",
                  "title": "Mental Capacity Act 2005",
                  "paras": [],
                  "bullets": [
                    "Mental Capacity Act 2005 MCA 2005"
                  ]
                },
                {
                  "icon": [],
                  "flag": "",
                  "marker": "",
                  "tag": "Care Act 2014",
                  "tone": "",
                  "title": "Care Act 2014 Safeguarding",
                  "paras": [],
                  "bullets": [
                    "Care Act 2014 Safeguarding Care Act 2014"
                  ]
                },
                {
                  "icon": [],
                  "flag": "",
                  "marker": "",
                  "tag": "RIDDOR 2013",
                  "tone": "",
                  "title": "RIDDOR 2013",
                  "paras": [],
                  "bullets": [
                    "RIDDOR 2013 RIDDOR 2013"
                  ]
                },
                {
                  "icon": [],
                  "flag": "",
                  "marker": "",
                  "tag": "EA 2010",
                  "tone": "",
                  "title": "Equality Act 2010",
                  "paras": [],
                  "bullets": [
                    "Equality Act 2010 EA 2010"
                  ]
                },
                {
                  "icon": [],
                  "flag": "",
                  "marker": "",
                  "tag": "COSHH 2002",
                  "tone": "",
                  "title": "Control of Substances Hazardous to Health",
                  "paras": [
                    "+ 42 additional frameworks included"
                  ],
                  "bullets": [
                    "Control of Substances Hazardous to Health COSHH 2002"
                  ]
                }
              ],
              "bullets": [],
              "header": "A selection of included frameworks",
              "footer": "+ 42 additional frameworks included"
            }
          ],
          "actions": []
        },
        {
          "kind": "ticks",
          "id": "kb",
          "tint": true,
          "label": "The Knowledge Base",
          "heading": "Not just your policies. Your care setting, in detail.",
          "intro": [
            "CareStreamAI doesn’t just answer generic questions about policies. Because it reads your actual documents, it extracts the specific facts that make your service unique: named individuals, direct-dial numbers, shift arrangements and local procedures.",
            "Upload your staff handbook, on-call rota, local infection control guidance, or any supporting document and it becomes immediately queryable. Staff get answers that reflect how your service actually operates, not how a generic care setting might."
          ],
          "image": "/images/how-it-works/6.webp",
          "split": true,
          "flip": false,
          "narrow": false,
          "parts": [
            {
              "kind": "ticks",
              "where": "in",
              "sub": "",
              "variant": "",
              "items": [],
              "bullets": [
                "Named individuals and contact numbers from your rota and handbook",
                "Local procedures and site-specific instructions",
                "Staff handbook: HR policies, leave, disciplinary and onboarding",
                "Seeded knowledge never mixed with other tenants' data"
              ],
              "header": "",
              "footer": ""
            }
          ],
          "actions": []
        },
        {
          "kind": "cards",
          "id": "gap",
          "tint": false,
          "label": "Policy Gap Detection",
          "heading": "Find your gaps before CQC does.",
          "intro": [
            "Every time CareStreamAI cannot find an answer in your documents, it flags the query as a gap. Over time, patterns emerge: the same questions appearing repeatedly without policy coverage.",
            "Your Policy Gap Report shows exactly which questions your staff are asking that your current policies don’t address, ranked by frequency. This is actionable evidence of where your policy library needs strengthening, surfaced before an inspection identifies it first."
          ],
          "image": "/images/how-it-works/7.webp",
          "split": true,
          "flip": true,
          "narrow": false,
          "parts": [
            {
              "kind": "cards",
              "where": "after",
              "sub": "",
              "variant": "c4 hoisted",
              "items": [
                {
                  "icon": [
                    {
                      "tag": "path",
                      "d": "M12 4v5M12 15v5M4 12h5M15 12h5"
                    },
                    {
                      "tag": "circle",
                      "cx": "12",
                      "cy": "12",
                      "r": "2.6"
                    }
                  ],
                  "flag": "",
                  "marker": "",
                  "tag": "",
                  "tone": "",
                  "title": "Real-time flagging",
                  "paras": [
                    "Every unanswered query is flagged immediately, not batched monthly."
                  ],
                  "bullets": []
                },
                {
                  "icon": [
                    {
                      "tag": "path",
                      "d": "M12 4v5M12 15v5M4 12h5M15 12h5"
                    },
                    {
                      "tag": "circle",
                      "cx": "12",
                      "cy": "12",
                      "r": "2.6"
                    }
                  ],
                  "flag": "",
                  "marker": "",
                  "tag": "",
                  "tone": "",
                  "title": "Ranked by frequency",
                  "paras": [
                    "The most commonly asked unanswered questions are shown first, so you fix the most impactful gaps."
                  ],
                  "bullets": []
                },
                {
                  "icon": [
                    {
                      "tag": "path",
                      "d": "M12 4v5M12 15v5M4 12h5M15 12h5"
                    },
                    {
                      "tag": "circle",
                      "cx": "12",
                      "cy": "12",
                      "r": "2.6"
                    }
                  ],
                  "flag": "",
                  "marker": "",
                  "tag": "",
                  "tone": "",
                  "title": "Monthly summary report",
                  "paras": [
                    "A summary is compiled automatically and available for your manager review."
                  ],
                  "bullets": []
                },
                {
                  "icon": [
                    {
                      "tag": "path",
                      "d": "M12 4v5M12 15v5M4 12h5M15 12h5"
                    },
                    {
                      "tag": "circle",
                      "cx": "12",
                      "cy": "12",
                      "r": "2.6"
                    }
                  ],
                  "flag": "",
                  "marker": "",
                  "tag": "",
                  "tone": "",
                  "title": "Included in CQC Readiness Report",
                  "paras": [
                    "Gap resolution evidence is included as proof of continuous improvement."
                  ],
                  "bullets": []
                }
              ],
              "bullets": [],
              "header": "",
              "footer": ""
            }
          ],
          "actions": []
        },
        {
          "kind": "cards",
          "id": "analytics",
          "tint": true,
          "label": "Analytics & Compliance",
          "heading": "Your compliance evidence builds automatically.",
          "intro": [
            "Every interaction with CareStreamAI is logged and structured. Your analytics dashboard and CQC Readiness Report are generated from this data continuously. There is nothing to compile manually."
          ],
          "image": "/images/how-it-works/8.webp",
          "split": true,
          "flip": false,
          "narrow": false,
          "parts": [
            {
              "kind": "cards",
              "where": "after",
              "sub": "",
              "variant": "c4 hoisted",
              "items": [
                {
                  "icon": [
                    {
                      "tag": "path",
                      "d": "M12 4v5M12 15v5M4 12h5M15 12h5"
                    },
                    {
                      "tag": "circle",
                      "cx": "12",
                      "cy": "12",
                      "r": "2.6"
                    }
                  ],
                  "flag": "",
                  "marker": "",
                  "tag": "",
                  "tone": "",
                  "title": "Tenant isolation",
                  "paras": [
                    "Complete data separation between all organisations"
                  ],
                  "bullets": []
                },
                {
                  "icon": [
                    {
                      "tag": "path",
                      "d": "M12 4v5M12 15v5M4 12h5M15 12h5"
                    },
                    {
                      "tag": "circle",
                      "cx": "12",
                      "cy": "12",
                      "r": "2.6"
                    }
                  ],
                  "flag": "",
                  "marker": "",
                  "tag": "",
                  "tone": "",
                  "title": "Encrypted at rest",
                  "paras": [
                    "AES-256 encryption for all stored documents and logs"
                  ],
                  "bullets": []
                },
                {
                  "icon": [
                    {
                      "tag": "path",
                      "d": "M12 4v5M12 15v5M4 12h5M15 12h5"
                    },
                    {
                      "tag": "circle",
                      "cx": "12",
                      "cy": "12",
                      "r": "2.6"
                    }
                  ],
                  "flag": "",
                  "marker": "",
                  "tag": "",
                  "tone": "",
                  "title": "Never used for training",
                  "paras": [
                    "Your documents are never used to train AI models"
                  ],
                  "bullets": []
                },
                {
                  "icon": [
                    {
                      "tag": "path",
                      "d": "M12 4v5M12 15v5M4 12h5M15 12h5"
                    },
                    {
                      "tag": "circle",
                      "cx": "12",
                      "cy": "12",
                      "r": "2.6"
                    }
                  ],
                  "flag": "",
                  "marker": "",
                  "tag": "",
                  "tone": "",
                  "title": "UK data residency",
                  "paras": [
                    "Available on Professional and Enterprise plans"
                  ],
                  "bullets": []
                }
              ],
              "bullets": [],
              "header": "",
              "footer": ""
            },
            {
              "kind": "cards",
              "where": "after",
              "sub": "",
              "variant": "c3 hoisted",
              "items": [
                {
                  "icon": [
                    {
                      "tag": "path",
                      "d": "M12 4v5M12 15v5M4 12h5M15 12h5"
                    },
                    {
                      "tag": "circle",
                      "cx": "12",
                      "cy": "12",
                      "r": "2.6"
                    }
                  ],
                  "flag": "",
                  "marker": "",
                  "tag": "",
                  "tone": "",
                  "title": "Usage analytics dashboard",
                  "paras": [
                    "See total queries, active staff, top policies accessed, busiest times, and channel breakdown (hub, email, voice), updated in real time."
                  ],
                  "bullets": []
                },
                {
                  "icon": [
                    {
                      "tag": "path",
                      "d": "M12 4v5M12 15v5M4 12h5M15 12h5"
                    },
                    {
                      "tag": "circle",
                      "cx": "12",
                      "cy": "12",
                      "r": "2.6"
                    }
                  ],
                  "flag": "",
                  "marker": "",
                  "tag": "",
                  "tone": "",
                  "title": "Language activity report",
                  "paras": [
                    "Which languages your staff are asking in, how frequently, and which policies are being accessed across languages. CQC evidence of equitable access."
                  ],
                  "bullets": []
                },
                {
                  "icon": [
                    {
                      "tag": "path",
                      "d": "M12 4v5M12 15v5M4 12h5M15 12h5"
                    },
                    {
                      "tag": "circle",
                      "cx": "12",
                      "cy": "12",
                      "r": "2.6"
                    }
                  ],
                  "flag": "",
                  "marker": "",
                  "tag": "",
                  "tone": "",
                  "title": "Staff engagement tracking",
                  "paras": [
                    "Which individuals are using the system, how often, and whether engagement changes after policy updates or training events."
                  ],
                  "bullets": []
                },
                {
                  "icon": [
                    {
                      "tag": "path",
                      "d": "M12 4v5M12 15v5M4 12h5M15 12h5"
                    },
                    {
                      "tag": "circle",
                      "cx": "12",
                      "cy": "12",
                      "r": "2.6"
                    }
                  ],
                  "flag": "",
                  "marker": "",
                  "tag": "",
                  "tone": "",
                  "title": "Query history and audit log",
                  "paras": [
                    "Every query is stored: who asked, what they asked, which policy was cited, the full response, and the timestamp. Searchable and exportable."
                  ],
                  "bullets": []
                },
                {
                  "icon": [
                    {
                      "tag": "path",
                      "d": "M12 4v5M12 15v5M4 12h5M15 12h5"
                    },
                    {
                      "tag": "circle",
                      "cx": "12",
                      "cy": "12",
                      "r": "2.6"
                    }
                  ],
                  "flag": "",
                  "marker": "",
                  "tag": "",
                  "tone": "",
                  "title": "CQC Readiness Report",
                  "paras": [
                    "A structured PDF covering policy access frequency, multilingual activity, staff engagement, gap identification and resolution, and version history. Ready for inspection."
                  ],
                  "bullets": []
                },
                {
                  "icon": [
                    {
                      "tag": "path",
                      "d": "M12 4v5M12 15v5M4 12h5M15 12h5"
                    },
                    {
                      "tag": "circle",
                      "cx": "12",
                      "cy": "12",
                      "r": "2.6"
                    }
                  ],
                  "flag": "",
                  "marker": "",
                  "tag": "",
                  "tone": "",
                  "title": "Policy version history",
                  "paras": [
                    "Every version of every uploaded policy is retained. You can see which version was in use when any query was answered, which is important for post-incident review."
                  ],
                  "bullets": []
                }
              ],
              "bullets": [],
              "header": "",
              "footer": ""
            }
          ],
          "actions": []
        },
        {
          "kind": "prose",
          "id": "security",
          "tint": false,
          "label": "Data & Security",
          "heading": "Your data stays yours.",
          "intro": [
            "Every tenant’s policy library is stored in a completely isolated environment. Your policies are never used to train any model, never shared with other organisations, and never accessible to anyone outside your account. Data is encrypted at rest and in transit. UK data residency is available on Professional and Enterprise plans."
          ],
          "image": null,
          "split": false,
          "flip": false,
          "narrow": false,
          "parts": [],
          "actions": []
        },
        {
          "kind": "end",
          "id": "",
          "tint": false,
          "label": "",
          "heading": "See it working with your own policies.",
          "intro": [
            "Book a 30 minute demo and we will show you CareStreamAI responding to real queries from your documents."
          ],
          "image": null,
          "flip": false,
          "narrow": false,
          "parts": [],
          "actions": [
            {
              "label": "Book a free demo",
              "href": "/demo",
              "style": "solid",
              "play": false
            },
            {
              "label": "Start free trial",
              "href": "/register",
              "style": "ghost",
              "play": false
            }
          ]
        }
      ]
    },
    "sort": 7
  }
]
