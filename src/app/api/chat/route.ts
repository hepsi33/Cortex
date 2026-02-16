import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { chats, messages, embeddings, documents } from '@/drizzle/schema';
import { eq, desc, and, sql } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { Groq } from 'groq-sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';

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

        const { message, chatId, documentId } = await req.json();

        if (!message) {
            return NextResponse.json({ error: 'Message is required' }, { status: 400 });
        }

        if (!documentId) {
            return NextResponse.json({ error: 'Document ID is required' }, { status: 400 });
        }

        let currentChatId = chatId;

        // Create chat if not exists
        if (!currentChatId) {
            const [newChat] = await db.insert(chats).values({
                userId: session.user.id,
                documentId: documentId,
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

        // 2. Search for relevant chunks — scoped to specific document
        const relevantChunks = await db.select({
            content: embeddings.content,
            metadata: embeddings.metadata,
            dist: sql<number>`${embeddings.vector} <=> ${JSON.stringify(queryVector)}`
        })
            .from(embeddings)
            .where(eq(embeddings.documentId, documentId))
            .orderBy(sql`${embeddings.vector} <=> ${JSON.stringify(queryVector)}`)
            .limit(5);

        // 3. Construct Context
        const contextText = relevantChunks.map((chunk, index) =>
            `[${index + 1}] Content: ${chunk.content}`
        ).join('\n\n');

        // 4. Call Groq
        const systemPrompt = `You are a helpful AI assistant. Answer the user's question based strictly on the provided context.
If the answer is not in the context, say you don't know.
Cite your sources using the format [1], [2], etc. corresponding to the context chunks.

Context:
${contextText}
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
