import DataKey from '../consts/data-key'
import EventKey from '../consts/event-key'
import { GameMode } from '../consts/level'
import SceneKey from '../consts/scene-key'
import TextureKey, { IconsKey } from '../consts/texture-key'
import { getTranslation } from '../consts/translations'
import IconButton from '../objects/ui/icon-button'
import Panel from '../objects/ui/panel'
import TextButton from '../objects/ui/text-button'
import { resetBestTimes, unlockAllLevels } from '../utils/level'
import { transitionEventsEmitter } from '../utils/transition'
import { authService } from '../services/auth-service'
import AudioScene from './audio-scene'

export default class SettingsScene extends Phaser.Scene {
  private btnMode!: TextButton
  private btnSound!: TextButton
  private removeAuthListener!: () => void

  constructor() {
    super({ key: SceneKey.Settings })
  }

  create() {
    new IconButton(this, 80, 80, IconsKey.Back, this.goBack)


    this.syncRegistryWithProfile()


    const { width } = this.scale
    let panelWidth = 1200
    let centerX = (width - panelWidth) / 2
    this.add.existing(new Panel(this, centerX, 40, panelWidth, 520))
    this.add
      .text(width / 2, 80, `- ${getTranslation('settings')} -`, { fontFamily: TextureKey.FontHeading, fontSize: '64px', color: '#181425' })
      .setOrigin(0.5, 0)


    this.btnMode = new TextButton(this, width / 2 - 260, 260, this.getModeText(), this.handleChangeMode)
    this.btnSound = new TextButton(this, width / 2 + 260, 260, this.getMuteStateText(), this.handleToggleSound)


    if (!authService.isAuthenticated()) {
      new TextButton(this, width / 2 - 260, 420, getTranslation('unlockAllLevels'), unlockAllLevels)
      new TextButton(this, width / 2 + 260, 420, getTranslation('resetBestTimes'), resetBestTimes)
    } else {

      const unlockBtn = new TextButton(this, width / 2 - 260, 420, getTranslation('unlockAllLevels'), () => { })
      const resetBtn = new TextButton(this, width / 2 + 260, 420, getTranslation('resetBestTimes'), () => { })


      unlockBtn.setAlpha(0.4)
      resetBtn.setAlpha(0.4)


      unlockBtn.setInteractive(false)
      resetBtn.setInteractive(false)
    }


    panelWidth = 800
    centerX = (width - panelWidth) / 2
    this.add.existing(new Panel(this, centerX, 600, panelWidth, 440))


    const stats = authService.getStatistics()
    const totalKilled = stats.enemiesKilled
    const totalDeath = stats.playerDeaths
    const totalCoins = stats.coinsCollected

    this.add
      .text(width / 2, 680, `- ${getTranslation('statistics')} -`, {
        fontFamily: TextureKey.FontHeading,
        fontSize: '64px',
        color: '#181425',
      })
      .setOrigin(0.5)
    this.add.text((width - panelWidth) / 2 + 80, 800, `${getTranslation('enemiesKilled')}\n${getTranslation('deaths')}\n${getTranslation('coinsCollected')}`, {
      fontFamily: TextureKey.FontBody,
      fontSize: '40px',
      color: '#181425',
      lineSpacing: 10,
    })
    this.add
      .text((width + panelWidth) / 2 - 80, 800, `${totalKilled}\n${totalDeath}\n${totalCoins}`, {
        fontFamily: TextureKey.FontBody,
        fontSize: '40px',
        color: '#181425',
        align: 'right',
        lineSpacing: 10,
      })
      .setOrigin(1, 0)


    this.removeAuthListener = authService.addAuthListener(() => {
      this.refreshButtons()
    })

    this.scene.launch(SceneKey.Transition)
  }

  refreshButtons() {

    if (this.btnMode) {
      this.btnMode.text = this.getModeText()
    }
    if (this.btnSound) {
      this.btnSound.text = this.getMuteStateText()
    }
  }

  syncRegistryWithProfile() {
    if (authService.isAuthenticated()) {
      const settings = authService.getSettings()


      if (settings.gameMode) {
        this.registry.set(DataKey.GameMode, settings.gameMode)
      }


      this.registry.set(DataKey.Mute, !settings.soundEnabled)
    }
  }

  getModeText() {

    let mode
    if (authService.isAuthenticated()) {

      const settings = authService.getSettings()
      mode = settings.gameMode || 'classic'
    } else {
      mode = this.registry.get(DataKey.GameMode)
    }
    return `${getTranslation('gameMode')} : ${mode === GameMode.Classic ? getTranslation('classic') : getTranslation('speedrun')}`
  }

  getMuteStateText() {
    let isMute
    if (authService.isAuthenticated()) {

      const settings = authService.getSettings()
      isMute = !settings.soundEnabled
    } else {
      isMute = this.registry.get(DataKey.Mute)
    }
    return `${getTranslation('sound')} : ${isMute ? getTranslation('muted') : getTranslation('unmuted')}`
  }


  handleChangeMode() {
    let mode = this.registry.get(DataKey.GameMode)
    mode = mode === GameMode.Classic ? GameMode.Speedrun : GameMode.Classic


    this.registry.set(DataKey.GameMode, mode)

    if (authService.isAuthenticated()) {

      authService.saveSettings({ gameMode: mode })
    } else {

      localStorage.setItem(DataKey.GameMode, mode)
    }

    this.btnMode.text = this.getModeText()
  }

  goBack() {
    transitionEventsEmitter.emit(EventKey.TransitionStart)
    transitionEventsEmitter.once(EventKey.TransitionEnd, () => this.scene.start(SceneKey.Intro), this)
  }

  handleToggleSound() {
    const audioScene = this.scene.get(SceneKey.Audio) as AudioScene
    const wasMuted = this.registry.get(DataKey.Mute)
    audioScene.toggleMute()

    if (authService.isAuthenticated()) {

      authService.saveSettings({ soundEnabled: wasMuted })
    }

    this.btnSound.text = this.getMuteStateText()
  }

  destroy() {

    if (this.removeAuthListener) {
      this.removeAuthListener()
    }
  }

}
