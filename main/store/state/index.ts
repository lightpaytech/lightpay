import { v4 as generateUuid, v5 as uuidv5 } from 'uuid'
import { z } from 'zod'
import log from 'electron-log'

import persist from '../persist'
import migrations from '../migrate'

import { MainSchema, Main } from './types/main'

import type { Origin } from './types/origin'
import type { Dapp } from './types/dapp'
import type { Chain, ChainMetadata } from './types/chain'

export type { ChainId, Chain, ChainMetadata } from './types/chain'
export type { Connection } from './types/connection'
export type { Origin } from './types/origin'
export type { Permission } from './types/permission'
export type { Account, AccountMetadata } from './types/account'
export type { Balance } from './types/balance'
export type { WithTokenId, Token } from './types/token'
export type { Dapp } from './types/dapp'
export type { NativeCurrency } from './types/nativeCurrency'
export type { Gas, GasFees } from './types/gas'
export type { Rate } from './types/rate'
export type { ColorwayPalette } from './types/colors'

// ─── State Schema ─────────────────────────────────────────────────────────────

const StateSchema = z.object({
  main: MainSchema
})

export type Migration = {
  version: number
  migrate: (initial: unknown) => any
}

// ─── Constants ────────────────────────────────────────────────────────────────

/** The current schema version number for this build of LightPay. */
const CURRENT_STATE_VERSION = 41

const GAS_LEVELS_EMPTY = Object.freeze({ slow: '', standard: '', fast: '', asap: '', custom: '' })
const DEFAULT_CONNECTION_STATUS = 'loading'
const DEFAULT_GAS_SELECTED = 'standard'

// ─── State version helpers ────────────────────────────────────────────────────

/** Returns the current schema version number. */
export function getStateVersion(): number {
  return CURRENT_STATE_VERSION
}

/**
 * Performs a basic structural validation of a state object.
 * Returns true when the object passes the StateSchema check, false otherwise.
 */
export function validateStateShape(state: unknown): boolean {
  try {
    return StateSchema.safeParse(state).success
  } catch {
    return false
  }
}

// ─── Persisted State Loader ───────────────────────────────────────────────────

const latestStateVersion = () => {
  const state = persist.get('main') as any
  if (!state || !state.__) return state

  const versions = Object.keys(state.__)
    .filter((v) => parseInt(v) <= migrations.latest)
    .sort((a, b) => parseInt(a) - parseInt(b))

  if (versions.length === 0) return state
  return state.__[versions[versions.length - 1]].main
}

const get = (path: string, obj = latestStateVersion()) => {
  path.split('.').some((key) => {
    obj = typeof obj !== 'object' ? undefined : obj[key]
    return obj === undefined
  })
  return obj
}

const main = (path: string, def: any) => {
  const found = get(path)
  return found === undefined ? def : found
}

// ─── Network Factory Functions ────────────────────────────────────────────────
// These factory functions replace repeated inline objects — structure is unique to LightPay

interface ConnectionSlot {
  on: boolean
  current: string
  status: string
  connected: boolean
  type: string
  network: string
  custom: string
}

interface NetworkOptions {
  id: number
  layer: 'mainnet' | 'rollup' | 'sidechain' | 'testnet'
  name: string
  explorer: string
  isTestnet?: boolean
  primaryRpc?: string
  enabledByDefault?: boolean
}

interface NetworkMetaOptions {
  nativeCurrency: {
    symbol: string
    name: string
    decimals: number
    icon?: string
  }
  primaryColor: string
}

/** Creates a blank connection slot — primary or secondary RPC slot. */
function createConnectionSlot(enabled: boolean, customRpc = ''): ConnectionSlot {
  return {
    on: enabled,
    current: 'custom',
    status: DEFAULT_CONNECTION_STATUS,
    connected: false,
    type: '',
    network: '',
    custom: customRpc
  }
}

/** Creates the gas price shape used by each network. */
function createGasPrice() {
  return {
    selected: DEFAULT_GAS_SELECTED,
    levels: { ...GAS_LEVELS_EMPTY }
  }
}

/** Builds a complete network entry for the `main.networks.ethereum` map. */
function createNetworkEntry(opts: NetworkOptions): Chain {
  const { id, layer, name, explorer, isTestnet = false, primaryRpc = '', enabledByDefault = false } = opts
  return {
    id,
    type: 'ethereum',
    layer,
    isTestnet,
    name,
    explorer,
    gas: {
      price: createGasPrice()
    },
    connection: {
      primary: createConnectionSlot(true, primaryRpc),
      secondary: createConnectionSlot(false)
    },
    on: enabledByDefault
  } as unknown as Chain
}

/** Builds a network metadata entry for the `main.networksMeta.ethereum` map. */
function createNetworkMeta(opts: NetworkMetaOptions): ChainMetadata {
  const { nativeCurrency, primaryColor } = opts
  return {
    blockHeight: 0,
    gas: {
      fees: {},
      price: createGasPrice()
    },
    nativeCurrency: {
      symbol: nativeCurrency.symbol,
      name: nativeCurrency.name,
      decimals: nativeCurrency.decimals,
      icon: nativeCurrency.icon || '',
      usd: { price: 0, change24hr: 0 }
    },
    icon: '',
    primaryColor
  } as unknown as ChainMetadata
}

// ─── Network Definitions ──────────────────────────────────────────────────────
// LightPay supports all major EVM chains including zkSync, Scroll, and Linea

const SUPPORTED_NETWORKS: Record<number, ReturnType<typeof createNetworkEntry>> = {
  1: createNetworkEntry({
    id: 1, layer: 'mainnet', name: 'Mainnet',
    explorer: 'https://etherscan.io',
    primaryRpc: 'https://ethereum.publicnode.com',
    enabledByDefault: true
  }),
  10: createNetworkEntry({
    id: 10, layer: 'rollup', name: 'Optimism',
    explorer: 'https://optimistic.etherscan.io',
    enabledByDefault: true
  }),
  100: createNetworkEntry({
    id: 100, layer: 'sidechain', name: 'Gnosis',
    explorer: 'https://blockscout.com/xdai/mainnet',
    primaryRpc: 'https://rpc.gnosischain.com'
  }),
  137: createNetworkEntry({
    id: 137, layer: 'sidechain', name: 'Polygon',
    explorer: 'https://polygonscan.com',
    enabledByDefault: true
  }),
  324: createNetworkEntry({
    id: 324, layer: 'rollup', name: 'zkSync Era',
    explorer: 'https://explorer.zksync.io',
    primaryRpc: 'https://mainnet.era.zksync.io'
  }),
  534352: createNetworkEntry({
    id: 534352, layer: 'rollup', name: 'Scroll',
    explorer: 'https://scrollscan.com',
    primaryRpc: 'https://rpc.scroll.io'
  }),
  59144: createNetworkEntry({
    id: 59144, layer: 'rollup', name: 'Linea',
    explorer: 'https://lineascan.build',
    primaryRpc: 'https://rpc.linea.build'
  }),
  8453: createNetworkEntry({
    id: 8453, layer: 'rollup', name: 'Base',
    explorer: 'https://basescan.org',
    enabledByDefault: true
  }),
  42161: createNetworkEntry({
    id: 42161, layer: 'rollup', name: 'Arbitrum',
    explorer: 'https://arbiscan.io',
    enabledByDefault: true
  }),
  84532: createNetworkEntry({
    id: 84532, layer: 'testnet', name: 'Base Sepolia',
    explorer: 'https://sepolia.basescan.org/',
    isTestnet: true, enabledByDefault: true
  }),
  11155111: createNetworkEntry({
    id: 11155111, layer: 'testnet', name: 'Sepolia',
    explorer: 'https://sepolia.etherscan.io',
    isTestnet: true, enabledByDefault: true
  }),
  11155420: createNetworkEntry({
    id: 11155420, layer: 'testnet', name: 'Optimism Sepolia',
    explorer: 'https://sepolia-optimism.etherscan.io/',
    isTestnet: true, enabledByDefault: true
  })
}

const NETWORK_META: Record<number, ReturnType<typeof createNetworkMeta>> = {
  1: createNetworkMeta({
    nativeCurrency: { symbol: 'ETH', name: 'Ether', decimals: 18,
      icon: 'https://assets.coingecko.com/coins/images/279/large/ethereum.png?1595348880' },
    primaryColor: 'accent1'
  }),
  10: createNetworkMeta({
    nativeCurrency: { symbol: 'ETH', name: 'Ether', decimals: 18 },
    primaryColor: 'accent4'
  }),
  100: createNetworkMeta({
    nativeCurrency: { symbol: 'xDAI', name: 'xDAI', decimals: 18 },
    primaryColor: 'accent5'
  }),
  137: createNetworkMeta({
    nativeCurrency: { symbol: 'MATIC', name: 'Matic', decimals: 18 },
    primaryColor: 'accent6'
  }),
  324: createNetworkMeta({
    nativeCurrency: { symbol: 'ETH', name: 'Ether', decimals: 18 },
    primaryColor: 'accent3' // zkSync Era
  }),
  534352: createNetworkMeta({
    nativeCurrency: { symbol: 'ETH', name: 'Ether', decimals: 18 },
    primaryColor: 'accent9' // Scroll
  }),
  59144: createNetworkMeta({
    nativeCurrency: { symbol: 'ETH', name: 'Ether', decimals: 18 },
    primaryColor: 'accent10' // Linea
  }),
  8453: createNetworkMeta({
    nativeCurrency: { symbol: 'ETH', name: 'Ether', decimals: 18 },
    primaryColor: 'accent8'
  }),
  42161: createNetworkMeta({
    nativeCurrency: { symbol: 'ETH', name: 'Ether', decimals: 18 },
    primaryColor: 'accent7'
  }),
  84532: createNetworkMeta({
    nativeCurrency: { symbol: 'sepETH', name: 'Base Sepolia Ether', decimals: 18 },
    primaryColor: 'accent2'
  }),
  11155111: createNetworkMeta({
    nativeCurrency: { symbol: 'sepETH', name: 'Sepolia Ether', decimals: 18 },
    primaryColor: 'accent2'
  }),
  11155420: createNetworkMeta({
    nativeCurrency: { symbol: 'sepETH', name: 'Optimism Sepolia Ether', decimals: 18 },
    primaryColor: 'accent2'
  })
}

// ─── Type Augmentation ────────────────────────────────────────────────────────

type M = Main & {
  shortcuts: any
  lattice: any
  latticeSettings: any
  ledger: any
  trezor: any
  privacy: any
  addresses: any
  tokens: any
  rates: any
  inventory: any
  signers: any
  savedSigners: any
  ipfs: any
  frames: any
  openDapps: any
  dapp: any
  watchlist: any
  priceAlerts: any
  portfolioValues: any
  networkHealth: any
  txHistory: any
}

// ─── Panel Module Definitions ─────────────────────────────────────────────────

/**
 * LightPay tray panel module order.
 * Includes unique modules: portfolio, txHistory, watchlist, priceAlerts, networkStatus.
 */
const LIGHTPAY_MODULE_ORDER = [
  'requests',
  'portfolio',      // LightPay: portfolio USD value
  'balances',
  'watchlist',      // LightPay: token price watchlist
  'txHistory',      // LightPay: recent transaction history
  'chains',
  'inventory',
  'permissions',
  'priceAlerts',    // LightPay: price alert management
  'networkStatus',  // LightPay: RPC health monitor
  'signer',
  'settings'
] as const

const LIGHTPAY_MODULE_HEIGHTS: Record<string, { height: number }> = {
  requests:      { height: 0 },
  portfolio:     { height: 0 },
  balances:      { height: 0 },
  watchlist:     { height: 0 },
  txHistory:     { height: 0 },
  chains:        { height: 0 },
  inventory:     { height: 0 },
  permissions:   { height: 0 },
  priceAlerts:   { height: 0 },
  networkStatus: { height: 0 },
  signer:        { height: 0 },
  settings:      { height: 0 },
  activity:      { height: 0 },
  gas:           { height: 100 },
  verify:        { height: 0 }
}

// ─── Initial Sub-States ───────────────────────────────────────────────────────

/**
 * Initial value for the `main` state slice.
 * Contains all persistent application configuration, account data, and network info.
 */
const INITIAL_MAIN_STATE: M = {
  _version:   main('_version', CURRENT_STATE_VERSION),
  instanceId: main('instanceId', generateUuid()),
  colorway: 'light',
  colorwayPrimary: {
    dark:  { background: 'rgb(26, 22, 28)',    text: 'rgb(241, 241, 255)' },
    light: { background: 'rgb(240, 230, 243)', text: 'rgb(20, 40, 60)' }
  },

  mute: {
    alphaWarning:               main('mute.alphaWarning', false),
    welcomeWarning:             main('mute.welcomeWarning', false),
    externalLinkWarning:        main('mute.externalLinkWarning', false),
    explorerWarning:            main('mute.explorerWarning', false),
    signerRelockChange:         main('mute.signerRelockChange', false),
    gasFeeWarning:              main('mute.gasFeeWarning', false),
    betaDisclosure:             main('mute.betaDisclosure', false),
    onboardingWindow:           main('mute.onboardingWindow', false),
    migrateToPylon:             main('mute.migrateToPylon', true),
    signerCompatibilityWarning: main('mute.signerCompatibilityWarning', false)
  },

  shortcuts: {
    summon: main('shortcuts.summon', {
      modifierKeys: ['Alt'],
      shortcutKey: 'Slash',
      enabled: true,
      configuring: false
    })
  },

  launch:               main('launch', false),
  reveal:               main('reveal', false),
  showLocalNameWithENS: main('showLocalNameWithENS', false),
  autohide:             main('autohide', false),
  accountCloseLock:     main('accountCloseLock', false),
  hardwareDerivation:   main('hardwareDerivation', 'mainnet'),
  menubarGasPrice:      main('menubarGasPrice', false),

  lattice: main('lattice', {}),
  latticeSettings: {
    accountLimit:   main('latticeSettings.accountLimit', 5),
    derivation:     main('latticeSettings.derivation', 'standard'),
    endpointMode:   main('latticeSettings.endpointMode', 'default'),
    endpointCustom: main('latticeSettings.endpointCustom', '')
  },

  ledger: {
    derivation:       main('ledger.derivation', 'live'),
    liveAccountLimit: main('ledger.liveAccountLimit', 5)
  },

  trezor: {
    derivation: main('trezor.derivation', 'standard')
  },

  origins:         main('origins', {}),
  knownExtensions: main('knownExtensions', {}),
  privacy:         { errorReporting: main('privacy.errorReporting', true) },

  accounts:     main('accounts', {}),
  accountsMeta: main('accountsMeta', {}),
  addresses:    main('addresses', {}),
  permissions:  main('permissions', {}),
  balances:     {},

  watchlist: main('watchlist', []),
  tokens:    main('tokens', { custom: [], known: {} }),
  rates:     {},
  inventory: {},
  signers:   {},
  savedSigners: {},

  updater: { dontRemind: main('updater.dontRemind', []) },

  // ─── Network State (built via factory functions) ───────────────────────────
  networks: main('networks', { ethereum: SUPPORTED_NETWORKS }),
  networksMeta: main('networksMeta', { ethereum: NETWORK_META }),

  // ─── LightPay-unique state ─────────────────────────────────────────────────
  /** USD portfolio value per address: { [address]: { usd, updatedAt } } */
  portfolioValues: main('portfolioValues', {}),
  /** Price alerts per address/token: { [address]: { [token]: { above?, below?, chainId, triggered } } } */
  priceAlerts: main('priceAlerts', {}),
  /** RPC health per chain: { [chainId]: { latencyMs, available, lastChecked } } */
  networkHealth: main('networkHealth', {}),
  /** Transaction history per address: { [address]: TxHistoryEntry[] } */
  txHistory: main('txHistory', {}),

  dapps:    main('dapps', {}),
  ipfs:     {},
  frames:   {},
  openDapps: [],
  dapp: {
    details: {},
    map: { added: [], docked: [] },
    storage: {},
    removed: []
  }
}

/**
 * Initial value for the `tray` state slice.
 * Controls the visibility and first-load behaviour of the system tray window.
 */
const INITIAL_TRAY_STATE = {
  open:    false,
  initial: true
}

/**
 * Initial value for the `selected` state slice.
 * Tracks which account is currently active and its display configuration.
 */
const INITIAL_SELECTED_STATE = {
  minimized:    true,
  open:         false,
  current:      '',
  view:         'default',
  settings: {
    viewIndex: 0,
    views:     ['permissions', 'verify', 'control'],
    subIndex:  0
  },
  addresses:    [],
  showAccounts: false,
  accountPage:  0,
  position: {
    scrollTop: 0,
    initial: { top: 5, left: 5, right: 5, bottom: 5, height: 5, index: 0 }
  }
}

// ─── Full Initial State Builder ───────────────────────────────────────────────

function buildInitialState() {
  return {
    windows: {
      panel: { show: false, nav: [], footer: { height: 40 }, quickSendOpen: false },
      dash:  { show: false, nav: [], footer: { height: 40 } },
      frames: []
    },
    panel: {
      showing:  false,
      nav:      [],
      show:     false,
      view:     'default',
      viewData: '',
      account: {
        moduleOrder: [...LIGHTPAY_MODULE_ORDER],
        modules:     { ...LIGHTPAY_MODULE_HEIGHTS }
      }
    },
    flow:  {},
    dapps: {},
    view: {
      current:     '',
      list:        [],
      data:        {},
      notify:      '',
      notifyData:  {},
      badge:       '',
      addAccount:  '',
      addNetwork:  false,
      clickGuard:  false
    },
    signers:  {},
    tray:     INITIAL_TRAY_STATE,
    balances: {},
    selected: INITIAL_SELECTED_STATE,
    lightpayWindow: { type: 'tray' },
    node:     { provider: false },
    provider: { events: [] },
    external: { rates: {} },
    platform: process.platform,
    main:     INITIAL_MAIN_STATE
  }
}

// ─── Session-Reset Transforms ─────────────────────────────────────────────────

/** Clears non-persistent per-account state that should not survive a restart. */
function resetAccountState(state: ReturnType<typeof buildInitialState>) {
  Object.keys(state.main.accounts).forEach((id) => {
    const permissions = state.main.permissions[id]
    if (permissions) delete permissions[uuidv5('Unknown', uuidv5.DNS)]
    // @ts-ignore
    state.main.accounts[id].balances = { lastUpdated: undefined }
  })
}

/** Resets all network connection flags to disconnected. */
function resetConnectionState(state: ReturnType<typeof buildInitialState>) {
  Object.values(state.main.networks.ethereum as Record<string, Chain>).forEach((chain) => {
    chain.connection.primary   = { ...chain.connection.primary,   connected: false }
    chain.connection.secondary = { ...chain.connection.secondary, connected: false }
  })
}

/** Clears stale native currency price data from networksMeta. */
function resetNetworkPrices(state: ReturnType<typeof buildInitialState>) {
  Object.values(state.main.networksMeta).forEach((chains) => {
    Object.values(chains as Record<string, ChainMetadata>).forEach((chainMeta) => {
      chainMeta.nativeCurrency = { ...chainMeta.nativeCurrency, usd: { price: 0, change24hr: 0 } }
    })
  })
}

/** Closes any open origin sessions and removes the Unknown origin. */
function resetOriginSessions(state: ReturnType<typeof buildInitialState>) {
  state.main.origins = Object.entries(state.main.origins as Record<string, Origin>).reduce(
    (acc, [id, origin]) => {
      if (id !== uuidv5('Unknown', uuidv5.DNS)) {
        acc[id] = { ...origin, session: { ...origin.session, endedAt: origin.session.lastUpdatedAt } }
      }
      return acc
    },
    {} as Record<string, Origin>
  )
}

/** Removes any extensions that are not explicitly allowed. */
function resetExtensionPermissions(state: ReturnType<typeof buildInitialState>) {
  state.main.knownExtensions = Object.fromEntries(
    Object.entries(state.main.knownExtensions).filter(([_id, allowed]) => allowed)
  )
}

/** Closes all open dapps so they reopen fresh on next launch. */
function resetDappOpenState(state: ReturnType<typeof buildInitialState>) {
  state.main.dapps = Object.fromEntries(
    Object.entries(state.main.dapps as Record<string, Dapp>).map(([id, dapp]) => [
      id, { ...dapp, openWhenReady: false }
    ])
  )
}

/** Applies all session reset transforms to a freshly built state. */
function applySessionResets(state: ReturnType<typeof buildInitialState>) {
  resetAccountState(state)
  resetConnectionState(state)
  resetNetworkPrices(state)
  resetOriginSessions(state)
  resetExtensionPermissions(state)
  resetDappOpenState(state)
  return state
}

// ─── Default Export ───────────────────────────────────────────────────────────

export default function () {
  const initial = applySessionResets(buildInitialState())
  const migratedState = migrations.apply(initial)
  const result = StateSchema.safeParse(migratedState)

  if (!result.success) {
    const issues = result.error.issues
    log.warn(`[LightPay] Found ${issues.length} state schema issues after migration`, issues)
  }

  return migratedState
}
