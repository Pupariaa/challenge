import DataKey from '../consts/data-key'
import {
  EditorType,
  EditorTypeButtons,
  EditorMode,
  EditorModeButtons,
  EditorRectInfo,
  EditorItem,
  EditorToolButtons,
  EditorTool,
  EDITOR_TYPE_TOOLS,
} from '../consts/editor'
import EventKey from '../consts/event-key'
import { TILE_SIZE } from '../consts/globals'
import { GameMode } from '../consts/level'
import SceneKey from '../consts/scene-key'
import { IconsKey } from '../consts/texture-key'
import IconButton from '../objects/ui/icon-button'
import NumberChoice from '../objects/ui/number-choice'
import { convertPointerToPos } from '../utils/editor'
import { transitionEventsEmitter } from '../utils/transition'
import GameScene from './game-scene'

export default class EditorScene extends Phaser.Scene {
  private dragStartPoint: Phaser.Math.Vector2 | null = null
  private cameraStartPoint: Phaser.Math.Vector2 | null = null
  private gameScene!: GameScene
  private gameCamera!: Phaser.Cameras.Scene2D.Camera
  private isEditing!: boolean
  private isDrawing!: boolean
  private btnToggle!: IconButton
  private mode!: EditorMode
  private type!: EditorType
  private editButtonsPanel!: Phaser.GameObjects.Container
  private editButtons!: EditorModeButtons
  private toolButtonsPanel!: Phaser.GameObjects.Container
  private toolButtons!: EditorToolButtons
  private typeButtons!: EditorTypeButtons
  private rectGraphics!: Phaser.GameObjects.Graphics
  private rectInfo: EditorRectInfo | null = null
  private spikeDir!: number
  private cannonDir!: number
  private isCustomLevelRun!: boolean
  private spaceKey: Phaser.Input.Keyboard.Key | undefined
  private currentItem: EditorItem | null = null
  private moveX!: number
  private moveY!: number
  private startAt!: number
  private isDraggingItem: boolean = false
  private itemDragStartPoint: Phaser.Math.Vector2 | null = null
  private itemDragOffset: Phaser.Math.Vector2 | null = null
  private levelWidth!: number
  private levelHeight!: number
  private showGrid: boolean = true
  private levelSizePanel!: Phaser.GameObjects.Container
  private choiceLevelWidth!: NumberChoice
  private choiceLevelHeight!: NumberChoice
  private history: any[] = []
  private historyIndex: number = -1
  private maxHistorySize: number = 50
  private zoomLevel: number = 1
  private minZoom: number = 0.2
  private maxZoom: number = 3
  private zoomStep: number = 0.2

  constructor() {
    super({ key: SceneKey.Editor })
  }

  create() {
    const { width, height } = this.scale
    this.isCustomLevelRun = this.registry.get(DataKey.IsCustomLevelRun)

    this.isEditing = true

    this.isDrawing = false
    this.scene.pause(SceneKey.Game)
    this.gameScene = this.scene.get(SceneKey.Game) as GameScene
    if (this.gameScene) {
      this.gameCamera = this.gameScene.cameras.main
      if (this.gameCamera) {
        this.gameCamera.stopFollow()
      }
    }


    this.time.delayedCall(100, () => {
      this.teleportToPlayer()
    })
    this.rectGraphics = this.add.graphics()
    this.spikeDir = 0
    this.cannonDir = 0
    this.moveX = 0
    this.moveY = 0


    this.levelWidth = this.gameScene.worldWidth
    this.levelHeight = this.gameScene.worldHeight




    this.time.delayedCall(100, () => {
      this.saveToHistory()
    })

    this.input.on('pointerdown', this.handlePointerDown, this)
    this.input.on('pointermove', this.handlePointerMove, this)
    this.input.on('pointerup', this.handlePointerUp, this)
    this.input.on('wheel', this.handleWheel, this)
    this.spaceKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE)


    this.input.keyboard?.on('keydown-CONTROL', () => {
      this.input.keyboard?.on('keydown-Z', this.undo, this)
      this.input.keyboard?.on('keydown-Y', this.redo, this)
    })
    this.input.keyboard?.on('keyup-CONTROL', () => {
      this.input.keyboard?.off('keydown-Z', this.undo, this)
      this.input.keyboard?.off('keydown-Y', this.redo, this)
    })

    new IconButton(
      this,
      this.isCustomLevelRun ? 1740 : 1640,
      80,
      this.isCustomLevelRun ? IconsKey.Restart : IconsKey.Play,
      this.playRun
    )
    this.btnToggle = new IconButton(this, 1740, 80, IconsKey.Test, this.toggleEdition)
    new IconButton(this, 1840, 80, IconsKey.Close, this.quit)
    const btnSelect = new IconButton(this, 380, 80, IconsKey.Select, () => {
      this.selectMode(EditorMode.Select)
    })
    const btnMove = new IconButton(this, 480, 80, IconsKey.Move, () => {
      this.selectMode(EditorMode.Move)
    })
    btnMove.isSelected = true
    const btnEraser = new IconButton(this, 580, 80, IconsKey.Eraser, () => {
      this.selectMode(EditorMode.Eraser)
    })
    const btnDraw = new IconButton(this, 680, 80, IconsKey.Edit, () => {
      this.selectMode(EditorMode.Draw)
    })
    const btnRect = new IconButton(this, 780, 80, IconsKey.Rect, () => {
      this.selectMode(EditorMode.Rect)
    })

    this.editButtons = {
      [EditorMode.Select]: btnSelect,
      [EditorMode.Move]: btnMove,
      [EditorMode.Eraser]: btnEraser,
      [EditorMode.Draw]: btnDraw,
      [EditorMode.Rect]: btnRect,
    } as EditorModeButtons
    this.selectMode(EditorMode.Move)

    const btnBobby = new IconButton(this, 180, 80, IconsKey.Bobby, () => {
      this.selectType(EditorType.Bobby)
    })
    const btnTarget = new IconButton(this, 180, 180, IconsKey.Target, () => {
      this.selectType(EditorType.Target)
    })
    const btnPlatform = new IconButton(this, 80, 80, IconsKey.Platform, () => {
      this.selectType(EditorType.Platform)
    })
    btnPlatform.isSelected = true
    const btnOneWayPlatform = new IconButton(this, 80, 180, IconsKey.OneWayPlatform, () => {
      this.selectType(EditorType.OneWayPlatform)
    })
    const btnFallingBlock = new IconButton(this, 80, 280, IconsKey.FallingBlock, () => {
      this.selectType(EditorType.FallingBlock)
    })
    const btnSpike = new IconButton(this, 80, 380, IconsKey.Spike, () => {
      if (this.type === EditorType.Spike) {
        this.spikeDir = (this.spikeDir + 1) % 4
        btnSpike.rotateIcon()
      } else {
        this.selectType(EditorType.Spike)
      }
    })
    const btnSpikyBall = new IconButton(this, 80, 480, IconsKey.SpikyBall, () => {
      this.selectType(EditorType.SpikyBall)
    })
    const btnCannon = new IconButton(this, 80, 580, IconsKey.Cannon, () => {
      if (this.type === EditorType.Cannon) {
        this.cannonDir = (this.cannonDir + 1) % 4
        btnCannon.rotateIcon()
      } else {
        this.selectType(EditorType.Cannon)
      }
    })
    const btnEnemy = new IconButton(this, 80, 680, IconsKey.Enemy, () => {
      this.selectType(EditorType.Enemy)
    })

    const btnBump = new IconButton(this, 80, 780, IconsKey.Bump, () => {
      this.selectType(EditorType.Bump)
    })

    const btnCoin = new IconButton(this, 80, 880, IconsKey.Coin, () => {
      this.selectType(EditorType.Coin)
    })

    this.typeButtons = {
      [EditorType.Bobby]: {
        btn: btnBobby,
        isMulti: false,
      },
      [EditorType.Target]: {
        btn: btnTarget,
        isMulti: false,
      },
      [EditorType.Platform]: {
        btn: btnPlatform,
        isMulti: true,
      },
      [EditorType.FallingBlock]: {
        btn: btnFallingBlock,
        isMulti: true,
      },
      [EditorType.OneWayPlatform]: {
        btn: btnOneWayPlatform,
        isMulti: true,
      },
      [EditorType.Spike]: {
        btn: btnSpike,
        isMulti: true,
      },
      [EditorType.SpikyBall]: {
        btn: btnSpikyBall,
        isMulti: true,
      },
      [EditorType.Cannon]: {
        btn: btnCannon,
        isMulti: true,
      },
      [EditorType.Enemy]: {
        btn: btnEnemy,
      },
      [EditorType.Bump]: {
        btn: btnBump,
      },
      [EditorType.Coin]: {
        btn: btnCoin,
      },
    } as EditorTypeButtons

    const btnExport = new IconButton(this, 1840, 180, IconsKey.Export, () => {
      this.events.emit(EventKey.EditorExport)
    })
    const btnImport = new IconButton(this, 1840, 280, IconsKey.Import, this.importLevel)
    const btnSave = new IconButton(this, 1840, 380, IconsKey.Save, this.saveLevel)
    const btnOpen = new IconButton(this, 1840, 480, IconsKey.Open, this.openLevel)

    const btnDelete = new IconButton(this, width / 2, height - 80, IconsKey.Delete, () => {
      this.events.emit(EventKey.EditorDeleteCurrent)
    })

    const btnRotate = new IconButton(this, width / 2, height - 80, IconsKey.Restart, () => {
      this.events.emit(EventKey.EditorRotateCurrent)
    })

    const btnDirection = new IconButton(this, width / 2, height - 80, IconsKey.Chevron, () => {
      btnDirection.rotateIcon(180)
      this.events.emit(EventKey.EditorChangeDirCurrent)
    })

    const choiceX = new NumberChoice({
      scene: this,
      x: width / 2,
      y: height - 80,
      title: 'X',
      onUpdate: (value: number) => {
        this.moveX = value
        this.moveY = 0
        this.updateMoveXY()
        this.updateCurrentItem()
      },
    })

    const choiceY = new NumberChoice({
      scene: this,
      x: width / 2,
      y: height - 80,
      title: 'Y',
      onUpdate: (value: number) => {
        this.moveX = 0
        this.moveY = value
        this.updateMoveXY()
        this.updateCurrentItem()
      },
    })

    const choiceStartAt = new NumberChoice({
      scene: this,
      x: width / 2,
      y: height - 80,
      step: 0.05,
      min: 0,
      max: 1,
      title: 'Délai',
      onUpdate: (value: number) => {
        this.startAt = value
        this.updateCurrentItem()
      },
    })

    this.toolButtons = {
      [EditorTool.Delete]: btnDelete,
      [EditorTool.Rotate]: btnRotate,
      [EditorTool.Direction]: btnDirection,
      [EditorTool.MoveX]: choiceX,
      [EditorTool.MoveY]: choiceY,
      [EditorTool.StartAt]: choiceStartAt,
    } as EditorToolButtons

    this.toolButtonsPanel = this.add.container(0, 0, Object.values(this.toolButtons)).setVisible(false)


    this.levelSizePanel = this.add.container(0, 0)

    this.choiceLevelWidth = new NumberChoice({
      scene: this,
      x: 1280,
      y: 80,
      min: 800,
      max: 20000,
      step: 80,
      title: 'Largeur',
      onUpdate: (value: number) => {
        this.levelWidth = value
        this.updateLevelSize()
      },
    })
    this.choiceLevelWidth.value = this.levelWidth

    this.choiceLevelHeight = new NumberChoice({
      scene: this,
      x: 980,
      y: 80,
      min: 600,
      max: 20000,
      step: 80,
      title: 'Hauteur',
      onUpdate: (value: number) => {
        this.levelHeight = value
        this.updateLevelSize()
      },
    })
    this.choiceLevelHeight.value = this.levelHeight

    this.levelSizePanel.add([this.choiceLevelWidth, this.choiceLevelHeight])
    this.levelSizePanel.setVisible(true)
    this.time.delayedCall(500, () => {
      this.loadDefaultLevelIfNeeded()
    })

    const btnResetZoom = new IconButton(this, 1840, 580, IconsKey.RestoreZoom, () => {
      this.resetZoom()
    })

    const btnTeleportToTarget = new IconButton(this, 1840, 680, IconsKey.FindTarget, () => {
      this.teleportToTarget()
    })

    const btnTeleportToPlayer = new IconButton(this, 1840, 780, IconsKey.FindBobby, () => {
      this.teleportToPlayer()
    })



    this.editButtonsPanel = this.add.container(0, 0, [
      btnSelect,
      btnMove,
      btnEraser,
      btnDraw,
      btnRect,
      btnPlatform,
      btnOneWayPlatform,
      btnBobby,
      btnTarget,
      btnSpike,
      btnFallingBlock,
      btnSpikyBall,
      btnCannon,
      btnEnemy,
      btnBump,
      btnCoin,
      btnExport,
      btnImport,
      btnSave,
      btnOpen,
      btnResetZoom,
      btnTeleportToTarget,
      btnTeleportToPlayer,
      this.toolButtonsPanel,
    ])

    if (this.isCustomLevelRun) {
      this.toggleEdition()
      this.btnToggle.disableInteractive().setVisible(false)
    }

    this.selectType(EditorType.Platform)
    this.selectMode(EditorMode.Move)

    this.gameScene.events.on(EventKey.EditorItemSelected, this.handleItemSelected, this)
    this.events.once('shutdown', this.handleShutdown, this)
    this.add.text(1790, 1030, 'Forked by Puparia', {
      fontSize: '14px',
      color: '#ffffff',
      fontFamily: 'Arial'
    }).setScrollFactor(0).setDepth(1000)

    this.add.text(1790, 1050, '1.2.1 • 16/09/2025', {
      fontSize: '11px',
      color: '#aaaaaa',
      fontFamily: 'Arial'
    }).setScrollFactor(0).setDepth(1000)
  }

  handleShutdown() {
    this.events.off(EventKey.EditorItemSelected, this.handleItemSelected, this)
  }

  wake() {

    this.isEditing = true
    this.events.emit(EventKey.EditorToggle, true)
    this.btnToggle.toggleIcon(IconsKey.Edit)
    this.editButtonsPanel.setVisible(true)
    this.scene.stop(SceneKey.HUD)
    this.scene.pause(SceneKey.Game)
    this.registry.set(DataKey.GameMode, GameMode.Classic)
    this.showGrid = true
    this.events.emit(EventKey.EditorToggleGrid, true)
    this.levelSizePanel.setVisible(true)
    this.teleportToPlayer()
  }

  updateCurrentItem() {
    if (!this.currentItem) return
    const { x, y } = this.currentItem.data
    this.events.emit(EventKey.EditorPlaceItem, {
      worldX: x,
      worldY: y,
      type: this.currentItem.type,
      ...(this.moveX !== 0 || this.moveY !== 0
        ? {
          points: [{ x: x + this.moveX * TILE_SIZE, y: y + this.moveY * TILE_SIZE }],
          ...(this.startAt !== 0 ? { startAt: this.startAt } : {}),
        }
        : {}),
    })
    this.saveToHistory()
    this.events.emit(EventKey.EditorUpdateBackground)
  }

  async saveLevel(): Promise<void> {
    try {
      const currentEditorId = localStorage.getItem('currentEditorId')
      const gameScene = this.scene.get(SceneKey.Game) as any
      const levelData = gameScene.levelData

      if (!currentEditorId) {
        const levelName = window.prompt('Nom du niveau :', 'Mon niveau')
        if (!levelName || levelName.trim() === '') {
          return
        }

        const newId = this.generateLevelId()
        const levelDataWithName = {
          ...levelData,
          name: levelName.trim(),
          lastModified: new Date().toISOString()
        }

        const base64Data = btoa(JSON.stringify(levelDataWithName))
        localStorage.setItem(`level_${newId}`, base64Data)
        localStorage.setItem('currentEditorId', newId)
      } else {
        const levelDataWithName = {
          ...levelData,
          name: levelData.name || 'Niveau sans nom',
          lastModified: new Date().toISOString()
        }

        const base64Data = btoa(JSON.stringify(levelDataWithName))
        localStorage.setItem(`level_${currentEditorId}`, base64Data)
      }
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error)
    }
  }

  generateLevelId(): string {
    return Math.floor(100000000000 + Math.random() * 900000000000).toString()
  }

  openLevel(): void {
    transitionEventsEmitter.emit(EventKey.TransitionStart)
    transitionEventsEmitter.once(EventKey.TransitionEnd, () => {
      this.scene.start(SceneKey.SavedLevels)
    }, this)
  }

  getSavedLevels(): Array<{ id: string, name: string, lastModified: string }> {
    const levels: Array<{ id: string, name: string, lastModified: string }> = []

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith('level_')) {
        try {
          const base64Data = localStorage.getItem(key)
          if (base64Data) {
            const levelData = JSON.parse(atob(base64Data))
            const id = key.replace('level_', '')
            levels.push({
              id,
              name: levelData.name || 'Niveau sans nom',
              lastModified: levelData.lastModified || 'Date inconnue'
            })
          }
        } catch (error) {
          console.error(`Erreur lors du parsing du niveau ${key}:`, error)
        }
      }
    }

    return levels.sort((a, b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime())
  }

  loadLevel(levelId: string): void {
    try {
      const base64Data = localStorage.getItem(`level_${levelId}`)
      if (!base64Data) {
        alert('Niveau introuvable')
        return
      }
      localStorage.setItem('currentEditorId', levelId)
      this.importLevelFromBase64(base64Data)
    } catch (error) {
      console.error('Erreur lors du chargement:', error)
      alert('Erreur lors du chargement du niveau')
    }
  }

  importLevelFromBase64(base64Data: string): void {
    try {
      const levelData = JSON.parse(atob(base64Data))

      this.events.emit(EventKey.EditorImport, levelData)

      if (levelData && typeof levelData === 'object' && 'world' in levelData) {
        const world = levelData.world
        if (world && typeof world.width === 'number' && typeof world.height === 'number') {
          this.levelWidth = world.width
          this.levelHeight = world.height

          if (this.choiceLevelWidth && this.choiceLevelHeight) {
            this.choiceLevelWidth.value = this.levelWidth
            this.choiceLevelHeight.value = this.levelHeight
          }
        }
      }
    } catch (error) {
      console.error('Erreur lors de l\'import:', error)
      alert('Erreur lors de l\'import du niveau')
    }
  }

  async importLevel(): Promise<void> {
    try {
      let clipboardText: string | null = null;

      if (navigator.clipboard && typeof navigator.clipboard.readText === 'function') {
        try {
          clipboardText = await navigator.clipboard.readText();
        } catch { }
      }

      if (!clipboardText || clipboardText.trim() === '') {
        const manualInput = window.prompt('Collez ici les données Base64 du niveau :', '');
        if (!manualInput || manualInput.trim() === '') {
          throw new Error('EmptyInput');
        }
        clipboardText = manualInput.trim();
      }

      const sanitizedText = clipboardText.replace(/\s+/g, '');
      if (!/^[A-Za-z0-9+/=]+$/.test(sanitizedText)) {
        throw new Error('InvalidBase64');
      }

      let decodedString: string;
      try {
        decodedString = atob(sanitizedText);
      } catch {
        throw new Error('DecodeError');
      }

      let parsedObject: unknown;
      try {
        parsedObject = JSON.parse(decodedString);
      } catch {
        throw new Error('JsonParseError');
      }

      this.events.emit(EventKey.EditorImport, parsedObject);


      if (parsedObject && typeof parsedObject === 'object' && 'world' in parsedObject) {
        const world = (parsedObject as any).world
        if (world && typeof world.width === 'number' && typeof world.height === 'number') {
          this.levelWidth = world.width
          this.levelHeight = world.height

          if (this.choiceLevelWidth) this.choiceLevelWidth.value = this.levelWidth
          if (this.choiceLevelHeight) this.choiceLevelHeight.value = this.levelHeight
        }
      }

      this.saveToHistory();
      this.events.emit(EventKey.EditorUpdateBackground);


      this.registry.set('justImportedMap', true);
    } catch {
    }
  }

  handleItemSelected(item: EditorItem | null) {
    this.currentItem = item
    if (!item) {
      this.toolButtonsPanel.setVisible(false)

      this.isDraggingItem = false
      this.itemDragStartPoint = null
      this.events.emit(EventKey.EditorItemDragging, false)
    } else {

      if (this.mode === EditorMode.Select) {
        this.isDraggingItem = true
        this.itemDragStartPoint = new Phaser.Math.Vector2(item.data.x, item.data.y)
        this.events.emit(EventKey.EditorItemDragging, true)
      }

      const key = this.gameScene.getMapKey(item.data.x, item.data.y)
      const isDefaultItem = this.gameScene.defaultItemsPositions.has(key)

      const tools = [
        ...(isDefaultItem ? [] : [EditorTool.Delete]),
        ...(EDITOR_TYPE_TOOLS[item.type] ? EDITOR_TYPE_TOOLS[item.type]! : [])
      ]
      Object.values(this.toolButtons).forEach((btn) => {
        btn.setVisible(false)
      })

      const toolsToShow = Object.keys(this.toolButtons).filter((key) => tools.includes(key as EditorTool))
      const gap = 20
      const totalWidth =
        toolsToShow.reduce((acc, key) => acc + this.toolButtons[key as EditorTool].width, 0) +
        (toolsToShow.length - 1) * gap
      let startPosX = (this.scale.width - totalWidth) / 2 + TILE_SIZE / 2
      toolsToShow.forEach((key) => {
        const tool = this.toolButtons[key as EditorTool]
        tool.setVisible(true).setPosition(startPosX, this.scale.height - 80)
        startPosX += tool.width + gap
      })
      this.toolButtonsPanel.setVisible(true)

      if (this.currentItem?.type === EditorType.SpikyBall) {
        this.moveX = this.currentItem.data.points
          ? (this.currentItem.data.points[0].x - this.currentItem.data.x) / TILE_SIZE
          : 0
        this.moveY = this.currentItem.data.points
          ? (this.currentItem.data.points[0].y - this.currentItem.data.y) / TILE_SIZE
          : 0
        this.updateMoveXY()
        this.startAt = this.currentItem.data.startAt || 0
          ; (this.toolButtons[EditorTool.StartAt] as NumberChoice).value = this.startAt
      }

      if (this.currentItem?.type === EditorType.Enemy) {
        const dir = this.currentItem.data.dir ?? 1
          ; (this.toolButtons[EditorTool.Direction] as IconButton).setIconRotation(dir === 1 ? 0 : 180)
      }
    }
  }

  updateMoveXY() {
    ; (this.toolButtons[EditorTool.MoveX] as NumberChoice).value = this.moveX
      ; (this.toolButtons[EditorTool.MoveY] as NumberChoice).value = this.moveY
  }

  updateLevelSize() {
    this.events.emit(EventKey.EditorUpdateLevelSize, {
      width: this.levelWidth,
      height: this.levelHeight
    })
  }

  selectType(to: EditorType) {
    this.type = to
    for (const key in this.typeButtons) {
      const item = key as EditorType
      this.typeButtons[item].btn.isSelected = item === to
    }
    this.selectMode(EditorMode.Draw)
  }

  selectMode(to: EditorMode) {
    this.mode = to
    for (const key in this.editButtons) {
      const mode = key as EditorMode
      this.editButtons[mode].isSelected = mode === to
    }

    if (to === EditorMode.Select && this.currentItem) {
      this.isDraggingItem = true
      this.itemDragStartPoint = new Phaser.Math.Vector2(this.currentItem.data.x, this.currentItem.data.y)
      this.events.emit(EventKey.EditorItemDragging, true)
    } else if (to !== EditorMode.Select) {
      this.isDraggingItem = false
      this.itemDragStartPoint = null
      this.events.emit(EventKey.EditorItemDragging, false)
    }
  }

  toggleEdition() {
    this.isEditing = !this.isEditing
    this.events.emit(EventKey.EditorToggle, this.isEditing)
    this.btnToggle.toggleIcon(IconsKey.Edit)
    this.editButtonsPanel.setVisible(this.isEditing)
    if (this.isEditing) {
      this.scene.stop(SceneKey.HUD)
      this.scene.pause(SceneKey.Game)
      this.registry.set(DataKey.GameMode, GameMode.Classic)
      this.showGrid = true
      this.events.emit(EventKey.EditorToggleGrid, true)
      this.levelSizePanel.setVisible(true)

      const gameScene = this.scene.get(SceneKey.Game) as any
      if (gameScene && gameScene.timerStarted !== undefined) {
        gameScene.timerStarted = false
      }

      // Charger la map temporaire si elle existe (retour depuis testPlay)
      this.time.delayedCall(100, () => {
        if (this.loadTemporaryLevelIfExists()) {
        }
        this.teleportToPlayer()
      })
    } else {
      this.events.emit(EventKey.EditorPlaytest)
      this.showGrid = false
      this.events.emit(EventKey.EditorToggleGrid, false)
      this.levelSizePanel.setVisible(false)
    }
  }

  handlePointerDown(pointer: Phaser.Input.Pointer) {
    if (!this.isEditing) return

    if (pointer.button === 1) {
      this.dragStartPoint = new Phaser.Math.Vector2(pointer.x, pointer.y)
      this.cameraStartPoint = new Phaser.Math.Vector2(this.gameCamera.scrollX, this.gameCamera.scrollY)
      return
    }

    if (this.mode === EditorMode.Move || this.spaceKey?.isDown || this.mode === EditorMode.Rect) {
      this.dragStartPoint = new Phaser.Math.Vector2(pointer.x, pointer.y)
      this.cameraStartPoint = new Phaser.Math.Vector2(this.gameCamera.scrollX, this.gameCamera.scrollY)
    } else if (this.mode === EditorMode.Select) {
      const { worldX, worldY } = this.getWorldXY(pointer)
      const snappedX = convertPointerToPos(worldX)
      const snappedY = convertPointerToPos(worldY)
      const itemAtPointer = this.gameScene.getItemAtSnappedPosition(snappedX, snappedY)

      if (itemAtPointer && itemAtPointer === this.currentItem) {
        this.isDraggingItem = true
        this.itemDragStartPoint = new Phaser.Math.Vector2(snappedX, snappedY)
        this.itemDragOffset = new Phaser.Math.Vector2(
          convertPointerToPos(worldX) - snappedX,
          convertPointerToPos(worldY) - snappedY
        )

        this.events.emit(EventKey.EditorItemDragging, true)
      } else {
        this.selectItem(pointer)
      }
    } else if (this.mode === EditorMode.Draw) {
      this.isDrawing = true
      this.emitPlaceItem(pointer)
    } else if (this.mode === EditorMode.Eraser) {
      this.isDrawing = true
      this.emitRemoveItem(pointer)
    }
  }

  handlePointerMove(pointer: Phaser.Input.Pointer) {
    if (!this.isEditing || (this.mode === EditorMode.Rect && !this.typeButtons[this.type].isMulti)) return

    if (pointer.isDown && pointer.button === 1 && this.dragStartPoint && this.cameraStartPoint) {
      const dx = this.dragStartPoint.x - pointer.x
      const dy = this.dragStartPoint.y - pointer.y
      this.gameCamera.scrollX = this.cameraStartPoint.x + dx
      this.gameCamera.scrollY = this.cameraStartPoint.y + dy
      this.events.emit(EventKey.EditorToggleGrid, this.showGrid)
      return
    }

    if (this.isDraggingItem && this.currentItem && this.itemDragStartPoint && this.itemDragOffset) {
      const { worldX, worldY } = this.getWorldXY(pointer)
      const snappedCursorX = convertPointerToPos(worldX)
      const snappedCursorY = convertPointerToPos(worldY)
      const newPosX = snappedCursorX - this.itemDragOffset.x
      const newPosY = snappedCursorY - this.itemDragOffset.y

      if (newPosX !== this.currentItem.data.x || newPosY !== this.currentItem.data.y) {
        const existingItem = this.gameScene.getItemAtSnappedPosition(newPosX, newPosY)
        if (!existingItem || existingItem === this.currentItem) {
          this.currentItem.data.x = newPosX
          this.currentItem.data.y = newPosY
        }
      }

      this.events.emit(EventKey.EditorMoveItem, {
        item: this.currentItem,
        fromX: this.itemDragStartPoint.x,
        fromY: this.itemDragStartPoint.y,
        toX: worldX,
        toY: worldY,
        offsetX: this.itemDragOffset.x,
        offsetY: this.itemDragOffset.y
      })
    } else if ((this.mode === EditorMode.Move || this.spaceKey?.isDown) && this.dragStartPoint && this.cameraStartPoint) {
      const dx = this.dragStartPoint.x - pointer.x
      const dy = this.dragStartPoint.y - pointer.y
      this.gameCamera.scrollX = this.cameraStartPoint.x + dx
      this.gameCamera.scrollY = this.cameraStartPoint.y + dy
    } else if (this.mode === EditorMode.Rect && this.dragStartPoint) {
      this.drawRect(pointer)
    } else if (this.mode === EditorMode.Draw && this.isDrawing) {
      this.emitPlaceItem(pointer)
    } else if (this.mode === EditorMode.Eraser && this.isDrawing) {
      this.emitRemoveItem(pointer)
    }
  }

  handlePointerUp() {
    if (this.isDraggingItem && this.currentItem && this.itemDragStartPoint) {

      this.events.emit(EventKey.EditorMoveItemComplete, {
        item: this.currentItem,
        fromX: this.itemDragStartPoint.x,
        fromY: this.itemDragStartPoint.y
      })
      this.saveToHistory()
      this.events.emit(EventKey.EditorUpdateBackground)


      this.events.emit(EventKey.EditorItemDragging, false)
      this.isDraggingItem = false
      this.itemDragStartPoint = null
      this.itemDragOffset = null
    } else if (this.mode === EditorMode.Rect && this.dragStartPoint && this.rectInfo) {
      this.events.emit(EventKey.EditorPlaceItems, {
        ...this.rectInfo,
        type: this.type,
        ...(this.type === EditorType.Spike && { dir: this.spikeDir }),
      })
      this.saveToHistory()
      this.events.emit(EventKey.EditorUpdateBackground)
    }

    this.isDrawing = false
    this.dragStartPoint = null
    this.rectInfo = null
    this.cameraStartPoint = null
    this.rectGraphics.clear()
  }

  handleWheel(_pointer: Phaser.Input.Pointer, _gameObjects: Phaser.GameObjects.GameObject[], _deltaX: number, deltaY: number, _deltaZ: number) {
    if (!this.isEditing) return


    const zoomChange = deltaY > 0 ? -this.zoomStep : this.zoomStep
    const newZoom = this.zoomLevel + zoomChange


    if (newZoom >= this.minZoom && newZoom <= this.maxZoom) {
      this.zoomLevel = newZoom


      this.gameCamera.setZoom(this.zoomLevel)


      this.events.emit(EventKey.EditorToggleGrid, this.showGrid)
    }
  }

  resetZoom() {
    this.zoomLevel = 1
    this.gameCamera.setZoom(this.zoomLevel)
    this.events.emit(EventKey.EditorToggleGrid, this.showGrid)
  }

  getWorldXY(pointer: Phaser.Input.Pointer) {
    const camera = this.gameCamera
    const worldPoint = camera.getWorldPoint(pointer.x, pointer.y)

    return {
      worldX: worldPoint.x,
      worldY: worldPoint.y,
    }
  }

  drawRect(pointer: Phaser.Input.Pointer) {
    if (!this.dragStartPoint) return
    this.rectGraphics.clear()

    const { worldX, worldY } = this.getWorldXY(pointer)
    const startWorldPoint = this.gameCamera.getWorldPoint(this.dragStartPoint.x, this.dragStartPoint.y)

    const startPosX = convertPointerToPos(startWorldPoint.x)
    const startPosY = convertPointerToPos(startWorldPoint.y)
    const pointerPosX = convertPointerToPos(worldX)
    const pointerPosY = convertPointerToPos(worldY)

    const cols = Math.abs(pointerPosX - startPosX) / TILE_SIZE + 1
    const rows = Math.abs(pointerPosY - startPosY) / TILE_SIZE + 1

    this.rectInfo = {
      worldX: startPosX,
      worldY: startPosY,
      cols: Math.max(1, cols),
      rows: Math.max(1, rows),
    }

    this.rectGraphics.fillStyle(0xc0cbdc, 0.5)
    this.rectGraphics.fillRect(
      startPosX - this.gameCamera.scrollX,
      startPosY - this.gameCamera.scrollY,
      cols * TILE_SIZE,
      rows * TILE_SIZE
    )
  }

  selectItem(pointer: Phaser.Input.Pointer) {
    const { worldX, worldY } = this.getWorldXY(pointer)

    const snappedX = convertPointerToPos(worldX)
    const snappedY = convertPointerToPos(worldY)
    this.events.emit(EventKey.EditorSelectItem, {
      worldX: snappedX,
      worldY: snappedY,
    })
  }

  emitPlaceItem(pointer: Phaser.Input.Pointer) {
    const { worldX, worldY } = this.getWorldXY(pointer)

    const snappedX = convertPointerToPos(worldX)
    const snappedY = convertPointerToPos(worldY)


    const existingItem = this.gameScene.getItemAtSnappedPosition(snappedX, snappedY)

    const canOverlapPlatforms = [
      EditorType.Spike,
      EditorType.SpikyBall,
      EditorType.Cannon,
      EditorType.Coin
    ].includes(this.type)

    if (existingItem) {
      const isPlatform = existingItem.type === EditorType.Platform

      if (canOverlapPlatforms && !isPlatform) {
        return
      }
    }

    this.events.emit(EventKey.EditorPlaceItem, {
      worldX: snappedX,
      worldY: snappedY,
      type: this.type,
      ...(this.type === EditorType.Spike && { dir: this.spikeDir }),
      ...(this.type === EditorType.Cannon && { dir: this.cannonDir }),
    })
  }

  emitRemoveItem(pointer: Phaser.Input.Pointer) {
    const { worldX, worldY } = this.getWorldXY(pointer)

    const snappedX = convertPointerToPos(worldX)
    const snappedY = convertPointerToPos(worldY)
    this.events.emit(EventKey.EditorRemoveItem, {
      worldX: snappedX,
      worldY: snappedY,
    })
    this.saveToHistory()
    this.events.emit(EventKey.EditorUpdateBackground)
  }

  loadDefaultLevelIfNeeded(): void {
    const isCustomLevelRun = this.registry.get(DataKey.IsCustomLevelRun)
    if (isCustomLevelRun) {
      return
    }

    if (this.loadTemporaryLevelIfExists()) {
      return
    }

    const currentEditorId = localStorage.getItem('currentEditorId')
    if (currentEditorId) {
      const gameScene = this.scene.get(SceneKey.Game) as any
      if (gameScene && gameScene.levelData && gameScene.levelData.name) {
        return
      }

      this.time.delayedCall(200, () => {
        this.loadSavedLevel(currentEditorId)
      })
      return
    }

    const defaultLevel = this.getDefaultLevel()
    this.time.delayedCall(200, () => {
      this.registry.set('loadingDefaultLevel', true)
      this.events.emit(EventKey.EditorImport, defaultLevel)
      this.registry.set('loadingDefaultLevel', false)
    })

    if (defaultLevel && typeof defaultLevel === 'object' && 'world' in defaultLevel) {
      const world = defaultLevel.world as any
      if (world && typeof world.width === 'number' && typeof world.height === 'number') {
        this.levelWidth = world.width
        this.levelHeight = world.height
        if (this.choiceLevelWidth && this.choiceLevelHeight) {
          this.choiceLevelWidth.value = this.levelWidth
          this.choiceLevelHeight.value = this.levelHeight
        }
      }
    }
  }

  getDefaultLevel(): any {
    return {
      name: 'Nouveau niveau',
      "world": {
        "width": 480000,
        "height": 480000
      },
      "player": {
        "x": 520,
        "y": 520
      },
      "target": {
        "x": 840,
        "y": 520
      },
      "platforms": [
        {
          "x": 480,
          "y": 560,
          "width": 80,
          "height": 80
        }
      ]
    }
  }

  quit() {
    const editorCompleteScene = this.scene.get(SceneKey.EditorComplete)
    if (editorCompleteScene && editorCompleteScene.scene.isActive()) {
      editorCompleteScene.scene.stop()
    }

    localStorage.removeItem('currentEditorId')
    this.registry.set(DataKey.GameMode, GameMode.Classic)

    const gameScene = this.gameScene
    if (gameScene) {
      const defaultLevel = this.getDefaultLevel()
      this.registry.set('loadingDefaultLevel', true)
      this.events.emit(EventKey.EditorImport, defaultLevel)
      this.registry.set('loadingDefaultLevel', false)
    }

    transitionEventsEmitter.emit(EventKey.TransitionStart)
    transitionEventsEmitter.once(
      EventKey.TransitionEnd,
      () => {
        if (this.isCustomLevelRun) {
          gameScene.scene.restart({ isCustomLevelRun: false })
          this.toggleEdition()
          this.events.emit(EventKey.EditorToggleGrid, true)
        } else {
          gameScene.scene.start(SceneKey.Levels)
        }
      },
      this
    )
  }

  saveTemporaryLevel() {
    try {
      const gameScene = this.scene.get(SceneKey.Game) as any
      const levelData = gameScene.levelData
      const currentEditorId = localStorage.getItem('currentEditorId')

      const temporaryLevelData = {
        ...levelData,
        name: 'Map temporaire',
        lastModified: new Date().toISOString(),
        originalEditorId: currentEditorId
      }

      const base64Data = btoa(JSON.stringify(temporaryLevelData))
      localStorage.setItem('temporary_level', base64Data)

      console.log('Map temporaire sauvegardée avant testPlay')
    } catch (error) {
      console.warn('Impossible de sauvegarder la map temporaire:', error)
    }
  }

  loadSavedLevel(currentEditorId: string) {
    try {
      const base64Data = localStorage.getItem(`level_${currentEditorId}`)
      if (base64Data) {
        const levelData = JSON.parse(atob(base64Data))

        this.events.emit(EventKey.EditorImport, levelData)
        if (levelData.world) {
          this.levelWidth = levelData.world.width
          this.levelHeight = levelData.world.height

          if (this.choiceLevelWidth && this.choiceLevelHeight) {
            this.choiceLevelWidth.value = this.levelWidth
            this.choiceLevelHeight.value = this.levelHeight
          }
        }
      }
    } catch (error) {
      console.error('Erreur lors du chargement du niveau sauvegardé:', error)
    }
  }

  loadTemporaryLevelIfExists() {
    try {
      const temporaryData = localStorage.getItem('temporary_level')
      if (temporaryData) {
        const levelData = JSON.parse(atob(temporaryData))

        const gameScene = this.scene.get(SceneKey.Game) as any
        if (gameScene && gameScene.importLevel) {
          gameScene.importLevel(levelData, false, true)
          this.time.delayedCall(100, () => {
            if (gameScene.recreateAllObjects) {
              gameScene.recreateAllObjects()
            }
          })
        } else {
          this.events.emit(EventKey.EditorImport, levelData)
        }

        localStorage.removeItem('temporary_level')

        if (levelData.originalEditorId) {
          localStorage.setItem('currentEditorId', levelData.originalEditorId)
        }


        return true
      }
      return false
    } catch (error) {
      console.error('Erreur lors du chargement de la map temporaire:', error)
      localStorage.removeItem('temporary_level')
      return false
    }
  }

  playRun() {
    const currentEditorId = localStorage.getItem('currentEditorId')
    if (currentEditorId) {
      this.saveLevel()
    }

    this.saveTemporaryLevel()

    this.isEditing = false
    this.events.emit(EventKey.EditorToggle, this.isEditing)
    this.btnToggle.toggleIcon(IconsKey.Edit)
    this.editButtonsPanel.setVisible(this.isEditing)
    this.events.emit(EventKey.EditorPlaytest)
    this.showGrid = false
    this.events.emit(EventKey.EditorToggleGrid, false)

    this.levelSizePanel.setVisible(false)

    this.registry.set(DataKey.GameMode, GameMode.EditorPlayingTest)

    transitionEventsEmitter.emit(EventKey.TransitionStart)
    transitionEventsEmitter.once(
      EventKey.TransitionEnd,
      () => {
        this.gameScene.scene.restart({ isCustomLevelRun: true })
      },
      this
    )
  }

  teleportToTarget() {
    if (!this.isEditing) return


    const gameScene = this.scene.get(SceneKey.Game) as any
    if (gameScene && gameScene.target) {
      const targetX = gameScene.target.x
      const targetY = gameScene.target.y


      this.gameCamera.centerOn(targetX, targetY)
    }
  }

  teleportToPlayer(retryCount = 0) {
    if (!this.isEditing) return

    const maxRetries = 50
    if (retryCount >= maxRetries) {
      console.log('Impossible de trouver Bobby après', maxRetries, 'tentatives')
      return
    }

    const gameScene = this.scene.get(SceneKey.Game) as any
    console.log('Tentative de téléport vers Bobby...', {
      gameScene: !!gameScene,
      player: !!gameScene?.player,
      playerX: gameScene?.player?.x,
      playerY: gameScene?.player?.y,
      retry: retryCount
    })

    if (gameScene && gameScene.player && gameScene.player.x !== undefined && gameScene.player.y !== undefined) {
      const playerX = gameScene.player.x
      const playerY = gameScene.player.y

      this.gameCamera.centerOn(playerX, playerY)
    } else {
      this.time.delayedCall(200, () => {
        this.teleportToPlayer(retryCount + 1)
      })
    }
  }

  saveToHistory() {
    if (!this.isEditing) return


    const gameScene = this.scene.get(SceneKey.Game) as any
    if (!gameScene || !gameScene.levelData) return

    const currentState = JSON.parse(JSON.stringify(gameScene.levelData))


    if (this.historyIndex < this.history.length - 1) {
      this.history = this.history.slice(0, this.historyIndex + 1)
    }


    this.history.push(currentState)
    this.historyIndex++


    if (this.history.length > this.maxHistorySize) {
      this.history.shift()
      this.historyIndex--
    }
  }

  undo() {
    if (!this.isEditing || this.historyIndex <= 0) return

    this.historyIndex--
    const previousState = this.history[this.historyIndex]
    this.restoreState(previousState)
  }

  redo() {
    if (!this.isEditing || this.historyIndex >= this.history.length - 1) return

    this.historyIndex++
    const nextState = this.history[this.historyIndex]
    this.restoreState(nextState)
  }

  restoreState(state: any) {
    const gameScene = this.scene.get(SceneKey.Game) as any
    if (!gameScene) return


    gameScene.levelData = JSON.parse(JSON.stringify(state))


    gameScene.scene.restart({
      level: gameScene.levelData,
      isCustomLevelRun: this.isCustomLevelRun
    })
  }
}
