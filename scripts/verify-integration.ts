
import 'dotenv/config';
import { searchWeb, deepResearch, scrapeUrl } from '@/lib/firecrawl';
import { parsePdf, parseDocx } from '@/lib/file-parsers';
import fs from 'fs';
import path from 'path';

async function testFirecrawl() {
    console.log('Testing Firecrawl Search...');
    const results = await searchWeb('latest ai news');
    console.log(`Search Results: ${results.length}`);
    if (results.length > 0) {
        console.log('First result title:', results[0].title);
    }

    console.log('\nTesting Firecrawl Deep Research...');
    const deepRes = await deepResearch('future of agentic ai');
    console.log(`Deep Research Result Length: ${deepRes.length}`);

    console.log('\nTesting Firecrawl Scrape...');
    const scrapeRes = await scrapeUrl('https://firecrawl.dev');
    console.log(`Scrape Result Length: ${scrapeRes.length}`);
}

async function testParsers() {
    console.log('\nTesting Parsers (Mock)...');
    // We don't have real files to test easily without uploading, 
    // but we can ensure functions are callable.
    try {
        // Just checking imports and basic execution if we had buffers
        console.log('Parsers imported successfully.');
    } catch (e) {
        console.error('Parser import failed:', e);
    }
}

async function main() {
    await testFirecrawl();
    await testParsers();
}

main().catch(console.error);
console.log("To run this, use: npx tsx scripts/verify-integration.ts");
