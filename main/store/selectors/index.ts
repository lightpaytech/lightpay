// LightPay Store Selectors — typed access layer over raw store state
// This module provides type-safe, memoizable selectors for reading store state

import store from '../index'

// ─── Account Selectors ────────────────────────────────────────────────────────

export function selectCurrentAccount() {
  const accounts = store('main.accounts') as Record<string, any>
  const selected = store('selected.current') as string
  return accounts?.[selected] || null
}

export function selectAccountByAddress(address: string) {
  return store('main.accounts', address.toLowerCase()) || null
}

export function selectAllAccounts(): Record<string, any> {
  return store('main.accounts') || {}
}

export function selectAccountAddresses(): string[] {
  return Object.keys(selectAllAccounts())
}

// ─── Chain Selectors ──────────────────────────────────────────────────────────

export function selectChain(chainId: number) {
  return store('main.networks.ethereum', chainId) || null
}

export function selectActiveChains(): number[] {
  const networks = store('main.networks.ethereum') as Record<number, any> || {}
  return Object.entries(networks)
    .filter(([, network]) => network?.on?.connection?.primary?.connected || network?.on?.connection?.secondary?.connected)
    .map(([id]) => Number(id))
}

export function selectChainName(chainId: number): string {
  return store('main.networks.ethereum', chainId, 'name') || `Chain ${chainId}`
}

// ─── Permission Selectors ─────────────────────────────────────────────────────

export function selectPermissions(address: string): Record<string, any> {
  return store('main.permissions', address.toLowerCase()) || {}
}

export function selectOriginHasPermission(address: string, origin: string): boolean {
  const perms = selectPermissions(address)
  return !!perms[origin]?.provider
}

// ─── Gas Selectors ────────────────────────────────────────────────────────────

export function selectGasFees(chainId: number) {
  return store('main.networksMeta.ethereum', chainId, 'gas', 'price') || null
}

export function selectGasPrice(chainId: number): string | null {
  return store('main.networksMeta.ethereum', chainId, 'gas', 'price', 'fees', 'maxFeePerGas') || null
}

// ─── UI State Selectors ───────────────────────────────────────────────────────

export function selectTrayOpen(): boolean {
  return store('tray.open') as boolean || false
}

export function selectCurrentView(): string {
  return store('selected.view') as string || 'default'
}

// ─── Portfolio Selectors (LightPay-unique) ────────────────────────────────────

export function selectTotalPortfolioValue(address: string): number {
  const balances = store('main.balances', address.toLowerCase()) as any[] || []
  return balances.reduce((sum: number, b: any) => {
    const usdValue = (parseFloat(b.displayBalance || '0') * (b.usdRate || 0))
    return sum + (isNaN(usdValue) ? 0 : usdValue)
  }, 0)
}

export function selectNetworkHealthSummary(): { healthy: number; total: number } {
  const networks = store('main.networks.ethereum') as Record<number, any> || {}
  const ids = Object.keys(networks)
  const healthy = ids.filter(id => {
    const n = networks[Number(id)]
    return n?.on?.connection?.primary?.connected
  }).length
  return { healthy, total: ids.length }
}
