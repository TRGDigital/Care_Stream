// The wording of the staff incentive emails, kept apart from the sending so a preview can use exactly the same text.
// British English, no dashes.

import { EVENTS } from './logic'
import type { EmailBlock } from '../email/outbound'

export const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`
export const monthName = (m: string) => {
  const [y, mo] = m.split('-').map(Number)
  return y && mo ? new Date(Date.UTC(y, mo - 1, 1)).toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' }) : m
}

export interface Mail { subject: string; heading: string; body: EmailBlock[]; buttonLabel: string }

export function launchMail(c: { name: string; month: string; rules: Array<{ event: string; points: number }>; rewards: Array<{ title: string; target_points: number; quantity: number | null }> }): Mail {
  const limited = c.rewards.some(r => r.quantity != null)
  return {
    subject: `New staff incentive: ${c.name}`, heading: 'A new staff incentive has started', buttonLabel: 'See my incentives',
    body: [
      { p: `${c.name} is open for ${monthName(c.month)}. You earn points when you look after your training, and reaching a target wins you a reward.` },
      { h: 'How you earn points' },
      { list: c.rules.map(r => ({ text: (EVENTS.find((e: any) => e.key === r.event)?.label ?? r.event), note: `+${r.points}` })) },
      { h: 'The rewards' },
      { list: c.rewards.map(r => ({ text: r.title, note: `${plural(r.target_points, 'point', 'points')}${r.quantity != null ? `, first ${r.quantity}` : ''}` })) },
      ...(limited ? [{ p: 'Some rewards have limited places. They go to the people who reach the target first, so the sooner you finish your training, the better your chance.' }] : []),
      { p: 'You can see your own points in the hub at any time. Nobody else can see them.' },
    ],
  }
}

export function pointsMail(c: { name: string; total: number; fresh: Array<{ label: string; points: number }>; next: { title: string; target: number } | null }): Mail {
  const shown = c.fresh.slice(-5)
  return {
    subject: `You have ${plural(c.total, 'point', 'points')} in ${c.name}`, heading: 'You have earned points', buttonLabel: 'See my points',
    body: [
      { p: `You now have ${plural(c.total, 'point', 'points')} in ${c.name}.` },
      { h: 'New since we last wrote' },
      { list: shown.map(l => ({ text: l.label, note: `+${l.points}` })) },
      ...(c.fresh.length > shown.length ? [{ p: `And ${c.fresh.length - shown.length} more.` }] : []),
      { p: c.next ? `You are ${plural(c.next.target - c.total, 'point', 'points')} away from ${c.next.title}.` : 'You have reached every reward target. A care manager will approve your rewards next.' },
    ],
  }
}

export function winnerMail(c: { name: string; org: string; won: string[] }): Mail {
  return {
    subject: `Well done: you earned a reward in ${c.name}`, heading: 'Well done, you earned a reward', buttonLabel: 'See my incentives',
    body: [
      { p: `${c.name} has finished, and you reached:` },
      { list: c.won },
      { h: 'What happens next' },
      { p: `A care manager approves each reward, then ${c.org} will give it to you.` },
      { p: 'Thank you for keeping your training up to date. A new incentive will launch soon.' },
    ],
  }
}

export function thanksMail(c: { name: string; points: number; outstanding: number }): Mail & { toTraining: boolean } {
  const first = c.points > 0
    ? `${c.name} has finished. You earned ${plural(c.points, 'point', 'points')}, but this time you did not reach a reward, and some places went to colleagues who got there first.`
    : `${c.name} has finished, and you did not earn any points this time.`
  return {
    subject: `Thank you for taking part in ${c.name}`, heading: 'Thank you for taking part', toTraining: c.outstanding > 0,
    buttonLabel: c.outstanding > 0 ? 'Open my training' : 'See my incentives',
    body: [
      { p: first },
      { p: 'Thank you for the effort you put in.' },
      ...(c.outstanding > 0
        ? [{ h: 'Your training' }, { p: `You have ${plural(c.outstanding, 'training module', 'training modules')} waiting for you. Finishing them keeps you and the people we support safe, and it is the quickest way to earn points next time.` }]
        : [{ p: 'Keeping your training up to date is the quickest way to earn points next time.' }]),
      { h: 'What is next' },
      { p: 'A new incentive will launch soon, so there is a fresh chance to earn.' },
    ],
  }
}
