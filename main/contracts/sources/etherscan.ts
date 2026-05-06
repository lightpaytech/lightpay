import log from 'electron-log'

import { fetchWithTimeout } from '../../../resources/utils/fetch'

import type { Response } from 'node-fetch'
import type { ContractSource } from '..'

// Named constants
const ETHERSCAN_FETCH_TIMEOUT_MS = 4000
const ETHERSCAN_OK_MESSAGE = 'OK'
const ETHERSCAN_UNVERIFIED_ABI = 'Contract source code not verified'
const SOURCE_CAPTURE_REGEX = /^https?:\/\/(?:api[.-]?)?(?<source>.*)\//
const ETHERSCAN_MODULE = 'contract'
const ETHERSCAN_ACTION = 'getsourcecode'

// Rate limiting constants
const ETHERSCAN_RATE_LIMIT_REQUESTS_PER_SECOND = 5
const ETHERSCAN_RATE_LIMIT_INTERVAL_MS = 1000 / ETHERSCAN_RATE_LIMIT_REQUESTS_PER_SECOND

// API keys per network
const ETHERSCAN_API_KEY_MAINNET = '3SYU5MW5QK8RPCJV1XVICHWKT774993S24'
const ETHERSCAN_API_KEY_OPTIMISM = '3SYU5MW5QK8RPCJV1XVICHWKT774993S24'
const ETHERSCAN_API_KEY_POLYGON = '2P3U9T63MT26T1X64AAE368UNTS9RKEEBB'
const ETHERSCAN_API_KEY_ARBITRUM = 'VP126CP67QVH9ZEKAZT1UZ751VZ6ZTIZAD'

// API domains per network
const ETHERSCAN_DOMAIN_MAINNET = 'api.etherscan.io'
const ETHERSCAN_DOMAIN_OPTIMISM = 'api-optimistic.etherscan.io'
const ETHERSCAN_DOMAIN_POLYGON = 'api.polygonscan.com'
const ETHERSCAN_DOMAIN_ARBITRUM = 'api.arbiscan.io'

interface EtherscanSourceCodeResponse {
  status: string
  message: string
  result: ContractSourceCodeResult[]
}

interface ContractSourceCodeResult {
  SourceCode: string
  ABI: string
  ContractName: string
  Implementation: string
}

// Builds a fully-formed Etherscan API URL for a given address and network domain
export function buildEtherscanUrl(contractAddress: string, domain: string, apiKey: string): string {
  return `https://${domain}/api?module=${ETHERSCAN_MODULE}&action=${ETHERSCAN_ACTION}&address=${contractAddress}&apikey=${apiKey}`
}

const getEndpoint = (domain: string, contractAddress: string, apiKey: string) => {
  return buildEtherscanUrl(contractAddress, domain, apiKey)
}

const endpointMap = {
  1: (contractAddress: Address) =>
    getEndpoint(ETHERSCAN_DOMAIN_MAINNET, contractAddress, ETHERSCAN_API_KEY_MAINNET),
  10: (contractAddress: Address) =>
    getEndpoint(ETHERSCAN_DOMAIN_OPTIMISM, contractAddress, ETHERSCAN_API_KEY_OPTIMISM),
  137: (contractAddress: Address) =>
    getEndpoint(ETHERSCAN_DOMAIN_POLYGON, contractAddress, ETHERSCAN_API_KEY_POLYGON),
  42161: (contractAddress: Address) =>
    getEndpoint(ETHERSCAN_DOMAIN_ARBITRUM, contractAddress, ETHERSCAN_API_KEY_ARBITRUM)
}

async function parseResponse<T>(response: Response): Promise<T | undefined> {
  if (
    response?.status === 200 &&
    (response?.headers.get('content-type') || '').toLowerCase().includes('json')
  ) {
    return response.json()
  }
  return Promise.resolve(undefined)
}

async function fetchSourceCode(endpointUrl: string): Promise<ContractSourceCodeResult[] | undefined> {
  try {
    const res = await fetchWithTimeout(endpointUrl, {}, ETHERSCAN_FETCH_TIMEOUT_MS)
    const parsedResponse = await parseResponse<EtherscanSourceCodeResponse>(res as Response)

    return parsedResponse?.message === ETHERSCAN_OK_MESSAGE ? parsedResponse.result : undefined
  } catch (e) {
    log.warn('Source code response parsing error', e)
    return undefined
  }
}

export function chainSupported(chainId: string) {
  return Object.keys(endpointMap).includes(chainId)
}

export async function fetchEtherscanContract(
  contractAddress: Address,
  chainId: number
): Promise<ContractSource | undefined> {
  if (!(chainId in endpointMap)) {
    return
  }

  const endpointChain = chainId as keyof typeof endpointMap

  try {
    const endpoint = endpointMap[endpointChain](contractAddress)
    const result = await fetchSourceCode(endpoint)

    // etherscan compatible
    if (result?.length) {
      const source = result[0]
      const implementation = source.Implementation

      if (implementation && implementation !== contractAddress) {
        // this is a proxy contract, return the ABI for the source
        return fetchEtherscanContract(implementation, chainId)
      }

      if (source.ABI === ETHERSCAN_UNVERIFIED_ABI) {
        log.warn(`Contract ${contractAddress} does not have verified ABI in Etherscan`)
        return undefined
      }

      return {
        abi: source.ABI,
        name: source.ContractName,
        source: endpoint.match(SOURCE_CAPTURE_REGEX)?.groups?.source || ''
      }
    }
  } catch (e) {
    log.warn(`Contract ${contractAddress} not found in Etherscan`, e)
  }
}
