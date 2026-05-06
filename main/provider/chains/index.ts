import deepEqual from 'deep-equal'

import { Colorway, getColor } from '../../../resources/colors'
import store from '../../store'

import type { Chain, ChainMetadata, Origin } from '../../store/state'

// -- Store access helpers -----------------------------------------------------

/** Thin typed wrappers around raw store lookups to avoid scattered casts */
const storeApi = {
  getChainsMeta: (): Record<string, ChainMetadata> => {
    return store('main.networksMeta.ethereum') || {}
  },
  getChains: (): Record<string, Chain> => {
    return store('main.networks.ethereum') || {}
  },
  getColorway: (): Colorway => {
    return store('main.colorway') as Colorway
  },
  getCurrentOrigins: (): Record<string, Origin> => {
    return store('main.origins')
  }
}

// -- Interfaces ---------------------------------------------------------------

interface ChainsChangedHandler {
  chainsChanged: (address: Address, chains: RPC.GetEthereumChains.Chain[]) => void
}

interface ChainChangedHandler {
  chainChanged: (chainId: number, originId: string) => void
}

interface NetworkChangedHandler {
  networkChanged: (networkId: number, originId: string) => void
}

// -- Chain list builder -------------------------------------------------------

/** Build the RPC-shaped chain list from store state, filtering inactive chains */
function getActiveChains(): RPC.GetEthereumChains.Chain[] {
  const chains = storeApi.getChains()
  const meta = storeApi.getChainsMeta()
  const colorway = storeApi.getColorway()

  return Object.values(chains)
    .filter((chain) => chain.on)
    .sort((a, b) => a.id - b.id)
    .map((chain) => {
      const { id, explorer, name } = chain
      const chainMeta = meta[id]
      const { nativeCurrency, primaryColor } = chainMeta
      const { icon: currencyIcon, name: currencyName, symbol, decimals } = nativeCurrency

      // Only include icon/color arrays when values are actually present
      const icons = currencyIcon ? [{ url: currencyIcon }] : []
      const colors = primaryColor ? [getColor(primaryColor, colorway)] : []

      return {
        chainId: id,
        connected: chain.connection.primary.connected || chain.connection.secondary.connected,
        explorers: [{ url: explorer }],
        external: {
          wallet: { colors }
        },
        icon: icons,
        name,
        nativeCurrency: {
          decimals,
          name: currencyName,
          symbol
        },
        networkId: id
      }
    })
}

// -- Observer factories -------------------------------------------------------

/**
 * Returns a store-observer that fires chainsChanged whenever the set of
 * active chains changes (debounced via setTimeout to batch rapid updates).
 */
function createChainsObserver(handler: ChainsChangedHandler) {
  let availableChains = getActiveChains()

  return function () {
    const currentChains = getActiveChains()

    if (!deepEqual(currentChains, availableChains)) {
      availableChains = currentChains

      setTimeout(() => {
        const currentAccount = store('selected.current') as string
        handler.chainsChanged(currentAccount, availableChains)
      }, 0)
    }
  }
}

/**
 * Returns a store-observer that fires chainChanged / networkChanged for each
 * origin whose active chain has switched since the last observation cycle.
 */
function createOriginChainObserver(handler: ChainChangedHandler & NetworkChangedHandler) {
  let knownOrigins: Record<string, Origin> = {}

  return function () {
    const currentOrigins = storeApi.getCurrentOrigins()

    for (const originId of Object.keys(currentOrigins)) {
      const currentOrigin = currentOrigins[originId]
      const knownOrigin = knownOrigins[originId]

      const chainSwitched = knownOrigin && knownOrigin.chain.id !== currentOrigin.chain.id
      if (chainSwitched) {
        const { id: newChainId } = currentOrigin.chain
        handler.chainChanged(newChainId, originId)
        handler.networkChanged(newChainId, originId)
      }

      knownOrigins[originId] = currentOrigin
    }
  }
}

// -- Exports ------------------------------------------------------------------

export { createChainsObserver, createOriginChainObserver, getActiveChains }
