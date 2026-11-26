// Replacing a person's name in some wording: the whole name only, never inside another word, every occurrence. The same rule the server uses (api lib/other-names.ts), so what the screen
// counts and swaps is what the server would. Case sensitive on purpose: a name that is also an ordinary word (Bill, Grace) must not rewrite real sentences.

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
export const wholeNameRegex = (name: string): RegExp => new RegExp(`(?<![\\p{L}\\p{N}'’-])${escapeRe(name)}(?![\\p{L}\\p{N}-])`, 'gu')
export const countName = (text: string, name: string): number => (text.match(wholeNameRegex(name)) ?? []).length
export const replaceWholeName = (text: string, from: string, to: string): string => text.replace(wholeNameRegex(from), () => to)
