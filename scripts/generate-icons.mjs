#!/usr/bin/env node

/**
 * LightPay Icon Generation Script
 * 
 * This script generates all required icon sizes for macOS, Windows, and Linux
 * from a single source image (asset/LightPayIcon.png).
 * 
 * Run: node scripts/generate-icons.mjs
 */

import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.join(__dirname, '..')

// Source icon
const sourceIcon = path.join(rootDir, 'asset', 'LightPayIcon.png')

// Check if source exists
if (!fs.existsSync(sourceIcon)) {
  console.error('Error: Source icon not found at asset/LightPayIcon.png')
  process.exit(1)
}

console.log('🎨 Generating LightPay icons for all platforms...')
console.log(`Source: ${sourceIcon}`)

// Icon configurations
const iconConfigs = [
  // Main app icons (build/icons/) - electron-builder will auto-generate platform-specific formats
  { src: sourceIcon, dest: path.join(rootDir, 'build', 'icons', 'icon.png'), size: 512 },
  { src: sourceIcon, dest: path.join(rootDir, 'build', 'icons', '512x512.png'), size: 512 },
  
  // Tray icons for macOS (main/windows/)
  // macOS uses template icons for proper dark mode support
  { src: sourceIcon, dest: path.join(rootDir, 'main', 'windows', 'Icon.png'), size: 22 },
  { src: sourceIcon, dest: path.join(rootDir, 'main', 'windows', 'Icon@2x.png'), size: 44 },
  { src: sourceIcon, dest: path.join(rootDir, 'main', 'windows', 'IconTemplate.png'), size: 22 },
  { src: sourceIcon, dest: path.join(rootDir, 'main', 'windows', 'IconTemplate@2x.png'), size: 44 },
  
  // App icon for dialogs (main/windows/)
  { src: sourceIcon, dest: path.join(rootDir, 'main', 'windows', 'AppIcon.png'), size: 256 },
  
  // Asset copies
  { src: sourceIcon, dest: path.join(rootDir, 'asset', 'png', 'LightPayAppIcon.png'), size: 512 },
  { src: sourceIcon, dest: path.join(rootDir, 'asset', 'png', 'LightPayAppIcon.png'), size: 512 },
]

// Generate icons using sips (macOS built-in)
function generateIcon(config) {
  const { src, dest, size } = config
  
  // Ensure directory exists
  const dir = path.dirname(dest)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  
  try {
    // Use sips to resize the image
    execSync(`sips -Z ${size} "${src}" --out "${dest}"`, { stdio: 'pipe' })
    console.log(`  ✅ ${path.relative(rootDir, dest)} (${size}x${size})`)
    return true
  } catch (error) {
    console.error(`  ❌ Failed to generate ${dest}: ${error.message}`)
    return false
  }
}

// Generate all icons
let successCount = 0
let failCount = 0

for (const config of iconConfigs) {
  if (generateIcon(config)) {
    successCount++
  } else {
    failCount++
  }
}

// Windows ICO note
console.log('\n📝 Note for Windows:')
console.log('  • Windows .ico file requires additional tooling (icotool or online converter)')
console.log('  • Please manually update asset/ico/LightPayAppIcon.ico if the logo changes')
console.log('  • electron-builder can also generate .ico from the PNG automatically')

console.log(`\n✨ Generated ${successCount} icons (${failCount} failed)`)

if (failCount === 0) {
  console.log('\n🚀 All icons ready for building!')
  console.log('   Run: npm run build')
} else {
  process.exit(1)
}
