import { z } from 'zod'
import { RateSchema } from './rate'

export const NativeCurrencySchema = z.object({
  /** Number of decimal places for display */
  decimals: z.number(),
  /** Optional icon URI */
  icon: z.string().default(''),
  /** Human-readable name of the currency */
  name: z.string(),
  /** Ticker symbol (e.g. ETH, MATIC) */
  symbol: z.string(),
  /** Current USD exchange rate data */
  usd: RateSchema
})

export type NativeCurrency = z.infer<typeof NativeCurrencySchema>

/** Create a NativeCurrency with sensible defaults */
export function createNativeCurrency(partial: Partial<NativeCurrency> = {}): NativeCurrency {
  return {
    decimals: 18,
    icon: '',
    name: '',
    symbol: '',
    usd: { change24hr: 0, price: 0 },
    ...partial
  }
}

/** Type guard — narrows unknown to NativeCurrency */
export function validateNativeCurrency(obj: unknown): obj is NativeCurrency {
  return NativeCurrencySchema.safeParse(obj).success
}
