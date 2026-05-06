import { isHardwareSigner } from '../../../../resources/domain/signer'

// ── Fixtures ─────────────────────────────────────────────────────────────────

const HARDWARE_SIGNER_TYPES = ['lattice', 'trezor', 'ledger']
const SOFTWARE_SIGNER_TYPES = ['seed', 'keyring', 'keystore', 'watch']

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('#isHardwareSigner', () => {
  describe('when given a hardware signer type string', () => {
    HARDWARE_SIGNER_TYPES.forEach((signerType) => {
      it(`recognises "${signerType}" as a hardware signer`, () => {
        expect(isHardwareSigner(signerType)).toBe(true)
      })
    })

    it('determines the hardware type from a signer object', () => {
      const ledgerSigner = { type: 'ledger' }
      expect(isHardwareSigner(ledgerSigner)).toBe(true)
    })

    it('matches hardware signer types regardless of case', () => {
      expect(isHardwareSigner('tReZoR')).toBe(true)
    })
  })

  describe('when given a software signer type string', () => {
    SOFTWARE_SIGNER_TYPES.forEach((signerType) => {
      it(`does not consider "${signerType}" to be a hardware signer`, () => {
        expect(isHardwareSigner(signerType)).toBe(false)
      })
    })

    it('does not consider an unrecognised type to be a hardware signer', () => {
      expect(isHardwareSigner('unknown-type')).toBe(false)
    })
  })
})
