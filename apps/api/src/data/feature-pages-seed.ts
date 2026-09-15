// The 9 feature pages that have no feature_pages row: the 8 cluster pages, which the content
// theme assembles from their child capabilities, and web-chat-interface, which was hand-built.
//
// Extracted from the approved content theme by
// carestream-theme-preview/extract_features_missing.py — 389 of 389 strings checked back
// against the theme page they came from, so none of this is rewritten.
//
// The other 44 feature pages are NOT here and must not be: their copy is already in the
// database and matches the theme (97.8% of paragraphs, measured), so the rebuilt template
// renders them unchanged. Seeding them would replace live copy with a second copy of itself.
//
// `capabilities` is the ordered list of child slugs the cluster page is assembled from; the
// template reads it to build the section nav and pull each child's content. A cluster page's
// own whatItIs/outcomes/howItWorks are deliberately empty, because those sections belong to
// the children.

export interface FeaturePageSeed {
  slug: string
  title: string
  meta_title: string
  meta_description: string
  content: {
    eyebrow: string
    intro: string
    chips: string[]
    capabilities: string[]
    cta: { heading: string; sub: string }
  }
  faqs: { question: string; answer: string }[]
  sort: number
}

export const FEATURE_PAGE_SEEDS: FeaturePageSeed[] = [
  {
    "slug": "analytics-and-cqc-readiness",
    "title": "A live position on readiness, not a report you assemble",
    "meta_title": "A live position on readiness, not a report you assemble | CareStreamAI",
    "meta_description": "Most services find out where they stand by building a spreadsheet the week before an inspection. These give you the position continuously, at whatever depth your plan includes.",
    "content": {
      "eyebrow": "Know where you stand",
      "intro": "Most services find out where they stand by building a spreadsheet the week before an inspection. These give you the position continuously, at whatever depth your plan includes.",
      "chips": [],
      "capabilities": [
        "basic-analytics",
        "advanced-analytics",
        "cqc-readiness-report"
      ],
      "cta": {
        "heading": "See it on your own policies.",
        "sub": "Upload what you already have and see what CareStream finds, inside a fortnight."
      }
    },
    "faqs": [
      {
        "question": "What is included in basic analytics?",
        "answer": "Basic analytics gives you the core numbers a single home needs to know how it is doing: your training completion figures across mandatory and annual training, and a headline read on your compliance position. It is deliberately focused on the essentials so a registered manager can take it in at a glance. It does not include the deeper trend analysis, breakdowns by team, role or site, and drill-down that come with advanced analytics. Think of it as the reliable baseline every service gets, with the richer reporting available as a step up when you need it."
      },
      {
        "question": "Is basic analytics available on all plans?",
        "answer": "Yes. Basic analytics is included as standard on every CareStream plan, because we think no care service should be left without a clear view of its own compliance and training. Whatever plan you are on, the essential at-a-glance numbers are there. This makes it the natural starting point. When your service or group needs more depth, such as trends over time or comparisons across teams and sites, advanced analytics extends the same foundation without you having to move to a different system."
      },
      {
        "question": "How is basic analytics different from advanced analytics?",
        "answer": "Basic analytics answers how are we doing right now with core compliance and training completion numbers, presented simply for a single home. It is the entry-level layer and is included on every plan. Advanced analytics goes deeper. It adds trends over time, breakdowns by team, role and site, and richer compliance insight with drill-down, aimed at services and groups that need more than the headline figures. Many providers start on basic and move up as their reporting needs grow."
      },
      {
        "question": "Do I need to set anything up to use basic analytics?",
        "answer": "No. Basic analytics reads directly from the training and compliance activity already happening in CareStream, so there is nothing to configure. From the moment your service is running, the essential numbers are there to view. The view also stays current on its own. As staff complete training and records update, the snapshot refreshes, so what you see always reflects where your home stands today rather than a report you had to build or schedule."
      },
      {
        "question": "How is advanced analytics different from basic analytics?",
        "answer": "Basic analytics gives a single home an at-a-glance read on its core compliance and training completion numbers, and is included on every plan. It answers how are we doing right now, simply and clearly. Advanced analytics goes deeper. It adds trends over time so you can see direction, breakdowns by team, role and site so you can see where gaps sit, and drill-down so you can understand what is behind any figure. It is aimed at larger services and groups that need richer compliance insight rather than a single snapshot."
      },
      {
        "question": "Can I compare performance across different homes in my group?",
        "answer": "Yes. Advanced analytics breaks your compliance and training figures down by site, so a group operator or nominated individual can see how each home is performing rather than only a combined total. That makes it easy to see which locations are strong and which need support. Combined with trends over time, this lets you tell whether a home is improving or slipping and act accordingly, directing training effort and oversight to where the data shows it will do the most good across your portfolio."
      },
      {
        "question": "What does drill-down actually let me do?",
        "answer": "Drill-down means you are never stuck with just the headline number. When a figure looks off, whether it is training completion for a team or a compliance measure for a site, you can open it up to see the underlying records and understand what is driving it. This is what separates advanced analytics from a simple dashboard. Instead of noticing a problem and then hunting for the cause elsewhere, you follow the number straight to the detail, which makes it far quicker to target the right fix."
      },
      {
        "question": "Does advanced analytics help with well-led evidence for CQC?",
        "answer": "It does. CQC's well-led expectations are about understanding your service, monitoring quality and acting on what you find. Advanced analytics gives you exactly that: trends that show whether performance is improving, breakdowns that show where attention is needed, and the drill-down to prove you understand the detail. Being able to demonstrate that you track compliance and training over time, spot gaps early and direct support based on the evidence is powerful support for a well-led judgement, and shows inspectors your oversight goes beyond a single snapshot."
      },
      {
        "question": "What does the readiness report actually pull together?",
        "answer": "It brings your policies, training and supporting evidence into a single view, rather than leaving you to assess each of those areas separately. So instead of checking one system for training records, another for policies and a folder for evidence, you see a consolidated picture of your readiness in one place. This matters because inspection readiness is a whole-service question, not a set of isolated checks. By combining the strands, the report reflects how prepared you genuinely are across the areas a CQC inspection looks at, which is far more useful than any single view on its own."
      },
      {
        "question": "How does it help me find gaps before inspection?",
        "answer": "The report surfaces items that are missing, incomplete or overdue, so gaps are highlighted for you rather than left to be discovered. That means you learn where you are exposed while there is still time to act, instead of finding out when an inspector points it out. Seeing the gaps clearly also lets you prioritise. Rather than working through everything blind, you can direct your effort to the areas that need attention most, which makes your preparation both faster and more effective."
      },
      {
        "question": "Do I have to gather the information myself?",
        "answer": "No. Because your policies, training and evidence already live on CareStream, the report draws on that data directly and brings it together for you. There is no manual gathering, no chasing records across systems and no assembling a picture by hand. This is a large part of the value. The readiness report saves the very work that usually makes preparing for inspection so stressful, and because it uses live data it reflects your current position rather than a snapshot you had to compile."
      },
      {
        "question": "Does the report update as we improve?",
        "answer": "Yes. As you close gaps, complete training and update your records, your readiness picture reflects that progress. So the report is not a one-off assessment but an ongoing view of where you stand, which stays useful throughout your preparation. That ongoing quality is important for services that want to be ready at any time. Rather than preparing intensively only when an inspection looms, you can watch your readiness improve as you work, and maintain a strong position continuously."
      }
    ],
    "sort": 101
  },
  {
    "slug": "audits",
    "title": "Audits you design, joined up to the training that follows",
    "meta_title": "Audits you design, joined up to the training that follows | CareStreamAI",
    "meta_description": "An audit that ends in a report has not changed anything. These build your own audits and then close the loop, so a finding turns into the training that addresses it and you can see whether it worked.",
    "content": {
      "eyebrow": "Check the practice, not just the paperwork",
      "intro": "An audit that ends in a report has not changed anything. These build your own audits and then close the loop, so a finding turns into the training that addresses it and you can see whether it worked.",
      "chips": [],
      "capabilities": [
        "build-your-own-audits",
        "audits-linked-to-training"
      ],
      "cta": {
        "heading": "See it on your own policies.",
        "sub": "Upload what you already have and see what CareStream finds, inside a fortnight."
      }
    },
    "faqs": [
      {
        "question": "Can I really build an audit with my own questions?",
        "answer": "Yes. Alongside the built-in templates, CareStream lets you create custom audits from scratch, writing your own questions in your own words and setting the structure that suits what you want to check. You are not limited to standard forms, so a local requirement or a bespoke concern can be captured in an audit that fits it exactly. Once built, your custom audit behaves just like a standard one. You run it, record the results and track it over time within the same audit system, so a bespoke check gets all the same benefits and visibility as the templates that come as standard."
      },
      {
        "question": "How is a custom audit different from the built-in templates?",
        "answer": "The built-in templates cover the common audits that most services need, giving you a fast start on the shared ground. Custom audits are for the checks that are specific to your service, where no standard template quite fits, such as a local requirement or a concern that came out of a particular incident. The important part is that both live in the same place. Your custom audits are not a separate, second-class tool, they run and are tracked exactly like the standard ones, so your whole audit programme stays in one system rather than splitting between the platform and stray spreadsheets."
      },
      {
        "question": "Can I reuse a custom audit or is it a one-off?",
        "answer": "Custom audits are reusable, so a concern that started as a one-off can become an audit you run regularly. Once you have built it, you can run it again whenever you need to, and follow its results across runs the same way you would track any built-in audit. This is particularly useful for turning lessons into practice. When an incident or a local issue reveals something worth monitoring, you can build an audit for it once and then keep checking against it over time, adjusting the questions as your requirements change, so the learning actually sticks."
      },
      {
        "question": "Does having my own audits help at inspection?",
        "answer": "It does, because good governance is specific to a service and inspectors want to see that you monitor the things that matter for your particular setting, not just the generic checklist. Being able to build and run bespoke audits shows that you understand your own risks and have put deliberate checks in place for them. Just as importantly, because custom audits run and are tracked in the same system as the standard ones, you can present a complete governance picture rather than a partial one. Nothing important is hidden in a spreadsheet outside the platform, so your whole quality programme, standard and bespoke, is visible and evidenced in one place."
      },
      {
        "question": "How does linking audits to training actually work?",
        "answer": "When you run an audit and it reveals a weakness, for example an infection prevention and control audit scoring low, you can connect that finding to the training that addresses the underlying gap in competence. Because both the audit and the training live in CareStream, that connection is a real, actionable link rather than a note in the minutes that someone has to remember to follow up. From there you can direct the right people to the relevant training, and re-audit later to see whether the score has moved. This turns the audit from something that simply documents a problem into the first step of actually solving it."
      },
      {
        "question": "Can you give an example of the loop in practice?",
        "answer": "Take an infection control audit that comes back with a low score in a particular area of practice. On its own, that score tells you there is a weakness but does nothing to address it. By linking the finding to infection control training, you turn the low score into a prompt to build the competence that was missing. The loop closes when you re-run the audit and see whether the score has improved. That gives you a complete story: you found the issue, you responded with training, and you can show the result. It is exactly the kind of continuous improvement cycle CQC wants to see evidenced."
      },
      {
        "question": "Why is this better than just recording audit results?",
        "answer": "Recording audit results tells you where the problems are, but it does nothing to fix them, and a low score that sits in a folder tends to reappear at the next audit because the competence beneath it never changed. The value is in what happens after the finding, which is where most audit programmes lose momentum. By connecting findings to training, CareStream deliberately closes the gap between spotting an issue and fixing it. Instead of a growing list of scores, you build a record of problems noticed and acted upon, which is far more useful for both quality and inspection."
      },
      {
        "question": "How does this support CQC inspection readiness?",
        "answer": "CQC's model is built around continuous improvement, so inspectors are less interested in a perfect set of scores than in whether you notice problems, act on them, and can show the action worked. Linking audits to training gives you exactly that chain of evidence, from a low score to the training that addressed it to a re-audit that confirms the improvement. This lets you tell a confident, evidenced story about how your service learns and improves. Rather than presenting audits as isolated checks, you can demonstrate a genuine loop where findings drive competence, which speaks directly to well-led and to the quality statements around learning and improvement."
      }
    ],
    "sort": 102
  },
  {
    "slug": "cqc-wording-alignment",
    "title": "Policies an inspector recognises, still written in your voice",
    "meta_title": "Policies an inspector recognises, still written in your voice | CareStreamAI",
    "meta_description": "Good practice described in your own words is harder to credit than the same practice described in the language of the assessment framework. Alignment closes that gap without touching what you actually do, and without making your policies read as though they were written for an inspector.",
    "content": {
      "eyebrow": "Say it the way it will be assessed",
      "intro": "Good practice described in your own words is harder to credit than the same practice described in the language of the assessment framework. Alignment closes that gap without touching what you actually do, and without making your policies read as though they were written for an inspector.",
      "chips": [],
      "capabilities": [
        "wording-alignment-to-the-cqc-quality-statements",
        "person-centred-rewording-suggestions-in-your-policy-voice",
        "suggestions-numbered-and-highlighted-in-the-policy"
      ],
      "cta": {
        "heading": "See it on your own policies.",
        "sub": "Upload what you already have and see what CareStream finds, inside a fortnight."
      }
    },
    "faqs": [
      {
        "question": "What are the CQC quality statements and why should my policies align to them?",
        "answer": "The quality statements are the \"we statements\" at the heart of CQC's single assessment framework. They describe what good care looks like from the perspective of the people using your service, and they are the language inspectors now assess you against. If your policies are written in the vocabulary of the old standards, they sit at a distance from that framework. Aligning your policy wording to the quality statements closes that distance. It means your documents speak the same language inspectors are working in, so the connection between what your policies say and what you are judged on is direct. That makes your evidence far easier to map and your inspection case clearer to make."
      },
      {
        "question": "Does aligning to the quality statements change what my policies actually require?",
        "answer": "The focus is on aligning the language, not overturning the substance of your procedures. A policy can be perfectly sound in what it requires yet still be phrased in a way that no longer lines up with the quality statements you are assessed against. CareStream addresses that gap in wording so your documents speak the framework's language. Where your practice is already good, this alignment simply makes it easier to evidence by expressing it in the vocabulary of the we statements. You are not rebuilding your policies, you are ensuring the way they are worded maps cleanly to how CQC now assesses, so your existing strengths show through under the framework."
      },
      {
        "question": "How does this help my evidence at inspection?",
        "answer": "Inspection under the single assessment framework is largely an exercise in mapping your evidence to the quality statements. When your policies are written in a different language from the framework, that mapping takes constant translation, and anything that needs translating is easier to lose or misread. By aligning your wording to the quality statements, CareStream makes the mapping clean and direct. Your policy content already speaks in terms of the we statements, so your evidence lines up with each quality statement naturally. You spend less time explaining how your documents relate to the framework and more time letting them do that job for you."
      },
      {
        "question": "My policies were written for the old standards. Can they still be aligned?",
        "answer": "Yes, and that is one of the main reasons this feature exists. Many providers hold sound, well-established policies that were written before the single assessment framework and simply have not been re-expressed in the language of the quality statements. That does not make them wrong, but it does leave a mismatch with how you are now assessed. CareStream reads your existing wording, relates it to the relevant quality statements, and suggests alignment that brings your documents up to current expectations. So you keep the substance you have built up over the years while ensuring the wording speaks the language inspectors assess against today."
      },
      {
        "question": "Will this rewrite my whole policy or just improve the wording?",
        "answer": "It improves the wording rather than rewriting the document. CareStream deliberately avoids replacing your policy with a generic version, because that strips out the voice that makes it belong to your service. Instead, it suggests targeted rewording that lifts how people and procedures are described. You keep your policy's structure, meaning and house style. The suggestions focus on tone, making the language warmer and more person-centred, while leaving the document unmistakably yours. It is refinement, not a rewrite, so your policies improve without losing their character."
      },
      {
        "question": "How does it keep my policy's own voice?",
        "answer": "Before suggesting anything, CareStream takes account of how your policy already speaks, including its tone, its terminology and the house style running through your documents. The rewording it proposes is shaped to match that voice rather than an external template. That is a deliberate design choice. Staff notice when a policy suddenly reads as if it came from somewhere else, and they are less likely to trust or follow it. By working within your existing voice, CareStream makes the improved wording feel like a natural evolution of your own document, so the changes are accepted rather than resisted."
      },
      {
        "question": "Why does person-centred wording in policies matter for inspection?",
        "answer": "Inspectors look for person-centred care to be reflected in your documents, not just described by your staff. When policies talk about people as cases or tasks, or set out procedures in cold, institutional language, the tone works against the person-centred practice you are trying to evidence, even when the underlying care is excellent. By improving how residents and the people you support are described and how procedures read, CareStream helps your policies reflect the values behind your care. The person-centred approach shows through on the page in your own voice, which is exactly the alignment between documents and practice that supports inspection readiness."
      },
      {
        "question": "Do I have to accept every rewording suggestion?",
        "answer": "No. Every rewording is presented as a suggestion, not a change made on your behalf. You review each one and decide whether to accept it as written, adjust it to suit your service, or leave the original wording exactly as it is. This keeps you in full control of your policy's tone. CareStream brings the person-centred phrasing and the sensitivity to your house style, and you make the final call on what actually goes into the document. The result is language you are genuinely comfortable standing behind, in your own voice."
      },
      {
        "question": "Do I get the suggestions as a separate list or inside the policy itself?",
        "answer": "Inside the policy itself. A separate list forces you to constantly match each recommendation against the document to work out where it applies, which is slow and easy to get wrong on a long policy. CareStream avoids that by placing suggestions where they belong. Each suggested change is highlighted inline, at the exact point in the policy it relates to, and given a number. So when you open the document you see your policy and its recommendations together, with every suggestion marked in place rather than sitting in a detached list you have to cross-reference."
      },
      {
        "question": "Why are the suggestions numbered?",
        "answer": "Numbering gives each suggestion a clear, stable reference so it can be tracked and discussed without confusion. When you are working through several changes in a policy, being able to say \"suggestion three\" and know exactly which one that is keeps the review orderly and makes it easy to check that nothing has been missed. It also helps when more than one person is involved. A colleague reviewing your work can follow precisely which suggestions you acted on and which you left, because each one has a number and a highlighted place in the document. That shared reference point makes collaborative policy review much smoother."
      },
      {
        "question": "Will this make reviewing my policies quicker?",
        "answer": "Yes, noticeably. The slowest part of reviewing suggested changes is usually not deciding on them but finding where each one goes. Flicking between a list and the document, then hunting for the right paragraph, eats up time and attention on every single suggestion. By highlighting each numbered suggestion inline, CareStream removes that step entirely. You read the policy and see the recommendation exactly where it applies, so your effort goes into the decision rather than the search. For a busy registered manager, that turns policy review from an afternoon's chore into a focused, fast pass through the document."
      },
      {
        "question": "Could I apply a change to the wrong part of the policy?",
        "answer": "That risk drops sharply with inline highlighting. When suggestions live in a separate list, it is genuinely easy to apply a change to the wrong paragraph, or to a similar-looking section elsewhere in the document, because you are matching by memory rather than by position. Because CareStream anchors each numbered suggestion to the exact point it applies to and highlights it there, you can see precisely which line is affected. You are acting on a marked spot rather than reconstructing a location from a description, which makes misplaced or duplicated changes far less likely."
      }
    ],
    "sort": 103
  },
  {
    "slug": "policy-approvals",
    "title": "Change a policy, approve it properly, prove it happened",
    "meta_title": "Change a policy, approve it properly, prove it happened | CareStreamAI",
    "meta_description": "A policy change is only finished when the right people have agreed it and the staff it applies to have read the version that resulted. This is the whole route: adopting a change, merging in the names of the people who hold the roles, getting it approved by whoever needs to approve it, and republishi",
    "content": {
      "eyebrow": "From draft to published",
      "intro": "A policy change is only finished when the right people have agreed it and the staff it applies to have read the version that resulted. This is the whole route: adopting a change, merging in the names of the people who hold the roles, getting it approved by whoever needs to approve it, and republishing to the team with the trail intact.",
      "chips": [],
      "capabilities": [
        "adopt-a-gap-fix-into-your-policy-tracked-changes",
        "adopt-into-your-policy-through-review-and-approval",
        "role-holder-names-merged-into-policies",
        "document-versioning",
        "admin-approval-with-full-version-history",
        "care-manager-approval-step-optional",
        "care-manager-policies-hub-approve-see-what-changed",
        "external-approval-by-one-off-link-consultant-trustee",
        "approval-trail-auto-re-publish-to-staff-qanda",
        "download-a-print-ready-policy-letterhead-sign-off"
      ],
      "cta": {
        "heading": "See it on your own policies.",
        "sub": "Upload what you already have and see what CareStream finds, inside a fortnight."
      }
    },
    "faqs": [
      {
        "question": "What does adopting a gap fix as tracked changes actually mean?",
        "answer": "When CareStream suggests a fix to close a gap in one of your policies and you accept it, the platform does not rewrite the document behind your back. It applies the suggested wording as tracked changes, highlighting every insertion and alteration against your existing text. This works exactly like the tracked changes you know from editing a document. You can see the before and after in context, understand precisely what the fix does, and confirm it only when you are satisfied. The change becomes part of the live policy only after that point."
      },
      {
        "question": "Will a fix ever change my policy without me seeing it?",
        "answer": "No. That is the whole purpose of showing accepted fixes as tracked changes rather than silent edits. Nothing is merged into the live version of a policy until you have reviewed the marked-up change and confirmed it. This keeps policy owners firmly in control of policies and procedures in health and social care. Because a change to something like a safeguarding or medication policy carries real weight, CareStream makes sure you understand every inserted or altered word before it takes effect."
      },
      {
        "question": "Can I adjust the wording of a suggested fix?",
        "answer": "Yes. Seeing a fix as tracked changes means you can treat it as a starting point rather than a fixed instruction. If the suggested wording is close but not quite right for your service, you can refine it so it fits your home precisely before it becomes live. This matters because every service has its own context, and a good policy reflects how your care is genuinely delivered. Tracked changes give you the room to shape the improvement, keeping the speed of an AI suggestion while preserving your authorship of the final text."
      },
      {
        "question": "How is this different from the review and approval step?",
        "answer": "Tracked changes are about visibility of the change itself: what an accepted gap fix inserts or alters, shown clearly in context within the policy. It answers the question of what is changing. The review and approval step is about who signs the change off before it goes live. The two work together, so you first see exactly what the tracked change does, and then it moves through the controlled adoption path where a responsible person approves it as the current, live policy."
      },
      {
        "question": "Does a suggested change ever go live on its own?",
        "answer": "No. This is the core of the controlled adoption path. A suggested change is held as pending and cannot affect the live policy until a responsible person has reviewed it and approved it. That deliberate stop is what keeps your policies and procedures in health and social care trustworthy. Because nothing reaches your staff without sign-off, you can always be sure that the version they are working to has passed through a proper checkpoint."
      },
      {
        "question": "Who is the responsible person who approves a change?",
        "answer": "The responsible person is whoever your service has designated to sign off policy changes, typically a registered manager, nominated individual or quality lead. They examine the proposed change, understand its impact and decide whether it should be adopted. By attaching a named, accountable person to every approval, CareStream ensures each change carries a clear moment of ownership. This is exactly the kind of governance inspectors expect to see behind your care home policies and nursing home policies."
      },
      {
        "question": "How does this relate to tracked changes?",
        "answer": "The two features work hand in hand but answer different questions. Tracked changes show you what is changing, highlighting every insertion or alteration in context so the reviewer understands the proposed update clearly. Review and approval then govern whether that change goes live and who signs it off. So a reviewer first sees the marked-up change, and then the controlled adoption path requires a responsible person to approve it before it becomes the current policy."
      },
      {
        "question": "Why does controlled adoption matter for CQC?",
        "answer": "Inspectors look not just at what your policies say but at how they are governed. A change that appeared without oversight suggests weak control, whereas a change that was reviewed and signed off demonstrates that your service manages its policies and procedures deliberately. By making review and approval the required route for every update, CareStream gives you a clear, defensible story: no policy change reached your staff without a responsible person reviewing and approving it first. That is strong evidence of sound governance and inspection readiness."
      },
      {
        "question": "Which roles can be merged into my policies?",
        "answer": "The feature is built around the responsible roles that care policies actually reference, such as the registered manager, nominated individual and named leads like the infection prevention lead, alongside the other role holders your documents depend on. Wherever a policy points to a person by their role, that is where a real name can be merged in. The aim is to make sure every duty that names a role also shows the real person who holds it. That turns a document full of generic labels into one where accountability is visible and specific, which is exactly what an inspector is looking for when they ask who is responsible for something."
      },
      {
        "question": "What happens when a role holder leaves or changes?",
        "answer": "Because names are linked to the role rather than typed into each document, you update the role holder once and every affected policy reflects the new person automatically. There is no need to open dozens of files and find and replace an old name, and no risk of one being missed in a document you forgot about. This is the part that saves the most work and prevents the most embarrassment. Staff changes are frequent in care, and manually keeping names correct across a whole library is exactly the sort of task that slips. Tying the name to the role means your documents simply stay current as your team changes."
      },
      {
        "question": "How is this different from filling in placeholders manually?",
        "answer": "Filling placeholders by hand fixes a document once, at that moment. The instant a role holder changes, the name you typed is wrong again, and you are back to editing files one by one. It also does nothing to stop the same blank reappearing in a new policy you add later. Merging role-holder names is a living link between your people and your documents. The names are always the current ones because they flow from the role, so the policies stay right as your team evolves. It replaces a repeated manual chore with something that maintains itself, which is why the names actually stay accurate over time rather than drifting out of date."
      },
      {
        "question": "Does this help with inspection specifically?",
        "answer": "Yes, in a direct and practical way. Inspectors routinely want to know who is responsible for a given area, and a policy that names a real, current person answers that immediately. A policy that leaves the responsible person blank, or still shows a generic label, invites the opposite impression: that the document was never truly adopted. By ensuring your registered manager, nominated individual and named leads appear by name where they are accountable, the feature turns your policies into clear evidence of ownership. It is a small detail that quietly reinforces the message that your service knows who does what and keeps its documents alive."
      },
      {
        "question": "Do I have to remember to save each version myself?",
        "answer": "No. Versioning is fully automatic. Every time a policy is edited or an approved change is made, CareStream captures that as a new version and keeps the previous one intact, so there is nothing for you to save, rename or file manually. This is a deliberate move away from the fragile habit of renaming files on a shared drive. Because the platform handles it every time, your version history is always complete, and you never have to worry that a change slipped through without a record."
      },
      {
        "question": "Can I see what actually changed between two versions?",
        "answer": "Yes. You can open any two versions of a policy and compare them, so you can see exactly what was added, removed or reworded rather than just knowing that something changed. This makes it easy to review the impact of an update or to explain a change to a colleague or inspector. Each version also carries the date it was created and the person who made the change, so alongside seeing what moved, you can see who was responsible and when. Together that gives you the full picture behind any policy revision."
      },
      {
        "question": "What happens if a change needs to be reversed?",
        "answer": "Because previous versions are preserved rather than overwritten, you can restore an earlier version and make it the live policy again whenever a change needs to be rolled back. Nothing is ever truly lost, so a mistaken or premature edit is easy to undo. The restore is itself captured in the history, so the record stays honest. You can see that a previous version was brought back, when and by whom, which keeps your policy trail transparent even when you have had to reverse a decision."
      },
      {
        "question": "How does versioning help at a CQC inspection?",
        "answer": "Inspectors often want to understand not just what a policy says now but how it has evolved, when it was last reviewed and who signed changes off. Automatic versioning gives you a clear, dated history for every policy, so you can answer those questions immediately instead of searching through drives or emails. This strengthens your governance evidence considerably. Being able to show a continuous, attributed history behind your policies and procedures in health and social care demonstrates that your document control is deliberate and well managed, which is exactly the kind of assurance inspection looks for."
      },
      {
        "question": "What exactly does the version history record?",
        "answer": "For every change to a policy, CareStream stores a distinct version along with the approval attached to it, so you can see who approved that version and precisely when. Every previous version is retained too, giving each policy a complete and unbroken lineage. This turns your care home policies and nursing home policies into traceable records rather than single current files. Whether you need to answer an inspector, investigate a complaint or simply understand how a policy evolved, the full history is there to show exactly what happened and when."
      },
      {
        "question": "Can I roll back to a previous version?",
        "answer": "Yes. Because the full version history is retained and nothing is overwritten, you can restore an earlier approved version if a change needs undoing. You do not have to reconstruct the old wording by hand or hunt for a copy, because it is already stored. This is a real safeguard for governance. If a change turns out to have been a mistake or no longer fits your service, rolling back is fast and clean, and the rollback itself becomes part of the traceable history of the policy."
      },
      {
        "question": "Does every single change need admin approval?",
        "answer": "Yes. Admin approval is the point at which a change takes effect, so every version that goes live has been signed off by an administrator. That approval, including who gave it and when, is recorded against the version. This matters because governance depends on accountability. By requiring admin sign-off for each change, CareStream ensures there is always a named person and a moment behind every version of your policies and procedures in health and social care, which is exactly what strong control looks like."
      },
      {
        "question": "How does this help at a CQC inspection?",
        "answer": "Inspectors want to see that your policies are controlled, not just present. Being able to show who approved each version and when, and to produce any earlier wording on request, is powerful evidence that your service governs its policies deliberately and carefully. A full version history also lets you demonstrate exactly what changed and why over time. Rather than presenting a single current document with no memory, you present a traceable lineage, which strengthens your inspection readiness and your wider approach to quality care."
      },
      {
        "question": "Is the care manager approval step required?",
        "answer": "No, it is entirely optional. You decide whether your service requires a care manager to sign off a policy change before it is adopted. Services that want that extra layer can enable it, and those that prefer a simpler route can leave it off. This flexibility exists because governance should fit the service. A larger provider may want a care manager to review changes as an added safeguard, while a smaller team may find a single approval sufficient, and CareStream supports both without forcing one model on everyone."
      },
      {
        "question": "Why would a service turn this step on?",
        "answer": "Turning it on adds a second pair of eyes to the adoption of any policy change. For services that manage many policies, operate across multiple sites, or simply want extra assurance on sensitive documents, that additional review can be valuable. With the step enabled, a care manager reviews and approves each change before it can move forward, which strengthens oversight without abandoning the controlled adoption path. It is a way to build more governance into the process precisely where a service feels it is warranted."
      },
      {
        "question": "Can smaller teams leave it off?",
        "answer": "Yes, and many will. A small team often has a single responsible person who is entirely sufficient to approve policy changes, and adding a second required step would only introduce delay without adding real control. By leaving the care manager approval step off, those teams keep a leaner route where changes follow the standard approval path. The controlled adoption path still applies, so nothing goes live without sign-off, but the process stays proportionate to the size and structure of the service."
      },
      {
        "question": "Can I change the setting later?",
        "answer": "Yes. The care manager approval step is a setting you can adjust as your service evolves. A home that starts small and later becomes part of a group, or one that decides it wants more oversight on its policies, can enable the step when the time is right. Changing the setting does not disrupt your existing policies or their version history. It simply adjusts the adoption path that future changes follow, so your governance can grow and adapt alongside your service."
      },
      {
        "question": "What is the care manager policies hub?",
        "answer": "It is a dedicated view built for care managers to review pending policy changes, see exactly what changed in each one, and approve them, all in one place. Instead of tracking changes across separate documents or messages, everything awaiting a decision is gathered together. The hub exists to make responsible approval straightforward. Because you can clearly see what a change alters before you sign it off, approving your care home policies and nursing home policies becomes a confident decision rather than a chore, and nothing waiting for approval slips through the cracks."
      },
      {
        "question": "How do I see what changed in a policy?",
        "answer": "When you open a pending change in the hub, a clear view shows you exactly what was altered in that policy. You are not left to compare documents yourself or guess at the difference, because the change is presented plainly for you to review. This is central to the hub's purpose. Approval only carries weight if the person giving it understands the change, so the see what changed view ensures every care manager can sign off knowing precisely what they are approving before it becomes the live policy."
      },
      {
        "question": "Do I have to leave the hub to approve a change?",
        "answer": "No. The hub is designed so that review and approval happen together in the same place. You see what is pending, open a change to see what was altered, and approve it directly, all without switching between tools or documents. This matters for a busy care manager. Keeping everything in one smooth flow means you can work through pending changes quickly and confidently, moving from one to the next without losing your place or your understanding of what each one involves."
      },
      {
        "question": "How does the hub support inspection readiness?",
        "answer": "The hub gives you a clear, single place where policy changes are reviewed and signed off by a care manager, with a clear view of what changed in each one. That is exactly the kind of controlled, evidenced process inspectors look for behind your policies and procedures in health and social care. Because every approval follows a review of what actually changed, you can show that sign-off was meaningful rather than a formality. Combined with the wider approval trail and version history, the hub helps you demonstrate that your service governs its policies deliberately and carefully."
      },
      {
        "question": "Does the external reviewer need a CareStream account?",
        "answer": "No. The whole point of this feature is that trustees, directors and external consultants can review and sign off a policy without ever creating a login. You send them a one-off secure link, they open it, read the policy and record their decision, and that is the entire process for them. This removes the friction that usually delays external sign-off. There is no password to set, no onboarding to complete and nothing for you to administer on their behalf, so occasional reviewers can act quickly whenever a policy needs their approval."
      },
      {
        "question": "Can the reviewer see the rest of our platform or other policies?",
        "answer": "No. The secure link opens only the exact policy and version you chose to send. The reviewer cannot browse your other policies, your staff records, your training data or anything else inside CareStream, because the link is scoped to that single document. This keeps your data protected while still giving the reviewer everything they need to make an informed decision. They see the full policy in context, sign it off or return feedback, and never gain access to anything beyond it."
      },
      {
        "question": "Is the external approval recorded for inspection?",
        "answer": "Yes. When an external reviewer signs off through the link, their approval is written into the same audit trail as your internal approval steps, with their name and the date. So the record shows clearly who reviewed the policy, which version they saw and when they approved it. This means external oversight carries the same evidential weight as internal sign-off. At inspection you can demonstrate that policies requiring board, trustee or consultant approval genuinely received it, with a clean, dated trail behind every one."
      },
      {
        "question": "What stops the link being reused or forwarded?",
        "answer": "Each link is single use and tied to one specific policy version. Once the reviewer has acted on it, the link expires, so it cannot be reopened, and because it is bound to a particular version it will never surface a different or later document. If you need the same person to review a revised version later, you simply send a fresh link for that version. This keeps every approval unambiguous, because there is never any doubt about which version of a policy a reviewer actually signed off."
      },
      {
        "question": "What happens the moment a policy change is approved?",
        "answer": "Two things happen automatically and together. The approval is written into an audit trail, capturing that the change was signed off so you can evidence it later, and the updated policy is re-published to the staff Q&A assistant. Because both steps are automatic, there is no lag between sign-off and distribution. The assistant immediately begins answering staff questions from the latest approved version, so your records and your frontline practice stay perfectly in step."
      },
      {
        "question": "Do I need to re-distribute a policy to staff after approving it?",
        "answer": "No. That is the whole point of automatic re-publishing. Once a change is approved, the updated policy is pushed to the staff Q&A assistant on its own, without anyone having to remember to circulate it or update a shared copy. This closes a gap that catches many services out, where a policy is approved but staff carry on acting on the old version because no one distributed the new one. With CareStream, approval and distribution are a single event, so the latest approved wording reaches your team straight away."
      },
      {
        "question": "How do staff get the updated answers?",
        "answer": "Staff use the Q&A assistant to ask questions, and once a change is approved the assistant answers from the newest approved version of the policy. The previous wording no longer drives answers, so staff cannot act on a superseded version by mistake. This means your team always receives guidance that reflects your current, approved care home policies and nursing home policies. There is no window in which a policy has been updated on paper but not yet in the answers your staff are relying on day to day."
      },
      {
        "question": "What does the audit trail let me prove?",
        "answer": "The audit trail records that each policy change was approved, so you can show that sign-off genuinely happened and by whom. Combined with the automatic re-publish, it also lets you demonstrate that staff were answering from the latest approved version from that point on. For CQC and your own governance, this is strong evidence. You can produce a clear record that a change was properly approved and that it reached your frontline immediately, which shows an inspector that your policies and procedures in health and social care are both controlled and genuinely embedded in practice."
      },
      {
        "question": "Will the policy come out on our own branding?",
        "answer": "Yes. When you download a policy, it is produced on your own letterhead, so the finished document clearly belongs to your service rather than looking like a generic export. This gives every printed policy a consistent, professional appearance across your whole document set. That consistency matters when policies are seen by inspectors, auditors or new staff. A branded document signals that your policies and procedures in health and social care are properly controlled and current, which reinforces the impression of a well run service."
      },
      {
        "question": "Is there a place to sign the policy off?",
        "answer": "Yes. Every print-ready download includes an authorisation and sign-off block, placed on the document ready to be signed or countersigned. So the physical copy shows clearly that the policy is authorised, without you having to add that section yourself. This is particularly useful for staff files and inspection evidence, where a visible sign-off demonstrates that the policy carries proper authorisation. It turns a plain policy into a controlled document that stands up to scrutiny."
      },
      {
        "question": "Do I have to reformat the document before I can use it?",
        "answer": "No. The download is print-ready, which means headings, spacing and layout are all handled for you. The policy comes out formatted and ready to print, file or share, without the fiddly manual layout work that a raw text export would need. This saves real time whenever a physical or PDF copy is requested. Instead of laying out a document by hand each time, you download a finished version in moments, which keeps your evidence ready and your staff files up to date with far less effort."
      },
      {
        "question": "Can I use these documents for staff files and inspection?",
        "answer": "Yes. The print-ready format is designed exactly for that. Because each policy comes out on your letterhead with a sign-off block and clean formatting, it is suitable for adding to staff files, placing in an inspection folder or handing directly to an auditor. Having finished, branded copies ready means you are never scrambling to produce a presentable document when it is asked for. Your policies are always available in a form that looks professional and demonstrates proper control, which supports your inspection readiness."
      }
    ],
    "sort": 104
  },
  {
    "slug": "policy-gap-detection",
    "title": "See what your policy set does not cover, before an inspector does",
    "meta_title": "See what your policy set does not cover, before an inspector does | CareStreamAI",
    "meta_description": "You can read every policy you hold and still not know which one you never wrote. Gap detection reads the whole library against what a service like yours is expected to hold, and reports what is absent, thin, contradictory or overtaken by a change in the law.",
    "content": {
      "eyebrow": "Find what is missing",
      "intro": "You can read every policy you hold and still not know which one you never wrote. Gap detection reads the whole library against what a service like yours is expected to hold, and reports what is absent, thin, contradictory or overtaken by a change in the law.",
      "chips": [],
      "capabilities": [
        "regulation-coverage-analysis-reads-inside-your-policies",
        "what-to-add-remediation-with-example-wording",
        "where-to-add-target-policy-guidance",
        "legal-basis-source-citation-on-each-recommendation",
        "applicability-by-care-setting-service-profile",
        "out-of-date-content-detection-superseded-law-placeholders",
        "cross-policy-consistency-contradictions-between-policies",
        "regulation-change-tracking-update-alerts",
        "generate-onboarding-from-a-policy-update"
      ],
      "cta": {
        "heading": "See it on your own policies.",
        "sub": "Upload what you already have and see what CareStream finds, inside a fortnight."
      }
    },
    "faqs": [
      {
        "question": "How is this different from a policy checklist that just confirms I have each document?",
        "answer": "A checklist only confirms that a document with a given title exists in your folder. It cannot tell you whether that document actually covers the regulation it is meant to address, which is where most inspection surprises come from. You can own every policy on a list and still have serious content gaps hiding inside them. CareStream's regulation coverage analysis reads the full text inside each policy and maps what it genuinely covers against the CQC regulations for your service. So instead of a green tick beside a title, you get a real, content-level view of where you are covered, where you are thin, and where a topic is missing entirely."
      },
      {
        "question": "Do I need to reformat my policies before the analysis can read them?",
        "answer": "No. You upload your existing care home or nursing home policies exactly as they are, in the format you already keep them. The analysis works on your real wording, so there is no need to restructure documents, apply a template, or split them up first. This matters because the whole point is to assess what your policies actually say today. Forcing your documents into a new shape before reading them would defeat the purpose, so CareStream reads them in their current form and maps that genuine content to the regulations that apply to your setting."
      },
      {
        "question": "Is the coverage mapped to my specific type of service?",
        "answer": "Yes. The regulations and requirements that apply to a nursing home are not identical to those for a domiciliary care agency or a supported living service, so a generic mapping would be misleading. CareStream maps your policy content against the CQC regulations relevant to your particular service type. That means the coverage view you receive reflects what your service is genuinely assessed against, not a broad catch-all list. You can prioritise the gaps that actually matter for your setting rather than chasing requirements that do not apply to you."
      },
      {
        "question": "Will this tell me which policies to prioritise?",
        "answer": "It will. Because the analysis distinguishes full coverage from thin coverage and from outright gaps, you can immediately see which policies carry the most significant shortfalls against the regulations for your service. That lets you tackle the highest-risk gaps first rather than working through your library alphabetically. For a busy registered manager, this turns an overwhelming folder of policies and procedures into a clear, ordered list of what genuinely needs attention. You spend your limited time on the content that affects quality care and inspection readiness, instead of re-reading documents that are already sound."
      },
      {
        "question": "Does CareStream just point out gaps, or does it actually give me the words to fix them?",
        "answer": "It gives you the words. Simply flagging a gap would leave you with the hardest part still to do, which is drafting the missing content in language that reads properly and covers the requirement. That is where most policy improvements stall. For every gap the analysis finds, CareStream tells you specifically what to add and supplies ready-to-use example wording in care-appropriate language. You review the suggested text, adapt it if you want to, and drop it straight into the policy, so the gap is closed rather than just noted."
      },
      {
        "question": "Can I edit the suggested wording, or do I have to use it exactly as written?",
        "answer": "You are always in control. The example wording is a well-crafted starting point, not a mandate. You can accept it as written, adjust a few words to match your service, or replace it entirely if you prefer your own phrasing. The value is that you never begin from a blank page. Even when you choose to adapt a suggestion, you are editing solid, care-appropriate text rather than composing from nothing, which is far faster and gives you a properly worded addition every time."
      },
      {
        "question": "Will the wording actually sound right for a care policy?",
        "answer": "Yes. The suggestions are written in the register that policies and procedures in health and social care actually use, so they sit naturally alongside your existing content rather than reading as a generic paragraph pasted in from elsewhere. The aim is text a registered manager would be comfortable presenting at inspection. Because each suggestion is tied to the specific gap it resolves, it addresses the requirement directly rather than padding the document. The result is wording that both closes the gap and matches the tone your care home or nursing home policies are written in."
      },
      {
        "question": "I don't have a policy-writing background. Will this still work for me?",
        "answer": "This feature is especially useful if policy writing is not your strength. Many capable registered managers understand exactly what a policy is missing but lose hours trying to phrase the fix correctly. CareStream removes that barrier by writing the example wording for you. Your role becomes reviewing and approving rather than authoring, which is a far more comfortable place to be. You bring the knowledge of your service and CareStream brings the words, so your policies and procedures get properly remediated without you needing to be a policy author."
      },
      {
        "question": "Why does it matter which policy a fix goes into, as long as the content exists somewhere?",
        "answer": "Because inspectors and staff do not read your whole library to find a topic; they open the specific policy that should cover it. If your safeguarding addition sits in your induction procedure instead, an inspector looking at your safeguarding policy still finds a gap, no matter how well written the content is elsewhere. CareStream names the exact target policy for each recommendation so the content lands where it will actually be looked for. That way the fix genuinely resolves the gap rather than existing in a document nobody would think to check, and your policy set stays properly organised."
      },
      {
        "question": "Does it just name the policy, or tell me where in the policy to add the content?",
        "answer": "It does both. Naming the right document is the first step, but a long policy can have many sections, and dropping content into the wrong part of the right policy still leaves it awkward to find. So CareStream also points to the specific section within the target policy where the new content belongs. This means you are guided all the way to the correct spot, not just the correct file. You open the named policy, go to the identified section, and add the content there, which keeps the document readable and the addition exactly where it should sit."
      },
      {
        "question": "Will this help keep my overall set of policies tidy?",
        "answer": "Yes, and that is one of its quieter benefits. Without clear guidance, managers tend to add fixes to whichever document feels closest, which slowly swells some policies with content that was never meant for them and leaves others incomplete. Over time the whole library drifts out of shape. By directing every recommendation to its proper policy and section, CareStream keeps your policies and procedures coherent as you remediate. Each document stays focused on what it is responsible for, so your library remains organised and easy to navigate rather than becoming a patchwork of misplaced additions."
      },
      {
        "question": "What if the right policy doesn't exist in my library yet?",
        "answer": "The guidance is based on the policies you have uploaded and the subjects each one is responsible for covering. If a recommendation relates to a subject and you hold a suitable policy for it, CareStream directs the content to that document and section. This keeps your existing library coherent and your fixes correctly placed. Where a subject sits at the boundary of your current documents, the guidance still points you to the most appropriate home among your policies so the content is not left orphaned. The aim throughout is that every fix has a clear, sensible destination rather than being added at random."
      },
      {
        "question": "How do I know a recommendation is based on real regulation and not just an opinion?",
        "answer": "Because every recommendation carries its source. Rather than asking you to take a suggested change on trust, CareStream cites the specific regulation, standard or item of statutory guidance the recommendation rests on, presented right alongside the change itself. That means you can check the reasoning before you act, not after. A suggestion with a named regulatory basis is a defensible decision; an unattributed one is just an opinion, and in regulated care the difference matters a great deal when someone asks you to justify what you changed and why."
      },
      {
        "question": "Can I use these citations as evidence when talking to inspectors or trustees?",
        "answer": "Yes, that is exactly what they are designed to support. When a board member questions a change, or an inspector asks why a policy was updated, you can point to the specific regulation, standard or guidance CareStream cited as the basis for the recommendation. The reasoning is documented rather than left in your memory. This turns each cited basis into ready-made evidence. Instead of scrambling to reconstruct why a decision was made, you have the justification attached to the change from the moment it was suggested, which is a far stronger position to be in during any form of scrutiny."
      },
      {
        "question": "Does every recommendation get a source, or only some of them?",
        "answer": "Every recommendation carries its basis. The regulatory source is not an optional extra bolted on to a few high-profile changes; it is part of how each recommendation is formed, because the gap was identified against that requirement in the first place. So whether the change is significant or minor, you can see the regulation, standard or statutory guidance behind it. That consistency is what lets you trust the whole set of recommendations, rather than wondering which ones are grounded and which are guesswork."
      },
      {
        "question": "I'm not a compliance specialist. Will the cited basis actually help me?",
        "answer": "It is particularly helpful if compliance is not your specialism. Many registered managers are asked to justify decisions to people who are more senior or more expert than they are, and doing that from memory is uncomfortable. Having the regulatory basis cited for you removes that pressure. You do not need to know every regulation by heart, because CareStream names the relevant one for each change and keeps it attached to the recommendation. That gives you the language and the authority to explain your policy decisions confidently, even when the questions come from a board, a trustee or an inspector."
      },
      {
        "question": "How does CareStream know which requirements apply to me?",
        "answer": "It starts from your service profile: your care setting, such as residential, nursing, domiciliary or supported living, and the service user groups you support. From that profile it relates the wider body of regulation and guidance to your specific type of service and filters the requirements down to the ones that genuinely apply. This matters because a nursing home, a home care agency and a supported living service carry meaningfully different responsibilities. By anchoring everything to who you actually are, CareStream makes sure you are looking at the requirements that belong to your service rather than a blended list written for every kind of provider at once."
      },
      {
        "question": "What if my service does more than one thing?",
        "answer": "Many providers do not fit a single tidy label, and the applicability logic is built with that in mind. Your service profile can reflect the combination of setting and service user groups you actually deliver, so the applicable requirements reflect your real mix rather than forcing you into one box. The goal is always accuracy: to include what genuinely applies across everything you do, and to exclude what does not. If your service spans more than one model, the aim is that your compliance view covers all of it without dragging in requirements that belong only to providers you are not."
      },
      {
        "question": "Could tailoring cause me to miss a requirement I should meet?",
        "answer": "The purpose of tailoring is the opposite: to reduce the chance of missing a relevant requirement, not increase it. When a checklist is generic, the requirements that truly apply to you are buried among many that do not, which is exactly the situation in which important ones get overlooked. Narrowing to relevance makes the ones that matter stand out. Applicability also factors in the service user groups you support, so requirements that arise specifically because of who you care for are treated as applicable. The result is a view built to be both focused and complete for your service, rather than comprehensive in the abstract but hard to act on."
      },
      {
        "question": "What happens if my care setting or service profile changes?",
        "answer": "If your service changes, for example you begin supporting a new service user group or your registration changes, the applicable requirements adjust to match your updated profile. The tailoring is not a one-off setup that goes stale, it reflects who you are now. That keeps your compliance work aligned with your service as it evolves, so you are always being assessed against the right requirements rather than the ones that fitted an earlier version of your service. Keeping your profile current is what keeps the whole picture accurate."
      },
      {
        "question": "What exactly counts as out-of-date content?",
        "answer": "It covers the specific things that make a live document look neglected: references to legislation or guidance that has since been superseded, template placeholders like [insert name] that were never filled in, role titles that no longer match your staffing structure, and review dates that have already passed. Each of these is small on its own but damaging when an inspector finds it. CareStream targets these signatures deliberately rather than giving you a vague sense that a policy might be old. That focus is what makes the output useful, because you get a concrete list of things to change rather than a warning you cannot act on."
      },
      {
        "question": "Does it tell me the current law, or just flag the old reference?",
        "answer": "The detection step flags where a policy cites law or guidance that has been superseded, so you can see clearly which documents are relying on something that has moved on. That alone is valuable, because these references read fluently and are easy to miss on a normal review. CareStream's wider analysis is grounded in a maintained external knowledge base of current sector rules, so recommendations sit on top of up-to-date regulation rather than the model's memory. The point of this feature specifically is to make sure no live document is still quietly pointing at the old version."
      },
      {
        "question": "Will it flag placeholders even if they do not look like [insert name]?",
        "answer": "Yes. Placeholders take many forms depending on the template a policy came from, and CareStream is designed to recognise the common patterns of content that was meant to be completed but never was. The classic square-bracket placeholder is only the most obvious example. The reason this matters is that an unfilled placeholder in a policy you hand to an inspector is one of the quickest ways to signal that documents are not being maintained. Surfacing them all in one list means you can clear them out before they ever cause that impression."
      },
      {
        "question": "How is this different from the cross-policy consistency check?",
        "answer": "Cross-policy consistency compares your documents against each other to find places where two policies contradict one another. It is about disagreement between separate documents. Out-of-date content detection instead looks within your policies for content that has simply aged, such as superseded law, placeholders, old titles and stale dates. The two work well together but answer different questions. One asks whether your policies agree with each other, the other asks whether each policy is still current. Running both gives you a set that is internally consistent and individually up to date, which is exactly what inspection readiness looks like."
      },
      {
        "question": "How is this different from just proofreading each policy?",
        "answer": "Proofreading checks a single document for spelling, grammar and clarity within its own pages. It cannot tell you that this policy disagrees with another one filed somewhere else, because you are only ever looking at one document at a time. That is exactly the gap that lets contradictions survive for years. Cross-policy consistency works the other way round. It compares your documents against each other, so it catches the clashes that only appear when two policies describe the same situation differently. It is not a substitute for careful writing, it is the layer that makes sure your carefully written policies do not quietly contradict one another."
      },
      {
        "question": "What kinds of contradictions does it actually find?",
        "answer": "The most common are disagreements about responsibility and thresholds. One policy might say a task can be delegated to a particular role while another reserves it for someone more senior, or two documents might set different reporting timescales, review frequencies or sign-off requirements for the same event. These are easy to create and very hard to spot by eye. CareStream surfaces each clash in plain English, naming the policies involved and the passages that disagree, so you can see immediately what the conflict is. You then decide which version is correct for your service and bring the others into line, which keeps the fix quick and firmly in your hands."
      },
      {
        "question": "Do I need to reorganise my policies before using this?",
        "answer": "No. The feature is designed to work with the policy set you already have, however it has grown over time. You do not need to restructure your library, rename files or force everything into a single template first. In practice, running the check often becomes the reason a library gets tidier, because the contradictions it surfaces point you straight to the documents that have drifted apart. You fix those as you go, and the set becomes more consistent with each pass rather than requiring a big reorganisation up front."
      },
      {
        "question": "How often should I run the consistency check?",
        "answer": "A good rhythm is to run it whenever you add a new policy or make a meaningful edit to an existing one, because that is exactly when a new contradiction is most likely to creep in. A change that looks self-contained can still clash with a related document elsewhere in the set. Many providers also run a full check ahead of an inspection or as part of a periodic review, so they can walk in confident that the whole library agrees with itself. Because the check runs across the entire set in one pass, keeping this habit adds very little effort and gives you ongoing reassurance rather than a once-a-year scramble."
      },
      {
        "question": "How do I know an alert is actually relevant to my service?",
        "answer": "CareStream does not simply forward every change in the sector. It checks whether a given change touches your service profile and the policies you actually hold, then only raises an alert when there is a genuine connection. That filtering is the point, because an unfiltered feed of every regulatory movement would be as useless as no feed at all. When an alert does come through, it names the specific documents affected, so you are not left wondering whether it applies to you. You can see straight away which policy the change relates to and why, which keeps the path from alert to action short and clear."
      },
      {
        "question": "Does this replace my own responsibility to stay compliant?",
        "answer": "No, and it is not meant to. You and your nominated individual remain responsible for your service's compliance. What regulation change tracking does is make that responsibility manageable, by making sure a relevant change does not slip past unnoticed while you are busy running the home. Think of it as a watchful assistant rather than a replacement for judgement. It brings the right changes to your attention and tells you which policies are affected, and you decide how to respond. The decisions stay with you, but you are making them with timely information instead of finding out too late."
      },
      {
        "question": "How is this different from out-of-date content detection?",
        "answer": "Out-of-date content detection looks at your existing documents right now and flags content that has already aged, such as superseded law, placeholders and stale dates. It is a check on the current state of what you have written. Regulation change tracking looks outward and forward, watching the rules themselves and alerting you when they move. The two are complementary. One tells you where your documents have already fallen behind, the other tells you when the ground is shifting so you can move with it. Used together, you both clean up existing decay and stay ahead of new change rather than only reacting after the fact."
      },
      {
        "question": "What happens after I get an alert?",
        "answer": "The alert connects the change to the specific policies that need attention, so your next step is clear: review those documents against the new expectation and update them. Because CareStream's analysis is grounded in a maintained knowledge base of current sector rules, the guidance you get sits on top of up-to-date regulation rather than guesswork. You stay in control of the wording and the final version, which keeps your policies genuinely yours. The alert simply makes sure you are updating the right documents, for the right reason, at the right time, rather than discovering the gap during an inspection."
      },
      {
        "question": "Do staff have to reread the whole policy after every change?",
        "answer": "No. The onboarding content is built around what specifically changed, so staff learn the new expectation rather than working through the entire policy again. This respects their time and makes the update far more likely to stick, because it is clear and focused. That focus is deliberate. When people are asked to reread long documents for a small change, the change often gets lost. By centring the training on the difference, CareStream makes sure the point of the update is exactly what your team takes away."
      },
      {
        "question": "How does it know which staff need the training?",
        "answer": "The content is directed to the members of staff the change actually affects, so the update reaches the relevant part of your team rather than everyone indiscriminately. This keeps the training proportionate and avoids fatigue from irrelevant material. Reaching the right people also strengthens your evidence. When you can show that a specific change was trained to the specific staff it applied to, you demonstrate a considered, targeted approach to keeping practice aligned with your policies and procedures in health and social care."
      },
      {
        "question": "Is completion recorded for evidence?",
        "answer": "Yes. When affected staff complete the onboarding or refresher generated from an update, that completion is recorded. So you have a clear line from the policy change to the training to the evidence that staff were brought up to speed. This is valuable at inspection, where the concern is often whether policies translate into practice. Being able to show that each meaningful change was followed by targeted training that staff completed is strong assurance that your policies are lived rather than just written."
      },
      {
        "question": "Does this create extra work for the manager?",
        "answer": "No, it removes work. Instead of building a training update from scratch every time a policy changes, CareStream generates the onboarding content from the update itself, so the effort of turning a revision into a training moment is largely handled for you. That means a registered manager can keep policies current without dreading the follow-up. The change is made, the focused content is generated, it reaches the right staff and their understanding is evidenced, all as a natural part of updating the policy rather than a separate project."
      }
    ],
    "sort": 105
  },
  {
    "slug": "staff-hub",
    "title": "Every policy, every answer, wherever your team is",
    "meta_title": "Every policy, every answer, wherever your team is | CareStreamAI",
    "meta_description": "The staff hub is the part of CareStream your carers actually touch. It holds your whole policy library, answers questions in plain language from your own documents, and works on the phone in someone’s pocket rather than a machine in the office.",
    "content": {
      "eyebrow": "Where your team meets your policies",
      "intro": "The staff hub is the part of CareStream your carers actually touch. It holds your whole policy library, answers questions in plain language from your own documents, and works on the phone in someone’s pocket rather than a machine in the office.",
      "chips": [],
      "capabilities": [
        "multi-language-support",
        "email-interface",
        "voice-input",
        "home-knowledge-base-auto",
        "home-knowledge-base-manual",
        "external-regulatory-knowledge-base"
      ],
      "cta": {
        "heading": "See it on your own policies.",
        "sub": "Upload what you already have and see what CareStream finds, inside a fortnight."
      }
    },
    "faqs": [
      {
        "question": "How many languages are supported?",
        "answer": "CareStream supports more than 60 languages, so each member of staff can select the language they feel most confident in. The platform then presents the chat, care policies, and training content in that chosen language, making it straightforward for teams to engage with policies and procedures across health and social care settings. For care providers managing diverse workforces, access to care sector policies in multiple languages helps ensure that every team member can read, understand and follow the procedures in health and social care that matter most to the people in their care."
      },
      {
        "question": "Do our records change language too?",
        "answer": "Not at all. Even when care providers make care sector policies in multiple languages available to staff, your official records, audits and reporting remain in clear English throughout. Your compliance position and inspection readiness stay completely unaffected. For those responsible for care management, this means you can support a diverse workforce without creating two separate documentation trails or introducing any uncertainty into your policies and procedures."
      },
      {
        "question": "Is there anything to set up for each person?",
        "answer": "Not at all. The platform is built to serve your whole team straight away, with no extra setup required. Any member of staff simply selects their preferred language, and all care home policies, procedures and guidance display accordingly. For care providers supporting colleagues whose first language is not English, this makes accessing care sector policies in multiple languages entirely straightforward. In health and social care settings, where clear understanding of policies and procedures is essential to quality care, removing language as a barrier helps every team member work confidently and consistently from day one."
      },
      {
        "question": "Does it work across training and induction too?",
        "answer": "Yes. Whatever language a staff member selects, that choice carries through the chat, care home policies, induction steps, training modules and follow-up messages, creating one consistent experience from start to finish. For care providers managing a multilingual workforce, this means staff can engage with care sector policies in multiple languages without switching between systems or losing context at any point in their journey."
      },
      {
        "question": "What can staff actually do by email?",
        "answer": "The email interface is a two-way channel, so it is more than notifications. Staff and managers can receive things like training reminders and questions in their inbox, and they can respond straight back by replying, without opening the app or logging in anywhere. Those responses feed back into CareStream, so records and training progress stay current. For someone who spends their day in email, this means they can stay fully engaged with the platform without ever changing where they work."
      },
      {
        "question": "Does using email mean staff miss out on the app?",
        "answer": "No. The email interface runs alongside the app rather than replacing it. People who like the app carry on using it, and people who prefer email get the same engagement through their inbox, so nobody is forced onto a channel that does not suit them. This flexibility is the point. Different members of a care team work in different ways, and letting each person use whichever channel they are comfortable with is what keeps engagement high across the whole team."
      },
      {
        "question": "Why does an email option matter for adoption?",
        "answer": "Adoption is where most care platforms quietly fail. Busy staff and managers will engage with what is easy and ignore what adds steps, and having to log into a separate system is one of the most common reasons good intentions stall. By letting people work from the inbox they already check all day, the email interface removes that barrier. Reminders and questions are far more likely to get actioned when responding is as simple as replying to an email, which keeps your training and compliance activity moving."
      },
      {
        "question": "Will email engagement still keep our records up to date?",
        "answer": "Yes. When someone responds by email, that response flows back into CareStream, so training progress and related records stay current just as they would if the person had used the app. The channel changes, not the record keeping. That is important for inspection readiness, because it means the higher engagement you get from meeting people in their inbox translates directly into up-to-date compliance and training records rather than activity that happens outside the system."
      },
      {
        "question": "Who benefits most from voice input?",
        "answer": "Two groups in particular. First, care workers who are on the move, mid-round or between tasks, who cannot easily stop to type but can ask a question out loud and carry on. Second, staff who are less confident typing, for whom speaking is far more natural than a keyboard. By supporting both, voice input widens who can genuinely use the platform on a busy shift. It means engagement no longer depends on being a fast or confident typist sitting at a desk, which makes CareStream accessible to the whole team."
      },
      {
        "question": "Does voice input replace typing?",
        "answer": "No. Voice input sits alongside typing rather than replacing it, so each member of staff can choose whichever suits the moment. On the move it might be voice, at a desk it might be typing, and the same platform responds either way. That choice is the point. Different people and different situations call for different input, and letting staff pick keeps CareStream usable across the whole range of a care worker's day rather than forcing one way of interacting."
      },
      {
        "question": "How does a member of staff use voice input?",
        "answer": "It is designed to be simple. A member of staff starts voice input and speaks their question or request in ordinary everyday language, and CareStream interprets what was said and responds, so the whole exchange can happen out loud without reaching for a keyboard. Because it is hands free, this works well in the real conditions of a care setting, letting staff ask something mid-task and get an answer without breaking the flow of care they are providing."
      },
      {
        "question": "Why does voice input matter for a care service?",
        "answer": "Care is a hands-on, on-the-move job, and a platform only helps if staff can actually use it in those conditions. Voice input matters because it fits the reality of a shift, letting people engage without stopping what they are doing and without the barrier that typing can present for some staff. When the whole team can interact easily, questions get answered and training gets actioned on shift rather than being put off, which keeps practice and records current. That accessibility is what turns a platform staff could use into one they actually do."
      },
      {
        "question": "What does auto actually mean here?",
        "answer": "It means CareStream builds and maintains the knowledge base for you, from the policies you already have, without anyone doing manual data entry. You are not asked to type your home's information into a separate system, and you are not asked to keep that system in sync every time a document changes. The knowledge base is generated from your existing policies and refreshed as they evolve. This is the crucial difference from a manual knowledge base, where the value depends entirely on someone finding time to keep it current. In a busy care service that time rarely appears, so manual stores go stale. Making it automatic removes that dependency, which is why the answers your staff receive stay grounded in your real, current documents."
      },
      {
        "question": "Where do the answers come from?",
        "answer": "They come from your own home's policies and procedures. The knowledge base is built from those documents, and your staff Q&A assistant answers from it, so when a carer asks a question they get a response grounded in what your service actually does rather than generic care information found elsewhere. That is what makes the answers trustworthy on shift. A generic reply might describe good practice in the abstract, but it cannot tell a member of staff your home's specific approach. Because the assistant draws on your real documents, the guidance staff receive matches the policies they are expected to follow, which supports consistency and safe practice."
      },
      {
        "question": "What happens when I update a policy?",
        "answer": "The knowledge base is kept up to date as your policies change, so an update to a document flows through to the answers staff receive. You do not have to separately re-enter the change into a knowledge store or worry that the assistant is still answering from an old version. This self-updating behaviour is central to why the feature is described as auto. Keeping a home-specific knowledge base accurate by hand is exactly the kind of ongoing task that slips, and a knowledge base that has drifted out of date can mislead staff. By refreshing from your current policies, CareStream keeps the answers aligned with what your documents actually say now."
      },
      {
        "question": "How is this different from the external regulatory knowledge base?",
        "answer": "The external regulatory knowledge base is a maintained store of sector-wide regulations, standards and statutory guidance that grounds CareStream's policy analysis in current rules. It is about the wider regulatory landscape that applies across providers. The home knowledge base is the opposite in scope: it is built from your own home's policies and answers questions specifically about your service. They serve different jobs and work well together. The regulatory knowledge base makes sure analysis reflects real sector rules, while the home knowledge base makes sure your staff get answers grounded in your own documents. One is about the rules everyone must meet, the other is about how your particular home does things, and both stay current so you can rely on them."
      },
      {
        "question": "How is this different from the automatic knowledge base?",
        "answer": "The automatic knowledge base builds itself from your approved policies and procedures, so it answers questions that are grounded in formal documents. The manual knowledge base is the opposite: nothing is generated for you, and every entry is written and curated by hand so you control exactly what goes in. In practice the two work together. The automatic base handles questions rooted in your care home policies and nursing home policies, while the manual base covers local ways of working, extra guidance and common staff questions that no formal policy was ever meant to hold. Your team draws on both through a single staff Q&A assistant."
      },
      {
        "question": "Who can add or edit manual knowledge entries?",
        "answer": "Adding and editing entries is a manager and quality lead task, so control stays with the people responsible for standards in your service. You write entries in plain English, title and group them, and update them whenever practice changes. Because you hold that control, you always know exactly what your team is being told and where the answer came from. There is no risk of an entry appearing that you did not approve, which keeps the knowledge base trustworthy and firmly aligned with how your home works."
      },
      {
        "question": "What kind of information should I put in the manual knowledge base?",
        "answer": "It is ideal for the practical, local detail that keeps a service running but does not belong in a formal policy: the timing of a medication round, an out of hours contact, a resident's long-standing preference, or the plain-English answer to a question staff ask in every handover. Think of it as writing down the knowledge you currently keep repeating in person. Anything that a new starter or a member of staff on a quiet shift might reasonably ask, and that is specific to your home rather than to regulation, is a strong candidate for a curated entry."
      },
      {
        "question": "Will staff know whether an answer came from a policy or a manual entry?",
        "answer": "For staff the experience is seamless. They ask the Q&A assistant a question and receive a clear answer, whether it is grounded in an approved policy or in one of your curated manual entries, so there is no extra step or decision for them to make. For you as a manager the distinction stays visible and controllable behind the scenes. You know which entries you have written by hand, you can edit them at any time, and you can rely on the automatic base to keep answering the questions that are rooted in your formal policies and procedures."
      },
      {
        "question": "Why does grounding the AI in a knowledge base matter?",
        "answer": "A general AI model answers from memory that was fixed at the point it was trained, with no traceable source and no guarantee it is current. In most settings that is a minor inconvenience, but in compliance it is a real risk, because a confident answer about regulation can be out of date or subtly wrong and you have no way to tell. Grounding the analysis in a maintained knowledge base changes that. Recommendations are tied to real regulations, standards and statutory guidance rather than the model's recollection of them, so what you act on reflects the actual expectations placed on care providers. It is the difference between advice you can rely on and advice you have to second-guess."
      },
      {
        "question": "How is the knowledge base kept up to date?",
        "answer": "It is a maintained resource rather than a fixed snapshot, which means it is kept current as regulations, standards and guidance in the sector evolve. That maintenance is central to its value, because a knowledge base that was assembled once and left alone would slowly develop the very staleness it exists to prevent. Because every CareStream analysis feature draws on this same base, keeping it current strengthens the foundation under all of them at once. As the knowledge base is refreshed and expanded, the grounding behind every recommendation improves, which is why it underpins the reliability of the wider platform rather than sitting off to one side."
      },
      {
        "question": "Is the knowledge base specific to adult social care?",
        "answer": "Yes. The point of a curated, maintained knowledge base is that it focuses on the regulations, standards and statutory guidance that actually govern adult social care providers, rather than the broad general knowledge a model carries about everything. That focus is what makes the recommendations relevant to your world. A nursing home, a domiciliary agency and a supported living service all operate within a specific regulatory framework, and grounding the AI in that framework means its analysis speaks to your responsibilities directly. It is specialised on purpose, because generic advice is exactly what care providers do not need when preparing for inspection."
      },
      {
        "question": "How does this relate to CareStream's other features?",
        "answer": "The external regulatory knowledge base is the foundation the other analysis features stand on. When CareStream checks your policies for consistency, detects out-of-date content, tracks regulation changes or tailors requirements to your care setting, it does so on top of this grounded, current understanding of the rules rather than each feature guessing independently. That shared foundation is what keeps the platform coherent and trustworthy. Because every feature draws on the same maintained source of sector rules, you get consistent, grounded reasoning across the board, and improving the knowledge base lifts the reliability of everything built on it."
      }
    ],
    "sort": 106
  },
  {
    "slug": "training",
    "title": "Training built from your own policies, evidenced as it happens",
    "meta_title": "Training built from your own policies, evidenced as it happens | CareStreamAI",
    "meta_description": "Training in care fails on the record keeping far more often than on the teaching. This covers what each role has to complete, how face to face sessions and online modules end up on the same staff record, and what you can put in front of an inspector without preparing for it.",
    "content": {
      "eyebrow": "Assign it, deliver it, evidence it",
      "intro": "Training in care fails on the record keeping far more often than on the teaching. This covers what each role has to complete, how face to face sessions and online modules end up on the same staff record, and what you can put in front of an inspector without preparing for it.",
      "chips": [],
      "capabilities": [
        "mandatory-training-by-role",
        "face-to-face-training-and-matrix",
        "training-compliance-matrix-renewals-gaps",
        "cqc-evidence-pack-sign-in-sheets-certificates-files",
        "training-payroll-report-pdf-csv-costing",
        "effectiveness-of-training",
        "training-impact"
      ],
      "cta": {
        "heading": "See it on your own policies.",
        "sub": "Upload what you already have and see what CareStream finds, inside a fortnight."
      }
    },
    "faqs": [
      {
        "question": "How does CareStream decide what training each person needs?",
        "answer": "You define the mandatory training for each role in your service, describing what a carer must hold, what a nurse must hold, what a manager must hold, and so on. CareStream then matches each member of staff to their role and applies the corresponding training matrix to them automatically, so their required courses come from their role rather than from a manual per-person list. This means you do the thinking once, at the level of the role. Every individual in that role inherits the same, correct set of requirements, which keeps things consistent across your whole team and removes the risk of assigning the wrong courses to the wrong people."
      },
      {
        "question": "What happens when a member of staff changes role?",
        "answer": "When someone moves from one role to another, their training requirements update to match the new role automatically. If a carer steps up to a nurse or a senior role with different mandatory training, the platform reflects that change rather than leaving them held against the requirements of their old role. This is one of the biggest time savers, because role changes are exactly where manual training lists tend to drift out of date. By tying requirements to the role, CareStream keeps each person's expectations accurate through promotions, moves and new starters, without anyone having to reassign courses by hand."
      },
      {
        "question": "Does this stop us over-training people?",
        "answer": "Yes. Because training is mapped to roles, each member of staff is only held against the courses that genuinely apply to their work. You avoid the common problem of a single long list that expects everyone to complete everything, whether or not it is relevant to their role. Just as importantly, it stops the opposite problem of missing a requirement that a particular role carries. The role-based matrix gives you the right set, no more and no less, which is both fairer on staff and cleaner to evidence at inspection."
      },
      {
        "question": "How does this help with CQC inspection?",
        "answer": "CQC expects you to show that people are trained appropriately for the work they actually do, not simply that some training happened. By defining mandatory training per role and applying it to every person automatically, you can demonstrate a clear, consistent link between each individual's role and the training they are required to hold. That clarity makes inspection conversations much simpler. Rather than explaining an inconsistent spreadsheet, you can show that a carer, a nurse and a manager each carry the correct requirements for their role, and that new starters and role changes pick those requirements up automatically."
      },
      {
        "question": "Can I record training that happened in a classroom, not online?",
        "answer": "Yes. CareStream is built to capture in-person training as well as e-learning, so practical sessions like moving and handling, or any mandatory course delivered in a room, can be recorded properly. You log the session, mark who attended and attach the evidence, so classroom training becomes a real, retrievable record rather than a paper sign-in sheet in a folder. This is important because a lot of the most safety-critical training is competency-based and best taught in person. Capturing it in the platform means those sessions carry the same weight as online courses and are just as easy to find and evidence when you need them."
      },
      {
        "question": "Does face-to-face training show up in the same compliance matrix?",
        "answer": "It does. Once you record an in-person session and its attendance, that training feeds into the same compliance matrix as your online learning. Classroom courses count towards each attendee's requirements, come up for renewal in the same way, and show as a gap if they are missing, exactly like e-learning. This is the whole point: your training picture is only useful if it is complete. By bringing face-to-face and online training into one matrix, CareStream ensures the view reflects everything your team has done, not just the part that happened on a device."
      },
      {
        "question": "What evidence can I capture for in-person sessions?",
        "answer": "You can record who attended and capture the evidence of the session and its completion, giving you a defensible record of what was actually delivered and to whom. Rather than a loose sign-in sheet that can go missing, the attendance and evidence are held against the correct people in the platform. That matters at inspection, where you may need to demonstrate not just that training was scheduled but that specific people attended and completed it. Having attendance and evidence stored alongside your online records means you can produce the full story of a practical course as easily as any other."
      },
      {
        "question": "Why does it matter that online and classroom training are together?",
        "answer": "CQC is interested in whether people are competently trained, not in whether a course was delivered on a screen or in a room. If your classroom training lives in a separate register from your e-learning, your compliance view is only telling half the story, and reconciling the two by hand is exactly where things get missed. Bringing both into one matrix means your training position is genuinely complete. You can see and evidence all mandatory training in a single place, including the practical competencies that are so often taught in person, without ever having to pull from a second system to fill in the gaps."
      },
      {
        "question": "What does the training compliance matrix actually show?",
        "answer": "The matrix lines up every member of staff against every course they are required to hold, and shows the status for each combination. In a single grid you can see who is trained, who is overdue, what renewals are coming due and where a course is missing entirely, so the whole training position of your service is visible at once. This is different from looking at individual certificates or a per-person record. Those tell you about one person and one course, whereas the matrix tells you about your whole team at the level CQC actually inspects, which makes it a genuine management tool rather than just a store of documents."
      },
      {
        "question": "How does it help me stay on top of renewals?",
        "answer": "Courses that are approaching their renewal date are highlighted in the matrix, so you can see what is coming due before it expires. Instead of discovering that a batch of training lapsed last month, you get early sight of what needs arranging, which lets you plan sessions and renewals in good time. Because the view covers the whole team, you can also spot when several people need the same course renewed around the same time, and organise that efficiently rather than one person at a time. It turns renewals from a series of last-minute surprises into a manageable, forward-looking task."
      },
      {
        "question": "How are gaps identified?",
        "answer": "A gap is any required course that a member of staff has not completed, and the matrix makes these stand out across the grid rather than leaving them hidden inside individual records. Because you can read the whole service at once, missing training is obvious instead of something you only discover when you go looking for it. This is exactly the kind of thing that is hard to catch with scattered records. By surfacing gaps at the level of the whole team, the matrix lets you prioritise your training effort where it is genuinely needed and close those gaps deliberately, rather than assuming everything is covered."
      },
      {
        "question": "Does the matrix stay up to date on its own?",
        "answer": "Yes. The matrix draws on the training requirements and completions already held in CareStream, so as staff complete courses and as renewals fall due, the grid reflects those changes automatically. You are not maintaining a separate spreadsheet that goes stale the moment you close it. That means whenever you open the matrix, whether for a supervision, a team meeting or an inspection, the view is current. The picture you see is the true picture of your service's training position at that moment, which is precisely what you want when someone asks who is trained and who is not."
      },
      {
        "question": "What kinds of evidence does the pack include?",
        "answer": "The pack gathers the supporting evidence behind your practice, including training sign-in sheets, certificates, uploaded files and records. Rather than these living in separate folders and systems, they are brought together into one organised pack that you can present at inspection. This is the evidence inspectors most often ask to see when they want proof behind a claim. Having it collected and ordered means that when the question comes, you can point to the certificate, the sign-in sheet or the record straight away instead of going to look for it."
      },
      {
        "question": "How does this help on the day of an inspection?",
        "answer": "It removes the scramble. Instead of hunting through folders and drives when an inspector asks for evidence, you present an organised pack that already holds your sign-in sheets, certificates and files together. That means you can respond quickly and calmly rather than under pressure. Producing evidence smoothly also makes a strong impression. When you can show the records behind your training and policies without delay, it demonstrates that your service is well organised and that its practice is genuinely backed by evidence, which is exactly the assurance inspection looks for."
      },
      {
        "question": "Do I have to build the pack by hand each time?",
        "answer": "No. The pack draws on the evidence CareStream already holds, gathering your sign-in sheets, certificates, uploaded files and records and organising them for you. So you are not assembling documents manually every time an inspection approaches. Because it reflects the evidence on the platform, the pack stays aligned with your records as new certificates and files are added. That keeps your supporting evidence ready and current, rather than something you have to reconstruct under pressure whenever it is needed."
      },
      {
        "question": "How is this different from the readiness report?",
        "answer": "The readiness report tells you where you stand across policies, training and evidence and where the gaps are, so it is about understanding your position before inspection. The evidence pack is about producing the actual supporting documents, the sign-in sheets, certificates and files, when you need to show them. The two work together. You use the readiness report to see whether your evidence is complete and to close any gaps, and you use the evidence pack to present that evidence in an organised form at inspection. One shows your readiness, the other lets you prove it."
      },
      {
        "question": "How is the cost of training time calculated?",
        "answer": "CareStream records the time each member of staff spends on completed training and applies a cost to those hours, so the report shows both the time invested and the money it represents. That gives you a pound figure you can put in front of finance, owners or funders rather than a vague sense that training is expensive. Because the time is captured as staff actually complete training, the cost is grounded in real activity rather than an after-the-fact estimate, which keeps your budgets and funding claims defensible."
      },
      {
        "question": "What is the difference between the PDF and CSV exports?",
        "answer": "The PDF gives you a clean, finished document that is easy to file, print or share with an owner, board or commissioner. It is the right choice when you need a tidy record that speaks for itself. The CSV is the working format. It drops straight into payroll systems, finance spreadsheets and funding paperwork so you can sort, total and combine the figures with your other data. Having both means the same costed training report serves both the presentation job and the number-crunching job."
      },
      {
        "question": "Can I use this report to support a funding or workforce claim?",
        "answer": "Yes. One of the main reasons providers ask for costed training is to evidence spend against workforce development funding and similar claims. The report gives you a clear record of who trained, for how long and at what cost over the period you select, which is exactly the kind of evidence those claims call for. You can generate the report for the specific claim window and export it as a PDF for your submission or a CSV to reconcile against your finance records, so the paperwork stands up to scrutiny."
      },
      {
        "question": "Do I have to log training hours manually for this to work?",
        "answer": "No. The whole point is to remove the manual timing that usually makes training costing painful. As your team completes training within CareStream, the time is captured automatically, so the report can cost it without anyone stopping to record hours by hand. This keeps the figures accurate and saves your managers from reconstructing training time after the event, which is where estimates and errors normally creep into budgets and claims."
      },
      {
        "question": "What is the difference between completion and effectiveness?",
        "answer": "Completion tells you a course was finished. Effectiveness tells you whether it actually improved understanding and practice. A member of staff can complete a module and still not have grasped it, or grasp it in the moment and change nothing in how they work, and a completion tick would look identical in every case. CareStream measures the part completion misses. Using assessment scores it shows how well the material was understood, and through follow-up it checks whether the learning held and changed practice. That lets you evidence that your training works, rather than only that it was done."
      },
      {
        "question": "How does CareStream measure whether training worked?",
        "answer": "It looks at training in two stages. First, assessment scores give a concrete measure of how well each person understood the material, so you can see where a course landed well and where understanding was thin. Second, follow-up checks whether that understanding actually translated into practice over time, rather than fading once the course was finished. Together these give you a picture of impact for individuals and across your team. Where scores or follow-up are low, you have an early signal that competence needs reinforcing, so you can act before a gap becomes a risk rather than discovering it after something goes wrong."
      },
      {
        "question": "Why does CQC care about training effectiveness?",
        "answer": "CQC has moved firmly towards outcomes, and the quality statements expect you to show that staff are competent and that learning translates into safe, better care. Under that model, evidence that training merely took place is no longer enough; inspectors want to see that it made a difference to understanding and practice. Measuring effectiveness gives you exactly that evidence. Instead of presenting a wall of completion ticks, you can show assessment scores and follow-up that demonstrate your training genuinely improves competence, which speaks directly to the quality statements around effective care and a well-trained workforce."
      },
      {
        "question": "What do I do when effectiveness is low?",
        "answer": "Low assessment scores or weak follow-up are a signal, not a verdict. They tell you where understanding did not land or where practice has not changed, which is precisely where competence needs reinforcing. That might mean revisiting the training, delivering it differently, or supporting particular individuals more closely before the gap becomes a risk. The value is that you find out early, while you can still act, rather than discovering a competence gap when something goes wrong. Over time, measuring effectiveness also lets you judge which training genuinely works, so you can strengthen what is landing well and revisit what is not, and put your training effort where it makes a real difference."
      },
      {
        "question": "How does Training Impact link training to audit scores?",
        "answer": "CareStream already holds your completed training and your audit results in one place, so it can line the two up on a shared timeline. Where a training topic maps to a related audit, for example infection prevention training and your infection prevention and control audit, the platform shows how completion and audit scores move together over time. This means you do not have to build spreadsheets or cross-reference records by hand. The connection is drawn from data you are already generating as staff train and as audits are run, so the impact picture keeps building in the background."
      },
      {
        "question": "Is this useful if I only run a single care home?",
        "answer": "Yes. A single home benefits just as much because Training Impact gives a registered manager a clear, evidence-backed view of whether the training their team completes is translating into better practice on the floor. It turns routine completion data into something you can act on and stand behind. It is also valuable when you want to demonstrate quality care to owners, commissioners or an inspector visiting one service, because you can show that learning leads to measurable improvement rather than simply pointing at certificates."
      },
      {
        "question": "Can I use Training Impact as evidence for a CQC inspection?",
        "answer": "That is exactly what it is designed for. CQC wants to see that training is effective, meaning it leads to safe and consistent care, not just that people completed modules. Training Impact gives you a defensible narrative that shows learning followed by improving audit scores and stronger compliance over time. You can share this impact picture as part of your evidence around effective and well-led care, helping to show inspectors that your approach to mandatory and annual training genuinely improves practice across the service."
      },
      {
        "question": "Do I have to enter any extra data to make this work?",
        "answer": "No. Training Impact is built on information CareStream is already capturing, your completed mandatory training, annual modules, follow-ups and audit runs, so there is no additional data entry for your team. As people train and as you run audits, the impact view keeps itself current. That is deliberate, because care teams are stretched and any tool that adds admin tends to get abandoned. By working quietly from existing records, Training Impact stays accurate without asking busy staff to do more."
      }
    ],
    "sort": 107
  },
  {
    "slug": "web-chat-interface",
    "title": "Web chat interface",
    "meta_title": "Web chat interface | CareStreamAI",
    "meta_description": "One place for every member of your team to ask anything, and get an instant answer grounded in your own policies, in their own language, on any device.",
    "content": {
      "eyebrow": "",
      "intro": "One place for every member of your team to ask anything, and get an instant answer grounded in your own policies, in their own language, on any device.",
      "chips": [
        "For your whole team",
        "60+ languages",
        "Available 24/7"
      ],
      "capabilities": [],
      "cta": {
        "heading": "See it on your own policies.",
        "sub": "Upload what you already have and see what CareStream finds, inside a fortnight."
      }
    },
    "faqs": [
      {
        "question": "What can staff ask the web chat?",
        "answer": "Anything about how your service works: policies and procedures, what to do in a situation, where to record something, who to escalate to. CareStream answers from your own uploaded policies, so the guidance is specific to your care setting."
      },
      {
        "question": "How does it know the answers?",
        "answer": "CareStream reads your own policies and procedures and answers from them, pointing back to the source. It is not a generic web search, so staff get guidance that matches your documented practice."
      },
      {
        "question": "Can staff use it in other languages?",
        "answer": "Yes. Staff can ask and read answers in over 60 languages, using the language they are most confident in, while your records stay in English."
      },
      {
        "question": "What happens if a question isn't covered?",
        "answer": "CareStream tells the member of staff it cannot answer from your policies, and captures the question as a gap so you can see what your library is missing and improve it."
      }
    ],
    "sort": 108
  },
  {
    "slug": "workforce-and-multi-site",
    "title": "The records behind your people, across every service you run",
    "meta_title": "The records behind your people, across every service you run | CareStreamAI",
    "meta_description": "Recruitment documents, registrations and supervisions are the part of compliance that lives in a filing cabinet in most services. These bring them into the same place as the training and policy evidence, and give a group a view across all of it.",
    "content": {
      "eyebrow": "Beyond a single service",
      "intro": "Recruitment documents, registrations and supervisions are the part of compliance that lives in a filing cabinet in most services. These bring them into the same place as the training and policy evidence, and give a group a view across all of it.",
      "chips": [],
      "capabilities": [
        "supervisions-and-appraisals-tracking",
        "workforce-compliance-register-dbs-right-to-work-registration-references",
        "credential-document-uploads-expiry-alerts",
        "multi-site-group-console-and-benchmarking"
      ],
      "cta": {
        "heading": "See it on your own policies.",
        "sub": "Upload what you already have and see what CareStream finds, inside a fortnight."
      }
    },
    "faqs": [
      {
        "question": "Which plans include supervisions?",
        "answer": "All of them. Supervisions and appraisals are available on every CareStream plan."
      },
      {
        "question": "Who can conduct a supervision?",
        "answer": "Any of your administrators. When you book a session you choose the conductor from a dropdown, and they are notified in their hub and by email that they are conducting it."
      },
      {
        "question": "What happens to the agreed actions?",
        "answer": "Each agreed action is written into the staff member's hub under My actions, so it works as a shared to-do list. From any action you can also allocate a training module, an induction flow or a CQC prep question, which is sent straight to their hub."
      },
      {
        "question": "Where are completed supervisions kept?",
        "answer": "On the staff member's record page, with a link to open the full form and the next session booked off it, so you have a complete supervision history for inspection."
      },
      {
        "question": "Which checks does the register track?",
        "answer": "The register tracks each staff member's DBS, right to work, professional registration such as NMC where it applies, and references. These are the checks that sit behind safe recruitment and continued employment in adult social care, and the register holds them together per person rather than across separate files. Keeping them in one place matters because these are among the first things a CQC inspector will look at in a staff file. Having them tracked together means you can show a complete, current picture of each person's compliance rather than reconstructing it from scattered records."
      },
      {
        "question": "How do I know who is fully compliant?",
        "answer": "The register shows each staff member's status at a glance, making clear who is fully compliant and who has something outstanding. Instead of cross-checking multiple spreadsheets and folders, you get a single view of your whole team's compliance position. This visibility is the core value of the register. Because you can see where everyone stands in one place, you can act on gaps immediately and maintain confidence that your workforce meets the checks required, which supports the safe staffing that quality care depends on."
      },
      {
        "question": "Will it warn me before a check expires?",
        "answer": "Yes. The register flags items that are approaching renewal, such as a DBS or a professional registration nearing its expiry, so you can act before they lapse rather than after. This turns renewals from something you have to remember into something the register surfaces for you. Catching expiries early is what keeps your workforce continuously compliant. Instead of discovering a lapsed check when an inspector opens a file, you address it in good time, which protects both your inspection position and the safety of the people your service supports."
      },
      {
        "question": "How does this support us at inspection?",
        "answer": "Safe recruitment and continued employment checks are among the first areas a CQC inspector examines, and any gap in DBS, right to work, registration or references can undermine confidence in your staffing. The register lets you show that these checks are tracked, current and complete for every member of your team. Because the register makes both compliance and gaps visible, you go into inspection knowing your position rather than hoping the files hold up. Being able to demonstrate that your workforce compliance is actively managed, with expiries flagged and missing items chased, is strong evidence of a well run and safe service."
      },
      {
        "question": "Which documents can I store against a member of staff?",
        "answer": "You can upload the credential documents that matter for safer recruitment and safe working in a regulated care setting: DBS certificates, right to work evidence, professional registration such as NMC or HCPC where it applies, and the qualifications tied to the person's role. Each document is stored against the individual it belongs to, so the full picture for any member of staff sits in one place. Because everything is held per person rather than in a shared folder, the record stays meaningful even as your team changes. A new manager or nominated individual can open any individual and see exactly which credentials you hold and their current status, without inheriting a paper trail."
      },
      {
        "question": "How do the expiry alerts work?",
        "answer": "When you upload a time-limited document, you record its expiry or renewal date. From then on, CareStream tracks that date in the background and sends you an alert ahead of the deadline, so you are prompted while there is still time to arrange a renewal rather than after a gap has already opened. This is the difference between staying ahead and being caught out. Instead of relying on a spreadsheet or someone's memory, the platform does the watching and brings the reminder to you, which keeps your recruitment and employment records complete without constant manual checking."
      },
      {
        "question": "Does this help with CQC inspection readiness?",
        "answer": "Yes. The safe and well-led quality statements expect you to show that the right checks were carried out and that they remain current. Storing DBS, right to work, registration and qualification documents in one place, with their dates tracked, means you can produce the evidence for any individual immediately when it is asked for. Just as importantly, the alerts reduce the underlying risk that an inspector is worried about, which is someone working on an expired or missing check. By keeping credentials current before they lapse, you strengthen your safer recruitment story rather than scrambling to explain a gap on the day."
      },
      {
        "question": "What happens when a document is renewed?",
        "answer": "When a fresh document arrives, you simply upload the new version against the same person and record its new expiry date. The record updates cleanly, so the individual's credential status always reflects the current, valid document rather than the one that lapsed. This keeps the history tidy and the picture accurate. Over time you build a clear, per-person record of current credentials that you can rely on for both day-to-day management and inspection, without ever having to dig through old paperwork to work out what is actually in force."
      },
      {
        "question": "How does benchmarking between homes actually work?",
        "answer": "The group console assesses every home on the same compliance and training measures, then lines the sites up so they can be compared directly. Rather than reading a separate report for each service, you see them side by side, which makes it easy to tell which homes are ahead and which are falling behind. Because the comparison uses consistent measures, the differences you see reflect real performance rather than different reporting styles. That is what lets head office move quickly from noticing an outlier to directing support where it is genuinely needed."
      },
      {
        "question": "Do I still need to log into each home separately?",
        "answer": "No. The point of the group console is to remove that. Compliance and training data from every service flows into a single head office view, so you get your whole portfolio in one place instead of juggling separate logins and chasing individual managers for updates. This is where oversight usually breaks down in a group, because a struggling home is easy to overlook when its numbers sit in a separate system. Bringing everything together means the services that need attention surface on their own."
      },
      {
        "question": "Can the console help me share good practice across the group?",
        "answer": "Yes. Benchmarking does not only highlight the homes that are struggling, it also shows you which services are performing strongly. That makes it straightforward to identify what your best homes are doing and spread those lessons across the rest of the group. Over time this helps you lift the whole portfolio rather than only firefighting the weakest site, because head office can see both where support is needed and where good practice worth copying already exists."
      },
      {
        "question": "Is the group console useful for CQC oversight across our services?",
        "answer": "Very much so. CQC expects providers running multiple services to have genuine oversight of every one, with consistent standards and clear evidence that head office is monitoring quality. A benchmarked, portfolio-wide view of compliance and training is exactly that kind of evidence. It shows a nominated individual or quality director can see how each home is performing, compare them fairly and direct support where it is needed, which demonstrates the consistent, well-led oversight inspectors look for across a group."
      }
    ],
    "sort": 109
  }
]
