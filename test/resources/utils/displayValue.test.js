import { BigNumber } from 'bignumber.js'
import { displayValueData, formatUsdCompact } from '../../../resources/utils/displayValue'

// ── Fixtures ─────────────────────────────────────────────────────────────────

const UNIT_RATE_ONE  = { currencyRate: { price: BigNumber(1) } }
const UNIT_RATE_1_3  = { currencyRate: { price: BigNumber(1.3) } }

const MILLION_UNIT  = { fullName: 'million',     shortName: 'M' }
const BILLION_UNIT  = { fullName: 'billion',     shortName: 'B' }
const TRILLION_UNIT = { fullName: 'trillion',    shortName: 'T' }
const QUAD_UNIT     = { fullName: 'quadrillion', shortName: 'Q' }

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('wei', () => {
  describe('basic conversions', () => {
    it('returns a non-zero wei display value', () => {
      const displayValue = displayValueData(356)
      expect(displayValue.wei()).toStrictEqual({ displayValue: '356', value: BigNumber('356') })
    })

    it('returns a zero wei display value', () => {
      const displayValue = displayValueData(0)
      expect(displayValue.wei()).toStrictEqual({ displayValue: '0', value: BigNumber('0') })
    })
  })
})

describe('gwei', () => {
  describe('basic conversions', () => {
    it('returns a gwei value for a standard amount', () => {
      const displayValue = displayValueData(356e9)
      expect(displayValue.gwei()).toStrictEqual({ displayValue: '356', value: BigNumber('356') })
    })

    it('truncates values exceeding 6 decimal places to zero', () => {
      const displayValue = displayValueData(356e-18)
      expect(displayValue.gwei()).toStrictEqual({ displayValue: '0', value: BigNumber('0') })
    })

    it('returns a zero gwei value', () => {
      const displayValue = displayValueData(0)
      expect(displayValue.gwei()).toStrictEqual({ displayValue: '0', value: BigNumber('0') })
    })
  })
})

describe('fiat currency', () => {
  describe('when no currency rate is provided', () => {
    it('returns "?" when no currency rate is provided', () => {
      const value = displayValueData(356e24)
      expect(value.fiat()).toStrictEqual({ displayValue: '?', value: BigNumber(0) })
    })

    it('returns "?" when isTestnet is true', () => {
      const value = displayValueData(356e24, { currencyRate: { price: BigNumber(1.3) }, isTestnet: true })
      expect(value.fiat()).toStrictEqual({ displayValue: '?', value: BigNumber(0) })
    })
  })

  describe('when displaying decimals', () => {
    it('returns a value of less than a cent', () => {
      const value = displayValueData(356e12, UNIT_RATE_ONE)
      expect(value.fiat()).toStrictEqual({
        approximationSymbol: '<',
        displayValue: '0.01',
        value: BigNumber(0.000356)
      })
    })

    it('returns a value below 1000 with 2 decimal places', () => {
      const value = displayValueData(999999e15, UNIT_RATE_ONE)
      expect(value.fiat()).toStrictEqual({
        displayValue: '999.99',
        value: BigNumber(999.999)
      })
    })

    it('returns a zero fiat value', () => {
      const value = displayValueData(0, UNIT_RATE_1_3)
      expect(value.fiat()).toStrictEqual({ displayValue: '0.00', value: BigNumber(0) })
    })
  })

  describe('when not displaying decimals', () => {
    it('returns a value of less than a dollar', () => {
      const value = displayValueData(356e12, UNIT_RATE_ONE)
      expect(value.fiat({ displayDecimals: false })).toStrictEqual({
        approximationSymbol: '<',
        displayValue: '1',
        value: BigNumber(0.000356)
      })
    })

    it('returns a value below 1000 without decimals', () => {
      const value = displayValueData(999999e15, UNIT_RATE_ONE)
      expect(value.fiat({ displayDecimals: false })).toStrictEqual({
        displayValue: '999',
        value: BigNumber(999.999)
      })
    })

    it('returns a zero value', () => {
      const value = displayValueData(0, UNIT_RATE_1_3)
      expect(value.fiat({ displayDecimals: false })).toStrictEqual({
        displayValue: '0',
        value: BigNumber(0)
      })
    })
  })

  describe('shorthand large values', () => {
    it('returns a million value rounded down to 2dp', () => {
      const value = displayValueData(356253e20, UNIT_RATE_ONE)
      expect(value.fiat()).toStrictEqual({
        displayUnit: MILLION_UNIT,
        displayValue: '35.62',
        value: BigNumber(35625300)
      })
    })

    it('rounds down a million value correctly', () => {
      const value = displayValueData(356259e20, UNIT_RATE_ONE)
      expect(value.fiat()).toStrictEqual({
        displayUnit: MILLION_UNIT,
        displayValue: '35.62',
        value: BigNumber(35625900)
      })
    })

    it('returns an exact million value', () => {
      const value = displayValueData(35e24, UNIT_RATE_ONE)
      expect(value.fiat()).toStrictEqual({
        displayUnit: MILLION_UNIT,
        displayValue: '35',
        value: BigNumber(35000000)
      })
    })

    it('returns a billion value rounded to 2dp', () => {
      const value = displayValueData(35.6253e27, UNIT_RATE_ONE)
      expect(value.fiat()).toStrictEqual({
        displayUnit: BILLION_UNIT,
        displayValue: '35.62',
        value: BigNumber(35625300000)
      })
    })

    it('rounds down a billion value correctly', () => {
      const value = displayValueData(35.6259e27, UNIT_RATE_ONE)
      expect(value.fiat()).toStrictEqual({
        displayUnit: BILLION_UNIT,
        displayValue: '35.62',
        value: BigNumber(35625900000)
      })
    })

    it('returns an exact billion value', () => {
      const value = displayValueData(35e27, UNIT_RATE_ONE)
      expect(value.fiat()).toStrictEqual({
        displayUnit: BILLION_UNIT,
        displayValue: '35',
        value: BigNumber(35000000000)
      })
    })

    it('returns a trillion value rounded to 2dp', () => {
      const value = displayValueData(35.6253e30, UNIT_RATE_ONE)
      expect(value.fiat()).toStrictEqual({
        displayUnit: TRILLION_UNIT,
        displayValue: '35.62',
        value: BigNumber(35625300000000)
      })
    })

    it('rounds down a trillion value correctly', () => {
      const value = displayValueData(35.6259e30, UNIT_RATE_ONE)
      expect(value.fiat()).toStrictEqual({
        displayUnit: TRILLION_UNIT,
        displayValue: '35.62',
        value: BigNumber(35625900000000)
      })
    })

    it('returns an exact trillion value', () => {
      const value = displayValueData(35e30, UNIT_RATE_ONE)
      expect(value.fiat()).toStrictEqual({
        displayUnit: TRILLION_UNIT,
        displayValue: '35',
        value: BigNumber(35000000000000)
      })
    })

    it('returns a quadrillion value rounded to 2dp', () => {
      const value = displayValueData(35.6253e33, UNIT_RATE_ONE)
      expect(value.fiat()).toStrictEqual({
        displayUnit: QUAD_UNIT,
        displayValue: '35.62',
        value: BigNumber(35625300000000000)
      })
    })

    it('rounds down a quadrillion value correctly', () => {
      const value = displayValueData(35.6259e33, UNIT_RATE_ONE)
      expect(value.fiat()).toStrictEqual({
        displayUnit: QUAD_UNIT,
        displayValue: '35.62',
        value: BigNumber(35625900000000000)
      })
    })

    it('returns an exact quadrillion value', () => {
      const value = displayValueData(35e33, UNIT_RATE_ONE)
      expect(value.fiat()).toStrictEqual({
        displayUnit: QUAD_UNIT,
        displayValue: '35',
        value: BigNumber(35000000000000000)
      })
    })

    it('caps at the maximum displayable value', () => {
      const value = displayValueData(356e50, UNIT_RATE_ONE)
      expect(value.fiat()).toStrictEqual({
        approximationSymbol: '>',
        displayUnit: QUAD_UNIT,
        displayValue: '999,999',
        value: BigNumber(3.56e34)
      })
    })
  })
})

describe('ether currency', () => {
  describe('when displaying decimals', () => {
    it('returns a value less than 1000 gwei with approximation', () => {
      const value = displayValueData(356e8)
      expect(value.ether()).toStrictEqual({
        approximationSymbol: '<',
        displayValue: '0.000001',
        value: BigNumber(3.56e-8)
      })
    })

    it('returns a value below 1000 with 3 decimal places', () => {
      const value = displayValueData(998.5678111111e18)
      expect(value.ether()).toStrictEqual({
        displayValue: '998.567',
        value: BigNumber(998.5678111111)
      })
    })

    it('returns a value below 100 with 4 decimal places', () => {
      const value = displayValueData(99.85678111111e18)
      expect(value.ether()).toStrictEqual({
        displayValue: '99.8567',
        value: BigNumber(99.85678111111)
      })
    })

    it('returns a value below 10 with 5 decimal places', () => {
      const value = displayValueData(9.985678111111e18)
      expect(value.ether()).toStrictEqual({
        displayValue: '9.98567',
        value: BigNumber(9.985678111111)
      })
    })

    it('returns a value below 1 with 6 decimal places', () => {
      const value = displayValueData(0.9985678111111e18)
      expect(value.ether()).toStrictEqual({
        displayValue: '0.998567',
        value: BigNumber(0.9985678111111)
      })
    })

    it('returns a value below 0.1 with 6 decimal places', () => {
      const value = displayValueData(0.09985678111111e18)
      expect(value.ether()).toStrictEqual({
        displayValue: '0.099856',
        value: BigNumber(0.09985678111111)
      })
    })

    it('returns a value below 0.01 with 6 decimal places', () => {
      const value = displayValueData(0.009985678111111e18)
      expect(value.ether()).toStrictEqual({
        displayValue: '0.009985',
        value: BigNumber(0.009985678111111)
      })
    })

    it('returns a value below 0.001 with 6 decimal places', () => {
      const value = displayValueData(0.0009985678111111e18)
      expect(value.ether()).toStrictEqual({
        displayValue: '0.000998',
        value: BigNumber(0.0009985678111111)
      })
    })

    it('returns a value below 0.0001 with 6 decimal places', () => {
      const value = displayValueData(0.00009985678111111e18)
      expect(value.ether()).toStrictEqual({
        displayValue: '0.000099',
        value: BigNumber(0.00009985678111111)
      })
    })

    it('returns a value below 0.00001 with 6 decimal places', () => {
      const value = displayValueData(0.000009985678111111e18)
      expect(value.ether()).toStrictEqual({
        displayValue: '0.000009',
        value: BigNumber(0.000009985678111111)
      })
    })

    it('returns a zero ether value', () => {
      const value = displayValueData(0)
      expect(value.ether()).toStrictEqual({ displayValue: '0', value: BigNumber(0) })
    })
  })

  describe('when not displaying decimals', () => {
    it('returns a value below 1 with approximation symbol', () => {
      const value = displayValueData(356e12)
      expect(value.ether({ displayDecimals: false })).toStrictEqual({
        approximationSymbol: '<',
        displayValue: '1',
        value: BigNumber(0.000356)
      })
    })

    it('returns a value below 1000 without decimal places', () => {
      const value = displayValueData(999999e15)
      expect(value.ether({ displayDecimals: false })).toStrictEqual({
        displayValue: '999',
        value: BigNumber(999.999)
      })
    })

    it('returns a zero ether value', () => {
      const value = displayValueData(0)
      expect(value.ether({ displayDecimals: false })).toStrictEqual({
        displayValue: '0',
        value: BigNumber(0)
      })
    })
  })

  describe('shorthand large values', () => {
    it('returns a million ether value to 2dp', () => {
      const value = displayValueData(35.6253e24)
      expect(value.ether()).toStrictEqual({
        displayUnit: MILLION_UNIT,
        displayValue: '35.62',
        value: BigNumber(35625300)
      })
    })

    it('rounds down a million ether value correctly', () => {
      const value = displayValueData(35.6259e24)
      expect(value.ether()).toStrictEqual({
        displayUnit: MILLION_UNIT,
        displayValue: '35.62',
        value: BigNumber(35625900)
      })
    })

    it('returns an exact million ether value', () => {
      const value = displayValueData(35e24)
      expect(value.ether()).toStrictEqual({
        displayUnit: MILLION_UNIT,
        displayValue: '35',
        value: BigNumber(35000000)
      })
    })

    it('returns a billion ether value to 2dp', () => {
      const value = displayValueData(35.6253e27)
      expect(value.ether()).toStrictEqual({
        displayUnit: BILLION_UNIT,
        displayValue: '35.62',
        value: BigNumber(35625300000)
      })
    })

    it('rounds down a billion ether value correctly', () => {
      const value = displayValueData(35.6259e27)
      expect(value.ether()).toStrictEqual({
        displayUnit: BILLION_UNIT,
        displayValue: '35.62',
        value: BigNumber(35625900000)
      })
    })

    it('returns an exact billion ether value', () => {
      const value = displayValueData(35e27)
      expect(value.ether()).toStrictEqual({
        displayUnit: BILLION_UNIT,
        displayValue: '35',
        value: BigNumber(35000000000)
      })
    })

    it('returns a trillion ether value to 2dp', () => {
      const value = displayValueData(35.6253e30)
      expect(value.ether()).toStrictEqual({
        displayUnit: TRILLION_UNIT,
        displayValue: '35.62',
        value: BigNumber(35625300000000)
      })
    })

    it('rounds down a trillion ether value correctly', () => {
      const value = displayValueData(35.6259e30)
      expect(value.ether()).toStrictEqual({
        displayUnit: TRILLION_UNIT,
        displayValue: '35.62',
        value: BigNumber(35625900000000)
      })
    })

    it('returns an exact trillion ether value', () => {
      const value = displayValueData(35e30)
      expect(value.ether()).toStrictEqual({
        displayUnit: TRILLION_UNIT,
        displayValue: '35',
        value: BigNumber(35000000000000)
      })
    })

    it('returns a quadrillion ether value to 2dp', () => {
      const value = displayValueData(35.6253e33)
      expect(value.ether()).toStrictEqual({
        displayUnit: QUAD_UNIT,
        displayValue: '35.62',
        value: BigNumber(35625300000000000)
      })
    })

    it('rounds down a quadrillion ether value correctly', () => {
      const value = displayValueData(35.6259e33)
      expect(value.ether()).toStrictEqual({
        displayUnit: QUAD_UNIT,
        displayValue: '35.62',
        value: BigNumber(35625900000000000)
      })
    })

    it('returns an exact quadrillion ether value', () => {
      const value = displayValueData(35e33)
      expect(value.ether()).toStrictEqual({
        displayUnit: QUAD_UNIT,
        displayValue: '35',
        value: BigNumber(35000000000000000)
      })
    })

    it('caps at the maximum displayable ether value', () => {
      const value = displayValueData(356e50)
      expect(value.ether()).toStrictEqual({
        approximationSymbol: '>',
        displayUnit: QUAD_UNIT,
        displayValue: '999,999',
        value: BigNumber(3.56e34)
      })
    })
  })
})

describe('#formatUsdCompact', () => {
  describe('compact USD formatting', () => {
    it('formats a value below 1000 as a plain decimal', () => {
      expect(formatUsdCompact(999)).toBe('999.00')
    })

    it('formats a thousand-range value with K suffix', () => {
      expect(formatUsdCompact(1234)).toBe('1.23K')
    })

    it('formats a million-range value with M suffix', () => {
      expect(formatUsdCompact(2_500_000)).toBe('2.50M')
    })

    it('formats a billion-range value with B suffix', () => {
      expect(formatUsdCompact(3_000_000_000)).toBe('3.00B')
    })

    it('formats zero as "0.00"', () => {
      expect(formatUsdCompact(0)).toBe('0.00')
    })

    it('throws for a negative value', () => {
      expect(() => formatUsdCompact(-1)).toThrow(RangeError)
    })

    it('throws for a non-finite value', () => {
      expect(() => formatUsdCompact(Infinity)).toThrow(RangeError)
    })
  })
})
