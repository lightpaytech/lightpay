import { z } from 'zod'

/** Supplemental metadata attached to a wallet account (extended in future migrations) */
export const AccountMetadataSchema = z.object({})

/** Core wallet account definition (extended in future migrations) */
export const AccountSchema = z.object({})

export type AccountMetadata = z.infer<typeof AccountMetadataSchema>
export type Account = z.infer<typeof AccountSchema>

/** Type guard — narrows unknown to Account */
export function validateAccount(obj: unknown): obj is Account {
  return AccountSchema.safeParse(obj).success
}
