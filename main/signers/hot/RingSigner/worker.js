const HotSignerWorker = require('../HotSigner/worker')

/** Separator character used to join/split multiple hex-encoded private keys in storage. */
const KEY_SEPARATOR = ':'

class RingSignerWorker extends HotSignerWorker {
  constructor() {
    super()
    this.keys = null
    process.on('message', (message) => this.handleMessage(message))
  }

  /**
   * @param {{ encryptedKeys: string, password: string }} params
   * @param {function(string|null): void} pseudoCallback
   */
  unlock({ encryptedKeys, password }, pseudoCallback) {
    try {
      this.keys = this._decrypt(encryptedKeys, password)
        .split(KEY_SEPARATOR)
        .map((key) => Buffer.from(key, 'hex'))
      pseudoCallback(null)
    } catch (e) {
      pseudoCallback('RingSigner worker: invalid password')
    }
  }

  /**
   * @param {*} _
   * @param {function(null): void} pseudoCallback
   */
  lock(_, pseudoCallback) {
    this.keys = null
    pseudoCallback(null)
  }

  /**
   * @param {{ encryptedKeys: string|null, key: string, password: string }} params
   * @param {function(null, string): void} pseudoCallback
   */
  addKey({ encryptedKeys, key, password }, pseudoCallback) {
    // If signer already has encrypted keys, decrypt them and append the new key
    const keys = encryptedKeys ? [...this._decryptKeys(encryptedKeys, password), key] : [key]
    pseudoCallback(null, this._encryptKeys(keys, password))
  }

  /**
   * @param {{ encryptedKeys: string, index: number, password: string }} params
   * @param {function(string|null, string|null): void} pseudoCallback
   */
  removeKey({ encryptedKeys, index, password }, pseudoCallback) {
    if (!encryptedKeys) return pseudoCallback('RingSigner worker: signer has no keys')
    let keys = this._decryptKeys(encryptedKeys, password)
    keys = keys.filter((key) => key !== keys[index])
    const result = keys.length > 0 ? this._encryptKeys(keys, password) : null
    pseudoCallback(null, result)
  }

  /**
   * @param {{ index: number, message: string }} params
   * @param {function(string|null, string|undefined): void} pseudoCallback
   */
  signMessage({ index, message }, pseudoCallback) {
    if (!this.keys) return pseudoCallback('RingSigner worker: signer is locked')
    super.signMessage(this.keys[index], message, pseudoCallback)
  }

  /**
   * @param {{ index: number, typedMessage: object }} params
   * @param {function(string|null, string|undefined): void} pseudoCallback
   */
  signTypedData({ index, typedMessage }, pseudoCallback) {
    if (!this.keys) return pseudoCallback('RingSigner worker: signer is locked')
    super.signTypedData(this.keys[index], typedMessage, pseudoCallback)
  }

  /**
   * @param {{ index: number, rawTx: object }} params
   * @param {function(string|null, string|undefined): void} pseudoCallback
   */
  signTransaction({ index, rawTx }, pseudoCallback) {
    if (!this.keys) return pseudoCallback('RingSigner worker: signer is locked')
    super.signTransaction(this.keys[index], rawTx, pseudoCallback)
  }

  _decryptKeys(encryptedKeys, password) {
    if (!encryptedKeys) return null
    return this._decrypt(encryptedKeys, password).split(KEY_SEPARATOR)
  }

  _encryptKeys(keys, password) {
    return this._encrypt(keys.join(KEY_SEPARATOR), password)
  }
}

const ringSignerWorker = new RingSignerWorker() // eslint-disable-line
