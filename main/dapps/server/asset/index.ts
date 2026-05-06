import fs from 'fs'
import path from 'path'

import getType from './getType'
import { getDappCacheDir } from '../../verify'

import type { ServerResponse } from 'http'

// Named constants for HTTP status codes used in this module
const HTTP_OK = 200
const HTTP_NOT_FOUND = 404

export interface AssetServerConfig {
  cacheDir: string
  defaultMimeType: string
  allowedOrigin: string
}

// Build the standard response headers for asset serving
function buildResponseHeaders(mimeType: string): Record<string, string> {
  return {
    'content-type': mimeType,
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'X-Requested-With,content-type'
  }
}

// Produce a deterministic cache key for a dapp asset
function getAssetCacheKey(dappId: string, assetPath: string): string {
  return `${dappId}::${assetPath}`
}

function getAssetPath(asset: string, namehash: string) {
  const rootPath = asset === '/' ? '/index.html' : asset
  return { rootPath, assetPath: path.join(getDappCacheDir(), namehash, rootPath) }
}

function error(res: ServerResponse, message: string, code = HTTP_NOT_FOUND) {
  res.writeHead(code || HTTP_NOT_FOUND)
  res.end(message)
}

export default {
  stream: (res: ServerResponse, namehash: string, asset: string) => {
    const { rootPath, assetPath } = getAssetPath(asset, namehash)

    const handleError = (err: Error) => {
      console.error(`Could not stream asset: ${asset}`, err)
      error(res, err.message)
    }

    if (fs.existsSync(assetPath)) {
      try {
        const stream = fs.createReadStream(assetPath)
        const headers = buildResponseHeaders(getType(rootPath))
        for (const [key, value] of Object.entries(headers)) {
          res.setHeader(key, value)
        }
        res.writeHead(HTTP_OK)

        stream.once('error', handleError)
        stream.pipe(res)
      } catch (e) {
        handleError(e as Error)
      }
    } else {
      error(res, asset === '/' ? 'Dapp not found' : 'Asset not found')
    }
  }
}

export { buildResponseHeaders, getAssetCacheKey, HTTP_OK, HTTP_NOT_FOUND }
