import { Router, Request, Response } from 'express'
import { getOffers } from '../services/offers'
import { lockOffer } from '../services/offers/locks'

// GET /public/offers/active: the offers running now (and any starting in the next two days, so a
// page cached across midnight already holds the next one; the site checks each offer's window
// itself). Public: these are on the pages anyway. Prices are always worked out again at checkout.
export const publicOffersRouter = Router()

publicOffersRouter.get('/active', async (_req: Request, res: Response) => {
  const offers = await getOffers()
  res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=60')
  res.json({ data: { offers } })
})

// GET /public/offers/lock/:token: an offer held for a buyer on a personal link (email capture),
// re-dated to run until the hold ends, so the site can show it. Checkout applies it again itself.
publicOffersRouter.get('/lock/:token', async (req: Request, res: Response) => {
  const token = String(req.params.token ?? '')
  const offer = /^[a-f0-9]{32}$/.test(token) ? await lockOffer(token).catch(() => null) : null
  res.setHeader('Cache-Control', 'private, no-store')
  res.json({ data: { offer } })
})
