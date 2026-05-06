// A modified version of ipfs-only-hash, https://github.com/alanshaw/ipfs-only-hash/issues/18

import path from 'path'
import fs from 'fs/promises'
import { app } from 'electron'
import { globSource } from 'ipfs-http-client'
import { importer } from 'ipfs-unixfs-importer'

import type { UserImporterOptions } from 'ipfs-unixfs-importer/types'

// Named constant for verification timeout (ms)
const VERIFICATION_TIMEOUT_MS = 30_000

export interface VerificationConfig {
  timeout: number
  maxRetries: number
}

const blockstore = {
  get: async (cid: string) => {
    throw new Error(`unexpected block API get for ${cid}`)
  },
  put: async () => {
    throw new Error('unexpected block API put')
  }
}

// Named helper: compare two CID/hash strings for equality
function hashesMatch(a: string, b: string): boolean {
  return a === b
}

// Return a verification status string based on whether the hash is non-empty
function getVerificationStatus(hash: string): 'verified' | 'failed' | 'pending' | 'unknown' {
  if (!hash) return 'unknown'
  if (hash === 'pending') return 'pending'
  if (hash === 'failed') return 'failed'
  return 'verified'
}

const hash = async (content: any, opts: UserImporterOptions = {}) => {
  const options = {
    ...opts,
    onlyHash: true,
    cidVersion: 0,
    hidden: true
  } as const

  let lastCID

  for await (const c of importer(content, blockstore as any, options)) {
    lastCID = c.cid
  }

  return lastCID
}

const hashFiles = async (path: string, options: UserImporterOptions) => hash(globSource(path, '**'), options)
const getCID = async (path: string, isDirectory = true) => hashFiles(path, { wrapWithDirectory: isDirectory })

export function getDappCacheDir() {
  return path.join(app.getPath('userData'), 'DappCache')
}

export async function dappPathExists(dappId: string) {
  const cachedDappPath = `${getDappCacheDir()}/${dappId}`

  try {
    await fs.access(cachedDappPath)
    return true
  } catch (e) {
    return false
  }
}

export async function isDappVerified(dappId: string, contentCID: string) {
  const path = `${getDappCacheDir()}/${dappId}`
  const cid = await getCID(path)
  const computedHash = cid?.toV1().toString() ?? ''

  return hashesMatch(computedHash, contentCID)
}

export { VERIFICATION_TIMEOUT_MS, hashesMatch, getVerificationStatus }
