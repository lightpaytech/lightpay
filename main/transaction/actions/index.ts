import type { ActionType as Erc20Actions } from './erc20'
import type { ActionType as EnsActions } from './ens'
import type { AccountRequest } from '../../accounts'

// Valid entity classification values
const ENTITY_TYPES = ['unknown', 'contract', 'external'] as const

export type EntityType = typeof ENTITY_TYPES[number]
export type ActionType = Erc20Actions | EnsActions

// Generic action wrapper used by all action subtypes
export type Action<T> = {
  id: ActionType
  data?: T
  update?: (request: AccountRequest, params: Partial<T>) => void
}

type DecodeContext = {
  account?: Address
}

type DecodeFunction<T> = (calldata: string, context?: DecodeContext) => Action<T> | undefined

export interface DecodableContract<T> {
  address: Address
  chainId: number
  decode: DecodeFunction<T>
  name: string
}
