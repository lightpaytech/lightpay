import { Derivation, getDerivationPath } from '../../../../main/signers/Signer/derive'

// ---------------------------------------------------------------------------
// #getDerivationPath
// ---------------------------------------------------------------------------

describe('#getDerivationPath', () => {
  describe('legacy derivation', () => {
    it('provides a legacy derivation path with no index', () => {
      const actual = getDerivationPath(Derivation.legacy)

      expect(actual).toBe("44'/60'/0'/")
    })

    it('provides a legacy derivation path with a non-zero index', () => {
      const actual = getDerivationPath(Derivation.legacy, 3)

      expect(actual).toBe("44'/60'/0'/3")
    })

    it('provides a legacy derivation path with a zero index', () => {
      const actual = getDerivationPath(Derivation.legacy, 0)

      expect(actual).toBe("44'/60'/0'/0")
    })
  })

  describe('standard derivation', () => {
    it('provides a standard derivation path with no index', () => {
      const actual = getDerivationPath(Derivation.standard)

      expect(actual).toBe("44'/60'/0'/0/")
    })

    it('provides a standard derivation path with a non-zero index', () => {
      const actual = getDerivationPath(Derivation.standard, 14)

      expect(actual).toBe("44'/60'/0'/0/14")
    })

    it('provides a standard derivation path with a zero index', () => {
      const actual = getDerivationPath(Derivation.standard, 0)

      expect(actual).toBe("44'/60'/0'/0/0")
    })
  })

  describe('testnet derivation', () => {
    it('provides a testnet derivation path with no index', () => {
      const actual = getDerivationPath(Derivation.testnet)

      expect(actual).toBe("44'/1'/0'/0/")
    })

    it('provides a testnet derivation path with a non-zero index', () => {
      const actual = getDerivationPath(Derivation.testnet, 9)

      expect(actual).toBe("44'/1'/0'/0/9")
    })

    it('provides a testnet derivation path with a zero index', () => {
      const actual = getDerivationPath(Derivation.testnet, 0)

      expect(actual).toBe("44'/1'/0'/0/0")
    })
  })

  describe('live (Ledger Live) derivation', () => {
    it('provides a live derivation path with no index', () => {
      const actual = getDerivationPath(Derivation.live)

      expect(actual).toBe("44'/60'/'/0/0")
    })

    it('provides a live derivation path with a non-zero index', () => {
      const actual = getDerivationPath(Derivation.live, 24)

      expect(actual).toBe("44'/60'/24'/0/0")
    })

    it('provides a live derivation path with a zero index', () => {
      const actual = getDerivationPath(Derivation.live, 0)

      expect(actual).toBe("44'/60'/0'/0/0")
    })
  })

  describe('assertKnownDerivation — invalid inputs', () => {
    it('throws when passed an unknown derivation type string', () => {
      expect(() => getDerivationPath('unknown-type')).toThrow(/unknown derivation type/)
    })

    it('throws when passed an empty string', () => {
      expect(() => getDerivationPath('')).toThrow()
    })

    it('throws when passed null', () => {
      expect(() => getDerivationPath(null)).toThrow()
    })
  })
})
