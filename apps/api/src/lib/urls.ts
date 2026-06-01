import { Request } from 'express'

// Builds the public URL for a stored blog image key (blog/images/<uuid>.<ext>),
// served via GET /public/blog/image/:file. Derived from the incoming request's
// host so it is correct across the API's aliases.
export function blogImagePublicUrl(req: Request, key: string): string {
  const file = key.split('/').pop()
  return `${req.protocol}://${req.get('host')}/public/blog/image/${file}`
}
