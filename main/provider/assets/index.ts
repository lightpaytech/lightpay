import store from '../../store'

import { NATIVE_CURRENCY } from '../../../resources/constants'

import type { Balance, NativeCurrency, Rate } from '../../store/state'

// -- Types --------------------------------------------------------------------

export type UsdRate = { usd: Rate }

interface AssetsChangedHandler {
  assetsChanged: (address: Address, assets: RPC.GetAssets.Assets) => void
}

// -- Constants ----------------------------------------------------------------

/** Balances older than this threshold (ms) are treated as still-scanning */
const SCAN_STALE_THRESHOLD_MS = 1000 * 60 * 5

/** Debounce delay (ms) before emitting an assetsChanged event */
const ASSETS_DEBOUNCE_MS = 800

// -- Store access helpers -----------------------------------------------------

/** Typed wrappers around store reads to centralise raw store calls */
const storeApi = {
  getBalances: (account: Address): Balance[] => {
    return store('main.balances', account) || []
  },
  getLastUpdated: (account: Address): number => {
    return store('main.accounts', account, 'balances.lastUpdated')
  },
  getNativeCurrency: (chainId: number): NativeCurrency => {
    const currency = store('main.networksMeta.ethereum', chainId, 'nativeCurrency')
    return currency || { usd: { price: 0 } }
  },
  getUsdRate: (address: Address): UsdRate => {
    const rate = store('main.rates', address.toLowerCase())
    return rate || { usd: { price: 0 } }
  }
}

// -- Scanning guard -----------------------------------------------------------

/**
 * Returns true when the account's balance data may still be incomplete
 * because it was never loaded or the last update is older than the threshold.
 */
function isScanning(account: Address): boolean {
  const lastUpdated = storeApi.getLastUpdated(account)
  const elapsedMs = new Date().getTime() - lastUpdated
  return !lastUpdated || elapsedMs > SCAN_STALE_THRESHOLD_MS
}

// -- Asset fetching -----------------------------------------------------------

/** Partition balances into native-currency and ERC-20 buckets */
function fetchAssets(accountId: string): RPC.GetAssets.Assets {
  const balances = storeApi.getBalances(accountId)

  const initial: RPC.GetAssets.Assets = {
    erc20: [] as RPC.GetAssets.Erc20[],
    nativeCurrency: [] as RPC.GetAssets.NativeCurrency[]
  }

  return balances.reduce((assets, balance) => {
    const { address, chainId } = balance

    if (address === NATIVE_CURRENCY) {
      const currencyInfo = storeApi.getNativeCurrency(chainId)
      assets.nativeCurrency.push({ ...balance, currencyInfo })
    } else {
      const usdRate = storeApi.getUsdRate(address)
      assets.erc20.push({
        ...balance,
        tokenInfo: { lastKnownPrice: usdRate }
      })
    }

    return assets
  }, initial)
}

/**
 * Load assets for an account synchronously.
 * Throws if the account balances are not yet available (still scanning).
 */
function loadAssets(accountId: string): RPC.GetAssets.Assets {
  if (isScanning(accountId)) throw new Error('assets not known for account')
  return fetchAssets(accountId)
}

// -- Observer factory ---------------------------------------------------------

/**
 * Returns a store-observer that fires assetsChanged for the current account
 * whenever its asset list changes, debounced to avoid rapid successive calls.
 */
function createObserver(handler: AssetsChangedHandler) {
  let debouncedAssets: RPC.GetAssets.Assets | null = null

  return function () {
    const currentAccountId = store('selected.current') as string
    if (!currentAccountId) return

    const assets = fetchAssets(currentAccountId)
    const hasAssets = assets.erc20.length > 0 || assets.nativeCurrency.length > 0

    if (!isScanning(currentAccountId) && hasAssets) {
      if (!debouncedAssets) {
        setTimeout(() => {
          if (debouncedAssets) {
            handler.assetsChanged(currentAccountId, debouncedAssets)
            debouncedAssets = null
          }
        }, ASSETS_DEBOUNCE_MS)
      }

      debouncedAssets = assets
    }
  }
}

// -- Exports ------------------------------------------------------------------

export { createObserver, loadAssets }
