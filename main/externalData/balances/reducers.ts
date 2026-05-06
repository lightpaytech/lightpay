import type { Balance, Token } from '../../store/state'

// Named constants replacing magic numbers used across balance logic
export const EMPTY_BALANCE_HEX = '0x0'
export const ZERO_DISPLAY_BALANCE = '0.0'
export const NATIVE_DECIMALS = 18

export interface TokensByChain {
  [chainId: number]: Token[]
}

export function groupByChain(grouped: TokensByChain, token: Token) {
  return {
    ...grouped,
    [token.chainId]: [...(grouped[token.chainId] || []), token]
  }
}

/**
 * Factory that produces a zeroed-out Balance object for a given chain and symbol.
 * Useful as a safe default when a fetch fails or returns nothing.
 */
export function createEmptyBalance(
  chainId: number,
  address: string,
  symbol: string,
  name: string,
  decimals: number
): Balance {
  return {
    chainId,
    address,
    symbol,
    name,
    decimals,
    balance: EMPTY_BALANCE_HEX,
    displayBalance: ZERO_DISPLAY_BALANCE
  }
}
