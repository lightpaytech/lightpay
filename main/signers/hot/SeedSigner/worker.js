const hdKey = require('hdkey')
const HotSignerWorker = require('../HotSigner/worker')

/** BIP-44 derivation path prefix for Ethereum accounts (coin type 60). */
const ETH_DERIVATION_PREFIX = "m/44'/60'/0'/0/"

class SeedSignerWorker extends HotSignerWorker {
  constructor() {
    super()
    this.seed = null
    process.on('message', (message) => this.handleMessage(message))
  }

  /**
   * @param {{ encryptedSeed: string, password: string }} params
   * @param {function(string|null): void} pseudoCallback
   */
  unlock({ encryptedSeed, password }, pseudoCallback) {
    try {
      this.seed = this._decrypt(encryptedSeed, password)
      pseudoCallback(null)
    } catch (e) {
      pseudoCallback('SeedSigner worker: invalid password')
    }
  }

  /**
   * @param {*} _
   * @param {function(null): void} pseudoCallback
   */
  lock(_, pseudoCallback) {
    this.seed = null
    pseudoCallback(null)
  }

  /**
   * @param {{ seed: string, password: string }} params
   * @param {function(null, string): void} pseudoCallback
   */
  encryptSeed({ seed, password }, pseudoCallback) {
    pseudoCallback(null, this._encrypt(seed.toString('hex'), password))
  }

  /**
   * @param {{ index: number, message: string }} params
   * @param {function(string|null, string|undefined): void} pseudoCallback
   */
  signMessage({ index, message }, pseudoCallback) {
    if (!this.seed) return pseudoCallback('SeedSigner worker: signer is locked')
    const key = this._derivePrivateKey(index)
    super.signMessage(key, message, pseudoCallback)
  }

  /**
   * @param {{ index: number, typedMessage: object }} params
   * @param {function(string|null, string|undefined): void} pseudoCallback
   */
  signTypedData({ index, typedMessage }, pseudoCallback) {
    if (!this.seed) return pseudoCallback('SeedSigner worker: signer is locked')
    const key = this._derivePrivateKey(index)
    super.signTypedData(key, typedMessage, pseudoCallback)
  }

  /**
   * @param {{ index: number, rawTx: object }} params
   * @param {function(string|null, string|undefined): void} pseudoCallback
   */
  signTransaction({ index, rawTx }, pseudoCallback) {
    if (!this.seed) return pseudoCallback('SeedSigner worker: signer is locked')
    const key = this._derivePrivateKey(index)
    super.signTransaction(key, rawTx, pseudoCallback)
  }

  _derivePrivateKey(index) {
    const masterKey = hdKey.fromMasterSeed(Buffer.from(this.seed, 'hex'))
    return masterKey.derive(ETH_DERIVATION_PREFIX + index).privateKey
  }
}

const seedSignerWorker = new SeedSignerWorker() // eslint-disable-line
