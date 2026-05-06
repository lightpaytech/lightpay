import React from 'react'
import Restore from 'react-restore'
import AccountModule from '../Account/WalletPanel'

// VaultAccountBody is the main content area showing wallet modules
export class VaultAccountBody extends React.Component {
  render() {
    const current = this.store('selected.current')
    const accounts = this.store('main.accounts')
    const currentAccount = accounts[current]

    if (!currentAccount) return null

    return (
      <div className='vaultPanelBody'>
        <AccountModule key={current} {...currentAccount} index={1} />
      </div>
    )
  }
}

export default Restore.connect(VaultAccountBody)
