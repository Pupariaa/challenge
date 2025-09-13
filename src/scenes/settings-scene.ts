import AnalyticsKey from '../consts/analytics-key'
import DataKey from '../consts/data-key'
import EventKey from '../consts/event-key'
import { GameMode } from '../consts/level'
import SceneKey from '../consts/scene-key'
import TextureKey, { IconsKey } from '../consts/texture-key'
import { Language, getTranslation, getCurrentLanguage, setLanguage } from '../consts/translations'
import IconButton from '../objects/ui/icon-button'
import Panel from '../objects/ui/panel'
import TextButton from '../objects/ui/text-button'
import { resetBestTimes, unlockAllLevels } from '../utils/level'
import { transitionEventsEmitter } from '../utils/transition'
import AudioScene from './audio-scene'

export default class SettingsScene extends Phaser.Scene {
  private btnMode!: TextButton
  private btnSound!: TextButton

  constructor() {
    super({ key: SceneKey.Settings })
  }

  create() {
    new IconButton(this, 80, 80, IconsKey.Back, this.goBack)

    // Paramètres de jeu sur 2 colonnes
    const { width } = this.scale
    let panelWidth = 1200
    let centerX = (width - panelWidth) / 2
    this.add.existing(new Panel(this, centerX, 40, panelWidth, 520))
    this.add
      .text(width / 2, 80, `- ${getTranslation('settings')} -`, { fontFamily: TextureKey.FontHeading, fontSize: '64px', color: '#181425' })
      .setOrigin(0.5, 0)

    this.btnMode = new TextButton(this, width / 2 - 260, 260, this.getModeText(), this.handleChangeMode)
    this.btnSound = new TextButton(this, width / 2 + 260, 260, this.getMuteStateText(), this.handleToggleSound)
    new TextButton(this, width / 2 - 260, 420, getTranslation('unlockAllLevels'), unlockAllLevels)
    new TextButton(this, width / 2 + 260, 420, getTranslation('resetBestTimes'), resetBestTimes)

    // Statistiques du joueur
    panelWidth = 800
    centerX = (width - panelWidth) / 2
    this.add.existing(new Panel(this, centerX, 600, panelWidth, 440))
    const totalKilled = Number(localStorage.getItem(AnalyticsKey.EnemyKilled)) || 0
    const totalDeath = Number(localStorage.getItem(AnalyticsKey.PlayerDeath)) || 0
    const totalCoins = Number(localStorage.getItem(AnalyticsKey.CoinCollected)) || 0

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

    this.scene.launch(SceneKey.Transition)
  }

  getModeText() {
    const mode = this.registry.get(DataKey.GameMode)
    return `${getTranslation('gameMode')} : ${mode === GameMode.Classic ? getTranslation('classic') : getTranslation('speedrun')}`
  }

  getMuteStateText() {
    const isMute = this.registry.get(DataKey.Mute)
    return `${getTranslation('sound')} : ${isMute ? getTranslation('muted') : getTranslation('unmuted')}`
  }


  handleChangeMode() {
    let mode = this.registry.get(DataKey.GameMode)
    mode = mode === GameMode.Classic ? GameMode.Speedrun : GameMode.Classic
    this.registry.set(DataKey.GameMode, mode)
    localStorage.setItem(DataKey.GameMode, mode)
    this.btnMode.text = this.getModeText()
  }

  goBack() {
    transitionEventsEmitter.emit(EventKey.TransitionStart)
    transitionEventsEmitter.once(EventKey.TransitionEnd, () => this.scene.start(SceneKey.Intro), this)
  }

  handleToggleSound() {
    ; (this.scene.get(SceneKey.Audio) as AudioScene).toggleMute()
    this.btnSound.text = this.getMuteStateText()
  }

}
