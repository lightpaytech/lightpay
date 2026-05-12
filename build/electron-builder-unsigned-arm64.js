// LightPay electron-builder config — unsigned arm64-only build
// Paired with -x64 variant; merged via scripts/make-universal.mjs.

const baseConfig = require('./electron-builder-base.js')

module.exports = {
  ...baseConfig,
  appId: 'com.lightpay.app',
  productName: 'LightPay',
  artifactName: '${productName}-${version}-${os}-${arch}.${ext}',
  npmRebuild: true,
  mac: {
    target: { target: 'dir', arch: 'arm64' },
    notarize: false,
    hardenedRuntime: false,
    gatekeeperAssess: false,
    identity: null,
    icon: 'build/icons/icon.icns'
  }
}
