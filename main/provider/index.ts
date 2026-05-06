/**
 * LightPay Provider
 *
 * Central EVM JSON-RPC provider that bridges dApp requests to the LightPay
 * signing/accounts layer.  All incoming RPC calls flow through a
 * {@link MiddlewarePipeline} before reaching the method dispatcher, giving
 * every layer a consistent interception point for auth, rate-limiting,
 * validation, and logging.
 *
 * Architecture overview
 * ---------------------
 *  ┌──────────────────────────────────────────────────────────┐
 *  │  send()  ──►  pipeline.execute()                         │
 *  │                ├─ auth-check      (origin validation)    │
 *  │                ├─ chain-validator (target chain lookup)  │
 *  │                ├─ rate-limiter    (per-origin throttle)  │
 *  │                └─ method-dispatcher ──► dispatchMethod() │
 *  └──────────────────────────────────────────────────────────┘
 */

import EventEmitter from 'events'
import crypto from 'crypto'
import log from 'electron-log'
import { v4 as uuid } from 'uuid'
import { Web3Provider } from '@ethersproject/providers'
import { BigNumber } from 'ethers'
import { estimateL1GasCost } from '@eth-optimism/sdk'
import { recoverTypedSignature, SignTypedDataVersion } from '@metamask/eth-sig-util'
import { isAddress } from '@ethersproject/address'
import { addHexPrefix, intToHex, isHexString, isHexPrefixed, fromUtf8 } from '@ethereumjs/util'

import store from '../store'
import packageFile from '../../package.json'

import proxyConnection from './proxy'
import accounts, {
  AccountRequest,
  TransactionRequest,
  SignTypedDataRequest,
  AddChainRequest,
  AddTokenRequest
} from '../accounts'

import LightPayAccount from '../accounts/Account'
import Chains, { Chain } from '../chains'
import reveal from '../reveal'
import { getSignerType, Type as SignerType } from '../../resources/domain/signer'
import { normalizeChainId, TransactionData } from '../../resources/domain/transaction'
import { populate as populateTransaction, maxFee, classifyTransaction } from '../transaction'
import { capitalize } from '../../resources/utils'
import { ApprovalType } from '../../resources/constants'
import { createObserver as AssetsObserver, loadAssets } from './assets'
import { getVersionFromTypedData } from './typedData'

import { Subscription, SubscriptionType, hasSubscriptionPermission } from './subscriptions'
import {
  checkExistingNonceGas,
  ecRecover,
  feeTotalOverMax,
  gasFees,
  getPermissions,
  getRawTx,
  getSignedAddress,
  requestPermissions,
  resError,
  decodeMessage
} from './helpers'

import {
  createChainsObserver as ChainsObserver,
  createOriginChainObserver as OriginChainObserver,
  getActiveChains
} from './chains'
import {
  EIP2612TypedData,
  LegacyTypedData,
  PermitSignatureRequest,
  SignatureRequest,
  TypedData,
  TypedMessage
} from '../accounts/types'
import * as sigParser from '../signatures'
import { hasAddress } from '../../resources/domain/account'
import { mapRequest } from '../requests'

import { MiddlewarePipeline } from './middleware'
import { getMethodCategory, isTransactionMethod, isSignatureMethod } from './methodRegistry'

import type { Origin, Token } from '../store/state'

// ---------------------------------------------------------------------------
// Named constants — no more magic strings scattered through the file
// ---------------------------------------------------------------------------

/** JSON-RPC version string used in every response envelope. */
const JSONRPC_VERSION = '2.0'

/** Gas padding multiplier applied on top of the raw estimate. */
const GAS_ESTIMATE_PADDING = 1.5

/** Interval (ms) between eth_sendRawTransaction broadcast retries. */
const BROADCAST_RETRY_INTERVAL_MS = 1000

/** Error code: user rejected the request. */
const ERR_USER_REJECTED = 4001

/** Error code: unknown/unrecognised chain. */
const ERR_UNKNOWN_CHAIN = 4901

/** Error code: chain not added to the wallet. */
const ERR_CHAIN_NOT_ADDED = 4902

/** Error code: asset-related error (LightPay extension). */
const ERR_ASSET = 5901

/** Error code: generic internal error. */
const ERR_INTERNAL = -32603

/** Error code: no active connection on the requested chain. */
const ERR_NOT_CONNECTED = -1

/** Typed-data methods that are handled by signTypedData(). */
const TYPED_DATA_METHODS = [
  'eth_signTypedData',
  'eth_signTypedData_v1',
  'eth_signTypedData_v3',
  'eth_signTypedData_v4'
] as const

/** Subscription-type methods that live on the provider rather than being
 *  forwarded to the connection. */
const INTERNAL_SUBSCRIPTION_METHODS = ['eth_subscribe', 'eth_unsubscribe'] as const

// ---------------------------------------------------------------------------
// Module-level state
// ---------------------------------------------------------------------------

/**
 * Running count of every call that enters {@link Provider.send}.
 * Exposed via {@link getProviderStats}.
 */
let requestCounter = 0

/**
 * The single shared middleware pipeline for the lifetime of this module.
 * Layers are registered once during module initialisation (see bottom of file).
 */
const pipeline = new MiddlewarePipeline()

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

interface RequiredApproval {
  type: ApprovalType
  data: any
}

export interface TransactionMetadata {
  tx: TransactionData
  approvals: RequiredApproval[]
}

// ---------------------------------------------------------------------------
// Store helpers
// ---------------------------------------------------------------------------

const storeApi = {
  getOrigin: (id: string) => store('main.origins', id) as Origin
}

const getPayloadOrigin = ({ _origin }: RPCRequestPayload) => storeApi.getOrigin(_origin)

// ---------------------------------------------------------------------------
// Provider class
// ---------------------------------------------------------------------------

export class Provider extends EventEmitter {
  connected = false
  connection = Chains

  handlers: { [id: string]: any } = {}
  subscriptions: { [key in SubscriptionType]: Subscription[] } = {
    accountsChanged: [],
    assetsChanged: [],
    chainChanged: [],
    chainsChanged: [],
    networkChanged: []
  }

  constructor() {
    super()
    this._bindConnectionEvents()
    this._bindProxyEvents()
    this.getNonce = this.getNonce.bind(this)
  }

  // -------------------------------------------------------------------------
  // Private initialisation helpers
  // -------------------------------------------------------------------------

  /** Attach all Chains connection event listeners. */
  private _bindConnectionEvents(): void {
    this.connection.on('connect', (...args) => {
      this.connected = true
      this.emit('connect', ...args)
    })

    this.connection.on('close', () => {
      this.connected = false
    })

    this.connection.on('data', (chain, ...args) => {
      if ((args[0] || {}).method === 'eth_subscription') {
        this.emit('data:subscription', ...args)
      }
      this.emit(`data:${chain.type}:${chain.id}`, ...args)
    })

    this.connection.on('error', (chain, err) => {
      log.error(err)
    })

    this.connection.on('update', (chain: Chain, event) => {
      if (event.type === 'fees') {
        return accounts.updatePendingFees(chain.id)
      }
      if (event.type === 'status') {
        this.emit(`status:${chain.type}:${chain.id}`, event.status)
      }
    })
  }

  /** Attach proxy-connection event listeners. */
  private _bindProxyEvents(): void {
    proxyConnection.on('provider:send', (payload: RPCRequestPayload) => {
      const { id, method } = payload
      this.send(payload, ({ error, result }) => {
        proxyConnection.emit('payload', { id, method, error, result })
      })
    })

    proxyConnection.on('provider:subscribe', (payload: RPC.Subscribe.Request) => {
      const subId = this.createSubscription(payload)
      const { id, jsonrpc } = payload
      proxyConnection.emit('payload', { id, jsonrpc, result: subId })
    })
  }

  // -------------------------------------------------------------------------
  // Subscription event dispatchers
  // -------------------------------------------------------------------------

  /** Notify subscribers when the active account list changes. */
  accountsChanged(accounts: string[]) {
    const address = accounts[0]
    this.subscriptions.accountsChanged
      .filter((subscription) =>
        hasSubscriptionPermission(SubscriptionType.ACCOUNTS, address, subscription.originId)
      )
      .forEach((subscription) => this.sendSubscriptionData(subscription.id, accounts))
  }

  /** Notify subscribers when asset balances change for an account. */
  assetsChanged(address: string, assets: RPC.GetAssets.Assets) {
    this.subscriptions.assetsChanged
      .filter((subscription) =>
        hasSubscriptionPermission(SubscriptionType.ASSETS, address, subscription.originId)
      )
      .forEach((subscription) =>
        this.sendSubscriptionData(subscription.id, { ...assets, account: address })
      )
  }

  /** Notify subscribers when the active chain changes for a given origin. */
  chainChanged(chainId: number, originId: string) {
    const chain = intToHex(chainId)
    this.subscriptions.chainChanged
      .filter((subscription) => subscription.originId === originId)
      .forEach((subscription) => this.sendSubscriptionData(subscription.id, chain))
  }

  /** Notify subscribers when the set of available chains changes. */
  chainsChanged(address: string, chains: RPC.GetEthereumChains.Chain[]) {
    this.subscriptions.chainsChanged
      .filter((subscription) =>
        hasSubscriptionPermission('chainsChanged', address, subscription.originId)
      )
      .forEach((subscription) => this.sendSubscriptionData(subscription.id, chains))
  }

  /** Notify subscribers when the active network ID changes for a given origin. */
  networkChanged(netId: number | string, originId: string) {
    this.subscriptions.networkChanged
      .filter((subscription) => subscription.originId === originId)
      .forEach((subscription) => this.sendSubscriptionData(subscription.id, netId))
  }

  /** Emit a subscription payload to both the proxy connection and this emitter. */
  private sendSubscriptionData(subscription: string, result: any) {
    const payload: RPC.Susbcription.Response = {
      jsonrpc: JSONRPC_VERSION,
      method: 'eth_subscription',
      params: { subscription, result }
    }
    proxyConnection.emit('payload', payload)
    this.emit('data:subscription', payload)
  }

  // -------------------------------------------------------------------------
  // Chain / network query helpers
  // -------------------------------------------------------------------------

  /**
   * Handle `net_version`.
   * Returns the decimal chain ID as a string, or an error when the chain is
   * not currently connected.
   */
  getNetVersion(payload: RPCRequestPayload, res: RPCRequestCallback, targetChain: Chain) {
    const chain = store('main.networks.ethereum', targetChain.id)
    const response = chain?.on
      ? { result: targetChain.id }
      : { error: { message: 'not connected', code: ERR_NOT_CONNECTED } }
    res({ id: payload.id, jsonrpc: payload.jsonrpc, ...response })
  }

  /**
   * Handle `eth_chainId`.
   * Returns the hex-encoded chain ID or an error when disconnected.
   */
  getChainId(payload: RPCRequestPayload, res: RPCSuccessCallback, targetChain: Chain) {
    const chain = store('main.networks.ethereum', targetChain.id)
    const response = chain?.on
      ? { result: intToHex(targetChain.id) }
      : { error: { message: 'not connected', code: ERR_NOT_CONNECTED } }
    res({ id: payload.id, jsonrpc: payload.jsonrpc, ...response })
  }

  // -------------------------------------------------------------------------
  // Request lifecycle helpers
  // -------------------------------------------------------------------------

  /**
   * Decline a pending account request and clean up its handler.
   * Sends a user-rejection error back to the originating dApp.
   */
  declineRequest(req: AccountRequest) {
    const res = (data: any) => {
      if (this.handlers[req.handlerId]) this.handlers[req.handlerId](data)
      delete this.handlers[req.handlerId]
    }
    const payload = req.payload
    resError({ message: 'User declined transaction', code: ERR_USER_REJECTED }, payload, res)
  }

  /**
   * Verify that `signed` was produced by `address` over `message`.
   * Calls `cb` with `true` on success or an `Error` on mismatch.
   */
  verifySignature(signed: string, message: string, address: string, cb: Callback<boolean>) {
    getSignedAddress(signed, message, (err, verifiedAddress) => {
      if (err) return cb(err)
      if ((verifiedAddress || '').toLowerCase() !== address.toLowerCase()) {
        return cb(new Error('LightPay verifySignature: Failed ecRecover check'))
      }
      cb(null, true)
    })
  }

  /**
   * Approve an `eth_sign` / `personal_sign` request.
   *
   * Signs the message with the account key, verifies the resulting signature,
   * then resolves the pending handler.
   */
  approveSign(req: AccountRequest, cb: Callback<string>) {
    const res = (data: any) => {
      if (this.handlers[req.handlerId]) this.handlers[req.handlerId](data)
      delete this.handlers[req.handlerId]
    }
    const payload = req.payload
    let [address, rawMessage] = payload.params
    const message = this._normalizeSignMessage(rawMessage)

    accounts.signMessage(address, message, (err, signed) => {
      if (err) {
        resError(err.message, payload, res)
        return cb(err, undefined)
      }
      const signature = signed || ''
      this.verifySignature(signature, message, address, (verifyErr) => {
        if (verifyErr) {
          resError(verifyErr.message, payload, res)
          return cb(verifyErr)
        }
        res({ id: payload.id, jsonrpc: payload.jsonrpc, result: signature })
        cb(null, signature)
      })
    })
  }

  /**
   * Normalise a raw sign message param to a hex-prefixed string.
   * Handles both hex input (with or without prefix) and UTF-8 strings.
   */
  private _normalizeSignMessage(rawMessage: string): string {
    if (isHexString(rawMessage)) {
      return isHexPrefixed(rawMessage) ? rawMessage : addHexPrefix(rawMessage)
    }
    return fromUtf8(rawMessage)
  }

  /**
   * Approve an `eth_signTypedData*` request.
   *
   * Signs the typed message, verifies recovery, then resolves the handler.
   */
  approveSignTypedData(req: SignTypedDataRequest, cb: Callback<string>) {
    const res = (data: unknown) => {
      if (this.handlers[req.handlerId]) this.handlers[req.handlerId](data)
      delete this.handlers[req.handlerId]
    }
    const { payload, typedMessage } = req
    const [address] = payload.params

    accounts.signTypedData(address, typedMessage, (err, signature = '') => {
      if (err) {
        resError(err.message, payload, res)
        return cb(err)
      }
      this._verifyTypedDataSignature(typedMessage, signature, address, payload, res, cb)
    })
  }

  /**
   * Verify a typed-data signature and call back or error.
   * Extracted from {@link approveSignTypedData} to keep it under 50 lines.
   */
  private _verifyTypedDataSignature(
    typedMessage: any,
    signature: string,
    address: string,
    payload: any,
    res: (data: unknown) => void,
    cb: Callback<string>
  ): void {
    try {
      const recoveredAddress = recoverTypedSignature({ ...typedMessage, signature })
      if (recoveredAddress.toLowerCase() !== address.toLowerCase()) {
        throw new Error('TypedData signature verification failed')
      }
      res({ id: payload.id, jsonrpc: payload.jsonrpc, result: signature })
      cb(null, signature)
    } catch (e) {
      const err = e as Error
      resError(err.message, payload, res)
      cb(err)
    }
  }

  // -------------------------------------------------------------------------
  // Gas helpers
  // -------------------------------------------------------------------------

  /**
   * Estimate the L1 data-posting cost for an L2 transaction.
   * Returns `BigNumber(0)` when no connected provider is available.
   */
  async getL1GasCost(txData: TransactionData) {
    const { chainId, type, ...tx } = txData
    const txRequest = {
      ...tx,
      type: parseInt(type, 16),
      chainId: parseInt(chainId, 16)
    }
    const connection = this.connection.connections['ethereum'][txRequest.chainId] as any
    const connectedProvider = connection?.primary?.connected
      ? connection.primary?.provider
      : connection.secondary?.provider

    if (!connectedProvider) return BigNumber.from(0)
    return estimateL1GasCost(new Web3Provider(connectedProvider), txRequest)
  }

  // -------------------------------------------------------------------------
  // Transaction signing & broadcasting
  // -------------------------------------------------------------------------

  /**
   * Sign a transaction and broadcast it via the active connection.
   *
   * Enforces the hard max-fee cap before signing.  After a successful sign,
   * the raw transaction is broadcast on a {@link BROADCAST_RETRY_INTERVAL_MS}
   * retry loop until the first successful response.
   */
  signAndSend(req: TransactionRequest, cb: Callback<string>) {
    const rawTx = req.data
    const res = (data: any) => {
      if (this.handlers[req.handlerId]) this.handlers[req.handlerId](data)
      delete this.handlers[req.handlerId]
    }
    const payload = req.payload
    const maxTotalFee = maxFee(rawTx)

    if (feeTotalOverMax(rawTx, maxTotalFee)) {
      return this._rejectOverMaxFee(rawTx, maxTotalFee, payload, res, cb)
    }

    accounts.signTransaction(rawTx, (err, signedTx) => {
      if (err) {
        resError(err, payload, res)
        return cb(err)
      }
      this._broadcastSignedTransaction(req, signedTx as string, payload, res, cb)
    })
  }

  /**
   * Reject a transaction that exceeds the hard fee cap.
   * Extracted from {@link signAndSend} to keep that method concise.
   */
  private _rejectOverMaxFee(
    rawTx: TransactionData,
    maxTotalFee: number,
    payload: any,
    res: (data: any) => void,
    cb: Callback<string>
  ): void {
    const chainId = parseInt(rawTx.chainId)
    const symbol = store(`main.networks.ethereum.${chainId}.symbol`)
    const displayAmount = symbol ? ` (${Math.floor(maxTotalFee / 1e18)} ${symbol})` : ''
    const errMsg = `Max fee is over hard limit${displayAmount}`
    resError(errMsg, payload, res)
    cb(new Error(errMsg))
  }

  /**
   * Once a transaction is signed, set it as signed in the accounts store and
   * start the broadcast retry loop.
   * Extracted from {@link signAndSend} to keep that method concise.
   */
  private _broadcastSignedTransaction(
    req: TransactionRequest,
    signedTx: string,
    payload: any,
    res: (data: any) => void,
    cb: Callback<string>
  ): void {
    accounts.setTxSigned(req.handlerId, (err) => {
      if (err) return cb(err)
      let done = false

      const cast = () => {
        this.connection.send(
          {
            id: req.payload.id,
            jsonrpc: req.payload.jsonrpc,
            method: 'eth_sendRawTransaction',
            params: [signedTx]
          },
          (response) => {
            clearInterval(broadcastTimer)
            if (done) return
            done = true
            if (response.error) {
              resError(response.error, payload, res)
              cb(new Error(response.error.message))
            } else {
              res(response)
              cb(null, response.result)
            }
          },
          { type: 'ethereum', id: parseInt(req.data.chainId, 16) }
        )
      }

      const broadcastTimer = setInterval(() => cast(), BROADCAST_RETRY_INTERVAL_MS)
      cast()
    })
  }

  /**
   * Approve a transaction request: optionally fetch a nonce, then sign & send.
   *
   * If the transaction already has a nonce it is used directly.  Otherwise a
   * fresh pending nonce is fetched first.
   */
  approveTransactionRequest(req: TransactionRequest, cb: Callback<string>) {
    const signAndSend = (requestToSign: TransactionRequest) => {
      const { res, ...txToLog } = requestToSign
      log.info('approveRequest', txToLog)
      this.signAndSend(requestToSign, cb)
    }

    accounts.lockRequest(req.handlerId)

    if (req.data.nonce) return signAndSend(req)

    this.getNonce(req.data, (response) => {
      if (response.error) {
        if (this.handlers[req.handlerId]) {
          this.handlers[req.handlerId](response)
          delete this.handlers[req.handlerId]
        }
        return cb(new Error(response.error.message))
      }

      const updatedReq = accounts.updateNonce(req.handlerId, response.result)
      if (updatedReq) {
        signAndSend(updatedReq)
      } else {
        log.error(`could not find request with handlerId="${req.handlerId}"`)
        cb(new Error('could not find request'))
      }
    })
  }

  // -------------------------------------------------------------------------
  // Handler / nonce utilities
  // -------------------------------------------------------------------------

  /** Register a response callback and return the generated handler ID. */
  private addRequestHandler(res: RPCRequestCallback) {
    const handlerId: string = uuid()
    this.handlers[handlerId] = res
    return handlerId
  }

  /**
   * Estimate gas for a transaction via the connection and return a padded
   * limit with a {@link GAS_ESTIMATE_PADDING}× multiplier.
   */
  private async getGasEstimate(rawTx: TransactionData) {
    const { from, to, value, data, nonce } = rawTx
    const txParams = { from, to, value, data, nonce }

    const payload: JSONRPCRequestPayload = {
      method: 'eth_estimateGas',
      params: [txParams],
      jsonrpc: JSONRPC_VERSION,
      id: 1
    }

    const targetChain: Chain = {
      type: 'ethereum',
      id: parseInt(rawTx.chainId, 16)
    }

    return new Promise<string>((resolve, reject) => {
      this.connection.send(
        payload,
        (response) => {
          if (response.error) {
            log.warn(`error estimating gas for tx to ${txParams.to}: ${response.error}`)
            return reject(response.error)
          }
          const estimatedLimit = parseInt(response.result, 16)
          const paddedLimit = Math.ceil(estimatedLimit * GAS_ESTIMATE_PADDING)
          log.verbose(
            `gas estimate for tx to ${txParams.to}: ${estimatedLimit}, using ${paddedLimit} as gas limit`
          )
          return resolve(addHexPrefix(paddedLimit.toString(16)))
        },
        targetChain
      )
    })
  }

  /**
   * Fetch the pending transaction count (nonce) for a raw transaction's
   * `from` address on the appropriate chain.
   */
  getNonce(rawTx: TransactionData, res: RPCRequestCallback) {
    const targetChain: Chain = {
      type: 'ethereum',
      id: parseInt(rawTx.chainId, 16)
    }
    this.connection.send(
      { id: 1, jsonrpc: JSONRPC_VERSION, method: 'eth_getTransactionCount', params: [rawTx.from, 'pending'] },
      res,
      targetChain
    )
  }

  // -------------------------------------------------------------------------
  // Transaction filling
  // -------------------------------------------------------------------------

  /**
   * Populate a transaction with gas estimates, fees, and recipient metadata.
   *
   * Calls back with a {@link TransactionMetadata} object that includes any
   * approvals required before the transaction can be signed (e.g. gas-limit
   * approval when estimation fails).
   */
  async fillTransaction(newTx: RPC.SendTransaction.TxParams, cb: Callback<TransactionMetadata>) {
    if (!newTx) return cb(new Error('No transaction data'))

    const connection = this.connection.connections['ethereum'][parseInt(newTx.chainId, 16)]
    const chainConnected = connection && (connection.primary?.connected || connection.secondary?.connected)

    if (!chainConnected) return cb(new Error(`Chain ${newTx.chainId} not connected`))

    try {
      const { rawTx, gas, chainConfig, approvals } = this._prepareTransactionFields(newTx, connection)
      const [gasLimit, recipientType] = await this._resolveGasAndRecipient(rawTx, approvals)
      const tx = { ...rawTx, gasLimit, recipientType }

      this._finalizeTransaction(tx, chainConfig, gas, approvals, cb)
    } catch (e) {
      log.error('error creating transaction', e)
      cb(e as Error)
    }
  }

  /**
   * Extract the raw transaction, fee parameters, chain config, and an empty
   * approvals array from incoming send-transaction params.
   * Extracted from {@link fillTransaction} to keep that method readable.
   */
  private _prepareTransactionFields(
    newTx: RPC.SendTransaction.TxParams,
    connection: any
  ): { rawTx: TransactionData; gas: any; chainConfig: any; approvals: RequiredApproval[] } {
    const approvals: RequiredApproval[] = []
    const rawTx = getRawTx(newTx)
    const gas = gasFees(rawTx)
    const { chainConfig } = connection
    return { rawTx, gas, chainConfig, approvals }
  }

  /**
   * Resolve gas limit (via estimate or zero fallback) and the recipient entity
   * type in parallel.
   * Extracted from {@link fillTransaction} to keep that method readable.
   */
  private async _resolveGasAndRecipient(
    rawTx: TransactionData,
    approvals: RequiredApproval[]
  ): Promise<[string, string]> {
    const estimateGasLimit = async (): Promise<string> => {
      try {
        return await this.getGasEstimate(rawTx)
      } catch (error) {
        approvals.push({
          type: ApprovalType.GasLimitApproval,
          data: { message: (error as Error).message, gasLimit: '0x00' }
        })
        return '0x00'
      }
    }

    return Promise.all([
      rawTx.gasLimit ?? estimateGasLimit(),
      rawTx.to ? reveal.resolveEntityType(rawTx.to, parseInt(rawTx.chainId, 16)) : ''
    ]) as Promise<[string, string]>
  }

  /**
   * Populate, validate, and return the final transaction.
   * Extracted from {@link fillTransaction} to keep that method readable.
   */
  private _finalizeTransaction(
    tx: any,
    chainConfig: any,
    gas: any,
    approvals: RequiredApproval[],
    cb: Callback<TransactionMetadata>
  ): void {
    try {
      const populatedTransaction = populateTransaction(tx, chainConfig, gas)
      const checkedTransaction = checkExistingNonceGas(populatedTransaction)
      log.verbose('Successfully populated transaction', checkedTransaction)
      cb(null, { tx: checkedTransaction, approvals })
    } catch (error) {
      cb(error as Error)
    }
  }

  // -------------------------------------------------------------------------
  // Method handlers — send transaction
  // -------------------------------------------------------------------------

  /**
   * Handle `eth_sendTransaction`.
   *
   * Validates the sender account, fills the transaction, and queues a signing
   * request.
   */
  sendTransaction(payload: RPC.SendTransaction.Request, res: RPCRequestCallback, targetChain: Chain) {
    try {
      const txParams = payload.params[0]
      const payloadChain = payload.chainId
      const normalizedTx = normalizeChainId(txParams, payloadChain ? parseInt(payloadChain, 16) : undefined)
      const tx = {
        ...normalizedTx,
        chainId: normalizedTx.chainId || payloadChain || addHexPrefix(targetChain.id.toString(16))
      }

      const currentAccount = accounts.current()
      log.verbose(`sendTransaction(${JSON.stringify(tx)}`)

      const from = tx.from || (currentAccount && currentAccount.id)

      if (!currentAccount || !from || !hasAddress(currentAccount, from)) {
        return resError('Transaction is not from currently selected account', payload, res)
      }

      this.fillTransaction({ ...tx, from }, (err, transactionMetadata) => {
        if (err) return resError(err, payload, res)
        this._queueTransactionRequest(
          payload,
          res,
          currentAccount as LightPayAccount,
          transactionMetadata as TransactionMetadata
        )
      })
    } catch (e) {
      resError((e as Error).message, payload, res)
    }
  }

  /**
   * Build and enqueue a transaction signing request.
   * Extracted from {@link sendTransaction} to keep it under 50 lines.
   */
  private _queueTransactionRequest(
    payload: RPC.SendTransaction.Request,
    res: RPCRequestCallback,
    currentAccount: LightPayAccount,
    txMetadata: TransactionMetadata
  ): void {
    const handlerId = this.addRequestHandler(res)
    const { feesUpdated, recipientType, ...data } = txMetadata.tx

    const unclassifiedReq = {
      handlerId,
      type: 'transaction',
      data,
      payload,
      account: currentAccount.id,
      origin: payload._origin,
      approvals: [],
      feesUpdatedByUser: false,
      recipientType,
      recognizedActions: []
    } as Omit<TransactionRequest, 'classification'>

    const classification = classifyTransaction(unclassifiedReq)
    const req = { ...unclassifiedReq, classification }

    accounts.addRequest(req, res)

    txMetadata.approvals.forEach((approval) => {
      currentAccount?.addRequiredApproval(req, approval.type, approval.data)
    })
  }

  // -------------------------------------------------------------------------
  // Method handlers — pass-through and low-level
  // -------------------------------------------------------------------------

  /**
   * Handle `eth_getTransactionByHash`.
   *
   * Normalises the response to ensure `gasPrice` is always present (falling
   * back to `maxFeePerGas` for EIP-1559 transactions).
   */
  getTransactionByHash(payload: RPCRequestPayload, cb: RPCRequestCallback, targetChain: Chain) {
    const res = (response: any) => {
      if (response.result && !response.result.gasPrice && response.result.maxFeePerGas) {
        return cb({ ...response, result: { ...response.result, gasPrice: response.result.maxFeePerGas } })
      }
      cb(response)
    }
    this.connection.send(payload, res, targetChain)
  }

  // -------------------------------------------------------------------------
  // Method handlers — signing
  // -------------------------------------------------------------------------

  /**
   * Handle `personal_sign`.
   *
   * Some clients send params in the wrong order; this method detects the
   * inverted case and delegates to {@link sign} with the correct order.
   */
  _personalSign(payload: RPCRequestPayload, res: RPCRequestCallback) {
    const params = payload.params || []
    if (isAddress(params[0]) && !isAddress(params[1])) {
      // First param is an address → already in eth_sign order
      return this.sign(payload, res)
    }
    // Swap to [address, message] order
    return this.sign({ ...payload, params: [params[1], params[0], ...params.slice(2)] }, res)
  }

  /**
   * Handle `eth_sign`.
   *
   * Validates the current account owns the requested `from` address, then
   * queues a sign request.
   */
  sign(payload: RPCRequestPayload, res: RPCRequestCallback) {
    const [from, message] = payload.params || []
    const currentAccount = accounts.current()

    if (!message) {
      return resError('Sign request requires a message param', payload, res)
    }
    if (!currentAccount || !hasAddress(currentAccount, from)) {
      return resError('Sign request is not from currently selected account', payload, res)
    }

    const handlerId = this.addRequestHandler(res)
    const req = {
      handlerId,
      type: 'sign',
      payload,
      account: (currentAccount as LightPayAccount).getAccounts()[0],
      origin: payload._origin,
      data: { decodedMessage: decodeMessage(message) }
    } as SignatureRequest

    const _res = (data: any) => {
      if (this.handlers[req.handlerId]) this.handlers[req.handlerId](data)
      delete this.handlers[req.handlerId]
    }

    accounts.addRequest(req, _res)
  }

  /**
   * Handle `eth_signTypedData` / `eth_signTypedData_v1` / `_v3` / `_v4`.
   *
   * Validates the target account, detects the appropriate version if not
   * explicit, performs signer-compatibility checks, and enqueues the request.
   */
  signTypedData(
    rawPayload: RPC.SignTypedData.Request,
    version: SignTypedDataVersion,
    res: RPCCallback<RPC.SignTypedData.Response>
  ) {
    const payload = this._normalizeTypedDataParams(rawPayload)
    let [from = '', typedData, ...additionalParams] = payload.params

    if (!typedData) return resError('Missing typed data', payload, res)

    const parseResult = this._parseTypedData(typedData, from, additionalParams, payload, res)
    if (!parseResult) return // resError already called inside

    typedData = parseResult.typedData
    const updatedPayload = parseResult.payload

    if (!Array.isArray(typedData) && !typedData.message) {
      return resError('Typed data missing message', updatedPayload, res)
    }

    if (!version) {
      version = getVersionFromTypedData(typedData)
    }

    const accountCheckResult = this._validateTypedDataAccount(from, updatedPayload, res)
    if (!accountCheckResult) return // resError already called inside

    const { targetAccount, signerType } = accountCheckResult

    if (!this._checkSignerVersionSupport(version, signerType, updatedPayload, res)) return

    this._enqueueTypedDataRequest(updatedPayload, typedData, version, targetAccount, res)
  }

  /**
   * Ensure typed-data params are in [address, data] order regardless of which
   * version of the method was called.
   */
  private _normalizeTypedDataParams(rawPayload: RPC.SignTypedData.Request): RPC.SignTypedData.Request {
    const orderedParams =
      isAddress(rawPayload.params[1]) && !isAddress(rawPayload.params[0])
        ? [rawPayload.params[1], rawPayload.params[0], ...rawPayload.params.slice(2)] as typeof rawPayload.params
        : [...rawPayload.params] as typeof rawPayload.params
    return { ...rawPayload, params: orderedParams }
  }

  /**
   * Parse the typed data field from the payload params.
   * Returns `null` and calls `res` with an error if the data is malformed.
   */
  private _parseTypedData(
    typedData: any,
    from: string,
    additionalParams: any[],
    payload: RPC.SignTypedData.Request,
    res: RPCCallback<RPC.SignTypedData.Response>
  ): { typedData: LegacyTypedData | TypedData; payload: RPC.SignTypedData.Request } | null {
    if (typeof typedData === 'string') {
      try {
        const parsed = JSON.parse(typedData) as LegacyTypedData | TypedData
        return {
          typedData: parsed,
          payload: { ...payload, params: [from, parsed, ...additionalParams] }
        }
      } catch (e) {
        resError('Malformed typed data', payload, res)
        return null
      }
    }
    return { typedData, payload }
  }

  /**
   * Validate that the typed-data `from` address belongs to the currently
   * selected account.  Returns the target account and signer type, or calls
   * `res` with an error and returns `null`.
   */
  private _validateTypedDataAccount(
    from: string,
    payload: RPC.SignTypedData.Request,
    res: RPCCallback<RPC.SignTypedData.Response>
  ): { targetAccount: any; signerType: SignerType | null } | null {
    const targetAccount = accounts.get(from.toLowerCase())
    if (!targetAccount) {
      resError(`Unknown account: ${from}`, payload, res)
      return null
    }

    const currentAccount = accounts.current()
    if (!currentAccount || !hasAddress(currentAccount, targetAccount.id)) {
      resError('Sign request is not from currently selected account', payload, res)
      return null
    }

    const signerType = getSignerType(targetAccount.lastSignerType) ?? null
    return { targetAccount, signerType }
  }

  /**
   * Check that the connected signer supports the requested typed-data version.
   * Returns `false` and calls `res` with an error if unsupported.
   */
  private _checkSignerVersionSupport(
    version: SignTypedDataVersion,
    signerType: SignerType | null,
    payload: RPC.SignTypedData.Request,
    res: RPCCallback<RPC.SignTypedData.Response>
  ): boolean {
    if (
      version !== SignTypedDataVersion.V4 &&
      signerType &&
      [SignerType.Ledger, SignerType.Trezor].includes(signerType)
    ) {
      resError(`${capitalize(signerType)} only supports eth_signTypedData_v4+`, payload, res)
      return false
    }
    if (
      ![SignTypedDataVersion.V3, SignTypedDataVersion.V4].includes(version) &&
      signerType === SignerType.Lattice
    ) {
      resError('Lattice only supports eth_signTypedData_v3+', payload, res)
      return false
    }
    return true
  }

  /**
   * Build and queue the typed-data sign request (plain or ERC-20 permit).
   * Extracted from {@link signTypedData} to keep that method concise.
   */
  private _enqueueTypedDataRequest(
    payload: RPC.SignTypedData.Request,
    typedData: LegacyTypedData | TypedData,
    version: SignTypedDataVersion,
    targetAccount: any,
    res: RPCCallback<RPC.SignTypedData.Response>
  ): void {
    const handlerId = this.addRequestHandler(res as RPCRequestCallback)
    const typedMessage: TypedMessage<typeof version> = { data: typedData, version }
    const type = sigParser.identify(typedMessage)

    const req: SignTypedDataRequest = {
      handlerId,
      type: 'signTypedData',
      typedMessage,
      payload,
      account: targetAccount.address,
      origin: payload._origin
    }

    if (type === 'signErc20Permit') {
      accounts.addRequest(this._buildPermitRequest(req, typedMessage))
    } else {
      accounts.addRequest(req)
    }
  }

  /**
   * Construct an ERC-20 permit signing request from a typed-data request.
   * Extracted from {@link _enqueueTypedDataRequest} for clarity.
   */
  private _buildPermitRequest(
    req: SignTypedDataRequest,
    typedMessage: TypedMessage<SignTypedDataVersion>
  ): PermitSignatureRequest {
    const {
      message: { deadline, spender: spenderAddress, value, owner, nonce },
      domain: { verifyingContract: contractAddress, chainId }
    } = typedMessage.data as EIP2612TypedData

    return {
      ...req,
      type: 'signErc20Permit',
      typedMessage: {
        data: typedMessage.data as EIP2612TypedData,
        version: SignTypedDataVersion.V4
      },
      permit: {
        deadline,
        value,
        owner,
        chainId,
        nonce,
        spender: { address: spenderAddress, ens: '', type: '' },
        verifyingContract: { address: contractAddress, ens: '', type: '' }
      },
      tokenData: { name: '', symbol: '' }
    }
  }

  // -------------------------------------------------------------------------
  // Method handlers — subscriptions
  // -------------------------------------------------------------------------

  /**
   * Handle `eth_subscribe`.
   * Creates a new subscription and returns its ID.
   */
  subscribe(payload: RPC.Subscribe.Request, res: RPCSuccessCallback) {
    log.debug('provider subscribe', { payload })
    const subId = this.createSubscription(payload)
    res({ id: payload.id, jsonrpc: JSONRPC_VERSION, result: subId })
  }

  /** Create a new subscription entry and return its hex ID. */
  private createSubscription(payload: RPC.Subscribe.Request) {
    const subId = addHexPrefix(crypto.randomBytes(16).toString('hex'))
    const subscriptionType = payload.params[0] as SubscriptionType
    this.subscriptions[subscriptionType] = this.subscriptions[subscriptionType] || []
    this.subscriptions[subscriptionType].push({ id: subId, originId: payload._origin })
    return subId
  }

  /**
   * Remove a subscription by ID if it belongs to this provider.
   * Returns `true` when a matching subscription was found and removed.
   */
  ifSubRemove(id: string) {
    return Object.keys(this.subscriptions).some((type) => {
      const subscriptionType = type as SubscriptionType
      const index = this.subscriptions[subscriptionType].findIndex((sub) => sub.id === id)
      return index > -1 && this.subscriptions[subscriptionType].splice(index, 1)
    })
  }

  // -------------------------------------------------------------------------
  // Method handlers — wallet management
  // -------------------------------------------------------------------------

  /**
   * Handle `web3_clientVersion`.
   * Returns a version string in the form `LightPay/vX.Y.Z`.
   */
  clientVersion(payload: RPCRequestPayload, res: RPCSuccessCallback) {
    res({ id: payload.id, jsonrpc: JSONRPC_VERSION, result: `LightPay/v${packageFile.version}` })
  }

  /**
   * Handle `wallet_switchEthereumChain`.
   * Validates the chain ID, checks that the chain exists, and switches the
   * origin's active chain if required.
   */
  private switchEthereumChain(payload: RPCRequestPayload, res: RPCRequestCallback) {
    try {
      const params = payload.params
      if (!params || !params[0]) throw new Error('Params not supplied')

      const chainId = parseInt(params[0].chainId)
      if (!Number.isInteger(chainId)) throw new Error('Invalid chain id')

      const exists = Boolean(store('main.networks.ethereum', chainId))
      if (!exists) {
        return resError({ message: 'Chain does not exist', code: ERR_CHAIN_NOT_ADDED }, payload, res)
      }

      const originId = payload._origin
      const origin = getPayloadOrigin(payload)
      if (origin.chain.id !== chainId) {
        store.switchOriginChain(originId, chainId, origin.chain.type)
      }

      return res({ id: payload.id, jsonrpc: JSONRPC_VERSION, result: null })
    } catch (e) {
      return resError(e as EVMError, payload, res)
    }
  }

  /**
   * Handle `wallet_addEthereumChain`.
   * If the chain already exists the method delegates to
   * {@link switchEthereumChain}; otherwise it queues an add-chain request.
   */
  private addEthereumChain(payload: RPCRequestPayload, res: RPCRequestCallback) {
    if (!payload.params[0]) return resError('addChain request missing params', payload, res)

    const type = 'ethereum'
    const { chainId, chainName, nativeCurrency, rpcUrls = [], blockExplorerUrls = [] } = payload.params[0]

    if (!chainId) return resError('addChain request missing chainId', payload, res)
    if (!chainName) return resError('addChain request missing chainName', payload, res)
    if (!nativeCurrency) return resError('addChain request missing nativeCurrency', payload, res)

    const id = parseInt(chainId, 16)
    if (!Number.isInteger(id)) return resError('Invalid chain id', payload, res)

    const handlerId = this.addRequestHandler(res)
    const exists = Boolean(store('main.networks', type, id))

    if (exists) {
      this.switchEthereumChain(payload, res)
    } else {
      accounts.addRequest(
        {
          handlerId,
          type: 'addChain',
          chain: {
            type,
            id,
            name: chainName,
            symbol: nativeCurrency.symbol,
            primaryRpc: rpcUrls[0],
            secondaryRpc: rpcUrls[1],
            explorer: blockExplorerUrls[0],
            nativeCurrencyName: nativeCurrency.name
          },
          account: (accounts.getAccounts() || [])[0],
          origin: payload._origin,
          payload
        } as AddChainRequest,
        res
      )
    }
  }

  /**
   * Handle `wallet_watchAsset`.
   * Only ERC-20 tokens are supported.  Resolves the current chain ID, then
   * either returns immediately (token already tracked) or queues an add-token
   * approval request.
   */
  private addCustomToken(payload: RPCRequestPayload, cb: RPCRequestCallback, targetChain: Chain) {
    const { type, options: tokenData } = (payload.params || {}) as any

    if ((type || '').toLowerCase() !== 'erc20') {
      return resError('only ERC-20 tokens are supported', payload, cb)
    }

    this.getChainId(
      payload,
      (resp: RPCResponsePayload) => {
        if (resp.error) return resError(resp.error, payload, cb)
        this._enqueueAddTokenRequest(resp, tokenData, payload, cb)
      },
      targetChain
    )
  }

  /**
   * Build and enqueue (or immediately resolve) an add-token request.
   * Extracted from {@link addCustomToken} to keep that method concise.
   */
  private _enqueueAddTokenRequest(
    resp: RPCResponsePayload,
    tokenData: any,
    payload: RPCRequestPayload,
    cb: RPCRequestCallback
  ): void {
    const chainId = parseInt(resp.result)
    const address = (tokenData.address || '').toLowerCase()
    const symbol = (tokenData.symbol || '').toUpperCase()
    const decimals = parseInt(tokenData.decimals || '1')

    if (!address) return resError('tokens must define an address', payload, cb)

    const res = () => { cb({ id: payload.id, jsonrpc: JSONRPC_VERSION, result: true }) }

    const tokenExists = store('main.tokens.custom').some(
      (token: Token) => token.chainId === chainId && token.address === address
    )
    if (tokenExists) return res()

    const token = {
      chainId,
      name: tokenData.name || capitalize(symbol),
      address,
      symbol,
      decimals,
      logoURI: tokenData.image || tokenData.logoURI || ''
    }

    const handlerId = this.addRequestHandler(res)

    accounts.addRequest(
      {
        handlerId,
        type: 'addToken',
        token,
        account: (accounts.current() as LightPayAccount).id,
        origin: payload._origin,
        payload
      } as AddTokenRequest,
      res
    )
  }

  // -------------------------------------------------------------------------
  // Chain resolution
  // -------------------------------------------------------------------------

  /**
   * Determine which chain a payload targets.
   * Uses the explicit `chainId` field when present; falls back to the origin's
   * configured chain.
   */
  private parseTargetChain(payload: RPCRequestPayload): Chain {
    if ('chainId' in payload) {
      const chainId = parseInt(payload.chainId || '', 16)
      const chainConnection = this.connection.connections['ethereum'][chainId] || {}
      return chainConnection.chainConfig && { type: 'ethereum', id: chainId }
    }
    return getPayloadOrigin(payload).chain
  }

  // -------------------------------------------------------------------------
  // Wallet data queries
  // -------------------------------------------------------------------------

  /**
   * Handle `wallet_getEthereumChains`.
   * Returns the list of currently active chains.
   */
  private getChains(payload: JSONRPCRequestPayload, res: RPCSuccessCallback) {
    res({ id: payload.id, jsonrpc: payload.jsonrpc, result: getActiveChains() })
  }

  /**
   * Handle `wallet_getAssets`.
   * Returns native-currency and ERC-20 balances for the current account.
   */
  private getAssets(
    payload: RPC.GetAssets.Request,
    currentAccount: LightPayAccount | null,
    cb: RPCCallback<RPC.GetAssets.Response>
  ) {
    if (!currentAccount) return resError('no account selected', payload, cb)

    try {
      const { nativeCurrency, erc20 } = loadAssets(currentAccount.id)
      return cb({ id: payload.id, jsonrpc: payload.jsonrpc, result: { nativeCurrency, erc20 } })
    } catch (e) {
      return resError({ message: (e as Error).message, code: ERR_ASSET }, payload, cb)
    }
  }

  // -------------------------------------------------------------------------
  // Method dispatcher
  // -------------------------------------------------------------------------

  /**
   * Route a parsed, chain-resolved RPC payload to the correct handler.
   *
   * This function embodies the entire method-dispatch logic that was formerly
   * an inline chain of `if/else if` statements inside {@link send}.  Moving it
   * here makes it independently testable and keeps `send` focused on
   * pipeline orchestration.
   *
   * @param method      - The RPC method name (already lower-cased by caller).
   * @param payload     - The fully-parsed request payload.
   * @param res         - The response callback to invoke once handling completes.
   * @param targetChain - The chain this request targets (resolved before dispatch).
   */
  dispatchMethod(method: string, payload: RPCRequestPayload, res: RPCRequestCallback, targetChain: Chain) {
    // --- Account methods ---
    if (method === 'eth_coinbase') return this._handleGetCoinbase(payload, res)
    if (method === 'eth_accounts') return this._handleGetAccounts(payload, res)
    if (method === 'eth_requestAccounts') return this._handleGetAccounts(payload, res)

    // --- Transaction methods ---
    if (method === 'eth_sendTransaction') {
      return this.sendTransaction(payload as RPC.SendTransaction.Request, res, targetChain)
    }
    if (method === 'eth_getTransactionByHash') {
      return this.getTransactionByHash(payload, res, targetChain)
    }

    // --- Signing methods ---
    if (method === 'personal_sign') return this._personalSign(payload, res)
    if (method === 'eth_sign') return this.sign(payload, res)
    if ((TYPED_DATA_METHODS as readonly string[]).includes(method)) {
      return this._handleSignTypedData(method, payload, res)
    }

    // --- Utility methods ---
    if (method === 'personal_ecRecover') return ecRecover(payload, res)
    if (method === 'web3_clientVersion') return this.clientVersion(payload, res)

    // --- Subscription methods ---
    if (method === 'eth_subscribe' && payload.params[0] in this.subscriptions) {
      return this.subscribe(payload as RPC.Subscribe.Request, res)
    }

    // --- Wallet management methods ---
    if (method === 'wallet_addEthereumChain') return this.addEthereumChain(payload, res)
    if (method === 'wallet_switchEthereumChain') return this.switchEthereumChain(payload, res)
    if (method === 'wallet_getPermissions') return getPermissions(payload, res)
    if (method === 'wallet_requestPermissions') return requestPermissions(payload, res)
    if (method === 'wallet_watchAsset') return this.addCustomToken(payload, res, targetChain)
    if (method === 'wallet_getEthereumChains') return this.getChains(payload, res)
    if (method === 'wallet_getAssets') {
      return this.getAssets(
        payload as RPC.GetAssets.Request,
        accounts.current(),
        res as RPCCallback<RPC.GetAssets.Response>
      )
    }

    // --- Connection-dependent chain methods ---
    if (method === 'net_version') return this.getNetVersion(payload, res, targetChain)
    if (method === 'eth_chainId') return this.getChainId(payload, res, targetChain)

    // --- Pass-through: forward unrecognised methods to the connection ---
    const { _origin, chainId, ...rpcPayload } = payload
    this.connection.send(rpcPayload, res, targetChain)
  }

  // -------------------------------------------------------------------------
  // Dispatch sub-helpers
  // -------------------------------------------------------------------------

  /** Inline handler for `eth_accounts` / `eth_requestAccounts`. */
  private _handleGetAccounts(payload: RPCRequestPayload, res: RPCRequestCallback): void {
    res({
      id: payload.id,
      jsonrpc: payload.jsonrpc,
      result: accounts.getSelectedAddresses().map((a) => a.toLowerCase())
    })
  }

  /** Inline handler for `eth_coinbase`. */
  private _handleGetCoinbase(payload: RPCRequestPayload, res: RPCRequestCallback): void {
    accounts.getAccounts((err, accs) => {
      if (err) return resError(`signTransaction Error: ${JSON.stringify(err)}`, payload, res)
      res({ id: payload.id, jsonrpc: payload.jsonrpc, result: (accs || [])[0] })
    })
  }

  /**
   * Extract the typed-data version suffix from the method name and delegate to
   * {@link signTypedData}.
   */
  private _handleSignTypedData(method: string, payload: RPCRequestPayload, res: RPCRequestCallback): void {
    const underscoreIndex = method.lastIndexOf('_')
    const version = (
      underscoreIndex > 3 ? method.substring(underscoreIndex + 1).toUpperCase() : undefined
    ) as SignTypedDataVersion

    this.signTypedData(
      payload as RPC.SignTypedData.Request,
      version,
      res as RPCCallback<RPC.SignTypedData.Response>
    )
  }

  // -------------------------------------------------------------------------
  // Public entry points
  // -------------------------------------------------------------------------

  /**
   * Async-friendly wrapper around {@link send}.
   * Converts a response error into a thrown `Error` as expected by legacy
   * callers using the `sendAsync` API.
   */
  sendAsync(payload: RPCRequestPayload, cb: Callback<RPCResponsePayload>) {
    this.send(payload, (res) => {
      if (res.error) {
        cb(new Error(res.error.message || 'sendAsync error did not have message'))
      } else {
        cb(null, res)
      }
    })
  }

  /**
   * Primary entry point for all JSON-RPC requests.
   *
   * The request flows through the {@link pipeline}:
   *  1. `auth-check`       — validates the origin is known.
   *  2. `chain-validator`  — resolves the target chain and rejects unknown chains.
   *  3. `rate-limiter`     — guards against per-origin request floods.
   *  4. `method-dispatcher`— calls {@link dispatchMethod} with the resolved context.
   *
   * `eth_unsubscribe` is handled before the pipeline as a fast-path to avoid
   * unnecessary middleware overhead for an extremely common, low-risk call.
   *
   * @param requestPayload - Raw incoming JSON-RPC request.
   * @param res            - Callback to receive the JSON-RPC response.
   */
  send(requestPayload: RPCRequestPayload, res: RPCRequestCallback = () => {}) {
    requestCounter++

    let payload: RPCRequestPayload
    try {
      payload = mapRequest(requestPayload)
    } catch (e) {
      return resError({ message: (e as Error).message }, requestPayload, res)
    }

    const method = payload.method || ''

    // Fast-path: unsubscribe before the pipeline touches anything
    if (method === 'eth_unsubscribe' && this.ifSubRemove(payload.params[0])) {
      return res({ id: payload.id, jsonrpc: JSONRPC_VERSION, result: true })
    }

    // Run the full middleware pipeline
    pipeline.execute({ payload, res, method, provider: this }, (pipelineResult: any) => {
      // The method-dispatcher layer handles writing the response; nothing more to do.
    })
  }

  emit(type: string | symbol, ...args: any[]) {
    return super.emit(type, ...args)
  }
}

// ---------------------------------------------------------------------------
// Module-level pipeline registration
// ---------------------------------------------------------------------------

/**
 * `auth-check` — Verify that the request originates from a known origin.
 *
 * Passes through immediately for internal calls.  For dApp calls it ensures
 * the `_origin` field is present and corresponds to a tracked origin; unknown
 * origins are rejected with a 4100 error.
 */
pipeline.use({
  name: 'auth-check',
  fn: (ctx, res, next) => {
    const { payload } = ctx
    const originId: string = payload?._origin

    // No _origin means an internal call — always allowed
    if (!originId) return next()

    const origin = storeApi.getOrigin(originId)
    if (!origin) {
      log.warn(`auth-check: unknown origin "${originId}" for method "${payload?.method}"`)
      res({
        id: payload.id,
        jsonrpc: JSONRPC_VERSION,
        error: { message: 'Unknown request origin', code: 4100 }
      })
      return
    }

    // Attach resolved origin to context so later layers don't have to look it up
    ctx.resolvedOrigin = origin
    next()
  }
})

/**
 * `chain-validator` — Resolve the target chain and reject requests that
 * reference an unknown chain.
 *
 * Attaches `ctx.targetChain` so the dispatcher layer doesn't have to call
 * `parseTargetChain` itself.
 */
pipeline.use({
  name: 'chain-validator',
  fn: (ctx, res, next) => {
    const { payload, provider } = ctx
    const method: string = payload?.method || ''

    // `eth_unsubscribe` was already handled as a fast-path in send()
    // Some methods don't need a chain (e.g. web3_clientVersion) — we still
    // attempt resolution and let the dispatcher handle a missing chain gracefully
    const targetChain = provider.parseTargetChain
      ? (provider as any).parseTargetChain(payload)
      : null

    if (!targetChain) {
      // Only a hard-fail if the method is chain-specific
      const category = getMethodCategory(method)
      if (category === 'chain' || category === 'transaction' || category === 'signature') {
        log.warn('chain-validator: received request with unknown chain', JSON.stringify(payload))
        res({
          id: payload.id,
          jsonrpc: JSONRPC_VERSION,
          error: { message: `unknown chain: ${payload.chainId}`, code: ERR_UNKNOWN_CHAIN }
        })
        return
      }
    }

    ctx.targetChain = targetChain
    next()
  }
})

/**
 * `rate-limiter` — Lightweight per-origin request throttle.
 *
 * Tracks a rolling 1-second window per origin.  Requests beyond
 * `MAX_REQUESTS_PER_SECOND` are rejected with a 429-style error.
 *
 * This is intentionally simple; a production rate-limiter would use a more
 * sophisticated token-bucket or sliding-window algorithm.
 */
const MAX_REQUESTS_PER_SECOND = 50
const originRequestCounts = new Map<string, { count: number; windowStart: number }>()

pipeline.use({
  name: 'rate-limiter',
  fn: (ctx, res, next) => {
    const { payload } = ctx
    const originId: string = payload?._origin || '__internal__'
    const now = Date.now()
    const window = originRequestCounts.get(originId)

    if (window && now - window.windowStart < 1000) {
      window.count++
      if (window.count > MAX_REQUESTS_PER_SECOND) {
        log.warn(`rate-limiter: origin "${originId}" exceeded ${MAX_REQUESTS_PER_SECOND} req/s`)
        res({
          id: payload.id,
          jsonrpc: JSONRPC_VERSION,
          error: { message: 'Too many requests', code: -32005 }
        })
        return
      }
    } else {
      originRequestCounts.set(originId, { count: 1, windowStart: now })
    }

    next()
  }
})

/**
 * `method-dispatcher` — Terminal layer that calls {@link Provider.dispatchMethod}.
 *
 * By the time execution reaches this layer:
 *  - `ctx.payload` has been fully validated and normalised
 *  - `ctx.targetChain` has been resolved (or is `null` for non-chain methods)
 *  - The origin has been verified as known
 *
 * This layer does NOT call `next()` — it is always the final layer in the
 * pipeline and consumes the request by writing to `res`.
 */
pipeline.use({
  name: 'method-dispatcher',
  fn: (ctx, res, _next) => {
    const { payload, provider, targetChain } = ctx
    const method: string = payload?.method || ''

    // For methods that require a target chain and none was resolved, emit an
    // error.  This duplicates the chain-validator guard as a safety net.
    if (!targetChain) {
      const category = getMethodCategory(method)
      if (category === 'chain' || category === 'transaction' || category === 'signature') {
        res({
          id: payload.id,
          jsonrpc: JSONRPC_VERSION,
          error: { message: `unknown chain: ${payload.chainId}`, code: ERR_UNKNOWN_CHAIN }
        })
        return
      }
    }

    provider.dispatchMethod(method, payload, res, targetChain)
  }
})

// ---------------------------------------------------------------------------
// Singleton export
// ---------------------------------------------------------------------------

const provider = new Provider()

store.observer(ChainsObserver(provider), 'provider:chains')
store.observer(OriginChainObserver(provider), 'provider:origins')
store.observer(AssetsObserver(provider), 'provider:assets')

// ---------------------------------------------------------------------------
// Module-level public utilities
// ---------------------------------------------------------------------------

/**
 * Return a snapshot of provider runtime statistics.
 *
 * Useful for diagnostics, health-checks, and internal monitoring dashboards.
 *
 * @returns An object containing:
 *  - `pipeline` — current middleware layer count and names from
 *    {@link MiddlewarePipeline.getStats}.
 *  - `requestCount` — total number of calls to {@link Provider.send} since
 *    the module was loaded.
 */
export function getProviderStats(): { pipeline: object; requestCount: number } {
  return {
    pipeline: pipeline.getStats(),
    requestCount: requestCounter
  }
}

export default provider
