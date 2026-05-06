import { z } from 'zod'

const supportedModifierKey = z.enum(['Alt', 'CommandOrCtrl', 'Control', 'Meta', 'Super'])

const supportedShortcutKey = z.enum([
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'ArrowUp',
  'Comma',
  'Digit0',
  'Digit1',
  'Digit2',
  'Digit3',
  'Digit4',
  'Digit5',
  'Digit6',
  'Digit7',
  'Digit8',
  'Digit9',
  'Enter',
  'Escape',
  'F1',
  'F10',
  'F11',
  'F2',
  'F3',
  'F4',
  'F5',
  'F6',
  'F7',
  'F8',
  'F9',
  'Forwardslash',
  'KeyA',
  'KeyB',
  'KeyC',
  'KeyD',
  'KeyE',
  'KeyF',
  'KeyG',
  'KeyH',
  'KeyI',
  'KeyJ',
  'KeyK',
  'KeyL',
  'KeyM',
  'KeyN',
  'KeyO',
  'KeyP',
  'KeyQ',
  'KeyR',
  'KeyS',
  'KeyT',
  'KeyU',
  'KeyV',
  'KeyW',
  'KeyX',
  'KeyY',
  'KeyZ',
  'Numpad0',
  'Numpad1',
  'Numpad2',
  'Numpad3',
  'Numpad4',
  'Numpad5',
  'Numpad6',
  'Numpad7',
  'Numpad8',
  'Numpad9',
  'NumpadAdd',
  'NumpadDecimal',
  'NumpadDivide',
  'NumpadMultiply',
  'NumpadSubtract',
  'Period',
  'Slash',
  'Space',
  'Tab'
])

export const ShortcutSchema = z.object({
  /** Whether the shortcut is currently being reconfigured in the UI */
  configuring: z.boolean().default(false),
  /** Whether the shortcut is active */
  enabled: z.boolean().default(true),
  /** Modifier keys that must be held (e.g. Alt, Control) */
  modifierKeys: z.array(supportedModifierKey).default([]),
  /** The primary trigger key */
  shortcutKey: supportedShortcutKey
})

export type ModifierKey = z.infer<typeof supportedModifierKey>
export type ShortcutKey = z.infer<typeof supportedShortcutKey>
export type Shortcut = z.infer<typeof ShortcutSchema>

/** Type guard — narrows unknown to Shortcut */
export function validateShortcut(obj: unknown): obj is Shortcut {
  return ShortcutSchema.safeParse(obj).success
}
