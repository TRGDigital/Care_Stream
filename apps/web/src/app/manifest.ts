import type { MetadataRoute } from 'next'

// PWA web app manifest. Makes the staff hub installable ("Add to Home Screen") so
// it opens standalone like an app — the foundation for the WhatsApp → Hub move and
// a prerequisite for iOS web-push (which only works once installed).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'CareStream',
    short_name: 'CareStream',
    description: 'Your care home policies, training and CQC prep — in your pocket.',
    start_url: '/chat',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#ffffff',
    theme_color: '#9B52B5',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
