const path = require('path')
const log = require('electron-log')
const HotSigner = require('../HotSigner')
const bip39 = require('bip39')
const hdKey = require('hdkey')
const { computeAddress } = require('ethers').utils

const WORKER_PATH = path.resolve(__dirname, 'worker.js')

/** Standard BIP-44 derivation path prefix used for Ethereum seed accounts. */
const SEED_DERIVATION_PREFIX = "m/44'/60'/0'/0/"

/**
 * Derives the first `count` Ethereum addresses from a hex-encoded master seed.
 * @param {string} seedHex - Hex-encoded master seed buffer.
 * @param {number} count - Number of addresses to derive.
 * @returns {string[]} Array of checksummed Ethereum addresses.
 */
function deriveSeedAddresses(seedHex, count) {
  const wallet = hdKey.fromMasterSeed(Buffer.from(seedHex, 'hex'))
  const addresses = []
  for (let i = 0; i < count; i++) {
    const publicKey = wallet.derive(SEED_DERIVATION_PREFIX + i).publicKey
    addresses.push(computeAddress(publicKey))
  }
  return addresses
}

class SeedSigner extends HotSigner {
  constructor(signer) {
    super(signer, WORKER_PATH)
    this.encryptedSeed = signer && signer.encryptedSeed
    this.type = 'seed'
    this.model = 'phrase'
    if (this.encryptedSeed) this.update()
  }

  addSeed(seed, password, cb) {
    if (this.encryptedSeed) return cb(new Error('SeedSigner: this signer already has a seed'))

    this._callWorker({ method: 'encryptSeed', params: { seed, password } }, (err, encryptedSeed) => {
      if (err) return cb(err)

      // Derive addresses using extracted helper
      const addresses = deriveSeedAddresses(seed, 100)

      // Update signer
      this.encryptedSeed = encryptedSeed
      this.addresses = addresses
      this.update()
      this.unlock(password, cb)
    })
  }

  async addPhrase(phrase, password, cb) {
    // Validate phrase
    if (!bip39.validateMnemonic(phrase)) return cb(new Error('SeedSigner: invalid mnemonic phrase'))
    // Get seed
    const seed = await bip39.mnemonicToSeed(phrase)
    // Add seed to signer
    this.addSeed(seed.toString('hex'), password, cb)
  }

  save() {
    super.save({ encryptedSeed: this.encryptedSeed })
  }

  unlock(password, cb) {
    super.unlock(password, { encryptedSeed: this.encryptedSeed }, cb)
  }
}

module.exports = SeedSigner
