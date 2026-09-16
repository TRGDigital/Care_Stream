'use client'

import { useRef, useState } from 'react'

// The walkthrough on the home page.
//
// CLICK TO PLAY, never autoplay: it is 2 minutes 8 seconds of narrated walkthrough, so it would
// either talk over the page or waste its own narration muted. Controls are added on the first
// press rather than shipped, so the plate reads as a still until someone chooses to watch.

export function HomeVideo({ src, poster, duration }: {
  src: string; poster: string; duration: string
}) {
  const ref = useRef<HTMLVideoElement>(null)
  const [playing, setPlaying] = useState(false)

  function play() {
    const v = ref.current
    if (!v) return
    v.controls = true
    v.play().catch(() => { /* a blocked play is not worth an error */ })
    setPlaying(true)
  }

  return (
    <div className={`vid${playing ? ' is-playing' : ''}`}>
      <video className="hvid-el" ref={ref} playsInline preload="metadata" poster={poster}>
        <source src={src} type="video/mp4" />
        Your browser cannot play this video.
      </video>
      {!playing && (
        <>
          <button className="play hvid-play" type="button" onClick={play}
                  aria-label="Play the CareStream walkthrough">
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M8 5.5v13l10-6.5z" />
            </svg>
          </button>
          <span className="cap">{duration}</span>
        </>
      )}
    </div>
  )
}
