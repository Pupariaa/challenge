const fs = require('fs');
const path = require('path');
const levelsDir = path.join(__dirname, '../levels');

const difficulties = [
    'very-easy',
    'easy',
    'medium',
    'hard',
    'very-hard',
    'extreme',
    'brutal',
    'infernale',
    'demoniaque',
    'kaizo'
];

let imports = [];
let indexEntries = {};

difficulties.forEach(difficulty => {
    const difficultyDir = path.join(levelsDir, difficulty);

    if (fs.existsSync(difficultyDir)) {
        const files = fs.readdirSync(difficultyDir).filter(file => file.endsWith('.json'));

        files.forEach((file, index) => {
            const uuid = file.replace('.json', '');
            const cleanDifficulty = difficulty.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
            const importName = `${cleanDifficulty}Level${index + 1}`;
            imports.push(`import ${importName} from './${difficulty}/${file}'`);
            if (!indexEntries[difficulty]) {
                indexEntries[difficulty] = [];
            }

            indexEntries[difficulty].push({
                id: uuid,
                data: `${importName} as CommunityLevelData`,
                difficulty: difficulty
            });
        });
    }
});
let content = `import { CommunityLevelData } from '../consts/level'

export interface CommunityLevelInfo {
    id: string
    data: CommunityLevelData
    difficulty: string
}

const DIFFICULTIES = [
    'very-easy',
    'easy', 
    'medium',
    'hard',
    'very-hard',
    'extreme',
    'brutal',
    'infernale',
    'demoniaque',
    'kaizo'
]

${imports.join('\n')}

function loadCommunityLevels(): Record<string, CommunityLevelInfo[]> {
    const levels: Record<string, CommunityLevelInfo[]> = {}
    
    DIFFICULTIES.forEach(difficulty => {
        levels[difficulty] = []
    })
    
`;
difficulties.forEach(difficulty => {
    const entries = indexEntries[difficulty] || [];
    if (entries.length > 0) {
        content += `    \n    // Niveaux ${difficulty}\n`;
        entries.forEach((entry, index) => {
            content += `    levels['${difficulty}'].push({\n`;
            content += `        id: '${entry.id}',\n`;
            content += `        data: ${entry.data},\n`;
            content += `        difficulty: '${entry.difficulty}'\n`;
            content += `    })\n`;
        });
    }
});

content += `    \n    return levels\n}\n\n`;

content += `
export const COMMUNITY_LEVELS: Record<string, CommunityLevelInfo[]> = loadCommunityLevels()
export function getLevelsByDifficulty(difficulty: string): CommunityLevelInfo[] {
    return COMMUNITY_LEVELS[difficulty] || []
}
export function getAllCommunityLevels(): CommunityLevelInfo[] {
    return Object.values(COMMUNITY_LEVELS).flat()
}
export function getCommunityLevelById(id: string): CommunityLevelInfo | null {
    const allLevels = getAllCommunityLevels()
    return allLevels.find(level => level.id === id) || null
}
`;

const outputPath = path.join(levelsDir, 'community-index.ts');
fs.writeFileSync(outputPath, content);

console.log('Community index generated');

