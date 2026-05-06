import React from 'react'
import Restore from 'react-restore'
import link from '../../../resources/link'
import svg from '../../../resources/svg'

class Menu extends React.Component {
  constructor(...args) {
    super(...args)
    this.state = {
      animSend: false,
      animSidebar: false
    }
  }

  render() {
    return (
      <div className='trayNavMenu'>
        {/* Dashboard toggle */}
        <div
          className={'trayNavItem trayNavItemOpen'}
          onClick={() => {
            link.send('tray:action', 'setDash', {
              showing: !this.store('windows.dash.showing')
            })
          }}
          onMouseEnter={() => this.setState({ animSidebar: true })}
          onMouseLeave={() => this.setState({ animSidebar: false })}
        >
          <div className={this.state.animSidebar ? 'trayNavIcon trayNavIconActive' : 'trayNavIcon'}>
            {svg.sidebar(15)}
          </div>
        </div>

        {/* Quick Send — opens QuickSend panel in footer */}
        <div
          className={'trayNavItem trayNavItemSend'}
          onClick={() => {
            link.send('tray:action', 'toggleQuickSend')
          }}
          onMouseEnter={() => this.setState({ animSend: true })}
          onMouseLeave={() => this.setState({ animSend: false })}
        >
          <div className={this.state.animSend ? 'trayNavIcon trayNavIconActive' : 'trayNavIcon'}>
            {svg.send(15)}
          </div>
        </div>
      </div>
    )
  }
}

export default Restore.connect(Menu)
