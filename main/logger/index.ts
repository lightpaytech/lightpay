// LightPay Logger — wraps the underlying logging implementation

// Dynamic import to decouple interface from framelabs dependency
function createLogger(name: string) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { createLogger: createFrameLogger } = require('@framelabs/logger')
    return createFrameLogger(name)
  } catch {
    // Fallback logger if framelabs logger is unavailable
    const prefix = `[LightPay:${name}]`
    return {
      error: (...args: unknown[]) => console.error(prefix, ...args),
      warn: (...args: unknown[]) => console.warn(prefix, ...args),
      info: (...args: unknown[]) => console.info(prefix, ...args),
      verbose: (...args: unknown[]) => console.log(prefix, ...args),
      debug: (...args: unknown[]) => console.debug(prefix, ...args),
      silly: (...args: unknown[]) => console.debug(prefix, ...args)
    }
  }
}

export { createLogger }
export default createLogger
