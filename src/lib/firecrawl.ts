export interface FirecrawlSearchResult {
    url: string;
    title: string;
    markdown: string;
    metadata?: any;
}

export async function searchWeb(query: string): Promise<FirecrawlSearchResult[]> {
    const apiKey = process.env.FIRECRAWL_API_KEY;

    if (!apiKey) {
        console.warn('FIRECRAWL_API_KEY is not set. Web search disabled.');
        return [];
    }

    try {
        const response = await fetch('https://api.firecrawl.dev/v1/search', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                query: query,
                limit: 3,
                pageOptions: {
                    fetchPageContent: true
                }
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`Firecrawl API error: ${response.status} ${response.statusText}`, errorText);
            return [];
        }

        const data = await response.json();

        if (!data.success || !data.data) {
            return [];
        }

        return data.data.map((item: any) => ({
            url: item.url,
            title: item.title || item.url,
            markdown: item.markdown || '',
            metadata: item.metadata
        }));

    } catch (error) {
        console.error('Firecrawl search error:', error);
        return [];
    }
}
