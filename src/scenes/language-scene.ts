import DataKey from '../consts/data-key'
import EventKey from '../consts/event-key'
import SceneKey from '../consts/scene-key'
import TextureKey, { IconsKey } from '../consts/texture-key'
import { getTranslation, getCurrentLanguage, setLanguage, Language } from '../consts/translations'
import IconButton from '../objects/ui/icon-button'
import Panel from '../objects/ui/panel'
import TextButton from '../objects/ui/text-button'
import { transitionEventsEmitter } from '../utils/transition'

export default class LanguageScene extends Phaser.Scene {
    private btnFrench!: TextButton
    private btnEnglish!: TextButton

    constructor() {
        super({ key: SceneKey.Language })
    }

    create() {
        new IconButton(this, 80, 80, IconsKey.Back, this.goBack)

        const { width } = this.scale
        const panelWidth = 800
        const centerX = (width - panelWidth) / 2

        this.add.existing(new Panel(this, centerX, 40, panelWidth, 500))
        this.add
            .text(width / 2, 100, `- ${getTranslation('language')} -`, {
                fontFamily: TextureKey.FontHeading,
                fontSize: '64px',
                color: '#181425'
            })
            .setOrigin(0.5, 0)

        // Boutons de langue
        this.btnFrench = new TextButton(this, width / 2, 240, getTranslation('french'), this.selectFrench)
        this.btnEnglish = new TextButton(this, width / 2, 380, getTranslation('english'), this.selectEnglish)

        // Mettre en évidence la langue actuelle
        this.highlightCurrentLanguage()

        this.scene.launch(SceneKey.Transition)
    }

    private highlightCurrentLanguage() {
        const currentLang = getCurrentLanguage()

        // Réinitialiser tous les boutons
        this.btnFrench.text = getTranslation('french')
        this.btnEnglish.text = getTranslation('english')

        // Mettre en évidence la langue actuelle
        if (currentLang === Language.French) {
            this.btnFrench.text = `✓ ${getTranslation('french')}`
        } else {
            this.btnEnglish.text = `✓ ${getTranslation('english')}`
        }
    }

    selectFrench() {
        setLanguage(Language.French)
        this.registry.set(DataKey.Language, Language.French)
        this.highlightCurrentLanguage()
    }

    selectEnglish() {
        setLanguage(Language.English)
        this.registry.set(DataKey.Language, Language.English)
        this.highlightCurrentLanguage()
    }

    goBack() {
        transitionEventsEmitter.emit(EventKey.TransitionStart)
        transitionEventsEmitter.once(EventKey.TransitionEnd, () => this.scene.start(SceneKey.Intro), this)
    }
}
