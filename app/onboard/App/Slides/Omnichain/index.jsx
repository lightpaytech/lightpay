import React, { useEffect } from 'react'

import { Slide, SlideBody, SlideItem, Tag } from '../../styled'

const OmnichainSlide = ({ setTitle, setProceed }) => {
  useEffect(() => {
    setTitle('Omnichain')
    setProceed({ action: 'next', text: 'Continue' })
  }, [])

  return (
    <Slide>
      <SlideBody>
        <SlideItem>
          <div>Omnichain routing lets a single dapp talk to</div>
          <div>several networks at once, so multichain apps</div>
          <div>just work — no juggling required.</div>
        </SlideItem>
      </SlideBody>
    </Slide>
  )
}

export default OmnichainSlide
