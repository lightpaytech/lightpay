import * as Sentry from '@sentry/electron'
import { createRoot } from 'react-dom/client'
import Restore from 'react-restore'

import App from './DashApp'

import link from '../../resources/link'
import appStore from '../store'

// LightPay Dashboard — portfolio & wallet management
const LIGHTPAY_VERSION = require('../../package.json').version

Sentry.init({ dsn: process.env.SENTRY_DSN || '' })

document.addEventListener('dragover', (e) => e.preventDefault())
document.addEventListener('drop', (e) => e.preventDefault())

if (process.env.NODE_ENV !== 'development') {
  window.eval = global.eval = () => {
    throw new Error(`This app does not support window.eval()`)
  } // eslint-disable-line
}

function AppComponent() {
  return <App />
}

link.rpc('getState', (err, state) => {
  if (err) return console.error('Could not get initial state from main')
  const store = appStore(state)
  window.store = store
  document.title = `LightPay v${LIGHTPAY_VERSION}`
  store.observer(() => {
    document.body.classList.remove('dark', 'light')
    document.body.classList.add('clip', store('main.colorway'))
    setTimeout(() => {
      document.body.classList.remove('clip')
    }, 100)
  })
  const root = createRoot(document.getElementById('dash'))
  const Dash = Restore.connect(AppComponent, store)
  root.render(<Dash />)
})

document.addEventListener('contextmenu', (e) => {
  const modifierKeyPressed = e.ctrlKey || e.metaKey
  link.send('*:contextmenu', e.clientX, e.clientY, modifierKeyPressed)
})

// document.addEventListener('mouseout', e => { if (e.clientX < 0) link.send('tray:mouseout') })
// document.addEventListener('contextmenu', e => link.send('tray:contextmenu', e.clientX, e.clientY))
