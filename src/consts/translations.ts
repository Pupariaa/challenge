export enum Language {
    French = 'fr',
    English = 'en',
}

export interface Translations {

    title: string
    pressSpaceToStart: string
    touchToStart: string


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


    leaderboard: string
    player: string
    score: string
    time: string
    date: string
    level: string
    noScoresYet: string
    errorLoadingLeaderboard: string


    pause: string
    play: string


    levels: string
    levelEditor: string
    communityLevels: string
    comingSoon: string


    levelName: string
    creator: string
    numberOfPlays: string
    action: string
    noLevelsAvailable: string
    unknownCreator: string
    unnamedLevel: string


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
        leaderboard: 'Classement',
        player: 'Joueur',
        score: 'Score',
        time: 'Temps',
        date: 'Date',
        level: 'Niveau',
        noScoresYet: 'Aucun score encore',
        errorLoadingLeaderboard: 'Erreur chargement classement',
        pause: 'Pause',
        play: 'Reprendre',
        levels: 'MONDE',
        levelEditor: 'Éditeur de niveaux',
        communityLevels: 'NIVEAUX COMMUNAUTAIRES',
        comingSoon: 'Bientôt disponible',
        levelName: 'Nom du niveau',
        creator: 'Créateur',
        numberOfPlays: 'Nombre de plays',
        action: 'Action',
        noLevelsAvailable: 'Aucun niveau disponible pour cette difficulté',
        unknownCreator: 'Créateur inconnu',
        unnamedLevel: 'Niveau sans nom',
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
        leaderboard: 'Leaderboard',
        player: 'Player',
        score: 'Score',
        time: 'Time',
        date: 'Date',
        level: 'Level',
        noScoresYet: 'No scores yet',
        errorLoadingLeaderboard: 'Error loading leaderboard',
        pause: 'Pause',
        play: 'Resume',
        levels: 'WORLD',
        levelEditor: 'Level Editor',
        communityLevels: 'COMMUNITY LEVELS',
        comingSoon: 'Coming Soon',
        levelName: 'Level Name',
        creator: 'Creator',
        numberOfPlays: 'Number of Plays',
        action: 'Action',
        noLevelsAvailable: 'No levels available for this difficulty',
        unknownCreator: 'Unknown Creator',
        unnamedLevel: 'Unnamed Level',
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
