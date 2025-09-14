import DataKey from '../consts/data-key'
import { DataLevel, PlayerDataLevel } from '../consts/level'
import { levelsData } from '../levels'
import { authService } from '../services/auth-service'

export function getLevelTotalCoins(level: number | DataLevel) {
  const data = typeof level === 'number' ? levelsData[`level${level}`] : level
  return (data?.coins || []).reduce((acc, { numX, numY }) => acc + Math.max(numX || 1, numY || 1), 0)
}

export function getUnlockedLevels(): PlayerDataLevel[] {

  if (authService.isAuthenticated()) {
    const progress = authService.getProgress()
    if (progress) {
      return progress.unlockedLevels.map(level => ({
        level,
        time: progress.scores[level.toString()]?.time || 0
      }))
    }
  }


  const unlockedLevelsString = localStorage.getItem(DataKey.UnlockedLevels)
  if (unlockedLevelsString) {
    return JSON.parse(unlockedLevelsString)
  } else {
    const level = {
      level: 1,
      time: 0,
    }
    localStorage.setItem(DataKey.UnlockedLevels, JSON.stringify([level]))
    return [level]
  }
}

export function getLevelInfo(levelNum: number) {
  const unlockedLevels = getUnlockedLevels()
  return unlockedLevels.find(({ level }) => level === levelNum)
}

export function updateLevelInfo(levelNum: number, data: Partial<PlayerDataLevel>) {

  if (authService.isAuthenticated()) {
    const progress = authService.getProgress()
    if (progress) {

      const settings = authService.getSettings()
      const gameMode = settings.gameMode || 'classic'
      const isSpeedrun = gameMode === 'speedrun'

      const coins = data.coins || 0
      const time = data.time || 0


      let speedrunData = undefined
      if (isSpeedrun && data.speedrunData) {
        speedrunData = data.speedrunData
      }


      authService.saveScore(levelNum, time, coins, isSpeedrun ? 'speedrun' : 'classic', speedrunData)


      if (data.shinyCoin) {

      }
    }
    return
  }


  const unlockedLevels = getUnlockedLevels()
  const index = unlockedLevels.findIndex(({ level }) => level === levelNum)
  if (index === -1) return

  unlockedLevels[index] = { ...unlockedLevels[index], ...data }
  localStorage.setItem(DataKey.UnlockedLevels, JSON.stringify(unlockedLevels))
}

export function unlockLevel(levelNum: number, time = 0) {

  if (authService.isAuthenticated()) {
    const progress = authService.getProgress()
    if (progress && !progress.unlockedLevels.includes(levelNum)) {

      const newProgress = {
        ...progress,
        unlockedLevels: [...progress.unlockedLevels, levelNum]
      }
      authService.saveProgress(newProgress)
    }
    return
  }


  const unlockedLevels = getUnlockedLevels()
  if (unlockedLevels.some(({ level }) => level === levelNum)) return

  unlockedLevels.push({
    level: levelNum,
    time,
  })
  localStorage.setItem(DataKey.UnlockedLevels, JSON.stringify(unlockedLevels))
}

export function unlockAllLevels() {

  if (authService.isAuthenticated()) {
    const progress = authService.getProgress()
    if (progress) {
      const allLevels = Array.from({ length: Object.keys(levelsData).length }, (_, i) => i + 1)
      const newProgress = {
        ...progress,
        unlockedLevels: allLevels
      }
      authService.saveProgress(newProgress)
    }
    return
  }


  let unlockedLevels = getUnlockedLevels()
  const unlockedLevelSet = new Set(unlockedLevels.map((levelData) => levelData.level))
  for (let level = 1; level <= Object.keys(levelsData).length; level++) {
    if (!unlockedLevelSet.has(level)) {
      unlockedLevels.push({ level, time: 0 })
    }
  }

  localStorage.setItem(DataKey.UnlockedLevels, JSON.stringify(unlockedLevels))
}

export function resetBestTimes() {

  if (authService.isAuthenticated()) {
    const progress = authService.getProgress()
    if (progress) {
      const resetProgress = {
        ...progress,
        scores: {}
      }
      authService.saveProgress(resetProgress)
    }
    return
  }


  const unlockedLevels = getUnlockedLevels()
  const resetTimesLevels = unlockedLevels.map((level) => ({ ...level, time: 0 }))
  localStorage.setItem(DataKey.UnlockedLevels, JSON.stringify(resetTimesLevels))
}

export function setCurrentWorld(world: number) {
  localStorage.setItem(DataKey.CurrentWorld, world.toString())
}

export function getCurrentWorld() {
  return parseInt(localStorage.getItem(DataKey.CurrentWorld) ?? '1', 10)
}
