import { screen, render, cleanup } from '../../../componentSetup'
import Confirm from '../../../../resources/Components/Confirm'

// ── Fixtures ─────────────────────────────────────────────────────────────────

const PROMPT_TEXT   = 'you sure you wanna do that?'
const DECLINE_TEXT  = 'no way'
const ACCEPT_TEXT   = 'lets gooooo'

// ── Teardown ──────────────────────────────────────────────────────────────────

afterEach(() => cleanup())

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('<Confirm />', () => {
  describe('rendering', () => {
    it('renders the confirmation prompt heading', () => {
      render(<Confirm prompt={PROMPT_TEXT} />)

      const heading = screen.getByRole('heading')
      expect(heading.textContent).toBe(PROMPT_TEXT)
    })

    it('renders the decline button with custom text', () => {
      render(<Confirm declineText={DECLINE_TEXT} />)

      const declineButton = screen.getByRole('button', { name: DECLINE_TEXT })
      expect(declineButton).toBeDefined()
    })

    it('renders the accept button with custom text', () => {
      render(<Confirm acceptText={ACCEPT_TEXT} />)

      const acceptButton = screen.getByRole('button', { name: ACCEPT_TEXT })
      expect(acceptButton).toBeDefined()
    })
  })

  describe('user interactions', () => {
    it('calls onDecline when the decline button is clicked', async () => {
      const onDecline = jest.fn()
      const { user } = render(<Confirm onDecline={onDecline} />)

      await user.click(screen.getByRole('button', { name: 'Decline' }))

      expect(onDecline).toHaveBeenCalled()
    })

    it('calls onAccept when the accept button is clicked', async () => {
      const onAccept = jest.fn()
      const { user } = render(<Confirm onAccept={onAccept} />)

      await user.click(screen.getByRole('button', { name: 'OK' }))

      expect(onAccept).toHaveBeenCalled()
    })
  })
})
