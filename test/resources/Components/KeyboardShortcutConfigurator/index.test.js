import React from 'react'

import link from '../../../../resources/link'
import { render, screen, cleanup } from '../../../componentSetup'

// ── Fixtures ─────────────────────────────────────────────────────────────────

const ACTION_TEXT     = 'Test this component'
const SHORTCUT_NAME   = 'Test'

const makeShortcut = (overrides = {}) => ({
  modifierKeys: ['Alt'],
  shortcutKey: 'Slash',
  enabled: true,
  configuring: false,
  ...overrides
})

const KEY_MAP = { Slash: '/' }

// ── Module setup ──────────────────────────────────────────────────────────────

let KeyboardShortcutConfigurator
let mockLayoutGetKey

jest.mock('../../../../resources/link', () => ({ send: jest.fn() }))

beforeEach(async () => {
  mockLayoutGetKey = jest.fn()
  global.navigator.keyboard = {}
  global.navigator.keyboard.getLayoutMap = jest.fn().mockResolvedValue({
    get: mockLayoutGetKey
  })
  KeyboardShortcutConfigurator = (
    await import('../../../../resources/Components/KeyboardShortcutConfigurator')
  ).default
  mockLayoutGetKey.mockImplementation((key) => KEY_MAP[key] || key)
})

afterEach(() => cleanup())

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('<KeyboardShortcutConfigurator />', () => {
  describe('rendering existing shortcuts', () => {
    it('renders an existing shortcut on Linux', () => {
      render(
        <KeyboardShortcutConfigurator
          actionText={ACTION_TEXT}
          platform='linux'
          shortcutName={SHORTCUT_NAME}
          shortcut={makeShortcut()}
        />
      )

      const displayedShortcut = screen.getByLabelText(`To ${ACTION_TEXT} press`)
      expect(displayedShortcut.textContent).toBe('Alt+/')
    })

    it('renders a Meta key shortcut as "Command" on MacOS', () => {
      render(
        <KeyboardShortcutConfigurator
          actionText={ACTION_TEXT}
          platform='darwin'
          shortcutName={SHORTCUT_NAME}
          shortcut={makeShortcut({ modifierKeys: ['Meta'] })}
        />
      )

      const displayedShortcut = screen.getByLabelText(`To ${ACTION_TEXT} press`)
      expect(displayedShortcut.textContent).toBe('Command+/')
    })

    it('renders an Alt key shortcut as "Option" on MacOS', () => {
      render(
        <KeyboardShortcutConfigurator
          actionText={ACTION_TEXT}
          platform='darwin'
          shortcutName={SHORTCUT_NAME}
          shortcut={makeShortcut()}
        />
      )

      const displayedShortcut = screen.getByLabelText(`To ${ACTION_TEXT} press`)
      expect(displayedShortcut.textContent).toBe('Option+/')
    })

    it('renders a Meta key shortcut as "Win" on Windows', () => {
      render(
        <KeyboardShortcutConfigurator
          actionText={ACTION_TEXT}
          platform='win32'
          shortcutName={SHORTCUT_NAME}
          shortcut={makeShortcut({ modifierKeys: ['Meta'], configuring: false })}
        />
      )

      const displayedShortcut = screen.getByLabelText(`To ${ACTION_TEXT} press`)
      expect(displayedShortcut.textContent).toBe('Win+/')
    })
  })

  describe('when configuring a shortcut', () => {
    it('prompts the user to enter a new shortcut', async () => {
      render(
        <KeyboardShortcutConfigurator
          actionText={ACTION_TEXT}
          platform='linux'
          shortcutName={SHORTCUT_NAME}
          shortcut={makeShortcut({ modifierKeys: ['Meta'], configuring: true })}
        />
      )

      expect(screen.getByText('Enter new keyboard shortcut!')).toBeDefined()
    })

    describe('and a valid shortcut is entered', () => {
      it('saves the new shortcut', async () => {
        const { user } = render(
          <KeyboardShortcutConfigurator
            actionText={ACTION_TEXT}
            platform='linux'
            shortcutName={SHORTCUT_NAME}
            shortcut={makeShortcut({ modifierKeys: ['Meta'], configuring: true })}
          />
        )

        expect(screen.getByText('Enter new keyboard shortcut!')).toBeDefined()
        await user.keyboard('{Alt>}T{/Alt}')

        expect(link.send).toHaveBeenLastCalledWith('tray:action', 'setShortcut', SHORTCUT_NAME, {
          enabled: true,
          configuring: false,
          modifierKeys: ['Alt'],
          shortcutKey: 'KeyT'
        })
      })

      it('enables the shortcut even if the previous one was disabled', async () => {
        const { user } = render(
          <KeyboardShortcutConfigurator
            actionText={ACTION_TEXT}
            platform='linux'
            shortcutName={SHORTCUT_NAME}
            shortcut={makeShortcut({ modifierKeys: ['Meta'], enabled: false, configuring: true })}
          />
        )

        expect(screen.getByText('Enter new keyboard shortcut!')).toBeDefined()
        await user.keyboard('{Alt>}T{/Alt}')

        expect(link.send).toHaveBeenLastCalledWith('tray:action', 'setShortcut', SHORTCUT_NAME, {
          enabled: true,
          configuring: false,
          modifierKeys: ['Alt'],
          shortcutKey: 'KeyT'
        })
      })
    })

    describe('and an invalid shortcut is entered', () => {
      it('does not save the shortcut', async () => {
        const { user } = render(
          <KeyboardShortcutConfigurator
            actionText={ACTION_TEXT}
            platform='linux'
            shortcutName={SHORTCUT_NAME}
            shortcut={makeShortcut({ modifierKeys: ['Meta'], configuring: true })}
          />
        )

        expect(screen.getByText('Enter new keyboard shortcut!')).toBeDefined()
        await user.keyboard('{Shift>};{/Shift}')

        expect(link.send).not.toHaveBeenCalled()
      })
    })
  })
})
