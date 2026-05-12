// Build config for Windows distribution (NSIS installer + portable)

const baseConfig = require('./electron-builder-base.js')

const winFiles = (baseConfig.files || []).filter(
  (pattern) => !pattern.includes('darwin-')
)

const config = {
  ...baseConfig,
  files: winFiles,
  electronVersion: '34.0.0',
  win: {
    target: [
      { target: 'nsis', arch: ['x64', 'arm64'] },
      { target: 'portable', arch: ['x64'] }
    ],
    icon: 'build/icons/icon.ico',
    publisherName: 'LightPay Labs',
    artifactName: '${productName}-${version}-${arch}.${ext}'
  },
  nsis: {
    oneClick: false,
    perMachine: false,
    allowToChangeInstallationDirectory: true,
    createDesktopShortcut: true,
    createStartMenuShortcut: true,
    shortcutName: 'LightPay',
    runAfterFinish: true,
    deleteAppDataOnUninstall: false
  },
  portable: {
    artifactName: '${productName}-${version}-portable-${arch}.${ext}'
  }
}

module.exports = config
