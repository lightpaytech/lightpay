/**
 * Migration 39 — Replace the retired 'poa' RPC preset on Gnosis chain (chainId 100).
 *
 * Any primary or secondary connection using the 'poa' preset is rewritten to
 * 'custom' pointing at the public Gnosis RPC endpoint.
 */
import log from 'electron-log'

import { v38Connection, v38StateSchema } from '../38/schema'

/** Replace the 'poa' preset with the canonical public Gnosis RPC URL */
function stripPoaConnection(connection: v38Connection): v38Connection {
  const isPoa = connection.current === 'poa'

  if (isPoa) {
    log.info('Migration 39: removing POA presets from Gnosis chain')
  }

  return {
    ...connection,
    current: isPoa ? 'custom' : connection.current,
    custom: isPoa ? 'https://rpc.gnosischain.com' : connection.custom
  }
}

const migrate = (initial: unknown) => {
  try {
    const state = v38StateSchema.parse(initial)
    const gnosisChainPresent = '100' in state.main.networks.ethereum

    if (gnosisChainPresent) {
      const gnosisChain = state.main.networks.ethereum[100]

      state.main.networks.ethereum[100] = {
        ...gnosisChain,
        connection: {
          primary: stripPoaConnection(gnosisChain.connection.primary),
          secondary: stripPoaConnection(gnosisChain.connection.secondary)
        }
      }
    }

    return state
  } catch (e) {
    log.error('Migration 39: could not parse state', e)
  }

  return initial
}

export default {
  migrate,
  version: 39
}
