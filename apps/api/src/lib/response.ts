import { Response } from 'express'
import { v4 as uuidv4 } from 'uuid'

// §12.2 — Standard API response envelope used on every route
export function ok<T>(res: Response, data: T, status = 200): void {
  res.status(status).json({
    success: true,
    data,
    meta: { request_id: uuidv4(), timestamp: new Date().toISOString() },
  })
}

export function err(res: Response, code: string, message: string, status = 400): void {
  res.status(status).json({
    success: false,
    error: { code, message },
  })
}
