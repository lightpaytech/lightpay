import log from 'electron-log'
import fetch from 'node-fetch'

import defaultTokenList from './default-tokens.json'

import type { Token } from '../../store/state'

// Public token list — Uniswap Labs (standard token list format, no IPFS/ENS required)
const TOKEN_LIST_URL = 'https://tokens.uniswap.org'

// Fallback: CoinGecko public list
const TOKEN_LIST_FALLBACK = 'https://tokens.coingecko.com/uniswap/all.json'

interface TokenSpec extends Token {
  extensions?: {
    omit?: boolean
  }
}

function isBlacklisted(token: TokenSpec) {
  return token.extensions?.omit
}

export default class TokenLoader {
  private tokens: TokenSpec[] = defaultTokenList.tokens as TokenSpec[]
  private nextLoad?: NodeJS.Timeout | null

  private async loadTokenList() {
    try {
      const updatedTokens = await this.fetchTokenList()
      if (updatedTokens.length > 0) {
        log.info(`Fetched ${updatedTokens.length} tokens`)
        this.tokens = updatedTokens
        log.info(`Updated token list to contain ${this.tokens.length} tokens`)
      }
      // Refresh every 10 minutes
      this.nextLoad = setTimeout(() => this.loadTokenList(), 10 * 60_000)
    } catch (e) {
      log.warn('Could not fetch token list, using default list', (e as Error).message)
      // Retry in 5 minutes on failure
      this.nextLoad = setTimeout(() => this.loadTokenList(), 5 * 60_000)
    }
  }

  private async fetchTokenList(): Promise<TokenSpec[]> {
    let res = await fetch(TOKEN_LIST_URL, {
      headers: { 'Accept': 'application/json' },
      timeout: 10_000
    } as any).catch(() => null)

    // Try fallback if primary fails
    if (!res || !res.ok) {
      res = await fetch(TOKEN_LIST_FALLBACK, {
        headers: { 'Accept': 'application/json' },
        timeout: 10_000
      } as any).catch(() => null)
    }

    if (!res || !res.ok) {
      throw new Error(`Token list fetch failed (status: ${res?.status})`)
    }

    const data = await res.json() as { tokens?: TokenSpec[] }
    const tokens = data?.tokens

    if (!Array.isArray(tokens) || tokens.length === 0) {
      throw new Error('Token list response had no tokens')
    }

    return tokens
  }

  async start() {
    log.verbose('Starting token loader')
    // Load in background — don't block startup
    this.loadTokenList().catch((e) => log.warn('Token loader background error', e))
  }

  stop() {
    if (this.nextLoad) {
      clearTimeout(this.nextLoad)
      this.nextLoad = null
    }
  }

  getTokens(chains: number[]) {
    return this.tokens.filter((token) => !isBlacklisted(token) && chains.includes(token.chainId))
  }

  getBlacklist(chains: number[] = []) {
    const chainMatches = (token: TokenSpec) => !chains.length || chains.includes(token.chainId)
    return this.tokens.filter((token) => isBlacklisted(token) && chainMatches(token))
  }
}
