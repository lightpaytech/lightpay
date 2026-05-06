import signatureTypes from './types'
import { SignTypedDataVersion, MessageTypeProperty } from '@metamask/eth-sig-util'

import type { TypedMessage, TypedSignatureRequestType } from '../accounts/types'
import type { EIP712MessageDomain } from '@ledgerhq/types-live'

// Named constants
const DEFAULT_SIGNATURE_TYPE = 'signTypedData'
const SIG_PREFIX_HEX = '0x'
const SIG_COMPACT_LENGTH = 130 // 65 bytes = 130 hex chars without prefix
const SIG_COMPACT_LENGTH_WITH_PREFIX = 132 // with 0x prefix
const SIG_LEGACY_V_EVEN = '1b'
const SIG_LEGACY_V_ODD = '1c'

// Returns a human-readable label for a raw hex signature string
export function getSignatureType(sig: string): string {
  if (!sig || typeof sig !== 'string') return 'unknown'
  const normalized = sig.startsWith(SIG_PREFIX_HEX) ? sig.slice(2) : sig
  if (normalized.length === SIG_COMPACT_LENGTH) {
    const v = normalized.slice(-2).toLowerCase()
    if (v === SIG_LEGACY_V_EVEN || v === SIG_LEGACY_V_ODD) return 'legacy-ecdsa'
    return 'compact-ecdsa'
  }
  return 'unknown'
}

const matchesMsgType = (properties: MessageTypeProperty[], required: MessageTypeProperty[]) =>
  properties.length === required.length &&
  required.every(({ name, type }) =>
    Boolean(properties.find((item) => item.name === name && item.type === type))
  )

const matchesMessage = (message: Record<string, unknown>, required: MessageTypeProperty[]) =>
  required.every(({ name }) => message[name] !== undefined)

const matchesDomainFilter = (domain: EIP712MessageDomain, domainFilter: string[]) =>
  domainFilter.every((property) => property in domain)

export const identify = ({ data }: TypedMessage<SignTypedDataVersion>): TypedSignatureRequestType => {
  const identified = Object.entries(signatureTypes).find(([, { domainFilter, types: requiredTypes }]) => {
    if (!('types' in data && 'message' in data)) return

    return Object.entries(requiredTypes).every(
      ([name, properties]) =>
        data.types[name] &&
        matchesMsgType(data.types[name], properties) &&
        matchesMessage(data.message, properties) &&
        matchesDomainFilter(data.domain as EIP712MessageDomain, domainFilter)
    )
  })

  return identified ? (identified[0] as TypedSignatureRequestType) : (DEFAULT_SIGNATURE_TYPE as TypedSignatureRequestType)
}

export { isSignatureRequest } from '../../resources/domain/request'
