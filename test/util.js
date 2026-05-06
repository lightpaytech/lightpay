import { intToHex } from '@ethereumjs/util'

export const APP_NAME = 'LightPay'
export const DEFAULT_CHAIN_ID = 1

export const gweiToHex = (gwei) => intToHex(gwei * 1e9)
export const flushPromises = () => new Promise(jest.requireActual('timers').setImmediate)

/**
 * Creates a standard LightPay test environment with common defaults.
 * Wraps the base setup so individual test files don't repeat boilerplate.
 */
export function createLightPayTestEnv(overrides = {}) {
  return {
    appName: APP_NAME,
    chainId: DEFAULT_CHAIN_ID,
    flushPromises,
    gweiToHex,
    ...overrides
  }
}
