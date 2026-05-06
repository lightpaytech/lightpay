const userEvent = require('@testing-library/user-event').default
const { render, act } = require('@testing-library/react')

export const LIGHTPAY_TEST_TIMEOUT = 5000

// Known benign warning patterns that are safe to suppress in tests
const SUPPRESSED_WARNINGS = [
  /Warning: ReactDOM.render is no longer supported/,
  /Warning: An update to .* inside a test was not wrapped in act/,
  /Warning: validateDOMNesting/
]

const _originalWarn = console.warn.bind(console)

/**
 * Suppresses known benign React/testing-library warnings so test output
 * remains actionable. Call once during global test setup.
 */
export function suppressLightPayKnownWarnings() {
  console.warn = (...args) => {
    const msg = String(args[0] || '')
    if (SUPPRESSED_WARNINGS.some((re) => re.test(msg))) return
    _originalWarn(...args)
  }
}

/**
 * Sets up the full LightPay test environment: warning suppression plus
 * any other one-time initialisation required before component tests run.
 */
export function setupLightPayTestEnvironment() {
  suppressLightPayKnownWarnings()
}

const advanceTimersByTime = async (ms = 0) => {
  jest.advanceTimersByTime(ms)
  return Promise.resolve()
}

async function actAndWait(fn, ms = 0) {
  await fn()
  act(() => jest.advanceTimersByTime(ms))
}

function setupComponent(jsx, opts = {}) {
  const { advanceTimersAfterInput = false, ...options } = opts
  const advanceTimers =
    options.advanceTimers ||
    (advanceTimersAfterInput === true
      ? () => jest.runAllTimers()
      : () => advanceTimersByTime(advanceTimersAfterInput || 0))

  render(jsx)

  return {
    user: userEvent.setup({
      ...options,
      advanceTimers
    })
  }
}

export * from '@testing-library/react'

export { actAndWait, setupComponent as render }
