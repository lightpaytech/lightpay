import { accountSort as byCreation, hasAddress } from '../../../../resources/domain/account'

// ── Fixtures ─────────────────────────────────────────────────────────────────

const WALLET_ADDRESSES = [
  '0xa7888f85bd76deef3bd03d4dbcf57765a49883b3',
  '0x66b870ddf78c975af5cd8edc6de25eca81791de1',
  '0xc1e42f862d202b4a0ed552c1145735ee088f6ccf',
  '0x9c5083dd4838e120dbeac44c052179692aa5dac5',
  '0x2326d4fb2737666dda96bd6314e3d4418246cfe8',
  '0xe70981f2aeb601a12001465c7a5e52aa76adcbec',
  '0xa1efa0adecb7f5691605899d13285928ae025844'
]

const MIXED_CASE_ADDRESS = '0xa7888F85BD76deeF3Bd03d4DbCF57765a49883b3'
const DIFFERENT_ADDRESS  = '0x66b870ddf78c975af5cd8edc6de25eca81791de1'

const makeWalletAccount = (address, timestamp = Date.now(), block = 0, name = address) => ({
  address,
  name,
  created: block ? `${block}:${timestamp}` : `new:${timestamp}`
})

let now = 0

beforeEach(() => {
  now = Date.now()
})

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('#hasAddress', () => {
  describe('address matching', () => {
    it('matches an address with different casing', () => {
      const account = { id: MIXED_CASE_ADDRESS }
      expect(hasAddress(account, WALLET_ADDRESSES[0])).toBe(true)
    })

    it('does not match a different address', () => {
      const account = { id: MIXED_CASE_ADDRESS }
      expect(hasAddress(account, DIFFERENT_ADDRESS)).toBe(false)
    })
  })

  describe('edge cases', () => {
    it('does not match an undefined address', () => {
      const account = { id: MIXED_CASE_ADDRESS }
      expect(hasAddress(account, undefined)).toBe(false)
    })

    it('does not match an empty string address', () => {
      const account = { id: MIXED_CASE_ADDRESS }
      expect(hasAddress(account, '')).toBe(false)
    })
  })
})

describe('#accountSort', () => {
  describe('sorting by timestamp', () => {
    it('sorts accounts in descending order by creation timestamp', () => {
      const acc1 = makeWalletAccount(WALLET_ADDRESSES[0])
      const acc2 = makeWalletAccount(WALLET_ADDRESSES[1], now + 500)
      const acc3 = makeWalletAccount(WALLET_ADDRESSES[2], now + 800)
      const acc4 = makeWalletAccount(WALLET_ADDRESSES[3], now + 2000)

      const sorted = [acc2, acc3, acc1, acc4].sort(byCreation)
      expect(sorted).toStrictEqual([acc4, acc3, acc2, acc1])
    })
  })

  describe('sorting by block number', () => {
    it('sorts accounts in descending order by block number', () => {
      const acc1 = makeWalletAccount(WALLET_ADDRESSES[0], now, 10)
      const acc2 = makeWalletAccount(WALLET_ADDRESSES[1], now, 20)
      const acc3 = makeWalletAccount(WALLET_ADDRESSES[2], now, 21)
      const acc4 = makeWalletAccount(WALLET_ADDRESSES[3], now, 30)

      const sorted = [acc2, acc4, acc3, acc1].sort(byCreation)
      expect(sorted).toStrictEqual([acc4, acc3, acc2, acc1])
    })
  })

  describe('sorting by block number and timestamp combined', () => {
    it('prioritises block-based accounts over timestamp-only accounts', () => {
      const acc1 = makeWalletAccount(WALLET_ADDRESSES[0], now)
      const acc2 = makeWalletAccount(WALLET_ADDRESSES[1], now, 20)
      const acc3 = makeWalletAccount(WALLET_ADDRESSES[2], now + 800, 999)
      const acc4 = makeWalletAccount(WALLET_ADDRESSES[3], now + 100, 31)

      const sorted = [acc2, acc3, acc1, acc4].sort(byCreation)
      expect(sorted).toStrictEqual([acc1, acc3, acc4, acc2])
    })
  })
})
