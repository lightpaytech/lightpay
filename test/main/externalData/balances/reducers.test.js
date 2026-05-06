import { groupByChain, createEmptyBalance, EMPTY_BALANCE_HEX, ZERO_DISPLAY_BALANCE } from '../../../../main/externalData/balances/reducers'

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const MIXED_TOKENS = [
  { chainId: 1, symbol: 'OHM' },
  { chainId: 4, symbol: 'ZRX' },
  { chainId: 137, symbol: 'AAVE' },
  { chainId: 4, symbol: 'BADGER' },
  { chainId: 1, symbol: 'AUSDC' }
]

const EXPECTED_GROUPED = {
  1: [
    { chainId: 1, symbol: 'OHM' },
    { chainId: 1, symbol: 'AUSDC' }
  ],
  4: [
    { chainId: 4, symbol: 'ZRX' },
    { chainId: 4, symbol: 'BADGER' }
  ],
  137: [{ chainId: 137, symbol: 'AAVE' }]
}

// ---------------------------------------------------------------------------
// #groupByChain
// ---------------------------------------------------------------------------

describe('#groupByChain', () => {
  it('groups tokens by chain', () => {
    const actual = MIXED_TOKENS.reduce(groupByChain, {})

    expect(actual).toEqual(EXPECTED_GROUPED)
  })

  describe('edge cases', () => {
    it('returns an empty object when reducing an empty array', () => {
      const actual = [].reduce(groupByChain, {})

      expect(actual).toEqual({})
    })

    it('handles a single token', () => {
      const actual = [{ chainId: 1, symbol: 'ETH' }].reduce(groupByChain, {})

      expect(actual).toEqual({ 1: [{ chainId: 1, symbol: 'ETH' }] })
    })
  })
})

// ---------------------------------------------------------------------------
// #createEmptyBalance
// ---------------------------------------------------------------------------

describe('#createEmptyBalance', () => {
  it('returns a balance object with zeroed-out balance fields', () => {
    const actual = createEmptyBalance(1, '0xabc123', 'ETH', 'Ether', 18)

    expect(actual).toEqual({
      chainId: 1,
      address: '0xabc123',
      symbol: 'ETH',
      name: 'Ether',
      decimals: 18,
      balance: EMPTY_BALANCE_HEX,
      displayBalance: ZERO_DISPLAY_BALANCE
    })
  })

  it('uses the correct zero hex sentinel for balance', () => {
    const actual = createEmptyBalance(137, '0xdef', 'MATIC', 'Polygon', 18)

    expect(actual.balance).toBe('0x0')
  })

  it('uses the correct zero display string for displayBalance', () => {
    const actual = createEmptyBalance(10, '0x111', 'OP', 'Optimism', 18)

    expect(actual.displayBalance).toBe('0.0')
  })

  describe('edge cases', () => {
    it('handles a token with 0 decimals', () => {
      const actual = createEmptyBalance(1, '0x0', 'NODEC', 'NoDecimals', 0)

      expect(actual.decimals).toBe(0)
      expect(actual.balance).toBe(EMPTY_BALANCE_HEX)
    })
  })
})
