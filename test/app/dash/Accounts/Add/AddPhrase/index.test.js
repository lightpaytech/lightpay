import Restore from 'react-restore'

import { screen, render, cleanup } from '../../../../../componentSetup'
import store from '../../../../../../main/store'
import link from '../../../../../../resources/link'
import AddPhraseAccountComponent from '../../../../../../app/dash/Accounts/Add/AddPhrase'

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock('../../../../../../main/store/persist')
jest.mock('../../../../../../resources/link', () => ({
  invoke: jest.fn().mockResolvedValue({}),
  send: jest.fn(),
  rpc: jest.fn()
}))

// ── Fixtures ─────────────────────────────────────────────────────────────────

const AddPhrase = Restore.connect(AddPhraseAccountComponent, store)

const VALID_SEED_PHRASE = 'there lab weapon cost bounce smart trial pulse ceiling beach upset hockey illegal chef leaf'
const VALID_PASSWORD    = 'thisisagoodpassword123'
const INVALID_PHRASE    = 'INVALID'

// ── Teardown ──────────────────────────────────────────────────────────────────

afterEach(() => cleanup())

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('<AddPhrase />', () => {
  describe('entering seed phrase', () => {
    const setupComponent = () => {
      const { user } = render(<AddPhrase accountData={{}} />, { advanceTimersAfterInput: true })

      return {
        clickNext:      async () => user.click(screen.getAllByRole('button')[0]),
        enterSeedPhrase: async (text) => user.type(screen.getAllByRole('textbox')[0], text)
      }
    }

    it('displays the correct heading when entering the seed phrase', () => {
      setupComponent()

      const heading = screen.getAllByRole('heading')[0]
      expect(heading.textContent).toBe('Seed Phrase')
    })

    it('shows an error when an invalid seed phrase is entered', async () => {
      const { enterSeedPhrase } = setupComponent()

      await enterSeedPhrase(INVALID_PHRASE)

      const nextButton = screen.getAllByRole('button')[0]
      expect(nextButton.textContent).toBe('INVALID SEED PHRASE')
    })

    it('navigates to the password entry screen after a valid seed phrase is submitted', async () => {
      const { enterSeedPhrase, clickNext } = setupComponent()

      await enterSeedPhrase(VALID_SEED_PHRASE)
      await clickNext()

      expect(link.send).toHaveBeenCalledWith('nav:forward', 'dash', {
        view: 'accounts',
        data: {
          showAddAccounts: true,
          newAccountType: 'seed',
          accountData: { secret: VALID_SEED_PHRASE }
        }
      })
    })
  })

  describe('entering password', () => {
    it('navigates to the confirmation screen after a password is entered', async () => {
      const { user } = render(
        <AddPhrase accountData={{ secret: VALID_SEED_PHRASE }} />,
        { advanceTimersAfterInput: true }
      )

      const passwordInput = screen.getAllByRole('textbox')[1]
      const createButton  = screen.getAllByRole('button')[1]

      await user.type(passwordInput, VALID_PASSWORD)
      await user.click(createButton)

      expect(link.send).toHaveBeenCalledWith('nav:forward', 'dash', {
        view: 'accounts',
        data: {
          showAddAccounts: true,
          newAccountType: 'seed',
          accountData: {
            secret: VALID_SEED_PHRASE,
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
        <AddPhrase accountData={{ secret: VALID_SEED_PHRASE, password: VALID_PASSWORD }} />,
        { advanceTimersAfterInput: true }
      )

      return {
        enterPasswordConfirm: async (text) => user.type(screen.getAllByRole('textbox')[2], text),
        clickConfirm:         async () => user.click(screen.getAllByRole('button')[2])
      }
    }

    it('calls createFromPhrase with the correct arguments when passwords match', async () => {
      const { enterPasswordConfirm, clickConfirm } = setupComponent()

      await enterPasswordConfirm(VALID_PASSWORD)
      await clickConfirm()

      expect(link.rpc).toHaveBeenCalledWith(
        'createFromPhrase',
        VALID_SEED_PHRASE,
        VALID_PASSWORD,
        expect.any(Function)
      )
    })

    it('clears the add-account navigation stack after account creation', async () => {
      const { enterPasswordConfirm, clickConfirm } = setupComponent()

      link.rpc.mockImplementationOnce((action, secret, passwd, cb) => {
        expect(action).toBe('createFromPhrase')
        cb(null, { id: '1234' })
      })

      await enterPasswordConfirm(VALID_PASSWORD)
      await clickConfirm()

      expect(link.send).toHaveBeenCalledWith('nav:back', 'dash', 4)
    })

    it('navigates to the newly created account view after creation', async () => {
      const { enterPasswordConfirm, clickConfirm } = setupComponent()

      link.rpc.mockImplementationOnce((action, secret, passwd, cb) => {
        expect(action).toBe('createFromPhrase')
        cb(null, { id: '1234' })
      })

      await enterPasswordConfirm(VALID_PASSWORD)
      await clickConfirm()

      expect(link.send).toHaveBeenCalledWith('nav:forward', 'dash', {
        view: 'expandedSigner',
        data: { signer: '1234' }
      })
    })
  })
})
