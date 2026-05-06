import { utils } from 'ethers'
import { hexToInt } from '.'

import type { Chain } from '../../main/store/state'

// ─── Constants ────────────────────────────────────────────────────────────────

/**
 * Chain IDs that use the Optimism fee model (L1 + L2 fee components).
 * Includes mainnet, testnets, and OP-stack forks.
 */
const OPTIMISM_FEE_CHAIN_IDS: ReadonlyArray<number> = [
  10,      // OP Mainnet
  420,     // OP Görli (deprecated)
  8453,    // Base
  84531,   // Base Görli (deprecated)
  84532,   // Base Sepolia
  7777777, // Zora
  11155420 // OP Sepolia
]

/**
 * Known block explorer base URLs keyed by chain ID.
 * Used by {@link getChainExplorerUrl}.
 */
const CHAIN_EXPLORER_URLS: Readonly<Record<number, string>> = {
  1:        'https://etherscan.io',
  10:       'https://optimistic.etherscan.io',
  56:       'https://bscscan.com',
  137:      'https://polygonscan.com',
  8453:     'https://basescan.org',
  42161:    'https://arbiscan.io',
  43114:    'https://snowtrace.io',
  11155111: 'https://sepolia.etherscan.io',
  84532:    'https://sepolia.basescan.org',
  11155420: 'https://sepolia-optimism.etherscan.io'
}

// ─── Existing exports ─────────────────────────────────────────────────────────

/**
 * Returns true when at least one RPC endpoint (primary or secondary) for the
 * given network reports an active connection.
 */
export function isNetworkConnected(network: Chain) {
  return (
    network &&
    ((network.connection.primary && network.connection.primary.connected) ||
      (network.connection.secondary && network.connection.secondary.connected))
  )
}

/**
 * Returns true when the given network is enabled in the user's configuration.
 */
export function isNetworkEnabled(network: Chain) {
  return network.on
}

/**
 * Returns true when the given chain ID uses the Optimism two-component fee
 * model (L1 data fee + L2 execution fee).
 */
export function chainUsesOptimismFees(chainId: number) {
  return OPTIMISM_FEE_CHAIN_IDS.includes(chainId)
}

// ─── New utility functions ────────────────────────────────────────────────────

/**
 * Build a block-explorer URL for the given chain, optionally linking directly
 * to a specific transaction.
 *
 * Falls back to `https://etherscan.io` for unknown chain IDs so callers always
 * receive a usable string.
 *
 * @param chainId - EIP-155 chain identifier
 * @param txHash  - Optional 0x-prefixed transaction hash
 * @returns       Full URL string, e.g. "https://basescan.org/tx/0xabc…"
 */
export function getChainExplorerUrl(chainId: number, txHash?: string): string {
  if (!Number.isInteger(chainId) || chainId <= 0) {
    throw new RangeError(`getChainExplorerUrl: invalid chainId "${chainId}"`)
  }

  const base = CHAIN_EXPLORER_URLS[chainId] ?? 'https://etherscan.io'

  if (txHash) {
    const normalised = txHash.startsWith('0x') ? txHash : `0x${txHash}`
    return `${base}/tx/${normalised}`
  }

  return base
}
