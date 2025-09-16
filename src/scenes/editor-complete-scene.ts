import Phaser from 'phaser'
import SceneKey from '../consts/scene-key'
import EventKey from '../consts/event-key'
import DataKey from '../consts/data-key'
import { transitionEventsEmitter } from '../utils/transition'
import IconButton from '../objects/ui/icon-button'
import { IconsKey } from '../consts/texture-key'
import { GameMode } from '../consts/level'

export default class EditorCompleteScene extends Phaser.Scene {
    private timeText!: Phaser.GameObjects.Text
    private coinsText!: Phaser.GameObjects.Text
    private deathsText!: Phaser.GameObjects.Text
    private isCustomLevelRun!: boolean

    constructor() {
        super({ key: SceneKey.EditorComplete })
    }

    init() {
    }

    create() {
        this.isCustomLevelRun = this.registry.get(DataKey.IsCustomLevelRun) || false

        // const bg = this.add.rectangle(960, 540, 1920, 1080, 0x000000, 0.7)
        // bg.setDepth(1000)

        const panel = this.add.rectangle(960, 445, 400, 200, 0x2a2a2a)
        panel.setStrokeStyle(4, 0x4a4a4a)
        panel.setDepth(1001)

        const title = this.add.text(960, 380, 'Test terminé !', {
            fontSize: '48px',
            color: '#ffffff',
            fontFamily: 'Arial'
        })
        title.setOrigin(0.5)
        title.setDepth(1002)

        this.timeText = this.add.text(960, 450, 'Temps: 00:00.000', {
            fontSize: '24px',
            color: '#ffffff',
            fontFamily: 'Arial'
        })
        this.timeText.setOrigin(0.5)
        this.timeText.setDepth(1002)

        this.coinsText = this.add.text(960, 480, 'Pièces: 0', {
            fontSize: '24px',
            color: '#ffffff',
            fontFamily: 'Arial'
        })
        this.coinsText.setOrigin(0.5)
        this.coinsText.setDepth(1002)

        this.deathsText = this.add.text(960, 510, 'Morts: 0', {
            fontSize: '24px',
            color: '#ffffff',
            fontFamily: 'Arial'
        })
        this.deathsText.setOrigin(0.5)
        this.deathsText.setDepth(1002)

        // Boutons (appellent exactement les mêmes fonctions que HUD testPlay)
        // const btnRestart = new IconButton(this, 860, 620, IconsKey.Restart, () => {
        //     this.callHUDRestartFunction()
        // })
        // btnRestart.setDepth(1002)

        // const btnQuit = new IconButton(this, 1060, 620, IconsKey.Back, () => {
        //     this.callHUDQuitFunction()
        // })
        // btnQuit.setDepth(1002)

        // Labels des boutons
        // this.add.text(860, 680, 'Recommencer', {
        //     fontSize: '16px',
        //     color: '#ffffff',
        //     fontFamily: 'Arial'
        // }).setOrigin(0.5).setDepth(1002)

        // this.add.text(1060, 680, 'Retour', {
        //     fontSize: '16px',
        //     color: '#ffffff',
        //     fontFamily: 'Arial'
        // }).setOrigin(0.5).setDepth(1002)

        this.loadLevelData()
    }

    private loadLevelData() {
        const gameScene = this.scene.get(SceneKey.Game) as any
        if (gameScene && gameScene.getLevelStats) {
            // Utiliser la méthode getLevelStats() de GameScene
            const stats = gameScene.getLevelStats()

            // Temps
            if (stats.time !== undefined) {
                const formattedTime = this.formatTime(stats.time)
                this.timeText.setText(`Temps: ${formattedTime}`)
            } else {
                this.timeText.setText('Temps: Non disponible')
            }

            // Pièces
            if (stats.coinsCollected !== undefined) {
                this.coinsText.setText(`Pièces: ${stats.coinsCollected}`)
            }

            // Morts
            if (stats.deaths !== undefined) {
                this.deathsText.setText(`Morts: ${stats.deaths}`)
            }
        } else {
            this.timeText.setText('Temps: Non disponible')
            this.coinsText.setText('Pièces: Non disponible')
            this.deathsText.setText('Morts: Non disponible')
        }
    }

    private formatTime(milliseconds: number): string {
        const totalSeconds = Math.floor(milliseconds / 1000)
        const minutes = Math.floor(totalSeconds / 60)
        const seconds = totalSeconds % 60
        const ms = Math.floor(milliseconds % 1000)
        const microseconds = Math.floor((milliseconds % 1) * 1000)

        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}${microseconds.toString().padStart(3, '0')}`
    }


    private callHUDRestartFunction() {
        // Appeler exactement la même fonction que HUDScene.restartCurrentLevel()
        transitionEventsEmitter.emit(EventKey.TransitionStart)
        transitionEventsEmitter.once(
            EventKey.TransitionEnd,
            () => {
                this.registry.set(DataKey.IsPaused, false)
                this.scene.start(SceneKey.Game)
                this.scene.restart()
            },
            this
        )
    }

    private callHUDQuitFunction() {
        this.scene.stop(SceneKey.HUD)

        localStorage.removeItem('currentEditorId')
        this.registry.set(DataKey.GameMode, GameMode.Classic)
        if (this.isCustomLevelRun) {
        }

        const gameScene = this.scene.get(SceneKey.Game)
        if (gameScene) {
            const defaultLevel = this.getDefaultLevel()
            this.registry.set('loadingDefaultLevel', true)
            this.events.emit(EventKey.EditorImport, defaultLevel)
            this.registry.set('loadingDefaultLevel', false)
        }

        transitionEventsEmitter.emit(EventKey.TransitionStart)
        transitionEventsEmitter.once(
            EventKey.TransitionEnd,
            () => {
                if (this.isCustomLevelRun) {
                    gameScene.scene.restart({ isCustomLevelRun: false })

                    const editorScene = this.scene.get(SceneKey.Editor) as any
                    if (editorScene) {
                        editorScene.isEditing = true
                        editorScene.events.emit(EventKey.EditorToggle, true)
                        editorScene.showGrid = true
                        editorScene.events.emit(EventKey.EditorToggleGrid, true)
                        if (editorScene.btnToggle) {
                            editorScene.btnToggle.toggleIcon(IconsKey.Edit)
                        }
                        if (editorScene.editButtonsPanel) {
                            editorScene.editButtonsPanel.setVisible(true)
                        }
                        if (editorScene.levelSizePanel) {
                            editorScene.levelSizePanel.setVisible(true)
                        }
                    }

                    this.scene.stop()
                } else {
                    gameScene.scene.start(SceneKey.Levels)
                    this.scene.stop()
                }
            },
            this
        )
    }

    private getDefaultLevel(): any {
        return {
            name: 'Nouveau niveau',
            world: {
                width: 2000,
                height: 2000
            },
            platforms: [],
            spikes: [],
            spikyBalls: [],
            coins: [],
            oneWayPlatforms: [],
            cannons: [],
            fallingBlocks: [],
            eventBlocks: [],
            bumps: [],
            enemies: [],
            player: { x: 520, y: 520 },
            target: { x: 1480, y: 520 }
        }
    }


}
