import http from './http'
import ws from './ws'

// Bind constants to named variables so the intent is explicit at the call site
const RPC_PORT = 1248
const RPC_HOST = '127.0.0.1'

const httpServer = http()
const wsServer = ws(httpServer)

wsServer.listen(RPC_PORT, RPC_HOST)
