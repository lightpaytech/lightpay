import { globalShortcut } from 'electron'
import log from 'electron-log'

import { shortcutKeyMap } from '../../resources/keyboard/mappings'
import type { Shortcut } from '../store/state/types/shortcuts'

const KEY_SEPARATOR = '+'
const LOG_PREFIX_REGISTER = 'Registering'
const LOG_PREFIX_UNREGISTER = 'Unregistering'

function lookupKey(shortcutKey: string): string {
  return (shortcutKeyMap as Record<string, string>)[shortcutKey] || shortcutKey
}

function stringifyShortcut({ modifierKeys, shortcutKey }: Shortcut) {
  const shortcutString = [...modifierKeys, shortcutKey].join(KEY_SEPARATOR)
  const accelerator = [...modifierKeys.slice().sort(), lookupKey(shortcutKey)].join(KEY_SEPARATOR)
  return { shortcutString, accelerator }
}

export function getShortcutDescription(shortcutKey: string): string {
  if (!shortcutKey) {
    return 'No key assigned'
  }
  return `Triggers on key: ${lookupKey(shortcutKey)}`
}

function unregister(shortcut: Shortcut) {
  const { shortcutString, accelerator } = stringifyShortcut(shortcut)

  log.verbose(`${LOG_PREFIX_UNREGISTER} accelerator "${accelerator}" for shortcut: ${shortcutString}`)

  try {
    globalShortcut.unregister(accelerator)
  } catch (e) {
    log.error(`Failed to unregister accelerator "${accelerator}" for shortcut: ${shortcutString}`, e)
  }
}

function register(shortcut: Shortcut, shortcutHandler: (accelerator: string) => void) {
  if (!shortcut.enabled || shortcut.configuring) {
    return
  }

  const { shortcutString, accelerator } = stringifyShortcut(shortcut)

  log.verbose(`${LOG_PREFIX_REGISTER} accelerator "${accelerator}" for shortcut: ${shortcutString}`)

  try {
    globalShortcut.register(accelerator, () => shortcutHandler(accelerator))
    log.info(`Accelerator "${accelerator}" registered for shortcut: ${shortcutString}`)
  } catch (e) {
    log.error(`Failed to register accelerator "${accelerator}" for shortcut: ${shortcutString}`, e)
  }
}

export const registerShortcut = (shortcut: Shortcut, shortcutHandler: (accelerator: string) => void) => {
  unregister(shortcut)
  register(shortcut, shortcutHandler)
}
