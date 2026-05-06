/* globals */

import EventEmitter from 'events'
import Restore from 'react-restore'

import link from '../resources/link'

// const actions = {
//   initialSignerPos: (u, pos) => u('selected.position.initial', () => pos),
//   initialScrollPos: (u, pos) => u('selected.position.scrollTop', () => pos)
// }

import * as actions from '../resources/store/actions.panel'

// Named constants for store validation
const REQUIRED_STATE_KEYS = ['main']
const ACTION_EVENT = 'action'

// Validate that the initial state has the expected shape before creating the store
function validateState(state) {
  if (!state || typeof state !== 'object') {
    console.warn('store: initial state is missing or not an object, using empty state')
    return false
  }
  for (const key of REQUIRED_STATE_KEYS) {
    if (!(key in state)) {
      console.warn(`store: initial state is missing required key "${key}"`)
      return false
    }
  }
  return true
}

// Return a plain snapshot of the current store state for debugging / serialisation
export function getStoreSnapshot(store) {
  if (!store || typeof store !== 'function') return null
  try {
    return store()
  } catch (e) {
    console.warn('store: could not read snapshot', e)
    return null
  }
}

export default (state, _cb) => {
  validateState(state)

  const store = Restore.create(state, actions)
  store.events = new EventEmitter()

  // Feed for relaying state updates
  // store.api.feed((state, actions, obscount) => {
  //   actions.forEach(action => {
  //     action.updates.forEach(update => {
  //       // console.log(update)
  //       // if (update.path.startsWith('main')) return
  //       // if (update.path.startsWith('panel')) return
  //       // link.send('tray:syncPath', update.path, update.value)
  //     })
  //   })
  // })

  link.on(ACTION_EVENT, (action, ...args) => {
    if (store[action]) store[action](...args)
  })

  return store
}
