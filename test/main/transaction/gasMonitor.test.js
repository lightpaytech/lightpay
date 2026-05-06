import { intToHex } from '@ethereumjs/util'
import GasMonitor from '../../../main/transaction/gasMonitor'

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const GAS_PRICE_HEX = '0x3baa1028'
const NEXT_BLOCK_BASE_FEE = '0xb6'

// ---------------------------------------------------------------------------
// Test connection
// ---------------------------------------------------------------------------

let requestHandlers

const testConnection = {
  send: jest.fn((payload) => {
    if (payload.method in requestHandlers) {
      return Promise.resolve(requestHandlers[payload.method](payload.params))
    }

    return Promise.reject('unsupported method: ' + payload.method)
  })
}

// ---------------------------------------------------------------------------
// #getGasPrices
// ---------------------------------------------------------------------------

describe('#getGasPrices', () => {
  beforeEach(() => {
    jest.clearAllMocks()

    requestHandlers = {
      eth_gasPrice: () => GAS_PRICE_HEX
    }
  })

  it('sets the slow gas price', async () => {
    const monitor = new GasMonitor(testConnection)
    const actual = await monitor.getGasPrices()

    expect(actual.slow).toBe(GAS_PRICE_HEX)
  })

  it('sets the standard gas price', async () => {
    const monitor = new GasMonitor(testConnection)
    const actual = await monitor.getGasPrices()

    expect(actual.standard).toBe(GAS_PRICE_HEX)
  })

  it('sets the fast gas price', async () => {
    const monitor = new GasMonitor(testConnection)
    const actual = await monitor.getGasPrices()

    expect(actual.fast).toBe(GAS_PRICE_HEX)
  })

  it('sets the asap gas price', async () => {
    const monitor = new GasMonitor(testConnection)
    const actual = await monitor.getGasPrices()

    expect(actual.asap).toBe(GAS_PRICE_HEX)
  })

  describe('edge cases', () => {
    it('rejects when constructed with a null connection', async () => {
      expect(() => new GasMonitor(null)).toThrow()
    })

    it('rejects when constructed with an undefined connection', async () => {
      expect(() => new GasMonitor(undefined)).toThrow()
    })
  })
})

// ---------------------------------------------------------------------------
// #getFeeHistory
// ---------------------------------------------------------------------------

describe('#getFeeHistory', () => {
  let gasUsedRatios, blockRewards

  beforeEach(() => {
    jest.clearAllMocks()

    // default to all blocks being ineligible for priority fee calculation
    gasUsedRatios = []
    blockRewards = []

    requestHandlers = {
      eth_feeHistory: jest.fn((params) => {
        const numBlocks = parseInt(params[0] || '0x', 16)

        return {
          // base fees include the requested number of blocks plus the next block
          baseFeePerGas: Array(numBlocks).fill('0x8').concat([NEXT_BLOCK_BASE_FEE]),
          gasUsedRatio: fillEmptySlots(gasUsedRatios, numBlocks, 0).reverse(),
          oldestBlock: '0x89502f',
          reward: fillEmptySlots(blockRewards, numBlocks, ['0x0']).reverse()
        }
      })
    }
  })

  it('requests the correct percentiles with the eth_feeHistory RPC call', async () => {
    const monitor = new GasMonitor(testConnection)
    await monitor.getFeeHistory(10, [10, 20, 30])

    expect(requestHandlers['eth_feeHistory']).toBeCalledWith([intToHex(10), 'pending', [10, 20, 30]])
  })

  it('return the correct number of fee history items', async () => {
    const monitor = new GasMonitor(testConnection)
    const actual = await monitor.getFeeHistory(1, [10])

    expect(actual.length).toBe(2)
  })

  it('return the correct baseFee for the next block', async () => {
    const monitor = new GasMonitor(testConnection)
    const actual = await monitor.getFeeHistory(1, [10])

    expect(actual[1].baseFee).toBe(182)
  })

  it('return the correct fee data for historical blocks', async () => {
    const monitor = new GasMonitor(testConnection)
    const actual = await monitor.getFeeHistory(1, [10])

    expect(actual[0]).toStrictEqual({ baseFee: 8, gasUsedRatio: 0, rewards: [0] })
  })

  describe('edge cases', () => {
    it('returns an empty-ish history when requesting 0 blocks', async () => {
      const monitor = new GasMonitor(testConnection)
      const actual = await monitor.getFeeHistory(0, [10])

      // only the next block entry should be present
      expect(actual.length).toBe(1)
    })
  })
})

// ---------------------------------------------------------------------------
// Helper functions
// ---------------------------------------------------------------------------

function fillEmptySlots(arr, targetLength, value) {
  const target = arr.slice()
  let i = 0

  while (i < targetLength) {
    target[i] = target[i] || value
    i += 1
  }

  return target
}
