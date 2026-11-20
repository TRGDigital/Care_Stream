// The wording of the family reminder email, in one place so it is tested. Plain service email: warm, short, no marketing.
//
// Video upload is not live yet, so the email must not mention video. Switch this on in the same release that turns family video on.
export const REMINDER_OFFERS_VIDEO = false

export function reminderCopy(o: { residentName: string; homeName: string; days: number }, offersVideo: boolean = REMINDER_OFFERS_VIDEO) {
  const what = offersVideo ? 'a few words, a photo or a short video message' : 'a few words or a photo'
  return {
    subject: `Something for ${o.residentName}?`,
    intro: `It is ${o.homeName} here. If you have a few minutes, would you like to share ${what} for ${o.residentName}? Little things from the people who know them best make a real difference to their day.`,
    what,
    review: `Whatever you send is read by the manager at ${o.homeName} first, and only shared with the care team once they have approved it.`,
    button: `Share something for ${o.residentName}`,
    expiry: `This link is just for you and stops working after ${o.days} days.`,
    stop: 'Stop these reminders',
    stopLead: `You are getting this because ${o.homeName} invited you to share about ${o.residentName}.`,
  }
}
