import { z } from 'zod'
import { createRequestMatcher } from '../matchers'

import { chainIdMatcher, sessionMatcher } from './caipRequest'

const walletRequestParams = z.object({
  chainId: z.optional(chainIdMatcher),
  session: z.optional(sessionMatcher),
  request: z.object({
    method: z.string(),
    params: z.any()
  })
})

const WalletRequest = createRequestMatcher('wallet_request', walletRequestParams)

function buildMappedPayload(rpcRequest: RPCRequestPayload, method: string, params: any, chainId?: string) {
  const { jsonrpc, id, _origin } = rpcRequest
  const optionalFields = chainId ? { chainId } : {}

  return { jsonrpc, id, method, params, _origin, ...optionalFields }
}

export default function (rpcRequest: RPCRequestPayload) {
  const result = WalletRequest.safeParse(rpcRequest)

  if (!result.success) {
    const errorMessage = result.error.issues[0].message
    throw new Error(errorMessage)
  }

  const walletRequest = result.data
  const { request, chainId } = walletRequest.params
  const { method, params } = request

  return buildMappedPayload(rpcRequest, method, params, chainId)
}
