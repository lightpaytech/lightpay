import BigNumber from 'bignumber.js'

import { NATIVE_CURRENCY } from '../../constants'

import type { WithTokenId, Balance, Rate } from '../../../main/store/state'

// ─── Constants ────────────────────────────────────────────────────────────────

/** Placeholder shown when a USD rate or value is unavailable */
const UNKNOWN = '?'

/**
 * Minimum balance (in token units) below which the amount is considered "dust"
 * for display purposes when the total USD value is also negligible.
 */
const DUST_BALANCE_DISPLAY_THRESHOLD = 0.001

/**
 * Minimum total USD value below which a balance is shown as `<0.001`.
 */
const DUST_VALUE_DISPLAY_THRESHOLD = 1

// ─── Types ────────────────────────────────────────────────────────────────────

interface DisplayedBalance extends Balance {
  displayBalance: string
  price: string
  priceChange: string | false
  usdRate: Rate
  totalValue: BigNumber
  displayValue: string
}

// ─── Formatting helpers ───────────────────────────────────────────────────────

/**
 * Format a token balance for display, applying dust suppression when both the
 * token amount and its USD value are below meaningful thresholds.
 *
 * @param balance    - Decimal token balance (already shifted by decimals)
 * @param totalValue - USD value of the balance
 * @param decimals   - Maximum decimal places to show (default 8)
 */
export function formatBalance(balance: BigNumber, totalValue: BigNumber, decimals = 8) {
  const isZero = balance.isZero()
  if (
    !isZero &&
    balance.toNumber() < DUST_BALANCE_DISPLAY_THRESHOLD &&
    totalValue.toNumber() < DUST_VALUE_DISPLAY_THRESHOLD
  ) {
    return '<0.001'
  }

  return new Intl.NumberFormat('us-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 8
  }).format(Number(balance.toFixed(decimals, BigNumber.ROUND_FLOOR)))
}

/**
 * Format a USD rate or total value for display.
 * Returns {@link UNKNOWN} when the rate is NaN (unavailable).
 *
 * @param rate     - BigNumber USD rate
 * @param decimals - Decimal places to show (default 2)
 */
export function formatUsdRate(rate: BigNumber, decimals = 2) {
  return rate.isNaN()
    ? UNKNOWN
    : new Intl.NumberFormat('us-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
      }).format(Number(rate.toFixed(decimals, BigNumber.ROUND_FLOOR)))
}

/**
 * Combine a raw `Balance` record with its optional USD quote to produce a
 * fully annotated `DisplayedBalance` object suitable for rendering.
 *
 * @param rawBalance - Raw balance from the store
 * @param quote      - Optional USD rate record for the token
 */
export function createBalance(rawBalance: Balance, quote?: Rate): DisplayedBalance {
  const balance = BigNumber(rawBalance.balance || 0).shiftedBy(-rawBalance.decimals)
  const usdRate = new BigNumber((quote && quote.price) || NaN)
  const change24hr = new BigNumber((quote && quote['change24hr']) || 0)

  const totalValue = balance.times(usdRate)
  const balanceDecimals = Math.max(2, usdRate.shiftedBy(1).toFixed(0, BigNumber.ROUND_DOWN).length)

  return {
    ...rawBalance,
    usdRate: quote as Rate,
    displayBalance: formatBalance(balance, totalValue, balanceDecimals),
    price: formatUsdRate(usdRate),
    priceChange: !usdRate.isZero() && !usdRate.isNaN() && change24hr.toFixed(2),
    totalValue: totalValue.isNaN() ? BigNumber(0) : totalValue,
    displayValue: totalValue.isZero() ? '0' : formatUsdRate(totalValue, 0)
  }
}

/**
 * Comparator that sorts `DisplayedBalance` objects by their USD total value in
 * descending order. When values are equal, balances are compared by raw token
 * amount (also descending).
 */
export const sortByTotalValue = (a: DisplayedBalance, b: DisplayedBalance) => {
  const difference = b.totalValue.minus(a.totalValue)
  if (!difference.isZero()) {
    return difference
  }
  const balanceA = BigNumber(a.balance || 0).shiftedBy(-a.decimals)
  const balanceB = BigNumber(b.balance || 0).shiftedBy(-b.decimals)

  return balanceB.minus(balanceA)
}

/**
 * Returns true when the token address refers to the chain's native currency
 * rather than an ERC-20 contract.
 */
export function isNativeCurrency(address: string) {
  return address === NATIVE_CURRENCY
}

/**
 * Derive a canonical string token identifier from a `WithTokenId` object in
 * the form `"<chainId>:<lowercaseAddress>"`.
 */
export function toTokenId(token: WithTokenId) {
  const { chainId, address } = token
  return `${chainId}:${address.toLowerCase()}`
}

// ─── New utility functions ────────────────────────────────────────────────────

/**
 * Sum the USD total values across a list of `Balance` records (each must
 * already carry a numeric `totalValue` property, i.e. post-`createBalance`).
 *
 * Returns `0` for an empty list.
 *
 * @param balances - Array of balance objects with a numeric `totalValue`
 * @returns        Total portfolio value in USD as a plain JavaScript number
 */
export function getTotalPortfolioValue(balances: Balance[]): number {
  if (!Array.isArray(balances)) return 0

  return balances.reduce((sum, balance) => {
    const value = (balance as any).totalValue
    if (value === undefined || value === null) return sum
    // Accept both plain numbers and BigNumber instances
    const numeric =
      typeof value === 'number'
        ? value
        : typeof value.toNumber === 'function'
        ? (value as BigNumber).toNumber()
        : Number(value)
    return sum + (isFinite(numeric) ? numeric : 0)
  }, 0)
}
