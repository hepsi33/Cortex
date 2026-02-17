import FirecrawlApp from '@mendable/firecrawl-js';

const apiKey = process.env.FIRECRAWL_API_KEY;

let app: FirecrawlApp | null = null;
if (apiKey) {
    app = new FirecrawlApp({ apiKey });
} else {
    console.warn('FIRECRAWL_API_KEY is not set. Web search disabled.');
}

export interface FirecrawlSearchResult {
    url: string;
    title: string;
    markdown: string;
    metadata?: any;
}

export async function searchWeb(query: string): Promise<FirecrawlSearchResult[]> {
    if (!app) return [];

    try {
        const response = await app.search(query, {
            limit: 5,
            // @ts-ignore
            pageOptions: {
                fetchPageContent: true
            }
        });

        // @ts-ignore
        if (!response.success && !Array.isArray(response.data)) {
            // Fallback if success is missing but data/web exists
            // @ts-ignore
            if (!response.data && !response.web) {
                console.warn('Firecrawl search failed or empty:', response);
                return [];
            }
        }

        // @ts-ignore
        const data = response.data || response.web || response; // Handle different potential response shapes

        if (Array.isArray(data)) {
            return data.map((item: any) => ({
                url: item.url,
                title: item.title || item.url,
                markdown: item.markdown || item.content || '',
                metadata: item.metadata
            }));
        }

        return [];

    } catch (error) {
        console.error('Firecrawl search error:', error);
        return [];
    }
}

export async function scrapeUrl(url: string): Promise<string> {
    if (!app) return '';

    try {
        const response = await app.scrape(url, {
            formats: ['markdown']
        });

        // @ts-ignore
        if (!response.success && !response.markdown) {
            console.warn('Firecrawl scrape failed:', response);
            return '';
        }

        return response.markdown || '';

    } catch (error) {
        console.error('Firecrawl scrape error:', error);
        return '';
    }
}

export async function deepResearch(query: string): Promise<string> {
    if (!app) return 'Firecrawl API Key not configured.';

    // Deep research using search
    const results = await searchWeb(query);

    if (results.length === 0) return 'No results found.';

    return results.map(r => `Source: ${r.title} (${r.url})\n\n${r.markdown}`).join('\n\n---\n\n');
}
