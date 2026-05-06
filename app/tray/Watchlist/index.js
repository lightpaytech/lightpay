import React, { useState } from 'react'
import link from '../../../resources/link'

// LightPay Watchlist — token price watchlist unique to LightPay

const POPULAR_TOKENS = [
  { symbol: 'ETH', name: 'Ethereum', coingeckoId: 'ethereum' },
  { symbol: 'BTC', name: 'Bitcoin', coingeckoId: 'bitcoin' },
  { symbol: 'MATIC', name: 'Polygon', coingeckoId: 'matic-network' },
  { symbol: 'ARB', name: 'Arbitrum', coingeckoId: 'arbitrum' },
  { symbol: 'OP', name: 'Optimism', coingeckoId: 'optimism' },
  { symbol: 'BASE', name: 'Base', coingeckoId: 'base' },
]

function WatchlistRow({ token, price, change24h, onRemove }) {
  const positive = change24h >= 0
  const changeColor = positive ? 'rgb(74, 222, 128)' : 'rgb(248, 113, 113)'
  const changeSign = positive ? '+' : ''

  return (
    <div className='watchlistRow'>
      <div className='watchlistTokenSymbol'>{token.symbol}</div>
      <div className='watchlistTokenName'>{token.name}</div>
      <div className='watchlistPrice'>
        {price != null ? `$${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
      </div>
      <div className='watchlistChange' style={{ color: changeColor }}>
        {change24h != null ? `${changeSign}${change24h.toFixed(2)}%` : '—'}
      </div>
      <button className='watchlistRemove' onClick={() => onRemove(token.symbol)}>✕</button>
    </div>
  )
}

function AddTokenSearch({ onAdd, watchedSymbols }) {
  const [search, setSearch] = useState('')
  const available = POPULAR_TOKENS.filter(t =>
    !watchedSymbols.includes(t.symbol) &&
    (t.symbol.includes(search.toUpperCase()) || t.name.toLowerCase().includes(search.toLowerCase()))
  )

  return (
    <div className='watchlistSearch'>
      <input
        className='watchlistSearchInput'
        placeholder='Search tokens…'
        value={search}
        onChange={e => setSearch(e.target.value)}
      />
      {search && available.length > 0 && (
        <div className='watchlistDropdown'>
          {available.slice(0, 5).map(t => (
            <button key={t.symbol} className='watchlistDropdownItem' onClick={() => { onAdd(t); setSearch('') }}>
              <span className='watchlistDropdownSymbol'>{t.symbol}</span>
              <span className='watchlistDropdownName'>{t.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function Watchlist({ watched = [], prices = {}, onAdd, onRemove }) {
  return (
    <div className='watchlist'>
      <div className='watchlistHeader'>
        <span className='watchlistTitle'>Watchlist</span>
        <span className='watchlistSubtitle'>Live prices</span>
      </div>
      <AddTokenSearch onAdd={onAdd} watchedSymbols={watched.map(t => t.symbol)} />
      <div className='watchlistRows'>
        {watched.length === 0 ? (
          <div className='watchlistEmpty'>Search and add tokens to watch their prices</div>
        ) : (
          watched.map(token => (
            <WatchlistRow
              key={token.symbol}
              token={token}
              price={prices[token.coingeckoId]?.usd}
              change24h={prices[token.coingeckoId]?.usd_24h_change}
              onRemove={onRemove}
            />
          ))
        )}
      </div>
    </div>
  )
}

export default Watchlist
Watchlist.displayName = 'Watchlist'
