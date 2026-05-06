// Reveal details about pending transactions

import log from 'electron-log'
import EthereumProvider from 'ethereum-provider'
import { addHexPrefix } from '@ethereumjs/util'
import BigNumber from 'bignumber.js'

import proxyConnection from '../provider/proxy'
import nebulaApi from '../nebula'

import Erc20Contract from '../contracts/erc20'
import { decodeCallData, fetchContract, ContractSource } from '../contracts'
import ensContracts from '../contracts/deployments/ens'
import erc20 from '../externalData/balances/erc-20-abi'
import { MAX_HEX } from '../../resources/constants'

import type {
  ApproveAction as Erc20Approval,
  TransferAction as Erc20Transfer
} from '../transaction/actions/erc20'
import type { Action, DecodableContract, EntityType } from '../transaction/actions'
import type { TransactionRequest } from '../accounts'

// Named constants
const MAINNET_CHAIN_HEX = '0x1'
const ETH_GET_CODE_METHOD = 'eth_getCode'
const ETH_GET_CODE_BLOCK = 'latest'
const EMPTY_CODE_SHORT = '0x'
const EMPTY_CODE_LONG = '0x0'
const ENTITY_TYPE_EXTERNAL = 'external'
const ENTITY_TYPE_CONTRACT = 'contract'
const ENTITY_TYPE_UNKNOWN = 'unknown'
const ERC20_SOURCE_NAME = 'ERC-20'
const ERC20_SOURCE_LABEL = 'Generic ERC-20'
const ERC20_APPROVE_ACTION_ID = 'erc20:approve'
const ERC20_TRANSFER_ACTION_ID = 'erc20:transfer'

// TODO: fix generic typing here
const knownContracts: DecodableContract<unknown>[] = [...ensContracts]

const erc20Abi = JSON.stringify(erc20)

const nebula = nebulaApi()
const provider = new EthereumProvider(proxyConnection)

// TODO: Discuss the need to set chain for the proxy connection
provider.setChain(MAINNET_CHAIN_HEX)

type RecognitionContext = {
  contractAddress: string
  chainId: number
  account?: string
}

// Guard function that validates a reveal request has the required fields
function validateRevealRequest(req: { contractAddress?: string; chainId?: number; calldata?: string }): boolean {
  if (!req) return false
  if (typeof req.contractAddress !== 'string' || req.contractAddress.length === 0) return false
  if (typeof req.chainId !== 'number' || req.chainId <= 0) return false
  if (typeof req.calldata !== 'string' || req.calldata.length === 0) return false
  return true
}

async function resolveEntityType(address: string, chainId: number): Promise<EntityType> {
  if (!address || !chainId) return ENTITY_TYPE_UNKNOWN as EntityType
  try {
    const payload: JSONRPCRequestPayload = {
      method: ETH_GET_CODE_METHOD,
      params: [address, ETH_GET_CODE_BLOCK],
      jsonrpc: '2.0',
      id: 1,
      chainId: addHexPrefix(chainId.toString(16)) // TODO: Verify this overrides setChain
    }

    const code = await provider.request(payload)
    const type = code === EMPTY_CODE_SHORT || code === EMPTY_CODE_LONG ? ENTITY_TYPE_EXTERNAL : ENTITY_TYPE_CONTRACT
    return type as EntityType
  } catch (e) {
    log.error(e)
    return ENTITY_TYPE_UNKNOWN as EntityType
  }
}

async function resolveEnsName(address: string): Promise<string> {
  try {
    const ensName: string = (await nebula.ens.reverseLookup([address]))[0]
    return ensName
  } catch (e) {
    log.warn(e)
    return ''
  }
}

async function recogErc20(
  contractAddress: string,
  chainId: number,
  calldata: string
): Promise<Action<unknown> | undefined> {
  const decoded = Erc20Contract.decodeCallData(calldata)
  if (contractAddress && decoded) {
    try {
      const contract = new Erc20Contract(contractAddress, chainId)

      const { decimals, name, symbol } = await contract.getTokenData()
      if (Erc20Contract.isApproval(decoded)) {
        const spenderAddress = decoded.args[0].toLowerCase()
        const amount = decoded.args[1].toHexString()

        const [spenderIdentity, contractIdentity] = await Promise.all([
          surface.identity(spenderAddress, chainId),
          surface.identity(contractAddress, chainId)
        ])

        const data = {
          amount,
          decimals,
          name,
          symbol,
          spender: {
            ...spenderIdentity,
            address: spenderAddress
          },
          contract: {
            address: contractAddress,
            ...contractIdentity
          }
        }

        return {
          id: ERC20_APPROVE_ACTION_ID,
          data,
          update: (request, { amount }) => {
            // amount is a hex string
            const approvedAmount = new BigNumber(amount || '').toString()

            log.verbose(
              `Updating Erc20 approve amount to ${approvedAmount} for contract ${contractAddress} and spender ${spenderAddress}`
            )

            const txRequest = request as TransactionRequest

            data.amount = amount
            txRequest.data.data = Erc20Contract.encodeCallData('approve', [spenderAddress, amount])

            if (txRequest.decodedData) {
              txRequest.decodedData.args[1].value = amount === MAX_HEX ? 'unlimited' : approvedAmount
            }
          }
        } as Erc20Approval
      } else if (Erc20Contract.isTransfer(decoded)) {
        const recipient = decoded.args[0].toLowerCase()
        const amount = decoded.args[1].toHexString()
        const identity = await surface.identity(recipient, chainId)
        return {
          id: ERC20_TRANSFER_ACTION_ID,
          data: { recipient: { address: recipient, ...identity }, amount, decimals, name, symbol }
        } as Erc20Transfer
      }
    } catch (e) {
      log.warn(e)
    }
  }
}

function identifyKnownContractActions(
  calldata: string,
  context: RecognitionContext
): Action<unknown> | undefined {
  const knownContract = knownContracts.find(
    (contract) =>
      contract.address.toLowerCase() === context.contractAddress.toLowerCase() &&
      contract.chainId === context.chainId
  )

  if (knownContract) {
    try {
      return knownContract.decode(calldata, context)
    } catch (e) {
      log.warn('Could not decode known contract action', { calldata, context }, e)
    }
  }
}

const surface = {
  identity: async (address = '', chainId?: number) => {
    // Resolve ens, type and other data about address entities

    const results = await Promise.allSettled([
      chainId ? resolveEntityType(address, chainId) : Promise.resolve(''),
      resolveEnsName(address)
    ])

    const type = results[0].status === 'fulfilled' ? results[0].value : ''
    const ens = results[1].status === 'fulfilled' ? results[1].value : ''

    // TODO: Check the address against various scam dbs
    // TODO: Check the address against user's contact list
    // TODO: Check the address against previously verified contracts
    return { type, ens }
  },
  resolveEntityType,
  decode: async (contractAddress = '', chainId: number, calldata: string) => {
    // Decode calldata
    const contractSources: ContractSource[] = [{ name: ERC20_SOURCE_NAME, source: ERC20_SOURCE_LABEL, abi: erc20Abi }]
    const contractSource = await fetchContract(contractAddress, chainId)

    if (contractSource) {
      contractSources.push(contractSource)
    }

    for (const { name, source, abi } of contractSources.reverse()) {
      const decodedCall = decodeCallData(calldata, abi)

      if (decodedCall) {
        return {
          contractAddress: contractAddress.toLowerCase(),
          contractName: name,
          source,
          ...decodedCall
        }
      }
    }

    log.warn(`Unable to decode data for contract ${contractAddress}`)
  },
  recog: async (calldata: string, context: RecognitionContext) => {
    // Recognize actions from standard tx types
    const actions = ([] as Action<unknown>[]).concat(
      (await recogErc20(context.contractAddress, context.chainId, calldata)) || [],
      identifyKnownContractActions(calldata, context) || []
    )

    return actions
  },
  simulate: async () => {}
}

export { validateRevealRequest }
export default surface
