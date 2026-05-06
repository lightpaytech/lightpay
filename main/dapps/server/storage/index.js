const store = require('../../../store').default

// Named constants for storage key prefixes
const STORAGE_KEY_PREFIX_DAPP = 'main.dapp.storage'

// Build a namespaced storage key for a given dapp and sub-key
function getStorageKey(dappId, key) {
  return `${STORAGE_KEY_PREFIX_DAPP}.${dappId}.${key}`
}

// Return basic stats about what is stored for a dapp
function getStorageStats(dappId) {
  const data = store(`${STORAGE_KEY_PREFIX_DAPP}.${dappId}`)
  const keys = data && typeof data === 'object' ? Object.keys(data).length : 0
  return { keys }
}

module.exports = {
  get: (hash) => store(`${STORAGE_KEY_PREFIX_DAPP}.${hash}`),
  update: (hash, state) => {
    try {
      state = JSON.parse(state)
    } catch (e) {
      state = ''
    }
    store.setDappStorage(hash, state)
  },
  getStorageKey,
  getStorageStats,
  STORAGE_KEY_PREFIX_DAPP
}
