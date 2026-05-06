import Restore from 'react-restore'

import store from '../../../../../main/store'
import link from '../../../../../resources/link'
import { screen, render, cleanup } from '../../../../componentSetup'
import ChainComponent from '../../../../../app/dash/Chains/Chain'

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock('../../../../../main/store/persist')
jest.mock('../../../../../resources/link', () => ({ send: jest.fn() }))

// ── Fixtures ─────────────────────────────────────────────────────────────────

const Chain = Restore.connect(ChainComponent, store)

const TESTNET_CHAIN = {
  id: 1337,
  type: 'ethereum',
  name: 'Leetnet',
  explorer: 'https://etherscan.io',
  symbol: 'ETH',
  on: true
}

// ── Setup / teardown ──────────────────────────────────────────────────────────

beforeAll(() => {
  store.addNetwork(TESTNET_CHAIN)
})

afterAll(() => {
  store.removeNetwork({ type: 'ethereum', id: TESTNET_CHAIN.id })
})

afterEach(() => cleanup())

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('<Chain /> (expanded view)', () => {
  describe('rendering', () => {
    it('renders the provided chain name', () => {
      render(<Chain view='expanded' name='Bizarro Mainnet' />)

      const chainNameInput = screen.getByLabelText('Chain Name')
      expect(chainNameInput.value).toEqual('Bizarro Mainnet')
    })

    it('renders the provided native symbol', () => {
      render(<Chain view='expanded' symbol='AVAX' />)

      const symbolInput = screen.getByLabelText('Native Symbol')
      expect(symbolInput.value).toEqual('AVAX')
    })

    it('renders the provided block explorer URL', () => {
      render(<Chain view='expanded' explorer='https://etherscan.io' />)

      const explorerInput = screen.getByLabelText('Block Explorer')
      expect(explorerInput.value).toEqual('https://etherscan.io')
    })
  })

  describe('chain removal', () => {
    it('opens a confirmation dialog when the remove button is clicked', async () => {
      const { user } = render(<Chain view='expanded' {...TESTNET_CHAIN} />)

      await user.click(screen.getByRole('button', { name: 'Remove Chain' }))

      expect(link.send).toHaveBeenCalledWith(
        'tray:action',
        'navDash',
        expect.objectContaining({ view: 'notify' })
      )
    })
  })
})
