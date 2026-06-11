import { Fragment } from 'react'

// Render a headline string, turning *marked* words into italic accent spans.
// e.g. "From *worried* to *settled*" -> the two words italic + teal.
export function withAccents(text: string) {
  return text.split(/(\*[^*]+\*)/g).map((part, i) =>
    part.startsWith('*') && part.endsWith('*') && part.length > 2
      ? <em key={i} className="italic text-teal">{part.slice(1, -1)}</em>
      : <Fragment key={i}>{part}</Fragment>
  )
}
