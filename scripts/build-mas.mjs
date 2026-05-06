#!/usr/bin/env node
// Build script for Mac App Store submission
import { spawn } from 'child_process'

async function run(cmd, args) {
  return new Promise((resolve, reject) => {
    const ps = spawn(cmd, args, { stdio: 'inherit', shell: false })
    ps.once('close', code => code === 0 ? resolve() : reject(new Error(`${cmd} failed: ${code}`)))
  })
}

async function main() {
  console.log('Building LightPay for Mac App Store...')

  // Step 1: Compile TypeScript
  await run('npm', ['run', 'compile'])
  console.log('TypeScript compiled ✓')

  // Step 2: Bundle with Parcel
  await run('npm', ['run', 'bundle'])
  console.log('Bundle complete ✓')

  // Step 3: Build MAS package
  await run('npx', ['electron-builder', '--config=build/electron-builder-mas.js'])
  console.log('MAS build complete ✓')
  console.log('Upload the .pkg file from dist/ to Transporter')
}

main().catch(e => { console.error(e); process.exit(1) })
