import DataKey from '../consts/data-key'
import EventKey from '../consts/event-key'
import SceneKey from '../consts/scene-key'
import TextureKey, { IconsKey } from '../consts/texture-key'
import IconButton from '../objects/ui/icon-button'
import Panel from '../objects/ui/panel'
import { transitionEventsEmitter } from '../utils/transition'
import BackgroundScene from './background-scene'
import { COMMUNITY_THEME } from '../consts/level'

interface LevelStats {
    time: number
    coinsCollected: number
    totalCoins: number
    deaths: number
    levelName: string
    isCustomLevel: boolean
}

export default class LevelCompleteScene extends Phaser.Scene {
    private stats!: LevelStats

    constructor() {
        super({ key: SceneKey.LevelComplete })
    }

    init(data: LevelStats) {
        this.stats = data || {
            time: 0,
            coinsCollected: 0,
            totalCoins: 0,
            deaths: 0,
            levelName: 'Niveau',
            isCustomLevel: false
        }
            ; (this.scene.get(SceneKey.Background) as BackgroundScene).changeBackground(COMMUNITY_THEME)
    }

    create() {
        console.log('🎯 LevelCompleteScene: Création de la scène avec stats:', this.stats)
        const { width, height } = this.scale
        this.scene.stop(SceneKey.HUD)
        this.scene.stop(SceneKey.Game)

        this.createHeader(width, height)
        this.createStatsPanel(width, height)
        this.createButtons(width, height)
    }

    createHeader(width: number, height: number) {
        this.add
            .text(width / 2, 100, 'Niveau Terminé !', {
                fontFamily: TextureKey.FontHeading,
                fontSize: '72px',
                color: '#181425',
            })
            .setOrigin(0.5, 0)

        this.add
            .text(width / 2, 180, this.stats.levelName, {
                fontFamily: TextureKey.FontBody,
                fontSize: '32px',
                color: '#666666',
            })
            .setOrigin(0.5, 0)
    }

    createStatsPanel(width: number, height: number) {
        const panelWidth = 600
        const panelHeight = 400
        const centerX = (width - panelWidth) / 2
        const centerY = 300

        this.add.existing(new Panel(this, centerX, centerY, panelWidth, panelHeight))

        const statsY = centerY + 50
        const lineHeight = 50

        this.createStatLine(centerX, statsY, 'Temps:', this.formatTime(this.stats.time), '#181425')
        this.createStatLine(centerX, statsY + lineHeight, 'Pièces:', `${this.stats.coinsCollected}/${this.stats.totalCoins}`, '#181425')
        this.createStatLine(centerX, statsY + lineHeight * 2, 'Morts:', this.stats.deaths.toString(), '#181425')

        const completionRate = this.stats.totalCoins > 0 ? (this.stats.coinsCollected / this.stats.totalCoins * 100).toFixed(0) : '100'
        this.createStatLine(centerX, statsY + lineHeight * 3, 'Complétion:', `${completionRate}%`, '#181425')
    }

    createStatLine(x: number, y: number, label: string, value: string, color: string) {
        this.add
            .text(x + 50, y, label, {
                fontFamily: TextureKey.FontBody,
                fontSize: '24px',
                color: color,
            })
            .setOrigin(0, 0.5)

        this.add
            .text(x + 400, y, value, {
                fontFamily: TextureKey.FontBody,
                fontSize: '24px',
                color: color,
                fontStyle: 'bold',
            })
            .setOrigin(1, 0.5)
    }

    createButtons(width: number, height: number) {
        const buttonY = 600
        const buttonSpacing = 150

        const retryButton = new IconButton(this, width / 2 - buttonSpacing, buttonY, IconsKey.Restart, () => {
            this.retryLevel()
        })
        retryButton.setScale(0.8)

        const nextButton = new IconButton(this, width / 2, buttonY, IconsKey.Chevron, () => {
            this.nextLevel()
        })
        nextButton.setScale(0.8)

        const menuButton = new IconButton(this, width / 2 + buttonSpacing, buttonY, IconsKey.Back, () => {
            this.goToMenu()
        })
        menuButton.setScale(0.8)

        this.add.existing(retryButton)
        this.add.existing(nextButton)
        this.add.existing(menuButton)
    }

    formatTime(timeInMs: number): string {
        const seconds = Math.floor(timeInMs / 1000)
        const minutes = Math.floor(seconds / 60)
        const remainingSeconds = seconds % 60
        const ms = Math.floor(timeInMs % 1000)
        const microseconds = Math.floor((timeInMs % 1) * 1000)

        if (minutes > 0) {
            return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}.${microseconds.toString().padStart(3, '0')}`
        } else {
            return `${remainingSeconds}.${ms.toString().padStart(3, '0')}.${microseconds.toString().padStart(3, '0')}`
        }
    }

    retryLevel() {
        transitionEventsEmitter.emit(EventKey.TransitionStart)
        transitionEventsEmitter.once(EventKey.TransitionEnd, () => {
            this.scene.start(SceneKey.Game)
        }, this)
    }

    nextLevel() {
        if (this.stats.isCustomLevel) {
            this.goToMenu()
        } else {
            const currentLevel = this.registry.get(DataKey.CurrentLevel) || 1
            const nextLevel = currentLevel + 1

            transitionEventsEmitter.emit(EventKey.TransitionStart)
            transitionEventsEmitter.once(EventKey.TransitionEnd, () => {
                this.scene.start(SceneKey.Game, { number: nextLevel })
            }, this)
        }
    }

    goToMenu() {
        transitionEventsEmitter.emit(EventKey.TransitionStart)
        transitionEventsEmitter.once(EventKey.TransitionEnd, () => {
            ; (this.scene.get(SceneKey.Background) as BackgroundScene).reset()
            this.scene.start(SceneKey.Levels)
        }, this)
    }
}
