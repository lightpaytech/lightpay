import { IncomingMessage, Server } from 'http'
import WebSocket from 'ws'
import { v4 as uuid } from 'uuid'
import log from 'electron-log'
import { isHexString } from '@ethereumjs/util'

import store from '../store'
import provider from '../provider'
import accounts from '../accounts'
import windows from '../windows'

import {
  updateOrigin,
  isTrusted,
  parseOrigin,
  isKnownExtension,
  LightPayExtension,
  parseLightPayExtension
} from './origins'
import validPayload from './validPayload'
import protectedMethods from './protectedMethods'

const logTraffic = (origin: string) =>
  process.env.LOG_TRAFFIC === 'true' || process.env.LOG_TRAFFIC === origin

const subs: Record<string, Subscription> = {}
const connectionMonitors: Record<string, NodeJS.Timeout> = {}

interface Subscription {
  originId: string
  socket: LightPayWebSocket
}

interface LightPayWebSocket extends WebSocket {
  id: string
  origin?: string
  lightpayExtension?: LightPayExtension
}

interface ExtensionPayload extends JSONRPCRequestPayload {
  __lightpayOrigin?: string
  __extensionConnecting?: boolean
}

function extendSession(originId: string) {
  if (originId) {
    clearTimeout(connectionMonitors[originId])

    connectionMonitors[originId] = setTimeout(() => {
      store.endOriginSession(originId)
    }, 60 * 1000)
  }
}

const handler = (socket: LightPayWebSocket, req: IncomingMessage) => {
  socket.id = uuid()
  socket.origin = req.headers.origin
  socket.lightpayExtension = parseLightPayExtension(req)

  const res = (payload: RPCResponsePayload) => {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(payload), (err) => {
        if (err) log.info(err)
      })
    }
  }

  socket.on('message', async (data) => {
    const rawPayload = validPayload<ExtensionPayload>(data.toString())
    if (!rawPayload) return console.warn('Invalid Payload', data)

    let requestOrigin = socket.origin
    if (socket.lightpayExtension) {
      if (!(await isKnownExtension(socket.lightpayExtension))) {
        const error = {
          message: `Permission denied, approve connection from LightPay Companion with id ${socket.lightpayExtension.id} in LightPay to continue`,
          code: 4001
        }

        return res({ id: rawPayload.id, jsonrpc: rawPayload.jsonrpc, error })
      }

      // Request from extension, swap origin
      if (rawPayload.__lightpayOrigin) {
        requestOrigin = rawPayload.__lightpayOrigin
        delete rawPayload.__lightpayOrigin
      } else {
        requestOrigin = 'lightpay-extension'
      }
    }

    const origin = parseOrigin(requestOrigin)

    if (logTraffic(origin))
      log.info(
        `req -> | ${socket.lightpayExtension ? 'ext' : 'ws'} | ${origin} | ${rawPayload.method} | -> | ${
          rawPayload.params
        }`
      )

    const { payload, chainId } = updateOrigin(rawPayload, origin, rawPayload.__extensionConnecting)

    if (!isHexString(chainId)) {
      const error = {
        message: `Invalid chain id (${rawPayload.chainId}), chain id must be hex-prefixed string`,
        code: -1
      }
      return res({ id: rawPayload.id, jsonrpc: rawPayload.jsonrpc, error })
    }

    if (!rawPayload.__extensionConnecting) {
      extendSession(payload._origin)
    }

    if (origin === 'lightpay-extension') {
      // custom extension action for summoning LightPay
      if (rawPayload.method === 'lightpay_summon') return windows.toggleTray()

      const { id, jsonrpc } = rawPayload
      if (rawPayload.method === 'eth_chainId') return res({ id, jsonrpc, result: chainId })
      if (rawPayload.method === 'net_version') return res({ id, jsonrpc, result: parseInt(chainId, 16) })
    }

    if (protectedMethods.indexOf(payload.method) > -1 && !(await isTrusted(payload))) {
      let error = { message: 'Permission denied, approve ' + origin + ' in LightPay to continue', code: 4001 }
      // review
      if (!accounts.getSelectedAddresses()[0]) error = { message: 'No LightPay account selected', code: 4001 }
      res({ id: payload.id, jsonrpc: payload.jsonrpc, error })
    } else {
      provider.send(payload, (response) => {
        if (response && response.result) {
          if (payload.method === 'eth_subscribe') {
            subs[response.result] = { socket, originId: payload._origin }
          } else if (payload.method === 'eth_unsubscribe') {
            payload.params.forEach((sub) => {
              if (subs[sub]) delete subs[sub]
            })
          }
        }

        if (logTraffic(origin))
          log.info(
            `<- res | ${socket.lightpayExtension ? 'ext' : 'ws'} | ${origin} | ${
              payload.method
            } | <- | ${JSON.stringify(response.result || response.error)}`
          )

        res(response)
      })
    }
  })
  socket.on('error', (err) => log.error(err))
  socket.on('close', () => {
    Object.keys(subs).forEach((sub) => {
      if (subs[sub].socket.id === socket.id) {
        provider.send({
          jsonrpc: '2.0',
          id: 1,
          method: 'eth_unsubscribe',
          _origin: subs[sub].originId,
          params: [sub]
        })
        delete subs[sub]
      }
    })
  })
}

export default function (server: Server) {
  const ws = new WebSocket.Server({ server })
  ws.on('connection', handler)

  provider.on('data:subscription', (payload: RPC.Susbcription.Response) => {
    const subscription = subs[payload.params.subscription]

    if (subscription) {
      subscription.socket.send(JSON.stringify(payload))
    }
  })

  return server
}
