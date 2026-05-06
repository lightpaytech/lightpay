import log from 'electron-log'
import { v5 as uuidv5 } from 'uuid'
import { accountNS, isDefaultAccountName } from '../../../resources/domain/account'
import { toTokenId } from '../../../resources/domain/balance'

const panelActions = require('../../../resources/store/actions.panel')
const supportedNetworkTypes = ['ethereum']

// Lazy store reference — avoids a circular import at module load time.
// actions/index.js is required by store/index.ts *after* store is created,
// so this getter is always resolved before any action is called.
let _store = null
function store(...args) {
  if (!_store) _store = require('../index').default
  return _store(...args)
}

// ─── Store Path Constants ─────────────────────────────────────────────────────

const STORE_PATH_ACCOUNTS      = 'main.accounts'
const STORE_PATH_ACCOUNTS_META = 'main.accountsMeta'
const STORE_PATH_BALANCES      = 'main.balances'
const STORE_PATH_DAPP_DETAILS  = 'main.dapp.details'
const STORE_PATH_DAPP_MAP      = 'main.dapp.map'
const STORE_PATH_DAPP_STORAGE  = 'main.dapp.storage'
const STORE_PATH_DAPPS         = 'main.dapps'
const STORE_PATH_FRAMES        = 'main.frames'
const STORE_PATH_FOCUSED_FRAME = 'main.focusedFrame'
const STORE_PATH_IPFS          = 'main.ipfs'
const STORE_PATH_KNOWN_EXT     = 'main.knownExtensions'
const STORE_PATH_LATTICE       = 'main.lattice'
const STORE_PATH_LATTICE_SETTINGS = 'main.latticeSettings'
const STORE_PATH_LAUNCH        = 'main.launch'
const STORE_PATH_LEDGER        = 'main.ledger'
const STORE_PATH_MENUBAR_GAS   = 'main.menubarGasPrice'
const STORE_PATH_MUTE          = 'main.mute'
const STORE_PATH_NETWORKS      = 'main.networks'
const STORE_PATH_NETWORKS_META = 'main.networksMeta'
const STORE_PATH_NETWORKS_ETH  = 'main.networks.ethereum'
const STORE_PATH_NETWORKS_META_ETH = 'main.networksMeta.ethereum'
const STORE_PATH_OPEN_DAPPS    = 'main.openDapps'
const STORE_PATH_ORIGINS       = 'main.origins'
const STORE_PATH_PERMISSIONS   = 'main.permissions'
const STORE_PATH_PIN           = 'main.pin'
const STORE_PATH_PORTFOLIO     = 'main.portfolioValues'
const STORE_PATH_PRICE_ALERTS  = 'main.priceAlerts'
const STORE_PATH_PRIVACY       = 'main.privacy'
const STORE_PATH_RATES         = 'main.rates'
const STORE_PATH_REVEAL        = 'main.reveal'
const STORE_PATH_SAVE_ACCOUNT  = 'main.save.account'
const STORE_PATH_SCANNING      = 'main.scanning'
const STORE_PATH_SHORTCUTS     = 'main.shortcuts'
const STORE_PATH_SHOW_LOCAL_ENS = 'main.showLocalNameWithENS'
const STORE_PATH_SIGNERS       = 'main.signers'
const STORE_PATH_TOKENS_CUSTOM = 'main.tokens.custom'
const STORE_PATH_TOKENS_KNOWN  = 'main.tokens.known'
const STORE_PATH_TREZOR        = 'main.trezor'
const STORE_PATH_UPDATER       = 'main.updater.dontRemind'
const STORE_PATH_AUTOHIDE      = 'main.autohide'
const STORE_PATH_ACCOUNT_CLOSE_LOCK = 'main.accountCloseLock'
const STORE_PATH_INVENTORY     = 'main.inventory'
const STORE_PATH_WATCHLIST     = 'main.watchlist'
const STORE_PATH_COLORWAY      = 'main.colorway'

// ─── Internal Helpers ─────────────────────────────────────────────────────────

function switchChainForOrigins(origins, oldChainId, newChainId) {
  Object.entries(origins).forEach(([origin, { chain }]) => {
    if (oldChainId === chain.id) {
      origins[origin].chain = { id: newChainId, type: 'ethereum' }
    }
  })
}

function validateNetworkSettings(network) {
  const networkId = parseInt(network.id)

  if (
    !Number.isInteger(networkId) ||
    typeof network.type !== 'string' ||
    typeof network.name !== 'string' ||
    typeof network.explorer !== 'string' ||
    typeof network.symbol !== 'string' ||
    !supportedNetworkTypes.includes(network.type)
  ) {
    throw new Error(`Invalid network settings: ${JSON.stringify(network)}`)
  }

  return networkId
}

function includesToken(tokens, token) {
  const existingAddress = token.address.toLowerCase()
  return tokens.some((t) => t.address.toLowerCase() === existingAddress && t.chainId === token.chainId)
}

// ─── Exported Actions ─────────────────────────────────────────────────────────

module.exports = {
  ...panelActions,

  // ══ ACCOUNT ACTIONS ══

  /**
   * Marks tokens for an account as having been updated, refreshing the lastUpdated timestamp.
   */
  accountTokensUpdated: (u, address) => {
    u(STORE_PATH_ACCOUNTS, address, (account) => {
      const balances = { ...account.balances, lastUpdated: new Date().getTime() }
      const updated = { ...account, balances }
      return updated
    })
  },

  /**
   * Adds a custom token to the known tokens list for an account address.
   */
  addKnownTokens: (u, address, tokens) => {
    u(STORE_PATH_TOKENS_KNOWN, address, (existing = []) => {
      const existingTokens = existing.filter((token) => !includesToken(tokens, token))
      const tokensToAdd = tokens.map((t) => ({ ...t, address: t.address.toLowerCase() }))
      return [...existingTokens, ...tokensToAdd]
    })
  },

  /**
   * Adds one or more custom tokens to the global custom tokens list.
   */
  addCustomTokens: (u, tokens) => {
    u(STORE_PATH_TOKENS_CUSTOM, (existing) => {
      const existingTokens = existing.filter((token) => !includesToken(tokens, token))
      const tokensToAdd = tokens.map((t) => ({ ...t, address: t.address.toLowerCase() }))
      return [...existingTokens, ...tokensToAdd]
    })

    u(STORE_PATH_BALANCES, (balances) => {
      Object.values(balances).forEach((accountBalances) => {
        tokens.forEach((token) => {
          const tokenAddress = token.address.toLowerCase()
          const matchingBalance = accountBalances.find(
            (b) => b.address.toLowerCase() === tokenAddress && b.chainId === token.chainId
          )
          if (matchingBalance) {
            matchingBalance.logoURI = token.logoURI || matchingBalance.logoURI
            matchingBalance.symbol = token.symbol || matchingBalance.symbol
            matchingBalance.name = token.name || matchingBalance.symbol
          }
        })
      })
      return balances
    })
  },

  /**
   * Adds an address to the user's personal watchlist.
   */
  addWatchlistAddress(address) {
    const current = this.get(STORE_PATH_WATCHLIST) || []
    if (!current.includes(address)) {
      this.set(STORE_PATH_WATCHLIST, [...current, address])
    }
  },

  /**
   * Skips the updater reminder for a given version string.
   */
  dontRemind: (u, version) => {
    u(STORE_PATH_UPDATER, (dontRemind) => {
      if (!dontRemind.includes(version)) {
        return [...dontRemind, version]
      }
      return dontRemind
    })
  },

  /**
   * Excludes a specific token address from being shown for an account.
   */
  omitToken: (u, address, omitToken) => {
    u(STORE_PATH_ACCOUNTS, address, 'tokens.omit', (omit) => {
      omit = omit || []
      if (omit.indexOf(omitToken) === -1) omit.push(omitToken)
      return omit
    })
  },

  /**
   * Removes a signer record by id.
   */
  removeSigner: (u, id) => {
    u(STORE_PATH_SIGNERS, (signers) => {
      delete signers[id]
      return signers
    })
  },

  /**
   * Removes a balance entry for a given token from all accounts.
   */
  removeBalance: (u, chainId, address) => {
    u(STORE_PATH_BALANCES, (balances = {}) => {
      const key = address.toLowerCase()
      for (const accountAddress in balances) {
        const balanceIndex = balances[accountAddress].findIndex(
          (balance) => balance.chainId === chainId && balance.address.toLowerCase() === key
        )
        if (balanceIndex > -1) {
          balances[accountAddress].splice(balanceIndex, 1)
        }
      }
      return balances
    })
  },

  /**
   * Removes multiple balances for an account based on a set of token IDs.
   */
  removeBalances: (u, address, tokensToRemove) => {
    const needsRemoval = (balance) => tokensToRemove.has(toTokenId(balance))
    u(STORE_PATH_BALANCES, address, (balances = []) => balances.filter((balance) => !needsRemoval(balance)))
  },

  /**
   * Removes an account record by id.
   */
  removeAccount: (u, id) => {
    u(STORE_PATH_ACCOUNTS, (accounts) => {
      delete accounts[id]
      return accounts
    })
  },

  /**
   * Removes one or more custom tokens from the custom list and known tokens.
   */
  removeCustomTokens: (u, tokens) => {
    const tokenIds = new Set(tokens.map(toTokenId))
    const needsRemoval = (token) => tokenIds.has(toTokenId(token))

    u(STORE_PATH_TOKENS_CUSTOM, (existing) => {
      return existing.filter((token) => !needsRemoval(token))
    })

    u(STORE_PATH_TOKENS_KNOWN, (knownTokens) => {
      for (const address in knownTokens) {
        knownTokens[address] = knownTokens[address].filter((token) => !needsRemoval(token))
      }
      return knownTokens
    })
  },

  /**
   * Removes known tokens for an account by a removal set.
   */
  removeKnownTokens: (u, address, tokensToRemove) => {
    const needsRemoval = (token) => tokensToRemove.has(toTokenId(token))
    u(STORE_PATH_TOKENS_KNOWN, address, (existing = []) => existing.filter((token) => !needsRemoval(token)))
  },

  /**
   * Removes an address from the user's watchlist.
   */
  removeWatchlistAddress(address) {
    const current = this.get(STORE_PATH_WATCHLIST) || []
    this.set(STORE_PATH_WATCHLIST, current.filter(a => a !== address))
  },

  /**
   * Saves a single balance entry for an account address.
   */
  setBalance: (u, address, balance) => {
    u(STORE_PATH_BALANCES, address, (balances = []) => {
      const existingBalances = balances.filter(
        (b) => b.address !== balance.address || b.chainId !== balance.chainId
      )
      return [...existingBalances, balance]
    })
  },

  /**
   * Replaces or merges a batch of balances for an account address.
   */
  setBalances: (u, address, newBalances) => {
    u(STORE_PATH_BALANCES, address, (balances = []) => {
      const existingBalances = balances.filter((b) => {
        return newBalances.every((bal) => bal.chainId !== b.chainId || bal.address !== b.address)
      })
      return [...existingBalances, ...newBalances]
    })
  },

  /**
   * Opens the selected account panel view.
   */
  setAccount: (u, account) => {
    u('selected.current', () => account.id)
    u('selected.minimized', () => false)
    u('selected.open', () => true)
  },

  /**
   * Sets whether the account close lock is enabled.
   */
  setAccountCloseLock: (u, value) => {
    u(STORE_PATH_ACCOUNT_CLOSE_LOCK, () => Boolean(value))
  },

  /**
   * Filters the panel account list by a search value.
   */
  setAccountFilter: (u, value) => {
    u('panel.accountFilter', () => value)
  },

  /**
   * Controls whether the signer status pane is open in the selected view.
   */
  setAccountSignerStatusOpen: (u, value) => {
    u('selected.signerStatusOpen', () => Boolean(value))
  },

  /**
   * Sets the autohide preference for the tray window.
   */
  setAutohide: (u, v) => {
    u(STORE_PATH_AUTOHIDE, () => v)
  },

  /**
   * Sets the active colorway theme.
   */
  setColorway: (u, colorway) => {
    u(STORE_PATH_COLORWAY, () => colorway)
  },

  /**
   * Sets whether error reporting is enabled.
   */
  setErrorReporting: (u, enable) => {
    u(STORE_PATH_PRIVACY + '.errorReporting', () => enable)
  },

  /**
   * Sets the footer height for a given window, with a floor of 40px.
   */
  setFooterHeight: (u, win, height) => {
    u('windows', win, 'footer.height', () => (height < 40 ? 40 : height))
  },

  /**
   * Sets the NFT inventory for an account address.
   */
  setInventory: (u, address, inventory) => {
    u(STORE_PATH_INVENTORY, address, () => inventory)
  },

  /**
   * Sets the IPFS configuration.
   */
  setIPFS: (u, ipfs) => {
    u(STORE_PATH_IPFS, () => ipfs)
  },

  /**
   * Sets the keyboard layout hint used for shortcut rendering.
   */
  setKeyboardLayout: (u, layout) => {
    u('keyboardLayout', (existingLayout = {}) => ({
      isUS: layout.isUS ?? existingLayout.isUS
    }))
  },

  /**
   * Sets the Lattice device limit for accounts.
   */
  setLatticeAccountLimit: (u, limit) => {
    u(STORE_PATH_LATTICE_SETTINGS + '.accountLimit', () => limit)
  },

  /**
   * Sets an arbitrary config key on a Lattice device record.
   */
  setLatticeConfig: (u, id, key, value) => {
    u(STORE_PATH_LATTICE, id, key, () => value)
  },

  /**
   * Sets the derivation path for Lattice accounts.
   */
  setLatticeDerivation: (u, value) => {
    u(STORE_PATH_LATTICE_SETTINGS + '.derivation', () => value)
  },

  /**
   * Sets the Lattice custom endpoint URL.
   */
  setLatticeEndpointCustom: (u, url) => {
    u(STORE_PATH_LATTICE_SETTINGS + '.endpointCustom', () => url)
  },

  /**
   * Sets the Lattice endpoint mode (default or custom).
   */
  setLatticeEndpointMode: (u, mode) => {
    u(STORE_PATH_LATTICE_SETTINGS + '.endpointMode', () => mode)
  },

  /**
   * Sets the launch-on-login preference.
   */
  setLaunch: (u, launch) => u(STORE_PATH_LAUNCH, () => launch),

  /**
   * Sets the derivation path for Ledger accounts.
   */
  setLedgerDerivation: (u, value) => {
    u(STORE_PATH_LEDGER + '.derivation', () => value)
  },

  /**
   * Sets the Ledger live account scanning limit.
   */
  setLiveAccountLimit: (u, value) => {
    u(STORE_PATH_LEDGER + '.liveAccountLimit', () => value)
  },

  /**
   * Controls whether the menubar shows a live gas price.
   */
  setMenubarGasPrice: (u, value) => {
    u(STORE_PATH_MENUBAR_GAS, () => value)
  },

  /**
   * Stores native currency metadata for a network.
   */
  setNativeCurrencyData: (u, netType, netId, currency) => {
    u(STORE_PATH_NETWORKS_META, netType, netId, 'nativeCurrency', (existing) => ({ ...existing, ...currency }))
  },

  /**
   * Updates exchange rates in the main rates store.
   */
  setRates: (u, rates) => {
    u(STORE_PATH_RATES, (existingRates = {}) => ({ ...existingRates, ...rates }))
  },

  /**
   * Saves the currently selected account ID.
   */
  saveAccount: (u, id) => {
    u(STORE_PATH_SAVE_ACCOUNT, () => id)
  },

  /**
   * Marks an account address as scanning (with a 1s debounce on clearing).
   */
  setScanning: (u, address, scanning) => {
    if (scanning) {
      u(STORE_PATH_SCANNING, address, () => true)
    } else {
      setTimeout(() => {
        u(STORE_PATH_SCANNING, address, () => false)
      }, 1000)
    }
  },

  /**
   * Sets or updates a keyboard shortcut by name.
   */
  setShortcut: (u, name, shortcut) => {
    u(STORE_PATH_SHORTCUTS, name, (existingShortcut = {}) => ({
      modifierKeys: shortcut.modifierKeys || existingShortcut.modifierKeys,
      shortcutKey: shortcut.shortcutKey || existingShortcut.shortcutKey,
      configuring: shortcut.configuring ?? existingShortcut.configuring,
      enabled: shortcut.enabled ?? existingShortcut.enabled
    }))
  },

  /**
   * Sets the derivation path for Trezor accounts.
   */
  setTrezorDerivation: (u, value) => {
    u(STORE_PATH_TREZOR + '.derivation', () => value)
  },

  /**
   * Syncs a state path to a given value, guarding against writes to main.
   */
  syncPath: (u, path, value) => {
    if (!path || path === '*' || path.startsWith('main')) return
    u(path, () => value)
  },

  /**
   * Clears the selected account and resets the account panel.
   */
  unsetAccount: (u) => {
    u('selected.open', () => false)
    u('selected.minimized', () => true)
    u('selected.view', () => 'default')
    u('selected.showAccounts', () => false)
    u('windows.panel.nav', () => [])
    setTimeout(() => {
      u('selected', (signer) => {
        signer.last = signer.current
        signer.current = ''
        signer.requests = {}
        signer.view = 'default'
        return signer
      })
    }, 320)
  },

  /**
   * Updates account data; also persists a custom name to accountsMeta if changed.
   */
  updateAccount: (u, updatedAccount) => {
    const { id, name } = updatedAccount
    u(STORE_PATH_ACCOUNTS, id, (account = {}) => {
      return { ...updatedAccount, balances: account.balances || {} }
    })
    if (name && !isDefaultAccountName({ ...updatedAccount, name })) {
      const accountMetaId = uuidv5(id, accountNS)
      u(STORE_PATH_ACCOUNTS_META, accountMetaId, (accountMeta) => {
        return { ...accountMeta, name, lastUpdated: Date.now() }
      })
    }
  },

  /**
   * Updates a typed data signing request for an account.
   */
  updateTypedDataRequest: (u, account, reqId, data) => {
    u(STORE_PATH_ACCOUNTS, account, 'requests', (requests) => {
      if (!requests[reqId]?.typedMessage?.data) {
        log.error('No typed data request found for ', { reqId })
        return requests
      }
      Object.assign(requests[reqId], data)
      return requests
    })
  },

  /**
   * Creates a new signer record with a creation timestamp.
   */
  newSigner: (u, signer) => {
    u(STORE_PATH_SIGNERS, (signers) => {
      signers[signer.id] = { ...signer, createdAt: new Date().getTime() }
      return signers
    })
  },

  /**
   * Merges an update into an existing Lattice device record.
   */
  updateLattice: (u, deviceId, update) => {
    if (deviceId && update) u(STORE_PATH_LATTICE, deviceId, (current = {}) => Object.assign(current, update))
  },

  /**
   * Removes a Lattice device record by deviceId.
   */
  removeLattice: (u, deviceId) => {
    if (deviceId) {
      u(STORE_PATH_LATTICE, (lattice = {}) => {
        delete lattice[deviceId]
        return lattice
      })
    }
  },

  /**
   * Merges a partial update into an existing signer record.
   */
  updateSigner: (u, signer) => {
    if (!signer.id) return
    u(STORE_PATH_SIGNERS, signer.id, (prev) => ({ ...prev, ...signer }))
  },

  // ══ CHAIN ACTIONS ══

  /**
   * Activates or deactivates a network, switching affected origins to mainnet when deactivating.
   */
  activateNetwork: (u, type, chainId, active) => {
    u(STORE_PATH_NETWORKS, type, chainId, 'on', () => active)

    if (!active) {
      u('main', (main) => {
        switchChainForOrigins(main.origins, chainId, 1)
        return main
      })
    }
  },

  /**
   * Adds a new network definition and its metadata.
   */
  addNetwork: (u, net) => {
    try {
      net.id = validateNetworkSettings(net)

      const primaryRpc = net.primaryRpc || ''
      const secondaryRpc = net.secondaryRpc || ''
      delete net.primaryRpc
      delete net.secondaryRpc

      const defaultNetwork = {
        id: 0,
        isTestnet: false,
        type: '',
        name: '',
        explorer: '',
        gas: {
          price: {
            selected: 'standard',
            levels: { slow: '', standard: '', fast: '', asap: '', custom: '' }
          }
        },
        connection: {
          presets: { local: 'direct' },
          primary: {
            on: true,
            current: 'custom',
            status: 'loading',
            connected: false,
            type: '',
            network: '',
            custom: primaryRpc
          },
          secondary: {
            on: false,
            current: 'custom',
            status: 'loading',
            connected: false,
            type: '',
            network: '',
            custom: secondaryRpc
          }
        },
        on: true
      }

      const defaultMeta = {
        blockHeight: 0,
        name: net.name,
        primaryColor: net.primaryColor,
        icon: net.icon || '',
        nativeCurrency: {
          symbol: net.symbol,
          icon: net.nativeCurrencyIcon || '',
          name: net.nativeCurrencyName || '',
          decimals: 18
        },
        gas: {
          price: {
            selected: 'standard',
            levels: { slow: '', standard: '', fast: '', asap: '', custom: '' }
          }
        }
      }

      u('main', (main) => {
        if (!main.networks[net.type]) main.networks[net.type] = {}
        if (main.networks[net.type][net.id]) return main
        main.networks[net.type][net.id] = { ...defaultNetwork, ...net }
        main.networksMeta[net.type][net.id] = { ...defaultMeta }
        return main
      })
    } catch (e) {
      log.error(e)
    }
  },

  /**
   * Migrates applicable chain connections to use the Pylon preset.
   */
  migrateToPylonConnections: (u) => {
    const pylonChains = ['1', '5', '10', '137', '42161', '11155111']

    const switchToPylon = (connection = {}) => {
      if (connection.current === 'custom' && connection.custom === '') {
        connection.current = 'pylon'
      }
    }

    u(STORE_PATH_NETWORKS_ETH, (chains) => {
      Object.entries(chains).forEach(([id, chain]) => {
        if (pylonChains.includes(id)) {
          const { primary, secondary } = chain.connection
          switchToPylon(primary)
          switchToPylon(secondary)
        }
      })
      return chains
    })
  },

  /**
   * Removes a network and cleans up associated metadata; switches affected origins to mainnet.
   */
  removeNetwork: (u, net) => {
    try {
      net.id = parseInt(net.id)
      if (!Number.isInteger(net.id)) throw new Error('Invalid chain id')
      if (net.type === 'ethereum' && net.id === 1) throw new Error('Cannot remove mainnet')

      u('main', (main) => {
        if (Object.keys(main.networks[net.type]).length <= 1) {
          return main
        }
        switchChainForOrigins(main.origins, net.id, 1)
        if (main.networks[net.type]) {
          delete main.networks[net.type][net.id]
          delete main.networksMeta[net.type][net.id]
        }
        return main
      })
    } catch (e) {
      log.error(e)
    }
  },

  /**
   * Sets the block height for a given chain.
   */
  setBlockHeight: (u, chainId, blockHeight) => {
    u(STORE_PATH_NETWORKS_META_ETH, (chainsMeta) => {
      if (chainsMeta[chainId]) {
        chainsMeta[chainId] = { ...chainsMeta[chainId], blockHeight }
      } else {
        log.error(`Action Error: setBlockHeight chainId: ${chainId} not found in chainsMeta`)
      }
      return chainsMeta
    })
  },

  /**
   * Sets the display color for a chain in the network metadata.
   */
  setChainColor: (u, chainId, color) => {
    u(STORE_PATH_NETWORKS_META_ETH, (chainsMeta) => {
      if (chainsMeta[chainId]) {
        chainsMeta[chainId] = { ...chainsMeta[chainId], primaryColor: color }
      } else {
        log.error(`Action Error: setChainColor chainId: ${chainId} not found in chainsMeta`)
      }
      return chainsMeta
    })
  },

  /**
   * Sets the primary connection configuration for a network.
   */
  setPrimary: (u, netType, netId, status) => {
    u(STORE_PATH_NETWORKS, netType, netId, 'connection.primary', (primary) => {
      return Object.assign({}, primary, status)
    })
  },

  /**
   * Sets the primary connection preset selection.
   */
  selectPrimary: (u, netType, netId, value) => {
    u(STORE_PATH_NETWORKS, netType, netId, 'connection.primary.current', () => value)
  },

  /**
   * Sets a custom RPC URL for the primary connection.
   */
  setPrimaryCustom: (u, netType, netId, target) => {
    if (!netType || !netId) return
    u(STORE_PATH_NETWORKS, netType, netId, 'connection.primary.custom', () => target)
  },

  /**
   * Sets the secondary connection configuration for a network.
   */
  setSecondary: (u, netType, netId, status) => {
    u(STORE_PATH_NETWORKS, netType, netId, 'connection.secondary', (secondary) => {
      return Object.assign({}, secondary, status)
    })
  },

  /**
   * Sets the secondary connection preset selection.
   */
  selectSecondary: (u, netType, netId, value) => {
    u(STORE_PATH_NETWORKS, netType, netId, 'connection.secondary.current', () => value)
  },

  /**
   * Sets a custom RPC URL for the secondary connection.
   */
  setSecondaryCustom: (u, netType, netId, target) => {
    if (!netType || !netId) return
    u(STORE_PATH_NETWORKS, netType, netId, 'connection.secondary.custom', () => target)
  },

  /**
   * Toggles a connection node on or off; optionally forces an explicit value.
   */
  toggleConnection: (u, netType, netId, node, on) => {
    u(STORE_PATH_NETWORKS, netType, netId, 'connection', node, 'on', (value) => {
      return on !== undefined ? on : !value
    })
  },

  /**
   * Updates a network definition and its metadata, including origins pointing to the old ID.
   */
  updateNetwork: (u, net, newNet) => {
    try {
      net.id = validateNetworkSettings(net)
      newNet.id = validateNetworkSettings(newNet)

      u('main', (main) => {
        const update = Object.assign({}, main.networks[net.type][net.id], newNet)

        Object.keys(update).forEach((k) => {
          if (typeof update[k] === 'string') {
            update[k] = update[k].trim()
          }
        })

        const { nativeCurrencyName, nativeCurrencyIcon, icon, ...updatedNetwork } = update

        delete main.networks[net.type][net.id]
        main.networks[updatedNetwork.type][updatedNetwork.id] = updatedNetwork

        Object.entries(main.origins).forEach(([origin, { chain }]) => {
          if (net.id === chain.id) {
            main.origins[origin].chain = updatedNetwork
          }
        })

        const existingNetworkMeta = main.networksMeta[updatedNetwork.type][updatedNetwork.id] || {}
        const networkCurrency = existingNetworkMeta.nativeCurrency || {}

        main.networksMeta[updatedNetwork.type][updatedNetwork.id] = {
          ...existingNetworkMeta,
          symbol: update.symbol,
          icon,
          nativeCurrency: {
            ...networkCurrency,
            symbol: update.symbol,
            name: nativeCurrencyName,
            icon: nativeCurrencyIcon
          }
        }

        return main
      })
    } catch (e) {
      log.error(e)
    }
  },

  // ══ PERMISSION ACTIONS ══

  /**
   * Clears all permissions for an account address.
   */
  clearPermissions: (u, address) => {
    u(STORE_PATH_PERMISSIONS, address, () => {
      return {}
    })
  },

  /**
   * Writes a permission entry for an address/handlerId pair.
   */
  setPermission: (u, address, permission) => {
    u(STORE_PATH_PERMISSIONS, address, (permissions = {}) => {
      permissions[permission.handlerId] = permission
      return permissions
    })
  },

  /**
   * Toggles the provider access flag for an address/handlerId pair.
   */
  toggleAccess: (u, address, handlerId) => {
    u(STORE_PATH_PERMISSIONS, address, (permissions) => {
      permissions[handlerId].provider = !permissions[handlerId].provider
      return permissions
    })
  },

  /**
   * Records whether a browser extension is trusted.
   */
  trustExtension: (u, extensionId, trusted) => {
    u(STORE_PATH_KNOWN_EXT, (extensions = {}) => ({ ...extensions, [extensionId]: trusted }))
  },

  // ══ UI ACTIONS ══

  /**
   * Navigates back in the dash window nav stack by numSteps.
   */
  backDash: (u, numSteps = 1) => {
    u('windows.dash.nav', (nav) => {
      while (numSteps > 0 && nav.length > 0) {
        nav.shift()
        numSteps -= 1
      }
      return nav
    })
  },

  /**
   * Closes the dash window and resets its nav stack.
   */
  closeDash: (u) => {
    u('windows.dash.showing', () => false)
    u('windows.dash.nav', () => [])
  },

  /**
   * Completes the onboarding flow and closes the onboard window.
   */
  completeOnboarding: (u) => {
    u(STORE_PATH_MUTE + '.onboardingWindow', () => true)
    u('windows.onboard.showing', () => false)
  },

  /**
   * Expands or collapses the dock.
   */
  expandDock: (u, expand) => {
    u('dock.expand', () => expand)
  },

  /**
   * Dismisses the beta disclosure notice and navigates to the accounts view.
   */
  muteBetaDisclosure: (u) => {
    u(STORE_PATH_MUTE + '.betaDisclosure', () => true)
    const navItem = { view: 'accounts', data: {} }
    u('windows.dash.nav', (nav) => {
      if (JSON.stringify(nav[0]) !== JSON.stringify(navItem)) nav.unshift(navItem)
      return nav
    })
    u('windows.dash.showing', () => true)
  },

  /**
   * Silences the alpha warning modal.
   */
  muteAlphaWarning: (u) => {
    u(STORE_PATH_MUTE + '.alphaWarning', () => true)
  },

  /**
   * Silences the Pylon migration notice.
   */
  mutePylonMigrationNotice: (u) => {
    u(STORE_PATH_MUTE + '.migrateToPylon', () => true)
  },

  /**
   * Silences the welcome warning modal.
   */
  muteWelcomeWarning: (u) => {
    u(STORE_PATH_MUTE + '.welcomeWarning', () => true)
  },

  /**
   * Pushes a nav crumb onto a window nav stack and ensures the window is visible.
   */
  navForward: (u, windowId, crumb) => {
    if (!windowId || !crumb) return log.warn('Invalid nav forward', windowId, crumb)
    u('windows', windowId, 'nav', (nav) => {
      if (JSON.stringify(nav[0]) !== JSON.stringify(crumb)) nav.unshift(crumb)
      return nav
    })
    u('windows', windowId, 'showing', () => true)
  },

  /**
   * Updates or replaces the current nav item without necessarily navigating.
   */
  navUpdate: (u, windowId, crumb, navigate) => {
    if (!windowId || !crumb) return log.warn('Invalid nav forward', windowId, crumb)
    u('windows', windowId, 'nav', (nav) => {
      const updatedNavItem = {
        view: nav[0].view || crumb.view,
        data: Object.keys(crumb.data).length === 0 ? {} : Object.assign({}, nav[0].data, crumb.data)
      }
      if (JSON.stringify(nav[0]) !== JSON.stringify(updatedNavItem)) {
        if (navigate) {
          nav.unshift(updatedNavItem)
        } else {
          nav[0] = updatedNavItem
        }
      }
      return nav
    })
    if (navigate) u('windows', windowId, 'showing', () => true)
  },

  /**
   * Replaces the entire nav stack for a window and shows it.
   */
  navReplace: (u, windowId, crumbs = []) => {
    u('windows', windowId, (win) => {
      win.nav = crumbs
      win.showing = true
      return win
    })
  },

  /**
   * Navigates back in a window nav stack by numSteps.
   */
  navBack: (u, windowId, numSteps = 1) => {
    if (!windowId) return log.warn('Invalid nav back', windowId)
    u('windows', windowId, 'nav', (nav) => {
      while (numSteps > 0 && nav.length > 0) {
        nav.shift()
        numSteps -= 1
      }
      return nav
    })
  },

  /**
   * Clears any signer-related nav items from the dash nav stack.
   */
  navClearSigner: (u, signerId) => {
    u('windows.dash.nav', (nav) => nav.filter((navItem) => navItem?.data?.signer !== signerId))
  },

  /**
   * Removes a specific request from the panel nav stack.
   */
  navClearReq: (u, handlerId, showRequestInbox = true) => {
    u('windows.panel.nav', (nav) => {
      const newNav = nav.filter((navItem) => {
        const isClearedRequest = navItem?.data?.requestId === handlerId
        const isRequestInbox = navItem?.data?.id === 'requests' && navItem?.view === 'expandedModule'
        return !isClearedRequest && (showRequestInbox || !isRequestInbox)
      })
      return newNav
    })
  },

  /**
   * Pushes a crumb onto the dash nav stack and shows the dash window.
   */
  navDash: (u, navItem) => {
    u('windows.dash.nav', (nav) => {
      if (JSON.stringify(nav[0]) !== JSON.stringify(navItem)) nav.unshift(navItem)
      return nav
    })
    u('windows.dash.showing', () => true)
  },

  /**
   * Toggles the pin-to-top preference.
   */
  pin: (u) => {
    u(STORE_PATH_PIN, (pin) => !pin)
  },

  /**
   * Sets the dash window state, resetting nav when hiding.
   */
  setDash: (u, update) => {
    if (!update.showing) {
      u('windows.dash.nav', () => [])
    }
    u('windows.dash', (dash) => Object.assign(dash, update))
  },

  /**
   * Sets the notify window visibility.
   */
  setNotify: (u, update) => {
    u('windows.notify.showing', () => update.showing)
  },

  /**
   * Sets the onboarding window visibility.
   */
  setOnboard: (u, update) => {
    u('windows.onboard.showing', () => update.showing)
  },

  /**
   * Toggles the dash window visibility, with optional force show/hide.
   */
  toggleDash: (u, force) => {
    u('windows.dash.showing', (s) => (force === 'hide' ? false : force === 'show' ? true : !s))
  },

  /**
   * Toggles the explorer warning mute.
   */
  toggleExplorerWarning: (u) => {
    u(STORE_PATH_MUTE + '.explorerWarning', (v) => !v)
  },

  /**
   * Toggles the gas fee warning mute.
   */
  toggleGasFeeWarning: (u) => {
    u(STORE_PATH_MUTE + '.gasFeeWarning', (v) => !v)
  },

  /**
   * Toggles the launch-on-login preference.
   */
  toggleLaunch: (u) => u(STORE_PATH_LAUNCH, (launch) => !launch),

  /**
   * Toggles the address reveal preference.
   */
  toggleReveal: (u) => u(STORE_PATH_REVEAL, (reveal) => !reveal),

  /**
   * Toggles the signer compatibility warning mute.
   */
  toggleSignerCompatibilityWarning: (u) => {
    u(STORE_PATH_MUTE + '.signerCompatibilityWarning', (v) => !v)
  },

  /**
   * Toggles whether local names are shown alongside ENS names.
   */
  toggleShowLocalNameWithENS: (u) =>
    u(STORE_PATH_SHOW_LOCAL_ENS, (showLocalNameWithENS) => !showLocalNameWithENS),

  // ══ GAS ACTIONS ══

  /**
   * Records gas cost samples for a network.
   */
  addSampleGasCosts: (u, netType, netId, samples) => {
    u(STORE_PATH_NETWORKS_META, netType, netId, 'gas.samples', () => {
      return samples
    })
  },

  /**
   * Sets EIP-1559 fee data for a network.
   */
  setGasFees: (u, netType, netId, fees) => {
    u(STORE_PATH_NETWORKS_META, netType, netId, 'gas.price.fees', () => fees)
  },

  /**
   * Sets the selected gas level and optional custom price for a network.
   */
  setGasDefault: (u, netType, netId, level, price) => {
    u(STORE_PATH_NETWORKS_META, netType, netId, 'gas.price.selected', () => level)
    if (level === 'custom') {
      u(STORE_PATH_NETWORKS_META, netType, netId, 'gas.price.levels.custom', () => price)
    } else {
      u(STORE_PATH_NETWORKS_META, netType, netId, 'gas.price.lastLevel', () => level)
    }
  },

  /**
   * Sets the gas price levels (slow/standard/fast/asap/custom) for a network.
   */
  setGasPrices: (u, netType, netId, prices) => {
    u(STORE_PATH_NETWORKS_META, netType, netId, 'gas.price.levels', () => prices)
  },

  // ══ DAPP WINDOW ACTIONS ══

  /**
   * Registers a new dapp record if it does not already exist.
   */
  appDapp: (u, dapp) => {
    u(STORE_PATH_DAPPS, (dapps) => {
      if (dapps && !dapps[dapp.id]) {
        dapps[dapp.id] = dapp
      }
      return dapps || {}
    })
  },

  /**
   * Adds a dapp to the dapp details and places it in the docked or added list.
   */
  addDapp: (u, namehash, data, options = { docked: false, added: false }) => {
    u(`${STORE_PATH_DAPP_DETAILS}.${namehash}`, () => data)
    u(STORE_PATH_DAPP_MAP, (map) => {
      if (options.docked && map.docked.length <= 10) {
        map.docked.push(namehash)
      } else {
        map.added.unshift(namehash)
      }
      return map
    })
  },

  /**
   * Adds a view to a frame, or switches to the existing view if already present.
   */
  addFrameView: (u, frameId, view) => {
    if (frameId && view) {
      u(STORE_PATH_FRAMES, frameId, (frame) => {
        let existing
        Object.keys(frame.views).some((viewId) => {
          if (frame.views[viewId].dappId === view.dappId) {
            existing = viewId
            return true
          } else {
            return false
          }
        })
        if (!existing) {
          frame.views = frame.views || {}
          frame.views[view.id] = view
          frame.currentView = view.id
        } else {
          frame.currentView = existing
        }
        return frame
      })
    }
  },

  /**
   * Stores a new frame record.
   */
  addFrame: (u, frame) => {
    u(STORE_PATH_FRAMES, frame.id, () => frame)
  },

  /**
   * Initialises an origin record with a new session.
   */
  initOrigin: (u, originId, origin) => {
    u(STORE_PATH_ORIGINS, (origins) => {
      const now = new Date().getTime()
      const createdOrigin = {
        ...origin,
        session: {
          requests: 1,
          startedAt: now,
          lastUpdatedAt: now
        }
      }
      return { ...origins, [originId]: createdOrigin }
    })
  },

  /**
   * Increments the request counter for an origin session (starting a new session if needed).
   */
  addOriginRequest: (u, originId) => {
    const now = new Date().getTime()
    u(STORE_PATH_ORIGINS, originId, (origin) => {
      const isNewSession = origin.session.startedAt < origin.session.endedAt
      const startedAt = isNewSession ? now : origin.session.startedAt
      const requests = isNewSession ? 1 : origin.session.requests + 1
      return {
        ...origin,
        session: {
          requests,
          startedAt,
          endedAt: undefined,
          lastUpdatedAt: now
        }
      }
    })
  },

  /**
   * Removes all origins from the store.
   */
  clearOrigins: (u) => {
    u(STORE_PATH_ORIGINS, () => ({}))
  },

  /**
   * Marks the end of an origin's current session.
   */
  endOriginSession: (u, originId) => {
    u(STORE_PATH_ORIGINS, (origins) => {
      const origin = origins[originId]
      if (origin) {
        const now = new Date().getTime()
        const session = Object.assign({}, origin.session, { endedAt: now, lastUpdatedAt: now })
        origins[originId] = Object.assign({}, origin, { session })
      }
      return origins
    })
  },

  /**
   * Sets the focused/active frame ID.
   */
  focusFrame: (u, frameId) => {
    u(STORE_PATH_FOCUSED_FRAME, () => frameId)
  },

  /**
   * Moves a dapp between the docked and added lists at specified indices.
   */
  moveDapp: (u, fromArea, fromIndex, toArea, toIndex) => {
    u(STORE_PATH_DAPP_MAP, (map) => {
      const hash = map[fromArea][fromIndex]
      map[fromArea].splice(fromIndex, 1)
      map[toArea].splice(toIndex, 0, hash)
      return map
    })
  },

  /**
   * Removes a dapp from its details map and from the docked/added lists.
   */
  removeDapp: (u, namehash) => {
    u(STORE_PATH_DAPP_DETAILS, (dapps) => {
      dapps = { ...dapps }
      delete dapps[namehash]
      return dapps
    })
    u(STORE_PATH_DAPP_MAP, (map) => {
      let index = map.added.indexOf(namehash)
      if (index !== -1) {
        map.added.splice(index, 1)
      } else {
        index = map.docked.indexOf(namehash)
        if (index !== -1) map.docked.splice(index, 1)
      }
      return map
    })
  },

  /**
   * Removes a frame record by ID.
   */
  removeFrame: (u, frameId) => {
    u(STORE_PATH_FRAMES, (frames) => {
      delete frames[frameId]
      return frames
    })
  },

  /**
   * Removes a specific view from a frame.
   */
  removeFrameView: (u, frameId, viewId) => {
    u(STORE_PATH_FRAMES, frameId, 'views', (views) => {
      delete views[viewId]
      return views
    })
  },

  /**
   * Removes an origin record and resets the dash nav.
   */
  removeOrigin: (u, originId) => {
    u('windows.dash.nav', () => [])
    u(STORE_PATH_ORIGINS, (origins) => {
      delete origins[originId]
      return origins
    })
  },

  /**
   * Sets the active view for a dapp by ENS name.
   */
  setCurrentFrameView: (u, frameId, viewId) => {
    if (frameId) {
      u(STORE_PATH_FRAMES, frameId, (frame) => {
        frame.currentView = viewId
        return frame
      })
    }
  },

  /**
   * Stores client-side dapp state by content hash.
   */
  setDappStorage: (u, hash, state) => {
    if (state) u(`${STORE_PATH_DAPP_STORAGE}.${hash}`, () => state)
  },

  /**
   * Marks a dapp as open or removes it from the open list.
   */
  setDappOpen: (u, ens, open) => {
    u(STORE_PATH_OPEN_DAPPS, (dapps) => {
      if (open) {
        if (dapps.indexOf(ens) === -1) dapps.push(ens)
      } else {
        dapps = dapps.filter((e) => e !== ens)
      }
      return dapps
    })
  },

  /**
   * Switches the chain an origin is currently using.
   */
  switchOriginChain: (u, originId, chainId, type) => {
    if (originId && typeof chainId === 'number' && type === 'ethereum') {
      u(STORE_PATH_ORIGINS, originId, (origin) => ({ ...origin, chain: { id: chainId, type } }))
    }
  },

  /**
   * Updates an existing dapp record with a partial object.
   */
  updateDapp: (u, dappId, update) => {
    u(STORE_PATH_DAPPS, (dapps) => {
      if (dapps && dapps[dappId]) {
        dapps[dappId] = Object.assign({}, dapps[dappId], update)
      }
      return dapps || {}
    })
  },

  /**
   * Applies a partial update to an existing frame record.
   */
  updateFrame: (u, frameId, update) => {
    u(STORE_PATH_FRAMES, frameId, (frame) => Object.assign({}, frame, update))
  },

  /**
   * Updates a frame view, toggling show state on readiness transitions.
   */
  updateFrameView: (u, frameId, viewId, update) => {
    u(STORE_PATH_FRAMES, frameId, 'views', (views) => {
      if ((update.show && views[viewId].ready) || (update.ready && views[viewId].show)) {
        Object.keys(views).forEach((id) => {
          if (id !== viewId) views[id].show = false
        })
      }
      views[viewId] = Object.assign({}, views[viewId], update)
      return views
    })
  },

  // ══ PORTFOLIO ACTIONS ══

  /**
   * Retrieves the stored portfolio value for an account address.
   */
  getPortfolioValue: (address) => {
    return store(STORE_PATH_PORTFOLIO, address.toLowerCase()) || { usd: 0, updatedAt: 0 }
  },

  /**
   * Stores a USD portfolio value snapshot for an account address.
   */
  setPortfolioValue: (u, address, value) => {
    u(STORE_PATH_PORTFOLIO, address.toLowerCase(), () => ({ usd: value, updatedAt: Date.now() }))
  },

  /**
   * Creates or overwrites a price alert for a token held by an account.
   */
  setPriceAlert: (u, address, tokenAddress, { above, below, chainId }) => {
    u(STORE_PATH_PRICE_ALERTS, address.toLowerCase(), tokenAddress, () => ({ above, below, chainId, createdAt: Date.now(), triggered: false }))
  },

  /**
   * Triggers a portfolio re-fetch for the given account address.
   */
  refreshPortfolio: (u, address) => {
    // Portfolio refresh is handled by the externalData module
    // This action just sets a flag to trigger a re-fetch
    u('main.portfolioValues', address.toLowerCase(), 'refreshing', () => true)
  },

  /**
   * Removes a price alert for a specific token symbol on an account.
   */
  removePriceAlert: (u, address, tokenSymbol) => {
    u('main.priceAlerts', address.toLowerCase(), tokenSymbol, () => null)
  },

  /**
   * Clears the transaction history for an account address.
   */
  clearTxHistory: (u, address) => {
    u('main.txHistory', address.toLowerCase(), () => [])
  },

  /**
   * Sets the health status object for a given chain ID.
   */
  setNetworkHealth: (u, chainId, health) => {
    u('main.networkHealth', chainId, () => health)
  }
}
