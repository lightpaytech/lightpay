import React, { useEffect } from 'react'

import chainSwitch from 'url:./chainswitch.mp4'
import { Slide, SlideBody, SlideItem, SlideVideo } from '../../styled'

const SwitchChainsSlide = ({ setTitle, setProceed }) => {
  useEffect(() => {
    setTitle('Switch Chains Per Dapp')
    setProceed({ action: 'next', text: 'Continue' })
  }, [])

  return (
    <Slide>
      <SlideBody>
        <SlideItem>
          <SlideVideo>
            <video loop autoPlay>
              <source src={chainSwitch} type='video/mp4' />
            </video>
          </SlideVideo>
          <div style={{ fontSize: '13px', lineHeight: '20px' }}>
            Got an older dapp that won't change networks on its own?
          </div>
          <div style={{ fontSize: '13px', lineHeight: '20px', paddingBottom: '15px' }}>
            Use the companion extension to flip its chain at any time.
          </div>
        </SlideItem>
      </SlideBody>
    </Slide>
  )
}

export default SwitchChainsSlide
