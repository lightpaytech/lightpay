// LightPay electron-builder config — unsigned universal build for testing
// No notarization, no Apple Developer ID required.
// Produces an unsigned universal .app + .dmg that runs on Intel and Apple Silicon.
// Gatekeeper will warn on first launch; right-click → Open, or run:
//   xattr -cr "/Applications/LightPay.app"

const baseConfig = require('./electron-builder-base.js')

const config = {
  ...baseConfig,
  appId: 'com.lightpay.app',
  productName: 'LightPay',
  artifactName: '${productName}-${version}-${os}-${arch}.${ext}',
  // Let electron-builder rebuild native modules for each arch so the universal
  // merge has matching x64 + arm64 prebuilds. Set CONCURRENCY=1 for the rebuild
  // to avoid the gyp .deps race on macOS clang.
  npmRebuild: true,
  mac: {
    target: {
      target: 'dmg',
      arch: 'universal'
    },
    notarize: false,
    hardenedRuntime: false,
    gatekeeperAssess: false,
    identity: null,
    icon: 'build/icons/icon.icns'
  }
}

module.exports = config
