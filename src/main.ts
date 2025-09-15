import Phaser from 'phaser'
import ga from 'gameanalytics'
import { GameConfig } from './config'
import './style.css'

ga.GameAnalytics.setEnabledInfoLog(true)
ga.GameAnalytics.configureBuild('0.0.20')


export default new Phaser.Game(GameConfig)
