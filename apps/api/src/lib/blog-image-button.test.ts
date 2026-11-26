// The platform post editor can make its own pictures: a hero button and a "Make picture" button for inline images, both through the signed in console (no routine token).
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'fs'
import path from 'path'

const web = (f: string) => fs.readFileSync(path.resolve(__dirname, '../../../web/src', f), 'utf8')

test('BLOG IMAGES: hero and inline pictures are made from the console with the admin token, never a secret', () => {
  const page = web('app/(platform)/platform/blog/page.tsx'), api = web('lib/platform-api.ts')
  assert.match(api, /export async function generateBlogImage[^]*?\/admin\/policy-images\/content-image[^]*?Authorization: `Bearer \$\{token\}`/)
  assert.doesNotMatch(api.slice(api.indexOf('export async function generateBlogImage'), api.indexOf('export interface UseCaseAllocation')), /CONTENT_ROUTINE_TOKEN/)
  assert.match(page, /Generate hero image/)                                                  // one click hero
  assert.match(page, /set\('feature_image_url', url\)[^]*?set\('feature_image_alt'/)           // fills the picture and the alt text
  assert.match(page, /Add the post title first/)                                             // needs a title to match
  assert.match(page, /topic=\{form\.title\}/)                                                // inline button only where a post title exists
  assert.match(page, /✨ Make picture/)
  assert.match(page, /exec\('insertHTML', `<img src="\$\{url\}" alt="\$\{alt\}"/)              // inserted at the caret with alt text
})
