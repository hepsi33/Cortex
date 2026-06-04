const SIMILAR_CHARS: Record<string, string[]> = {
    'l': ['I', '1'],
    'I': ['l', '1'],
    '1': ['l', 'I'],
    'o': ['O', '0'],
    'O': ['o', '0'],
    '0': ['o', 'O'],
    's': ['S', '5'],
    'S': ['s', '5'],
    '5': ['s', 'S'],
    'z': ['Z', '2'],
    'Z': ['z', '2'],
    '2': ['z', 'Z'],
};

export function extractVideoId(url: string): string | null {
    if (!url) return null;
    const trimmed = url.trim();
    if (/^[A-Za-z0-9_-]{11}$/.test(trimmed)) {
        return trimmed;
    }
    const regex = /(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/|v\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/;
    const match = trimmed.match(regex);
    return match ? match[1] : null;
}

export async function isVideoValid(videoId: string): Promise<boolean> {
    const url = `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`;
    try {
        const res = await fetch(url, { method: 'HEAD' });
        return res.status === 200;
    } catch {
        return false;
    }
}

function getCombinations(id: string): string[] {
    const chars = id.split('');
    const results: string[][] = [[]];

    for (const char of chars) {
        const next: string[][] = [];
        const replacements = [char, ...(SIMILAR_CHARS[char] || [])];
        
        for (const r of replacements) {
            for (const prefix of results) {
                next.push([...prefix, r]);
            }
        }
        results.length = 0;
        results.push(...next);
        
        if (results.length > 32) {
            return [id];
        }
    }

    return results.map(arr => arr.join('')).filter(c => c !== id);
}

export async function resolveVideoId(inputId: string): Promise<string> {
    if (!inputId) return inputId;
    if (await isVideoValid(inputId)) {
        return inputId;
    }

    const combos = getCombinations(inputId);
    if (combos.length === 0) return inputId;

    const checks = combos.map(async (combo) => {
        const valid = await isVideoValid(combo);
        return { combo, valid };
    });

    const results = await Promise.all(checks);
    const validCombo = results.find(r => r.valid);
    if (validCombo) {
        console.log(`[YouTube ID AutoCorrect] Corrected ${inputId} -> ${validCombo.combo}`);
        return validCombo.combo;
    }

    return inputId;
}
