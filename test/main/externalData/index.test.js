// LightPay externalData manager tests
import externalData from '../../../main/externalData'
import store from '../../../main/store'

jest.mock('@framelabs/pylon-client', () => jest.fn())
jest.mock('../../../main/store')
jest.mock('../../../main/externalData/inventory', () =>
  jest.fn(() => ({ start: jest.fn(), stop: jest.fn() }))
)
jest.mock('../../../main/externalData/assets', () => jest.fn(() => ({ start: jest.fn(), stop: jest.fn() })))
jest.mock('../../../main/externalData/balances', () => jest.fn(() => mockBalances))

const TRAY_OPEN_KEY = 'tray.open'
const OBSERVER_KEY = 'externalData:tray'
const PAUSE_DELAY_MS = 1000 * 60

let dataManager, mockBalances

beforeEach(() => {
  store.set(TRAY_OPEN_KEY, true)
  mockBalances = { start: jest.fn(), stop: jest.fn(), pause: jest.fn(), resume: jest.fn() }
  dataManager = externalData()
})

afterEach(() => {
  dataManager.close()
  jest.clearAllMocks()
})

describe('LightPay tray visibility — balance scanner lifecycle', () => {
  describe('when tray is hidden', () => {
    it('pauses the balances scanner if the tray is hidden for 1 minute', () => {
      setTrayShown(false)

      expect(mockBalances.pause).toHaveBeenCalled()
    })

    it('does not pause the balances scanner if the tray was already hidden', () => {
      setTrayShown(false)
      setTrayShown(false)

      expect(mockBalances.pause).toHaveBeenCalledTimes(1)
    })
  })

  describe('when tray is shown', () => {
    it('does not attempt to resume the balances scanner the first time the tray is shown', () => {
      setTrayShown(true)

      expect(mockBalances.resume).not.toHaveBeenCalled()
    })

    it('resumes the balances scanner when the tray is shown after previously being hidden', () => {
      setTrayShown(false)
      setTrayShown(true)

      expect(mockBalances.resume).toHaveBeenCalled()
    })
  })

  describe('edge cases', () => {
    it('tracks resume calls correctly across multiple hide/show cycles', () => {
      setTrayShown(false)
      setTrayShown(true)
      setTrayShown(false)
      setTrayShown(true)

      expect(mockBalances.resume).toHaveBeenCalledTimes(2)
    })
  })
})

function setTrayShown(shown) {
  store.set(TRAY_OPEN_KEY, shown)
  store.getObserver(OBSERVER_KEY).fire()
  jest.advanceTimersByTime(PAUSE_DELAY_MS)
}
