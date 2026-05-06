import { render, screen, cleanup } from '../../../../../componentSetup'
import Proceed from '../../../../../../app/onboard/App/Slides/Proceed'

// ── Fixtures ─────────────────────────────────────────────────────────────────

const COMPLETE_SLIDE = 7

const makeProceedProps = (overrides = {}) => ({
  slide: COMPLETE_SLIDE,
  proceed: { action: 'complete', text: 'Done' },
  nextSlide: () => {},
  prevSlide: () => {},
  onComplete: jest.fn(),
  ...overrides
})

// ── Teardown ──────────────────────────────────────────────────────────────────

afterEach(() => cleanup())

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('<Proceed />', () => {
  describe('completing onboarding', () => {
    it('calls onComplete when the action button is clicked', async () => {
      const onComplete = jest.fn()
      const { user } = render(<Proceed {...makeProceedProps({ onComplete })} />)

      await user.click(screen.getByRole('button', { name: 'Done' }))

      expect(onComplete).toHaveBeenCalled()
    })

    it('renders the action button with the configured label', () => {
      render(<Proceed {...makeProceedProps()} />)

      expect(screen.getByRole('button', { name: 'Done' })).toBeTruthy()
    })
  })
})
