import log from 'electron-log'

import TokenLoader from '../../../../main/externalData/inventory/tokens'

jest.mock('eth-provider', () => () => mockEthProvider)
jest.mock('../../../../main/nebula', () => () => mockNebula)

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const NEBULA_TOKEN_ANOTHER = { name: 'another-token', chainId: 299, address: '0x9999' }

const NEBULA_TOKENS_WITH_OMIT = [
  { name: 'Optimism', chainId: 10, address: '0x9999', extensions: { omit: true } },
  { name: 'Polygon', chainId: 137, address: '0x9999' },
  { name: 'Minereum', chainId: 137, address: '0x9999', extensions: { omit: true } }
]

// ---------------------------------------------------------------------------
// Global setup / teardown
// ---------------------------------------------------------------------------

beforeAll(() => {
  log.transports.console.level = false
})

afterAll(() => {
  log.transports.console.level = 'debug'
})

let tokenLoader, mockEthProvider, mockNebula

beforeEach(() => {
  jest.clearAllMocks()

  mockNebula = {
    resolve: jest.fn().mockResolvedValue({ record: {} }),
    ipfs: {
      getJson: jest.fn()
    }
  }

  mockEthProvider = { connected: true, setChain: jest.fn(), once: jest.fn(), off: jest.fn() }
  tokenLoader = new TokenLoader()
})

afterEach(() => {
  tokenLoader.stop()
})

// ---------------------------------------------------------------------------
// loading tokens
// ---------------------------------------------------------------------------

describe('loading tokens', () => {
  it('loads the default token list initially', () => {
    const actual = tokenLoader.getTokens([137])

    expect(actual.length).toBeGreaterThan(50)
    expect(actual.find((token) => token.name === 'Aave')).toBeTruthy()
  })

  it('loads a token list from nebula', async () => {
    mockNebula.ipfs.getJson.mockResolvedValueOnce({
      tokens: [NEBULA_TOKEN_ANOTHER]
    })

    await tokenLoader.start()

    const actual = tokenLoader.getTokens([299])

    expect(actual.length).toBe(1)
    expect(actual[0].name).toBe('another-token')
  })

  it('starts the loader with the default list when the provider is unavailable', async () => {
    mockEthProvider.connected = false

    const test = tokenLoader.start().then(() => {
      expect(tokenLoader.getTokens([1]).length).toBeGreaterThan(0)
    })

    // wait for attempts to connect
    jest.advanceTimersByTime(60 * 1000)

    return test
  })

  it('loads the default token list for mainnet', () => {
    const actual = tokenLoader.getTokens([1])

    expect(actual.length).toBeGreaterThan(0)
  })

  it('fails to load tokens for an unknown chain', () => {
    const actual = tokenLoader.getTokens([-1])

    expect(actual.length).toBe(0)
  })

  describe('edge cases', () => {
    it('returns an empty list when called with an empty chain array', () => {
      const actual = tokenLoader.getTokens([])

      expect(actual).toEqual([])
    })
  })
})

// ---------------------------------------------------------------------------
// #getBlacklist
// ---------------------------------------------------------------------------

describe('#getBlacklist', () => {
  beforeEach(async () => {
    mockNebula.ipfs.getJson.mockResolvedValueOnce({ tokens: NEBULA_TOKENS_WITH_OMIT })
    return tokenLoader.start()
  })

  it('returns all blacklisted tokens', () => {
    const actual = tokenLoader.getBlacklist().map((t) => t.name)

    expect(actual).toStrictEqual(['Optimism', 'Minereum'])
  })

  it('returns blacklisted tokens from a specific chain', () => {
    const actual = tokenLoader.getBlacklist([137]).map((t) => t.name)

    expect(actual).toStrictEqual(['Minereum'])
  })

  describe('edge cases', () => {
    it('returns an empty list when no blacklisted tokens exist for a given chain', () => {
      const actual = tokenLoader.getBlacklist([999])

      expect(actual).toEqual([])
    })
  })
})
