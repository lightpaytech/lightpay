import { BrowserWindow, BrowserView, BrowserWindowConstructorOptions, shell } from 'electron'
import log from 'electron-log'
import path from 'path'

import store from '../store'

import type { ChainId } from '../store/state'

export function createWindow(
  name: string,
  opts?: BrowserWindowConstructorOptions,
  webPreferences: BrowserWindowConstructorOptions['webPreferences'] = {}
) {
  log.verbose(`Creating ${name} window`)

  const browserWindow = new BrowserWindow({
    ...opts,
    frame: false,
    acceptFirstMouse: true,
    transparent: process.platform === 'darwin',
    show: false,
    backgroundColor: '#03050f', // LightPay dark background — always dark regardless of colorway
    skipTaskbar: true,
    webPreferences: {
      ...webPreferences,
      preload: path.resolve(process.env.BUNDLE_LOCATION, 'bridge.js'),
      backgroundThrottling: false, // Allows repaint when window is hidden
      contextIsolation: true,
      webviewTag: false,
      sandbox: true,
      defaultEncoding: 'utf-8',
      nodeIntegration: false,
      scrollBounce: true,
      navigateOnDragDrop: false,
      disableBlinkFeatures: 'Auxclick'
    }
  })

  browserWindow.webContents.once('did-finish-load', () => {
    log.info(`Created ${name} renderer process, pid:`, browserWindow.webContents.getOSProcessId())
  })
  browserWindow.webContents.on('will-navigate', (e) => e.preventDefault()) // Prevent navigation
  browserWindow.webContents.on('will-attach-webview', (e) => e.preventDefault()) // Prevent attaching <webview>
  browserWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' })) // Prevent new windows

  return browserWindow
}

export function createViewInstance(
  ens = '',
  webPreferences: BrowserWindowConstructorOptions['webPreferences'] = {}
) {
  const viewInstance = new BrowserView({
    webPreferences: {
      ...webPreferences,
      contextIsolation: true,
      webviewTag: false,
      sandbox: true,
      defaultEncoding: 'utf-8',
      nodeIntegration: false,
      scrollBounce: true,
      navigateOnDragDrop: false,
      disableBlinkFeatures: 'Auxclick',
      preload: path.resolve('./main/windows/viewPreload.js'),
      partition: `persist:${ens}`
    }
  })

  viewInstance.webContents.on('will-navigate', (e) => e.preventDefault())
  viewInstance.webContents.on('will-attach-webview', (e) => e.preventDefault())
  viewInstance.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))

  const lightThemeCSS = `
    html, body {
      background-color: rgb(240, 230, 243) !important;
      color: rgb(20, 40, 56) !important;
    }
    body {
      background-image:
        radial-gradient(ellipse 80% 60% at 50% 0%, rgba(220, 165, 0, 0.4), transparent 65%),
        radial-gradient(ellipse 80% 60% at 50% 100%, rgba(220, 165, 0, 0.4), transparent 65%) !important;
    }
    body, body p, body span, body label,
    body h1, body h2, body h3, body h4, body h5, body h6 {
      color: rgb(20, 40, 56) !important;
    }
    button, [role="button"], input[type="submit"], input[type="button"],
    a[class*="utton"], a[class*="onnect"], a[class*="end"],
    [class*="utton"], [class*="Btn"], [class*="onnect"], [class*="Send"],
    [class*="action" i], [class*="primary" i] {
      background: rgb(255, 240, 200) !important;
      background-color: rgb(255, 240, 200) !important;
      border: 1px solid rgba(220, 165, 0, 0.7) !important;
      box-shadow: 0 2px 10px rgba(220, 165, 0, 0.35) !important;
    }
    button, button *, [role="button"], [role="button"] *,
    a[class*="utton"], a[class*="utton"] *,
    a[class*="onnect"], a[class*="onnect"] *,
    [class*="utton"], [class*="utton"] *,
    [class*="Btn"], [class*="Btn"] *,
    [class*="onnect"], [class*="onnect"] *,
    [class*="Send"], [class*="Send"] *,
    [class*="action" i], [class*="action" i] *,
    [class*="primary" i], [class*="primary" i] * {
      color: rgb(0, 0, 0) !important;
    }
    button:hover, [role="button"]:hover,
    [class*="utton"]:hover, [class*="onnect"]:hover, [class*="Send"]:hover {
      background: rgb(255, 230, 160) !important;
      background-color: rgb(255, 230, 160) !important;
      box-shadow: 0 4px 16px rgba(220, 165, 0, 0.55) !important;
    }
  `
  viewInstance.webContents.on('did-finish-load', () => {
    viewInstance.webContents.insertCSS(lightThemeCSS).catch(() => {})
  })

  return viewInstance
}

const externalWhitelist = [
  'https://lightpay.tech',
  'https://github.com/lightpay-labs/lightpay/issues/new',
  'https://github.com/lightpay-labs/lightpay/blob/master/LICENSE',
  'https://shop.ledger.com/pages/ledger-nano-x?r=1fb484cde64f',
  'https://shop.trezor.io/?offer_id=10&aff_id=3270',
  'https://discord.gg/UH7NGqY',
  'https://lightpay.canny.io',
  'https://feedback.lightpay.tech',
  'https://opensea.io'
]

const isValidReleasePage = (url: string) => url.startsWith('https://github.com/lightpay-labs/lightpay/releases/tag/')
const isWhitelistedHost = (url: string) =>
  externalWhitelist.some((entry) => url === entry || url.startsWith(entry + '/'))

export function openExternal(url = '') {
  if (isWhitelistedHost(url) || isValidReleasePage(url)) {
    shell.openExternal(url)
  }
}

export function openBlockExplorer({ id, type }: ChainId, hash?: string, account?: string) {
  // remove trailing slashes from the base url
  const explorer = (store('main.networks', type, id, 'explorer') || '').replace(/\/+$/, '')

  if (explorer) {
    if (hash) {
      const hashPath = hash && `/tx/${hash}`
      shell.openExternal(`${explorer}${hashPath}`)
    } else if (account) {
      const accountPath = account && `/address/${account}`
      shell.openExternal(`${explorer}${accountPath}`)
    } else {
      shell.openExternal(`${explorer}`)
    }
  }
}
