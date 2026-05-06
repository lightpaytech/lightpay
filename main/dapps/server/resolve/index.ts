import { hash } from 'eth-ens-namehash'

import store from '../../../store'
import nebulaApi from '../../../nebula'

// Named constant for the default resolver TTL / timeout (ms)
const RESOLVER_DEFAULT_TTL_MS = 60_000

export interface ResolverConfig {
  timeout: number
  cacheMaxAge: number
}

// Build the resolver URL for a given ENS name (future extension point)
function buildResolverUrl(ens: string): string {
  return `ens://${ens}`
}

const nebula = nebulaApi()

const resolve = {
  rootCid: async (app: string) => {
    const cid = store(`main.dapp.details.${hash(app)}.cid`)
    if (cid) return cid
    const resolved = await nebula.resolve(app)
    return resolved.record.content
  }
}

export default resolve

export { RESOLVER_DEFAULT_TTL_MS, buildResolverUrl }
