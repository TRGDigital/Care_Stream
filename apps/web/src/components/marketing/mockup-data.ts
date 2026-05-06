export const MOCKUPS = {
  'mockup-01': { src: '/mockups/mockup-01-chat-portal-multilingual.html', nativeWidth: 860, nativeHeight: 680 },
  'mockup-02': { src: '/mockups/mockup-02-email-channel.html',            nativeWidth: 900, nativeHeight: 640 },
  'mockup-03': { src: '/mockups/mockup-03-admin-dashboard.html',          nativeWidth: 960, nativeHeight: 680 },
  'mockup-04': { src: '/mockups/mockup-04-email-settings-approved-senders.html', nativeWidth: 960, nativeHeight: 700 },
  'mockup-05': { src: '/mockups/mockup-05-cqc-readiness-report.html',     nativeWidth: 960, nativeHeight: 700 },
  'mockup-06': { src: '/mockups/mockup-06-policy-library.html',           nativeWidth: 960, nativeHeight: 700 },
} as const

export type MockupKey = keyof typeof MOCKUPS
