/**
 * Migration 38 — Remove retired Infura/Alchemy RPC presets.
 *
 * Any chain connection that still references the 'infura' or 'alchemy' preset
 * is rewritten to use 'custom' with an empty URL.  If at least one chain was
 * affected the user sees a migration warning banner (mute.migrateToPylon=false).
 *
 * This is the first migration that uses Zod validation.  Invalid chains are
 * silently dropped from state here; subsequent migrations can assume all chains
 * are structurally valid.
 */
import { z } from 'zod'
import log from 'electron-log'

import {
  v38Chain,
  v38ChainSchema,
  v38ChainsSchema,
  v38Connection,
  v38MainSchema,
  v38StateSchema
} from './schema'

// Chain IDs that need their RPC presets evaluated
const pylonChainIds = ['1', '10', '137', '42161', '5', '11155111']
const retiredChainIds = ['3', '4', '42']
const chainsToMigrate = new Set([...pylonChainIds, ...retiredChainIds])

// This schema accepts invalid chains as `false` so they can be filtered out
// below.  Future migrations can rely on all chains being structurally valid.
const ParsedChainSchema = z.union([v38ChainSchema, z.boolean()]).catch(false)

const EthereumChainsSchema = z.record(z.coerce.number(), ParsedChainSchema).transform((chains) => {
  // Drop entries that failed to parse (now represented as `false`)
  // TODO: insert default chain data from state defaults in the future
  return Object.fromEntries(
    Object.entries(chains).filter(([id, chain]) => {
      if (chain === false) {
        log.info(`Migration 38: removing invalid chain ${id} from state`)
        return false
      }
      return true
    })
  )
})

const ChainsSchema = v38ChainsSchema.merge(z.object({ ethereum: EthereumChainsSchema }))

const MainSchema = v38MainSchema
  .merge(z.object({ networks: ChainsSchema }))
  .passthrough()

const StateSchema = v38StateSchema.merge(z.object({ main: MainSchema })).passthrough()

/** Replace a legacy service RPC preset with an empty custom connection */
function stripServiceRpc(connection: v38Connection, chainId: number): v38Connection {
  const isServiceRpc = connection.current === 'infura' || connection.current === 'alchemy'

  if (isServiceRpc) {
    log.info(`Migration 38: removing ${connection.current} preset from chain ${chainId}`)
  }

  return {
    ...connection,
    current: isServiceRpc ? 'custom' : connection.current,
    custom: isServiceRpc ? '' : connection.custom
  }
}

const migrate = (initial: unknown) => {
  let showMigrationWarning = false

  const updateChain = (chain: v38Chain): v38Chain => {
    const { primary, secondary } = chain.connection

    const updatedPrimary = stripServiceRpc(primary, chain.id)
    const updatedSecondary = stripServiceRpc(secondary, chain.id)

    if (updatedPrimary.current !== primary.current || updatedSecondary.current !== secondary.current) {
      showMigrationWarning = true
    }

    return {
      ...chain,
      connection: {
        ...chain.connection,
        primary: updatedPrimary,
        secondary: updatedSecondary
      }
    }
  }

  try {
    const state = StateSchema.parse(initial)

    const chainEntries = Object.entries(state.main.networks.ethereum)

    const migratedChains = chainEntries
      .filter(([id]) => chainsToMigrate.has(id))
      .map(([id, chain]) => [id, updateChain(chain as v38Chain)])

    state.main.networks.ethereum = Object.fromEntries([...chainEntries, ...migratedChains])
    state.main.mute.migrateToPylon = !showMigrationWarning

    return state
  } catch (e) {
    log.error('Migration 38: could not parse state', e)
  }

  return initial
}

export default {
  migrate,
  version: 38
}
