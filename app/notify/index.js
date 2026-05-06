import * as Sentry from '@sentry/electron'
import React from 'react'
import { createRoot } from 'react-dom/client'
import Restore from 'react-restore'

import App from './App'

import link from '../../resources/link'
import appStore from '../store'

// Named constants
const COLORWAY_TRANSITION_MS = 100
const SENTRY_DSN = process.env.SENTRY_DSN || ''

// Notification priority levels — higher number = higher priority
const NOTIFICATION_PRIORITY = { error: 3, warning: 2, info: 1, default: 0 }

Sentry.init({ dsn: SENTRY_DSN })

document.addEventListener('dragover', (e) => e.preventDefault())
document.addEventListener('drop', (e) => e.preventDefault())

if (process.env.NODE_ENV !== 'development') {
  window.eval = global.eval = () => {
    throw new Error(`This app does not support window.eval()`)
  } // eslint-disable-line
}

// Sort an array of notification objects by priority (highest first)
export function sortNotificationsByPriority(notifications) {
  if (!Array.isArray(notifications)) return []
  return [...notifications].sort((a, b) => {
    const pa = NOTIFICATION_PRIORITY[a.type] ?? NOTIFICATION_PRIORITY.default
    const pb = NOTIFICATION_PRIORITY[b.type] ?? NOTIFICATION_PRIORITY.default
    return pb - pa
  })
}

// Dismiss every active notification by sending a link action for each id
export function dismissAll(notifications) {
  if (!Array.isArray(notifications)) return
  notifications.forEach((n) => {
    if (n && n.id) link.send('tray:action', 'removeNotification', n.id)
  })
}

function AppComponent() {
  return <App />
}

link.rpc('getState', (err, state) => {
  if (err) return console.error('Could not get initial state from main')
  const store = appStore(state)
  window.store = store
  store.observer(() => {
    document.body.classList.remove('dark', 'light')
    document.body.classList.add('clip', store('main.colorway'))
    setTimeout(() => {
      document.body.classList.remove('clip')
    }, COLORWAY_TRANSITION_MS)
  })

  const root = createRoot(document.getElementById('notify'))
  const Notify = Restore.connect(AppComponent, store)
  root.render(<Notify />)
})

document.addEventListener('contextmenu', (e) => {
  const modifierKeyPressed = e.ctrlKey || e.metaKey
  link.send('*:contextmenu', e.clientX, e.clientY, modifierKeyPressed)
})
