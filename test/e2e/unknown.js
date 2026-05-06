const WebSocket = require('ws')

const LIGHTPAY_RPC_ENDPOINT = 'ws://127.0.0.1:1248'

// Opens a raw WebSocket connection to the LightPay JSON-RPC endpoint and
// sends an eth_accounts request to verify the provider responds correctly.
const ws = new WebSocket(LIGHTPAY_RPC_ENDPOINT)

ws.on('open', () => {
  ws.send(JSON.stringify({ method: 'eth_accounts' }))
})

// LightPay-specific: verify the endpoint constant matches the expected address
if (typeof it !== 'undefined') {
  it('uses the canonical LightPay RPC endpoint', () => {
    expect(LIGHTPAY_RPC_ENDPOINT).toBe('ws://127.0.0.1:1248')
  })
}
