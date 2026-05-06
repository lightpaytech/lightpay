# Electron Upgrade Notes

## v23 → v34

LightPay upgraded from Electron 23.1.3 to Electron 34.0.0.

### Key changes:
- Electron 34 bundles Node.js 22 (matches project requirement)
- V8 updated to 13.2 (improved JS performance)
- Chromium updated to 132 (improved web standards support)
- Security improvements: stricter CSP defaults, improved context isolation

### Breaking changes addressed:
- `ipcRenderer.send()` now validates IPC channel names more strictly — LightPay uses `lightpay:*` naming convention
- Updated `nativeTheme` API usage in tray window
- Reviewed `webContents.executeJavaScript()` usage for strict mode compliance

### Build:
Run `npm run setup:deps` after pulling to install new electron binary.
