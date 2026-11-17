// One email address can belong to only one account at a time (sign in looks people up by email). Homes often use a shared
// address such as enquiries@ for whoever holds a role, so when a person leaves and their account is deactivated ("archived"),
// the account keeps everything it ever did (training, audits, supervisions, chats) but gives up the address, so the next
// person can use it. The old address is kept recognisable inside the new one so the account can be restored:
//   enquiries@home.co.uk  ->  enquiries+archived-1a2b3c4d@home.co.uk
// A plus address delivers to the same mailbox, so nothing is lost if something ever emails the old account by mistake.

const ARCHIVED = /^(.*)\+archived-[0-9a-f]{8}(@[^@]+)$/i

export const isArchivedEmail = (email: string): boolean => ARCHIVED.test(email)

/** The address an archived account gave up, or the address itself if it is not archived. */
export function originalEmail(email: string): string {
  const m = ARCHIVED.exec(email)
  return m ? `${m[1]}${m[2]}` : email
}

/** The address to give an account that is being archived. Stable for the same account, unique per account. */
export function archivedEmail(email: string, userId: string): string {
  if (isArchivedEmail(email)) return email
  const at = email.lastIndexOf('@')
  if (at < 1) return email
  const tag = userId.replace(/[^0-9a-f]/gi, '').slice(0, 8).toLowerCase().padEnd(8, '0')
  return `${email.slice(0, at)}+archived-${tag}${email.slice(at)}`
}
