import DataKey from '../consts/data-key'
import EventKey from '../consts/event-key'
import SceneKey from '../consts/scene-key'
import TextureKey, { IconsKey } from '../consts/texture-key'
import IconButton from '../objects/ui/icon-button'
import Panel from '../objects/ui/panel'
import { getTranslation } from '../consts/translations'
import { transitionEventsEmitter } from '../utils/transition'
import BackgroundScene from './background-scene'
import { authService } from '../services/auth-service'
import { COMMUNITY_THEME } from '../consts/level'
import { getLevelsByDifficulty, getCommunityLevelById } from '../levels/community-index'

export interface CommunityLevelsSceneProps {
    difficulty?: string
}

export type DifficultyLevel = 'very-easy' | 'easy' | 'medium' | 'hard' | 'very-hard' | 'extreme' | 'brutal' | 'infernale' | 'demoniaque' | 'kaizo'

interface CommunityLevel {
    id: string
    name: string
    creator: string
    creators: string[]
    plays: number
    difficulty: DifficultyLevel
    createdAt: string
    filePath: string
    data?: any
}

export const DIFFICULTY_LEVELS: { key: DifficultyLevel; label: string; color: number }[] = [
    { key: 'very-easy', label: 'Very Easy', color: 0x4CAF50 },
    { key: 'easy', label: 'Easy', color: 0x8BC34A },
    { key: 'medium', label: 'Medium', color: 0xFFC107 },
    { key: 'hard', label: 'Hard', color: 0xFF9800 },
    { key: 'very-hard', label: 'Very Hard', color: 0xFF5722 },
    { key: 'extreme', label: 'Extreme', color: 0xF44336 },
    { key: 'brutal', label: 'Brutal', color: 0x9C27B0 },
    { key: 'infernale', label: 'Infernale', color: 0x673AB7 },
    { key: 'demoniaque', label: 'Demoniaque', color: 0x3F51B5 },
    { key: 'kaizo', label: 'Kaizo', color: 0x000000 }
]

export default class CommunityLevelsScene extends Phaser.Scene {
    private difficultyIndex: number = 0
    private communityLevels: CommunityLevel[] = []
    private entryTexts: Phaser.GameObjects.Text[] = []
    private entryImages: Phaser.GameObjects.Image[] = []
    private currentPage: number = 1
    private entriesPerPage: number = 10
    private totalPages: number = 1
    private paginationControls: Phaser.GameObjects.GameObject[] = []
    private selectedLevel: string | null = null
    private leaderboardButton!: IconButton

    constructor() {
        super({ key: SceneKey.CommunityLevels })
    }

    init(data: CommunityLevelsSceneProps) {
        let targetDifficulty = data.difficulty as DifficultyLevel
        if (!targetDifficulty) {
            targetDifficulty = DIFFICULTY_LEVELS[0].key
        }
        this.difficultyIndex = DIFFICULTY_LEVELS.findIndex(d => d.key === targetDifficulty)
            ; (this.scene.get(SceneKey.Background) as BackgroundScene).changeBackground(COMMUNITY_THEME)
    }

    create() {
        const { width, height } = this.scale
        this.scene.stop(SceneKey.HUD)
        this.scene.stop(SceneKey.Editor)
        this.registry.set(DataKey.IsCheckpointActive, false)
        this.registry.set(DataKey.CoinsCollected, false)
        this.syncRegistryWithProfile()
        const currentDifficultyData = DIFFICULTY_LEVELS[this.difficultyIndex]
        this.createHeader(width, height, currentDifficultyData)
        this.createDifficultyNavigation(width, height)
        this.createLevelsTable()
        this.loadCommunityLevels()
        this.scene.launch(SceneKey.Transition)
    }

    createHeader(width: number, height: number, currentDifficultyData: any) {

        this.add
            .text(width / 2, 40, `${getTranslation('communityLevels')}`, {
                fontFamily: TextureKey.FontHeading,
                fontSize: '64px',
                color: '#181425',
            })
            .setOrigin(0.5, 0)

        this.add
            .text(width / 2, 100, currentDifficultyData.label, {
                fontFamily: TextureKey.FontHeading,
                fontSize: '48px',
                color: '#' + currentDifficultyData.color.toString(16).padStart(6, '0'),
            })
            .setOrigin(0.5, 0)

        new IconButton(this, 80, 60, IconsKey.Back, () => this.goToScreen(SceneKey.Levels))
        new IconButton(this, 220, 60, IconsKey.Language, this.goToLanguage)

        this.leaderboardButton = new IconButton(this, 360, 60, IconsKey.Leaderboard, this.goToLeaderboard)
        this.leaderboardButton.setAlpha(0.5)
        this.leaderboardButton.setInteractive(false)
    }

    createDifficultyNavigation(width: number, height: number) {

        const navY = height / 2

        if (this.difficultyIndex > 0) {
            const prevButton = new IconButton(this, 100, navY, IconsKey.Chevron, () =>
                this.goToDifficulty(this.difficultyIndex - 1)
            )
            prevButton.rotateIcon(180)
            prevButton.setScale(1.2)
            prevButton.setDepth(1000)
        }

        if (this.difficultyIndex < DIFFICULTY_LEVELS.length - 1) {
            const nextButton = new IconButton(this, width - 100, navY, IconsKey.Chevron, () =>
                this.goToDifficulty(this.difficultyIndex + 1)
            )
            nextButton.setScale(1.2)
            nextButton.setDepth(1000)
        }
    }

    createLevelsTable() {
        const { width } = this.scale
        const currentDifficultyData = DIFFICULTY_LEVELS[this.difficultyIndex]


        const panelWidth = 1300
        const panelHeight = 600
        const panelX = (width - panelWidth) / 2
        const panelY = 180
        this.add.existing(new Panel(this, panelX, panelY, panelWidth, panelHeight))


        const headerY = panelY + 30
        const headerBg = this.add.rectangle(width / 2, headerY, 1100, 35, currentDifficultyData.color)
            .setAlpha(0.9)
        this.entryImages.push(headerBg as any)


        this.add
            .text(width / 2 - 350, headerY, getTranslation('levelName'), {
                fontFamily: TextureKey.FontBody,
                fontSize: '24px',
                color: '#ffffff',
            })
            .setOrigin(0.5)

        this.add
            .text(width / 2 - 50, headerY, getTranslation('creator'), {
                fontFamily: TextureKey.FontBody,
                fontSize: '24px',
                color: '#ffffff',
            })
            .setOrigin(0.5)

        this.add
            .text(width / 2 + 200, headerY, getTranslation('numberOfPlays'), {
                fontFamily: TextureKey.FontBody,
                fontSize: '24px',
                color: '#ffffff',
            })
            .setOrigin(0.5)

        this.add
            .text(width / 2 + 350, headerY, getTranslation('action'), {
                fontFamily: TextureKey.FontBody,
                fontSize: '24px',
                color: '#ffffff',
            })
            .setOrigin(0.5)


        this.createPageIndicator()
    }

    createPageIndicator() {
        const { width, height } = this.scale
        const indicatorY = height - 80
        const spacing = 40
        const totalWidth = (DIFFICULTY_LEVELS.length - 1) * spacing
        const startX = width / 2 - totalWidth / 2

        DIFFICULTY_LEVELS.forEach((difficulty, index) => {
            const x = startX + index * spacing
            const isActive = index === this.difficultyIndex

            const indicator = this.add.circle(x, indicatorY, isActive ? 12 : 8, difficulty.color)
            indicator.setAlpha(isActive ? 1 : 0.5)

            if (isActive) {
                indicator.setStrokeStyle(2, 0xffffff, 1)
            }

            if (!isActive) {
                indicator.setInteractive()
                indicator.on('pointerdown', () => {
                    this.goToDifficulty(index)
                })
                indicator.on('pointerover', () => {
                    indicator.setAlpha(0.8)
                })
                indicator.on('pointerout', () => {
                    indicator.setAlpha(0.5)
                })
            }
        })
    }

    async loadCommunityLevels() {
        try {
            this.communityLevels = await this.loadLevelsFromIndex()
            this.displayLevelsTable()
        } catch (error) {
            console.error('Erreur lors du chargement des niveaux communautaires:', error)

            this.communityLevels = this.generateSampleData()
            this.displayLevelsTable()
        }
    }

    async loadLevelsFromIndex(): Promise<CommunityLevel[]> {
        const currentDifficulty = DIFFICULTY_LEVELS[this.difficultyIndex].key
        const levels: CommunityLevel[] = []

        try {

            const levelInfos = getLevelsByDifficulty(currentDifficulty)

            for (const levelInfo of levelInfos) {
                const levelData = levelInfo.data
                let plays = 0
                try {
                    const response = await fetch(`/api/community-level-plays/${levelInfo.id}`)
                    if (response.ok) {
                        const data = await response.json()
                        plays = data.plays || 0
                    }
                } catch (error) {
                    console.error(`Erreur récupération plays pour ${levelInfo.id}:`, error)
                }

                levels.push({
                    id: levelInfo.id,
                    name: levelData.name || getTranslation('unnamedLevel'),
                    creator: levelData.creators?.[0] || getTranslation('unknownCreator'),
                    creators: levelData.creators || [],
                    plays: plays,
                    difficulty: levelData.difficulty?.toLowerCase() as DifficultyLevel || 'medium',
                    createdAt: levelData.createdAt || new Date().toISOString(),
                    filePath: levelInfo.id
                })
            }

        } catch (error) {
            console.error('Erreur lors du chargement des niveaux:', error)
        }

        return levels.sort((a, b) => b.plays - a.plays)
    }

    generateSampleData(): CommunityLevel[] {
        const currentDifficulty = DIFFICULTY_LEVELS[this.difficultyIndex].key
        const sampleLevels: CommunityLevel[] = []


        const levelNames = [
            'Jump Master', 'Speed Challenge', 'Precision Test', 'Endurance Run',
            'Platform Puzzle', 'Timing Trial', 'Reflex Check', 'Memory Lane',
            'Skill Showcase', 'Ultimate Test', 'Master Class', 'Expert Run',
            'Pro Challenge', 'Elite Trial', 'Legend Quest'
        ]

        const creators = [
            'BobbyFan123', 'SpeedRunner', 'PlatformMaster', 'JumpKing',
            'PrecisionPro', 'TimingExpert', 'ReflexGamer', 'MemoryMaster',
            'SkillDemon', 'UltimatePlayer', 'MasterGamer', 'ExpertPlayer',
            'ProGamer', 'ElitePlayer', 'LegendGamer'
        ]

        for (let i = 0; i < 15; i++) {
            sampleLevels.push({
                id: `level_${currentDifficulty}_${i}`,
                name: levelNames[i],
                creator: creators[i],
                creators: [creators[i]],
                plays: Math.floor(Math.random() * 1000) + 1,
                difficulty: currentDifficulty,
                createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
                filePath: `./${currentDifficulty}/level_${i}.json`,
                data: {} as any
            })
        }

        return sampleLevels.sort((a, b) => b.plays - a.plays)
    }

    displayLevelsTable() {
        if (!this.communityLevels) return

        const { width } = this.scale
        const startY = 250
        const centerX = width / 2
        const lineHeight = 50


        this.totalPages = Math.max(1, Math.ceil(this.communityLevels.length / this.entriesPerPage))
        const startIndex = (this.currentPage - 1) * this.entriesPerPage
        const endIndex = startIndex + this.entriesPerPage
        const pageLevels = this.communityLevels.slice(startIndex, endIndex)


        pageLevels.forEach((level, index) => {
            const y = startY + index * lineHeight
            const bgColor = index % 2 === 0 ? 0xf8f9fa : 0xffffff


            const lineBg = this.add.rectangle(centerX, y, 1100, lineHeight - 3, bgColor)
                .setAlpha(0.8)
                .setInteractive()
                .on('pointerdown', () => this.selectLevel(level.id, lineBg))
            this.entryImages.push(lineBg as any)


            this.entryTexts.push(
                this.add
                    .text(centerX - 350, y, level.name, {
                        fontFamily: TextureKey.FontBody,
                        fontSize: '20px',
                        color: '#181425',
                    })
                    .setOrigin(0.5)
            )


            const creatorText = level.creators.length > 1
                ? `${level.creator} +${level.creators.length - 1}`
                : level.creator

            this.entryTexts.push(
                this.add
                    .text(centerX - 50, y, creatorText, {
                        fontFamily: TextureKey.FontBody,
                        fontSize: '18px',
                        color: '#181425',
                    })
                    .setOrigin(0.5)
            )


            this.entryTexts.push(
                this.add
                    .text(centerX + 200, y, level.plays.toString(), {
                        fontFamily: TextureKey.FontBody,
                        fontSize: '18px',
                        color: '#181425',
                    })
                    .setOrigin(0.5)
            )


            const playButton = new IconButton(this, centerX + 320, y, IconsKey.Play, () => {
                this.playLevel(level.id)
            })
            playButton.setScale(0.6)
            this.paginationControls.push(playButton)


            const leaderboardButton = new IconButton(this, centerX + 380, y, IconsKey.Leaderboard, () => {
                this.goToLeaderboard(level.id, level.name, level.creator)
            })
            leaderboardButton.setScale(0.6)
            this.paginationControls.push(leaderboardButton)
        })


        if (this.communityLevels.length === 0) {
            this.entryTexts.push(
                this.add
                    .text(
                        centerX,
                        startY + 100,
                        getTranslation('noLevelsAvailable'),
                        {
                            fontFamily: TextureKey.FontBody,
                            fontSize: '32px',
                            color: '#666666'
                        }
                    )
                    .setOrigin(0.5)
            )
        }


        this.addPaginationControls()
    }

    addPaginationControls() {
        const { width } = this.scale
        const paginationY = 820


        const prevButton = new IconButton(this, width / 2 - 60, paginationY, IconsKey.Chevron, () => {
            this.previousPage()
        })
        prevButton.setScale(0.8)
        prevButton.setIconFrame(IconsKey.Chevron)
        prevButton.setScale(-0.8, 0.8)


        const nextButton = new IconButton(this, width / 2 + 60, paginationY, IconsKey.Chevron, () => {
            this.nextPage()
        })
        nextButton.setScale(0.8)


        if (this.currentPage === 1 || this.totalPages === 1) {
            prevButton.setAlpha(0.4)
            prevButton.setInteractive(false)
        }

        if (this.currentPage === this.totalPages || this.totalPages === 1) {
            nextButton.setAlpha(0.4)
            nextButton.setInteractive(false)
        }


        const pageText = this.add
            .text(
                width / 2,
                paginationY,
                `${this.currentPage} / ${this.totalPages}`,
                {
                    fontFamily: TextureKey.FontBody,
                    fontSize: '18px',
                    color: '#181425',
                }
            )
            .setOrigin(0.5)

        this.paginationControls.push(prevButton, nextButton, pageText)
    }

    previousPage() {
        if (this.currentPage > 1) {
            this.currentPage--
            this.refreshDisplay()
        }
    }

    nextPage() {
        if (this.currentPage < this.totalPages) {
            this.currentPage++
            this.refreshDisplay()
        }
    }

    refreshDisplay() {

        this.entryTexts.forEach(text => text.destroy())
        this.entryImages.forEach(image => image.destroy())
        this.paginationControls.forEach(control => {
            if (control && control.destroy) {
                control.destroy()
            }
        })

        this.entryTexts = []
        this.entryImages = []
        this.paginationControls = []


        this.selectedLevel = null
        this.updateLeaderboardButton()


        this.createLevelsTable()
        this.displayLevelsTable()
    }

    goToScreen(screen: string, params = {}) {
        transitionEventsEmitter.emit(EventKey.TransitionStart)
        transitionEventsEmitter.once(
            EventKey.TransitionEnd,
            () => {
                ; (this.scene.get(SceneKey.Background) as BackgroundScene).reset()
                this.scene.start(screen, params)
            },
            this
        )
    }

    goToDifficulty(difficultyIndex: number) {

        this.entryTexts.forEach(text => text.destroy())
        this.entryImages.forEach(image => image.destroy())
        this.paginationControls.forEach(control => {
            if (control && control.destroy) {
                control.destroy()
            }
        })


        this.currentPage = 1
        this.selectedLevel = null

        const data: CommunityLevelsSceneProps = { difficulty: DIFFICULTY_LEVELS[difficultyIndex].key }
        transitionEventsEmitter.emit(EventKey.TransitionStart)
        transitionEventsEmitter.once(EventKey.TransitionEnd, () => this.scene.restart(data))
    }

    goToLanguage() {
        transitionEventsEmitter.emit(EventKey.TransitionStart)
        transitionEventsEmitter.once(EventKey.TransitionEnd, () => this.scene.start(SceneKey.Language), this)
    }

    syncRegistryWithProfile() {
        if (authService.isAuthenticated()) {
            const settings = authService.getSettings()
            if (settings.gameMode) {
                this.registry.set(DataKey.GameMode, settings.gameMode)
            }
        }
    }

    selectLevel(levelId: string, _button: Phaser.GameObjects.Rectangle) {

        this.selectedLevel = levelId
        this.updateLeaderboardButton()
    }

    updateLeaderboardButton() {
        if (this.selectedLevel) {
            this.leaderboardButton.setAlpha(1)
            this.leaderboardButton.setInteractive(true)
        } else {
            this.leaderboardButton.setAlpha(0.5)
            this.leaderboardButton.setInteractive(false)
        }
    }


    playLevel(levelId: string) {

        const level = this.communityLevels.find(l => l.id === levelId)
        if (level) {
            try {

                const levelInfo = getCommunityLevelById(levelId)

                if (levelInfo) {

                    this.registry.set('communityLevelData', levelInfo.data)
                    this.registry.set('communityLevelId', levelId)


                    this.goToScreen(SceneKey.Game, {
                        number: 999 // Numéro spécial pour les niveaux communautaires
                    })
                }
            } catch (error) {
                console.error('Erreur lors du chargement du niveau:', error)
            }
        }
    }

    goToLeaderboard(levelId: string, levelName: string, levelCreator: string) {
        this.goToScreen(SceneKey.CommunityLeaderboard, {
            levelId: levelId,
            levelName: levelName,
            levelCreator: levelCreator
        })
    }

}
