import { z } from 'zod'

const GasLevelsSchema = z.object({
  /** User-specified custom gas price (hex) */
  asap: z.string().optional(),
  /** Custom gas price override (hex) */
  custom: z.string().optional(),
  /** Fast gas price tier (hex) */
  fast: z.string().optional(),
  /** Slow/economy gas price tier (hex) */
  slow: z.string().optional(),
  /** Standard gas price tier (hex) */
  standard: z.string().optional()
})

const GasEstimateSchema = z.object({
  /** USD cost breakdown for this estimate */
  cost: z.object({
    /** Estimated cost in USD; null if price data unavailable */
    usd: z.number().nullish()
  }),
  /** Estimated gas units as a hex string */
  gasEstimate: z.string()
})

const GasSampleSchema = z.object({
  /** Low and high bound estimates for this sample */
  estimates: z
    .object({
      high: GasEstimateSchema,
      low: GasEstimateSchema
    })
    .partial(),
  /** Human-readable label for this sample (e.g. transfer, swap) */
  label: z.string()
})

// TODO: validate these fields as hex amount values
export const GasFeesSchema = z
  .object({
    /** Max base fee per gas the user is willing to pay (hex) */
    maxBaseFeePerGas: z.string(),
    /** Max total fee per gas (base + priority) (hex) */
    maxFeePerGas: z.string(),
    /** Max priority fee (miner tip) per gas (hex) */
    maxPriorityFeePerGas: z.string(),
    /** Estimated base fee for the next block (hex) */
    nextBaseFee: z.string()
  })
  .partial()

export const GasSchema = z.object({
  /** Current gas price tier selection and fee data */
  price: z.object({
    /** EIP-1559 fee estimates; absent on legacy chains */
    fees: GasFeesSchema.optional(),
    /** Named price levels keyed by speed tier */
    levels: GasLevelsSchema,
    /** Currently selected price level key */
    selected: GasLevelsSchema.keyof()
  }),
  /** Historical gas samples used for cost estimation UI */
  samples: z.array(GasSampleSchema).default([])
})

export type Gas = z.infer<typeof GasSchema>
export type GasFees = z.infer<typeof GasFeesSchema>

/** Type guard — narrows unknown to GasFees */
export function validateGasFees(obj: unknown): obj is GasFees {
  return GasFeesSchema.safeParse(obj).success
}
