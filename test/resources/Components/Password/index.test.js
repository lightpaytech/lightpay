import { screen, render, cleanup } from '../../../componentSetup'
import { CreatePassword, ConfirmPassword } from '../../../../resources/Components/Password'

// ── Fixtures ─────────────────────────────────────────────────────────────────

const VALID_PASSWORD    = 'thisisagoodpassword123'
const SHORT_PASSWORD    = 'INVALID'
const WEAK_PASSWORD     = 'aaaaaaaaaaaa'
const MISMATCHED_PASSWORD = 'DOES_NOT_MATCH'

// ── Teardown ──────────────────────────────────────────────────────────────────

afterEach(() => cleanup())

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('<CreatePassword />', () => {
  const setupComponent = ({ onCreate = jest.fn() } = {}) => {
    const { user } = render(<CreatePassword {...{ password: VALID_PASSWORD, onCreate }} />, {
      advanceTimersAfterInput: true
    })

    return {
      user,
      getSubmitButton: () => screen.getByRole('button'),
      enterPassword: async (text) => user.type(screen.getByRole('textbox'), text)
    }
  }

  describe('rendering', () => {
    it('displays the correct heading when entering a password', () => {
      setupComponent()
      expect(screen.getByRole('heading').textContent).toBe('Create Password')
    })
  })

  describe('password validation', () => {
    it('shows an error when the password is too short', async () => {
      const { enterPassword, getSubmitButton } = setupComponent()
      await enterPassword(SHORT_PASSWORD)
      expect(getSubmitButton().textContent).toBe('PASSWORD MUST BE 12 OR MORE CHARACTERS')
    })

    it('shows a warning when the password is too weak', async () => {
      const { enterPassword, getSubmitButton } = setupComponent()
      await enterPassword(WEAK_PASSWORD)
      expect(getSubmitButton().textContent).toBe('REPEATS LIKE "AAA" ARE EASY TO GUESS')
    })

    it('shows the continue button when a valid password is entered', async () => {
      const { enterPassword, getSubmitButton } = setupComponent()
      await enterPassword(VALID_PASSWORD)
      expect(getSubmitButton().textContent).toBe('Continue')
    })
  })

  describe('form submission', () => {
    it('calls onCreate with the password when submitted', async () => {
      const onCreate = jest.fn()
      const { user, enterPassword, getSubmitButton } = setupComponent({ onCreate })

      await enterPassword(VALID_PASSWORD)
      await user.click(getSubmitButton())

      expect(onCreate).toHaveBeenCalledWith(VALID_PASSWORD)
    })
  })
})

describe('<ConfirmPassword />', () => {
  const setupComponent = ({ onConfirm = jest.fn() } = {}) => {
    const { user } = render(<ConfirmPassword {...{ password: VALID_PASSWORD, onConfirm }} />, {
      advanceTimersAfterInput: true
    })

    return {
      user,
      getConfirmButton: () => screen.getByRole('button'),
      enterPassword: async (text) => user.type(screen.getByRole('textbox'), text)
    }
  }

  describe('password validation', () => {
    it('shows an error when the confirmation password does not match', async () => {
      const { enterPassword, getConfirmButton } = setupComponent()
      await enterPassword(MISMATCHED_PASSWORD)
      expect(getConfirmButton().textContent).toBe('PASSWORDS DO NOT MATCH')
    })

    it('shows the create button when the confirmation password matches', async () => {
      const { enterPassword, getConfirmButton } = setupComponent()
      await enterPassword(VALID_PASSWORD)
      expect(getConfirmButton().textContent).toBe('Create')
    })
  })

  describe('form submission', () => {
    it('calls onConfirm with the password when confirmed', async () => {
      const onConfirm = jest.fn()
      const { user, enterPassword, getConfirmButton } = setupComponent({ onConfirm })

      await enterPassword(VALID_PASSWORD)
      await user.click(getConfirmButton())

      expect(onConfirm).toHaveBeenCalledWith(VALID_PASSWORD)
    })
  })
})
