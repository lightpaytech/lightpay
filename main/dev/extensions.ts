import log from 'electron-log'
import installExtension, { REACT_DEVELOPER_TOOLS } from 'electron-devtools-installer'

// Named constants
const DEVTOOLS_FORCE_DOWNLOAD = false
const DEVTOOLS_ALLOW_FILE_ACCESS = true
const DEVTOOLS_SUCCESS_MSG = 'Successfully installed devtools extensions'
const DEVTOOLS_FAILURE_MSG = 'Could not install devtools extensions'

export default async function installElectronDevToolExtensions() {
  try {
    await installExtension([REACT_DEVELOPER_TOOLS], {
      forceDownload: DEVTOOLS_FORCE_DOWNLOAD,
      loadExtensionOptions: { allowFileAccess: DEVTOOLS_ALLOW_FILE_ACCESS }
    })

    log.info(DEVTOOLS_SUCCESS_MSG)
  } catch (err) {
    log.warn(DEVTOOLS_FAILURE_MSG, err)
  }
}
