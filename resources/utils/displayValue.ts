import BigNumber from 'bignumber.js'
import { isHexString } from 'ethers/lib/utils'

import type { Rate } from '../../main/store/state'

// ─── Constants ────────────────────────────────────────────────────────────────

/** Number of decimal places shown for fiat amounts */
const FIAT_DECIMALS = 2

/** Maximum significant digits preserved before the decimal point */
const MAX_SIGNIFICANT_DIGITS = 6

/** Compact suffixes used by {@link formatUsdCompact} */
const COMPACT_THRESHOLDS = [
  { value: 1e12, suffix: 'T' },
  { value: 1e9,  suffix: 'B' },
  { value: 1e6,  suffix: 'M' },
  { value: 1e3,  suffix: 'K' }
] as const

// ─── Display unit mapping ─────────────────────────────────────────────────────

const displayUnitMapping = {
  million: {
    lowerBound: BigNumber('1000000'),
    upperBound: BigNumber('1000000000'),
    unitDisplay: 'M'
  },
  billion: {
    lowerBound: BigNumber('1000000000'),
    upperBound: BigNumber('1000000000000'),
    unitDisplay: 'B'
  },
  trillion: {
    lowerBound: BigNumber('1000000000000'),
    upperBound: BigNumber('1000000000000000'),
    unitDisplay: 'T'
  },
  quadrillion: {
    lowerBound: BigNumber('1000000000000000'),
    upperBound: BigNumber('999999000000000000000'),
    unitDisplay: 'Q'
  }
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function isLargeNumber(bn: BigNumber) {
  const largeNumberDisplayKeys = Object.keys(displayUnitMapping)
  const firstLargeNumberDisplayKey = largeNumberDisplayKeys[0]
  const firstLargeNumberDisplayValue =
    displayUnitMapping[firstLargeNumberDisplayKey as keyof typeof displayUnitMapping]
  return bn.isGreaterThanOrEqualTo(firstLargeNumberDisplayValue.lowerBound)
}

function getDisplay(bn: BigNumber, type: string, decimals: number, displayFullValue?: boolean) {
  // zero
  if (bn.isZero()) {
    return {
      displayValue: type === 'fiat' ? bn.toFixed(decimals) : bn.toFormat()
    }
  }

  const value = bn.decimalPlaces(decimals, BigNumber.ROUND_FLOOR)

  // minimum display value
  if (value.isZero()) {
    return {
      approximationSymbol: '<',
      displayValue: BigNumber(`1e-${decimals}`).toFormat()
    }
  }

  // small numbers
  if (displayFullValue || !isLargeNumber(value)) {
    return {
      displayValue: value.toFormat(type === 'fiat' ? decimals : undefined)
    }
  }

  // shorthand display of large numbers
  for (const [unitName, { lowerBound, upperBound, unitDisplay }] of Object.entries(displayUnitMapping)) {
    if (value.isGreaterThanOrEqualTo(lowerBound) && value.isLessThan(upperBound)) {
      return {
        displayValue: value
          .shiftedBy(-(lowerBound.sd(true) - 1))
          .decimalPlaces(FIAT_DECIMALS, BigNumber.ROUND_FLOOR)
          .toFormat(),
        displayUnit: {
          fullName: unitName,
          shortName: unitDisplay
        }
      }
    }
  }

  // maximum display value — value exceeds quadrillion range
  const displayUnitKeys = Object.keys(displayUnitMapping)
  const lastDisplayUnitKey = displayUnitKeys[displayUnitKeys.length - 1]
  const lastDisplayUnitValue = displayUnitMapping[lastDisplayUnitKey as keyof typeof displayUnitMapping]

  return {
    approximationSymbol: '>',
    displayValue: '999,999',
    displayUnit: {
      fullName: lastDisplayUnitKey,
      shortName: lastDisplayUnitValue.unitDisplay
    }
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────

type DisplayValueDataParams = {
  currencyRate?: Rate
  displayFullValue?: boolean
  decimals: number
  isTestnet: boolean
}

type SourceValue = string | number | BigNumber
type DisplayUnit = {
  fullName: string
  shortName: string
}
export type DisplayValueData = {
  fiat: () => {
    value: BigNumber
    displayValue: string
    approximationSymbol?: string
    displayUnit?: DisplayUnit
  }
  ether: () => {
    value: BigNumber
    displayValue: string
    approximationSymbol?: string
    displayUnit?: DisplayUnit
  }
  gwei: () => {
    value: BigNumber
    displayValue: string
  }
  wei: () => {
    value: BigNumber
    displayValue: string
  }
  bn: BigNumber
}

// ─── Exports ──────────────────────────────────────────────────────────────────

/**
 * Build a rich display-value object for a raw wei amount.
 * The returned object exposes `.fiat()`, `.ether()`, `.gwei()`, and `.wei()`
 * helper methods, each producing a `{ value, displayValue }` pair ready for
 * rendering.
 *
 * @param sourceValue - Raw wei amount (decimal string, hex string, or BigNumber)
 * @param params      - Formatting configuration (decimals, currency rate, …)
 */
export function displayValueData(sourceValue: SourceValue, params: DisplayValueDataParams): DisplayValueData {
  const {
    currencyRate,
    decimals = 18,
    isTestnet = false,
    displayFullValue = false
  } = (params || {}) as DisplayValueDataParams

  const bn = BigNumber(sourceValue, isHexString(sourceValue) ? 16 : undefined)
  const currencyHelperMap = {
    fiat: ({ displayDecimals } = { displayDecimals: true }) => {
      const nativeCurrency = BigNumber(isTestnet || !currencyRate ? 0 : currencyRate.price)
      const displayedDecimals = displayDecimals ? FIAT_DECIMALS : 0
      const value = bn.shiftedBy(-decimals).multipliedBy(nativeCurrency)

      if (isTestnet || value.isNaN() || !currencyRate) {
        return {
          value,
          displayValue: '?'
        }
      }

      return {
        value,
        ...getDisplay(value, 'fiat', displayedDecimals, displayFullValue)
      }
    },
    ether: ({ displayDecimals } = { displayDecimals: true }) => {
      const value = bn.shiftedBy(-decimals)
      const getDisplayedDecimals = () => {
        if (!displayDecimals) return 0

        const preDecimalStr = value.toFixed(1, BigNumber.ROUND_FLOOR).split('.')[0]
        const numNonDecimals = preDecimalStr === '0' ? 0 : preDecimalStr.length

        return BigNumber(MAX_SIGNIFICANT_DIGITS)
          .minus(BigNumber.min(MAX_SIGNIFICANT_DIGITS, BigNumber.min(MAX_SIGNIFICANT_DIGITS, numNonDecimals)))
          .toNumber()
      }

      return {
        value,
        ...getDisplay(value, 'ether', getDisplayedDecimals(), displayFullValue)
      }
    },
    gwei: () => {
      const value = bn.shiftedBy(-9).decimalPlaces(FIAT_DECIMALS, BigNumber.ROUND_FLOOR)

      return {
        value,
        displayValue: value.isZero() ? '0' : value.toFormat()
      }
    },
    wei: () => ({
      value: bn,
      displayValue: bn.toFormat(0)
    })
  }

  return {
    bn,
    ...currencyHelperMap
  }
}

/**
 * Format a USD value into a compact human-readable string with a magnitude
 * suffix (K / M / B / T). Values below 1 000 are returned as a plain
 * two-decimal string.
 *
 * @example
 *   formatUsdCompact(1234)        // "1.23K"
 *   formatUsdCompact(2_500_000)   // "2.50M"
 *   formatUsdCompact(999)         // "999.00"
 *
 * @param value - A non-negative USD amount
 * @returns     Compact display string
 */
export function formatUsdCompact(value: number): string {
  if (!isFinite(value) || value < 0) throw new RangeError('formatUsdCompact: value must be a non-negative finite number')

  for (const { value: threshold, suffix } of COMPACT_THRESHOLDS) {
    if (value >= threshold) {
      return (value / threshold).toFixed(2) + suffix
    }
  }

  return value.toFixed(2)
}
