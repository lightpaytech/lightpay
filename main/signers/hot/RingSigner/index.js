const path = require('path')
const log = require('electron-log')
const { fromPrivateKey, fromV1, fromV3 } = require('ethereumjs-wallet').default

const HotSigner = require('../HotSigner')

const WORKER_PATH = path.resolve(__dirname, 'worker.js')

/** Supported keystore file versions. */
const SUPPORTED_KEYSTORE_VERSIONS = [1, 3]

/**
 * Selects the appropriate ethereumjs-wallet factory for a given keystore version.
 * @param {object} keystore - Parsed keystore JSON object.
 * @param {string} keystorePassword - Password for decrypting the keystore.
 * @returns {Promise<object>} Resolved wallet instance.
 */
async function walletFromKeystore(keystore, keystorePassword) {
  if (keystore.version === 1) return fromV1(keystore, keystorePassword)
  if (keystore.version === 3) return fromV3(keystore, keystorePassword)
  throw new Error(`RingSigner: unsupported keystore version ${keystore.version} (supported: ${SUPPORTED_KEYSTORE_VERSIONS.join(', ')})`)
}

class RingSigner extends HotSigner {
  constructor(signer) {
    super(signer, WORKER_PATH)
    this.type = 'ring'
    this.model = 'keyring'
    this.encryptedKeys = signer && signer.encryptedKeys
    if (this.encryptedKeys) this.update()
  }

  save() {
    super.save({ encryptedKeys: this.encryptedKeys })
  }

  unlock(password, cb) {
    super.unlock(password, { encryptedKeys: this.encryptedKeys }, cb)
  }

  addPrivateKey(key, password, cb) {
    let wallet
    try {
      wallet = fromPrivateKey(Buffer.from(key, 'hex'))
    } catch (e) {
      return cb(new Error('RingSigner: invalid private key'))
    }
    const address = wallet.getAddressString()

    if (this.addresses.includes(address)) {
      return cb(new Error('RingSigner: private key already added'))
    }

    const params = { encryptedKeys: this.encryptedKeys, key, password }
    this._callWorker({ method: 'addKey', params }, (err, encryptedKeys) => {
      if (err) return cb(err)

      this.addresses = [...this.addresses, address]
      this.encryptedKeys = encryptedKeys

      log.info(`RingSigner [${this.id}]: private key added`)
      this.update()

      this.unlock(password, cb)
    })
  }

  removePrivateKey(index, password, cb) {
    const params = { encryptedKeys: this.encryptedKeys, index, password }
    this._callWorker({ method: 'removeKey', params }, (err, encryptedKeys) => {
      if (err) return cb(err)

      this.addresses = this.addresses.filter((address) => address !== this.addresses[index])
      this.encryptedKeys = encryptedKeys

      log.info(`RingSigner [${this.id}]: private key removed at index ${index}`)
      this.update()

      if (this.status === 'ok') this.lock(cb)
      else cb(null)
    })
  }

  // TODO: Encrypt all keys together so that they all get the same password
  async addKeystore(keystore, keystorePassword, password, cb) {
    let wallet
    try {
      wallet = await walletFromKeystore(keystore, keystorePassword)
    } catch (e) {
      return cb(e)
    }
    this.addPrivateKey(wallet.privateKey.toString('hex'), password, cb)
  }
}

module.exports = RingSigner
