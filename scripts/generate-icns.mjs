#!/usr/bin/env node
// LightPay build script
// Generates macOS .icns from the LightPay PNG source icon.

import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.join(__dirname, '..')

// Named path constants — update these if the icon source or output location changes
const ICON_SOURCE = path.join(rootDir, 'asset', 'LightPayIcon.png')
const ICON_OUTPUT = path.join(rootDir, 'build', 'icons', 'icon.icns')
const ICONSET_TMP = path.join(rootDir, '.tmp.iconset')

if (process.platform !== 'darwin') {
  console.log('⚠️  Skipping .icns generation (iconutil only available on macOS).')
  process.exit(0)
}

fs.rmSync(ICONSET_TMP, { recursive: true, force: true })
fs.mkdirSync(ICONSET_TMP, { recursive: true })

const variants = [
  { size: 16, name: 'icon_16x16.png' },
  { size: 32, name: 'icon_16x16@2x.png' },
  { size: 32, name: 'icon_32x32.png' },
  { size: 64, name: 'icon_32x32@2x.png' },
  { size: 128, name: 'icon_128x128.png' },
  { size: 256, name: 'icon_128x128@2x.png' },
  { size: 256, name: 'icon_256x256.png' },
  { size: 512, name: 'icon_256x256@2x.png' },
  { size: 512, name: 'icon_512x512.png' },
  { size: 1024, name: 'icon_512x512@2x.png' }
]

variants.forEach(({ size, name }) => {
  execSync(`sips -Z ${size} "${ICON_SOURCE}" --out "${path.join(ICONSET_TMP, name)}"`, { stdio: 'pipe' })
})

fs.mkdirSync(path.dirname(ICON_OUTPUT), { recursive: true })
execSync(`iconutil -c icns "${ICONSET_TMP}" -o "${ICON_OUTPUT}"`, { stdio: 'inherit' })
fs.rmSync(ICONSET_TMP, { recursive: true, force: true })

console.log(`  ✅ ${path.relative(rootDir, ICON_OUTPUT)}`)
console.log('\n✨ macOS .icns generated.')
