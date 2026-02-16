import { nanoid } from 'nanoid';

type TaskStatus = 'pending' | 'processing' | 'completed' | 'failed';

interface Task {
    id: string;
    documentId: string;
    status: TaskStatus;
    error?: string;
    createdAt: number;
}

class InMemQueue {
    private tasks: Map<string, Task> = new Map();
    private processing: boolean = false;
    private queue: string[] = [];

    add(documentId: string) {
        const id = nanoid();
        const task: Task = {
            id,
            documentId,
            status: 'pending',
            createdAt: Date.now(),
        };
        this.tasks.set(id, task);
        this.queue.push(id);
        this.process();
        return id;
    }

    get(id: string) {
        return this.tasks.get(id);
    }

    private async process() {
        if (this.processing || this.queue.length === 0) return;

        this.processing = true;
        const taskId = this.queue.shift();
        if (!taskId) {
            this.processing = false;
            return;
        }

        const task = this.tasks.get(taskId);
        if (!task) {
            this.processing = false;
            this.process();
            return;
        }

        task.status = 'processing';

        // In a real scenario, we would trigger the actual processing here.
        // However, for this implementation, we will likely call this queue from the API route
        // and pass a callback or handling logic. 
        // BUT since Next.js serverless functions are stateless, a long-running in-memory queue 
        // is risky. 
        // Re-thinking: For this specific environment, we should probably just use 
        // distinct API calls or Vercel functions if available, or just keeping it simple.
        // 
        // However, the prompt asked for "Background indexing queue".
        // A better approach for Next.js without external workers (Redis/Bull) is 
        // to just fire-and-forget the processing promise in the API route, 
        // OR use `waitUntil` if on Vercel. 
        // 
        // For now, let's keep this class as a simple state tracker if we want, 
        // but the actual processing needs to happen where we have context.

        // Actually, a better pattern here for the requirement is to have a 
        // module that handles the processing and update status in DB.

        this.processing = false;
        this.process();
    }
}

// Since we are likely in a serverless environment (Next.js), 
// this global singleton might be reset. 
// But for a persistent server (checking package.json "start": "next start"), 
// it might hold.
// 
// The most robust way without external infra is updating DB status.
// So this "Queue" file will actually be a helper to manage DB status.

import { db } from './db';
import { documents, embeddings } from '../drizzle/schema';
import { eq } from 'drizzle-orm';
// import { indexDocument } from './indexer'; // We'll implement this later

export async function addToQueue(documentId: string) {
    // Just update status to pending (already done in upload)
    // and trigger processing asynchronously.

    // In a real background job system we'd push to Redis here.
    // Here we will just return and let the caller invoke the processing function 
    // without awaiting it, using `setImmediate` or similar to detach.
    return;
}
