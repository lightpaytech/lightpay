import type { Action } from '.'

// Action type identifiers
export type ActionType = 'ens:approve' | 'ens:commit' | 'ens:register' | 'ens:renew' | 'ens:transfer'

// Shared property mixins
type Named = { name: string }
type WithDuration = { duration: number }
type WithTokenId = { tokenId: string }

// Action payload types built from mixins
type Approve = Named &
  WithTokenId & {
    operator: Address
  }

type Register = Named &
  WithDuration & {
    address: Address
  }

type Renew = Named & WithDuration

type Transfer = Named &
  WithTokenId & {
    from: Address
    to: Address
  }

// Exported action wrappers
export type ApproveAction = Action<Approve>
export type RegisterAction = Action<Register>
export type RenewAction = Action<Renew>
export type TransferAction = Action<Transfer>
