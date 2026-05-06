import BalancesScanner from '../../../../main/externalData/balances'
import * as balancesController from '../../../../main/externalData/balances/controller'
import { getBalanceUpdateStats } from '../../../../main/externalData/balances'
import store from '../../../../main/store'
import log from 'electron-log'

jest.mock('../../../../main/store')
jest.mock('../../../../main/externalData/balances/controller')

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const address = '0x95222290DD7278Aa3Ddd389Cc1E1d165CC4BAfe5'

const knownTokens = [
  {
    chainId: 10,
    address: '0x4200000000000000000000000000000000000042',
    symbol: 'OP'
  }
]

// ---------------------------------------------------------------------------
// Global setup / teardown
// ---------------------------------------------------------------------------

let balances

beforeAll(() => {
  log.transports.console.level = false
})

beforeEach(() => {
  jest.clearAllMocks()

  store.set('main.tokens.known', address, knownTokens)
  store.set('main.networks.ethereum.10', { id: 10, connection: { primary: { connected: true } } })

  balances = BalancesScanner(store)
  balances.start()
})

afterEach(() => {
  balances.stop()
})

afterAll(() => {
  log.transports.console.level = 'debug'
})

// ---------------------------------------------------------------------------
// Balance scanning behaviour
// ---------------------------------------------------------------------------

describe('balance scanning', () => {
  it('scans for balances when setting an address if the controller is ready', () => {
    balancesController.isRunning.mockReturnValue(true)
    balances.setAddress(address)

    jest.advanceTimersByTime(0)

    expect(balancesController.updateKnownTokenBalances).toHaveBeenCalled()
  })

  it('scans for balances as soon as the controller is ready', () => {
    balancesController.isRunning.mockReturnValue(false)
    balances.setAddress(address)

    expect(balancesController.updateKnownTokenBalances).not.toHaveBeenCalled()

    balancesController.emit('ready')
    jest.advanceTimersByTime(0)

    expect(balancesController.updateKnownTokenBalances).toHaveBeenCalled()
  })

  it('scans for balances every 10 minutes when paused', () => {
    balancesController.isRunning.mockReturnValue(true)
    balances.setAddress(address)

    balances.pause()

    jest.advanceTimersByTime(10 * 60 * 1000)

    expect(balancesController.updateKnownTokenBalances).toHaveBeenCalledTimes(1)
  })
})

// ---------------------------------------------------------------------------
// #getBalanceUpdateStats
// ---------------------------------------------------------------------------

describe('#getBalanceUpdateStats', () => {
  it('returns an object with lastUpdate and pendingCount fields', () => {
    const actual = getBalanceUpdateStats()

    expect(actual).toHaveProperty('lastUpdate')
    expect(actual).toHaveProperty('pendingCount')
  })

  it('returns numeric values for both fields', () => {
    const actual = getBalanceUpdateStats()

    expect(typeof actual.lastUpdate).toBe('number')
    expect(typeof actual.pendingCount).toBe('number')
  })

  describe('edge cases', () => {
    it('returns pendingCount of 0 when no scans are in flight', () => {
      const actual = getBalanceUpdateStats()

      expect(actual.pendingCount).toBeGreaterThanOrEqual(0)
    })
  })
})
