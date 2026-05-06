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
    '!**/{Makefile,Makefile.*,*.mk,*.am,*.in,*.sln,*.vcproj,*.vcxproj}'
  ]
}

module.exports = config
