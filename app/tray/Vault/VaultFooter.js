import React from 'react'
import Restore from 'react-restore'
import Footer from '../Footer'

// VaultFooter wraps the action footer in vault context
export class VaultFooter extends React.Component {
  render() {
    return (
      <div className='vaultPanelFooter'>
        <Footer />
      </div>
    )
  }
}

export default Restore.connect(VaultFooter)
