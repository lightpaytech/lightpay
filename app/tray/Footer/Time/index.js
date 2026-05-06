import React from 'react'
import Restore from 'react-restore'

// import Account from './Account'
// import TxBar from './TxBar'
// import TxConfirmations from './TxConfirmations'

// import svg from '../../../resources/svg'
// import link from '../../../resources/link'

// import { usesBaseFee } from '../../../resources/domain/transaction'

// Named constants
const TICK_INTERVAL_MS = 1000
const MS_PER_SECOND = 1000
const MS_PER_MINUTE = MS_PER_SECOND * 60
const MS_PER_HOUR = MS_PER_MINUTE * 60

// Format an absolute timestamp as a localised HH:MM string with optional timezone abbreviation
export function formatWallClock(timestamp, showTimezone = false) {
  const date = new Date(timestamp)
  const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  if (!showTimezone) return timeStr
  // Extract short timezone abbreviation from locale string (e.g. "PST", "GMT+2")
  const tzMatch = date.toTimeString().match(/\(([^)]+)\)/)
  const tz = tzMatch ? tzMatch[1].replace(/[a-z ]/g, '') : ''
  return tz ? `${timeStr} ${tz}` : timeStr
}

class Time extends React.Component {
  constructor(...args) {
    super(...args)
    this.state = {
      time: Date.now()
    }
    setInterval(() => {
      this.setState({ time: Date.now() })
    }, TICK_INTERVAL_MS)
  }

  msToTime(duration) {
    const seconds = Math.floor((duration / MS_PER_SECOND) % 60)
    const minutes = Math.floor((duration / MS_PER_MINUTE) % 60)
    const hours = Math.floor((duration / MS_PER_HOUR) % 24)
    let label = ''
    let time = ''
    if (hours) {
      label = hours === 1 ? 'hour ago' : 'hours ago'
      time = hours
    } else if (minutes) {
      label = minutes === 1 ? 'minute ago' : 'minutes ago'
      time = minutes
    } else {
      label = 'seconds ago'
      time = seconds
    }
    return { time, label }
  }

  render() {
    const { time, label } = this.msToTime(this.state.time - this.props.time)
    return (
      <div className='txProgressSuccessItem txProgressSuccessItemRight'>
        <div className='txProgressSuccessItemValue'>{time}</div>
        <div className='txProgressSuccessItemLabel'>{label}</div>
      </div>
    )
  }
}

export default Restore.connect(Time)
