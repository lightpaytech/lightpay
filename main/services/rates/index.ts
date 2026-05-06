// LightPay Rates Service — currency exchange rates

export interface ExchangeRate {
  currency: string
  rate: number
  updatedAt: number
}

const rateStore = new Map<string, ExchangeRate>()

export function setRate(currency: string, rate: number): void {
  rateStore.set(currency.toUpperCase(), { currency: currency.toUpperCase(), rate, updatedAt: Date.now() })
}

export function getRate(currency: string): number {
  return rateStore.get(currency.toUpperCase())?.rate || 0
}

export function getAllRates(): ExchangeRate[] {
  return Array.from(rateStore.values())
}

export function isRateStale(currency: string, maxAgeMs = 300_000): boolean {
  const entry = rateStore.get(currency.toUpperCase())
  if (!entry) return true
  return Date.now() - entry.updatedAt > maxAgeMs
}
