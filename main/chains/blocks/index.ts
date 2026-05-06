import { EventEmitter } from 'events'
import log from 'electron-log'

import type { BigNumber } from 'bignumber.js'

interface Connection extends EventEmitter {
  chainId: string
  send(payload: JSONRPCRequestPayload): Promise<any>
}

interface SubscriptionMessage {
  type: 'eth_subscription'
  data: {
    result: Block
    subscription: string
  }
}

export interface Block {
  difficulty: BigNumber
  extraData: string
  gasLimit: number
  gasUsed: number
  hash: string | null
  logsBloom: string | null
  miner: string
  nonce: string | null
  number: string
  parentHash: string
  sha3Uncles: string
  size: number
  stateRoot: string
  timestamp: number
  totalDifficulty: BigNumber
  transactionsRoot: string
  uncles: string[]
}

/**
 * Returns the age of a block in seconds relative to `nowMs`.
 * Uses the block's `timestamp` field (Unix seconds).
 *
 * @param block - A block object with a `timestamp` field
 * @param nowMs - Current time in milliseconds (defaults to Date.now())
 */
export function getBlockAge(block: Pick<Block, 'timestamp'>, nowMs = Date.now()): number {
  return Math.max(0, Math.floor(nowMs / 1000) - block.timestamp)
}

class BlockMonitor extends EventEmitter {
  private connection: Connection
  private poller: NodeJS.Timeout | undefined
  private subscriptionId: string

  latestBlock: string

  constructor(connection: Connection) {
    super()

    this.getLatestBlock = this.getLatestBlock.bind(this)
    this.handleBlock = this.handleBlock.bind(this)
    this.handleMessage = this.handleMessage.bind(this)
    this.start = this.start.bind(this)
    this.stop = this.stop.bind(this)

    this.connection = connection
    this.latestBlock = '0x0'
    this.subscriptionId = ''

    this.connection.on('connect', this.start)
    this.connection.on('close', this.stop)
  }

  get chainId() {
    return parseInt(this.connection.chainId, 16)
  }

  start() {
    log.verbose(`%cStarting block updates for chain ${this.chainId}`, 'color: green')

    this.connection.on('message', this.handleMessage)

    // Load the latest block immediately on connect, then subscribe for new heads
    this.getLatestBlock()

    this.connection
      .send({ id: 1, jsonrpc: '2.0', method: 'eth_subscribe', params: ['newHeads'] })
      .then((subId) => (this.subscriptionId = subId))
      .catch(() => {
        // Subscriptions not supported — fall back to polling
        this.clearSubscription()
        this.poller = setInterval(this.getLatestBlock, 15 * 1000)
      })
  }

  stop() {
    log.verbose(`%cStopping block updates for chain ${this.chainId}`, 'color: red')

    if (this.subscriptionId) {
      this.clearSubscription()
    }

    if (this.poller) {
      this.stopPoller()
    }
  }

  private clearSubscription() {
    this.connection.off('message', this.handleMessage)
    this.subscriptionId = ''
  }

  private getLatestBlock() {
    this.connection
      .send({ id: 1, jsonrpc: '2.0', method: 'eth_getBlockByNumber', params: ['latest', false] })
      .then((block) => this.handleBlock(block))
      .catch((err) => this.handleError(`Could not load block for chain ${this.chainId}`, err))
  }

  private handleMessage(message: SubscriptionMessage) {
    if (message.type === 'eth_subscription' && message.data.subscription === this.subscriptionId) {
      this.handleBlock(message.data.result)
    }
  }

  private handleBlock(blockUpdate: unknown) {
    if (!blockUpdate || typeof blockUpdate !== 'object') {
      return this.handleError(`Received invalid block on chain ${this.chainId}`)
    }

    const block = blockUpdate as Block

    log.debug(`%cReceived block ${parseInt(block.number)} for chain ${this.chainId}`, 'color: yellow', {
      latestBlock: parseInt(this.latestBlock)
    })

    if (block.number !== this.latestBlock) {
      this.latestBlock = block.number
      this.connection.emit('status', 'connected')
      this.emit('data', block)
    }
  }

  private handleError(...args: unknown[]) {
    this.connection.emit('status', 'degraded')
    log.error(...args)
  }

  private stopPoller() {
    clearInterval(this.poller as NodeJS.Timeout)
    this.poller = undefined
  }
}

export default BlockMonitor
