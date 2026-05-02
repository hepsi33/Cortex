import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { chats, messages, embeddings, documents } from '@/drizzle/schema';
import { eq, desc, and, sql, inArray } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { Groq } from 'groq-sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { searchWeb, deepResearch } from '@/lib/firecrawl';

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

        const body = await req.json();
        const { message, chatId, workspaceId, searchWeb: shouldSearchWeb, mode: requestMode, selectedDocIds } = body;

        if (!message) {
            return NextResponse.json({ error: 'Message is required' }, { status: 400 });
        }

        const isGuest = session.user.id.startsWith("guest_");
        let currentChatId = chatId || (isGuest ? "guest-chat" : null);

        if (!isGuest) {
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
        }

        // 1. Generate embedding for query
        let queryVector;
        try {
            const embeddingResult = await model.embedContent(message);
            queryVector = embeddingResult.embedding.values;
        } catch (embeddingError) {
            console.error('Gemini Embedding Error:', embeddingError);
            throw new Error('Failed to generate embedding');
        }

        // 2. Retrieval Strategy
        let relevantChunks: any[] = [];
        let sourceNames: Set<string> = new Set();
        let contextText = '';

        // Strategy A: Workspace Search
        if (workspaceId && workspaceId !== "guest-workspace") {
            // Find docs in workspace
            const workspaceDocs = await db.query.documents.findMany({
                where: and(
                    eq(documents.workspaceId, workspaceId),
                    selectedDocIds && selectedDocIds.length > 0 ? inArray(documents.id, selectedDocIds) : undefined
                ),
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
                if (bestMatch > 0.75 && !isGuest) {
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

        if (isGuest && !contextText) {
            contextText = "The user is exploring as a Guest. Provide helpful information about study techniques and focus if they ask.";
        }

        // Strategy C: Web Search (Firecrawl Deep Research)
        if (shouldSearchWeb) {
            console.log("Performing Deep Research...");
            try {
                const researchResult = await deepResearch(message);
                if (researchResult && !researchResult.startsWith('No results')) {
                    contextText += `\n\n=== DEEP RESEARCH SOURCES ===\n${researchResult}`;
                }
            } catch (firecrawlError) {
                console.error('Firecrawl Error:', firecrawlError);
                // Don't fail the whole chat if web search fails
                contextText += `\n\n(Web search failed: ${firecrawlError instanceof Error ? firecrawlError.message : 'Unknown error'})`;
            }
        }

        if (!contextText) {
            contextText = shouldSearchWeb
                ? "No relevant information found in documents or web sources."
                : "No relevant information found in the uploaded documents. Please upload a document first, or enable 'Search Web' for external research.";
        }


        // 4. Construct Prompt (adapts based on mode)
        const mode = requestMode || (shouldSearchWeb ? 'research' : 'strict');
        let systemPrompt: string;

        if (mode === 'research') {
            systemPrompt = `You are an advanced AI Tutor and Research Assistant. 
Your goal is to synthesize information from the provided context (Documents and Web) into a comprehensive, educational response.

Context:
${contextText}

Instructions:
- **Educational Tone**: Explain complex concepts clearly. Use analogies if helpful.
- **Math & Logic**: If the user asks a math or logic problem, solve it step-by-step.
- **Synthesize**: Integrate Document facts with Web context.
- **Citations**: Cite Documents as [Document Name] and Web sources as [Source Name](URL).
- **Subject Mastery**: You can explain any subject or field (Science, History, Math, Tech, etc.) using the context as your anchor.
`;
        } else if (mode === 'learning') {
            systemPrompt = `You are a world-class AI Private Tutor.
Your goal is to help the user master their study material through clear explanations and step-by-step guidance.

Context from Documents:
${contextText}

Instructions:
- **Math Specialist**: Solve math problems with clear, numbered steps. Explain the "why" behind each step.
- **Adaptive Explanations**: If a concept is hard, break it down. Ask the user if they follow.
- **Subject Versatility**: Whether it's history, calculus, or coding, provide expert-level instruction based on the documents.
- **Encouragement**: Be supportive and foster a growth mindset.
`;
        } else {
            // STRICT MODE: Answer strictly from uploaded documents
            systemPrompt = `You are a precision-focused AI Knowledge Assistant. 
Your goal is to answer questions strictly using only the provided document context.

Context from Documents:
${contextText}

Instructions:
- **Strict Adherence**: Answer ONLY from the provided documents. Do NOT use external knowledge.
- **Math**: If math is present in the documents, explain it exactly as described.
- **Citations**: Always cite the source as [Document Name].
- **Unknowns**: If not in the documents, state: "This information is not available in the uploaded documents."
`;
        }


        // Fetch history
        const formattedHistory = isGuest ? [] : (await db.query.messages.findMany({
            where: eq(messages.chatId, currentChatId!),
            orderBy: [desc(messages.createdAt)],
            limit: 10,
        })).reverse().map(msg => ({
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
                try {
                    for await (const chunk of completion) {
                        const content = chunk.choices[0]?.delta?.content || '';
                        if (content) {
                            fullResponse += content;
                            controller.enqueue(encoder.encode(content));
                        }
                    }

                    if (!isGuest) {
                        // Save assistant message to DB
                        await db.insert(messages).values({
                            chatId: currentChatId!,
                            role: 'assistant',
                            content: fullResponse || "(No response generated)",
                        });
                    }

                    controller.close();
                } catch (streamError) {
                    console.error('Stream processing error:', streamError);
                    controller.error(streamError);
                }
            }
        });

        return new Response(stream, {
            headers: {
                'Content-Type': 'text/plain; charset=utf-8',
                'X-Chat-Id': currentChatId,
            }
        });

    } catch (error) {
        console.error('Chat error details:', error);
        if (error instanceof Error) {
            console.error('Chat error message:', error.message);
            console.error('Chat error stack:', error.stack);
        }
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
