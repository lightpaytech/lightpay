import React, { useEffect } from 'react'
import link from '../../../../../resources/link'
import svg from '../../../../../resources/svg'

import { Slide, SlideBody, SlideItem, Tag } from '../../styled'

const Extension = ({ setTitle, setProceed }) => {
  useEffect(() => {
    setTitle('Browser Extension')
    setProceed({ action: 'next', text: 'Continue' })
  }, [])
  return (
    <Slide>
      <SlideBody>
        <SlideItem>
          <div>For dapps that don't speak to LightPay directly,</div>
          <div>our <Tag>LightPay Companion</Tag> extension bridges</div>
          <div>the gap straight from your browser.</div>
        </SlideItem>
        <SlideItem>
          <div>Pick your browser below to grab the</div>
          <div>extension from its store:</div>
        </SlideItem>
        <div
          style={{
            display: 'flex',
            justifyContent: 'center'
          }}
        >
          <div
            style={{ padding: '10px', cursor: 'pointer' }}
            onClick={() =>
              link.send(
                'tray:openExternal',
                'https://chrome.google.com/webstore/detail/lightpay/ldcoohedfbjoobcadoglnnmmfbdlmmhf'
              )
            }
          >
            {svg.chrome(48)}
          </div>
          <div
            style={{ padding: '10px', cursor: 'pointer' }}
            onClick={() =>
              link.send('tray:openExternal', 'https://addons.mozilla.org/en-US/firefox/addon/lightpay-extension')
            }
          >
            {svg.firefox(48)}
          </div>
        </div>
      </SlideBody>
    </Slide>
  )
}

export default Extension
