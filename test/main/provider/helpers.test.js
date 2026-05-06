import log from 'electron-log'
import { fromUtf8 } from '@ethereumjs/util'
import { getRawTx, getSignedAddress } from '../../../main/provider/helpers'

jest.mock('../../../main/store')

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const VALID_HEX_VALUE = '0x2540be400'
const LEADING_ZERO_VALUE = '0x0a45c6'
const LEADING_ZERO_EXPECTED = '0xa45c6'
const ZERO_HEX = '0x0'
const EMPTY_HEX_VALUE = '0x'
const UN_PREFIXED_ZERO = '0'

const VALID_SIGNATURE =
  '0xa4ba512820eab7022d0c88b9335425b6235c184565c84fb9e451965844a185030baec17ac9565c666675525cae41e367c458c1fdf575a80f6a44197d3b48c0ba1c'
const SIGNED_MESSAGE = fromUtf8('Example `personal_sign` message')
const EXPECTED_SIGNER_ADDRESS = '0x3a077715f7383ad97215d1a585778bce6a9aa8af'

const INVALID_NONCES = [
  { description: 'non-numeric', nonce: 'invalid' },
  { description: 'negative integer', nonce: '-360' },
  { description: 'non-integer numeric', nonce: '3.60' }
]

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

beforeAll(async () => {
  log.transports.console.level = false
})

afterAll(() => {
  log.transports.console.level = 'debug'
})

describe('#getRawTx', () => {
  beforeEach(() => jest.clearAllMocks())

  describe('value normalisation', () => {
    it('leaves a valid value unchanged', () => {
      const tx = getRawTx({ value: VALID_HEX_VALUE })
      expect(tx.value).toBe(VALID_HEX_VALUE)
    })

    it('removes a leading zero from a valid value', () => {
      const tx = getRawTx({ value: LEADING_ZERO_VALUE })
      expect(tx.value).toBe(LEADING_ZERO_EXPECTED)
    })

    it('leaves a valid zero value unchanged', () => {
      const tx = getRawTx({ value: ZERO_HEX })
      expect(tx.value).toBe(ZERO_HEX)
    })

    it('turns a zero value into the correct hex value for zero', () => {
      const tx = getRawTx({ value: EMPTY_HEX_VALUE })
      expect(tx.value).toBe(ZERO_HEX)
    })

    it('turns an un-prefixed zero value into the correct hex value for zero', () => {
      const tx = getRawTx({ value: UN_PREFIXED_ZERO })
      expect(tx.value).toBe(ZERO_HEX)
    })

    it('turns an undefined value into the correct hex value for zero', () => {
      const tx = getRawTx({ value: undefined })
      expect(tx.value).toBe(ZERO_HEX)
    })
  })

  describe('nonce normalisation', () => {
    it('should pass through a hex nonce', () => {
      const tx = getRawTx({ nonce: '0x168' })
      expect(tx.nonce).toBe('0x168')
    })

    it('should convert a valid integer nonce into hex', () => {
      const tx = getRawTx({ nonce: '360' })
      expect(tx.nonce).toBe('0x168')
    })

    it('should pass through an undefined nonce', () => {
      const tx = getRawTx({ nonce: undefined })
      expect(tx.nonce).toBeUndefined()
    })

    INVALID_NONCES.forEach(({ description, nonce }) => {
      it(`should reject a ${description} nonce`, () => {
        expect(() => getRawTx({ nonce })).toThrowError('Invalid nonce')
      })
    })

    it('should reject a nonce that is an empty string', () => {
      expect(() => getRawTx({ nonce: '' })).toThrowError('Invalid nonce')
    })
  })

  describe('LightPay-specific tx handling', () => {
    it('preserves extra fields unknown to the base implementation', () => {
      const tx = getRawTx({ value: ZERO_HEX, chainId: '0x1', type: '0x2' })
      expect(tx.chainId).toBe('0x1')
      expect(tx.type).toBe('0x2')
    })
  })
})

describe('#getSignedAddress', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns a verified address for a valid signature', () => {
    getSignedAddress(VALID_SIGNATURE, SIGNED_MESSAGE, (err, verifiedAddress) => {
      expect(err).toBeFalsy()
      expect(verifiedAddress.toLowerCase()).toBe(EXPECTED_SIGNER_ADDRESS)
    })
  })

  it('returns an error if no signature is provided', () => {
    getSignedAddress(null, 'some message', (err) => {
      expect(err).toBeTruthy()
    })
  })

  it('returns an error if the message is empty', () => {
    getSignedAddress(VALID_SIGNATURE, '', (err) => {
      expect(err).toBeTruthy()
    })
  })
})
