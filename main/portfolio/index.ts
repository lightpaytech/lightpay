// LightPay Portfolio Value Tracker — unique to LightPay
// Aggregates token balances into a portfolio USD value

export interface PortfolioSnapshot {
  address: string
  totalUsd: number
  byChain: Record<number, number>
  topHoldings: Array<{ symbol: string; valueUsd: number; percentage: number }>
  lastUpdated: number
}

const portfolioCache = new Map<string, PortfolioSnapshot>()

export function updatePortfolio(address: string, snapshot: Omit<PortfolioSnapshot, 'address'>): void {
  portfolioCache.set(address.toLowerCase(), { address: address.toLowerCase(), ...snapshot })
}

export function getPortfolio(address: string): PortfolioSnapshot | undefined {
  return portfolioCache.get(address.toLowerCase())
}

export function getPortfolioValue(address: string): number {
  return portfolioCache.get(address.toLowerCase())?.totalUsd ?? 0
}

export function formatPortfolioValue(usd: number): string {
  if (usd >= 1_000_000) return `$${(usd / 1_000_000).toFixed(2)}M`
  if (usd >= 1_000) return `$${(usd / 1_000).toFixed(2)}K`
  return `$${usd.toFixed(2)}`
}

export function getTopHoldings(address: string, limit = 5): PortfolioSnapshot['topHoldings'] {
  const snapshot = portfolioCache.get(address.toLowerCase())
  if (!snapshot) return []
  return snapshot.topHoldings.slice(0, limit)
}

export function clearPortfolio(address: string): void {
  portfolioCache.delete(address.toLowerCase())
}
