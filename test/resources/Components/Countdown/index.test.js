import Countdown from '../../../../resources/Components/Countdown'
import { render, screen, cleanup } from '../../../componentSetup'

// ── Fixtures ─────────────────────────────────────────────────────────────────

const ONE_DAY_MS    = 86_400_000
const INVALID_DATE  = 'bogus'

// ── Teardown ──────────────────────────────────────────────────────────────────

afterEach(() => cleanup())

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('<Countdown />', () => {
  describe('valid dates', () => {
    it('shows the time remaining until a valid future date', () => {
      render(<Countdown end={new Date().getTime() + ONE_DAY_MS} />)
      expect(screen.getByRole('timer').textContent).toBe('24h')
    })
  })

  describe('invalid dates', () => {
    it('shows an error label when the end date is not a valid date string', () => {
      render(<Countdown end={INVALID_DATE} />)
      expect(screen.getByRole('timer').textContent).toBe('INVALID DATE')
    })
  })
})
