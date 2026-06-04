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
    'u': ['U', 'v', 'w'],
    'U': ['u', 'V', 'W'],
    'q': ['Q', 'g', '9'],
    'Q': ['q', 'g', '9'],
    'x': ['X'],
    'X': ['x'],
};

const MERGES: Record<string, string[]> = {
    'U': ['IJ', 'Ii', 'lJ', '1J', 'uJ'],
    'u': ['ij', 'ii', 'lj', '1j'],
    'W': ['vv', 'uu'],
    'w': ['vv', 'uu'],
    'M': ['rn', 'in', 'ni'],
    'm': ['rn', 'in', 'ni'],
};

export function extractVideoId(url: string): string | null {
    if (!url) return null;
    const trimmed = url.trim();
    if (/^[A-Za-z0-9_-]{10,12}$/.test(trimmed)) {
        return trimmed;
    }
    const regex = /(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/|v\/)|youtu\.be\/)([A-Za-z0-9_-]{10,12})/;
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

function generateEdits(base: string, maxEdits: number): string[] {
    const results = new Set<string>();
    results.add(base);

    const editsPerPos: { index: number; options: string[] }[] = [];
    for (let i = 0; i < base.length; i++) {
        const char = base[i];
        const options = new Set<string>();

        const swapped = char === char.toUpperCase() ? char.toLowerCase() : char.toUpperCase();
        if (swapped !== char) options.add(swapped);

        const sims = SIMILAR_CHARS[char] || [];
        for (const s of sims) options.add(s);

        if (options.size > 0) {
            editsPerPos.push({ index: i, options: Array.from(options) });
        }
    }

    function apply(currentChars: string[], editIndex: number, editsApplied: number) {
        if (editsApplied > maxEdits) return;
        if (editIndex >= editsPerPos.length) {
            results.add(currentChars.join(''));
            return;
        }

        const item = editsPerPos[editIndex];

        apply(currentChars, editIndex + 1, editsApplied);

        if (editsApplied < maxEdits) {
            for (const opt of item.options) {
                const nextChars = [...currentChars];
                nextChars[item.index] = opt;
                apply(nextChars, editIndex + 1, editsApplied + 1);
            }
        }
    }

    apply(base.split(''), 0, 0);
    return Array.from(results);
}

function generateSmartCandidates(inputId: string): string[] {
    const allCandidates = new Set<string>();

    if (inputId.length === 11) {
        const variations = generateEdits(inputId, 2);
        for (const v of variations) allCandidates.add(v);
    } else if (inputId.length === 10) {
        const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
        for (const c of alphabet) {
            const base = inputId + c;
            const variations = generateEdits(base, 1);
            for (const v of variations) allCandidates.add(v);
        }

        for (let i = 0; i < inputId.length; i++) {
            const char = inputId[i];
            const expansions = MERGES[char] || [];
            for (const exp of expansions) {
                const base = inputId.substring(0, i) + exp + inputId.substring(i + 1);
                if (base.length === 11) {
                    const variations = generateEdits(base, 2);
                    for (const v of variations) allCandidates.add(v);
                }
            }
        }
    } else if (inputId.length === 12) {
        for (let i = 0; i < inputId.length; i++) {
            const base = inputId.substring(0, i) + inputId.substring(i + 1);
            const variations = generateEdits(base, 1);
            for (const v of variations) allCandidates.add(v);
        }
    }

    return Array.from(allCandidates);
}

export async function resolveVideoId(inputId: string): Promise<string> {
    if (!inputId) return inputId;
    if (inputId.length === 11 && await isVideoValid(inputId)) {
        return inputId;
    }

    console.log(`[YouTube ID AutoCorrect] Searching corrections for "${inputId}"...`);
    const combos = generateSmartCandidates(inputId);
    if (combos.length === 0) return inputId;

    // Batch requests to prevent overwhelming network or rate limits
    const batchSize = 100;
    for (let i = 0; i < combos.length; i += batchSize) {
        const batch = combos.slice(i, i + batchSize);
        const checks = batch.map(async (combo) => {
            const valid = await isVideoValid(combo);
            return { combo, valid };
        });
        const results = await Promise.all(checks);
        const validCombo = results.find(r => r.valid);
        if (validCombo) {
            console.log(`[YouTube ID AutoCorrect] Corrected ${inputId} -> ${validCombo.combo}`);
            return validCombo.combo;
        }
    }

    return inputId;
}

