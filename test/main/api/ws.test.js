import WebSocket from 'ws'
import { EventEmitter } from 'stream'

import store from '../../../main/store'
import ws from '../../../main/api/ws'

// Shared fixtures
const extensionRequest = {
  headers: {
    origin: 'chrome-extension://ldcoohedfbjoobcadoglnnmmfbdlmmhf'
  }
}

const baseRpcRequest = {
  id: 9,
  jsonrpc: '2.0',
  params: []
}

jest.mock('ws')
jest.mock('../../../main/store')
jest.mock('../../../main/provider', () => ({ on: jest.fn() }))
jest.mock('../../../main/accounts', () => {})
jest.mock('../../../main/windows', () => {})

let socketConnection, mockSocket

beforeEach(() => {
  store.initOrigin = jest.fn()

  socketConnection = new EventEmitter()
  mockSocket = new EventEmitter()
  mockSocket.readyState = WebSocket.OPEN

  WebSocket.Server.mockReturnValueOnce(socketConnection)

  ws()
  socketConnection.emit('connection', mockSocket, extensionRequest)
})

afterEach(() => {
  jest.clearAllMocks()
})

describe('extension RPC responses', () => {
  it('always responds to an extension request for chain id with the requested chain id', (done) => {
    const rpcRequest = { ...baseRpcRequest, method: 'eth_chainId' }

    mockSocket.send = (response) => {
      const responsePayload = JSON.parse(response)
      expect(responsePayload.id).toBe(rpcRequest.id)
      expect(responsePayload.jsonrpc).toBe(rpcRequest.jsonrpc)
      expect(responsePayload.result).toBe('0x1')

      done()
    }

    mockSocket.emit('message', JSON.stringify(rpcRequest))
  })

  it('always responds to an extension request for net version with the requested chain', (done) => {
    const rpcRequest = { ...baseRpcRequest, method: 'net_version' }

    mockSocket.send = (response) => {
      const responsePayload = JSON.parse(response)
      expect(responsePayload.id).toBe(rpcRequest.id)
      expect(responsePayload.jsonrpc).toBe(rpcRequest.jsonrpc)
      expect(responsePayload.result).toBe(1)

      done()
    }

    mockSocket.emit('message', JSON.stringify(rpcRequest))
  })
})
