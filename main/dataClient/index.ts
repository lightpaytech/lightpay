// LightPay price data — powered by LightPay Price Service (CoinGecko)

export interface DataClientConfig {
  endpoint?: string
  timeout?: number
  retries?: number
}

export interface PriceData {
  chainId: number
  address: string
  price: number
  change24h: number
  updatedAt: number
}

export interface RatesData {
  [currency: string]: number
}

const DEFAULT_CONFIG: DataClientConfig = {
  timeout: 10_000,
  retries: 3
}

export function getDataClient() {
  // No longer delegates to pylon-client; price lookups now go through
  // main/services/prices directly. Return null so callers that guard
  // on `if (!pylon)` safely skip the old subscription path.
  return null
}

export function resetDataClient() {
  // no-op — retained for API compatibility
}

export function isDataClientAvailable(): boolean {
  return false
}

export function getClientConfig(): DataClientConfig {
  return { ...DEFAULT_CONFIG }
}
