import { createObserver, loadAssets } from '../../../../main/provider/assets'
import store from '../../../../main/store'

jest.mock('../../../../main/store')

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const account = '0x3ba7bd5cd1c19f678d9c8edfa043de5a57570e06'

const ETH_PRICE_DATA = { usd: { price: 3815.91 } }
const ETH_BALANCE = {
  symbol: 'ETH',
  balance: '0xe7',
  address: '0x0000000000000000000000000000000000000000',
  chainId: 1
}

const OHM_PRICE_DATA = { usd: { price: 225.35 } }
const OHM_BALANCE = {
  symbol: 'OHM',
  balance: '0x606401fc9',
  address: '0x383518188c0c6d7730d91b2c03a03c837814a899'
}

// ---------------------------------------------------------------------------
// Global setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  jest.clearAllMocks()

  // ensure that the balances have been updated within the range to not be considered stale
  store.set('main.accounts', account, 'balances.lastUpdated', new Date())
})

// ---------------------------------------------------------------------------
// #loadAssets
// ---------------------------------------------------------------------------

describe('#loadAssets', () => {
  it('loads native currency assets', () => {
    store.set('main.networksMeta.ethereum.1.nativeCurrency', ETH_PRICE_DATA)
    store.set('main.balances', account, [ETH_BALANCE])

    const actual = loadAssets(account)

    expect(actual).toEqual({
      nativeCurrency: [{ ...ETH_BALANCE, currencyInfo: ETH_PRICE_DATA }],
      erc20: []
    })
  })

  it('loads token assets', () => {
    store.set('main.rates', OHM_BALANCE.address, OHM_PRICE_DATA)
    store.set('main.balances', account, [OHM_BALANCE])

    const actual = loadAssets(account)

    expect(actual).toEqual({
      nativeCurrency: [],
      erc20: [{ ...OHM_BALANCE, tokenInfo: { lastKnownPrice: { ...OHM_PRICE_DATA } } }]
    })
  })

  it('throws an error if assets have not been updated in the last 5 minutes', () => {
    const tooOld = new Date()
    tooOld.setMinutes(tooOld.getMinutes() - 6)

    store.set('main.accounts', account, 'balances.lastUpdated', tooOld)

    expect(() => loadAssets(account)).toThrow(/assets not known/)
  })

  describe('edge cases', () => {
    it('returns empty nativeCurrency and erc20 arrays when balances list is empty', () => {
      store.set('main.balances', account, [])

      const actual = loadAssets(account)

      expect(actual).toEqual({ nativeCurrency: [], erc20: [] })
    })
  })
})

// ---------------------------------------------------------------------------
// #createObserver
// ---------------------------------------------------------------------------

describe('#createObserver', () => {
  const handler = { assetsChanged: jest.fn() }
  const observer = createObserver(handler)

  const fireObserver = (waitTime = 800) => {
    observer()

    // event debounce time is 800 ms
    jest.advanceTimersByTime(waitTime)
  }

  beforeEach(() => {
    handler.assetsChanged = jest.fn()

    store.set('selected.current', account)
    store.set('main.balances', account, [{ address: '0xany' }])
  })

  describe('handler invocation', () => {
    it('invokes the handler when the account is holding native currency assets', () => {
      store.set('main.networksMeta.ethereum.1.nativeCurrency', ETH_PRICE_DATA)
      store.set('main.balances', account, [ETH_BALANCE])

      fireObserver()

      expect(handler.assetsChanged).toHaveBeenCalledWith(account, {
        nativeCurrency: [{ ...ETH_BALANCE, currencyInfo: ETH_PRICE_DATA }],
        erc20: []
      })
    })

    it('invokes the handler when the account is holding token assets', () => {
      store.set('main.rates', OHM_BALANCE.address, OHM_PRICE_DATA)
      store.set('main.balances', account, [OHM_BALANCE])

      fireObserver()

      expect(handler.assetsChanged).toHaveBeenCalledWith(account, {
        nativeCurrency: [],
        erc20: [{ ...OHM_BALANCE, tokenInfo: { lastKnownPrice: { ...OHM_PRICE_DATA } } }]
      })
    })

    it('only invokes the handler once in any 800 ms span', () => {
      fireObserver(500)
      fireObserver(500)

      expect(handler.assetsChanged).toHaveBeenCalledTimes(1)
    })
  })

  describe('handler suppression', () => {
    it('does not invoke the handler when no account is selected', () => {
      store.set('selected.current', undefined)

      fireObserver()

      expect(handler.assetsChanged).not.toHaveBeenCalled()
    })

    it('does not invoke the handler when no assets are present', () => {
      store.set('main.balances', account, [])

      fireObserver()

      expect(handler.assetsChanged).not.toHaveBeenCalled()
    })

    it('does not invoke the handler while scanning', () => {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)

      store.set('main.accounts', account, 'balances.lastUpdated', yesterday)

      fireObserver()

      expect(handler.assetsChanged).not.toHaveBeenCalled()
    })
  })

  describe('edge cases', () => {
    it('does not throw when the handler has no assetsChanged method', () => {
      const bareHandler = {}
      const bareObserver = createObserver(bareHandler)

      store.set('main.networksMeta.ethereum.1.nativeCurrency', ETH_PRICE_DATA)
      store.set('main.balances', account, [ETH_BALANCE])

      expect(() => {
        bareObserver()
        jest.advanceTimersByTime(800)
      }).not.toThrow()
    })
  })
})
