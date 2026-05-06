import validatePayload from '../../../main/api/validPayload'

import log from 'electron-log'

beforeAll(() => {
  log.transports.console.level = false
})

afterAll(() => {
  log.transports.console.level = 'debug'
})

// Shared fixture – a fully valid LightPay JSON-RPC payload
const validBasePayload = {
  id: 7,
  jsonrpc: '2.0',
  method: 'eth_getBalance',
  params: ['0xc93452A74e596e81E4f73Ca1AcFF532089AD4c62']
}

let samplePayload

beforeEach(() => {
  // Clone shared fixture so each test starts from a clean copy
  samplePayload = { ...validBasePayload }
})

afterEach(() => {
  jest.clearAllMocks()
})

describe('valid payloads', () => {
  it('returns a valid payload with a string id', () => {
    samplePayload.id = '12'
    const result = validatePayload(JSON.stringify(samplePayload))

    expect(result).toStrictEqual(samplePayload)
  })

  it('returns a valid payload with array params', () => {
    const result = validatePayload(JSON.stringify(samplePayload))

    expect(result).toStrictEqual(samplePayload)
  })

  it('returns a valid payload with object params', () => {
    samplePayload.params = { asset: { address: '0x912a' } }
    const result = validatePayload(JSON.stringify(samplePayload))

    expect(result).toStrictEqual(samplePayload)
  })

  it('changes missing params to an empty array', () => {
    delete samplePayload.params
    const result = validatePayload(JSON.stringify(samplePayload))

    expect(result).toStrictEqual({
      ...samplePayload,
      params: []
    })
  })
})

describe('invalid payload structure', () => {
  it('is not valid if not a string', () => {
    const result = validatePayload({ test: 'bad-data' })

    expect(result).toBe(false)
  })

  it('is not valid if payload is null', () => {
    const result = validatePayload(null)

    expect(result).toBe(false)
  })

  it('is not valid if payload is a null string', () => {
    const result = validatePayload('null')

    expect(result).toBe(false)
  })

  it('is not valid if payload is not an object', () => {
    const result = validatePayload('["eth_chainId"]')

    expect(result).toBe(false)
  })
})

describe('invalid payload fields', () => {
  it('is not valid if payload does not include an id', () => {
    delete samplePayload.id
    const result = validatePayload(JSON.stringify(samplePayload))

    expect(result).toBe(false)
  })

  it('is not valid if payload id is not a string or number', () => {
    samplePayload.id = { id: 1 }
    const result = validatePayload(JSON.stringify(samplePayload))

    expect(result).toBe(false)
  })

  it('is not valid if payload does not include a method', () => {
    delete samplePayload.method
    const result = validatePayload(JSON.stringify(samplePayload))

    expect(result).toBe(false)
  })

  it('is not valid if payload method is not a string', () => {
    samplePayload.method = { eth: 'get_balance' }
    const result = validatePayload(JSON.stringify(samplePayload))

    expect(result).toBe(false)
  })

  it('is not valid if jsonrpc field is not a string', () => {
    samplePayload.jsonrpc = 2.0
    const result = validatePayload(JSON.stringify(samplePayload))

    expect(result).toBe(false)
  })

  it('is not valid if params are not an array or object', () => {
    samplePayload.params = 'params'
    const result = validatePayload(JSON.stringify(samplePayload))

    expect(result).toBe(false)
  })
})

describe('LightPay edge cases', () => {
  it('is not valid when method is an empty string', () => {
    samplePayload.method = ''
    const result = validatePayload(JSON.stringify(samplePayload))

    expect(result).toBe(false)
  })

  it('is not valid when params is explicitly null', () => {
    samplePayload.params = null
    const result = validatePayload(JSON.stringify(samplePayload))

    // null is not an array or object, so LightPay should reject it
    expect(result).toBe(false)
  })
})
