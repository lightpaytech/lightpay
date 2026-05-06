import { Interface } from '@ethersproject/abi'
import { addHexPrefix } from '@ethereumjs/util'
import log from 'electron-log'

import type { BytesLike } from '@ethersproject/bytes'
import type EthereumProvider from 'ethereum-provider'

import {
  abi,
  Call,
  CallResult,
  functionSignatureMatcher,
  multicallAddresses,
  MulticallConfig,
  MulticallVersion
} from './constants'

export { Call }

const multicallInterface = new Interface(abi)
const memoizedInterfaces: Record<string, Interface> = {}

const DEFAULT_BATCH_SIZE = 2000
const FAILED_CALL_RESULT = { success: false, returnValues: [] }

// Input validation helper
function validateMulticallInputs(chainId: number, calls: Call<any, any>[]): void {
  if (!Number.isInteger(chainId) || chainId <= 0) {
    throw new Error(`Invalid chainId: ${chainId}`)
  }
  if (!Array.isArray(calls)) {
    throw new Error('calls must be an array')
  }
}

function chainConfig(chainId: number, eth: EthereumProvider): MulticallConfig {
  return {
    address: multicallAddresses[chainId].address,
    chainId,
    provider: eth,
    version: multicallAddresses[chainId].version
  }
}

async function makeCall(functionName: string, params: any[], config: MulticallConfig) {
  const data = multicallInterface.encodeFunctionData(functionName, params)

  const response: BytesLike = await config.provider.request({
    method: 'eth_call',
    params: [{ to: config.address, data }, 'latest'],
    chainId: addHexPrefix(config.chainId.toString(16))
  })

  return multicallInterface.decodeFunctionResult(functionName, response)
}

function getFunctionNameFromSignature(signature: string) {
  const m = signature.match(functionSignatureMatcher)

  if (!m) {
    throw new Error(`could not parse function name from signature: ${signature}`)
  }

  return (m.groups || {}).signature
}

function getInterface(functionSignature: string) {
  if (!(functionSignature in memoizedInterfaces)) {
    memoizedInterfaces[functionSignature] = new Interface([functionSignature])
  }

  return memoizedInterfaces[functionSignature]
}

function buildCallData<R, T>(calls: Call<R, T>[]) {
  return calls.map(({ target, call }) => {
    const [fnSignature, ...params] = call
    const fnName = getFunctionNameFromSignature(fnSignature)

    const callInterface = getInterface(fnSignature)
    const calldata = callInterface.encodeFunctionData(fnName, params)

    return [target, calldata]
  })
}

function getResultData(results: any, call: string[], target: string) {
  const [fnSignature] = call
  const callInterface = memoizedInterfaces[fnSignature]
  const fnName = getFunctionNameFromSignature(fnSignature)

  try {
    return callInterface.decodeFunctionResult(fnName, results)
  } catch (e) {
    log.warn(`Failed to decode ${fnName},`, { target, results })
    const outputs = callInterface.getFunction(fnName).outputs || []
    return outputs.map(() => null)
  }
}

async function aggregate<R, T>(calls: Call<R, T>[], config: MulticallConfig): Promise<CallResult<T>[]> {
  const aggData = buildCallData(calls)
  const response = await makeCall('aggregate', [aggData], config)

  return calls.map(({ call, returns, target }, i) => {
    const resultData = getResultData(response.returndata[i], call, target)
    return { success: true, returnValues: returns.map((handler, j) => handler(resultData[j])) }
  })
}

async function tryAggregate<R, T>(calls: Call<R, T>[], config: MulticallConfig) {
  const aggData = buildCallData(calls)
  const response = await makeCall('tryAggregate', [false, aggData], config)

  return calls.map(({ call, returns, target }, i) => {
    const results = response.result[i]

    if (!results.success) {
      return FAILED_CALL_RESULT
    }

    const resultData = getResultData(results.returndata, call, target)
    return { success: true, returnValues: returns.map((handler, j) => handler(resultData[j])) }
  })
}

function logBatchError(chainId: number, batchStart: number, batchEnd: number, calls: Call<any, any>[], e: unknown) {
  log.error(
    `multicall error (batch ${batchStart}-${batchEnd}), chainId: ${chainId}, first call: ${JSON.stringify(calls[batchStart])}`,
    e
  )
}

// public functions
export function supportsChain(chainId: number) {
  return chainId in multicallAddresses
}

export default function (chainId: number, eth: EthereumProvider) {
  const config = chainConfig(chainId, eth)

  async function call<R, T>(calls: Call<R, T>[]): Promise<CallResult<T>[]> {
    validateMulticallInputs(chainId, calls)
    return config.version === MulticallVersion.V2 ? tryAggregate(calls, config) : aggregate(calls, config)
  }

  return {
    call,
    batchCall: async function <R, T>(calls: Call<R, T>[], batchSize = DEFAULT_BATCH_SIZE) {
      const numBatches = Math.ceil(calls.length / batchSize)

      const fetches = [...Array(numBatches).keys()].map(async (_, batchIndex) => {
        const batchStart = batchIndex * batchSize
        const batchEnd = batchStart + batchSize
        const batchCalls = calls.slice(batchStart, batchEnd)

        try {
          return await call(batchCalls)
        } catch (e) {
          logBatchError(chainId, batchStart, batchEnd, calls, e)
          return [...Array(batchCalls.length).keys()].map(() => FAILED_CALL_RESULT)
        }
      })

      const fetchResults = await Promise.all(fetches)
      return ([] as CallResult<T>[]).concat(...fetchResults)
    }
  }
}
