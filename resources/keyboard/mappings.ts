import type { ShortcutKey } from '../../main/store/state/types/shortcuts'

// ─── Types ────────────────────────────────────────────────────────────────────

export type Platform = 'darwin' | 'win32' | 'linux'

// ─── Platform meta-key mapping ────────────────────────────────────────────────

/** Maps each platform to the label used for the OS "super" key in shortcuts */
export const metaKeyMap: Record<Platform, string> = {
  darwin: 'Command',
  win32:  'Win',
  linux:  'Meta'
}

// ─── ShortcutKey → display-character mapping ──────────────────────────────────
// Grouped by category for readability.

export const shortcutKeyMap: Record<ShortcutKey, string> = {
  // ── Punctuation / symbols ───────────────────────────────────────────────────
  Comma:        ',',
  Period:       '.',
  Forwardslash: '/',
  Slash:        '/',

  // ── Navigation keys ─────────────────────────────────────────────────────────
  Tab:        'Tab',
  Space:      'Space',
  Enter:      'Enter',
  Escape:     'Escape',
  ArrowUp:    'Up',
  ArrowDown:  'Down',
  ArrowLeft:  'Left',
  ArrowRight: 'Right',

  // ── Function keys ────────────────────────────────────────────────────────────
  F1:  'F1',
  F2:  'F2',
  F3:  'F3',
  F4:  'F4',
  F5:  'F5',
  F6:  'F6',
  F7:  'F7',
  F8:  'F8',
  F9:  'F9',
  F10: 'F10',
  F11: 'F11',

  // ── Digit row ────────────────────────────────────────────────────────────────
  Digit0: '0',
  Digit1: '1',
  Digit2: '2',
  Digit3: '3',
  Digit4: '4',
  Digit5: '5',
  Digit6: '6',
  Digit7: '7',
  Digit8: '8',
  Digit9: '9',

  // ── Letter keys ──────────────────────────────────────────────────────────────
  KeyA: 'a',
  KeyB: 'b',
  KeyC: 'c',
  KeyD: 'd',
  KeyE: 'e',
  KeyF: 'f',
  KeyG: 'g',
  KeyH: 'h',
  KeyI: 'i',
  KeyJ: 'j',
  KeyK: 'k',
  KeyL: 'l',
  KeyM: 'm',
  KeyN: 'n',
  KeyO: 'o',
  KeyP: 'p',
  KeyQ: 'q',
  KeyR: 'r',
  KeyS: 's',
  KeyT: 't',
  KeyU: 'u',
  KeyV: 'v',
  KeyW: 'w',
  KeyX: 'x',
  KeyY: 'y',
  KeyZ: 'z',

  // ── Numpad ───────────────────────────────────────────────────────────────────
  NumpadDivide:   'numdiv',
  NumpadMultiply: 'nummult',
  NumpadSubtract: 'numsub',
  NumpadAdd:      'numadd',
  NumpadDecimal:  'numdec',
  Numpad0: 'num0',
  Numpad1: 'num1',
  Numpad2: 'num2',
  Numpad3: 'num3',
  Numpad4: 'num4',
  Numpad5: 'num5',
  Numpad6: 'num6',
  Numpad7: 'num7',
  Numpad8: 'num8',
  Numpad9: 'num9'
}

// ─── Validation helper ────────────────────────────────────────────────────────

/**
 * Return true when `key` is a recognised shortcut key code (i.e. it has an
 * entry in {@link shortcutKeyMap}).
 *
 * Use this to guard user-provided shortcut key strings before passing them
 * into keyboard handling code.
 *
 * @param key - Raw key code string (e.g. "KeyA", "F5", "Numpad3")
 */
export function isValidShortcut(key: string): boolean {
  if (!key || typeof key !== 'string') return false
  return Object.prototype.hasOwnProperty.call(shortcutKeyMap, key)
}
