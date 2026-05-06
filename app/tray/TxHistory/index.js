import React, { useState } from 'react'
import link from '../../../resources/link'

// LightPay Transaction History — unique tray panel feature

const STATUS_COLORS = { confirmed: '#4ade80', pending: '#fbbf24', failed: '#f87171' }
const STATUS_ICONS = { confirmed: '✓', pending: '⏳', failed: '✕' }

function TxItem({ tx, chainId }) {
  const [copied, setCopied] = useState(false)

  const shortHash = tx.hash ? `${tx.hash.slice(0, 8)}…${tx.hash.slice(-6)}` : '—'
  const shortTo = tx.to ? `${tx.to.slice(0, 6)}…${tx.to.slice(-4)}` : 'Contract'
  const age = tx.timestamp
    ? (() => {
        const secs = Math.floor((Date.now() - tx.timestamp) / 1000)
        if (secs < 60) return `${secs}s ago`
        if (secs < 3600) return `${Math.floor(secs / 60)}m ago`
        return `${Math.floor(secs / 3600)}h ago`
      })()
    : 'Unknown'

  const copyHash = () => {
    if (tx.hash) {
      link.send('tray:clipboardData', tx.hash)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const openExplorer = () => {
    if (tx.hash && chainId === 1) {
      link.send('tray:openExternal', `https://etherscan.io/tx/${tx.hash}`)
    }
  }

  return (
    <div className='txItem'>
      <div className='txItemStatus' style={{ color: STATUS_COLORS[tx.status] || '#aaa' }}>
        {STATUS_ICONS[tx.status] || '?'}
      </div>
      <div className='txItemInfo'>
        <div className='txItemTo'>{tx.type === 'contract' ? '📄 Contract' : `→ ${shortTo}`}</div>
        <div className='txItemMeta'>
          <span className='txItemAge'>{age}</span>
          {tx.value && tx.value !== '0x0' && (
            <span className='txItemValue'>{parseFloat(parseInt(tx.value, 16) / 1e18).toFixed(4)} ETH</span>
          )}
        </div>
      </div>
      <div className='txItemActions'>
        <button className='txAction' onClick={copyHash} title='Copy hash'>
          {copied ? '✓' : '⎘'}
        </button>
        <button className='txAction' onClick={openExplorer} title='View on explorer'>↗</button>
      </div>
    </div>
  )
}

function TxHistory({ transactions = [], address, chainId = 1 }) {
  const [filter, setFilter] = useState('all')

  const filtered = filter === 'all'
    ? transactions
    : transactions.filter(tx => tx.status === filter)

  return (
    <div className='txHistory'>
      <div className='txHistoryHeader'>
        <span className='txHistoryTitle'>Recent Transactions</span>
        <div className='txHistoryFilters'>
          {['all', 'confirmed', 'pending', 'failed'].map(f => (
            <button
              key={f}
              className={`txFilter ${filter === f ? 'txFilterActive' : ''}`}
              onClick={() => setFilter(f)}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>
      <div className='txList'>
        {filtered.length === 0 ? (
          <div className='txEmpty'>
            {filter === 'all' ? 'No transactions yet' : `No ${filter} transactions`}
          </div>
        ) : (
          filtered.map(tx => <TxItem key={tx.hash || tx.id} tx={tx} chainId={chainId} />)
        )}
      </div>
      {transactions.length > 0 && (
        <div className='txHistoryFooter'>
          <button className='txClearAll' onClick={() => link.send('tray:action', 'clearTxHistory', address)}>
            Clear history
          </button>
        </div>
      )}
    </div>
  )
}

export default TxHistory
TxHistory.displayName = 'TxHistory'
