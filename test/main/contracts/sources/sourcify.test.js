import log from 'electron-log'
import nock from 'nock'

import { fetchSourcifyContract, buildSourcifyUrl } from '../../../../main/contracts/sources/sourcify'

// ─── Shared fixtures ─────────────────────────────────────────────────────────

const sampleContractAddress = '0x3432b6a60d23ca0dfca7761b7ab56459d9c964d0'

const sampleAbi = [
  {
    inputs: [],
    name: 'retrieve',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [{ internalType: 'uint256', name: 'num', type: 'uint256' }],
    name: 'store',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  }
]

const sourcifySuccessResponse = {
  status: 'partial',
  files: [
    {
      name: 'metadata.json',
      path: '',
      content: JSON.stringify({
        output: {
          abi: sampleAbi,
          devdoc: { title: 'mock sourcify abi' }
        }
      })
    }
  ]
}

const sourcifyNotFoundResponse = {
  error: 'Files have not been found!'
}

function mockApiResponse(
  domain,
  path,
  status,
  body,
  timeout = 0,
  headers = { 'content-type': 'application/json' }
) {
  nock(`https://${domain}`).get(path).delay(timeout).reply(status, body, headers)
}

beforeAll(() => {
  jest.useFakeTimers({ doNotFake: ['setImmediate', 'nextTick'] })
  nock.disableNetConnect()
  log.transports.console.level = false
})

afterAll(() => {
  nock.cleanAll()
  nock.enableNetConnect()
  log.transports.console.level = 'debug'
})

afterEach(() => {
  nock.abortPendingRequests()
  jest.clearAllMocks()
})

describe('#buildSourcifyUrl', () => {
  it('builds the correct Sourcify files URL for a given address and chain', () => {
    const url = buildSourcifyUrl(sampleContractAddress, 137)

    expect(url).toBe(
      `https://sourcify.dev/server/files/any/137/${sampleContractAddress}`
    )
  })

  it('includes the chain id in the URL path', () => {
    const urlChain1 = buildSourcifyUrl(sampleContractAddress, 1)
    const urlChain10 = buildSourcifyUrl(sampleContractAddress, 10)

    expect(urlChain1).toContain('/1/')
    expect(urlChain10).toContain('/10/')
  })
})

describe('#fetchSourcifyContract', () => {
  const sourcifyDomain = 'sourcify.dev'
  const sourcifyEndpoint = `/server/files/any/137/${sampleContractAddress}`

  const mockSourcifyApi = (status, response, delay) => {
    mockApiResponse(sourcifyDomain, sourcifyEndpoint, status, response, delay)
  }

  describe('successful retrieval', () => {
    it('retrieves a contract from sourcify', async () => {
      mockSourcifyApi(200, sourcifySuccessResponse)

      return expect(fetchSourcifyContract(sampleContractAddress, 137)).resolves.toStrictEqual({
        abi: JSON.stringify(sampleAbi),
        name: 'mock sourcify abi',
        source: 'sourcify'
      })
    })
  })

  describe('failure cases', () => {
    it('does not retrieve a contract when the request fails', async () => {
      mockSourcifyApi(400)

      return expect(fetchSourcifyContract(sampleContractAddress, 137)).resolves.toBeUndefined()
    })

    it('does not retrieve a contract when the contract is not found', async () => {
      mockSourcifyApi(200, sourcifyNotFoundResponse)

      return expect(fetchSourcifyContract(sampleContractAddress, 137)).resolves.toBeUndefined()
    })

    it('does not retrieve a contract when the request times out', async () => {
      mockSourcifyApi(200, sourcifySuccessResponse, 10000)

      const contract = expect(fetchSourcifyContract(sampleContractAddress, 137)).resolves.toBeUndefined()

      jest.advanceTimersByTime(4000)

      return contract
    })
  })
})
