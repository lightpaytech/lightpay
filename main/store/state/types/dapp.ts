import { z } from 'zod'

// TODO: define manifest schema
const ManifestSchema = z.any()

export const DappSchema = z.object({
  /** How many times the status check has been retried */
  checkStatusRetryCount: z.number().gte(0).default(0),
  /** Key→value config overrides for this dapp */
  config: z.record(z.string(), z.string()),
  /** Serialised dapp content blob */
  content: z.string().optional(),
  /** ENS name identifying the dapp */
  ens: z.string(),
  /** Optional unique dapp identifier */
  id: z.string().optional(),
  /** Raw dapp manifest (schema TBD) */
  manifest: ManifestSchema,
  /** If true, open the dapp window as soon as status is 'ready' */
  openWhenReady: z.boolean(),
  /** Lifecycle status of the dapp */
  status: z.enum(['failed', 'initial', 'loading', 'ready', 'updating'])
})

export type Dapp = z.infer<typeof DappSchema>

/** Type guard — narrows unknown to Dapp */
export function validateDapp(obj: unknown): obj is Dapp {
  return DappSchema.safeParse(obj).success
}
