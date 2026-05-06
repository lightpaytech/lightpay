import { useEffect, useState } from 'react'

// ─── Constants ────────────────────────────────────────────────────────────────

/** Tick interval for the countdown timer in milliseconds */
const TICK_INTERVAL_MS = 1_000

const MS_IN_HOUR = 1_000 * 60 * 60
const MS_IN_MINUTE = 1_000 * 60
const MS_IN_SECOND = 1_000

// ─── Internal helpers ─────────────────────────────────────────────────────────

/**
 * Convert a raw millisecond countdown value into a human-readable time string.
 * Returns "EXPIRED" when the countdown has reached zero or gone negative.
 *
 * @param {number} countdown - Remaining time in milliseconds
 * @returns {string}         Formatted string, e.g. "1h 23m 45s"
 */
function formatCountdown(countdown) {
  if (countdown < 1) return 'EXPIRED'

  const portions = []
  let remaining = countdown

  const hours = Math.trunc(remaining / MS_IN_HOUR)
  if (hours > 0) {
    portions.push(hours + 'h')
    remaining -= hours * MS_IN_HOUR
  }

  const minutes = Math.trunc(remaining / MS_IN_MINUTE)
  if (minutes > 0) {
    portions.push(minutes + 'm')
    remaining -= minutes * MS_IN_MINUTE
  }

  const seconds = Math.trunc(remaining / MS_IN_SECOND)
  if (seconds > 0) {
    portions.push(seconds + 's')
  }

  return portions.join(' ')
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * React hook that tracks the time remaining until `targetDate` and returns a
 * formatted string representation that updates every second.
 *
 * @param {number|string|Date} targetDate - The expiry date/timestamp
 * @returns {string} Human-readable time remaining, e.g. "2h 5m 30s"
 */
const useCountdown = (targetDate) => {
  if (targetDate === undefined || targetDate === null) {
    return 'INVALID DATE'
  }

  const countDownDate = new Date(targetDate)
  const [countDown, setCountDown] = useState(countDownDate.getTime() - new Date().getTime())

  useEffect(() => {
    // Do not start a timer if the countdown has already expired
    if (countDown <= 0) return

    const interval = setInterval(() => {
      // Re-compute elapsed time on each tick for accuracy
      setCountDown(countDownDate.getTime() - new Date().getTime())
    }, TICK_INTERVAL_MS)

    return () => clearInterval(interval)
  // Re-run effect only when the target date itself changes
  }, [countDownDate.getTime()])

  return isFinite(countDownDate) ? formatCountdown(countDown) : 'INVALID DATE'
}

export default useCountdown
