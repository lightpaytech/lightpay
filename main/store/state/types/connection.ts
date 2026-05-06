import { z } from 'zod'

const statusValues = [
  'chain mismatch',
  'connected',
  'disconnected',
  'error',
  'loading',
  'off',
  'standby'
] as const

const presetValues = ['custom', 'local', 'pylon'] as const

export const ConnectionSchema = z.object({
  /** Whether this connection is currently established */
  connected: z.boolean(),
  /** User-supplied RPC URL; used when current === 'custom' */
  custom: z.string().default(''),
  /** The active RPC preset */
  current: z.enum(presetValues),
  /** Whether the connection slot is enabled */
  on: z.boolean(),
  /** Human-readable connection status */
  status: z.enum(statusValues)
})

export type Connection = z.infer<typeof ConnectionSchema>

/** Create a Connection with safe defaults */
export function createConnection(partial: Partial<Connection> = {}): Connection {
  return {
    connected: false,
    current: 'custom',
    custom: '',
    on: false,
    status: 'off',
    ...partial
  }
}

/** Type guard — narrows unknown to Connection */
export function validateConnection(obj: unknown): obj is Connection {
  return ConnectionSchema.safeParse(obj).success
}
