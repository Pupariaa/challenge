import DataKey from '../consts/data-key'
import EventKey from '../consts/event-key'
import { CINEMATIC_FRAME_HEIGHT } from '../consts/globals'
import { GameMode } from '../consts/level'
import SceneKey from '../consts/scene-key'
import TextureKey, { IconsKey } from '../consts/texture-key'
import { getTranslation } from '../consts/translations'
import IconButton from '../objects/ui/icon-button'
import Panel from '../objects/ui/panel'
import { getLevelInfo, getLevelTotalCoins, updateLevelInfo } from '../utils/level'
import { authService } from '../services/auth-service'
import { playService } from '../services/play-service'
import { speedrunRecorder } from '../services/speedrun-recorder'
import { stringifyTime } from '../utils/time'
import { transitionEventsEmitter } from '../utils/transition'
import { levelsData } from '../levels'
import GameScene from './game-scene'

export default class HUDScene extends Phaser.Scene {
  private cinematicFrameTop!: Phaser.GameObjects.Rectangle
  private cinematicFrameBottom!: Phaser.GameObjects.Rectangle
  private showCinematicFrames: boolean
  private coinsText!: Phaser.GameObjects.Text
  private timerText!: Phaser.GameObjects.Text
  private panelPause!: Phaser.GameObjects.Container
  private coinsCollected!: number
  private timerStarted = false
  private startTime = 0
  private pauseTime = 0
  private userInfoText!: Phaser.GameObjects.Text
  private userInfoContainer!: Phaser.GameObjects.Container
  private isEditorMode: boolean = false
  private speedrunUUID: string = ''
  private objectCounts: any = null
  private isCustomLevel: boolean = false
  private currentWorld: number = 1
  private currentLevel: number = 1

  constructor() {
    super({ key: SceneKey.HUD })
    this.showCinematicFrames = false
  }

  create() {
    console.log('HUDScene.create() appelé')

    const { width, height } = this.scale

    this.cinematicFrameTop = this.add.rectangle(0, -CINEMATIC_FRAME_HEIGHT, width, CINEMATIC_FRAME_HEIGHT, 0x181425)
    this.cinematicFrameTop.setOrigin(0, 0)
    this.cinematicFrameBottom = this.add.rectangle(0, height, width, CINEMATIC_FRAME_HEIGHT, 0x181425)
    this.cinematicFrameBottom.setOrigin(0, 0)



    const gameScene = this.scene.get(SceneKey.Game) as GameScene
    const isCustomLevel = this.registry.get(DataKey.IsCustomLevel)
    const btnPause = new IconButton(this, 1840, 80, IconsKey.Pause, this.togglePause)
    if (!isCustomLevel) {
      this.input.keyboard?.on('keydown-P', this.togglePause, this)
      this.input.keyboard?.on('keydown-ESC', this.togglePause, this)
    } else {
      btnPause.disableInteractive().setVisible(false)
    }


    this.coinsCollected = (this.registry.get(DataKey.CoinsCollected) || []).reduce(
      (acc: number, val: number) => acc + val,
      0
    )
    this.coinsText = this.add.text(92, 34, `x${this.coinsCollected.toString().padStart(2, '0')}`, {
      fontFamily: TextureKey.FontHeading,
      fontSize: '48px',
      color: '#ffffff',
    })
    gameScene.events.on(EventKey.CollectCoin, this.updateCoins, this)

    const isSpeedrunMode = this.registry.get(DataKey.GameMode) === GameMode.Speedrun
    const isEditorPlayingTestMode = this.registry.get(DataKey.GameMode) === GameMode.EditorPlayingTest
    const shouldShowTimer = isSpeedrunMode || isEditorPlayingTestMode
    this.timerStarted = false
    this.startTime = 0
    const timerBg = this.add.rectangle(0, 100, 320, 80, 0x262b44, 0.5).setOrigin(0)
    this.timerText = this.add.text(40, 110, '00\'00"000', {
      fontFamily: TextureKey.FontHeading,
      fontSize: '48px',
      color: '#ffffff',
    })
    const timerContainer = this.add.container(0, 0, [timerBg, this.timerText])
    timerContainer.setAlpha(shouldShowTimer ? 1 : 0)


    if (isSpeedrunMode || isEditorPlayingTestMode) {

      speedrunRecorder.startRecording()

      this.speedrunUUID = this.generateUUID()
      const startDate = new Date().toLocaleString('fr-FR')


      this.isEditorMode = isEditorPlayingTestMode
      this.isCustomLevel = this.registry.get(DataKey.IsCustomLevel) || false
      this.currentWorld = this.registry.get(DataKey.CurrentWorld) || 1
      this.currentLevel = 1 // Valeur par défaut
      const boxHeight = isEditorPlayingTestMode ? 280 : 100 // Plus haute en mode éditeur
      const boxTop = isEditorPlayingTestMode ? 180 : 271// Plus haute en mode éditeur

      const userInfoBg = this.add.rectangle(0, boxTop, 320, boxHeight, 0x262b44, 0.5).setOrigin(0)

      let worldLevelText: string
      let playerText: string

      if (isEditorPlayingTestMode) {

        worldLevelText = 'Editor mode'
        playerText = authService.isAuthenticated()
          ? 'Utilisateur authentifié'
          : 'Non authentifié'
      } else {

        const currentLevel = this.registry.get('currentLevel') || 1
        const communityLevelId = this.registry.get('communityLevelId')
        const communityLevelData = this.registry.get('communityLevelData')

        if (currentLevel === 999 && communityLevelId && communityLevelData) {

          const levelName = communityLevelData.name || 'Niveau sans nom'
          const creator = communityLevelData.creators?.[0] || 'Créateur inconnu'
          worldLevelText = `${levelName}\nby ${creator}`
        } else {

          const levelData = levelsData[`level${currentLevel}` as keyof typeof levelsData]
          const levelName = levelData?.name || `Level ${currentLevel}`
          const creator = levelData?.creators?.[0]

          if (creator) {
            worldLevelText = `${levelName}\nby ${creator}`
          } else {
            worldLevelText = levelName
          }
        }

        playerText = authService.isAuthenticated()
          ? 'Utilisateur authentifié'
          : 'Non authentifié'
      }

      let infoText: string

      if (isEditorPlayingTestMode) {


        const gameScene = this.scene.get(SceneKey.Game) as any
        this.objectCounts = gameScene?.getObjectCounts?.() || {
          platforms: 0, fallingBlocks: 0, oneWayPlatforms: 0, spikes: 0,
          spikyBalls: 0, cannons: 0, enemies: 0, bumps: 0, coins: 0
        }

        infoText = `${worldLevelText}\nDate: ${startDate}\nPlayer: ${playerText}\nEditor Version: 1.2.0\nFPS: --\nMS: --\n\nObjects:\nPlatforms: ${this.objectCounts.platforms}\nFallingBlocks: ${this.objectCounts.fallingBlocks}\nOneWayPlatforms: ${this.objectCounts.oneWayPlatforms}\nSpikes: ${this.objectCounts.spikes}\nSpikyBalls: ${this.objectCounts.spikyBalls}\nCannons: ${this.objectCounts.cannons}\nEnemies: ${this.objectCounts.enemies}\nBumps: ${this.objectCounts.bumps}\nCoins: ${this.objectCounts.coins}`
      } else {

        infoText = `${worldLevelText}\nPlayer: ${playerText}\nID: ${authService.isAuthenticated() ? 'Authentifié' : 'Non authentifié'}\nStarted: ${startDate}\nRun: ${this.speedrunUUID}`
      }

      this.userInfoText = this.add.text(20, 320, infoText, {
        fontFamily: 'Arial',
        fontSize: '10px',
        color: '#ffffff',
        lineSpacing: 3
      }).setOrigin(0, 0.5)

      this.userInfoContainer = this.add.container(0, 0, [userInfoBg, this.userInfoText])

      this.userInfoContainer.setAlpha(1)
    }

    gameScene.events.on(EventKey.StartTimer, this.startTimer, this)
    gameScene.events.on(EventKey.StopTimer, this.stopTimer, this)
    gameScene.events.on(EventKey.LevelEnd, this.handleLevelEnd, this)
    gameScene.events.on(EventKey.ToggleCinematicFrames, this.toggleCinematicFrames, this)


    const [panelWidth, panelHeight] = [640, 360]
    const [centerX, centerY] = [(width - panelWidth) / 2, (height - panelHeight) / 2]

    this.panelPause = this.add.container(0, 0)
    this.panelPause.setVisible(false)

    const panelOverlay = this.add.rectangle(0, 0, width, height, 0x262b44, 0.4)
    panelOverlay.setOrigin(0).setInteractive()

    const panelPauseBg = new Panel(this, centerX, centerY, panelWidth, panelHeight)
    const panelTxt = this.add
      .text(width / 2, centerY + 40, `- ${getTranslation('pause')} -`, {
        fontFamily: TextureKey.FontHeading,
        fontSize: '64px',
        color: '#181425',
      })
      .setOrigin(0.5, 0)

    const btnPlay = new IconButton(this, width / 2, height / 2 + 40, IconsKey.Play, this.togglePause)
    const btnRestart = new IconButton(
      this,
      width / 2 + 120,
      height / 2 + 40,
      IconsKey.Restart,
      this.restartCurrentLevel
    )
    const btnLevels = new IconButton(this, width / 2 - 120, height / 2 + 40, IconsKey.Levels, this.goToLevels)

    this.panelPause.add([panelOverlay, panelPauseBg, panelTxt, btnPlay, btnRestart, btnLevels])

    // Textes "Forked by Puparia" et version dans la HUD
    this.add.text(1790, 1030, 'Forked by Puparia', {
      fontSize: '14px',
      color: '#ffffff',
      fontFamily: 'Arial'
    }).setScrollFactor(0).setDepth(1000)

    this.add.text(1790, 1050, 'v1.2.0 • 16/09/2025', {
      fontSize: '11px',
      color: '#aaaaaa',
      fontFamily: 'Arial'
    }).setScrollFactor(0).setDepth(1000)

    this.events.once('shutdown', this.handleShutdown, this)
  }

  update(_time: number, delta: number) {

    const isPaused = this.registry.get(DataKey.IsPaused)
    if (this.startTime === 0 || !this.timerStarted || isPaused) {

      if (this.isEditorMode && this.userInfoText) {
        this.updateEditorInfo(delta)
      }
      return
    }

    const timeStr = stringifyTime(this.time.now - this.startTime)
    this.timerText.setText(timeStr)


    if (this.isEditorMode && this.userInfoText) {
      this.updateEditorInfo(delta)
    }
  }

  private updateEditorInfo(delta: number) {
    const fps = Math.round(1000 / delta)
    const ms = Math.round(delta)


    const gameScene = this.scene.get(SceneKey.Game) as any
    const counts = gameScene?.getObjectCounts?.() || this.objectCounts


    const worldLevelText = this.isCustomLevel ? 'Custom Level' : `World ${this.currentWorld} - Level ${this.currentLevel}`
    const playerText = authService.isAuthenticated() ? 'Utilisateur authentifié' : 'Non authentifié'
    const startDate = new Date().toLocaleString('fr-FR')

    const infoText = `${worldLevelText}\nDate: ${startDate}\nPlayer: ${playerText}\nEditor Version: 1.2.0\nFPS: ${fps}\nMS: ${ms}\n\nObjects:\nPlatforms: ${counts.platforms}\nFallingBlocks: ${counts.fallingBlocks}\nOneWayPlatforms: ${counts.oneWayPlatforms}\nSpikes: ${counts.spikes}\nSpikyBalls: ${counts.spikyBalls}\nCannons: ${counts.cannons}\nEnemies: ${counts.enemies}\nBumps: ${counts.bumps}\nCoins: ${counts.coins}`

    if (this.userInfoText) {
      this.userInfoText.setText(infoText)
    }
  }

  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      const r = Math.random() * 16 | 0
      const v = c === 'x' ? r : (r & 0x3 | 0x8)
      return v.toString(16)
    })
  }

  toggleCinematicFrames() {
    this.showCinematicFrames = !this.showCinematicFrames

    this.tweens.add({
      targets: this.cinematicFrameTop,
      y: this.showCinematicFrames ? 0 : -CINEMATIC_FRAME_HEIGHT,
      duration: 500,
      ease: 'Cubic.Out',
    })

    this.tweens.add({
      targets: this.cinematicFrameBottom,
      y: this.showCinematicFrames ? this.scale.height - CINEMATIC_FRAME_HEIGHT : this.scale.height,
      duration: 500,
      ease: 'Cubic.Out',
    })
  }

  handleShutdown() {
    const gameScene = this.scene.get(SceneKey.Game) as GameScene
    gameScene.events.off(EventKey.StartTimer, this.startTimer, this)
    gameScene.events.off(EventKey.StopTimer, this.stopTimer, this)
    gameScene.events.off(EventKey.LevelEnd, this.handleLevelEnd, this)
    gameScene.events.off(EventKey.CollectCoin, this.updateCoins, this)
    gameScene.events.off(EventKey.ToggleCinematicFrames, this.toggleCinematicFrames, this)
  }

  goToLevels() {
    transitionEventsEmitter.emit(EventKey.TransitionStart)
    transitionEventsEmitter.once(
      EventKey.TransitionEnd,
      () => {
        this.registry.set(DataKey.IsPaused, false)
        const gameScene = this.scene.get(SceneKey.Game)
        gameScene.scene.start(SceneKey.Levels)
      },
      this
    )
  }

  restartCurrentLevel() {
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

  togglePause() {
    if (this.showCinematicFrames) return
    const isPaused = this.registry.get(DataKey.IsPaused)
    if (isPaused) {
      this.scene.resume(SceneKey.Game)
      this.pauseTime = this.time.now - this.pauseTime
      this.startTime += this.pauseTime
    } else {
      this.scene.pause(SceneKey.Game)
        ; (this.scene.get(SceneKey.Game) as GameScene).resetPointers()
      this.pauseTime = this.time.now
    }

    this.panelPause.setVisible(!isPaused)
    this.registry.set(DataKey.IsPaused, !isPaused)
  }

  async handleLevelEnd({
    currentLevel,
    startedFromCheckpoint,
  }: {
    currentLevel: number | null
    startedFromCheckpoint: boolean
  }) {
    console.log('handleLevelEnd appelée avec:', { currentLevel, startedFromCheckpoint })
    this.stopTimer.call(this)
    if (!currentLevel) {
      console.log('Pas de currentLevel, sortie')
      return
    }

    const levelInfo = getLevelInfo(currentLevel)
    console.log('levelInfo:', levelInfo)


    if (!levelInfo && currentLevel !== 999) {
      console.log('Pas de levelInfo et pas un niveau communautaire, sortie')
      return
    }

    const previousBestTime = levelInfo?.time || Infinity
    const newTime = this.time.now - this.startTime


    let levelTotalCoins: number
    if (currentLevel === 999) {
      const communityLevelData = this.registry.get('communityLevelData')
      levelTotalCoins = communityLevelData?.coins?.length || 0
      console.log('Niveau communautaire - total coins:', levelTotalCoins)
    } else {
      levelTotalCoins = getLevelTotalCoins(currentLevel)
    }

    const previousMaxCoins = levelInfo?.coins || 0

    let speedrunData = undefined
    if (this.registry.get(DataKey.GameMode) === GameMode.Speedrun) {

      try {
        speedrunData = speedrunRecorder.stopRecording()

        speedrunData = { ...speedrunData, uuid: this.speedrunUUID }
        console.log('🎬 Enregistrement speedrun arrêté, données récupérées')
      } catch (error) {
        console.error('Erreur lors de l\'arrêt de l\'enregistrement speedrun:', error)
        speedrunData = { uuid: this.speedrunUUID }
      }
    }


    try {
      await this.savePlayData(currentLevel, newTime, levelTotalCoins, startedFromCheckpoint, speedrunData)
    } catch (error) {
      console.error('Erreur lors de la sauvegarde de la play:', error)
    }


    if (currentLevel !== 999) {
      updateLevelInfo(currentLevel, {
        ...(this.registry.get(DataKey.GameMode) === GameMode.Speedrun && newTime < previousBestTime && { time: newTime }),
        ...(this.coinsCollected > previousMaxCoins && { coins: this.coinsCollected }),
        ...(this.coinsCollected === levelTotalCoins && !startedFromCheckpoint && { shinyCoin: true }),
        speedrunData
      })
    } else {
      console.log('Niveau communautaire terminé - pas de mise à jour updateLevelInfo')
    }

    this.startTime = 0
  }

  stopTimer() {
    const isSpeedrunMode = this.registry.get(DataKey.GameMode) === GameMode.Speedrun
    if (!this.timerStarted || !isSpeedrunMode) return
    this.timerStarted = false
  }

  startTimer() {
    this.timerStarted = true
    this.startTime = this.time.now
  }

  updateCoins() {
    this.coinsCollected += 1
    this.coinsText.setText(`x${this.coinsCollected.toString().padStart(2, '0')}`)
  }

  private async savePlayData(
    currentLevel: number,
    duration: number,
    totalCoins: number,
    startedFromCheckpoint: boolean,
    speedrunData?: any
  ) {
    const gameMode = this.registry.get(DataKey.GameMode) === GameMode.Speedrun ? 'speedrun' : 'normal'
    const endTime = this.time.now
    const startTime = endTime - duration


    const isCommunityLevel = currentLevel === 999
    let levelData: any
    let levelId: string | number

    if (isCommunityLevel) {

      levelData = this.registry.get('communityLevelData')
      levelId = this.registry.get('communityLevelId') || 'unknown'
    } else {

      const { levelsData } = await import('../levels')
      const levelKey = `level${currentLevel}` as keyof typeof levelsData
      levelData = levelsData[levelKey]
      levelId = currentLevel
    }

    const playData = playService.createPlayDataFromLevel(
      levelData,
      levelId,
      startTime,
      endTime,
      this.coinsCollected,
      totalCoins,
      startedFromCheckpoint,
      gameMode,
      speedrunData
    )

    await playService.savePlayAndUpdateProfile(playData)
  }

}
