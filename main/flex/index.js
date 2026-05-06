// Flex is a reverse RPC interface for calling into the renderer's chromium process and receiving callbacks/events

const EventEmitter = require('events')
const { ipcMain } = require('electron')
const { v4: uuid } = require('uuid')
const log = require('electron-log')

const windows = require('../windows')

// Named constants
const FLEX_TRAY_CHANNEL = 'tray'
const FLEX_MAIN_CHANNEL = 'main:flex'
const FLEX_RESPONSE_EVENT = 'tray:flex:res'
const FLEX_EVENT_BROADCAST = 'tray:flex:event'
const FLEX_READY_EVENT = 'tray:ready'
const FLEX_MAX_LISTENERS = 128
const FLEX_NO_HANDLER_WARN = 'Message from main RPC had no handler'
const FLEX_READY_STATE_KEY = 'ready'

const defined = (value) => value !== undefined || value !== null

// Serialises a value for IPC transport
function serializeArg(arg) {
  return defined(arg) ? JSON.stringify(arg) : arg
}

// Deserialises a value received over IPC
function deserializeArg(arg) {
  return defined(arg) ? JSON.parse(arg) : arg
}

class Flex extends EventEmitter {
  setReady() {
    this.ready = true
    this.emit(FLEX_READY_STATE_KEY)
  }

  rpc(...args) {
    const cb = args.pop()
    if (typeof cb !== 'function') throw new Error('Flex methods require a callback')
    const id = uuid()
    handlers[id] = cb
    args = args.map(serializeArg)
    windows.send(FLEX_TRAY_CHANNEL, FLEX_MAIN_CHANNEL, JSON.stringify(id), ...args)
  }
}

const flex = new Flex()

flex.setMaxListeners(FLEX_MAX_LISTENERS)

const handlers = {}

ipcMain.on(FLEX_RESPONSE_EVENT, (sender, id, ...args) => {
  if (!handlers[id]) return log.warn(FLEX_NO_HANDLER_WARN)
  args = args.map(deserializeArg)
  handlers[id](...args)
  delete handlers[id]
})

ipcMain.on(FLEX_EVENT_BROADCAST, (sender, eventName, ...args) => {
  args = args.map(deserializeArg)
  flex.emit(eventName, ...args)
})

ipcMain.on(FLEX_READY_EVENT, () => flex.setReady())

// If flex is already ready, trigger new 'ready' listeners
flex.on('newListener', (e, listener) => {
  if (e === FLEX_READY_STATE_KEY && flex.ready) listener()
})

module.exports = flex
