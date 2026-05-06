import electron from 'electron'
import { FrameInstance } from './frameInstances'

// ---------------------------------------------------------------------------
// Named constants for positioning magic values
// ---------------------------------------------------------------------------

/**
 * Number of pixels to inset the window from the right edge of the work area.
 * A value of 0 means the right edge of the window aligns exactly with the
 * right edge of the display's work area.
 */
const RIGHT_EDGE_INSET = 0

/**
 * Number of pixels to inset the window from the top edge of the work area.
 * A value of 0 means the top edge of the window aligns with the top of the
 * work area (below any system menu bar / taskbar).
 */
const TOP_EDGE_INSET = 0

// ---------------------------------------------------------------------------
// Pure helper — usable in tests without a real Electron environment
// ---------------------------------------------------------------------------

/**
 * Calculates the top-right anchor position for a window of the given pixel
 * dimensions within a work area that starts at (`areaX`, `areaY`) and is
 * `areaWidth` pixels wide.
 *
 * The returned coordinates are the **top-left corner** of the window so that
 * its right edge lands at the right boundary of the work area.
 *
 * @param screenWidth  - Total width of the work area in pixels.
 * @param screenHeight - Total height of the work area in pixels (unused for the
 *   x/y calculation but accepted for API completeness and future vertical insets).
 * @param windowWidth  - Width of the window to position.
 * @param areaX        - X origin of the work area (non-zero on secondary displays).
 * @param areaY        - Y origin of the work area.
 * @returns An `{ x, y }` pair representing the top-left corner of the window.
 */
export function getTopRightPosition(
  screenWidth: number,
  screenHeight: number,
  windowWidth: number,
  areaX = 0,
  areaY = 0
): { x: number; y: number } {
  return {
    x: Math.floor(areaX + screenWidth - windowWidth - RIGHT_EDGE_INSET),
    y: areaY + TOP_EDGE_INSET
  }
}

// ---------------------------------------------------------------------------
// Exported default — Electron-aware wrapper
// ---------------------------------------------------------------------------

/**
 * Returns the top-right position for `window` on the display nearest the
 * current cursor location.
 *
 * This is the primary entry point used by `frameInstances.ts` when placing
 * a new frame or repositioning an existing one.  It wraps `getTopRightPosition`
 * with live Electron screen data so callers do not need to query the display
 * themselves.
 *
 * @param window - The FrameInstance whose current width is used for the calculation.
 * @returns An `{ x, y }` pair for the top-left corner of `window` when anchored
 *   to the top-right of the nearest work area.
 */
export default function topRight(window: FrameInstance): { x: number; y: number } {
  const area = electron.screen.getDisplayNearestPoint(electron.screen.getCursorScreenPoint()).workArea
  const [windowWidth] = window.getSize()

  return getTopRightPosition(area.width, area.height, windowWidth, area.x, area.y)
}
