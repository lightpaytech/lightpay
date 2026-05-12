// LightPay electron-builder config — unsigned x64-only build
// Used together with -arm64 variant + scripts/make-universal.mjs to assemble a
// universal .app without triggering @electron/rebuild's buggy dual-arch flow.

const baseConfig = require('./electron-builder-base.js')

module.exports = {
  ...baseConfig,
  appId: 'com.lightpay.app',
  productName: 'LightPay',
  artifactName: '${productName}-${version}-${os}-${arch}.${ext}',
  npmRebuild: true,
  mac: {
    target: { target: 'dir', arch: 'x64' },
    notarize: false,
    hardenedRuntime: false,
    gatekeeperAssess: false,
    identity: null,
    icon: 'build/icons/icon.icns'
  }
}
