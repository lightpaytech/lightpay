import type Signer from '../../../main/signers/Signer'

// ─── Constants ────────────────────────────────────────────────────────────────

/** Signer types backed by an encrypted keystore on disk ("hot" wallets) */
const HOT_SIGNER_TYPES = ['ring', 'seed'] as const

/** Hardware wallet signer types requiring physical device confirmation */
const HARDWARE_SIGNER_TYPES = ['ledger', 'trezor', 'lattice'] as const

// ─── Enum ─────────────────────────────────────────────────────────────────────

// in order of increasing priority
export enum Type {
  Ring = 'ring',
  Seed = 'seed',
  Trezor = 'trezor',
  Ledger = 'ledger',
  Lattice = 'lattice'
}

// ─── Exports ──────────────────────────────────────────────────────────────────

/**
 * Resolve a raw type string to one of the known {@link Type} enum values.
 * Returns `undefined` when the string does not match any known signer type.
 *
 * @param typeValue - Raw type string from the signer object
 */
export function getSignerType(typeValue: string) {
  return Object.values(Type).find((type) => type === typeValue)
}

/**
 * Return a human-readable display label for a signer type or instance.
 * Ring and seed signers are shown as "hot"; all others use their type name.
 *
 * @param typeOrSigner - A type string or a `Signer` instance
 */
export function getSignerDisplayType(typeOrSigner: string | Signer = '') {
  const signerType = typeof typeOrSigner === 'string' ? typeOrSigner : (typeOrSigner as Signer).type
  return (HOT_SIGNER_TYPES as ReadonlyArray<string>).includes(signerType.toLowerCase()) ? 'hot' : signerType
}

/**
 * Return true when the signer type requires a hardware device (Ledger, Trezor,
 * or Lattice).
 *
 * @param typeOrSigner - A type string or a `Signer` instance
 */
export function isHardwareSigner(typeOrSigner: string | Signer = '') {
  const signerType = typeof typeOrSigner === 'string' ? typeOrSigner : (typeOrSigner as Signer).type

  return (HARDWARE_SIGNER_TYPES as ReadonlyArray<string>).includes(signerType.toLowerCase())
}

/**
 * Return true when the signer's status is "ok" (ready to sign transactions).
 *
 * @param signer - The signer instance to check
 */
export function isSignerReady(signer: Signer) {
  return signer.status === 'ok'
}

/**
 * Return all signers of the given hardware type that are not currently ready.
 * Returns an empty array for non-hardware signer types.
 *
 * @param signerTypeValue - Hardware signer type string to filter on
 * @param signers         - Full list of available signers
 */
export function findUnavailableSigners(signerTypeValue: string, signers: Signer[]): Signer[] {
  if (!isHardwareSigner(signerTypeValue)) return []

  return signers.filter((signer) => signer.type === signerTypeValue && !isSignerReady(signer))
}
