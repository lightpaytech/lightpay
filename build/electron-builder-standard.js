// build config for mac only

const baseConfig = require('./electron-builder-base.js')

const config = {
  ...baseConfig,
  electronVersion: '34.0.0',
  afterSign: './build/notarize.js',
  mac: {
    target: {
      target: 'default',
      arch: ['x64', 'arm64']
    },
    notarize: false,
    hardenedRuntime: true,
    gatekeeperAssess: false,
    entitlements: 'build/entitlements.mac.plist',
    requirements: 'build/electron-builder-requirements.txt',
    icon: 'build/icons/icon.icns'
  }
}

module.exports = config
