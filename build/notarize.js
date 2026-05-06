const fs = require('fs')
const { execFileSync } = require('child_process')
const path = require('path')
const electronNotarize = require('@electron/notarize')

module.exports = async function (params) {
  if (process.platform !== 'darwin') return // Only notarize the app on macOS
  const appId = 'com.lightpay.app' // Same appId in electron-builder
  const appPath = path.join(params.appOutDir, `${params.packager.appInfo.productFilename}.app`)
  if (!fs.existsSync(appPath)) throw new Error(`Cannot find application at: ${appPath}`)

  console.log(`Notarizing ${appId} found at ${appPath}`)

  try {
    await electronNotarize.notarize({
      tool: 'notarytool',
      appBundleId: appId,
      appPath: appPath,
      appleApiKey: process.env.APPLE_API_KEY_PATH || '/Users/ravicyberpoint/Downloads/AuthKey_4HG4J5JP26.p8',
      appleApiKeyId: process.env.APPLE_API_KEY_ID || '4HG4J5JP26',
      appleApiIssuer: process.env.APPLE_API_ISSUER || '',
    })

    // verify signed and notarized application
    execFileSync(
      'spctl',
      ['--assess', '--type', 'execute', '--verbose', '--ignore-cache', '--no-cache', appPath],
      {}
    )

    console.log(`Successfully notarized ${appId}`)
  } catch (error) {
    console.error(error)
    throw error
  }
}
