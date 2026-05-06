// ─── Platform detection helpers ────────────────────────────────────────────────

/** The current Node.js platform string, e.g. "darwin", "win32", "linux" */
const CURRENT_PLATFORM = process.platform

/**
 * Returns true when the process is running on macOS.
 */
export function isWindows() {
  return CURRENT_PLATFORM === 'win32'
}

/**
 * Returns true when the process is running on macOS (Darwin kernel).
 */
export function isMacOS() {
  return CURRENT_PLATFORM === 'darwin'
}

/**
 * Returns true when the process is running on Linux.
 */
export function isLinux() {
  return CURRENT_PLATFORM === 'linux'
}

/**
 * Return a short human-readable name for the current platform.
 * Useful for UI labels and telemetry.
 *
 * @returns One of "macOS", "Windows", "Linux", or "Unknown"
 */
export function getPlatformName(): string {
  if (isMacOS()) return 'macOS'
  if (isWindows()) return 'Windows'
  if (isLinux()) return 'Linux'
  return 'Unknown'
}
