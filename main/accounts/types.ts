import type {
  MessageTypes,
  SignTypedDataVersion,
  TypedDataV1,
  TypedMessage as BaseTypedMessage
} from '@metamask/eth-sig-util'
import type { DecodedCallData } from '../contracts'
import type { Chain } from '../chains'
import type { TransactionData } from '../../resources/domain/transaction'
import type { Action } from '../transaction/actions'
import type { TokenData } from '../contracts/erc20'
import type { Token } from '../store/state'

// -- Enumerations -------------------------------------------------------------

/** Describes whether a tx replacement speeds up or cancels the original */
export enum ReplacementType {
  Cancel = 'cancel',
  Speed = 'speed'
}

/** Execution mode for a pending account request */
export enum RequestMode {
  Monitor = 'monitor',
  Normal = 'normal'
}

/** All possible lifecycle states for an account request */
export enum RequestStatus {
  Confirmed = 'confirmed',
  Confirming = 'confirming',
  Declined = 'declined',
  Error = 'error',
  Pending = 'pending',
  Sending = 'sending',
  Sent = 'sent',
  Success = 'success',
  Verifying = 'verifying'
}

/** Classification of a transaction by its on-chain purpose */
export enum TxClassification {
  CONTRACT_CALL = 'CONTRACT_CALL',
  CONTRACT_DEPLOY = 'CONTRACT_DEPLOY',
  NATIVE_TRANSFER = 'NATIVE_TRANSFER',
  SEND_DATA = 'SEND_DATA'
}

// -- String literal union types -----------------------------------------------

export type TypedSignatureRequestType = 'signTypedData' | 'signErc20Permit'

export type SignatureRequestType = 'sign' | TypedSignatureRequestType

export type RequestType =
  | SignatureRequestType
  | 'access'
  | 'addChain'
  | 'addToken'
  | 'switchChain'
  | 'transaction'

// -- Base interfaces ----------------------------------------------------------

/** Minimal shape shared by all request objects */
interface Request {
  handlerId: string
  type: RequestType
}

/** Resolved identity for an address, including optional ENS name */
export type Identity = {
  address: Address
  ens: string
  type: string
}

/** Minimal on-chain receipt data stored after confirmation */
export interface TransactionReceipt {
  blockNumber: string
  gasUsed: string
}

/** Tracks user-approval state for a single approval step */
export interface Approval {
  approve: (data: any) => void
  approved: boolean
  data: any
  type: string
}

/** EIP-2612 permit fields used for gasless token approvals */
export interface Permit {
  chainId: number
  deadline: string | number
  nonce: string | number
  owner: string
  spender: string
  value: string | number
  verifyingContract: string
}

// -- Generic account request --------------------------------------------------

/** Base type for all requests originating from a connected dapp */
export interface AccountRequest<T extends RequestType = RequestType> extends Request {
  account: string
  created?: number
  mode?: RequestMode
  notice?: string
  origin: string
  payload: JSONRPCRequestPayload
  res?: (response?: RPCResponsePayload) => void
  status?: RequestStatus
  type: T
}

// -- Concrete request types ---------------------------------------------------

export interface TransactionRequest extends AccountRequest<'transaction'> {
  approvals: Approval[]
  automaticFeeUpdateNotice?: {
    previousFee: any
  }
  chainData?: {
    optimism?: {
      l1Fees: string
    }
  }
  classification: TxClassification
  completed?: number
  data: TransactionData
  decodedData?: DecodedCallData
  feeAtTime?: string
  feesUpdatedByUser: boolean
  locked?: boolean
  payload: RPC.SendTransaction.Request
  recipientType: string
  recipient?: string // ens name
  recognizedActions: Action<unknown>[]
  tx?: {
    confirmations: number
    hash?: string
    receipt?: TransactionReceipt
  }
  updatedFees?: boolean
}

export interface SignRequest extends AccountRequest<'sign'> {
  data: {
    decodedMessage: string
  }
}

// -- Typed-data helpers -------------------------------------------------------

export type TypedData<T extends MessageTypes = MessageTypes> = BaseTypedMessage<T>
export type LegacyTypedData = TypedDataV1

/** Wraps typed-data payload together with its signing version */
export interface TypedMessage<V extends SignTypedDataVersion = SignTypedDataVersion> {
  data: V extends SignTypedDataVersion.V1 ? LegacyTypedData : TypedData
  version: V
}

// -- Typed-data request types -------------------------------------------------

export interface DefaultSignTypedDataRequest extends AccountRequest<'signTypedData'> {
  typedMessage: TypedMessage
}

/** EIP-712 domain used specifically for EIP-2612 permit messages */
interface EIP2612PermitDomain {
  chainId: number
  verifyingContract: string
}

export interface EIP2612TypedData {
  domain: EIP2612PermitDomain
  message: Omit<Permit, 'chainId' | 'verifyingContract'>
  primaryType: 'Permit'
  types: MessageTypes
}

/** Permit fields enriched with resolved identity objects */
interface PermitData extends Omit<Permit, 'spender' | 'verifyingContract'> {
  spender: Identity
  verifyingContract: Identity
}

export interface PermitSignatureRequest extends AccountRequest<'signErc20Permit'> {
  permit: PermitData
  tokenData: TokenData
  typedMessage: {
    data: EIP2612TypedData
    version: SignTypedDataVersion
  }
}

export type SignTypedDataRequest = DefaultSignTypedDataRequest | PermitSignatureRequest

export type SignatureRequest = SignRequest | SignTypedDataRequest

// -- Misc request types -------------------------------------------------------

export type AccessRequest = AccountRequest<'access'>

export interface AddChainRequest extends AccountRequest<'addChain'> {
  chain: Chain
}

export interface AddTokenRequest extends AccountRequest<'addToken'> {
  token: Token
}
