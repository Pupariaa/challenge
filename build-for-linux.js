#!/usr/bin/env node

import { execSync } from 'child_process'
import { existsSync, mkdirSync, copyFileSync, readdirSync, statSync } from 'fs'
import { join } from 'path'

console.log('Build Vite...')
try {
    execSync('npm run build', { stdio: 'inherit' })
    console.log('Build Vite terminé')
} catch (error) {
    console.error('Erreur build Vite:', error.message)
    process.exit(1)
}

console.log('Création du dossier de déploiement...')
mkdirSync(deployDir, { recursive: true })

const filesToCopy = [
    'server.js',
    'package.json',
    'package-lock.json',
    '.env'
]

console.log('Copie des fichiers essentiels...')
filesToCopy.forEach(file => {
    if (existsSync(file)) {
        copyFileSync(file, join(deployDir, file))
        console.log(`${file} copié`)
    } else {
        console.log(`${file} non trouvé`)
    }
})

console.log('Copie du dossier dist...')
if (existsSync('dist')) {
    execSync(`cp -r dist ${deployDir}/`, { stdio: 'inherit' })
    console.log('Dossier dist copié')
} else {
    console.log('Dossier dist non trouvé')
    process.exit(1)
}

console.log('Copie du dossier data...')
if (existsSync('data')) {
    execSync(`cp -r data ${deployDir}/`, { stdio: 'inherit' })
    console.log('Dossier data copié')
} else {
    console.log('Dossier data non trouvé')
}

console.log('Copie de node_modules...')
if (existsSync('node_modules')) {
    execSync(`cp -r node_modules ${deployDir}/`, { stdio: 'inherit' })
    console.log('node_modules copié')
} else {
    console.log('node_modules non trouvé')
    process.exit(1)
}


console.log('')
console.log('🎉 Build terminé !')
