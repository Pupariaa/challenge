import { authService } from './auth-service'

export interface PlayData {
    id: string
    levelId: string | number
    levelUuid: string
    levelName: string
    levelCreator?: string
    levelType: 'official' | 'community'


    player: {
        username: string | null
        userId: string | null
        isAuthenticated: boolean
    }


    gameData: {
        startTime: number
        endTime: number
        duration: number
        coinsCollected: number
        totalCoins: number
        startedFromCheckpoint: boolean
        gameMode: 'normal' | 'speedrun'
    }


    speedrunData?: {
        uuid: string
        recording?: any
    }


    createdAt: string
    version: string
}

export class PlayService {
    private static instance: PlayService

    public static getInstance(): PlayService {
        if (!PlayService.instance) {
            PlayService.instance = new PlayService()
        }
        return PlayService.instance
    }

    
    private generatePlayId(): string {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            const r = Math.random() * 16 | 0
            const v = c === 'x' ? r : (r & 0x3 | 0x8)
            return v.toString(16)
        })
    }

    
    public async savePlay(playData: Omit<PlayData, 'id' | 'createdAt'>): Promise<string> {
        const id = this.generatePlayId()
        const createdAt = new Date().toISOString()

        const fullPlayData: PlayData = {
            ...playData,
            id,
            createdAt,
            version: '1.0.0' // TODO: Récupérer depuis package.json
        }

        try {

            const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
            const filename = `play_${timestamp}_${id}.json`



            if (typeof window !== 'undefined') {

                const plays = this.getStoredPlays()
                plays.push(fullPlayData)
                localStorage.setItem('game_plays', JSON.stringify(plays))

                console.log('Play sauvegardée:', fullPlayData)
                return id
            }

            return id
        } catch (error) {
            console.error('Erreur lors de la sauvegarde de la play:', error)
            throw error
        }
    }

    
    public async savePlayAndUpdateProfile(playData: Omit<PlayData, 'id' | 'createdAt'>): Promise<string> {
        const id = this.generatePlayId()
        const createdAt = new Date().toISOString()

        const fullPlayData: PlayData = {
            ...playData,
            id,
            createdAt,
            version: '1.0.0'
        }

        try {

            await this.savePlay(playData)


            if (playData.gameData.gameMode === 'speedrun' && authService.isAuthenticated() && playData.speedrunData) {
                await this.saveDetailedSpeedrunFile(fullPlayData)
            }


            const serverSaveSuccess = await this.savePlayDataToServer(fullPlayData)
            if (!serverSaveSuccess) {

                this.savePlayDataLocally(fullPlayData)
            }


            if (authService.isAuthenticated()) {
                console.log('Utilisateur authentifié, sauvegarde du profil...')
                console.log('Type de niveau:', playData.levelType)
                console.log('UUID du niveau:', playData.levelUuid)
                console.log('ID du niveau:', playData.levelId)

                try {
                    if (playData.levelType === 'community') {

                        console.log('Sauvegarde niveau communautaire...')
                        const result = await authService.saveCommunityLevelScore(
                            playData.levelUuid,
                            playData.gameData.duration,
                            playData.gameData.coinsCollected,
                            playData.gameData.gameMode,
                            playData.speedrunData
                        )
                        console.log('Résultat sauvegarde niveau communautaire:', result)
                    } else {

                        console.log('Sauvegarde niveau officiel...')
                        const result = await authService.saveScore(
                            playData.levelId as number,
                            playData.gameData.duration,
                            playData.gameData.coinsCollected,
                            playData.gameData.gameMode,
                            playData.speedrunData
                        )
                        console.log('Résultat sauvegarde niveau officiel:', result)
                    }
                } catch (error) {
                    console.error('Erreur lors de la sauvegarde du profil:', error)
                }
            } else {
                console.log('Utilisateur non authentifié, pas de sauvegarde du profil')
            }

            return id
        } catch (error) {
            console.error('Erreur lors de la sauvegarde de la play et du profil:', error)
            throw error
        }
    }

    
    private getStoredPlays(): PlayData[] {
        try {
            const stored = localStorage.getItem('game_plays')
            return stored ? JSON.parse(stored) : []
        } catch {
            return []
        }
    }

    
    private async savePlayDataToServer(playData: PlayData): Promise<boolean> {
        try {
            const response = await fetch('/api/play-data', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify(playData)
            })

            if (response.ok) {
                const result = await response.json()
                console.log('✅ Play data sauvegardée sur le serveur:', result.filename)
                return true
            } else {
                console.error('❌ Erreur serveur lors de la sauvegarde:', response.status)
                return false
            }
        } catch (error) {
            console.error('❌ Erreur réseau lors de la sauvegarde:', error)
            return false
        }
    }

    
    private savePlayDataLocally(playData: PlayData): void {
        try {
            const plays = this.getStoredPlays()
            plays.push(playData)
            localStorage.setItem('game_plays', JSON.stringify(plays))
            console.log('Play sauvegardée localement en fallback:', playData.id)
        } catch (error) {
            console.error('Erreur lors de la sauvegarde locale:', error)
        }
    }

    
    private async saveDetailedSpeedrunFile(playData: PlayData): Promise<void> {
        try {
            const user = authService.getCurrentUser()
            if (!user) {
                console.log('Pas d\'utilisateur connecté, pas de sauvegarde détaillée')
                return
            }


            const detailedSpeedrunData = {

                id: playData.id,
                createdAt: playData.createdAt,
                version: playData.version,


                player: {
                    username: user.username,
                    userId: user.id,
                    discriminator: user.discriminator,
                    avatar: user.avatar
                },


                level: {
                    id: playData.levelId,
                    uuid: playData.levelUuid,
                    name: playData.levelName,
                    creator: playData.levelCreator,
                    type: playData.levelType
                },


                gameData: {
                    startTime: playData.gameData.startTime,
                    endTime: playData.gameData.endTime,
                    duration: playData.gameData.duration,
                    coinsCollected: playData.gameData.coinsCollected,
                    totalCoins: playData.gameData.totalCoins,
                    startedFromCheckpoint: playData.gameData.startedFromCheckpoint,
                    gameMode: playData.gameData.gameMode
                },


                speedrunData: {
                    uuid: playData.speedrunData?.uuid || '',
                    time: playData.speedrunData?.time || playData.gameData.duration,
                    date: playData.speedrunData?.date || playData.createdAt,
                    gameplay: playData.speedrunData?.recording || null
                },


                statistics: {
                    totalInputs: playData.speedrunData?.recording?.inputs?.length || 0,
                    totalDeaths: playData.speedrunData?.recording?.deaths?.length || 0,
                    totalCoins: playData.speedrunData?.recording?.coins?.length || 0,
                    totalEnemies: playData.speedrunData?.recording?.enemies?.length || 0,
                    totalCheckpoints: playData.speedrunData?.recording?.checkpoints?.length || 0,
                    totalPositions: playData.speedrunData?.recording?.positions?.length || 0
                },


                rawData: {
                    inputs: playData.speedrunData?.recording?.inputs || [],
                    deaths: playData.speedrunData?.recording?.deaths || [],
                    coins: playData.speedrunData?.recording?.coins || [],
                    enemies: playData.speedrunData?.recording?.enemies || [],
                    checkpoints: playData.speedrunData?.recording?.checkpoints || [],
                    positions: playData.speedrunData?.recording?.positions || []
                }
            }


            const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
            const filename = `${user.id}_${playData.levelUuid}_${timestamp}.json`



            if (typeof window !== 'undefined') {
                const detailedPlays = this.getDetailedSpeedrunPlays()
                detailedPlays.push(detailedSpeedrunData)
                localStorage.setItem('detailed_speedruns', JSON.stringify(detailedPlays))

                console.log('Speedrun détaillée sauvegardée:', filename)
                console.log('Statistiques:', detailedSpeedrunData.statistics)
            }

        } catch (error) {
            console.error('Erreur lors de la sauvegarde de la speedrun détaillée:', error)
        }
    }

    
    private getDetailedSpeedrunPlays(): any[] {
        try {
            const stored = localStorage.getItem('detailed_speedruns')
            return stored ? JSON.parse(stored) : []
        } catch {
            return []
        }
    }

    
    public createPlayData(
        levelId: string | number,
        levelName: string,
        levelCreator: string | undefined,
        levelType: 'official' | 'community',
        startTime: number,
        endTime: number,
        coinsCollected: number,
        totalCoins: number,
        startedFromCheckpoint: boolean,
        gameMode: 'normal' | 'speedrun',
        speedrunData?: any
    ): Omit<PlayData, 'id' | 'createdAt'> {
        const user = authService.getCurrentUser()

        return {
            levelId,
            levelName,
            levelCreator,
            levelType,
            player: {
                username: user?.username || null,
                userId: user?.id || null,
                isAuthenticated: authService.isAuthenticated()
            },
            gameData: {
                startTime,
                endTime,
                duration: endTime - startTime,
                coinsCollected,
                totalCoins,
                startedFromCheckpoint,
                gameMode
            },
            speedrunData: speedrunData ? {
                uuid: speedrunData.uuid || '',
                recording: speedrunData.recording
            } : undefined
        }
    }

    
    public createPlayDataFromLevel(
        levelData: any,
        levelId: string | number,
        startTime: number,
        endTime: number,
        coinsCollected: number,
        totalCoins: number,
        startedFromCheckpoint: boolean,
        gameMode: 'normal' | 'speedrun',
        speedrunData?: any
    ): Omit<PlayData, 'id' | 'createdAt'> {
        const user = authService.getCurrentUser()




        const isCommunityLevel = typeof levelId === 'string' && levelId.length > 10
        const levelName = levelData.name || `Level ${levelId}`
        const levelCreator = levelData.creators?.[0]

        console.log('createPlayDataFromLevel - Détails:', {
            levelId,
            levelIdType: typeof levelId,
            isCommunityLevel,
            levelName,
            levelCreator,
            levelDataKeys: Object.keys(levelData)
        })


        let levelUuid: string
        if (isCommunityLevel) {
            levelUuid = levelId.toString()
        } else {

            levelUuid = levelData.uuid || this.extractUuidFromLevelData(levelData, levelId)
        }

        return {
            levelId,
            levelUuid,
            levelName,
            levelCreator,
            levelType: isCommunityLevel ? 'community' : 'official',
            player: {
                username: user?.username || null,
                userId: user?.id || null,
                isAuthenticated: authService.isAuthenticated()
            },
            gameData: {
                startTime,
                endTime,
                duration: endTime - startTime,
                coinsCollected,
                totalCoins,
                startedFromCheckpoint,
                gameMode
            },
            speedrunData: speedrunData ? {
                uuid: speedrunData.uuid || '',
                recording: speedrunData.recording
            } : undefined
        }
    }

    
    private extractUuidFromLevelData(levelData: any, levelId: number): string {


        if (levelData.uuid) {
            return levelData.uuid
        }


        const officialLevelUuids: Record<number, string> = {
            1: '8f591535-3012-480c-ae1d-386ee922a8d1',
            2: '27a035ef-fdbf-4c07-b6e7-8caa88d6c3a7',
            3: '1c5305db-5cdf-468e-82f4-9d07aa2c1fd0',
            4: '2f4c08d6-1bfa-4447-bd12-4fa5e7e8faef',
            5: '59bdf3a4-7e0d-46ab-844c-2adb30b0c6a5',
            6: '639ed65e-1809-4881-b3c9-1586b4bdf1f2',
            7: 'c80f8748-950a-4c84-96a6-da7f682ddbe7',
            8: 'd0132786-548e-422c-ad44-37bbfe7fd722',
            9: 'd35bb33a-8311-4d09-92bd-c48208dec7eb',
            10: 'fea5c9e3-fa14-4b94-a837-7fa24686c108'
        }

        return officialLevelUuids[levelId] || `official-level-${levelId}`
    }
}

export const playService = PlayService.getInstance()
