// What has been released, newest first, in plain English. Add a new entry at the TOP when something goes live; the id is its date and a
// new id lights the dot on the support menu until the person opens the Releases page. Only list what is genuinely live.
export interface Release { id: string; date: string; title: string; summary: string; items: string[] }

export const RELEASES: Release[] = [
  {
    id: '2026-11-24',
    date: '24 November 2026',
    title: 'Support menu, a personal greeting and voice notes from families',
    summary: 'A support menu at the top of every page, a greeting on your dashboard, and a new way for families to share.',
    items: [
      'A support menu in the header: the help centre, these release notes, a way to report a bug, a way to suggest a feature, and how to contact us.',
      'Your dashboard now greets you by name with the date, your home and your role, with a small icon for your type of service.',
      'Families can now record a voice note of up to two minutes from their invitation link, as well as written answers, photos and a video. Voice notes wait for a manager to approve them before staff can hear them.',
      'The invitation and reminder emails to families now come from the manager who sent them, with your organisation logo at the top, so families know who is asking.',
      'The family page has four clear buttons that take people straight to written answers, photos, a video or a voice note.',
      'The free audit library now has 124 audits, including 19 new audits for home care, each with its own page. Pictures for the audit cards are being added.',
    ],
  },
  {
    id: '2026-11-23',
    date: '23 November 2026',
    title: 'Shared tablets with a personal PIN, and emails that show who they are from',
    summary: 'Carers can use CareStream on a tablet in a staff area without a personal phone, and staff emails are redesigned.',
    items: [
      'Shared tablets on Starter, Professional and Enterprise: put a tablet in a staff area, and each carer signs in with their own PIN to get their own hub. Entering a PIN counts as a sign in on their record.',
      'You add tablets, print a connect poster with your logo, and send, resend or regenerate PINs from the Staff page.',
      'Emails to staff now show the manager they are from, with their picture and role, and your organisation logo above the title.',
      'The workforce compliance register now records NMC registration, date of birth with birthday emails, a contract upload, holiday entitlement, emergency contacts, driving details and visa end dates.',
    ],
  },
  {
    id: '2026-11-21',
    date: '21 November 2026',
    title: 'Photos and video messages from families',
    summary: 'Families can add photos and short video messages to a resident\'s This is me profile.',
    items: [
      'Photos and video messages sent through the family link wait for a manager to approve them. Only approved ones are shown to staff.',
      'Videos can be turned into text, and into English if they are in another language, to help a manager decide.',
    ],
  },
]

export const NEWEST_RELEASE_ID = RELEASES[0]?.id ?? null
