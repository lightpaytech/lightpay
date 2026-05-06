import Restore from 'react-restore'

import { render, screen, cleanup } from '../../../../../componentSetup'
import store from '../../../../../../main/store'
import link from '../../../../../../resources/link'
import AddRingAccountComponent from '../../../../../../app/dash/Accounts/Add/AddRing'

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock('../../../../../../main/store/persist')
jest.mock('../../../../../../resources/link', () => ({
  invoke: jest.fn().mockResolvedValue({}),
  send: jest.fn(),
  rpc: jest.fn()
}))

// ── Fixtures ─────────────────────────────────────────────────────────────────

const AddRing = Restore.connect(AddRingAccountComponent, store)

const VALID_PRIVATE_KEY  = '4001069d4fe9b22dc767dfa7767e72f151e00dafa05d9ef0b89069a4f04820cb'
const INVALID_HEX_KEY    = 'INVALID'
const OUT_OF_RANGE_KEY   = '0xffffffffffffffffffffffffffffffffbaaedce6af48a03bbfd25e8cd0364148'
const VALID_PASSWORD     = 'thisisagoodpassword123'

// ── Teardown ──────────────────────────────────────────────────────────────────

afterEach(() => cleanup())

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('<AddRing />', () => {
  describe('entering private key', () => {
    const setupComponent = () => {
      const { user } = render(<AddRing accountData={{}} />, { advanceTimersAfterInput: true })

      return {
        user,
        getHeading:       () => screen.getAllByRole('heading')[0],
        getNextButton:    () => screen.getAllByRole('button')[0],
        enterPrivateKey:  async (text) => user.type(screen.getAllByRole('textbox')[0], text)
      }
    }

    it('displays the correct heading for the private key step', () => {
      const { getHeading } = setupComponent()
      expect(getHeading().textContent).toBe('Private Key')
    })

    it('shows an error when the private key is an invalid hex string', async () => {
      const { enterPrivateKey, getNextButton } = setupComponent()
      await enterPrivateKey(INVALID_HEX_KEY)
      expect(getNextButton().textContent).toBe('INVALID PRIVATE KEY')
    })

    it('shows an error when the private key is out of the valid curve range', async () => {
      const { enterPrivateKey, getNextButton } = setupComponent()
      await enterPrivateKey(OUT_OF_RANGE_KEY)
      expect(getNextButton().textContent).toBe('INVALID PRIVATE KEY')
    })

    it('navigates to the password screen after a valid private key is entered', async () => {
      const { user, enterPrivateKey, getNextButton } = setupComponent()

      await enterPrivateKey(VALID_PRIVATE_KEY)
      await user.click(getNextButton())

      expect(link.send).toHaveBeenCalledWith('nav:forward', 'dash', {
        view: 'accounts',
        data: {
          showAddAccounts: true,
          newAccountType: 'keyring',
          accountData: { secret: VALID_PRIVATE_KEY }
        }
      })
    })
  })

  describe('entering password', () => {
    it('navigates to the confirmation screen after the password is submitted', async () => {
      const { user } = render(
        <AddRing accountData={{ secret: VALID_PRIVATE_KEY }} />,
        { advanceTimersAfterInput: true }
      )

      const passwordInput = screen.getAllByRole('textbox')[1]
      await user.type(passwordInput, VALID_PASSWORD)

      const confirmButton = screen.getAllByRole('button')[1]
      await user.click(confirmButton)

      expect(link.send).toHaveBeenCalledWith('nav:forward', 'dash', {
        view: 'accounts',
        data: {
          showAddAccounts: true,
          newAccountType: 'keyring',
          accountData: {
            secret: VALID_PRIVATE_KEY,
            password: VALID_PASSWORD,
            creationArgs: []
          }
        }
      })
    })
  })

  describe('confirming password', () => {
    const setupComponent = () => {
      const { user } = render(
        <AddRing accountData={{ secret: VALID_PRIVATE_KEY, password: VALID_PASSWORD }} />,
        { advanceTimersAfterInput: true }
      )

      return {
        user,
        getConfirmButton:        () => screen.getAllByRole('button')[2],
        enterPasswordConfirmation: async (text) => user.type(screen.getAllByRole('textbox')[2], text)
      }
    }

    it('calls createFromPrivateKey with the correct arguments when passwords match', async () => {
      const { user, enterPasswordConfirmation, getConfirmButton } = setupComponent()

      await enterPasswordConfirmation(VALID_PASSWORD)
      await user.click(getConfirmButton())

      expect(link.rpc).toHaveBeenCalledWith(
        'createFromPrivateKey',
        VALID_PRIVATE_KEY,
        VALID_PASSWORD,
        expect.any(Function)
      )
    })

    it('clears the add-account navigation stack after account creation', async () => {
      link.rpc.mockImplementationOnce((action, secret, passwd, cb) => {
        expect(action).toBe('createFromPrivateKey')
        expect(secret).toBe(VALID_PRIVATE_KEY)
        expect(passwd).toBe(VALID_PASSWORD)
        cb(null, { id: '1234' })
      })

      const { user, enterPasswordConfirmation, getConfirmButton } = setupComponent()

      await enterPasswordConfirmation(VALID_PASSWORD)
      await user.click(getConfirmButton())

      expect(link.send).toHaveBeenCalledWith('nav:back', 'dash', 4)
    })

    it('navigates to the newly created account view after creation', async () => {
      link.rpc.mockImplementationOnce((action, secret, passwd, cb) => {
        expect(action).toBe('createFromPrivateKey')
        expect(secret).toBe(VALID_PRIVATE_KEY)
        expect(passwd).toBe(VALID_PASSWORD)
        cb(null, { id: '1234' })
      })

      const { user, enterPasswordConfirmation, getConfirmButton } = setupComponent()

      await enterPasswordConfirmation(VALID_PASSWORD)
      await user.click(getConfirmButton())

      expect(link.send).toHaveBeenCalledWith('nav:forward', 'dash', {
        view: 'expandedSigner',
        data: { signer: '1234' }
      })
    })
  })
})
