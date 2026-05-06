import { z } from 'zod'

/** Mute preferences at migration version 38 */
const v38MuteSchema = z
  .object({
    /** When true the Pylon migration warning banner is suppressed */
    migrateToPylon: z.boolean().default(true)
  })
  .passthrough()
  .default({})

/** RPC connection entry at migration version 38 — still includes legacy presets */
const v38ConnectionSchema = z
  .object({
    /** Active preset; includes now-retired 'infura', 'alchemy', and 'poa' values */
    current: z.enum(['alchemy', 'custom', 'infura', 'local', 'poa', 'pylon']),
    /** User-supplied RPC URL used when current === 'custom' */
    custom: z.string().default('')
  })
  .passthrough()

export const v38ChainSchema = z
  .object({
    /** Primary and secondary RPC connection slots */
    connection: z.object({
      primary: v38ConnectionSchema,
      secondary: v38ConnectionSchema
    }),
    /** Numeric chain ID */
    id: z.coerce.number()
  })
  .passthrough()

export const v38ChainMetadataSchema = z.object({
  ethereum: z.object({}).passthrough()
})

const EthereumChainsSchema = z.record(z.coerce.number(), v38ChainSchema)

export const v38ChainsSchema = z.object({
  ethereum: EthereumChainsSchema
})

export const v38MainSchema = z
  .object({
    mute: v38MuteSchema,
    networksMeta: v38ChainMetadataSchema,
    networks: v38ChainsSchema
  })
  .passthrough()

export const v38StateSchema = z
  .object({
    main: v38MainSchema
  })
  .passthrough()

export type v38Connection = z.infer<typeof v38ConnectionSchema>
export type v38Chain = z.infer<typeof v38ChainSchema>
