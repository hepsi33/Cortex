import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { documents } from '@/drizzle/schema';
import { eq } from 'drizzle-orm';
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

        const { workspaceId, count, topic } = await req.json();

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
                columns: { content: true, name: true }
            });

            if (workspaceDocs.length === 0) {
                return NextResponse.json({ error: 'No documents found in workspace.' }, { status: 400 });
            }

            combinedText = workspaceDocs
                .map(d => d.content)
                .filter(Boolean)
                .join('\n\n');
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
