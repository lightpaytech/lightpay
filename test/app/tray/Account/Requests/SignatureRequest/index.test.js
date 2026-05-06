import { screen, render, cleanup } from '../../../../../componentSetup'
import SignatureRequestComponent from '../../../../../../app/tray/Account/Requests/SignatureRequest'

// ── Fixtures ─────────────────────────────────────────────────────────────────

const BASE_REQUEST = {
  type: 'sign',
  data: {}
}

const DECODED_MESSAGE  = 'hello, world!'
const LONG_MESSAGE     = 'Please sign this LightPay transaction to confirm ownership.'

// ── Setup / teardown ──────────────────────────────────────────────────────────

let req

beforeEach(() => {
  req = { ...BASE_REQUEST, data: {} }
})

afterEach(() => cleanup())

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('<SignatureRequest />', () => {
  describe('rendering decoded messages', () => {
    it('displays a short decoded message to sign', () => {
      req.data.decodedMessage = DECODED_MESSAGE

      render(<SignatureRequestComponent req={req} />)
      expect(screen.getByText(DECODED_MESSAGE)).toBeTruthy()
    })

    it('displays a longer decoded message to sign', () => {
      req.data.decodedMessage = LONG_MESSAGE

      render(<SignatureRequestComponent req={req} />)
      expect(screen.getByText(LONG_MESSAGE)).toBeTruthy()
    })
  })
})
