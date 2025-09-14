#!/usr/bin/env node

import { execSync } from 'child_process'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

async function buildDeploy() {
    try {
        console.log('🚀 Building deployment package...')

        const rootDir = resolve(__dirname, '..')
        const deployDir = resolve(rootDir, 'deploy')

        // 1. Nettoyer le dossier deploy s'il existe
        if (existsSync(deployDir)) {
            console.log('🧹 Cleaning existing deploy folder...')
            execSync(`rmdir /s /q "${deployDir}"`, { stdio: 'inherit' })
        }

        // 2. Créer le dossier deploy
        mkdirSync(deployDir, { recursive: true })

        // 3. Build l'application
        console.log('📦 Building application...')
        execSync('npm run build', { cwd: rootDir, stdio: 'inherit' })

        // 4. Copier les fichiers compilés
        console.log('📋 Copying build files...')
        const distDir = resolve(rootDir, 'dist')
        // Utiliser robocopy sur Windows pour une copie plus robuste
        try {
            execSync(`robocopy "${distDir}" "${deployDir}" /E /NFL /NDL /NJH /NJS /nc /ns /np`, { stdio: 'inherit' })
        } catch (error) {
            // robocopy retourne un code de sortie même en cas de succès, donc on continue
            if (error.status !== 1) {
                throw error
            }
        }

        // 5. Copier package.json et créer package-lock.json minimal
        console.log('📄 Creating deployment package.json...')
        const packageJson = JSON.parse(readFileSync(resolve(rootDir, 'package.json'), 'utf8'))

        // Créer un package.json minimal pour le déploiement
        const deployPackageJson = {
            name: packageJson.name,
            version: packageJson.version,
            type: 'module',
            main: 'server.js',
            scripts: {
                start: 'node server.js'
            },
            dependencies: {
                express: packageJson.dependencies.express
            },
            engines: {
                node: '>=18.0.0'
            }
        }

        writeFileSync(
            resolve(deployDir, 'package.json'),
            JSON.stringify(deployPackageJson, null, 2)
        )

        // 6. Créer le serveur standalone
        console.log('🖥️ Creating standalone server...')
        const serverContent = `#!/usr/bin/env node

import express from 'express'
import { fileURLToPath } from 'url'
import { dirname, join, resolve } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const app = express()
const port = process.env.PORT || 8080

// Servir les fichiers statiques
app.use(express.static(__dirname))

// Toutes les routes servent index.html (pour le routing SPA)
app.get('*', (req, res) => {
    res.sendFile(join(__dirname, 'index.html'))
})

app.listen(port, () => {
    console.log(\`🎮 Hey Bobby game server running at: http://localhost:\${port}\`)
    console.log('Press Ctrl+C to stop the server')
})

// Gestion propre de l'arrêt
process.on('SIGINT', () => {
    console.log('\\n🛑 Shutting down server...')
    process.exit(0)
})
`

        writeFileSync(resolve(deployDir, 'server.js'), serverContent)

        // 7. Créer un README pour le déploiement
        const readmeContent = `# Hey Bobby - Deployment Package

## 🚀 Déploiement rapide

Ce dossier contient tout ce qu'il faut pour déployer votre jeu sur n'importe quel hébergeur Node.js.

### Installation et démarrage

\`\`\`bash
npm install
npm start
\`\`\`

### Variables d'environnement

- \`PORT\`: Port du serveur (défaut: 8080)
- \`NODE_ENV\`: Environnement (production par défaut)

### Hébergeurs compatibles

- Pulseheberg
- Heroku
- Railway
- Render
- Vercel
- Netlify

### Structure

- \`server.js\`: Serveur Express standalone
- \`package.json\`: Dépendances minimales
- \`index.html\`: Point d'entrée de l'application
- \`assets/\`: Fichiers statiques du jeu
- \`*.js\`: Fichiers JavaScript compilés
`

        writeFileSync(resolve(deployDir, 'README.md'), readmeContent)

        console.log('✅ Deployment package created successfully!')
        console.log(`📁 Location: ${deployDir}`)
        console.log('')
        console.log('🎯 Next steps:')
        console.log('1. Copy the entire "deploy" folder to your server')
        console.log('2. Run: npm install')
        console.log('3. Run: npm start')

    } catch (error) {
        console.error('❌ Error building deployment package:', error)
        process.exit(1)
    }
}

buildDeploy()
