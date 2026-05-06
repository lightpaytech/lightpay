import log from 'electron-log'
import { Interface } from '@ethersproject/abi'
import { fetchSourcifyContract } from './sources/sourcify'
import { fetchEtherscanContract } from './sources/etherscan'

// Named constants
const UNKNOWN_CONTRACT_DESCRIPTION = 'Unknown contract'
const ABI_PARSE_WARN_PREFIX = 'could not parse ABI data:'
const FETCH_WARN_PREFIX = 'could not fetch source code for contract'
const SIGHASH_SLICE_END = 10

// this list should be in order of descending priority as each source will
// be searched in turn
const fetchSources = [fetchSourcifyContract, fetchEtherscanContract]

type ContractSourceResult = ContractSource | undefined

export interface ContractSource {
  abi: string
  name: string
  source: string
}

export interface DecodedCallData {
  contractAddress: string
  contractName: string
  source: string
  method: string
  args: Array<{
    name: string
    type: string
    value: string
  }>
}

// Returns a human-readable description for a contract address
export function getContractDescription(address: string): string {
  if (!address || typeof address !== 'string' || address.length === 0) {
    return UNKNOWN_CONTRACT_DESCRIPTION
  }
  return `Contract at ${address}`
}

function parseAbi(abiData: string): Interface | undefined {
  try {
    return new Interface(abiData)
  } catch (e) {
    log.warn(`${ABI_PARSE_WARN_PREFIX} ${abiData}`)
  }
}

export function decodeCallData(calldata: string, abi: string) {
  const contractInterface = parseAbi(abi)

  if (contractInterface) {
    const sighash = calldata.slice(0, SIGHASH_SLICE_END)

    try {
      const abiMethod = contractInterface.getFunction(sighash)
      const decoded = contractInterface.decodeFunctionData(sighash, calldata)

      return {
        method: abiMethod.name,
        args: abiMethod.inputs.map((input, i) => ({
          name: input.name,
          type: input.type,
          value: decoded[i].toString()
        }))
      }
    } catch (e) {
      log.warn('unknown ABI method for signature', sighash)
    }
  }
}

export async function fetchContract(
  contractAddress: Address,
  chainId: number
): Promise<ContractSourceResult> {
  const fetches = fetchSources.map((getContract) => getContract(contractAddress, chainId))

  let contract: ContractSourceResult = undefined
  let i = 0

  while (!contract && i < fetches.length) {
    contract = await fetches[i]
    i += 1
  }

  if (!contract) {
    log.warn(`${FETCH_WARN_PREFIX} ${contractAddress}`)
  }

  return contract
}
