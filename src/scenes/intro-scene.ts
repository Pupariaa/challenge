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

    this.createDisclaimerText()

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

  private createDisclaimerText() {
    const disclaimerBg = this.add.rectangle(960, 260, 800, 130, 0x000000, 0.7)
    disclaimerBg.setStrokeStyle(3, 0x4ecdc4)
    disclaimerBg.setDepth(2000)

    const disclaimerTitle = this.add.text(960, 220, 'PROJET D\'APPRENTISSAGE - NON OFFICIEL', {
      fontSize: '20px',
      color: '#fc3f3f',
      fontFamily: TextureKey.FontHeading,
      align: 'center'
    }).setOrigin(0.5, 0.5).setDepth(2001)

    const disclaimerText = this.add.text(960, 260, 'Ceci est un fork éducatif par un fan pour apprendre Phaser.\nLe jeu original reste la référence absolue et officielle.\nUtilisez cette version uniquement pour découvrir l\'éditeur.', {
      fontSize: '14px',
      color: '#ffffff',
      fontFamily: TextureKey.FontBody,
      align: 'center',
      lineSpacing: 6
    }).setOrigin(0.5, 0.5).setDepth(2001)

    const originalLink = this.add.text(960, 300, 'Jouez au jeu original pour la vraie expérience !', {
      fontSize: '16px',
      color: '#4ecdc4',
      fontFamily: TextureKey.FontHeading,
      align: 'center'
    }).setOrigin(0.5, 0.5).setDepth(2001)

    originalLink.setInteractive({ useHandCursor: true })
    originalLink.on('pointerdown', () => {
      window.open('https://challenge.anawan.io', '_blank')
    })

    originalLink.on('pointerover', () => {
      originalLink.setColor('#6dd5ed')
    })

    originalLink.on('pointerout', () => {
      originalLink.setColor('#4ecdc4')
    })

    const pulseTimeline = this.add.timeline([
      {
        at: 0,
        tween: {
          targets: [disclaimerTitle, disclaimerBg],
          scaleX: 1.05,
          scaleY: 1.05,
          duration: 2000,
          ease: 'Sine.easeInOut',
          repeat: -1,
          yoyo: true
        }
      }
    ])

    pulseTimeline.play()

    disclaimerBg.setAlpha(0)
    disclaimerTitle.setAlpha(0)
    disclaimerText.setAlpha(0)
    originalLink.setAlpha(0)

    this.time.delayedCall(1000, () => {
      this.tweens.add({
        targets: [disclaimerBg, disclaimerTitle, disclaimerText, originalLink],
        alpha: { from: 0, to: 1 },
        duration: 1000,
        ease: 'Power2',
        onUpdate: (tween) => {
          const progress = tween.progress
          disclaimerBg.setAlpha(progress * 0.7)
          disclaimerTitle.setAlpha(progress)
          disclaimerText.setAlpha(progress)
          originalLink.setAlpha(progress)
        }
      })
    })
  }

  private createInfoPanel() {

    this.add.rectangle(200, 60, 350, 80, 0x000000, 0.2)

    this.add.text(55, 40, 'Forked by Puparia', {
      fontSize: '14px',
      color: '#ffffff',
      fontFamily: 'Arial'
    })

    this.add.text(55, 65, 'v1.2.0 • 16/09/2025', {
      fontSize: '11px',
      color: '#aaaaaa',
      fontFamily: 'Arial'
    })


    const githubButton = new IconButton(this, 335, 59, IconsKey.Github, () => {
      window.open('https://github.com/Pupariaa/challenge', '_blank')
    })
    githubButton.setScale(0.7)
  }
}
