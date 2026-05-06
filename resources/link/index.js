import { v4 } from 'uuid'
import EventEmitter from 'events'

// ─── Constants ────────────────────────────────────────────────────────────────

/** Message source tag that identifies outgoing window messages from this module */
const SOURCE_TAG = 'tray:link'

/** Allowed origins for incoming `window.message` events */
const SAFE_ORIGINS = ['file://'].concat(
  process.env.NODE_ENV === 'development' ? ['http://localhost:1234'] : []
)

/** Method identifiers used in the message envelope */
const METHOD = {
  RPC:    'rpc',
  INVOKE: 'invoke',
  EVENT:  'event'
}

// ─── Serialisation helpers ────────────────────────────────────────────────────

const unwrap = (v) => (v !== undefined || v !== null ? JSON.parse(v) : v)
const wrap   = (v) => (v !== undefined || v !== null ? JSON.stringify(v) : v)

// ─── Pending-response registry ────────────────────────────────────────────────

/** Maps in-flight request IDs to their resolve/callback functions */
const handlers = {}

// ─── Link EventEmitter ────────────────────────────────────────────────────────

const link = new EventEmitter()

/**
 * Fire-and-forget RPC call. The last argument must be a callback function that
 * will be invoked with the response arguments from the main process.
 *
 * @param {...any} args - Positional arguments followed by a callback function
 */
link.rpc = (...args) => {
  const cb = args.pop()
  if (typeof cb !== 'function') throw new Error('link.rpc requires a callback')
  const id = v4()
  handlers[id] = cb
  window.postMessage(wrap({ id, args, source: SOURCE_TAG, method: METHOD.RPC }), '*')
}

/**
 * Send a one-way event to the main process. No response is expected.
 *
 * @param {...any} args - Event name and optional payload arguments
 */
link.send = (...args) => {
  window.postMessage(wrap({ args, source: SOURCE_TAG, method: METHOD.EVENT }), '*')
}

/**
 * Promise-based RPC call. Resolves with the response argument array from the
 * main process.
 *
 * @param {...any} args - Positional arguments for the RPC call
 * @returns {Promise<any[]>}
 */
link.invoke = (...args) => {
  return new Promise((resolve) => {
    const id = v4()
    handlers[id] = resolve
    window.postMessage(wrap({ id, args, source: SOURCE_TAG, method: METHOD.INVOKE }), '*')
  })
}

// ─── Incoming message handler ─────────────────────────────────────────────────

window.addEventListener(
  'message',
  (e) => {
    // Reject messages from unknown origins or the React DevTools injector
    if (!SAFE_ORIGINS.includes(e.origin) || e.data.source?.includes('react-devtools')) return

    const data = unwrap(e.data)
    const args = data.args || []

    // Only process messages that did NOT originate from this module itself
    if (data.source !== SOURCE_TAG) {
      if (data.method === METHOD.RPC) {
        if (!handlers[data.id]) return console.log('link.rpc response had no handler')
        handlers[data.id](...args)
        delete handlers[data.id]
      } else if (data.method === METHOD.INVOKE) {
        if (!handlers[data.id]) return console.log('link.invoke response had no handler')
        handlers[data.id](args)
        delete handlers[data.id]
      } else if (data.method === METHOD.EVENT) {
        if (!data.channel) return console.log('link.on event had no channel')
        link.emit(data.channel, ...args)
      }
    }
  },
  false
)

export default link
