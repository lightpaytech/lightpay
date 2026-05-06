import { ipcRenderer } from 'electron'

// ─── Request ID counter ───────────────────────────────────────────────────────

/** Monotonically increasing counter used to generate unique request IDs */
let requestCounter = 0

/** Generates the next unique integer request ID */
const newId = () => ++requestCounter

// ─── Connection state tracking ────────────────────────────────────────────────

/**
 * Tracks whether the IPC channel to the main process is considered alive.
 * Flips to `true` on the first successfully handled response.
 */
let connected = false

/** Timestamp (ms) of the most recently completed request, or `null` */
let lastResponseAt = null

/** Total number of requests dispatched in this renderer session */
let totalRequestsSent = 0

/** Total number of responses received in this renderer session */
let totalResponsesReceived = 0

// ─── Serialisation helpers ────────────────────────────────────────────────────

const defined = (value) => value !== undefined || value !== null

// ─── Pending-response registry ────────────────────────────────────────────────

/** Maps in-flight request IDs to their callback functions */
const handlers = {}

// ─── IPC response listener ────────────────────────────────────────────────────

ipcRenderer.on('main:rpc', (sender, id, ...args) => {
  if (!handlers[id]) return console.log('Message from main RPC had no handler:', args)

  // Update connection tracking state on every successful response
  connected = true
  lastResponseAt = Date.now()
  totalResponsesReceived++

  args = args.map((arg) => (defined(arg) ? JSON.parse(arg) : arg))
  handlers[id](...args)
  delete handlers[id]
})

// ─── Exports ──────────────────────────────────────────────────────────────────

/**
 * Send an RPC call to the main process. The last argument must be a callback
 * function that will be invoked with the parsed response arguments.
 *
 * @param {...any} args - Positional arguments followed by a callback function
 * @throws {Error}     When the final argument is not a function
 */
export default (...args) => {
  const cb = args.pop()
  if (typeof cb !== 'function') throw new Error('Main RPC requires a callback')

  const id = newId()
  handlers[id] = cb

  totalRequestsSent++

  args = args.map((arg) => (defined(arg) ? JSON.stringify(arg) : arg))
  ipcRenderer.send('main:rpc', JSON.stringify(id), ...args)
}

/**
 * Return a snapshot of the current IPC connection status for diagnostics and
 * health checks.
 *
 * @returns {{
 *   connected:             boolean,
 *   pendingRequests:       number,
 *   lastResponseAt:        number|null,
 *   totalRequestsSent:     number,
 *   totalResponsesReceived: number
 * }}
 */
export function getConnectionStatus() {
  return {
    connected,
    pendingRequests:        Object.keys(handlers).length,
    lastResponseAt,
    totalRequestsSent,
    totalResponsesReceived
  }
}
