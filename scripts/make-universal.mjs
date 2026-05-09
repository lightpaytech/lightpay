#!/usr/bin/env node
// Merge dist/mac (x64) and dist/mac-arm64 (arm64) into a universal .app
// using @electron/universal. Lipo-merges build/Release/*.node into fat
// binaries. Arch-tagged prebuild fallback dirs (bin/darwin-{arch}-*,
// prebuilds/darwin-{arch}) are already excluded from both arch builds via
// electron-builder's `files` patterns, so there are no conflicting same-arch
// binaries for lipo to choke on.

import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { makeUniversalApp } from '@electron/universal'

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const x64App = path.join(root, 'dist', 'mac', 'LightPay.app')
const arm64App = path.join(root, 'dist', 'mac-arm64', 'LightPay.app')
const outApp = path.join(root, 'dist', 'mac-universal', 'LightPay.app')

for (const p of [x64App, arm64App]) {
  if (!fs.existsSync(p)) {
    console.error(`missing ${p} — run electron-builder for both archs first`)
    process.exit(1)
  }
}

fs.rmSync(path.dirname(outApp), { recursive: true, force: true })
fs.mkdirSync(path.dirname(outApp), { recursive: true })

await makeUniversalApp({
  x64AppPath: x64App,
  arm64AppPath: arm64App,
  outAppPath: outApp,
  force: true,
  x64ArchFiles: '**/build/Release/*.node',
  mergeASARs: true
})

console.log(`✅ universal app written to ${path.relative(root, outApp)}`)
