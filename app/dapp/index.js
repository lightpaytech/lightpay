import * as Sentry from '@sentry/electron'
import { createRoot } from 'react-dom/client'
import Restore from 'react-restore'

import App from './App'

import link from '../../resources/link'
import appStore from '../store'

// Named constants
const COLORWAY_TRANSITION_MS = 100
const SENTRY_DSN = process.env.SENTRY_DSN || ''

// Connection state — tracks whether this dapp window has a live frameId and store
const connectionState = {
  frameId: null,
  connected: false,
  connectedAt: null
}

Sentry.init({ dsn: SENTRY_DSN })

document.addEventListener('dragover', (e) => e.preventDefault())
document.addEventListener('drop', (e) => e.preventDefault())

if (process.env.NODE_ENV !== 'development') {
  window.eval = global.eval = () => {
    throw new Error(`This app does not support window.eval()`)
  } // eslint-disable-line
}

// Returns a snapshot of the dapp window connection info for diagnostics
export function getDappInfo() {
  return {
    frameId: connectionState.frameId,
    connected: connectionState.connected,
    connectedAt: connectionState.connectedAt,
    origin: window.location.origin
  }
}

function AppComponent() {
  return <App />
}

link.rpc('getFrameId', (err, frameId) => {
  if (err) return console.error('Could not get frameId from main', err)
  window.frameId = frameId
  connectionState.frameId = frameId

  link.rpc('getState', (err, state) => {
    if (err) return console.error('Could not get initial state from main')
    const store = appStore(state)
    window.store = store
    connectionState.connected = true
    connectionState.connectedAt = Date.now()

    store.observer(() => {
      document.body.classList.remove('dark', 'light')
      document.body.classList.add('clip', 'light')
      setTimeout(() => {
        document.body.classList.remove('clip')
      }, COLORWAY_TRANSITION_MS)
    })
    const root = createRoot(document.getElementById('dapp'))
    const Dapp = Restore.connect(AppComponent, store)
    root.render(<Dapp />)
  })
})

document.addEventListener('contextmenu', (e) => {
  const modifierKeyPressed = e.ctrlKey || e.metaKey
  link.send('*:contextmenu', e.clientX, e.clientY, modifierKeyPressed)
})
