import React, { useEffect } from 'react'

import { Slide, SlideBody, SlideItem } from '../../styled'

import link from '../../../../../resources/link'

const Chains = ({ setTitle, setProceed }) => {
  useEffect(() => {
    setTitle('Chains')
    setProceed({ action: 'next', text: 'Continue' })
    link.send('tray:action', 'navDash', { view: 'chains', data: {} })
  }, [])

  return (
    <Slide>
      <SlideBody>
        <SlideItem>
          <div>Now choose the chains you want active.</div>
        </SlideItem>
        <SlideItem>
          <div>LightPay ships with all the popular networks —</div>
          <div>flip the toggle to start using one.</div>
        </SlideItem>
        <SlideItem>
          <div>Need something custom? Use the button below the</div>
          <div>panel or let a dapp like chainlist.org add</div>
          <div>chains for you on the fly.</div>
        </SlideItem>
      </SlideBody>
    </Slide>
  )
}

export default Chains
