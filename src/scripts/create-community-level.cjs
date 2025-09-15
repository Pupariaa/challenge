const fs = require('fs')
const path = require('path')
const readline = require('readline')
const { v4: uuidv4 } = require('uuid')
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
})

function askQuestion(question) {
    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            resolve(answer.trim())
        })
    })
}

function decodeBase64(base64String) {
    try {
        const decoded = Buffer.from(base64String, 'base64').toString('utf-8')
        return JSON.parse(decoded)
    } catch (error) {
        throw new Error(`Decode error: ${error.message}`)
    }
}

function isValidDifficulty(difficulty) {
    const validDifficulties = [
        'very-easy', 'easy', 'medium', 'hard', 'very-hard',
        'extreme', 'brutal', 'infernale', 'demoniaque', 'kaizo'
    ]
    return validDifficulties.includes(difficulty.toLowerCase())
}

async function createCommunityLevel() {
    console.log('Package a community level')
    console.log('=====================================\n')

    try {
        console.log('DataLevel')
        const base64Data = await askQuestion('Base64: ')

        if (!base64Data) {
            throw new Error('The base64 cannot be empty')
        }
        let mapData
        try {
            mapData = decodeBase64(base64Data)
            console.log('Successfully decoded base64')
        } catch (error) {
            throw new Error(`Decode error: ${error.message}`)
        }
        console.log('\nDifficulty section')
        console.log('very-easy, easy, medium, hard, very-hard, extreme, brutal, infernale, demoniaque, kaizo')
        const difficulty = await askQuestion('Enter the difficulty: ')

        if (!isValidDifficulty(difficulty)) {
            throw new Error(`Invalid difficulty: ${difficulty}`)
        }
        console.log('\nCreators')
        const creatorsInput = await askQuestion('Creator(s) list: ')
        const creators = creatorsInput.split(',').map(creator => creator.trim()).filter(creator => creator.length > 0)

        if (creators.length === 0) {
            throw new Error('At least one creator must be specified')
        }

        console.log('\nLevel name')
        const name = await askQuestion('Enter the level name: ')

        if (!name) {
            throw new Error('The level name cannot be empty')
        }
        console.log('\nCreated At')
        const createdAt = await askQuestion('Enter the creation date (ex: 11/03/2025 19:54): ')

        if (!createdAt) {
            throw new Error('The creation date cannot be empty')
        }

        const uuid = uuidv4()
        console.log(`\nLevel Generated UUID: ${uuid}`)

        const communityLevelData = {
            ...mapData,
            creators: creators,
            createdAt: createdAt,
            name: name,
            difficulty: difficulty.toLowerCase(),
            level_number: null
        }
        const levelsDir = path.join(__dirname, '..', 'levels')
        const difficultyDir = path.join(levelsDir, difficulty.toLowerCase())

        if (!fs.existsSync(difficultyDir)) {
            fs.mkdirSync(difficultyDir, { recursive: true })
            console.log(`Created directory: ${difficultyDir}`)
        }

        const filename = `${uuid}.json`
        const filepath = path.join(difficultyDir, filename)

        fs.writeFileSync(filepath, JSON.stringify(communityLevelData, null, 2))
        console.log(`\nDone !`)
        console.log(`File: ${filepath}`)
        console.log(`UUID: ${uuid}`)
        console.log(`Difficulty: ${difficulty}`)
        console.log(`Creators: ${creators.join(', ')}`)
        console.log(`Level Name: ${name}`)
        console.log(`Created At: ${createdAt}`)

        const regenerateIndex = await askQuestion('\nRegenerate index? (y/n): ')

        if (regenerateIndex.toLowerCase() === 'y' || regenerateIndex.toLowerCase() === 'yes') {
            console.log('\nRegenerating index...')
            const { exec } = require('child_process')

            exec('npm run generate:community-index', (error, stdout, stderr) => {
                if (error) {
                    console.error('Error when regenerating index:', error.message)
                } else {
                    console.log('Index regenerated successfully!')
                }
                rl.close()
            })
        } else {
            rl.close()
        }

    } catch (error) {
        console.error(`\nError${error.message}`)
        rl.close()
    }
}

rl.on('close', () => {
    process.exit(0)
})
createCommunityLevel()
