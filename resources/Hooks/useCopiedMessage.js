import { useState } from 'react'
import link from '../link'

// ─── Constants ────────────────────────────────────────────────────────────────

/** Duration (ms) the "copied" confirmation message is shown to the user */
const COPIED_MESSAGE_DURATION_MS = 1_000

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * React hook that manages clipboard copy state for a given `value`.
 *
 * Returns a tuple of:
 *   - `showMessage` {boolean} — true while the confirmation is visible
 *   - `copyToClipboard` {Function} — call to trigger the copy action
 *
 * @param {string} value - The string to copy to the clipboard
 * @returns {[boolean, Function]}
 */
const useCopiedMessage = (value) => {
  if (value === undefined) {
    console.warn('useCopiedMessage: value is undefined; clipboard copy will send an empty string')
  }

  const [showMessage, setShowMessage] = useState(false)

  const copyToClipboard = () => {
    link.send('tray:clipboardData', value)
    setShowMessage(true)
    // Hide the confirmation after the display duration elapses
    setTimeout(() => setShowMessage(false), COPIED_MESSAGE_DURATION_MS)
  }

  return [showMessage, copyToClipboard]
}

export default useCopiedMessage
