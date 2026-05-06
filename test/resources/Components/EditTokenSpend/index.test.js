import { render, screen, cleanup } from '../../../componentSetup'
import EditTokenSpend from '../../../../resources/Components/EditTokenSpend'
import BigNumber from 'bignumber.js'
import { max } from '../../../../resources/utils/numbers'

// ── Fixtures ─────────────────────────────────────────────────────────────────

const MAX_INT_STR = max.toString(10)

const SPENDER_ADDRESS   = '0x9bc5baf874d2da8d216ae9f137804184ee5afef4'
const CONTRACT_ADDRESS  = '0x1eba19f260421142AD9Bf5ba193f6d4A0825e698'

const buildApprovalData = (overrides = {}) => ({
  spender: {
    address: SPENDER_ADDRESS,
    ens: '',
    type: 'external'
  },
  amount: '0x' + BigNumber('0x011170').toString(16),
  decimals: 4,
  name: 'LPT',
  symbol: 'LPT',
  contract: {
    address: CONTRACT_ADDRESS,
    ens: '',
    type: 'contract'
  },
  ...overrides
})

// ── Teardown ──────────────────────────────────────────────────────────────────

afterEach(() => cleanup())

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('changing approval amounts', () => {
  describe('custom amount entry', () => {
    it('allows the user to set the token approval to a custom integer amount', async () => {
      const onUpdate = jest.fn()
      const requestedAmount = BigNumber('0x011170')
      const approvalData = buildApprovalData({ amount: '0x' + requestedAmount.toString(16) })

      const { user } = render(
        <EditTokenSpend data={approvalData} requestedAmount={requestedAmount} updateRequest={onUpdate} />
      )

      const customBtn = screen.queryByRole('button', { name: 'Custom' })
      await user.click(customBtn)

      const amountInput = screen.queryByRole('textbox', { label: 'Custom Amount' })
      await user.type(amountInput, '50')

      await user.click(screen.getByText('update'))

      expect(onUpdate).toHaveBeenCalledWith('500000')
    })

    it('allows users to input custom amounts which are decimal', async () => {
      const onUpdate = jest.fn()
      const requestedAmount = BigNumber('0x011170')
      const approvalData = buildApprovalData({ amount: '0x' + requestedAmount.toString(16) })

      const { user } = render(
        <EditTokenSpend data={approvalData} requestedAmount={requestedAmount} updateRequest={onUpdate} />
      )

      const customBtn = screen.queryByRole('button', { name: 'Custom' })
      await user.click(customBtn)

      const amountInput = screen.queryByRole('textbox', { label: 'Custom Amount' })
      await user.type(amountInput, '50.1')

      await user.click(screen.getByText('update'))

      expect(onUpdate).toHaveBeenCalledWith('501000')
    })

    it('truncates custom amounts that exceed the token decimal precision', async () => {
      const onUpdate = jest.fn()
      const requestedAmount = BigNumber('0x011170')
      const approvalData = buildApprovalData({ amount: '0x' + requestedAmount.toString(16) })

      const { user } = render(
        <EditTokenSpend data={approvalData} requestedAmount={requestedAmount} updateRequest={onUpdate} />
      )

      const customBtn = screen.queryByRole('button', { name: 'Custom' })
      await user.click(customBtn)

      const amountInput = screen.queryByRole('textbox', { label: 'Custom Amount' })
      await user.type(amountInput, '50.00001')

      await user.click(screen.getByText('update'))

      expect(onUpdate).toHaveBeenCalledWith('500000')
    })
  })

  describe('unknown token', () => {
    it('does not allow a custom amount for an unknown token', () => {
      const requestedAmount = BigNumber('0x100e6')
      const approvalData = {
        spender: { address: SPENDER_ADDRESS, ens: '', type: 'external' },
        amount: '0x' + requestedAmount.toString(16),
        decimals: 6,
        symbol: 'aUSDC',
        contract: { address: CONTRACT_ADDRESS, type: 'contract', ens: '' }
      }

      render(
        <EditTokenSpend data={approvalData} requestedAmount={requestedAmount} updateRequest={() => {}} />
      )

      expect(screen.queryByRole('button', { name: 'Custom' })).toBe(null)
    })
  })

  describe('unlimited approval', () => {
    it('allows the user to set the token approval to unlimited', async () => {
      const onUpdate = jest.fn()
      const requestedAmount = BigNumber('0x011170')
      const approvalData = buildApprovalData({ amount: '0x' + requestedAmount.toString(16) })

      const { user } = render(
        <EditTokenSpend data={approvalData} requestedAmount={requestedAmount} updateRequest={onUpdate} />
      )

      await user.click(screen.queryByRole('button', { name: 'Custom' }))
      await user.click(screen.queryByRole('button', { name: 'Unlimited' }))

      expect(onUpdate).toHaveBeenCalledWith(MAX_INT_STR)
    })
  })

  describe('reverting to requested amount', () => {
    it('allows the user to revert to the original requested amount', async () => {
      const onUpdate = jest.fn()
      const requestedAmountHex = '0x011170'
      const requestedAmount = BigNumber(requestedAmountHex)
      const approvalData = buildApprovalData({ amount: requestedAmountHex })

      const { user } = render(
        <EditTokenSpend data={approvalData} requestedAmount={requestedAmount} updateRequest={onUpdate} />
      )

      await user.click(screen.queryByRole('button', { name: 'Unlimited' }))
      await user.click(screen.queryByRole('button', { name: 'Requested' }))

      expect(onUpdate).toHaveBeenNthCalledWith(1, MAX_INT_STR)
      expect(onUpdate).toHaveBeenNthCalledWith(2, '70000')
    })

    it('reverts to original raw amount when no decimal data is present', async () => {
      const onUpdate = jest.fn()
      const requestedAmountHex = '0x011170'
      const requestedAmount = BigNumber(requestedAmountHex)
      const approvalData = {
        spender: { address: SPENDER_ADDRESS, ens: '', type: 'external' },
        amount: requestedAmountHex,
        name: 'LPT',
        symbol: 'LPT',
        contract: { address: CONTRACT_ADDRESS, ens: '', type: 'contract' }
      }

      const { user } = render(
        <EditTokenSpend data={approvalData} requestedAmount={requestedAmount} updateRequest={onUpdate} />
      )

      await user.click(screen.queryByRole('button', { name: 'Unlimited' }))
      await user.click(screen.queryByRole('button', { name: 'Requested' }))

      expect(onUpdate).toHaveBeenNthCalledWith(1, MAX_INT_STR)
      expect(onUpdate).toHaveBeenNthCalledWith(2, BigNumber('0x011170').toString(10))
    })
  })

  describe('missing approval fields', () => {
    const requiredApprovalFields = ['decimals', 'symbol', 'name']

    requiredApprovalFields.forEach((field) => {
      it(`blocks editing if "${field}" is absent from approval data`, async () => {
        const requestedAmountHex = '0x' + (100e6).toString(16)
        const approvalData = buildApprovalData({
          amount: requestedAmountHex,
          decimals: 6,
          name: 'LPT',
          symbol: 'LPT'
        })

        delete approvalData[field]

        const { user } = render(
          <EditTokenSpend
            data={approvalData}
            requestedAmount={BigNumber(requestedAmountHex)}
            updateRequest={() => {}}
          />
        )

        expect(screen.queryByRole('button', { name: 'Custom' })).toBeNull()

        const amountDisplay = screen.queryByRole('textbox')
        const displayedContent = amountDisplay.textContent.trim()
        expect(displayedContent).toBe(approvalData.decimals ? '100' : '100000000')

        await user.click(amountDisplay)
        expect(screen.queryByRole('textbox', { name: 'Custom Amount' })).toBeNull()
      })
    })
  })
})
