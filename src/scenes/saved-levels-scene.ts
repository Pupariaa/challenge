import DataKey from '../consts/data-key'
import EventKey from '../consts/event-key'
import SceneKey from '../consts/scene-key'
import { GameMode } from '../consts/level'
import TextureKey, { IconsKey } from '../consts/texture-key'
import IconButton from '../objects/ui/icon-button'
import Panel from '../objects/ui/panel'
import { getTranslation } from '../consts/translations'
import { transitionEventsEmitter } from '../utils/transition'
import BackgroundScene from './background-scene'
import { COMMUNITY_THEME } from '../consts/level'

interface SavedLevel {
    id: string
    name: string
    lastModified: string
}

export default class SavedLevelsScene extends Phaser.Scene {
    private savedLevels: SavedLevel[] = []
    private entryTexts: Phaser.GameObjects.Text[] = []
    private entryImages: Phaser.GameObjects.Image[] = []
    private currentPage: number = 1
    private entriesPerPage: number = 8
    private totalPages: number = 1
    private paginationControls: Phaser.GameObjects.GameObject[] = []

    constructor() {
        super({ key: SceneKey.SavedLevels })
    }

    init() {
        ; (this.scene.get(SceneKey.Background) as BackgroundScene).changeBackground(COMMUNITY_THEME)
    }

    create() {
        const { width, height } = this.scale
        this.scene.stop(SceneKey.HUD)
        this.scene.stop(SceneKey.Editor)
        this.registry.set(DataKey.IsCheckpointActive, false)
        this.registry.set(DataKey.CoinsCollected, false)

        this.createHeader(width, height)
        this.createLevelsTable()
        this.loadSavedLevels()
        this.scene.launch(SceneKey.Transition)
    }

    createHeader(width: number, height: number) {
        this.add
            .text(width / 2, 40, 'Niveaux Sauvegardés', {
                fontFamily: TextureKey.FontHeading,
                fontSize: '64px',
                color: '#181425',
            })
            .setOrigin(0.5, 0)

        new IconButton(this, 80, 60, IconsKey.Back, () => this.goBack())
    }

    createLevelsTable() {
        const { width, height } = this.scale

        const panelWidth = 1400
        const panelHeight = 600
        const centerX = (width - panelWidth) / 2
        this.add.existing(new Panel(this, centerX, 150, panelWidth, panelHeight))

        const headerY = 200
        const headerBg = this.add.rectangle(width / 2, headerY, 1200, 40, 0x181425)
            .setAlpha(0.9)
        this.entryImages.push(headerBg as any)

        this.add
            .text(width / 2 - 400, headerY, 'Nom du niveau', {
                fontFamily: TextureKey.FontBody,
                fontSize: '24px',
                color: '#ffffff',
            })
            .setOrigin(0.5)

        this.add
            .text(width / 2 - 50, headerY, 'Dernière modification', {
                fontFamily: TextureKey.FontBody,
                fontSize: '24px',
                color: '#ffffff',
            })
            .setOrigin(0.5)

        this.add
            .text(width / 2 + 350, headerY, 'Action', {
                fontFamily: TextureKey.FontBody,
                fontSize: '24px',
                color: '#ffffff',
            })
            .setOrigin(0.5)
    }

    loadSavedLevels() {
        this.savedLevels = this.getSavedLevels()
        this.displayLevels()
    }

    getSavedLevels(): SavedLevel[] {
        const levels: SavedLevel[] = []

        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i)
            if (key && key.startsWith('level_')) {
                try {
                    const base64Data = localStorage.getItem(key)
                    if (base64Data) {
                        const levelData = JSON.parse(atob(base64Data))
                        const id = key.replace('level_', '')
                        levels.push({
                            id,
                            name: levelData.name || 'Niveau sans nom',
                            lastModified: levelData.lastModified || 'Date inconnue'
                        })
                    }
                } catch (error) {
                    console.error(`Erreur lors du parsing du niveau ${key}:`, error)
                }
            }
        }

        return levels.sort((a, b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime())
    }

    displayLevels() {
        this.clearDisplay()

        if (this.savedLevels.length === 0) {
            this.entryTexts.push(
                this.add
                    .text(
                        this.scale.width / 2,
                        350,
                        'Aucun niveau sauvegardé',
                        {
                            fontFamily: TextureKey.FontBody,
                            fontSize: '32px',
                            color: '#666666'
                        }
                    )
                    .setOrigin(0.5)
            )
            return
        }

        this.totalPages = Math.max(1, Math.ceil(this.savedLevels.length / this.entriesPerPage))

        const startIndex = (this.currentPage - 1) * this.entriesPerPage
        const endIndex = startIndex + this.entriesPerPage
        const pageLevels = this.savedLevels.slice(startIndex, endIndex)

        const startY = 250
        const centerX = this.scale.width / 2
        const lineHeight = 50

        pageLevels.forEach((level, index) => {
            const y = startY + index * lineHeight
            const bgColor = index % 2 === 0 ? 0xf8f9fa : 0xffffff

            const lineBg = this.add.rectangle(centerX, y, 1200, lineHeight - 3, bgColor)
                .setAlpha(0.8)
                .setInteractive()
                .on('pointerdown', () => this.loadLevel(level.id))
                .on('pointerover', () => {
                    lineBg.setAlpha(0.9)
                })
                .on('pointerout', () => {
                    lineBg.setAlpha(0.8)
                })
            this.entryImages.push(lineBg as any)

            this.entryTexts.push(
                this.add
                    .text(centerX - 400, y, level.name, {
                        fontFamily: TextureKey.FontBody,
                        fontSize: '20px',
                        color: '#181425',
                    })
                    .setOrigin(0.5)
            )

            const date = new Date(level.lastModified).toLocaleString('fr-FR', {
                day: '2-digit',
                month: '2-digit',
                year: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            })
            this.entryTexts.push(
                this.add
                    .text(centerX - 50, y, date, {
                        fontFamily: TextureKey.FontBody,
                        fontSize: '18px',
                        color: '#181425',
                    })
                    .setOrigin(0.5)
            )

            const loadButton = new IconButton(this, centerX + 200, y, IconsKey.Move, () => {
                this.loadLevel(level.id)
            })
            loadButton.setScale(0.6)
            this.paginationControls.push(loadButton)

            const playButton = new IconButton(this, centerX + 280, y, IconsKey.Play, () => {
                this.playLevel(level.id)
            })
            playButton.setScale(0.6)
            this.paginationControls.push(playButton)

            const renameButton = new IconButton(this, centerX + 360, y, IconsKey.Edit, () => {
                this.renameLevel(level.id, level.name)
            })
            renameButton.setScale(0.6)
            this.paginationControls.push(renameButton)

            const deleteButton = new IconButton(this, centerX + 440, y, IconsKey.Delete, () => {
                this.deleteLevel(level.id, level.name)
            })
            deleteButton.setScale(0.6)
            this.paginationControls.push(deleteButton)
        })

        if (this.totalPages > 1) {
            this.addPaginationControls()
        }
    }

    addPaginationControls() {
        const prevButton = new IconButton(this, this.scale.width / 2 - 60, 600, IconsKey.Chevron, () => {
            this.previousPage()
        })
        prevButton.setScale(0.8)
        prevButton.rotateIcon(180)

        const nextButton = new IconButton(this, this.scale.width / 2 + 60, 600, IconsKey.Chevron, () => {
            this.nextPage()
        })
        nextButton.setScale(0.8)

        if (this.currentPage === 1) {
            prevButton.setAlpha(0.4)
            prevButton.setInteractive(false)
        }

        if (this.currentPage === this.totalPages) {
            nextButton.setAlpha(0.4)
            nextButton.setInteractive(false)
        }

        const pageText = this.add
            .text(
                this.scale.width / 2,
                600,
                `${this.currentPage} / ${this.totalPages}`,
                {
                    fontFamily: TextureKey.FontBody,
                    fontSize: '20px',
                    color: '#181425',
                }
            )
            .setOrigin(0.5)

        this.add.existing(prevButton)
        this.add.existing(nextButton)

        this.paginationControls.push(prevButton, nextButton, pageText)
    }

    previousPage() {
        if (this.currentPage > 1) {
            this.currentPage--
            this.displayLevels()
        }
    }

    nextPage() {
        if (this.currentPage < this.totalPages) {
            this.currentPage++
            this.displayLevels()
        }
    }

    clearDisplay() {
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
    }

    playLevel(levelId: string) {
        try {
            const base64Data = localStorage.getItem(`level_${levelId}`)
            if (!base64Data) {
                alert('Niveau introuvable')
                return
            }

            const levelData = JSON.parse(atob(base64Data))

            this.registry.set('communityLevelData', levelData)
            this.registry.set('communityLevelId', levelId)

            this.goToScreen(SceneKey.Game, {
                number: 999
            })
        } catch (error) {
            console.error('❌ Erreur lors du chargement:', error)
            alert('Erreur lors du chargement du niveau')
        }
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

    renameLevel(levelId: string, currentName: string) {
        const newName = window.prompt(`Renommer le niveau "${currentName}" :`, currentName)

        if (newName && newName.trim() !== '' && newName.trim() !== currentName) {
            try {
                const base64Data = localStorage.getItem(`level_${levelId}`)
                if (!base64Data) {
                    alert('Niveau introuvable')
                    return
                }

                const levelData = JSON.parse(atob(base64Data))
                levelData.name = newName.trim()
                levelData.lastModified = new Date().toISOString()

                const updatedBase64Data = btoa(JSON.stringify(levelData))
                localStorage.setItem(`level_${levelId}`, updatedBase64Data)

                console.log(`✅ Niveau renommé de "${currentName}" vers "${newName.trim()}"`)

                this.loadSavedLevels()
            } catch (error) {
                console.error('❌ Erreur lors du renommage:', error)
                alert('Erreur lors du renommage du niveau')
            }
        }
    }

    deleteLevel(levelId: string, levelName: string) {
        const confirmed = window.confirm(`Êtes-vous sûr de vouloir supprimer le niveau "${levelName}" ?\n\nCette action est irréversible.`)

        if (confirmed) {
            try {
                localStorage.removeItem(`level_${levelId}`)

                const currentEditorId = localStorage.getItem('currentEditorId')
                if (currentEditorId === levelId) {
                    localStorage.removeItem('currentEditorId')
                }

                console.log(`✅ Niveau "${levelName}" supprimé avec succès`)

                this.loadSavedLevels()
            } catch (error) {
                console.error('❌ Erreur lors de la suppression:', error)
                alert('Erreur lors de la suppression du niveau')
            }
        }
    }

    loadLevel(levelId: string) {
        try {
            const base64Data = localStorage.getItem(`level_${levelId}`)
            if (!base64Data) {
                alert('Niveau introuvable')
                return
            }

            localStorage.setItem('currentEditorId', levelId)

            transitionEventsEmitter.emit(EventKey.TransitionStart)
            transitionEventsEmitter.once(EventKey.TransitionEnd, () => {
                const levelData = JSON.parse(atob(base64Data))
                const gameScene = this.scene.get(SceneKey.Game) as any
                if (gameScene && gameScene.importLevel) {
                    gameScene.importLevel(levelData, true, true)
                }
                this.scene.start(SceneKey.Editor)
            }, this)
        } catch (error) {
            console.error('❌ Erreur lors du chargement:', error)
            alert('Erreur lors du chargement du niveau')
        }
    }

    goBack() {
        this.clearDisplay()

        // S'assurer qu'il y a un niveau par défaut à charger
        const currentEditorId = localStorage.getItem('currentEditorId')
        if (!currentEditorId) {
            const gameScene = this.scene.get(SceneKey.Game) as any
            if (gameScene) {
                const defaultLevel = this.getDefaultLevel()
                gameScene.scene.restart({ level: defaultLevel, isCustomLevelRun: false })
            }
        }

        transitionEventsEmitter.emit(EventKey.TransitionStart)
        transitionEventsEmitter.once(EventKey.TransitionEnd, () => this.scene.start(SceneKey.Editor), this)
    }

    getDefaultLevel(): any {
        return {
            name: 'Nouveau niveau',
            "world": {
                "width": 480000,
                "height": 480000
            },
            "player": {
                "x": 520,
                "y": 520
            },
            "target": {
                "x": 840,
                "y": 520
            },
            "platforms": [
                {
                    "x": 480,
                    "y": 560,
                    "width": 80,
                    "height": 80
                }
            ]
        }
    }

    destroy() {
        this.clearDisplay()
        this.savedLevels = []
    }
}
