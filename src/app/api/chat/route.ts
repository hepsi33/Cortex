import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { chats, messages, embeddings, documents } from '@/drizzle/schema';
import { eq, desc, and, sql, inArray } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { Groq } from 'groq-sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { searchWeb } from '@/lib/firecrawl';

// Initialize Groq
const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
});

// Initialize Gemini for embeddings
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({ model: "gemini-embedding-001" });

export async function POST(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { message, chatId, workspaceId, searchWeb: shouldSearchWeb } = await req.json();

        if (!message) {
            return NextResponse.json({ error: 'Message is required' }, { status: 400 });
        }

        let currentChatId = chatId;

        // Create chat if not exists
        if (!currentChatId) {
            if (!workspaceId) {
                return NextResponse.json({ error: 'Workspace ID required for new chat' }, { status: 400 });
            }

            const [newChat] = await db.insert(chats).values({
                userId: session.user.id,
                workspaceId: workspaceId,
                title: message.substring(0, 50) + '...',
            }).returning();
            currentChatId = newChat.id;
        }

        // Save user message
        await db.insert(messages).values({
            chatId: currentChatId,
            role: 'user',
            content: message,
        });

        // 1. Generate embedding for query
        const embeddingResult = await model.embedContent(message);
        const queryVector = embeddingResult.embedding.values;

        // 2. Retrieval Strategy
        let relevantChunks: any[] = [];
        let sourceNames: Set<string> = new Set();
        let contextText = '';

        // Strategy A: Workspace Search
        if (workspaceId) {
            // Find docs in workspace
            const workspaceDocs = await db.query.documents.findMany({
                where: eq(documents.workspaceId, workspaceId),
                columns: { id: true, name: true }
            });

            const docIds = workspaceDocs.map(d => d.id);
            const docMap = new Map(workspaceDocs.map(d => [d.id, d.name]));

            if (docIds.length > 0) {
                relevantChunks = await db.select({
                    content: embeddings.content,
                    metadata: embeddings.metadata,
                    documentId: embeddings.documentId,
                    dist: sql<number>`${embeddings.vector} <=> ${JSON.stringify(queryVector)}`
                })
                    .from(embeddings)
                    .where(inArray(embeddings.documentId, docIds))
                    .orderBy(sql`${embeddings.vector} <=> ${JSON.stringify(queryVector)}`)
                    .limit(5);

                // Check relevance (threshold < 0.7 distance roughly implies good match)
                // If best match is poor (> 0.7 distance), fall back to global
                const bestMatch = relevantChunks[0]?.dist || 1;

                // Strategy B: Global Fallback
                if (bestMatch > 0.75) {
                    console.log("Workspace match poor, trying global search...");
                    const globalChunks = await db.select({
                        content: embeddings.content,
                        metadata: embeddings.metadata,
                        documentId: embeddings.documentId,
                        dist: sql<number>`${embeddings.vector} <=> ${JSON.stringify(queryVector)}`
                    })
                        .from(embeddings)
                        // We need to join documents to ensure user owns them
                        .innerJoin(documents, eq(embeddings.documentId, documents.id))
                        .where(eq(documents.userId, session.user.id))
                        .orderBy(sql`${embeddings.vector} <=> ${JSON.stringify(queryVector)}`)
                        .limit(5);

                    if (globalChunks.length > 0 && (globalChunks[0].dist < bestMatch)) {
                        relevantChunks = globalChunks;
                        // Update docMap for global results
                        const globalDocIds = globalChunks.map(c => c.documentId);
                        const globalDocs = await db.query.documents.findMany({
                            where: inArray(documents.id, globalDocIds),
                            columns: { id: true, name: true }
                        });
                        globalDocs.forEach(d => docMap.set(d.id, d.name));
                    }
                }
            }

            // Formatting Context from Docs
            const docContext = relevantChunks.map((chunk, index) => {
                const docName = docMap.get(chunk.documentId) || 'Unknown Doc';
                sourceNames.add(docName);
                return `[Document: ${docName}] ${chunk.content}`;
            }).join('\n\n');

            contextText += docContext;
        }

        // Strategy C: Web Search (Firecrawl)
        if (shouldSearchWeb) {
            console.log("Searching web...");
            const webResults = await searchWeb(message);
            if (webResults.length > 0) {
                const webContext = webResults.map(r => `[Web Source: ${r.title}] (${r.url})\n${r.markdown.substring(0, 500)}...`).join('\n\n');
                contextText += `\n\n=== WEB SOURCES ===\n${webContext}`;
            }
        }

        if (!contextText) {
            contextText = "No relevant information found in documents.";
        }


        // 4. Construct Prompt
        const systemPrompt = `You are a helpful AI Knowledge Assistant.
Answer the user's question based strictly on the provided context.

Context:
${contextText}

Instructions:
- If the answer is found in a Document, cite it as [Document Name].
- If the answer is found in a Web Source, cite it as [Source Title](URL).
- If the answer is not in the context, say "No relevant data found." and do not make up an answer.
`;

        // Fetch history
        const history = await db.query.messages.findMany({
            where: eq(messages.chatId, currentChatId),
            orderBy: [desc(messages.createdAt)],
            limit: 10,
        });

        const formattedHistory = history.reverse().map(msg => ({
            role: msg.role as 'user' | 'assistant',
            content: msg.content
        }));

        const completion = await groq.chat.completions.create({
            messages: [
                { role: 'system', content: systemPrompt },
                ...formattedHistory.filter(m => m.content !== message),
                { role: 'user', content: message }
            ],
            model: 'llama-3.3-70b-versatile',
            stream: true,
        });

        const encoder = new TextEncoder();
        let fullResponse = '';

        const stream = new ReadableStream({
            async start(controller) {
                for await (const chunk of completion) {
                    const content = chunk.choices[0]?.delta?.content || '';
                    if (content) {
                        fullResponse += content;
                        controller.enqueue(encoder.encode(content));
                    }
                }

                // Save assistant message to DB
                await db.insert(messages).values({
                    chatId: currentChatId,
                    role: 'assistant',
                    content: fullResponse,
                });

                controller.close();
            }
        });

        return new Response(stream, {
            headers: {
                'Content-Type': 'text/plain; charset=utf-8',
                'X-Chat-Id': currentChatId,
            }
        });

    } catch (error) {
        console.error('Chat error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
