import { SpeedrunData } from './auth-service'


class SpeedrunRecorder {
    private isRecording = false
    private startTime = 0
    private gameplayData: SpeedrunData['gameplay'] = {
        inputs: [],
        checkpoints: [],
        deaths: [],
        coins: [],
        enemies: [],
        positions: []
    }
    private positionInterval: number | null = null


    startRecording() {
        if (this.isRecording) return

        this.isRecording = true
        this.startTime = performance.now()
        this.gameplayData = {
            inputs: [],
            checkpoints: [],
            deaths: [],
            coins: [],
            enemies: [],
            positions: []
        }
    }


    stopRecording(): SpeedrunData {
        if (!this.isRecording) {
            throw new Error('No recording in progress')
        }

        this.isRecording = false
        if (this.positionInterval) {
            clearInterval(this.positionInterval)
            this.positionInterval = null
        }

        const totalTime = performance.now() - this.startTime

        console.log('🎬 Avant création SpeedrunData:', {
            inputsLength: this.gameplayData.inputs.length,
            checkpointsLength: this.gameplayData.checkpoints.length,
            deathsLength: this.gameplayData.deaths.length,
            coinsLength: this.gameplayData.coins.length
        })

        const speedrunData: SpeedrunData = {
            time: totalTime,
            date: new Date().toISOString(),
            gameplay: { ...this.gameplayData }
        }

        console.log('🎬 Enregistrement speedrun terminé:', {
            duration: totalTime.toFixed(6) + 'ms',
            events: this.getEventCount(),
            speedrunDataInputs: speedrunData.gameplay.inputs.length
        })

        return speedrunData
    }


    recordInput(action: 'jump' | 'move_left' | 'move_right' | 'stop_left' | 'stop_right', position: { x: number, y: number }) {
        if (!this.isRecording) return

        this.gameplayData.inputs.push({
            timestamp: performance.now() - this.startTime,
            action,
            position: { ...position }
        })

        console.log(`🎮 Input enregistré: ${action}, total inputs: ${this.gameplayData.inputs.length}`)
    }


    recordCheckpoint(position: { x: number, y: number }) {
        if (!this.isRecording) return

        this.gameplayData.checkpoints.push({
            timestamp: performance.now() - this.startTime,
            position: { ...position }
        })
    }


    recordDeath(position: { x: number, y: number }, cause: 'spike' | 'lava' | 'enemy' | 'fall') {
        if (!this.isRecording) return

        this.gameplayData.deaths.push({
            timestamp: performance.now() - this.startTime,
            position: { ...position },
            cause
        })
    }


    recordCoin(coinId: number, position: { x: number, y: number }) {
        if (!this.isRecording) return

        this.gameplayData.coins.push({
            timestamp: performance.now() - this.startTime,
            coinId,
            position: { ...position }
        })
    }


    recordEnemy(enemyId: string, position: { x: number, y: number }, action: 'kill' | 'damage') {
        if (!this.isRecording) return

        this.gameplayData.enemies.push({
            timestamp: performance.now() - this.startTime,
            enemyId,
            position: { ...position },
            action
        })
    }


    startPositionTracking(player: Phaser.GameObjects.Container, interval = 100) {
        if (!this.isRecording || this.positionInterval) return

        this.positionInterval = setInterval(() => {
            if (!this.isRecording) return

            const body = (player.body as Phaser.Physics.Arcade.Body)
            this.gameplayData.positions.push({
                timestamp: performance.now() - this.startTime,
                x: player.x,
                y: player.y,
                velocity: {
                    x: body ? body.velocity.x : 0,
                    y: body ? body.velocity.y : 0
                }
            })
        }, interval)
    }


    stopPositionTracking() {
        if (this.positionInterval) {
            clearInterval(this.positionInterval)
            this.positionInterval = null
        }
    }


    private getEventCount() {
        return {
            inputs: this.gameplayData.inputs.length,
            checkpoints: this.gameplayData.checkpoints.length,
            deaths: this.gameplayData.deaths.length,
            coins: this.gameplayData.coins.length,
            enemies: this.gameplayData.enemies.length,
            positions: this.gameplayData.positions.length
        }
    }


    isRecordingActive(): boolean {
        return this.isRecording
    }


    getCurrentData() {
        return {
            isRecording: this.isRecording,
            eventCount: this.getEventCount(),
            elapsedTime: this.isRecording ? performance.now() - this.startTime : 0
        }
    }
}


export const speedrunRecorder = new SpeedrunRecorder()
export default speedrunRecorder
