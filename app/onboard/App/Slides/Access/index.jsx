import React, { useState, useEffect } from 'react'

import { Slide, SlideBody, SlideItem, Shortcut } from '../../styled'

import link from '../../../../../resources/link'

import { getDisplayShortcut } from '../../../../../resources/keyboard'

const Access = ({ setTitle, setProceed, platform }) => {
  const { modifierKeys, shortcutKey } = getDisplayShortcut(platform, store('main.shortcuts.summon'))
  const keyboardShortcut = modifierKeys.concat(shortcutKey).join(' + ')
  const [shortcutActivated, setShortcutActivated] = useState(false)
  const [trayOpen, setTrayOpen] = useState(store('tray.open'))

  useEffect(() => {
    const handler = (event) => {
      if (event === 'shortcutActivated') setShortcutActivated(true)
    }

    link.send('tray:action', 'navDash', { view: 'settings', data: {} })
    link.on('flex', handler)

    const obs = store.observer(() => {
      setTrayOpen(store('tray.open'))
    })

    return () => {
      link.off('flex', handler)
      obs.remove()
    }
  }, [])

  useEffect(() => {
    if (trayOpen && !shortcutActivated) {
      setTitle(`Let's begin...`)
      setProceed({ action: 'skip', text: 'skip this step' })
    } else if (!trayOpen) {
      setTitle('Bring LightPay back')
      setProceed({ action: 'skip', text: 'skip this step' })
    } else {
      setTitle('Auto-hide')
      setProceed({ action: 'next', text: 'Continue' })
    }
  }, [trayOpen, shortcutActivated])

  return (
    <Slide>
      {trayOpen && !shortcutActivated ? (
        <SlideBody key={1}>
          <SlideItem>
            <div>Pop LightPay open or send it away</div>
            <div>any time with a keyboard shortcut.</div>
          </SlideItem>
          <SlideItem>
            <span>{'Try hiding LightPay now with '}</span>
            <Shortcut>{keyboardShortcut}</Shortcut>
          </SlideItem>
        </SlideBody>
      ) : !trayOpen ? (
        <SlideBody key={2}>
          <SlideItem>
            <span>{'Now bring it back the same way — '}</span>
            <Shortcut>{keyboardShortcut}</Shortcut>
          </SlideItem>
        </SlideBody>
      ) : (
        <SlideBody key={3}>
          <SlideItem>
            <div>Want LightPay to slip away when you're not</div>
            <div>using it? Switch on auto-hide and it stays</div>
            <div>tucked away until your next shortcut.</div>
          </SlideItem>
        </SlideBody>
      )}
    </Slide>
  )
}

export default Access
