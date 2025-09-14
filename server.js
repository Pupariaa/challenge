#!/usr/bin/env node

import express from 'express'
import { fileURLToPath } from 'url'
import { dirname, join, resolve } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Vérifier si nous sommes en mode développement ou production
const isProduction = process.env.NODE_ENV === 'production'
const port = process.env.PORT || 8080

async function startServer() {
    try {
        const app = express()

        if (isProduction) {
            // Mode production : servir les fichiers compilés
            console.log('🚀 Starting Hey Bobby game server (PRODUCTION)...')

            const distPath = resolve(__dirname, 'dist')
            app.use(express.static(distPath))

            // Toutes les routes non-API servent index.html (pour le routing SPA)
            app.get('*', (req, res) => {
                res.sendFile(join(distPath, 'index.html'))
            })

            console.log(`📦 Serving static files from: ${distPath}`)
        } else {
            // Mode développement : utiliser Vite
            console.log('🚀 Starting Hey Bobby game server (DEVELOPMENT)...')

            const { createServer } = await import('vite')

            const viteServer = await createServer({
                configFile: resolve(__dirname, 'vite.config.ts'),
                root: __dirname,
                server: {
                    middlewareMode: true,
                    port: port,
                    host: true,
                },
                base: './',
            })

            app.use(viteServer.middlewares)
            console.log('⚡ Vite dev server enabled')
        }

        app.listen(port, () => {
            console.log(`🎮 Game server running at: http://localhost:${port}`)
            console.log('Press Ctrl+C to stop the server')
        })

        // Gestion propre de l'arrêt
        process.on('SIGINT', async () => {
            console.log('\n🛑 Shutting down server...')
            process.exit(0)
        })

    } catch (error) {
        console.error('❌ Error starting server:', error)
        process.exit(1)
    }
}

startServer()
