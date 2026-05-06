import log from 'electron-log'
import { isValidAddress } from '@ethereumjs/util'

import signers from '../../signers'
import { AccountRequest } from '..'
import { TransactionData } from '../../../resources/domain/transaction'

import type { TypedMessage } from '../types'

/**
 * Encapsulates all signing operations for a single account address.
 *
 * Responsibilities:
 * - Locating the active signer for the account's address.
 * - Delegating message, typed-data, and transaction signing to that signer.
 * - Providing capability introspection so callers can check what the current
 *   signer supports before attempting an operation.
 * - Validating raw transactions before they are handed off to hardware.
 */
export class SigningManager {
  constructor(private readonly address: Address) {}

  // ---------------------------------------------------------------------------
  // Capability introspection
  // ---------------------------------------------------------------------------

  /**
   * Report which signing operations the currently attached signer supports.
   * All flags are `false` when no signer is connected.
   */
  getSigningCapabilities(): {
    canSignMessages: boolean
    canSignTx: boolean
    canSignTypedData: boolean
  } {
    const signer = this.getActiveSigner()

    if (!signer) {
      return { canSignMessages: false, canSignTx: false, canSignTypedData: false }
    }

    return {
      canSignMessages: typeof signer.signMessage === 'function',
      canSignTx: typeof signer.signTransaction === 'function',
      canSignTypedData: typeof signer.signTypedData === 'function'
    }
  }

  /**
   * Validate a pending account request before forwarding it to the signer.
   *
   * Returns `{ valid: true }` when the request can proceed, or
   * `{ valid: false, reason: '...' }` with a human-readable explanation.
   */
  validateSigningRequest(request: AccountRequest): { valid: boolean; reason?: string } {
    if (!request) {
      return { valid: false, reason: 'No request provided' }
    }

    const signer = this.getActiveSigner()
    if (!signer) {
      return { valid: false, reason: 'No signer is connected to this account' }
    }

    if (signer.status !== 'ok') {
      return { valid: false, reason: `Signer status is '${signer.status}', expected 'ok'` }
    }

    const index = signer.addresses.map((a) => a.toLowerCase()).indexOf(this.address)
    if (index === -1) {
      return { valid: false, reason: 'Signer does not hold this account address' }
    }

    return { valid: true }
  }

  // ---------------------------------------------------------------------------
  // Signing operations
  // ---------------------------------------------------------------------------

  /**
   * Sign an arbitrary hex-encoded message string using the account's signer.
   */
  signMessage(signerId: string, message: string, cb: Callback<string>) {
    if (!message) return cb(new Error('No message to sign'))

    if (!signerId) return cb(new Error('No signer found for this account'))

    const s = signers.get(signerId)
    if (!s) return cb(new Error('Cannot find signer for this account'))

    const index = s.addresses.map((a) => a.toLowerCase()).indexOf(this.address)
    if (index === -1) return cb(new Error('Signer cannot sign for this address'))

    s.signMessage(index, message, cb)
  }

  /**
   * Sign EIP-712 typed data using the account's signer.
   */
  signTypedData(signerId: string, typedMessage: TypedMessage, cb: Callback<string>) {
    if (!typedMessage.data) return cb(new Error('No data to sign'))
    if (typeof typedMessage.data !== 'object') return cb(new Error('Data to sign has the wrong format'))

    if (!signerId) return cb(new Error('No signer found for this account'))

    const s = signers.get(signerId)
    if (!s) return cb(new Error('Cannot find signer for this account'))

    const index = s.addresses.map((a) => a.toLowerCase()).indexOf(this.address)
    if (index === -1) return cb(new Error('Signer cannot sign for this address'))

    s.signTypedData(index, typedMessage, cb)
  }

  /**
   * Validate and sign a raw Ethereum transaction.
   *
   * Validation runs first; if it fails the callback receives the error and the
   * signer is never contacted.
   */
  signTransaction(signerId: string, rawTx: TransactionData, cb: Callback<string>) {
    this.validateTransaction(rawTx, (err) => {
      if (err) return cb(err)

      if (!signerId) return cb(new Error('No signer found for this account'))

      const s = signers.get(signerId)
      if (!s) return cb(new Error('Cannot find signer for this account'))

      const index = s.addresses.map((a) => a.toLowerCase()).indexOf(this.address)
      if (index === -1) return cb(new Error('Signer cannot sign for this address'))

      s.signTransaction(index, rawTx, cb)
    })
  }

  /**
   * Request the signer to display and confirm the account address on-device.
   */
  verifyAddress(signerId: string, display: boolean, cb: Callback<boolean>) {
    const signer = signers.get(signerId) || ({} as any)

    if (signer.verifyAddress && signer.status === 'ok') {
      const index = signer.addresses.map((a: string) => a.toLowerCase()).indexOf(this.address)

      if (index > -1) {
        signer.verifyAddress(index, this.address, display, cb)
      } else {
        log.info('SigningManager: could not find address in signer')
        cb(new Error('Could not find address in signer'))
      }
    } else {
      log.info('SigningManager: signer not accessible to verify address')
      cb(new Error('Signer not accessible to verify address'))
    }
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  /**
   * Retrieve the live signer instance from the signers registry using the
   * provided signer ID, or `undefined` when none is attached.
   */
  getActiveSigner(signerId?: string) {
    return signerId ? signers.get(signerId) : undefined
  }

  /**
   * Validate a raw transaction object before forwarding it to hardware.
   *
   * Checks that the `from` field is present and valid, and that every key in
   * the enforced set contains a well-formed hex string.
   */
  validateTransaction(rawTx: TransactionData, cb: Callback<void>) {
    if (!rawTx.from) return new Error("Missing 'from' address")
    if (!isValidAddress(rawTx.from)) return cb(new Error("Invalid 'from' address"))

    const enforcedKeys: Array<keyof TransactionData> = [
      'value',
      'data',
      'to',
      'from',
      'gas',
      'gasPrice',
      'gasLimit',
      'nonce'
    ]

    const keys = Object.keys(rawTx) as Array<keyof TransactionData>

    for (let i = 0; i < keys.length; i++) {
      const key = keys[i]
      if (enforcedKeys.includes(key) && !this.isValidHexString(rawTx[key] as string)) {
        cb(new Error(`Transaction parameter '${key}' is not a valid hex string`))
        return
      }
    }

    cb(null)
  }

  private isValidHexString(str: string): boolean {
    return /^0x[0-9a-fA-F]*$/.test(str)
  }
}
