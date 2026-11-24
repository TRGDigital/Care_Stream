import test from 'node:test'
import assert from 'node:assert/strict'
import path from 'path'

const web = () => import(path.resolve(__dirname, '../../../web/src/lib/signature-image'))
const px = (w: number, h: number, fill: [number, number, number, number]) => { const data = new Uint8ClampedArray(w * h * 4); for (let i = 0; i < w * h; i++) data.set(fill, i * 4); return { data, width: w, height: h } }
const set = (p: any, x: number, y: number, c: [number, number, number, number]) => p.data.set(c, (y * p.width + x) * 4)

test('white paper becomes see through and dark ink stays', async () => {
  const { whiteToTransparent } = await web()
  const p = px(10, 10, [250, 250, 250, 255])
  set(p, 5, 5, [20, 20, 40, 255]); set(p, 6, 5, [190, 190, 190, 255])
  whiteToTransparent(p)
  assert.equal(p.data[3], 0, 'paper is see through')
  assert.equal(p.data[(5 * 10 + 5) * 4 + 3], 255, 'ink is solid')
  const mid = p.data[(5 * 10 + 6) * 4 + 3]; assert.ok(mid > 0 && mid < 255, 'a grey edge fades')
})

test('margins are trimmed around the ink, with a small margin, and an empty pad has no bounds', async () => {
  const { trimBounds, hasEnoughInk } = await web()
  const p = px(100, 50, [0, 0, 0, 0])
  for (let x = 30; x < 60; x++) set(p, x, 20, [0, 0, 0, 255])
  assert.deepEqual(trimBounds(p, 4), { x: 26, y: 16, w: 38, h: 9 })
  assert.equal(trimBounds(px(10, 10, [0, 0, 0, 0])), null)
  assert.equal(hasEnoughInk(px(10, 10, [0, 0, 0, 0])), false)
  assert.equal(hasEnoughInk(p, 20), true)
})

test('sizes are only ever scaled down', async () => {
  const { fitWithin } = await web()
  assert.deepEqual(fitWithin(1200, 400, 600), { w: 600, h: 200 })
  assert.deepEqual(fitWithin(300, 100, 600), { w: 300, h: 100 })
  assert.deepEqual(fitWithin(1200, 800, 600, 100), { w: 150, h: 100 })
})
