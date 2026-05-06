import type { Shortcut, ShortcutKey, ModifierKey } from '../../main/store/state/types/shortcuts'
import link from '../link'
import { Platform, metaKeyMap, shortcutKeyMap, isValidShortcut } from './mappings'

// ─── Types ────────────────────────────────────────────────────────────────────

export type KeyboardLayout = {
  get: (key: string) => string
}

// ─── Layout detection ─────────────────────────────────────────────────────────

// https://www.w3.org/TR/uievents-code/#keyboard-101
const isUSLayout = () => keyboardLayout?.get('Backslash') === '\\'
let keyboardLayout: KeyboardLayout | undefined

if (global?.navigator) {
  navigator.keyboard.getLayoutMap().then((layout) => {
    keyboardLayout = layout
    ;(link as any).send('tray:action', 'setKeyboardLayout', {
      isUS: isUSLayout()
    })
  })

  // TODO: keyboard layoutchange event listener when Electron supports it
  // navigator.keyboard.addEventListener('layoutchange', () => { keyboardLayout = layout })
}

// ─── Exports ──────────────────────────────────────────────────────────────────

/**
 * Returns true when the keyboard event's `code` field maps to a known
 * shortcut key in {@link shortcutKeyMap}.
 */
export const isShortcutKey = (keyEvent: KeyboardEvent) => isValidShortcut(keyEvent.code)

/**
 * Resolve a raw modifier key name to the display label appropriate for the
 * given platform (e.g. "Alt" → "Option" on macOS).
 *
 * @param key      - Modifier key name from the store
 * @param platform - Target platform identifier
 */
function getModifierKey(key: ModifierKey, platform: Platform) {
  const isMacOS = platform === 'darwin'

  if (key === 'Alt') {
    return isMacOS ? 'Option' : 'Alt'
  }

  if (key === 'Control' || key === 'CommandOrCtrl') {
    return isMacOS ? 'Control' : 'Ctrl'
  }

  if (key === 'Meta' || key === 'Super') {
    return metaKeyMap[platform]
  }

  return key
}

/**
 * Convert a stored `Shortcut` object into the platform-appropriate display
 * keys (modifier labels + shortcut key character).
 *
 * @param platform - The current OS platform
 * @param shortcut - The shortcut configuration from the store
 */
export const getDisplayShortcut = (platform: Platform, shortcut: Shortcut) => {
  const key = (keyboardLayout?.get(shortcut.shortcutKey) as ShortcutKey) || shortcut.shortcutKey

  // Upper-case single alphabetic characters for display consistency
  const shortcutKey =
    key.length === 1 && key.charCodeAt(0) >= 65 && key.charCodeAt(0) <= 122 ? key.toLocaleUpperCase() : key

  const modifierKeys = shortcut.modifierKeys.map((key) =>
    getModifierKey((keyboardLayout?.get(key) as ModifierKey) || key, platform)
  )

  return { modifierKeys, shortcutKey }
}

/**
 * Extract a `{ modifierKeys, shortcutKey }` object from a raw DOM keyboard
 * event, taking into account Windows AltGr handling.
 *
 * @param e                 - The `KeyboardEvent` fired by the browser
 * @param pressedKeyCodes   - Currently held key codes (for AltGr detection)
 * @param platform          - The current OS platform
 */
export const getShortcutFromKeyEvent = (e: KeyboardEvent, pressedKeyCodes: number[], platform: Platform) => {
  const isWindows = platform === 'win32'
  // AltGr on Windows sends both Ctrl (17) + Alt (18) simultaneously
  const altGrPressed = !e.altKey && pressedKeyCodes.includes(17) && pressedKeyCodes.includes(18)
  const modifierKeys = []

  if (isWindows && altGrPressed) {
    modifierKeys.push('Alt', 'Control')
  }
  if (e.altKey) {
    modifierKeys.push('Alt')
  }
  if (e.ctrlKey) {
    modifierKeys.push('Control')
  }
  if (e.metaKey) {
    modifierKeys.push('Meta')
  }

  return {
    modifierKeys,
    shortcutKey: e.code
  }
}
