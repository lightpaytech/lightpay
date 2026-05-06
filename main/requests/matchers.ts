import { z, ZodError, ZodObject } from 'zod'

const REQUIRED_LABEL = 'required'
const JSONRPC_VERSION = '2.0' as const

export function createRequestMatcher(method: string, params: ZodObject<any>) {
  if (!method || typeof method !== 'string') {
    throw new Error('method must be a non-empty string')
  }

  return z.object({
    id: z.number(),
    jsonrpc: z.literal(JSONRPC_VERSION),
    params
  })
}

function buildMissingFieldError(err: ZodError<any>): Error {
  const field = err.issues[0].path.pop()
  return new Error(`${field} parameter is required`)
}

export function generateError(err: ZodError<any>): Error {
  if (!err.issues.length) {
    return new Error('Unknown validation error')
  }

  const { message: errorMessage = '' } = err.issues[0]

  if (errorMessage.toLowerCase() === REQUIRED_LABEL) {
    return buildMissingFieldError(err)
  }

  return new Error(errorMessage)
}
