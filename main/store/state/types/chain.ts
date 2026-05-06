import { z } from 'zod'
import { ColorwayPaletteSchema } from './colors'
import { ConnectionSchema } from './connection'
import { GasSchema } from './gas'
import { NativeCurrencySchema } from './nativeCurrency'

const layerValues = ['mainnet', 'rollup', 'sidechain', 'testnet'] as const

export const ChainIdSchema = z.object({
  /** Numeric chain ID */
  id: z.coerce.number(),
  /** Always 'ethereum' — discriminant for multi-network support */
  type: z.literal('ethereum')
})

export const ChainSchema = z.object({
  /** Primary and secondary RPC connection slots */
  connection: z.object({
    primary: ConnectionSchema,
    secondary: ConnectionSchema
  }),
  /** Optional block explorer base URL */
  explorer: z.string().default(''),
  /** Numeric chain ID */
  id: z.coerce.number(),
  /** Whether this chain is a testnet */
  isTestnet: z.boolean().default(false),
  /** Protocol layer classification */
  layer: z.enum(layerValues).optional(),
  /** Display name */
  name: z.string(),
  /** Whether the chain is enabled in the wallet */
  on: z.boolean()
})

export const ChainMetadataSchema = z.object({
  /** Latest known block number; absent until first block received */
  blockHeight: z.number().optional(),
  /** Gas price data for this chain */
  gas: GasSchema,
  /** Optional chain icon URI */
  icon: z.string().optional(),
  /** Native currency information (symbol, decimals, price) */
  nativeCurrency: NativeCurrencySchema,
  /** Accent color key from the colorway palette */
  primaryColor: ColorwayPaletteSchema.keyof()
})

export type ChainId = z.infer<typeof ChainIdSchema>
export type Chain = z.infer<typeof ChainSchema>
export type ChainMetadata = z.infer<typeof ChainMetadataSchema>

/** Convenience type guard — narrows unknown to Chain */
export function validateChain(obj: unknown): obj is Chain {
  return ChainSchema.safeParse(obj).success
}

/** Convenience type guard — narrows unknown to ChainMetadata */
export function validateChainMetadata(obj: unknown): obj is ChainMetadata {
  return ChainMetadataSchema.safeParse(obj).success
}
