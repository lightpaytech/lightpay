import Restore from 'react-restore'

import store from '../../../../../../main/store'
import { screen, render, cleanup } from '../../../../../componentSetup'
import TxRequestComponent from '../../../../../../app/tray/Account/Requests/TransactionRequest'
import { TxClassification } from '../../../../../../main/accounts/types'

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock('../../../../../../main/store/persist')
jest.mock('../../../../../../resources/link', () => ({ rpc: jest.fn() }))

// ── Fixtures ─────────────────────────────────────────────────────────────────

const TxRequest = Restore.connect(TxRequestComponent, store)

const WALLET_ACCOUNT = '0xDAFEA492D9c6733ae3d56b7Ed1ADB60692c98Bc5'
const POLYGON_CHAIN_ID = '0x89'

const makeTransactionRequest = (overrides = {}) => ({
  handlerId: 'lightpay-req-1',
  type: 'transaction',
  status: 'confirming',
  data: { chainId: POLYGON_CHAIN_ID },
  classification: TxClassification.NATIVE_TRANSFER,
  ...overrides
})

function registerRequest(req) {
  store.updateAccount({
    id: WALLET_ACCOUNT,
    name: 'LightPay Test Account',
    requests: { [req.handlerId]: req }
  })
}

// ── Teardown ──────────────────────────────────────────────────────────────────

afterEach(() => cleanup())

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('<TransactionRequest />', () => {
  describe('confirm step', () => {
    it('renders a confirming transaction status', () => {
      const req = makeTransactionRequest()
      registerRequest(req)

      render(<TxRequest req={req} step='confirm' />)

      const statusBadge = screen.getByRole('status')
      expect(statusBadge.textContent).toBe('confirming')
    })

    it('renders a transaction notice alert', () => {
      const req = makeTransactionRequest({
        notice: 'insufficient funds for gas',
        recipientType: 'external'
      })
      registerRequest(req)

      render(<TxRequest req={req} step='confirm' />)

      const alertBanner = screen.getByRole('alert')
      expect(alertBanner.textContent).toMatch(/insufficient funds for gas/i)
    })
  })
})
