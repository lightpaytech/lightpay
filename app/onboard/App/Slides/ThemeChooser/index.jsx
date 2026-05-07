import React from 'react'
import Restore from 'react-restore'
import link from '../../../../../resources/link'

class ThemeChooser extends React.Component {
  constructor(...args) {
    super(...args)
    this.state = { selected: 'light' }
  }

  selectTheme(theme) {
    this.setState({ selected: theme })
    link.send('tray:action', 'setColorway', 'light')
  }

  render() {
    const { selected } = this.state

    return (
      <div className='onboardSlide themeChooserSlide'>
        <div className='onboardIcon'>
          <svg width='40' height='40' viewBox='0 0 40 40' fill='none' xmlns='http://www.w3.org/2000/svg'>
            <circle cx='20' cy='20' r='10' stroke='currentColor' strokeWidth='2.5' />
            <path d='M20 4V8M20 32V36M4 20H8M32 20H36M7.51 7.51L10.34 10.34M29.66 29.66L32.49 32.49M32.49 7.51L29.66 10.34M10.34 29.66L7.51 32.49' stroke='currentColor' strokeWidth='2' strokeLinecap='round' />
          </svg>
        </div>

        <div className='onboardTitle'>Ice Blue Theme</div>
        <div className='onboardSubtitle'>LightPay ships with a single, calm ice-blue theme so things stay easy on the eyes.</div>

        <div className='themeChooserGrid'>
          <div className={'themeChooserOption themeChooserOptionActive'}>
            <div className='themeChooserPreview themeChooserPreviewLight'>
              <div className='themeChooserPreviewBar' />
              <div className='themeChooserPreviewCard' />
              <div className='themeChooserPreviewCard themeChooserPreviewCardShort' />
            </div>
            <div className='themeChooserOptionLabel'>Ice Blue</div>
            <div className='themeChooserCheck'>
              <svg width='12' height='12' viewBox='0 0 12 12' fill='none' xmlns='http://www.w3.org/2000/svg'>
                <path d='M2 6L5 9L10 3' stroke='currentColor' strokeWidth='1.75' strokeLinecap='round' strokeLinejoin='round' />
              </svg>
            </div>
          </div>
        </div>
      </div>
    )
  }
}

export default Restore.connect(ThemeChooser)
