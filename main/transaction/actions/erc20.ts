import type { Action } from '.'
import { Identity } from '../../accounts/types'

// Action type identifiers
export type ActionType = 'erc20:approve' | 'erc20:revoke' | 'erc20:transfer'

// Base spend data shared across ERC-20 action subtypes
type Erc20Spend = {
  amount: HexAmount
  contract: Address
  decimals: number
  name: string
  symbol: string
}

// Specific action payload types
type Erc20Approve = Erc20Spend & {
  contract: Identity
  spender: Identity
}

type Erc20Transfer = Erc20Spend & {
  recipient: Identity
}

// Exported action wrappers
export type ApproveAction = Action<Erc20Approve>
export type TransferAction = Action<Erc20Transfer>
