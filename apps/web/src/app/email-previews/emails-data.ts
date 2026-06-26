// Onboarding email drip content — plan-specific sequences for new clients.
// One feature per email, benefit-led, working-day cadence. House style: no dashes.
// Sending automation is a later phase; this data drives the preview gallery.

export type PlanKey = 'starter' | 'professional' | 'enterprise'

export interface EmailStep { title: string; body: string }

export interface OnboardingEmail {
  subject:    string
  preheader:  string
  headline:   string
  intro:      string[]      // benefit-led paragraphs
  steps:      EmailStep[]   // how to, 2-3 steps
  tip?:       string
  ctaLabel:   string
  ctaHref:    string
  badge?:     string        // e.g. "Professional feature"
  where?:     string        // "where to click" guidance shown with the screenshot
  imageSrc?:  string        // real platform screenshot (added once captured)
}

export interface Sequence {
  plan:   PlanKey
  label:  string
  price:  string
  blurb:  string
  emails: OnboardingEmail[]
}

interface PlanMeta { name: string; allocSentence: string; allocStep: string }

const META: Record<PlanKey, PlanMeta> = {
  starter: {
    name: 'Starter',
    allocSentence: 'Your plan includes 10 training allocations every month, where one allocation is one module for one staff member.',
    allocStep: 'Assign it to one person or your whole team. One allocation covers one module for one staff member, and your pool refreshes every month.',
  },
  professional: {
    name: 'Professional',
    allocSentence: 'Your plan includes 30 training allocations every month, where one allocation is one module for one staff member.',
    allocStep: 'Assign it to one person or your whole team. One allocation covers one module for one staff member, and your pool refreshes every month.',
  },
  enterprise: {
    name: 'Enterprise',
    allocSentence: 'Your plan includes unlimited training allocations, so you can train your whole team as often as you like.',
    allocStep: 'Assign it to one person or your whole team. With unlimited allocations you can train as widely and as often as you need.',
  },
}

// ── Shared core emails (1 to 11), tailored per plan where noted ────────────────
function coreEmails(plan: PlanKey): OnboardingEmail[] {
  const m = META[plan]
  return [
    {
      subject:   'Welcome to CareStream. Let us get your first answer today.',
      preheader: 'Ask one real question and see how it works. It takes about two minutes.',
      headline:  'Your team’s questions, answered from your own policies',
      intro: [
        'Welcome aboard. CareStream turns your policies and procedures into instant, plain-English answers your staff can get on shift, in seconds, without digging through a folder or waiting for a manager.',
        'The fastest way to feel the value is to ask it something real. Pick a question your team actually asks, and watch CareStream answer from your documents.',
      ],
      steps: [
        { title: 'Open the Chat Hub', body: 'Sign in and head to the Chat Hub. This is the same place your staff will use.' },
        { title: 'Ask a real question', body: 'Try something practical, like how to report a fall, or what your visiting policy says. Use your own words.' },
        { title: 'Check the citation', body: 'Every answer shows which policy it came from, so you can trust it and see the source at a glance.' },
      ],
      tip: 'No policies uploaded yet? That is tomorrow. For now, ask a general care question to see the style of answer your team will get.',
      ctaLabel: 'Ask your first question',
      ctaHref:  '/chat',
    },
    {
      subject:   'Upload your policies once, answer questions forever',
      preheader: 'Drag in your policy documents and CareStream does the reading for you.',
      headline:  'Turn your policy folder into instant answers',
      intro: [
        'CareStream is only as good as the documents behind it, and the good news is that getting them in takes minutes, not days. Upload your policies, procedures and handbooks, and CareStream reads every page so your staff never have to.',
        'You can bring in a whole folder at once, and CareStream keeps each document versioned, so you always have a clear record of what was in force and when. Inspectors love that.',
      ],
      steps: [
        { title: 'Go to Policies', body: 'Open the Policies page and choose Upload. PDF and Word files are both fine.' },
        { title: 'Add them in bulk', body: 'Select a whole batch at once and group them by section, such as safeguarding or infection control, so your library stays tidy.' },
        { title: 'Let it process', body: 'CareStream extracts and indexes the content automatically. Once a policy is active, the AI can answer from it straight away.' },
      ],
      tip: 'Start with your ten most-referenced policies. You will cover the bulk of day-to-day questions immediately, and can add the rest over time.',
      ctaLabel: 'Upload your policies',
      ctaHref:  '/policies',
    },
    {
      subject:   'Why CareStream’s answers are ones you can trust',
      preheader: 'It only answers from your content. Never made up, always cited.',
      headline:  'Answers grounded in your policies, not the open internet',
      intro: [
        'In care, a confident but wrong answer is worse than no answer. That is why CareStream only ever answers from the documents you have given it, and shows the source for every reply.',
        'Behind the scenes it builds a private knowledge base from your policies: a searchable set of questions and answers unique to your service. You can review it, and add your own entries for the things that live in people’s heads rather than in a document.',
      ],
      steps: [
        { title: 'Open the Knowledge Base', body: 'See the questions and answers CareStream has drawn from your policies.' },
        { title: 'Add local knowledge', body: 'Capture the things staff always ask but that are not written down, like who holds the spare keys or your local GP process.' },
        { title: 'Keep it yours', body: 'Your data is isolated to your service and never used to train AI models or shared with anyone else.' },
      ],
      tip: 'If an answer ever looks thin, it usually means a policy is missing. Later in this series we will show you how to find exactly what to add.',
      ctaLabel: 'Review your knowledge base',
      ctaHref:  '/knowledge',
    },
    {
      subject:   'Bring your team into CareStream',
      preheader: 'Add your staff so answers and training are personal to each of them.',
      headline:  'Set your team up in minutes',
      intro: [
        'CareStream works best when your whole team is on it. Adding staff lets you assign training, track who has read what, and personalise answers to each person’s role and language.',
        'There are no per-user fees, so add everyone, from your registered manager to your newest care assistant.',
      ],
      steps: [
        { title: 'Go to Staff', body: 'Open the Staff page and add each team member with their name, email and role.' },
        { title: 'Set their language', body: 'Choose each person’s first language so they get answers and training in the language they think in.' },
        { title: 'Grant access where needed', body: 'Make other managers admins, or give senior staff audit access, in a couple of clicks.' },
      ],
      tip: 'Adding a staff member’s email automatically lets them ask questions by email too. There is no second setup step.',
      ctaLabel: 'Add your team',
      ctaHref:  '/staff',
    },
    {
      subject:   'Three ways your staff can ask, no app required',
      preheader: 'Chat, email or voice, whatever suits the moment on shift.',
      headline:  'Meet your team where they are',
      intro: [
        'Care staff are rarely at a desk. CareStream gives them three ways to get an answer, so help is always within reach whatever they are doing.',
        'Every channel draws on the same policies and gives the same trusted, cited answers. Your team simply picks whichever is easiest in the moment.',
      ],
      steps: [
        { title: 'Chat Hub', body: 'A simple web page they can pin to their phone. Type a question, get an instant written answer. Best for detail.' },
        { title: 'Email', body: 'Staff email a question to your dedicated address and the AI replies to their inbox. Great for non-urgent queries.' },
        { title: 'Voice', body: 'Staff speak their question and hear the answer back. Ideal for carers on the move with their hands full.' },
      ],
      tip: 'Mention all three channels in your next team meeting. Adoption jumps once staff realise they can just talk to it.',
      ctaLabel: 'See your channels in Settings',
      ctaHref:  '/settings',
    },
    {
      subject:   'Put CareStream in your team’s pocket',
      preheader: 'A phone-friendly hub your staff open in one tap. No password faff.',
      headline:  'The staff hub, always one tap away',
      intro: [
        'The CareStream hub is designed for a phone on a busy shift. Staff can add it to their home screen and open it like any app, with no download from an app store and no password to forget.',
        'Less friction means more use, and more use means a team that reaches for guidance instead of guessing.',
      ],
      steps: [
        { title: 'Share the hub link', body: 'Send your team the hub address, or let them tap the link in their welcome email.' },
        { title: 'Add to home screen', body: 'On any phone they can save it to the home screen so it opens full-screen like an app.' },
        { title: 'Passwordless sign-in', body: 'Staff sign in with a simple link, so there is nothing to memorise and nothing to reset.' },
      ],
      tip: 'A pinned hub icon is the single biggest driver of staff engagement we see. Worth a thirty-second demo in handover.',
      ctaLabel: 'Open the hub',
      ctaHref:  '/chat',
    },
    {
      subject:   'Every answer, in the language your carer thinks in',
      preheader: 'More than 50 languages, set per staff member, no extra work for you.',
      headline:  'Care is clearer in your team’s first language',
      intro: [
        'Many care teams are beautifully multilingual, but policies usually are not. CareStream answers and trains each staff member in their own first language, automatically, so nothing is lost in translation.',
        'You write and upload your policies once, in English. Each staff member receives answers and training in the language you have set for them, across more than 50 supported languages.',
      ],
      steps: [
        { title: 'Set each person’s language', body: 'On the Staff page, choose a first language for each team member.' },
        { title: 'Let them switch if they want', body: 'Staff can also pick a language on their own device for any answer.' },
        { title: 'Add a language if it is missing', body: 'In Settings, add any language your team speaks and it appears straight away.' },
      ],
      tip: 'Training completed in a carer’s first language sticks far better, and the assessment is fairer too.',
      ctaLabel: 'Set your team’s languages',
      ctaHref:  '/staff',
    },
    {
      subject:   'Annual training that staff actually remember',
      preheader: 'Scenario-based lessons, an assessment, and a certificate, in the hub.',
      headline:  'Training that teaches, not just ticks a box',
      intro: [
        `A single renewal date does little for day-to-day knowledge. CareStream’s annual training modules teach through real care scenarios, then assess, so the learning sticks long after the certificate prints. ${m.allocSentence}`,
        'Each module is a short interactive lesson built around situations your staff actually meet, followed by a multiple-choice assessment. Pass, and CareStream issues a dated certificate as evidence.',
      ],
      steps: [
        { title: 'Pick a module', body: 'Choose from the library or generate one tailored to your own policies.' },
        { title: 'Allocate to staff', body: m.allocStep },
        { title: 'Track completion', body: 'Watch progress in real time and see every answer, with certificates stored automatically.' },
      ],
      tip: 'Spread your allocations across the team over the year so everyone gets a fresh, relevant module when it matters.',
      ctaLabel: 'Explore training modules',
      ctaHref:  '/training',
    },
    {
      subject:   'Your statutory training, ready to go',
      preheader: 'Safeguarding, fire safety, manual handling and more, out of the box.',
      headline:  'The mandatory modules, already built',
      intro: [
        'You should not have to build safeguarding training from scratch. CareStream ships with a standard library covering the statutory and mandatory topics your setting needs, ready to assign today.',
        'Each module is written for the care sector and kept current, so you can evidence the essentials without lifting a pen.',
      ],
      steps: [
        { title: 'Browse the library', body: 'Open Training and look through the ready-made standard modules for your type of service.' },
        { title: 'Assign the essentials', body: 'Allocate safeguarding, fire safety, infection control, manual handling and the rest to the right people.' },
        { title: 'Set renewals', body: 'CareStream reminds staff before each module is due, so nothing lapses.' },
      ],
      tip: 'Mix standard modules with ones generated from your own policies for training that is both compliant and specific to your home.',
      ctaLabel: 'Browse the training library',
      ctaHref:  '/training',
    },
    {
      subject:   'Turn wrong answers into a stronger team',
      preheader: 'CareStream spots where knowledge is weak and helps you close it.',
      headline:  'See exactly where your team needs support',
      intro: [
        'Every training question a staff member gets wrong is a small signal. CareStream gathers those signals so you can act on them, instead of finding out at inspection.',
        'When someone answers incorrectly, CareStream can follow up to reinforce the learning, and flags it for you to review. You always know who needs a quiet word, and on what.',
      ],
      steps: [
        { title: 'Check Needs follow-up', body: 'Your dashboard highlights staff with unreviewed gaps, so you can reinforce learning where it counts.' },
        { title: 'Review the detail', body: 'Open a staff record to see the exact question, their answer, and the correct one.' },
        { title: 'Reinforce as a team', body: 'See the most-missed questions so you know what to cover in supervision and team meetings.' },
      ],
      tip: 'Five minutes a week on follow-up does more for real competence than any once-a-year course.',
      ctaLabel: 'See who needs follow-up',
      ctaHref:  '/dashboard',
    },
    {
      subject:   'Give every new starter a flawless first week',
      preheader: 'Build an induction once, and CareStream runs it for every new hire.',
      headline:  'Induction that runs itself',
      intro: [
        'First impressions set the tone, and inconsistent inductions are a common inspection finding. CareStream lets you build a structured induction once, then runs it automatically for every new starter.',
        'Assign the policies they must read and the questions they must answer, and CareStream tracks completion and nudges anything outstanding, giving you a clean evidence trail for each person.',
      ],
      steps: [
        { title: 'Build a flow', body: 'Open Onboarding and create an induction: the policies to read and the questions to answer.' },
        { title: 'Assign to new starters', body: 'Apply it to each new hire. They work through it in the hub, in their own language.' },
        { title: 'Track and evidence', body: 'See who has completed what, with a record ready for CQC.' },
      ],
      tip: 'Build one core induction plus a short role-specific add-on for nurses or seniors, and reuse them forever.',
      ctaLabel: 'Build your induction',
      ctaHref:  '/onboarding',
    },
  ]
}

// ── Reusable feature emails ────────────────────────────────────────────────────
const CQC_REPORT_CHAT: OnboardingEmail = {
  subject:   'Ask your last CQC report anything',
  preheader: 'Upload your inspection report and interrogate it in plain English.',
  headline:  'Your CQC report, finally easy to work with',
  intro: [
    'Your inspection report holds your improvement actions, but it is long and easy to lose track of. Upload it to CareStream and you can simply ask it what you need to know.',
    'Ask what the inspectors said about medicines, or what your must-dos were, and get a straight answer with the source, so your action plan stays grounded in what was actually written.',
  ],
  steps: [
    { title: 'Upload your report', body: 'On Policies, choose the CQC Report category and upload your latest inspection report.' },
    { title: 'Ask it questions', body: 'Use CQC Report Chat to ask about findings, ratings and required actions in plain English.' },
    { title: 'Share with the team', body: 'Turn findings into clear, role-specific guidance your staff can actually act on.' },
  ],
  tip: 'Revisit your report monthly with a few questions to keep your action plan alive between inspections.',
  ctaLabel: 'Open CQC Report Chat',
  ctaHref:  '/cqc',
}

const ADVANCED_ANALYTICS: OnboardingEmail = {
  subject:   'See how your whole service is really using CareStream',
  preheader: 'Trends, peak times and the topics your team asks about most.',
  headline:  'The patterns behind the day-to-day',
  badge: 'Professional feature',
  intro: [
    'Your plan unlocks advanced analytics: a richer view of how knowledge moves through your service, so you can lead with evidence rather than gut feel.',
    'Spot when usage peaks, which topics dominate, which languages your team queries in, and how engagement is trending, all in a few clear charts.',
  ],
  steps: [
    { title: 'Open Analytics', body: 'Head to the Analytics page and explore the advanced tabs.' },
    { title: 'Read the trends', body: 'Look for rising topics and quiet channels. A spike often means a new starter or a recent incident.' },
    { title: 'Act on it', body: 'Use the most-asked topics to shape supervision, team meetings and your next training round.' },
  ],
  tip: 'Share one insight a month with your team. It shows the tool is working and keeps engagement high.',
  ctaLabel: 'Open Analytics',
  ctaHref:  '/analytics',
}

const CQC_EVIDENCE: OnboardingEmail = {
  subject:   'Inspection evidence, generated in one click',
  preheader: 'Turn everyday CareStream use into a structured CQC evidence pack.',
  headline:  'Walk into inspection already prepared',
  badge: 'Professional feature',
  intro: [
    'Every question answered, every module completed and every gap closed is evidence that your service is well led. Your plan turns all of it into a structured Inspection Evidence Report on demand.',
    'Instead of scrambling before an inspection, you generate a clear, dated report that shows staff engaging with policies, completing training and improving over time.',
  ],
  steps: [
    { title: 'Open the report', body: 'Go to Analytics and choose the CQC Inspection Evidence Report.' },
    { title: 'Pick your date range', body: 'Generate evidence for any period, for example the last twelve months.' },
    { title: 'Export and share', body: 'Download a polished PDF to share with your team or hand to an inspector.' },
  ],
  tip: 'Generate it quarterly and skim it. It doubles as a quality-assurance review of your own service.',
  ctaLabel: 'Generate your evidence report',
  ctaHref:  '/analytics/cqc-report',
}

const POLICY_GAPS: OnboardingEmail = {
  subject:   'Find the gaps before an inspector does',
  preheader: 'See which CQC regulations your policies cover, and which they do not.',
  headline:  'Know exactly where your policies fall short',
  badge: 'Professional feature',
  intro: [
    'You cannot fix a gap you cannot see. Policy gap detection maps your policies against CQC regulations and the questions your staff actually ask, then shows you precisely where coverage is thin.',
    'It is the difference between hoping you are covered and knowing you are, with a clear list of what to write or upload next.',
  ],
  steps: [
    { title: 'Open Policy Gaps', body: 'Go to the Policy Gaps page to see your coverage at a glance.' },
    { title: 'Read the gaps', body: 'See which regulations are covered, partial or missing, plus the staff questions no policy answered.' },
    { title: 'Close them', body: 'Prioritise the items flagged red and upload or write the missing guidance.' },
  ],
  tip: 'Re-run this after every batch of policy updates to keep your coverage score climbing.',
  ctaLabel: 'Check your policy gaps',
  ctaHref:  '/gaps',
}

function faceToFace(closing: 'pro' | 'enterprise'): OnboardingEmail {
  return {
    subject:   'Bring your in-person training into one clear view',
    preheader: 'Log face-to-face sessions and see all training in a single matrix.',
    headline:  'One compliance picture, digital and in-person',
    badge: 'Professional feature',
    intro: [
      'Not all training happens on a screen. Your plan lets you record face-to-face sessions, mark attendance, and see them alongside digital modules in a single training matrix.',
      'No more cross-referencing a spreadsheet with the system. One view shows you who is compliant, who is due, and who was absent, across every kind of training.',
      ...(closing === 'pro'
        ? ['That completes your Professional tour. If you ever want to prove that training is changing practice on the floor, the Enterprise plan adds your own custom audits and the Training Impact view that links the two. We are always here to help.']
        : []),
    ],
    steps: [
      { title: 'Record a session', body: 'On the Face-to-face tab, log a session, the topic and who attended.' },
      { title: 'Mark attendance', body: 'Tick off who came and who needs to catch up, in seconds.' },
      { title: 'Read the matrix', body: 'See every staff member against every module, digital and in-person, in one grid.' },
    ],
    tip: 'Use the matrix in supervision. A single screen answers "where am I with training?" for any team member.',
    ctaLabel: closing === 'pro' ? 'Open Face-to-face training' : 'Open Face-to-face training',
    ctaHref:  '/training',
  }
}

const BUILD_AUDITS: OnboardingEmail = {
  subject:   'Audits shaped around your home, not a template',
  preheader: 'Create your own audits in minutes and assign them to your team.',
  headline:  'Your service, your audits',
  badge: 'Enterprise feature',
  intro: [
    'Generic audit templates rarely fit a real home. Your Enterprise plan lets you build your own audits from scratch, with exactly the questions that matter to your service.',
    'Design an audit once, allocate it to the right staff, and have it appear in their hub, ready to complete on a phone as they walk the floor.',
  ],
  steps: [
    { title: 'Build an audit', body: 'On the Audits page, choose Build your own audit and add your questions and sections.' },
    { title: 'Set the response type', body: 'Pick yes/no, yes/no/N/A, findings or free text per question to suit what you are checking.' },
    { title: 'Allocate it', body: 'Assign it to staff with audit access and it shows up in their hub to complete.' },
  ],
  tip: 'Start by recreating your most-used paper audit. You will never go back to the clipboard.',
  ctaLabel: 'Build your first audit',
  ctaHref:  '/audits',
}

const EFFECTIVENESS: OnboardingEmail = {
  subject:   'Proof that your training is actually working',
  preheader: 'Move beyond completion rates to real evidence of learning.',
  headline:  'From "they did it" to "it worked"',
  badge: 'Enterprise feature',
  intro: [
    'Completion is not competence. The Effectiveness of Training view shows whether your training is genuinely improving knowledge across the team, using data CareStream already holds.',
    'See how staff perform before and after, where knowledge is strengthening, and which topics need another pass, mapped to recognised levels of learning.',
  ],
  steps: [
    { title: 'Open Effectiveness', body: 'On Analytics, open the Effectiveness of Training tab.' },
    { title: 'Read the signals', body: 'Look at assessment scores, follow-up resolution and confidence over time.' },
    { title: 'Target your effort', body: 'Double down where learning is weak, and celebrate where it is strong.' },
  ],
  tip: 'Bring this view to your governance meeting. It reframes training from a cost to a measurable improvement.',
  ctaLabel: 'Open Effectiveness of Training',
  ctaHref:  '/analytics',
}

const TRAINING_IMPACT: OnboardingEmail = {
  subject:   'Close the loop: from training to real-world practice',
  preheader: 'Link audits to training and see the impact on the floor.',
  headline:  'Prove training changes what happens in care',
  badge: 'Enterprise feature',
  intro: [
    'The ultimate question is whether training changes practice. By linking your audits to the training behind them, the Training Impact view shows audit compliance moving alongside training completion over time.',
    'It is the closed loop that providers and inspectors dream of: train the team, audit the practice, and see the connection in one chart.',
  ],
  steps: [
    { title: 'Link a training module', body: 'On an audit, use Linked training to connect the modules it measures.' },
    { title: 'Keep auditing', body: 'Run the audit as usual. CareStream tracks compliance over time.' },
    { title: 'See the impact', body: 'Open Training Impact to watch audit scores rise as training completes.' },
  ],
  tip: 'Pick one high-stakes area, like medication or moving and handling, and make it your first closed loop.',
  ctaLabel: 'Open Training Impact',
  ctaHref:  '/analytics',
}

// ── Finales ────────────────────────────────────────────────────────────────────
const STARTER_FINALE: OnboardingEmail = {
  subject:   'You are up and running. Here is what is next.',
  preheader: 'A quick recap, plus the features Professional adds when you are ready.',
  headline:  'Look how far you have come',
  intro: [
    'In a short time you have turned your policies into instant answers, brought your team on board across chat, email and voice, and started training that actually sticks. That is a real foundation for a well-led service.',
    'If you want to go further, the Professional plan adds the tools that make inspection genuinely stress-free: advanced analytics, a one-click CQC Inspection Evidence Report, policy gap detection, and face-to-face training with a combined matrix.',
  ],
  steps: [
    { title: 'Revisit your dashboard', body: 'Check engagement and follow-ups, and keep your policy library growing.' },
    { title: 'See what Professional adds', body: 'Compare the plans and the features that take you from organised to inspection-ready.' },
    { title: 'Upgrade in a click', body: 'Upgrades are instant and your data stays exactly as it is.' },
  ],
  tip: 'Most homes feel ready for Professional once their whole team is active and policies are flowing. If that is you, it pays for itself at your next inspection.',
  ctaLabel: 'See what Professional adds',
  ctaHref:  '/billing',
}

const ENTERPRISE_FINALE: OnboardingEmail = {
  subject:   'You have the full platform. Let us make you a power user.',
  preheader: 'A recap of everything you have unlocked, plus your dedicated support.',
  headline:  'Everything CareStream can do, now in your hands',
  intro: [
    'Over the past few weeks you have built a complete picture of a well-led service: instant answers from your policies, a trained and engaged team, custom audits, and the Training Impact view that links it all together.',
    'Enterprise also comes with priority support and a dedicated manager. When you want to push further, with bespoke audits, deeper governance reporting or rolling out across multiple homes, we are right beside you.',
  ],
  steps: [
    { title: 'Make it a habit', body: 'Set a monthly rhythm: review analytics, run an audit, and check Training Impact.' },
    { title: 'Roll it out wider', body: 'Bring more of your team or more of your homes onto CareStream. There are no per-user fees.' },
    { title: 'Talk to your manager', body: 'Have a goal in mind for the next quarter? Your dedicated contact will help you get there.' },
  ],
  tip: 'The homes that get the most from CareStream treat it as their quality-management system, not just a chatbot. You are set up to do exactly that.',
  ctaLabel: 'Open your dashboard',
  ctaHref:  '/dashboard',
}

// "Where to click" guidance, keyed by subject. Shown beside the screenshot so an
// admin knows exactly where to go. Kept separate so it is easy to tweak.
const WHERE: Record<string, string> = {
  'Welcome to CareStream. Let us get your first answer today.': 'In the staff hub, open Chat, type a question in the message box at the bottom, and press the send arrow.',
  'Upload your policies once, answer questions forever': 'In the console, click Policies in the left sidebar, then the Upload document button at the top right.',
  'Why CareStream’s answers are ones you can trust': 'In the console sidebar, click Knowledge Base to review the entries and add your own.',
  'Bring your team into CareStream': 'In the console sidebar, click Staff, then Add staff member at the top right.',
  'Three ways your staff can ask, no app required': 'In the console sidebar, click Settings, then expand the Dedicated email address and Portal access sections.',
  'Put CareStream in your team’s pocket': 'On a phone, open your hub link, tap the browser Share or menu icon, and choose Add to Home Screen.',
  'Every answer, in the language your carer thinks in': 'Console, Staff, open a team member and set their First language. Add new languages under Settings, Languages.',
  'Annual training that staff actually remember': 'In the console sidebar, click Training, open the Modules and Questions tab, then use Allocate to staff.',
  'Your statutory training, ready to go': 'Console, Training, browse the standard library and click Assign on the modules you need.',
  'Turn wrong answers into a stronger team': 'On the Dashboard, find the Needs follow-up panel and click a staff member to review their answers.',
  'Give every new starter a flawless first week': 'In the console sidebar, click Onboarding, then New flow to build an induction.',
  'Ask your last CQC report anything': 'Console, Policies, upload your report with the CQC Report category. Then open CQC Prep in the hub to ask questions.',
  'See how your whole service is really using CareStream': 'In the console sidebar, click Analytics, then explore the Overview and Engagement tabs.',
  'Inspection evidence, generated in one click': 'Console, Analytics, open the CQC Inspection Evidence Report, choose a date range and click Generate.',
  'Find the gaps before an inspector does': 'In the console sidebar, click Policy Gaps under Reporting, then Run analysis.',
  'Bring your in-person training into one clear view': 'Console, Training, open the Face-to-face Training tab, then Add session.',
  'Audits shaped around your home, not a template': 'In the console sidebar, click Audits, then the Build your own audit button.',
  'Proof that your training is actually working': 'Console, Analytics, open the Effectiveness of Training tab.',
  'Close the loop: from training to real-world practice': 'On an audit, use Linked training to connect its modules. Then in Analytics, open the Training Impact tab.',
  'You are up and running. Here is what is next.': 'In the console sidebar, click Billing to compare plans and upgrade in one click.',
  'You have the full platform. Let us make you a power user.': 'In the console sidebar, open your Dashboard for the overview. Your account manager’s contact is in your welcome email.',
}

// Real platform screenshots (captured from a populated Enterprise account),
// keyed by subject. Several emails reuse the same screen.
const IMG = (f: string) => `/email-previews/${f}.png`
const IMAGES: Record<string, string> = {
  'Welcome to CareStream. Let us get your first answer today.': IMG('chat'),
  'Upload your policies once, answer questions forever': IMG('policies'),
  'Why CareStream’s answers are ones you can trust': IMG('knowledge'),
  'Bring your team into CareStream': IMG('staff'),
  'Three ways your staff can ask, no app required': IMG('settings'),
  'Put CareStream in your team’s pocket': IMG('hub-topics'),
  'Every answer, in the language your carer thinks in': IMG('staff-language'),
  'Annual training that staff actually remember': IMG('training'),
  'Your statutory training, ready to go': IMG('training-modules'),
  'Turn wrong answers into a stronger team': IMG('dashboard'),
  'Give every new starter a flawless first week': IMG('onboarding'),
  'Ask your last CQC report anything': IMG('cqc'),
  'See how your whole service is really using CareStream': IMG('analytics'),
  'Inspection evidence, generated in one click': IMG('analytics-cqc-report'),
  'Find the gaps before an inspector does': IMG('gaps'),
  'Bring your in-person training into one clear view': IMG('training-f2f'),
  'Audits shaped around your home, not a template': IMG('audits'),
  'Proof that your training is actually working': IMG('analytics-effectiveness'),
  'Close the loop: from training to real-world practice': IMG('analytics-impact'),
  'You are up and running. Here is what is next.': IMG('billing'),
  'You have the full platform. Let us make you a power user.': IMG('dashboard'),
}

const withWhere = (e: OnboardingEmail): OnboardingEmail => ({
  ...e,
  where:    e.where ?? WHERE[e.subject],
  imageSrc: e.imageSrc ?? IMAGES[e.subject],
})

// ── Compose sequences ──────────────────────────────────────────────────────────
function build(plan: PlanKey): OnboardingEmail[] {
  const core = coreEmails(plan)
  let list: OnboardingEmail[]
  if (plan === 'starter') list = [...core, STARTER_FINALE]
  else if (plan === 'professional') list = [...core, CQC_REPORT_CHAT, ADVANCED_ANALYTICS, CQC_EVIDENCE, POLICY_GAPS, faceToFace('pro')]
  else list = [
    ...core, CQC_REPORT_CHAT, ADVANCED_ANALYTICS, CQC_EVIDENCE, POLICY_GAPS, faceToFace('enterprise'),
    BUILD_AUDITS, EFFECTIVENESS, TRAINING_IMPACT, ENTERPRISE_FINALE,
  ]
  return list.map(withWhere)
}

export const SEQUENCES: Record<PlanKey, Sequence> = {
  starter: {
    plan: 'starter', label: 'Starter', price: '£49/month',
    blurb: '12 emails over about two and a half working weeks. Core platform, allocations of 10 a month, and a soft route to Professional.',
    emails: build('starter'),
  },
  professional: {
    plan: 'professional', label: 'Professional', price: '£129/month',
    blurb: '16 emails over about three working weeks. The full core plus advanced analytics, CQC evidence, gap detection and face-to-face training.',
    emails: build('professional'),
  },
  enterprise: {
    plan: 'enterprise', label: 'Enterprise', price: '£211.99/month',
    blurb: '20 emails over about four working weeks. Everything, plus your own audits, Effectiveness of Training and the Training Impact closed loop.',
    emails: build('enterprise'),
  },
}

export const PLAN_ORDER: PlanKey[] = ['starter', 'professional', 'enterprise']
