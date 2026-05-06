import { useEffect, useRef } from 'react'

// ─── Constants ────────────────────────────────────────────────────────────────

/** Default delay (ms) before the focus call fires after mount */
const DEFAULT_FOCUS_DELAY_MS = 900

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * React hook that returns a ref which, when `focus` is true, automatically
 * focuses the attached DOM element after `delay` milliseconds.
 *
 * Useful for routing keyboard focus to a newly-rendered input without blocking
 * any mount animations.
 *
 * @param {boolean} focus - Whether the element should receive focus
 * @param {number}  delay - Milliseconds to wait before calling `.focus()`
 *                          (default {@link DEFAULT_FOCUS_DELAY_MS})
 * @returns {React.RefObject} Ref to attach to the focusable DOM element
 */
const useFocusableRef = (focus, delay = DEFAULT_FOCUS_DELAY_MS) => {
  if (typeof focus !== 'boolean' && focus !== undefined) {
    console.warn('useFocusableRef: expected a boolean for the `focus` parameter, got', typeof focus)
  }

  const ref = useRef(null)

  useEffect(() => {
    if (!focus) return

    const timeout = setTimeout(() => {
      // Guard against unmount race between delay and focus call
      if (ref.current) {
        ref.current.focus()
      }
    }, delay)

    return () => clearTimeout(timeout)
  // Re-run when either the focus flag or the delay value changes
  }, [focus, delay])

  return ref
}

export default useFocusableRef
