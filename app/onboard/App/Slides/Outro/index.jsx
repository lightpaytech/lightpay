import React, { useEffect } from 'react'

import { Slide, SlideBody, SlideItem } from '../../styled'

const Outro = ({ setTitle, setProceed }) => {
  useEffect(() => {
    setTitle(`You're ready to go`)
    setProceed({ action: 'complete', text: 'Finish' })
  }, [])
  return (
    <Slide>
      <SlideBody>
        <SlideItem>
          <div className='onboardCheckmark'>
            <svg viewBox='0 0 24 24' aria-hidden='true'>
              <polyline points='20 6 9 17 4 12' />
            </svg>
          </div>
        </SlideItem>
        <SlideItem>
          <div className='onboardTitle'>You&apos;re ready to go</div>
        </SlideItem>
        <SlideItem>
          <div className='onboardSubtitle'>
            LightPay is set up and waiting. Tap the menu bar icon any time to open your wallet.
          </div>
        </SlideItem>
      </SlideBody>
    </Slide>
  )
}

export default Outro
