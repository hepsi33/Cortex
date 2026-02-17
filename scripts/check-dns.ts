
import dns from 'dns/promises';

async function check(host: string) {
    console.log(`Checking ${host}...`);
    try {
        const result = await dns.lookup(host);
        console.log(`RESOLVED: ${result.address}`);
    } catch (e: any) {
        console.log(`FAILED: ${e.code}`);
    }
}

async function run() {
    const poolerHost = "ep-rough-art-aiyr1fib-pooler.c-4.us-east-1.aws.neon.tech";
    const directHost = "ep-rough-art-aiyr1fib.c-4.us-east-1.aws.neon.tech";

    await check(poolerHost);
    await check(directHost);
}

run();
