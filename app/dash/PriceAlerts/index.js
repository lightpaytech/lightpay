import React, { useState } from 'react'
import Restore from 'react-restore'
import link from '../../../resources/link'

// LightPay Price Alerts — unique feature for setting token price notifications

function AlertForm({ onAdd }) {
  const [token, setToken] = useState('')
  const [above, setAbove] = useState('')
  const [below, setBelow] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!token) return
    onAdd({ token, above: above ? parseFloat(above) : null, below: below ? parseFloat(below) : null })
    setToken(''); setAbove(''); setBelow('')
  }

  return (
    <form className='alertForm' onSubmit={handleSubmit}>
      <div className='alertFormTitle'>New Price Alert</div>
      <input
        className='alertInput'
        placeholder='Token symbol (e.g. ETH)'
        value={token}
        onChange={e => setToken(e.target.value.toUpperCase())}
        maxLength={10}
      />
      <div className='alertThresholds'>
        <div className='alertThresholdGroup'>
          <span className='alertThresholdLabel'>▲ Above $</span>
          <input
            className='alertInput alertInputSmall'
            type='number'
            placeholder='0.00'
            value={above}
            onChange={e => setAbove(e.target.value)}
            min='0'
          />
        </div>
        <div className='alertThresholdGroup'>
          <span className='alertThresholdLabel'>▼ Below $</span>
          <input
            className='alertInput alertInputSmall'
            type='number'
            placeholder='0.00'
            value={below}
            onChange={e => setBelow(e.target.value)}
            min='0'
          />
        </div>
      </div>
      <button className='alertSubmit' type='submit'>Set Alert</button>
    </form>
  )
}

function AlertItem({ alert, onRemove }) {
  return (
    <div className={`alertItem ${alert.triggered ? 'alertTriggered' : ''}`}>
      <div className='alertItemToken'>{alert.token}</div>
      <div className='alertItemThresholds'>
        {alert.above && <span className='alertAbove'>▲ ${alert.above.toFixed(2)}</span>}
        {alert.below && <span className='alertBelow'>▼ ${alert.below.toFixed(2)}</span>}
      </div>
      {alert.triggered && <span className='alertTriggeredBadge'>✓ Triggered</span>}
      <button className='alertRemove' onClick={() => onRemove(alert.id)}>✕</button>
    </div>
  )
}

class PriceAlerts extends React.Component {
  render() {
    const address = this.store('selected.current')
    const raw = (address && this.store('main.priceAlerts', address)) || {}
    const alerts = Object.keys(raw)
      .filter((token) => raw[token])
      .map((token) => ({ id: token, token, ...raw[token] }))

    const handleAdd = ({ token, above, below }) => {
      if (!address || !token) return
      link.send('tray:action', 'setPriceAlert', address, token, { above, below })
    }

    const handleRemove = (alertId) => {
      if (!address) return
      link.send('tray:action', 'removePriceAlert', address, alertId)
    }

    if (!address) {
      return (
        <div className='priceAlerts'>
          <div className='alertEmpty'>Select an account to manage price alerts.</div>
        </div>
      )
    }

    return (
      <div className='priceAlerts'>
        <div className='priceAlertsHeader'>
          <span className='priceAlertsTitle'>Price Alerts</span>
          <span className='priceAlertsCount'>{alerts.length} active</span>
        </div>
        <AlertForm onAdd={handleAdd} />
        <div className='alertList'>
          {alerts.length === 0 ? (
            <div className='alertEmpty'>No active price alerts. Add one above.</div>
          ) : (
            alerts.map((alert) => (
              <AlertItem key={alert.id} alert={alert} onRemove={handleRemove} />
            ))
          )}
        </div>
      </div>
    )
  }
}

PriceAlerts.displayName = 'PriceAlerts'

export default Restore.connect(PriceAlerts)
