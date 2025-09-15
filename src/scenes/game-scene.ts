import AnalyticsKey from '../consts/analytics-key'
import { speedrunRecorder } from '../services/speedrun-recorder'
import { authService } from '../services/auth-service'
import {
  BOSS_BOUNCE_VELOCITY,
  BUMP_OFF_VELOCITY,
  COIN_SIZE,
  ENEMY2_JUMP_DELAY,
  ENEMY_VELOCITY,
  NUM_LEVELS_BY_WORLD,
  PlayerMode,
  TILE_SIZE,
} from '../consts/globals'
import {
  DataLevel,
  GameMode,
  LevelBump,
  LevelCannon,
  LevelCoin,
  LevelEnemy,
  LevelEventBlock,
  LevelFallingBlock,
  LevelLava,
  LevelLavaBall,
  LevelOneWayPlatform,
  LevelPlatform,
  LevelSpike,
  LevelSpikyBall,
  Theme,
  THEME_DATA,
  ThemeColors,
} from '../consts/level'
import SceneKey from '../consts/scene-key'
import TextureKey, { IconsKey } from '../consts/texture-key'
import { levelsData } from '../levels'
import { addDesignEvent, addProgressionEvent, ProgressionEventType } from '../utils/analytics'
import { getLevelTotalCoins, unlockLevel } from '../utils/level'
import { transitionEventsEmitter } from '../utils/transition'
import { isTouchingFromAbove } from '../utils/helpers'
import AudioScene from './audio-scene'
import DataKey from '../consts/data-key'
import EventKey from '../consts/event-key'
import { AudioKey } from '../consts/audio-key'
import Player from '../objects/player'
import Platform from '../objects/platform'
import OneWayPlatform from '../objects/one-way-platform'
import Cannon from '../objects/cannon'
import Spike from '../objects/spike'
import SpikyBall from '../objects/spiky-ball'
import MovingSpikyBall from '../objects/moving-spiky-ball'
import FallingBlock from '../objects/falling-block'
import Transformer from '../objects/transformer'
import Target from '../objects/target'
import Coin from '../objects/coin'
import Boss from '../objects/boss'
import EventBlock from '../objects/event-block'
import {
  EditorType,
  EditorPlaceItemProps,
  EditorPlaceItemsProps,
  EditorRemoveItemProps,
  EditorItem,
  EditorSelectItemProps,
  EditorPlaceAtItemProps,
  EDITOR_TYPE_TOOLS,
  EditorTool,
  EditorMoveItemProps,
  EditorMoveItemCompleteProps,
  EditorUpdateLevelSizeProps,
} from '../consts/editor'
import {
  convertFallingBlocksToCells,
  convertPlatformsToCells,
  convertPointerToPos,
  convertSpikesToCells,
  getPlatformsFromGrid,
  getSpikesFromGrid,
  getFallingBlocksFromGrid,
  getOneWayPlatformsFromGrid,
} from '../utils/editor'
import Bump from '../objects/bump'
import Lava from '../objects/lava'
import LavaBall from '../objects/lava-ball'

interface Keys {
  [key: string]: { isDown: boolean }
}

export default class GameScene extends Phaser.Scene {
  private theme!: Theme
  private themeColors!: ThemeColors
  private currentLevel: number | null = null
  private levelData!: DataLevel
  private _canMove = false
  private isReady = false
  private touchLeft = false
  private touchRight = false
  private timerStarted = false
  private _playerMode = PlayerMode.Platformer
  private isCheckpointActive = false
  private startedFromCheckpoint = false
  private coinsCollected!: number[]
  private isSpeedrunMode!: boolean
  private isEditorPlayingTestMode!: boolean
  private _audioManager!: AudioScene
  private isTransitionning = false
  public worldWidth!: number
  public worldHeight!: number
  private background!: Phaser.GameObjects.Rectangle
  private backgroundParallax!: Phaser.GameObjects.TileSprite
  private gridGraphics!: Phaser.GameObjects.Graphics
  private showGrid: boolean = true
  private background2!: Phaser.GameObjects.TileSprite
  private platforms!: Phaser.GameObjects.Group
  private lava!: Phaser.Physics.Arcade.StaticGroup
  private lavaballs!: Phaser.Physics.Arcade.Group
  private platformsHitbox!: Phaser.Physics.Arcade.StaticGroup
  private spikes!: Phaser.Physics.Arcade.StaticGroup
  private spikyBalls!: Phaser.Physics.Arcade.Group
  private spikyBallsStartPos!: Phaser.GameObjects.Group
  private coins!: Phaser.Physics.Arcade.StaticGroup
  private oneWayPlatforms!: Phaser.Physics.Arcade.Group
  private cannons!: Phaser.Physics.Arcade.StaticGroup
  private fireballs!: Phaser.Physics.Arcade.Group
  private target!: Target
  private fallingBlocks!: Phaser.Physics.Arcade.StaticGroup
  private eventBlocks!: Phaser.Physics.Arcade.StaticGroup
  private fallingBlocksTriggers!: Phaser.Physics.Arcade.StaticGroup
  private transformers!: Phaser.Physics.Arcade.StaticGroup
  private enemies!: Phaser.Physics.Arcade.Group
  private enemiesStartPos!: Phaser.GameObjects.Group
  private checkpointFlag!: Phaser.GameObjects.Triangle
  private checkpoint!: Phaser.GameObjects.Container
  private player!: Player
  private playerStartPos: Phaser.GameObjects.Rectangle | null = null
  private playerShadowHitbox!: Phaser.GameObjects.Rectangle
  private coinsEmitter!: Phaser.GameObjects.Particles.ParticleEmitter
  private bumps!: Phaser.Physics.Arcade.StaticGroup

  private enemiesCollider!: Phaser.Physics.Arcade.Collider
  private bossCollider!: Phaser.Physics.Arcade.Collider
  private bossTrigger!: Phaser.GameObjects.Rectangle
  private platformsCollider!: Phaser.Physics.Arcade.Collider
  private cannonsCollider!: Phaser.Physics.Arcade.Collider
  private oneWayPlatformsCollider!: Phaser.Physics.Arcade.Collider
  private fallingBlocksCollider!: Phaser.Physics.Arcade.Collider
  private eventBlocksCollider!: Phaser.Physics.Arcade.Collider
  private fallingBlocksTriggersOverlap!: Phaser.Physics.Arcade.Collider
  private transformersTriggers!: Phaser.Physics.Arcade.Collider
  private checkpointTrigger!: Phaser.Physics.Arcade.Collider
  private coinsTriggers!: Phaser.Physics.Arcade.Collider
  private targetTrigger!: Phaser.Physics.Arcade.Collider
  private bumpsCollider!: Phaser.Physics.Arcade.Collider
  private zKey!: Phaser.Input.Keyboard.Key
  private upKey!: Phaser.Input.Keyboard.Key
  private spaceKey!: Phaser.Input.Keyboard.Key
  private boss: Boss | null = null

  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys
  private keys!: Keys

  private stickedPlatform: OneWayPlatform | null = null
  private stickedVelocityX = 0

  private isCustomLevel = false
  private isCustomLevelRun = false
  private itemsMap!: Map<string, EditorItem>
  private currentItem: EditorItem | null = null
  private currentItemIcon: Phaser.GameObjects.Image | null = null
  public defaultItemsPositions: Set<string> = new Set()

  constructor() {
    super({ key: SceneKey.Game })
  }

  get audioManager() {
    return this._audioManager
  }

  get canMove() {
    return this._canMove
  }

  get playerMode() {
    return this._playerMode
  }

  get playerRef() {
    return this.player
  }

  init(data: { number?: number; level?: DataLevel; isCustomLevelRun?: boolean }) {
    if (data.number) {
      this.currentLevel = data.number
      this.isCustomLevel = false


      if (data.number === 999) {
        const communityLevelData = this.registry.get('communityLevelData')
        const communityLevelId = this.registry.get('communityLevelId')
        if (communityLevelData && communityLevelId) {
          this.levelData = communityLevelData
          this.isCustomLevel = false // Traiter comme un niveau normal

          this.registry.set('communityLevelId', communityLevelId)
        } else {

          this.levelData = levelsData[`level1`]
          this.registry.remove('communityLevelId')
        }
      } else {
        this.levelData = levelsData[`level${this.currentLevel}`]
      }
    } else if (data.level) {
      this.currentLevel = null
      this.levelData = data.level
      this.importLevel({ ...data.level }, false)
      this.isCustomLevel = true
    }

    this.scene.stop(SceneKey.HUD)
    this.scene.stop(SceneKey.Editor)
    this.itemsMap = new Map()
    this.isCustomLevelRun = data.isCustomLevelRun ?? false
    this.theme = this.levelData.theme || Theme.Forest
    this.themeColors = THEME_DATA[this.theme]
    this.registry.set(DataKey.IsCustomLevel, this.isCustomLevel)
    this.registry.set(DataKey.IsCustomLevelRun, this.isCustomLevelRun)


    if (this.currentLevel) {
      this.registry.set('currentLevel', this.currentLevel)
    }
  }

  create() {
    this._canMove = false
    this.isReady = false
    this.touchLeft = false
    this.touchRight = false
    this.timerStarted = false
    this._playerMode = PlayerMode.Platformer
    this.isCheckpointActive = this.registry.get(DataKey.IsCheckpointActive)
    this.startedFromCheckpoint = this.isCheckpointActive
    const coinsCollected = this.registry.get(DataKey.CoinsCollected) || []
    this.coinsCollected = [...coinsCollected]

    if (authService.isAuthenticated()) {
      const settings = authService.getSettings()
      this.isSpeedrunMode = settings.gameMode === 'speedrun'
      this.isEditorPlayingTestMode = settings.gameMode === 'editorPlayingTest'
    } else {
      const gameMode = this.registry.get(DataKey.GameMode)
      this.isSpeedrunMode = gameMode === GameMode.Speedrun
      this.isEditorPlayingTestMode = gameMode === GameMode.EditorPlayingTest
    }
    console.log('🎮 GameScene - Mode speedrun:', this.isSpeedrunMode, 'Mode editor test:', this.isEditorPlayingTestMode, 'Registry GameMode:', this.registry.get(DataKey.GameMode))
    this._audioManager = this.scene.get(SceneKey.Audio) as AudioScene


    this.createInfoPanel()


    this.time.delayedCall(
      500,
      () => {
        this.isReady = true
      },
      [],
      this
    )
    this.isTransitionning = false
    this.worldWidth = this.levelData.world.width
    this.worldHeight = this.levelData.world.height


    const worldCenterOffsetX = this.worldWidth / 2
    const worldCenterOffsetY = this.worldHeight / 2
    this.physics.world.setBounds(-worldCenterOffsetX, -worldCenterOffsetY, this.worldWidth, this.worldHeight)


    if (this.isCustomLevel && !this.isCustomLevelRun) {

      const mapCenterX = 0 // L'origine de la map est maintenant au centre
      const mapCenterY = 0
      this.background = this.add.rectangle(mapCenterX, mapCenterY, this.worldWidth, this.worldHeight, this.themeColors.background).setOrigin(0.5)
    } else {

      this.background = this.add.rectangle(0, 0, this.cameras.main.width * 10, this.cameras.main.height * 10, this.themeColors.background).setOrigin(0.5)
    }

    this.background2 = this.add
      .tileSprite(0, 0, this.cameras.main.width, this.cameras.main.height, this.themeColors.parallax2)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setAlpha(this.isCustomLevel && !this.isCustomLevelRun ? 0 : 1)

    this.backgroundParallax = this.add
      .tileSprite(0, 0, this.cameras.main.width, this.cameras.main.height, this.themeColors.parallax)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setAlpha(this.isCustomLevel && !this.isCustomLevelRun ? 0 : 1)


    if (this.levelData.isBoss) {
      this.boss = new Boss(this)
      const { x, y, width, height } = this.levelData.bossTrigger!
      this.bossTrigger = this.add.rectangle(x, y, width, height).setOrigin(0)
      this.physics.add.existing(this.bossTrigger, true)
    }


    this.platforms = this.add.group({
      classType: Platform,
    })
    const platformsPos = this.levelData.platforms || []
    for (let i = 0; i < platformsPos.length; i++) {
      this.addPlatform(platformsPos[i], false)
    }
    this.platformsHitbox = this.physics.add.staticGroup()
    this.createPlatformsHitbox()


    this.oneWayPlatforms = this.physics.add.group({
      classType: OneWayPlatform,
      allowGravity: false,
      immovable: true,
    })
    const oneWayPlatformsPos = this.levelData.oneWayPlatforms || []
    for (let i = 0; i < oneWayPlatformsPos.length; i++) {
      this.addOneWayPlatform(oneWayPlatformsPos[i], false)
    }

    this.fireballs = this.physics.add.group({
      allowGravity: false,
    })


    this.bumps = this.physics.add.staticGroup({
      classType: Bump,
    })
    const bumpsPos = this.levelData.bumps || []
    for (let i = 0; i < bumpsPos.length; i++) {
      this.addBump(bumpsPos[i])
    }


    this.cannons = this.physics.add.staticGroup({
      classType: Cannon,
      runChildUpdate: true,
    })
    const cannonsPos = this.levelData.cannons || []
    for (let i = 0; i < cannonsPos.length; i++) {
      this.addCannon(cannonsPos[i])
    }


    this.target = new Target(this, this.levelData.target.x, this.levelData.target.y)


    this.spikes = this.physics.add.staticGroup()
    const spikesPos = this.levelData.spikes ?? []
    for (let i = 0; i < spikesPos.length; i++) {
      this.addSpikes(spikesPos[i])
    }


    this.lavaballs = this.physics.add.group({
      classType: LavaBall,
      runChildUpdate: true,
    })
    const lavaballsPos = this.levelData.lavaBalls || []
    for (let i = 0; i < lavaballsPos.length; i++) {
      this.addLavaball(lavaballsPos[i])
    }


    this.lava = this.physics.add.staticGroup({
      classType: Lava,
    })
    const lavaPos = this.levelData.lava || []
    for (let i = 0; i < lavaPos.length; i++) {
      this.addLava(lavaPos[i])
    }

    this.spikyBalls = this.physics.add.group({
      allowGravity: false,
      immovable: true,
    })
    this.spikyBallsStartPos = this.add.group()
    const spikyBallsPos = this.levelData.spikyBalls ?? []
    for (let i = 0; i < spikyBallsPos.length; i++) {
      this.addSpikyBall(spikyBallsPos[i])
    }


    this.fallingBlocks = this.physics.add.staticGroup({
      classType: FallingBlock,
    })
    this.fallingBlocksTriggers = this.physics.add.staticGroup()
    const fallingBlocksPos = this.levelData.fallingBlocks ?? []
    for (let i = 0; i < fallingBlocksPos.length; i++) {
      this.addFallingBlock(fallingBlocksPos[i])
    }


    this.eventBlocks = this.physics.add.staticGroup()
    const eventBlocksPos = this.levelData.eventBlocks ?? []
    for (let i = 0; i < eventBlocksPos.length; i++) {
      this.addEventBlock(this.eventBlocks, eventBlocksPos[i])
    }


    this.transformers = this.physics.add.staticGroup()
    const transformersPos = this.levelData.transformers ?? []
    for (let i = 0; i < transformersPos.length; i++) {
      const { x, y, width = TILE_SIZE / 4, height = TILE_SIZE / 4, mode = PlayerMode.Platformer } = transformersPos[i]
      new Transformer(this, x, y, width, height, mode, this.transformers)
    }


    this.enemies = this.physics.add.group()
    this.enemiesStartPos = this.add.group()
    const enemiesPos = this.levelData.enemies ?? []
    for (let i = 0; i < enemiesPos.length; i++) {
      this.addEnemy(enemiesPos[i])
    }


    this.addCoins()


    if (this.levelData.checkpoint && !this.isSpeedrunMode && !this.isEditorPlayingTestMode) {
      const pole = this.add.rectangle(0, 0, 20, 240, 0xc0cbdc)
      this.checkpointFlag = this.add
        .triangle(90, pole.height / 2 - 8 - (this.isCheckpointActive ? 120 : 0), 0, -40, 80, 0, 0, 40, 0xf77622)
        .setOrigin(1, 0.5)
      this.checkpoint = this.add.container(this.levelData.checkpoint.x, this.levelData.checkpoint.y, [
        pole,
        this.checkpointFlag,
      ])
      this.physics.add.existing(this.checkpoint, true)
        ; (this.checkpoint.body as Phaser.Physics.Arcade.Body).setSize(pole.width, pole.height)
        ; (this.checkpoint.body as Phaser.Physics.Arcade.Body).setOffset(22, -88)
    }


    const startingPos = this.isCheckpointActive
      ? { x: this.levelData.checkpoint!.x - TILE_SIZE, y: this.levelData.checkpoint!.y }
      : this.levelData.player
    this.player = new Player(this, startingPos.x, startingPos.y)
    this.playerStartPos = null
    if (this.isCustomLevel && !this.isCustomLevelRun) {
      this.playerStartPos = this.add.rectangle(
        this.levelData.player.x,
        this.levelData.player.y,
        TILE_SIZE,
        TILE_SIZE,
        0xffffff,
        0.5
      )
    }

    this.playerShadowHitbox = this.add.rectangle(
      this.levelData.player.x,
      this.levelData.player.y,
      TILE_SIZE,
      TILE_SIZE,
      0xffffff,
      0
    )
    this.physics.add.existing(this.playerShadowHitbox, true)


    this.coinsEmitter = this.add.particles(0, 0, TextureKey.ParticleCoin, {
      lifespan: 300,
      speed: { min: 160, max: 200 },
      angle: { min: 0, max: 360 },
      frequency: -1,
      scale: { start: 1, end: 0.2 },
      alpha: { start: 1, end: 0 },
    })


    this.physics.add.overlap(this.player, this.spikes, this.die, undefined, this)
    this.physics.add.overlap(this.player, this.lava, this.die, undefined, this)
    this.physics.add.overlap(this.player, this.fireballs, this.die, undefined, this)
    this.physics.add.overlap(this.player, this.lavaballs, this.die, undefined, this)
    this.physics.add.overlap(this.player, this.spikyBalls, this.die, undefined, this)
    this.enemiesCollider = this.physics.add.overlap(
      this.enemies,
      this.player,
      this.handleEnemiesCollision,
      undefined,
      this
    )


    this.physics.add.overlap(this.platformsHitbox, this.fireballs, this.destroyFireball, undefined, this)
    this.platformsCollider = this.physics.add.collider(this.player, this.platformsHitbox)
    this.cannonsCollider = this.physics.add.collider(this.player, this.cannons)
    this.oneWayPlatformsCollider = this.physics.add.collider(
      this.player,
      this.oneWayPlatforms,
      this.stickPlayerToPlatform,
      undefined,
      this
    )
    this.physics.add.collider(this.enemies, this.platformsHitbox)
    this.physics.add.collider(this.enemies, this.oneWayPlatforms)
    this.physics.add.collider(this.enemies, this.fallingBlocks)
    this.fallingBlocksCollider = this.physics.add.collider(this.player, this.fallingBlocks)
    this.eventBlocksCollider = this.physics.add.collider(this.player, this.eventBlocks)
    this.fallingBlocksTriggersOverlap = this.physics.add.overlap(
      this.player,
      this.fallingBlocksTriggers,
      this.handleFallingBlockCollision,
      undefined,
      this
    )
    this.transformersTriggers = this.physics.add.overlap(
      this.player,
      this.transformers,
      this.handleTransformerCheck,
      undefined,
      this
    )

    this.bumpsCollider = this.physics.add.overlap(this.player, this.bumps, this.handleBumpJump, undefined, this)

    if (this.boss) {
      this.physics.add.collider(this.boss, this.platformsHitbox)
      this.bossCollider = this.physics.add.overlap(this.boss, this.player, this.handleBossCollision, undefined, this)
      this.physics.add.overlap(this.player, this.bossTrigger!, this.handleBossTrigger, undefined, this)
      this.events.on(EventKey.UnlockEventBlocks, this.unlockEventBlocks, this)
      this.events.on(EventKey.UnfreezePlayer, this.unfreezePlayer, this)
    }


    if (this.levelData.checkpoint && !this.isCheckpointActive) {
      this.checkpointTrigger = this.physics.add.overlap(
        this.player,
        this.checkpoint,
        this.handleCheckpoint,
        undefined,
        this
      )
    }


    this.coinsTriggers = this.physics.add.overlap(this.player, this.coins, this.handleCoin, undefined, this)


    this.targetTrigger = this.physics.add.overlap(this.player, this.target, this.teleport, undefined, this)


    this.cameras.main.startFollow(this.player, true, 0.1, 0.1)


    const navigationMargin = Math.max(this.worldWidth, this.worldHeight) * 2 // Marge de 2x la taille max
    this.cameras.main.setBounds(
      -navigationMargin,
      -navigationMargin,
      navigationMargin * 2,
      navigationMargin * 2
    )


    this.gridGraphics = this.add.graphics()
    this.updateGridDisplay()


    if (this.isCustomLevel && !this.isCustomLevelRun) {
      this.updateBackgroundSize()
    }


    this.cursors = this.input.keyboard!.createCursorKeys()
    this.keys = this.input.keyboard!.addKeys('Q,D') as Keys
    this.zKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.Z)
    this.upKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.UP)
    this.spaceKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE)
    this.input.keyboard!.on('keyup-UP', () => this.player.resetJump(), this)
    this.input.keyboard!.on('keyup-Z', () => this.player.resetJump(), this)
    this.input.keyboard!.on('keyup-SPACE', () => this.player.resetJump(), this)
    this.input.keyboard!.on('keydown-R', this.handlRestartToggle, this)


    if (!this.sys.game.device.os.desktop) {

      this.input.on('pointerdown', this.handlePointerDown, this)
      this.input.on('pointermove', this.handlePointerMove, this)
      this.input.on('pointerup', this.handlePointerUp, this)
    }


    this.events.on('postupdate', this.checkWorldBounds, this)

    this.events.once('shutdown', () => {
      this.events.off('postupdate', this.checkWorldBounds)
      this.events.off(EventKey.UnlockEventBlocks, this.unlockEventBlocks, this)
      this.events.off(EventKey.UnfreezePlayer, this.unfreezePlayer, this)
      if (this.isCustomLevel) {
        const editorScene = this.scene.get(SceneKey.Editor)
        editorScene.events.off(EventKey.EditorToggle, this.toggleEditMode, this)
        editorScene.events.off(EventKey.EditorPlaceItem, this.placeItem, this)
        editorScene.events.off(EventKey.EditorPlaceItems, this.placeItems, this)
        editorScene.events.off(EventKey.EditorRemoveItem, this.removeItem, this)
        editorScene.events.off(EventKey.EditorSelectItem, this.selectItem, this)
        editorScene.events.off(EventKey.EditorDeleteCurrent, this.deleteCurrent, this)
        editorScene.events.off(EventKey.EditorRotateCurrent, this.rotateCurrent, this)
        editorScene.events.off(EventKey.EditorChangeDirCurrent, this.changeDirCurrent, this)
        editorScene.events.off(EventKey.EditorMoveItem, this.moveItem, this)
        editorScene.events.off(EventKey.EditorMoveItemComplete, this.moveItemComplete, this)
        editorScene.events.off(EventKey.EditorItemDragging, this.setItemDragging, this)
        editorScene.events.off(EventKey.EditorUpdateLevelSize, this.updateLevelSize, this)
        editorScene.events.off(EventKey.EditorToggleHitboxes, this.toggleHitboxes, this)
        editorScene.events.off(EventKey.EditorToggleGrid, this.toggleGrid, this)
        editorScene.events.off(EventKey.EditorUpdateBackground, this.updateBackgroundSize, this)
        editorScene.events.off(EventKey.EditorExport, this.exportLevel, this)
        editorScene.events.off(EventKey.EditorImport, this.importLevel, this)
      }
    })

    if (this.isCustomLevel) {
      this.scene.launch(SceneKey.Editor)
      const editorScene = this.scene.get(SceneKey.Editor)
      editorScene.events.on(EventKey.EditorToggle, this.toggleEditMode, this)
      editorScene.events.on(EventKey.EditorPlaceItem, this.placeItem, this)
      editorScene.events.on(EventKey.EditorPlaceItems, this.placeItems, this)
      editorScene.events.on(EventKey.EditorRemoveItem, this.removeItem, this)
      editorScene.events.on(EventKey.EditorSelectItem, this.selectItem, this)
      editorScene.events.on(EventKey.EditorDeleteCurrent, this.deleteCurrent, this)
      editorScene.events.on(EventKey.EditorRotateCurrent, this.rotateCurrent, this)
      editorScene.events.on(EventKey.EditorChangeDirCurrent, this.changeDirCurrent, this)
      editorScene.events.on(EventKey.EditorMoveItem, this.moveItem, this)
      editorScene.events.on(EventKey.EditorMoveItemComplete, this.moveItemComplete, this)
      editorScene.events.on(EventKey.EditorItemDragging, this.setItemDragging, this)
      editorScene.events.on(EventKey.EditorUpdateLevelSize, this.updateLevelSize, this)
      editorScene.events.on(EventKey.EditorToggleHitboxes, this.toggleHitboxes, this)
      editorScene.events.on(EventKey.EditorToggleGrid, this.toggleGrid, this)
      editorScene.events.on(EventKey.EditorUpdateBackground, this.updateBackgroundSize, this)
      editorScene.events.on(EventKey.EditorPlaytest, this.playTest, this)
      editorScene.events.on(EventKey.EditorExport, this.exportLevel, this)
      editorScene.events.on(EventKey.EditorImport, this.importLevel, this)
      this.currentItemIcon = this.add
        .image(0, 0, TextureKey.Icons, IconsKey.Active)
        .setOrigin(0)
        .setAlpha(0)
        .setDepth(100)
    }

    if (!this.isCustomLevel || this.isCustomLevelRun || this.isEditorPlayingTestMode) {
      this.scene.launch(SceneKey.HUD)
    }


    if (this.isCustomLevel && !this.isCustomLevelRun) {
      const justImported = this.registry.get('justImportedMap')
      if (justImported) {
        console.log('🎯 Import détecté, téléport vers Bobby dans 2000ms')
        this.time.delayedCall(2000, () => {
          console.log('🎯 Tentative de téléport maintenant...')
          this.teleportToPlayer()

          this.registry.set('justImportedMap', false)
        })
      }
    }

    this.scene.launch(SceneKey.Transition)
  }

  update(time: number, delta: number) {
    this.backgroundParallax.tilePositionX = this.cameras.main.scrollX * 0.4
    this.background2.tilePositionX = this.cameras.main.scrollX * 0.3

    const justTriggeredJump =
      Phaser.Input.Keyboard.JustDown(this.zKey) ||
      Phaser.Input.Keyboard.JustDown(this.upKey) ||
      Phaser.Input.Keyboard.JustDown(this.spaceKey)

    const isGoingLeft = this.cursors.left.isDown || this.keys.Q.isDown || this.touchLeft
    const isGoingRight = this.cursors.right.isDown || this.keys.D.isDown || this.touchRight


    if ((this.isSpeedrunMode || this.isEditorPlayingTestMode) && speedrunRecorder.isRecordingActive()) {
      if (justTriggeredJump) {
        console.log('🎮 Recording jump input')
        speedrunRecorder.recordInput('jump', { x: this.player.x, y: this.player.y })
      }
      if (isGoingLeft) {
        console.log('🎮 Recording left input')
        speedrunRecorder.recordInput('move_left', { x: this.player.x, y: this.player.y })
      }
      if (isGoingRight) {
        console.log('🎮 Recording right input')
        speedrunRecorder.recordInput('move_right', { x: this.player.x, y: this.player.y })
      }
    } else if ((this.isSpeedrunMode || this.isEditorPlayingTestMode) && !speedrunRecorder.isRecordingActive()) {
      console.log('⚠️ Mode speedrun/éditeur activé mais enregistrement non actif')
    } else if (!this.isSpeedrunMode && !this.isEditorPlayingTestMode) {
      console.log('⚠️ Pas en mode speedrun/éditeur')
    }


    if (justTriggeredJump || isGoingLeft || isGoingRight) this.checkFirstMove()


    this.enemies
      .getChildren()
      .filter((enemy) => !enemy.getData('isDead'))
      .forEach((enemy) => {
        let dir = enemy.getData('dir')
        const body = enemy.body as Phaser.Physics.Arcade.Body

        if (enemy.getData('type') === 2) {
          if (body.blocked.down) {
            body.setVelocityX(0)
          }
        } else {
          if (body.blocked.right) {
            dir = -1
          } else if (body.blocked.left) {
            dir = 1
          }
          enemy.setData('dir', dir)
          body.setVelocityX(ENEMY_VELOCITY * dir)
        }
      })

    this.boss?.update()


    this.handleMovingPlatforms(time, delta)

    if (!this._canMove) return

    this.player.update({
      time,
      isGoingLeft,
      isGoingRight,
      playerMode: this.playerMode,
      stickedVelocityX: this.stickedVelocityX,
      justTriggeredJump,
    })


    if (
      this.player.y - (this.player.body as Phaser.Physics.Arcade.Body).height / 2 >
      this.physics.world.bounds.height
    ) {
      this.die.call(this)
    }
  }

  playTest() {
    this.createPlatformsHitbox()
    this.clearCurrentItem()
    this.scene.resume()
  }

  clearCurrentItem() {
    this.currentItem = null
    this.currentItemIcon?.setAlpha(0)
    this.events.emit(EventKey.EditorItemSelected, this.currentItem)
  }

  getItemAt(x: number, y: number) {
    const key = this.getMapKey(x, y)
    return this.itemsMap.get(key) || null
  }

  getItem(worldX: number, worldY: number) {
    const itemPosX = convertPointerToPos(worldX)
    const itemPosY = convertPointerToPos(worldY)
    return this.getItemAt(itemPosX, itemPosY)
  }

  getItemAtSnappedPosition(x: number, y: number) {
    const key = this.getMapKey(x, y)
    return this.itemsMap.get(key) || null
  }

  selectItem(data: EditorSelectItemProps) {
    const { worldX, worldY } = data

    const item = this.getItemAtSnappedPosition(worldX, worldY)
    this.currentItem = item || null
    this.events.emit(EventKey.EditorItemSelected, this.currentItem)

    if (item) {
      this.currentItemIcon?.setAlpha(1).setPosition(worldX, worldY)
    } else {
      this.currentItemIcon?.setAlpha(0)
    }
  }

  rotateCurrent() {
    if (!this.currentItem || !EDITOR_TYPE_TOOLS[this.currentItem.type]?.includes(EditorTool.Rotate)) return
    const { data } = this.currentItem
    if (!('dir' in data)) return
    const newDir = ((data.dir ?? 0) + 1) % 4
    this.removeItemAt(data.x, data.y)
    this.placeItemAt(data.x, data.y, { type: this.currentItem.type, dir: newDir })
  }

  changeDirCurrent() {
    if (!this.currentItem || !EDITOR_TYPE_TOOLS[this.currentItem.type]?.includes(EditorTool.Direction)) return
    const data = this.currentItem.data as LevelEnemy
    const newDir = (data.dir ?? 1) * -1
    this.removeItemAt(data.x, data.y)
    this.placeItemAt(data.x, data.y, { type: this.currentItem.type, dir: newDir })
  }

  deleteCurrent() {
    if (!this.currentItem) return

    const key = this.getMapKey(this.currentItem.data.x, this.currentItem.data.y)


    if (this.defaultItemsPositions.has(key)) {
      return
    }

    this.removeItemAt(this.currentItem.data.x, this.currentItem.data.y)
    this.currentItem = null
    this.currentItemIcon?.setAlpha(0)
    this.events.emit(EventKey.EditorItemSelected, null)
  }

  moveItem(data: EditorMoveItemProps) {
    const { item, toX, toY, offsetX, offsetY } = data

    const visualX = toX - offsetX
    const visualY = toY - offsetY


    if (item.object && 'setPosition' in item.object) {
      item.object.setPosition(visualX, visualY)
    }


    if (this.currentItemIcon && this.currentItem === item) {
      this.currentItemIcon.setPosition(visualX, visualY)
    }
  }

  moveItemComplete(data: EditorMoveItemCompleteProps) {
    const { item, fromX, fromY } = data

    const oldPosX = fromX
    const oldPosY = fromY
    const oldKey = this.getMapKey(oldPosX, oldPosY)


    const newPosX = item.data.x
    const newPosY = item.data.y
    const newKey = this.getMapKey(newPosX, newPosY)


    const wasDefaultItem = this.defaultItemsPositions.has(oldKey)


    this.removeItemAt(oldPosX, oldPosY, true)


    const placeData: any = { type: item.type }


    if ('dir' in item.data && item.data.dir !== undefined) {
      placeData.dir = item.data.dir
    }
    if ('points' in item.data && item.data.points) {
      placeData.points = item.data.points
    }
    if ('startAt' in item.data && item.data.startAt !== undefined) {
      placeData.startAt = item.data.startAt
    }

    this.placeItemAt(newPosX, newPosY, placeData, wasDefaultItem)


    if (wasDefaultItem) {
      this.defaultItemsPositions.delete(oldKey)
      this.defaultItemsPositions.add(newKey)
    }
  }

  setItemDragging(isDragging: boolean) {
    if (this.currentItemIcon) {
      if (isDragging) {

        this.currentItemIcon.setTint(0x00ff00) // Vert pour indiquer le déplacement
        this.currentItemIcon.setScale(1.2) // Légèrement plus grand
      } else {

        this.currentItemIcon.clearTint()
        this.currentItemIcon.setScale(1)
      }
    }
  }

  updateLevelSize(data: EditorUpdateLevelSizeProps) {
    const { width, height } = data


    this.levelData.world.width = width
    this.levelData.world.height = height


    this.worldWidth = width
    this.worldHeight = height


    const updateNavigationMargin = Math.max(width, height) * 2
    this.cameras.main.setBounds(
      -updateNavigationMargin,
      -updateNavigationMargin,
      updateNavigationMargin * 2,
      updateNavigationMargin * 2
    )


    const updateCenterOffsetX = width / 2
    const updateCenterOffsetY = height / 2
    this.physics.world.setBounds(-updateCenterOffsetX, -updateCenterOffsetY, width, height)
  }

  toggleHitboxes(show: boolean) {

    const groups = [
      this.platforms,
      this.lava,
      this.spikes,
      this.spikyBalls,
      this.coins,
      this.oneWayPlatforms,
      this.cannons,
      this.fallingBlocks,
      this.eventBlocks,
      this.transformers,
      this.enemies,
    ]

    groups.forEach(group => {
      if (group) {
        group.children.entries.forEach((child: any) => {
          if (child.body && 'debugShowBody' in child.body) {
            (child.body as any).debugShowBody = show
          }
        })
      }
    })


    if (this.player && this.player.body && 'debugShowBody' in this.player.body) {
      (this.player.body as any).debugShowBody = show
    }


    if (this.target && this.target.body && 'debugShowBody' in this.target.body) {
      (this.target.body as any).debugShowBody = show
    }
  }

  removeItemAt(x: number, y: number, allowDefault: boolean = false) {
    const key = this.getMapKey(x, y)

    const item = this.itemsMap.get(key)
    if (!item) return


    if (this.defaultItemsPositions.has(key) && !allowDefault) {
      return
    }
    let itemDataGroup

    switch (item.type) {
      case EditorType.Platform:
        this.platforms.remove(item.object, true, true)
        itemDataGroup = this.levelData.platforms
        break
      case EditorType.OneWayPlatform:
        this.oneWayPlatforms.remove(item.object, true, true)
        itemDataGroup = this.levelData.oneWayPlatforms
        break
      case EditorType.Spike:
        this.spikes.remove(item.object, true, true)
        itemDataGroup = this.levelData.spikes
        break
      case EditorType.FallingBlock:
        this.fallingBlocksTriggers.remove(item.object.getTrigger(), true, true)
        this.fallingBlocks.remove(item.object, true, true)
        itemDataGroup = this.levelData.fallingBlocks
        break
      case EditorType.SpikyBall:
        this.spikyBallsStartPos.remove(item.object.getData('placeholder'), true, true)
        this.spikyBalls.remove(item.object, true, true)
        itemDataGroup = this.levelData.spikyBalls
        break
      case EditorType.Cannon:
        item.object.destroyDirImage()
        this.cannons.remove(item.object, true, true)
        itemDataGroup = this.levelData.cannons
        break
      case EditorType.Enemy:
        this.enemiesStartPos.remove(item.object.getData('placeholder'), true, true)
        this.enemies.remove(item.object, true, true)
        itemDataGroup = this.levelData.enemies
        break
      case EditorType.Bump:
        this.bumps.remove(item.object, true, true)
        itemDataGroup = this.levelData.bumps
        break
      case EditorType.Coin:
        this.coins.remove(item.object, true, true)
        itemDataGroup = this.levelData.coins
        break
    }

    this.itemsMap.delete(key)
    if (itemDataGroup) {
      const itemIndex = itemDataGroup.findIndex((item) => item.x === x && item.y === y)
      itemDataGroup.splice(itemIndex, 1)
    }
  }

  removeItem(data: EditorRemoveItemProps) {
    const { worldX, worldY } = data
    const itemPosX = convertPointerToPos(worldX)
    const itemPosY = convertPointerToPos(worldY)

    this.removeItemAt(itemPosX, itemPosY)

    if (this.currentItem && this.currentItem.data.x === itemPosX && this.currentItem.data.y === itemPosY) {
      this.clearCurrentItem()
    }
  }

  placeItems(data: EditorPlaceItemsProps) {
    const { worldX, worldY, cols, rows, type, dir = 0 } = data
    for (let row = 0; row !== rows; row += rows > 0 ? 1 : -1) {
      const y = worldY + row * TILE_SIZE
      for (let col = 0; col !== cols; col += cols > 0 ? 1 : -1) {
        const x = worldX + col * TILE_SIZE
        this.placeItem({
          worldX: x,
          worldY: y,
          type,
          dir,
        })
      }
    }
  }

  placeItemAt(x: number, y: number, data: EditorPlaceAtItemProps, isDefault: boolean = false) {
    const { type, dir, points, startAt } = data
    const offsetX = x + TILE_SIZE / 2
    const offsetY = y + TILE_SIZE / 2
    if (
      (offsetX === this.levelData.player.x && offsetY === this.levelData.player.y) ||
      (offsetX === this.levelData.target.x && offsetY === this.levelData.target.y)
    ) {
      return
    }

    this.removeItemAt(x, y)

    if (type === EditorType.Platform) {
      this.addPlatform({ x, y, width: TILE_SIZE, height: TILE_SIZE }, isDefault)
      this.levelData.platforms.push({ x, y, width: TILE_SIZE, height: TILE_SIZE })
    } else if (type === EditorType.OneWayPlatform) {
      this.addOneWayPlatform({ x, y, width: TILE_SIZE }, isDefault)
      this.levelData.oneWayPlatforms = this.levelData.oneWayPlatforms || []
      this.levelData.oneWayPlatforms.push({ x, y, width: TILE_SIZE })
    } else if (type === EditorType.Bobby) {
      this.levelData.player = { x: x + TILE_SIZE / 2, y: y + TILE_SIZE / 2 }
      this.playerStartPos?.setPosition(this.levelData.player.x, this.levelData.player.y)
    } else if (type === EditorType.Target) {
      this.levelData.target = { x: x + TILE_SIZE / 2, y: y + TILE_SIZE / 2 }
      this.target.moveTo(this.levelData.target.x, this.levelData.target.y)
    } else if (type === EditorType.Spike) {
      this.addSpikes({ x, y, dir })
      this.levelData.spikes = this.levelData.spikes || []
      this.levelData.spikes.push({ x, y, dir })
    } else if (type === EditorType.FallingBlock) {
      this.addFallingBlock({ x, y })
      this.levelData.fallingBlocks = this.levelData.fallingBlocks || []
      this.levelData.fallingBlocks.push({ x, y })
    } else if (type === EditorType.SpikyBall) {
      const data = { x, y, ...(points && { points }), ...(startAt && { startAt }) }
      this.addSpikyBall(data)
      this.levelData.spikyBalls = this.levelData.spikyBalls || []
      this.levelData.spikyBalls.push(data)
    } else if (type === EditorType.Cannon) {
      this.addCannon({ x, y, dir })
      this.levelData.cannons = this.levelData.cannons || []
      this.levelData.cannons.push({ x, y, dir })
    } else if (type === EditorType.Enemy) {
      this.addEnemy({ x, y, dir })
      this.levelData.enemies = this.levelData.enemies || []
      this.levelData.enemies.push({ x, y, dir })
    } else if (type === EditorType.Bump) {
      this.addBump({ x, y })
      this.levelData.bumps = this.levelData.bumps || []
      this.levelData.bumps.push({ x, y })
    } else if (type === EditorType.Coin) {
      this.addCoin({ x, y })
      this.levelData.coins = this.levelData.coins || []
      this.levelData.coins.push({ x, y })
    }

    this.currentItem = this.getItemAt(x, y)
    this.events.emit(EventKey.EditorItemSelected, this.currentItem)
    this.currentItemIcon?.setAlpha(1).setPosition(x, y)
  }

  placeItem(data: EditorPlaceItemProps) {
    const { worldX, worldY, ...rest } = data

    this.placeItemAt(worldX, worldY, rest as EditorPlaceItemProps)
  }

  async exportLevel() {
    const levelData = {
      ...this.levelData,
      platforms: getPlatformsFromGrid(this.levelData.platforms),
      ...(this.levelData.oneWayPlatforms && {
        oneWayPlatforms: getOneWayPlatformsFromGrid(this.levelData.oneWayPlatforms),
      }),
      ...(this.levelData.spikes && { spikes: getSpikesFromGrid(this.levelData.spikes) }),
      ...(this.levelData.fallingBlocks && {
        fallingBlocks: getFallingBlocksFromGrid(this.levelData.fallingBlocks),
      }),
    }

    const levelEncoded = btoa(JSON.stringify(levelData))
    await navigator.clipboard.writeText(levelEncoded)
  }

  importLevel(level: DataLevel, shouldRestart = true) {
    ; (Object.keys(this.levelData) as (keyof DataLevel)[]).forEach((key) => delete this.levelData[key])
    const platformsCells = convertPlatformsToCells(level.platforms)
    Object.assign(this.levelData, {
      ...level,
      platforms: platformsCells,
      ...(level.spikes && { spikes: convertSpikesToCells(level.spikes) }),
      ...(level.fallingBlocks && { fallingBlocks: convertFallingBlocksToCells(level.fallingBlocks) }),
    })

    if (shouldRestart) {
      this.restartGame()
    }
  }

  createPlatformsHitbox() {
    const platforms = getPlatformsFromGrid(this.levelData.platforms)

    this.platformsHitbox.clear(true, true)
    platforms.forEach((col) => {
      const { x, y, width, height } = col
      const platform = this.add.rectangle(x, y, width, height, 0xbe4a2f, 0).setOrigin(0)
      this.platformsHitbox.add(platform)
    })
  }

  toggleEditMode(isEditing: boolean) {
    if (!isEditing) {
      this.cameras.main.startFollow(this.player, true, 0.1, 0.1)
    } else {
      this.cameras.main.stopFollow()
    }
  }

  destroyFireball: Phaser.Types.Physics.Arcade.ArcadePhysicsCallback = (_: any, fireball: any) => {
    fireball.destroy()
  }

  checkWorldBounds() {
    const playerHalfWidth = (this.player.body as Phaser.Physics.Arcade.Body).width / 2
    if (this.player.x - playerHalfWidth < 0) {
      this.player.x = playerHalfWidth
    } else if (this.player.x + playerHalfWidth > this.physics.world.bounds.width) {
      this.player.x = this.physics.world.bounds.width - playerHalfWidth
    }
  }

  startTimer() {
    this.timerStarted = true
    this._canMove = true
    this.events.emit(EventKey.StartTimer)


    this.trackProgression(ProgressionEventType.Start)
  }

  handlePointerDown(pointer: Phaser.Input.Pointer) {

    if (pointer.x > 960) {
      this.checkFirstMove()
      this.player.jump()
    }

    this.handlePointerMove(pointer)
  }

  unlockEventBlocks() {
    this.eventBlocks.clear(true, true)
    this.audioManager.playSfx(AudioKey.SfxUnlock)
  }

  handleBossTrigger() {
    this.freezePlayer()
    this.bossTrigger.destroy()
    this.time.delayedCall(2000, () => {
      this.boss?.fall()
    })
  }

  freezePlayer() {
    this.events.emit(EventKey.ToggleCinematicFrames)
      ; (this.player.body as Phaser.Physics.Arcade.Body).velocity.x = 0
    this._canMove = false
  }

  unfreezePlayer() {
    this.events.emit(EventKey.ToggleCinematicFrames)
    this._canMove = true
  }

  handlePointerMove(pointer: Phaser.Input.Pointer) {
    if (pointer.x < 300) {
      this.touchRight = false
      this.touchLeft = true
    } else if (pointer.x < 600) {
      this.touchRight = true
      this.touchLeft = false
    }
  }

  handlePointerUp(pointer: Phaser.Input.Pointer) {
    if (pointer.x > 600) {
      this.player.resetJump()
      return
    }
    this.resetPointers()
  }

  resetPointers() {
    this.touchLeft = false
    this.touchRight = false
  }

  checkFirstMove() {
    if (!this.isReady || this.timerStarted) return
    this.startTimer()
  }

  checkPlayerRightAbovePlatform() {
    const platformsToCheck = [
      ...this.platformsHitbox.getChildren(),
      ...this.oneWayPlatforms.getChildren(),
      ...this.fallingBlocks.getChildren(),
    ]
    this.playerShadowHitbox.x = this.player.x
    this.playerShadowHitbox.y = this.player.y + TILE_SIZE / 2
      ; (this.playerShadowHitbox.body as Phaser.Physics.Arcade.Body).updateFromGameObject()
    return this.physics.overlap(this.playerShadowHitbox, platformsToCheck)
  }

  teleport() {
    this._canMove = false
      ; (this.player.body as Phaser.Physics.Arcade.Body).enable = false

    this.events.emit(EventKey.LevelEnd, {
      currentLevel: this.currentLevel,
      startedFromCheckpoint: this.startedFromCheckpoint,
    })
    this.audioManager.playSfx(AudioKey.SfxWin)

    if (this.currentLevel && this.currentLevel < Object.keys(levelsData).length) {
      unlockLevel(this.currentLevel + 1)
    }


    this.trackProgression(ProgressionEventType.Complete)

    this.player.teleportTo(this.target, () => {
      if (this.isCustomLevel) {
        this.restartGame()
      } else {
        transitionEventsEmitter.emit(EventKey.TransitionStart)
        transitionEventsEmitter.once(EventKey.TransitionEnd, () => this.scene.start(SceneKey.Levels), this)
      }
    })
  }

  die() {
    if (this.player.isDead) return
    this._canMove = false
    this.platformsCollider.active = false
    this.cannonsCollider.active = false
    this.oneWayPlatformsCollider.active = false
    this.enemiesCollider.active = false
    this.fallingBlocksCollider.active = false
    this.eventBlocksCollider.active = false
    this.fallingBlocksTriggersOverlap.active = false
    this.targetTrigger.active = false
    this.transformersTriggers.active = false
    this.coinsTriggers.active = false
    this.bumpsCollider.active = false
    if (this.checkpointTrigger) {
      this.checkpointTrigger.active = false
    }
    if (this.boss) {
      this.bossCollider.active = false
    }
    this.cameras.main.stopFollow()
    this.audioManager.playSfx(AudioKey.SfxDeath)
    this.events.emit(EventKey.StopTimer)


    if ((this.isSpeedrunMode || this.isEditorPlayingTestMode) && speedrunRecorder.isRecordingActive()) {
      speedrunRecorder.recordDeath({ x: this.player.x, y: this.player.y }, 'fall')
    }

    this.player.die()


    this.trackProgression(ProgressionEventType.Fail)
    this.trackDesign(AnalyticsKey.PlayerDeath)

    this.time.delayedCall(1000, this.lose, [], this)
  }

  handlRestartToggle() {
    if (this.player.isDead) return
    this.restartGame()
  }

  restartGame(data?: object) {
    if (this.isTransitionning) return

    this.isTransitionning = true
    transitionEventsEmitter.emit(EventKey.TransitionStart)
    transitionEventsEmitter.once(EventKey.TransitionEnd, () => this.scene.restart(data), this)
  }

  lose() {
    this.restartGame()
  }

  addCoins() {
    this.coins = this.physics.add.staticGroup()
    const coinsPos = this.levelData.coins || []

    if (this.coinsCollected.length === 0) {
      const totalCoins = getLevelTotalCoins(this.currentLevel ?? this.levelData)
      this.coinsCollected = Array(totalCoins).fill(0)
    }

    let coinIndex = 0
    for (let i = 0; i < coinsPos.length; i++) {
      const { x, y, numX = 1, numY = 1 } = coinsPos[i]
      for (let j = 0; j < Math.max(numX, numY); j++) {
        coinIndex++
        if (this.coinsCollected[coinIndex - 1] === 1) continue
        const isHorizontal = numX >= numY

        const newX = x + (isHorizontal ? TILE_SIZE * j : 0)
        const newY = y + (isHorizontal ? 0 : TILE_SIZE * j)

        const coin = new Coin(
          this,
          newX + (TILE_SIZE - COIN_SIZE) / 2,
          newY + (TILE_SIZE - COIN_SIZE) / 2,
          coinIndex - 1
        )

        this.coins.add(coin)
        this.addMapItem(x, y, { type: EditorType.Coin, object: coin, data: { x: newX, y: newY } })
      }
    }
  }

  addCoin(data: LevelCoin) {
    const { x, y } = data
    const coin = new Coin(this, x + (TILE_SIZE - COIN_SIZE) / 2, y + (TILE_SIZE - COIN_SIZE) / 2, 0)
    this.coins.add(coin)
    this.addMapItem(x, y, { type: EditorType.Coin, object: coin, data })
  }

  addPlatform(data: LevelPlatform, isDefault: boolean = false) {
    const { x, y, width, height } = data
    const platform = new Platform(this, x, y, width, height, this.themeColors.platform)
    this.platforms.add(platform)
    this.addMapItem(x, y, { type: EditorType.Platform, object: platform, data }, isDefault)
  }

  addLavaball(data: LevelLavaBall) {
    const { x, y } = data
    const ball = new LavaBall(this, x, y)
    this.lavaballs.add(ball)
  }

  addLava(data: LevelLava) {
    const { x, y, width, height } = data
    const lava = new Lava(this, x, y, width, height)
    this.lava.add(lava)

    const emitter = this.add.particles(x, y, TextureKey.ParticleLava, {
      speed: { min: -40, max: 40 },
      scale: { min: 0.6, max: 1 },
      alpha: { start: 1, end: 0 },
      lifespan: 1000,
      frequency: 100,
      quantity: 5,
    })
    emitter.addEmitZone({
      type: 'random',
      quantity: 5,
      source: new Phaser.Geom.Rectangle(0, -TILE_SIZE / 2, width, TILE_SIZE),
    })
  }

  addCannon(data: LevelCannon) {
    const { x, y, dir = 0 } = data
    const cannon = new Cannon(this, x, y, dir, this.fireballs, this.isCustomLevel && !this.isCustomLevelRun)
    this.cannons.add(cannon)
    this.addMapItem(x, y, { type: EditorType.Cannon, object: cannon, data })
  }

  addBump(data: LevelBump) {
    const { x, y } = data
    const bump = new Bump(this, x, y)
    this.bumps.add(bump)
    this.addMapItem(x, y, { type: EditorType.Bump, object: bump, data })
  }

  addMapItem(x: number, y: number, item: EditorItem, isDefault: boolean = false) {
    if (!this.isCustomLevel) return

    const key = this.getMapKey(x, y)

    if (this.itemsMap.has(key)) {
      const oldItem = this.itemsMap.get(key)
      if (oldItem && oldItem.object) {
        this.removeItemFromGroup(oldItem)
      }
    }

    this.itemsMap.set(key, item)

    if (isDefault) {
      this.defaultItemsPositions.add(key)
    }
  }

  rebuildItemsMap() {
    if (!this.isCustomLevel) return

    this.itemsMap.clear()
    this.defaultItemsPositions.clear()

    const platformsPos = this.levelData.platforms || []
    platformsPos.forEach(pos => {
      const platform = this.platforms.children.entries.find((p: any) =>
        Math.abs(p.x - pos.x) < 5 && Math.abs(p.y - pos.y) < 5
      )
      if (platform) {
        this.addMapItem(pos.x, pos.y, { type: EditorType.Platform, object: platform as Platform, data: pos }, false)
      }
    })

    const oneWayPlatformsPos = this.levelData.oneWayPlatforms || []
    oneWayPlatformsPos.forEach(pos => {
      const platform = this.oneWayPlatforms.children.entries.find((p: any) =>
        Math.abs(p.x - pos.x) < 1 && Math.abs(p.y - pos.y) < 1
      )
      if (platform) {
        this.addMapItem(pos.x, pos.y, { type: EditorType.OneWayPlatform, object: platform as OneWayPlatform, data: pos }, false)
      }
    })

    const spikesPos = this.levelData.spikes || []
    spikesPos.forEach(pos => {
      const spike = this.spikes.children.entries.find((s: any) =>
        Math.abs(s.x - pos.x) < 1 && Math.abs(s.y - pos.y) < 1
      )
      if (spike) {
        this.addMapItem(pos.x, pos.y, { type: EditorType.Spike, object: spike as Spike, data: pos }, false)
      }
    })

    const fallingBlocksPos = this.levelData.fallingBlocks || []
    fallingBlocksPos.forEach(pos => {
      const block = this.fallingBlocks.children.entries.find((b: any) =>
        Math.abs(b.x - pos.x) < 1 && Math.abs(b.y - pos.y) < 1
      )
      if (block) {
        this.addMapItem(pos.x, pos.y, { type: EditorType.FallingBlock, object: block as FallingBlock, data: pos }, false)
      }
    })

    const spikyBallsPos = this.levelData.spikyBalls || []
    spikyBallsPos.forEach(pos => {
      const ball = this.spikyBalls.children.entries.find((b: any) =>
        Math.abs(b.x - pos.x) < 1 && Math.abs(b.y - pos.y) < 1
      )
      if (ball) {
        this.addMapItem(pos.x, pos.y, { type: EditorType.SpikyBall, object: ball as SpikyBall, data: pos }, false)
      }
    })

    const cannonsPos = this.levelData.cannons || []
    cannonsPos.forEach(pos => {
      const cannon = this.cannons.children.entries.find((c: any) =>
        Math.abs(c.x - pos.x) < 1 && Math.abs(c.y - pos.y) < 1
      )
      if (cannon) {
        this.addMapItem(pos.x, pos.y, { type: EditorType.Cannon, object: cannon as Cannon, data: pos }, false)
      }
    })

    const enemiesPos = this.levelData.enemies || []
    enemiesPos.forEach(pos => {
      const enemy = this.enemies.children.entries.find((e: any) =>
        Math.abs(e.x - pos.x) < 1 && Math.abs(e.y - pos.y) < 1
      )
      if (enemy) {
        this.addMapItem(pos.x, pos.y, { type: EditorType.Enemy, object: enemy as Phaser.GameObjects.Sprite, data: pos }, false)
      }
    })

    const bumpsPos = this.levelData.bumps || []
    bumpsPos.forEach(pos => {
      const bump = this.bumps.children.entries.find((b: any) =>
        Math.abs(b.x - pos.x) < 1 && Math.abs(b.y - pos.y) < 1
      )
      if (bump) {
        this.addMapItem(pos.x, pos.y, { type: EditorType.Bump, object: bump as Bump, data: pos }, false)
      }
    })

    const coinsPos = this.levelData.coins || []
    coinsPos.forEach(pos => {
      const coin = this.coins.children.entries.find((c: any) =>
        Math.abs(c.x - pos.x) < 1 && Math.abs(c.y - pos.y) < 1
      )
      if (coin) {
        this.addMapItem(pos.x, pos.y, { type: EditorType.Coin, object: coin as Coin, data: pos }, false)
      }
    })
  }

  private removeItemFromGroup(item: EditorItem) {

    if (!item.object) return

    switch (item.type) {
      case EditorType.Platform:
        this.platforms.remove(item.object, false, false)
        break
      case EditorType.OneWayPlatform:
        this.oneWayPlatforms.remove(item.object, false, false)
        break
      case EditorType.Spike:
        this.spikes.remove(item.object, false, false)
        break
      case EditorType.Coin:
        this.coins.remove(item.object, false, false)
        break
      case EditorType.Enemy:
        this.enemies.remove(item.object, false, false)
        break
      case EditorType.FallingBlock:
        this.fallingBlocks.remove(item.object, false, false)
        break
      case EditorType.SpikyBall:
        this.spikyBalls.remove(item.object, false, false)
        break
      case EditorType.Cannon:
        this.cannons.remove(item.object, false, false)
        break
      case EditorType.Bump:
        this.bumps.remove(item.object, false, false)
        break



    }
  }

  public getMapKey(x: number, y: number) {
    return `${x}_${y}`
  }

  public getAllObjects(): EditorItem[] {
    const allObjects: EditorItem[] = []


    this.itemsMap.forEach((item) => {
      allObjects.push(item)
    })

    return allObjects
  }

  public getCurrentGridSize(): number {

    const editorScene = this.scene.get(SceneKey.Editor) as any
    return editorScene?.gridSize || TILE_SIZE
  }



  public debugItemsMap() {
    console.log('=== DEBUG ITEMS MAP ===')
    console.log(`Total items: ${this.itemsMap.size}`)
    console.log(`Default items: ${this.defaultItemsPositions.size}`)
    console.log(`Current grid size: ${this.getCurrentGridSize()}`)
    console.log(`World size: ${this.worldWidth}x${this.worldHeight}`)
    console.log(`Current item: ${this.currentItem ? `${this.currentItem.type} at (${this.currentItem.data.x}, ${this.currentItem.data.y})` : 'NONE'}`)

    this.itemsMap.forEach((item, key) => {
      const objectExists = item.object ? 'EXISTS' : 'MISSING'
      const isDefault = this.defaultItemsPositions.has(key) ? 'DEFAULT' : 'USER'
      const objectVisible = item.object && item.object.visible !== false ? 'VISIBLE' : 'HIDDEN'
      console.log(`Key: ${key}, Type: ${item.type}, Pos: (${item.data.x}, ${item.data.y}), Object: ${objectExists}, Status: ${isDefault}, Visibility: ${objectVisible}`)
    })
    console.log('========================')
  }

  public cleanupPhantomObjects() {
    console.log('=== CLEANING UP PHANTOM OBJECTS ===')
    const keysToRemove: string[] = []

    this.itemsMap.forEach((item, key) => {
      if (!item.object) {
        console.log(`Removing phantom object: ${key}`)
        keysToRemove.push(key)
      }
    })

    keysToRemove.forEach(key => {
      this.itemsMap.delete(key)
      this.defaultItemsPositions.delete(key)
    })

    console.log(`Cleaned up ${keysToRemove.length} phantom objects`)
    console.log('=====================================')
  }

  addOneWayPlatform(data: LevelOneWayPlatform, isDefault: boolean = false) {
    const { x, y, width, points } = data
    const platform = new OneWayPlatform(this, x, y, width, points)
    this.oneWayPlatforms.add(platform)
    this.addMapItem(x, y, { type: EditorType.OneWayPlatform, object: platform, data }, isDefault)
  }

  stickPlayerToPlatform: Phaser.Types.Physics.Arcade.ArcadePhysicsCallback = (_: any, platform: any) => {
    if (!(platform as OneWayPlatform).isMoving || this.player.stickedPlatform) return
    this.player.stickedPlatform = platform
  }

  addSpikes(data: LevelSpike) {
    const { x, y, dir = 0, num = 1 } = data

    for (let i = 0; i < num; i++) {
      const isVertical = dir === 1 || dir === 3
      const spike = new Spike(
        this,
        x + TILE_SIZE / 2 + (!isVertical ? TILE_SIZE * i : 0),
        y + TILE_SIZE / 2 + (isVertical ? TILE_SIZE * i : 0),
        dir
      )

      this.spikes.add(spike)
      this.addMapItem(x, y, { type: EditorType.Spike, object: spike, data })
    }
  }

  addSpikyBall(data: LevelSpikyBall) {
    const { x, y, points, startAt = 0 } = data
    let spikyBall


    if (points) {
      spikyBall = new MovingSpikyBall(this, x, y, points, startAt)
      if (this.isCustomLevel && !this.isCustomLevelRun) {
        const startPos = this.add.image(x, y, TextureKey.SpikyBall).setOrigin(0).setAlpha(0.25)
        spikyBall.setData('placeholder', startPos)
        this.spikyBallsStartPos.add(startPos)
      }
    } else {
      spikyBall = new SpikyBall(this, x, y)
    }

    this.spikyBalls.add(spikyBall)
    this.addMapItem(x, y, { type: EditorType.SpikyBall, object: spikyBall, data })
  }

  addEnemy(data: LevelEnemy) {
    const { x, y, dir = 1, type = 1, jumps = 1 } = data
    let enemy: Phaser.GameObjects.Sprite | Phaser.GameObjects.Rectangle

    if (type === 2) {
      enemy = this.add.sprite(x, y, TextureKey.Enemy2).setOrigin(0)
      enemy.setData('jumpCount', 0)
    } else {
      enemy = this.add.rectangle(x, y, TILE_SIZE, TILE_SIZE, 0xff0044).setOrigin(0)
      if (this.isCustomLevel && !this.isCustomLevelRun) {
        const startPos = this.add.rectangle(x, y, TILE_SIZE, TILE_SIZE, 0xff0044).setOrigin(0).setAlpha(0.25)
        enemy.setData('placeholder', startPos)
        this.enemiesStartPos.add(startPos)
      }
    }

    enemy.setData('dir', dir)
    enemy.setData('type', type)

    this.physics.add.existing(enemy)
    if (type === 2) {
      const body = enemy.body as Phaser.Physics.Arcade.Body
      body.setCircle(enemy.displayWidth / 3)
      body.setOffset(enemy.displayWidth / 6, enemy.displayWidth / 3)
      this.time.addEvent({
        callbackScope: this,
        delay: ENEMY2_JUMP_DELAY,
        loop: true,
        callback: () => {
          let jumpCount = (enemy as Phaser.GameObjects.Sprite).getData('jumpCount') + 1
          let dir = (enemy as Phaser.GameObjects.Sprite).getData('dir')
          if (jumpCount > jumps) {
            dir *= -1
            jumpCount = 1
          }
          body.setVelocity(246 * dir, -1040)
            ; (enemy as Phaser.GameObjects.Sprite).setData('jumpCount', jumpCount)
            ; (enemy as Phaser.GameObjects.Sprite).setData('dir', dir)
        },
      })
    }

    this.enemies.add(enemy)
    this.addMapItem(x, y, { type: EditorType.Enemy, object: enemy, data })
  }

  addEventBlock(group: Phaser.Physics.Arcade.StaticGroup, data: LevelEventBlock) {
    const { x, y, width = TILE_SIZE, height = TILE_SIZE } = data
    const eventBlock = new EventBlock(this, x, y, width, height)
    eventBlock.setOrigin(0)
    group.add(eventBlock)
  }

  addFallingBlock(data: LevelFallingBlock) {
    const { x, y, num = 1 } = data
    for (let i = 0; i < num; i++) {
      const trigger = this.add.rectangle(x + TILE_SIZE * i, y - 1, TILE_SIZE, TILE_SIZE)
      trigger.setOrigin(0)
      const fallingBlock = new FallingBlock(this, x + TILE_SIZE * i + 1, y, trigger)
      this.fallingBlocks.add(fallingBlock)
      trigger.setData('block', fallingBlock)
      this.fallingBlocksTriggers.add(trigger)
      this.addMapItem(x, y, { type: EditorType.FallingBlock, object: fallingBlock, data })
    }
  }

  handleFallingBlockCollision: Phaser.Types.Physics.Arcade.ArcadePhysicsCallback = (
    _: any,
    fallingBlockTrigger: any
  ) => {
    const fallingBlock = fallingBlockTrigger.getData('block') as FallingBlock
    if (!(this.player.body as Phaser.Physics.Arcade.Body).blocked.down || fallingBlockTrigger.getData('isTriggered'))
      return
    fallingBlockTrigger.setData('isTriggered', true)
    fallingBlock.fall()
  }

  handleCoin: Phaser.Types.Physics.Arcade.ArcadePhysicsCallback = (_: any, object: any) => {
    const coin = object as Coin
    this.coinsEmitter.setPosition(coin.x, coin.y)
    this.coinsEmitter.explode(8)
    this.events.emit(EventKey.CollectCoin)
    this.audioManager.playSfx(AudioKey.SfxCoin)


    if ((this.isSpeedrunMode || this.isEditorPlayingTestMode) && speedrunRecorder.isRecordingActive()) {
      speedrunRecorder.recordCoin(coin.collectedIndex, { x: coin.x, y: coin.y })
    }

    if (!this.isCustomLevel) {
      this.coinsCollected[coin.collectedIndex] = 1
    }

    this.trackDesign(AnalyticsKey.CoinCollected)

    coin.destroy()
  }

  handleBossCollision() {
    const hasCollidedFromAbove = isTouchingFromAbove(this.player, this.boss!)
    if (hasCollidedFromAbove && this.boss!.isHittable) {

      this.boss!.hit()
      this.player.jumpOffObstacle(BOSS_BOUNCE_VELOCITY)

      if (!this.boss!.isDead) {
        this.toggleOneWayPlatforms()
        this.time.delayedCall(5000, this.toggleOneWayPlatforms, undefined, this)
      }
    } else {
      this.die.call(this)
    }
  }

  toggleOneWayPlatforms() {
    if (this.player.isDead) return
    const isActive = !this.oneWayPlatformsCollider.active
    this.oneWayPlatformsCollider.active = isActive
    this.oneWayPlatforms.getChildren().forEach((platform) => {
      this.tweens.add({
        targets: platform,
        alpha: isActive ? 1 : 0.5,
        duration: 500,
      })
    })
  }

  handleBumpJump: Phaser.Types.Physics.Arcade.ArcadePhysicsCallback = (_: any, object: any) => {
    const bump = object as Bump
    bump.disappear()
    this.player.jumpOffObstacle(BUMP_OFF_VELOCITY)
  }

  handleEnemiesCollision: Phaser.Types.Physics.Arcade.ArcadePhysicsCallback = (_: any, object: any) => {
    const enemy = object as Phaser.GameObjects.Sprite
    if (this.player.isDead || enemy.getData('isDead')) return

    const hasCollidedFromAbove = isTouchingFromAbove(this.player, enemy)
    if (hasCollidedFromAbove && enemy.getData('type') === 1) {
      enemy.setData('isDead', true)
        ; (enemy.body as Phaser.Physics.Arcade.Body).setVelocityX(0)

      this.tweens.add({
        targets: enemy,
        duration: 300,
        scale: 0,
        ease: 'Back.In',
        onComplete: () => {
          enemy.destroy()
        },
      })

      this.player.jumpOffObstacle()


      this.trackDesign(AnalyticsKey.EnemyKilled)

      return
    }

    this.die.call(this)
  }

  trackProgression(type: ProgressionEventType) {
    if (this.isCustomLevel || !this.currentLevel) {
      return
    }
    addProgressionEvent(type, Math.ceil(this.currentLevel / NUM_LEVELS_BY_WORLD), this.currentLevel)
  }

  trackDesign(name: AnalyticsKey) {
    if (this.isCustomLevel) {
      return
    }
    addDesignEvent(name)
  }

  handleCheckpoint() {
    if (this.isCheckpointActive || this.player.isDead) return
    this.isCheckpointActive = true
    this.checkpointTrigger.active = false
    this.registry.set(DataKey.IsCheckpointActive, true)
    this.registry.set(DataKey.CoinsCollected, [...this.coinsCollected])


    if ((this.isSpeedrunMode || this.isEditorPlayingTestMode) && speedrunRecorder.isRecordingActive()) {
      speedrunRecorder.recordCheckpoint({ x: this.checkpoint.x, y: this.checkpoint.y })
    }

    this.audioManager.playSfx(AudioKey.SfxCheckpoint)
    this.tweens.add({
      targets: this.checkpointFlag,
      y: this.checkpointFlag.y - 120,
      duration: 1000,
      ease: 'Cubic.Out',
    })
  }

  handleTransformerCheck: Phaser.Types.Physics.Arcade.ArcadePhysicsCallback = (_: any, object: any) => {
    const transformer = object as Phaser.GameObjects.GameObject
    if (this._playerMode === transformer.getData('mode')) return

    this._playerMode = this._playerMode === PlayerMode.Platformer ? PlayerMode.Flappy : PlayerMode.Platformer
    if (this._playerMode === PlayerMode.Flappy) {
      this.player.enterFlappyMode()
    } else {
      this.tweens.add({
        targets: this.player.sprite,
        angle: 0,
        duration: 200,
        ease: 'Cubic.easeOut',
      })
    }
  }

  handleMovingPlatforms(_: number, delta: number) {

    const playerBody = this.player.body as Phaser.Physics.Arcade.Body
    this.stickedPlatform = this.player.stickedPlatform
    this.stickedVelocityX = 0
    if (this.stickedPlatform && !playerBody.touching.down) {
      this.stickedPlatform = null
      this.player.stickedPlatform = null
    }

    this.oneWayPlatforms
      .getChildren()
      .filter((platform) => (platform as OneWayPlatform).isMoving)
      .forEach((object) => {
        const platform = object as OneWayPlatform
        const previousX = platform.x
        const follower = platform.follower!
        follower.path.getPoint(follower.t, follower.vec)
        const deltaX = follower.vec.x - platform.x
        const deltaY = follower.vec.y - platform.y
        platform.setPosition(follower.vec.x, follower.vec.y)
        follower.t += delta / 5000
        if (follower.t >= 1) {
          follower.t = 0
        }


        if (this.stickedPlatform === platform) {
          this.player.y += deltaY
          this.stickedVelocityX = (platform.x - previousX) / (delta / 1000)
          if (playerBody.velocity.x === 0) {
            this.player.x += deltaX


            if (
              this.player.x - playerBody.halfWidth < this.stickedPlatform.x ||
              this.player.x + playerBody.halfWidth > this.stickedPlatform.x
            ) {
              const x =
                this.stickedVelocityX > 0
                  ? this.player.x + playerBody.halfWidth
                  : this.player.x - playerBody.halfWidth - 10
              const rectDetection = new Phaser.Geom.Rectangle(x, this.player.y, 10, playerBody.halfHeight)
              const collidingPlatforms = this.platformsHitbox
                .getChildren()
                .filter((platform) =>
                  Phaser.Geom.Intersects.RectangleToRectangle(
                    rectDetection,
                    (platform as Phaser.GameObjects.Sprite).getBounds()
                  )
                )

              if (collidingPlatforms.length) {
                const platformToCheck = collidingPlatforms[0] as Phaser.GameObjects.Sprite
                if (this.stickedVelocityX > 0 && this.player.x + playerBody.halfWidth > platformToCheck.x) {
                  this.player.x = platformToCheck.x - playerBody.halfWidth
                } else if (
                  this.stickedVelocityX < 0 &&
                  this.player.x - playerBody.halfWidth < platformToCheck.x + platformToCheck.width
                ) {
                  this.player.x = platformToCheck.x + platformToCheck.width + playerBody.halfWidth
                }
              }
            }
          }
        }
      })
  }

  private createInfoPanel() {

    this.add.text(1790, 1030, 'Forked by Puparia', {
      fontSize: '14px',
      color: '#ffffff',
      fontFamily: 'Arial'
    }).setScrollFactor(0).setDepth(1000)

    this.add.text(1790, 1050, 'v1.1.0 • 14/09/2025', {
      fontSize: '11px',
      color: '#aaaaaa',
      fontFamily: 'Arial'
    }).setScrollFactor(0).setDepth(1000)
  }

  updateGridDisplay() {
    this.gridGraphics.clear()


    if (!this.showGrid || !this.isCustomLevel || this.isCustomLevelRun) return

    const camera = this.cameras.main


    const viewLeft = camera.scrollX
    const viewTop = camera.scrollY
    const viewRight = camera.scrollX + camera.width
    const viewBottom = camera.scrollY + camera.height


    const gridLeft = Math.floor(viewLeft / TILE_SIZE) * TILE_SIZE
    const gridTop = Math.floor(viewTop / TILE_SIZE) * TILE_SIZE
    const gridRight = Math.ceil(viewRight / TILE_SIZE) * TILE_SIZE
    const gridBottom = Math.ceil(viewBottom / TILE_SIZE) * TILE_SIZE

    this.gridGraphics.lineStyle(1, 0x666666, 0.5)


    for (let x = gridLeft; x <= gridRight; x += TILE_SIZE) {
      this.gridGraphics.moveTo(x, gridTop)
      this.gridGraphics.lineTo(x, gridBottom)
    }


    for (let y = gridTop; y <= gridBottom; y += TILE_SIZE) {
      this.gridGraphics.moveTo(gridLeft, y)
      this.gridGraphics.lineTo(gridRight, y)
    }

    this.gridGraphics.strokePath()
  }

  toggleGrid(show: boolean) {

    if (!this.isCustomLevel || this.isCustomLevelRun) return

    this.showGrid = show
    this.updateGridDisplay()
  }

  updateBackgroundSize() {

    if (!this.isCustomLevel || this.isCustomLevelRun) return

    const bounds = this.calculateMapBounds()


    const finalWidth = Math.max(bounds.width, this.worldWidth)
    const finalHeight = Math.max(bounds.height, this.worldHeight)


    const centerX = (bounds.minX + bounds.maxX) / 2
    const centerY = (bounds.minY + bounds.maxY) / 2


    if (this.background) {
      this.background.setSize(finalWidth, finalHeight)
      this.background.setPosition(centerX, centerY)
    }
  }

  calculateMapBounds() {
    let minX = 0
    let minY = 0
    let maxX = this.worldWidth
    let maxY = this.worldHeight


    const groups = [
      this.platforms,
      this.spikes,
      this.spikyBalls,
      this.coins,
      this.oneWayPlatforms,
      this.cannons,
      this.fallingBlocks,
      this.eventBlocks,
      this.transformers,
      this.enemies,
      this.lava,
      this.lavaballs
    ]

    groups.forEach(group => {
      if (group && group.children) {
        group.children.entries.forEach((child: any) => {
          if (child.x !== undefined && child.y !== undefined) {
            const childWidth = child.width || child.displayWidth || TILE_SIZE
            const childHeight = child.height || child.displayHeight || TILE_SIZE

            minX = Math.min(minX, child.x - childWidth / 2)
            minY = Math.min(minY, child.y - childHeight / 2)
            maxX = Math.max(maxX, child.x + childWidth / 2)
            maxY = Math.max(maxY, child.y + childHeight / 2)
          }
        })
      }
    })


    const margin = TILE_SIZE * 2
    return {
      minX: minX - margin,
      minY: minY - margin,
      maxX: maxX + margin,
      maxY: maxY + margin,
      width: maxX - minX + margin * 2,
      height: maxY - minY + margin * 2
    }
  }

  getObjectCounts() {
    return {
      platforms: (this.levelData.platforms || []).length,
      fallingBlocks: (this.levelData.fallingBlocks || []).length,
      oneWayPlatforms: (this.levelData.oneWayPlatforms || []).length,
      spikes: (this.levelData.spikes || []).length,
      spikyBalls: (this.levelData.spikyBalls || []).length,
      cannons: (this.levelData.cannons || []).length,
      enemies: (this.levelData.enemies || []).length,
      bumps: (this.levelData.bumps || []).length,
      coins: (this.levelData.coins || []).length
    }
  }

  teleportToPlayer() {
    console.log('🎮 GameScene: Tentative de téléport vers Bobby...', {
      player: !!this.player,
      playerX: this.player?.x,
      playerY: this.player?.y,
      cameraX: this.cameras.main.scrollX,
      cameraY: this.cameras.main.scrollY
    })

    if (this.player && this.player.x !== undefined && this.player.y !== undefined) {
      const playerX = this.player.x
      const playerY = this.player.y
      console.log('🎮 GameScene: Position de Bobby trouvée:', { x: playerX, y: playerY })


      const editorScene = this.scene.get(SceneKey.Editor) as any
      if (editorScene && editorScene.gameCamera) {
        editorScene.gameCamera.centerOn(playerX, playerY)
        console.log('🎮 GameScene: Caméra de l\'EditorScene centrée sur Bobby - Nouvelle position:', {
          x: editorScene.gameCamera.scrollX,
          y: editorScene.gameCamera.scrollY
        })
      } else {
        console.log('🎮 GameScene: EditorScene ou gameCamera non trouvé')
      }
    } else {
      console.log('🎮 GameScene: Bobby pas encore chargé, réessai dans 200ms')

      this.time.delayedCall(200, () => {
        this.teleportToPlayer()
      })
    }
  }
}
