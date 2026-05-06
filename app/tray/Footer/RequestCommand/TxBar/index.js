import React from 'react'
import Restore from 'react-restore'
import svg from '../../../../../resources/svg'

// Named constants for progress bar slide positions (right offset per step)
const SLIDE_POSITIONS = ['375px', '268.5px', '181px', '93.5px', '0px']
const POSITION_COMPLETE = 4

// Map of tx status strings to their numeric progress step
const STATUS_POSITION = {
  pending: 1,
  sending: 2,
  verifying: 3,
  verified: 4,
  confirming: 4,
  confirmed: 4,
  sent: 4,
  error: 4,
  declined: 4
}

// Returns a human-readable gas estimate string from a hex or decimal gasLimit and gwei price
export function formatGasEstimate(gasLimit, gasPriceGwei) {
  if (!gasLimit || !gasPriceGwei) return null
  const limit = typeof gasLimit === 'string' ? parseInt(gasLimit, 16) : Number(gasLimit)
  const price = Number(gasPriceGwei)
  if (isNaN(limit) || isNaN(price)) return null
  const costGwei = limit * price
  const costEth = (costGwei / 1e9).toFixed(6)
  return `~${costEth} ETH`
}

class TxBar extends React.Component {
  getPositionAndClasses(status) {
    const position = STATUS_POSITION[status] ?? 0
    let txBarClass = 'txBar'
    let progressIconClass = 'txProgressStepIcon'

    if (status === 'confirming' || status === 'confirmed' || status === 'sent') {
      progressIconClass += ' txProgressStepIconHidden'
      txBarClass += ' txBarSuccess'
    } else if (status === 'error' || status === 'declined') {
      progressIconClass += ' txProgressStepIconHidden'
      txBarClass += ' txBarError'
    }

    return { position, txBarClass, progressIconClass }
  }

  render() {
    const req = this.props.req
    const { position, txBarClass, progressIconClass } = this.getPositionAndClasses(req.status)
    const slide = SLIDE_POSITIONS[position]

    return (
      <div className={txBarClass}>
        <div className='txProgress'>
          <div className='txProgressBack'>
            <div className='txProgressLine' />
            <div className='txProgressSteps'>
              <div className='txProgressStep'>
                <div
                  className={progressIconClass}
                  style={{ padding: '10px 11px' }}
                  onClick={() => this.props.infoPane('sign')}
                  onMouseLeave={() => this.props.infoPane('')}
                >
                  {svg.sign(22)}
                </div>
                <div className='txProgressStepMarker' />
                <div
                  className={
                    position > 1 ? 'txProgressStepCenter txProgressStepCenterOn' : 'txProgressStepCenter'
                  }
                />
              </div>
              <div className='txProgressStep'>
                <div
                  className={progressIconClass}
                  style={{ padding: '11px 12px' }}
                  onClick={() => this.props.infoPane('send')}
                  onMouseLeave={() => this.props.infoPane('')}
                >
                  {svg.send(15)}
                </div>
                <div className='txProgressStepMarker' />
                <div
                  className={
                    position > 2 ? 'txProgressStepCenter txProgressStepCenterOn' : 'txProgressStepCenter'
                  }
                />
              </div>
              <div className='txProgressStep'>
                <div
                  className={progressIconClass}
                  style={{ padding: '11px 12px' }}
                  onClick={() => this.props.infoPane('block')}
                  onMouseLeave={() => this.props.infoPane('')}
                >
                  {svg.cube(16)}
                </div>
                <div className='txProgressStepMarker' />
                <div
                  className={
                    position > 3 ? 'txProgressStepCenter txProgressStepCenterOn' : 'txProgressStepCenter'
                  }
                />
              </div>
            </div>
          </div>
          <div className='txProgressFront'>
            <div className='txProgressSlide' style={{ right: slide }}>
              <div className='txProgressTail' />
              {position < POSITION_COMPLETE && (
                <div className='txProgressLoading'>
                  <div className='txProgressLoadingDot' />
                  <div className='txProgressLoadingCenter' />
                  <div className='txProgressLoadingBox' />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }
}

export default Restore.connect(TxBar)
