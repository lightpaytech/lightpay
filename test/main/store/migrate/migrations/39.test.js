import migration from '../../../../../main/store/migrate/migrations/39'
import { createState } from '../setup'

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const GNOSIS_CHAIN_ID = 100
const GNOSIS_RPC = 'https://rpc.gnosischain.com'

const connectionPriorities = ['primary', 'secondary']

// ---------------------------------------------------------------------------
// Global setup
// ---------------------------------------------------------------------------

let state

beforeEach(() => {
  state = createState(migration.version - 1)

  state.main.networks.ethereum = {
    [GNOSIS_CHAIN_ID]: {
      id: GNOSIS_CHAIN_ID,
      connection: {
        primary: { current: 'custom', custom: 'myrpc' },
        secondary: { current: 'local', custom: '' }
      }
    }
  }
})

// ---------------------------------------------------------------------------
// Migration version
// ---------------------------------------------------------------------------

describe('migration metadata', () => {
  it('should have migration version 39', () => {
    const actual = migration.version
    expect(actual).toBe(39)
  })
})

// ---------------------------------------------------------------------------
// Gnosis connection updates
// ---------------------------------------------------------------------------

describe('Gnosis connection updates', () => {
  connectionPriorities.forEach((priority) => {
    it(`updates a ${priority} Gnosis connection`, () => {
      state.main.networks.ethereum[GNOSIS_CHAIN_ID].connection[priority].current = 'poa'

      const updatedState = migration.migrate(state)
      const actual = updatedState.main.networks.ethereum[GNOSIS_CHAIN_ID]

      expect(actual.connection[priority].current).toBe('custom')
      expect(actual.connection[priority].custom).toBe(GNOSIS_RPC)
    })

    it(`does not update an existing custom ${priority} Gnosis connection`, () => {
      state.main.networks.ethereum[GNOSIS_CHAIN_ID].connection[priority].current = 'custom'
      state.main.networks.ethereum[GNOSIS_CHAIN_ID].connection[priority].custom =
        'https://myconnection.io'

      const updatedState = migration.migrate(state)
      const actual = updatedState.main.networks.ethereum[GNOSIS_CHAIN_ID]

      expect(actual.connection[priority].current).toBe('custom')
      expect(actual.connection[priority].custom).toBe('https://myconnection.io')
    })
  })
})

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe('edge cases', () => {
  it('takes no action if no Gnosis chain is present', () => {
    delete state.main.networks.ethereum[GNOSIS_CHAIN_ID]

    const updatedState = migration.migrate(state)

    expect(updatedState.main.networks).toStrictEqual({ ethereum: {} })
  })

  it('does not modify non-Gnosis chains', () => {
    state.main.networks.ethereum[1] = {
      id: 1,
      connection: {
        primary: { current: 'poa', custom: '' },
        secondary: { current: 'local', custom: '' }
      }
    }

    const updatedState = migration.migrate(state)

    // chain 1 should remain unchanged by this migration
    expect(updatedState.main.networks.ethereum[1].connection.primary.current).toBe('poa')
  })
})
