import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { documents, embeddings } from '@/drizzle/schema';
import { eq, sql, inArray } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { Groq } from 'groq-sdk';
import { checkAIGenerationLimit, incrementAIGeneration } from '@/lib/usage';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        // Usage limit check
        const usage = await checkAIGenerationLimit(session.user.id);
        if (!usage.allowed) {
            return NextResponse.json({ 
                error: 'Daily limit reached', 
                details: `Free users are limited to ${usage.limit} AI generations per day. Upgrade to Pro for more.` 
            }, { status: 429 });
        }

        const { getUserSubscriptionPlan } = await import('@/lib/subscription');
        const subscription = await getUserSubscriptionPlan();

        let { workspaceId, count, topic } = await req.json();

        // Enforce Free Tier Limits
        if (subscription && !subscription.isPremium) {
            if (count > 5) count = 5; // Max 5 flashcards
        }

        const isGuestWorkspace = workspaceId === "guest-workspace";
        let combinedText = "";

        if (isGuestWorkspace) {
            combinedText = `Active recall involves testing your memory. Spaced repetition spaces out review sessions. 
            The Pomodoro Technique uses 25-minute focus intervals. Interleaving means mixing different subjects. 
            Elaborative interrogation asks 'why' something is true. Dual coding combines words and visuals.`;
        } else {
            // 1. Fetch workspace content
            const workspaceDocs = await db.query.documents.findMany({
                where: eq(documents.workspaceId, workspaceId),
                columns: { id: true, content: true, name: true }
            });

            if (workspaceDocs.length === 0) {
                return NextResponse.json({ error: 'No documents found in workspace.' }, { status: 400 });
            }

            if (topic) {
                // Perform vector similarity search for the topic in the workspace's documents
                try {
                    const { GoogleGenerativeAI } = await import('@google/generative-ai');
                    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
                    const model = genAI.getGenerativeModel({ model: "gemini-embedding-001" });
                    
                    const embeddingResult = await model.embedContent(topic);
                    const queryVector = embeddingResult.embedding.values;

                    const docIds = workspaceDocs.map(d => d.id);
                    if (docIds.length > 0) {
                        const relevantChunks = await db.select({
                            content: embeddings.content,
                            dist: sql<number>`${embeddings.vector} <=> ${JSON.stringify(queryVector)}`
                        })
                            .from(embeddings)
                            .where(inArray(embeddings.documentId, docIds))
                            .orderBy(sql`${embeddings.vector} <=> ${JSON.stringify(queryVector)}`)
                            .limit(8);

                        combinedText = relevantChunks.map(c => c.content).join('\n\n');
                    }
                } catch (err) {
                    console.error("Vector search failed for flashcard generation, falling back to keyword filter:", err);
                }

                // If vector search failed or returned nothing, fall back to case-insensitive keyword search
                if (!combinedText || combinedText.trim().length === 0) {
                    const matchingDocs = workspaceDocs.filter(d => 
                        d.name.toLowerCase().includes(topic.toLowerCase()) || 
                        (d.content && d.content.toLowerCase().includes(topic.toLowerCase()))
                    );

                    if (matchingDocs.length > 0) {
                        combinedText = matchingDocs.map(d => d.content).filter(Boolean).join('\n\n');
                    }
                }
            }

            // Fallback if no topic or search returned nothing: combine all workspace docs
            if (!combinedText || combinedText.trim().length === 0) {
                combinedText = workspaceDocs
                    .map(d => d.content)
                    .filter(Boolean)
                    .join('\n\n');
            }
        }

        combinedText = combinedText.substring(0, 15000);

        // 2. Generate Flashcards JSON
        const prompt = `Generate ${count} educational flashcards based on the following content ${topic ? `specifically about "${topic}"` : ''}.
        Return ONLY a JSON array of objects with this structure:
        [
          {
            "front": "The question or concept",
            "back": "The answer or definition"
          }
        ]
        
        Content:
        ${combinedText}`;

        const completion = await groq.chat.completions.create({
            messages: [{ role: 'user', content: prompt }],
            model: 'llama-3.3-70b-versatile',
            response_format: { type: 'json_object' }
        });

        const responseContent = completion.choices[0]?.message?.content || '[]';
        let flashcards = JSON.parse(responseContent);
        if (flashcards.flashcards) flashcards = flashcards.flashcards;
        if (flashcards.cards) flashcards = flashcards.cards;

        // Track usage
        await incrementAIGeneration(session.user.id);

        return NextResponse.json(flashcards);

    } catch (error: any) {
        console.error('Flashcard Generation Error:', error);
        return NextResponse.json({ error: 'Failed to generate flashcards' }, { status: 500 });
    }
}
