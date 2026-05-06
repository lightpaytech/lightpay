import { Common } from '@ethereumjs/common'

/**
 * Build an @ethereumjs/common `Common` instance for `chain` at `hardfork`.
 * Falls back to a mainnet-based custom config for unknown chain IDs.
 */
function chainConfig(chain: number, hardfork: string): Common {
  const chainId = BigInt(chain)

  return Common.isSupportedChainId(chainId)
    ? new Common({ chain: chainId, hardfork })
    : Common.custom({ chainId }, { baseChain: 'mainnet', hardfork })
}

/**
 * Convenience wrapper — returns the `Common` config for a given numeric
 * chain ID using the 'london' hardfork as a sensible default.
 *
 * @param chainId - Numeric EVM chain ID
 * @param hardfork - Optional hardfork name (default: 'london')
 */
export function getChainConfig(chainId: number, hardfork = 'london'): Common {
  return chainConfig(chainId, hardfork)
}

export default chainConfig
