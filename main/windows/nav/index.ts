// Manage navigation states for each window

import { ipcMain } from 'electron'

import store from '../../store'
import type { Breadcrumb } from './breadcrumb'

// Named constants
const NAV_EVENT_FORWARD = 'nav:forward'
const NAV_EVENT_BACK = 'nav:back'
const NAV_EVENT_UPDATE = 'nav:update'
const NAV_DEFAULT_BACK_STEPS = 1

// Returns the depth (number of crumbs) of a navigation stack
export function getNavDepth(crumbs: Breadcrumb[]): number {
  if (!Array.isArray(crumbs)) return 0
  return crumbs.length
}

const nav = {
  forward: (windowId: string, crumb: Breadcrumb) => {
    // Adds new crumb to nav array
    store.navForward(windowId, crumb)
  },
  back: (windowId: string, steps = NAV_DEFAULT_BACK_STEPS) => {
    // Removes last crumb from nav array
    store.navBack(windowId, steps)
  },
  update: (windowId: string, crumb: Breadcrumb, navigate = true) => {
    // Updated last crumb in nav array with new data
    // Replaces last crumb when navigate is false
    // Adds new crumb to nav array when navigate is true
    store.navUpdate(windowId, crumb, navigate)
  }
}

ipcMain.on(NAV_EVENT_FORWARD, (e, windowId: string, crumb: Breadcrumb) => {
  nav.forward(windowId, crumb)
})

ipcMain.on(NAV_EVENT_BACK, (e, windowId: string, steps = NAV_DEFAULT_BACK_STEPS) => {
  nav.back(windowId, steps)
})

ipcMain.on(NAV_EVENT_UPDATE, (e, windowId: string, crumb: Breadcrumb, navigate: boolean) => {
  nav.update(windowId, crumb, navigate)
})

export default nav
