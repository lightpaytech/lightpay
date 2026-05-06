import log from 'electron-log'
import { WorkerProcessCommand } from './process'

// Named constants
const WORKER_EVENT_ERROR = 'error'
const LOG_PREFIX_SENDING = 'child process with pid'
const LOG_PREFIX_RECEIVED = 'child process with pid'
const LOG_WARN_UNEXPECTED = 'received unexpected message:'
const LOG_ERROR_NO_SEND = 'cannot send to main process from worker!'

// Tracks the active state and PID of the current worker process context
export function getWorkerStatus(): { active: boolean; pid: number | null } {
  return {
    active: !!process.connected,
    pid: process.pid ?? null
  }
}

export function sendMessage(event: string, payload?: any) {
  log.debug(
    `${LOG_PREFIX_SENDING} ${process.pid} sending "${event}" event with payload: ${JSON.stringify(payload)}`
  )

  if (process.send) {
    process.send({ event, payload })
  } else {
    log.error(`${LOG_ERROR_NO_SEND} connected: ${process.connected} pid: ${process.pid}`)
  }
}

export function sendError(err: Error) {
  sendMessage(WORKER_EVENT_ERROR, err.message)
}

const messageHandlers: { [command: string]: (...params: any) => void } = {}

function handleMessageFromParent(message: WorkerProcessCommand) {
  log.debug(
    `${LOG_PREFIX_RECEIVED} ${process.pid} received message: ${message.command} ${JSON.stringify(
      message.args
    )}`
  )

  const args = message.args || []

  if (messageHandlers[message.command]) {
    messageHandlers[message.command](...args)
  } else {
    log.warn(`${LOG_WARN_UNEXPECTED.replace('received unexpected message:', `child process with pid ${process.pid} received unexpected message:`)} ${message.command}`)
  }
}

// calling this function has the side effect of adding a message listener to the process
// so it should only be called by a child process listening to messages from a main
// process via an IPC channel
export function addCommand(command: string, handler: (...params: any[]) => void) {
  if (process.listenerCount('message') === 0) {
    process.on('message', handleMessageFromParent)
  }

  messageHandlers[command] = handler
}
