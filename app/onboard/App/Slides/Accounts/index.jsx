import React, { useEffect } from 'react'

import { Slide, SlideBody, SlideItem } from '../../styled'

import link from '../../../../../resources/link'

const Chains = ({ setTitle, setProceed }) => {
  useEffect(() => {
    setTitle('Wallets')
    setProceed({ action: 'next', text: 'Continue' })
    link.send('tray:action', 'navDash', { view: 'accounts', data: {} })
  }, [])

  return (
    <Slide>
      <SlideBody>
        <SlideItem>
          <div>LightPay lets you keep every wallet and signer</div>
          <div>side by side in one familiar place.</div>
        </SlideItem>
        <SlideItem>
          <div>To create your first wallet, hit "Add New Wallet"</div>
          <div>at the bottom of the Wallets panel.</div>
        </SlideItem>
      </SlideBody>
    </Slide>
  )
}

export default Chains
