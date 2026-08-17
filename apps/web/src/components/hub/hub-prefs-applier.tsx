'use client'

// Applies the staff member's saved hub display prefs (font scale + high contrast)
// to <html> on mount, and — crucially — clears them on unmount. The portal layout
// only renders this inside the (portal) segment, so when the user navigates away
// to the admin console (which is outside the portal) this component unmounts and
// resets the document root, meaning neither setting ever leaks into the console.

import { useEffect } from 'react'
import {
  applyFontScale,
  applyContrast,
  readSavedFontScale,
  readSavedContrast,
} from '@/components/hub/display-settings'

export function HubPrefsApplier() {
  useEffect(() => {
    applyFontScale(readSavedFontScale())
    applyContrast(readSavedContrast())
    return () => {
      // Reset the document root so the admin console is never affected.
      if (typeof document !== 'undefined') {
        document.documentElement.style.fontSize = ''
        document.documentElement.removeAttribute('data-hub-contrast')
      }
    }
  }, [])

  return null
}
