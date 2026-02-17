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
        if (workspaceId) {
            // ... (keep existing workspace search logic)
            // For brevity in this diff, assuming the workspace search logic is unchanged 
            // but for safety in `replace_file_content` I should include strictly enough context or use `multi_replace` 
            // if I were skipping lines. Since I can't skip lines easily without `multi_replace`, 
            // I will assume the user wants me to be surgical.
            // Actually, I'll just wrap the Firecrawl call since that's a likely candidate.
        }

        // ... (skipping workspace search detail in this description, but in code I must be precise)

        // Let's use `multi_replace` or just target the specific blocks.
        // I will target the Firecrawl block specifically.


        // 2. Retrieval Strategy (Variables already declared above)
        // (No redeclaration needed)

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
        let systemPrompt: string;

        if (shouldSearchWeb) {
            // DEEP RESEARCH MODE: Synthesize documents + web sources
            systemPrompt = `You are a helpful AI Knowledge Assistant.
Your goal is to provide a comprehensive and unified answer to the user's question by synthesizing information from the provided context.

Context:
${contextText}

Instructions:
- **Synthesize & Integrate**: Seamlessly combine insights from the **Documents** (your primary knowledge base) with the **Web Sources** (external context).
- **Conflict Resolution**: If Web Sources contradict Documents, note the discrepancy but prioritize the user's specific Documents for internal specifics, and Web Sources for general/recent facts.
- **Deep Research**: Use Web Sources to explain, expand, or verify information found in Documents.
- **Citations**: 
    - Cite Documents as [Document Name].
    - Cite Web Sources as [Source Title](URL).
- **Unknowns**: If the answer is not in the context, say "No relevant data found." and do not make up an answer.
`;
        } else {
            // DOCUMENT-ONLY MODE: Answer strictly from uploaded documents
            systemPrompt = `You are a helpful AI Knowledge Assistant that answers questions based ONLY on the provided documents.

Context from Documents:
${contextText}

Instructions:
- **Answer ONLY from the provided documents.** Do NOT use any external knowledge or make assumptions beyond what is in the documents.
- **Citations**: Reference the source document as [Document Name] when citing information.
- **Direct & Concise**: Be clear and to the point, drawing only from the document content above.
- **Unknowns**: If the answer is NOT found in the provided documents, clearly state: "This information is not available in the uploaded documents." Do NOT guess or fabricate an answer.
- **No Web Content**: Do not reference any web sources or external information. You only have access to the user's uploaded documents.
`;
        }


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
                try {
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
                        content: fullResponse || "(No response generated)",
                    });

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
