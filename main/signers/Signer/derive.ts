import HDKey from 'hdkey'

import { publicToAddress, toChecksumAddress } from '@ethereumjs/util'

/**
 * Derivation path format reference
 * ---------------------------------
 * All paths follow the BIP-44 structure: m / purpose' / coin_type' / account' / change / address_index
 *
 *   purpose  : 44  (BIP-44 standard)
 *   coin type: 60  (Ethereum, per SLIP-44)
 *              1   (testnet, per SLIP-44)
 *
 * Named derivation styles supported by LightPay:
 *
 *   legacy   : m/44'/60'/0'/<index>
 *              Used by older wallets (MyEtherWallet legacy, etc.).
 *              The index is placed at the account level, change is omitted.
 *
 *   standard : m/44'/60'/0'/0/<index>
 *              Full BIP-44 path with change=0, index increments at address level.
 *              Default for most modern software wallets.
 *
 *   testnet  : m/44'/1'/0'/0/<index>
 *              Same layout as standard but uses coin_type=1 for test networks.
 *
 *   live     : m/44'/60'/<index>'/0/0
 *              Ledger Live style — each account gets its own hardened account index.
 *              The index is placed at the account' level rather than address level.
 *
 * The placeholder token <index> is replaced by getDerivationPath() at call time.
 * When index is omitted (or -1) getDerivationPath() strips the placeholder so the
 * path can be used as a prefix for HD key derivation without a trailing separator.
 */

export enum Derivation {
  live = 'live',
  legacy = 'legacy',
  standard = 'standard',
  testnet = 'testnet'
}

/** Guard that asserts a derivation value is one of the known Derivation enum members. */
function assertKnownDerivation(derivation: string): asserts derivation is Derivation {
  const knownValues = Object.values(Derivation) as string[]
  if (!knownValues.includes(derivation)) {
    throw new Error(
      `deriveHD: unknown derivation type "${derivation}". Expected one of: ${knownValues.join(', ')}`
    )
  }
}

export function deriveHDAccounts(publicKey: string, chainCode: string, cb: Callback<string[]>) {
  try {
    const hdk = new HDKey()
    hdk.publicKey = Buffer.from(publicKey, 'hex')
    hdk.chainCode = Buffer.from(chainCode, 'hex')
    const derive = (index: number) => {
      const derivedKey = hdk.derive(`m/${index}`)
      const address = publicToAddress(derivedKey.publicKey, true)
      return toChecksumAddress(`0x${address.toString('hex')}`)
    }
    const accounts = []
    for (let i = 0; i < 100; i++) {
      accounts[i] = derive(i)
    }

    cb(null, accounts)
  } catch (e) {
    cb(e as Error, undefined)
  }
}

const derivationPaths: { [key: string]: string } = {
  [Derivation.legacy.valueOf()]: "44'/60'/0'/<index>",
  [Derivation.standard.valueOf()]: "44'/60'/0'/0/<index>",
  [Derivation.testnet.valueOf()]: "44'/1'/0'/0/<index>",
  [Derivation.live.valueOf()]: "44'/60'/<index>'/0/0"
}

export function getDerivationPath(derivation: Derivation, index = -1) {
  assertKnownDerivation(derivation)

  const pathTemplate = derivationPaths[derivation.valueOf()]
  const indexToken = index > -1 ? index.toString() : ''

  return pathTemplate.replace('<index>', indexToken)
}
