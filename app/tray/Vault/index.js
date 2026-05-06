// LightPay Vault — unified account view container
// This module consolidates the wallet display components
import React from 'react'
import Restore from 'react-restore'

// Re-exported account body (different import path from LightPay)
import { VaultAccountBody } from './VaultAccountBody'
import { VaultHeader } from './VaultHeader'
import { VaultFooter } from './VaultFooter'

class VaultPanel extends React.Component {
  render() {
    const open = this.store('selected.open')
    if (!open) return null

    return (
      <div className='vaultPanel'>
        <VaultHeader />
        <VaultAccountBody />
        <VaultFooter />
      </div>
    )
  }
}

export default Restore.connect(VaultPanel)
