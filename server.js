#!/usr/bin/env node

import 'dotenv/config'
import express from 'express'
import session from 'express-session'
import passport from 'passport'
import { Strategy as DiscordStrategy } from 'passport-discord'
import crypto from 'crypto'
import { fileURLToPath } from 'url'
import { dirname, join, resolve } from 'path'
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const isProduction = process.env.NODE_ENV === 'production'

const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex')
const SCORE_SECRET = process.env.SCORE_SECRET || crypto.randomBytes(32).toString('hex')
const port = isProduction ? 25586 : 8080



const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET
const USE_DISCORD = !!(DISCORD_CLIENT_ID && DISCORD_CLIENT_SECRET)

const DEV_URI_REDIRECT = 'http://localhost:8080/auth/discord/callback'
const PROD_URI_REDIRECT = 'https://bobby.pupsweb.cc/auth/discord/callback'
const DISCORD_CALLBACK_URL = isProduction ? PROD_URI_REDIRECT : DEV_URI_REDIRECT

const DATA_DIR = resolve(__dirname, 'data')
const USERS_DIR = resolve(DATA_DIR, 'users')
const SCORES_FILE = resolve(DATA_DIR, 'scores.json')
const LOGS_FILE = resolve(DATA_DIR, 'security-logs.json')

if (!existsSync(USERS_DIR)) {
    mkdirSync(USERS_DIR, { recursive: true })
}

const ANTI_CHEAT_LIMITS = {

    MIN_LEVEL_TIME: {
        1: 10000,   // 10 secondes minimum
        2: 15000,   // 15 secondes minimum
        3: 20000,   // 20 secondes minimum
    },
    MAX_LEVEL_TIME: {
        1: 300000,  // 5 minutes maximum
        2: 400000,  // 6 minutes 40 secondes
        3: 500000,  // 8 minutes 20 secondes
    },
    MAX_COINS_PER_LEVEL: {
        1: 10,
        2: 15,
        3: 20,
    },
    MAX_SCORE_SUBMISSIONS_PER_HOUR: 10,
    MIN_TIME_BETWEEN_SUBMISSIONS: 5000,
}

if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true })
}

function getUserFilePath(userId) {
    return resolve(USERS_DIR, `${userId}.json`)
}

function loadUser(userId) {
    const userFile = getUserFilePath(userId)
    if (existsSync(userFile)) {
        try {
            return JSON.parse(readFileSync(userFile, 'utf8'))
        } catch (error) {
            console.error(`Erreur lecture utilisateur ${userId}:`, error)
            return null
        }
    }
    return null
}

function saveUser(userId, userData) {
    const userFile = getUserFilePath(userId)
    try {
        writeFileSync(userFile, JSON.stringify(userData, null, 2))
        return true
    } catch (error) {
        console.error(`Erreur sauvegarde utilisateur ${userId}:`, error)
        return false
    }
}

function getAllUsers() {
    const users = {}
    if (existsSync(USERS_DIR)) {
        const files = readdirSync(USERS_DIR).filter(file => file.endsWith('.json'))
        files.forEach(file => {
            const userId = file.replace('.json', '')
            const userData = loadUser(userId)
            if (userData) {
                users[userId] = userData
            }
        })
    }
    return users
}

function loadUsers() {
    return getAllUsers()
}

function saveUsers(users) {
    console.warn('saveUsers() est dépréciée, utilisez saveUser() à la place')
}
function getUserProgress(userId) {
    const user = loadUser(userId)
    if (!user || !user.progress) {
        return {
            scores: {},
            speedrunScores: {},
            unlockedLevels: [1],
            totalPlayTime: 0,
            lastLevelPlayed: 1,
            achievements: [],
            statistics: {
                enemiesKilled: 0,
                playerDeaths: 0,
                coinsCollected: 0,
                levelsCompleted: 0,
                bestTimeOverall: 0,
                totalCoinsOverall: 0
            },
            settings: {
                soundEnabled: true,
                musicEnabled: true,
                language: 'fr'
            }
        }
    }

    const progress = user.progress

    if (!progress.speedrunScores) {
        progress.speedrunScores = {}
    }

    if (!progress.statistics) {
        progress.statistics = {
            enemiesKilled: 0,
            playerDeaths: 0,
            coinsCollected: 0,
            levelsCompleted: 0,
            bestTimeOverall: 0,
            totalCoinsOverall: 0
        }
    }

    return progress
}

function saveUserProgress(userId, progress) {
    const user = loadUser(userId)
    if (!user) {
        console.error(`Utilisateur ${userId} non trouvé`)
        return false
    }

    user.progress = progress
    return saveUser(userId, user)
}

function updateUserScore(userId, level, score, time, mode = 'classic', statistics = {}, speedrunData = null) {
    const progress = getUserProgress(userId)
    let isNewRecord = false

    if (mode === 'speedrun') {
        const currentBest = progress.speedrunScores[level] || { time: Infinity }

        if (time < currentBest.time) {
            if (speedrunData) {
                progress.speedrunScores[level] = {
                    time,
                    date: new Date().toISOString(),
                    gameplay: speedrunData.gameplay
                }
                console.log(`🏃 Nouveau record speedrun niveau ${level}: ${time}ms (avec données détaillées)`)
            } else {
                progress.speedrunScores[level] = { time, date: new Date().toISOString() }
                console.log(`🏃 Nouveau record speedrun niveau ${level}: ${time}ms`)
            }
            isNewRecord = true
        }
    } else {
        const currentBest = progress.scores[level] || { score: 0, time: Infinity }

        if (score > currentBest.score || (score === currentBest.score && time < currentBest.time)) {
            progress.scores[level] = { score, time, date: new Date().toISOString() }
            isNewRecord = true
            console.log(`🎯 Nouveau record classique niveau ${level}: ${score} pièces`)
        }
    }

    if (isNewRecord) {
        const nextLevel = level + 1
        if (!progress.unlockedLevels.includes(nextLevel) && nextLevel <= 10) {
            progress.unlockedLevels.push(nextLevel)
            console.log(`🎉 Niveau ${nextLevel} débloqué pour l'utilisateur ${userId}`)
        }

        progress.lastLevelPlayed = level
    }


    if (statistics && typeof statistics === 'object') {
        if (!progress.statistics) {
            progress.statistics = {
                enemiesKilled: 0,
                playerDeaths: 0,
                coinsCollected: 0,
                levelsCompleted: 0,
                bestTimeOverall: 0,
                totalCoinsOverall: 0
            }
        }

        if (statistics.enemiesKilled !== undefined) {
            progress.statistics.enemiesKilled = Math.max(progress.statistics.enemiesKilled, statistics.enemiesKilled)
        }
        if (statistics.playerDeaths !== undefined) {
            progress.statistics.playerDeaths = Math.max(progress.statistics.playerDeaths, statistics.playerDeaths)
        }
        if (statistics.coinsCollected !== undefined) {
            progress.statistics.coinsCollected = Math.max(progress.statistics.coinsCollected, statistics.coinsCollected)
        }
        if (statistics.levelsCompleted !== undefined) {
            progress.statistics.levelsCompleted = Math.max(progress.statistics.levelsCompleted, statistics.levelsCompleted)
        }
    }

    const allTimes = Object.values(progress.speedrunScores).map(s => s.time)
    const allScores = Object.values(progress.scores).map(s => s.score)

    if (allTimes.length > 0) {
        progress.statistics.bestTimeOverall = Math.min(...allTimes)
    }
    if (allScores.length > 0) {
        progress.statistics.totalCoinsOverall = allScores.reduce((a, b) => a + b, 0)
    }

    saveUserProgress(userId, progress)

    if (isNewRecord) {
        logSecurityEvent(userId, 'score_updated', { level, score, time, mode })
    }

    return isNewRecord
}

function loadScores() {
    if (existsSync(SCORES_FILE)) {
        return JSON.parse(readFileSync(SCORES_FILE, 'utf8'))
    }
    return {}
}

function saveScores(scores) {
    writeFileSync(SCORES_FILE, JSON.stringify(scores, null, 2))
}

function loadSecurityLogs() {
    if (existsSync(LOGS_FILE)) {
        return JSON.parse(readFileSync(LOGS_FILE, 'utf8'))
    }
    return []
}

function logSecurityEvent(userId, event, details, suspicious = false) {
    const logs = loadSecurityLogs()
    const logEntry = {
        timestamp: new Date().toISOString(),
        userId,
        event,
        details,
        suspicious,
        ip: details.ip || 'unknown'
    }
    logs.push(logEntry)

    if (logs.length > 1000) {
        logs.splice(0, logs.length - 1000)
    }

    writeFileSync(LOGS_FILE, JSON.stringify(logs, null, 2))

    if (suspicious) {
        console.log(`🚨 SUSPICIOUS ACTIVITY: ${event} - User: ${userId}`)
    }
}

function generateScoreToken(level, time, coins, userId) {
    const data = `${level}-${time}-${coins}-${userId}-${Date.now()}`
    return crypto.createHmac('sha256', SCORE_SECRET).update(data).digest('hex')
}
function validateScoreToken(token, level, time, coins, userId) {
    const expectedToken = generateScoreToken(level, time, coins, userId)
    return crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expectedToken))
}

function validateScore(userId, level, time, coins, mode = 'classic', ip) {
    const issues = []
    let suspicious = false

    const minTime = ANTI_CHEAT_LIMITS.MIN_LEVEL_TIME[level] || 5000
    const maxTime = ANTI_CHEAT_LIMITS.MAX_LEVEL_TIME[level] || 600000

    if (time < minTime) {
        issues.push(`Time too fast: ${time}ms < ${minTime}ms`)
        suspicious = true
    }

    if (time > maxTime) {
        issues.push(`Time too slow: ${time}ms > ${maxTime}ms`)
        suspicious = true
    }

    const maxCoins = ANTI_CHEAT_LIMITS.MAX_COINS_PER_LEVEL[level] || 50
    if (coins > maxCoins) {
        issues.push(`Too many coins: ${coins} > ${maxCoins}`)
        suspicious = true
    }

    const scores = loadScores()
    const userScores = scores[userId] || {}
    const currentBest = userScores[mode] && userScores[mode][level]

    if (currentBest && time < currentBest.time * 0.7) {
        issues.push(`Suspicious improvement: ${time}ms vs ${currentBest.time}ms`)
        suspicious = true
    }

    const logs = loadSecurityLogs()
    const recentSubmissions = logs.filter(log =>
        log.userId === userId &&
        log.event === 'score_submission' &&
        Date.now() - new Date(log.timestamp).getTime() < 3600000 // 1 heure
    )

    if (recentSubmissions.length > ANTI_CHEAT_LIMITS.MAX_SCORE_SUBMISSIONS_PER_HOUR) {
        issues.push(`Too many submissions: ${recentSubmissions.length} in 1 hour`)
        suspicious = true
    }

    logSecurityEvent(userId, 'score_submission', {
        level,
        time,
        coins,
        mode,
        ip,
        issues
    }, suspicious)

    return {
        valid: issues.length === 0,
        issues,
        suspicious
    }
}

if (USE_DISCORD) {
    passport.use(new DiscordStrategy({
        clientID: DISCORD_CLIENT_ID,
        clientSecret: DISCORD_CLIENT_SECRET,
        callbackURL: DISCORD_CALLBACK_URL,
        scope: ['identify', 'email']
    }, async (accessToken, refreshToken, profile, done) => {
        try {
            const userId = profile.id
            const existingUser = loadUser(userId)

            const defaultProgress = {
                scores: {},
                speedrunScores: {},
                unlockedLevels: [1],
                totalPlayTime: 0,
                lastLevelPlayed: 1,
                achievements: [],
                statistics: {
                    enemiesKilled: 0,
                    playerDeaths: 0,
                    coinsCollected: 0,
                    levelsCompleted: 0,
                    bestTimeOverall: 0,
                    totalCoinsOverall: 0
                },
                settings: {
                    soundEnabled: true,
                    musicEnabled: true,
                    language: 'fr',
                    gameMode: 'classic'
                }
            }
            const mergedProgress = existingUser?.progress ? {
                ...defaultProgress,
                ...existingUser.progress,
                speedrunScores: existingUser.progress.speedrunScores || {},
                statistics: existingUser.progress.statistics || defaultProgress.statistics,
                settings: {
                    ...defaultProgress.settings,
                    ...existingUser.progress.settings,
                    gameMode: existingUser.progress.settings?.gameMode || 'classic'
                }
            } : defaultProgress

            const userData = {
                id: profile.id,
                username: profile.username,
                discriminator: profile.discriminator,
                email: profile.email,
                avatar: profile.avatar,
                lastLogin: new Date().toISOString(),
                registrationDate: existingUser?.registrationDate || new Date().toISOString(),
                progress: mergedProgress
            }

            saveUser(userId, userData)
            logSecurityEvent(userId, 'user_login', { username: profile.username })
            return done(null, userData)
        } catch (error) {
            return done(error, null)
        }
    }))

    passport.serializeUser((user, done) => {
        done(null, user.id)
    })

    passport.deserializeUser((id, done) => {
        const user = loadUser(id)
        done(null, user)
    })
}

async function startServer() {
    try {
        const app = express()

        app.use(session({
            secret: SESSION_SECRET,
            resave: false,
            saveUninitialized: false,
            cookie: {
                secure: isProduction,
                maxAge: 24 * 60 * 60 * 1000, // 24 heures
                httpOnly: true,
                sameSite: 'lax'
            }
        }))

        app.use(passport.initialize())
        app.use(passport.session())

        app.use(express.json())

        app.use((req, res, next) => {
            req.userIp = req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown'
            console.log(`📡 ${req.method} ${req.path} - IP: ${req.userIp}`)
            next()
        })

        if (USE_DISCORD) {
            app.get('/auth/discord', (req, res, next) => {
                console.log('🔐 Route /auth/discord appelée')
                passport.authenticate('discord')(req, res, next)
            })

            app.get('/auth/discord/callback',
                passport.authenticate('discord', { failureRedirect: '/?error=auth_failed' }),
                (req, res) => {
                    logSecurityEvent(req.user.id, 'auth_success', { ip: req.userIp })
                    res.redirect('/?auth=success')
                }
            )
        } else {
            const DEV_USER = {
                id: 'dev-user-123',
                username: 'DevUser',
                discriminator: '0001',
                avatar: null
            }

            app.get('/auth/discord', (req, res) => {
                console.log('🔧 Mode dev : Simulation de redirection Discord')
                req.session.userId = DEV_USER.id
                logSecurityEvent(DEV_USER.id, 'dev_auth_success', { ip: req.userIp })
                res.redirect('/?auth=success&dev_mode=true')
            })

            app.get('/auth/discord/callback', (req, res) => {
                console.log('🔧 Mode dev : Simulation de callback Discord')
                req.session.userId = DEV_USER.id
                logSecurityEvent(DEV_USER.id, 'dev_auth_success', { ip: req.userIp })
                res.redirect('/?auth=success&dev_mode=true')
            })
        }

        app.get('/auth/logout', (req, res) => {
            if (req.user) {
                logSecurityEvent(req.user.id, 'user_logout', { ip: req.userIp })
            }
            req.logout((err) => {
                if (err) {
                    return res.status(500).json({ error: 'Logout failed' })
                }
                res.redirect('/?logout=success')
            })
        })


        app.get('/api/user', (req, res) => {
            if (USE_DISCORD) {

                if (req.isAuthenticated()) {
                    const progress = getUserProgress(req.user.id)
                    res.json({
                        authenticated: true,
                        user: {
                            id: req.user.id,
                            username: req.user.username,
                            discriminator: req.user.discriminator,
                            avatar: req.user.avatar
                        },
                        progress
                    })
                } else {
                    res.json({ authenticated: false })
                }
            } else {

                if (req.session.userId) {
                    const progress = getUserProgress('dev-user-123')
                    res.json({
                        authenticated: true,
                        user: {
                            id: 'dev-user-123',
                            username: 'DevUser',
                            discriminator: '0001',
                            avatar: null
                        },
                        progress
                    })
                } else {
                    res.json({ authenticated: false })
                }
            }
        })


        app.post('/api/progress', (req, res) => {
            const userId = USE_DISCORD ? (req.user?.id || req.session.userId) : 'dev-user-123'

            if (!userId) {
                return res.status(401).json({ error: 'Non authentifié' })
            }

            try {
                const { scores, unlockedLevels, totalPlayTime, lastLevelPlayed, achievements, settings } = req.body
                console.log('📝 Sauvegarde progression pour', userId, ':', { settings })


                const existingUser = loadUser(userId)
                const existingProgress = existingUser?.progress || {}


                const progress = {
                    scores: scores || existingProgress.scores || {},
                    speedrunScores: existingProgress.speedrunScores || {}, // Préserver
                    unlockedLevels: unlockedLevels || existingProgress.unlockedLevels || [1],
                    totalPlayTime: totalPlayTime || existingProgress.totalPlayTime || 0,
                    lastLevelPlayed: lastLevelPlayed || existingProgress.lastLevelPlayed || 1,
                    achievements: achievements || existingProgress.achievements || [],
                    statistics: existingProgress.statistics || { // Préserver
                        enemiesKilled: 0,
                        playerDeaths: 0,
                        coinsCollected: 0,
                        levelsCompleted: 0,
                        bestTimeOverall: 0,
                        totalCoinsOverall: 0
                    },
                    settings: {
                        soundEnabled: true,
                        musicEnabled: true,
                        language: 'fr',
                        gameMode: 'classic',
                        ...existingProgress.settings, // Préserver les settings existants
                        ...settings // Mettre à jour avec les nouveaux settings
                    }
                }

                saveUserProgress(userId, progress)
                console.log('✅ Progression sauvegardée:', progress.settings)
                logSecurityEvent(userId, 'progress_saved', { progress })
                res.json({ success: true })
            } catch (error) {
                console.error('Erreur sauvegarde progression:', error)
                res.status(500).json({ error: 'Erreur serveur' })
            }
        })


        app.post('/api/score/:level', (req, res) => {
            const userId = USE_DISCORD ? (req.user?.id || req.session.userId) : 'dev-user-123'

            if (!userId) {
                return res.status(401).json({ error: 'Non authentifié' })
            }

            try {
                const level = parseInt(req.params.level)
                const { score, time, mode = 'classic', statistics = {}, speedrunData } = req.body

                if (!time) {
                    return res.status(400).json({ error: 'Temps requis' })
                }

                const isNewRecord = updateUserScore(userId, level, score || 0, time, mode, statistics, speedrunData)
                res.json({ success: true, isNewRecord })
            } catch (error) {
                console.error('Erreur mise à jour score:', error)
                res.status(500).json({ error: 'Erreur serveur' })
            }
        })


        app.get('/api/leaderboard/:level/:mode', (req, res) => {
            try {
                const level = parseInt(req.params.level)
                const mode = req.params.mode // 'classic' ou 'speedrun'

                if (!level || (mode !== 'classic' && mode !== 'speedrun')) {
                    return res.status(400).json({ error: 'Paramètres invalides' })
                }

                const allUsers = getAllUsers()
                const leaderboard = []

                Object.entries(allUsers).forEach(([userId, user]) => {
                    if (!user || !user.progress) return

                    let score = null
                    const levelKey = level.toString()

                    if (mode === 'classic' && user.progress.scores && user.progress.scores[levelKey]) {
                        score = {
                            userId,
                            username: user.username,
                            avatar: user.avatar,
                            score: user.progress.scores[levelKey].score,
                            time: user.progress.scores[levelKey].time,
                            date: user.progress.scores[levelKey].date
                        }
                    } else if (mode === 'speedrun' && user.progress.speedrunScores && user.progress.speedrunScores[levelKey]) {
                        score = {
                            userId,
                            username: user.username,
                            avatar: user.avatar,
                            time: user.progress.speedrunScores[levelKey].time,
                            date: user.progress.speedrunScores[levelKey].date
                        }
                    }

                    if (score) {
                        leaderboard.push(score)
                    }
                })


                if (mode === 'classic') {
                    leaderboard.sort((a, b) => b.score - a.score || a.time - b.time)
                } else {
                    leaderboard.sort((a, b) => a.time - b.time)
                }

                res.json({ leaderboard: leaderboard.slice(0, 10) }) // Top 10
            } catch (error) {
                console.error('Erreur leaderboard:', error)
                res.status(500).json({ error: 'Erreur serveur' })
            }
        })


        app.get('/api/score-token/:level', (req, res) => {
            if (!req.isAuthenticated()) {
                return res.status(401).json({ error: 'Not authenticated' })
            }

            const { level } = req.params
            const token = generateScoreToken(level, 0, 0, req.user.id)

            res.json({ token })
        })


        app.post('/api/scores', (req, res) => {
            if (!req.isAuthenticated()) {
                return res.status(401).json({ error: 'Not authenticated' })
            }

            const { level, time, coins, mode = 'classic', token } = req.body

            if (!level || time === undefined || !token) {
                return res.status(400).json({ error: 'Missing required fields' })
            }


            if (!validateScoreToken(token, level, time, coins || 0, req.user.id)) {
                logSecurityEvent(req.user.id, 'invalid_token', {
                    level,
                    time,
                    coins,
                    ip: req.userIp
                }, true)
                return res.status(400).json({ error: 'Invalid token' })
            }


            const validation = validateScore(req.user.id, level, time, coins || 0, mode, req.userIp)

            if (!validation.valid) {
                return res.status(400).json({
                    error: 'Score validation failed',
                    issues: validation.issues
                })
            }

            if (validation.suspicious) {

                logSecurityEvent(req.user.id, 'suspicious_score_accepted', {
                    level,
                    time,
                    coins,
                    issues: validation.issues
                }, true)
            }


            const scores = loadScores()
            const userId = req.user.id

            if (!scores[userId]) {
                scores[userId] = {}
            }

            if (!scores[userId][mode]) {
                scores[userId][mode] = {}
            }


            const currentScore = scores[userId][mode][level]
            if (!currentScore || time < currentScore.time) {
                scores[userId][mode][level] = {
                    time,
                    coins: coins || 0,
                    date: new Date().toISOString(),
                    suspicious: validation.suspicious
                }
                saveScores(scores)
                res.json({ success: true, newRecord: true })
            } else {
                res.json({ success: true, newRecord: false })
            }
        })


        app.get('/api/scores', (req, res) => {
            if (!req.isAuthenticated()) {
                return res.status(401).json({ error: 'Not authenticated' })
            }

            const scores = loadScores()
            const userScores = scores[req.user.id] || {}
            res.json(userScores)
        })


        app.get('/api/leaderboard/:level', (req, res) => {
            const { level } = req.params
            const scores = loadScores()

            const leaderboard = []

            Object.keys(scores).forEach(userId => {
                const users = loadUsers()
                const user = users[userId]

                if (user && scores[userId].classic && scores[userId].classic[level]) {
                    const score = scores[userId].classic[level]


                    if (!score.suspicious) {
                        leaderboard.push({
                            username: user.username,
                            discriminator: user.discriminator,
                            avatar: user.avatar,
                            time: score.time,
                            coins: score.coins,
                            date: score.date
                        })
                    }
                }
            })


            leaderboard.sort((a, b) => a.time - b.time)

            res.json(leaderboard.slice(0, 10)) // Top 10
        })


        app.get('/api/admin/logs', (req, res) => {

            const logs = loadSecurityLogs()
            res.json(logs.slice(-100)) // 100 derniers logs
        })

        if (isProduction) {

            console.log('🚀 Starting Hey Bobby SECURE server with Discord Auth (PRODUCTION)...')

            const distPath = resolve(__dirname, 'dist')
            app.use(express.static(distPath))


            app.get('*', (req, res) => {

                if (req.path.startsWith('/auth/') || req.path.startsWith('/api/')) {
                    return res.status(404).send('Route not found')
                }
                res.sendFile(join(distPath, 'index.html'))
            })

            console.log(`📦 Serving static files from: ${distPath}`)
        } else {

            console.log('🚀 Starting Hey Bobby SECURE server with Discord Auth (DEVELOPMENT)...')

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
            console.log(`🎮 Hey Bobby Game server running at: http://localhost:${port}`)
            if (USE_DISCORD) {
                console.log('🔐 Discord OAuth ENABLED')
                console.log(`🔗 Discord Callback URL: ${DISCORD_CALLBACK_URL}`)
            } else {
                console.log('🔧 Discord OAuth DISABLED (Dev mode)')
                console.log('👤 Dev user: DevUser#0001')
            }
            console.log('🛡️ Anti-cheat system active')
            console.log('📊 Secure scores system ready')
            console.log('Press Ctrl+C to stop the server')
        })


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
