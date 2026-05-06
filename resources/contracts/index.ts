import { utils } from 'ethers'
import erc20Abi from '../../main/externalData/balances/erc-20-abi'

// ─── Interfaces ───────────────────────────────────────────────────────────────

/**
 * Ethers `Interface` constructed from the ERC-20 ABI fragment list.
 * Use this instance to encode/decode ERC-20 calldata without re-constructing
 * the interface on every call.
 */
export const erc20Interface = new utils.Interface(erc20Abi)

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Encode a call to the ERC-20 `transfer(address,uint256)` function.
 *
 * @param to     - Recipient address
 * @param amount - Amount in token base units (wei)
 * @returns      ABI-encoded calldata hex string
 */
export function encodeErc20Transfer(to: string, amount: bigint): string {
  if (!to || !to.startsWith('0x')) throw new TypeError('encodeErc20Transfer: invalid recipient address')
  return erc20Interface.encodeFunctionData('transfer', [to, amount])
}

/**
 * Decode a `transfer` calldata payload back into its recipient and amount.
 *
 * @param data - ABI-encoded calldata produced by {@link encodeErc20Transfer}
 * @returns    `{ to, amount }` tuple
 */
export function decodeErc20Transfer(data: string): { to: string; amount: bigint } {
  const [to, amount] = erc20Interface.decodeFunctionData('transfer', data)
  return { to: to as string, amount: BigInt(amount.toString()) }
}
