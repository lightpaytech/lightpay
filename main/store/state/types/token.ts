import { z } from 'zod'

export const TokenIdSchema = z.object({
  /** ERC-20 contract address (checksummed or lowercase) */
  address: z.string(),
  /** Numeric chain ID where the token lives */
  chainId: z.coerce.number()
})

const CoreTokenSchema = z.object({
  /** Number of decimal places for this token */
  decimals: z.number().positive(),
  /** Optional token logo image URI */
  logoURI: z.string().default('').optional(),
  /** Full token name */
  name: z.string(),
  /** Ticker symbol */
  symbol: z.string()
})

export const TokenSchema = CoreTokenSchema.merge(TokenIdSchema)

export type WithTokenId = z.infer<typeof TokenIdSchema>
export type Token = z.infer<typeof TokenSchema>

/** Type guard — narrows unknown to Token */
export function validateToken(obj: unknown): obj is Token {
  return TokenSchema.safeParse(obj).success
}
