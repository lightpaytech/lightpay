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

const ARBITRUM_CHAIN = {
  id: 42162,
  type: 'ethereum',
  name: 'Arbitrum Rinkeby',
  symbol: 'ETH',
  explorer: 'https://rinkeby.arbiscan.io',
  primaryRpc: 'https://arbitrum-rinkeby.infura.com',
  secondaryRpc: 'https://myrpc.arbrink.net',
  isTestnet: false,
  nativeCurrencyName: 'Ether'
}

const EXPECTED_ADD_CHAIN_PAYLOAD = {
  id: 42162,
  name: 'Arbitrum Rinkeby',
  symbol: 'ETH',
  primaryColor: 'accent2',
  explorer: 'https://rinkeby.arbiscan.io',
  type: 'ethereum',
  isTestnet: false,
  primaryRpc: 'https://arbitrum-rinkeby.infura.com',
  secondaryRpc: 'https://myrpc.arbrink.net',
  nativeCurrencyName: 'Ether',
  nativeCurrencyIcon: '',
  icon: ''
}

// ── Setup / teardown ──────────────────────────────────────────────────────────

beforeAll(() => {
  store.removeNetwork({ type: 'ethereum', id: 137 })
})

afterEach(() => cleanup())

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('<Chain /> (setup view)', () => {
  describe('rendering RPC fields', () => {
    it('renders the provided primary RPC URL', () => {
      render(<Chain view='setup' primaryRpc='https://myrpc.polygon.net' />)

      const primaryRpcInput = screen.getByLabelText('Primary RPC')
      expect(primaryRpcInput.value).toEqual('https://myrpc.polygon.net')
    })

    it('renders placeholder text when no primary RPC is provided', () => {
      render(<Chain view='setup' />)

      const primaryRpcInput = screen.getByLabelText('Primary RPC')
      expect(primaryRpcInput.value).toEqual('Primary Endpoint')
    })

    it('renders the provided secondary RPC URL', () => {
      render(<Chain view='setup' secondaryRpc='https://my-backup-rpc.polygon.net' />)

      const secondaryRpcInput = screen.getByLabelText('Secondary RPC')
      expect(secondaryRpcInput.value).toEqual('https://my-backup-rpc.polygon.net')
    })

    it('renders placeholder text when no secondary RPC is provided', () => {
      render(<Chain view='setup' />)

      const secondaryRpcInput = screen.getByLabelText('Secondary RPC')
      expect(secondaryRpcInput.value).toEqual('Secondary Endpoint')
    })
  })

  describe('rendering chain metadata', () => {
    it('renders the default chain name placeholder', () => {
      render(<Chain view='setup' />)

      const chainName = screen.getByLabelText('Chain Name')
      expect(chainName.value).toBe('Chain Name')
    })

    it('renders the provided chain name', () => {
      render(<Chain view='setup' name='Polygon' />)

      const titleSection = screen.getByRole('chainName')
      expect(titleSection.textContent).toBe('Polygon')
    })

    it('renders the provided chain ID', () => {
      render(<Chain view='setup' name='Polygon' id={137} />)

      const chainIdInput = screen.getByLabelText('Chain ID')
      expect(chainIdInput.value).toEqual('137')
    })

    it('renders the provided native token symbol', () => {
      render(<Chain view='setup' name='Polygon' id={137} symbol='MATIC' />)

      const symbolInput = screen.getByLabelText('Native Symbol')
      expect(symbolInput.value).toEqual('MATIC')
    })

    it('renders the testnet toggle as off by default', () => {
      render(<Chain view='setup' />)

      const testnetToggle = screen.getByRole('chainTestnet')
      expect(testnetToggle.getAttribute('aria-checked')).toBe('false')
    })
  })

  describe('rendering submit button states', () => {
    it('shows "Add Chain" when the form is complete', () => {
      render(<Chain view='setup' {...ARBITRUM_CHAIN} />)

      expect(screen.getByRole('button').textContent).toBe('Add Chain')
    })

    it('shows "Fill Chain Details" when the form is incomplete', () => {
      render(<Chain view='setup' id={137} name='Polygon' />)

      expect(screen.getByRole('button').textContent).toBe('Fill Chain Details')
    })

    it('shows "Chain ID Already Exists" when the chain ID is a duplicate', () => {
      render(<Chain view='setup' id={1} name='Mainnet' />)

      expect(screen.getByRole('button').textContent).toBe('Chain ID Already Exists')
    })
  })

  describe('submitting a new chain', () => {
    it('blocks submission when the chain ID already exists', async () => {
      store.addNetwork({
        id: 1,
        type: 'ethereum',
        name: 'Mainnet',
        explorer: 'https://etherscan.io',
        symbol: 'ETH',
        on: true,
        connection: { primary: { connected: true } }
      })

      const { user } = render(<Chain view='setup' id={1} name='Mainnet' />)

      await user.click(screen.getByRole('button'))
      expect(link.send).not.toHaveBeenCalled()
    })

    it('adds a valid chain with all required fields', async () => {
      const { user } = render(<Chain view='setup' {...ARBITRUM_CHAIN} />)

      await user.click(screen.getByRole('button'))

      expect(link.send).toHaveBeenNthCalledWith(1, 'tray:addChain', EXPECTED_ADD_CHAIN_PAYLOAD)
    })

    it('allows the user to change RPCs before submitting', async () => {
      const { user } = render(
        <Chain
          view='setup'
          id={42162}
          name='Arbitrum Rinkeby'
          symbol='arETH'
          primaryRpc='https://arbitrum-rinkeby.infura.com'
          secondaryRpc='https://myrpc.arbrink.net'
          nativeCurrencyName='Ether'
        />
      )

      const primaryRpcInput = screen.getByLabelText('Primary RPC')
      await user.clear(primaryRpcInput)
      await user.type(primaryRpcInput, 'https://arbitrum-rpc.mydomain.com')

      const secondaryRpcInput = screen.getByLabelText('Secondary RPC')
      await user.clear(secondaryRpcInput)
      await user.type(secondaryRpcInput, 'https://myrpc-rinkeby.arbitrum.io')

      await user.click(screen.getByRole('button'))

      expect(link.send).toHaveBeenNthCalledWith(
        1,
        'tray:addChain',
        expect.objectContaining({
          primaryRpc: 'https://arbitrum-rpc.mydomain.com',
          secondaryRpc: 'https://myrpc-rinkeby.arbitrum.io'
        })
      )
    })

    it('submits empty RPC fields as empty strings, not undefined', async () => {
      const { user } = render(
        <Chain
          view='setup'
          id={42162}
          type='ethereum'
          name='Arbitrum Rinkeby'
          symbol='ETH'
          isTestnet={false}
          nativeCurrencyName='Ether'
        />
      )

      await user.click(screen.getByRole('button'))

      expect(link.send).toHaveBeenNthCalledWith(1, 'tray:addChain', {
        id: 42162,
        name: 'Arbitrum Rinkeby',
        symbol: 'ETH',
        primaryColor: 'accent2',
        explorer: '',
        type: 'ethereum',
        isTestnet: false,
        primaryRpc: '',
        secondaryRpc: '',
        nativeCurrencyName: 'Ether',
        nativeCurrencyIcon: '',
        icon: ''
      })
    })
  })

  describe('updating fields', () => {
    it('allows the user to mark a chain as a testnet', async () => {
      const { user } = render(<Chain view='setup' />)

      const testnetToggle = screen.getByRole('chainTestnet')
      await user.click(testnetToggle)
      expect(testnetToggle.getAttribute('aria-checked')).toBe('true')
    })
  })
})
