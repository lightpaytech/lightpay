import BigNumber from 'bignumber.js'

import { MAX_HEX } from '../constants'

// ─── Constants ───────────────────────────────────────────────────────────────

export const max = BigNumber(MAX_HEX, 16)

/** Threshold below which a balance is considered dust relative to $1 USD */
const DUST_BALANCE_THRESHOLD = 0.001

/** Threshold below which a total USD value is considered negligible */
const DUST_VALUE_THRESHOLD = 1

/** Regex to strip redundant trailing zeroes from formatted decimals */
const TRAILING_ZEROS_REGEX = /\.0+$|(\.[0-9]*[1-9])0+$/

// ─── Lookup tables ────────────────────────────────────────────────────────────

const digitsLookup = [
  { value: 1, symbol: '' },
  { value: 1e6, symbol: 'million' },
  { value: 1e9, symbol: 'billion' },
  { value: 1e12, symbol: 'trillion' },
  { value: 1e15, symbol: 'quadrillion' },
  { value: 1e18, symbol: 'quintillion' }
]

// ─── Existing exports ─────────────────────────────────────────────────────────

/**
 * Format a plain JavaScript number with an optional number of significant
 * digits, appending a magnitude suffix (million / billion …) where applicable.
 *
 * @param n      - The number to format
 * @param digits - How many decimal digits to show (default 4)
 */
export function formatNumber(n: number, digits = 4) {
  if (!isFinite(n)) return '0'
  const num = Number(n)
  const item = digitsLookup
    .slice()
    .reverse()
    .find((item) => num >= item.value) || { value: 0, symbol: '?' }

  const formatted = (value: number) => {
    const isAproximate = value.toFixed(digits) !== value.toString(10)
    const prefix = isAproximate ? '~' : ''
    return `${prefix}${value.toFixed(digits).replace(TRAILING_ZEROS_REGEX, '$1')} ${item.symbol}`
  }

  return item ? formatted(num / item.value) : '0'
}

/**
 * Returns true when the given allowance string equals the maximum possible
 * uint256 value (i.e. an "unlimited" ERC-20 approval).
 */
export function isUnlimited(amount: string) {
  return max.eq(amount)
}

/**
 * Convert a raw token balance string to a human-readable decimal number,
 * applying `decimals` to shift the value, then format it with `formatNumber`.
 *
 * @param amount   - The raw integer balance as a string or number
 * @param decimals - Token decimals used to shift the value
 */
export function formatDisplayDecimal(amount: string | number, decimals: number) {
  if (amount === undefined || amount === null) return '0'
  const bn = BigNumber(amount).shiftedBy(-decimals)

  if (bn.gt(9e12)) return decimals ? '~unlimited' : 'unknown'

  return formatNumber(bn.toNumber())
}

// ─── New utility functions ────────────────────────────────────────────────────

/**
 * Convert a wei amount (as a bigint) to a human-readable Gwei string.
 * Always shows exactly two decimal places and strips trailing zeros.
 *
 * @param wei - Amount in wei
 * @returns   Formatted string, e.g. "12.50" or "0.01"
 */
export function formatGwei(wei: bigint): string {
  if (wei < 0n) throw new RangeError('formatGwei: wei must be non-negative')
  const gweiRaw = Number(wei) / 1e9
  const fixed = gweiRaw.toFixed(2)
  return fixed.replace(TRAILING_ZEROS_REGEX, '$1')
}

/**
 * Convert a decimal-string wei amount to a floating-point Gwei number.
 * Accepts hex strings prefixed with "0x" as well.
 *
 * @param wei - Wei amount as a decimal or hex string
 * @returns   Gwei as a JavaScript number
 */
export function weiToGwei(wei: string): number {
  if (!wei || typeof wei !== 'string') throw new TypeError('weiToGwei: expected a non-empty string')
  const base = wei.startsWith('0x') ? parseInt(wei, 16) : Number(wei)
  if (!isFinite(base)) throw new RangeError(`weiToGwei: cannot parse wei value "${wei}"`)
  return base / 1e9
}
