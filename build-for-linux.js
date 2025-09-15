#!/usr/bin/env node

import { execSync } from 'child_process'
import { existsSync, mkdirSync, copyFileSync, writeFileSync } from 'fs'
import { join } from 'path'

const isWindows = process.platform === 'win32'
const deployDir = 'deploy'

console.log('Building Vite...')
try {
    execSync('npm run build', { stdio: 'inherit' })
    console.log('Vite build completed')
} catch (error) {
    console.error('Vite build error:', error.message)
    process.exit(1)
}

if (existsSync(deployDir)) {
    console.log('Removing existing deploy directory...')
    execSync(isWindows ? `rmdir /s /q ${deployDir}` : `rm -rf ${deployDir}`, { stdio: 'inherit' })
}

console.log('Creating deployment directory...')
mkdirSync(deployDir, { recursive: true })

const filesToCopy = ['server.js', 'package.json', 'package-lock.json', '.env']

console.log('Copying essential files...')
filesToCopy.forEach(file => {
    existsSync(file) ? copyFileSync(file, join(deployDir, file)) : console.log(`${file} not found`)
})

console.log('Copying dist directory...')
if (existsSync('dist')) {
    execSync(isWindows ? `xcopy dist ${join(deployDir, 'dist')} /e /i /h /y` : `cp -r dist ${deployDir}/`, { stdio: 'inherit' })
    console.log('Dist directory copied')
} else {
    console.log('Dist directory not found')
    process.exit(1)
}

console.log('Copying data directory...')
if (existsSync('data')) {
    execSync(isWindows ? `xcopy data ${join(deployDir, 'data')} /e /i /h /y` : `cp -r data ${deployDir}/`, { stdio: 'inherit' })
    console.log('Data directory copied')
} else {
    console.log('Data directory not found')
}

console.log('Copying node_modules...')
if (existsSync('node_modules')) {
    execSync(isWindows ? `xcopy node_modules ${join(deployDir, 'node_modules')} /e /i /h /y` : `cp -r node_modules ${deployDir}/`, { stdio: 'inherit' })
    console.log('Node modules copied')
} else {
    console.log('Node modules not found')
    process.exit(1)
}


console.log('')
console.log('Build completed!')
console.log(`Deployment directory: ${deployDir}`)
console.log('')
console.log('To deploy:')