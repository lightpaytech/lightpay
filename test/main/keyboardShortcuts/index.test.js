import { globalShortcut } from 'electron'

jest.mock('electron', () => ({
  app: { on: jest.fn(), getName: jest.fn(), getVersion: jest.fn(), getPath: jest.fn() },
  globalShortcut: { register: jest.fn(), unregister: jest.fn() }
}))

// ─── Shared shortcut fixture ──────────────────────────────────────────────────

const sampleShortcut = {
  shortcutKey: 'Slash',
  modifierKeys: ['Alt'],
  enabled: true,
  configuring: false
}

let registerShortcut
let getShortcutDescription

describe('registerShortcut', () => {
  beforeEach(async () => {
    jest.clearAllMocks()
    const keyboardShortcuts = await import('../../../main/keyboardShortcuts')
    registerShortcut = keyboardShortcuts.registerShortcut
    getShortcutDescription = keyboardShortcuts.getShortcutDescription
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('should unregister an existing shortcut before registering the new one', () => {
    registerShortcut(sampleShortcut, () => {})

    expect(globalShortcut.unregister).toHaveBeenCalledWith('Alt+/')
    expect(globalShortcut.unregister).toHaveBeenCalledTimes(1)
  })

  it('should register the new shortcut with the correct accelerator', () => {
    globalShortcut.register.mockImplementationOnce((accelerator, handlerFn) => handlerFn(accelerator))

    return new Promise((resolve) => {
      const handlerFn = (accelerator) => {
        expect(accelerator).toBe('Alt+/')
        resolve()
      }
      registerShortcut(sampleShortcut, handlerFn)

      expect(globalShortcut.register).toHaveBeenCalledWith('Alt+/', expect.any(Function))
      expect(globalShortcut.register).toHaveBeenCalledTimes(1)
    })
  })
})

describe('getShortcutDescription (LightPay helper)', () => {
  beforeEach(async () => {
    jest.clearAllMocks()
    const keyboardShortcuts = await import('../../../main/keyboardShortcuts')
    getShortcutDescription = keyboardShortcuts.getShortcutDescription
  })

  it('returns a description string for a mapped shortcut key', () => {
    const description = getShortcutDescription('Slash')

    expect(typeof description).toBe('string')
    expect(description.length).toBeGreaterThan(0)
  })

  it('returns a fallback message when no key is provided', () => {
    const description = getShortcutDescription('')

    expect(description).toBe('No key assigned')
  })

  it('returns a description using the raw key when no mapping exists', () => {
    const description = getShortcutDescription('F9')

    expect(description).toContain('F9')
  })
})
