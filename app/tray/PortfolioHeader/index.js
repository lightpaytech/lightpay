import React, { useState, useEffect } from 'react'
import link from '../../../resources/link'

// LightPay Portfolio Header — unique feature showing total portfolio value
// Displayed at the top of the tray window

const REFRESH_INTERVAL = 30_000

function formatUsdValue(usd) {
  if (usd >= 1_000_000) return `$${(usd / 1_000_000).toFixed(2)}M`
  if (usd >= 1_000) return `$${(usd / 1_000).toFixed(1)}K`
  return `$${usd.toFixed(2)}`
}

function PortfolioChange({ change24h }) {
  if (change24h === null || change24h === undefined) return null
  const positive = change24h >= 0
  const absChange = Math.abs(change24h).toFixed(2)
  return (
    <div className={`portfolioChange ${positive ? 'portfolioChangePositive' : 'portfolioChangeNegative'}`}>
      <span className='portfolioChangeArrow'>{positive ? '▲' : '▼'}</span>
      <span className='portfolioChangePct'>{absChange}%</span>
      <span className='portfolioChangePeriod'>24h</span>
    </div>
  )
}

function PortfolioHeader({ address, totalUsd, change24h, lastUpdated }) {
  const [expanded, setExpanded] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const handleRefresh = () => {
    setRefreshing(true)
    link.send('tray:action', 'refreshPortfolio', address)
    setTimeout(() => setRefreshing(false), 2000)
  }

  const timeSinceUpdate = lastUpdated
    ? Math.floor((Date.now() - lastUpdated) / 1000)
    : null

  return (
    <div className='portfolioHeader' onClick={() => setExpanded(!expanded)}>
      <div className='portfolioHeaderMain'>
        <div className='portfolioLabel'>Portfolio</div>
        <div className='portfolioValue'>{formatUsdValue(totalUsd || 0)}</div>
        <PortfolioChange change24h={change24h} />
        <button
          className={`portfolioRefresh ${refreshing ? 'portfolioRefreshSpin' : ''}`}
          onClick={e => { e.stopPropagation(); handleRefresh() }}
          title='Refresh portfolio'
        >↻</button>
      </div>
      {expanded && (
        <div className='portfolioDetail'>
          <div className='portfolioDetailRow'>
            <span className='portfolioDetailLabel'>Last updated</span>
            <span className='portfolioDetailValue'>
              {timeSinceUpdate !== null ? `${timeSinceUpdate}s ago` : 'Never'}
            </span>
          </div>
          <div className='portfolioDetailRow'>
            <span className='portfolioDetailLabel'>Address</span>
            <span className='portfolioDetailValue portfolioAddress'>
              {address ? `${address.slice(0, 6)}…${address.slice(-4)}` : '—'}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

export default PortfolioHeader
PortfolioHeader.displayName = 'PortfolioHeader'
