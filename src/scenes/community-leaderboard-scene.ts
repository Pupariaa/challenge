import EventKey from '../consts/event-key'
import SceneKey from '../consts/scene-key'
import TextureKey, { IconsKey } from '../consts/texture-key'
import { getTranslation } from '../consts/translations'
import IconButton from '../objects/ui/icon-button'
import Panel from '../objects/ui/panel'
import { transitionEventsEmitter } from '../utils/transition'
import { stringifyTime } from '../utils/time'

interface CommunityLeaderboardEntry {
    username: string
    time: number
    date: string
    avatar?: string
    userId?: string
    coins: number
}

interface CommunityLeaderboardSceneProps {
    levelId?: string
    levelName?: string
    levelCreator?: string
}

export default class CommunityLeaderboardScene extends Phaser.Scene {
    private currentLevelId: string = ''
    private currentLevelName: string = ''
    private currentLevelCreator: string = ''
    private leaderboardData: CommunityLeaderboardEntry[] = []
    private entryTexts: Phaser.GameObjects.Text[] = []
    private entryImages: Phaser.GameObjects.Image[] = []
    private currentPage: number = 1
    private entriesPerPage: number = 5
    private totalPages: number = 1
    private paginationControls: Phaser.GameObjects.GameObject[] = []

    constructor() {
        super({ key: SceneKey.CommunityLeaderboard })
    }

    init(data: CommunityLeaderboardSceneProps) {
        if (data.levelId) {
            this.currentLevelId = data.levelId
        }
        if (data.levelName) {
            this.currentLevelName = data.levelName
        }
        if (data.levelCreator) {
            this.currentLevelCreator = data.levelCreator
        }
    }

    create() {
        new IconButton(this, 80, 80, IconsKey.Back, this.goBack)


        this.add
            .text(this.scale.width / 2, 120, `- ${getTranslation('leaderboard')} -`, {
                fontFamily: TextureKey.FontHeading,
                fontSize: '64px',
                color: '#181425'
            })
            .setOrigin(0.5, 0)


        const panelWidth = 1200
        const panelHeight = 700
        const centerX = (this.scale.width - panelWidth) / 2
        this.add.existing(new Panel(this, centerX, 220, panelWidth, panelHeight))


        this.createLevelSelection()


        this.createScoreArea()


        this.loadLeaderboardData()

        this.scene.launch(SceneKey.Transition)
    }

    createLevelSelection() {
        // an empty function
    }

    createScoreArea() {

        const levelDisplayName = this.currentLevelName || this.currentLevelId
        const creatorText = this.currentLevelCreator ? ` (+ ${this.currentLevelCreator})` : ''

        this.add
            .text(
                this.scale.width / 2,
                380,
                `${levelDisplayName}${creatorText}`,
                {
                    fontFamily: TextureKey.FontHeading,
                    fontSize: '36px',
                    color: '#181425'
                }
            )
            .setOrigin(0.5)


        const levelSubtitleName = this.currentLevelName || 'Niveau inconnu'
        this.add
            .text(
                this.scale.width / 2,
                420,
                `${levelSubtitleName} - ${getTranslation('speedrun')}`,
                {
                    fontFamily: TextureKey.FontBody,
                    fontSize: '24px',
                    color: '#666666'
                }
            )
            .setOrigin(0.5)


        const headerY = 480
        const centerX = this.scale.width / 2


        const headerBg = this.add.rectangle(centerX, headerY, 1000, 40, 0x181425)
            .setAlpha(0.9)
        this.entryImages.push(headerBg as any)


        this.add
            .text(centerX - 350, headerY, '#', {
                fontFamily: TextureKey.FontBody,
                fontSize: '30px',
                color: '#ffffff',
            })
            .setOrigin(0.5)

        this.add
            .text(centerX - 280, headerY, '', {
                fontFamily: TextureKey.FontBody,
                fontSize: '30px',
                color: '#ffffff',
            })
            .setOrigin(0.5)

        this.add
            .text(centerX - 100, headerY, getTranslation('player'), {
                fontFamily: TextureKey.FontBody,
                fontSize: '30px',
                color: '#ffffff',
            })
            .setOrigin(0.5)

        this.add
            .text(centerX + 120, headerY, getTranslation('time'), {
                fontFamily: TextureKey.FontBody,
                fontSize: '30px',
                color: '#ffffff',
            })
            .setOrigin(0.5)

        this.add
            .text(centerX + 250, headerY, 'Coins', {
                fontFamily: TextureKey.FontBody,
                fontSize: '30px',
                color: '#ffffff',
            })
            .setOrigin(0.5)

        this.add
            .text(centerX + 380, headerY, getTranslation('date'), {
                fontFamily: TextureKey.FontBody,
                fontSize: '30px',
                color: '#ffffff',
            })
            .setOrigin(0.5)
    }

    nextLevel() {


    }

    updateScoreArea() {

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
        this.currentPage = 1


        this.createScoreArea()
    }

    async loadLeaderboardData() {
        if (!this.currentLevelId) {
            console.error('Aucun levelId fourni pour le leaderboard communautaire')
            this.displayEmptyLeaderboard()
            return
        }

        try {
            const response = await fetch(`/api/community-leaderboard/${this.currentLevelId}/speedrun`)
            if (response.ok) {
                const data = await response.json()
                this.leaderboardData = data.leaderboard || []
                this.displayLeaderboard()
            } else {
                console.error('Erreur chargement leaderboard communautaire:', response.statusText)
                this.displayEmptyLeaderboard()
            }
        } catch (error) {
            console.error('Erreur chargement leaderboard communautaire:', error)
            this.displayEmptyLeaderboard()
        }
    }

    displayLeaderboard() {
        if (!this.leaderboardData) return

        const entries = this.leaderboardData
        const startY = 520
        const centerX = this.scale.width / 2
        const lineHeight = 60


        this.totalPages = Math.max(1, Math.ceil(entries.length / this.entriesPerPage))


        const startIndex = (this.currentPage - 1) * this.entriesPerPage
        const endIndex = startIndex + this.entriesPerPage
        const pageEntries = entries.slice(startIndex, endIndex)

        pageEntries.forEach((entry, index) => {
            const globalIndex = startIndex + index
            const y = startY + index * lineHeight


            const bgColor = index % 2 === 0 ? 0xf8f9fa : 0xffffff
            const lineBg = this.add.rectangle(centerX, y, 1000, lineHeight - 5, bgColor)
                .setAlpha(0.8)
            this.entryImages.push(lineBg as any)


            this.entryTexts.push(
                this.add
                    .text(centerX - 350, y, `${globalIndex + 1}.`, {
                        fontFamily: TextureKey.FontBody,
                        fontSize: '28px',
                        color: globalIndex < 3 ? '#ffd700' : '#181425', // Or pour le top 3
                    })
                    .setOrigin(0.5)
            )


            if (entry.avatar && entry.userId) {
                this.loadDiscordAvatar(entry.userId, entry.avatar, centerX - 280, y, entry.username, globalIndex)
            } else {
                this.showDefaultAvatar(centerX - 280, y, entry.username)
            }


            this.entryTexts.push(
                this.add
                    .text(centerX - 100, y, entry.username, {
                        fontFamily: TextureKey.FontBody,
                        fontSize: '26px',
                        color: '#181425',
                    })
                    .setOrigin(0.5)
            )


            this.entryTexts.push(
                this.add
                    .text(centerX + 120, y, stringifyTime(entry.time), {
                        fontFamily: TextureKey.FontBody,
                        fontSize: '26px',
                        color: globalIndex < 3 ? '#ff6b6b' : '#181425', // Rouge pour le top 3
                    })
                    .setOrigin(0.5)
            )


            this.entryTexts.push(
                this.add
                    .text(centerX + 250, y, `${entry.coins}`, {
                        fontFamily: TextureKey.FontBody,
                        fontSize: '24px',
                        color: '#ffd700', // Or pour les coins
                    })
                    .setOrigin(0.5)
            )


            const date = new Date(entry.date).toLocaleString('fr-FR', {
                day: '2-digit',
                month: '2-digit',
                year: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            })
            this.entryTexts.push(
                this.add
                    .text(centerX + 380, y, date, {
                        fontFamily: TextureKey.FontBody,
                        fontSize: '22px',
                        color: '#666666'
                    })
                    .setOrigin(0.5)
            )
        })


        if (entries.length === 0) {
            this.entryTexts.push(
                this.add
                    .text(
                        this.scale.width / 2,
                        startY + 100,
                        getTranslation('noScoresYet'),
                        {
                            fontFamily: TextureKey.FontBody,
                            fontSize: '32px',
                            color: '#666666'
                        }
                    )
                    .setOrigin(0.5)
            )
        }


        if (this.totalPages > 1) {
            if (this.paginationControls.length === 0) {
                this.addPaginationControls()
            } else {
                const pageText = this.paginationControls.find(control =>
                    control instanceof Phaser.GameObjects.Text &&
                    control.text.includes('/')
                ) as Phaser.GameObjects.Text

                if (pageText) {
                    pageText.text = `${this.currentPage} / ${this.totalPages}`
                }
            }
        }
    }

    displayEmptyLeaderboard() {
        this.entryTexts.push(
            this.add
                .text(
                    this.scale.width / 2,
                    550,
                    getTranslation('errorLoadingLeaderboard'),
                    {
                        fontFamily: TextureKey.FontBody,
                        fontSize: '28px',
                        color: '#ff4444'
                    }
                )
                .setOrigin(0.5)
        )
    }

    addPaginationControls() {
        const prevButton = new IconButton(this, this.scale.width / 2 - 80, 780, IconsKey.Chevron, () => {
            this.previousPage()
        })

        const nextButton = new IconButton(this, this.scale.width / 2 + 80, 780, IconsKey.Chevron, () => {
            this.nextPage()
        })

        prevButton.setScale(0.7)
        nextButton.setScale(0.7)

        prevButton.setIconFrame(IconsKey.Chevron)
        prevButton.setScale(-0.7, 0.7) // Retourner horizontalement

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
                780,
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
        this.entryTexts = []
        this.entryImages = []

        this.updatePaginationText()
        this.createScoreArea()
        this.displayLeaderboard()
    }

    updatePaginationText() {
        const pageText = this.paginationControls.find(control =>
            control instanceof Phaser.GameObjects.Text &&
            control.text.includes('/')
        ) as Phaser.GameObjects.Text

        if (pageText) {
            pageText.setText(`${this.currentPage} / ${this.totalPages}`)
        }

        this.updatePaginationButtons()
    }

    updatePaginationButtons() {
        if (this.paginationControls.length === 0) {
            return
        }

        const centerX = this.scale.width / 2
        const prevButton = this.paginationControls.find(control =>
            control instanceof IconButton && control.x < centerX
        ) as IconButton

        const nextButton = this.paginationControls.find(control =>
            control instanceof IconButton && control.x > centerX
        ) as IconButton

        if (prevButton) {
            if (this.currentPage === 1) {
                prevButton.setAlpha(0.4)
                prevButton.setInteractive(false)
            } else {
                prevButton.setAlpha(1.0)
                prevButton.setInteractive(true)
            }
        }

        if (nextButton) {
            if (this.currentPage === this.totalPages) {
                nextButton.setAlpha(0.4)
                nextButton.setInteractive(false)
            } else {
                nextButton.setAlpha(1.0)
                nextButton.setInteractive(true)
            }
        }
    }

    goBack() {
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

        transitionEventsEmitter.emit(EventKey.TransitionStart)
        transitionEventsEmitter.once(EventKey.TransitionEnd, () => this.scene.start(SceneKey.CommunityLevels), this)
    }

    async loadDiscordAvatar(userId: string, avatar: string, x: number, y: number, username: string, index: number) {
        const avatarUrl = `https://cdn.discordapp.com/avatars/${userId}/${avatar}.png?size=64`
        const avatarKey = `avatar_${username}_${index}`

        try {
            const response = await fetch(avatarUrl, { mode: 'cors' })
            if (!response.ok) throw new Error(`HTTP ${response.status}`)

            const blob = await response.blob()
            const objectUrl = URL.createObjectURL(blob)

            this.load.image(avatarKey, objectUrl)

            this.load.once('complete', () => {
                const avatarImg = this.add.image(x, y, avatarKey)
                    .setDisplaySize(40, 40)
                    .setOrigin(0.5)

                const avatarFrame = this.add.rectangle(x, y, 44, 44, 0xffffff, 1)
                    .setStrokeStyle(3, 0x181425)

                this.entryImages.push(avatarImg, avatarFrame as any)
            })

            this.load.once('loaderror', () => {
                URL.revokeObjectURL(objectUrl)
                this.showDefaultAvatar(x, y, username)
            })

            this.load.start()

        } catch (error) {
            this.showDefaultAvatar(x, y, username)
        }
    }

    showDefaultAvatar(x: number, y: number, username: string) {
        const defaultAvatar = this.add.rectangle(x, y, 40, 40, 0x7289da)
            .setStrokeStyle(3, 0x181425)

        const initial = username.charAt(0).toUpperCase()
        const avatarText = this.add.text(x, y, initial, {
            fontFamily: TextureKey.FontBody,
            fontSize: '20px',
            color: '#ffffff',
        }).setOrigin(0.5)

        this.entryImages.push(defaultAvatar as any, avatarText as any)
    }

    destroy() {
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
        this.leaderboardData = []
    }
}
