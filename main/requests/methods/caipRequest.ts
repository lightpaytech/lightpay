import { addHexPrefix } from '@ethereumjs/util'
import { BigNumber } from 'bignumber.js'
import { z } from 'zod'

import { createRequestMatcher, generateError } from '../matchers'

const CAIP2_PREFIX = 'eip155:'
const CAIP2_PREFIX_ERROR_MSG = 'Chain ID must be CAIP-2 chain representation and start with "eip155"'
const HEX_RADIX = 16
const CHAIN_ID_SPLIT_INDEX = 1

function parseChainIdToHex(caipChainId: string): string {
  const numericPart = caipChainId.split(':')[CHAIN_ID_SPLIT_INDEX]
  return addHexPrefix(BigNumber(numericPart).toString(HEX_RADIX))
}

export const chainIdMatcher = z
  .string()
  .startsWith(CAIP2_PREFIX, { message: CAIP2_PREFIX_ERROR_MSG })
  .transform(parseChainIdToHex)

export const sessionMatcher = z.string()

const caipRequestParams = z.object({
  chainId: chainIdMatcher,
  session: sessionMatcher,
  request: z.object({
    method: z.string(),
    params: z.any()
  })
})

const Caip27Request = createRequestMatcher('caip_request', caipRequestParams)

function buildMappedPayload(rpcRequest: RPCRequestPayload, chainId: string, method: string, params: any) {
  const { jsonrpc, id, _origin } = rpcRequest
  return { jsonrpc, id, method, params, chainId, _origin }
}

export default function (rpcRequest: RPCRequestPayload) {
  const result = Caip27Request.safeParse(rpcRequest)

  if (!result.success) {
    throw generateError(result.error)
  }

  const caip27Request = result.data
  const { chainId, request } = caip27Request.params
  const { method, params } = request

  return buildMappedPayload(rpcRequest, chainId, method, params)
}
