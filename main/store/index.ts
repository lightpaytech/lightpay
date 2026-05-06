import Restore from 'react-restore'
import state from './state'
import * as actions from './actions'
import persist from './persist'

// TODO: Layer persisted state on top of initial state

const store = Restore.create(state(), actions)

// Persist initial full state snapshot
persist.set('main', store('main') as unknown)

// Forward incremental state updates to the persistence layer
store.api.feed((currentState: unknown, actionBatch: Array<{ updates: Array<{ path: string; value: unknown }> }>) => {
  actionBatch.forEach((action) => {
    action.updates.forEach((update) => {
      persist.queue(update.path, update.value)
    })
  })
})

export default store
