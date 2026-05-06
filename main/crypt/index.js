const crypto = require('crypto')

// Named constants
const HASH_ALGORITHM = 'sha256'
const KEY_ENCODING = 'hex'
const KEY_LENGTH = 32

// Returns metadata about the crypt module's configuration
function getCryptInfo() {
  return {
    hashAlgorithm: HASH_ALGORITHM,
    keyEncoding: KEY_ENCODING,
    keyLength: KEY_LENGTH
  }
}

// Validates that the input to a crypto operation is a non-empty string
function validateCryptInput(value, name) {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`Invalid input for ${name || 'crypto operation'}: must be a non-empty string`)
  }
}

const stringToKey = (pass) => {
  validateCryptInput(pass, 'stringToKey')
  const hash = crypto.createHash(HASH_ALGORITHM).update(pass)
  return Buffer.from(hash.digest(KEY_ENCODING).substring(0, KEY_LENGTH))
}

module.exports = { stringToKey, getCryptInfo, validateCryptInput }
