import log from 'electron-log'
import { fetchContract } from '../../../main/contracts'
import { fetchSourcifyContract } from '../../../main/contracts/sources/sourcify'
import { fetchEtherscanContract } from '../../../main/contracts/sources/etherscan'

jest.mock('../../../main/contracts/sources/sourcify')
jest.mock('../../../main/contracts/sources/etherscan')

// ─── Shared ABI fixture ───────────────────────────────────────────────────────

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

const sampleContractAddress = '0x3432b6a60d23ca0dfca7761b7ab56459d9c964d0'

const flushPromises = () => new Promise(jest.requireActual('timers').setImmediate)

function buildContractSource(source) {
  return {
    abi: JSON.stringify(sampleAbi),
    name: `mock ${source} abi`,
    source
  }
}

beforeAll(() => {
  log.transports.console.level = false
})

afterAll(() => {
  log.transports.console.level = 'debug'
})

afterEach(() => {
  jest.clearAllMocks()
})

describe('#fetchContract', () => {
  it('retrieves a contract from sourcify', async () => {
    fetchSourcifyContract.mockResolvedValue(buildContractSource('sourcify'))

    return expect(fetchContract(sampleContractAddress, 1)).resolves.toStrictEqual({
      abi: JSON.stringify(sampleAbi),
      name: 'mock sourcify abi',
      source: 'sourcify'
    })
  })

  it('retrieves a contract from etherscan when sourcify returns no contract', async () => {
    fetchSourcifyContract.mockResolvedValue(undefined)
    fetchEtherscanContract.mockResolvedValue(buildContractSource('etherscan'))

    return expect(fetchContract(sampleContractAddress, 1)).resolves.toStrictEqual({
      abi: JSON.stringify(sampleAbi),
      name: 'mock etherscan abi',
      source: 'etherscan'
    })
  })

  it('prioritizes a contract from sourcify when both sources return contracts', async () => {
    fetchSourcifyContract.mockResolvedValue(buildContractSource('sourcify'))
    fetchEtherscanContract.mockResolvedValue(buildContractSource('etherscan'))

    return expect(fetchContract(sampleContractAddress, 1)).resolves.toStrictEqual({
      abi: JSON.stringify(sampleAbi),
      name: 'mock sourcify abi',
      source: 'sourcify'
    })
  })

  it('waits for a contract from sourcify even if etherscan returns first', async () => {
    const sourcifyResponse = new Promise((resolve) =>
      setTimeout(() => resolve(buildContractSource('sourcify')), 40)
    )
    const etherscanResponse = new Promise((resolve) =>
      setTimeout(() => resolve(buildContractSource('etherscan')), 20)
    )

    fetchSourcifyContract.mockReturnValue(sourcifyResponse)
    fetchEtherscanContract.mockReturnValue(etherscanResponse)

    const result = expect(fetchContract(sampleContractAddress, 1)).resolves.toStrictEqual({
      abi: JSON.stringify(sampleAbi),
      name: 'mock sourcify abi',
      source: 'sourcify'
    })

    jest.advanceTimersByTime(20)
    await flushPromises()
    jest.advanceTimersByTime(20)
    await flushPromises()

    return result
  })

  it('does not retrieve a contract when no contracts are available from any sources', async () => {
    fetchSourcifyContract.mockResolvedValue(undefined)
    fetchEtherscanContract.mockResolvedValue(undefined)

    return expect(fetchContract(sampleContractAddress, 1)).resolves.toBeUndefined()
  })
})
