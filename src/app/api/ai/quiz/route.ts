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

        const { workspaceId, difficulty, count } = await req.json();

        const isGuestWorkspace = workspaceId === "guest-workspace";
        let combinedText = "";

        if (isGuestWorkspace) {
            combinedText = `Active recall and spaced repetition are the most effective study techniques. 
            Active recall involves testing yourself rather than passively reading. 
            Spaced repetition involves increasing the interval between review sessions to strengthen long-term memory. 
            The Pomodoro Technique (25 mins focus, 5 mins break) helps maintain concentration.`;
        } else {
            // 1. Fetch workspace content
            const workspaceDocs = await db.query.documents.findMany({
                where: eq(documents.workspaceId, workspaceId),
                columns: { content: true }
            });

            if (workspaceDocs.length === 0) {
                return NextResponse.json({ error: 'No documents found in workspace. Upload documents first.' }, { status: 400 });
            }

            combinedText = workspaceDocs
                .map(d => d.content)
                .filter(Boolean)
                .join('\n\n');
        }

        combinedText = combinedText.substring(0, 12000); // Limit context for LLM

        // 2. Generate Quiz JSON
        const prompt = `Generate a ${difficulty} difficulty quiz with ${count} multiple choice questions based on the following content.
        Return ONLY a JSON array of objects with this structure:
        [
          {
            "question": "The question text",
            "options": ["Option A", "Option B", "Option C", "Option D"],
            "correctAnswer": 0, // Index of the correct option
            "explanation": "Brief explanation why"
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
        // Some models wrap in a 'quiz' or 'questions' key even if asked for array
        let questions = JSON.parse(responseContent);
        if (questions.questions) questions = questions.questions;
        if (questions.quiz) questions = questions.quiz;

        // Track usage
        await incrementAIGeneration(session.user.id);

        return NextResponse.json(questions);

    } catch (error: any) {
        console.error('Quiz Generation Error:', error);
        return NextResponse.json({ error: 'Failed to generate quiz' }, { status: 500 });
    }
}
