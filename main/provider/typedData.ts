import { SignTypedDataVersion } from '@metamask/eth-sig-util'
import type { TypedMessage } from '../accounts/types'

// V4 is the default fallback for any ambiguous or erroring typed-data payload
const DEFAULT_VERSION = SignTypedDataVersion.V4

/**
 * Returns true if any field in the primary type references an array type.
 * Arrays are only valid in EIP-712 v4, so their presence forces that version.
 */
function typeContainsArrays(typedData: Exclude<TypedMessage['data'], any[]>): boolean {
  const allFields = Object.values(typedData.types).flat()
  return allFields.some(({ type }) => type.endsWith('[]'))
}

/**
 * Returns true if any field declared in the primary type has an undefined
 * value in the message payload — which is invalid under v4 but allowed in v3.
 */
function primaryTypeHasUndefinedField(typedData: Exclude<TypedMessage['data'], any[]>): boolean {
  const { types, primaryType, message } = typedData
  const primaryFields = types[primaryType]
  return primaryFields.some(({ name }) => message[name] === undefined)
}

/**
 * Infer the correct SignTypedDataVersion from the payload shape alone,
 * without requiring the caller to pass a version explicitly.
 */
export function getVersionFromTypedData(typedData: TypedMessage['data']): SignTypedDataVersion {
  // Legacy v1 format is an array of typed entries rather than a domain object
  if (Array.isArray(typedData)) {
    return SignTypedDataVersion.V1
  }

  try {
    // Arrays in any type definition are a v4-exclusive feature
    if (typeContainsArrays(typedData)) {
      return DEFAULT_VERSION
    }

    // No v4-specific features detected — prefer v4 unless undefined fields
    // in the primary type force us back to v3 for compatibility
    const hasUndefined = primaryTypeHasUndefinedField(typedData)
    return hasUndefined ? SignTypedDataVersion.V3 : DEFAULT_VERSION
  } catch {
    // Malformed payload — fall back to the safest modern version
    return DEFAULT_VERSION
  }
}
