// Gated master-video slot for the course + PPC pages. Renders the CareStream
// explainer once NEXT_PUBLIC_TRAINING_VIDEO_URL is set (a Vimeo/YouTube link or a
// self-hosted .mp4); until then it renders nothing, so we can ship the slot ahead
// of the finished video and go live with a single env var.

const VIDEO_URL = process.env.NEXT_PUBLIC_TRAINING_VIDEO_URL || ''

function parseEmbed(url: string): { kind: 'mp4' | 'iframe'; src: string } | null {
  const u = url.trim()
  if (!u) return null
  if (/\.mp4($|\?)/i.test(u)) return { kind: 'mp4', src: u }
  const yt = u.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([\w-]{6,})/)
  if (yt) return { kind: 'iframe', src: `https://www.youtube.com/embed/${yt[1]}` }
  const vm = u.match(/vimeo\.com\/(?:video\/)?(\d+)/)
  if (vm) return { kind: 'iframe', src: `https://player.vimeo.com/video/${vm[1]}` }
  return { kind: 'iframe', src: u }
}

export function TrainingVideo({ className = '' }: { className?: string }) {
  const embed = parseEmbed(VIDEO_URL)
  if (!embed) return null
  return (
    <section className={`px-6 py-16 sm:py-20 ${className}`}>
      <div className="mx-auto max-w-4xl text-center">
        <span className="text-xs font-bold uppercase tracking-widest text-teal">Watch</span>
        <h2 className="mt-2 text-3xl font-extrabold text-neutral-dark sm:text-4xl">See CareStream in action</h2>
        <div className="mt-8 overflow-hidden rounded-3xl bg-black shadow-card" style={{ aspectRatio: '16 / 9' }}>
          {embed.kind === 'mp4' ? (
            <video src={embed.src} controls playsInline className="h-full w-full" />
          ) : (
            <iframe
              src={embed.src}
              title="CareStream training"
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
              className="h-full w-full"
            />
          )}
        </div>
      </div>
    </section>
  )
}
