
import AnalyticsKey from '../consts/analytics-key'
import DataKey from '../consts/data-key'
import { getCurrentLanguage } from '../consts/translations'
export interface DiscordUser {
    id: string
    username: string
    discriminator: string
    avatar: string | null
}

export interface AuthState {
    authenticated: boolean
    user: DiscordUser | null
    progress?: UserProgress
}

export interface SpeedrunData {
    time: number
    date: string

    gameplay: {
        inputs: Array<{
            timestamp: number
            action: 'jump' | 'move_left' | 'move_right' | 'stop_left' | 'stop_right'
            position: { x: number, y: number }
        }>
        checkpoints: Array<{
            timestamp: number
            position: { x: number, y: number }
        }>
        deaths: Array<{
            timestamp: number
            position: { x: number, y: number }
            cause: 'spike' | 'lava' | 'enemy' | 'fall'
        }>
        coins: Array<{
            timestamp: number
            coinId: number
            position: { x: number, y: number }
        }>
        enemies: Array<{
            timestamp: number
            enemyId: string
            position: { x: number, y: number }
            action: 'kill' | 'damage'
        }>
        positions: Array<{
            timestamp: number
            x: number
            y: number
            velocity: { x: number, y: number }
        }>
    }
}

export interface UserProgress {

    scores: Record<string, { score: number, time: number, date: string }>

    speedrunScores: Record<string, SpeedrunData>

    unlockedLevels: number[]


    unlockedCommunityLevels: string[]

    totalPlayTime: number
    lastLevelPlayed: number


    lastCommunityLevelPlayed?: string

    achievements: string[]

    statistics: {
        enemiesKilled: number
        playerDeaths: number
        coinsCollected: number
        levelsCompleted: number
        bestTimeOverall: number
        totalCoinsOverall: number
    }

    settings: {
        soundEnabled: boolean
        musicEnabled: boolean
        language: string
        gameMode?: string
    }
}

class AuthService {
    private authState: AuthState = {
        authenticated: false,
        user: null
    }

    private listeners: Array<(state: AuthState) => void> = []

    constructor() {

        this.checkAuthStatus()


        window.addEventListener('popstate', () => {
            this.checkAuthStatus()
        })


        setInterval(() => {
            this.checkAuthStatus()
        }, 30000)
    }


    async checkAuthStatus(): Promise<void> {
        try {
            const response = await fetch('/api/user', {
                credentials: 'include'
            })

            if (response.ok) {
                const data = await response.json()
                this.updateAuthState(data)
                console.log('✅ Authentification vérifiée:', data.authenticated ? data.user?.username : 'Non connecté')
            } else if (response.status === 401) {

                console.log('🔒 Session expirée, déconnexion automatique')
                this.updateAuthState({ authenticated: false, user: null })
            } else {
                console.log('❌ Erreur de vérification auth:', response.status)
                this.updateAuthState({ authenticated: false, user: null })
            }
        } catch (error) {
            console.error('Erreur lors de la vérification de l\'authentification:', error)


        }
    }


    initDevMode(): void {


        this.updateAuthState({
            authenticated: true,
            user: {
                id: 'dev-user-123',
                username: 'DevUser',
                discriminator: '0001',
                avatar: null
            }
        })


        window.addEventListener('popstate', () => {
            const url = new URL(window.location.href)
            if (url.searchParams.get('dev_login') === 'true') {
                this.updateAuthState({
                    authenticated: true,
                    user: {
                        id: 'dev-user-' + Date.now(),
                        username: 'DevUser',
                        discriminator: '0001',
                        avatar: null
                    }
                })
            } else if (url.searchParams.get('dev_logout') === 'true') {
                this.updateAuthState({
                    authenticated: false,
                    user: null
                })
            }
        })
    }


    loginWithDiscord(): void {
        window.location.href = '/auth/discord'
    }


    async logout(): Promise<void> {
        try {
            console.log('Tentative de déconnexion...')
            const response = await fetch('/auth/logout', {
                method: 'GET',
                credentials: 'include'
            })

            if (response.ok) {
                console.log('Déconnexion réussie')
                this.updateAuthState({ authenticated: false, user: null })
            } else {
                console.error('Erreur lors de la déconnexion:', response.status, response.statusText)

                this.updateAuthState({ authenticated: false, user: null })
            }
        } catch (error) {
            console.error('Erreur lors de la déconnexion:', error)

            this.updateAuthState({ authenticated: false, user: null })
        }
    }


    private updateAuthState(newState: AuthState): void {

        if (newState.progress) {
            if (!newState.progress.unlockedCommunityLevels) {
                newState.progress.unlockedCommunityLevels = []
            }
            if (!newState.progress.lastCommunityLevelPlayed) {
                newState.progress.lastCommunityLevelPlayed = undefined
            }
        }

        const hasChanged =
            this.authState.authenticated !== newState.authenticated ||
            this.authState.user?.id !== newState.user?.id ||
            JSON.stringify(this.authState.progress) !== JSON.stringify(newState.progress)

        this.authState = newState


        this.loadCommunityDataLocally()

        if (hasChanged) {
            this.notifyListeners()
        }
    }


    private notifyListeners(): void {
        this.listeners.forEach(listener => {
            try {
                listener(this.authState)
            } catch (error) {
                console.error('Erreur dans un listener d\'authentification:', error)
            }
        })
    }


    addAuthListener(listener: (state: AuthState) => void): () => void {
        this.listeners.push(listener)


        listener(this.authState)


        return () => {
            const index = this.listeners.indexOf(listener)
            if (index > -1) {
                this.listeners.splice(index, 1)
            }
        }
    }


    getAuthState(): AuthState {
        return { ...this.authState }
    }


    getCurrentUser(): DiscordUser | null {
        return this.authState.user
    }


    async saveProgress(progress: UserProgress): Promise<boolean> {
        if (!this.authState.authenticated) {
            console.warn('Tentative de sauvegarde sans authentification')
            return false
        }

        try {
            const response = await fetch('/api/progress', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify(progress)
            })

            if (response.ok) {

                this.authState.progress = progress
                this.notifyListeners()
                return true
            }

            return false
        } catch (error) {
            console.error('Erreur lors de la sauvegarde de la progression:', error)
            return false
        }
    }


    getProgress(): UserProgress | null {
        return this.authState.progress || null
    }


    isLevelUnlocked(level: number): boolean {
        return this.authState.progress?.unlockedLevels.includes(level) || level === 1
    }


    isCommunityLevelUnlocked(levelId: string): boolean {
        return this.authState.progress?.unlockedCommunityLevels.includes(levelId) || false
    }

    async unlockCommunityLevel(levelId: string): Promise<boolean> {
        if (!this.authState.progress) return false

        if (!this.authState.progress.unlockedCommunityLevels.includes(levelId)) {
            this.authState.progress.unlockedCommunityLevels.push(levelId)
            return await this.saveProgress(this.authState.progress)
        }
        return true
    }

    async saveCommunityLevelScore(levelId: string, time: number, coins: number, gameMode: 'classic' | 'speedrun', speedrunData?: any): Promise<boolean> {
        console.log('saveCommunityLevelScore appelée avec:', { levelId, time, coins, gameMode })

        if (!this.authState.progress) {
            console.log('Pas de progress dans authState, retour false')
            return false
        }


        if (!this.authState.progress.unlockedCommunityLevels) {
            this.authState.progress.unlockedCommunityLevels = []
        }
        if (!this.authState.progress.lastCommunityLevelPlayed) {
            this.authState.progress.lastCommunityLevelPlayed = undefined
        }

        const now = new Date().toISOString()


        this.authState.progress.scores[levelId] = {
            score: coins,
            time: time,
            date: now
        }
        console.log('Score classique sauvegardé:', this.authState.progress.scores[levelId])


        if (gameMode === 'speedrun' && speedrunData) {
            this.authState.progress.speedrunScores[levelId] = speedrunData
            console.log('Score speedrun sauvegardé:', this.authState.progress.speedrunScores[levelId])
        }


        this.authState.progress.statistics.levelsCompleted += 1
        this.authState.progress.statistics.coinsCollected += coins
        this.authState.progress.lastCommunityLevelPlayed = levelId
        console.log('Statistiques mises à jour:', this.authState.progress.statistics)

        try {

            const { unlockedCommunityLevels, lastCommunityLevelPlayed, ...serverProgress } = this.authState.progress

            console.log('Envoi au serveur (sans propriétés communautaires):', serverProgress)
            const result = await this.saveProgress(serverProgress as any)
            console.log('saveProgress résultat:', result)


            this.saveCommunityDataLocally(levelId, time, coins, gameMode, speedrunData)

            return result
        } catch (error) {
            console.error('Erreur lors de la sauvegarde sur le serveur:', error)

            this.saveCommunityDataLocally(levelId, time, coins, gameMode, speedrunData)
            console.log('Données sauvegardées localement malgré l\'erreur serveur')
            return true
        }
    }

    getCommunityLevelBestScore(levelId: string): { score: number, time: number } | null {
        const levelScore = this.authState.progress?.scores[levelId]
        return levelScore ? { score: levelScore.score, time: levelScore.time } : null
    }

    getCommunityLevelBestSpeedrunTime(levelId: string): number | null {
        const speedrunScore = this.authState.progress?.speedrunScores[levelId]
        return speedrunScore ? speedrunScore.time : null
    }

    /**
     * Sauvegarde les données des niveaux communautaires localement
     */
    private saveCommunityDataLocally(levelId: string, _time: number, _coins: number, _gameMode: 'classic' | 'speedrun', _speedrunData?: any): void {
        try {
            const communityData = {
                unlockedLevels: this.authState.progress?.unlockedCommunityLevels || [],
                lastLevelPlayed: levelId,
                scores: this.authState.progress?.scores || {},
                speedrunScores: this.authState.progress?.speedrunScores || {},
                statistics: this.authState.progress?.statistics || {}
            }

            localStorage.setItem('community_progress', JSON.stringify(communityData))
            console.log('Données communautaires sauvegardées localement:', communityData)
        } catch (error) {
            console.error('Erreur lors de la sauvegarde locale des données communautaires:', error)
        }
    }

    /**
     * Charge les données des niveaux communautaires depuis le localStorage
     */
    private loadCommunityDataLocally(): void {
        try {
            const stored = localStorage.getItem('community_progress')
            if (stored && this.authState.progress) {
                const communityData = JSON.parse(stored)


                this.authState.progress.unlockedCommunityLevels = communityData.unlockedLevels || []
                this.authState.progress.lastCommunityLevelPlayed = communityData.lastLevelPlayed


                this.authState.progress.scores = { ...this.authState.progress.scores, ...communityData.scores }
                this.authState.progress.speedrunScores = { ...this.authState.progress.speedrunScores, ...communityData.speedrunScores }

                console.log('Données communautaires chargées depuis le localStorage')
            }
        } catch (error) {
            console.error('Erreur lors du chargement des données communautaires:', error)
        }
    }


    getBestScore(level: number): { score: number, time: number } | null {
        const levelScore = this.authState.progress?.scores[level.toString()]
        return levelScore ? { score: levelScore.score, time: levelScore.time } : null
    }


    getBestSpeedrunTime(level: number): number | null {
        const speedrunScore = this.authState.progress?.speedrunScores[level.toString()]
        return speedrunScore ? speedrunScore.time : null
    }


    private getLocalStatistics() {
        return {
            enemiesKilled: Number(localStorage.getItem('enemiesKilled')) || 0,
            playerDeaths: Number(localStorage.getItem('playerDeaths')) || 0,
            coinsCollected: Number(localStorage.getItem('coinsCollected')) || 0,
            levelsCompleted: Number(localStorage.getItem('levelsCompleted')) || 0
        }
    }



    isAuthenticated(): boolean {
        return this.authState.authenticated
    }


    getStatistics() {
        if (this.isAuthenticated()) {

            return this.authState.progress?.statistics || {
                enemiesKilled: 0,
                playerDeaths: 0,
                coinsCollected: 0,
                levelsCompleted: 0,
                bestTimeOverall: 0,
                totalCoinsOverall: 0
            }
        }

        return {
            enemiesKilled: Number(localStorage.getItem(AnalyticsKey.EnemyKilled)) || 0,
            playerDeaths: Number(localStorage.getItem(AnalyticsKey.PlayerDeath)) || 0,
            coinsCollected: Number(localStorage.getItem(AnalyticsKey.CoinCollected)) || 0,
            levelsCompleted: Number(localStorage.getItem('levelsCompleted')) || 0,
            bestTimeOverall: 0,
            totalCoinsOverall: 0
        }
    }


    getSettings() {
        if (this.isAuthenticated()) {

            return this.authState.progress?.settings || {
                soundEnabled: true,
                musicEnabled: true,
                language: 'fr',
                gameMode: 'classic'
            }
        }

        return {
            soundEnabled: localStorage.getItem(DataKey.Mute) !== 'true',
            musicEnabled: true,
            language: getCurrentLanguage()
        }
    }


    async saveSettings(settings: Partial<{ soundEnabled: boolean, musicEnabled: boolean, language: string, gameMode: string }>): Promise<boolean> {
        if (!this.isAuthenticated()) {

            if (settings.soundEnabled !== undefined) {
                localStorage.setItem(DataKey.Mute, (!settings.soundEnabled).toString())
            }
            if (settings.language !== undefined) {
                localStorage.setItem(DataKey.Language, settings.language)
            }
            if (settings.gameMode !== undefined) {
                localStorage.setItem(DataKey.GameMode, settings.gameMode)
            }
            return true
        }

        try {
            const response = await fetch('/api/progress', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({
                    settings: {
                        ...this.authState.progress?.settings,
                        ...settings
                    }
                })
            })

            if (response.ok) {
                await this.checkAuthStatus()
                return true
            }
            return false
        } catch (error) {
            console.error('Erreur sauvegarde paramètres:', error)
            return false
        }
    }


    async saveScore(level: number, time: number, coins: number, mode: string = 'classic', speedrunData?: SpeedrunData): Promise<{ success: boolean; newRecord?: boolean; error?: string }> {
        if (!this.isAuthenticated()) {
            return { success: false, error: 'Not authenticated' }
        }

        try {

            const response = await fetch(`/api/score/${level}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({
                    score: coins,
                    time,
                    mode,
                    statistics: this.getLocalStatistics(),
                    speedrunData: speedrunData
                })
            })

            if (response.ok) {
                const data = await response.json()
                if (data.isNewRecord) {
                }

                await this.checkAuthStatus()
                return { success: true, newRecord: data.isNewRecord }
            } else {
                const error = await response.json()
                return { success: false, error: error.error || 'Failed to save score' }
            }
        } catch (error) {
            console.error('Erreur lors de la sauvegarde du score:', error)
            return { success: false, error: 'Network error' }
        }
    }


    async getUserScores(): Promise<any> {
        if (!this.isAuthenticated()) {
            return null
        }

        try {
            const response = await fetch('/api/scores', {
                credentials: 'include'
            })

            if (response.ok) {
                return await response.json()
            }
        } catch (error) {
            console.error('Erreur lors de la récupération des scores:', error)
        }

        return null
    }


    async getLeaderboard(level: number): Promise<any[]> {
        try {
            const response = await fetch(`/api/leaderboard/${level}`)

            if (response.ok) {
                return await response.json()
            }
        } catch (error) {
            console.error('Erreur lors de la récupération du leaderboard:', error)
        }

        return []
    }
}


export const authService = new AuthService()
