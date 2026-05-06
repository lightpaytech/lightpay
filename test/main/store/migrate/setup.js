export const createState = (version = 0) => ({
  main: {
    _version: version,
    networks: { ethereum: {} },
    networksMeta: { ethereum: {} },
    accounts: {},
    balances: {},
    mute: {},
    shortcuts: {},
    tokens: { known: {} }
  }
})

export const initChainState = (state, chainId) => {
  state.main.networks.ethereum[chainId] = { id: chainId }
  state.main.networksMeta.ethereum[chainId] = { nativeCurrency: {} }
}

/**
 * Verifies that the state object produced by createState has the expected
 * version number stamped in main._version.
 */
export const getMigrationVersion = (state) => {
  return state.main._version
}

// ---------------------------------------------------------------------------
// Setup utility tests
// ---------------------------------------------------------------------------

describe('createState', () => {
  it('initialises _version to the supplied value', () => {
    const state = createState(42)
    expect(getMigrationVersion(state)).toBe(42)
  })

  it('defaults _version to 0 when no argument is given', () => {
    const state = createState()
    expect(getMigrationVersion(state)).toBe(0)
  })

  it('produces a fresh networks.ethereum object each call', () => {
    const a = createState(1)
    const b = createState(1)

    a.main.networks.ethereum[999] = { id: 999 }

    expect(b.main.networks.ethereum[999]).toBeUndefined()
  })
})

describe('getMigrationVersion', () => {
  it('returns the _version field from the state', () => {
    const state = createState(7)
    expect(getMigrationVersion(state)).toBe(7)
  })

  describe('edge cases', () => {
    it('returns 0 for a default-initialised state', () => {
      const state = createState()
      expect(getMigrationVersion(state)).toBe(0)
    })
  })
})
