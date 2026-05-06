import { Common } from '@ethereumjs/common'
import { EventEmitter } from 'stream'

/**
 * Represents a single chain entry with its numeric id and protocol type.
 */
export interface Chain {
  /** Numeric chain ID (e.g. 1 for Ethereum mainnet) */
  id: number
  /** Protocol family — currently only 'ethereum' is supported */
  type: 'ethereum'
}

/**
 * Shape of a single chain connection slot (primary or secondary).
 */
export interface ChainConnectionSlot {
  /** Whether the connection to this endpoint is currently active */
  connected: boolean
}

/**
 * Full configuration and runtime state for one chain entry.
 */
export interface ChainEntry {
  /** EthereumJS Common instance carrying chain-specific config */
  chainConfig: Common
  /** String representation of the chain ID */
  chainId: string
  /** Primary RPC connection state */
  primary: ChainConnectionSlot
  /** Secondary / fallback RPC connection state */
  secondary: ChainConnectionSlot
}

/**
 * Namespace for chain-related type utilities and documentation.
 */
export namespace ChainUtils {
  /**
   * Map of chain IDs to their full ChainEntry descriptor, scoped by protocol.
   * Usage: ChainUtils.EthereumChains[chainId] -> ChainEntry
   */
  type EthereumChains = {
    [chainId: string]: ChainEntry
  }

  /**
   * All active connections, keyed by protocol then by chain ID.
   */
  type ConnectionMap = {
    ethereum: EthereumChains
  }
}

// TODO move this into chains.js when it's converted to TS
/**
 * Manages all active chain connections and emits lifecycle events.
 */
declare class Chains extends EventEmitter {
  /** Live connection map grouped by protocol and chain ID */
  connections: ChainUtils.ConnectionMap

  /**
   * Emit a sync-data event for the given payload.
   * @param data - Arbitrary data to broadcast to listeners
   */
  syncDataEmit(data: any): void

  /**
   * Forward a JSON-RPC request to the appropriate chain connection.
   * @param payload - The JSON-RPC request payload
   * @param cb - Callback invoked with the RPC response
   * @param targetChain - Optional chain to route the request to
   */
  send(payload: JSONRPCRequestPayload, cb: RPCRequestCallback, targetChain?: Chain): void
}

declare const chainConnection: Chains

export default chainConnection
