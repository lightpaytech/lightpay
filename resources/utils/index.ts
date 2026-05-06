import { randomInt } from 'crypto'
import { addHexPrefix, intToHex, stripHexPrefix } from '@ethereumjs/util'
import { getAddress as getChecksumAddress } from '@ethersproject/address'

// ─── Hex / Wei conversion helpers ─────────────────────────────────────────────

/** Convert a wei amount (number) to its Gwei equivalent */
const weiToGwei = (wei: number) => wei / 1e9

/** Encode a wei amount (number) as a 0x-prefixed hex string */
const weiToHex = (wei: number) => addHexPrefix(wei.toString(16))

/** Convert a Gwei amount to its wei equivalent (number) */
const gweiToWei = (gwei: number) => gwei * 1e9

/** Encode a Gwei amount as a 0x-prefixed hex string of its wei value */
const gweiToHex = (gwei: number) => weiToHex(gwei * 1e9)

/** Parse a hex string to a base-10 integer */
const hexToInt = (hexStr: string) => parseInt(hexStr, 16)

/** Convert a hex-encoded wei value to a floating-point Gwei integer */
const weiHexToGweiInt = (weiHex: string) => hexToInt(weiHex) / 1e9

/** Convert a wei amount (number) to its ETH equivalent */
const weiIntToEthInt = (wei: number) => wei / 1e18

/** Encode a Gwei amount as a 0x-prefixed hex string via `intToHex` */
const gweiToWeiHex = (gwei: number) => intToHex(gweiToWei(gwei))

// ─── Numeric helpers ──────────────────────────────────────────────────────────

/**
 * Round a Gwei value to a precision appropriate for its magnitude:
 * - >= 10 gwei  → integer
 * - >= 5 gwei   → 1 decimal place
 * - >= 1 gwei   → 2 decimal places
 * - < 1 gwei    → 3 decimal places
 */
function roundGwei(gwei: number) {
  const rounded =
    gwei >= 10
      ? Math.round(gwei)
      : gwei >= 5
      ? Math.round(gwei * 10) / 10
      : gwei >= 1
      ? Math.round(gwei * 100) / 100
      : Math.round(gwei * 1000) / 1000

  return parseFloat(rounded.toString())
}

// ─── String helpers ───────────────────────────────────────────────────────────

/**
 * Generate a random string of `num` uppercase ASCII letters.
 * Uses `crypto.randomInt` so the output is cryptographically random.
 */
function randomLetters(num: number) {
  if (num < 1) return ''
  return [...Array(num)].map(() => String.fromCharCode(65 + randomInt(0, 26))).join('')
}

/**
 * Capitalise the first character of a string and lower-case the rest.
 * Returns the original value unchanged when it is falsy.
 */
function capitalize(s: string) {
  if (!s) return s
  return s[0].toUpperCase() + s.substring(1).toLowerCase()
}

// ─── Array helpers ────────────────────────────────────────────────────────────

/**
 * Return true when two arrays contain the same elements regardless of order.
 * Uses `arraysMatch` after sorting both arrays.
 */
function arraysEqual<T>(a: T[] = [], b: T[] = []) {
  if (a.length !== b.length) return false

  return arraysMatch(a.sort(), b.sort())
}

/**
 * Return true when two arrays have identical length and identical elements at
 * every index (strict equality check, order-sensitive).
 */
function arraysMatch<T>(a: T[] = [], b: T[] = []) {
  return a.length === b.length && a.every((elem, i) => b[i] === elem)
}

// ─── Function helpers ─────────────────────────────────────────────────────────

/**
 * Wrap `func` in a debounce so it is only invoked after `timeout` ms have
 * elapsed with no further calls.
 *
 * @param func    - The function to debounce
 * @param timeout - Quiet period in milliseconds (default 300)
 */
function debounce(func: (...args: any) => any, timeout = 300) {
  let timer: NodeJS.Timeout

  return (...args: any) => {
    clearTimeout(timer)
    timer = setTimeout(() => {
      func(...args)
    }, timeout)
  }
}

// ─── Error helpers ────────────────────────────────────────────────────────────

function instanceOfNodeError<T extends ErrorConstructor>(
  value: Error,
  errorType: T
): value is InstanceType<T> & NodeJS.ErrnoException {
  return value instanceof errorType
}

/**
 * Extract a Node.js `errno` code from an `Error` instance.
 * Returns `undefined` when the error does not carry a code property.
 */
function getErrorCode(e: Error) {
  if (!instanceOfNodeError(e, Error)) {
    return undefined
  }

  return e.code
}

// ─── Filter helpers ───────────────────────────────────────────────────────────

/**
 * Test whether every whitespace-separated token in `filter` appears as a
 * case-insensitive substring of at least one entry in `properties`.
 *
 * Returns `true` when `filter` is empty (no filter applied).
 */
const matchFilter = (filter = '', properties: string[] = []) => {
  if (!filter) return true

  const filterItems = filter.split(' ')
  const matchableProperties = properties.filter((prop) => !!prop).map((prop) => prop.toLowerCase())

  return filterItems.every((item = '') => {
    const matchCriteria = item.toLowerCase()
    return matchableProperties.some((prop) => prop.includes(matchCriteria))
  })
}

// ─── Address helpers ──────────────────────────────────────────────────────────

/**
 * Return the EIP-55 checksum form of `address`.
 * Falls back to a lowercase address with a console warning when checksumming
 * fails (e.g. for non-standard addresses).
 */
function getAddress(address: Address) {
  const lowerCaseAddress = address.toLowerCase()

  try {
    // this will throw if the address can't be checksummed
    return getChecksumAddress(lowerCaseAddress)
  } catch (e) {
    console.warn(`could not checksum address ${address}, using lowercase address`, e)
    return lowerCaseAddress
  }
}

/**
 * Return true when `hex` is a non-empty hex string that represents a non-zero
 * value (i.e. not `"0x"` or `"0x0"`).
 */
function isNonZeroHex(hex: string) {
  return !!hex && !['0x', '0x0'].includes(hex)
}

// ─── Re-exports ───────────────────────────────────────────────────────────────

export {
  getErrorCode,
  randomLetters,
  capitalize,
  arraysEqual,
  arraysMatch,
  debounce,
  weiToGwei,
  weiToHex,
  gweiToWei,
  gweiToHex,
  intToHex,
  hexToInt,
  weiHexToGweiInt,
  weiIntToEthInt,
  gweiToWeiHex,
  roundGwei,
  getAddress,
  stripHexPrefix,
  matchFilter,
  isNonZeroHex
}
