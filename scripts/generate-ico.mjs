#!/usr/bin/env node

import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.join(__dirname, '..')
const source = path.join(rootDir, 'asset', 'LightPayIcon.png')

const sizes = [16, 24, 32, 48, 64, 128, 256]
const tmpDir = path.join(rootDir, '.tmp-ico')
fs.mkdirSync(tmpDir, { recursive: true })

const pngBuffers = sizes.map((size) => {
  const out = path.join(tmpDir, `${size}.png`)
  execSync(`sips -Z ${size} "${source}" --out "${out}"`, { stdio: 'pipe' })
  return { size, data: fs.readFileSync(out) }
})

const headerSize = 6
const entrySize = 16
const dirSize = headerSize + entrySize * pngBuffers.length

const header = Buffer.alloc(headerSize)
header.writeUInt16LE(0, 0)
header.writeUInt16LE(1, 2)
header.writeUInt16LE(pngBuffers.length, 4)

const entries = Buffer.alloc(entrySize * pngBuffers.length)
let offset = dirSize

pngBuffers.forEach(({ size, data }, i) => {
  const base = i * entrySize
  entries.writeUInt8(size === 256 ? 0 : size, base + 0)
  entries.writeUInt8(size === 256 ? 0 : size, base + 1)
  entries.writeUInt8(0, base + 2)
  entries.writeUInt8(0, base + 3)
  entries.writeUInt16LE(1, base + 4)
  entries.writeUInt16LE(32, base + 6)
  entries.writeUInt32LE(data.length, base + 8)
  entries.writeUInt32LE(offset, base + 12)
  offset += data.length
})

const ico = Buffer.concat([header, entries, ...pngBuffers.map((p) => p.data)])

const outputs = [
  path.join(rootDir, 'asset', 'ico', 'LightPayIcon.ico'),
  path.join(rootDir, 'asset', 'ico', 'LightPayAppIcon.ico'),
  path.join(rootDir, 'build', 'icons', 'icon.ico')
]

outputs.forEach((p) => {
  fs.mkdirSync(path.dirname(p), { recursive: true })
  fs.writeFileSync(p, ico)
  console.log(`  ✅ ${path.relative(rootDir, p)} (${pngBuffers.length} sizes, ${ico.length} bytes)`)
})

fs.rmSync(tmpDir, { recursive: true, force: true })
console.log('\n✨ Multi-resolution ICO files generated.')
