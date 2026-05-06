// LightPay Transaction History Cache — unique to LightPay
// Provides fast local access to recent transaction history

export interface TxHistoryEntry {
  hash: string
  chainId: number
  from: string
  to: string
  value: string
  timestamp: number
  status: 'pending' | 'confirmed' | 'failed'
  gasUsed?: string
}

const MAX_HISTORY = 100
const historyByAddress = new Map<string, TxHistoryEntry[]>()

export function addTxToHistory(address: string, entry: TxHistoryEntry): void {
  const normalizedAddress = address.toLowerCase()
  const existing = historyByAddress.get(normalizedAddress) || []
  // Deduplicate by hash
  const filtered = existing.filter(tx => tx.hash !== entry.hash)
  const updated = [entry, ...filtered].slice(0, MAX_HISTORY)
  historyByAddress.set(normalizedAddress, updated)
}

export function getTxHistory(address: string, chainId?: number): TxHistoryEntry[] {
  const normalizedAddress = address.toLowerCase()
  const history = historyByAddress.get(normalizedAddress) || []
  if (chainId !== undefined) {
    return history.filter(tx => tx.chainId === chainId)
  }
  return history
}

export function updateTxStatus(hash: string, status: TxHistoryEntry['status'], gasUsed?: string): boolean {
  for (const [address, entries] of historyByAddress) {
    const idx = entries.findIndex(tx => tx.hash === hash)
    if (idx !== -1) {
      entries[idx] = { ...entries[idx], status, ...(gasUsed && { gasUsed }) }
      historyByAddress.set(address, entries)
      return true
    }
  }
  return false
}

export function clearTxHistory(address: string): void {
  historyByAddress.delete(address.toLowerCase())
}

export function getTxHistoryStats(address: string): { total: number; pending: number; confirmed: number; failed: number } {
  const history = getTxHistory(address)
  return {
    total: history.length,
    pending: history.filter(tx => tx.status === 'pending').length,
    confirmed: history.filter(tx => tx.status === 'confirmed').length,
    failed: history.filter(tx => tx.status === 'failed').length
  }
}
