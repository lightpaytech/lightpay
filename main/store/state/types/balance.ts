import { z } from 'zod'

import { TokenIdSchema } from './token'

const CoreBalanceSchema = z.object({
  /** Raw token balance expressed as a hex string */
  balance: z.string().describe('Raw balance, in hex'),
  /** Number of decimal places for this token */
  decimals: z.number().positive(),
  /** Human-readable formatted balance string */
  displayBalance: z.string(),
  /** Full token name */
  name: z.string(),
  /** Ticker symbol */
  symbol: z.string()
})

export const BalanceSchema = CoreBalanceSchema.merge(TokenIdSchema)

export type Balance = z.infer<typeof BalanceSchema>

/** Type guard — narrows unknown to Balance */
export function validateBalance(obj: unknown): obj is Balance {
  return BalanceSchema.safeParse(obj).success
}
