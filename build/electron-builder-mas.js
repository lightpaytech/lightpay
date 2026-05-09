// Build config for Mac App Store (MAS) distribution

const baseConfig = require('./electron-builder-base.js')

const config = {
  ...baseConfig,
  electronVersion: '34.0.0',
  appId: 'com.lightpay.app',
  // Native modules are pre-built via `npx @electron/rebuild --parallel 1` so
  // electron-builder doesn't need to rerun the rebuild — its parallel rebuild
  // races on the gyp .deps directory creation on macOS clang.
  npmRebuild: false,
  mac: {
    target: {
      target: 'mas',
      arch: 'arm64'
    },
    hardenedRuntime: false,
    gatekeeperAssess: false,
    entitlements: 'build/entitlements.mas.plist',
    entitlementsInherit: 'build/entitlements.mas.inherit.plist',
    provisioningProfile: 'build/embedded.provisionprofile',
    identity: 'Apple Distribution: Kesak NEVAS (R59GD5Q77B)',
    icon: 'build/icons/icon.icns'
  },
  mas: {
    entitlements: 'build/entitlements.mas.plist',
    entitlementsInherit: 'build/entitlements.mas.inherit.plist',
    hardenedRuntime: false,
    provisioningProfile: 'build/embedded.provisionprofile',
    identity: 'Kesak NEVAS (R59GD5Q77B)',
    icon: 'build/icons/icon.icns'
  }
}

module.exports = config
