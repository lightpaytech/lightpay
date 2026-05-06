import { expect } from '@jest/globals'
import path from 'path'

/** The canonical path separator used when comparing paths in LightPay tests. */
export const LIGHTPAY_PATH_SEPARATOR = '/'

/**
 * Normalises a file-system path to a forward-slash representation so that
 * path comparisons work identically on Windows and POSIX platforms.
 *
 * @param {string} value - The raw path string to normalise.
 * @returns {string} The path with all back-slashes replaced by forward-slashes.
 */
export const normalizePath = (value) => {
  return path
    .normalize(value || '')
    .split('\\')
    .join(LIGHTPAY_PATH_SEPARATOR)
}

const toMatchPath = (actual, expected) => {
  return normalizePath(actual) === normalizePath(expected)
    ? {
        pass: true,
        message: () => `expected ${normalizePath(actual)} to be ${normalizePath(expected)}`
      }
    : {
        pass: false,
        message: () => `expected ${normalizePath(actual)} to be ${normalizePath(expected)}`
      }
}

expect.extend({
  toMatchPath
})
