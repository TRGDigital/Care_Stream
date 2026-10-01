import { Router, Request, Response } from 'express'
import { getOffers } from '../services/offers'

// GET /public/offers/active: the offers running now (and any starting in the next two days, so a
// page cached across midnight already holds the next one; the site checks each offer's window
// itself). Public: these are on the pages anyway. Prices are always worked out again at checkout.
export const publicOffersRouter = Router()

publicOffersRouter.get('/active', async (_req: Request, res: Response) => {
  const offers = await getOffers()
  res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=60')
  res.json({ data: { offers } })
})
