import fs from 'fs/promises'
import { importer } from 'ipfs-unixfs-importer'
import { CID } from 'multiformats'

import { dappPathExists, isDappVerified } from '../../../../main/dapps/verify'
import { getVerificationStatus } from '../../../../main/dapps/verify'

jest.mock('fs', () => ({
  access: jest.fn()
}))

jest.mock('electron', () => ({ app: { getPath: () => '/home/user/.config' } }))

jest.mock('ipfs-unixfs-importer', () => ({
  importer: jest.fn()
}))

jest.mock('ipfs-http-client', () => ({
  globSource: (...args) => {
    return { getArgs: () => args }
  }
}))

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const DAPP_ID = '0xmydapp'
const DAPP_ROOT_CID = 'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi'
const DAPP_IMAGE_CID = 'bafkreidgvpkjawlxz6sffxzwgooowe5yt7i6wsyg236mfoks77nywkptdq'
const DAPP_CONTENT_MISMATCH_CID = 'bagaaierasords4njcts6vs7qvdjfcvgnume4hqohf65zsfguprqphs3icwea'
const DAPP_CACHE_BASE = '/home/user/.config/DappCache'

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('#dappPathExists', () => {
  beforeEach(() => {
    fs.access = jest.fn()
  })

  it('determines that a dapp exists in the dapp cache', async () => {
    fs.access.mockResolvedValue()

    const exists = dappPathExists(DAPP_ID)

    expect(fs.access).toHaveBeenCalledWith(expect.toMatchPath(`${DAPP_CACHE_BASE}/${DAPP_ID}`))
    return expect(exists).resolves.toBe(true)
  })

  it('determines that a dapp does not exist in the dapp cache', async () => {
    fs.access.mockRejectedValue(new Error('directory does not exist'))

    const exists = dappPathExists(DAPP_ID)

    expect(fs.access).toHaveBeenCalledWith(expect.toMatchPath(`${DAPP_CACHE_BASE}/${DAPP_ID}`))
    return expect(exists).resolves.toBe(false)
  })
})

describe('#isDappVerified', () => {
  beforeEach(() => {
    importer.mockImplementation(() => createMockDirectoryImporter([DAPP_IMAGE_CID, DAPP_ROOT_CID]))
  })

  it('verifies the dapp if the content matches what is stored on disk', async () => {
    return expect(isDappVerified(DAPP_ID, DAPP_ROOT_CID)).resolves.toBe(true)
  })

  it('does not verify the dapp if the content does not match what is stored on disk', async () => {
    return expect(isDappVerified(DAPP_ID, DAPP_CONTENT_MISMATCH_CID)).resolves.toBe(false)
  })

  it('looks in the dapp cache directory to verify the existing dapp content', async () => {
    await isDappVerified(DAPP_ID, DAPP_ROOT_CID)

    const contentSourceGlob = importer.mock.calls[0][0].getArgs()
    expect(contentSourceGlob).toStrictEqual([expect.toMatchPath(`${DAPP_CACHE_BASE}/${DAPP_ID}`), '**'])
  })
})

describe('#getVerificationStatus', () => {
  it('returns "unknown" when no hash is provided', () => {
    expect(getVerificationStatus('')).toBe('unknown')
  })

  it('returns "unknown" when hash is null/undefined', () => {
    expect(getVerificationStatus(null)).toBe('unknown')
    expect(getVerificationStatus(undefined)).toBe('unknown')
  })

  it('returns "pending" when hash is the string "pending"', () => {
    expect(getVerificationStatus('pending')).toBe('pending')
  })

  it('returns "failed" when hash is the string "failed"', () => {
    expect(getVerificationStatus('failed')).toBe('failed')
  })

  it('returns "verified" for a real CID hash', () => {
    expect(getVerificationStatus(DAPP_ROOT_CID)).toBe('verified')
  })
})

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// provide cids in reverse hierarchical order (ie root comes last) to mimic actual directory structure
function createMockDirectoryImporter(cids) {
  return {
    [Symbol.asyncIterator]() {
      return {
        current: 0,
        async next() {
          if (this.current < cids.length) {
            this.current++
            return { done: false, value: { cid: CID.parse(cids[this.current - 1]) } }
          }

          return { done: true }
        }
      }
    }
  }
}
