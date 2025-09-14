# Script PowerShell pour créer le package de déploiement
Write-Host "🚀 Building deployment package..." -ForegroundColor Green

$rootDir = Split-Path -Parent $PSScriptRoot
$deployDir = Join-Path $rootDir "deploy"

# 1. Nettoyer le dossier deploy s'il existe
if (Test-Path $deployDir) {
    Write-Host "🧹 Cleaning existing deploy folder..." -ForegroundColor Yellow
    Remove-Item $deployDir -Recurse -Force
}

# 2. Créer le dossier deploy
New-Item -ItemType Directory -Path $deployDir -Force | Out-Null

# 3. Build l'application
Write-Host "📦 Building application..." -ForegroundColor Cyan
Set-Location $rootDir
npm run build

# 4. Copier les fichiers compilés
Write-Host "📋 Copying build files..." -ForegroundColor Cyan
$distDir = Join-Path $rootDir "dist"
Copy-Item -Path "$distDir\*" -Destination $deployDir -Recurse -Force

# 5. Copier package.json et créer package-lock.json minimal
Write-Host "📄 Creating deployment package.json..." -ForegroundColor Cyan
$packageJson = Get-Content (Join-Path $rootDir "package.json") | ConvertFrom-Json

# Créer un package.json minimal pour le déploiement
$deployPackageJson = @{
    name = $packageJson.name
    version = $packageJson.version
    type = "module"
    main = "server.js"
    scripts = @{
        start = "node server.js"
    }
    dependencies = @{
        express = $packageJson.dependencies.express
    }
    engines = @{
        node = ">=18.0.0"
    }
} | ConvertTo-Json -Depth 3

$deployPackageJson | Out-File -FilePath (Join-Path $deployDir "package.json") -Encoding UTF8

# 6. Créer le serveur standalone
Write-Host "🖥️ Creating standalone server..." -ForegroundColor Cyan
$serverContent = @'
#!/usr/bin/env node

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
    console.log(`🎮 Hey Bobby game server running at: http://localhost:${port}`)
    console.log('Press Ctrl+C to stop the server')
})

// Gestion propre de l'arrêt
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down server...')
    process.exit(0)
})
'@

$serverContent | Out-File -FilePath (Join-Path $deployDir "server.js") -Encoding UTF8

# 7. Créer un README pour le déploiement
$readmeContent = @'
# Hey Bobby - Deployment Package

## 🚀 Déploiement rapide

Ce dossier contient tout ce qu'il faut pour déployer votre jeu sur n'importe quel hébergeur Node.js.

### Installation et démarrage

```bash
npm install
npm start
```

### Variables d'environnement

- `PORT`: Port du serveur (défaut: 8080)
- `NODE_ENV`: Environnement (production par défaut)

### Hébergeurs compatibles

- Pulseheberg
- Heroku
- Railway
- Render
- Vercel
- Netlify

### Structure

- `server.js`: Serveur Express standalone
- `package.json`: Dépendances minimales
- `index.html`: Point d'entrée de l'application
- `assets/`: Fichiers statiques du jeu
- `*.js`: Fichiers JavaScript compilés
'@

$readmeContent | Out-File -FilePath (Join-Path $deployDir "README.md") -Encoding UTF8

Write-Host "✅ Deployment package created successfully!" -ForegroundColor Green
Write-Host "📁 Location: $deployDir" -ForegroundColor Cyan
Write-Host ""
Write-Host "🎯 Next steps:" -ForegroundColor Yellow
Write-Host "1. Copy the entire 'deploy' folder to your server" -ForegroundColor White
Write-Host "2. Run: npm install" -ForegroundColor White
Write-Host "3. Run: npm start" -ForegroundColor White
