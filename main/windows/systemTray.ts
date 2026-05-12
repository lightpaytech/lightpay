import path from 'path'
import { app, screen, BrowserWindow, Menu, KeyboardEvent, Rectangle, Tray as ElectronTray } from 'electron'

import { capitalize } from '../../resources/utils'

const isMacOS = process.platform === 'darwin'

export type SystemTrayEventHandlers = {
  click: () => void
  clickShow: () => void
  clickHide: () => void
}

export class SystemTray {
  private clickHandlers: SystemTrayEventHandlers
  private electronTray?: ElectronTray

  constructor(clickHandlers: SystemTrayEventHandlers) {
    this.clickHandlers = clickHandlers
  }

  init(mainWindow: BrowserWindow) {
    // Electron Tray can only be instantiated when the app is ready
    // Use the colored Icon.png on macOS — naming a file *Template.png triggers
    // macOS's NSImage template behavior, which strips color and renders the
    // entire opaque region as a solid white/black silhouette. The LightPay
    // circular logo is colorful by design, so we ship the full-color variant.
    // On Windows, prefer the 256x256 AppIcon.png which Electron will scale
    // down crisply for the system tray.
    const trayIconPath = isMacOS
      ? path.join(__dirname, './Icon.png')
      : path.join(__dirname, './AppIcon.png')
    this.electronTray = new ElectronTray(trayIconPath)
    this.electronTray.setToolTip('LightPay')
    this.electronTray.on('click', (_event: KeyboardEvent, bounds: Rectangle) => {
      const mainWindowBounds = mainWindow.getBounds()
      const currentDisplay = screen.getDisplayMatching(bounds)
      const trayClickDisplay = screen.getDisplayMatching(mainWindowBounds)
      if (trayClickDisplay.id !== currentDisplay.id) {
        this.setContextMenu('show', { switchScreen: true })
      }
      this.clickHandlers.click()
    })
  }

  setContextMenu(
    type: string,
    { displaySummonShortcut = false, accelerator = 'Alt+/', switchScreen = false }
  ) {
    const separatorMenuItem: Electron.MenuItemConstructorOptions = {
      type: 'separator'
    }
    const menuItemLabelMap = {
      hide: 'Dismiss',
      show: 'Summon'
    }
    const label = menuItemLabelMap[type as keyof typeof menuItemLabelMap]
    const eventName = `click${capitalize(type)}`
    const actionMenuItem: Electron.MenuItemConstructorOptions = {
      label,
      click: () => this.clickHandlers[eventName as keyof typeof this.clickHandlers](),
      toolTip: `${label} LightPay`
    }
    const quitMenuItem = {
      label: 'Quit',
      click: () => app.quit()
    }

    if (displaySummonShortcut) {
      actionMenuItem.accelerator = accelerator
      actionMenuItem.registerAccelerator = false
    }

    const menu = Menu.buildFromTemplate([actionMenuItem, separatorMenuItem, quitMenuItem])

    this.electronTray?.setContextMenu(menu)
  }

  closeContextMenu() {
    this.electronTray?.closeContextMenu()
  }

  setTitle(title: string) {
    this.electronTray?.setTitle(title)
  }
}
