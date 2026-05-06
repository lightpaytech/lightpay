import { intToHex } from '@ethereumjs/util'
import { chainUsesOptimismFees } from '../../../resources/utils/chains'

import type { GasFees } from '../../store/state'

interface GasCalculator {
  calculateGas: (blocks: Block[]) => GasFees
}

type CalcOpts = Partial<{
  averageMethod: 'average' | 'median'
  percentileBand: number
}>

type RawGasFees = {
  maxBaseFeePerGas: number
  maxFeePerGas: number
  maxPriorityFeePerGas: number
  nextBaseFee: number
}

export type Block = {
  baseFee: number
  gasUsedRatio: number
  rewards: number[]
}

/** Convert raw numeric fee values to their EIP-1559 hex string representation */
function feesToHex(fees: RawGasFees): GasFees {
  return {
    maxBaseFeePerGas: intToHex(fees.maxBaseFeePerGas),
    maxFeePerGas: intToHex(fees.maxFeePerGas),
    maxPriorityFeePerGas: intToHex(fees.maxPriorityFeePerGas),
    nextBaseFee: intToHex(fees.nextBaseFee)
  }
}

/**
 * Select eligible blocks from the sample using progressively looser fill-ratio
 * criteria until at least one block is found.
 */
function selectEligibleBlocks(blocks: Block[], blockSampleSize: number): Block[] {
  const allBlocks = blocks.length

  // Strategies tried in descending order of strictness
  const strategies = [
    // Prefer recent blocks with moderate fill ratio
    { blockSampleSize, maxRatio: 0.9, minRatio: 0.1 },
    // Allow recent full blocks
    { blockSampleSize, maxRatio: 1.05, minRatio: 0.1 },
    // Widen to full history but still exclude near-empty blocks
    { blockSampleSize: allBlocks, maxRatio: 1.05, minRatio: 0.1 },
    // Any recent block with transactions
    { blockSampleSize, maxRatio: Number.MAX_SAFE_INTEGER, minRatio: 0 },
    // Any block with transactions
    { blockSampleSize: allBlocks, maxRatio: Number.MAX_SAFE_INTEGER, minRatio: 0 }
  ]

  return strategies.reduce<Block[]>((found, strategy) => {
    if (found.length > 0) return found

    const sample = blocks.slice(blocks.length - Math.min(strategy.blockSampleSize, blocks.length))
    const eligible = sample.filter(
      (b) => b.gasUsedRatio > strategy.minRatio && b.gasUsedRatio <= strategy.maxRatio
    )

    return eligible.length > 0 ? eligible : found
  }, [])
}

/** Compute the representative miner reward from a block sample */
function calculateReward(blocks: Block[], opts: CalcOpts = {}): number {
  const recentBlocks = 10
  const { averageMethod = 'median', percentileBand = 0 } = opts

  const eligibleBlocks = selectEligibleBlocks(blocks, recentBlocks)

  const rewardAt = (b: Block) => b.rewards[Math.min(percentileBand, b.rewards.length - 1)]

  if (averageMethod === 'average') {
    return Math.floor(
      eligibleBlocks.map(rewardAt).reduce((sum, r) => sum + r, 0) / eligibleBlocks.length
    )
  }

  // Median — fall back to last block's first reward if no eligible blocks found
  const lastBlockFee = blocks[blocks.length - 1].rewards[0]
  return (
    eligibleBlocks.map(rewardAt).sort((a, b) => a - b)[Math.floor(eligibleBlocks.length / 2)] ||
    lastBlockFee
  )
}

/**
 * Estimate EIP-1559 gas fees from a rolling block history.
 * Plans for the worst case of 2 consecutive full blocks (each raising base fee by 12.5%).
 */
function estimateGasFees(blocks: Block[], opts: CalcOpts = {}): RawGasFees {
  // Base fee for the next block (reported in the last entry of the history)
  const nextBaseFee = blocks[blocks.length - 1].baseFee
  // Budget for two back-to-back full blocks: baseFee * 1.125^2
  const maxBaseFeePerGas = Math.ceil(nextBaseFee * 1.125 * 1.125)

  // Exclude the last block from the reward calculation — it carries no fee history
  const maxPriorityFeePerGas = calculateReward(blocks.slice(0, blocks.length - 1), opts)

  return {
    maxBaseFeePerGas,
    maxFeePerGas: maxBaseFeePerGas + maxPriorityFeePerGas,
    maxPriorityFeePerGas,
    nextBaseFee
  }
}

function DefaultGasCalculator(): GasCalculator {
  return {
    calculateGas: (blocks: Block[]) => feesToHex(estimateGasFees(blocks))
  }
}

function OpStackGasCalculator(): GasCalculator {
  return {
    calculateGas: (blocks: Block[]) =>
      feesToHex(estimateGasFees(blocks, { averageMethod: 'average', percentileBand: 1 }))
  }
}

function PolygonGasCalculator(): GasCalculator {
  return {
    calculateGas: (blocks: Block[]) => {
      const fees = estimateGasFees(blocks)
      // Polygon enforces a minimum priority fee of 30 Gwei
      const maxPriorityFeePerGas = Math.max(fees.maxPriorityFeePerGas, 30e9)

      return feesToHex({
        ...fees,
        maxFeePerGas: fees.maxBaseFeePerGas + maxPriorityFeePerGas,
        maxPriorityFeePerGas
      })
    }
  }
}

export function createGasCalculator(chainId: string): GasCalculator {
  const id = parseInt(chainId)

  // TODO: maybe this can be tied into chain config somehow
  if (id === 137 || id === 80001) {
    // Polygon mainnet and Mumbai testnet require a higher minimum tip
    return PolygonGasCalculator()
  }

  if (chainUsesOptimismFees(id)) {
    return OpStackGasCalculator()
  }

  return DefaultGasCalculator()
}
