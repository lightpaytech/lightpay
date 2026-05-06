// LightPay Network Health Monitor — unique to LightPay
// Tracks RPC endpoint latency and availability

interface HealthRecord {
  chainId: number
  endpoint: string
  latencyMs: number
  lastChecked: number
  available: boolean
}

const healthCache = new Map<number, HealthRecord>()

export async function checkEndpointHealth(chainId: number, endpoint: string): Promise<HealthRecord> {
  const start = Date.now()
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', method: 'eth_blockNumber', params: [], id: 1 }),
      signal: AbortSignal.timeout(5000)
    })
    const latencyMs = Date.now() - start
    const record: HealthRecord = { chainId, endpoint, latencyMs, lastChecked: Date.now(), available: response.ok }
    healthCache.set(chainId, record)
    return record
  } catch {
    const record: HealthRecord = { chainId, endpoint, latencyMs: -1, lastChecked: Date.now(), available: false }
    healthCache.set(chainId, record)
    return record
  }
}

export function getNetworkHealth(chainId: number): HealthRecord | undefined {
  return healthCache.get(chainId)
}

export function getAllNetworkHealth(): HealthRecord[] {
  return Array.from(healthCache.values())
}

export function getHealthSummary(): { healthy: number; degraded: number; unavailable: number } {
  const records = getAllNetworkHealth()
  return {
    healthy: records.filter(r => r.available && r.latencyMs < 500).length,
    degraded: records.filter(r => r.available && r.latencyMs >= 500).length,
    unavailable: records.filter(r => !r.available).length
  }
}
