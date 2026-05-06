// LightPay price data — powered by LightPay Price Service (CoinGecko)
import log from 'electron-log'

import { getTokenPrices, getEthPrice } from '../../services/prices'

import type { UsdRate } from '../../provider/assets'
import type { NativeCurrency, Rate, Token } from '../../store/state'

// ─── Local asset-type constants (replaces lightpay-data-client AssetType) ────
const AssetType = {
  NativeCurrency: 'nativeCurrency',
  Token: 'token'
} as const

type AssetTypeValue = typeof AssetType[keyof typeof AssetType]

interface AssetId {
  type: AssetTypeValue
  chainId: number
  address?: string
}

interface RateUpdate {
  id: AssetId
  data: {
    usd: number
    usd_24h_change: number
  }
}

// ─── Polling interval ────────────────────────────────────────────────────────
const POLL_INTERVAL_MS = 60_000

export default function rates(_pylon: any, store: Store) {
  let pollTimer: NodeJS.Timeout | undefined
  let subscribedAssets: AssetId[] = []

  const storeApi = {
    getKnownTokens: (address?: Address) =>
      ((address && store('main.tokens.known', address)) || []) as Token[],
    getCustomTokens: () => (store('main.tokens.custom') || []) as Token[],
    setNativeCurrencyData: (chainId: number, currencyData: NativeCurrency) =>
      store.setNativeCurrencyData('ethereum', chainId, currencyData),
    setNativeCurrencyRate: (chainId: number, rate: Rate) =>
      store.setNativeCurrencyData('ethereum', chainId, { usd: rate }),
    setTokenRates: (rates: Record<Address, UsdRate>) => store.setRates(rates)
  }

  function handleRatesUpdates(updates: RateUpdate[]) {
    if (updates.length === 0) return

    const nativeCurrencyUpdates = updates.filter((u) => u.id.type === AssetType.NativeCurrency)

    if (nativeCurrencyUpdates.length > 0) {
      log.debug(`got currency rate updates for chains: ${nativeCurrencyUpdates.map((u) => u.id.chainId)}`)

      nativeCurrencyUpdates.forEach((u) => {
        storeApi.setNativeCurrencyRate(u.id.chainId, {
          price: u.data.usd,
          change24hr: u.data.usd_24h_change
        })
      })
    }

    const tokenUpdates = updates.filter((u) => u.id.type === AssetType.Token)

    if (tokenUpdates.length > 0) {
      log.debug(`got token rate updates for addresses: ${tokenUpdates.map((u) => u.id.address)}`)

      const tokenRates = tokenUpdates.reduce((allRates, update) => {
        // address is always defined for tokens
        const address = update.id.address as string

        allRates[address] = {
          usd: {
            price: update.data.usd,
            change24hr: update.data.usd_24h_change
          }
        }

        return allRates
      }, {} as Record<string, UsdRate>)

      storeApi.setTokenRates(tokenRates)
    }
  }

  async function fetchAndDispatch() {
    const updates: RateUpdate[] = []

    // Fetch native currency (ETH) prices per chain
    const nativeAssets = subscribedAssets.filter((a) => a.type === AssetType.NativeCurrency)
    if (nativeAssets.length > 0) {
      try {
        const ethUsd = await getEthPrice()
        if (ethUsd > 0) {
          for (const asset of nativeAssets) {
            updates.push({
              id: asset,
              data: { usd: ethUsd, usd_24h_change: 0 }
            })
          }
        }
      } catch (e) {
        log.warn('[LightPay rates] Failed to fetch native currency price:', e)
      }
    }

    // Fetch token prices grouped by chain
    const tokenAssets = subscribedAssets.filter((a) => a.type === AssetType.Token && a.address)
    const byChain = tokenAssets.reduce((acc, asset) => {
      if (!acc[asset.chainId]) acc[asset.chainId] = []
      acc[asset.chainId].push(asset.address as string)
      return acc
    }, {} as Record<number, string[]>)

    for (const [chainIdStr, addresses] of Object.entries(byChain)) {
      const chainId = Number(chainIdStr)
      try {
        const prices = await getTokenPrices(chainId, addresses)
        for (const [addr, data] of Object.entries(prices)) {
          updates.push({
            id: { type: AssetType.Token, chainId, address: addr },
            data: { usd: data.usd, usd_24h_change: data.usd_24h_change }
          })
        }
      } catch (e) {
        log.warn(`[LightPay rates] Failed to fetch token prices for chain ${chainId}:`, e)
      }
    }

    handleRatesUpdates(updates)
  }

  function updateSubscription(chains: number[], address?: Address) {
    const subscribedCurrencies = chains.map((chainId) => ({ type: AssetType.NativeCurrency as AssetTypeValue, chainId }))
    const knownTokens = storeApi.getKnownTokens(address).filter((token) => chains.includes(token.chainId))
    const customTokens = storeApi
      .getCustomTokens()
      .filter(
        (token) => !knownTokens.some((kt) => kt.address === token.address && kt.chainId === token.chainId)
      )

    const subscribedTokens = [...knownTokens, ...customTokens].map((token) => ({
      type: AssetType.Token as AssetTypeValue,
      chainId: token.chainId,
      address: token.address
    }))

    setAssets([...subscribedCurrencies, ...subscribedTokens])
  }

  function start() {
    log.verbose('starting asset updates')

    // Kick off an immediate fetch then schedule polling
    fetchAndDispatch()
    pollTimer = setInterval(fetchAndDispatch, POLL_INTERVAL_MS)
  }

  function stop() {
    log.verbose('stopping asset updates')

    if (pollTimer) {
      clearInterval(pollTimer)
      pollTimer = undefined
    }

    subscribedAssets = []
  }

  function setAssets(assetIds: AssetId[]) {
    log.verbose(
      'subscribing to rates updates for native currencies on chains:',
      assetIds.filter((a) => a.type === AssetType.NativeCurrency).map((a) => a.chainId)
    )
    log.verbose(
      'subscribing to rates updates for tokens:',
      assetIds.filter((a) => a.type === AssetType.Token).map((a) => a.address)
    )

    subscribedAssets = assetIds

    // Fetch immediately when the subscription changes
    fetchAndDispatch()
  }

  return {
    start,
    stop,
    setAssets,
    updateSubscription
  }
}
