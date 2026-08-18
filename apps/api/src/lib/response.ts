import { Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { sanitiseErrorMessage } from './provider-errors'

// §12.2 — Standard API response envelope used on every route
export function ok<T>(res: Response, data: T, status = 200): void {
  res.status(status).json({
    success: true,
    data,
    meta: { request_id: uuidv4(), timestamp: new Date().toISOString() },
  })
}

// Every route reports failures through here, so this is the one place that can guarantee a
// provider's billing message never reaches a tenant. Routes commonly pass `e.message`
// straight through, and patching them individually would leave the next one to leak again.
export function err(res: Response, code: string, message: string, status = 400): void {
  res.status(status).json({
    success: false,
    error: { code, message: sanitiseErrorMessage(message, code) },
  })
}
