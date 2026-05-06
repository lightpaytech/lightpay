import type {
  AccountRequest,
  RequestType,
  SignatureRequest,
  SignTypedDataRequest,
  TransactionRequest
} from '../../../main/accounts/types'
import { capitalize } from '../../utils'

// ─── Constants ────────────────────────────────────────────────────────────────

/**
 * Request statuses that cannot be cancelled by the user.
 * Once a request reaches one of these states it has already been dispatched or
 * finalised on-chain.
 */
const NON_CANCELABLE_STATUSES = [
  'sent',
  'sending',
  'verifying',
  'confirming',
  'confirmed',
  'error',
  'declined'
] as const

/**
 * Signature-related request types (message signing, typed data, ERC-20 permit).
 */
const SIGNATURE_REQUEST_TYPES = ['sign', 'signTypedData', 'signErc20Permit'] as const

/**
 * Time boundaries used by {@link getRequestAge} to produce human-readable ages.
 */
const AGE_THRESHOLDS = [
  { maxMs: 60_000,        label: (ms: number) => `${Math.floor(ms / 1_000)}s ago` },
  { maxMs: 3_600_000,     label: (ms: number) => `${Math.floor(ms / 60_000)}m ago` },
  { maxMs: 86_400_000,    label: (ms: number) => `${Math.floor(ms / 3_600_000)}h ago` },
  { maxMs: 2_592_000_000, label: (ms: number) => `${Math.floor(ms / 86_400_000)}d ago` }
] as const

// ─── Exports ──────────────────────────────────────────────────────────────────

/**
 * Returns true when a request in the given `status` can still be cancelled
 * by the user before it is broadcast or finalised.
 */
export const isCancelableRequest = (status: string): boolean => {
  return !(NON_CANCELABLE_STATUSES as ReadonlyArray<string>).includes(status)
}

/**
 * Build the CSS class string for a signature request row based on its status.
 *
 * @param request - Object with a `status` field
 */
export const getSignatureRequestClass = ({ status = '' }) => `signerRequest ${capitalize(status)}`

/**
 * Type guard — returns true when `request` is a signature request (sign,
 * signTypedData, or signErc20Permit).
 */
export const isSignatureRequest = (request: AccountRequest): request is SignatureRequest => {
  return (SIGNATURE_REQUEST_TYPES as ReadonlyArray<string>).includes(request.type)
}

/**
 * Type guard — returns true when `request` is a transaction request.
 */
export const isTransactionRequest = (request: AccountRequest): request is TransactionRequest =>
  request.type === 'transaction'

/**
 * Type guard — returns true when `request` is a typed-data signature request
 * (signTypedData or signErc20Permit).
 */
export const isTypedMessageSignatureRequest = (request: AccountRequest): request is SignTypedDataRequest =>
  ['signTypedData', 'signErc20Permit'].includes(request.type)

/**
 * Human-readable title shown in the account view for each request type.
 */
export const accountViewTitles: Record<RequestType, string> = {
  sign: 'Sign Message',
  signTypedData: 'Sign Data',
  signErc20Permit: 'Sign Token Permit',
  transaction: 'Sign Transaction',
  access: 'Account Access',
  addChain: 'Add Chain',
  switchChain: 'Switch Chain',
  addToken: 'Add Token'
}

// ─── New utility functions ────────────────────────────────────────────────────

/**
 * Return a human-readable string describing how long ago a request was
 * created, relative to the current time.
 *
 * @example
 *   getRequestAge({ created: Date.now() - 30_000 })  // "30s ago"
 *   getRequestAge({ created: Date.now() - 90_000 })  // "1m ago"
 *   getRequestAge({ created: Date.now() - 7_200_000 }) // "2h ago"
 *
 * @param request - Object containing a `created` Unix timestamp in milliseconds
 * @returns       Localised age string, e.g. "5m ago" or "2d ago"
 */
export function getRequestAge(request: { created: number }): string {
  if (!request || typeof request.created !== 'number') {
    throw new TypeError('getRequestAge: request.created must be a numeric timestamp')
  }

  const elapsedMs = Date.now() - request.created

  if (elapsedMs < 0) return 'just now'

  for (const { maxMs, label } of AGE_THRESHOLDS) {
    if (elapsedMs < maxMs) return label(elapsedMs)
  }

  return `${Math.floor(elapsedMs / 2_592_000_000)}mo ago`
}
