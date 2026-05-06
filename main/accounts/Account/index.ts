/**
 * @file main/accounts/Account/index.ts
 *
 * Defines `LightPayAccount` — the runtime representation of a single wallet
 * address managed by LightPay.
 *
 * Responsibility is intentionally narrow: it coordinates three specialised
 * sub-managers (requests, signing, permissions) and owns only the data that
 * cannot be cleanly separated (address, name, signer reference, status).
 *
 * Sub-managers:
 * - {@link RequestManager}   – pending-request lifecycle (add / resolve / reject)
 * - {@link SigningManager}   – message, typed-data, and transaction signing
 * - {@link PermissionManager} – dapp origin access control
 */

import log from 'electron-log'

import {
  AccessRequest,
  AccountRequest,
  Accounts,
  TransactionRequest
} from '..'
import nebulaApi from '../../nebula'
import signers from '../../signers'
import store from '../../store'
import provider from '../../provider'
import { ApprovalType } from '../../../resources/constants'
import { TransactionData } from '../../../resources/domain/transaction'
import { Type as SignerType, getSignerType } from '../../../resources/domain/signer'

import { RequestManager } from './requestManager'
import { SigningManager } from './signingManager'
import { PermissionManager } from './permissionManager'

import type { TypedMessage } from '../types'
import type { Permission } from '../../store/state'

// ---------------------------------------------------------------------------
// Re-export sub-managers so callers can import from a single location
// ---------------------------------------------------------------------------
export { RequestManager } from './requestManager'
export { SigningManager } from './signingManager'
export { PermissionManager } from './permissionManager'

// ---------------------------------------------------------------------------
// Module-level setup
// ---------------------------------------------------------------------------

const nebula = nebulaApi()

// ---------------------------------------------------------------------------
// Supporting interfaces
// ---------------------------------------------------------------------------

interface SignerOptions {
  type?: string
}

interface AccountOptions {
  address?: Address
  name: string
  ensName?: string
  created?: string
  lastSignerType?: SignerType
  active: boolean
  options: SignerOptions
}

// ---------------------------------------------------------------------------
// Main class
// ---------------------------------------------------------------------------

/**
 * Runtime model for a single LightPay wallet account.
 *
 * The class is intentionally kept lean: heavy logic lives in the three
 * managers it composes.  All public surface methods include JSDoc so
 * IDE tooling can surface documentation at call sites.
 */
class LightPayAccount {
  // -- Identity ---------------------------------------------------------------
  id: Address
  address: Address
  name: string
  ensName?: string
  created: string

  // -- Signer state -----------------------------------------------------------
  /** The ID of the currently matched signer, or empty string when none. */
  signer: string
  /** Status string last reported by the matched signer. */
  signerStatus: string
  /** The signer type used for the most recent successful signing operation. */
  lastSignerType: SignerType

  // -- General state ----------------------------------------------------------
  status = 'ok'
  active = false

  /** Back-reference to the parent Accounts module. */
  accounts: Accounts

  /** Store observer handle — retained so it can be removed on `close()`. */
  accountObserver: Observer

  // -- Composed managers ------------------------------------------------------
  /** Handles the lifecycle of all pending RPC requests for this account. */
  private requestManager: RequestManager

  // -- Compatibility getter ---------------------------------------------------
  /** @deprecated Access via requestManager internally; exposed for legacy callers. */
  get requests(): Record<string, AccountRequest> {
    return this.requestManager.getAll()
  }
  set requests(_val: Record<string, AccountRequest>) {
    // no-op: requests are managed by RequestManager
  }
  /** Handles all signing operations delegated to the attached hardware/software signer. */
  private signingManager: SigningManager
  /** Handles dapp-origin access-control permissions for this account. */
  private permissionManager: PermissionManager

  // ---------------------------------------------------------------------------
  // Constructor
  // ---------------------------------------------------------------------------

  constructor(params: AccountOptions, accounts: Accounts) {
    const { lastSignerType, name, ensName, created, address, active, options = {} } = params

    this.accounts = accounts

    const formattedAddress = (address && address.toLowerCase()) || '0x'
    this.id = formattedAddress
    this.address = formattedAddress
    this.lastSignerType = lastSignerType || (options.type as SignerType)
    this.active = active
    this.name = name
    this.ensName = ensName
    this.created = created || `new:${Date.now()}`
    this.signer = ''
    this.signerStatus = ''

    // Initialise composed managers
    this.requestManager = new RequestManager(this.address, this.accounts)
    this.signingManager = new SigningManager(this.address)
    this.permissionManager = new PermissionManager(this.address)

    // Guarantee the built-in send-dapp has provider access
    this.permissionManager.ensureSendDappPermission()

    this.update()

    // Wire up reactive observers in a dedicated method
    this.accountObserver = this.setupObservers()

    // Register block-number listener for newly created accounts
    if (this.created.split(':')[0] === 'new') {
      provider.on('connect', () => {
        provider.send(
          {
            jsonrpc: '2.0',
            id: 1,
            chainId: '0x1',
            method: 'eth_blockNumber',
            _origin: 'lightpay-internal',
            params: []
          },
          (response: any) => {
            if (response.result) {
              this.created = parseInt(response.result, 16) + ':' + this.created.split(':')[1]
            }
            this.update()
          }
        )
      })
    }

    // Kick off ENS reverse-lookup
    if (nebula.ready()) {
      this.lookupAddress()
    } else {
      nebula.once('ready', this.lookupAddress.bind(this))
    }

    this.update()
  }

  // ---------------------------------------------------------------------------
  // A — alphabetical public methods
  // ---------------------------------------------------------------------------

  /**
   * Register a required approval step on a transaction request.
   *
   * The approval is tracked on `req.approvals` and its `approve` callback
   * updates the flag + triggers a store update once confirmed.
   *
   * @param req      The transaction request that requires the extra approval.
   * @param type     The approval type being added (e.g. `ApprovalType.TokenSpend`).
   * @param data     Optional payload data forwarded to `onApprove`.
   * @param onApprove Callback invoked when the user confirms this approval step.
   */
  addRequiredApproval(
    req: TransactionRequest,
    type: ApprovalType,
    data: any = {},
    onApprove: (data: any) => void = () => {}
  ) {
    const approve = (data: any) => {
      const confirmedApproval = req.approvals.find((a) => a.type === type)
      if (confirmedApproval) {
        onApprove(data)
        confirmedApproval.approved = true
        this.update()
      }
    }

    req.approvals = [
      ...(req.approvals || []),
      { type, data, approved: false, approve }
    ]
  }

  /**
   * Submit a new pending request into the queue and display it to the user.
   *
   * Delegates to {@link RequestManager.addRequest} which handles navigation,
   * tray display, and enrichment side-effects.
   *
   * @param req A fully formed `AccountRequest` (or any subtype).
   * @param res Optional response callback invoked when the request is resolved.
   */
  addRequest(req: any, res: RPCCallback<any> = () => {}) {
    this.requestManager.addRequest(req, res)
    this.update()
  }

  /**
   * Remove a single request by its `handlerId`, updating navigation state.
   *
   * This is a public convenience wrapper around {@link RequestManager.clear}
   * so that external callers (e.g. the RPC handler) do not need a direct
   * reference to the manager.
   *
   * @param handlerId The unique handler identifier of the request to remove.
   */
  clearRequest(handlerId: string) {
    log.info(`LightPayAccount.clearRequest(${handlerId}) for account ${this.id}`)
    this.requestManager.clear(handlerId)
    this.update()
  }

  /**
   * Remove every pending request whose `origin` matches the given value.
   *
   * Each removed request is rejected with a user-rejected error (EIP-1193
   * error code 4001) before being cleared from the queue.
   *
   * @param origin The dapp origin whose requests should be cleared.
   */
  clearRequestsByOrigin(origin: string) {
    this.requestManager.clearByOrigin(origin)
  }

  /**
   * Shut down this account instance by removing the store observer.
   *
   * Should be called when the account is removed from the active set to
   * prevent memory leaks from dangling observers.
   */
  close() {
    this.accountObserver.remove()
  }

  /**
   * Locate the best available signer for the supplied `address` among all
   * registered signers in the store.
   *
   * Ranking prefers signers with `status === 'ok'` and applies a secondary
   * sort by signer-type ordinal so deterministic selection is guaranteed when
   * multiple signers hold the same address.
   *
   * @param address The account address to search for.
   * @returns The highest-ranked matching signer, or `undefined` when none is found.
   */
  findSigner(address: Address) {
    const allSigners = store('main.signers') as Record<string, Signer>

    const signerOrdinal = (signer: Signer) => {
      const isOk = signer.status === 'ok' ? 2 : 1
      const signerIndex = Object.values(SignerType).findIndex((type) => type === signer.type)
      const typeIndex = Math.max(signerIndex, 0)
      return isOk * typeIndex
    }

    const available = Object.values(allSigners)
      .filter((s) => s.addresses.some((addr) => addr.toLowerCase() === address))
      .sort((a, b) => signerOrdinal(b) - signerOrdinal(a))

    return available[0]
  }

  /**
   * Return this account's address wrapped in an array.
   * Satisfies the `eth_accounts` RPC expectation.
   *
   * @param cb Optional Node-style callback.
   */
  getAccounts(cb?: Callback<Array<Address>>) {
    const account = this.address
    if (cb) cb(null, account ? [account] : [])
    return account ? [account] : []
  }

  /**
   * Return this account's address via a Node-style callback.
   * Used to satisfy `eth_coinbase` requests.
   *
   * @param cb Receives `(null, [address])`.
   */
  getCoinbase(cb: Callback<Array<Address>>) {
    cb(null, [this.address])
  }

  /**
   * Return the health status of this account, useful for diagnostics panels
   * and status indicators.
   *
   * @returns An object with boolean flags for connectivity, signer presence, and active state.
   */
  getHealth(): { connected: boolean; hasSigner: boolean; isActive: boolean } {
    const hasSigner = Boolean(this.signer && signers.get(this.signer))
    const connected = hasSigner && this.signerStatus === 'ok'

    return {
      connected,
      hasSigner,
      isActive: this.active
    }
  }

  /**
   * Convenience accessor that delegates to {@link PermissionManager.hasPermission}.
   *
   * Returns `true` when the given dapp origin currently has provider access
   * granted for this account.  The `method` parameter is accepted for future
   * per-method granularity but is currently not enforced.
   *
   * @param origin The dapp origin to check (e.g. `"send.lightpay.tech"`).
   * @param method A JSON-RPC method name for future granular access control.
   */
  hasPermission(origin: string, method: string): boolean {
    return this.permissionManager.hasPermission(origin, method)
  }

  /**
   * Return all permissions currently granted for this account as a flat array.
   *
   * Delegates to {@link PermissionManager.getAllPermissions}.
   *
   * @returns An array of {@link Permission} objects, one per origin entry.
   */
  getAllPermissions(): Permission[] {
    return this.permissionManager.getAllPermissions()
  }

  /**
   * Return signing-capability flags for the currently attached signer.
   *
   * Delegates to {@link SigningManager.getSigningCapabilities}.  All flags are
   * `false` when no signer is connected.
   *
   * @returns An object describing which signing operations are supported.
   */
  getSigningCapabilities(): {
    canSignMessages: boolean
    canSignTx: boolean
    canSignTypedData: boolean
  } {
    return this.signingManager.getSigningCapabilities()
  }

  /**
   * Return aggregate statistics about the current request queue.
   *
   * Delegates to {@link RequestManager.getRequestStats}.
   *
   * @returns `{ total, pending, byType }` where `byType` is a map from request
   *   type strings to counts.
   */
  getRequestStats(): { total: number; pending: number; byType: Record<string, number> } {
    return this.requestManager.getRequestStats()
  }

  /**
   * Return the request that was created earliest, or `undefined` when the
   * queue is empty.
   *
   * Delegates to {@link RequestManager.getOldestRequest}.  Useful for driving
   * "oldest unconfirmed request" UI indicators.
   *
   * @returns The oldest `AccountRequest` in the queue, or `undefined`.
   */
  getOldestRequest(): AccountRequest | undefined {
    return this.requestManager.getOldestRequest()
  }

  /**
   * Retrieve a single pending request by its `handlerId`, cast to the
   * caller's expected sub-type `T`.
   *
   * @param id The `handlerId` of the request to retrieve.
   */
  getRequest<T extends AccountRequest>(id: string) {
    return this.requestManager.get<T>(id)
  }

  /**
   * Return the currently matched signer instance from the signers registry,
   * or `undefined` when no signer is attached.
   */
  getSigner() {
    return this.signer ? signers.get(this.signer) : undefined
  }

  /**
   * Return this account's address in an array.
   * Matches the `eth_accounts` multi-address convention even though LightPay
   * accounts are always single-address.
   */
  getSelectedAddresses() {
    return [this.address]
  }

  /**
   * Return this account's address as a plain string.
   */
  getSelectedAddress() {
    return this.address
  }

  /**
   * Return a concise summary object for display in dashboards and status UIs.
   *
   * Unlike {@link summary}, this method is intentionally human-readable and
   * does not include the full requests map.
   *
   * @returns A plain object with key account metadata.
   */
  getSummary(): {
    address: Address
    name: string
    signerType: SignerType
    requestCount: number
    permissionCount: number
    status: string
  } {
    const stats = this.requestManager.getRequestStats()
    const permissions = this.permissionManager.getAllPermissions()

    return {
      address: this.address,
      name: this.name,
      signerType: this.lastSignerType,
      requestCount: stats.total,
      permissionCount: permissions.length,
      status: this.status
    }
  }

  /**
   * Perform an ENS reverse-lookup for the account address and store the result.
   * Updates the account in the store whether or not a name is found.
   */
  async lookupAddress() {
    try {
      this.ensName = (await nebula.ens.reverseLookup(this.address))[0]
      this.update()
    } catch (e) {
      log.error('lookupAddress Error:', e)
      this.ensName = ''
      this.update()
    }
  }

  /**
   * Rename this account and persist the change via the store update cycle.
   *
   * @param name The new display name for the account.
   */
  rename(name: string) {
    this.name = name
    this.update()
  }

  /**
   * Reject a pending request with an EVM-compatible error object.
   *
   * Delegates to {@link RequestManager.reject} which handles the response
   * callback and queue cleanup.
   *
   * @param req   The request to reject.
   * @param error An EVM error object containing `code` and `message`.
   */
  rejectRequest(req: AccountRequest, error: EVMError) {
    this.requestManager.reject(req, error)
  }

  /**
   * Emit a structured error response via `res` and log the error.
   *
   * @param err     The error (string or Error object).
   * @param payload The originating RPC payload (needed for `id` and `jsonrpc`).
   * @param res     The response callback to call with the error.
   */
  resError(err: string | Error, payload: RPCResponsePayload, res: RPCErrorCallback) {
    const error = typeof err === 'string' ? { message: err, code: -1 } : err
    log.error(error)
    res({ id: payload.id, jsonrpc: payload.jsonrpc, error })
  }

  /**
   * Resolve a pending request successfully, sending the result back to the
   * originating dapp.
   *
   * Delegates to {@link RequestManager.resolve}.
   *
   * @param req    The request to resolve.
   * @param result The successful result value to include in the JSON-RPC response.
   */
  resolveRequest(req: AccountRequest, result?: any) {
    this.requestManager.resolve(req, result)
  }

  /**
   * Grant or revoke dapp-origin provider access for this account.
   *
   * Delegates to {@link PermissionManager.setAccess}, which writes to the
   * store, then resolves the triggering access request.
   *
   * @param req    The access request initiated by the dapp.
   * @param access `true` to grant access, `false` to revoke it.
   */
  setAccess(req: AccessRequest, access: boolean) {
    this.permissionManager.setAccess(req, access, (r) => this.resolveRequest(r))
  }

  /**
   * Sign an arbitrary message using the account's currently attached signer.
   *
   * @param message The hex-encoded message to sign.
   * @param cb      Node-style callback receiving `(error, signature)`.
   */
  signMessage(message: string, cb: Callback<string>) {
    this.signingManager.signMessage(this.signer, message, cb)
  }

  /**
   * Sign an EIP-712 typed-data payload using the account's attached signer.
   *
   * @param typedMessage The typed message object containing `data` and `version`.
   * @param cb           Node-style callback receiving `(error, signature)`.
   */
  signTypedData(typedMessage: TypedMessage, cb: Callback<string>) {
    this.signingManager.signTypedData(this.signer, typedMessage, cb)
  }

  /**
   * Validate and sign a raw Ethereum transaction using the account's signer.
   *
   * Transaction parameters are validated for hex-encoding correctness before
   * the signer is contacted.  See {@link SigningManager.validateTransaction}.
   *
   * @param rawTx The raw transaction data object.
   * @param cb    Node-style callback receiving `(error, signedTxHex)`.
   */
  signTransaction(rawTx: TransactionData, cb: Callback<string>) {
    this.signingManager.signTransaction(this.signer, rawTx, cb)
  }

  /**
   * Build a serialisable snapshot of this account's current state for storage
   * and broadcast via the store's `update` mechanism.
   *
   * The returned object is deep-cloned via JSON round-trip to prevent mutation
   * of live state.
   *
   * @returns A plain `Account` object compatible with the store schema.
   */
  summary() {
    return JSON.parse(
      JSON.stringify({
        id: this.id,
        name: this.name,
        lastSignerType: this.lastSignerType,
        address: this.address,
        status: this.status,
        active: this.active,
        signer: this.signer,
        requests: this.requestManager.getAll(),
        ensName: this.ensName,
        created: this.created
      })
    ) as Account
  }

  /**
   * Push the latest account state to the store.
   *
   * Calls `this.accounts.update(this.summary())` — any code that mutates
   * account state must call this afterwards so the store stays in sync.
   */
  update() {
    this.accounts.update(this.summary())
  }

  /**
   * Ask the currently attached signer to display and confirm the account
   * address on-device.
   *
   * @param display Whether to display the address on the signer's screen.
   * @param cb      Node-style callback receiving `(error, verified)`.
   */
  verifyAddress(display: boolean, cb: Callback<boolean>) {
    this.signingManager.verifyAddress(this.signer, display, cb)
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /**
   * Create and return the store observer that keeps signer state in sync with
   * the account.
   *
   * Extracted from the constructor to make it easier to reason about observer
   * lifecycle and to allow testing in isolation.
   *
   * @returns The observer handle, which must be retained for later removal.
   */
  private setupObservers(): Observer {
    return store.observer(() => {
      const updatedSigner = this.findSigner(this.address)

      if (updatedSigner) {
        if (this.signer !== updatedSigner.id || this.signerStatus !== updatedSigner.status) {
          this.signer = updatedSigner.id

          const signerType = getSignerType(updatedSigner.type)
          this.lastSignerType = signerType || this.lastSignerType
          this.signerStatus = updatedSigner.status

          if (updatedSigner.status === 'ok' && this.id === this.accounts._current) {
            this.verifyAddress(false, (err, verified) => {
              if (!err && !verified) this.signer = ''
            })
          }
        }
      } else {
        this.signer = ''
      }

      this.update()
    }, `account:${this.address}`)
  }
}

export default LightPayAccount
