import TrezorConnect, { DEVICE_EVENT, DEVICE, UI_EVENT, UI } from '@trezor/connect'
import { EventEmitter } from 'stream'
import log from 'electron-log'

import TrezorBridge from '../../../../main/signers/trezor/bridge'

jest.mock('@trezor/connect')

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const DEVICE_PATH = '27'
const ACQUIRED_DEVICE_PAYLOAD = { type: 'acquired', path: '27', features: { firmwareVersion: '2.1.4' } }
const UI_DEVICE = { type: 'acquired', id: 'someid1234' }

// ---------------------------------------------------------------------------
// Global setup / teardown
// ---------------------------------------------------------------------------

const events = new EventEmitter()

beforeAll(() => {
  log.transports.console.level = false

  TrezorConnect.on = events.on.bind(events)
  TrezorConnect.once = events.once.bind(events)
  TrezorConnect.emit = events.emit.bind(events)
  TrezorConnect.removeAllListeners = events.removeAllListeners.bind(events)
})

afterAll(() => {
  log.transports.console.level = 'debug'
})

beforeEach((done) => {
  jest.clearAllMocks()
  TrezorBridge.once('connect', done)
  TrezorBridge.open()
})

afterEach(() => {
  TrezorBridge.close()
})

// ---------------------------------------------------------------------------
// connect events
// ---------------------------------------------------------------------------

describe('connect events', () => {
  it('emits a detected event on device changed event with type unacquired', (done) => {
    TrezorBridge.once('trezor:detected', (path) => {
      try {
        expect(path).toBe(DEVICE_PATH)
        done()
      } catch (e) {
        done(e)
      }
    })

    TrezorConnect.emit(DEVICE_EVENT, {
      type: DEVICE.CHANGED,
      payload: { type: 'unacquired', path: DEVICE_PATH, features: {} }
    })
  })

  it('emits a detected event on device unacquired event', (done) => {
    TrezorBridge.once('trezor:detected', (path) => {
      try {
        expect(path).toBe(DEVICE_PATH)
        done()
      } catch (e) {
        done(e)
      }
    })

    TrezorConnect.emit(DEVICE_EVENT, {
      type: DEVICE.CONNECT_UNACQUIRED,
      payload: { type: 'unacquired', path: DEVICE_PATH, features: {} }
    })
  })

  it('emits a connected event on device connected event with type acquired', (done) => {
    TrezorBridge.once('trezor:connect', (device) => {
      try {
        expect(device).toEqual(ACQUIRED_DEVICE_PAYLOAD)
        done()
      } catch (e) {
        done(e)
      }
    })

    TrezorConnect.emit(DEVICE_EVENT, { type: DEVICE.CONNECT, payload: ACQUIRED_DEVICE_PAYLOAD })
  })

  it('emits a disconnected event on device disconnected event', (done) => {
    TrezorBridge.once('trezor:disconnect', (device) => {
      try {
        expect(device).toEqual(ACQUIRED_DEVICE_PAYLOAD)
        done()
      } catch (e) {
        done(e)
      }
    })

    TrezorConnect.emit(DEVICE_EVENT, { type: DEVICE.DISCONNECT, payload: ACQUIRED_DEVICE_PAYLOAD })
  })

  it('emits an updated event on device changed event where type is not unacquired', (done) => {
    TrezorBridge.once('trezor:update', (device) => {
      try {
        expect(device).toEqual(ACQUIRED_DEVICE_PAYLOAD)
        done()
      } catch (e) {
        done(e)
      }
    })

    TrezorConnect.emit(DEVICE_EVENT, { type: DEVICE.CHANGED, payload: ACQUIRED_DEVICE_PAYLOAD })
  })

  describe('edge cases', () => {
    it('does not emit a detected event for a non-unacquired device change', (done) => {
      const detectedSpy = jest.fn()
      TrezorBridge.once('trezor:detected', detectedSpy)

      TrezorConnect.emit(DEVICE_EVENT, { type: DEVICE.CHANGED, payload: ACQUIRED_DEVICE_PAYLOAD })

      setTimeout(() => {
        expect(detectedSpy).not.toHaveBeenCalled()
        done()
      }, 0)
    })
  })
})

// ---------------------------------------------------------------------------
// ui events
// ---------------------------------------------------------------------------

describe('ui events', () => {
  it('emits a needPin event when a pin is requested', (done) => {
    TrezorBridge.once('trezor:needPin', (device) => {
      try {
        expect(device).toEqual(UI_DEVICE)
        done()
      } catch (e) {
        done(e)
      }
    })

    TrezorConnect.emit(UI_EVENT, { type: UI.REQUEST_PIN, payload: { device: UI_DEVICE } })
  })

  it('emits a needPhrase event when a passphrase is requested and entry on the device is not supported', (done) => {
    const payload = { device: UI_DEVICE, features: { capabilities: [] } }

    TrezorBridge.once('trezor:needPhrase', (device) => {
      try {
        expect(device).toEqual(UI_DEVICE)
        done()
      } catch (e) {
        done(e)
      }
    })

    TrezorConnect.emit(UI_EVENT, { type: UI.REQUEST_PASSPHRASE, payload })
  })
})

// ---------------------------------------------------------------------------
// requests
// ---------------------------------------------------------------------------

describe('requests', () => {
  it('loads features for a given device', async () => {
    const expected = { vendor: 'trezor.io', device_id: 'G89EDFE91829DACC6B43' }

    TrezorConnect.getFeatures.mockImplementation(async (params) => {
      expect(params.device.path).toBe('41')
      return { id: 1, success: true, payload: expected }
    })

    const actual = await TrezorBridge.getFeatures({ device: { path: '41' } })

    expect(actual).toEqual(expected)
  })

  it('gets the public key for a given device', async () => {
    const expected = { chainCode: 'eth', fingerprint: 19912902490 }

    TrezorConnect.getPublicKey.mockImplementation(async (params) => {
      expect(params.device.path).toBe('4')
      expect(params.path).toBe("m/44'/60'/0/1/0")
      return { id: 1, success: true, payload: expected }
    })

    const actual = await TrezorBridge.getPublicKey({ path: '4' }, "m/44'/60'/0/1/0")

    expect(actual).toEqual(expected)
  })

  it('gets the signature after signing a transaction', async () => {
    const tx = { chainId: '0x4', type: '0x2', value: '0x1929' }

    TrezorConnect.ethereumSignTransaction.mockImplementation(async (params) => {
      expect(params.device.path).toBe('11')
      expect(params.path).toBe("m/44'/60'/0'/4/0")
      expect(params.transaction).toEqual(tx)
      return { id: 1, success: true, payload: { v: 1, r: 2, s: 3 } }
    })

    const actual = await TrezorBridge.signTransaction({ path: '11' }, "m/44'/60'/0'/4/0", tx)

    expect(actual).toEqual({ v: 1, r: 2, s: 3 })
  })

  describe('edge cases', () => {
    it('propagates an error when getFeatures fails', async () => {
      TrezorConnect.getFeatures.mockImplementation(async () => {
        return { id: 1, success: false, payload: { error: 'device not found' } }
      })

      await expect(TrezorBridge.getFeatures({ device: { path: '99' } })).rejects.toBeTruthy()
    })
  })
})
