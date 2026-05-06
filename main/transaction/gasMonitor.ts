import { intToHex } from '@ethereumjs/util'

import type { Block } from '../chains/gas'

const DEFAULT_NEWEST_BLOCK = 'pending'
const HEX_RADIX = 16
const GAS_PRICE_METHOD = 'eth_gasPrice'
const FEE_HISTORY_METHOD = 'eth_feeHistory'

interface FeeHistoryResponse {
  baseFeePerGas: string[]
  gasUsedRatio: number[]
  reward: Array<string[]>
  oldestBlock: string
}

interface GasPrices {
  slow: string
  standard: string
  fast: string
  asap: string
}

function parseFeeHistoryBlock(baseFee: string, index: number, feeHistory: FeeHistoryResponse): Block {
  return {
    baseFee: parseInt(baseFee, HEX_RADIX),
    gasUsedRatio: feeHistory.gasUsedRatio[index],
    rewards: (feeHistory.reward[index] || []).map((reward) => parseInt(reward, HEX_RADIX))
  }
}

function buildUniformGasPrices(gasPrice: string): GasPrices {
  // in the future we may want to have specific calculators to calculate variations
  // in the gas price or eliminate this structure altogether
  return { slow: gasPrice, standard: gasPrice, fast: gasPrice, asap: gasPrice }
}

export default class GasMonitor {
  private connection

  constructor(connection: any /* Chains */) {
    if (!connection) {
      throw new Error('GasMonitor requires a valid connection')
    }
    this.connection = connection
  }

  async getFeeHistory(
    numBlocks: number,
    rewardPercentiles: number[],
    newestBlock = DEFAULT_NEWEST_BLOCK
  ): Promise<Block[]> {
    const blockCount = intToHex(numBlocks)
    const payload = { method: FEE_HISTORY_METHOD, params: [blockCount, newestBlock, rewardPercentiles] }

    const feeHistory: FeeHistoryResponse = await this.connection.send(payload)

    return feeHistory.baseFeePerGas.map((baseFee, i) => parseFeeHistoryBlock(baseFee, i, feeHistory))
  }

  async getGasPrices(): Promise<GasPrices> {
    const gasPrice = await this.connection.send({ method: GAS_PRICE_METHOD })
    return buildUniformGasPrices(gasPrice)
  }
}
