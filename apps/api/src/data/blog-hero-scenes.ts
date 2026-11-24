// Hero illustrations for blog posts that were saved as drafts without one. generateBlogHeroes() (cron /cron/generate-blog-heroes) makes a picture, in the
// same house style as every other site illustration, ONLY for the slugs listed here and ONLY when the post has no hero yet, so it can never replace or touch
// any other post. Add a slug here (with a plain scene) to give another draft its hero.
export interface BlogHeroScene { slug: string; topic: string; scene: string; alt: string }

export const BLOG_HERO_SCENES: BlogHeroScene[] = [
  { slug: 'care-plan-audit-template', topic: 'A care plan audit worked through section by section',
    scene: 'A registered manager and a senior carer sit side by side at a table with a care plan folder open between them, pen in hand, going through it section by section, a cup of tea nearby.',
    alt: 'A registered manager and a senior carer working through a care plan folder together at a table' },
  { slug: 'coshh-data-sheet', topic: 'COSHH data sheets in a care service',
    scene: 'A carer in a tidy cleaning store room holds a folder of data sheets and checks a product label against it, shelves of clearly labelled cleaning products behind her.',
    alt: 'A carer in a cleaning store room checking a product label against a folder of data sheets' },
  { slug: 'mobile-phone-policy-care-home-shared-tablets', topic: 'Shared tablets in a care home with a phone ban',
    scene: 'In a care home staff area, a carer enters a four digit PIN on a shared tablet on a wall bracket while a colleague waits behind her, personal phones left in a locker in the background.',
    alt: 'A carer entering a PIN on a shared tablet in a care home staff area while a colleague waits' },
  { slug: 'dbs-tracker-for-care-homes', topic: 'A DBS tracker for care homes',
    scene: 'A registered manager at an office desk checks a staff file and a certificate against a laptop showing a simple tracker, a wall calendar behind her.',
    alt: 'A registered manager checking a staff file and certificate against a tracker on a laptop' },
]
