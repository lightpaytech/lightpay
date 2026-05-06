import BigNumber from 'bignumber.js'
import {
  sortByTotalValue as byTotalValue,
  createBalance,
  getTotalPortfolioValue
} from '../../../../resources/domain/balance'
import { getRequestAge } from '../../../../resources/domain/request'

// ── Fixtures ─────────────────────────────────────────────────────────────────

const MISSING_QUOTE = undefined
const SAMPLE_TOKEN = { balance: '0x2ed3afa800', decimals: 18 }

const makeBalance = (totalValue, balance = 0, decimals = 0) => ({
  totalValue: BigNumber(totalValue),
  decimals,
  balance
})

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('#createBalance', () => {
  describe('when no price quote is available', () => {
    it('creates a balance with an unknown price', () => {
      const balance = createBalance(SAMPLE_TOKEN, MISSING_QUOTE)
      expect(balance.price).toBe('?')
    })

    it('creates a balance with no price change data', () => {
      const balance = createBalance(SAMPLE_TOKEN, MISSING_QUOTE)
      expect(balance.priceChange).toBeFalsy()
    })

    it('creates a balance with zero total value', () => {
      const balance = createBalance(SAMPLE_TOKEN, MISSING_QUOTE)
      expect(balance.totalValue.toNumber()).toBe(0)
    })

    it('creates a balance with an unknown display value', () => {
      const balance = createBalance(SAMPLE_TOKEN, MISSING_QUOTE)
      expect(balance.displayValue).toBe('?')
    })
  })
})

describe('#sortByTotalValue', () => {
  describe('sorting by total USD value', () => {
    it('sorts balances in descending order by total value', () => {
      const unsorted = [10, 100, 60].map(makeBalance)
      const sortedValues = unsorted.sort(byTotalValue).map((b) => b.totalValue.toNumber())
      expect(sortedValues).toStrictEqual([100, 60, 10])
    })

    it('sorts balances in descending order by raw token balance when total values are equal', () => {
      const unsorted = [10, 100, 60].map((value) => makeBalance(10, value))
      const sortedValues = unsorted.sort(byTotalValue).map((b) => b.balance)
      expect(sortedValues).toStrictEqual([100, 60, 10])
    })

    it('applies a composite sort by total value then by raw balance', () => {
      const bal1 = makeBalance(10, 20)
      const bal2 = makeBalance(100, 990)
      const bal3 = makeBalance(0, 1000)
      const bal4 = makeBalance(100, 989)

      const sortedResult = [bal1, bal2, bal3, bal4].sort(byTotalValue)
      expect(sortedResult).toStrictEqual([bal2, bal4, bal1, bal3])
    })
  })
})

describe('#getTotalPortfolioValue', () => {
  describe('summing portfolio balances', () => {
    it('returns the total USD value across all balances', () => {
      const balances = [makeBalance(100), makeBalance(250), makeBalance(50)]
      expect(getTotalPortfolioValue(balances)).toBe(400)
    })

    it('returns 0 for an empty array', () => {
      expect(getTotalPortfolioValue([])).toBe(0)
    })

    it('returns 0 for a non-array argument', () => {
      expect(getTotalPortfolioValue(null)).toBe(0)
    })

    it('skips balances that have no totalValue', () => {
      const balances = [makeBalance(200), { decimals: 18, balance: 0 }]
      expect(getTotalPortfolioValue(balances)).toBe(200)
    })
  })
})

describe('#getRequestAge', () => {
  describe('returning human-readable request age strings', () => {
    beforeEach(() => {
      jest.useFakeTimers()
    })

    afterEach(() => {
      jest.useRealTimers()
    })

    it('returns seconds-ago label for a very recent request', () => {
      const now = Date.now()
      jest.setSystemTime(now + 30_000)
      expect(getRequestAge({ created: now })).toBe('30s ago')
    })

    it('returns minutes-ago label for a request created over a minute ago', () => {
      const now = Date.now()
      jest.setSystemTime(now + 90_000)
      expect(getRequestAge({ created: now })).toBe('1m ago')
    })

    it('returns hours-ago label for a request created several hours ago', () => {
      const now = Date.now()
      jest.setSystemTime(now + 7_200_000)
      expect(getRequestAge({ created: now })).toBe('2h ago')
    })

    it('throws when request.created is not a number', () => {
      expect(() => getRequestAge({ created: 'bad' })).toThrow(TypeError)
    })
  })
})
