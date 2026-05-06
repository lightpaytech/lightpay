import log from 'electron-log'

export default function inventory(pylon: any, store: Store) {
  function handleUpdates(updates: any[]) {
    if (updates.length === 0) return

    log.debug(`got inventory updates for ${updates.map((u) => u.id)}`)

    updates.forEach((update) => {
      store.setInventory(update.id, update.data.inventory)
    })
  }

  function start() {
    log.verbose('starting inventory updates')

    if (!pylon) {
      log.warn('inventory updates disabled: data client unavailable')
      return
    }

    pylon.on('inventories', handleUpdates)
  }

  function stop() {
    log.verbose('stopping inventory updates')

    if (!pylon) return

    pylon.inventories([])
    pylon.off('inventories', handleUpdates)
  }

  function setAddresses(addresses: Address[]) {
    log.verbose('setting addresses for inventory updates', addresses)

    if (!pylon) return

    pylon.inventories(addresses)
  }

  return {
    start,
    stop,
    setAddresses
  }
}
