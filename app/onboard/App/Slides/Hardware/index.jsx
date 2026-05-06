import React, { useEffect } from 'react'
import link from '../../../../../resources/link'
import svg from '../../../../../resources/svg'

import { Slide, SlideBody, SlideItem, Tag } from '../../styled'

const Extension = ({ setTitle, setProceed }) => {
  useEffect(() => {
    setTitle('Hardware Signers')
    setProceed({ action: 'next', text: 'Continue' })
  }, [])
  return (
    <Slide>
      <SlideBody>
        <SlideItem>
          <div>LightPay works with all major hardware signers —</div>
          <div>Ledger, GridPlus and Trezor are supported today.</div>
        </SlideItem>
        <SlideItem>
          <div>For high-value wallets, always pair a hardware signer</div>
          <div>and double-check every transaction on the device.</div>
        </SlideItem>
        <SlideItem>
          <div>Don't have one yet?</div>
        </SlideItem>
        <div
          style={{
            display: 'flex',
            justifyContent: 'center'
          }}
        >
          <div
            style={{ padding: '10px', cursor: 'pointer' }}
            onClick={() => link.send('tray:openExternal', '<>')}
          >
            {svg.ledger(48)}
          </div>
          <div
            style={{ padding: '10px', cursor: 'pointer' }}
            onClick={() => link.send('tray:openExternal', '<>')}
          >
            {svg.trezor(48)}
          </div>
        </div>
      </SlideBody>
    </Slide>
  )
}

export default Extension
