const config = {
  electronVersion: '34.0.0',
  appId: 'com.lightpay.app',
  productName: 'LightPay',
  files: [
    'compiled',
    'bundle',
    '!compiled/main/dev',
    '!**/node_modules/**/testgui${/*}',
    '!**/node_modules/**/test${/*}',
    '!**/node_modules/**/tests${/*}',
    '!**/*.app.in${/*}',
    '!**/*.app.in/**/*',
    '!**/{*.h,*.c,*.cpp,*.cc,*.m,*.mm,*.cxx,*.hpp}',
    '!**/{Makefile,Makefile.*,*.mk,*.am,*.in,*.sln,*.vcproj,*.vcxproj}',
    // Drop arch-tagged prebuild fallback dirs from native modules. Each arch
    // build of the .app needs only the matching arch's binary in build/Release;
    // prebuild fallbacks confuse @electron/universal because identically-named
    // .node files exist in both archs' asars yet differ slightly in bytes.
    // node-gyp-build / node-pre-gyp picks build/Release first anyway.
    '!**/{bin,prebuilds}/darwin-arm64*${/*}',
    '!**/{bin,prebuilds}/darwin-arm64*/**/*',
    '!**/{bin,prebuilds}/darwin-x64*${/*}',
    '!**/{bin,prebuilds}/darwin-x64*/**/*'
  ]
}

module.exports = config
