import { z } from 'zod'

export const RateSchema = z.object({
  /** 24-hour percentage price change */
  change24hr: z.number(),
  /** Current price in USD */
  price: z.number()
})

export type Rate = z.infer<typeof RateSchema>

/** Create a Rate with defaults for missing fields */
export function createRate(partial: Partial<Rate> = {}): Rate {
  return {
    change24hr: 0,
    price: 0,
    ...partial
  }
}

/** Type guard — narrows unknown to Rate */
export function validateRate(obj: unknown): obj is Rate {
  return RateSchema.safeParse(obj).success
}
