import { z } from 'zod'

export const PermissionSchema = z.object({
  /** Internal handler identifier linked to this permission entry */
  handlerId: z.string(),
  /** Hostname or origin string this permission applies to */
  origin: z.string(),
  /** Whether to grant provider (eth_*) access to this origin */
  provider: z.boolean().default(false).describe('Whether or not to grant access to this origin')
})

export type Permission = z.infer<typeof PermissionSchema>

/** Create a Permission with safe defaults */
export function createPermission(partial: Partial<Permission> & Pick<Permission, 'handlerId' | 'origin'>): Permission {
  return {
    provider: false,
    ...partial
  }
}

/** Type guard — narrows unknown to Permission */
export function validatePermission(obj: unknown): obj is Permission {
  return PermissionSchema.safeParse(obj).success
}
