// store electron version
const electron = process.versions.electron

// Mutable type removes readonly attribute from properties so TS doesn't complain when deleting them
type Mutable<T> = {
  -readonly [key in keyof T]?: T[key]
}

// Delete the electron version while requiring Nebula. This allows ipfs-utils to use
// node-fetch instead of electron-fetch - can remove this when ipfs-utils supports ELECTRON_RUN_AS_NODE
// https://github.com/ipfs/js-ipfs-utils/issues/140
const versions = process.versions as Mutable<NodeJS.ProcessVersions>
delete versions.electron

import nebula from 'nebula'

// reinstate original electron version
versions.electron = electron

import EthereumProvider from 'ethereum-provider'
import proxyConnection from '../provider/proxy'
import { EventEmitter } from 'stream'

// Named constants
const NEBULA_AUTH_ENV_VAR = 'NEBULA_AUTH_TOKEN'
const NEBULA_BASE_URL = 'https://@ipfs.nebula.land'
const MAINNET_CHAIN_ID = 1
const ETHEREUM_CHAINS_METHOD = 'wallet_getEthereumChains'

const authToken = process.env[NEBULA_AUTH_ENV_VAR] ? process.env[NEBULA_AUTH_ENV_VAR] + '@' : ''
const pylonUrl = `https://${authToken}@ipfs.nebula.land`

// all ENS interaction happens on mainnet
const mainnetProvider = new EthereumProvider(proxyConnection)
mainnetProvider.setChain(MAINNET_CHAIN_ID)

const isMainnetConnected = (chains: RPC.GetEthereumChains.Chain[]) =>
  !!chains.find((chain) => chain.chainId === MAINNET_CHAIN_ID)?.connected

// Returns the current connection status and endpoint for the nebula module
export function getNebulaStatus(): { connected: boolean; endpoint: string } {
  return {
    connected: !!authToken,
    endpoint: pylonUrl
  }
}

export default function (provider = mainnetProvider) {
  let ready = false
  const events = new EventEmitter()

  const readyHandler = (chains: RPC.GetEthereumChains.Chain[]) => {
    if (isMainnetConnected(chains)) {
      provider.off('chainsChanged', readyHandler)

      ready = true
      events.emit('ready')
    }
  }

  provider.on('chainsChanged', readyHandler)

  provider.once('connect', async () => {
    const activeChains = await provider.request<RPC.GetEthereumChains.Chain[]>({
      method: ETHEREUM_CHAINS_METHOD
    })

    readyHandler(activeChains)
  })

  return {
    once: events.once.bind(events),
    ready: () => ready,
    ...nebula(pylonUrl, provider)
  }
}
