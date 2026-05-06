import fetch, { RequestInit } from 'node-fetch'

import type { AbortSignal } from 'node-fetch/externals'

// ─── Constants ────────────────────────────────────────────────────────────────

/** Default request timeout used when no explicit value is provided (ms) */
export const DEFAULT_FETCH_TIMEOUT_MS = 10_000

/** Maximum allowed timeout to prevent accidental unbounded waits (ms) */
const MAX_FETCH_TIMEOUT_MS = 60_000

// ─── Exports ──────────────────────────────────────────────────────────────────

/**
 * Perform a `fetch` request that is automatically aborted after `timeout`
 * milliseconds.
 *
 * @param url     - The URL to fetch
 * @param options - Standard `node-fetch` request options
 * @param timeout - Abort deadline in milliseconds
 * @throws {RangeError} When `timeout` is not a positive number or exceeds the
 *                      hard cap ({@link MAX_FETCH_TIMEOUT_MS})
 * @throws {AbortError} When the request is not completed within `timeout` ms
 */
export async function fetchWithTimeout(url: string, options: RequestInit, timeout: number) {
  if (!url) throw new TypeError('fetchWithTimeout: url must be a non-empty string')
  if (!Number.isFinite(timeout) || timeout <= 0) {
    throw new RangeError(`fetchWithTimeout: timeout must be a positive number, got ${timeout}`)
  }
  if (timeout > MAX_FETCH_TIMEOUT_MS) {
    throw new RangeError(
      `fetchWithTimeout: timeout ${timeout}ms exceeds the maximum allowed value of ${MAX_FETCH_TIMEOUT_MS}ms`
    )
  }

  const controller = new AbortController()

  setTimeout(() => controller.abort(), timeout)

  return fetch(url, { ...options, signal: controller.signal as AbortSignal })
}
