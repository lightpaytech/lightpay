import React from 'react'
import Restore from 'react-restore'
import svg from '../../../../../resources/svg'

// Named constants
const CONFIRMATION_SLOTS = 12
const CONFIRMATION_THRESHOLD_FAST = 3
const CONFIRMATION_THRESHOLD_STANDARD = 6
const CONFIRMATION_THRESHOLD_SECURE = 12
const AVG_BLOCK_TIME_SECONDS = 12 // approximate mainnet average

// Returns a human-readable speed label and estimated seconds remaining to reach the next threshold
export function getConfirmationSpeedEstimate(confirmations) {
  if (typeof confirmations !== 'number' || confirmations < 0) {
    return { label: 'pending', remainingSeconds: null }
  }
  if (confirmations >= CONFIRMATION_THRESHOLD_SECURE) {
    return { label: 'secure', remainingSeconds: 0 }
  }
  if (confirmations >= CONFIRMATION_THRESHOLD_STANDARD) {
    const remaining = CONFIRMATION_THRESHOLD_SECURE - confirmations
    return { label: 'standard', remainingSeconds: remaining * AVG_BLOCK_TIME_SECONDS }
  }
  if (confirmations >= CONFIRMATION_THRESHOLD_FAST) {
    const remaining = CONFIRMATION_THRESHOLD_STANDARD - confirmations
    return { label: 'fast', remainingSeconds: remaining * AVG_BLOCK_TIME_SECONDS }
  }
  const remaining = CONFIRMATION_THRESHOLD_FAST - confirmations
  return { label: 'confirming', remainingSeconds: remaining * AVG_BLOCK_TIME_SECONDS }
}

class TxConfirmations extends React.Component {
  render() {
    const { req } = this.props
    const confirmations = req.tx && req.tx.confirmations ? req.tx.confirmations : 0

    return (
      <div className='monitorConfirms'>
        {[...Array(CONFIRMATION_SLOTS).keys()].map((i) => {
          const monitorConfirmsItem =
            confirmations > i ? 'txProgressConfirmsItem txProgressConfirmsItemGood' : 'txProgressConfirmsItem'
          return (
            <div key={i} className={monitorConfirmsItem}>
              {svg.arrowRight(11)}
            </div>
          )
        })}
      </div>
    )
  }
}

export default Restore.connect(TxConfirmations)
