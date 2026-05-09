// LightPay electron-builder config — unsigned build for testing
// No notarization, no Apple Developer ID required.
// Produces an unsigned .app + .dmg. Gatekeeper will warn on first launch;
// right-click → Open, or run: xattr -cr "/Applications/LightPay.app"

const baseConfig = require('./electron-builder-base.js')

const config = {
  ...baseConfig,
  appId: 'com.lightpay.app',
  productName: 'LightPay',
  artifactName: '${productName}-${version}-${os}-${arch}.${ext}',
  npmRebuild: false,
  mac: {
    target: {
      target: 'dmg',
      arch: ['x64']
    },
    notarize: false,
    hardenedRuntime: false,
    gatekeeperAssess: false,
    identity: null,
    icon: 'build/icons/icon.icns'
  }
}

module.exports = config
