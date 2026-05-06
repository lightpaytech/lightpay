import log from 'electron-log'

import { fetchWithTimeout } from '../../../resources/utils/fetch'

import type { Response } from 'node-fetch'
import type { JsonFragment } from '@ethersproject/abi'
import type { ContractSource } from '..'

// Named constants
const SOURCIFY_BASE_URL = 'https://sourcify.dev'
const SOURCIFY_FILES_PATH = '/server/files/any'
const SOURCIFY_SOURCE_LABEL = 'sourcify'
const SOURCIFY_FETCH_TIMEOUT_MS = 4000
const SOURCIFY_VALID_STATUSES = ['partial', 'full']
const SOURCIFY_ABORT_ERROR = 'AbortError'
const SOURCIFY_TIMEOUT_MSG = 'Sourcify request timed out'
const SOURCIFY_PARSE_ERROR_MSG = 'Unable to parse Sourcify response'

interface SourcifySourceCodeResponse {
  status: string
  files: SourcifySourceCodeFile[]
}

interface SourcifySourceCodeFile {
  name: string
  path: string
  content: string
}

interface SourcifyMetadataFileContent {
  compiler: { version: string }
  language: string
  output: {
    abi: JsonFragment[]
    devdoc: Partial<{
      details: string
      title: string
    }>
  }
  settings: Partial<{
    compilationTarget: {
      [K: string]: string
    }
    evmVersion: string
    metadata: {
      [K: string]: string
    }
  }>
  sources: {
    [K: string]: {
      [J: string]: string | string[]
    }
  }
  version: number
}

// Builds the Sourcify files URL for a given address and chain
export function buildSourcifyUrl(contractAddress: Address, chainId: number): string {
  return `${SOURCIFY_BASE_URL}${SOURCIFY_FILES_PATH}/${chainId}/${contractAddress}`
}

function getEndpointUrl(contractAddress: Address, chainId: number) {
  return buildSourcifyUrl(contractAddress, chainId)
}

async function parseResponse<T>(response: Response): Promise<T | undefined> {
  if (
    response?.status === 200 &&
    (response?.headers.get('content-type') || '').toLowerCase().includes('json')
  ) {
    return await response.json()
  }
  return Promise.resolve(undefined)
}

async function fetchSourceCode(
  contractAddress: Address,
  chainId: number
): Promise<SourcifyMetadataFileContent | undefined> {
  const endpointUrl = getEndpointUrl(contractAddress, chainId)

  try {
    const res = await fetchWithTimeout(endpointUrl, {}, SOURCIFY_FETCH_TIMEOUT_MS)
    const parsedResponse = await parseResponse<SourcifySourceCodeResponse>(res as Response)

    return parsedResponse && SOURCIFY_VALID_STATUSES.includes(parsedResponse.status)
      ? JSON.parse(parsedResponse.files[0].content)
      : Promise.reject(`Contract ${contractAddress} not found in Sourcify`)
  } catch (e) {
    log.warn(
      (e as Error).name === SOURCIFY_ABORT_ERROR ? SOURCIFY_TIMEOUT_MSG : SOURCIFY_PARSE_ERROR_MSG,
      e
    )
    return undefined
  }
}

export async function fetchSourcifyContract(
  contractAddress: Address,
  chainId: number
): Promise<ContractSource | undefined> {
  try {
    const result = await fetchSourceCode(contractAddress, chainId)

    if (result?.output) {
      const {
        abi,
        devdoc: { title }
      } = result.output
      return { abi: JSON.stringify(abi), name: title as string, source: SOURCIFY_SOURCE_LABEL }
    }
  } catch (e) {
    log.warn(`Contract ${contractAddress} not found in Sourcify`, e)
  }
}
