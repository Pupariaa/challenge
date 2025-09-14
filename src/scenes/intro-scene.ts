import DataKey from '../consts/data-key'
import EventKey from '../consts/event-key'
import { GameMode } from '../consts/level'
import SceneKey from '../consts/scene-key'
import TextureKey, { IconsKey } from '../consts/texture-key'
import { getTranslation } from '../consts/translations'
import IconButton from '../objects/ui/icon-button'
import { transitionEventsEmitter } from '../utils/transition'
import { authService, AuthState } from '../services/auth-service'

export default class IntroScene extends Phaser.Scene {
  private discordButton!: IconButton
  private userDisplay: Phaser.GameObjects.Text | null = null
  private authUnsubscribe!: () => void

  constructor() {
    super({ key: SceneKey.Intro })
  }

  preload() {
    const mode = localStorage.getItem(DataKey.GameMode) || GameMode.Classic
    this.registry.set(DataKey.GameMode, mode)


    const language = localStorage.getItem(DataKey.Language) || 'fr'
    this.registry.set(DataKey.Language, language)
  }

  create() {

    this.createInfoPanel()

    new IconButton(this, 1840, 80, IconsKey.Settings, this.goToSettings)
    new IconButton(this, 1700, 80, IconsKey.Language, this.goToLanguage)


    this.discordButton = new IconButton(this, 1560, 80, IconsKey.Discord, this.toggleDiscordAuth)


    const text = this.add
      .text(
        960,
        920,
        this.sys.game.device.os.desktop ? getTranslation('pressSpaceToStart') : getTranslation('touchToStart'),
        { fontFamily: TextureKey.FontHeading, fontSize: '48px', color: '#262b44' }
      )
      .setOrigin(0.5, 0.5)

    this.tweens.add({
      targets: text,
      duration: 1000,
      alpha: 0,
      repeat: -1,
      yoyo: true,
    })

    this.add
      .text(968, 488, getTranslation('title'), {
        fontFamily: TextureKey.FontHeading,
        fontSize: '200px',
        color: '#ffffff',
        align: 'center',
        lineSpacing: -40,
      })
      .setOrigin(0.5, 0.5)
    const animatedText = this.add
      .text(960, 480, getTranslation('title'), {
        fontFamily: TextureKey.FontHeading,
        fontSize: '200px',
        color: '#262b44',
        align: 'center',
        lineSpacing: -40,
      })
      .setOrigin(0.5, 0.5)

    const timeline = this.add.timeline([
      {
        at: 500,
        tween: {
          targets: animatedText,
          y: animatedText.y - 20,
          ease: 'Power2',
          duration: 300,
        },
      },
      {
        at: 800,
        tween: {
          targets: animatedText,
          y: animatedText.y,
          ease: 'Bounce.easeOut',
          duration: 800,
        },
      },
    ])

    timeline.play()

    this.input.keyboard!.on('keydown-SPACE', this.startGame, this)
    this.input.on('pointerdown', this.startGame, this)

    this.scene.launch(SceneKey.Transition)
    this.scene.launch(SceneKey.Audio)


    this.authUnsubscribe = authService.addAuthListener((authState) => {
      this.updateAuthDisplay(authState)
    })
  }

  destroy() {

    if (this.authUnsubscribe) {
      this.authUnsubscribe()
    }
  }

  goToSettings(_: Phaser.Input.Pointer, __: number, ___: number, event: Phaser.Types.Input.EventData) {
    event.stopPropagation()
    transitionEventsEmitter.emit(EventKey.TransitionStart)
    transitionEventsEmitter.once(EventKey.TransitionEnd, () => this.scene.start(SceneKey.Settings), this)
  }

  goToLanguage() {
    transitionEventsEmitter.emit(EventKey.TransitionStart)
    transitionEventsEmitter.once(EventKey.TransitionEnd, () => this.scene.start(SceneKey.Language), this)
  }

  startGame() {
    transitionEventsEmitter.emit(EventKey.TransitionStart)
    transitionEventsEmitter.once(EventKey.TransitionEnd, () => this.scene.start(SceneKey.Levels), this)

  }

  toggleDiscordAuth(_: Phaser.Input.Pointer, __: number, ___: number, event: Phaser.Types.Input.EventData) {
    event.stopPropagation()

    if (authService.isAuthenticated()) {

      authService.logout()
    } else {

      authService.loginWithDiscord()
    }
  }

  updateAuthDisplay(authState: AuthState) {

    if (this.discordButton) {
      this.discordButton.setIconFrame(authState.authenticated ? IconsKey.DiscordLogged : IconsKey.Discord)
    }


    if (authState.authenticated && authState.user) {
      this.showUserDisplay(authState.user)
    } else {
      this.hideUserDisplay()
    }
  }

  showUserDisplay(user: any) {
    this.hideUserDisplay() // Supprimer l'affichage précédent s'il existe

    const userText = `${user.username}#${user.discriminator}`

    this.userDisplay = this.add
      .text(1560, 140, userText, {
        fontFamily: TextureKey.FontBody,
        fontSize: '16px',
        color: '#ffffff',
        backgroundColor: '#7289da',
        padding: { x: 8, y: 4 }
      })
      .setOrigin(0.5, 0)
      .setDepth(1000)


    this.userDisplay.setAlpha(0)
    this.tweens.add({
      targets: this.userDisplay,
      alpha: 1,
      duration: 300,
      ease: 'Power2'
    })
  }

  hideUserDisplay() {
    if (this.userDisplay) {
      this.tweens.add({
        targets: this.userDisplay,
        alpha: 0,
        duration: 200,
        ease: 'Power2',
        onComplete: () => {
          this.userDisplay?.destroy()
          this.userDisplay = null
        }
      })
    }
  }

  private createInfoPanel() {

    const panelBg = this.add.rectangle(200, 60, 350, 80, 0x000000, 0.7)
    panelBg.setStrokeStyle(1, 0x444444)


    this.add.text(30, 35, 'Forked by Puparia', {
      fontSize: '14px',
      color: '#ffffff',
      fontFamily: 'Arial'
    })

    this.add.text(30, 50, 'v1.0.22 • 14/09/2025', {
      fontSize: '11px',
      color: '#aaaaaa',
      fontFamily: 'Arial'
    })


    const githubButton = new IconButton(this, 320, 45, IconsKey.Github, () => {
      window.open('https://github.com/Pupariaa/challenge', '_blank')
    })
    githubButton.setScale(0.7) // Réduire la taille
  }
}
