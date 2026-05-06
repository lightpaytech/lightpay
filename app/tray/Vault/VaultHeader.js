import React from 'react'
import Restore from 'react-restore'
import AccountSelector from '../WalletPicker'

// VaultHeader wraps the account selector carousel with vault context
export class VaultHeader extends React.Component {
  render() {
    return (
      <div className='vaultPanelHeader'>
        <AccountSelector />
      </div>
    )
  }
}

export default Restore.connect(VaultHeader)
