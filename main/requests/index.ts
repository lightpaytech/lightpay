import mapCaipRequest from './methods/caipRequest'
import mapWalletRequest from './methods/walletRequest'

const METHOD_CAIP_REQUEST = 'caip_request'
const METHOD_WALLET_REQUEST = 'wallet_request'

const methodHandlers: Map<string, (payload: RPCRequestPayload) => RPCRequestPayload> = new Map([
  [METHOD_CAIP_REQUEST, mapCaipRequest],
  [METHOD_WALLET_REQUEST, mapWalletRequest]
])

export function mapRequest(requestPayload: RPCRequestPayload): RPCRequestPayload {
  if (!requestPayload || typeof requestPayload.method !== 'string') {
    return requestPayload
  }

  const handler = methodHandlers.get(requestPayload.method)
  if (!handler) {
    return requestPayload
  }

  return handler(requestPayload)
}
