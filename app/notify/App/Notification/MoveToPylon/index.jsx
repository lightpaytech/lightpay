import React, { useEffect } from 'react'

import link from '../../../../../resources/link'

import { Body, Item, Title, PylonConfirm, PylonConfirmButton, PylonConfirmButtonSub } from '../../styled'

const MoveToPylon = () => {
  return (
    <>
      <Title>{'Connection Update'}</Title>
      <Body>
        <Item>
          <div>LightPay uses secure, direct RPC connections</div>
          <div>to keep your chain data private and reliable.</div>
        </Item>
        <Item>
          <div>Some previously configured chain presets have been</div>
          <div>updated to use LightPay's recommended connection settings.</div>
        </Item>
        <Item>
          <div>You can always set a custom RPC endpoint for any chain</div>
          <div>by selecting the "custom" preset in the Chains panel.</div>
        </Item>
      </Body>
      <PylonConfirm>
        <PylonConfirmButton
          onClick={() => {
            link.send('lightpay:close')
          }}
        >
          {'Got It'}
        </PylonConfirmButton>
        <PylonConfirmButtonSub
          onClick={() => {
            link.send('tray:action', 'mutePylonMigrationNotice')
            link.send('lightpay:close')
          }}
        >
          {'Use Custom Preset'}
        </PylonConfirmButtonSub>
      </PylonConfirm>
    </>
  )
}

export default MoveToPylon
