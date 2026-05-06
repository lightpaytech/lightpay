import log from 'electron-log'

// -- Helpers ------------------------------------------------------------------

/** Returns true when a value is neither null nor undefined */
const isDefined = (value: unknown): boolean => value !== null && value !== undefined

/**
 * Returns true when the payload's `id` field is a valid JSON-RPC identifier
 * (either a string or a number).
 */
function hasValidId(payload: JSONRPCRequestPayload): boolean {
  const { id } = payload
  return typeof id === 'number' || typeof id === 'string'
}

/**
 * Returns true when the payload's `params` field is either an array or
 * a plain object (both are accepted by the JSON-RPC spec).
 */
function hasValidParams(payload: JSONRPCRequestPayload): boolean {
  const { params } = payload
  return Array.isArray(params) || typeof params === 'object'
}

/**
 * Performs a full structural validation of a JSON-RPC request payload.
 * All required fields must be present and of the expected types.
 */
function isStructurallyValid(payload: JSONRPCRequestPayload): boolean {
  return (
    hasValidId(payload) &&
    typeof payload.jsonrpc === 'string' &&
    typeof payload.method === 'string' &&
    hasValidParams(payload)
  )
}

// -- Main export --------------------------------------------------------------

/**
 * Parse and validate a raw JSON string as a JSON-RPC request payload.
 * Returns the typed payload on success, or false if parsing or validation fails.
 */
export default function <T extends JSONRPCRequestPayload>(data: string): T | false {
  if (!data) return false

  try {
    const payload = (JSON.parse(data) as T) || {}

    const { id, method } = payload
    if (!isDefined(id) || !isDefined(method)) return false

    // Ensure params is always an array when not explicitly provided
    if (!payload.params) payload.params = []

    return isStructurallyValid(payload) ? payload : false
  } catch (e) {
    log.info('Error parsing payload: ', data, e)
    return false
  }
}
