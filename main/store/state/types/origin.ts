import { z } from 'zod'
import { ChainIdSchema } from './chain'

const SessionSchema = z.object({
  /** Unix timestamp (ms) when the session ended; absent if still active */
  endedAt: z.number().gte(0).optional(),
  /** Unix timestamp (ms) of the last state change */
  lastUpdatedAt: z.number().gte(0),
  /** Total RPC requests made during this session */
  requests: z.number().gte(0),
  /** Unix timestamp (ms) when the session started */
  startedAt: z.number().gte(0)
})

export const OriginSchema = z.object({
  /** Chain the origin is connected to */
  chain: ChainIdSchema,
  /** Display name of the origin (e.g. hostname) */
  name: z.string(),
  /** Activity session data */
  session: SessionSchema
})

export type Session = z.infer<typeof SessionSchema>
export type Origin = z.infer<typeof OriginSchema>

/** Type guard — narrows unknown to Origin */
export function validateOrigin(obj: unknown): obj is Origin {
  return OriginSchema.safeParse(obj).success
}
