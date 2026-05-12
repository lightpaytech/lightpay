import electron, { BrowserView, BrowserWindow } from 'electron'
import path from 'path'

import { createWindow } from '../window'
import topRight from './topRight'

const isDev = process.env.NODE_ENV === 'development'

/**
 * Represents a top-level Electron BrowserWindow that hosts a LightPay frame UI.
 *
 * LightPay uses a "frame instance" pattern where each user-facing wallet window is
 * backed by a single BrowserWindow that embeds one or more BrowserViews for dapp
 * content. The active view is tracked via `showingView`, while `frameId` ties the
 * window back to the logical LightPay record managed by the application state layer.
 *
 * Window lifecycle:
 *   create() → place() → ready-to-show → user interaction
 *   reposition() may be called any time the display geometry changes (e.g. the user
 *   moves the window to a different monitor).
 */
export interface FrameInstance extends BrowserWindow {
  /**
   * The unique identifier of the logical LightPay record this window was created for.
   * Set immediately after the BrowserWindow is constructed; undefined only in the
   * brief window between `new BrowserWindow()` and the first `place()` call.
   */
  frameId?: string

  /**
   * Named BrowserViews embedded in this window, keyed by an arbitrary view name
   * (e.g. a dapp origin or a well-known UI slot name).
   * Views are created lazily and persist for the lifetime of the frame instance.
   */
  views?: Record<string, BrowserView>

  /**
   * The key of the currently visible BrowserView inside `views`, or an empty
   * string when no view is being displayed (i.e. the main frame UI is in front).
   */
  showingView?: string
}

/**
 * Generates a unique identifier suitable for use as a `FrameInstance.frameId`.
 *
 * Uses a combination of a timestamp and a random suffix so that IDs remain
 * monotonically orderable while still being collision-resistant across rapid
 * successive calls within the same millisecond.
 *
 * @returns A string of the form `"frame-<timestamp>-<random hex>"`.
 */
export function createFrameInstanceId(): string {
  const ts = Date.now().toString(16)
  const rand = Math.floor(Math.random() * 0xffff)
    .toString(16)
    .padStart(4, '0')
  return `frame-${ts}-${rand}`
}

/**
 * Narrows an unknown value to `FrameInstance`.
 *
 * A value is considered a valid FrameInstance when it is a non-null object that
 * possesses the three optional extension properties defined on the interface. The
 * check is intentionally lenient — it only validates shape, not BrowserWindow
 * prototype membership — because Electron proxies objects across the IPC boundary
 * and instanceof checks are unreliable in that context.
 *
 * @param obj - The value to test.
 * @returns `true` if `obj` is shaped like a FrameInstance.
 */
export function isValidFrameInstance(obj: unknown): obj is FrameInstance {
  if (obj === null || typeof obj !== 'object') return false
  const candidate = obj as Record<string, unknown>
  const hasFrameId = !('frameId' in candidate) || typeof candidate.frameId === 'string' || candidate.frameId === undefined
  const hasViews = !('views' in candidate) || typeof candidate.views === 'object' || candidate.views === undefined
  const hasShowingView = !('showingView' in candidate) || typeof candidate.showingView === 'string' || candidate.showingView === undefined
  return hasFrameId && hasViews && hasShowingView
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Sizes and positions a frame instance on the display nearest the cursor.
 *
 * The window is placed in the top-right quadrant of the work area (excluding
 * taskbars/docks) and offset slightly inward so it does not overlap system UI.
 * A maximum width cap derived from the window height preserves a comfortable
 * aspect ratio on ultra-wide displays.
 */
const place = (frameInstance: FrameInstance) => {
  // Resolve the work area of whichever physical screen the cursor is on.
  const area = electron.screen.getDisplayNearestPoint(electron.screen.getCursorScreenPoint()).workArea

  // Height fills the work area with a small margin for visual breathing room.
  const height = area.height - 160

  // Cap width to maintain a readable aspect ratio (~1.24 : 1 height-to-width).
  const maxWidth = Math.floor(height * 1.24)
  const targetWidth = area.width - 460
  const width = targetWidth > maxWidth ? maxWidth : targetWidth

  frameInstance.setMinimumSize(400, 300)
  frameInstance.setSize(width, height)

  // Anchor to the top-right of the work area with a small inset.
  const pos = topRight(frameInstance)
  frameInstance.setPosition(pos.x - 440, pos.y + 80)
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export default {
  /**
   * Recalculates the size and position of an existing frame instance.
   * Call this when the user drags the window to a different display or the
   * system display configuration changes.
   */
  reposition: (frameInstance: FrameInstance) => {
    place(frameInstance)
  },

  /**
   * Creates a new BrowserWindow for the given LightPay window record, loads the dapp UI, and
   * performs the initial placement.
   *
   * @param frame - The logical LightPay record whose `id` will be stored on the instance.
   * @returns The fully initialised FrameInstance, ready to be shown.
   */
  create: (frame: LightPay) => {
    // Start with zero dimensions; `place()` will set the real size immediately.
    const isMacOS = process.platform === 'darwin'
    const frameOpts: Electron.BrowserWindowConstructorOptions = {
      x: 0,
      y: 0,
      width: 0,
      height: 0,
      titleBarStyle: 'hidden',
      icon: path.join(__dirname, './AppIcon.png')
    }
    if (isMacOS) {
      frameOpts.trafficLightPosition = { x: 10, y: 9 }
    }
    const frameInstance: FrameInstance = createWindow('frameInstance', frameOpts)

    frameInstance.loadURL(
      isDev ? 'http://localhost:1234/dapp/index.dev.html' : `file://${process.env.BUNDLE_LOCATION}/dapp.html`
    )

    frameInstance.on('ready-to-show', () => {
      frameInstance.show()
    })

    // Attach LightPay-specific metadata to the BrowserWindow instance.
    frameInstance.showingView = ''
    frameInstance.frameId = frame.id
    frameInstance.views = {}

    place(frameInstance)

    return frameInstance
  }
}
