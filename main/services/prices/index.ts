// LightPay Price Service — replaces @framelabs/pylon-client
// Uses CoinGecko public API (no API key required for basic usage)

const COINGECKO_BASE = 'https://api.coingecko.com/api/v3'
const CACHE_TTL_MS = 60_000 // 1 minute cache
const REQUEST_TIMEOUT_MS = 10_000
const MAX_TOKENS_PER_REQUEST = 50

interface PriceEntry {
  usd: number
  usd_24h_change: number
  last_updated_at: number
}

interface PriceCache {
  [tokenId: string]: PriceEntry & { cachedAt: number }
}

interface TokenAddressMap {
  [chainId: number]: string[] // contract addresses
}

const priceCache: PriceCache = {}
let ratesCache: Record<string, number> = {}
let ratesCachedAt = 0

// ─── Chain ID → CoinGecko platform mapping ───────────────────────────────────
const CHAIN_PLATFORM_MAP: Record<number, string> = {
  1:     'ethereum',
  137:   'polygon-pos',
  42161: 'arbitrum-one',
  10:    'optimistic-ethereum',
  8453:  'base',
  43114: 'avalanche',
  56:    'binance-smart-chain',
  250:   'fantom',
}

function getPlatform(chainId: number): string | undefined {
  return CHAIN_PLATFORM_MAP[chainId]
}

async function fetchWithTimeout(url: string): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  try {
    const res = await fetch(url, { signal: controller.signal })
    clearTimeout(timer)
    return res
  } catch (e) {
    clearTimeout(timer)
    throw e
  }
}

export async function getTokenPrices(chainId: number, addresses: string[]): Promise<Record<string, PriceEntry>> {
  const platform = getPlatform(chainId)
  if (!platform || addresses.length === 0) return {}

  const now = Date.now()
  const uncached = addresses.filter(addr => {
    const entry = priceCache[addr.toLowerCase()]
    return !entry || (now - entry.cachedAt) > CACHE_TTL_MS
  })

  if (uncached.length > 0) {
    const batches: string[][] = []
    for (let i = 0; i < uncached.length; i += MAX_TOKENS_PER_REQUEST) {
      batches.push(uncached.slice(i, i + MAX_TOKENS_PER_REQUEST))
    }

    for (const batch of batches) {
      try {
        const joined = batch.join(',')
        const url = `${COINGECKO_BASE}/simple/token_price/${platform}?contract_addresses=${joined}&vs_currencies=usd&include_24hr_change=true&include_last_updated_at=true`
        const res = await fetchWithTimeout(url)
        if (res.ok) {
          const data = await res.json()
          for (const [addr, prices] of Object.entries(data as Record<string, any>)) {
            priceCache[addr.toLowerCase()] = { ...(prices as PriceEntry), cachedAt: now }
          }
        }
      } catch (e) {
        console.warn('[LightPay PriceService] Batch fetch failed:', e)
      }
    }
  }

  const result: Record<string, PriceEntry> = {}
  for (const addr of addresses) {
    const cached = priceCache[addr.toLowerCase()]
    if (cached) {
      const { cachedAt: _, ...entry } = cached
      result[addr.toLowerCase()] = entry
    }
  }
  return result
}

export async function getEthPrice(): Promise<number> {
  try {
    const url = `${COINGECKO_BASE}/simple/price?ids=ethereum&vs_currencies=usd&include_24hr_change=true`
    const res = await fetchWithTimeout(url)
    if (res.ok) {
      const data = await res.json() as any
      return data?.ethereum?.usd || 0
    }
  } catch {}
  return 0
}

export async function getFiatRates(currencies: string[] = ['usd', 'eur', 'gbp', 'jpy']): Promise<Record<string, number>> {
  const now = Date.now()
  if (ratesCachedAt && (now - ratesCachedAt) < CACHE_TTL_MS * 5) {
    return ratesCache
  }
  try {
    const url = `${COINGECKO_BASE}/simple/price?ids=ethereum&vs_currencies=${currencies.join(',')}`
    const res = await fetchWithTimeout(url)
    if (res.ok) {
      const data = await res.json() as any
      const eth = data?.ethereum || {}
      // Use ETH price in each currency to derive approximate rates
      ratesCache = Object.fromEntries(currencies.map(c => [c.toUpperCase(), eth[c] || 0]))
      ratesCachedAt = now
    }
  } catch {}
  return ratesCache
}

export function getCachedPrice(address: string): PriceEntry | null {
  const entry = priceCache[address.toLowerCase()]
  if (!entry) return null
  const { cachedAt: _, ...price } = entry
  return price
}

export function clearPriceCache(): void {
  Object.keys(priceCache).forEach(k => delete priceCache[k])
  ratesCache = {}
  ratesCachedAt = 0
}

export function getPriceCacheStats(): { entries: number; oldestMs: number } {
  const entries = Object.values(priceCache)
  if (entries.length === 0) return { entries: 0, oldestMs: 0 }
  const oldest = Math.min(...entries.map(e => e.cachedAt))
  return { entries: entries.length, oldestMs: Date.now() - oldest }
}
