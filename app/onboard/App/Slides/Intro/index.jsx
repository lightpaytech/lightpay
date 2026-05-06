import React, { useEffect } from 'react'

import { Slide, SlideBody, SlideItem } from '../../styled'

const FEATURES = ['Non-custodial', 'Multi-chain', 'System-wide']

const Intro = ({ setTitle, setProceed, version }) => {
  useEffect(() => {
    setTitle(`Welcome to LightPay v${version}`)
    setProceed({ action: 'next', text: 'Get started' })
  }, [])
  return (
    <Slide>
      <SlideBody>
        <SlideItem>
          <div className='onboardTitle'>
            {'Your keys. '}
            <span className='onboardTitleHighlight'>Your wallet.</span>
          </div>
        </SlideItem>
        <SlideItem>
          <div className='onboardSubtitle'>
            LightPay holds your keys locally and lets every Mac app reach the blockchain on your terms.
          </div>
        </SlideItem>
        <SlideItem>
          <div className='onboardFeatureList'>
            {FEATURES.map((label) => (
              <div key={label} className='onboardFeatureItem'>
                <div className='onboardFeatureDot' />
                <span className='onboardFeatureText'>{label}</span>
              </div>
            ))}
          </div>
        </SlideItem>
      </SlideBody>
    </Slide>
  )
}

export default Intro
