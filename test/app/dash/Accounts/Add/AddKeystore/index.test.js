import Restore from 'react-restore'
import { screen, render, cleanup } from '../../../../../componentSetup'

import store from '../../../../../../main/store'
import link from '../../../../../../resources/link'
import AddKeystoreAccountComponent from '../../../../../../app/dash/Accounts/Add/AddKeystore'

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock('../../../../../../main/store/persist')
jest.mock('../../../../../../resources/link', () => ({
  invoke: jest.fn().mockResolvedValue({}),
  send: jest.fn(),
  rpc: jest.fn()
}))

// ── Fixtures ─────────────────────────────────────────────────────────────────

const AddKeystore = Restore.connect(AddKeystoreAccountComponent, store)

const KEYSTORE_JSON =
  '{"address":"0x91248de71222f40fa27f66f42ea07a6e58a259ed","crypto":{"kdf":"pbkdf2","kdfparams":{"c":262144,"dklen":32,"prf":"hmac-sha256","salt":"633bd27a4b2a8103cb7e88159bc4d97eb7a31a9a9ad2823f4365519932b63db1"},"cipher":"aes-128-ctr","ciphertext":"7cf2eda36f15bb033df75c4313a0d780ae7f80a6fb2ff0483113b1dd3b6d293e","cipherparams":{"iv":"6eccc2fcb8f5a85eb8383a71c00c889d"},"mac":"4cfdb4463acdd990d372fc68e87a3f2a393783ce92c0201d547eda17955c533b"},"id":"ce6f4a5f-0257-458b-b640-3ff5eebe5da2","version":3}'

const KEYSTORE_PASSWORD = 'keystorepassword123'
const SIGNER_PASSWORD   = 'thisisagoodpassword123'

const SELECT_BUTTON_INDEX = 0

// ── Teardown ──────────────────────────────────────────────────────────────────

afterEach(() => cleanup())

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('<AddKeystore />', () => {
  describe('selecting a keystore file', () => {
    it('displays any errors raised while selecting the keystore', async () => {
      link.rpc.mockImplementationOnce((action, cb) => {
        expect(action).toBe('locateKeystore')
        cb('ERROR HERE')
      })

      const { user } = render(<AddKeystore accountData={{}} />, { advanceTimersAfterInput: 650 })
      await user.click(screen.getAllByRole('button')[SELECT_BUTTON_INDEX])

      expect(screen.getAllByRole('button')[SELECT_BUTTON_INDEX].textContent).toBe('ERROR HERE')
    })

    it('navigates to the keystore password screen after a keystore is located', async () => {
      link.rpc.mockImplementationOnce((action, cb) => {
        expect(action).toBe('locateKeystore')
        cb(null, KEYSTORE_JSON)
      })

      const { user } = render(<AddKeystore accountData={{}} />, { advanceTimersAfterInput: true })
      await user.click(screen.getAllByRole('button')[SELECT_BUTTON_INDEX])

      expect(link.send).toHaveBeenCalledWith('nav:forward', 'dash', {
        view: 'accounts',
        data: {
          showAddAccounts: true,
          newAccountType: 'keystore',
          accountData: { keystore: KEYSTORE_JSON }
        }
      })
    })
  })

  describe('entering keystore password', () => {
    it('navigates to the signer password screen after the keystore password is submitted', async () => {
      const { user } = render(<AddKeystore accountData={{ keystore: KEYSTORE_JSON }} />, {
        advanceTimersAfterInput: true
      })

      await user.type(screen.getAllByRole('textbox')[0], KEYSTORE_PASSWORD)
      await user.click(screen.getAllByRole('button')[0])

      expect(link.send).toHaveBeenCalledWith('nav:forward', 'dash', {
        view: 'accounts',
        data: {
          showAddAccounts: true,
          newAccountType: 'keystore',
          accountData: {
            secret: KEYSTORE_JSON,
            creationArgs: [KEYSTORE_PASSWORD]
          }
        }
      })
    })
  })

  describe('entering signer password', () => {
    it('navigates to the confirmation screen after the signer password is submitted', async () => {
      const { user } = render(<AddKeystore accountData={{ secret: KEYSTORE_JSON }} />, {
        advanceTimersAfterInput: true
      })

      await user.type(screen.getAllByRole('textbox')[1], SIGNER_PASSWORD)
      await user.click(screen.getAllByRole('button')[1])

      expect(link.send).toHaveBeenCalledWith('nav:forward', 'dash', {
        view: 'accounts',
        data: {
          showAddAccounts: true,
          newAccountType: 'keystore',
          accountData: {
            secret: KEYSTORE_JSON,
            password: SIGNER_PASSWORD,
            creationArgs: []
          }
        }
      })
    })
  })

  describe('confirming signer password', () => {
    const setupComponent = () =>
      render(
        <AddKeystore
          accountData={{
            secret: KEYSTORE_JSON,
            password: SIGNER_PASSWORD,
            creationArgs: [KEYSTORE_PASSWORD]
          }}
        />,
        { advanceTimersAfterInput: true }
      )

    it('calls createFromKeystore with the correct arguments when passwords match', async () => {
      const { user } = setupComponent()

      await user.type(screen.getAllByRole('textbox')[2], SIGNER_PASSWORD)
      await user.click(screen.getAllByRole('button')[2])

      expect(link.rpc).toHaveBeenCalledWith(
        'createFromKeystore',
        KEYSTORE_JSON,
        SIGNER_PASSWORD,
        KEYSTORE_PASSWORD,
        expect.any(Function)
      )
    })

    it('clears the add-account navigation stack after account creation', async () => {
      const { user } = setupComponent()

      link.rpc.mockImplementationOnce((action, secret, passwd, keystorePwd, cb) => {
        cb(null, { id: '1234' })
      })

      await user.type(screen.getAllByRole('textbox')[2], SIGNER_PASSWORD)
      await user.click(screen.getAllByRole('button')[2])

      expect(link.send).toHaveBeenCalledWith('nav:back', 'dash', 6)
    })

    it('navigates to the newly created account view after creation', async () => {
      const { user } = setupComponent()

      link.rpc.mockImplementationOnce((action, secret, passwd, keystorePwd, cb) => {
        cb(null, { id: '1234' })
      })

      await user.type(screen.getAllByRole('textbox')[2], SIGNER_PASSWORD)
      await user.click(screen.getAllByRole('button')[2])

      expect(link.send).toHaveBeenCalledWith('nav:forward', 'dash', {
        view: 'expandedSigner',
        data: { signer: '1234' }
      })
    })
  })
})
