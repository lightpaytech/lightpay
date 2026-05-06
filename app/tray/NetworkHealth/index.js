import React, { useState } from 'react'

// LightPay Network Health Bar — shows RPC endpoint status per chain
// Unique feature not present in Frame wallet

function HealthDot({ latencyMs, available }) {
  const color = !available ? '#f87171'
    : latencyMs < 300 ? '#4ade80'
    : latencyMs < 800 ? '#fbbf24'
    : '#f97316'

  const label = !available ? 'Offline'
    : latencyMs < 300 ? `${latencyMs}ms`
    : latencyMs < 800 ? `${latencyMs}ms (slow)`
    : `${latencyMs}ms (degraded)`

  return (
    <div className='healthDot' title={label} style={{ background: color }} />
  )
}

function NetworkHealthBar({ networks = [] }) {
  const [expanded, setExpanded] = useState(false)

  const healthyCount = networks.filter(n => n.available && n.latencyMs < 800).length
  const totalCount = networks.length
  const overallGood = healthyCount === totalCount

  return (
    <div className='networkHealthBar'>
      <div
        className='networkHealthSummary'
        onClick={() => setExpanded(!expanded)}
      >
        <div className='networkHealthIndicator'>
          <div className={`networkHealthPulse ${overallGood ? 'networkHealthPulseGood' : 'networkHealthPulseWarn'}`} />
          <span className='networkHealthLabel'>Networks</span>
        </div>
        <span className='networkHealthCount'>
          {healthyCount}/{totalCount} online
        </span>
        <span className='networkHealthChevron'>{expanded ? '▲' : '▼'}</span>
      </div>
      {expanded && (
        <div className='networkHealthDetail'>
          {networks.length === 0 ? (
            <div className='networkHealthEmpty'>No network data</div>
          ) : (
            networks.map(n => (
              <div key={n.chainId} className='networkHealthRow'>
                <HealthDot latencyMs={n.latencyMs} available={n.available} />
                <span className='networkHealthName'>{n.name || `Chain ${n.chainId}`}</span>
                <span className='networkHealthLatency'>
                  {n.available ? `${n.latencyMs}ms` : 'Offline'}
                </span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}

export default NetworkHealthBar
NetworkHealthBar.displayName = 'NetworkHealthBar'
