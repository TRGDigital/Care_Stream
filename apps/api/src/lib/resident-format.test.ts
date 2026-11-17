import assert from 'node:assert'
import { formatResidentAnswer, tidyResidentSource } from './resident-format'

const sample = `Tim likes traditional, plain Yorkshire food, the kind his wife Peggy used to make. Here's what he enjoys:
**Daily essentials:**
• **Strong Yorkshire Tea** with milk and two sugars (about six cups a day)
• Milky Horlicks at bedtime
**Favourite meals:**
• **Fish and chips with mushy peas on Fridays**
• Roast beef with Yorkshire pudding
**What he doesn't like:** Spicy food and fizzy drinks. *(From Sally, his daughter)*`

// 1. With line breaks: real lists, headings and bold, no stray markers.
{
  const h = formatResidentAnswer(sample)
  assert.ok(!h.includes('**') && !h.includes('•'), 'no raw markers left')
  assert.equal((h.match(/<ul>/g) ?? []).length, 2, 'two lists')
  assert.equal((h.match(/<li>/g) ?? []).length, 4, 'four bullets')
  assert.ok(h.includes('<p><strong>Daily essentials:</strong></p><ul>'))
  assert.ok(h.includes('<li><strong>Strong Yorkshire Tea</strong> with milk'))
  assert.ok(h.includes('<em>(From Sally, his daughter)</em>'))
}

// 2. The same text with the line breaks lost (as the hub showed it): still split into headings and bullets.
{
  const squashed = sample.replace(/\n/g, ' ')
  const h = formatResidentAnswer(squashed)
  assert.ok(!h.includes('**') && !h.includes('•'))
  assert.equal((h.match(/<li>/g) ?? []).length, 4)
  assert.ok(h.includes('<strong>Favourite meals:</strong>'))
}

// 3. Already HTML but with bullets inside a paragraph and bold markers inside a list item.
{
  const h = formatResidentAnswer('<p>He enjoys: • Tea • Toast</p><ul><li>**Rice pudding**</li></ul>')
  assert.equal((h.match(/<li>/g) ?? []).length, 3)
  assert.ok(h.includes('<li><strong>Rice pudding</strong></li>'))
  assert.ok(!h.includes('•'))
}

// 4. Clean HTML is left alone.
{
  const clean = '<p>He likes tea.</p><ul><li>Strong</li><li>Two sugars</li></ul>'
  assert.equal(formatResidentAnswer(clean), clean)
}

// 5. Plain text is escaped, fences are removed, numbering becomes an ordered list.
{
  assert.equal(formatResidentAnswer('```html\n<p>Hello</p>\n```'), '<p>Hello</p>')
  const h = formatResidentAnswer('Steps:\n1. Warm the mug\n2. Add tea <b>')
  assert.ok(h.includes('<ol><li>Warm the mug</li><li>Add tea &lt;b&gt;</li></ol>'))
  assert.equal(formatResidentAnswer(''), '')
}

// 6. Source tidy: assorted bullet marks become one dash per line.
{
  const src = 'Likes:\n• tea • toast\n* jam\n- honey'
  assert.equal(tidyResidentSource(src), 'Likes:\n- tea\n- toast\n- jam\n- honey')
  assert.equal(tidyResidentSource('No bullets here.'), 'No bullets here.')
}

console.log('resident-format ok')
