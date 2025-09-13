export enum Language {
    French = 'fr',
    English = 'en',
}

export interface Translations {
    // Intro scene
    title: string
    pressSpaceToStart: string
    touchToStart: string

    // Settings
    settings: string
    gameMode: string
    classic: string
    speedrun: string
    sound: string
    muted: string
    unmuted: string
    unlockAllLevels: string
    resetBestTimes: string
    language: string
    french: string
    english: string
    statistics: string
    enemiesKilled: string
    deaths: string
    coinsCollected: string

    // HUD
    pause: string
    play: string

    // Levels
    levels: string
    levelEditor: string

    // Loading
    loading: string
}

const translations: Record<Language, Translations> = {
    [Language.French]: {
        title: 'Hey \nBobby!',
        pressSpaceToStart: "Appuie sur la touche 'ESPACE' pour commencer",
        touchToStart: "Touche l'écran pour commencer",
        settings: 'Paramètres',
        gameMode: 'Mode de jeu',
        classic: 'Classique',
        speedrun: 'Speedrun',
        sound: 'Son',
        muted: 'Muet',
        unmuted: 'Activé',
        unlockAllLevels: 'Débloquer les niveaux',
        resetBestTimes: 'Reset meilleurs temps',
        language: 'Langue',
        french: 'Français',
        english: 'English',
        statistics: 'Statistiques',
        enemiesKilled: 'Ennemis tués',
        deaths: 'Morts de Bobby',
        coinsCollected: 'Pièces collectées',
        pause: 'Pause',
        play: 'Reprendre',
        levels: 'MONDE',
        levelEditor: 'Éditeur de niveaux',
        loading: 'Chargement...',
    },
    [Language.English]: {
        title: 'Hey \nBobby!',
        pressSpaceToStart: "Press 'SPACE' to start",
        touchToStart: 'Touch screen to start',
        settings: 'Settings',
        gameMode: 'Game Mode',
        classic: 'Classic',
        speedrun: 'Speedrun',
        sound: 'Sound',
        muted: 'Muted',
        unmuted: 'On',
        unlockAllLevels: 'Unlock all levels',
        resetBestTimes: 'Reset best times',
        language: 'Language',
        french: 'Français',
        english: 'English',
        statistics: 'Statistics',
        enemiesKilled: 'Enemies killed',
        deaths: 'Deaths',
        coinsCollected: 'Coins collected',
        pause: 'Pause',
        play: 'Resume',
        levels: 'WORLD',
        levelEditor: 'Level Editor',
        loading: 'Loading...',
    },
}

export function getTranslation(key: keyof Translations, language: Language = getCurrentLanguage()): string {
    return translations[language][key] || translations[Language.French][key]
}

export function getCurrentLanguage(): Language {
    const saved = localStorage.getItem('language') as Language
    return saved || Language.French
}

export function setLanguage(language: Language): void {
    localStorage.setItem('language', language)
}

export default translations
