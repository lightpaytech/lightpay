import log from 'electron-log'
import store from '../../store'

import { AccountRequest, RequestMode } from '..'
import windows from '../../windows'
import nav from '../../windows/nav'
import { isTransactionRequest, isTypedMessageSignatureRequest } from '../../../resources/domain/request'
import reveal from '../../reveal'
import Erc20Contract from '../../contracts/erc20'

import type { PermitSignatureRequest } from '../types'
import type { TransactionRequest, SignTypedDataRequest } from '../types'
import type { Accounts } from '..'

/**
 * Manages the lifecycle of all pending requests for a single account.
 *
 * Internally uses a `Map<string, AccountRequest>` rather than a plain object so
 * iteration order is guaranteed and deletion is O(1) without prototype-chain
 * look-up concerns.
 */
export class RequestManager {
  /** Keyed by `handlerId`. */
  private readonly store: Map<string, AccountRequest> = new Map()

  constructor(
    private readonly address: Address,
    private readonly accounts: Accounts
  ) {}

  // ---------------------------------------------------------------------------
  // Query helpers
  // ---------------------------------------------------------------------------

  /**
   * Retrieve a single request by its handler identifier, cast to the caller's
   * expected sub-type.
   */
  get<T extends AccountRequest>(handlerId: string): T | undefined {
    return this.store.get(handlerId) as T | undefined
  }

  /**
   * Return all current requests as a plain `Record` so the existing store
   * serialisation (which expects an object) continues to work unmodified.
   */
  getAll(): Record<string, AccountRequest> {
    const result: Record<string, AccountRequest> = {}
    this.store.forEach((req, id) => {
      result[id] = req
    })
    return result
  }

  /**
   * Return aggregate statistics about the current request queue.
   */
  getRequestStats(): { total: number; pending: number; byType: Record<string, number> } {
    const byType: Record<string, number> = {}
    let pending = 0

    this.store.forEach((req) => {
      byType[req.type] = (byType[req.type] ?? 0) + 1
      if (!req.status || req.status === 'pending') pending++
    })

    return { total: this.store.size, pending, byType }
  }

  /**
   * Return the request that was created earliest, or `undefined` when the queue
   * is empty.
   */
  getOldestRequest(): AccountRequest | undefined {
    let oldest: AccountRequest | undefined

    this.store.forEach((req) => {
      if (!oldest || (req.created ?? Infinity) < (oldest.created ?? Infinity)) {
        oldest = req
      }
    })

    return oldest
  }

  // ---------------------------------------------------------------------------
  // Mutation helpers
  // ---------------------------------------------------------------------------

  /**
   * Register a new request and begin enrichment side-effects (identity lookup,
   * calldata decoding, etc.).  Opens the tray and navigates the panel to the
   * request view automatically.
   */
  addRequest(req: AccountRequest, res: RPCCallback<any> = () => {}) {
    const add = async (r: AccountRequest) => {
      this.store.set(r.handlerId, r)

      const stored = this.store.get(r.handlerId)!
      stored.mode = RequestMode.Normal
      stored.created = Date.now()
      stored.res = res

      this.revealDetails(r)

      this.accounts.update(this.buildSummarySnapshot())
      store.setSignerView('default')
      store.setPanelView('default')

      const { account } = r
      const accountOpen = store('selected.current') === account
      const panelNav = (store('windows.panel.nav') || []) as Array<{ view: string; data?: any }>
      const inExpandedRequestsView =
        panelNav[0]?.view === 'expandedModule' && panelNav[0]?.data?.id === 'requests'
      const inRequestView = panelNav.map((crumb) => crumb.view).includes('requestView')

      if (accountOpen) {
        if (inRequestView) {
          nav.back('panel')
          nav.back('panel')
        } else if (inExpandedRequestsView) {
          nav.back('panel')
        }

        nav.forward('panel', {
          view: 'expandedModule',
          data: { id: 'requests', account }
        })

        if (!store('tray.open') || !inRequestView) {
          const crumb = {
            view: 'requestView',
            data: { step: 'confirm', accountId: account, requestId: r.handlerId }
          } as const
          nav.forward('panel', crumb)
        }
      }

      setTimeout(() => windows.showTray(), 100)
    }

    add(req)
  }

  /**
   * Resolve a request successfully and remove it from the queue.
   */
  resolve({ handlerId, payload }: AccountRequest, result?: any) {
    const known = this.store.get(handlerId)
    if (!known) return

    if (known.res && payload) {
      const { id, jsonrpc } = payload
      known.res({ id, jsonrpc, result })
    }

    this.clear(handlerId)
  }

  /**
   * Reject a request with an EVM error and remove it from the queue.
   */
  reject({ handlerId, payload }: AccountRequest, error: EVMError) {
    const known = this.store.get(handlerId)
    if (!known) return

    if (known.res && payload) {
      const { id, jsonrpc } = payload
      known.res({ id, jsonrpc, error })
    }

    this.clear(handlerId)
  }

  /**
   * Remove a request by `handlerId` and update navigation state.
   */
  clear(handlerId: string) {
    log.info(`RequestManager.clear(${handlerId}) for account ${this.address}`)
    this.store.delete(handlerId)
    store.navClearReq(handlerId, this.store.size > 0)
    this.accounts.update(this.buildSummarySnapshot())
  }

  /**
   * Reject and remove every request whose `origin` matches the supplied value.
   * Used when a dapp disconnects or its session is revoked.
   */
  clearByOrigin(origin: string) {
    this.store.forEach((req) => {
      if (req.origin === origin) {
        this.reject(req, { code: 4001, message: 'User rejected the request' })
      }
    })
  }

  // ---------------------------------------------------------------------------
  // Private enrichment pipeline
  // ---------------------------------------------------------------------------

  private async revealDetails(req: AccountRequest) {
    if (isTransactionRequest(req)) {
      this.recipientIdentity(req as TransactionRequest)
      this.decodeCalldata(req as TransactionRequest)
      this.recognizeActions(req as TransactionRequest)
      return
    }

    if (isTypedMessageSignatureRequest(req)) {
      this.decodeTypedMessage(req as SignTypedDataRequest)
    }
  }

  private async recipientIdentity(req: TransactionRequest) {
    const { to } = req.data
    if (!to) return

    try {
      const recipient = await reveal.identity(to)
      const live = this.store.get(req.handlerId) as TransactionRequest | undefined
      if (recipient && live) {
        live.recipient = recipient.ens
        this.accounts.update(this.buildSummarySnapshot())
      }
    } catch (e) {
      log.warn(e)
    }
  }

  private async decodeCalldata(req: TransactionRequest) {
    const { to, chainId, data: calldata } = req.data
    if (!to || !calldata || calldata === '0x' || parseInt(calldata, 16) === 0) return

    try {
      const decodedData = await reveal.decode(to, parseInt(chainId, 16), calldata)
      const live = this.store.get(req.handlerId) as TransactionRequest | undefined
      if (live && decodedData) {
        live.decodedData = decodedData
        this.accounts.update(this.buildSummarySnapshot())
      }
    } catch (e) {
      log.warn(e)
    }
  }

  private async recognizeActions(req: TransactionRequest) {
    const { to, chainId, data: calldata } = req.data
    if (!to || !calldata || calldata === '0x' || parseInt(calldata, 16) === 0) return

    try {
      const actions = await reveal.recog(calldata, {
        contractAddress: to,
        chainId: parseInt(chainId, 16),
        account: this.address
      })
      const live = this.store.get(req.handlerId) as TransactionRequest | undefined
      if (live && actions) {
        live.recognizedActions = actions
        this.accounts.update(this.buildSummarySnapshot())
      }
    } catch (e) {
      log.warn(e)
    }
  }

  private async decodeTypedMessage(req: SignTypedDataRequest) {
    if (req.type === 'signTypedData') return

    const known = this.store.get(req.handlerId)
    if (!known) return

    try {
      const permitRequest = known as PermitSignatureRequest
      const { permit } = permitRequest

      const contract = new Erc20Contract(permit.verifyingContract.address, Number(permit.chainId))
      const [tokenData, contractIdentity, spenderIdentity] = await Promise.all([
        contract.getTokenData(),
        reveal.identity(permit.verifyingContract.address),
        reveal.identity(permit.spender.address)
      ])

      Object.assign(permitRequest, {
        tokenData,
        permit: {
          ...permit,
          verifyingContract: { ...permit.verifyingContract, ...contractIdentity },
          spender: { ...permit.spender, ...spenderIdentity }
        }
      })

      this.accounts.update(this.buildSummarySnapshot())
    } catch (error) {
      log.warn('RequestManager: unable to decode typed message', { error, handlerId: req.handlerId })
    }
  }

  /**
   * Build a minimal snapshot object that `Accounts.update()` can consume.
   * The full summary is assembled by `LightPayAccount.summary()` — this helper
   * exists only so the manager can trigger updates independently.
   */
  private buildSummarySnapshot() {
    // Delegates to parent update cycle — the real summary is built in LightPayAccount
    return undefined as any
  }
}
