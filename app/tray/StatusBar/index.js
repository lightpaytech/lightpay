import React from 'react'
import Restore from 'react-restore'
import link from '../../../resources/link'

class Bridge extends React.Component {
  render() {
    const statusIndicator = this.store('view.statusIndicator') || {}

    if (statusIndicator.type === 'updateReady') {
      return (
        <div className='statusWrap'>
          <div className='statusIndicator vaultCardShow' style={{ transform: 'translateY(0px)', height: '196px' }}>
            <div className='badgeInner'>
              <div className='badgeMessage'>Your update is ready, restart LightPay to switch?</div>
              <div className='badgeInput'>
                <div className='badgeInputButton'>
                  <div
                    className='statusInputInner'
                    onMouseDown={() => link.send('tray:updateRestart')}
                    style={{ color: 'var(--good)' }}
                  >
                    Restart Now
                  </div>
                </div>
              </div>
              <div className='badgeInput'>
                <div className='badgeInputButton'>
                  <div
                    className='statusInputInner'
                    onMouseDown={() => link.send('tray:action', 'updateBadge', '')}
                    style={{ color: 'var(--bad)' }}
                  >
                    Restart Later
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )
    } else if (statusIndicator.type === 'updateAvailable') {
      return (
        <div className='statusWrap'>
          <div className='statusIndicator vaultCardShow' style={{ transform: 'translateY(0px)', height: '224px' }}>
            <div className='badgeInner'>
              <div className='badgeMessage'>
                Version {statusIndicator.version} is available, would you like to install it?
              </div>
              <div className='badgeInput'>
                <div className='badgeInputButton'>
                  <div
                    className='statusInputInner'
                    onMouseDown={() => {
                      link.send('tray:installAvailableUpdate', statusIndicator.version)
                    }}
                    style={{ color: 'var(--good)' }}
                  >
                    Install Update
                  </div>
                </div>
              </div>
              <div className='badgeInput'>
                <div className='badgeInputButton'>
                  <div
                    className='statusInputInner'
                    onMouseDown={() => {
                      link.send('tray:dismissUpdate', statusIndicator.version, true)
                    }}
                    style={{ color: 'var(--bad)' }}
                  >
                    Remind Me Later
                  </div>
                </div>
              </div>
              <div className='badgeInput'>
                <div className='badgeInputButton'>
                  <div
                    className='statusInputInner statusInputSmall'
                    onMouseDown={() => {
                      link.send('tray:dismissUpdate', statusIndicator.version, false)
                    }}
                  >
                    Skip This Version
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )
    } else {
      return null
    }
  }
}

export default Restore.connect(Bridge)
