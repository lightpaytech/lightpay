import Restore from 'react-restore'

import store from '../../../../../../main/store'
import link from '../../../../../../resources/link'
import { screen, render, cleanup } from '../../../../../componentSetup'
import AddAddressComponent from '../../../../../../app/dash/Accounts/Add/AddAddress'

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock('../../../../../../main/store/persist')
jest.mock('../../../../../../resources/link', () => ({ rpc: jest.fn() }))

// ── Fixtures ─────────────────────────────────────────────────────────────────

const AddAddress = Restore.connect(AddAddressComponent, store)

const WALLET_ADDRESS = '0x690B9A9E9aa1C9dB991C7721a92d351Db4FaC990'
const ENS_NAME       = 'vitalik.eth'
const RESOLVED_ADDRESS = '0xd8da6bf26964af9d7eed9e03e53415d37aa96045'

// ── Helpers ───────────────────────────────────────────────────────────────────

function setupComponent() {
  const { user } = render(<AddAddress />)

  return {
    user,
    enterText:   async (text) => user.type(screen.getByLabelText('input address or ENS name'), text),
    clickCreate: async () => user.click(screen.getByRole('button', { name: 'Create' }))
  }
}

// ── Teardown ──────────────────────────────────────────────────────────────────

afterEach(() => cleanup())

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('<AddAddress />', () => {
  describe('initial render', () => {
    it('allows a user to enter an address or ENS name', async () => {
      render(<AddAddress />)

      expect(screen.getByText('input address or ENS name')).toBeTruthy()
      expect(screen.getByRole('textbox')).toBeTruthy()
    })
  })

  describe('adding by wallet address', () => {
    it('calls createFromAddress with the entered address', async () => {
      const { enterText, clickCreate } = setupComponent()

      await enterText(WALLET_ADDRESS)
      await clickCreate()

      expect(link.rpc).toHaveBeenCalledWith(
        'createFromAddress',
        WALLET_ADDRESS,
        'Watch Account',
        expect.any(Function)
      )
    })

    it('shows a success screen after adding an account by address', async () => {
      const { enterText, clickCreate } = setupComponent()

      await enterText(WALLET_ADDRESS)
      await clickCreate()

      expect(screen.getByText('account added successfully')).toBeTruthy()
      expect(screen.getByRole('button', { name: 'back' })).toBeTruthy()
    })
  })

  describe('adding by ENS name', () => {
    it('shows the resolving screen while looking up an ENS name', async () => {
      const { enterText, clickCreate } = setupComponent()

      await enterText(ENS_NAME)
      await clickCreate()

      expect(screen.getByText('Resolving ENS Name')).toBeTruthy()
      expect(link.rpc).toHaveBeenCalledWith('resolveEnsName', ENS_NAME, expect.any(Function))
    })

    it('shows a success screen after resolving an ENS name to an address', async () => {
      link.rpc.mockImplementationOnce((action, name, cb) => {
        expect(action).toBe('resolveEnsName')
        expect(name).toBe(ENS_NAME)
        cb(null, RESOLVED_ADDRESS)
      })

      const { enterText, clickCreate } = setupComponent()

      await enterText(ENS_NAME)
      await clickCreate()

      expect(screen.getByText('account added successfully')).toBeTruthy()
      expect(screen.getByRole('button', { name: 'back' })).toBeTruthy()
    })

    it('shows an error screen when ENS name resolution fails', async () => {
      link.rpc.mockImplementationOnce((action, name, cb) => {
        expect(action).toBe('resolveEnsName')
        expect(name).toBe(ENS_NAME)
        cb(new Error('testing!'))
      })

      const { enterText, clickCreate } = setupComponent()

      await enterText(ENS_NAME)
      await clickCreate()

      expect(screen.getByText(`Unable to resolve Ethereum address for ${ENS_NAME}`)).toBeTruthy()
      expect(screen.getByRole('button', { name: 'try again' })).toBeTruthy()
    })

    it('restarts when the user cancels an ENS lookup', async () => {
      const { user, enterText, clickCreate } = setupComponent()

      await enterText(ENS_NAME)
      await clickCreate()
      await user.click(screen.getByRole('button', { name: 'cancel' }))

      expect(screen.getByText('input address or ENS name')).toBeTruthy()
      expect(screen.getByRole('textbox')).toBeTruthy()
    })
  })
})
